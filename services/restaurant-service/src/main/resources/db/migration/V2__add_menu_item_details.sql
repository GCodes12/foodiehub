-- DEC-014: menu details for the ZAYORA menu. Additive only: existing rows keep working with the defaults.
--   category      menu section code (for example CHICKEN_BIRYANI); the frontend owns display names and order
--   description   one-line description shown on the dish card
--   diet          VEG, EGG or NON_VEG; NULL = not specified (no indicator is shown)
--   bestseller    / chef_special: labels chosen by the restaurant (not computed from sales)
--   image_key     name of the dish photo the frontend looks up; NULL = placeholder artwork
--   sort_order    position within the menu (lower first)

ALTER TABLE menu_item
    ADD COLUMN category     VARCHAR(40)  NOT NULL DEFAULT 'OTHER',
    ADD COLUMN description  VARCHAR(300) NULL,
    ADD COLUMN diet         VARCHAR(10)  NULL,
    ADD COLUMN bestseller   BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN chef_special BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN image_key    VARCHAR(80)  NULL,
    ADD COLUMN sort_order   INT          NOT NULL DEFAULT 0,
    ADD CONSTRAINT ck_menu_item_diet CHECK (diet IS NULL OR diet IN ('VEG', 'EGG', 'NON_VEG')),
    ADD CONSTRAINT ck_menu_item_category CHECK (category REGEXP '^[A-Z][A-Z_]{0,39}$');
