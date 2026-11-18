package com.foodiehub.restaurant.domain;

/** A restaurant without any available dish cannot be activated: customers would see an empty menu (DEC-017). → 409 */
public class RestaurantHasNoMenuException extends RuntimeException {

    public RestaurantHasNoMenuException() {
        super("RESTAURANT_HAS_NO_MENU", null, false, false);
    }
}
