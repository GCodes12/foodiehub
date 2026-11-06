package com.foodiehub.restaurant.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantRepository extends JpaRepository<Restaurant, String> {

    List<Restaurant> findAllByActiveTrueOrderByNameAscIdAsc();

    Optional<Restaurant> findByIdAndActiveTrue(String id);
}
