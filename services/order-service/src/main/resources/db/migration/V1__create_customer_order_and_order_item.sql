-- Order Service schema (owned by order-service only).
-- restaurant_id and menu_item_id are EXTERNAL references to Restaurant Service data: deliberately no foreign keys
-- to another service's database (data-model.md §2, §6.3).

CREATE TABLE customer_order (
    id              VARCHAR(36)   NOT NULL,
    -- Stable identity-provider subject (JWT "sub"); never a display name or e-mail address.
    customer_id     VARCHAR(255)  NOT NULL,
    restaurant_id   VARCHAR(36)   NOT NULL,
    fulfilment_type VARCHAR(20)   NOT NULL,
    status          VARCHAR(30)   NOT NULL,
    currency        VARCHAR(3)    NOT NULL,
    -- Order amounts: DECIMAL(10,2), INR (DEC-013).
    subtotal        DECIMAL(10,2) NOT NULL,
    total           DECIMAL(10,2) NOT NULL,
    -- Idempotent creation (DEC-006): one order per (customer, key); request_hash detects key reuse with another payload.
    idempotency_key VARCHAR(64)   NOT NULL,
    request_hash    CHAR(64)      NOT NULL,
    created_at      DATETIME(6)   NOT NULL,
    CONSTRAINT pk_customer_order PRIMARY KEY (id),
    CONSTRAINT uq_customer_order_idempotency UNIQUE (customer_id, idempotency_key),
    CONSTRAINT ck_customer_order_amounts CHECK (subtotal >= 0 AND total >= 0)
);

CREATE INDEX ix_customer_order_customer ON customer_order (customer_id);

CREATE TABLE order_item (
    id           VARCHAR(36)   NOT NULL,
    order_id     VARCHAR(36)   NOT NULL,
    line_no      INT           NOT NULL,
    menu_item_id VARCHAR(36)   NOT NULL,
    -- Purchase-time snapshots: retrieval never depends on the current menu.
    item_name    VARCHAR(200)  NOT NULL,
    unit_price   DECIMAL(10,2) NOT NULL,
    quantity     INT           NOT NULL,
    line_amount  DECIMAL(10,2) NOT NULL,
    CONSTRAINT pk_order_item PRIMARY KEY (id),
    CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES customer_order (id),
    CONSTRAINT uq_order_item_line UNIQUE (order_id, line_no),
    -- Technical bound (DEC-013, Q-30): quantity 1–50 per line.
    CONSTRAINT ck_order_item_quantity CHECK (quantity BETWEEN 1 AND 50),
    CONSTRAINT ck_order_item_amounts CHECK (unit_price >= 0 AND line_amount >= 0)
);
