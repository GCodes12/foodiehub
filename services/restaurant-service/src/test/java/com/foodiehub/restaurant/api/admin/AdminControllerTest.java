package com.foodiehub.restaurant.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.foodiehub.restaurant.config.SecurityConfig;
import com.foodiehub.restaurant.directory.DirectoryUser;
import com.foodiehub.restaurant.directory.OwnerProvisioner;
import com.foodiehub.restaurant.directory.UserDirectory;
import com.foodiehub.restaurant.directory.UserDirectoryUnavailableException;
import com.foodiehub.restaurant.domain.AdminCatalog;
import com.foodiehub.restaurant.domain.Restaurant;
import com.foodiehub.restaurant.domain.RestaurantChangedException;
import com.foodiehub.restaurant.domain.RestaurantHasNoMenuException;
import com.foodiehub.restaurant.domain.RestaurantOwnerLink;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Administrator endpoints (DEC-017): ADMIN only, validated requests, no mass assignment, owners verified with Keycloak. */
@WebMvcTest(AdminController.class)
@Import(SecurityConfig.class)
class AdminControllerTest {

    private static final String RID = "11111111-1111-1111-1111-111111111111";
    private static final String OWNER_SUB = "6b1c2a5e-0000-4000-8000-000000000001";
    private static final SimpleGrantedAuthority ADMIN = new SimpleGrantedAuthority("ROLE_ADMIN");
    private static final SimpleGrantedAuthority CUSTOMER = new SimpleGrantedAuthority("ROLE_CUSTOMER");
    private static final SimpleGrantedAuthority OWNER = new SimpleGrantedAuthority("ROLE_RESTAURANT_OWNER");

    @Autowired
    MockMvc mvc;

    @MockitoBean
    AdminCatalog catalog;

    @MockitoBean
    UserDirectory directory;

    @MockitoBean
    OwnerProvisioner provisioner;

    private static MockHttpServletRequestBuilder as(SimpleGrantedAuthority role, MockHttpServletRequestBuilder request) {
        return request.with(jwt().jwt(j -> j.subject("sub-admin")).authorities(role));
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body) {
        return request.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private static AdminCatalog.RestaurantView view(boolean active, RestaurantOwnerLink owner) {
        Restaurant r = Restaurant.create(new Restaurant.Details("Spice Route", "Kerala food", "1 MG Road", "Kochi", "+91 98470 00000"));
        r.setActive(active);
        return new AdminCatalog.RestaurantView(r, owner, 3, 2);
    }

    /** Every administrator endpoint, so the role tests cannot miss one. */
    private static List<MockHttpServletRequestBuilder> everyEndpoint() {
        return List.of(
                get("/api/v1/admin/dashboard"),
                get("/api/v1/admin/restaurants"),
                json(post("/api/v1/admin/restaurants"), "{\"name\":\"X\"}"),
                get("/api/v1/admin/restaurants/{id}", RID),
                json(patch("/api/v1/admin/restaurants/{id}", RID), "{\"expectedVersion\":0,\"name\":\"X\"}"),
                json(put("/api/v1/admin/restaurants/{id}/status", RID), "{\"active\":false,\"expectedVersion\":0}"),
                json(put("/api/v1/admin/restaurants/{id}/owner", RID), "{\"ownerSub\":\"" + OWNER_SUB + "\"}"),
                get("/api/v1/admin/owners"),
                json(post("/api/v1/admin/owners"), NEW_OWNER));
    }

    // --- Authorization -----------------------------------------------------------------------------------------------

    @Test
    void everyAdminEndpointNeedsAToken() throws Exception {
        for (MockHttpServletRequestBuilder request : everyEndpoint()) {
            mvc.perform(request).andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(catalog, directory, provisioner);
    }

    @Test
    void customersAndOwnersGet403OnEveryAdminEndpoint() throws Exception {
        for (SimpleGrantedAuthority role : List.of(CUSTOMER, OWNER)) {
            for (MockHttpServletRequestBuilder request : everyEndpoint()) {
                mvc.perform(as(role, request))
                        .andExpect(status().isForbidden())
                        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
            }
        }
        verifyNoInteractions(catalog, directory, provisioner);
    }

    // --- Dashboard --------------------------------------------------------------------------------------------------

    @Test
    void dashboardCountsRestaurantsAndKeycloakUsers() throws Exception {
        given(catalog.counts()).willReturn(new AdminCatalog.Counts(5, 3));
        given(directory.countOwners()).willReturn(2);
        given(provisioner.configured()).willReturn(true);
        given(directory.countUsersWithRole(UserDirectory.CUSTOMER_ROLE)).willReturn(40);

        mvc.perform(as(ADMIN, get("/api/v1/admin/dashboard")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRestaurants").value(5))
                .andExpect(jsonPath("$.activeRestaurants").value(3))
                .andExpect(jsonPath("$.inactiveRestaurants").value(2))
                .andExpect(jsonPath("$.totalOwners").value(2))
                .andExpect(jsonPath("$.totalCustomers").value(40))
                .andExpect(jsonPath("$.userDirectoryAvailable").value(true))
                .andExpect(jsonPath("$.ownerProvisioningConfigured").value(true));
    }

    @Test
    void dashboardStillAnswersWhenKeycloakCannotBeAsked() throws Exception {
        given(catalog.counts()).willReturn(new AdminCatalog.Counts(1, 1));
        given(directory.countOwners()).willThrow(new UserDirectoryUnavailableException("down", null));

        mvc.perform(as(ADMIN, get("/api/v1/admin/dashboard")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRestaurants").value(1))
                .andExpect(jsonPath("$.totalOwners").isEmpty())
                .andExpect(jsonPath("$.totalCustomers").isEmpty())
                .andExpect(jsonPath("$.userDirectoryAvailable").value(false));
    }

    // --- Restaurants --------------------------------------------------------------------------------------------------

    @Test
    void listsRestaurantsAsAPageWithBoundedSize() throws Exception {
        given(catalog.search(eq(true), eq("spice"), eq(0), eq(100)))
                .willReturn(new PageImpl<>(List.of(view(true, null)), PageRequest.of(0, 100), 1));

        mvc.perform(as(ADMIN, get("/api/v1/admin/restaurants").param("active", "true").param("q", "spice").param("size", "5000")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Spice Route"))
                .andExpect(jsonPath("$.items[0].availableDishes").value(2))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.size").value(100))
                .andExpect(jsonPath("$.pageable").doesNotExist());
    }

    @Test
    void createsARestaurantFromTheAllowedFieldsOnly() throws Exception {
        given(catalog.create(any())).willReturn(view(false, null));

        mvc.perform(as(ADMIN, json(post("/api/v1/admin/restaurants"),
                        "{\"name\":\"  Spice Route \",\"city\":\"Kochi\",\"phone\":\"\","
                                + "\"id\":\"evil-id\",\"active\":true,\"version\":99,\"ownerSub\":\"x\"}")))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/v1/admin/restaurants/")))
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.owner").isEmpty());

        ArgumentCaptor<Restaurant.Details> details = ArgumentCaptor.forClass(Restaurant.Details.class);
        verify(catalog).create(details.capture());
        assertThat(details.getValue()).isEqualTo(new Restaurant.Details("Spice Route", null, null, "Kochi", null));
        verify(catalog, never()).setActive(anyString(), anyBoolean(), anyLong());
        verify(catalog, never()).assignOwner(anyString(), anyString(), anyString());
    }

    @Test
    void rejectsInvalidRestaurantsWithFieldErrors() throws Exception {
        for (String body : List.of("{}", "{\"name\":\"   \"}", "{\"name\":\"" + "x".repeat(201) + "\"}",
                "{\"name\":\"A\",\"phone\":\"call me\"}", "{\"name\":\"A\",\"description\":\"" + "d".repeat(501) + "\"}")) {
            mvc.perform(as(ADMIN, json(post("/api/v1/admin/restaurants"), body)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                    .andExpect(jsonPath("$.errors[0].field").exists());
        }
        verify(catalog, never()).create(any());
    }

    @Test
    void unknownRestaurantIs404() throws Exception {
        given(catalog.find(RID)).willReturn(Optional.empty());
        mvc.perform(as(ADMIN, get("/api/v1/admin/restaurants/{id}", RID)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESTAURANT_NOT_FOUND"));
    }

    @Test
    void updatesOnlyTheFieldsSentWithTheExpectedVersion() throws Exception {
        given(catalog.update(eq(RID), eq(4L), any())).willReturn(Optional.of(view(true, null)));

        mvc.perform(as(ADMIN, json(patch("/api/v1/admin/restaurants/{id}", RID),
                        "{\"expectedVersion\":4,\"city\":\"\",\"active\":false}")))
                .andExpect(status().isOk());

        ArgumentCaptor<Restaurant.Details> changes = ArgumentCaptor.forClass(Restaurant.Details.class);
        verify(catalog).update(eq(RID), eq(4L), changes.capture());
        assertThat(changes.getValue()).isEqualTo(new Restaurant.Details(null, null, null, "", null));
        verify(catalog, never()).setActive(anyString(), anyBoolean(), anyLong());
    }

    @Test
    void anEditNeedsAVersionAndAChange() throws Exception {
        mvc.perform(as(ADMIN, json(patch("/api/v1/admin/restaurants/{id}", RID), "{\"name\":\"X\"}")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        mvc.perform(as(ADMIN, json(patch("/api/v1/admin/restaurants/{id}", RID), "{\"expectedVersion\":1}")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("NOTHING_TO_UPDATE"));
        mvc.perform(as(ADMIN, json(patch("/api/v1/admin/restaurants/{id}", RID), "{\"expectedVersion\":1,\"name\":\"  \"}")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        verify(catalog, never()).update(anyString(), anyLong(), any());
    }

    @Test
    void aStaleEditIs409() throws Exception {
        given(catalog.update(eq(RID), eq(1L), any())).willThrow(new RestaurantChangedException());
        mvc.perform(as(ADMIN, json(patch("/api/v1/admin/restaurants/{id}", RID), "{\"expectedVersion\":1,\"name\":\"New\"}")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESTAURANT_CHANGED"));
    }

    @Test
    void deactivatesARestaurant() throws Exception {
        given(catalog.setActive(RID, false, 2L)).willReturn(Optional.of(view(false, null)));
        mvc.perform(as(ADMIN, json(put("/api/v1/admin/restaurants/{id}/status", RID), "{\"active\":false,\"expectedVersion\":2}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    void cannotActivateARestaurantWithoutAMenu() throws Exception {
        given(catalog.setActive(RID, true, 0L)).willThrow(new RestaurantHasNoMenuException());
        mvc.perform(as(ADMIN, json(put("/api/v1/admin/restaurants/{id}/status", RID), "{\"active\":true,\"expectedVersion\":0}")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESTAURANT_HAS_NO_MENU"));
    }

    // --- Owners -------------------------------------------------------------------------------------------------------

    @Test
    void assignsAVerifiedOwnerBySubject() throws Exception {
        given(catalog.find(RID)).willReturn(Optional.of(view(true, null)));
        given(directory.findEnabledOwner(OWNER_SUB)).willReturn(Optional.of(new DirectoryUser(OWNER_SUB, "owner", "Owner Demo", "owner@foodiehub.local", true, false)));
        given(catalog.assignOwner(RID, OWNER_SUB, "owner"))
                .willReturn(Optional.of(view(true, new RestaurantOwnerLink(RID, OWNER_SUB, "owner"))));

        mvc.perform(as(ADMIN, json(put("/api/v1/admin/restaurants/{id}/owner", RID), "{\"ownerSub\":\"" + OWNER_SUB + "\"}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.owner.sub").value(OWNER_SUB))
                .andExpect(jsonPath("$.owner.username").value("owner"))
                .andExpect(jsonPath("$.owner.needsReassignment").value(false));
    }

    @Test
    void anAccountWithoutTheOwnerRoleCannotBeAssigned() throws Exception {
        given(catalog.find(RID)).willReturn(Optional.of(view(true, null)));
        given(directory.findEnabledOwner(OWNER_SUB)).willReturn(Optional.empty()); // a customer, disabled or unknown

        mvc.perform(as(ADMIN, json(put("/api/v1/admin/restaurants/{id}/owner", RID), "{\"ownerSub\":\"" + OWNER_SUB + "\"}")))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("INVALID_OWNER"));
        verify(catalog, never()).assignOwner(anyString(), anyString(), anyString());
    }

    @Test
    void malformedOwnerIdsNeverReachKeycloak() throws Exception {
        for (String sub : List.of("", "../users", "a b", "x".repeat(65))) {
            mvc.perform(as(ADMIN, json(put("/api/v1/admin/restaurants/{id}/owner", RID), "{\"ownerSub\":\"" + sub + "\"}")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        }
        verifyNoInteractions(directory);
    }

    @Test
    void assigningToAnUnknownRestaurantIs404WithoutAskingKeycloak() throws Exception {
        given(catalog.find(RID)).willReturn(Optional.empty());
        mvc.perform(as(ADMIN, json(put("/api/v1/admin/restaurants/{id}/owner", RID), "{\"ownerSub\":\"" + OWNER_SUB + "\"}")))
                .andExpect(status().isNotFound());
        verifyNoInteractions(directory);
    }

    @Test
    void listsOwnerAccountsWithTheirRestaurantsEmailAndStatus() throws Exception {
        given(directory.owners()).willReturn(List.of(
                new DirectoryUser("sub-b", "zara", null, "zara@x.test", true, true),
                new DirectoryUser(OWNER_SUB, "owner", "Owner Demo", "owner@foodiehub.local", true, false)));
        Restaurant zayora = new Restaurant(RID, "ZAYORA", true);
        given(catalog.restaurantsByOwner(any())).willReturn(Map.of(OWNER_SUB, List.of(zayora)));

        mvc.perform(as(ADMIN, get("/api/v1/admin/owners")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items[0].username").value("owner"))
                .andExpect(jsonPath("$.items[0].restaurants[0].name").value("ZAYORA"))
                .andExpect(jsonPath("$.items[1].username").value("zara"))
                .andExpect(jsonPath("$.items[1].restaurants").isEmpty())
                .andExpect(jsonPath("$.items[0].email").value("owner@foodiehub.local"))
                .andExpect(jsonPath("$.items[1].passwordChangePending").value(true))
                .andExpect(jsonPath("$.items[0].password").doesNotExist());
    }

    @Test
    void ownerListIs503WhenKeycloakCannotBeAsked() throws Exception {
        given(directory.owners()).willThrow(new UserDirectoryUnavailableException("not configured", null));
        mvc.perform(as(ADMIN, get("/api/v1/admin/owners")))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("USER_DIRECTORY_UNAVAILABLE"));
    }

    // --- Creating owner accounts (DEC-018) ------------------------------------------------------------------------

    private static final String NEW_OWNER = "{\"fullName\":\" Asha Rao \",\"email\":\"Asha@Example.com\",\"username\":\"asha.rao\","
            + "\"temporaryPassword\":\"Kitchen-Start-42\"}";

    @Test
    void createsAnOwnerAccountAndNeverReturnsThePassword() throws Exception {
        given(provisioner.configured()).willReturn(true);
        given(provisioner.create(any())).willReturn(new DirectoryUser("new-sub", "asha.rao", "Asha Rao", "asha@example.com", true, true));

        String body = mvc.perform(as(ADMIN, json(post("/api/v1/admin/owners"),
                        NEW_OWNER.replace("}", ",\"roles\":[\"ADMIN\"],\"realmRoles\":[\"ADMIN\"],\"enabled\":false,\"groups\":[\"/x\"]}"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sub").value("new-sub"))
                .andExpect(jsonPath("$.username").value("asha.rao"))
                .andExpect(jsonPath("$.email").value("asha@example.com"))
                .andExpect(jsonPath("$.passwordChangePending").value(true))
                .andExpect(jsonPath("$.restaurants").isEmpty())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("Kitchen-Start-42").doesNotContainIgnoringCase("password\":");

        ArgumentCaptor<OwnerProvisioner.NewOwner> sent = ArgumentCaptor.forClass(OwnerProvisioner.NewOwner.class);
        verify(provisioner).create(sent.capture());
        // Normalised; extra fields such as roles, groups or enabled are never read.
        assertThat(sent.getValue()).isEqualTo(new OwnerProvisioner.NewOwner("Asha Rao", "asha@example.com", "asha.rao", "Kitchen-Start-42"));
        assertThat(sent.getValue().toString()).doesNotContain("Kitchen-Start-42");
    }

    @Test
    void rejectsInvalidOwnerInputBeforeAskingKeycloak() throws Exception {
        given(provisioner.configured()).willReturn(true);
        for (String body : List.of("{}",
                NEW_OWNER.replace("\" Asha Rao \"", "\"  \""),
                NEW_OWNER.replace("Asha@Example.com", "not-an-email"),
                NEW_OWNER.replace("asha.rao", "Asha Rao"),
                NEW_OWNER.replace("asha.rao", "ab"),
                NEW_OWNER.replace("asha.rao", "service-account-foodiehub-admin-api"),
                NEW_OWNER.replace("Kitchen-Start-42", "short"),
                NEW_OWNER.replace("Kitchen-Start-42", "x".repeat(65)))) {
            mvc.perform(as(ADMIN, json(post("/api/v1/admin/owners"), body)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                    .andExpect(jsonPath("$.errors[0].field").exists());
        }
        mvc.perform(as(ADMIN, json(post("/api/v1/admin/owners"), NEW_OWNER.replace("Kitchen-Start-42", "my-ASHA.RAO-pass"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("temporaryPassword"))
                .andExpect(jsonPath("$.errors[0].message").value("must not contain the username"));
        verifyNoInteractions(directory);
        verify(provisioner, never()).create(any());
    }

    @Test
    void duplicateUsernameAndEmailAre409WithoutCreatingAnything() throws Exception {
        given(provisioner.configured()).willReturn(true);
        given(directory.usernameExists("asha.rao")).willReturn(true);
        mvc.perform(as(ADMIN, json(post("/api/v1/admin/owners"), NEW_OWNER)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OWNER_USERNAME_TAKEN"));

        given(directory.usernameExists("asha.rao")).willReturn(false);
        given(directory.emailExists("asha@example.com")).willReturn(true);
        mvc.perform(as(ADMIN, json(post("/api/v1/admin/owners"), NEW_OWNER)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OWNER_EMAIL_TAKEN"));
        verify(provisioner, never()).create(any());
    }

    @Test
    void aDuplicateFoundByKeycloakItselfIsAlso409() throws Exception {
        given(provisioner.configured()).willReturn(true);
        given(provisioner.create(any())).willThrow(new OwnerProvisioner.DuplicateAccountException("email"));
        mvc.perform(as(ADMIN, json(post("/api/v1/admin/owners"), NEW_OWNER)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OWNER_EMAIL_TAKEN"));
    }

    @Test
    void ownerCreationIs503WhenNotConfiguredOrKeycloakFails() throws Exception {
        given(provisioner.configured()).willReturn(false);
        mvc.perform(as(ADMIN, json(post("/api/v1/admin/owners"), NEW_OWNER)))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("OWNER_PROVISIONING_UNAVAILABLE"));
        verify(provisioner, never()).create(any());

        given(provisioner.configured()).willReturn(true);
        given(provisioner.create(any())).willThrow(new UserDirectoryUnavailableException("Keycloak refused: 403", null));
        mvc.perform(as(ADMIN, json(post("/api/v1/admin/owners"), NEW_OWNER)))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("OWNER_PROVISIONING_UNAVAILABLE"));

        given(directory.usernameExists(anyString())).willThrow(new UserDirectoryUnavailableException("down", null));
        mvc.perform(as(ADMIN, json(post("/api/v1/admin/owners"), NEW_OWNER)))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("OWNER_PROVISIONING_UNAVAILABLE"));
    }
}
