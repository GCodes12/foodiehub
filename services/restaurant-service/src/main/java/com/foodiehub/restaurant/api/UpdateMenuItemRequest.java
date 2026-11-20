package com.foodiehub.restaurant.api;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;

/**
 * Owner change to one dish (DEC-015). Every field is optional; only the fields sent are changed. Prices keep the
 * DEC-012 representation: INR, at most two decimals, at most 99,999,999.99. Messages: menu.* in messages.properties.
 */
public record UpdateMenuItemRequest(
        Boolean available,
        @DecimalMin(value = "0.00", inclusive = false, message = "{menu.price.min}")
        @DecimalMax(value = "99999999.99", message = "{menu.price.max}")
        @Digits(integer = 8, fraction = 2, message = "{menu.price.digits}") BigDecimal price,
        @Size(max = 300, message = "{menu.description.size}") String description,
        Boolean bestseller,
        Boolean chefSpecial) {
}
