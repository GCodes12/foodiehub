package com.foodiehub.order.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** A submitted pickup order. Created only through {@link #create}; persisted together with its lines. */
@Entity
@Table(name = "customer_order")
public class CustomerOrder {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "customer_id", nullable = false)
    private String customerId;

    /** External reference to a Restaurant Service restaurant; not a foreign key. */
    @Column(name = "restaurant_id", nullable = false, length = 36)
    private String restaurantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "fulfilment_type", nullable = false, length = 20)
    private FulfilmentType fulfilmentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "idempotency_key", nullable = false, length = 64)
    private String idempotencyKey;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /** Optimistic locking (DEC-016): two simultaneous status changes cannot both win. */
    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "status_updated_at")
    private Instant statusUpdatedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "reject_reason", length = 30)
    private RejectReason rejectReason;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("lineNo ASC")
    private List<OrderItem> items = new ArrayList<>();

    protected CustomerOrder() {
        // for JPA
    }

    static CustomerOrder create(String customerId, String restaurantId, FulfilmentType fulfilmentType,
            OrderPricing.PricedOrder priced, String idempotencyKey, String requestHash, Instant now) {
        CustomerOrder order = new CustomerOrder();
        order.id = UUID.randomUUID().toString();
        order.customerId = customerId;
        order.restaurantId = restaurantId;
        order.fulfilmentType = fulfilmentType;
        order.status = OrderStatus.PENDING_PAYMENT;
        order.currency = "INR";
        order.subtotal = priced.subtotal();
        order.total = priced.total();
        order.idempotencyKey = idempotencyKey;
        order.requestHash = requestHash;
        order.createdAt = now;
        int lineNo = 1;
        for (OrderPricing.PricedLine line : priced.lines()) {
            order.items.add(new OrderItem(UUID.randomUUID().toString(), order, lineNo++, line.menuItemId(),
                    line.name(), line.unitPrice(), line.quantity(), line.lineAmount()));
        }
        return order;
    }

    /**
     * Moves the order to {@code target} (DEC-016). The caller checks ownership; this checks the transition itself.
     * A reason is only allowed when rejecting.
     */
    OrderStatusChange moveTo(OrderStatus target, RejectReason reason, String changedBy, Instant now) {
        if (!status.canMoveTo(target)) {
            throw new IllegalOrderTransitionException(status, target);
        }
        if (reason != null && target != OrderStatus.REJECTED) {
            throw new IllegalOrderTransitionException(status, target);
        }
        OrderStatusChange change = new OrderStatusChange(id, status, target, changedBy, now, reason);
        status = target;
        statusUpdatedAt = now;
        rejectReason = target == OrderStatus.REJECTED ? reason : null;
        return change;
    }

    public String getId() { return id; }
    public String getCustomerId() { return customerId; }
    public String getRestaurantId() { return restaurantId; }
    public FulfilmentType getFulfilmentType() { return fulfilmentType; }
    public OrderStatus getStatus() { return status; }
    public String getCurrency() { return currency; }
    public BigDecimal getSubtotal() { return subtotal; }
    public BigDecimal getTotal() { return total; }
    public String getRequestHash() { return requestHash; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getStatusUpdatedAt() { return statusUpdatedAt; }
    public RejectReason getRejectReason() { return rejectReason; }
    public long getVersion() { return version; }
    public List<OrderItem> getItems() { return items; }
}
