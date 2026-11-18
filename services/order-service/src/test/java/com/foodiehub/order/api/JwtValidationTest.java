package com.foodiehub.order.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.foodiehub.order.config.SecurityConfig;
import com.foodiehub.order.order.OrderService;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Real bearer-token validation (SEC-001): signed JWTs go through the application's own decoder configuration —
 * the issuer and audience rules from application.yml and Spring Security's signature and expiry checks. Only the
 * key source differs from production: a local JWK Set endpoint replaces Keycloak's, so no Keycloak is needed.
 * (The other API tests use the jwt() shortcut, which bypasses decoding; this class covers what it skips.)
 */
@WebMvcTest({OrderController.class, AdminOrderController.class})
@Import(SecurityConfig.class)
class JwtValidationTest {

    /** Same values as application.yml (the issuer is not overridden here, so the real setting is tested). */
    private static final String ISSUER = "http://localhost:8080/realms/foodiehub";
    private static final String AUDIENCE = "order-service";
    private static final String ORDER_ID = "5515b15a-a16a-4346-ab1c-f120d9710d50";

    private static final RSAKey SIGNING_KEY = newKey("test-key");
    /** A different key pair with the same key id: a forged token that claims to be signed by the trusted key. */
    private static final RSAKey FORGER_KEY = newKey("test-key");
    private static final HttpServer JWKS_SERVER = startJwksServer(new JWKSet(SIGNING_KEY.toPublicJWK()).toString());

    @DynamicPropertySource
    static void keySource(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri",
                () -> "http://127.0.0.1:" + JWKS_SERVER.getAddress().getPort() + "/certs");
    }

    @AfterAll
    static void stopJwksServer() {
        JWKS_SERVER.stop(0);
    }

    @Autowired
    MockMvc mvc;

    @MockitoBean
    OrderService orderService;

    @MockitoBean
    com.foodiehub.order.order.OrderLifecycle lifecycle;

    @MockitoBean
    com.foodiehub.order.order.AdminOrderOverview overview;

    // --- The positive control: without it, the 401 cases below would prove nothing ----------------------------

    @Test
    void acceptsAValidTokenAndUsesItsSubjectAsTheCustomer() throws Exception {
        given(orderService.findOwnOrder(ORDER_ID, "alice-sub")).willReturn(Optional.empty());

        mvc.perform(get("/api/v1/orders/{id}", ORDER_ID).header(HttpHeaders.AUTHORIZATION, bearer(validToken())))
                .andExpect(status().isNotFound()); // authenticated; the (mocked) order simply does not exist

        verify(orderService).findOwnOrder(ORDER_ID, "alice-sub");
    }

    @Test
    void aValidTokenWithoutTheCustomerRoleCannotPlaceOrders() throws Exception {
        String token = sign(SIGNING_KEY, claims().claim("realm_access", java.util.Map.of("roles", List.of("RESTAURANT_OWNER"))).build());
        mvc.perform(post("/api/v1/orders")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"restaurantId\":\"r1\",\"fulfilmentType\":\"PICKUP\",\"items\":[{\"menuItemId\":\"m1\",\"quantity\":1}]}"))
                .andExpect(status().isForbidden());
        verify(orderService, never()).create(any());
    }

    @Test
    void mapsKeycloakRealmRolesFromTheToken() {
        var jwt = org.springframework.security.oauth2.jwt.Jwt.withTokenValue("t").header("alg", "RS256")
                .claim("realm_access", java.util.Map.of("roles", List.of("CUSTOMER", "offline_access"))).build();
        assertThat(new com.foodiehub.order.config.KeycloakRoles().convert(jwt)).extracting(Object::toString)
                .containsExactlyInAnyOrder("ROLE_CUSTOMER", "ROLE_offline_access");
    }

    // --- Invalid tokens -----------------------------------------------------------------------------------------

    enum BadToken {
        FORGED_SIGNATURE, TAMPERED_PAYLOAD, EXPIRED, WRONG_ISSUER, WRONG_AUDIENCE, NO_AUDIENCE, UNSIGNED, MALFORMED
    }

    private static String token(BadToken kind) throws Exception {
        return switch (kind) {
            case FORGED_SIGNATURE -> sign(FORGER_KEY, claims().build());
            case TAMPERED_PAYLOAD -> tamperSubject(validToken(), "bob-sub");
            case EXPIRED -> sign(SIGNING_KEY, claims()
                    .issueTime(Date.from(Instant.now().minusSeconds(1200)))
                    .expirationTime(Date.from(Instant.now().minusSeconds(300))) // beyond the 60 s clock-skew allowance
                    .build());
            case WRONG_ISSUER -> sign(SIGNING_KEY, claims().issuer("http://localhost:8080/realms/master").build());
            case WRONG_AUDIENCE -> sign(SIGNING_KEY, claims().audience("account").build());
            case NO_AUDIENCE -> sign(SIGNING_KEY, claims().audience((String) null).build());
            case UNSIGNED -> new PlainJWT(claims().build()).serialize(); // "alg": "none"
            case MALFORMED -> "not-a-jwt";
        };
    }

    @ParameterizedTest
    @EnumSource(BadToken.class)
    void rejectsAnInvalidTokenWhenRetrievingAnOrder(BadToken kind) throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/orders/{id}", ORDER_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token(kind))))
                .andExpect(status().isUnauthorized())
                .andReturn();

        assertThat(result.getResponse().getHeader(HttpHeaders.WWW_AUTHENTICATE)).contains("error=\"invalid_token\"");
        verifyNoInteractions(orderService);
    }

    @ParameterizedTest
    @EnumSource(BadToken.class)
    void rejectsAnInvalidTokenWhenListingOrders(BadToken kind) throws Exception {
        mvc.perform(get("/api/v1/orders").header(HttpHeaders.AUTHORIZATION, bearer(token(kind))))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(orderService);
    }

    @ParameterizedTest
    @EnumSource(BadToken.class)
    void rejectsAnInvalidTokenWhenCreatingAnOrderAndCreatesNothing(BadToken kind) throws Exception {
        mvc.perform(post("/api/v1/orders")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token(kind)))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"restaurantId":"00000000-0000-0000-0000-000000000001","fulfilmentType":"PICKUP",
                                 "items":[{"menuItemId":"00000000-0000-0000-0001-000000000001","quantity":1}]}"""))
                .andExpect(status().isUnauthorized());

        verify(orderService, never()).create(any());
        verify(orderService, never()).findOwnOrder(anyString(), anyString());
    }

    // --- Administrator endpoints (DEC-017): the same token checks, plus the ADMIN role --------------------------------

    private static String tokenWithRoles(String... roles) throws JOSEException {
        return sign(SIGNING_KEY, claims().claim("realm_access", java.util.Map.of("roles", List.of(roles))).build());
    }

    @Test
    void aValidAdminTokenReachesThePlatformOverview() throws Exception {
        given(overview.summary()).willReturn(new com.foodiehub.order.order.AdminOrderOverview.Summary(0, 0,
                java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, java.util.Map.of(), List.of(), Instant.now(), "Asia/Kolkata"));
        mvc.perform(get("/api/v1/admin/orders/summary").header(HttpHeaders.AUTHORIZATION, bearer(tokenWithRoles("ADMIN"))))
                .andExpect(status().isOk());
    }

    @Test
    void validCustomerAndOwnerTokensAreForbiddenOnThePlatformOverview() throws Exception {
        for (String role : List.of("CUSTOMER", "RESTAURANT_OWNER")) {
            mvc.perform(get("/api/v1/admin/orders/summary").header(HttpHeaders.AUTHORIZATION, bearer(tokenWithRoles(role))))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(overview);
    }

    @ParameterizedTest
    @EnumSource(BadToken.class)
    void rejectsAnInvalidTokenOnThePlatformOverview(BadToken kind) throws Exception {
        mvc.perform(get("/api/v1/admin/orders").header(HttpHeaders.AUTHORIZATION, bearer(token(kind))))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(overview);
    }

    // --- Helpers ------------------------------------------------------------------------------------------------

    private static JWTClaimsSet.Builder claims() {
        Instant now = Instant.now();
        return new JWTClaimsSet.Builder()
                .issuer(ISSUER)
                .audience(List.of(AUDIENCE, "account"))
                .subject("alice-sub")
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(900)));
    }

    private static String validToken() throws JOSEException {
        return sign(SIGNING_KEY, claims().build());
    }

    private static String sign(RSAKey key, JWTClaimsSet claims) throws JOSEException {
        SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).type(JOSEObjectType.JWT).build(),
                claims);
        jwt.sign(new RSASSASigner(key));
        return jwt.serialize();
    }

    /** Swaps the payload of a correctly signed token, keeping the original header and signature. */
    private static String tamperSubject(String token, String newSubject) throws Exception {
        String[] parts = token.split("\\.");
        String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)
                .replace("\"alice-sub\"", "\"" + newSubject + "\"");
        assertThat(payload).contains(newSubject);
        String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return parts[0] + "." + encoded + "." + parts[2];
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static RSAKey newKey(String keyId) {
        try {
            return new RSAKeyGenerator(2048).keyID(keyId).generate();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }

    private static HttpServer startJwksServer(String jwks) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            byte[] body = jwks.getBytes(StandardCharsets.UTF_8);
            server.createContext("/certs", exchange -> {
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, body.length);
                try (OutputStream out = exchange.getResponseBody()) {
                    out.write(body);
                }
            });
            server.start();
            return server;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
