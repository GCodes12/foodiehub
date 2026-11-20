# Administrator API (DEC-017)

**Status:** implemented (2026-11-18). Decision: `clarification.md` §9.2 DEC-017. Requirements: `spec.md` §17.

All endpoints need a Keycloak access token from the `foodiehub` realm (signature, issuer, audience and expiry are
checked) with the **`ADMIN`** realm role.

| Caller | Response |
|---|---|
| No token or an invalid token | `401` |
| `CUSTOMER` or `RESTAURANT_OWNER` without `ADMIN` | `403`, `code: FORBIDDEN` |

Errors are RFC 9457 Problem Details with a stable `code`; the texts live in each service's `messages.properties`.

Lists are paginated: `?page=0&size=20` (size 1–100; larger values are reduced to 100), and return

```json
{ "items": [ ... ], "page": 0, "size": 20, "totalItems": 42, "totalPages": 3 }
```

In development, the Vite proxy routes `/api/v1/admin/orders/**` to order-service and the rest of `/api/v1/admin/**`
to restaurant-service.

## restaurant-service (port 8081)

| Method and path | Purpose | Success | Errors |
|---|---|---|---|
| `GET /api/v1/admin/dashboard` | Restaurant counts; owner and customer counts from Keycloak | 200 | — (people counts are `null` with `userDirectoryAvailable: false` when Keycloak cannot be asked) |
| `GET /api/v1/admin/restaurants?page&size&active&q` | Restaurants by name; `active=true/false` filter; `q` = name contains (case-insensitive) | 200 page of summaries | — |
| `POST /api/v1/admin/restaurants` | Create. Server generates the id; **always inactive** | 201 + `Location`, detail | 400 `VALIDATION_FAILED` |
| `GET /api/v1/admin/restaurants/{id}` | One restaurant with owner and dish counts | 200 detail | 404 `RESTAURANT_NOT_FOUND` |
| `PATCH /api/v1/admin/restaurants/{id}` | Edit details; only fields sent change; `""` clears an optional field | 200 detail | 400 `VALIDATION_FAILED` / `NOTHING_TO_UPDATE`, 404, 409 `RESTAURANT_CHANGED` |
| `PUT /api/v1/admin/restaurants/{id}/status` | Activate or deactivate (soft; nothing is deleted) | 200 detail | 400, 404, 409 `RESTAURANT_CHANGED` / `RESTAURANT_HAS_NO_MENU` |
| `PUT /api/v1/admin/restaurants/{id}/owner` | Assign or re-assign the single owner | 200 detail | 400, 404, 422 `INVALID_OWNER`, 503 `USER_DIRECTORY_UNAVAILABLE` |
| `GET /api/v1/admin/owners?page&size` | Owner accounts (direct `RESTAURANT_OWNER` holders plus members of group `restaurant-owners`) with e-mail, status and the restaurants each manages | 200 page | 503 `USER_DIRECTORY_UNAVAILABLE` |
| `POST /api/v1/admin/owners` | Create an owner account (DEC-018) | 201 owner account (never the password) | 400 `VALIDATION_FAILED`, 409 `OWNER_USERNAME_TAKEN` / `OWNER_EMAIL_TAKEN`, 503 `OWNER_PROVISIONING_UNAVAILABLE` |

### Request bodies

Only the listed fields are read. Anything else (`id`, `active`, `version`, `owner`…) is ignored, so a create or edit
can never change status, ownership or identity.

```jsonc
// POST /api/v1/admin/restaurants
{ "name": "Spice Route", "description": "…", "address": "…", "city": "Kochi", "phone": "+91 484 000 0000" }
//   name: required, ≤ 200 · description ≤ 500 · address ≤ 300 · city ≤ 100 · phone: 6–20 of digits, spaces, + - ( )

// PATCH /api/v1/admin/restaurants/{id}   (expectedVersion = the "version" the screen showed)
{ "expectedVersion": 3, "city": "" }

// PUT /api/v1/admin/restaurants/{id}/status
{ "active": false, "expectedVersion": 4 }

// PUT /api/v1/admin/restaurants/{id}/owner   (the owner's Keycloak user id; roles are never sent)
{ "ownerSub": "23232352-d259-4269-b527-afa806984cf2" }
```

// POST /api/v1/admin/owners   (no role, group or "enabled" field exists: the server always creates a restaurant owner)
{ "fullName": "Asha Rao", "email": "asha@example.com", "username": "asha.rao", "temporaryPassword": "…" }
//   fullName ≤ 100 · email valid, ≤ 254 · username 3–50 of a-z 0-9 . _ - (lower case; not "service-account-…")
//   temporaryPassword 10–64 characters, must not contain the username; the owner must replace it at first login
```

```jsonc
// 201 response: no password, token or secret
{ "sub": "…", "username": "asha.rao", "displayName": "Asha Rao", "email": "asha@example.com", "enabled": true,
  "passwordChangePending": true, "restaurants": [] }
```

To assign a restaurant, call `PUT /api/v1/admin/restaurants/{id}/owner` with the returned `sub` (now or later).

### Restaurant detail (response)

```json
{
  "id": "…", "name": "Spice Route", "description": null, "address": null, "city": "Kochi", "phone": null,
  "active": false, "owner": { "sub": "…", "username": "owner", "assignedAt": "…", "needsReassignment": false },
  "dishes": 0, "availableDishes": 0, "createdAt": "…", "updatedAt": "…", "version": 0
}
```

`owner.needsReassignment` is `true` for a link made before DEC-017 (it has no `sub` and grants nothing).

### Rules
- **Activation:** a restaurant can be activated only with at least one available dish.
- **Owner assignment:**
  - The owner must be an existing, enabled Keycloak account holding `RESTAURANT_OWNER`, checked with Keycloak on every assignment.
  - The application never grants roles. Make an account an owner in the Keycloak admin console first.
- **Logging:** every create, edit, status change and assignment is logged with the administrator's subject.

## order-service (port 8082), read-only

| Method and path | Purpose | Success | Errors |
|---|---|---|---|
| `GET /api/v1/admin/orders?page&size&restaurantId&status` | Orders across all restaurants, newest first | 200 page of orders (same shape as the owner view; no customer identity) | 400 `INVALID_QUERY` |
| `GET /api/v1/admin/orders/summary` | Totals and statistics | 200 | — |

```json
{
  "totalOrders": 120, "ordersToday": 9, "totalValue": 35000.00, "valueToday": 2400.00,
  "byStatus": { "PENDING_PAYMENT": 2, "ACCEPTED": 1, "REJECTED": 4, "PREPARING": 0, "READY_FOR_PICKUP": 0, "PICKED_UP": 113 },
  "restaurants": [ { "restaurantId": "…", "orders": 100, "ordersToday": 9, "lastOrderAt": "…" } ],
  "todayStartsAt": "2026-11-17T18:30:00Z", "timeZone": "Asia/Kolkata"
}
```

- **"Today"** is the calendar day in Asia/Kolkata.
- **Order value** excludes rejected orders.

## Keycloak

| Item | Purpose |
|---|---|
| Realm role `ADMIN` | Platform administrators |
| Confidential client `foodiehub-admin-api` | Its service account may **only read**: realm-management `view-users`, `query-users`, `view-realm`. restaurant-service uses it with `KEYCLOAK_ADMIN_API_CLIENT_SECRET`. Without the secret, owner features answer 503 and everything else works |
| Group `restaurant-owners` | Carries `RESTAURANT_OWNER`. Accounts created by administrators are placed here |
| Confidential client `foodiehub-owner-provisioner` (DEC-018) | **No realm-management roles.** Fine-grained admin permissions (v2, realm setting `adminPermissionsEnabled`) give it `view`, `view-members`, `manage-members`, `manage-membership` on the group `restaurant-owners` only. It can create accounts inside the group; it cannot grant roles, add existing accounts to the group, reset passwords of others, or read or change accounts outside the group. Used with `KEYCLOAK_OWNER_PROVISIONER_CLIENT_SECRET`; without it, `POST /owners` answers 503 |
| Development setup | `infra/keycloak/create-dev-admin.sh` (see the README). Production: create administrators, the group, the clients, their secrets and the group permission by hand in the admin console (Realm settings → Admin permissions; Permissions → Groups) |

**Why not `manage-users`:** tested against Keycloak 26.8.1, a client with `manage-users` can grant `ADMIN` to any account,
including itself, and reset any password. **Residual risk of the chosen setup:** a leaked provisioning secret can
update or delete the accounts that were created through it (members of the owners group); it cannot reach
administrators, customers or owners outside the group.
