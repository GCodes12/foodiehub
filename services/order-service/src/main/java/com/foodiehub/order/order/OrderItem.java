package com.foodiehub.order.order;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** One order line with purchase-time snapshots of the item name and unit price. */
@Entity
@Table(name = "order_item")
public class OrderItem {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private CustomerOrder order;

    @Column(name = "line_no", nullable = false)
    private int lineNo;

    /** External reference to a Restaurant Service menu item; not a foreign key. */
    @Column(name = "menu_item_id", nullable = false, length = 36)
    private String menuItemId;

    @Column(name = "item_name", nullable = false, length = 200)
    private String itemName;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "line_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal lineAmount;

    protected OrderItem() {
        // for JPA
    }

    OrderItem(String id, CustomerOrder order, int lineNo, String menuItemId, String itemName, BigDecimal unitPrice,
            int quantity, BigDecimal lineAmount) {
        this.id = id;
        this.order = order;
        this.lineNo = lineNo;
        this.menuItemId = menuItemId;
        this.itemName = itemName;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
        this.lineAmount = lineAmount;
    }

    public int getLineNo() { return lineNo; }
    public String getMenuItemId() { return menuItemId; }
    public String getItemName() { return itemName; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public int getQuantity() { return quantity; }
    public BigDecimal getLineAmount() { return lineAmount; }
}
