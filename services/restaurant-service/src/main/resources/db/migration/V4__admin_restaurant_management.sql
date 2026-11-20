-- DEC-017: platform administration. Additive only: no row is deleted and existing columns keep their values.

-- Restaurant details an administrator maintains. All optional; the public API still exposes only id and name.
ALTER TABLE restaurant
    ADD COLUMN description VARCHAR(500) NULL,
    ADD COLUMN address     VARCHAR(300) NULL,
    ADD COLUMN city        VARCHAR(100) NULL,
    ADD COLUMN phone       VARCHAR(20)  NULL,
    ADD COLUMN created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    ADD COLUMN updated_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    -- Optimistic locking: two administrators cannot silently overwrite each other's change.
    ADD COLUMN version     BIGINT       NOT NULL DEFAULT 0,
    ADD CONSTRAINT ck_restaurant_name_not_blank CHECK (CHAR_LENGTH(TRIM(name)) > 0);

CREATE INDEX ix_restaurant_active_name ON restaurant (active, name);

-- Ownership by the owner's stable Keycloak subject ("sub"), not by username (DEC-017, data-model §3.5).
--   owner_sub      the owner's token subject; NULL for links made before DEC-017. A link without a subject matches
--                  nobody (fail closed) until an administrator assigns the owner again.
--   owner_username a display label copied from Keycloak at assignment time; never used for authorization.
-- One owner per restaurant (one owner may manage several restaurants): the primary key becomes restaurant_id alone.
-- Existing data has at most one owner per restaurant (the dev seed links one).
ALTER TABLE restaurant_owner
    ADD COLUMN owner_sub   VARCHAR(255) NULL,
    ADD COLUMN assigned_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    DROP PRIMARY KEY,
    ADD CONSTRAINT pk_restaurant_owner PRIMARY KEY (restaurant_id);

DROP INDEX ix_restaurant_owner_username ON restaurant_owner;
CREATE INDEX ix_restaurant_owner_sub ON restaurant_owner (owner_sub);
