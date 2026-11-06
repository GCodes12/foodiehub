package com.foodiehub.restaurant.api;

/** Raised for both nonexistent and inactive restaurants; the response must not reveal which (DEC-010). */
class RestaurantNotFoundException extends RuntimeException {

    RestaurantNotFoundException() {
        super("Restaurant not found", null, false, false);
    }
}
