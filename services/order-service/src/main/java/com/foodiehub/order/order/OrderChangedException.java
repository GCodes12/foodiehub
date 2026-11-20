package com.foodiehub.order.order;

/** The order changed since the caller last saw it (stale screen or a simultaneous change). → 409 ORDER_CHANGED */
public class OrderChangedException extends RuntimeException {

    public OrderChangedException() {
        super("ORDER_CHANGED", null, false, false);
    }
}
