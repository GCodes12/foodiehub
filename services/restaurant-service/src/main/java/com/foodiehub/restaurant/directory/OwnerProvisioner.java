package com.foodiehub.restaurant.directory;

import java.net.URI;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Creates restaurant owner accounts in Keycloak (DEC-018) as the service account of {@code foodiehub-owner-provisioner}.
 * The account is created inside the owners group, which carries RESTAURANT_OWNER; no role is ever sent, and the
 * service account has no permission to grant roles or touch accounts outside that group. The temporary password must
 * be replaced at first login. After creation the role is confirmed through the read-only directory; if that fails, the
 * half-made account is deleted again.
 */
public class OwnerProvisioner {

    private static final Logger log = LoggerFactory.getLogger(OwnerProvisioner.class);

    /** What an administrator supplies. Validated by the API layer. */
    public record NewOwner(String fullName, String email, String username, String temporaryPassword) {

        @Override
        public String toString() { // never print the password
            return "NewOwner[username=" + username + "]";
        }
    }

    /** Keycloak refused the account because the username or e-mail address is already in use. */
    public static class DuplicateAccountException extends RuntimeException {
        private final String field;

        public DuplicateAccountException(String field) {
            super(field + " already in use", null, false, false);
            this.field = field;
        }

        /** "username" or "email". */
        public String field() {
            return field;
        }
    }

    private final RestClient keycloak;
    private final String realm;
    private final OwnerProvisioningProperties props;
    private final ServiceAccountToken token;
    private final UserDirectory directory;

    public OwnerProvisioner(RestClient keycloak, String realm, OwnerProvisioningProperties props, UserDirectory directory, Clock clock) {
        this.keycloak = keycloak;
        this.realm = realm;
        this.props = props;
        this.token = new ServiceAccountToken(keycloak, realm, props.clientId(), props.clientSecret(), clock);
        this.directory = directory;
    }

    public boolean configured() {
        return props.configured();
    }

    /**
     * Creates the account and returns it as the directory sees it (with its new subject).
     *
     * @throws DuplicateAccountException when Keycloak reports the username or e-mail address as taken
     * @throws UserDirectoryUnavailableException when owner creation is not configured, Keycloak fails, or the new
     *         account could not be confirmed as an owner (it is then deleted)
     */
    public DirectoryUser create(NewOwner owner) {
        String bearer = token.get("owner provisioning is not configured (KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET)");
        String[] name = splitName(owner.fullName());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("username", owner.username());
        body.put("email", owner.email());
        body.put("firstName", name[0]);
        body.put("lastName", name[1]);
        body.put("enabled", true);
        body.put("emailVerified", false);
        body.put("groups", List.of("/" + props.ownerGroup()));
        body.put("credentials", List.of(Map.of("type", "password", "value", owner.temporaryPassword(), "temporary", true)));

        String sub;
        try {
            ResponseEntity<Void> created = keycloak.post().uri("/admin/realms/{realm}/users", realm)
                    .header("Authorization", "Bearer " + bearer)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            sub = idFrom(created.getHeaders().getLocation())
                    .orElseThrow(() -> new UserDirectoryUnavailableException("Keycloak did not return the new account id", null));
        } catch (HttpClientErrorException.Conflict e) {
            String message = e.getResponseBodyAsString().toLowerCase();
            throw new DuplicateAccountException(message.contains("email") ? "email" : "username");
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                token.invalidate();
            }
            throw new UserDirectoryUnavailableException("Keycloak refused to create the owner account: " + e.getStatusCode(), e);
        } catch (RestClientException e) {
            throw new UserDirectoryUnavailableException("Keycloak call failed while creating an owner account", e);
        }

        Optional<DirectoryUser> confirmed;
        try {
            confirmed = directory.findEnabledOwner(sub);
        } catch (UserDirectoryUnavailableException e) {
            confirmed = Optional.empty();
        }
        if (confirmed.isEmpty()) {
            rollback(sub, bearer);
            throw new UserDirectoryUnavailableException("the new account " + sub + " could not be confirmed as a restaurant owner", null);
        }
        return confirmed.get();
    }

    private void rollback(String sub, String bearer) {
        try {
            keycloak.delete().uri("/admin/realms/{realm}/users/{id}", realm, sub)
                    .header("Authorization", "Bearer " + bearer).retrieve().toBodilessEntity();
            log.warn("Deleted unconfirmed owner account {}", sub);
        } catch (RestClientException e) {
            log.error("Owner account {} was created but could not be confirmed or deleted; remove it in Keycloak", sub, e);
        }
    }

    /** "Asha Rao Iyer" → ["Asha Rao", "Iyer"]; a single word is the first name. */
    static String[] splitName(String fullName) {
        String name = fullName.strip().replaceAll("\\s+", " ");
        int space = name.lastIndexOf(' ');
        return space < 0 ? new String[] {name, ""} : new String[] {name.substring(0, space), name.substring(space + 1)};
    }

    private static Optional<String> idFrom(URI location) {
        if (location == null) {
            return Optional.empty();
        }
        String path = location.getPath();
        String id = path.substring(path.lastIndexOf('/') + 1);
        return id.isBlank() ? Optional.empty() : Optional.of(id);
    }
}
