package com.foodiehub.restaurant.directory;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Owner account creation (DEC-018): the confidential client {@code foodiehub-owner-provisioner}, whose service account
 * may only create users inside {@code ownerGroup} (Keycloak fine-grained admin permissions). A blank secret disables
 * owner creation; listing and assigning owners keep working. Server URL, realm and timeouts are the user directory's.
 */
@ConfigurationProperties("foodiehub.owner-provisioning")
public record OwnerProvisioningProperties(String clientId, String clientSecret, String ownerGroup) {

    public boolean configured() {
        return clientSecret != null && !clientSecret.isBlank();
    }
}
