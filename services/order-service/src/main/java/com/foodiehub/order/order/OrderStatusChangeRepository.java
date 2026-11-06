package com.foodiehub.order.order;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderStatusChangeRepository extends JpaRepository<OrderStatusChange, Long> {

    List<OrderStatusChange> findAllByOrderIdOrderByChangedAtAscIdAsc(String orderId);
}
