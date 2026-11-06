package com.foodiehub.order.order;

/**
 * A well-formed checkout that breaks a business rule (DEC-008, DEC-013). No order is created.
 * The code is returned to the client; its text lives in messages.properties ({@code problem.<CODE>.detail}).
 */
public class CheckoutRejectedException extends RuntimeException {

    private final String code;

    public CheckoutRejectedException(String code) {
        super(code, null, false, false);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
