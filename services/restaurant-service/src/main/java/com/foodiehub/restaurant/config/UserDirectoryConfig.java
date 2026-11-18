package com.foodiehub.restaurant.config;

import java.net.http.HttpClient;
import java.time.Clock;

import com.foodiehub.restaurant.directory.OwnerProvisioner;
import com.foodiehub.restaurant.directory.OwnerProvisioningProperties;
import com.foodiehub.restaurant.directory.UserDirectory;
import com.foodiehub.restaurant.directory.UserDirectoryProperties;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Keycloak access (DEC-017, DEC-018): the read-only user directory and the owner provisioner. Each uses its own
 * confidential client; both share the server URL, realm and timeouts.
 */
@Configuration
@EnableConfigurationProperties({UserDirectoryProperties.class, OwnerProvisioningProperties.class})
public class UserDirectoryConfig {

    @Bean
    RestClient keycloakRestClient(UserDirectoryProperties props) {
        HttpClient http = HttpClient.newBuilder().connectTimeout(props.connectTimeout()).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(props.readTimeout());
        return RestClient.builder().baseUrl(props.serverUrl()).requestFactory(factory).build();
    }

    @Bean
    UserDirectory userDirectory(RestClient keycloakRestClient, UserDirectoryProperties props, OwnerProvisioningProperties owners) {
        return new UserDirectory(keycloakRestClient, props, Clock.systemUTC(), owners.ownerGroup());
    }

    @Bean
    OwnerProvisioner ownerProvisioner(RestClient keycloakRestClient, UserDirectoryProperties props,
            OwnerProvisioningProperties owners, UserDirectory userDirectory) {
        return new OwnerProvisioner(keycloakRestClient, props.realm(), owners, userDirectory, Clock.systemUTC());
    }
}
