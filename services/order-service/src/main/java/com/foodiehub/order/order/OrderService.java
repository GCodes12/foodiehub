package com.foodiehub.order.order;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import com.foodiehub.order.restaurant.RestaurantMenu;
import com.foodiehub.order.restaurant.RestaurantMenuClient;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * Order creation (CP-3) and owner-only retrieval (CP-4).
 *
 * <p>Idempotency (DEC-006; details are an implementation proposal, see README): the key is scoped to the customer.
 * A repeat with the same key and the same request returns the original order without creating another one;
 * the same key with a different request is rejected. Concurrent duplicates are resolved by the unique
 * (customer_id, idempotency_key) constraint.
 */
@Service
public class OrderService {

    public record CreateCommand(String customerId, String idempotencyKey, String restaurantId,
            FulfilmentType fulfilmentType, List<OrderPricing.RequestedLine> lines) {
    }

    public record CreateResult(CustomerOrder order, boolean replayed) {
    }

    private final CustomerOrderRepository orders;
    private final OrderWriter writer;
    private final RestaurantMenuClient restaurantMenuClient;
    private final Clock clock;

    public OrderService(CustomerOrderRepository orders, OrderWriter writer, RestaurantMenuClient restaurantMenuClient) {
        this.orders = orders;
        this.writer = writer;
        this.restaurantMenuClient = restaurantMenuClient;
        this.clock = Clock.systemUTC();
    }

    public CreateResult create(CreateCommand cmd) {
        String hash = RequestFingerprint.of(cmd.restaurantId(), cmd.fulfilmentType(), cmd.lines());

        Optional<CustomerOrder> previous = orders.findByCustomerIdAndIdempotencyKey(cmd.customerId(), cmd.idempotencyKey());
        if (previous.isPresent()) {
            return replay(previous.get(), hash);
        }

        // Authoritative prices and availability, fetched before (and outside) the database transaction.
        RestaurantMenu menu = restaurantMenuClient.fetchMenu(cmd.restaurantId());
        OrderPricing.PricedOrder priced = OrderPricing.price(cmd.lines(), menu);

        CustomerOrder order = CustomerOrder.create(cmd.customerId(), cmd.restaurantId(), cmd.fulfilmentType(), priced,
                cmd.idempotencyKey(), hash, Instant.now(clock).truncatedTo(ChronoUnit.MICROS));
        try {
            return new CreateResult(writer.insert(order), false);
        } catch (DataIntegrityViolationException e) {
            // A concurrent request with the same key committed first.
            return orders.findByCustomerIdAndIdempotencyKey(cmd.customerId(), cmd.idempotencyKey())
                    .map(existing -> replay(existing, hash))
                    .orElseThrow(() -> e);
        }
    }

    public Optional<CustomerOrder> findOwnOrder(String orderId, String customerId) {
        return orders.findByIdAndCustomerId(orderId, customerId);
    }

    private static CreateResult replay(CustomerOrder existing, String hash) {
        if (!existing.getRequestHash().equals(hash)) {
            throw new IdempotencyConflictException();
        }
        return new CreateResult(existing, true);
    }
}
