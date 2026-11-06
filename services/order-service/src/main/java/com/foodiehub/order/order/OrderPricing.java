package com.foodiehub.order.order;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.foodiehub.order.restaurant.RestaurantMenu;

/**
 * Validates a checkout against the authoritative menu and prices it on the server (DEC-013):
 * every item must exist in that restaurant's menu and be available (DEC-008); unit prices come only from the menu;
 * line amount = unit price × quantity; subtotal = sum of lines; total = subtotal (pickup, no tax or fees).
 * Amounts are exact {@link BigDecimal}s and must fit DECIMAL(10,2). No rounding is needed or applied.
 */
public final class OrderPricing {

    /** Largest value of a DECIMAL(10,2) column. */
    public static final BigDecimal MAX_AMOUNT = new BigDecimal("99999999.99");

    private OrderPricing() {
    }

    public record RequestedLine(String menuItemId, int quantity) {
    }

    public record PricedLine(String menuItemId, String name, BigDecimal unitPrice, int quantity, BigDecimal lineAmount) {
    }

    public record PricedOrder(List<PricedLine> lines, BigDecimal subtotal, BigDecimal total) {
    }

    public static PricedOrder price(List<RequestedLine> requested, RestaurantMenu menu) {
        Map<String, RestaurantMenu.Item> byId = menu.items().stream()
                .collect(Collectors.toMap(RestaurantMenu.Item::id, Function.identity(), (a, b) -> a));
        Set<String> seen = new HashSet<>();
        List<PricedLine> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO.setScale(2);

        for (RequestedLine line : requested) {
            if (!seen.add(line.menuItemId())) {
                throw new CheckoutRejectedException("DUPLICATE_ITEM");
            }
            RestaurantMenu.Item item = byId.get(line.menuItemId());
            if (item == null) {
                throw new CheckoutRejectedException("ITEM_NOT_IN_MENU");
            }
            if (!item.available()) {
                throw new CheckoutRejectedException("ITEM_UNAVAILABLE");
            }
            BigDecimal unitPrice = item.price().setScale(2); // menu prices are DECIMAL(10,2); throws if not exact
            BigDecimal lineAmount = unitPrice.multiply(BigDecimal.valueOf(line.quantity()));
            if (lineAmount.compareTo(MAX_AMOUNT) > 0) {
                throw new CheckoutRejectedException("AMOUNT_TOO_LARGE");
            }
            subtotal = subtotal.add(lineAmount);
            if (subtotal.compareTo(MAX_AMOUNT) > 0) {
                throw new CheckoutRejectedException("AMOUNT_TOO_LARGE");
            }
            lines.add(new PricedLine(item.id(), item.name(), unitPrice, line.quantity(), lineAmount));
        }
        if (lines.isEmpty()) {
            throw new CheckoutRejectedException("EMPTY_ORDER");
        }
        return new PricedOrder(List.copyOf(lines), subtotal, subtotal);
    }
}
