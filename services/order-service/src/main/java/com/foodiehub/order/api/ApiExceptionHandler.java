package com.foodiehub.order.api;

import java.util.List;
import java.util.Map;

import com.foodiehub.order.order.CheckoutRejectedException;
import com.foodiehub.order.order.IdempotencyConflictException;
import com.foodiehub.order.restaurant.OwnedRestaurantsClient;
import com.foodiehub.order.restaurant.RestaurantNotOrderableException;
import com.foodiehub.order.restaurant.RestaurantServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * RFC 9457 Problem Details for every error (D7: recorded, not individually verified). Each response carries a
 * stable {@code code}; its title and detail come from messages.properties ({@code problem.<CODE>.title/detail}).
 */
@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    private final MessageSource messages;

    ApiExceptionHandler(MessageSource messages) {
        this.messages = messages;
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED");
        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> Map.of("field", e.getField(), "message", String.valueOf(e.getDefaultMessage())))
                .toList();
        problem.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(problem);
    }

    /** Unreadable JSON, a fractional or quoted quantity, an unknown fulfilment type. */
    @Override
    protected @Nullable ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return ResponseEntity.badRequest().body(problem(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST"));
    }

    @ExceptionHandler(InvalidIdempotencyKeyException.class)
    ProblemDetail invalidKey() {
        return problem(HttpStatus.BAD_REQUEST, "INVALID_IDEMPOTENCY_KEY");
    }

    @ExceptionHandler(CheckoutRejectedException.class)
    ProblemDetail rejected(CheckoutRejectedException e) {
        return problem(HttpStatus.UNPROCESSABLE_CONTENT, e.getCode());
    }

    @ExceptionHandler(RestaurantNotOrderableException.class)
    ProblemDetail restaurantNotOrderable() {
        return problem(HttpStatus.UNPROCESSABLE_CONTENT, "RESTAURANT_NOT_AVAILABLE");
    }

    @ExceptionHandler(IdempotencyConflictException.class)
    ProblemDetail conflict() {
        return problem(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED");
    }

    @ExceptionHandler(RestaurantServiceUnavailableException.class)
    ProblemDetail restaurantDown(RestaurantServiceUnavailableException e) {
        log.warn("Restaurant Service unavailable: {}", e.getMessage());
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "PRICING_UNAVAILABLE");
    }

    @ExceptionHandler(OwnedRestaurantsClient.OwnershipUnavailableException.class)
    ProblemDetail ownershipUnavailable(OwnedRestaurantsClient.OwnershipUnavailableException e) {
        log.warn("Restaurant Service could not report owned restaurants: {}", String.valueOf(e.getCause()));
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "OWNER_DATA_UNAVAILABLE");
    }

    /** Storage failed: the transaction was rolled back, so no order exists. SQL details are logged, never returned. */
    @ExceptionHandler(DataAccessException.class)
    ProblemDetail storageFailed(DataAccessException e) {
        log.error("Order could not be stored", e);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_FAILED");
    }

    /** Fixed body for every "not found", so another customer's order is indistinguishable from a missing one. */
    @ExceptionHandler(OrderNotFoundException.class)
    ProblemDetail notFound() {
        return problem(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND");
    }

    private ProblemDetail problem(HttpStatus status, String code) {
        ProblemDetail problem = ProblemDetail.forStatus(status);
        problem.setTitle(text("problem." + code + ".title", status.getReasonPhrase()));
        problem.setDetail(text("problem." + code + ".detail", null));
        problem.setProperty("code", code);
        return problem;
    }

    private @Nullable String text(String key, @Nullable String fallback) {
        return messages.getMessage(key, null, fallback, LocaleContextHolder.getLocale());
    }
}
