#!/usr/bin/env bash
# Runs restaurant-db-setup.sql and order-db-setup.sql against a locally installed MySQL 8.x, taking the passwords
# from .env.
# Non-destructive (CREATE ... IF NOT EXISTS and GRANT only). Prompts for the MySQL admin password;
# no password is passed on the command line or printed.
#
# Usage (from the repository root):  infra/mysql/local/setup-local-db.sh
# Optional environment: ENV_FILE (default ./.env), MYSQL_BIN (default: DMG or Homebrew MySQL 8.4 client),
#                       MYSQL_ADMIN_USER (default root), MYSQL_HOST (default 127.0.0.1), MYSQL_PORT (default 3306).
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../../.." && pwd)"
env_file="${ENV_FILE:-$repo_root/.env}"

[ -f "$env_file" ] || { echo "Missing $env_file — copy .env.example to .env and set the passwords." >&2; exit 1; }
# Read KEY=VALUE lines literally (the file is never executed as shell code). Real environment variables win.
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|'#'*) continue ;; esac
  key=${line%%=*}; value=${line#*=}
  case "$key" in
    RESTAURANT_DB_MIGRATOR_USER|RESTAURANT_DB_MIGRATOR_PASSWORD|RESTAURANT_DB_APP_USER|RESTAURANT_DB_APP_PASSWORD|\
    ORDER_DB_MIGRATOR_USER|ORDER_DB_MIGRATOR_PASSWORD|ORDER_DB_APP_USER|ORDER_DB_APP_PASSWORD|MYSQL_HOST|MYSQL_PORT)
      [ -z "${!key:-}" ] && printf -v "$key" '%s' "$value" ;;
  esac
done < "$env_file"
: "${RESTAURANT_DB_MIGRATOR_PASSWORD:?is not set in .env}"
: "${RESTAURANT_DB_APP_PASSWORD:?is not set in .env}"
: "${ORDER_DB_MIGRATOR_PASSWORD:?is not set in .env}"
: "${ORDER_DB_APP_PASSWORD:?is not set in .env}"

# Prefer a MySQL 8.x client from the official DMG or Homebrew over whatever `mysql` is first on PATH
# (an old 5.7 client cannot authenticate against MySQL 8.4's default caching_sha2_password).
if [ -z "${MYSQL_BIN:-}" ]; then
  for candidate in /usr/local/mysql/bin/mysql /opt/homebrew/opt/mysql@8.4/bin/mysql /opt/homebrew/opt/mysql/bin/mysql mysql; do
    if command -v "$candidate" >/dev/null 2>&1; then MYSQL_BIN=$candidate; break; fi
  done
fi
: "${MYSQL_BIN:?no mysql client found; set MYSQL_BIN}"

# Quote a value as a MySQL string literal (escapes backslashes and single quotes).
sql_quote() { local v=${1//\\/\\\\}; v=${v//\'/\'\'}; printf "'%s'" "$v"; }

password_flag=(-p)                      # interactive prompt
[ -n "${MYSQL_PWD:-}" ] && password_flag=()   # non-interactive use (e.g. automation) via MYSQL_PWD

{
  printf 'SET @migrator_user = %s;\n'     "$(sql_quote "${RESTAURANT_DB_MIGRATOR_USER:-restaurant_migrator}")"
  printf 'SET @app_user = %s;\n'          "$(sql_quote "${RESTAURANT_DB_APP_USER:-restaurant_app}")"
  printf 'SET @migrator_password = %s;\n' "$(sql_quote "$RESTAURANT_DB_MIGRATOR_PASSWORD")"
  printf 'SET @app_password = %s;\n'      "$(sql_quote "$RESTAURANT_DB_APP_PASSWORD")"
  cat "$script_dir/restaurant-db-setup.sql"
  printf 'SET @order_migrator_user = %s;\n'     "$(sql_quote "${ORDER_DB_MIGRATOR_USER:-order_migrator}")"
  printf 'SET @order_app_user = %s;\n'          "$(sql_quote "${ORDER_DB_APP_USER:-order_app}")"
  printf 'SET @order_migrator_password = %s;\n' "$(sql_quote "$ORDER_DB_MIGRATOR_PASSWORD")"
  printf 'SET @order_app_password = %s;\n'      "$(sql_quote "$ORDER_DB_APP_PASSWORD")"
  cat "$script_dir/order-db-setup.sql"
} | "$MYSQL_BIN" --protocol=TCP -h "${MYSQL_HOST:-127.0.0.1}" -P "${MYSQL_PORT:-3306}" \
      -u "${MYSQL_ADMIN_USER:-root}" ${password_flag[@]+"${password_flag[@]}"} --table
