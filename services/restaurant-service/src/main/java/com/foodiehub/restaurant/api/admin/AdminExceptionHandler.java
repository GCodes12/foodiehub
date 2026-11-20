package com.foodiehub.restaurant.api.admin;

import com.foodiehub.restaurant.directory.UserDirectoryUnavailableException;
import com.foodiehub.restaurant.domain.RestaurantChangedException;
import com.foodiehub.restaurant.domain.RestaurantHasNoMenuException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * RFC 9457 Problem Details for the administrator endpoints (DEC-017), in the same shape as ApiExceptionHandler: a
 * stable {@code code}, with title and detail from messages.properties. Request-shape errors (validation, unreadable
 * JSON) are still handled by ApiExceptionHandler.
 */
@RestControllerAdvice(assignableTypes = AdminController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
class AdminExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(AdminExceptionHandler.class);

    private final MessageSource messages;

    AdminExceptionHandler(MessageSource messages) {
        this.messages = messages;
    }

    @ExceptionHandler(AdminController.AdminRestaurantNotFoundException.class)
    ProblemDetail notFound() {
        return problem(HttpStatus.NOT_FOUND, "RESTAURANT_NOT_FOUND");
    }

    @ExceptionHandler(AdminController.InvalidOwnerException.class)
    ProblemDetail invalidOwner() {
        return problem(HttpStatus.UNPROCESSABLE_CONTENT, "INVALID_OWNER");
    }

    @ExceptionHandler(AdminController.NothingToChangeException.class)
    ProblemDetail nothingToChange() {
        return problem(HttpStatus.BAD_REQUEST, "NOTHING_TO_UPDATE");
    }

    @ExceptionHandler(RestaurantHasNoMenuException.class)
    ProblemDetail noMenu() {
        return problem(HttpStatus.CONFLICT, "RESTAURANT_HAS_NO_MENU");
    }

    @ExceptionHandler({RestaurantChangedException.class, ObjectOptimisticLockingFailureException.class})
    ProblemDetail changed() {
        return problem(HttpStatus.CONFLICT, "RESTAURANT_CHANGED");
    }

    @ExceptionHandler(com.foodiehub.restaurant.directory.OwnerProvisioner.DuplicateAccountException.class)
    ProblemDetail duplicateAccount(com.foodiehub.restaurant.directory.OwnerProvisioner.DuplicateAccountException e) {
        return problem(HttpStatus.CONFLICT, "email".equals(e.field()) ? "OWNER_EMAIL_TAKEN" : "OWNER_USERNAME_TAKEN");
    }

    @ExceptionHandler(AdminController.OwnerProvisioningUnavailableException.class)
    ProblemDetail provisioningUnavailable(AdminController.OwnerProvisioningUnavailableException e) {
        log.warn("Owner provisioning unavailable: {}", e.getCause() == null ? "not configured" : e.getCause().getMessage());
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "OWNER_PROVISIONING_UNAVAILABLE");
    }

    /** Same shape as Bean Validation errors: code VALIDATION_FAILED with a field error. */
    @ExceptionHandler(AdminController.FieldRejectedException.class)
    ProblemDetail fieldRejected(AdminController.FieldRejectedException e) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED");
        problem.setProperty("errors", java.util.List.of(java.util.Map.of("field", e.field,
                "message", messages.getMessage(e.messageKey, null, e.messageKey, LocaleContextHolder.getLocale()))));
        return problem;
    }

    @ExceptionHandler(UserDirectoryUnavailableException.class)
    ProblemDetail directoryUnavailable(UserDirectoryUnavailableException e) {
        log.warn("User directory unavailable: {}", e.getMessage());
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "USER_DIRECTORY_UNAVAILABLE");
    }

    private ProblemDetail problem(HttpStatus status, String code) {
        ProblemDetail problem = ProblemDetail.forStatus(status);
        problem.setTitle(messages.getMessage("problem." + code + ".title", null, status.getReasonPhrase(),
                LocaleContextHolder.getLocale()));
        problem.setDetail(messages.getMessage("problem." + code + ".detail", null, null, LocaleContextHolder.getLocale()));
        problem.setProperty("code", code);
        return problem;
    }
}
