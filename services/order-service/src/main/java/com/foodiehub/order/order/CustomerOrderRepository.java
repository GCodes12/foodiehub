package com.foodiehub.order.order;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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

    // --- Platform overview for administrators (DEC-017): read-only, no customer identity leaves the service ---------

    /** Orders across all restaurants, optionally filtered; the caller pages and sorts (newest first). */
    @Query("""
            SELECT o FROM CustomerOrder o
            WHERE (:restaurantId IS NULL OR o.restaurantId = :restaurantId)
              AND (:status IS NULL OR o.status = :status)""")
    Page<CustomerOrder> searchAll(String restaurantId, OrderStatus status, Pageable pageable);

    long countByCreatedAtGreaterThanEqual(Instant from);

    /** [status, count] for every status that occurs. */
    @Query("SELECT o.status, COUNT(o) FROM CustomerOrder o GROUP BY o.status")
    List<Object[]> countByStatus();

    /** [sum of totals, sum of totals since {@code from}] over orders that were not rejected. */
    @Query("""
            SELECT COALESCE(SUM(o.total), 0), COALESCE(SUM(CASE WHEN o.createdAt >= :from THEN o.total ELSE 0 END), 0)
            FROM CustomerOrder o WHERE o.status <> com.foodiehub.order.order.OrderStatus.REJECTED""")
    List<Object[]> orderValue(Instant from);

    /** Per restaurant: [restaurantId, orders, orders since {@code from}, last order time]. */
    @Query("""
            SELECT o.restaurantId, COUNT(o), SUM(CASE WHEN o.createdAt >= :from THEN 1 ELSE 0 END), MAX(o.createdAt)
            FROM CustomerOrder o GROUP BY o.restaurantId ORDER BY MAX(o.createdAt) DESC""")
    List<Object[]> activityByRestaurant(Instant from);
}
