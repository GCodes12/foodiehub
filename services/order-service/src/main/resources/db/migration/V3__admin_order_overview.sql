-- DEC-017: platform-wide order overview for administrators (recent orders, orders today). Additive only.
CREATE INDEX ix_customer_order_created ON customer_order (created_at);
