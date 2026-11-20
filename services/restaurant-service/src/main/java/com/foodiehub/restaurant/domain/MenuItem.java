package com.foodiehub.restaurant.domain;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Menu item per DEC-007, with the menu details added by DEC-014 (category, description, diet, labels, image key,
 * position). The price is an exact decimal in INR stored as DECIMAL(10,2) (DEC-012); binary floating point is never
 * used for money.
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

    @Column(nullable = false, length = 40)
    private String category = "OTHER";

    @Column(length = 300)
    private String description;

    /** VEG, EGG or NON_VEG; null when not specified. */
    @Column(length = 10)
    private String diet;

    @Column(nullable = false)
    private boolean bestseller;

    @Column(name = "chef_special", nullable = false)
    private boolean chefSpecial;

    @Column(name = "image_key", length = 80)
    private String imageKey;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

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

    /** Sets the DEC-014 details (used by tests; production data comes from the database). */
    public MenuItem withDetails(String category, String description, String diet, boolean bestseller,
            boolean chefSpecial, String imageKey, int sortOrder) {
        this.category = category;
        this.description = description;
        this.diet = diet;
        this.bestseller = bestseller;
        this.chefSpecial = chefSpecial;
        this.imageKey = imageKey;
        this.sortOrder = sortOrder;
        return this;
    }

    /** Owner changes (DEC-015). Each value is applied only when not null; validation happens in the API layer. */
    public void applyOwnerChanges(Boolean available, BigDecimal price, String description, Boolean bestseller,
            Boolean chefSpecial) {
        if (available != null) {
            this.available = available;
        }
        if (price != null) {
            this.price = price;
        }
        if (description != null) {
            this.description = description.isBlank() ? null : description.strip();
        }
        if (bestseller != null) {
            this.bestseller = bestseller;
        }
        if (chefSpecial != null) {
            this.chefSpecial = chefSpecial;
        }
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

    public String getCategory() {
        return category;
    }

    public String getDescription() {
        return description;
    }

    public String getDiet() {
        return diet;
    }

    public boolean isBestseller() {
        return bestseller;
    }

    public boolean isChefSpecial() {
        return chefSpecial;
    }

    public String getImageKey() {
        return imageKey;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
