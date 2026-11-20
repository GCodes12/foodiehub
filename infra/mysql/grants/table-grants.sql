-- Table-level grants for the runtime users of the Docker MySQL (plan.md §7, DEC-015, DEC-016, DEC-017).
-- MySQL refuses a table-level GRANT before the table exists, and the tables are created by each service's Flyway
-- migrations on its first start. So these cannot run in the init scripts (infra/mysql/init); apply them after the
-- services have started once. Idempotent: safe to run again.
--   stack profile: applied automatically by the one-shot "mysql-grants" service (compose.yaml)
--   "mysql" service: docker exec -i foodiehub-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' < infra/mysql/grants/table-grants.sql

-- restaurant_app: owner menu edits (DEC-015); admin restaurant management and owner assignment (DEC-017). Never DELETE.
GRANT UPDATE ON restaurant_db.menu_item TO 'restaurant_app'@'%';
GRANT INSERT, UPDATE ON restaurant_db.restaurant TO 'restaurant_app'@'%';
GRANT INSERT, UPDATE ON restaurant_db.restaurant_owner TO 'restaurant_app'@'%';

-- order_app: owner status changes (DEC-016). Never DELETE.
GRANT UPDATE ON order_db.customer_order TO 'order_app'@'%';
