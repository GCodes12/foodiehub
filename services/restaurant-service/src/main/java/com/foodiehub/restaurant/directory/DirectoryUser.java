package com.foodiehub.restaurant.directory;

/**
 * What administrator views need about a Keycloak user (DEC-017, DEC-018): the stable subject, username, display name,
 * e-mail address (shown to administrators for owner accounts only), whether the account is enabled, and whether the
 * user still has to replace a temporary password. Never credentials or tokens.
 */
public record DirectoryUser(String sub, String username, String displayName, String email, boolean enabled,
        boolean passwordChangePending) {
}
