package com.foodiehub.restaurant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    // --- Owner operations against real MySQL (DEC-015; ownership by token subject, DEC-017) -----------------------

    private static final String LASSI = "00000000-0000-0000-0001-000000000036"; // Mango Lassi in the seed
    private static final String OWNER_SUB = "6b1c2a5e-0000-4000-8000-0000000000aa";

    @Autowired
    com.foodiehub.restaurant.domain.AdminCatalog admin;

    private void assignDemoTo(String sub) {
        assertThat(admin.assignOwner(DEMO, sub, "owner")).isPresent();
    }

    @Test
    void theLegacyUsernameLinkSurvivesTheMigrationButGrantsNothing() {
        // The state V4 leaves behind: the seeded link keeps its username but has no subject (D2: fail closed).
        jdbc.update("UPDATE restaurant_owner SET owner_sub = NULL, owner_username = 'owner' WHERE restaurant_id = ?", DEMO);

        assertThat(owners.ownedRestaurants("owner")).isEmpty(); // a username is never an owner identity
        assertThat(owners.menuOfOwnedRestaurant(DEMO, "owner")).isEmpty();
        assertThat(admin.find(DEMO)).get().satisfies(v -> {
            assertThat(v.owner().getOwnerUsername()).isEqualTo("owner");
            assertThat(v.owner().getOwnerSub()).isNull();
        });
        assertThat(jdbc.queryForList("SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() "
                + "AND TABLE_NAME = 'restaurant_owner' AND CONSTRAINT_NAME = 'PRIMARY'", String.class)).containsExactly("restaurant_id");
    }

    @Test
    void ownershipFollowsTheAssignedSubjectAndCanBeReassigned() {
        assignDemoTo("sub-first");
        assertThat(owners.ownedRestaurants("sub-first")).extracting(r -> r.getId()).containsExactly(DEMO);
        assertThat(owners.menuOfOwnedRestaurant(DEMO, "sub-first")).get().asList().hasSize(42);
        assertThat(owners.ownedRestaurants("sub-second")).isEmpty();

        assignDemoTo("sub-second");
        assertThat(owners.ownedRestaurants("sub-second")).extracting(r -> r.getId()).containsExactly(DEMO);
        assertThat(owners.ownedRestaurants("sub-first")).isEmpty();
        assertThat(owners.updateMenuItem(DEMO, LASSI, "sub-first",
                new com.foodiehub.restaurant.domain.OwnerCatalog.MenuItemChanges(false, null, null, null, null))).isEmpty();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM restaurant_owner WHERE restaurant_id = ?", Integer.class, DEMO))
                .isEqualTo(1); // one owner per restaurant
    }

    @Test
    void anOwnerChangeIsStoredAndShownOnThePublicMenu() throws Exception {
        assignDemoTo(OWNER_SUB);
        String before = jdbc.queryForObject("SELECT CONCAT(price, '|', available) FROM menu_item WHERE id = ?", String.class, LASSI);
        try {
            var changes = new com.foodiehub.restaurant.domain.OwnerCatalog.MenuItemChanges(
                    false, new java.math.BigDecimal("109.00"), null, null, null);
            assertThat(owners.updateMenuItem(DEMO, LASSI, OWNER_SUB, changes)).isPresent();

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
        assignDemoTo(OWNER_SUB);
        var changes = new com.foodiehub.restaurant.domain.OwnerCatalog.MenuItemChanges(false, null, null, null, null);
        // the inactive test restaurant's dish, via the owner's own restaurant id and via the other restaurant's id
        assertThat(owners.updateMenuItem(DEMO, "00000000-0000-0000-0001-0000000000ff", OWNER_SUB, changes)).isEmpty();
        assertThat(owners.updateMenuItem(INACTIVE, "00000000-0000-0000-0001-0000000000ff", OWNER_SUB, changes)).isEmpty();
        assertThat(owners.updateMenuItem(DEMO, LASSI, "sub-somebody-else", changes)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT available FROM menu_item WHERE id = ?", Boolean.class, LASSI)).isTrue();
    }

    // --- Administrator restaurant management against real MySQL (DEC-017) -------------------------------------------

    @Test
    void anAdminCreatesEditsActivatesAndDeactivatesARestaurant() throws Exception {
        var created = admin.create(new com.foodiehub.restaurant.domain.Restaurant.Details(
                "Integration Bistro", "Test kitchen", "2 Park Street", "Kolkata", "+91 33 0000 0000"));
        String id = created.restaurant().getId();
        try {
            assertThat(created.restaurant().isActive()).isFalse(); // always starts inactive
            assertThat(get("/api/v1/restaurants/" + id).statusCode()).isEqualTo(404);
            long version = created.restaurant().getVersion();

            // A stale screen cannot overwrite a newer change.
            assertThatThrownBy(() -> admin.update(id, version + 1,
                    new com.foodiehub.restaurant.domain.Restaurant.Details("Stale", null, null, null, null)))
                    .isInstanceOf(com.foodiehub.restaurant.domain.RestaurantChangedException.class);

            var edited = admin.update(id, version,
                    new com.foodiehub.restaurant.domain.Restaurant.Details("Integration Bistro II", null, null, "", null)).orElseThrow();
            assertThat(edited.restaurant().getName()).isEqualTo("Integration Bistro II");
            assertThat(edited.restaurant().getCity()).isNull(); // blank clears an optional field
            assertThat(edited.restaurant().getAddress()).isEqualTo("2 Park Street"); // untouched
            long v2 = edited.restaurant().getVersion();
            assertThat(v2).isGreaterThan(version);

            // No available dish yet: customers would see an empty menu.
            assertThatThrownBy(() -> admin.setActive(id, true, v2))
                    .isInstanceOf(com.foodiehub.restaurant.domain.RestaurantHasNoMenuException.class);
            jdbc.update("INSERT INTO menu_item (id, restaurant_id, name, price, available) VALUES (UUID(), ?, 'Test Thali', 150.00, TRUE)", id);

            var activated = admin.setActive(id, true, v2).orElseThrow();
            assertThat(activated.restaurant().isActive()).isTrue();
            assertThat(activated.availableDishes()).isEqualTo(1);
            assertThat(get("/api/v1/restaurants/" + id).statusCode()).isEqualTo(200);

            var deactivated = admin.setActive(id, false, activated.restaurant().getVersion()).orElseThrow();
            assertThat(deactivated.restaurant().isActive()).isFalse();
            assertThat(get("/api/v1/restaurants/" + id + "/menu").statusCode()).isEqualTo(404); // soft: data is kept
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM menu_item WHERE restaurant_id = ?", Integer.class, id)).isEqualTo(1);
        } finally {
            jdbc.update("UPDATE restaurant SET active = FALSE WHERE id = ?", id);
        }
    }

    @Test
    void anAdminSearchesRestaurantsWithOwnerAndDishCounts() {
        assignDemoTo(OWNER_SUB);
        var page = admin.search(null, "zAy", 0, 20);
        assertThat(page.getContent()).hasSize(1);
        var zayora = page.getContent().getFirst();
        assertThat(zayora.restaurant().getId()).isEqualTo(DEMO);
        assertThat(zayora.dishes()).isEqualTo(42);
        assertThat(zayora.availableDishes()).isEqualTo(41); // Phirni is sold out in the seed
        assertThat(zayora.owner().getOwnerSub()).isEqualTo(OWNER_SUB);

        assertThat(admin.search(false, null, 0, 50).getContent()).extracting(v -> v.restaurant().getId()).contains(INACTIVE)
                .doesNotContain(DEMO);
        assertThat(admin.search(null, "100%_", 0, 20).getContent()).isEmpty(); // LIKE wildcards are literal
        var counts = admin.counts();
        assertThat(counts.total()).isGreaterThanOrEqualTo(2);
        assertThat(counts.active() + counts.inactive()).isEqualTo(counts.total());
        assertThat(admin.restaurantsByOwner(java.util.List.of(OWNER_SUB))).containsKey(OWNER_SUB);
    }
}
