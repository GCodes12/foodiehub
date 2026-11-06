#!/bin/bash
# Docker only (optional setup). Runs once, when the MySQL data volume is first initialised.
# order_db with a Flyway migrator and a SELECT/INSERT-only runtime user. No grants on any other database.
set -euo pipefail

mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS order_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'order_migrator'@'%' IDENTIFIED BY '${ORDER_DB_MIGRATOR_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON order_db.* TO 'order_migrator'@'%';

CREATE USER IF NOT EXISTS 'order_app'@'%' IDENTIFIED BY '${ORDER_DB_APP_PASSWORD}';
GRANT SELECT, INSERT ON order_db.* TO 'order_app'@'%';
SQL
