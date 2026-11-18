#!/usr/bin/env bash
# DEV ONLY — sets up the ADMIN role (DEC-017) in the local foodiehub realm. Safe to re-run. Never run in production.
#   * realm role ADMIN
#   * confidential client "foodiehub-admin-api" whose service account may only READ (view-users, query-users, view-realm — the last is
#     needed to list the members of a role; none of them can change anything);
#     restaurant-service uses it to list owners, verify owner assignments and count users. Its secret is set from
#     KEYCLOAK_ADMIN_API_CLIENT_SECRET in .env (the same value restaurant-service reads).
#   * ONE admin user from FOODIEHUB_DEV_ADMIN_USERNAME / FOODIEHUB_DEV_ADMIN_PASSWORD, with the ADMIN role only.
#   * optional (DEC-018), when KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET is set: group "restaurant-owners" (carries
#     RESTAURANT_OWNER), confidential client "foodiehub-owner-provisioner" with NO realm-management roles, and Keycloak
#     fine-grained admin permissions (v2) that let it create users ONLY inside that group. It cannot grant roles or touch
#     any account outside the group (verified against Keycloak 26.8.1; see docs/sdd/api-admin.md).
# ADMIN is never granted to the demo users (alice, bob, owner) or to anyone else. Nothing secret is passed on a command
# line or printed. Requires a running Keycloak (infra/keycloak/start-local-keycloak.sh) and python3.
#
# Production: create the administrator and the client secret by hand in the Keycloak admin console (see README).
#
# Usage (from the repository root): infra/keycloak/create-dev-admin.sh
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
# shellcheck source=../lib/read-env.sh
. "$repo_root/infra/lib/read-env.sh"
read_env_keys "${ENV_FILE:-$repo_root/.env}" KEYCLOAK_PORT KEYCLOAK_ADMIN_USER KEYCLOAK_ADMIN_PASSWORD \
  FOODIEHUB_DEV_ADMIN_USERNAME FOODIEHUB_DEV_ADMIN_PASSWORD KEYCLOAK_ADMIN_API_CLIENT_SECRET \
  KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET
: "${KEYCLOAK_ADMIN_USER:?set KEYCLOAK_ADMIN_USER in .env}"
: "${KEYCLOAK_ADMIN_PASSWORD:?set KEYCLOAK_ADMIN_PASSWORD in .env}"
: "${FOODIEHUB_DEV_ADMIN_USERNAME:?set FOODIEHUB_DEV_ADMIN_USERNAME in .env (see .env.example)}"
: "${FOODIEHUB_DEV_ADMIN_PASSWORD:?set FOODIEHUB_DEV_ADMIN_PASSWORD in .env (see .env.example)}"
: "${KEYCLOAK_ADMIN_API_CLIENT_SECRET:?set KEYCLOAK_ADMIN_API_CLIENT_SECRET in .env (see .env.example)}"

admin_user="$FOODIEHUB_DEV_ADMIN_USERNAME"
case "$admin_user" in
  alice|bob|owner) echo "Refusing: '$admin_user' is a demo user; choose a separate admin username." >&2; exit 1 ;;
esac
if [ "${#KEYCLOAK_ADMIN_API_CLIENT_SECRET}" -lt 24 ]; then
  echo "KEYCLOAK_ADMIN_API_CLIENT_SECRET must be at least 24 characters." >&2; exit 1
fi
if [ -n "${KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET:-}" ] && [ "${#KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET}" -lt 24 ]; then
  echo "KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET must be at least 24 characters." >&2; exit 1
fi
if [ -n "${KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET:-}" ] && [ "$KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET" = "$KEYCLOAK_ADMIN_API_CLIENT_SECRET" ]; then
  echo "Use a different value for KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET than for KEYCLOAK_ADMIN_API_CLIENT_SECRET." >&2; exit 1
fi
if [ "${#FOODIEHUB_DEV_ADMIN_PASSWORD}" -lt 8 ]; then
  echo "FOODIEHUB_DEV_ADMIN_PASSWORD must be at least 8 characters." >&2; exit 1
fi

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
first_id() { python3 -I -c 'import json,sys; v=json.load(sys.stdin); print(v[0]["id"] if v else "")'; }

# --- Realm role ADMIN -----------------------------------------------------------------------------------------------
if [ "$(status "$realm/roles/ADMIN")" = "200" ]; then
  echo "role ADMIN exists"
else
  api -X POST "$realm/roles" --data '{"name":"ADMIN","description":"Platform administrator (DEC-017). Never granted to demo users."}' >/dev/null
  echo "created role ADMIN"
fi

# --- Read-only service-account client --------------------------------------------------------------------------------
client=foodiehub-admin-api
cid=$(api "$realm/clients?clientId=$client" | first_id)
if [ -z "$cid" ]; then
  api -X POST "$realm/clients" --data '{"clientId":"foodiehub-admin-api","name":"FoodieHub restaurant-service → Keycloak (read-only)",
    "enabled":true,"publicClient":false,"protocol":"openid-connect","clientAuthenticatorType":"client-secret",
    "standardFlowEnabled":false,"implicitFlowEnabled":false,"directAccessGrantsEnabled":false,"serviceAccountsEnabled":true}' >/dev/null
  cid=$(api "$realm/clients?clientId=$client" | first_id)
  echo "created client $client"
else
  echo "client $client exists"
fi
# Set the secret from .env (merged into the current representation, so nothing else on the client changes).
api "$realm/clients/$cid" > "$tmp/client.json"
printf '%s' "$KEYCLOAK_ADMIN_API_CLIENT_SECRET" | python3 -I -c '
import json,sys
c=json.load(open(sys.argv[1])); c["secret"]=sys.stdin.read(); c["serviceAccountsEnabled"]=True; c["publicClient"]=False
json.dump(c, open(sys.argv[1],"w"))' "$tmp/client.json"
api -X PUT "$realm/clients/$cid" --data @"$tmp/client.json" >/dev/null
echo "secret of $client set from .env"

sa_id=$(api "$realm/clients/$cid/service-account-user" | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["id"])')
rm_id=$(api "$realm/clients?clientId=realm-management" | first_id)
for role in view-users query-users view-realm; do
  api "$realm/clients/$rm_id/roles/$role" >> "$tmp/rm_roles.jsonl"; echo >> "$tmp/rm_roles.jsonl"
done
python3 -I -c 'import json,sys; print(json.dumps([{"id":r["id"],"name":r["name"]} for r in map(json.loads, filter(str.strip, open(sys.argv[1])))]))' \
  "$tmp/rm_roles.jsonl" > "$tmp/rm_roles.json"
api -X POST "$realm/users/$sa_id/role-mappings/clients/$rm_id" --data @"$tmp/rm_roles.json" >/dev/null
echo "service account of $client may view users and realm, query users (read-only)"

# --- The development admin user --------------------------------------------------------------------------------------
existing=$(api "$realm/users?username=$admin_user&exact=true" | first_id)
if [ -z "$existing" ]; then
  python3 -I -c 'import json,sys; u=sys.argv[1]; print(json.dumps({"username":u,"enabled":True,"emailVerified":True,
    "firstName":"Admin","lastName":"Dev","email":u+"@foodiehub.local"}))' "$admin_user" > "$tmp/user.json"
  api -X POST "$realm/users" --data @"$tmp/user.json" >/dev/null
  existing=$(api "$realm/users?username=$admin_user&exact=true" | first_id)
  echo "created user $admin_user"
else
  echo "user $admin_user exists"
fi
printf '%s' "$FOODIEHUB_DEV_ADMIN_PASSWORD" |
  python3 -I -c 'import json,sys; print(json.dumps({"type":"password","temporary":False,"value":sys.stdin.read()}))' > "$tmp/cred.json"
api -X PUT "$realm/users/$existing/reset-password" --data @"$tmp/cred.json" >/dev/null
api "$realm/roles/ADMIN" | python3 -I -c 'import json,sys; r=json.load(sys.stdin); print(json.dumps([{"id":r["id"],"name":r["name"]}]))' > "$tmp/roles.json"
api -X POST "$realm/users/$existing/role-mappings/realm" --data @"$tmp/roles.json" >/dev/null
echo "password and role ADMIN set for $admin_user"

# --- Owner provisioning (DEC-018, optional) ---------------------------------------------------------------------------
if [ -z "${KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET:-}" ]; then
  echo "owner provisioning skipped (KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET not set): admins can assign owners, not create them"
  exit 0
fi
printf '%s' "$KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET" > "$tmp/prov_secret"
printf '%s' "$admin_token" > "$tmp/admin_token"
python3 -I - "$realm" "$tmp/admin_token" "$tmp/prov_secret" <<'PY'
import json, sys, urllib.error, urllib.request
realm, token_file, secret_file = sys.argv[1:4]
token = open(token_file).read().strip()
GROUP, CLIENT, ROLE = "restaurant-owners", "foodiehub-owner-provisioner", "RESTAURANT_OWNER"

def call(method, path, body=None):
    request = urllib.request.Request(realm + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                     headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Keycloak {method} {path} failed: HTTP {e.code} {e.read()[:200]!r}")

# Fine-grained admin permissions (v2) on the realm (a partial update: nothing else changes).
call("PUT", "", {"adminPermissionsEnabled": True})
print("fine-grained admin permissions enabled on the realm")

# The owners group carries the RESTAURANT_OWNER role; accounts created in it get exactly that role.
groups = [g for g in call("GET", f"/groups?search={GROUP}&exact=true") if g["name"] == GROUP]
if not groups:
    call("POST", "/groups", {"name": GROUP})
    groups = [g for g in call("GET", f"/groups?search={GROUP}&exact=true") if g["name"] == GROUP]
    print(f"created group {GROUP}")
group_id = groups[0]["id"]
role = call("GET", f"/roles/{ROLE}")
if ROLE not in [r["name"] for r in call("GET", f"/groups/{group_id}/role-mappings/realm")]:
    call("POST", f"/groups/{group_id}/role-mappings/realm", [{"id": role["id"], "name": ROLE}])
print(f"group {GROUP} carries {ROLE}")

# The provisioning client: confidential, service account, NO realm-management roles.
clients = call("GET", f"/clients?clientId={CLIENT}")
if not clients:
    call("POST", "/clients", {"clientId": CLIENT, "enabled": True, "publicClient": False, "protocol": "openid-connect",
                             "clientAuthenticatorType": "client-secret", "standardFlowEnabled": False,
                             "implicitFlowEnabled": False, "directAccessGrantsEnabled": False, "serviceAccountsEnabled": True})
    clients = call("GET", f"/clients?clientId={CLIENT}")
    print(f"created client {CLIENT}")
client = clients[0]
client.update({"secret": open(secret_file).read(), "serviceAccountsEnabled": True, "publicClient": False})
call("PUT", f"/clients/{client['id']}", client)
service_account = call("GET", f"/clients/{client['id']}/service-account-user")
realm_management = call("GET", "/clients?clientId=realm-management")[0]
granted = call("GET", f"/users/{service_account['id']}/role-mappings/clients/{realm_management['id']}")
if granted:
    call("DELETE", f"/users/{service_account['id']}/role-mappings/clients/{realm_management['id']}", granted)
    print("removed realm-management roles from the provisioning account: " + ", ".join(r["name"] for r in granted))
print(f"secret of {CLIENT} set from .env; it holds no realm-management roles")

# Permissions, in the realm's admin-permissions client: who (the provisioning client) may do what (on the group).
permissions_client = call("GET", "/clients?clientId=admin-permissions")[0]["id"]
base = f"/clients/{permissions_client}/authz/resource-server"
policy_name = f"client is {CLIENT}"
policies = [p for p in call("GET", f"{base}/policy?name={urllib.request.quote(policy_name)}") if p["name"] == policy_name]
policy = {"name": policy_name, "clients": [client["id"]], "logic": "POSITIVE",
          "description": "DEC-018: the owner provisioning service account"}
if policies:
    call("PUT", f"{base}/policy/client/{policies[0]['id']}", {**policy, "id": policies[0]["id"]})
    policy_id = policies[0]["id"]
else:
    policy_id = call("POST", f"{base}/policy/client", policy)["id"]

def permission(name, resource_type, resource, scopes):
    body = {"name": name, "resourceType": resource_type, "resources": [resource], "scopes": scopes,
            "policies": [policy_id], "decisionStrategy": "UNANIMOUS", "logic": "POSITIVE"}
    existing = [p for p in call("GET", f"{base}/permission?name={urllib.request.quote(name)}") if p["name"] == name]
    if existing:
        call("PUT", f"{base}/permission/scope/{existing[0]['id']}", {**body, "id": existing[0]["id"]})
    else:
        call("POST", f"{base}/permission/scope", body)
    print(f"permission '{name}': {', '.join(scopes)}")

# Creating a user inside the group needs manage-members and manage-membership on that group. Nothing on Users
# (that would allow resetting or deleting any account) and nothing on any role.
permission(f"{CLIENT}: members of {GROUP}", "Groups", group_id, ["view", "view-members", "manage-members", "manage-membership"])
PY

