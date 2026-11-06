-- FoodieHub — local MySQL 8.x setup for order-service (non-destructive, safe to re-run).
--
-- Creates order_db and two accounts:
--   * order migrator — used by Flyway: DDL plus DML on order_db only;
--   * order app      — used by the running service: SELECT and INSERT only (VS-1 never updates or deletes orders).
-- Accounts are created for 'localhost' and '127.0.0.1', never for '%'. Nothing is dropped; existing accounts keep
-- their passwords. Set the passwords first in the same session (variable names differ from the restaurant script):
--   SET @order_migrator_password = '...';  SET @order_app_password = '...';
-- Optional: SET @order_migrator_user = '...'; SET @order_app_user = '...';
-- The easiest way is infra/mysql/local/setup-local-db.sh, which reads them from .env.

SET @order_migrator_user = COALESCE(@order_migrator_user, 'order_migrator');
SET @order_app_user      = COALESCE(@order_app_user, 'order_app');

SET @guard = IF(@order_migrator_password IS NULL OR @order_migrator_password = ''
                OR @order_app_password IS NULL OR @order_app_password = '',
                'ABORT: @order_migrator_password and @order_app_password must be set first',
                'DO 0');
PREPARE stmt FROM @guard; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE DATABASE IF NOT EXISTS order_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

SET @sql = CONCAT('CREATE USER IF NOT EXISTS ', QUOTE(@order_migrator_user), '@''localhost'' IDENTIFIED BY ', QUOTE(@order_migrator_password));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON order_db.* TO ',
                  QUOTE(@order_migrator_user), '@''localhost''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = CONCAT('CREATE USER IF NOT EXISTS ', QUOTE(@order_migrator_user), '@''127.0.0.1'' IDENTIFIED BY ', QUOTE(@order_migrator_password));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON order_db.* TO ',
                  QUOTE(@order_migrator_user), '@''127.0.0.1''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = CONCAT('CREATE USER IF NOT EXISTS ', QUOTE(@order_app_user), '@''localhost'' IDENTIFIED BY ', QUOTE(@order_app_password));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = CONCAT('GRANT SELECT, INSERT ON order_db.* TO ', QUOTE(@order_app_user), '@''localhost''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = CONCAT('CREATE USER IF NOT EXISTS ', QUOTE(@order_app_user), '@''127.0.0.1'' IDENTIFIED BY ', QUOTE(@order_app_password));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = CONCAT('GRANT SELECT, INSERT ON order_db.* TO ', QUOTE(@order_app_user), '@''127.0.0.1''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @order_migrator_password = NULL, @order_app_password = NULL, @sql = NULL;

SELECT user, host FROM mysql.user WHERE user IN (@order_migrator_user, @order_app_user) ORDER BY user, host;
