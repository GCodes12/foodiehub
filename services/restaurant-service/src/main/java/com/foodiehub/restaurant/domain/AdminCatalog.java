package com.foodiehub.restaurant.domain;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Platform administration of restaurants and their owners (DEC-017). Restaurants are never deleted: they are
 * deactivated. New restaurants start inactive, and a restaurant can be activated only with at least one available dish.
 * Owners are verified against Keycloak by the caller before {@link #assignOwner} is called.
 */
@Service
public class AdminCatalog {

    /** A restaurant with its owner link (may be null) and dish counts, for administrator views. */
    public record RestaurantView(Restaurant restaurant, RestaurantOwnerLink owner, long dishes, long availableDishes) {
    }

    public record Counts(long total, long active) {
        public long inactive() {
            return total - active;
        }
    }

    private final RestaurantRepository restaurants;
    private final RestaurantOwnerLinkRepository owners;
    private final MenuItemRepository menuItems;

    public AdminCatalog(RestaurantRepository restaurants, RestaurantOwnerLinkRepository owners, MenuItemRepository menuItems) {
        this.restaurants = restaurants;
        this.owners = owners;
        this.menuItems = menuItems;
    }

    @Transactional(readOnly = true)
    public Counts counts() {
        return new Counts(restaurants.count(), restaurants.countByActive(true));
    }

    @Transactional(readOnly = true)
    public Page<RestaurantView> search(Boolean active, String query, int page, int size) {
        String nameLike = query == null || query.isBlank() ? null : "%" + escapeLike(query.strip().toLowerCase(Locale.ROOT)) + "%";
        Page<Restaurant> found = restaurants.search(active, nameLike,
                PageRequest.of(page, size, Sort.by("name").ascending().and(Sort.by("id"))));
        Map<String, RestaurantView> views = views(found.getContent());
        return found.map(r -> views.get(r.getId()));
    }

    @Transactional(readOnly = true)
    public Optional<RestaurantView> find(String id) {
        return restaurants.findById(id).map(this::view);
    }

    @Transactional
    public RestaurantView create(Restaurant.Details details) {
        Restaurant created = restaurants.saveAndFlush(Restaurant.create(details));
        return new RestaurantView(created, null, 0, 0);
    }

    /** Empty when the restaurant does not exist. */
    @Transactional
    public Optional<RestaurantView> update(String id, long expectedVersion, Restaurant.Details changes) {
        return restaurants.findById(id).map(r -> {
            requireVersion(r, expectedVersion);
            r.applyAdminChanges(changes);
            return view(restaurants.saveAndFlush(r));
        });
    }

    /**
     * Activates or deactivates (soft: nothing is deleted; customers stop seeing it and checkout is refused).
     *
     * @throws RestaurantHasNoMenuException when activating a restaurant without an available dish
     */
    @Transactional
    public Optional<RestaurantView> setActive(String id, boolean active, long expectedVersion) {
        return restaurants.findById(id).map(r -> {
            requireVersion(r, expectedVersion);
            if (active && !r.isActive() && menuItems.countByRestaurantIdAndAvailableTrue(id) == 0) {
                throw new RestaurantHasNoMenuException();
            }
            r.setActive(active);
            return view(restaurants.saveAndFlush(r));
        });
    }

    /** Assigns or re-assigns the restaurant's single owner. The caller has verified the owner with Keycloak. */
    @Transactional
    public Optional<RestaurantView> assignOwner(String id, String ownerSub, String ownerUsername) {
        return restaurants.findById(id).map(r -> {
            RestaurantOwnerLink link = owners.findById(id).orElse(null);
            if (link == null) {
                link = new RestaurantOwnerLink(id, ownerSub, ownerUsername);
            } else {
                link.assign(ownerSub, ownerUsername);
            }
            owners.saveAndFlush(link);
            return view(r);
        });
    }

    /** For each owner subject, the restaurants assigned to it (DEC-017 owner list). */
    @Transactional(readOnly = true)
    public Map<String, List<Restaurant>> restaurantsByOwner(Collection<String> ownerSubs) {
        if (ownerSubs.isEmpty()) {
            return Map.of();
        }
        List<RestaurantOwnerLink> links = owners.findAllByOwnerSubIn(ownerSubs);
        Map<String, Restaurant> byId = restaurants.findAllById(links.stream().map(RestaurantOwnerLink::getRestaurantId).toList())
                .stream().collect(Collectors.toMap(Restaurant::getId, Function.identity()));
        Map<String, List<Restaurant>> result = new HashMap<>();
        for (RestaurantOwnerLink link : links) {
            Restaurant r = byId.get(link.getRestaurantId());
            if (r != null) {
                result.computeIfAbsent(link.getOwnerSub(), k -> new java.util.ArrayList<>()).add(r);
            }
        }
        result.values().forEach(list -> list.sort(java.util.Comparator.comparing(Restaurant::getName)));
        return result;
    }

    private RestaurantView view(Restaurant r) {
        return views(List.of(r)).get(r.getId());
    }

    private Map<String, RestaurantView> views(List<Restaurant> list) {
        if (list.isEmpty()) {
            return Map.of();
        }
        List<String> ids = list.stream().map(Restaurant::getId).toList();
        Map<String, RestaurantOwnerLink> links = owners.findAllByRestaurantIdIn(ids).stream()
                .collect(Collectors.toMap(RestaurantOwnerLink::getRestaurantId, Function.identity()));
        Map<String, long[]> counts = new HashMap<>();
        for (Object[] row : menuItems.countDishesByRestaurant(ids)) {
            counts.put((String) row[0], new long[] {((Number) row[1]).longValue(), ((Number) row[2]).longValue()});
        }
        Map<String, RestaurantView> views = new HashMap<>();
        for (Restaurant r : list) {
            long[] c = counts.getOrDefault(r.getId(), new long[] {0, 0});
            views.put(r.getId(), new RestaurantView(r, links.get(r.getId()), c[0], c[1]));
        }
        return views;
    }

    private static void requireVersion(Restaurant r, long expectedVersion) {
        if (r.getVersion() != expectedVersion) {
            throw new RestaurantChangedException();
        }
    }

    private static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
