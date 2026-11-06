package com.foodiehub.restaurant.domain;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuItemRepository extends JpaRepository<MenuItem, String> {

    List<MenuItem> findAllByRestaurantIdOrderByNameAscIdAsc(String restaurantId);
}
