package com.foodiehub.restaurant.directory;

/** Keycloak could not be asked (not configured, unreachable, or refused the service account). → 503 */
public class UserDirectoryUnavailableException extends RuntimeException {

    public UserDirectoryUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
