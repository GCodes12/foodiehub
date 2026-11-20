package com.foodiehub.order.restaurant;

import java.math.BigDecimal;
import java.util.List;

/** Authoritative menu as returned by restaurant-service GET /api/v1/restaurants/{id}/menu. */
public record RestaurantMenu(String restaurantId, String currency, List<Item> items) {

    public record Item(String id, String name, BigDecimal price, boolean available) {
    }
}
