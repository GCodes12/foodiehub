package com.foodiehub.restaurant.directory;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Keycloak Admin API access for the user directory (DEC-017): the read-only service-account client
 * {@code foodiehub-admin-api}. A blank secret disables the directory (admin owner features answer 503; everything else
 * keeps working).
 */
@ConfigurationProperties("foodiehub.user-directory")
public record UserDirectoryProperties(String serverUrl, String realm, String clientId, String clientSecret,
        Duration connectTimeout, Duration readTimeout) {

    public boolean configured() {
        return clientSecret != null && !clientSecret.isBlank();
    }
}
