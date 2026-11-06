package com.foodiehub.order.order;

/** A well-formed checkout that breaks a business rule (DEC-008, DEC-013). No order is created. */
public class CheckoutRejectedException extends RuntimeException {

    private final String code;

    public CheckoutRejectedException(String code, String message) {
        super(message, null, false, false);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
