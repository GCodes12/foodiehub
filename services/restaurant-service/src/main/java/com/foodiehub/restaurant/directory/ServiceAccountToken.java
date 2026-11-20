package com.foodiehub.restaurant.directory;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * A cached access token for one Keycloak confidential client (client-credentials grant), renewed 30 seconds before it
 * expires. The client secret never leaves this class and is never logged.
 */
final class ServiceAccountToken {

    private final RestClient keycloak;
    private final String realm;
    private final String clientId;
    private final String clientSecret;
    private final Clock clock;
    private String accessToken;
    private Instant expiresAt = Instant.EPOCH;

    ServiceAccountToken(RestClient keycloak, String realm, String clientId, String clientSecret, Clock clock) {
        this.keycloak = keycloak;
        this.realm = realm;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.clock = clock;
    }

    boolean configured() {
        return clientSecret != null && !clientSecret.isBlank();
    }

    synchronized String get(String notConfiguredMessage) {
        if (!configured()) {
            throw new UserDirectoryUnavailableException(notConfiguredMessage, null);
        }
        Instant now = clock.instant();
        if (accessToken != null && now.isBefore(expiresAt)) {
            return accessToken;
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        try {
            Map<?, ?> response = keycloak.post().uri("/realms/{realm}/protocol/openid-connect/token", realm)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            if (response == null || !(response.get("access_token") instanceof String value)) {
                throw new UserDirectoryUnavailableException("Keycloak returned no access token for " + clientId, null);
            }
            long expiresIn = response.get("expires_in") instanceof Number n ? n.longValue() : 60;
            accessToken = value;
            expiresAt = now.plusSeconds(Math.max(0, expiresIn - 30));
            return accessToken;
        } catch (RestClientException e) {
            throw new UserDirectoryUnavailableException("Keycloak token request failed for " + clientId, e);
        }
    }

    synchronized void invalidate() {
        accessToken = null;
        expiresAt = Instant.EPOCH;
    }
}
