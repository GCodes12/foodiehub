package com.foodiehub.order.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.foodiehub.order.order.CustomerOrder;
import com.foodiehub.order.order.OrderItem;

/** The created or retrieved order, with purchase-time item snapshots. No payment has been taken (DEC-011). */
public record OrderResponse(String id, String status, String restaurantId, String fulfilmentType, String currency,
        List<Line> items, BigDecimal subtotal, BigDecimal total, Instant createdAt) {

    public record Line(String menuItemId, String name, BigDecimal unitPrice, int quantity, BigDecimal lineAmount) {

        static Line from(OrderItem item) {
            return new Line(item.getMenuItemId(), item.getItemName(), item.getUnitPrice(), item.getQuantity(),
                    item.getLineAmount());
        }
    }

    static OrderResponse from(CustomerOrder order) {
        return new OrderResponse(order.getId(), order.getStatus().name(), order.getRestaurantId(),
                order.getFulfilmentType().name(), order.getCurrency(),
                order.getItems().stream().map(Line::from).toList(), order.getSubtotal(), order.getTotal(),
                order.getCreatedAt());
    }
}
