package com.foodiehub.restaurant.directory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/** The read-only Keycloak user directory (DEC-017) against a simulated Keycloak Admin API. */
class UserDirectoryTest {

    private static final String KC = "http://kc.test";
    private static final String TOKEN_URL = KC + "/realms/foodiehub/protocol/openid-connect/token";
    private static final String USERS = KC + "/admin/realms/foodiehub/users/";
    private static final String SUB = "6b1c2a5e-0000-4000-8000-000000000001";
    private static final UserDirectoryProperties PROPS = new UserDirectoryProperties(KC, "foodiehub", "foodiehub-admin-api",
            "s3cret-value-long-enough-123", Duration.ofSeconds(1), Duration.ofSeconds(1));

    private MockRestServiceServer keycloak;
    private UserDirectory directory;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(KC);
        keycloak = MockRestServiceServer.bindTo(builder).build();
        directory = new UserDirectory(builder.build(), PROPS, Clock.fixed(Instant.parse("2026-11-18T10:00:00Z"), ZoneOffset.UTC));
    }

    private void expectToken() {
        keycloak.expect(once(), requestTo(TOKEN_URL)).andExpect(method(HttpMethod.POST))
                .andExpect(content().string(org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.containsString("grant_type=client_credentials"),
                        org.hamcrest.Matchers.containsString("client_id=foodiehub-admin-api"))))
                .andRespond(withSuccess("{\"access_token\":\"sa-token\",\"expires_in\":300}", MediaType.APPLICATION_JSON));
    }

    private static String user(String id, String username, boolean enabled) {
        return "{\"id\":\"" + id + "\",\"username\":\"" + username + "\",\"firstName\":\"Owner\",\"lastName\":\"Demo\","
                + "\"email\":\"o@x.test\",\"enabled\":" + enabled + "}";
    }

    @Test
    void findsAnEnabledOwnerUsingOneCachedServiceAccountToken() {
        expectToken(); // once only: the second lookup reuses the token
        for (int i = 0; i < 2; i++) {
            keycloak.expect(requestTo(USERS + SUB)).andExpect(header("Authorization", "Bearer sa-token"))
                    .andRespond(withSuccess(user(SUB, "owner", true), MediaType.APPLICATION_JSON));
            keycloak.expect(requestTo(USERS + SUB + "/role-mappings/realm/composite"))
                    .andRespond(withSuccess("[{\"name\":\"default-roles-foodiehub\"},{\"name\":\"RESTAURANT_OWNER\"}]",
                            MediaType.APPLICATION_JSON));
        }

        DirectoryUser found = directory.findEnabledOwner(SUB).orElseThrow();
        assertThat(directory.findEnabledOwner(SUB)).isPresent();

        assertThat(found).isEqualTo(new DirectoryUser(SUB, "owner", "Owner Demo", "o@x.test", true, false));
        keycloak.verify();
    }

    @Test
    void aCustomerIsNotAnOwner() {
        expectToken();
        keycloak.expect(requestTo(USERS + SUB)).andRespond(withSuccess(user(SUB, "alice", true), MediaType.APPLICATION_JSON));
        keycloak.expect(requestTo(USERS + SUB + "/role-mappings/realm/composite"))
                .andRespond(withSuccess("[{\"name\":\"CUSTOMER\"}]", MediaType.APPLICATION_JSON));
        assertThat(directory.findEnabledOwner(SUB)).isEmpty();
    }

    @Test
    void aDisabledOwnerIsNotAssignable() {
        expectToken();
        keycloak.expect(requestTo(USERS + SUB)).andRespond(withSuccess(user(SUB, "owner", false), MediaType.APPLICATION_JSON));
        assertThat(directory.findEnabledOwner(SUB)).isEmpty();
        keycloak.verify(); // the role lookup was not needed
    }

    @Test
    void anUnknownUserIsEmpty() {
        expectToken();
        keycloak.expect(requestTo(USERS + SUB)).andRespond(withResourceNotFound());
        assertThat(directory.findEnabledOwner(SUB)).isEmpty();
    }

    @Test
    void malformedSubjectsAreNeverSentToKeycloak() {
        assertThat(directory.findEnabledOwner("../../admin")).isEmpty();
        assertThat(directory.findEnabledOwner(null)).isEmpty();
        keycloak.verify(); // no request at all
    }

    @Test
    void readsEveryPageOfRoleMembers() {
        expectToken();
        String page1 = IntStream.range(0, UserDirectory.PAGE).mapToObj(i -> user("u" + i, "user" + i, true))
                .collect(Collectors.joining(",", "[", "]"));
        keycloak.expect(requestTo(KC + "/admin/realms/foodiehub/roles/CUSTOMER/users?briefRepresentation=false&first=0&max=100"))
                .andRespond(withSuccess(page1, MediaType.APPLICATION_JSON));
        keycloak.expect(requestTo(KC + "/admin/realms/foodiehub/roles/CUSTOMER/users?briefRepresentation=false&first=100&max=100"))
                .andRespond(withSuccess("[" + user("last", "last", true) + "]", MediaType.APPLICATION_JSON));

        assertThat(directory.countUsersWithRole(UserDirectory.CUSTOMER_ROLE)).isEqualTo(101);
        keycloak.verify();
    }

    @Test
    void withoutASecretTheDirectoryIsUnavailableAndNothingIsCalled() {
        UserDirectory unconfigured = new UserDirectory(RestClient.builder().baseUrl(KC).build(),
                new UserDirectoryProperties(KC, "foodiehub", "foodiehub-admin-api", " ", Duration.ofSeconds(1), Duration.ofSeconds(1)),
                Clock.systemUTC());
        assertThatThrownBy(() -> unconfigured.countUsersWithRole("CUSTOMER")).isInstanceOf(UserDirectoryUnavailableException.class);
    }

    @Test
    void aRefusedServiceAccountMeansUnavailable() {
        expectToken();
        keycloak.expect(requestTo(KC + "/admin/realms/foodiehub/roles/RESTAURANT_OWNER/users?briefRepresentation=false&first=0&max=100"))
                .andRespond(withStatus(HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> directory.usersWithRole(UserDirectory.OWNER_ROLE))
                .isInstanceOf(UserDirectoryUnavailableException.class);
    }

    @Test
    void aFailedTokenRequestMeansUnavailable() {
        keycloak.expect(requestTo(TOKEN_URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED));
        assertThatThrownBy(() -> directory.findEnabledOwner(SUB)).isInstanceOf(UserDirectoryUnavailableException.class);
    }

    // --- DEC-018: owners through the group, duplicate checks, account status ------------------------------------------

    @Test
    void ownersAreDirectRoleMembersPlusOwnersGroupMembersWithoutDuplicates() {
        expectToken();
        keycloak.expect(requestTo(KC + "/admin/realms/foodiehub/roles/RESTAURANT_OWNER/users?briefRepresentation=false&first=0&max=100"))
                .andRespond(withSuccess("[" + user("legacy", "owner", true) + "," + user("both", "both", true) + "]", MediaType.APPLICATION_JSON));
        keycloak.expect(requestTo(KC + "/admin/realms/foodiehub/groups?search=restaurant-owners&exact=true"))
                .andRespond(withSuccess("[{\"id\":\"g1\",\"name\":\"restaurant-owners\"}]", MediaType.APPLICATION_JSON));
        keycloak.expect(requestTo(KC + "/admin/realms/foodiehub/groups/g1/members?briefRepresentation=false&first=0&max=100"))
                .andRespond(withSuccess("[" + user("both", "both", true) + ",{\"id\":\"new\",\"username\":\"asha\",\"email\":\"a@x.test\","
                        + "\"enabled\":true,\"requiredActions\":[\"UPDATE_PASSWORD\"]}]", MediaType.APPLICATION_JSON));

        var owners = directory.owners();
        assertThat(owners).extracting(DirectoryUser::sub).containsExactly("legacy", "both", "new");
        assertThat(owners.get(2).passwordChangePending()).isTrue();
        assertThat(owners.get(2).email()).isEqualTo("a@x.test");
        assertThat(owners.get(0).passwordChangePending()).isFalse();
        keycloak.verify();
    }

    @Test
    void withoutTheOwnersGroupOnlyDirectRoleMembersCount() {
        expectToken();
        keycloak.expect(requestTo(KC + "/admin/realms/foodiehub/roles/RESTAURANT_OWNER/users?briefRepresentation=false&first=0&max=100"))
                .andRespond(withSuccess("[" + user("legacy", "owner", true) + "]", MediaType.APPLICATION_JSON));
        keycloak.expect(requestTo(KC + "/admin/realms/foodiehub/groups?search=restaurant-owners&exact=true"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));
        assertThat(directory.countOwners()).isEqualTo(1);
    }

    @Test
    void checksForAnExistingUsernameOrEmailExactly() {
        expectToken();
        keycloak.expect(requestTo(KC + "/admin/realms/foodiehub/users?username=asha.rao&exact=true&briefRepresentation=true"))
                .andRespond(withSuccess("[" + user("x", "asha.rao", true) + "]", MediaType.APPLICATION_JSON));
        keycloak.expect(requestTo(KC + "/admin/realms/foodiehub/users?email=nobody%40x.test&exact=true&briefRepresentation=true"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));
        // "+" must stay a plus sign (strictly encoded), or Keycloak would search for a space.
        keycloak.expect(requestTo(KC + "/admin/realms/foodiehub/users?email=a%2Bkitchen%40x.test&exact=true&briefRepresentation=true"))
                .andRespond(withSuccess("[{\"id\":\"y\",\"username\":\"a\",\"email\":\"a+kitchen@x.test\"}]", MediaType.APPLICATION_JSON));
        assertThat(directory.usernameExists("asha.rao")).isTrue();
        assertThat(directory.emailExists("nobody@x.test")).isFalse();
        assertThat(directory.emailExists("a+kitchen@x.test")).isTrue();
    }
}
