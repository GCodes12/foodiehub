package com.foodiehub.order.order;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owner status changes (DEC-016), with history. Ownership is decided by the caller-supplied restaurant list. */
@Service
public class OrderLifecycle {

    private final CustomerOrderRepository orders;
    private final OrderStatusChangeRepository history;
    private final Clock clock = Clock.systemUTC();

    public OrderLifecycle(CustomerOrderRepository orders, OrderStatusChangeRepository history) {
        this.orders = orders;
        this.history = history;
    }

    /**
     * Moves an order of one of {@code ownedRestaurantIds} from {@code expected} to {@code target}. Empty when the order
     * does not exist or belongs to another restaurant (the caller answers 404 for both).
     *
     * @throws OrderChangedException when the order is no longer in {@code expected} (stale screen, simultaneous change)
     * @throws IllegalOrderTransitionException when the move is not allowed
     */
    @Transactional
    public Optional<CustomerOrder> changeStatus(String orderId, Collection<String> ownedRestaurantIds, OrderStatus expected,
            OrderStatus target, RejectReason reason, String changedBy) {
        Optional<CustomerOrder> found = orders.findWithItemsById(orderId)
                .filter(order -> ownedRestaurantIds.contains(order.getRestaurantId()));
        if (found.isEmpty()) {
            return Optional.empty();
        }
        CustomerOrder order = found.get();
        if (order.getStatus() != expected) {
            throw new OrderChangedException();
        }
        OrderStatusChange change = order.moveTo(target, reason, changedBy, Instant.now(clock).truncatedTo(ChronoUnit.MICROS));
        try {
            orders.saveAndFlush(order);
        } catch (ObjectOptimisticLockingFailureException e) {
            throw new OrderChangedException();
        }
        history.save(change);
        return Optional.of(order);
    }

    @Transactional(readOnly = true)
    public List<OrderStatusChange> historyOf(String orderId) {
        return history.findAllByOrderIdOrderByChangedAtAscIdAsc(orderId);
    }
}
