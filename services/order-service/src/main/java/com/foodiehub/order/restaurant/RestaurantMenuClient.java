package com.foodiehub.order.restaurant;

import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Internal REST call to Restaurant Service for authoritative prices and availability (DEC-013, Q-29).
 * It uses the public, read-only menu endpoint, which already returns 404 for nonexistent and inactive restaurants.
 * Authenticating this call (SEC-005) is PROPOSED and not implemented in CP-3.
 */
public class RestaurantMenuClient {

    private final RestClient restClient;

    public RestaurantMenuClient(RestClient restClient) {
        this.restClient = restClient;
    }

    public RestaurantMenu fetchMenu(String restaurantId) {
        RestaurantMenu menu;
        try {
            menu = restClient.get()
                    .uri("/api/v1/restaurants/{id}/menu", restaurantId)
                    .retrieve()
                    .onStatus(status -> status.value() == HttpStatus.NOT_FOUND.value(), (request, response) -> {
                        throw new RestaurantNotOrderableException();
                    })
                    .body(RestaurantMenu.class);
        } catch (RestaurantNotOrderableException e) {
            throw e;
        } catch (RestClientException e) {
            throw new RestaurantServiceUnavailableException("Restaurant Service call failed", e);
        }
        if (menu == null || menu.items() == null || !"INR".equals(menu.currency())
                || !restaurantId.equals(menu.restaurantId())) {
            throw new RestaurantServiceUnavailableException("Restaurant Service returned an unusable menu", null);
        }
        return menu;
    }
}
