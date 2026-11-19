package com.foodiehub.restaurant.config;

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
 * Browsing stays public (DEC-009): GET /api/v1/restaurants/** needs no token. The owner endpoints (DEC-015) need a
 * valid FoodieHub token (issuer, signature, audience restaurant-service: application.yml) with the RESTAURANT_OWNER
 * realm role; the administrator endpoints (DEC-017) need the ADMIN realm role. Everything else is denied. Stateless, so no session and no CSRF token.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http, MessageSource messages) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/restaurants", "/api/v1/restaurants/**").permitAll()
                        // DEC-019: Consul's health check (no details; every other actuator endpoint stays denied).
                        .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                        .requestMatchers("/api/v1/owner/**").hasRole("RESTAURANT_OWNER")
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(KeycloakRoles.authenticationConverter()))
                        .accessDeniedHandler(forbidden(messages)))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // CSRF does not apply (Sonar java:S4502 reviewed): this API is stateless and authenticates only through the
                // Authorization: Bearer header, which browsers never attach automatically; no cookie or session authenticates
                // a request. Reconsider CSRF protection if cookie- or session-based authentication is ever introduced.
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
