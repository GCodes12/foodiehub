package com.foodiehub.gateway;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Token checks at the edge (plan.md D3, DEC-019). Public browsing passes without a token; every other API call needs a
 * valid FoodieHub token (issuer, signature, expiry, audience: application.yml) before it is forwarded. The gateway does
 * not decide roles or ownership: each service checks those again on the forwarded token. Everything else is denied,
 * so no actuator endpoint except health and no unknown path is reachable from outside.
 */
@Configuration
public class GatewaySecurityConfig {

    @Bean
    SecurityFilterChain gatewaySecurity(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/v1/restaurants", "/api/v1/restaurants/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                        .requestMatchers("/api/v1/**").authenticated()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> { }))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // CSRF does not apply (Sonar java:S4502 reviewed): this API is stateless and authenticates only through the
                // Authorization: Bearer header, which browsers never attach automatically; no cookie or session authenticates
                // a request. Reconsider CSRF protection if cookie- or session-based authentication is ever introduced.
                .csrf(csrf -> csrf.disable());
        return http.build();
    }
}
