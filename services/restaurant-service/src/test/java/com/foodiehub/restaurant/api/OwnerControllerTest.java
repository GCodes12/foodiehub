package com.foodiehub.restaurant.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.foodiehub.restaurant.config.KeycloakRoles;
import com.foodiehub.restaurant.config.SecurityConfig;
import com.foodiehub.restaurant.domain.MenuItem;
import com.foodiehub.restaurant.domain.OwnerCatalog;
import com.foodiehub.restaurant.domain.Restaurant;
import com.foodiehub.restaurant.domain.RestaurantCatalog;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Owner endpoints (DEC-015): role required, own restaurants only (by token subject, DEC-017), validated changes, Problem Details errors. */
@WebMvcTest({OwnerController.class, RestaurantController.class})
@Import(SecurityConfig.class)
class OwnerControllerTest {

    private static final String RID = "00000000-0000-0000-0000-000000000001";
    private static final String ITEM = "00000000-0000-0000-0001-000000000034";
    private static final String OWNER_SUB = "6b1c2a5e-0000-4000-8000-000000000001";

    @Autowired
    MockMvc mvc;

    @MockitoBean
    OwnerCatalog owners;

    @MockitoBean
    RestaurantCatalog catalog;

    private static MockHttpServletRequestBuilder asOwner(MockHttpServletRequestBuilder request) {
        return request.with(jwt().jwt(j -> j.subject(OWNER_SUB).claim("preferred_username", "owner"))
                .authorities(new SimpleGrantedAuthority("ROLE_RESTAURANT_OWNER")));
    }

    private static MenuItem phirni() {
        return new MenuItem(ITEM, RID, "Phirni", new BigDecimal("89.00"), false)
                .withDetails("DESSERTS", "Chilled pudding.", "VEG", false, false, "phirni", 340);
    }

    @Test
    void ownerEndpointsNeedAToken() throws Exception {
        mvc.perform(get("/api/v1/owner/restaurants")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/v1/owner/restaurants/{r}/menu-items/{i}", RID, ITEM)
                .contentType(MediaType.APPLICATION_JSON).content("{\"available\":true}")).andExpect(status().isUnauthorized());
    }

    @Test
    void aCustomerTokenIsForbiddenWithProblemDetails() throws Exception {
        mvc.perform(get("/api/v1/owner/restaurants").with(jwt().jwt(j -> j.claim("preferred_username", "alice"))
                        .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.detail").value("Your account is not allowed to do this."));
        verify(owners, never()).ownedRestaurants(anyString());
    }

    @Test
    void publicBrowsingStillNeedsNoToken() throws Exception {
        given(catalog.listActiveRestaurants()).willReturn(List.of(new Restaurant(RID, "ZAYORA", true)));
        mvc.perform(get("/api/v1/restaurants")).andExpect(status().isOk());
    }

    @Test
    void listsTheOwnersRestaurantsByTheirTokenSubject() throws Exception {
        given(owners.ownedRestaurants(OWNER_SUB)).willReturn(List.of(new Restaurant(RID, "ZAYORA", true)));
        mvc.perform(asOwner(get("/api/v1/owner/restaurants")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(RID))
                .andExpect(jsonPath("$[0].name").value("ZAYORA"))
                .andExpect(jsonPath("$[0].active").value(true));
    }

    @Test
    void updatesOnlyTheFieldsSentAndReturnsTheDish() throws Exception {
        given(owners.updateMenuItem(eq(RID), eq(ITEM), eq(OWNER_SUB), any())).willAnswer(inv -> {
            MenuItem item = phirni();
            OwnerCatalog.MenuItemChanges c = inv.getArgument(3);
            item.applyOwnerChanges(c.available(), c.price(), c.description(), c.bestseller(), c.chefSpecial());
            return Optional.of(item);
        });

        mvc.perform(asOwner(patch("/api/v1/owner/restaurants/{r}/menu-items/{i}", RID, ITEM))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"available\":true,\"price\":95.5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.price").value(95.50))
                .andExpect(jsonPath("$.description").value("Chilled pudding."));

        ArgumentCaptor<OwnerCatalog.MenuItemChanges> changes = ArgumentCaptor.forClass(OwnerCatalog.MenuItemChanges.class);
        verify(owners).updateMenuItem(eq(RID), eq(ITEM), eq(OWNER_SUB), changes.capture());
        assertThat(changes.getValue().price()).isEqualByComparingTo("95.50");
        assertThat(changes.getValue().price().scale()).isEqualTo(2);
        assertThat(changes.getValue().description()).isNull();
    }

    @Test
    void anotherOwnersDishIsNotFound() throws Exception {
        given(owners.updateMenuItem(anyString(), anyString(), anyString(), any())).willReturn(Optional.empty());
        mvc.perform(asOwner(patch("/api/v1/owner/restaurants/{r}/menu-items/{i}", "someone-elses", ITEM))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"available\":false}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MENU_ITEM_NOT_FOUND"));
    }

    @Test
    void rejectsInvalidChanges() throws Exception {
        for (String body : List.of("{\"price\":0}", "{\"price\":-5}", "{\"price\":10.555}", "{\"price\":100000000}",
                "{\"description\":\"" + "x".repeat(301) + "\"}")) {
            mvc.perform(asOwner(patch("/api/v1/owner/restaurants/{r}/menu-items/{i}", RID, ITEM))
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        }
        mvc.perform(asOwner(patch("/api/v1/owner/restaurants/{r}/menu-items/{i}", RID, ITEM))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NOTHING_TO_UPDATE"));
        mvc.perform(asOwner(patch("/api/v1/owner/restaurants/{r}/menu-items/{i}", RID, ITEM))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"available\":\"maybe\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
        verify(owners, never()).updateMenuItem(anyString(), anyString(), anyString(), any());
    }

    @Test
    void theUsernameNeverGrantsOwnership() throws Exception {
        // DEC-017: a token whose username is "owner" but whose subject is someone else sees nothing of the owner's.
        given(owners.ownedRestaurants(OWNER_SUB)).willReturn(List.of(new Restaurant(RID, "ZAYORA", true)));
        mvc.perform(get("/api/v1/owner/restaurants").with(jwt().jwt(j -> j.subject("someone-else").claim("preferred_username", "owner"))
                        .authorities(new SimpleGrantedAuthority("ROLE_RESTAURANT_OWNER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
        verify(owners).ownedRestaurants("someone-else");
        verify(owners, never()).ownedRestaurants("owner");
    }

    @Test
    void anAdminTokenIsNotAnOwnerToken() throws Exception {
        mvc.perform(get("/api/v1/owner/restaurants").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isForbidden());
        verify(owners, never()).ownedRestaurants(anyString());
    }

    /**
     * CSRF regression guard (Sonar java:S4502 reviewed as not applicable): cookies never authenticate. A token-shaped
     * value in a cookie plus browser session cookies, without an Authorization header, cannot change a dish; 401, and the
     * catalogue is never called.
     */
    @Test
    void cookiesWithoutABearerHeaderNeverAuthenticate() throws Exception {
        String tokenLike = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJvd25lciIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJSRVNUQVVSQU5UX09XTkVSIl19fQ.c2ln";
        jakarta.servlet.http.Cookie[] cookies = {new jakarta.servlet.http.Cookie("access_token", tokenLike),
                new jakarta.servlet.http.Cookie("KEYCLOAK_SESSION", "abc"), new jakarta.servlet.http.Cookie("JSESSIONID", "xyz")};
        String challenge = mvc.perform(patch("/api/v1/owner/restaurants/{r}/menu-items/{i}", RID, ITEM).cookie(cookies)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"available\":false}"))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getHeader("WWW-Authenticate");
        assertThat(challenge).startsWith("Bearer");
        mvc.perform(get("/api/v1/owner/restaurants").cookie(cookies)).andExpect(status().isUnauthorized());
        verify(owners, never()).updateMenuItem(anyString(), anyString(), anyString(), any());
        verify(owners, never()).ownedRestaurants(anyString());
    }

    @Test
    void mapsKeycloakRealmRolesToAuthorities() {
        Jwt token = Jwt.withTokenValue("t").header("alg", "none")
                .claim("realm_access", Map.of("roles", List.of("RESTAURANT_OWNER", "offline_access"))).build();
        assertThat(new KeycloakRoles().convert(token)).extracting(Object::toString)
                .containsExactlyInAnyOrder("ROLE_RESTAURANT_OWNER", "ROLE_offline_access");
        assertThat(new KeycloakRoles().convert(Jwt.withTokenValue("t").header("alg", "none").claim("sub", "x").build())).isEmpty();
    }
}
