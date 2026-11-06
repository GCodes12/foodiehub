package com.foodiehub.restaurant.api;

import java.util.List;

import com.foodiehub.restaurant.domain.RestaurantCatalog;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public, read-only browsing endpoints (paths: PROPOSED in plan.md §8). */
@RestController
@RequestMapping("/api/v1/restaurants")
public class RestaurantController {

    private final RestaurantCatalog catalog;

    public RestaurantController(RestaurantCatalog catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    public List<RestaurantResponse> listRestaurants() {
        return catalog.listActiveRestaurants().stream().map(RestaurantResponse::from).toList();
    }

    @GetMapping("/{id}")
    public RestaurantResponse getRestaurant(@PathVariable String id) {
        return catalog.findActiveRestaurant(id)
                .map(RestaurantResponse::from)
                .orElseThrow(RestaurantNotFoundException::new);
    }

    @GetMapping("/{id}/menu")
    public MenuResponse getMenu(@PathVariable String id) {
        return catalog.findMenuOfActiveRestaurant(id)
                .map(items -> MenuResponse.of(id, items))
                .orElseThrow(RestaurantNotFoundException::new);
    }
}
