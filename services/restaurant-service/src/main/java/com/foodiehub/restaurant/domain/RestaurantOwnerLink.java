package com.foodiehub.restaurant.domain;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Who manages a restaurant (DEC-015, DEC-017). One owner per restaurant; one owner may manage several restaurants.
 * Authorization uses {@code ownerSub} (the owner's stable Keycloak subject) only. {@code ownerUsername} is a display
 * label copied from Keycloak when the owner was assigned. A link without a subject (made before DEC-017) matches nobody.
 */
@Entity
@Table(name = "restaurant_owner")
public class RestaurantOwnerLink {

    @Id
    @Column(name = "restaurant_id", length = 36)
    private String restaurantId;

    @Column(name = "owner_sub")
    private String ownerSub;

    @Column(name = "owner_username", nullable = false)
    private String ownerUsername;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    protected RestaurantOwnerLink() {
        // for JPA
    }

    public RestaurantOwnerLink(String restaurantId, String ownerSub, String ownerUsername) {
        this.restaurantId = restaurantId;
        assign(ownerSub, ownerUsername);
    }

    /** Assigns (or re-assigns) the restaurant to this owner. */
    public void assign(String ownerSub, String ownerUsername) {
        this.ownerSub = ownerSub;
        this.ownerUsername = ownerUsername;
        this.assignedAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    /** Null for a link made before DEC-017 (it then grants nothing). */
    public String getOwnerSub() {
        return ownerSub;
    }

    public String getOwnerUsername() {
        return ownerUsername;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }
}
