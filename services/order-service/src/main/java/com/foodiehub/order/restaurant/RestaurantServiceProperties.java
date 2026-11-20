package com.foodiehub.order.restaurant;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * How order-service reaches restaurant-service. With {@code loadBalanced} (the default, DEC-019) the base URL's host is
 * the Consul service name and Spring Cloud LoadBalancer chooses a healthy instance per request; without it the base URL
 * is called as is.
 */
@ConfigurationProperties("foodiehub.restaurant-service")
public record RestaurantServiceProperties(String baseUrl, Duration connectTimeout, Duration readTimeout, Boolean loadBalanced) {

    public boolean useLoadBalancer() {
        return !Boolean.FALSE.equals(loadBalanced);
    }
}
