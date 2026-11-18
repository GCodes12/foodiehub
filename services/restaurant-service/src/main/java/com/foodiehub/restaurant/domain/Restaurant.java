package com.foodiehub.restaurant.domain;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * Restaurant attributes per DEC-008, with the details an administrator maintains (DEC-017). {@code active} is internal
 * and never exposed publicly (DEC-009); the public API exposes only id and name.
 */
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

    @Column(length = 500)
    private String description;

    @Column(length = 300)
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 20)
    private String phone;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Optimistic locking (DEC-017): a stale administrator screen cannot overwrite a newer change. */
    @Version
    @Column(nullable = false)
    private long version;

    protected Restaurant() {
        // for JPA
    }

    public Restaurant(String id, String name, boolean active) {
        this.id = id;
        this.name = name;
        this.active = active;
        this.createdAt = now();
        this.updatedAt = this.createdAt;
    }

    /** A new restaurant (DEC-017): server-generated id, always inactive until an administrator activates it. */
    public static Restaurant create(Details details) {
        Restaurant r = new Restaurant(UUID.randomUUID().toString(), details.name(), false);
        r.description = details.description();
        r.address = details.address();
        r.city = details.city();
        r.phone = details.phone();
        return r;
    }

    /** Administrator edit. Each value is applied only when not null; a blank optional value clears the field. */
    public void applyAdminChanges(Details changes) {
        if (changes.name() != null) {
            this.name = changes.name().strip();
        }
        if (changes.description() != null) {
            this.description = blankToNull(changes.description());
        }
        if (changes.address() != null) {
            this.address = blankToNull(changes.address());
        }
        if (changes.city() != null) {
            this.city = blankToNull(changes.city());
        }
        if (changes.phone() != null) {
            this.phone = blankToNull(changes.phone());
        }
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    @PreUpdate
    void touch() {
        this.updatedAt = now();
    }

    private static Instant now() {
        return Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    private static String blankToNull(String value) {
        return value.isBlank() ? null : value.strip();
    }

    /** Administrator-editable details. Validation happens in the API layer. */
    public record Details(String name, String description, String address, String city, String phone) {

        public boolean isEmpty() {
            return name == null && description == null && address == null && city == null && phone == null;
        }
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

    public String getDescription() {
        return description;
    }

    public String getAddress() {
        return address;
    }

    public String getCity() {
        return city;
    }

    public String getPhone() {
        return phone;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public long getVersion() {
        return version;
    }
}
