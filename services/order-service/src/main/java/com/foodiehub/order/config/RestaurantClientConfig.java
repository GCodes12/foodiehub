package com.foodiehub.order.config;

import java.net.http.HttpClient;

import com.foodiehub.order.restaurant.OwnedRestaurantsClient;
import com.foodiehub.order.restaurant.RestaurantMenuClient;
import com.foodiehub.order.restaurant.RestaurantServiceProperties;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * REST clients for restaurant-service. DEC-019: by default they go through Spring Cloud LoadBalancer, which resolves
 * the Consul service name in the base URL to a healthy instance for every request (round robin).
 */
@Configuration
public class RestaurantClientConfig {

    /** Builders created from this one resolve service names through the load balancer. */
    @Bean
    @LoadBalanced
    RestClient.Builder loadBalancedRestClientBuilder() {
        return RestClient.builder();
    }

    private static RestClient restClient(RestaurantServiceProperties props, ObjectProvider<RestClient.Builder> loadBalanced) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(props.connectTimeout()).build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(props.readTimeout());
        RestClient.Builder builder = props.useLoadBalancer() ? loadBalanced.getObject().clone() : RestClient.builder();
        return builder.baseUrl(props.baseUrl()).requestFactory(requestFactory).build();
    }

    @Bean
    RestaurantMenuClient restaurantMenuClient(RestaurantServiceProperties props,
            @LoadBalanced ObjectProvider<RestClient.Builder> loadBalanced) {
        return new RestaurantMenuClient(restClient(props, loadBalanced));
    }

    @Bean
    OwnedRestaurantsClient ownedRestaurantsClient(RestaurantServiceProperties props,
            @LoadBalanced ObjectProvider<RestClient.Builder> loadBalanced) {
        return new OwnedRestaurantsClient(restClient(props, loadBalanced));
    }
}
