package com.foodiehub.order.order;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

class RequestFingerprintTest {

    private static final List<OrderPricing.RequestedLine> LINES =
            List.of(new OrderPricing.RequestedLine("a", 1), new OrderPricing.RequestedLine("b", 2));

    @Test
    void isStableForTheSameRequest() {
        assertThat(RequestFingerprint.of("r1", FulfilmentType.PICKUP, LINES))
                .isEqualTo(RequestFingerprint.of("r1", FulfilmentType.PICKUP, List.copyOf(LINES)))
                .hasSize(64);
    }

    @Test
    void changesWhenAnythingInTheRequestChanges() {
        String base = RequestFingerprint.of("r1", FulfilmentType.PICKUP, LINES);
        assertThat(RequestFingerprint.of("r2", FulfilmentType.PICKUP, LINES)).isNotEqualTo(base);
        assertThat(RequestFingerprint.of("r1", FulfilmentType.PICKUP,
                List.of(new OrderPricing.RequestedLine("a", 1), new OrderPricing.RequestedLine("b", 3)))).isNotEqualTo(base);
        assertThat(RequestFingerprint.of("r1", FulfilmentType.PICKUP, LINES.reversed())).isNotEqualTo(base);
    }
}
