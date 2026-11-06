package com.foodiehub.order.order;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, String> {

    /** Ownership check in the query itself: another customer's order is simply "not found" (DEC-013, Q-24). */
    @EntityGraph(attributePaths = "items")
    Optional<CustomerOrder> findByIdAndCustomerId(String id, String customerId);

    @EntityGraph(attributePaths = "items")
    Optional<CustomerOrder> findByCustomerIdAndIdempotencyKey(String customerId, String idempotencyKey);
}
