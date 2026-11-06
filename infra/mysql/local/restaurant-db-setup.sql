-- FoodieHub — local MySQL 8.x setup for restaurant-service (non-destructive, safe to re-run).
--
-- Creates restaurant_db and two accounts (plan.md §7):
--   * migrator — used by Flyway: DDL plus seed-data DML, on restaurant_db only;
--   * app      — used by the running service: SELECT, plus UPDATE on menu_item for owner edits (DEC-015).
-- Accounts are created for 'localhost' (socket / name-resolved) and '127.0.0.1' (TCP), never for '%'.
--
-- Nothing is dropped, and existing accounts are NOT modified (CREATE USER IF NOT EXISTS keeps the existing
-- password). Passwords are not stored in this file; set them first in the same session:
--   SET @migrator_password = '...';  SET @app_password = '...';
-- Optional: SET @migrator_user = '...'; SET @app_user = '...';  (defaults below)
-- The easiest way is infra/mysql/local/setup-local-db.sh, which reads them from .env.

SET @migrator_user = COALESCE(@migrator_user, 'restaurant_migrator');
SET @app_user      = COALESCE(@app_user, 'restaurant_app');

-- Stops with an error before anything is created if a password was not set. (SIGNAL is not allowed in
-- prepared statements, so the guard deliberately prepares invalid SQL whose text names the problem.)
SET @guard = IF(@migrator_password IS NULL OR @migrator_password = '' OR @app_password IS NULL OR @app_password = '',
                'ABORT: @migrator_password and @app_password must be set first',
                'DO 0');
PREPARE stmt FROM @guard; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE DATABASE IF NOT EXISTS restaurant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- migrator @ localhost
SET @sql = CONCAT('CREATE USER IF NOT EXISTS ', QUOTE(@migrator_user), '@''localhost'' IDENTIFIED BY ', QUOTE(@migrator_password));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON restaurant_db.* TO ',
                  QUOTE(@migrator_user), '@''localhost''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- migrator @ 127.0.0.1
SET @sql = CONCAT('CREATE USER IF NOT EXISTS ', QUOTE(@migrator_user), '@''127.0.0.1'' IDENTIFIED BY ', QUOTE(@migrator_password));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON restaurant_db.* TO ',
                  QUOTE(@migrator_user), '@''127.0.0.1''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- app @ localhost
SET @sql = CONCAT('CREATE USER IF NOT EXISTS ', QUOTE(@app_user), '@''localhost'' IDENTIFIED BY ', QUOTE(@app_password));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = CONCAT('GRANT SELECT ON restaurant_db.* TO ', QUOTE(@app_user), '@''localhost''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = CONCAT('GRANT UPDATE ON restaurant_db.menu_item TO ', QUOTE(@app_user), '@''localhost''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- app @ 127.0.0.1
SET @sql = CONCAT('CREATE USER IF NOT EXISTS ', QUOTE(@app_user), '@''127.0.0.1'' IDENTIFIED BY ', QUOTE(@app_password));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = CONCAT('GRANT SELECT ON restaurant_db.* TO ', QUOTE(@app_user), '@''127.0.0.1''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = CONCAT('GRANT UPDATE ON restaurant_db.menu_item TO ', QUOTE(@app_user), '@''127.0.0.1''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Forget the passwords for the rest of this session.
SET @migrator_password = NULL, @app_password = NULL, @sql = NULL;

SELECT user, host FROM mysql.user WHERE user IN (@migrator_user, @app_user) ORDER BY user, host;
