package com.foodiehub.restaurant.api;

import java.math.BigDecimal;
import java.util.List;

import com.foodiehub.restaurant.domain.MenuItem;

/**
 * Public menu view. Unavailable items stay visible and are marked by {@code available = false} (DEC-008).
 * Items are in menu order (sort order, then name). Details per DEC-014: {@code category} is a section code,
 * {@code diet} is VEG / EGG / NON_VEG or null, {@code imageKey} names the dish photo or is null.
 */
public record MenuResponse(String restaurantId, String currency, List<Item> items) {

    public record Item(String id, String name, BigDecimal price, boolean available, String category,
            String description, String diet, boolean bestseller, boolean chefSpecial, String imageKey) {

        static Item from(MenuItem item) {
            return new Item(item.getId(), item.getName(), item.getPrice(), item.isAvailable(), item.getCategory(),
                    item.getDescription(), item.getDiet(), item.isBestseller(), item.isChefSpecial(), item.getImageKey());
        }
    }

    static MenuResponse of(String restaurantId, List<MenuItem> items) {
        return new MenuResponse(restaurantId, "INR", items.stream().map(Item::from).toList());
    }
}
