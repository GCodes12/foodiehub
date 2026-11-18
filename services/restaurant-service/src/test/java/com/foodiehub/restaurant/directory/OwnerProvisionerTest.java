package com.foodiehub.restaurant.directory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withCreatedEntity;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withNoContent;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.net.URI;
import java.time.Clock;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/** Owner account creation (DEC-018) against a simulated Keycloak Admin API. */
class OwnerProvisionerTest {

    private static final String KC = "http://kc.test";
    private static final String USERS = KC + "/admin/realms/foodiehub/users";
    private static final OwnerProvisioningProperties PROPS =
            new OwnerProvisioningProperties("foodiehub-owner-provisioner", "provisioner-secret-0123456789", "restaurant-owners");
    private static final OwnerProvisioner.NewOwner ASHA =
            new OwnerProvisioner.NewOwner("Asha Rao Iyer", "asha@example.com", "asha.rao", "Kitchen-Start-42");
    private static final DirectoryUser CONFIRMED = new DirectoryUser("new-id", "asha.rao", "Asha Rao Iyer", "asha@example.com", true, true);

    private MockRestServiceServer keycloak;
    private UserDirectory directory;
    private OwnerProvisioner provisioner;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(KC);
        keycloak = MockRestServiceServer.bindTo(builder).build();
        directory = mock(UserDirectory.class);
        provisioner = new OwnerProvisioner(builder.build(), "foodiehub", PROPS, directory, Clock.systemUTC());
    }

    private void expectToken() {
        keycloak.expect(requestTo(KC + "/realms/foodiehub/protocol/openid-connect/token")).andExpect(method(HttpMethod.POST))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("client_id=foodiehub-owner-provisioner")))
                .andRespond(withSuccess("{\"access_token\":\"prov-token\",\"expires_in\":300}", MediaType.APPLICATION_JSON));
    }

    @Test
    void createsAnEnabledAccountInTheOwnersGroupWithATemporaryPasswordAndNoRoles() {
        expectToken();
        keycloak.expect(requestTo(USERS)).andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer prov-token"))
                .andExpect(jsonPath("$.username").value("asha.rao"))
                .andExpect(jsonPath("$.email").value("asha@example.com"))
                .andExpect(jsonPath("$.firstName").value("Asha Rao"))
                .andExpect(jsonPath("$.lastName").value("Iyer"))
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.groups[0]").value("/restaurant-owners"))
                .andExpect(jsonPath("$.credentials[0].temporary").value(true))
                .andExpect(jsonPath("$.credentials[0].value").value("Kitchen-Start-42"))
                .andExpect(jsonPath("$.realmRoles").doesNotExist())
                .andExpect(jsonPath("$.clientRoles").doesNotExist())
                .andExpect(jsonPath("$.requiredActions").doesNotExist())
                .andRespond(withCreatedEntity(URI.create(USERS + "/new-id")));
        given(directory.findEnabledOwner("new-id")).willReturn(Optional.of(CONFIRMED));

        assertThat(provisioner.create(ASHA)).isEqualTo(CONFIRMED);
        keycloak.verify();
    }

    @Test
    void keycloakDuplicatesBecomeFieldSpecificConflicts() {
        expectToken();
        keycloak.expect(requestTo(USERS)).andRespond(withStatus(HttpStatus.CONFLICT).contentType(MediaType.APPLICATION_JSON)
                .body("{\"errorMessage\":\"User exists with same username\"}"));
        keycloak.expect(requestTo(USERS)).andRespond(withStatus(HttpStatus.CONFLICT).contentType(MediaType.APPLICATION_JSON)
                .body("{\"errorMessage\":\"User exists with same email\"}"));

        assertThatThrownBy(() -> provisioner.create(ASHA)).isInstanceOf(OwnerProvisioner.DuplicateAccountException.class)
                .extracting("field").isEqualTo("username");
        assertThatThrownBy(() -> provisioner.create(ASHA)).isInstanceOf(OwnerProvisioner.DuplicateAccountException.class)
                .extracting("field").isEqualTo("email");
        verify(directory, never()).findEnabledOwner(anyString());
    }

    @Test
    void aRefusalOrServerErrorMeansUnavailableAndNothingIsConfirmed() {
        expectToken();
        keycloak.expect(requestTo(USERS)).andRespond(withStatus(HttpStatus.FORBIDDEN));
        keycloak.expect(requestTo(USERS)).andRespond(withServerError());
        assertThatThrownBy(() -> provisioner.create(ASHA)).isInstanceOf(UserDirectoryUnavailableException.class);
        assertThatThrownBy(() -> provisioner.create(ASHA)).isInstanceOf(UserDirectoryUnavailableException.class);
        verify(directory, never()).findEnabledOwner(anyString());
    }

    @Test
    void anAccountThatCannotBeConfirmedAsOwnerIsDeletedAgain() {
        expectToken();
        keycloak.expect(requestTo(USERS)).andRespond(withCreatedEntity(URI.create(USERS + "/new-id")));
        keycloak.expect(requestTo(USERS + "/new-id")).andExpect(method(HttpMethod.DELETE)).andRespond(withNoContent());
        given(directory.findEnabledOwner("new-id")).willReturn(Optional.empty());

        assertThatThrownBy(() -> provisioner.create(ASHA)).isInstanceOf(UserDirectoryUnavailableException.class)
                .hasMessageContaining("could not be confirmed");
        keycloak.verify(); // the DELETE happened
    }

    @Test
    void anUnreachableDirectoryDuringConfirmationAlsoRollsBack() {
        expectToken();
        keycloak.expect(requestTo(USERS)).andRespond(withCreatedEntity(URI.create(USERS + "/new-id")));
        keycloak.expect(requestTo(USERS + "/new-id")).andExpect(method(HttpMethod.DELETE)).andRespond(withNoContent());
        given(directory.findEnabledOwner("new-id")).willThrow(new UserDirectoryUnavailableException("down", null));

        assertThatThrownBy(() -> provisioner.create(ASHA)).isInstanceOf(UserDirectoryUnavailableException.class);
        keycloak.verify();
    }

    @Test
    void withoutASecretNothingIsSent() {
        OwnerProvisioner unconfigured = new OwnerProvisioner(RestClient.builder().baseUrl(KC).build(), "foodiehub",
                new OwnerProvisioningProperties("foodiehub-owner-provisioner", "", "restaurant-owners"), directory, Clock.systemUTC());
        assertThat(unconfigured.configured()).isFalse();
        assertThatThrownBy(() -> unconfigured.create(ASHA)).isInstanceOf(UserDirectoryUnavailableException.class)
                .hasMessageContaining("not configured");
    }

    @Test
    void splitsTheFullNameAndNeverPrintsThePassword() {
        assertThat(OwnerProvisioner.splitName("  Asha   Rao  Iyer ")).containsExactly("Asha Rao", "Iyer");
        assertThat(OwnerProvisioner.splitName("Madonna")).containsExactly("Madonna", "");
        assertThat(ASHA.toString()).doesNotContain("Kitchen-Start-42");
    }
}
