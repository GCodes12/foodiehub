-- Restaurant Service schema (owned by restaurant-service only; no cross-database references).

CREATE TABLE restaurant (
    id     VARCHAR(36)  NOT NULL,
    name   VARCHAR(200) NOT NULL,
    active BOOLEAN      NOT NULL,
    CONSTRAINT pk_restaurant PRIMARY KEY (id)
);

CREATE TABLE menu_item (
    id            VARCHAR(36)   NOT NULL,
    restaurant_id VARCHAR(36)   NOT NULL,
    name          VARCHAR(200)  NOT NULL,
    -- INR, exact decimal; final representation per DEC-012 (max 99,999,999.99).
    price         DECIMAL(10,2) NOT NULL,
    available     BOOLEAN       NOT NULL,
    CONSTRAINT pk_menu_item PRIMARY KEY (id),
    CONSTRAINT fk_menu_item_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurant (id),
    CONSTRAINT ck_menu_item_price_non_negative CHECK (price >= 0)
);

CREATE INDEX ix_menu_item_restaurant ON menu_item (restaurant_id);
