package com.foodiehub.order.api;

import java.util.List;

import com.foodiehub.order.order.AdminOrderOverview;
import com.foodiehub.order.order.OrderStatus;

import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Platform overview for administrators (DEC-017). Requires the ADMIN realm role (SecurityConfig); read-only.
 *   GET /api/v1/admin/orders?page&size&restaurantId&status  orders across all restaurants, newest first
 *   GET /api/v1/admin/orders/summary                        totals, orders today, by status, per restaurant
 * Orders are returned in the same shape as the owner view: never the customer's identity.
 */
@RestController
@RequestMapping("/api/v1/admin/orders")
class AdminOrderController {

    static final int MAX_PAGE_SIZE = 100;

    record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {

        static <T> PageResponse<T> of(Page<T> page) {
            return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements(),
                    page.getTotalPages());
        }
    }

    private final AdminOrderOverview overview;

    AdminOrderController(AdminOrderOverview overview) {
        this.overview = overview;
    }

    /** An unknown status or a malformed restaurant id is 400 INVALID_QUERY. */
    @GetMapping
    PageResponse<OrderResponse> orders(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String restaurantId, @RequestParam(required = false) OrderStatus status) {
        String restaurant = restaurantId == null || restaurantId.isBlank() ? null : restaurantId.strip();
        if (restaurant != null && !restaurant.matches(CreateOrderRequest.ID_PATTERN)) {
            throw new InvalidQueryException();
        }
        return PageResponse.of(overview.search(restaurant, status, Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE_SIZE),
                OrderResponse::from));
    }

    @GetMapping("/summary")
    AdminOrderOverview.Summary summary() {
        return overview.summary();
    }

    static class InvalidQueryException extends RuntimeException {
        InvalidQueryException() {
            super("INVALID_QUERY", null, false, false);
        }
    }
}
