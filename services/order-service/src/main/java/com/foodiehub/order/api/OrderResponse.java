package com.foodiehub.order.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.foodiehub.order.order.CustomerOrder;
import com.foodiehub.order.order.OrderItem;
import com.foodiehub.order.order.OrderStatusChange;

/**
 * The created or retrieved order, with purchase-time item snapshots. No payment has been taken (DEC-011); an accepted
 * order is paid at the counter (DEC-016). {@code history} is included only for a single order; it never names who
 * made a change.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OrderResponse(String id, String status, String restaurantId, String fulfilmentType, String currency,
        List<Line> items, BigDecimal subtotal, BigDecimal total, Instant createdAt, Instant statusUpdatedAt,
        String rejectReason, List<StatusStep> history) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record StatusStep(String status, Instant at, String reason) {

        static StatusStep from(OrderStatusChange change) {
            return new StatusStep(change.getToStatus().name(), change.getChangedAt(),
                    change.getReason() == null ? null : change.getReason().name());
        }
    }

    public record Line(String menuItemId, String name, BigDecimal unitPrice, int quantity, BigDecimal lineAmount) {

        static Line from(OrderItem item) {
            return new Line(item.getMenuItemId(), item.getItemName(), item.getUnitPrice(), item.getQuantity(),
                    item.getLineAmount());
        }
    }

    static OrderResponse from(CustomerOrder order) {
        return from(order, null);
    }

    static OrderResponse from(CustomerOrder order, List<OrderStatusChange> history) {
        return new OrderResponse(order.getId(), order.getStatus().name(), order.getRestaurantId(),
                order.getFulfilmentType().name(), order.getCurrency(),
                order.getItems().stream().map(Line::from).toList(), order.getSubtotal(), order.getTotal(),
                order.getCreatedAt(), order.getStatusUpdatedAt(),
                order.getRejectReason() == null ? null : order.getRejectReason().name(),
                history == null ? null : history.stream().map(StatusStep::from).toList());
    }
}
