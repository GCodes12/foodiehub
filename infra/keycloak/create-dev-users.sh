#!/usr/bin/env bash
# Sets up the local demo accounts in the foodiehub realm, using the Keycloak admin REST API. Safe to re-run.
#   * realm roles CUSTOMER and RESTAURANT_OWNER (DEC-015)
#   * users alice and bob (CUSTOMER) and owner (RESTAURANT_OWNER, manages ZAYORA via the restaurant_db seed)
#   * passwords for all three from .env (FOODIEHUB_DEMO_USER_PASSWORD), reset on every run
#   * the "restaurant-service" audience on the frontend and dev-CLI clients' tokens (owner endpoints)
# Nothing secret is passed on a command line. Requires a running Keycloak (infra/keycloak/start-local-keycloak.sh)
# and python3.
#
# Usage (from the repository root): infra/keycloak/create-dev-users.sh
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
# shellcheck source=../lib/read-env.sh
. "$repo_root/infra/lib/read-env.sh"
read_env_keys "${ENV_FILE:-$repo_root/.env}" KEYCLOAK_PORT KEYCLOAK_ADMIN_USER KEYCLOAK_ADMIN_PASSWORD FOODIEHUB_DEMO_USER_PASSWORD
: "${KEYCLOAK_ADMIN_USER:?set KEYCLOAK_ADMIN_USER in .env}"
: "${KEYCLOAK_ADMIN_PASSWORD:?set KEYCLOAK_ADMIN_PASSWORD in .env}"
: "${FOODIEHUB_DEMO_USER_PASSWORD:?set FOODIEHUB_DEMO_USER_PASSWORD in .env}"
kc="http://127.0.0.1:${KEYCLOAK_PORT:-8080}"
realm="$kc/admin/realms/foodiehub"

tmp="$(mktemp -d)"; chmod 700 "$tmp"; trap 'rm -rf "$tmp"' EXIT
printf '%s' "$KEYCLOAK_ADMIN_PASSWORD" > "$tmp/admin_pw"

admin_token=$(curl -fsS "$kc/realms/master/protocol/openid-connect/token" \
  --data-urlencode grant_type=password --data-urlencode client_id=admin-cli \
  --data-urlencode "username=$KEYCLOAK_ADMIN_USER" --data-urlencode "password@$tmp/admin_pw" |
  python3 -I -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')
printf 'Authorization: Bearer %s\n' "$admin_token" > "$tmp/auth_header"

api() { curl -fsS -H @"$tmp/auth_header" -H 'Content-Type: application/json' "$@"; }
status() { curl -sS -o /dev/null -w '%{http_code}' -H @"$tmp/auth_header" "$@"; }

# --- Realm roles -------------------------------------------------------------------------------------------------
for role in CUSTOMER RESTAURANT_OWNER; do
  if [ "$(status "$realm/roles/$role")" = "200" ]; then
    echo "role $role exists"
  else
    python3 -I -c 'import json,sys; r=sys.argv[1]; print(json.dumps({"name":r,"description":
      {"CUSTOMER":"May place orders (Q-23, DEC-015)","RESTAURANT_OWNER":"Manages own restaurants (DEC-015)"}[r]}))' "$role" > "$tmp/role.json"
    api -X POST "$realm/roles" --data @"$tmp/role.json" >/dev/null
    echo "created role $role"
  fi
done

# --- Users ---------------------------------------------------------------------------------------------------------
ensure_user() { # username first-name role
  local user="$1" first="$2" role="$3" existing
  existing=$(api "$realm/users?username=$user&exact=true" |
    python3 -I -c 'import json,sys; u=json.load(sys.stdin); print(u[0]["id"] if u else "")')
  if [ -z "$existing" ]; then
    python3 -I -c 'import json,sys; u,f=sys.argv[1:3]; print(json.dumps({"username":u,"enabled":True,"emailVerified":True,
      "firstName":f,"lastName":"Demo","email":u+"@foodiehub.local"}))' "$user" "$first" > "$tmp/user.json"
    api -X POST "$realm/users" --data @"$tmp/user.json" >/dev/null
    existing=$(api "$realm/users?username=$user&exact=true" |
      python3 -I -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])')
    echo "created user $user"
  else
    echo "user $user exists"
  fi
  printf '%s' "$FOODIEHUB_DEMO_USER_PASSWORD" |
    python3 -I -c 'import json,sys; print(json.dumps({"type":"password","temporary":False,"value":sys.stdin.read()}))' > "$tmp/cred.json"
  api -X PUT "$realm/users/$existing/reset-password" --data @"$tmp/cred.json" >/dev/null
  api "$realm/roles/$role" | python3 -I -c 'import json,sys; r=json.load(sys.stdin); print(json.dumps([{"id":r["id"],"name":r["name"]}]))' > "$tmp/roles.json"
  api -X POST "$realm/users/$existing/role-mappings/realm" --data @"$tmp/roles.json" >/dev/null
  echo "password and role $role set for $user"
}

ensure_user alice Alice CUSTOMER
ensure_user bob Bob CUSTOMER
ensure_user owner Owner RESTAURANT_OWNER

# --- "restaurant-service" audience on the clients that call the owner endpoints -------------------------------------
for client in foodiehub-frontend foodiehub-dev-cli; do
  cid=$(api "$realm/clients?clientId=$client" | python3 -I -c 'import json,sys; c=json.load(sys.stdin); print(c[0]["id"] if c else "")')
  [ -n "$cid" ] || { echo "client $client not found" >&2; exit 1; }
  if api "$realm/clients/$cid/protocol-mappers/models" |
      python3 -I -c 'import json,sys; sys.exit(0 if any(m["name"]=="restaurant-service audience" for m in json.load(sys.stdin)) else 1)'; then
    echo "audience restaurant-service already on $client"
  else
    python3 -I -c 'import json; print(json.dumps({"name":"restaurant-service audience","protocol":"openid-connect",
      "protocolMapper":"oidc-audience-mapper","consentRequired":False,"config":{"included.custom.audience":"restaurant-service",
      "access.token.claim":"true","id.token.claim":"false","introspection.token.claim":"true"}}))' > "$tmp/mapper.json"
    api -X POST "$realm/clients/$cid/protocol-mappers/models" --data @"$tmp/mapper.json" >/dev/null
    echo "added audience restaurant-service to $client"
  fi
done
