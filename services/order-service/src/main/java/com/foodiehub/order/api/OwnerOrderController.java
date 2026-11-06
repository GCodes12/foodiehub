package com.foodiehub.order.api;

import java.util.List;

import com.foodiehub.order.order.OrderService;
import com.foodiehub.order.restaurant.OwnedRestaurantsClient;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/v1/owner/orders — orders at the restaurants the caller manages, newest first (DEC-015). Requires the
 * RESTAURANT_OWNER role (SecurityConfig). Which restaurants those are is asked of the Restaurant Service with the
 * caller's own token. Customer identities are not included in the response.
 */
@RestController
@RequestMapping("/api/v1/owner/orders")
class OwnerOrderController {

    private final OrderService orderService;
    private final OwnedRestaurantsClient ownedRestaurants;

    OwnerOrderController(OrderService orderService, OwnedRestaurantsClient ownedRestaurants) {
        this.orderService = orderService;
        this.ownedRestaurants = ownedRestaurants;
    }

    @GetMapping
    List<OrderResponse> restaurantOrders(@AuthenticationPrincipal Jwt jwt) {
        List<String> restaurantIds = ownedRestaurants.ownedRestaurantIds(jwt.getTokenValue());
        return orderService.listRestaurantOrders(restaurantIds).stream().map(OrderResponse::from).toList();
    }
}
