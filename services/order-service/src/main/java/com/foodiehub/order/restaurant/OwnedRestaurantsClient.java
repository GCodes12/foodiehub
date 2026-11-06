package com.foodiehub.order.restaurant;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Asks the Restaurant Service which restaurants the caller manages (DEC-015), forwarding the caller's own access
 * token, so ownership has a single source of truth. A 401/403 answer means "manages none".
 */
public class OwnedRestaurantsClient {

    record OwnedRestaurant(String id, String name, boolean active) {
    }

    /** The Restaurant Service could not tell us; the caller should retry later. */
    public static class OwnershipUnavailableException extends RuntimeException {
        public OwnershipUnavailableException(Throwable cause) {
            super("OWNER_DATA_UNAVAILABLE", cause, false, false);
        }
    }

    private final RestClient restClient;

    public OwnedRestaurantsClient(RestClient restClient) {
        this.restClient = restClient;
    }

    public List<String> ownedRestaurantIds(String bearerToken) {
        try {
            OwnedRestaurant[] owned = restClient.get()
                    .uri("/api/v1/owner/restaurants")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
                    .retrieve()
                    .body(OwnedRestaurant[].class);
            return owned == null ? List.of() : java.util.Arrays.stream(owned).map(OwnedRestaurant::id).toList();
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            return List.of();
        } catch (RestClientException e) {
            throw new OwnershipUnavailableException(e);
        }
    }
}
