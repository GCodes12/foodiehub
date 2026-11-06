package com.foodiehub.restaurant.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** RFC 9457 Problem Details (D7: recorded, not individually verified). */
@RestControllerAdvice
class ApiExceptionHandler {

    /**
     * One fixed body for every "restaurant not found" case, so an inactive restaurant is indistinguishable
     * from a nonexistent one (DEC-010, SEC-008). Never add detail that depends on why the lookup failed.
     */
    @ExceptionHandler(RestaurantNotFoundException.class)
    ProblemDetail restaurantNotFound() {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Restaurant not found.");
        problem.setTitle("Not Found");
        return problem;
    }
}
