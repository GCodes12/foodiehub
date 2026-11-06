package com.foodiehub.order.restaurant;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("foodiehub.restaurant-service")
public record RestaurantServiceProperties(String baseUrl, Duration connectTimeout, Duration readTimeout) {
}
