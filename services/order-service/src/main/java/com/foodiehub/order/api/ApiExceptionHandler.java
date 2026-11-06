package com.foodiehub.order.api;

import java.util.List;
import java.util.Map;

import com.foodiehub.order.order.CheckoutRejectedException;
import com.foodiehub.order.order.IdempotencyConflictException;
import com.foodiehub.order.restaurant.RestaurantNotOrderableException;
import com.foodiehub.order.restaurant.RestaurantServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** RFC 9457 Problem Details for every error (D7: recorded, not individually verified). */
@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @Override
    protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "Invalid order request",
                "The order request is invalid.", "VALIDATION_FAILED");
        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> Map.of("field", e.getField(), "message", String.valueOf(e.getDefaultMessage())))
                .toList();
        problem.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(InvalidIdempotencyKeyException.class)
    ProblemDetail invalidKey(InvalidIdempotencyKeyException e) {
        return problem(HttpStatus.BAD_REQUEST, "Invalid Idempotency-Key", e.getMessage(), "INVALID_IDEMPOTENCY_KEY");
    }

    @ExceptionHandler(CheckoutRejectedException.class)
    ProblemDetail rejected(CheckoutRejectedException e) {
        return problem(HttpStatus.UNPROCESSABLE_CONTENT, "Order cannot be placed", e.getMessage(), e.getCode());
    }

    @ExceptionHandler(RestaurantNotOrderableException.class)
    ProblemDetail restaurantNotOrderable(RestaurantNotOrderableException e) {
        return problem(HttpStatus.UNPROCESSABLE_CONTENT, "Order cannot be placed", e.getMessage(),
                "RESTAURANT_NOT_AVAILABLE");
    }

    @ExceptionHandler(IdempotencyConflictException.class)
    ProblemDetail conflict(IdempotencyConflictException e) {
        return problem(HttpStatus.CONFLICT, "Idempotency-Key reused", e.getMessage(), "IDEMPOTENCY_KEY_REUSED");
    }

    @ExceptionHandler(RestaurantServiceUnavailableException.class)
    ProblemDetail restaurantDown(RestaurantServiceUnavailableException e) {
        log.warn("Restaurant Service unavailable: {}", e.getMessage());
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "Service unavailable",
                "Prices could not be confirmed right now. No order was created; please retry.", "PRICING_UNAVAILABLE");
    }

    /** Storage failed: the transaction was rolled back, so no order exists. SQL details are logged, never returned. */
    @ExceptionHandler(DataAccessException.class)
    ProblemDetail storageFailed(DataAccessException e) {
        log.error("Order could not be stored", e);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Order not stored",
                "The order could not be stored. No order was created; please retry.", "STORAGE_FAILED");
    }

    /** Fixed body for every "not found", so another customer's order is indistinguishable from a missing one. */
    @ExceptionHandler(OrderNotFoundException.class)
    ProblemDetail notFound() {
        return problem(HttpStatus.NOT_FOUND, "Not Found", "Order not found.", "ORDER_NOT_FOUND");
    }

    private static ProblemDetail problem(HttpStatus status, String title, String detail, String code) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setProperty("code", code);
        return problem;
    }
}
