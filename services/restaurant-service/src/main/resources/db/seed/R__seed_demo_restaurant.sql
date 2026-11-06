-- Demo seed (dev profile only): exactly one active restaurant and its menu (DEC-003).
-- Deterministic identifiers keep tests and demos repeatable. Re-applied by Flyway when this file changes.

INSERT INTO restaurant (id, name, active)
VALUES ('00000000-0000-0000-0000-000000000001', 'FoodieHub Demo Kitchen', TRUE) AS new
ON DUPLICATE KEY UPDATE name = new.name, active = new.active;

INSERT INTO menu_item (id, restaurant_id, name, price, available) VALUES
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Masala Dosa',          129.50, TRUE),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Paneer Butter Masala', 249.00, TRUE),
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Veg Biryani',          199.00, TRUE),
    ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'Gulab Jamun (2 pcs)',   79.00, FALSE)
    AS new
ON DUPLICATE KEY UPDATE restaurant_id = new.restaurant_id, name = new.name,
                        price = new.price, available = new.available;
