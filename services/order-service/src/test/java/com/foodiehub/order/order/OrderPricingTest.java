package com.foodiehub.order.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;

import com.foodiehub.order.restaurant.RestaurantMenu;
import org.junit.jupiter.api.Test;

class OrderPricingTest {

    private static final RestaurantMenu MENU = new RestaurantMenu("r1", "INR", List.of(
            new RestaurantMenu.Item("dosa", "Masala Dosa", new BigDecimal("129.50"), true),
            new RestaurantMenu.Item("paneer", "Paneer Butter Masala", new BigDecimal("249.00"), true),
            new RestaurantMenu.Item("jamun", "Gulab Jamun", new BigDecimal("79.00"), false),
            new RestaurantMenu.Item("gold", "Gold Thali", new BigDecimal("99999999.99"), true)));

    private static OrderPricing.RequestedLine line(String id, int qty) {
        return new OrderPricing.RequestedLine(id, qty);
    }

    @Test
    void pricesFromMenuWithExactDecimalArithmetic() {
        OrderPricing.PricedOrder priced = OrderPricing.price(List.of(line("dosa", 3), line("paneer", 1)), MENU);

        assertThat(priced.lines()).extracting(OrderPricing.PricedLine::lineAmount)
                .containsExactly(new BigDecimal("388.50"), new BigDecimal("249.00"));
        assertThat(priced.lines().get(0).name()).isEqualTo("Masala Dosa");
        assertThat(priced.lines().get(0).unitPrice()).isEqualTo(new BigDecimal("129.50"));
        assertThat(priced.subtotal()).isEqualTo(new BigDecimal("637.50"));
        assertThat(priced.total()).isEqualTo(priced.subtotal()); // pickup: no tax, no fees (DEC-013)
    }

    @Test
    void rejectsUnavailableItem() {
        assertThatThrownBy(() -> OrderPricing.price(List.of(line("jamun", 1)), MENU))
                .isInstanceOf(CheckoutRejectedException.class).extracting("code").isEqualTo("ITEM_UNAVAILABLE");
    }

    @Test
    void rejectsItemNotInThisRestaurantsMenu() {
        assertThatThrownBy(() -> OrderPricing.price(List.of(line("pizza", 1)), MENU))
                .isInstanceOf(CheckoutRejectedException.class).extracting("code").isEqualTo("ITEM_NOT_IN_MENU");
    }

    @Test
    void rejectsDuplicateItemLines() {
        assertThatThrownBy(() -> OrderPricing.price(List.of(line("dosa", 1), line("dosa", 2)), MENU))
                .isInstanceOf(CheckoutRejectedException.class).extracting("code").isEqualTo("DUPLICATE_ITEM");
    }

    @Test
    void rejectsAmountsThatDoNotFitDecimal10Scale2() {
        assertThatThrownBy(() -> OrderPricing.price(List.of(line("gold", 2)), MENU))
                .isInstanceOf(CheckoutRejectedException.class).extracting("code").isEqualTo("AMOUNT_TOO_LARGE");
        assertThatThrownBy(() -> OrderPricing.price(List.of(line("gold", 1), line("dosa", 1)), MENU))
                .isInstanceOf(CheckoutRejectedException.class).extracting("code").isEqualTo("AMOUNT_TOO_LARGE");
    }

    @Test
    void acceptsTheLargestRepresentableTotal() {
        assertThat(OrderPricing.price(List.of(line("gold", 1)), MENU).total()).isEqualTo(OrderPricing.MAX_AMOUNT);
    }

    @Test
    void rejectsEmptyOrder() {
        assertThatThrownBy(() -> OrderPricing.price(List.of(), MENU))
                .isInstanceOf(CheckoutRejectedException.class).extracting("code").isEqualTo("EMPTY_ORDER");
    }
}
