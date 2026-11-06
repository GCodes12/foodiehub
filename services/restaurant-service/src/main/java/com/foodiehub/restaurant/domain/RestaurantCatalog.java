package com.foodiehub.restaurant.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Public, read-only catalogue queries (DEC-009). Only active restaurants are visible; an inactive restaurant
 * is treated exactly like a nonexistent one (DEC-010, SEC-008).
 */
@Service
@Transactional(readOnly = true)
public class RestaurantCatalog {

    private final RestaurantRepository restaurants;
    private final MenuItemRepository menuItems;

    public RestaurantCatalog(RestaurantRepository restaurants, MenuItemRepository menuItems) {
        this.restaurants = restaurants;
        this.menuItems = menuItems;
    }

    public List<Restaurant> listActiveRestaurants() {
        return restaurants.findAllByActiveTrueOrderByNameAscIdAsc();
    }

    public Optional<Restaurant> findActiveRestaurant(String id) {
        return restaurants.findByIdAndActiveTrue(id);
    }

    /** Empty when the restaurant does not exist <em>or</em> is inactive; callers must not distinguish the two. */
    public Optional<List<MenuItem>> findMenuOfActiveRestaurant(String restaurantId) {
        return restaurants.findByIdAndActiveTrue(restaurantId)
                .map(r -> menuItems.findAllByRestaurantIdOrderByNameAscIdAsc(r.getId()));
    }
}
