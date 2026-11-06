package com.foodiehub.order.order;

import java.util.Map;
import java.util.Set;

/**
 * Pickup order lifecycle (DEC-016). New orders start as PENDING_PAYMENT; an owner may accept them unpaid (payment at
 * the counter). REJECTED and PICKED_UP are final.
 * <pre>
 * PENDING_PAYMENT ─► ACCEPTED ─► PREPARING ─► READY_FOR_PICKUP ─► PICKED_UP
 *        └─► REJECTED
 * </pre>
 */
public enum OrderStatus {
    PENDING_PAYMENT, ACCEPTED, REJECTED, PREPARING, READY_FOR_PICKUP, PICKED_UP;

    private static final Map<OrderStatus, Set<OrderStatus>> NEXT = Map.of(
            PENDING_PAYMENT, Set.of(ACCEPTED, REJECTED),
            ACCEPTED, Set.of(PREPARING),
            PREPARING, Set.of(READY_FOR_PICKUP),
            READY_FOR_PICKUP, Set.of(PICKED_UP),
            REJECTED, Set.of(),
            PICKED_UP, Set.of());

    public boolean canMoveTo(OrderStatus target) {
        return NEXT.get(this).contains(target);
    }

    public boolean isFinal() {
        return NEXT.get(this).isEmpty();
    }
}
