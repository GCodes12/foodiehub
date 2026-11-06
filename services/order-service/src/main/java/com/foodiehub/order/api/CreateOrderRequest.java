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
 */
public record CreateOrderRequest(
        @NotBlank @Pattern(regexp = ID_PATTERN, message = "must be a valid identifier") String restaurantId,
        @NotNull FulfilmentType fulfilmentType,
        @NotEmpty(message = "must contain at least one item")
        @Size(max = 20, message = "must contain at most 20 lines") List<@Valid @NotNull Line> items) {

    static final String ID_PATTERN = "^[A-Za-z0-9-]{1,36}$";

    public record Line(
            @NotBlank @Pattern(regexp = ID_PATTERN, message = "must be a valid identifier") String menuItemId,
            @NotNull @Min(1) @Max(50) Integer quantity) {
    }
}
