package com.foodiehub.order.restaurant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class RestaurantMenuClientTest {

    private static final String URL = "http://restaurant.test/api/v1/restaurants/r1/menu";

    private MockRestServiceServer server;
    private RestaurantMenuClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://restaurant.test");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new RestaurantMenuClient(builder.build());
    }

    @Test
    void parsesTheMenuWithExactPrices() {
        server.expect(requestTo(URL)).andExpect(method(HttpMethod.GET)).andRespond(withSuccess("""
                {"restaurantId":"r1","currency":"INR","items":[
                  {"id":"m1","name":"Masala Dosa","price":129.50,"available":true},
                  {"id":"m2","name":"Gulab Jamun","price":79.00,"available":false}]}""", MediaType.APPLICATION_JSON));

        RestaurantMenu menu = client.fetchMenu("r1");

        assertThat(menu.items()).hasSize(2);
        assertThat(menu.items().get(0).price()).isEqualTo(new BigDecimal("129.50"));
        assertThat(menu.items().get(1).available()).isFalse();
        server.verify();
    }

    @Test
    void notFoundMeansTheRestaurantCannotBeOrderedFrom() {
        server.expect(requestTo(URL)).andRespond(withResourceNotFound());
        assertThatThrownBy(() -> client.fetchMenu("r1")).isInstanceOf(RestaurantNotOrderableException.class);
    }

    @Test
    void serverErrorMeansPricingIsUnavailable() {
        server.expect(requestTo(URL)).andRespond(withServerError());
        assertThatThrownBy(() -> client.fetchMenu("r1")).isInstanceOf(RestaurantServiceUnavailableException.class);
    }

    @Test
    void rejectsAMenuForAnotherRestaurantOrCurrency() {
        server.expect(requestTo(URL)).andRespond(withSuccess(
                "{\"restaurantId\":\"other\",\"currency\":\"INR\",\"items\":[]}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.fetchMenu("r1")).isInstanceOf(RestaurantServiceUnavailableException.class);
    }

    @Test
    void connectionFailureMeansPricingIsUnavailable() {
        RestaurantMenuClient unreachable = new RestaurantMenuClient(
                RestClient.builder().baseUrl("http://127.0.0.1:1").build());
        assertThatThrownBy(() -> unreachable.fetchMenu("r1")).isInstanceOf(RestaurantServiceUnavailableException.class);
    }
}
