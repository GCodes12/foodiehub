#!/bin/bash
# Production only (compose.prod.yaml). Runs once, when the MySQL data volume is first initialised.
# Keycloak's own database and account, with rights on keycloak_db only. Does nothing when KEYCLOAK_DB_PASSWORD is not
# set, so the local setups (compose.yaml) are unchanged.
set -euo pipefail

if [ -n "${KEYCLOAK_DB_PASSWORD:-}" ]; then
  mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS keycloak_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'keycloak'@'%' IDENTIFIED BY '${KEYCLOAK_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON keycloak_db.* TO 'keycloak'@'%';
SQL
  echo "keycloak_db and its account created"
else
  echo "keycloak_db skipped (KEYCLOAK_DB_PASSWORD not set)"
fi
