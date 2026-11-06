package com.foodiehub.restaurant.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Restaurant attributes per DEC-008. {@code active} is internal and never exposed publicly (DEC-009). */
@Entity
@Table(name = "restaurant")
public class Restaurant {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false)
    private boolean active;

    protected Restaurant() {
        // for JPA
    }

    public Restaurant(String id, String name, boolean active) {
        this.id = id;
        this.name = name;
        this.active = active;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public boolean isActive() {
        return active;
    }
}
