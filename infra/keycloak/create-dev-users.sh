#!/usr/bin/env bash
# Creates (or resets the password of) the local demo users "alice" and "bob" in the foodiehub realm, using the
# Keycloak admin REST API. Safe to re-run. Passwords come from .env (FOODIEHUB_DEMO_USER_PASSWORD); nothing secret is
# passed on a command line. Requires a running Keycloak (infra/keycloak/start-local-keycloak.sh) and python3.
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

tmp="$(mktemp -d)"; chmod 700 "$tmp"; trap 'rm -rf "$tmp"' EXIT
printf '%s' "$KEYCLOAK_ADMIN_PASSWORD" > "$tmp/admin_pw"

admin_token=$(curl -fsS "$kc/realms/master/protocol/openid-connect/token" \
  --data-urlencode grant_type=password --data-urlencode client_id=admin-cli \
  --data-urlencode "username=$KEYCLOAK_ADMIN_USER" --data-urlencode "password@$tmp/admin_pw" |
  python3 -I -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')
printf 'Authorization: Bearer %s\n' "$admin_token" > "$tmp/auth_header"

api() { curl -fsS -H @"$tmp/auth_header" -H 'Content-Type: application/json' "$@"; }

for user in alice bob; do
  first=$(printf '%s' "$user" | python3 -I -c 'import sys; print(sys.stdin.read().capitalize())')
  existing=$(api "$kc/admin/realms/foodiehub/users?username=$user&exact=true" |
    python3 -I -c 'import json,sys; u=json.load(sys.stdin); print(u[0]["id"] if u else "")')
  if [ -z "$existing" ]; then
    python3 -I -c 'import json,sys; u,f=sys.argv[1:3]; print(json.dumps({"username":u,"enabled":True,"emailVerified":True,
      "firstName":f,"lastName":"Demo","email":u+"@foodiehub.local"}))' "$user" "$first" > "$tmp/user.json"
    api -X POST "$kc/admin/realms/foodiehub/users" --data @"$tmp/user.json" >/dev/null
    existing=$(api "$kc/admin/realms/foodiehub/users?username=$user&exact=true" |
      python3 -I -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])')
    echo "created user $user"
  else
    echo "user $user exists"
  fi
  printf '%s' "$FOODIEHUB_DEMO_USER_PASSWORD" |
    python3 -I -c 'import json,sys; print(json.dumps({"type":"password","temporary":False,"value":sys.stdin.read()}))' > "$tmp/cred.json"
  api -X PUT "$kc/admin/realms/foodiehub/users/$existing/reset-password" --data @"$tmp/cred.json" >/dev/null
  echo "password set for $user"
done
