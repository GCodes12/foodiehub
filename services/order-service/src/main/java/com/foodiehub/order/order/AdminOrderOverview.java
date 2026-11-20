package com.foodiehub.order.order;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only platform overview for administrators (DEC-017): orders across all restaurants and basic statistics.
 * "Today" is the calendar day in India (Asia/Kolkata), where every restaurant trades in INR. Nothing here changes data.
 */
@Service
public class AdminOrderOverview {

    public static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    public record RestaurantActivity(String restaurantId, long orders, long ordersToday, Instant lastOrderAt) {
    }

    public record Summary(long totalOrders, long ordersToday, BigDecimal totalValue, BigDecimal valueToday,
            Map<OrderStatus, Long> byStatus, List<RestaurantActivity> restaurants, Instant todayStartsAt, String timeZone) {
    }

    private final CustomerOrderRepository orders;
    private final Clock clock;

    @Autowired
    public AdminOrderOverview(CustomerOrderRepository orders) {
        this(orders, Clock.systemUTC());
    }

    AdminOrderOverview(CustomerOrderRepository orders, Clock clock) {
        this.orders = orders;
        this.clock = clock;
    }

    /** Newest first. The mapper runs inside the transaction, so order lines can be read. */
    @Transactional(readOnly = true)
    public <T> Page<T> search(String restaurantId, OrderStatus status, int page, int size, Function<CustomerOrder, T> mapper) {
        Sort newestFirst = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        return orders.searchAll(restaurantId, status, PageRequest.of(page, size, newestFirst)).map(mapper);
    }

    @Transactional(readOnly = true)
    public Summary summary() {
        Instant todayStart = LocalDate.now(clock.withZone(BUSINESS_ZONE)).atStartOfDay(BUSINESS_ZONE).toInstant();

        Map<OrderStatus, Long> byStatus = new EnumMap<>(OrderStatus.class);
        for (OrderStatus s : OrderStatus.values()) {
            byStatus.put(s, 0L);
        }
        long total = 0;
        for (Object[] row : orders.countByStatus()) {
            long n = ((Number) row[1]).longValue();
            byStatus.put((OrderStatus) row[0], n);
            total += n;
        }

        Object[] value = orders.orderValue(todayStart).getFirst();
        List<RestaurantActivity> activity = orders.activityByRestaurant(todayStart).stream()
                .map(r -> new RestaurantActivity((String) r[0], ((Number) r[1]).longValue(), ((Number) r[2]).longValue(),
                        (Instant) r[3]))
                .toList();

        return new Summary(total, orders.countByCreatedAtGreaterThanEqual(todayStart), money(value[0]), money(value[1]),
                byStatus, activity, todayStart, BUSINESS_ZONE.getId());
    }

    private static BigDecimal money(Object value) {
        BigDecimal amount = value instanceof BigDecimal b ? b : new BigDecimal(String.valueOf(value));
        return amount.setScale(2);
    }
}
