package com.foodiehub.order.api;

class InvalidIdempotencyKeyException extends RuntimeException {

    InvalidIdempotencyKeyException() {
        super("An Idempotency-Key header of 8-64 characters (letters, digits, '-' or '_') is required; a UUID is recommended.",
                null, false, false);
    }
}
