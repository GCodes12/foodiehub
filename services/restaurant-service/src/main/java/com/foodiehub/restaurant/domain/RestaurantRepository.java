package com.foodiehub.restaurant.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RestaurantRepository extends JpaRepository<Restaurant, String> {

    List<Restaurant> findAllByActiveTrueOrderByNameAscIdAsc();

    Optional<Restaurant> findByIdAndActiveTrue(String id);

    /**
     * Restaurants this owner manages (DEC-015), active or not: an owner may manage a restaurant that is closed.
     * Matched by the owner's stable token subject only (DEC-017); links without a subject never match.
     */
    @Query(value = """
            SELECT r.* FROM restaurant r
            JOIN restaurant_owner o ON o.restaurant_id = r.id
            WHERE o.owner_sub = :ownerSub
            ORDER BY r.name, r.id""", nativeQuery = true)
    List<Restaurant> findAllOwnedBy(String ownerSub);

    long countByActive(boolean active);

    /** Administrator list (DEC-017): optional active filter and case-insensitive name search ({@code nameLike} = "%x%"). */
    @Query("""
            SELECT r FROM Restaurant r
            WHERE (:active IS NULL OR r.active = :active)
              AND (:nameLike IS NULL OR LOWER(r.name) LIKE :nameLike)""")
    Page<Restaurant> search(Boolean active, String nameLike, Pageable pageable);
}
