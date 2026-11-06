package com.foodiehub.order.order;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;

/**
 * SHA-256 of the canonical, price-free content of a checkout request. A retry with the same Idempotency-Key must
 * carry the same fingerprint; anything else is a key reuse for a different request.
 */
public final class RequestFingerprint {

    private RequestFingerprint() {
    }

    public static String of(String restaurantId, FulfilmentType fulfilmentType, List<OrderPricing.RequestedLine> lines) {
        String canonical = "v1|" + restaurantId + "|" + fulfilmentType + "|" + lines.stream()
                .map(l -> l.menuItemId() + ":" + l.quantity())
                .collect(Collectors.joining(","));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
