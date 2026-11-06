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

    @Autowired
    com.foodiehub.restaurant.domain.OwnerCatalog owners;

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
        assertThat(res.body()).contains(DEMO).contains("ZAYORA")
                .doesNotContain(INACTIVE).doesNotContain("Closed Test Restaurant").doesNotContain("active");
    }

    @Test
    void seededMenuIsServedWithExactPricesAndUnavailableItemVisible() throws Exception {
        HttpResponse<String> res = get("/api/v1/restaurants/" + DEMO + "/menu");

        assertThat(res.statusCode()).isEqualTo(200);
        assertThat(res.body()).contains("\"price\":1299.00").contains("\"price\":29.00")
                .contains("Gulab Jamun (2 pcs)").contains("\"available\":false").doesNotContain("Hidden Item");
    }

    @Test
    void seededZayoraMenuHasAllApprovedDishesInMenuOrderWithDetails() throws Exception {
        HttpResponse<String> res = get("/api/v1/restaurants/" + DEMO + "/menu");
        tools.jackson.databind.JsonNode items =
                tools.jackson.databind.json.JsonMapper.builder().build().readTree(res.body()).get("items");

        assertThat(items).hasSize(42); // DEC-014: the approved ZAYORA menu
        assertThat(items.get(0).get("name").asString()).isEqualTo("Classic Veg Dum Biryani");
        assertThat(items.get(0).get("category").asString()).isEqualTo("VEG_BIRYANI");
        assertThat(items.get(0).get("diet").asString()).isEqualTo("VEG");
        assertThat(items.get(0).get("bestseller").asBoolean()).isTrue();
        assertThat(items.get(items.size() - 1).get("name").asString()).isEqualTo("Family Biryani Pack");
        java.util.Set<String> diets = new java.util.HashSet<>();
        int unavailable = 0;
        for (tools.jackson.databind.JsonNode item : items) {
            diets.add(item.get("diet").asString());
            assertThat(item.get("imageKey").asString()).matches("[a-z0-9-]+");
            assertThat(item.get("description").asString()).isNotBlank();
            if (!item.get("available").asBoolean()) {
                unavailable++;
                assertThat(item.get("name").asString()).isEqualTo("Phirni");
            }
        }
        assertThat(diets).containsExactlyInAnyOrder("VEG", "EGG", "NON_VEG");
        assertThat(unavailable).isEqualTo(1);
        assertThat(res.body()).doesNotContain("Masala Dosa");
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

    // --- Owner operations against real MySQL (DEC-015) -------------------------------------------------------

    private static final String LASSI = "00000000-0000-0000-0001-000000000036"; // Mango Lassi in the seed

    @Test
    void theSeededOwnerManagesZayoraAndNobodyElseDoes() {
        assertThat(owners.ownedRestaurants("owner")).extracting(r -> r.getId()).containsExactly(DEMO);
        assertThat(owners.ownedRestaurants("alice")).isEmpty();
        assertThat(owners.menuOfOwnedRestaurant(DEMO, "owner")).get().asList().hasSize(42);
        assertThat(owners.menuOfOwnedRestaurant(DEMO, "alice")).isEmpty();
        assertThat(owners.menuOfOwnedRestaurant(INACTIVE, "owner")).isEmpty();
    }

    @Test
    void anOwnerChangeIsStoredAndShownOnThePublicMenu() throws Exception {
        String before = jdbc.queryForObject("SELECT CONCAT(price, '|', available) FROM menu_item WHERE id = ?", String.class, LASSI);
        try {
            var changes = new com.foodiehub.restaurant.domain.OwnerCatalog.MenuItemChanges(
                    false, new java.math.BigDecimal("109.00"), null, null, null);
            assertThat(owners.updateMenuItem(DEMO, LASSI, "owner", changes)).isPresent();

            assertThat(jdbc.queryForObject("SELECT CONCAT(price, '|', available) FROM menu_item WHERE id = ?", String.class, LASSI))
                    .isEqualTo("109.00|0");
            String menu = get("/api/v1/restaurants/" + DEMO + "/menu").body();
            assertThat(menu).contains("\"id\":\"" + LASSI + "\",\"name\":\"Mango Lassi\",\"price\":109.00,\"available\":false");
        } finally {
            String[] parts = before.split("\\|");
            jdbc.update("UPDATE menu_item SET price = ?, available = ? WHERE id = ?", new java.math.BigDecimal(parts[0]),
                    "1".equals(parts[1]), LASSI);
        }
    }

    @Test
    void anOwnerCannotChangeAnotherRestaurantsDish() {
        var changes = new com.foodiehub.restaurant.domain.OwnerCatalog.MenuItemChanges(false, null, null, null, null);
        // the inactive test restaurant's dish, via the owner's own restaurant id and via the other restaurant's id
        assertThat(owners.updateMenuItem(DEMO, "00000000-0000-0000-0001-0000000000ff", "owner", changes)).isEmpty();
        assertThat(owners.updateMenuItem(INACTIVE, "00000000-0000-0000-0001-0000000000ff", "owner", changes)).isEmpty();
        assertThat(owners.updateMenuItem(DEMO, LASSI, "alice", changes)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT available FROM menu_item WHERE id = ?", Boolean.class, LASSI)).isTrue();
    }
}

