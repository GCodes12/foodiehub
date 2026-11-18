package com.foodiehub.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * The gateway (DEC-019) with fake service instances instead of Consul: routing per path, round-robin load balancing,
 * token checks at the edge (D3), the Authorization header passed through unchanged, and nothing else reachable.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiGatewayTest {

    private static final String ISSUER = "http://localhost:8080/realms/foodiehub";
    private static final RSAKey KEY = key("gw-test");
    private static final RSAKey FORGER = key("gw-test");

    /** A fake service instance: answers with its own name and records what it received. */
    record Backend(String name, HttpServer server, List<String> requests) {
        int port() {
            return server.getAddress().getPort();
        }
    }

    private static final Backend RESTAURANT_A = backend("restaurant-A");
    private static final Backend RESTAURANT_B = backend("restaurant-B");
    private static final Backend ORDERS = backend("orders");
    private static final HttpServer JWKS = jwks();

    @DynamicPropertySource
    static void instances(DynamicPropertyRegistry registry) {
        registry.add("spring.cloud.discovery.client.simple.instances.restaurant-service[0].uri", () -> "http://localhost:" + RESTAURANT_A.port());
        registry.add("spring.cloud.discovery.client.simple.instances.restaurant-service[1].uri", () -> "http://localhost:" + RESTAURANT_B.port());
        registry.add("spring.cloud.discovery.client.simple.instances.order-service[0].uri", () -> "http://localhost:" + ORDERS.port());
        registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri",
                () -> "http://127.0.0.1:" + JWKS.getAddress().getPort() + "/certs");
    }

    @AfterAll
    static void stop() {
        for (Backend b : List.of(RESTAURANT_A, RESTAURANT_B, ORDERS)) {
            b.server().stop(0);
        }
        JWKS.stop(0);
    }

    @LocalServerPort
    int port;

    private final HttpClient http = HttpClient.newHttpClient();

    @BeforeEach
    void clear() {
        List.of(RESTAURANT_A, RESTAURANT_B, ORDERS).forEach(b -> b.requests().clear());
    }

    // --- Routing ------------------------------------------------------------------------------------------------------

    @Test
    void publicBrowsingNeedsNoTokenAndReachesTheRestaurantService() throws Exception {
        HttpResponse<String> response = send("GET", "/api/v1/restaurants/r1/menu", null, null);
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).startsWith("restaurant-");
        assertThat(served()).hasSize(1).first().asString().endsWith("GET /api/v1/restaurants/r1/menu auth=none");
    }

    @Test
    void requestsAreSpreadOverTheRestaurantInstancesRoundRobin() throws Exception {
        Set<String> servedBy = new HashSet<>();
        List<String> order = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            String body = send("GET", "/api/v1/restaurants", null, null).body();
            servedBy.add(body);
            order.add(body);
        }
        assertThat(servedBy).containsExactlyInAnyOrder("restaurant-A", "restaurant-B");
        assertThat(Collections.frequency(order, "restaurant-A")).isEqualTo(3);
        for (int i = 1; i < order.size(); i++) {
            assertThat(order.get(i)).as("alternates").isNotEqualTo(order.get(i - 1));
        }
    }

    @Test
    void everyPathGoesToTheRightService() throws Exception {
        String token = token(claims().build());
        Map<String, String> expected = Map.of(
                "/api/v1/orders", "orders",
                "/api/v1/orders/o1", "orders",
                "/api/v1/owner/orders", "orders",
                "/api/v1/admin/orders/summary", "orders",
                "/api/v1/admin/orders", "orders",
                "/api/v1/owner/restaurants", "restaurant-",
                "/api/v1/admin/restaurants", "restaurant-",
                "/api/v1/admin/dashboard", "restaurant-",
                "/api/v1/admin/owners", "restaurant-");
        for (Map.Entry<String, String> e : expected.entrySet()) {
            HttpResponse<String> response = send("GET", e.getKey(), token, null);
            assertThat(response.statusCode()).as(e.getKey()).isEqualTo(200);
            assertThat(response.body()).as(e.getKey()).startsWith(e.getValue());
        }
    }

    @Test
    void forwardsTheTokenMethodAndBodyUnchanged() throws Exception {
        String token = token(claims().build());
        HttpResponse<String> response = send("POST", "/api/v1/orders", token, "{\"items\":[]}");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(ORDERS.requests()).containsExactly("POST /api/v1/orders auth=Bearer " + token + " body={\"items\":[]}");
    }

    // --- Token checks at the edge (D3) ----------------------------------------------------------------------------

    @Test
    void protectedPathsNeedAValidTokenAndNothingIsForwardedWithoutOne() throws Exception {
        Instant past = Instant.now().minusSeconds(3600);
        Map<String, String> bad = Map.of(
                "none", "",
                "malformed", "not-a-jwt",
                "forged", sign(FORGER, claims().build()),
                "expired", token(claims().issueTime(Date.from(past)).expirationTime(Date.from(past.plusSeconds(60))).build()),
                "wrong issuer", token(claims().issuer("http://localhost:8080/realms/master").build()),
                "wrong audience", token(claims().audience("account").build()));
        for (Map.Entry<String, String> e : bad.entrySet()) {
            for (String path : List.of("/api/v1/orders", "/api/v1/owner/restaurants", "/api/v1/admin/dashboard")) {
                int status = send("GET", path, e.getValue().isEmpty() ? null : e.getValue(), null).statusCode();
                assertThat(status).as(e.getKey() + " " + path).isEqualTo(401);
            }
        }
        assertThat(served()).isEmpty();
    }

    @Test
    void aTokenForEitherServiceIsAccepted() throws Exception {
        assertThat(send("GET", "/api/v1/orders", token(claims().audience(List.of("order-service")).build()), null).statusCode()).isEqualTo(200);
        assertThat(send("GET", "/api/v1/owner/restaurants", token(claims().audience(List.of("restaurant-service")).build()), null)
                .statusCode()).isEqualTo(200);
    }

    @Test
    void onlyTheApiAndHealthAreReachable() throws Exception {
        String token = token(claims().build());
        assertThat(send("GET", "/actuator/health", null, null).statusCode()).isEqualTo(200);
        for (String path : List.of("/actuator/env", "/actuator/gateway/routes", "/internal/restaurants/r1/order-quote", "/anything")) {
            assertThat(send("GET", path, token, null).statusCode()).as(path).isIn(401, 403, 404);
        }
        assertThat(send("POST", "/api/v1/restaurants", null, "{}").statusCode()).as("writes are never public").isEqualTo(401);
        assertThat(served()).isEmpty();
    }

    // --- Helpers ------------------------------------------------------------------------------------------------------

    private List<String> served() {
        List<String> all = new ArrayList<>();
        List.of(RESTAURANT_A, RESTAURANT_B, ORDERS).forEach(b -> b.requests().forEach(r -> all.add(b.name() + " " + r)));
        return all;
    }

    private HttpResponse<String> send(String method, String path, String bearer, String body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        if (body != null) {
            request.header("Content-Type", "application/json");
        }
        if (bearer != null) {
            request.header("Authorization", "Bearer " + bearer);
        }
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static JWTClaimsSet.Builder claims() {
        Instant now = Instant.now();
        return new JWTClaimsSet.Builder().issuer(ISSUER).subject("someone").audience(List.of("order-service", "restaurant-service", "account"))
                .issueTime(Date.from(now)).expirationTime(Date.from(now.plusSeconds(900)));
    }

    private static String token(JWTClaimsSet claims) throws JOSEException {
        return sign(KEY, claims);
    }

    private static String sign(RSAKey key, JWTClaimsSet claims) throws JOSEException {
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(), claims);
        jwt.sign(new RSASSASigner(key));
        return jwt.serialize();
    }

    private static RSAKey key(String id) {
        try {
            return new RSAKeyGenerator(2048).keyID(id).generate();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Backend backend(String name) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            List<String> requests = Collections.synchronizedList(new ArrayList<>());
            server.createContext("/", exchange -> {
                String auth = exchange.getRequestHeaders().getFirst("Authorization");
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                requests.add(exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath() + " auth=" + (auth == null ? "none" : auth)
                        + (body.isEmpty() ? "" : " body=" + body));
                byte[] out = name.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, out.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(out);
                }
            });
            server.start();
            return new Backend(name, server, requests);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static HttpServer jwks() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            byte[] body = new JWKSet(KEY.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
            server.createContext("/certs", exchange -> {
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, body.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(body);
                }
            });
            server.start();
            return server;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
