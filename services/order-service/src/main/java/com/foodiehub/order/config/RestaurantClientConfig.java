package com.foodiehub.order.config;

import java.net.http.HttpClient;

import com.foodiehub.order.restaurant.RestaurantMenuClient;
import com.foodiehub.order.restaurant.RestaurantServiceProperties;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class RestaurantClientConfig {

    @Bean
    RestaurantMenuClient restaurantMenuClient(RestaurantServiceProperties props) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(props.connectTimeout()).build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(props.readTimeout());
        return new RestaurantMenuClient(RestClient.builder()
                .baseUrl(props.baseUrl())
                .requestFactory(requestFactory)
                .build());
    }
}
