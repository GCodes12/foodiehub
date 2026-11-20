-- DEC-015: which signed-in owners manage which restaurant. An owner is identified by Keycloak username
-- (implementation proposal; assigning owners is an admin task, US-09). Additive only.
CREATE TABLE restaurant_owner (
    restaurant_id  VARCHAR(36)  NOT NULL,
    owner_username VARCHAR(255) NOT NULL,
    CONSTRAINT pk_restaurant_owner PRIMARY KEY (restaurant_id, owner_username),
    CONSTRAINT fk_restaurant_owner_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurant (id)
);

CREATE INDEX ix_restaurant_owner_username ON restaurant_owner (owner_username);
