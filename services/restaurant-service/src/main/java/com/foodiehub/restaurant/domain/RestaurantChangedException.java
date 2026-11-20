package com.foodiehub.restaurant.domain;

/** The restaurant changed since the administrator loaded it (stale screen or a simultaneous change). → 409 */
public class RestaurantChangedException extends RuntimeException {

    public RestaurantChangedException() {
        super("RESTAURANT_CHANGED", null, false, false);
    }
}
