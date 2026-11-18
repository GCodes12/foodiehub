package com.foodiehub.restaurant.domain;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantOwnerLinkRepository extends JpaRepository<RestaurantOwnerLink, String> {

    List<RestaurantOwnerLink> findAllByRestaurantIdIn(Collection<String> restaurantIds);

    List<RestaurantOwnerLink> findAllByOwnerSubIn(Collection<String> ownerSubs);
}
