package com.foodiehub.order.api;

import java.net.URI;
import java.util.List;
import java.util.regex.Pattern;

import com.foodiehub.order.order.OrderPricing;
import com.foodiehub.order.order.OrderService;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * POST /api/v1/orders — authenticated pickup checkout (CP-3).
 * GET  /api/v1/orders — the signed-in customer's own orders, newest first (DEC-014).
 * GET  /api/v1/orders/{id} — the orderer's own order only (CP-4).
 * The customer is always the token subject, never a value from the request (SEC-004).
 */
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    static final String IDEMPOTENCY_KEY = "Idempotency-Key";
    static final String REPLAYED = "Idempotent-Replayed";
    private static final Pattern KEY_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{8,64}$");

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = IDEMPOTENCY_KEY, required = false) String idempotencyKey,
            @Valid @RequestBody CreateOrderRequest request) {
        if (idempotencyKey == null || !KEY_PATTERN.matcher(idempotencyKey).matches()) {
            throw new InvalidIdempotencyKeyException();
        }
        OrderService.CreateResult result = orderService.create(new OrderService.CreateCommand(
                jwt.getSubject(), idempotencyKey, request.restaurantId(), request.fulfilmentType(),
                request.items().stream()
                        .map(line -> new OrderPricing.RequestedLine(line.menuItemId(), line.quantity()))
                        .toList()));
        OrderResponse body = OrderResponse.from(result.order());
        return ResponseEntity.created(URI.create("/api/v1/orders/" + body.id()))
                .header(REPLAYED, Boolean.toString(result.replayed()))
                .body(body);
    }

    /** The signed-in customer's own orders, newest first (DEC-014). An empty list when there are none. */
    @GetMapping
    public List<OrderResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return orderService.listOwnOrders(jwt.getSubject()).stream().map(OrderResponse::from).toList();
    }

    @GetMapping("/{id}")
    public OrderResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return orderService.findOwnOrder(id, jwt.getSubject())
                .map(OrderResponse::from)
                .orElseThrow(OrderNotFoundException::new);
    }
}
