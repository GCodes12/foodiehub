package com.foodiehub.order.order;

/** The idempotency key was already used by this customer for a different request. */
public class IdempotencyConflictException extends RuntimeException {

    public IdempotencyConflictException() {
        super("This Idempotency-Key was already used for a different order request", null, false, false);
    }
}
