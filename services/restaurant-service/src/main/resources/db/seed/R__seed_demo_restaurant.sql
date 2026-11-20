-- Demo seed (dev profile only): exactly one active restaurant and its menu (DEC-003).
-- ZAYORA menu, prices and labels approved by the owner (DEC-014, 2026-11-06).
-- Deterministic identifiers keep tests and demos repeatable. Re-applied by Flyway when this file changes.
-- Upserts only (no DELETE): existing IDs are kept where the dish stays; ID ...0001 (formerly Masala Dosa) is reused.
-- Past orders are unaffected: they store their own copy of each dish's name and price.

INSERT INTO restaurant (id, name, active)
VALUES ('00000000-0000-0000-0000-000000000001', 'ZAYORA', TRUE) AS new
ON DUPLICATE KEY UPDATE name = new.name, active = new.active;

INSERT INTO menu_item (id, restaurant_id, name, price, available, category, description, diet, bestseller,
                       chef_special, image_key, sort_order) VALUES
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Classic Veg Dum Biryani', 229.00, TRUE, 'VEG_BIRYANI', 'Fragrant basmati and garden vegetables, slow-cooked dum style with whole spices.', 'VEG', TRUE, FALSE, 'classic-veg-dum-biryani', 10),
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Hyderabadi Veg Biryani', 249.00, TRUE, 'VEG_BIRYANI', 'Layered Hyderabadi-style biryani with mint, fried onions and saffron.', 'VEG', FALSE, FALSE, 'hyderabadi-veg-biryani', 20),
    ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000001', 'Mushroom Biryani', 259.00, TRUE, 'VEG_BIRYANI', 'Earthy mushrooms tossed in masala and sealed with long-grain rice.', 'VEG', FALSE, FALSE, 'mushroom-biryani', 30),
    ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000001', 'Paneer Tikka Biryani', 299.00, TRUE, 'PANEER_BIRYANI', 'Smoky tandoori paneer tikka layered with spiced dum rice.', 'VEG', TRUE, FALSE, 'paneer-tikka-biryani', 40),
    ('00000000-0000-0000-0001-000000000007', '00000000-0000-0000-0000-000000000001', 'Paneer Butter Masala Biryani', 309.00, TRUE, 'PANEER_BIRYANI', 'Creamy paneer butter masala folded into aromatic biryani rice.', 'VEG', FALSE, FALSE, 'paneer-butter-masala-biryani', 50),
    ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000001', 'Classic Egg Biryani', 239.00, TRUE, 'EGG_BIRYANI', 'Boiled eggs roasted in masala and dum-cooked with basmati.', 'EGG', FALSE, FALSE, 'classic-egg-biryani', 60),
    ('00000000-0000-0000-0001-000000000009', '00000000-0000-0000-0000-000000000001', 'Double Egg Biryani', 269.00, TRUE, 'EGG_BIRYANI', 'Twice the eggs, same slow-cooked flavour.', 'EGG', FALSE, FALSE, 'double-egg-biryani', 70),
    ('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-000000000001', 'Egg Masala Biryani', 259.00, TRUE, 'EGG_BIRYANI', 'Eggs in a rich onion-tomato masala, layered with rice.', 'EGG', FALSE, FALSE, 'egg-masala-biryani', 80),
    ('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000001', 'Classic Chicken Dum Biryani', 299.00, TRUE, 'CHICKEN_BIRYANI', 'Tender marinated chicken and basmati, sealed and slow-cooked in a handi.', 'NON_VEG', TRUE, FALSE, 'classic-chicken-dum-biryani', 90),
    ('00000000-0000-0000-0001-000000000012', '00000000-0000-0000-0000-000000000001', 'Hyderabadi Chicken Biryani', 319.00, TRUE, 'CHICKEN_BIRYANI', 'Kacchi-style Hyderabadi biryani with yoghurt-marinated chicken.', 'NON_VEG', FALSE, FALSE, 'hyderabadi-chicken-biryani', 100),
    ('00000000-0000-0000-0001-000000000013', '00000000-0000-0000-0000-000000000001', 'Chicken 65 Biryani', 329.00, TRUE, 'CHICKEN_BIRYANI', 'Crispy, fiery Chicken 65 served over masala biryani rice.', 'NON_VEG', FALSE, FALSE, 'chicken-65-biryani', 110),
    ('00000000-0000-0000-0001-000000000014', '00000000-0000-0000-0000-000000000001', 'Chicken Tikka Biryani', 339.00, TRUE, 'CHICKEN_BIRYANI', 'Char-grilled chicken tikka layered with smoky dum rice.', 'NON_VEG', FALSE, TRUE, 'chicken-tikka-biryani', 120),
    ('00000000-0000-0000-0001-000000000015', '00000000-0000-0000-0000-000000000001', 'Boneless Chicken Biryani', 349.00, TRUE, 'CHICKEN_BIRYANI', 'All the flavour, no bones: boneless chicken in dum biryani.', 'NON_VEG', FALSE, FALSE, 'boneless-chicken-biryani', 130),
    ('00000000-0000-0000-0001-000000000016', '00000000-0000-0000-0000-000000000001', 'Classic Mutton Dum Biryani', 399.00, TRUE, 'MUTTON_BIRYANI', 'Succulent mutton slow-cooked with basmati and whole spices.', 'NON_VEG', FALSE, FALSE, 'classic-mutton-dum-biryani', 140),
    ('00000000-0000-0000-0001-000000000017', '00000000-0000-0000-0000-000000000001', 'Hyderabadi Mutton Biryani', 419.00, TRUE, 'MUTTON_BIRYANI', 'The Nizami classic: tender mutton, saffron and caramelised onions.', 'NON_VEG', TRUE, FALSE, 'hyderabadi-mutton-biryani', 150),
    ('00000000-0000-0000-0001-000000000018', '00000000-0000-0000-0000-000000000001', 'Special Mutton Biryani', 459.00, TRUE, 'MUTTON_BIRYANI', 'The chef''s recipe with extra-tender mutton pieces and a rich masala.', 'NON_VEG', FALSE, TRUE, 'special-mutton-biryani', 160),
    ('00000000-0000-0000-0001-000000000019', '00000000-0000-0000-0000-000000000001', 'Chicken 65', 249.00, TRUE, 'STARTERS', 'Crispy deep-fried chicken with curry leaves and red chillies.', 'NON_VEG', TRUE, FALSE, 'chicken-65', 170),
    ('00000000-0000-0000-0001-000000000020', '00000000-0000-0000-0000-000000000001', 'Chicken Tikka', 279.00, TRUE, 'STARTERS', 'Yoghurt-marinated chicken, char-grilled in the tandoor.', 'NON_VEG', FALSE, FALSE, 'chicken-tikka', 180),
    ('00000000-0000-0000-0001-000000000021', '00000000-0000-0000-0000-000000000001', 'Paneer Tikka', 249.00, TRUE, 'STARTERS', 'Paneer cubes with peppers and onions, grilled in the tandoor.', 'VEG', FALSE, FALSE, 'paneer-tikka', 190),
    ('00000000-0000-0000-0001-000000000022', '00000000-0000-0000-0000-000000000001', 'Seekh Kebab', 299.00, TRUE, 'STARTERS', 'Spiced minced meat kebabs cooked on skewers.', 'NON_VEG', FALSE, FALSE, 'seekh-kebab', 200),
    ('00000000-0000-0000-0001-000000000023', '00000000-0000-0000-0000-000000000001', 'Crispy Corn', 199.00, TRUE, 'STARTERS', 'Golden fried sweet corn tossed with spices and herbs.', 'VEG', FALSE, FALSE, 'crispy-corn', 210),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Paneer Butter Masala', 249.00, TRUE, 'CURRIES', 'Paneer in a velvety tomato, butter and cream gravy.', 'VEG', FALSE, FALSE, 'paneer-butter-masala', 220),
    ('00000000-0000-0000-0001-000000000024', '00000000-0000-0000-0000-000000000001', 'Dal Makhani', 219.00, TRUE, 'CURRIES', 'Black lentils slow-simmered overnight with butter and cream.', 'VEG', FALSE, FALSE, 'dal-makhani', 230),
    ('00000000-0000-0000-0001-000000000025', '00000000-0000-0000-0000-000000000001', 'Chicken Curry', 289.00, TRUE, 'CURRIES', 'Home-style chicken curry in an onion-tomato masala.', 'NON_VEG', FALSE, FALSE, 'chicken-curry', 240),
    ('00000000-0000-0000-0001-000000000026', '00000000-0000-0000-0000-000000000001', 'Mutton Masala', 379.00, TRUE, 'CURRIES', 'Tender mutton in a thick, spiced masala gravy.', 'NON_VEG', FALSE, FALSE, 'mutton-masala', 250),
    ('00000000-0000-0000-0001-000000000027', '00000000-0000-0000-0000-000000000001', 'Boondi Raita', 59.00, TRUE, 'ACCOMPANIMENTS', 'Chilled yoghurt with crispy boondi and roasted cumin.', 'VEG', FALSE, FALSE, 'boondi-raita', 260),
    ('00000000-0000-0000-0001-000000000028', '00000000-0000-0000-0000-000000000001', 'Cucumber Raita', 59.00, TRUE, 'ACCOMPANIMENTS', 'Cool yoghurt with grated cucumber and mint.', 'VEG', FALSE, FALSE, 'cucumber-raita', 270),
    ('00000000-0000-0000-0001-000000000029', '00000000-0000-0000-0000-000000000001', 'Mirchi Salan', 69.00, TRUE, 'ACCOMPANIMENTS', 'Hyderabadi chilli curry with peanuts and sesame, the classic biryani partner.', 'VEG', FALSE, FALSE, 'mirchi-salan', 280),
    ('00000000-0000-0000-0001-000000000030', '00000000-0000-0000-0000-000000000001', 'Papad', 29.00, TRUE, 'ACCOMPANIMENTS', 'Crisp roasted papad.', 'VEG', FALSE, FALSE, 'papad', 290),
    ('00000000-0000-0000-0001-000000000031', '00000000-0000-0000-0000-000000000001', 'Onion Salad', 39.00, TRUE, 'ACCOMPANIMENTS', 'Sliced onions with lemon, green chilli and chaat masala.', 'VEG', FALSE, FALSE, 'onion-salad', 300),
    ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'Gulab Jamun (2 pcs)', 79.00, TRUE, 'DESSERTS', 'Soft milk dumplings soaked in warm cardamom syrup.', 'VEG', FALSE, FALSE, 'gulab-jamun', 310),
    ('00000000-0000-0000-0001-000000000032', '00000000-0000-0000-0000-000000000001', 'Rasmalai (2 pcs)', 99.00, TRUE, 'DESSERTS', 'Spongy cheese discs in saffron and pistachio milk.', 'VEG', FALSE, FALSE, 'rasmalai', 320),
    ('00000000-0000-0000-0001-000000000033', '00000000-0000-0000-0000-000000000001', 'Double Ka Meetha', 109.00, TRUE, 'DESSERTS', 'Hyderabadi bread pudding with saffron, nuts and condensed milk.', 'VEG', FALSE, TRUE, 'double-ka-meetha', 330),
    ('00000000-0000-0000-0001-000000000034', '00000000-0000-0000-0000-000000000001', 'Phirni', 89.00, FALSE, 'DESSERTS', 'Chilled ground-rice pudding with cardamom and pistachio.', 'VEG', FALSE, FALSE, 'phirni', 340),
    ('00000000-0000-0000-0001-000000000035', '00000000-0000-0000-0000-000000000001', 'Sweet Lassi', 79.00, TRUE, 'BEVERAGES', 'Thick, chilled sweet yoghurt drink.', 'VEG', FALSE, FALSE, 'sweet-lassi', 350),
    ('00000000-0000-0000-0001-000000000036', '00000000-0000-0000-0000-000000000001', 'Mango Lassi', 99.00, TRUE, 'BEVERAGES', 'Alphonso mango blended with chilled yoghurt.', 'VEG', TRUE, FALSE, 'mango-lassi', 360),
    ('00000000-0000-0000-0001-000000000037', '00000000-0000-0000-0000-000000000001', 'Masala Chaas', 59.00, TRUE, 'BEVERAGES', 'Spiced buttermilk with roasted cumin and mint.', 'VEG', FALSE, FALSE, 'masala-chaas', 370),
    ('00000000-0000-0000-0001-000000000038', '00000000-0000-0000-0000-000000000001', 'Soft Drink', 49.00, TRUE, 'BEVERAGES', 'Chilled 300 ml soft drink.', 'VEG', FALSE, FALSE, 'soft-drink', 380),
    ('00000000-0000-0000-0001-000000000039', '00000000-0000-0000-0000-000000000001', 'Single Biryani Meal', 349.00, TRUE, 'COMBOS', 'Classic Chicken Dum Biryani, Boondi Raita and Gulab Jamun.', 'NON_VEG', FALSE, FALSE, 'single-biryani-meal', 390),
    ('00000000-0000-0000-0001-000000000040', '00000000-0000-0000-0000-000000000001', 'Biryani & Starter Combo', 499.00, TRUE, 'COMBOS', 'Classic Chicken Dum Biryani, Chicken 65 and Boondi Raita.', 'NON_VEG', FALSE, FALSE, 'biryani-starter-combo', 400),
    ('00000000-0000-0000-0001-000000000041', '00000000-0000-0000-0000-000000000001', 'Couple Combo', 799.00, TRUE, 'COMBOS', 'Two Classic Chicken Dum Biryanis, Paneer Tikka and two Gulab Jamun.', 'NON_VEG', FALSE, FALSE, 'couple-combo', 410),
    ('00000000-0000-0000-0001-000000000042', '00000000-0000-0000-0000-000000000001', 'Family Biryani Pack', 1299.00, TRUE, 'COMBOS', 'Serves 4: Chicken and Veg Dum Biryani, Chicken 65, Raita, Mirchi Salan and four Gulab Jamun.', 'NON_VEG', FALSE, TRUE, 'family-biryani-pack', 420)
    AS new
ON DUPLICATE KEY UPDATE restaurant_id = new.restaurant_id, name = new.name, price = new.price,
                        available = new.available, category = new.category, description = new.description,
                        diet = new.diet, bestseller = new.bestseller, chef_special = new.chef_special,
                        image_key = new.image_key, sort_order = new.sort_order;

-- Demo owner (DEC-015): the Keycloak user "owner" manages ZAYORA.
-- Note: Flyway re-applies this file only when it changes; it then resets the demo menu, including owner edits.
INSERT INTO restaurant_owner (restaurant_id, owner_username)
VALUES ('00000000-0000-0000-0000-000000000001', 'owner') AS new
ON DUPLICATE KEY UPDATE owner_username = new.owner_username;
