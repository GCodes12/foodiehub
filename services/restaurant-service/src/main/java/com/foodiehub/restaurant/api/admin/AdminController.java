package com.foodiehub.restaurant.api.admin;

import java.net.URI;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import com.foodiehub.restaurant.api.admin.AdminRequests.AssignOwner;
import com.foodiehub.restaurant.api.admin.AdminRequests.ChangeStatus;
import com.foodiehub.restaurant.api.admin.AdminRequests.CreateOwner;
import com.foodiehub.restaurant.api.admin.AdminRequests.CreateRestaurant;
import com.foodiehub.restaurant.api.admin.AdminRequests.UpdateRestaurant;
import com.foodiehub.restaurant.api.admin.AdminResponses.Dashboard;
import com.foodiehub.restaurant.api.admin.AdminResponses.OwnerAccount;
import com.foodiehub.restaurant.api.admin.AdminResponses.PageResponse;
import com.foodiehub.restaurant.api.admin.AdminResponses.RestaurantDetail;
import com.foodiehub.restaurant.api.admin.AdminResponses.RestaurantSummary;
import com.foodiehub.restaurant.directory.DirectoryUser;
import com.foodiehub.restaurant.directory.OwnerProvisioner;
import com.foodiehub.restaurant.directory.UserDirectory;
import com.foodiehub.restaurant.directory.UserDirectoryUnavailableException;
import com.foodiehub.restaurant.domain.AdminCatalog;
import com.foodiehub.restaurant.domain.Restaurant;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Platform administration (DEC-017). Every endpoint requires the ADMIN realm role (SecurityConfig); customers and
 * owners get 403. Restaurants are never deleted, only deactivated.
 *   GET   /api/v1/admin/dashboard                       restaurant, owner and customer counts
 *   GET   /api/v1/admin/restaurants?page&size&active&q   restaurants, paginated
 *   POST  /api/v1/admin/restaurants                      create (always inactive)
 *   GET   /api/v1/admin/restaurants/{id}                 one restaurant with owner and dish counts
 *   PATCH /api/v1/admin/restaurants/{id}                 edit details
 *   PUT   /api/v1/admin/restaurants/{id}/status          activate / deactivate
 *   PUT   /api/v1/admin/restaurants/{id}/owner           assign or re-assign the owner (verified with Keycloak)
 *   GET   /api/v1/admin/owners?page&size                 owner accounts (role or owners group), with their restaurants
 *   POST  /api/v1/admin/owners                           create an owner account in Keycloak (DEC-018)
 */
@RestController
@RequestMapping("/api/v1/admin")
class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);
    static final int MAX_PAGE_SIZE = 100;

    private final AdminCatalog catalog;
    private final UserDirectory directory;
    private final OwnerProvisioner provisioner;

    AdminController(AdminCatalog catalog, UserDirectory directory, OwnerProvisioner provisioner) {
        this.catalog = catalog;
        this.directory = directory;
        this.provisioner = provisioner;
    }

    @GetMapping("/dashboard")
    Dashboard dashboard() {
        AdminCatalog.Counts counts = catalog.counts();
        Integer owners = null;
        Integer customers = null;
        boolean available = true;
        try {
            owners = directory.countOwners();
            customers = directory.countUsersWithRole(UserDirectory.CUSTOMER_ROLE);
        } catch (UserDirectoryUnavailableException e) {
            log.warn("Dashboard without user counts: {}", e.getMessage());
            available = false;
            owners = null;
            customers = null;
        }
        return new Dashboard(counts.total(), counts.active(), counts.inactive(), owners, customers, available,
                provisioner.configured());
    }

    @GetMapping("/restaurants")
    PageResponse<RestaurantSummary> restaurants(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String q) {
        return PageResponse.of(catalog.search(active, q, page(page), size(size)), RestaurantSummary::from);
    }

    @PostMapping("/restaurants")
    ResponseEntity<RestaurantDetail> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateRestaurant request) {
        RestaurantDetail created = RestaurantDetail.from(catalog.create(request.details()));
        audit(jwt, "created restaurant {}", created.id());
        return ResponseEntity.created(URI.create("/api/v1/admin/restaurants/" + created.id())).body(created);
    }

    @GetMapping("/restaurants/{id}")
    RestaurantDetail restaurant(@PathVariable String id) {
        return catalog.find(id).map(RestaurantDetail::from).orElseThrow(AdminRestaurantNotFoundException::new);
    }

    @PatchMapping("/restaurants/{id}")
    RestaurantDetail update(@AuthenticationPrincipal Jwt jwt, @PathVariable String id,
            @Valid @RequestBody UpdateRestaurant request) {
        Restaurant.Details changes = request.changes();
        if (changes.isEmpty()) {
            throw new NothingToChangeException();
        }
        RestaurantDetail updated = catalog.update(id, request.expectedVersion(), changes).map(RestaurantDetail::from)
                .orElseThrow(AdminRestaurantNotFoundException::new);
        audit(jwt, "updated restaurant {}", id);
        return updated;
    }

    @PutMapping("/restaurants/{id}/status")
    RestaurantDetail changeStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable String id,
            @Valid @RequestBody ChangeStatus request) {
        RestaurantDetail updated = catalog.setActive(id, request.active(), request.expectedVersion())
                .map(RestaurantDetail::from).orElseThrow(AdminRestaurantNotFoundException::new);
        audit(jwt, request.active() ? "activated restaurant {}" : "deactivated restaurant {}", id);
        return updated;
    }

    /** The owner must be an enabled Keycloak user with the RESTAURANT_OWNER role; anything else is 422 INVALID_OWNER. */
    @PutMapping("/restaurants/{id}/owner")
    RestaurantDetail assignOwner(@AuthenticationPrincipal Jwt jwt, @PathVariable String id,
            @Valid @RequestBody AssignOwner request) {
        if (catalog.find(id).isEmpty()) {
            throw new AdminRestaurantNotFoundException();
        }
        DirectoryUser owner = directory.findEnabledOwner(request.ownerSub()).orElseThrow(InvalidOwnerException::new);
        RestaurantDetail updated = catalog.assignOwner(id, owner.sub(), owner.username()).map(RestaurantDetail::from)
                .orElseThrow(AdminRestaurantNotFoundException::new);
        audit(jwt, "assigned restaurant {} to owner {}", id, owner.sub());
        return updated;
    }

    @GetMapping("/owners")
    PageResponse<OwnerAccount> owners(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        List<DirectoryUser> users = directory.owners().stream()
                .sorted(Comparator.comparing(DirectoryUser::username)).toList();
        Map<String, List<Restaurant>> assigned = catalog.restaurantsByOwner(users.stream().map(DirectoryUser::sub).toList());
        List<OwnerAccount> all = users.stream().map(u -> OwnerAccount.from(u, assigned.getOrDefault(u.sub(), List.of()))).toList();
        return PageResponse.ofList(all, page(page), size(size));
    }

    /**
     * Creates an enabled owner account in Keycloak (DEC-018): inside the owners group (so it holds RESTAURANT_OWNER and
     * nothing else), with a temporary password to replace at first login. Assigning a restaurant is a separate call to
     * PUT /restaurants/{id}/owner. Duplicate username or e-mail → 409; Keycloak unavailable or not configured → 503.
     */
    @PostMapping("/owners")
    ResponseEntity<OwnerAccount> createOwner(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateOwner request) {
        OwnerProvisioner.NewOwner owner = request.toNewOwner();
        if (owner.temporaryPassword().toLowerCase(java.util.Locale.ROOT).contains(owner.username())) {
            throw new FieldRejectedException("temporaryPassword", "admin.temporaryPassword.containsUsername");
        }
        if (!provisioner.configured()) {
            throw new OwnerProvisioningUnavailableException(null);
        }
        try {
            // Friendly, field-level duplicate errors; Keycloak's own 409 below still covers a race.
            if (directory.usernameExists(owner.username())) {
                throw new OwnerProvisioner.DuplicateAccountException("username");
            }
            if (directory.emailExists(owner.email())) {
                throw new OwnerProvisioner.DuplicateAccountException("email");
            }
            DirectoryUser created = provisioner.create(owner);
            audit(jwt, "created owner account {}", created.sub());
            return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(OwnerAccount.from(created, List.of()));
        } catch (UserDirectoryUnavailableException e) {
            throw new OwnerProvisioningUnavailableException(e);
        }
    }

    private static int page(int page) {
        return Math.max(0, page);
    }

    private static int size(int size) {
        return Math.min(Math.max(1, size), MAX_PAGE_SIZE);
    }

    /** Who changed what: the administrator's subject, never a token or personal data. */
    private static void audit(Jwt jwt, String message, Object... args) {
        if (log.isInfoEnabled()) {
            Object[] all = new Object[args.length + 1];
            all[0] = jwt.getSubject();
            System.arraycopy(args, 0, all, 1, args.length);
            log.info("admin {} " + message, all);
        }
    }

    static class AdminRestaurantNotFoundException extends RuntimeException {
        AdminRestaurantNotFoundException() {
            super("RESTAURANT_NOT_FOUND", null, false, false);
        }
    }

    static class InvalidOwnerException extends RuntimeException {
        InvalidOwnerException() {
            super("INVALID_OWNER", null, false, false);
        }
    }

    /** A cross-field rule that Bean Validation cannot express; answered like a field validation error. */
    static class FieldRejectedException extends RuntimeException {
        final String field;
        final String messageKey;

        FieldRejectedException(String field, String messageKey) {
            super("VALIDATION_FAILED", null, false, false);
            this.field = field;
            this.messageKey = messageKey;
        }
    }

    static class OwnerProvisioningUnavailableException extends RuntimeException {
        OwnerProvisioningUnavailableException(Throwable cause) {
            super("OWNER_PROVISIONING_UNAVAILABLE", cause, false, false);
        }
    }

    static class NothingToChangeException extends RuntimeException {
        NothingToChangeException() {
            super("NOTHING_TO_UPDATE", null, false, false);
        }
    }
}
