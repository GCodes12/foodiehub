#!/usr/bin/env bash
# Starts a locally installed Keycloak (no Docker) in development mode for FoodieHub.
#  * binds to 127.0.0.1 only, port KEYCLOAK_PORT (default 8080);
#  * imports infra/keycloak/foodiehub-realm.json on first start (an existing realm is left unchanged);
#  * on the very first start, creates the master-realm admin from KEYCLOAK_ADMIN_USER / KEYCLOAK_ADMIN_PASSWORD.
# Dev mode keeps its data (H2) in $KEYCLOAK_HOME/data. Not a production configuration.
#
# Usage (from the repository root): infra/keycloak/start-local-keycloak.sh      (Ctrl+C to stop)
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
# shellcheck source=../lib/read-env.sh
. "$repo_root/infra/lib/read-env.sh"
read_env_keys "${ENV_FILE:-$repo_root/.env}" KEYCLOAK_HOME KEYCLOAK_PORT KEYCLOAK_ADMIN_USER KEYCLOAK_ADMIN_PASSWORD

: "${KEYCLOAK_HOME:?set KEYCLOAK_HOME in .env (the unpacked Keycloak 26.x directory)}"
[ -x "$KEYCLOAK_HOME/bin/kc.sh" ] || { echo "No Keycloak at $KEYCLOAK_HOME (bin/kc.sh missing)" >&2; exit 1; }
: "${KEYCLOAK_ADMIN_USER:?set KEYCLOAK_ADMIN_USER in .env}"
: "${KEYCLOAK_ADMIN_PASSWORD:?set KEYCLOAK_ADMIN_PASSWORD in .env}"

mkdir -p "$KEYCLOAK_HOME/data/import"
cp "$script_dir/foodiehub-realm.json" "$KEYCLOAK_HOME/data/import/foodiehub-realm.json"

# Only used if the master realm has no admin yet.
export KC_BOOTSTRAP_ADMIN_USERNAME="$KEYCLOAK_ADMIN_USER"
export KC_BOOTSTRAP_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD"

# --hostname pins the token issuer to http://localhost:<port>, whichever host name a client uses
# (otherwise a token fetched via 127.0.0.1 would carry a different "iss" and be rejected by the services).
exec "$KEYCLOAK_HOME/bin/kc.sh" start-dev \
  --http-host=127.0.0.1 --http-port="${KEYCLOAK_PORT:-8080}" \
  --hostname="http://localhost:${KEYCLOAK_PORT:-8080}" --import-realm
