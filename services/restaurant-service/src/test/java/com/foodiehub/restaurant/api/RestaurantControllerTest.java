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

import com.foodiehub.restaurant.domain.MenuItem;
import com.foodiehub.restaurant.domain.Restaurant;
import com.foodiehub.restaurant.domain.RestaurantCatalog;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(RestaurantController.class)
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
    void notFoundIsProblemDetailWithFixedBodyForDetailAndMenu() throws Exception {
        given(catalog.findActiveRestaurant(anyString())).willReturn(Optional.empty());
        given(catalog.findMenuOfActiveRestaurant(anyString())).willReturn(Optional.empty());

        for (String path : List.of("/api/v1/restaurants/x", "/api/v1/restaurants/x/menu")) {
            mvc.perform(get(path))
                    .andExpect(status().isNotFound())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.title").value("Not Found"))
                    .andExpect(jsonPath("$.detail").value("Restaurant not found."));
        }
    }
}
