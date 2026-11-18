package com.foodiehub.restaurant.domain;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MenuItemRepository extends JpaRepository<MenuItem, String> {

    List<MenuItem> findAllByRestaurantIdOrderBySortOrderAscNameAscIdAsc(String restaurantId);

    long countByRestaurantIdAndAvailableTrue(String restaurantId);

    /** Per restaurant: [restaurantId, all dishes, available dishes] (DEC-017 administrator views). */
    @Query("""
            SELECT m.restaurantId, COUNT(m), SUM(CASE WHEN m.available = true THEN 1 ELSE 0 END)
            FROM MenuItem m WHERE m.restaurantId IN :restaurantIds GROUP BY m.restaurantId""")
    List<Object[]> countDishesByRestaurant(Collection<String> restaurantIds);
}
