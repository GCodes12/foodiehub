package com.foodiehub.order.api;

import java.util.List;

import com.foodiehub.order.order.OrderLifecycle;
import com.foodiehub.order.order.OrderService;
import com.foodiehub.order.restaurant.OwnedRestaurantsClient;
import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET   /api/v1/owner/orders              — orders at the restaurants the caller manages, newest first (DEC-015).
 * PATCH /api/v1/owner/orders/{id}/status  — move an order along its lifecycle (DEC-016).
 * Requires the
 * RESTAURANT_OWNER role (SecurityConfig). Which restaurants those are is asked of the Restaurant Service with the
 * caller's own token. Customer identities are not included in the response.
 */
@RestController
@RequestMapping("/api/v1/owner/orders")
class OwnerOrderController {

    private final OrderService orderService;
    private final OrderLifecycle lifecycle;
    private final OwnedRestaurantsClient ownedRestaurants;

    OwnerOrderController(OrderService orderService, OrderLifecycle lifecycle, OwnedRestaurantsClient ownedRestaurants) {
        this.orderService = orderService;
        this.lifecycle = lifecycle;
        this.ownedRestaurants = ownedRestaurants;
    }

    @GetMapping
    List<OrderResponse> restaurantOrders(@AuthenticationPrincipal Jwt jwt) {
        List<String> restaurantIds = ownedRestaurants.ownedRestaurantIds(jwt.getTokenValue());
        return orderService.listRestaurantOrders(restaurantIds).stream().map(OrderResponse::from).toList();
    }

    /** 404 when the order does not exist or is not at one of the caller's restaurants (indistinguishable). */
    @PatchMapping("/{orderId}/status")
    OrderResponse changeStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable String orderId,
            @Valid @RequestBody UpdateOrderStatusRequest request) {
        List<String> restaurantIds = ownedRestaurants.ownedRestaurantIds(jwt.getTokenValue());
        String changedBy = jwt.getClaimAsString("preferred_username");
        return lifecycle.changeStatus(orderId, restaurantIds, request.from(), request.status(), request.reason(),
                        changedBy == null ? jwt.getSubject() : changedBy)
                .map(order -> OrderResponse.from(order, lifecycle.historyOf(order.getId())))
                .orElseThrow(OrderNotFoundException::new);
    }
}
