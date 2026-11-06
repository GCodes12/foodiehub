package com.foodiehub.order.order;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, String> {

    /** Ownership check in the query itself: another customer's order is simply "not found" (DEC-013, Q-24). */
    @EntityGraph(attributePaths = "items")
    Optional<CustomerOrder> findByIdAndCustomerId(String id, String customerId);

    @EntityGraph(attributePaths = "items")
    Optional<CustomerOrder> findWithItemsById(String id);

    @EntityGraph(attributePaths = "items")
    Optional<CustomerOrder> findByCustomerIdAndIdempotencyKey(String customerId, String idempotencyKey);

    /** The customer's own orders, newest first (DEC-014, US-04 list). Ownership is part of the query. */
    @EntityGraph(attributePaths = "items")
    List<CustomerOrder> findAllByCustomerIdOrderByCreatedAtDescIdDesc(String customerId);

    /** Orders placed at these restaurants, newest first (DEC-015 owner view). The caller decides which restaurants. */
    @EntityGraph(attributePaths = "items")
    List<CustomerOrder> findAllByRestaurantIdInOrderByCreatedAtDescIdDesc(Collection<String> restaurantIds);
}
