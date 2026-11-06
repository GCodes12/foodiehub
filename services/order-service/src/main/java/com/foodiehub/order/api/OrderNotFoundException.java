package com.foodiehub.order.api;

/** Raised for both nonexistent orders and other customers' orders; the response must not reveal which. */
class OrderNotFoundException extends RuntimeException {

    OrderNotFoundException() {
        super("Order not found", null, false, false);
    }
}
