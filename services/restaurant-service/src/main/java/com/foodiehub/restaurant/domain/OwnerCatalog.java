package com.foodiehub.restaurant.domain;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Owner operations (DEC-015). Every method takes the caller's username and only touches restaurants that user
 * manages; anything else is reported as "not found", so ownership of other restaurants is never revealed.
 */
@Service
public class OwnerCatalog {

    public record MenuItemChanges(Boolean available, BigDecimal price, String description, Boolean bestseller,
            Boolean chefSpecial) {

        public boolean isEmpty() {
            return available == null && price == null && description == null && bestseller == null && chefSpecial == null;
        }
    }

    private final RestaurantRepository restaurants;
    private final MenuItemRepository menuItems;

    public OwnerCatalog(RestaurantRepository restaurants, MenuItemRepository menuItems) {
        this.restaurants = restaurants;
        this.menuItems = menuItems;
    }

    @Transactional(readOnly = true)
    public List<Restaurant> ownedRestaurants(String username) {
        return restaurants.findAllOwnedBy(username);
    }

    @Transactional(readOnly = true)
    public Optional<List<MenuItem>> menuOfOwnedRestaurant(String restaurantId, String username) {
        return owned(restaurantId, username)
                .map(r -> menuItems.findAllByRestaurantIdOrderBySortOrderAscNameAscIdAsc(r.getId()));
    }

    /** Empty when the restaurant is not the caller's or the dish is not on its menu. */
    @Transactional
    public Optional<MenuItem> updateMenuItem(String restaurantId, String menuItemId, String username, MenuItemChanges changes) {
        return owned(restaurantId, username)
                .flatMap(r -> menuItems.findById(menuItemId).filter(item -> item.getRestaurantId().equals(r.getId())))
                .map(item -> {
                    item.applyOwnerChanges(changes.available(), changes.price(), changes.description(),
                            changes.bestseller(), changes.chefSpecial());
                    return menuItems.saveAndFlush(item);
                });
    }

    private Optional<Restaurant> owned(String restaurantId, String username) {
        return restaurants.findAllOwnedBy(username).stream().filter(r -> r.getId().equals(restaurantId)).findFirst();
    }
}
