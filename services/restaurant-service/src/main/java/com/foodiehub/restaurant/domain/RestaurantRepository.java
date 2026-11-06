package com.foodiehub.restaurant.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RestaurantRepository extends JpaRepository<Restaurant, String> {

    List<Restaurant> findAllByActiveTrueOrderByNameAscIdAsc();

    Optional<Restaurant> findByIdAndActiveTrue(String id);

    /** Restaurants this owner manages (DEC-015), active or not: an owner may manage a restaurant that is closed. */
    @Query(value = """
            SELECT r.* FROM restaurant r
            JOIN restaurant_owner o ON o.restaurant_id = r.id
            WHERE o.owner_username = :username
            ORDER BY r.name, r.id""", nativeQuery = true)
    List<Restaurant> findAllOwnedBy(String username);
}
