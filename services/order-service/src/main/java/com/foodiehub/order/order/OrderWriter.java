package com.foodiehub.order.order;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * The single local transaction of order creation: the order and all its lines are inserted together or not at all
 * (data-model.md §6.4). The Restaurant Service lookup happens before, outside this transaction.
 * {@code @Repository} translates a unique-key violation into DataIntegrityViolationException.
 */
@Repository
class OrderWriter {

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public CustomerOrder insert(CustomerOrder order) {
        entityManager.persist(order);
        entityManager.flush();
        return order;
    }
}
