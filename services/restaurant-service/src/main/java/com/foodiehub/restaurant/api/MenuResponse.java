package com.foodiehub.restaurant.api;

import java.math.BigDecimal;
import java.util.List;

import com.foodiehub.restaurant.domain.MenuItem;

/** Public menu view. Unavailable items stay visible and are marked by {@code available = false} (DEC-008). */
public record MenuResponse(String restaurantId, String currency, List<Item> items) {

    public record Item(String id, String name, BigDecimal price, boolean available) {

        static Item from(MenuItem item) {
            return new Item(item.getId(), item.getName(), item.getPrice(), item.isAvailable());
        }
    }

    static MenuResponse of(String restaurantId, List<MenuItem> items) {
        return new MenuResponse(restaurantId, "INR", items.stream().map(Item::from).toList());
    }
}
