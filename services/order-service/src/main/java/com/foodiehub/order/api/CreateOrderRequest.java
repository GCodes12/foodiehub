package com.foodiehub.order.api;

import java.util.List;

import com.foodiehub.order.order.FulfilmentType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Checkout request. It carries no prices: any price or total a client sends is ignored (unknown JSON properties
 * are not bound) and the server prices the order from the menu (DEC-013).
 * Bounds: 1–20 lines, quantity 1–50 per line (DEC-013, Q-30).
 * Messages: {@code order.*} keys in messages.properties.
 */
public record CreateOrderRequest(
        @NotBlank(message = "{order.restaurantId.required}")
        @Pattern(regexp = ID_PATTERN, message = "{order.id.invalid}") String restaurantId,
        @NotNull(message = "{order.fulfilmentType.required}") FulfilmentType fulfilmentType,
        @NotEmpty(message = "{order.items.required}")
        @Size(max = 20, message = "{order.items.tooMany}")
        List<@Valid @NotNull(message = "{order.items.line.required}") Line> items) {

    static final String ID_PATTERN = "^[A-Za-z0-9-]{1,36}$";

    public record Line(
            @NotBlank(message = "{order.menuItemId.required}")
            @Pattern(regexp = ID_PATTERN, message = "{order.id.invalid}") String menuItemId,
            @NotNull(message = "{order.quantity.required}")
            @Min(value = 1, message = "{order.quantity.min}")
            @Max(value = 50, message = "{order.quantity.max}") Integer quantity) {
    }
}
