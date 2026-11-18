package com.foodiehub.order.config;

import jakarta.servlet.DispatcherType;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;

/**
 * Every order endpoint requires a valid Keycloak access token (RR-007, FR-011, SEC-001): issuer = FoodieHub realm,
 * audience = order-service (application.yml). Roles (DEC-015): only CUSTOMER may place orders (Q-23); any signed-in
 * user may read their own orders; the owner order list needs RESTAURANT_OWNER; the read-only platform overview needs
 * ADMIN (DEC-017). Everything else is denied.
 * Stateless bearer-token API, so no session and no CSRF token.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http, MessageSource messages) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/orders").hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.GET, "/api/v1/orders", "/api/v1/orders/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/owner/orders").hasRole("RESTAURANT_OWNER")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/owner/orders/*/status").hasRole("RESTAURANT_OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/orders", "/api/v1/admin/orders/summary").hasRole("ADMIN")
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(KeycloakRoles.authenticationConverter()))
                        .accessDeniedHandler(forbidden(messages)))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(csrf -> csrf.disable());
        return http.build();
    }

    /** 403 as Problem Details with code FORBIDDEN (text from messages.properties). */
    static AccessDeniedHandler forbidden(MessageSource messages) {
        return (request, response, ex) -> {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            String title = messages.getMessage("problem.FORBIDDEN.title", null, "Forbidden", LocaleContextHolder.getLocale());
            String detail = messages.getMessage("problem.FORBIDDEN.detail", null, "", LocaleContextHolder.getLocale());
            response.getWriter().write("{\"type\":\"about:blank\",\"title\":\"" + json(title) + "\",\"status\":403,\"detail\":\""
                    + json(detail) + "\",\"code\":\"FORBIDDEN\"}");
        };
    }

    private static String json(String text) {
        return text.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
