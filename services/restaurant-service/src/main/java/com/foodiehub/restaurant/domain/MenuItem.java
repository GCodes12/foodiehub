package com.foodiehub.restaurant.domain;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Menu item per DEC-007. The price is an exact decimal in INR stored as DECIMAL(10,2) (DEC-012);
 * binary floating point is never used for money.
 */
@Entity
@Table(name = "menu_item")
public class MenuItem {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "restaurant_id", nullable = false, length = 36)
    private String restaurantId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private boolean available;

    protected MenuItem() {
        // for JPA
    }

    public MenuItem(String id, String restaurantId, String name, BigDecimal price, boolean available) {
        this.id = id;
        this.restaurantId = restaurantId;
        this.name = name;
        this.price = price;
        this.available = available;
    }

    public String getId() {
        return id;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public boolean isAvailable() {
        return available;
    }
}
