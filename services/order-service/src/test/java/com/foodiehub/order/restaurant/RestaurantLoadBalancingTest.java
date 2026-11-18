package com.foodiehub.order.restaurant;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * DEC-019: order-service reaches restaurant-service by its Consul name through Spring Cloud LoadBalancer. Two fake
 * restaurant-service instances stand in for Consul's list; calls alternate between them and the owner token is relayed.
 * Also checks that the health endpoint (Consul's check) is open and nothing else under /actuator is.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RestaurantLoadBalancingTest {

    private static final String RID = "00000000-0000-0000-0000-000000000001";

    @Container
    @ServiceConnection
    static MySQLContainer mysql = new MySQLContainer("mysql:8.4");

    record Instance(String name, HttpServer server, List<String> requests) {
    }

    private static final Instance A = instance("A");
    private static final Instance B = instance("B");

    @DynamicPropertySource
    static void discovery(DynamicPropertyRegistry registry) {
        registry.add("spring.cloud.discovery.enabled", () -> "true"); // simple discovery (no Consul) for this test
        registry.add("spring.cloud.discovery.client.simple.instances.restaurant-service[0].uri",
                () -> "http://localhost:" + A.server().getAddress().getPort());
        registry.add("spring.cloud.discovery.client.simple.instances.restaurant-service[1].uri",
                () -> "http://localhost:" + B.server().getAddress().getPort());
        registry.add("foodiehub.restaurant-service.base-url", () -> "http://restaurant-service");
    }

    @AfterAll
    static void stop() {
        A.server().stop(0);
        B.server().stop(0);
    }

    @Autowired
    RestaurantMenuClient menus;

    @Autowired
    OwnedRestaurantsClient owned;

    @LocalServerPort
    int port;

    @Test
    void menuLookupsAreSpreadOverTheInstancesFoundByName() {
        for (int i = 0; i < 4; i++) {
            assertThat(menus.fetchMenu(RID).items()).hasSize(1);
        }
        assertThat(A.requests()).hasSize(2).allMatch(r -> r.startsWith("GET /api/v1/restaurants/" + RID + "/menu"));
        assertThat(B.requests()).hasSize(2);
    }

    @Test
    void theOwnerTokenIsRelayedToWhicheverInstanceAnswers() {
        A.requests().clear();
        B.requests().clear();
        assertThat(owned.ownedRestaurantIds("owner-token")).containsExactly(RID);
        assertThat(owned.ownedRestaurantIds("owner-token")).containsExactly(RID);
        List<String> all = new ArrayList<>(A.requests());
        all.addAll(B.requests());
        assertThat(all).hasSize(2).allMatch(r -> r.equals("GET /api/v1/owner/restaurants auth=Bearer owner-token"));
        assertThat(A.requests()).hasSize(1);
    }

    @Test
    void onlyTheHealthEndpointIsOpen() throws Exception {
        HttpClient http = HttpClient.newHttpClient();
        HttpResponse<String> health = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/actuator/health")).build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(health.statusCode()).isEqualTo(200);
        assertThat(health.body()).contains("\"status\":\"UP\"").doesNotContain("components", "details", "db", "diskSpace"); // no details
        for (String path : List.of("/actuator/env", "/actuator/beans", "/actuator")) {
            int status = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).build(),
                    HttpResponse.BodyHandlers.discarding()).statusCode();
            assertThat(status).as(path).isIn(401, 403, 404);
        }
    }

    private static Instance instance(String name) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            List<String> requests = Collections.synchronizedList(new ArrayList<>());
            server.createContext("/", exchange -> {
                String path = exchange.getRequestURI().getPath();
                String auth = exchange.getRequestHeaders().getFirst("Authorization");
                requests.add(exchange.getRequestMethod() + " " + path + (auth == null ? "" : " auth=" + auth));
                String body = path.startsWith("/api/v1/owner/restaurants")
                        ? "[{\"id\":\"" + RID + "\",\"name\":\"ZAYORA\",\"active\":true}]"
                        : "{\"restaurantId\":\"" + RID + "\",\"currency\":\"INR\",\"items\":[{\"id\":\"m1\",\"name\":\"Dish " + name
                                + "\",\"price\":100.00,\"available\":true}]}";
                byte[] out = body.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, out.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(out);
                }
            });
            server.start();
            return new Instance(name, server, requests);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
