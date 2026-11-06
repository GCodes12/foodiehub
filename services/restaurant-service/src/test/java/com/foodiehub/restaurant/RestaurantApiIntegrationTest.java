package com.foodiehub.restaurant;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * End-to-end check against real MySQL 8.4: Flyway schema, demo seed, inactive-restaurant non-disclosure.
 * Skipped (not failed) when no Docker environment is available.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties =
        "spring.flyway.locations=classpath:db/migration,classpath:db/seed,classpath:db/testdata")
class RestaurantApiIntegrationTest {

    private static final String DEMO = "00000000-0000-0000-0000-000000000001";
    private static final String INACTIVE = "00000000-0000-0000-0000-0000000000ff";
    private static final String MISSING = "00000000-0000-0000-0000-0000000000aa";

    @Container
    @ServiceConnection
    static MySQLContainer mysql = new MySQLContainer("mysql:8.4");

    @LocalServerPort
    int port;

    @Autowired
    JdbcTemplate jdbc;

    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> get(String path) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void menuPriceColumnIsDecimal10Scale2() {
        String type = jdbc.queryForObject("SELECT COLUMN_TYPE FROM information_schema.COLUMNS "
                + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu_item' AND COLUMN_NAME = 'price'",
                String.class);
        assertThat(type).isEqualTo("decimal(10,2)");
    }

    @Test
    void listShowsOnlyTheActiveSeededRestaurant() throws Exception {
        HttpResponse<String> res = get("/api/v1/restaurants");

        assertThat(res.statusCode()).isEqualTo(200);
        assertThat(res.body()).contains(DEMO).contains("FoodieHub Demo Kitchen")
                .doesNotContain(INACTIVE).doesNotContain("Closed Test Restaurant").doesNotContain("active");
    }

    @Test
    void seededMenuIsServedWithExactPricesAndUnavailableItemVisible() throws Exception {
        HttpResponse<String> res = get("/api/v1/restaurants/" + DEMO + "/menu");

        assertThat(res.statusCode()).isEqualTo(200);
        assertThat(res.body()).contains("\"price\":129.50").contains("Gulab Jamun (2 pcs)")
                .contains("\"available\":false").doesNotContain("Hidden Item");
    }

    @Test
    void inactiveRestaurantIsIndistinguishableFromNonexistent() throws Exception {
        for (String suffix : new String[] {"", "/menu"}) {
            HttpResponse<String> inactive = get("/api/v1/restaurants/" + INACTIVE + suffix);
            HttpResponse<String> missing = get("/api/v1/restaurants/" + MISSING + suffix);

            assertThat(inactive.statusCode()).isEqualTo(404);
            assertThat(missing.statusCode()).isEqualTo(404);
            assertThat(inactive.headers().firstValue("Content-Type"))
                    .isEqualTo(missing.headers().firstValue("Content-Type"));
            // Bodies may only differ by the requested identifier echoed in "instance".
            assertThat(inactive.body().replace(INACTIVE, "{id}")).isEqualTo(missing.body().replace(MISSING, "{id}"));
            assertThat(inactive.body()).doesNotContain("Closed Test Restaurant").doesNotContain("inactive");
        }
    }
}
