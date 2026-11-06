package com.foodiehub.order.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;

import org.junit.jupiter.api.Test;

/** The DEC-016 lifecycle: exactly these moves are allowed. */
class OrderStatusTest {

    @Test
    void allowsExactlyTheApprovedMoves() {
        for (OrderStatus from : OrderStatus.values()) {
            for (OrderStatus to : OrderStatus.values()) {
                boolean expected = switch (from) {
                    case PENDING_PAYMENT -> to == OrderStatus.ACCEPTED || to == OrderStatus.REJECTED;
                    case ACCEPTED -> to == OrderStatus.PREPARING;
                    case PREPARING -> to == OrderStatus.READY_FOR_PICKUP;
                    case READY_FOR_PICKUP -> to == OrderStatus.PICKED_UP;
                    case REJECTED, PICKED_UP -> false;
                };
                assertThat(from.canMoveTo(to)).as(from + " -> " + to).isEqualTo(expected);
            }
        }
        assertThat(EnumSet.allOf(OrderStatus.class).stream().filter(OrderStatus::isFinal))
                .containsExactlyInAnyOrder(OrderStatus.REJECTED, OrderStatus.PICKED_UP);
    }

    @Test
    void movingRecordsTheChangeAndOnlyARejectionKeepsAReason() {
        OrderPricing.PricedOrder priced = new OrderPricing.PricedOrder(List.of(
                new OrderPricing.PricedLine("m", "Dish", new BigDecimal("10.00"), 1, new BigDecimal("10.00"))),
                new BigDecimal("10.00"), new BigDecimal("10.00"));
        CustomerOrder order = CustomerOrder.create("c", "r", FulfilmentType.PICKUP, priced, "key-12345", "h".repeat(64), Instant.EPOCH);
        Instant now = Instant.parse("2026-11-06T10:00:00Z");

        OrderStatusChange change = order.moveTo(OrderStatus.ACCEPTED, null, "owner", now);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.ACCEPTED);
        assertThat(order.getStatusUpdatedAt()).isEqualTo(now);
        assertThat(change.getFromStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(change.getChangedBy()).isEqualTo("owner");
        assertThat(order.getTotal()).isEqualByComparingTo("10.00");

        assertThatThrownBy(() -> order.moveTo(OrderStatus.PREPARING, RejectReason.TOO_BUSY, "owner", now))
                .isInstanceOf(IllegalOrderTransitionException.class);
        assertThatThrownBy(() -> order.moveTo(OrderStatus.PICKED_UP, null, "owner", now))
                .isInstanceOf(IllegalOrderTransitionException.class);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.ACCEPTED);
    }
}
