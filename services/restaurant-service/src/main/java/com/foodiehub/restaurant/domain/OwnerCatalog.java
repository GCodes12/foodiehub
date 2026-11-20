package com.foodiehub.restaurant.domain;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Owner operations (DEC-015). Every method takes the caller's stable token subject ({@code sub}, DEC-017) and only
 * touches restaurants that owner manages; anything else is reported as "not found", so ownership of other restaurants
 * is never revealed.
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
    public List<Restaurant> ownedRestaurants(String ownerSub) {
        return restaurants.findAllOwnedBy(ownerSub);
    }

    @Transactional(readOnly = true)
    public Optional<List<MenuItem>> menuOfOwnedRestaurant(String restaurantId, String ownerSub) {
        return owned(restaurantId, ownerSub)
                .map(r -> menuItems.findAllByRestaurantIdOrderBySortOrderAscNameAscIdAsc(r.getId()));
    }

    /** Empty when the restaurant is not the caller's or the dish is not on its menu. */
    @Transactional
    public Optional<MenuItem> updateMenuItem(String restaurantId, String menuItemId, String ownerSub, MenuItemChanges changes) {
        return owned(restaurantId, ownerSub)
                .flatMap(r -> menuItems.findById(menuItemId).filter(item -> item.getRestaurantId().equals(r.getId())))
                .map(item -> {
                    item.applyOwnerChanges(changes.available(), changes.price(), changes.description(),
                            changes.bestseller(), changes.chefSpecial());
                    return menuItems.saveAndFlush(item);
                });
    }

    private Optional<Restaurant> owned(String restaurantId, String ownerSub) {
        return restaurants.findAllOwnedBy(ownerSub).stream().filter(r -> r.getId().equals(restaurantId)).findFirst();
    }
}
