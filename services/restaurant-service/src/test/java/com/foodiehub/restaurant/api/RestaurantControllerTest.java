package com.foodiehub.restaurant.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import com.foodiehub.restaurant.config.SecurityConfig;
import com.foodiehub.restaurant.domain.MenuItem;
import com.foodiehub.restaurant.domain.Restaurant;
import com.foodiehub.restaurant.domain.RestaurantCatalog;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Public browsing: no token needed (DEC-009), even though the service now validates tokens for owner endpoints. */
@WebMvcTest(RestaurantController.class)
@Import(SecurityConfig.class)
class RestaurantControllerTest {

    private static final String RID = "00000000-0000-0000-0000-000000000001";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private RestaurantCatalog catalog;

    @Test
    void listExposesIdAndNameButNeverTheActiveFlag() throws Exception {
        given(catalog.listActiveRestaurants()).willReturn(List.of(new Restaurant(RID, "Demo", true)));

        mvc.perform(get("/api/v1/restaurants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(RID))
                .andExpect(jsonPath("$[0].name").value("Demo"))
                .andExpect(jsonPath("$[0].active").doesNotExist());
    }

    @Test
    void detailOfActiveRestaurantHasNoActiveFlag() throws Exception {
        given(catalog.findActiveRestaurant(RID)).willReturn(Optional.of(new Restaurant(RID, "Demo", true)));

        mvc.perform(get("/api/v1/restaurants/{id}", RID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Demo"))
                .andExpect(jsonPath("$.active").doesNotExist());
    }

    @Test
    void menuKeepsExactTwoDecimalPricesAndShowsUnavailableItems() throws Exception {
        given(catalog.findMenuOfActiveRestaurant(RID)).willReturn(Optional.of(List.of(
                new MenuItem("m1", RID, "Masala Dosa", new BigDecimal("129.50"), true),
                new MenuItem("m2", RID, "Gulab Jamun", new BigDecimal("79.00"), false))));

        String body = mvc.perform(get("/api/v1/restaurants/{id}/menu", RID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.restaurantId").value(RID))
                .andExpect(jsonPath("$.currency").value("INR"))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[1].available").value(false))
                .andReturn().getResponse().getContentAsString();

        // Exact decimal text, not a binary floating-point rendering (DEC-007, DEC-012).
        assertThat(body).contains("\"price\":129.50").contains("\"price\":79.00");
    }

    @Test
    void menuItemsCarryTheirDetails() throws Exception {
        given(catalog.findMenuOfActiveRestaurant(RID)).willReturn(Optional.of(List.of(
                new MenuItem("m1", RID, "Classic Chicken Dum Biryani", new BigDecimal("299.00"), true)
                        .withDetails("CHICKEN_BIRYANI", "Slow-cooked in a handi.", "NON_VEG", true, false,
                                "classic-chicken-dum-biryani", 90),
                new MenuItem("m2", RID, "Plain Item", new BigDecimal("10.00"), true))));

        mvc.perform(get("/api/v1/restaurants/{id}/menu", RID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].category").value("CHICKEN_BIRYANI"))
                .andExpect(jsonPath("$.items[0].description").value("Slow-cooked in a handi."))
                .andExpect(jsonPath("$.items[0].diet").value("NON_VEG"))
                .andExpect(jsonPath("$.items[0].bestseller").value(true))
                .andExpect(jsonPath("$.items[0].chefSpecial").value(false))
                .andExpect(jsonPath("$.items[0].imageKey").value("classic-chicken-dum-biryani"))
                // An item without details keeps working: defaults, and nulls for what is not specified.
                .andExpect(jsonPath("$.items[1].category").value("OTHER"))
                .andExpect(jsonPath("$.items[1].diet").doesNotExist())
                .andExpect(jsonPath("$.items[1].imageKey").doesNotExist())
                .andExpect(jsonPath("$.items[1].sortOrder").doesNotExist());
    }

    @Test
    void notFoundIsProblemDetailWithFixedBodyForDetailAndMenu() throws Exception {
        given(catalog.findActiveRestaurant(anyString())).willReturn(Optional.empty());
        given(catalog.findMenuOfActiveRestaurant(anyString())).willReturn(Optional.empty());

        for (String path : List.of("/api/v1/restaurants/x", "/api/v1/restaurants/x/menu")) {
            mvc.perform(get(path))
                    .andExpect(status().isNotFound())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.title").value("Not Found"))
                    .andExpect(jsonPath("$.detail").value("Restaurant not found."))
                    .andExpect(jsonPath("$.code").value("RESTAURANT_NOT_FOUND"));
        }
    }
}
