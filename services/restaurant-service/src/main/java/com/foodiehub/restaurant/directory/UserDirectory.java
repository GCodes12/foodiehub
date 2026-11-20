package com.foodiehub.restaurant.directory;

import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Read-only view of Keycloak users (DEC-017) through the Admin REST API, authenticated as the service account of the
 * confidential client {@code foodiehub-admin-api} (realm-management view-users, query-users, view-realm). It lists
 * role and group members and looks up users; it can never change users or roles.
 */
public class UserDirectory {

    public static final String OWNER_ROLE = "RESTAURANT_OWNER";
    public static final String CUSTOMER_ROLE = "CUSTOMER";
    public static final String DEFAULT_OWNER_GROUP = "restaurant-owners";

    /** Page size for Keycloak member requests, and the upper bound on how many members are read. */
    static final int PAGE = 100;
    static final int MAX_MEMBERS = 5_000;

    /** Keycloak user ids are UUIDs; anything else cannot be a user and is never sent to Keycloak. */
    private static final Pattern SUB = Pattern.compile("^[A-Za-z0-9-]{1,64}$");

    private final RestClient keycloak;
    private final UserDirectoryProperties props;
    private final ServiceAccountToken token;
    private final String ownerGroup;

    public UserDirectory(RestClient keycloak, UserDirectoryProperties props, Clock clock) {
        this(keycloak, props, clock, DEFAULT_OWNER_GROUP);
    }

    public UserDirectory(RestClient keycloak, UserDirectoryProperties props, Clock clock, String ownerGroup) {
        this.keycloak = keycloak;
        this.props = props;
        this.token = new ServiceAccountToken(keycloak, props.realm(), props.clientId(), props.clientSecret(), clock);
        this.ownerGroup = ownerGroup;
    }

    /** Users holding the realm role directly, in Keycloak's order; at most {@link #MAX_MEMBERS}. */
    public List<DirectoryUser> usersWithRole(String role) {
        return pages("/admin/realms/{realm}/roles/{role}/users?briefRepresentation=false&first={first}&max={max}", role);
    }

    /**
     * Every owner account: direct holders of RESTAURANT_OWNER plus members of the owners group (DEC-018: accounts
     * created by administrators get the role through the group, which Keycloak's role-member list does not include).
     */
    public List<DirectoryUser> owners() {
        Map<String, DirectoryUser> bySub = new LinkedHashMap<>();
        usersWithRole(OWNER_ROLE).forEach(u -> bySub.put(u.sub(), u));
        ownerGroupId().ifPresent(id -> pages("/admin/realms/{realm}/groups/{id}/members?briefRepresentation=false&first={first}&max={max}", id)
                .forEach(u -> bySub.putIfAbsent(u.sub(), u)));
        return List.copyOf(bySub.values());
    }

    public int countOwners() {
        return owners().size();
    }

    public int countUsersWithRole(String role) {
        return usersWithRole(role).size();
    }

    /** True when an account with exactly this username exists (any role). */
    public boolean usernameExists(String username) {
        List<Map<String, Object>> found = get("/admin/realms/{realm}/users?username={u}&exact=true&briefRepresentation=true",
                props.realm(), username);
        return found.stream().anyMatch(u -> username.equalsIgnoreCase(String.valueOf(u.get("username"))));
    }

    /** True when an account with exactly this e-mail address exists (any role). */
    public boolean emailExists(String email) {
        List<Map<String, Object>> found = get("/admin/realms/{realm}/users?email={e}&exact=true&briefRepresentation=true",
                props.realm(), email);
        return found.stream().anyMatch(u -> email.equalsIgnoreCase(String.valueOf(u.get("email"))));
    }

    /**
     * The user with this subject, if it exists, is enabled and holds the RESTAURANT_OWNER realm role (effective roles,
     * so a group grant counts). Empty for anything else, including a customer or a disabled account.
     */
    public Optional<DirectoryUser> findEnabledOwner(String sub) {
        if (sub == null || !SUB.matcher(sub).matches()) {
            return Optional.empty();
        }
        Map<String, Object> user;
        try {
            user = get("/admin/realms/{realm}/users/{id}", props.realm(), sub);
        } catch (UserDirectoryUnavailableException e) {
            if (e.getCause() instanceof HttpClientErrorException.NotFound) {
                return Optional.empty();
            }
            throw e;
        }
        DirectoryUser found = toUser(user);
        if (!found.enabled()) {
            return Optional.empty();
        }
        List<Map<String, Object>> roles = get("/admin/realms/{realm}/users/{id}/role-mappings/realm/composite",
                props.realm(), sub);
        boolean owner = roles.stream().anyMatch(r -> OWNER_ROLE.equals(r.get("name")));
        return owner ? Optional.of(found) : Optional.empty();
    }

    private Optional<String> ownerGroupId() {
        List<Map<String, Object>> groups = get("/admin/realms/{realm}/groups?search={name}&exact=true", props.realm(), ownerGroup);
        return groups.stream().filter(g -> ownerGroup.equals(g.get("name"))).map(g -> String.valueOf(g.get("id"))).findFirst();
    }

    private List<DirectoryUser> pages(String uri, String pathVar) {
        List<DirectoryUser> users = new ArrayList<>();
        for (int first = 0; first < MAX_MEMBERS; first += PAGE) {
            List<Map<String, Object>> page = get(uri, props.realm(), pathVar, first, PAGE);
            page.stream().map(UserDirectory::toUser).forEach(users::add);
            if (page.size() < PAGE) {
                break;
            }
        }
        return users;
    }

    @SuppressWarnings("unchecked")
    private <T> T get(String uri, Object... vars) {
        String bearer = token.get("user directory is not configured (KEYCLOAK_ADMIN_API_CLIENT_SECRET)");
        try {
            Object body = keycloak.get().uri(uri, vars)
                    .header("Authorization", "Bearer " + bearer)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(Object.class);
            if (body == null) {
                throw new UserDirectoryUnavailableException("Keycloak returned no body", null);
            }
            return (T) body;
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                token.invalidate();
            }
            throw new UserDirectoryUnavailableException("Keycloak refused " + uri + ": " + e.getStatusCode(), e);
        } catch (RestClientException | ClassCastException e) {
            throw new UserDirectoryUnavailableException("Keycloak call failed: " + uri, e);
        }
    }

    static DirectoryUser toUser(Map<String, Object> raw) {
        String first = raw.get("firstName") instanceof String s ? s.strip() : "";
        String last = raw.get("lastName") instanceof String s ? s.strip() : "";
        String display = (first + " " + last).strip();
        boolean pending = raw.get("requiredActions") instanceof List<?> actions && actions.contains("UPDATE_PASSWORD");
        return new DirectoryUser(String.valueOf(raw.get("id")), String.valueOf(raw.get("username")),
                display.isEmpty() ? null : display, raw.get("email") instanceof String e ? e : null,
                !Boolean.FALSE.equals(raw.get("enabled")), pending);
    }
}
