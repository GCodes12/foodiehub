-- DEC-016: order lifecycle. Additive: existing orders keep their status (PENDING_PAYMENT) and get version 0.
ALTER TABLE customer_order
    ADD COLUMN version           BIGINT      NOT NULL DEFAULT 0,
    ADD COLUMN status_updated_at DATETIME(6) NULL,
    ADD COLUMN reject_reason     VARCHAR(30) NULL,
    ADD CONSTRAINT ck_customer_order_status CHECK (status IN
        ('PENDING_PAYMENT', 'ACCEPTED', 'REJECTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP')),
    ADD CONSTRAINT ck_customer_order_reject_reason CHECK (reject_reason IS NULL OR reject_reason IN ('SOLD_OUT', 'TOO_BUSY', 'CLOSING'));

-- Owner view: orders of a restaurant, newest first.
CREATE INDEX ix_customer_order_restaurant_created ON customer_order (restaurant_id, created_at);

-- Every status change: who, when, from, to (and the reason for a rejection).
CREATE TABLE order_status_change (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    order_id    VARCHAR(36)  NOT NULL,
    from_status VARCHAR(30)  NOT NULL,
    to_status   VARCHAR(30)  NOT NULL,
    -- Keycloak username of the owner who made the change.
    changed_by  VARCHAR(255) NOT NULL,
    changed_at  DATETIME(6)  NOT NULL,
    reason      VARCHAR(30)  NULL,
    CONSTRAINT pk_order_status_change PRIMARY KEY (id),
    CONSTRAINT fk_order_status_change_order FOREIGN KEY (order_id) REFERENCES customer_order (id)
);

CREATE INDEX ix_order_status_change_order ON order_status_change (order_id, changed_at);
