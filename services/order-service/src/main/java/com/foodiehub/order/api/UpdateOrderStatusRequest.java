package com.foodiehub.order.api;

import com.foodiehub.order.order.OrderStatus;
import com.foodiehub.order.order.RejectReason;
import jakarta.validation.constraints.NotNull;

/**
 * Owner status change (DEC-016). {@code from} is the status the owner's screen showed; if the order has moved on since,
 * the change is refused (409 ORDER_CHANGED) instead of being applied to a different state. {@code reason} only with
 * REJECTED, and optional there.
 */
public record UpdateOrderStatusRequest(
        @NotNull(message = "{order.status.required}") OrderStatus status,
        @NotNull(message = "{order.status.required}") OrderStatus from,
        RejectReason reason) {
}
