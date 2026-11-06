package com.foodiehub.order.order;

/** VS-1 knows only the initial status (DEC-011). No transitions, payment or expiry exist yet (DEC-013, Q-28). */
public enum OrderStatus {
    PENDING_PAYMENT
}
