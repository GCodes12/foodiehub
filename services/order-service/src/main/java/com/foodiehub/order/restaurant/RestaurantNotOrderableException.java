package com.foodiehub.order.restaurant;

/** The restaurant does not exist or is not active. Restaurant Service does not reveal which (DEC-010). */
public class RestaurantNotOrderableException extends RuntimeException {

    public RestaurantNotOrderableException() {
        super("Restaurant not found or not available for ordering", null, false, false);
    }
}
