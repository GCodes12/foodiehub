package com.foodiehub.restaurant.api;

import java.util.List;
import java.util.Map;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
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
 * RFC 9457 Problem Details (D7: recorded, not individually verified). Each response carries a stable {@code code};
 * its title and detail come from messages.properties ({@code problem.<CODE>.title/detail}).
 */
@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private final MessageSource messages;

    ApiExceptionHandler(MessageSource messages) {
        this.messages = messages;
    }

    /**
     * One fixed body for every "restaurant not found" case, so an inactive restaurant is indistinguishable
     * from a nonexistent one (DEC-010, SEC-008). Never add detail that depends on why the lookup failed.
     */
    @ExceptionHandler(RestaurantNotFoundException.class)
    ProblemDetail restaurantNotFound() {
        return problem(HttpStatus.NOT_FOUND, "RESTAURANT_NOT_FOUND");
    }

    @ExceptionHandler(OwnerController.MenuItemNotFoundException.class)
    ProblemDetail menuItemNotFound() {
        return problem(HttpStatus.NOT_FOUND, "MENU_ITEM_NOT_FOUND");
    }

    @ExceptionHandler(OwnerController.NothingToUpdateException.class)
    ProblemDetail nothingToUpdate() {
        return problem(HttpStatus.BAD_REQUEST, "NOTHING_TO_UPDATE");
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

    @Override
    protected @Nullable ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return ResponseEntity.badRequest().body(problem(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST"));
    }

    ProblemDetail problem(HttpStatus status, String code) {
        ProblemDetail problem = ProblemDetail.forStatus(status);
        problem.setTitle(messages.getMessage("problem." + code + ".title", null, status.getReasonPhrase(),
                LocaleContextHolder.getLocale()));
        problem.setDetail(messages.getMessage("problem." + code + ".detail", null, null, LocaleContextHolder.getLocale()));
        problem.setProperty("code", code);
        return problem;
    }
}
