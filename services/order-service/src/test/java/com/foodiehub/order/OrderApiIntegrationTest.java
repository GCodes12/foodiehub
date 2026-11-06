package com.foodiehub.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import com.foodiehub.order.restaurant.RestaurantMenu;
import com.foodiehub.order.restaurant.RestaurantMenuClient;
import com.foodiehub.order.restaurant.RestaurantNotOrderableException;
import com.foodiehub.order.restaurant.RestaurantServiceUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Order API against real MySQL 8.4 (Testcontainers): authentication, validation, server-side pricing, snapshots,
 * single-transaction persistence, idempotency and ownership. Restaurant Service is replaced by a mock; real token
 * validation against Keycloak is covered by the documented manual end-to-end check.
 * Skipped (not failed) when Docker is not available.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@AutoConfigureMockMvc
class OrderApiIntegrationTest {

    private static final String RID = "00000000-0000-0000-0000-000000000001";
    private static final String DOSA = "00000000-0000-0000-0001-000000000001";
    private static final String PANEER = "00000000-0000-0000-0001-000000000002";
    private static final String JAMUN = "00000000-0000-0000-0001-000000000004";
    private static final String ALICE = "sub-alice";
    private static final String BOB = "sub-bob";

    @Container
    @ServiceConnection
    static MySQLContainer mysql = new MySQLContainer("mysql:8.4");

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @MockitoBean
    RestaurantMenuClient restaurantMenuClient;

    @BeforeEach
    void setUp() {
        jdbc.update("DELETE FROM order_item");
        jdbc.update("DELETE FROM customer_order");
        given(restaurantMenuClient.fetchMenu(RID)).willReturn(menu("Masala Dosa"));
    }

    private static RestaurantMenu menu(String dosaName) {
        return new RestaurantMenu(RID, "INR", List.of(
                new RestaurantMenu.Item(DOSA, dosaName, new BigDecimal("129.50"), true),
                new RestaurantMenu.Item(PANEER, "Paneer Butter Masala", new BigDecimal("249.00"), true),
                new RestaurantMenu.Item(JAMUN, "Gulab Jamun (2 pcs)", new BigDecimal("79.00"), false)));
    }

    private static String body(String linesJson) {
        return "{\"restaurantId\":\"" + RID + "\",\"fulfilmentType\":\"PICKUP\",\"items\":[" + linesJson + "]}";
    }

    private static String line(String id, Object qty) {
        return "{\"menuItemId\":\"" + id + "\",\"quantity\":" + qty + "}";
    }

    private static final String VALID = body(line(DOSA, 2) + "," + line(PANEER, 1));

    private static MockHttpServletRequestBuilder createAs(String sub, String key, String json) {
        MockHttpServletRequestBuilder req = post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON).content(json)
                .with(jwt().jwt(j -> j.subject(sub)));
        return key == null ? req : req.header("Idempotency-Key", key);
    }

    private static String newKey() {
        return UUID.randomUUID().toString();
    }

    private int orderCount() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM customer_order", Integer.class);
    }

    private int itemCount() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM order_item", Integer.class);
    }

    private String idOf(MvcResult result) throws Exception {
        String json = result.getResponse().getContentAsString();
        int start = json.indexOf("\"id\":\"") + 6;
        return json.substring(start, json.indexOf('"', start));
    }

    // --- Authentication (RR-007, FR-011, SEC-001) -------------------------------------------------------------

    @Test
    void createWithoutTokenIsRejectedAndCreatesNothing() throws Exception {
        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON).content(VALID)
                        .header("Idempotency-Key", newKey()))
                .andExpect(status().isUnauthorized());
        assertThat(orderCount()).isZero();
        verify(restaurantMenuClient, never()).fetchMenu(anyString());
    }

    @Test
    void retrieveWithoutTokenIsRejected() throws Exception {
        mvc.perform(get("/api/v1/orders/{id}", UUID.randomUUID())).andExpect(status().isUnauthorized());
    }

    // --- Creation: server pricing, snapshots, one transaction, initial status ---------------------------------

    @Test
    void createsPendingPaymentOrderPricedByTheServerWithSnapshots() throws Exception {
        String tampered = body("{\"menuItemId\":\"" + DOSA + "\",\"quantity\":2,\"unitPrice\":1.00},"
                + line(PANEER, 1)).replace("}]}", "}],\"total\":1.00,\"customerId\":\"" + BOB + "\"}");

        MvcResult result = mvc.perform(createAs(ALICE, newKey(), tampered))
                .andExpect(status().isCreated())
                .andExpect(header().string("Idempotent-Replayed", "false"))
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.fulfilmentType").value("PICKUP"))
                .andExpect(jsonPath("$.currency").value("INR"))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].name").value("Masala Dosa"))
                .andReturn();
        String json = result.getResponse().getContentAsString();
        // Client-sent unit price and total are ignored; exact decimals from the menu are used.
        assertThat(json).contains("\"unitPrice\":129.50", "\"lineAmount\":259.00", "\"subtotal\":508.00",
                "\"total\":508.00");
        String id = idOf(result);
        assertThat(result.getResponse().getHeader("Location")).isEqualTo("/api/v1/orders/" + id);

        // Persisted durably, owned by the token subject (not the customerId sent in the body).
        assertThat(jdbc.queryForMap("SELECT customer_id, status, total FROM customer_order WHERE id = ?", id))
                .containsEntry("customer_id", ALICE).containsEntry("status", "PENDING_PAYMENT")
                .containsEntry("total", new BigDecimal("508.00"));
        assertThat(jdbc.queryForList("SELECT line_no, item_name, unit_price, quantity, line_amount FROM order_item "
                + "WHERE order_id = ? ORDER BY line_no", id))
                .extracting(r -> r.get("item_name") + "|" + r.get("unit_price") + "|" + r.get("quantity") + "|"
                        + r.get("line_amount"))
                .containsExactly("Masala Dosa|129.50|2|259.00", "Paneer Butter Masala|249.00|1|249.00");
    }

    @Test
    void storedSnapshotsDoNotChangeWhenTheMenuChanges() throws Exception {
        String id = idOf(mvc.perform(createAs(ALICE, newKey(), VALID)).andExpect(status().isCreated()).andReturn());
        given(restaurantMenuClient.fetchMenu(RID)).willReturn(menu("Renamed Dosa"));

        mvc.perform(get("/api/v1/orders/{id}", id).with(jwt().jwt(j -> j.subject(ALICE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Masala Dosa"));
    }

    @Test
    void orderAndItemsAreWrittenInOneTransaction() throws Exception {
        // An item name too long for the order_item column makes the second INSERT fail after the order row.
        given(restaurantMenuClient.fetchMenu(RID)).willReturn(menu("x".repeat(250)));

        mvc.perform(createAs(ALICE, newKey(), VALID))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("STORAGE_FAILED"))
                .andExpect(jsonPath("$.detail").value("The order could not be stored. No order was created; please retry."));

        assertThat(orderCount()).isZero();
        assertThat(itemCount()).isZero();
    }

    @Test
    void severalUnpaidOrdersPerCustomerAreAllowed() throws Exception {
        mvc.perform(createAs(ALICE, newKey(), VALID)).andExpect(status().isCreated());
        mvc.perform(createAs(ALICE, newKey(), VALID)).andExpect(status().isCreated());
        assertThat(orderCount()).isEqualTo(2);
    }

    // --- Validation: request shape and technical bounds (DEC-013, Q-20 / Q-30) -------------------------------

    @ParameterizedTest
    @ValueSource(strings = {
            "EMPTY", "QTY_0", "QTY_51", "QTY_NEGATIVE", "QTY_FRACTION", "QTY_STRING", "TOO_MANY_LINES",
            "NO_RESTAURANT", "BAD_RESTAURANT_ID", "DELIVERY", "MALFORMED"})
    void rejectsInvalidRequestsWith400AndCreatesNothing(String kind) throws Exception {
        String json = switch (kind) {
            case "EMPTY" -> body("");
            case "QTY_0" -> body(line(DOSA, 0));
            case "QTY_51" -> body(line(DOSA, 51));
            case "QTY_NEGATIVE" -> body(line(DOSA, -1));
            case "QTY_FRACTION" -> body(line(DOSA, "2.5"));
            case "QTY_STRING" -> body(line(DOSA, "\"2\""));
            case "TOO_MANY_LINES" -> {
                List<String> lines = new ArrayList<>();
                for (int i = 0; i < 21; i++) {
                    lines.add(line("item-" + i, 1));
                }
                yield body(String.join(",", lines));
            }
            case "NO_RESTAURANT" -> VALID.replace("\"restaurantId\":\"" + RID + "\",", "");
            case "BAD_RESTAURANT_ID" -> VALID.replace(RID, "../admin");
            case "DELIVERY" -> VALID.replace("PICKUP", "DELIVERY");
            case "MALFORMED" -> "{not json";
            default -> throw new IllegalArgumentException(kind);
        };
        mvc.perform(createAs(ALICE, newKey(), json))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", "application/problem+json"));
        assertThat(orderCount()).isZero();
    }

    @Test
    void acceptsTheBoundaryValuesTwentyLinesAndQuantityFifty() throws Exception {
        List<RestaurantMenu.Item> items = new ArrayList<>();
        List<String> lines = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            items.add(new RestaurantMenu.Item("item-" + i, "Item " + i, new BigDecimal("10.00"), true));
            lines.add(line("item-" + i, 50));
        }
        given(restaurantMenuClient.fetchMenu(RID)).willReturn(new RestaurantMenu(RID, "INR", items));

        mvc.perform(createAs(ALICE, newKey(), body(String.join(",", lines))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.items.length()").value(20));
        assertThat(itemCount()).isEqualTo(20);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "short", "has spaces in it", "ünïcode-key-1234"})
    void requiresAWellFormedIdempotencyKey(String key) throws Exception {
        mvc.perform(createAs(ALICE, key.isEmpty() ? null : key, VALID))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_IDEMPOTENCY_KEY"));
        assertThat(orderCount()).isZero();
    }

    // --- Business rules against the authoritative menu (DEC-008, DEC-013) -------------------------------------

    @Test
    void rejectsUnavailableItemWith422() throws Exception {
        mvc.perform(createAs(ALICE, newKey(), body(line(JAMUN, 1))))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("ITEM_UNAVAILABLE"));
        assertThat(orderCount()).isZero();
    }

    @Test
    void rejectsItemFromAnotherMenuWith422() throws Exception {
        mvc.perform(createAs(ALICE, newKey(), body(line("not-on-this-menu", 1))))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("ITEM_NOT_IN_MENU"));
        assertThat(orderCount()).isZero();
    }

    @Test
    void rejectsNonexistentOrInactiveRestaurantWith422() throws Exception {
        given(restaurantMenuClient.fetchMenu(RID)).willThrow(new RestaurantNotOrderableException());
        mvc.perform(createAs(ALICE, newKey(), VALID))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("RESTAURANT_NOT_AVAILABLE"));
        assertThat(orderCount()).isZero();
    }

    @Test
    void createsNothingWhenPricesCannotBeConfirmed() throws Exception {
        given(restaurantMenuClient.fetchMenu(RID))
                .willThrow(new RestaurantServiceUnavailableException("down", null));
        mvc.perform(createAs(ALICE, newKey(), VALID))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("PRICING_UNAVAILABLE"));
        assertThat(orderCount()).isZero();
    }

    // --- Idempotency (DEC-006) --------------------------------------------------------------------------------

    @Test
    void retryWithTheSameKeyReturnsTheOriginalOrderWithoutCreatingAnother() throws Exception {
        String key = newKey();
        MvcResult first = mvc.perform(createAs(ALICE, key, VALID)).andExpect(status().isCreated()).andReturn();
        MvcResult retry = mvc.perform(createAs(ALICE, key, VALID))
                .andExpect(status().isCreated())
                .andExpect(header().string("Idempotent-Replayed", "true"))
                .andReturn();

        assertThat(idOf(retry)).isEqualTo(idOf(first));
        assertThat(retry.getResponse().getContentAsString()).isEqualTo(first.getResponse().getContentAsString());
        assertThat(orderCount()).isEqualTo(1);
        verify(restaurantMenuClient, times(1)).fetchMenu(RID);
    }

    @Test
    void reusingAKeyForADifferentRequestIsRejected() throws Exception {
        String key = newKey();
        mvc.perform(createAs(ALICE, key, VALID)).andExpect(status().isCreated());
        mvc.perform(createAs(ALICE, key, body(line(DOSA, 5))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
        assertThat(orderCount()).isEqualTo(1);
    }

    @Test
    void keysAreScopedToTheCustomer() throws Exception {
        String key = newKey();
        String aliceOrder = idOf(mvc.perform(createAs(ALICE, key, VALID)).andExpect(status().isCreated()).andReturn());
        String bobOrder = idOf(mvc.perform(createAs(BOB, key, VALID))
                .andExpect(header().string("Idempotent-Replayed", "false")).andReturn());
        assertThat(bobOrder).isNotEqualTo(aliceOrder);
        assertThat(orderCount()).isEqualTo(2);
    }

    @Test
    void concurrentRetriesWithTheSameKeyCreateExactlyOneOrder() throws Exception {
        String key = newKey();
        ExecutorService pool = Executors.newFixedThreadPool(6);
        try {
            List<Callable<MvcResult>> calls = new ArrayList<>();
            for (int i = 0; i < 6; i++) {
                calls.add(() -> mvc.perform(createAs(ALICE, key, VALID)).andReturn());
            }
            Set<String> ids = new HashSet<>();
            for (Future<MvcResult> f : pool.invokeAll(calls)) {
                assertThat(f.get().getResponse().getStatus()).isEqualTo(201);
                ids.add(idOf(f.get()));
            }
            assertThat(ids).hasSize(1);
        } finally {
            pool.shutdown();
        }
        assertThat(orderCount()).isEqualTo(1);
        assertThat(itemCount()).isEqualTo(2);
    }

    // --- Ownership (DEC-013, Q-24; SEC-003, SEC-004) ----------------------------------------------------------

    @Test
    void onlyTheOrdererCanRetrieveAnOrder() throws Exception {
        String id = idOf(mvc.perform(createAs(ALICE, newKey(), VALID)).andExpect(status().isCreated()).andReturn());

        mvc.perform(get("/api/v1/orders/{id}", id).with(jwt().jwt(j -> j.subject(ALICE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.total").value(508.00));

        String othersOrder = mvc.perform(get("/api/v1/orders/{id}", id).with(jwt().jwt(j -> j.subject(BOB))))
                .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        String missing = UUID.randomUUID().toString();
        String nonexistent = mvc.perform(get("/api/v1/orders/{id}", missing).with(jwt().jwt(j -> j.subject(BOB))))
                .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();

        // Indistinguishable apart from the echoed path: no hint that the order exists.
        assertThat(othersOrder.replace(id, "{id}")).isEqualTo(nonexistent.replace(missing, "{id}"));
        assertThat(othersOrder).doesNotContain(ALICE, "Masala");
    }
}
