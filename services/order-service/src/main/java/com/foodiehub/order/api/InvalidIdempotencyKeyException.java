package com.foodiehub.order.api;

/** Missing or malformed Idempotency-Key header. Client text: problem.INVALID_IDEMPOTENCY_KEY in messages.properties. */
class InvalidIdempotencyKeyException extends RuntimeException {

    InvalidIdempotencyKeyException() {
        super("INVALID_IDEMPOTENCY_KEY", null, false, false);
    }
}
