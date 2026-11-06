-- Test-only data: an inactive restaurant with a menu item, used to verify non-disclosure (DEC-010, SEC-008).
-- Not part of the demo seed.

INSERT INTO restaurant (id, name, active)
VALUES ('00000000-0000-0000-0000-0000000000ff', 'Closed Test Restaurant', FALSE) AS new
ON DUPLICATE KEY UPDATE name = new.name, active = new.active;

INSERT INTO menu_item (id, restaurant_id, name, price, available)
VALUES ('00000000-0000-0000-0001-0000000000ff', '00000000-0000-0000-0000-0000000000ff', 'Hidden Item', 10.00, TRUE) AS new
ON DUPLICATE KEY UPDATE name = new.name;
