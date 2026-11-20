package com.foodiehub.restaurant;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.utility.MountableFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * DEC-018 end to end against a real Keycloak 26.8.1 and MySQL 8.4: the repository's own setup scripts configure the
 * realm (ADMIN, read-only directory client, owner provisioning client with group-scoped fine-grained permissions); an
 * administrator creates an owner over HTTP; the owner completes the first login, is assigned a restaurant through the
 * existing endpoint and can manage it. Also proves the provisioning account cannot escalate. Needs Docker, bash, curl
 * and python3; skipped (not failed) without Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties =
        "spring.flyway.locations=classpath:db/migration,classpath:db/seed")
class OwnerProvisioningKeycloakTest {

    private static final String DEMO = "00000000-0000-0000-0000-000000000001";
    private static final String KC_ADMIN = "kc-bootstrap";
    private static final String KC_ADMIN_PASSWORD = "kc-bootstrap-pw-123";
    private static final String DEMO_PASSWORD = "demo-users-pw-123";
    private static final String ADMIN_USER = "admin.it";
    private static final String ADMIN_PASSWORD = "admin-it-pw-123";
    private static final String DIRECTORY_SECRET = "directory-secret-0123456789abcdef";
    private static final String PROVISIONER_SECRET = "provisioner-secret-0123456789abcdef";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Container
    @ServiceConnection
    static MySQLContainer mysql = new MySQLContainer("mysql:8.4");

    @Container
    static GenericContainer<?> keycloak = new GenericContainer<>("quay.io/keycloak/keycloak:26.8.1")
            .withCommand("start-dev", "--import-realm")
            .withEnv("KC_BOOTSTRAP_ADMIN_USERNAME", KC_ADMIN)
            .withEnv("KC_BOOTSTRAP_ADMIN_PASSWORD", KC_ADMIN_PASSWORD)
            .withCopyFileToContainer(MountableFile.forHostPath(repo("infra/keycloak/foodiehub-realm.json")),
                    "/opt/keycloak/data/import/foodiehub-realm.json")
            .withExposedPorts(8080)
            .waitingFor(Wait.forHttp("/realms/foodiehub").forStatusCode(200).withStartupTimeout(Duration.ofMinutes(3)));

    @DynamicPropertySource
    static void keycloakProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> kc() + "/realms/foodiehub");
        registry.add("foodiehub.user-directory.server-url", OwnerProvisioningKeycloakTest::kc);
        registry.add("foodiehub.user-directory.client-secret", () -> DIRECTORY_SECRET);
        registry.add("foodiehub.owner-provisioning.client-secret", () -> PROVISIONER_SECRET);
    }

    @LocalServerPort
    int port;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    /** Runs the repository's real dev setup scripts against the container, exactly as a developer would. */
    @BeforeAll
    static void configureRealmWithTheProjectScripts() throws Exception {
        Path env = Files.createTempFile("foodiehub-it", ".env", PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
        Files.writeString(env, String.join("\n",
                "KEYCLOAK_PORT=" + keycloak.getMappedPort(8080),
                "KEYCLOAK_ADMIN_USER=" + KC_ADMIN, "KEYCLOAK_ADMIN_PASSWORD=" + KC_ADMIN_PASSWORD,
                "FOODIEHUB_DEMO_USER_PASSWORD=" + DEMO_PASSWORD,
                "FOODIEHUB_DEV_ADMIN_USERNAME=" + ADMIN_USER, "FOODIEHUB_DEV_ADMIN_PASSWORD=" + ADMIN_PASSWORD,
                "KEYCLOAK_ADMIN_API_CLIENT_SECRET=" + DIRECTORY_SECRET,
                "KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET=" + PROVISIONER_SECRET, ""));
        try {
            runScript("infra/keycloak/create-dev-users.sh", env);
            String output = runScript("infra/keycloak/create-dev-admin.sh", env);
            assertThat(output).contains("permission 'foodiehub-owner-provisioner: members of restaurant-owners'");
        } finally {
            Files.deleteIfExists(env);
        }
    }

    // --- The onboarding flow ----------------------------------------------------------------------------------------

    @Test
    void anAdminCreatesAnOwnerWhoLogsInAndManagesTheAssignedRestaurant() throws Exception {
        String username = "owner-" + shortId();
        HttpResponse<String> created = api("POST", "/api/v1/admin/owners", token(ADMIN_USER, ADMIN_PASSWORD), newOwner(username));
        assertThat(created.statusCode()).as(created.body()).isEqualTo(201);
        assertThat(created.body()).doesNotContain("Temp-Start-2026");
        JsonNode owner = JSON.readTree(created.body());
        String sub = owner.get("sub").asString();
        assertThat(owner.get("passwordChangePending").asBoolean()).isTrue();

        // Keycloak: exactly RESTAURANT_OWNER (through the group), a temporary password, in the owners group.
        assertThat(realmRoles(sub)).containsExactly("RESTAURANT_OWNER");
        JsonNode account = kcAdmin("GET", "/users/" + sub, null);
        assertThat(account.get("enabled").asBoolean()).isTrue();
        assertThat(account.get("requiredActions").toString()).contains("UPDATE_PASSWORD");
        assertThat(kcAdmin("GET", "/users/" + sub + "/groups", null).toString()).contains("restaurant-owners");

        // The admin owner list shows the new account (group member) with its e-mail address.
        HttpResponse<String> owners = api("GET", "/api/v1/admin/owners?size=100", token(ADMIN_USER, ADMIN_PASSWORD), null);
        assertThat(owners.body()).contains(sub).contains(username + "@example.com");

        // First login: the temporary password alone is not enough.
        assertThat(tokenResponse(username, "Temp-Start-2026").body()).contains("Account is not fully set up");
        // The owner replaces it (what Keycloak's "update password" screen does in the browser).
        kcAdmin("PUT", "/users/" + sub + "/reset-password", Map.of("type", "password", "value", "Own-Choice-2026", "temporary", false));
        kcAdmin("PUT", "/users/" + sub, Map.of("requiredActions", List.of()));
        String ownerToken = token(username, "Own-Choice-2026");

        // Not assigned yet: the Kitchen has no restaurant.
        assertThat(api("GET", "/api/v1/owner/restaurants", ownerToken, null).body()).isEqualTo("[]");

        // Assignment uses the existing endpoint (and its Keycloak check).
        HttpResponse<String> assigned = api("PUT", "/api/v1/admin/restaurants/" + DEMO + "/owner", token(ADMIN_USER, ADMIN_PASSWORD),
                Map.of("ownerSub", sub));
        assertThat(assigned.statusCode()).as(assigned.body()).isEqualTo(200);

        HttpResponse<String> kitchen = api("GET", "/api/v1/owner/restaurants", ownerToken, null);
        assertThat(kitchen.statusCode()).isEqualTo(200);
        assertThat(kitchen.body()).contains(DEMO);
        HttpResponse<String> menu = api("GET", "/api/v1/owner/restaurants/" + DEMO + "/menu", ownerToken, null);
        assertThat(JSON.readTree(menu.body()).get("items").size()).isEqualTo(42);
    }

    @Test
    void duplicateUsernamesAndEmailsAreRejected() throws Exception {
        String admin = token(ADMIN_USER, ADMIN_PASSWORD);
        String username = "dup-" + shortId();
        assertThat(api("POST", "/api/v1/admin/owners", admin, newOwner(username)).statusCode()).isEqualTo(201);

        HttpResponse<String> sameUsername = api("POST", "/api/v1/admin/owners", admin,
                Map.of("fullName", "Other Person", "email", "other-" + username + "@example.com", "username", username,
                        "temporaryPassword", "Temp-Start-2026"));
        assertThat(sameUsername.statusCode()).isEqualTo(409);
        assertThat(sameUsername.body()).contains("OWNER_USERNAME_TAKEN");

        HttpResponse<String> sameEmail = api("POST", "/api/v1/admin/owners", admin,
                Map.of("fullName", "Other Person", "email", username + "@example.com", "username", "other-" + username,
                        "temporaryPassword", "Temp-Start-2026"));
        assertThat(sameEmail.statusCode()).isEqualTo(409);
        assertThat(sameEmail.body()).contains("OWNER_EMAIL_TAKEN");

        HttpResponse<String> existingCustomer = api("POST", "/api/v1/admin/owners", admin, newOwner("alice"));
        assertThat(existingCustomer.statusCode()).isEqualTo(409); // an existing customer cannot be "re-created" as an owner
        assertThat(realmRoles(userId("alice"))).containsExactly("CUSTOMER");
    }

    @Test
    void customersOwnersAndAnonymousCallersCannotCreateOwners() throws Exception {
        String username = "nope-" + shortId();
        assertThat(api("POST", "/api/v1/admin/owners", token("alice", DEMO_PASSWORD), newOwner(username)).statusCode()).isEqualTo(403);
        assertThat(api("POST", "/api/v1/admin/owners", token("owner", DEMO_PASSWORD), newOwner(username)).statusCode()).isEqualTo(403);
        assertThat(api("POST", "/api/v1/admin/owners", null, newOwner(username)).statusCode()).isEqualTo(401);
        assertThat(kcAdmin("GET", "/users?username=" + username + "&exact=true", null).size()).isZero();
    }

    @Test
    void invalidInputCreatesNothing() throws Exception {
        String username = "bad-" + shortId();
        HttpResponse<String> response = api("POST", "/api/v1/admin/owners", token(ADMIN_USER, ADMIN_PASSWORD),
                Map.of("fullName", "X", "email", "not-an-email", "username", username, "temporaryPassword", "short"));
        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(response.body()).contains("VALIDATION_FAILED").contains("email").contains("temporaryPassword");
        assertThat(kcAdmin("GET", "/users?username=" + username + "&exact=true", null).size()).isZero();
    }

    // --- The provisioning account's limits (DEC-018 security) ---------------------------------------------------------

    @Test
    void theProvisioningAccountCannotGrantRolesOrTouchOtherAccounts() throws Exception {
        String provisioner = clientToken("foodiehub-owner-provisioner", PROVISIONER_SECRET);
        String username = "limits-" + shortId();
        assertThat(api("POST", "/api/v1/admin/owners", token(ADMIN_USER, ADMIN_PASSWORD), newOwner(username)).statusCode()).isEqualTo(201);
        String sub = userId(username);
        String serviceAccount = kcAdmin("GET", "/clients/" + clientUuid("foodiehub-owner-provisioner") + "/service-account-user", null)
                .get("id").asString();
        Object adminRole = List.of(JSON.convertValue(kcAdmin("GET", "/roles/ADMIN", null), Map.class));
        Object ownerRole = List.of(JSON.convertValue(kcAdmin("GET", "/roles/RESTAURANT_OWNER", null), Map.class));
        String groupId = kcAdmin("GET", "/groups?search=restaurant-owners&exact=true", null).get(0).get("id").asString();

        assertThat(kc("POST", "/users/" + sub + "/role-mappings/realm", provisioner, adminRole)).as("ADMIN to new owner").isEqualTo(403);
        assertThat(kc("POST", "/users/" + serviceAccount + "/role-mappings/realm", provisioner, adminRole)).as("ADMIN to itself").isEqualTo(403);
        assertThat(kc("POST", "/users/" + userId("alice") + "/role-mappings/realm", provisioner, ownerRole)).as("OWNER to alice").isEqualTo(403);
        assertThat(kc("PUT", "/users/" + userId("alice") + "/groups/" + groupId, provisioner, null)).as("alice into group").isEqualTo(403);
        assertThat(kc("PUT", "/users/" + userId(ADMIN_USER) + "/reset-password", provisioner,
                Map.of("type", "password", "value", "Hijack-12345", "temporary", false))).as("reset admin password").isEqualTo(403);
        assertThat(kc("DELETE", "/users/" + userId("alice"), provisioner, null)).as("delete alice").isEqualTo(403);
        assertThat(kc("POST", "/users", provisioner, Map.of("username", "outside-" + shortId(), "enabled", true)))
                .as("create outside the owners group").isEqualTo(403);
        assertThat(realmRoles(userId(ADMIN_USER))).containsExactly("ADMIN");
        assertThat(realmRoles(userId("alice"))).containsExactly("CUSTOMER");

        // Its client roles: none from realm-management.
        String rm = clientUuid("realm-management");
        assertThat(kcAdmin("GET", "/users/" + serviceAccount + "/role-mappings/clients/" + rm, null).size()).isZero();
        // The partial realm update left the realm's security settings alone.
        JsonNode realm = kcAdmin("GET", "", null);
        assertThat(realm.get("bruteForceProtected").asBoolean()).isTrue();
        assertThat(realm.get("registrationAllowed").asBoolean()).isFalse();
    }

    // --- Helpers ------------------------------------------------------------------------------------------------------

    private static Map<String, String> newOwner(String username) {
        return Map.of("fullName", "Asha Rao", "email", username + "@example.com", "username", username,
                "temporaryPassword", "Temp-Start-2026");
    }

    private HttpResponse<String> api(String method, String path, String bearer, Object body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body)))
                .header("Content-Type", "application/json");
        if (bearer != null) {
            request.header("Authorization", "Bearer " + bearer);
        }
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private String token(String username, String password) throws Exception {
        HttpResponse<String> response = tokenResponse(username, password);
        assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
        return JSON.readTree(response.body()).get("access_token").asString();
    }

    private HttpResponse<String> tokenResponse(String username, String password) throws Exception {
        return form("/realms/foodiehub/protocol/openid-connect/token",
                Map.of("grant_type", "password", "client_id", "foodiehub-dev-cli", "username", username, "password", password));
    }

    private String clientToken(String clientId, String secret) throws Exception {
        return JSON.readTree(form("/realms/foodiehub/protocol/openid-connect/token",
                Map.of("grant_type", "client_credentials", "client_id", clientId, "client_secret", secret)).body())
                .get("access_token").asString();
    }

    private String bootstrapToken() throws Exception {
        return JSON.readTree(form("/realms/master/protocol/openid-connect/token",
                Map.of("grant_type", "password", "client_id", "admin-cli", "username", KC_ADMIN, "password", KC_ADMIN_PASSWORD)).body())
                .get("access_token").asString();
    }

    private HttpResponse<String> form(String path, Map<String, String> fields) throws Exception {
        String body = fields.entrySet().stream()
                .map(e -> e.getKey() + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8)).collect(Collectors.joining("&"));
        return http.send(HttpRequest.newBuilder(URI.create(kc() + path)).header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }

    /** Keycloak Admin API as the bootstrap administrator (test setup and inspection only). */
    private JsonNode kcAdmin(String method, String path, Object body) throws Exception {
        HttpResponse<String> response = kcSend(method, path, bootstrapToken(), body);
        assertThat(response.statusCode()).as(method + " " + path + ": " + response.body()).isLessThan(300);
        return response.body().isBlank() ? JSON.readTree("{}") : JSON.readTree(response.body());
    }

    /** Keycloak Admin API as some other token; returns only the status. */
    private int kc(String method, String path, String bearer, Object body) throws Exception {
        return kcSend(method, path, bearer, body).statusCode();
    }

    private HttpResponse<String> kcSend(String method, String path, String bearer, Object body) throws Exception {
        HttpRequest.BodyPublisher publisher = body == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body));
        return http.send(HttpRequest.newBuilder(URI.create(kc() + "/admin/realms/foodiehub" + path)).method(method, publisher)
                .header("Authorization", "Bearer " + bearer).header("Content-Type", "application/json").build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private List<String> realmRoles(String sub) throws Exception {
        List<String> roles = new ArrayList<>();
        kcAdmin("GET", "/users/" + sub + "/role-mappings/realm/composite", null)
                .forEach(r -> roles.add(r.get("name").asString()));
        return roles.stream().filter(r -> r.equals(r.toUpperCase()) && !r.contains("-")).sorted().toList();
    }

    private String userId(String username) throws Exception {
        return kcAdmin("GET", "/users?username=" + username + "&exact=true", null).get(0).get("id").asString();
    }

    private String clientUuid(String clientId) throws Exception {
        return kcAdmin("GET", "/clients?clientId=" + clientId, null).get(0).get("id").asString();
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private static String kc() {
        return "http://localhost:" + keycloak.getMappedPort(8080);
    }

    private static Path repo(String relative) {
        return Path.of("../..").resolve(relative).toAbsolutePath().normalize();
    }

    private static String runScript(String script, Path env) throws IOException, InterruptedException {
        ProcessBuilder builder = new ProcessBuilder("bash", repo(script).toString()).redirectErrorStream(true);
        builder.environment().put("ENV_FILE", env.toString());
        Process process = builder.start();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        assertThat(process.waitFor(3, TimeUnit.MINUTES)).isTrue();
        assertThat(process.exitValue()).as(script + " output:\n" + output).isZero();
        return output;
    }
}
