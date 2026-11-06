package com.foodiehub.order.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;
import java.util.Properties;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

import com.foodiehub.order.config.SecurityConfig;
import com.foodiehub.order.order.CheckoutRejectedException;
import com.foodiehub.order.order.OrderService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Client-facing texts come from messages.properties (not from Java code), and every code the service can return
 * has a title and a detail there. No Docker needed.
 */
@WebMvcTest(OrderController.class)
@Import(SecurityConfig.class)
class ProblemMessagesTest {

    private static final String VALID = """
            {"restaurantId":"00000000-0000-0000-0000-000000000001","fulfilmentType":"PICKUP",
             "items":[{"menuItemId":"00000000-0000-0000-0001-000000000001","quantity":%s}]}""";

    @Autowired
    MockMvc mvc;

    @MockitoBean
    OrderService orderService;

    @MockitoBean
    com.foodiehub.order.order.OrderLifecycle lifecycle;

    private static MockHttpServletRequestBuilder create(String body) {
        return post("/api/v1/orders").with(jwt().jwt(j -> j.subject("alice"))
                        .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_CUSTOMER")))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON).content(body);
    }

    @ParameterizedTest
    @CsvSource({"51, must be at most 50", "0, must be at least 1"})
    void fieldValidationMessagesComeFromTheResourceFile(String quantity, String message) throws Exception {
        mvc.perform(create(VALID.formatted(quantity)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.title").value("Invalid order request"))
                .andExpect(jsonPath("$.errors[0].field").value("items[0].quantity"))
                .andExpect(jsonPath("$.errors[0].message").value(message));
    }

    @Test
    void validationPlaceholdersAreFilledIn() throws Exception {
        StringBuilder lines = new StringBuilder();
        for (int i = 0; i < 21; i++) {
            lines.append(i == 0 ? "" : ",").append("{\"menuItemId\":\"item-").append(i).append("\",\"quantity\":1}");
        }
        mvc.perform(create("{\"restaurantId\":\"r1\",\"fulfilmentType\":\"PICKUP\",\"items\":[" + lines + "]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("items"))
                .andExpect(jsonPath("$.errors[0].message").value("must contain at most 20 lines"));
    }

    @Test
    void unreadableBodyGetsItsOwnCodeAndMessage() throws Exception {
        mvc.perform(create(VALID.formatted("\"two\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"))
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.startsWith("The request body could not be read.")));
    }

    @Test
    void businessRuleTextIsLookedUpByCode() throws Exception {
        given(orderService.create(any())).willThrow(new CheckoutRejectedException("ITEM_UNAVAILABLE"));
        mvc.perform(create(VALID.formatted("1")))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("ITEM_UNAVAILABLE"))
                .andExpect(jsonPath("$.title").value("Order cannot be placed"))
                .andExpect(jsonPath("$.detail").value("A requested item is currently unavailable."));
    }

    @Test
    void notFoundUsesTheFixedText() throws Exception {
        given(orderService.findOwnOrder(any(), any())).willReturn(Optional.empty());
        mvc.perform(get("/api/v1/orders/{id}", "o-1").with(jwt()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"))
                .andExpect(jsonPath("$.detail").value("Order not found."));
    }

    /** Guards against a new code (or a typo) that has no text: it would reach the client with an empty detail. */
    @Test
    void everyCodeInTheSourceHasATitleAndADetail() throws IOException {
        Properties bundle = new Properties();
        try (InputStream in = getClass().getResourceAsStream("/messages.properties")) {
            assertThat(in).as("messages.properties on the classpath").isNotNull();
            bundle.load(in);
        }
        Set<String> codes = new TreeSet<>();
        Pattern quoted = Pattern.compile(
                "(?:CheckoutRejectedException\\(|problem\\(HttpStatus\\.[A-Z_]+,\\s*)\"([A-Z_]+)\"");
        try (Stream<Path> sources = Files.walk(Path.of("src/main/java"))) {
            for (Path file : sources.filter(p -> p.toString().endsWith(".java")).toList()) {
                Matcher m = quoted.matcher(Files.readString(file));
                while (m.find()) {
                    codes.add(m.group(1));
                }
            }
        }
        assertThat(codes).contains("ITEM_UNAVAILABLE", "STORAGE_FAILED", "ORDER_NOT_FOUND", "MALFORMED_REQUEST");
        for (String code : codes) {
            assertThat(bundle.getProperty("problem." + code + ".title")).as(code + " title").isNotBlank();
            assertThat(bundle.getProperty("problem." + code + ".detail")).as(code + " detail").isNotBlank();
        }
        Set<String> validationKeys = new TreeSet<>();
        Matcher m = Pattern.compile("message = \"\\{([a-zA-Z.]+)}\"")
                .matcher(Files.readString(Path.of("src/main/java/com/foodiehub/order/api/CreateOrderRequest.java")));
        while (m.find()) {
            validationKeys.add(m.group(1));
        }
        assertThat(validationKeys).hasSizeGreaterThan(5);
        for (String key : validationKeys) {
            assertThat(bundle.getProperty(key)).as(key).isNotBlank();
        }
    }
}
