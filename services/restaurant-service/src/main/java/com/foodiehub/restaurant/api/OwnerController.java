package com.foodiehub.restaurant.api;

import java.math.RoundingMode;
import java.util.List;

import com.foodiehub.restaurant.domain.OwnerCatalog;
import com.foodiehub.restaurant.domain.Restaurant;
import jakarta.validation.Valid;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Owner endpoints (DEC-015). Require a token with the RESTAURANT_OWNER role (SecurityConfig). The caller is the
 * token's username; restaurants and dishes the caller does not manage answer 404.
 *   GET   /api/v1/owner/restaurants                                   restaurants I manage
 *   GET   /api/v1/owner/restaurants/{restaurantId}/menu               the full menu (same shape as the public menu)
 *   PATCH /api/v1/owner/restaurants/{restaurantId}/menu-items/{id}    change availability, price, description, labels
 */
@RestController
@RequestMapping("/api/v1/owner/restaurants")
class OwnerController {

    record OwnerRestaurantResponse(String id, String name, boolean active) {

        static OwnerRestaurantResponse from(Restaurant r) {
            return new OwnerRestaurantResponse(r.getId(), r.getName(), r.isActive());
        }
    }

    private final OwnerCatalog catalog;

    OwnerController(OwnerCatalog catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    List<OwnerRestaurantResponse> myRestaurants(@AuthenticationPrincipal Jwt jwt) {
        return catalog.ownedRestaurants(username(jwt)).stream().map(OwnerRestaurantResponse::from).toList();
    }

    @GetMapping("/{restaurantId}/menu")
    MenuResponse menu(@AuthenticationPrincipal Jwt jwt, @PathVariable String restaurantId) {
        return catalog.menuOfOwnedRestaurant(restaurantId, username(jwt))
                .map(items -> MenuResponse.of(restaurantId, items))
                .orElseThrow(RestaurantNotFoundException::new);
    }

    @PatchMapping("/{restaurantId}/menu-items/{menuItemId}")
    MenuResponse.Item update(@AuthenticationPrincipal Jwt jwt, @PathVariable String restaurantId,
            @PathVariable String menuItemId, @Valid @RequestBody UpdateMenuItemRequest request) {
        OwnerCatalog.MenuItemChanges changes = new OwnerCatalog.MenuItemChanges(request.available(),
                request.price() == null ? null : request.price().setScale(2, RoundingMode.UNNECESSARY),
                request.description(), request.bestseller(), request.chefSpecial());
        if (changes.isEmpty()) {
            throw new NothingToUpdateException();
        }
        return catalog.updateMenuItem(restaurantId, menuItemId, username(jwt), changes)
                .map(MenuResponse.Item::from)
                .orElseThrow(MenuItemNotFoundException::new);
    }

    private static String username(Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        if (username == null || username.isBlank()) {
            throw new AccessDeniedException("token has no username");
        }
        return username;
    }

    static class MenuItemNotFoundException extends RuntimeException {
        MenuItemNotFoundException() {
            super("MENU_ITEM_NOT_FOUND", null, false, false);
        }
    }

    static class NothingToUpdateException extends RuntimeException {
        NothingToUpdateException() {
            super("NOTHING_TO_UPDATE", null, false, false);
        }
    }
}
