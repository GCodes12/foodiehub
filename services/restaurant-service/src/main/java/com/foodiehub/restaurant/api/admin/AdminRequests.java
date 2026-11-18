package com.foodiehub.restaurant.api.admin;

import com.foodiehub.restaurant.domain.Restaurant;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Administrator request bodies (DEC-017). Each record lists exactly the fields a client may set: id, active flag,
 * owner, timestamps and version are never bound from a create or edit body (no mass assignment). Unknown JSON
 * properties are ignored. Messages: admin.* in messages.properties.
 */
final class AdminRequests {

    /** Optional free-text phone: digits, spaces and + - ( ). Blank clears it on edit. */
    static final String PHONE = "^$|^[0-9+()\\- ]{6,20}$";

    private AdminRequests() {
    }

    record CreateRestaurant(
            @NotBlank(message = "{admin.name.required}") @Size(max = 200, message = "{admin.name.size}") String name,
            @Size(max = 500, message = "{admin.description.size}") String description,
            @Size(max = 300, message = "{admin.address.size}") String address,
            @Size(max = 100, message = "{admin.city.size}") String city,
            @Pattern(regexp = PHONE, message = "{admin.phone.invalid}") String phone) {

        Restaurant.Details details() {
            return new Restaurant.Details(name.strip(), blankToNull(description), blankToNull(address), blankToNull(city),
                    blankToNull(phone));
        }
    }

    /** Only the fields sent are changed. {@code expectedVersion} is the version the administrator's screen showed. */
    record UpdateRestaurant(
            @NotNull(message = "{admin.expectedVersion.required}") @PositiveOrZero Long expectedVersion,
            @Pattern(regexp = "^(?!\\s*$).+", message = "{admin.name.required}")
            @Size(max = 200, message = "{admin.name.size}") String name,
            @Size(max = 500, message = "{admin.description.size}") String description,
            @Size(max = 300, message = "{admin.address.size}") String address,
            @Size(max = 100, message = "{admin.city.size}") String city,
            @Pattern(regexp = PHONE, message = "{admin.phone.invalid}") String phone) {

        Restaurant.Details changes() {
            return new Restaurant.Details(name, description, address, city, phone == null ? null : phone.strip());
        }
    }

    record ChangeStatus(
            @NotNull(message = "{admin.active.required}") Boolean active,
            @NotNull(message = "{admin.expectedVersion.required}") @PositiveOrZero Long expectedVersion) {
    }

    /** The owner's Keycloak subject. Roles are never sent: the server checks them with Keycloak. */
    record AssignOwner(
            @NotBlank(message = "{admin.ownerSub.required}")
            @Pattern(regexp = "^[A-Za-z0-9-]{1,64}$", message = "{admin.ownerSub.invalid}") String ownerSub) {
    }

    /**
     * A new restaurant owner account (DEC-018). There is deliberately no role, group or "enabled" field: the server
     * always creates an enabled account in the owners group, with a temporary password that must be replaced at first
     * login.
     */
    record CreateOwner(
            @NotBlank(message = "{admin.fullName.required}") @Size(max = 100, message = "{admin.fullName.size}") String fullName,
            @NotBlank(message = "{admin.email.required}") @Email(message = "{admin.email.invalid}")
            @Size(max = 254, message = "{admin.email.size}") String email,
            @NotBlank(message = "{admin.username.required}")
            @Pattern(regexp = USERNAME, message = "{admin.username.invalid}") String username,
            @NotBlank(message = "{admin.temporaryPassword.required}")
            @Size(min = 10, max = 64, message = "{admin.temporaryPassword.size}") String temporaryPassword) {

        /** Normalised values: trimmed, lower-case username and e-mail (Keycloak compares them case-insensitively). */
        com.foodiehub.restaurant.directory.OwnerProvisioner.NewOwner toNewOwner() {
            return new com.foodiehub.restaurant.directory.OwnerProvisioner.NewOwner(fullName.strip(),
                    email.strip().toLowerCase(java.util.Locale.ROOT), username.strip().toLowerCase(java.util.Locale.ROOT),
                    temporaryPassword);
        }

        @Override
        public String toString() { // never print the password
            return "CreateOwner[username=" + username + "]";
        }
    }

    /** 3–50 of a-z 0-9 . _ -, starting with a letter or digit; never Keycloak's service-account prefix. */
    static final String USERNAME = "^(?!service-account-)[a-z0-9][a-z0-9._-]{2,49}$";

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
