package com.foodiehub.order.restaurant;

/** Restaurant Service could not be reached or returned an unusable answer; no order can be priced. */
public class RestaurantServiceUnavailableException extends RuntimeException {

    public RestaurantServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
