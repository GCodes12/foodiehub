package com.foodiehub.restaurant.api;

import com.foodiehub.restaurant.domain.Restaurant;

/** Public restaurant view. Deliberately has no {@code active} field (DEC-009). */
public record RestaurantResponse(String id, String name) {

    static RestaurantResponse from(Restaurant restaurant) {
        return new RestaurantResponse(restaurant.getId(), restaurant.getName());
    }
}
