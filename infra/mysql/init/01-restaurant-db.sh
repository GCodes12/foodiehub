#!/bin/bash
# Runs once, when the MySQL data volume is first initialised.
# restaurant_db with two users (plan.md §7): a migrator for Flyway DDL and seed data, and a runtime user with
# SELECT plus UPDATE on menu_item (owner edits, DEC-015) and INSERT/UPDATE on restaurant and restaurant_owner (admin
# restaurant management and owner assignment, DEC-017; never DELETE). No grants on any other database.
set -euo pipefail

mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS restaurant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'restaurant_migrator'@'%' IDENTIFIED BY '${RESTAURANT_DB_MIGRATOR_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
    ON restaurant_db.* TO 'restaurant_migrator'@'%';

CREATE USER IF NOT EXISTS 'restaurant_app'@'%' IDENTIFIED BY '${RESTAURANT_DB_APP_PASSWORD}';
GRANT SELECT ON restaurant_db.* TO 'restaurant_app'@'%';
GRANT UPDATE ON restaurant_db.menu_item TO 'restaurant_app'@'%';
GRANT INSERT, UPDATE ON restaurant_db.restaurant TO 'restaurant_app'@'%';
GRANT INSERT, UPDATE ON restaurant_db.restaurant_owner TO 'restaurant_app'@'%';
SQL
