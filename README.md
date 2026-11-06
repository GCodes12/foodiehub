# FoodieHub

FoodieHub is a food-ordering platform built as a **learning and portfolio project**. It is a
hands-on way to practise microservice design, OAuth2/OIDC security, and Spec-Driven Development (SDD).

> **Status: VS-1, CP-1 – CP-4 (backend) working locally.** Public restaurant and menu browsing, Keycloak sign-in,
> authenticated pickup ordering and owner-only order retrieval run locally against MySQL. **No payment is taken**:
> every order stays `PENDING_PAYMENT`. The web frontend and the gateway are not built yet.

## Planned MVP scope

The planned MVP (see [`docs/sdd/plan.md`](docs/sdd/plan.md)) covers:

- Customers browse restaurants and menus and place an order from **one restaurant per order**.
- Fulfilment chosen per order: **pickup** or **delivery by the restaurant's own staff** (no delivery-partner system).
- **Simulated payments only** — no real payment provider is integrated.
- Restaurant owners manage their menu and move orders through preparation states.
- Admins create restaurants and assign owners.
- In-app notifications on order status changes.

Out of scope for the MVP: real payment gateway, multi-restaurant carts, delivery partners or tracking,
reviews, promotions, multiple currencies, partial refunds, mobile apps.

## Planned technology stack

Implemented so far: Java 21, Spring Boot 4.1 (restaurant and order services), MySQL, Keycloak 26.8 (OIDC/JWT) and
Docker Compose (optional: MySQL, Keycloak). Everything else is planned.

| Area | Planned technology |
|---|---|
| Frontend | React + Vite |
| Backend | Java 21, Spring Boot microservices: Restaurant, Order, Payment, Notification |
| API gateway | Spring Cloud Gateway |
| Identity and access | Keycloak (OIDC/JWT) with Spring Security |
| Database | MySQL (a single container, with a separate database and users per service) |
| Service discovery | Consul (planned for a later milestone, M5) |
| Local infrastructure | Docker + Docker Compose |
| CI and code quality | Jenkins + SonarQube (planned; introduced at the end of M1) |

Exact versions will be verified before scaffolding. The Spring Boot 4.x line is selected on the
condition that a compatible Spring Cloud release train is confirmed first.

## Development status

| Item | Status |
|---|---|
| Current phase | **VS-1, CP-1 – CP-4 (backend)** — browse, sign in, place a pickup order, view your own order |
| Restaurant service | Implemented: list, detail and menu endpoints; Flyway schema; demo seed; tests |
| Order service | Implemented: `POST /api/v1/orders` (server pricing, snapshots, one transaction, idempotent) and `GET /api/v1/orders/{id}` (owner only); tests |
| Gateway, frontend, payment/notification services | Not started |
| Build files | Maven Wrapper + root aggregator POM; Docker Compose for MySQL only. CI pipelines: not created |
| Security controls | Keycloak realm `foodiehub`; order-service validates JWTs (issuer, signature, audience `order-service`); owner-only reads. Browsing stays public by design. **Not implemented:** gateway, roles (Q-23), authentication of the internal price lookup (SEC-005) |
| Payments | **Not available.** No payment processing of any kind exists |
| Documentation | SDD documents in [`docs/sdd/`](docs/sdd/) |

### Setup instructions (local development only)

The default setup uses a **MySQL Server installed directly on macOS**; Docker is not required to run the
restaurant service. An [optional Docker setup](#optional-docker-setup) is kept for CI and containerised use.

#### 1. Prerequisites

- **JDK 21.** Maven is not needed: use the Maven Wrapper (`./mvnw`).
- **MySQL Community Server 8.4 LTS**, installed with either:
  - the macOS DMG from dev.mysql.com (choose the ARM64 or x86_64 build). The installer asks you to set a
    `root` password; the client is then at `/usr/local/mysql/bin/mysql`; or
  - Homebrew: `brew install mysql@8.4` (client: `/opt/homebrew/opt/mysql@8.4/bin/mysql`).
- Use a **MySQL 8.x client**. An older client on your `PATH` (for example a MySQL 5.7 client from
  Anaconda) cannot log in to MySQL 8.4 accounts that use the default `caching_sha2_password` plugin.

#### 2. Start MySQL locally

- DMG install: **System Settings → MySQL → Start MySQL Server**, or
  `sudo /usr/local/mysql/support-files/mysql.server start`.
- Homebrew: `brew services start mysql@8.4`.

Only one server can listen on port 3306. If the Docker MySQL container is running, stop it first with
`docker compose stop mysql` (this keeps its data). Check what is listening with `lsof -nP -iTCP:3306 -sTCP:LISTEN`.

The service connects over **TCP**, so MySQL must be started normally. If it was started for password
recovery (`mysqld_safe --skip-grant-tables --skip-networking`), it does not listen on any port: stop it with
`sudo /usr/local/mysql/support-files/mysql.server stop` and start it normally as above.

Verify connectivity (prompts for the password):

```bash
/usr/local/mysql/bin/mysql -u root -p -h 127.0.0.1 -P 3306 -e "SELECT VERSION(), @@port;"
```

#### 3. Configure `.env`

```bash
cp .env.example .env     # .env is git-ignored
```

Edit `.env` and replace both `CHANGE_ME` passwords (`RESTAURANT_DB_MIGRATOR_PASSWORD`,
`RESTAURANT_DB_APP_PASSWORD`). Choose your own values; don't use quotes, backslashes, `$` or spaces.
`MYSQL_ROOT_PASSWORD` is only used by the optional Docker setup.

| Variable | Used for | Default |
|---|---|---|
| `RESTAURANT_DB_URL` | JDBC URL (optional) | `jdbc:mysql://${MYSQL_HOST}:${MYSQL_PORT}/restaurant_db` |
| `MYSQL_HOST`, `MYSQL_PORT` | Server location | `localhost`, `3306` |
| `RESTAURANT_DB_APP_USER` / `RESTAURANT_DB_APP_PASSWORD` | Runtime connection (SELECT only) | `restaurant_app` / — |
| `RESTAURANT_DB_MIGRATOR_USER` / `RESTAURANT_DB_MIGRATOR_PASSWORD` | Flyway migrations | `restaurant_migrator` / — |

The service reads `.env` from its working directory or from the repository root. Real environment
variables override `.env`.

**Quick local option — use your local `root` account for both connections.** Set in `.env`:

```properties
RESTAURANT_DB_URL=jdbc:mysql://localhost:3306/restaurant_db
RESTAURANT_DB_APP_USER=root
RESTAURANT_DB_APP_PASSWORD=<your local root password>
RESTAURANT_DB_MIGRATOR_USER=root
RESTAURANT_DB_MIGRATOR_PASSWORD=<your local root password>
```

Then create the database once (Flyway creates the tables; this never touches existing data):

```bash
/usr/local/mysql/bin/mysql -u root -p -h 127.0.0.1 -P 3306 \
  -e "CREATE DATABASE IF NOT EXISTS restaurant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
```

and skip step 4. This is convenient but gives the running service full admin rights; step 4's dedicated
accounts (migrator for DDL, SELECT-only app user) are the safer setup.

#### 4. Create the database and users (once)

From the repository root:

```bash
infra/mysql/local/setup-local-db.sh
```

It reads the four database passwords from `.env` (`RESTAURANT_DB_*`, `ORDER_DB_*`), prompts for the MySQL `root`
password, and runs [`infra/mysql/local/restaurant-db-setup.sql`](infra/mysql/local/restaurant-db-setup.sql) and
[`infra/mysql/local/order-db-setup.sql`](infra/mysql/local/order-db-setup.sql) (`order_db`; `order_app` gets
`SELECT` and `INSERT` only). The script is
non-destructive and safe to re-run: it creates `restaurant_db` and the two accounts only if they don't
exist (for `localhost` and `127.0.0.1`), grants the migrator DDL/DML on `restaurant_db` only and the app
user `SELECT` only, and drops nothing. If your client isn't found automatically, set `MYSQL_BIN`, e.g.
`MYSQL_BIN=/opt/homebrew/opt/mysql@8.4/bin/mysql infra/mysql/local/setup-local-db.sh`.

Alternatively, in a `mysql -u root -p` session started from the repository root:

```sql
SET @migrator_password = '<your RESTAURANT_DB_MIGRATOR_PASSWORD>';
SET @app_password      = '<your RESTAURANT_DB_APP_PASSWORD>';
SOURCE infra/mysql/local/restaurant-db-setup.sql;
```

The tables are **not** created here: Flyway creates them when the service starts.

#### 5. Start the restaurant service

**Maven Wrapper:**

```bash
cd services/restaurant-service
../../mvnw spring-boot:run -Dspring-boot.run.profiles=dev     # http://localhost:8081
```

**IntelliJ IDEA:** open the repository root (`pom.xml`) as a project, set the project SDK to JDK 21, then
**Run → Edit Configurations… → + →**

- *Ultimate:* **Spring Boot** — Main class `com.foodiehub.restaurant.RestaurantServiceApplication`,
  module `restaurant-service`, **Active profiles** `dev`.
- *Community:* **Application** — same main class and module, **VM options** `-Dspring.profiles.active=dev`.
- **Working directory:** `$MODULE_WORKING_DIR$` (or the repository root; both find `.env`).
- No environment variables are needed when `.env` exists; you can set them in the run configuration instead.

On startup, Flyway (as `RESTAURANT_DB_MIGRATOR_USER`) creates the `restaurant` and `menu_item` tables and,
under the `dev` profile only, inserts the demo restaurant and menu. Restarting does not duplicate data: Flyway
reports "Schema `restaurant_db` is up to date" and the seed only re-runs (as an upsert) if its file changes.

Verify the database after the first start:

```bash
/usr/local/mysql/bin/mysql -u root -p -h 127.0.0.1 -P 3306 restaurant_db -e \
  "SHOW TABLES; SELECT version, description, success FROM flyway_schema_history; SELECT COUNT(*) FROM menu_item;"
```

Expected: tables `flyway_schema_history`, `menu_item`, `restaurant`; two successful migrations; 4 menu items.

#### 6. Test the API with Bruno or Postman

Create a collection with a variable `baseUrl = http://localhost:8081` and these `GET` requests (no auth):

| Request | Expected |
|---|---|
| `{{baseUrl}}/api/v1/restaurants` | `200`: `[{"id":"00000000-0000-0000-0000-000000000001","name":"FoodieHub Demo Kitchen"}]` |
| `{{baseUrl}}/api/v1/restaurants/00000000-0000-0000-0000-000000000001` | `200`: the restaurant |
| `{{baseUrl}}/api/v1/restaurants/00000000-0000-0000-0000-000000000001/menu` | `200`: `currency` `INR`, 4 items, prices like `129.50`; one item has `"available": false` |
| `{{baseUrl}}/api/v1/restaurants/unknown-id` | `404`, `application/problem+json` (identical for inactive restaurants) |

#### 7. Start Keycloak (sign-in, CP-2)

Keycloak runs as a normal Java program; no Docker is needed. Install it once:

```bash
mkdir -p ~/dev-tools && cd ~/dev-tools
curl -fLO https://github.com/keycloak/keycloak/releases/download/26.8.1/keycloak-26.8.1.tar.gz
echo "4e2740b181faa2ea623a1c2ecf00855935311e546046e2f857615a47ed24cbe8  keycloak-26.8.1.tar.gz" | shasum -a 256 -c -
tar xzf keycloak-26.8.1.tar.gz && rm keycloak-26.8.1.tar.gz
```

In `.env`, set `KEYCLOAK_HOME` (e.g. `/Users/<you>/dev-tools/keycloak-26.8.1`), `KEYCLOAK_ADMIN_PASSWORD` and
`FOODIEHUB_DEMO_USER_PASSWORD`. Then, from the repository root:

```bash
infra/keycloak/start-local-keycloak.sh    # keep this terminal open; Ctrl+C stops Keycloak
infra/keycloak/create-dev-users.sh        # once, in a second terminal: creates the demo users alice and bob
```

- Keycloak listens on `http://localhost:8080` (bound to 127.0.0.1). Admin console: `http://localhost:8080/admin`
  (user `KEYCLOAK_ADMIN_USER`, password `KEYCLOAK_ADMIN_PASSWORD`; the admin is created on the first start only).
- On the first start the realm `foodiehub` is imported from [`infra/keycloak/foodiehub-realm.json`](infra/keycloak/foodiehub-realm.json)
  (no users or secrets in the file). It has two public clients:
  - `foodiehub-frontend`: for the future web app (authorization code + PKCE, `http://localhost:5173`);
  - `foodiehub-dev-cli`: **local testing only**, password grant for Bruno, Postman and curl.
- Tokens carry the audience `order-service`; the order service rejects tokens without it, tokens from other realms,
  and tokens with a bad signature or expired lifetime (15 minutes).

#### 8. Start the order service (CP-3, CP-4)

The order service needs MySQL (`order_db`), Keycloak and the restaurant service (for prices) to be running.
Create `order_db` once: `infra/mysql/local/setup-local-db.sh` does it (with dedicated `order_migrator` /
`order_app` accounts), or with the root option:
`/usr/local/mysql/bin/mysql -u root -p -h 127.0.0.1 -e "CREATE DATABASE IF NOT EXISTS order_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"`
(and set the `ORDER_DB_*` values in `.env` to match).

```bash
cd services/order-service
../../mvnw spring-boot:run -Dspring-boot.run.profiles=dev     # http://localhost:8082
```

IntelliJ: same as step 5, with main class `com.foodiehub.order.OrderServiceApplication`, module `order-service`,
active profile `dev`. Flyway creates `customer_order` and `order_item` on the first start.

| Port | Process |
|---|---|
| 3306 | MySQL |
| 8080 | Keycloak |
| 8081 | restaurant-service |
| 8082 | order-service |

#### 9. Place and view an order (Bruno or Postman)

**Get a token.** In the request's **Auth** tab choose *OAuth 2.0*, grant type *Password Credentials*:

| Field | Value |
|---|---|
| Access Token URL | `http://localhost:8080/realms/foodiehub/protocol/openid-connect/token` |
| Client ID | `foodiehub-dev-cli` (no client secret) |
| Username / Password | `alice` (or `bob`) / your `FOODIEHUB_DEMO_USER_PASSWORD` |

**Place an order:** `POST http://localhost:8082/api/v1/orders` with headers `Content-Type: application/json` and
`Idempotency-Key: <a new UUID per order>` (Postman: `{{$guid}}`; Bruno: `{{$randomUUID}}`), body:

```json
{
  "restaurantId": "00000000-0000-0000-0000-000000000001",
  "fulfilmentType": "PICKUP",
  "items": [
    { "menuItemId": "00000000-0000-0000-0001-000000000001", "quantity": 2 },
    { "menuItemId": "00000000-0000-0000-0001-000000000003", "quantity": 1 }
  ]
}
```

Expected: `201 Created`, a `Location` header, status `PENDING_PAYMENT`, item names and prices from the menu, and
`total` = 458.00. Any price or total you put in the body is ignored. **No payment is taken**; the order is not yet
accepted by the restaurant.

**View it:** `GET http://localhost:8082/api/v1/orders/{id}` with the same token → `200`. With bob's token → `404`.

| Status | When |
|---|---|
| `201` | Order created, or the same request retried with the same `Idempotency-Key` (header `Idempotent-Replayed: true`, same order) |
| `400` | Malformed or invalid request: no items, more than 20 lines, quantity not a whole number from 1 to 50, missing or invalid `Idempotency-Key`, fulfilment other than `PICKUP` |
| `401` | No token, expired token, wrong realm or audience, bad signature |
| `404` | Order does not exist **or** belongs to someone else (identical responses) |
| `409` | `Idempotency-Key` already used by you for a different request |
| `422` | Restaurant not available, item not on its menu, item unavailable, item listed twice, amount too large (`code` field says which) |
| `503` | Restaurant service unreachable: no order is created; retry with the same key |

Idempotency rules (implementation choices; DEC-006's details are not owner-approved yet): keys are 8–64 characters
(letters, digits, `-`, `_`; a UUID is recommended), scoped to the signed-in user, and kept with the order.

**curl** (the token is kept in a shell variable, not printed):

```bash
TOKEN=$(curl -s http://localhost:8080/realms/foodiehub/protocol/openid-connect/token \
  -d grant_type=password -d client_id=foodiehub-dev-cli -d username=alice \
  --data-urlencode "password=$(read -rsp 'Password: ' p; echo "$p")" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')
curl -i http://localhost:8082/api/v1/orders -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $(uuidgen)" \
  -H 'Content-Type: application/json' \
  -d '{"restaurantId":"00000000-0000-0000-0000-000000000001","fulfilmentType":"PICKUP","items":[{"menuItemId":"00000000-0000-0000-0001-000000000001","quantity":2}]}'
```

#### Troubleshooting

- **`Access denied for user 'restaurant_migrator'` (using password: YES)**:
  - the passwords in `.env` don't match the accounts in the MySQL server you are connected to (check the
    port 3306 owner, above); or
  - `.env` wasn't found, in which case Spring passes the literal `${...}` text as the password. Check the
    working directory.

  `CREATE USER IF NOT EXISTS` never changes an existing password. To align an existing account with `.env`,
  run as root, for each host (`localhost` and `127.0.0.1`):
  `ALTER USER 'restaurant_migrator'@'localhost' IDENTIFIED BY '<new password>';`
  (and likewise for `restaurant_app`).
- **`Public Key Retrieval is not allowed`**: the account was created but never logged in with a password
  over TLS. Log in once with the MySQL 8.4 client (`mysql -u restaurant_migrator -p -h 127.0.0.1`), or add
  `?allowPublicKeyRetrieval=true` to `RESTAURANT_DB_URL` for local development only.

#### Running the tests

From the repository root: `./mvnw verify` (both services). Unit and controller tests always run. The MySQL
integration tests use Testcontainers and are **skipped** when Docker is not running; they never use your local
MySQL. The order-service integration tests cover authentication, validation and bounds, server-side pricing,
snapshots, single-transaction storage, idempotency (including concurrent retries) and ownership; they use
simulated tokens and a mocked restaurant service. `JwtValidationTest` (no Docker needed) sends real signed tokens
through the service's token checks and expects `401` for a forged signature, a modified payload, an expired token,
the wrong issuer, a wrong or missing audience, an unsigned token and a malformed token. Tokens from the running
Keycloak are checked manually with steps 7–9.

#### Optional Docker setup

[`compose.yaml`](compose.yaml) starts MySQL 8.4 in a container on `127.0.0.1:3306` and creates
`restaurant_db`, `order_db` and their default accounts from `.env` (including `MYSQL_ROOT_PASSWORD`) via
[`infra/mysql/init/`](infra/mysql/init/). Use it **instead of** a local MySQL, not alongside it on the same port.

```bash
docker compose up -d mysql      # then start the service exactly as in step 5
docker compose stop mysql       # stop, keeping data
docker compose --profile keycloak up -d keycloak   # optional: Keycloak in a container instead of step 7
```

The container creates its accounts only when its data volume is first initialised; passwords changed in
`.env` afterwards are not applied. Either use `ALTER USER` inside the container, or reset it with
`docker compose down -v` (this **deletes** the container's database). If `docker` is not found after
installing Docker Desktop, add `~/.docker/bin` to your `PATH`.

## Milestones (planned)

| Milestone | Planned focus |
|---|---|
| M0 | Repository foundation, toolchain, SDD documents |
| M1 | Public browsing of restaurants and menus (frontend → gateway → restaurant service) |
| CI-1 | Jenkins + SonarQube against the M1 code (end of M1) |
| M2 | Authenticated checkout with Keycloak; order service |
| M3 | Simulated payments, order expiry and refunds |
| M4 | Restaurant-owner workflow, admin functions, notifications |
| M5 | Hardening: Consul discovery, resilience, container images, end-to-end tests |

Milestone scope is still subject to approval and may change; [`docs/sdd/plan.md`](docs/sdd/plan.md) is the source of truth.

## Documentation

Project documentation follows Spec-Driven Development and lives in [`docs/sdd/`](docs/sdd/).
Currently available:

- [`docs/sdd/plan.md`](docs/sdd/plan.md) — the overall plan, approval checklist, architecture and milestones.
- [`docs/sdd/raw-requirement.md`](docs/sdd/raw-requirement.md) — reconstructed owner requirements.
- [`docs/sdd/clarification.md`](docs/sdd/clarification.md) — open questions and recorded owner decisions (DEC-001 – DEC-012).
- [`docs/sdd/spec.md`](docs/sdd/spec.md) — VS-1 specification (draft).
- [`docs/sdd/data-model.md`](docs/sdd/data-model.md) — logical data model (draft).

API contracts, ADRs, tasks, test strategy and DevOps documents do not exist yet.
