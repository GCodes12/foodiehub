package com.foodiehub.order.order;

/** The requested status change is not allowed from the order's current status (DEC-016). → 409 INVALID_TRANSITION */
public class IllegalOrderTransitionException extends RuntimeException {

    public IllegalOrderTransitionException(OrderStatus from, OrderStatus to) {
        super("INVALID_TRANSITION " + from + " -> " + to, null, false, false);
    }
}
