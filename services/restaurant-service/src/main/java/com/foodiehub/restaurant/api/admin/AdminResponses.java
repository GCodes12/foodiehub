package com.foodiehub.restaurant.api.admin;

import java.time.Instant;
import java.util.List;
import java.util.function.Function;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.foodiehub.restaurant.directory.DirectoryUser;
import com.foodiehub.restaurant.domain.AdminCatalog;
import com.foodiehub.restaurant.domain.Restaurant;
import com.foodiehub.restaurant.domain.RestaurantOwnerLink;

import org.springframework.data.domain.Page;

/** Administrator response bodies (DEC-017). No e-mail addresses, credentials or tokens are ever included. */
final class AdminResponses {

    private AdminResponses() {
    }

    /** One page of a list: items plus paging facts (never Spring's internal Page JSON). */
    record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {

        static <S, T> PageResponse<T> of(Page<S> page, Function<S, T> mapper) {
            return new PageResponse<>(page.getContent().stream().map(mapper).toList(), page.getNumber(), page.getSize(),
                    page.getTotalElements(), page.getTotalPages());
        }

        static <T> PageResponse<T> ofList(List<T> all, int page, int size) {
            int from = Math.min(page * size, all.size());
            int to = Math.min(from + size, all.size());
            return new PageResponse<>(all.subList(from, to), page, size, all.size(), (all.size() + size - 1) / size);
        }
    }

    /**
     * Restaurant counts come from restaurant_db; owner and customer counts from Keycloak. When Keycloak cannot be asked,
     * the two people counts are null and {@code userDirectoryAvailable} is false, but the rest is still returned.
     */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    record Dashboard(long totalRestaurants, long activeRestaurants, long inactiveRestaurants, Integer totalOwners,
            Integer totalCustomers, boolean userDirectoryAvailable, boolean ownerProvisioningConfigured) {
    }

    /** {@code sub} is null for an assignment made before DEC-017: it grants nothing until the owner is assigned again. */
    record Owner(String sub, String username, Instant assignedAt, boolean needsReassignment) {

        static Owner from(RestaurantOwnerLink link) {
            return link == null ? null
                    : new Owner(link.getOwnerSub(), link.getOwnerUsername(), link.getAssignedAt(), link.getOwnerSub() == null);
        }
    }

    record RestaurantSummary(String id, String name, String city, boolean active, Owner owner, long dishes,
            long availableDishes, Instant updatedAt) {

        static RestaurantSummary from(AdminCatalog.RestaurantView v) {
            Restaurant r = v.restaurant();
            return new RestaurantSummary(r.getId(), r.getName(), r.getCity(), r.isActive(), Owner.from(v.owner()), v.dishes(),
                    v.availableDishes(), r.getUpdatedAt());
        }
    }

    record RestaurantDetail(String id, String name, String description, String address, String city, String phone,
            boolean active, Owner owner, long dishes, long availableDishes, Instant createdAt, Instant updatedAt,
            long version) {

        static RestaurantDetail from(AdminCatalog.RestaurantView v) {
            Restaurant r = v.restaurant();
            return new RestaurantDetail(r.getId(), r.getName(), r.getDescription(), r.getAddress(), r.getCity(), r.getPhone(),
                    r.isActive(), Owner.from(v.owner()), v.dishes(), v.availableDishes(), r.getCreatedAt(), r.getUpdatedAt(),
                    r.getVersion());
        }
    }

    record OwnedRestaurant(String id, String name, boolean active) {

        static OwnedRestaurant from(Restaurant r) {
            return new OwnedRestaurant(r.getId(), r.getName(), r.isActive());
        }
    }

    /**
     * A Keycloak user with the RESTAURANT_OWNER role (directly or through the owners group), and the restaurants assigned
     * to them. The e-mail address is shown to administrators for owner accounts only (DEC-018); never a password.
     */
    record OwnerAccount(String sub, String username, String displayName, String email, boolean enabled,
            boolean passwordChangePending, List<OwnedRestaurant> restaurants) {

        static OwnerAccount from(DirectoryUser u, List<Restaurant> restaurants) {
            return new OwnerAccount(u.sub(), u.username(), u.displayName(), u.email(), u.enabled(), u.passwordChangePending(),
                    restaurants.stream().map(OwnedRestaurant::from).toList());
        }
    }
}
