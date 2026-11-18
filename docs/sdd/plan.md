**Ready for review**

Select text to add comments on the plan

# FoodieHub — Final Plan (v7; architecture direction approved, checklist pending)

## Context

**Verified repository status (re-inspected 2026-11-03, read-only):**

- `/Users/gauravbhandari/Desktop/foodiehub` is a git repository on branch `main`, tracking `origin/main` (remote `origin` = `https://github.com/GCodes12/foodiehub.git`). It was in sync at the last fetch; no network fetch was run.
- One commit: `772d8c6 chore: initialize FoodieHub repository` with two **empty** files, `.gitignore` and `README.md`. The working tree is clean; no untracked files; no git hooks installed.
- No application code, SDD docs, build files or infrastructure yet. The project is still greenfield.
- **Not verified:** GitHub branch protection, secret scanning, Dependabot and repository visibility (`gh` CLI is not installed). These are M0 tasks (§11).
- Local toolchain (unchanged): git 2.54, Node 23.11 (non-LTS); **no JDK, Maven or Docker**. The stack is fixed: React+Vite, Spring Boot microservices, Spring Cloud Gateway, Consul, Keycloak (OIDC/JWT), MySQL, Jenkins, SonarQube, Docker Compose, Spec-Driven Development (SDD). Nothing is implemented, installed, committed or started until this plan is approved.

**v4 changes vs v3:** the payment/cancel race is resolved with a Payment-side *order payment guard* (it replaces the `succeeded_order_id` column); refunds are a separate entity with a defined retry, give-up and reconciliation policy; `refundStatus` gains `REFUND_FAILED`; delivery serviceability and fee rules are fully specified (still PROPOSED); `expectedTotal` price-change protection is added; internal and admin-refund endpoints are added to the API table.

**v5 changes vs v4 (clarifications only; no scope or architecture change):** ownership and reconciliation of `UNKNOWN` payment attempts (§4.6, P8); an explicit refund amount/policy (§4.7, P7, replaces OPEN-08); the temporary M2 unpaid-order limitation (§9.1); an approval checklist that separates "approve now" from "OPEN until a milestone gate" (§0).

**v6 changes vs v5 (clarifications only):** refund idempotency when the outcome is uncertain, including admin retry (§4.8, P9); M3 expiry of legacy M2 orders and their missing guards (§9.2, P10); explicit test cases for both (§12).

**v7 changes vs v6 (documentation only):** the Context now shows the verified Git/GitHub setup; §4.9 documents the requirements for a future real payment gateway (post-MVP, nothing built now); new OPEN-21 (provider choice); the checklist records that only the architecture direction is approved.

---

## 0. Approval checklist

**Status (2026-11-03):** the **technical direction and architecture are approved** (D1–D11, service boundaries, data ownership, guard/outbox/reconciliation mechanisms). **Every item in Parts A and B is still PENDING/OPEN.** Approving the architecture does not approve these business proposals or answers. Business proposals: A-1, A-3, A-4, A-6, A-8, A-9 · technical proposals: A-2, A-5, A-7, A-13, A-14 · open answers needed: A-10, A-11, A-12.

### Part A — needs your approval/answer now (shapes the M0 SDD documents and M1) — mixed status

| #    | Item                   | Proposal                                                                                                                                       | Ref    |
| :--- | :--------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- | :----- |
| A-1  | MVP scope + milestones | Stories US-01…US-10; M0–M5                                                                                                                     | §3, §9 |
| A-2  | P6 CI timing           | Jenkins + SonarQube at the end of M1 (CI-1), a required PR check from M2; never needed for local builds                                        | §9     |
| A-3  | Assumptions A1–A6      | as listed                                                                                                                                      | §1     |
| A-4  | P1 race policy         | Customer cancel wins and money is refunded; system expiry yields to a payment that succeeded before the deadline                               | §4.3   |
| A-5  | P8 UNKNOWN semantics   | UNKNOWN exists only in Order; Payment is the source of truth; resolved by same-key re-drive or guard close; one active attempt per order       | §4.6   |
| A-6  | P7 refund policy       | Full captured amount incl. delivery fee; only cancel/reject before `ACCEPTED`; no fees, no partial refunds                                     | §4.7   |
| A-7  | P2 refund retry        | Outbox + backoff, `REFUND_FAILED` + admin retry, 5-min reconciliation sweep                                                                    | §4.4   |
| A-8  | P3–P5 delivery rules   | PIN-list serviceability, flat per-restaurant fee, `expectedTotal` check                                                                        | §5     |
| A-9  | M2 limitation          | Accept unpayable `PENDING_PAYMENT` orders as temporary and dev-only                                                                            | §9.1   |
| A-10 | OPEN-05                | **DECIDED:** solo developer; no mandatory second reviewer. Use self-review + automated checks; protect main without an impossible approval requirement | §11    |
| A-11 | OPEN-06                | **DECIDED (conditional):** Spring Boot 4.x; verify compatible Spring Cloud train and exact dependencies before scaffolding (official mapping: Boot 4.0.x ↔ Cloud 2025.1.x) | §10 |
| A-12 | OPEN-17                | **DECIDED:** INR (₹), single currency for MVP                                                                                                 | §5.3   |
| A-13 | P9 refund idempotency  | One refund row per order with a deterministic key; FAILED is retryable, SUCCEEDED is replayed; admin retry only re-queues after a status check | §4.8   |
| A-14 | P10 legacy M2 expiry   | No special code path; close creates a CLOSED guard; expiry is enabled only after Payment is up                                                 | §9.2   |

> **VS-1 decision note (2026-11-05):** owner decisions DEC-001 – DEC-013 are recorded in `docs/sdd/clarification.md` §9.2 and
> take precedence over this plan for VS-1. DEC-013 settles the checkout validation set, technical bounds (≤ 20 lines, quantity 1–50),
> order money (`DECIMAL(10,2)` INR, no tax or fees), owner-only order reads (404 otherwise), the internal REST price lookup, and
> VS-1 unpaid-order handling (stay `PENDING_PAYMENT`, no automatic expiry, several per customer). The rest of this plan is unchanged.
>
> **Implementation status note (2026-11-06):** DEC-014 – DEC-016 (`clarification.md` §9.2; requirements in `spec.md` §16)
> brought parts of later milestones forward, in reduced form: the customer order list (US-04, list only), owner menu
> edits (part of US-06: availability, price, description, labels — no adding or removing dishes) and the restaurant
> workflow (US-07: accept / reject / preparing / ready / picked up, paid at the counter). Roles `CUSTOMER` and
> `RESTAURANT_OWNER` exist; the administrator role and US-09 do not. Payment (M3), notifications (US-08), delivery
> (US-10), cancellation (US-05) and the gateway are unchanged and not started. The customer frontend is branded
> ZAYORA. The milestone definitions below are otherwise unchanged.
>
> **Implementation status note (2026-11-18):** DEC-017 adds the `ADMIN` role and most of US-09: administrators create,
> edit, activate and deactivate restaurants, assign or re-assign owners (verified with Keycloak; roles are never granted
> by the application), and see a platform overview (counts, orders across restaurants, per-restaurant activity).
> Ownership moved from username to the token `sub`. Failed-refund handling (the rest of US-09) waits for payment (M3).
> Endpoints: `api-admin.md`.
> DEC-018 (same day) lets administrators create owner accounts (a separate, group-scoped Keycloak provisioning client)
> and assign them a restaurant now or later.
> DEC-019 brings the M5 discovery work forward: the API gateway (D2, D3) and Consul discovery with load balancing are
> implemented; resilience stays in M5. The backend runs Spring Boot 4.0.9 + Spring Cloud 2025.1.4 (no GA Spring Cloud for
> Boot 4.1 yet).

### Part B — safe to keep OPEN until its gate (must be answered before that milestone starts; suggested values are not adopted until answered)

| OPEN    | Question                                                               | Gate             | Why deferral is safe                                                         |
| :------ | :--------------------------------------------------------------------- | :--------------- | :--------------------------------------------------------------------------- |
| OPEN-10 | Idempotency-key retention (suggested 24 h)                             | M2               | config value only                                                            |
| OPEN-11 | Free-delivery threshold                                                | M2 (or post-MVP) | additive to the fee calculation                                              |
| OPEN-12 | Minimum order value                                                    | M2 (or post-MVP) | additive validation                                                          |
| OPEN-13 | One pending (unpaid) order per customer? **VS-1: several allowed (DEC-013, `clarification.md` §9.2)**; final policy still open | M2 | additive rule |
| OPEN-19 | Contact-phone format (suggested Indian 10-digit mobile)                | M2               | validation only                                                              |
| OPEN-09 | Payment deadline (suggested 15 min)                                    | M3               | M2 stores `paymentDeadline` from a dev-only config value (§9.1)              |
| OPEN-18 | Refund give-up window (suggested 24 h)                                 | M3               | config value                                                                 |
| OPEN-07 | Restaurant acceptance timeout                                          | M4               | if yes, it reuses the reject + refund path                                   |
| OPEN-15 | Opening hours / accepting-orders toggle                                | M4               | additive check in the quote                                                  |
| OPEN-20 | Restaurant/admin cancellation after `ACCEPTED` (e.g. an item runs out) | M4 (or post-MVP) | the MVP blocks it with `409`; no refund path is needed                       |
| OPEN-14 | Saved addresses                                                        | post-MVP         | the per-order address snapshot is unaffected                                 |
| OPEN-16 | Owner reassignment                                                     | post-MVP         | the MVP relies on A3; the `restaurantOwnerId` snapshot would need revisiting |
| OPEN-21 | Real payment provider choice and integration timing                    | post-MVP         | the MVP is simulated; requirements are documented in §4.9                    |

---

## 1. Requirement status

**Confirmed (user):** the services and stack above; simulated payments; one restaurant per order; no delivery partners; JDK 21, Maven Wrapper, Node LTS; thin slice first; CI must not block local development.

**Decided by the user (2026-11-03):** D8 synchronous REST + transactional outbox, no broker · D9 fulfilment chosen per order (`PICKUP` | `SELF_DELIVERY`, restaurant's own staff) · D10 Keycloak enforced in M2, designed from M0 · D11 one MySQL container, one DB + users per service.

**Architecture decisions (ADRs):** D1 DB per service · D2 gateway is the only public entry · D3 JWT validated at the gateway **and** in every service · D4 idempotency keys on checkout, payment and refund · D5 prices/fees snapshotted at order creation · D6 money as `DECIMAL(10,2)`, HALF_UP rounding · D7 OpenAPI 3.1, `/api/v1`, RFC 9457 errors.

**Proposed for approval:** P1 race policy (§4.3) · P2 refund retry (§4.4) · P3 PIN serviceability (§5.1) · P4 flat delivery fee (§5.2) · P5 `expectedTotal` (§5.3) · P6 CI-1 timing (§9) · P7 refund policy (§4.7) · P8 UNKNOWN attempt semantics (§4.6) · P9 refund idempotency (§4.8) · P10 legacy M2 expiry (§9.2).

**Assumptions:** A1 GitHub monorepo · A2 single currency, no tax or coupons · A3 admin creates restaurants and assigns one owner · A4 customers self-register in Keycloak · A5 in-app notifications only · A6 local development only.

**OPEN items** (never filled in by guessing): see §0. Part A must be answered now; Part B stays OPEN until its milestone gate. OPEN-08 is replaced by proposal P7.

---

## 2. SDD documents (`docs/sdd/`)

Authoring order: raw-requirement → clarification → constitution → spec → plan → data-model → api-contract (+ `contracts/*.openapi.yaml`) → architecture-decisions → tasks → test → traceability → devops. IDs are defined once (US/AC in spec, T in tasks, TC in test) and only referenced elsewhere; every PR that changes behaviour updates traceability. OPEN/P items live in clarification.md, with the answer date.

## 3. MVP stories

| ID    | Story                                                             | Role                    | Milestone |
| :---- | :---------------------------------------------------------------- | :---------------------- | :-------- |
| US-01 | Browse active restaurants and menus                               | public                  | M1        |
| US-10 | Delivery serviceability + fee shown at checkout                   | public check / CUSTOMER | M2        |
| US-02 | Checkout: create an order (pickup / self-delivery)                | CUSTOMER                | M2        |
| US-04 | View own orders                                                   | CUSTOMER                | M2        |
| US-05 | Cancel an order (unpaid in M2; paid + refund in M3)               | CUSTOMER                | M2/M3     |
| US-03 | Simulated payment                                                 | CUSTOMER                | M3        |
| US-06 | Manage own restaurant's menu, fee and PINs                        | RESTAURANT_OWNER        | M4        |
| US-07 | Accept/reject orders and advance the states                       | RESTAURANT_OWNER        | M4        |
| US-08 | Status-change notifications                                       | CUSTOMER                | M4        |
| US-09 | Admin creates restaurants, assigns owners, handles failed refunds | ADMIN                   | M4        |

Out of scope: real payment gateway, multi-restaurant carts, delivery partners/tracking, reviews, promotions, multiple currencies, partial refunds, mobile apps.

---

## 4. Orders, payments, races and refunds

### 4.1 Order state machine (owned only by Order Service; history table; optimistic `version`)

```
PENDING_PAYMENT ─pay ok─▶ PAID ─accept─▶ ACCEPTED ─▶ PREPARING ─┬▶ READY_FOR_PICKUP ─▶ COMPLETED  (PICKUP)
   │                       │                                     └▶ OUT_FOR_DELIVERY ─▶ COMPLETED  (SELF_DELIVERY)
   │                       ├─customer cancel─▶ CANCELLED (+refund)
   │                       └─owner reject────▶ REJECTED  (+refund, reason code required)
   ├─customer cancel─▶ CANCELLED (+refund only if a late payment had succeeded, §4.3)
   └─deadline passed AND Payment confirms CLOSED─▶ EXPIRED (no money is ever held)

```

`refundStatus` (separate from the status): `NONE → REFUND_PENDING → REFUNDED`; `REFUND_PENDING → REFUND_FAILED`; `REFUND_FAILED → REFUND_PENDING` (admin retry) or `→ REFUNDED` (reconciliation). See §4.8. A transition that does not match the order's `fulfilmentType`, or a cancel from `ACCEPTED` onward → `409`. Every transition is a conditional update (`WHERE id=? AND status=? AND version=?`). For concurrent actions (e.g. customer cancel vs owner accept on a `PAID` order), the first commit wins and the other gets `409`.

### 4.2 Payment Service model

- **Order payment guard** `order_payment_guard(order_id PK, state OPEN|SUCCEEDED|CLOSED, expires_at, succeeded_key, captured_amount)`: the single serialization point for money on an order.
- **Payment attempt** `SUCCEEDED | FAILED`, unique on `(order_id, idempotency_key)` (failure reasons: `DECLINED_SIMULATED`, `ORDER_CLOSED`, `EXPIRED`, `ALREADY_PAID`). The simulated charge runs in a single DB transaction, so an attempt either exists with a final outcome or does not exist at all. **Payment never reports UNKNOWN.**
- **Refund** (separate entity, one row per order, PK `order_id`): `FAILED` (retryable) or `SUCCEEDED` (final); see §4.8. A test flag can force a simulated refund to fail, so the retry path can be tested.
- **Charge** (`POST /internal/payments`): upsert the guard (OPEN, `expires_at` from Order), lock it with `SELECT … FOR UPDATE`, and succeed only if `state=OPEN AND NOW() < expires_at`; set the guard to SUCCEEDED in the same transaction. The guard therefore enforces at most one successful payment per order. MySQL server time is the authoritative clock.
- **Close** (`POST /internal/payment-orders/{orderId}/close`): upsert the guard as CLOSED if missing (so a charge that arrives after the close fails), or `OPEN → CLOSED` under the row lock. Returns the final state: `CLOSED` (no money taken) or `SUCCEEDED` (money taken). Idempotent.

### 4.3 Payment ↔ cancellation race (P1 — proposed policy)

Principle: **customer cancel wins and money is refunded; system expiry yields to a successful payment.**

| Race                                                                                                  | Outcome                                                                                                                                                                                                                                                                                                |
| :---------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cancel while a charge is in flight                                                                    | Order commits `CANCELLED` immediately and writes an outbox `ClosePayment` event. Payment serializes close vs charge on the guard row. If the charge won → close returns `SUCCEEDED` → Order sets `REFUND_PENDING` + outbox `RefundRequested`. If the close won → the charge fails with `ORDER_CLOSED`. |
| Late `SUCCEEDED` response reaches Order for a `CANCELLED` order                                       | Not applied as `PAID`; the attempt is recorded; `REFUND_PENDING` is set if not already. A refund triggered by both paths stays a single refund (key `refund-{orderId}`).                                                                                                                               |
| Pay request on a `CANCELLED`/`EXPIRED` order                                                          | Order rejects it with `409` without calling Payment; the guard is the backstop.                                                                                                                                                                                                                        |
| Expiry job vs in-flight charge                                                                        | Expiry calls close synchronously. `CLOSED` → `EXPIRED`. `SUCCEEDED` (paid before the deadline) → `PAID`. Payment unreachable → stay `PENDING_PAYMENT` and retry; **an order never expires while the payment outcome is unknown.**                                                                      |
| Charge times out or errors at Order                                                                   | The local attempt becomes `UNKNOWN` and is resolved per §4.6; the order stays `PENDING_PAYMENT`.                                                                                                                                                                                                       |
| Cancel vs owner accept/reject on `PAID`                                                               | Optimistic lock decides; the loser gets `409`.                                                                                                                                                                                                                                                         |
| Consequence: `EXPIRED` orders never hold money; `CANCELLED` orders may briefly show `REFUND_PENDING`. |                                                                                                                                                                                                                                                                                                        |

### 4.4 Refund retry and reconciliation (P2; give-up window = OPEN-18)

- **Trigger:** paid cancel, owner reject, or close/late success on a cancelled order. `REFUND_PENDING` and the outbox `RefundRequested{orderId, amount = captured amount (§4.7)}` are written in the same transaction as the state change.
- **Outbox** `outbox_event(id, aggregate_id, type, payload, status PENDING|SENT|FAILED, attempts, next_attempt_at, last_error)`; the poller claims rows with `FOR UPDATE SKIP LOCKED` (MySQL 8), so it is safe with multiple instances.
- **Call:** `POST /internal/refunds` with Idempotency-Key `refund-{orderId}`; uncertain outcomes are handled per §4.8.
- **Retry:** exponential backoff with jitter: 5 s, 15 s, 1 m, 5 m, 15 m, then every 30 m. Timeout/5xx/connection error → retry. Response "already refunded" → treated as success. Contract/4xx error (e.g. no successful payment exists) → no retry; `REFUND_FAILED`. Still failing after the give-up window (proposed 24 h, OPEN-18) → `REFUND_FAILED`.
- **REFUND_FAILED handling:** a metric plus a WARN log carrying `orderId` (no PII); admin views `GET /api/v1/admin/refunds?status=REFUND_FAILED` (with a reason) and retries per §4.8.
- **Reconciliation sweep** (every 5 min, guards against bugs/drift): for `CANCELLED`/`REJECTED` orders from the last 7 days with `refundStatus ≠ REFUNDED`, plus `REFUND_FAILED` orders of any age, compare with `GET /internal/payment-orders/{orderId}`: Payment says refunded → mark `REFUNDED`; Payment says SUCCEEDED and not refunded with no pending outbox row → re-enqueue; Payment says CLOSED with no money taken → `refundStatus = NONE`.
- **Success:** `REFUNDED` + outbox `NotificationRequested` (M4).
- Metrics: `refunds_pending`, oldest pending age, `refunds_failed`.

### 4.5 Checkout and payment idempotency

- `POST /orders` requires `Idempotency-Key`; unique `(customer_id, idempotency_key)` → a double-click returns the same order.
- `POST /orders/{id}/payments` requires `Idempotency-Key`, scoped to the customer and order, with a stored request hash: same key + same payload → stored response; different payload → `422`; same key still in flight → `409`; retention per OPEN-10. Order passes the same key on to Payment.

### 4.6 UNKNOWN payment attempts — ownership and reconciliation (P8)

- **Ownership:** Payment Service is the only source of truth for whether money was taken. `UNKNOWN` is **never a Payment state**. It exists only in Order Service's local tracking table `order_payment_attempt(order_id, idempotency_key, status IN_FLIGHT|UNKNOWN|SUCCEEDED|FAILED, failure_reason, last_checked_at)`. Only Order Service runs payment reconciliation.
- **Entering UNKNOWN:** the charge call times out (proposed 3 s), the connection fails, or Payment returns 5xx or `409 in progress`. An attempt left `IN_FLIGHT` by an Order crash becomes UNKNOWN after 30 s.
- **One active attempt per order:** while an attempt is `IN_FLIGHT`/`UNKNOWN`, a payment request with a *different* key → `409 PAYMENT_IN_PROGRESS`; the *same* key → `202` with `paymentStatus: PROCESSING`. This prevents two parallel charges.
- **Resolution job** (every 30 s, per-attempt backoff up to 5 min) calls `GET /internal/payment-orders/{orderId}` (guard state, attempts by key, refund):

| Payment reports                                                  | Order does                                                                                                                                                               |
| :--------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attempt SUCCEEDED                                                | attempt → SUCCEEDED; order `PENDING_PAYMENT → PAID`; if the order is already `CANCELLED` → refund path (§4.3)                                                            |
| Attempt FAILED                                                   | attempt → FAILED with reason; order stays `PENDING_PAYMENT`; customer may retry with a new key                                                                           |
| Attempt not found, guard OPEN, order `PENDING_PAYMENT`           | **Re-drive:** resend the charge with the same key (idempotent, so it can never charge twice) and apply the result. After the deadline Payment answers `EXPIRED` → FAILED |
| Attempt not found, order `CANCELLED` (close still in the outbox) | No re-drive; wait for the close result                                                                                                                                   |
| Guard CLOSED, attempt not found                                  | attempt → FAILED(`ORDER_CLOSED`); final, because a closed guard blocks any later success                                                                                 |
| Payment unreachable                                              | stays UNKNOWN; retried; the order never expires while it is UNKNOWN                                                                                                      |

- **Finality:** a guard close (from cancel or expiry) settles every unresolved attempt of that order. `CLOSED` → all become FAILED; `SUCCEEDED` → the attempt matching `succeeded_key` becomes SUCCEEDED and the others FAILED.
- **Visibility:** the API shows `paymentStatus: PROCESSING` for IN_FLIGHT/UNKNOWN; a metric + WARN fire for any attempt that stays UNKNOWN longer than 10 min.

### 4.7 Refund amount and policy (P7 — replaces OPEN-08)

- **Amount:** always the full amount captured by the successful attempt (`captured_amount` on the guard), which equals the order's snapshotted `total = itemsSubtotal + deliveryFee`. **The delivery fee is always refunded**, because no delivery took place. No cancellation fees, no partial refunds, at most one refund per order. Payment rejects a refund whose amount ≠ the captured amount (`422`).

| Case                                                                    | Allowed    | Money taken                   | Refund                       |
| :---------------------------------------------------------------------- | :--------- | :---------------------------- | :--------------------------- |
| Customer cancels `PENDING_PAYMENT`, no successful payment               | yes        | no                            | none (`refundStatus = NONE`) |
| Customer cancels `PENDING_PAYMENT`, a payment succeeded during the race | yes        | yes                           | full, automatic              |
| Customer cancels `PAID` (before `ACCEPTED`)                             | yes        | yes                           | full, automatic              |
| Owner rejects `PAID` (reason code required)                             | yes        | yes                           | full, automatic              |
| `EXPIRED`                                                               | system     | never (the guard prevents it) | none                         |
| Cancel/reject at `ACCEPTED` or later                                    | no → `409` | —                             | none in MVP (OPEN-20)        |

Pickup orders carry `deliveryFee = 0.00`, so the same rule applies.

### 4.8 Refund idempotency when the outcome is uncertain (P9)

- **Refund identity = the order.** Payment keeps at most one refund row per order (PK `order_id`), and the key `refund-{orderId}` is deterministic. Every retry — from the outbox poller, the reconciliation sweep or an admin — addresses the same row, so a second refund can never be created.
- **Money moves exactly once:** Payment locks the refund row (`SELECT … FOR UPDATE`, creating it if missing) and runs the simulated movement plus `→ SUCCEEDED` in **one transaction**.
  - Row is SUCCEEDED → the stored success is returned; no money moves.
  - Row is FAILED → the refund is attempted again on the same row (a FAILED attempt moved no money, so this is safe; only SUCCEEDED responses are replayed).
  - Row is locked by a concurrent request → `409 REFUND_IN_PROGRESS`, and the caller retries.
  - Amount ≠ `captured_amount` → `422`.
- **Uncertain outcome at Order** (timeout, lost response, crash): Order never assumes a result. `refundStatus` stays `REFUND_PENDING`; the outbox row is retried with the same key and converges to Payment's truth (if the first call had in fact succeeded, the retry returns that stored success).
- **Giving up** (end of the OPEN-18 window): one final status query via `GET /internal/payment-orders/{orderId}`. If Payment says refunded → `REFUNDED`. If Payment is unreachable → `REFUND_FAILED`, reason `OUTCOME_UNKNOWN`. If Payment rejected the refund (e.g. `NO_CAPTURE`) → `REFUND_FAILED`, reason `REJECTED_BY_PAYMENT`. `REFUND_FAILED` is **never final for reconciliation**: the sweep moves it to `REFUNDED` as soon as Payment confirms.
- **Admin retry** `POST /api/v1/admin/orders/{id}/refund/retry` (ADMIN only; audited with the admin's `sub` and the time):
  1. Allowed only from `REFUND_FAILED`. From `REFUND_PENDING` → `409 REFUND_IN_PROGRESS`; from `REFUNDED` → `200` no-op.
  2. It first queries Payment's status; if the refund already happened → `REFUNDED`, and no new request is sent.
  3. Otherwise a conditional update `REFUND_FAILED → REFUND_PENDING` re-queues the **same** outbox event (same key, same captured amount). A double-click loses the conditional update → `409`.
  4. Admin never calls Payment's refund endpoint directly and cannot change the amount.

### 4.9 Future real payment gateway (post-MVP — documentation only, nothing built in the MVP; OPEN-21)

The simulated design is exactly-once only because Payment Service moves the "money" inside its own DB transaction (§4.2, §4.8). A real provider moves money outside that transaction, so integrating one **requires**:

- **Provider-side idempotency:** every charge and refund sends a provider idempotency key derived from ours (charge → the attempt's Idempotency-Key; refund → `refund-{orderId}`) plus our merchant reference (`orderId`). Every resend after a timeout reuses the same key. If a provider has no idempotency keys, Payment must first look up an existing payment/refund by merchant reference before resending.
- **Provider-pending states:** attempts and refunds gain an intermediate `PROCESSING_AT_PROVIDER` state. "Not found locally" may no longer be read as "never happened"; the UNKNOWN re-drive (§4.6) becomes a provider status lookup by reference before any resend.
- **External payment and refund reconciliation:**
  - signed provider webhooks (signature verified, de-duplicated by provider event ID, processed idempotently);
  - a scheduled status poll for every non-final payment and refund, because webhooks can be lost;
  - a daily settlement-report match (our ledger vs the provider's, covering amounts, captures and refunds), with mismatches raised to admin. A refund becomes `REFUNDED` only after the provider confirms it; refunds the provider failed or reversed go to `REFUND_FAILED`.
- **Security/compliance:** card data never reaches our services (provider-hosted checkout/tokenisation); provider keys in a secrets manager; the webhook endpoint is the only provider-facing route.
- **Containment:** the current contracts (Order orchestrates, Payment owns money, deterministic keys) are kept so that the swap stays inside Payment Service. M0 records this as an ADR ("future payment provider") only.

---

## 5. Delivery serviceability, address and fees (all PROPOSED until approved)

### 5.1 Serviceability (P3)

- Restaurant flags `supportsPickup`, `supportsSelfDelivery`; table `restaurant_serviceable_pin(restaurant_id, pin_code)` (composite PK). Seeded in M2; owner-managed in M4.
- PIN format `^[1-9][0-9]{5}$`. **Format check only** — no postal dataset, so the plan does not verify that the PIN exists or that city/state match it (documented limitation).
- Serviceable ⇔ `SELF_DELIVERY` supported AND PIN ∈ set. Errors: `422 FULFILMENT_NOT_SUPPORTED`, `422 ADDRESS_NOT_SERVICEABLE`, `422 INVALID_PIN`.
- UX pre-check (public, returns only a boolean + fee): `GET /api/v1/restaurants/{id}/serviceability?pin=`. **The only authoritative check is the quote taken during order creation.**
- Evaluated once at creation; later PIN-list changes never affect existing orders.

### 5.2 Delivery fee (P4)

- Flat `deliveryFee DECIMAL(10,2) ≥ 0` per restaurant; `PICKUP` → `0.00`. No distance- or weight-based pricing. A free-delivery threshold (OPEN-11) and a minimum order value (OPEN-12) are **not modelled** until decided.
- Restaurant owns the fee config and returns it in `POST /internal/restaurants/{id}/order-quote` (items, availability, unit prices, fulfilment support, serviceability, fee, `ownerId`).

### 5.3 Totals, snapshots and address

- Order computes `itemsSubtotal = Σ unitPrice × qty`, `total = itemsSubtotal + deliveryFee`, HALF_UP 2 dp, with a single currency (OPEN-17). The order stores line snapshots (name, unitPrice, qty), `itemsSubtotal`, `deliveryFee`, `total`, `currency`, `restaurantOwnerId`. These are immutable after creation.
- **P5:** the client sends `expectedTotal`; a mismatch with the server's calculation → `409 PRICE_CHANGED` with the fresh breakdown, and no order is created. Any client-sent price is otherwise ignored.
- Address (required for `SELF_DELIVERY`): line1, line2?, landmark?, city, state, PIN, contact phone (format per OPEN-19). Snapshotted in `order_delivery_address`; visible only to the customer, that order's restaurant owner and admin; never logged. No address book (OPEN-14).

---

## 6. Security

- Realm `foodiehub`; realm roles `CUSTOMER`, `RESTAURANT_OWNER`, `ADMIN` → `ROLE_*` via a `realm_access.roles` converter.
- `foodiehub-web`: public client, Authorization Code + PKCE, token kept in memory, 5-minute access tokens.
- Confidential service-account clients (client credentials) and scopes: order-service → `restaurant:quote`, `payment:charge`, `payment:read`, `payment:refund`; order-service → `notification:send` (M4).
- Ownership: restaurant changes need `ownerId == sub`; order reads need `customerId == sub`, otherwise `404`; owner order actions need `restaurantOwnerId == sub`; ADMIN has full access.
- `/internal/**` is never routed by the gateway; services are reachable only on the internal Docker network.
- Never unauthenticated: any `/orders`, `/owner`, `/admin` or `/notifications` endpoint.

## 7. MySQL — logical isolation (D11)

One `mysql:8.4` container; `restaurant_db` (M1), `order_db` (M2), `payment_db` (M3), `notification_db` (M4), each created when first needed. Per service: `<svc>_migrator` (DDL on its own DB, Flyway only) and `<svc>_app` (DML on its own DB); no cross-DB grants; root is never used by services; passwords come from `.env`. Each service owns its migrations (`src/main/resources/db/migration`); seed data lives in dev-profile-only migrations. ADR caveat: shared failure domain/resources — this is logical isolation, not physical; the path to separate instances is documented.

## 8. API (gateway `/api/v1`) and internal endpoints

| Endpoint                                                                                                        | Access                        | M  |
| :-------------------------------------------------------------------------------------------------------------- | :---------------------------- | :- |
| `GET /restaurants`, `GET /restaurants/{id}/menu`                                                                | public                        | M1 |
| `GET /restaurants/{id}/serviceability?pin=`                                                                     | public                        | M2 |
| `POST /orders`, `GET /orders`, `GET /orders/{id}`, `POST /orders/{id}/cancel`                                   | CUSTOMER (+ owner/admin read) | M2 |
| `POST /orders/{id}/payments`                                                                                    | CUSTOMER                      | M3 |
| `POST /orders/{id}/accept`, `/reject`, `/status`; `GET /owner/restaurants/{id}/orders`; owner menu/fee/PIN CRUD | RESTAURANT_OWNER              | M4 |
| `POST /admin/restaurants`; `GET /admin/refunds`; `POST /admin/orders/{id}/refund/retry`                         | ADMIN                         | M4 |
| `GET /notifications`                                                                                            | authenticated, own items only | M4 |
| internal: `POST /internal/restaurants/{id}/order-quote`                                                         | `restaurant:quote`            | M2 |
| internal: `POST /internal/payments`, `POST /internal/payment-orders/{id}/close`                                 | `payment:charge`              | M3 |
| internal: `GET /internal/payment-orders/{id}`                                                                   | `payment:read`                | M3 |
| internal: `POST /internal/refunds`                                                                              | `payment:refund`              | M3 |
| internal: `POST /internal/notifications`                                                                        | `notification:send`           | M4 |

## 9. Milestones

- **M0 docs + repo:** install JDK 21 (Temurin), Node 24 LTS, Docker Desktop. The repo already exists (see Context), so M0 fills the empty `.gitignore` and `README.md`, adds the gitleaks hook, and configures/verifies GitHub branch protection, secret scanning and Dependabot; then the SDD docs. Nothing runs yet.
- **M1 browse:** frontend → gateway (static route) → restaurant-service + `restaurant_db` (seed). Infrastructure: MySQL only.
- **CI-1 (P6), end of M1:** Jenkinsfile + SonarQube against the M1 code; a required PR check from M2. Local `./mvnw verify` / `npm test` never depend on CI.
- **M2 authenticated checkout:** Keycloak; order-service + `order_db`; quote, serviceability, fee snapshot, `expectedTotal`, checkout idempotency, list/view, cancel of unpaid orders. Temporary limitation: see §9.1.
- **M3 payment:** payment-service + `payment_db`; guard, charge/close, expiry and payment reconciliation, paid cancel + refund, outbox poller, refund reconciliation sweep.
- **M4 owner/admin/notifications:** owner workflow + reject/refund, menu/fee/PIN management, admin incl. failed refunds, notification-service.
- **M5 hardening:** Consul discovery + `lb://` routes, Resilience4j, Docker images, full-stack Compose profile, Playwright E2E.

### 9.1 Temporary M2 limitation — orders that cannot be paid yet

- **In M2:** Payment Service does not exist yet, so new orders stay `PENDING_PAYMENT` indefinitely. There is no expiry; the only possible transition is a customer cancel → `CANCELLED` (no money exists, so no refund). Owners don't see orders until M4.
- **Containment:** the `payments.enabled=false` flag makes the frontend show "Awaiting payment — payments arrive in M3" with no pay button; `POST /orders/{id}/payments` doesn't exist yet. M2 builds run only locally with dev data and are never presented as a complete checkout.
- **Forward-compatible data:** every M2 order already stores `paymentDeadline` (from a dev config value until OPEN-09 is answered) and `refundStatus = NONE`, so M3 needs no data migration.
- **Intended behaviour from M3:** pay before the deadline → `PAID`; deadline passes → expiry closes the guard → `EXPIRED`; paid cancel/reject → full refund (§4.7). Leftover M2 orders follow the same path (deadline passed → close creates a CLOSED guard → `EXPIRED`), so no cleanup script is needed; the dev DB may simply be reset.
- **Exit criterion:** the limitation is removed when the M3 ACs for payment, expiry and refunds pass.

### 9.2 M3 expiry of legacy M2 orders (P10)

- **Guaranteed data:** from its first M2 migration, `orders.payment_deadline` is `NOT NULL` and has an index on `(status, payment_deadline)`. Every M2 order therefore has a deadline. It is a snapshot and is not recalculated if OPEN-09 is later answered differently.
- **Discovery:** the expiry job selects `status = PENDING_PAYMENT AND payment_deadline < NOW()` with no `IN_FLIGHT`/`UNKNOWN` attempt, ordered by deadline, in batches of 100, claimed with `FOR UPDATE SKIP LOCKED`. Legacy orders have no attempts, so they qualify naturally: **no legacy flag and no separate code path.**
- **Missing guards are expected:** Payment did not exist in M2, so these orders have no guard. `close` upserts a `CLOSED` guard (`expires_at` = the order's deadline) and returns `CLOSED`, since no charge could have been taken. Order then commits `PENDING_PAYMENT → EXPIRED` (conditional update) with `refundStatus = NONE`. Any later charge for that order fails with `ORDER_CLOSED`. Payment needs no prior knowledge of the order.
- **Deadline not yet passed at upgrade:** handled as a normal M3 order; the first charge creates an `OPEN` guard and the customer can pay until the deadline.
- **Safety:** `close` is idempotent, so a crash between close and the `EXPIRED` commit is fixed by the next run. A concurrent customer cancel wins through the optimistic lock and expiry skips that order. If Payment is unreachable, the order stays `PENDING_PAYMENT` and is retried later.
- **Rollout order:** (1) deploy payment-service and confirm it is healthy; (2) deploy order-service with the M3 jobs; (3) enable `expiry.enabled` and `payments.enabled` together. Expiry is off by default, so it never runs without Payment Service. Expiries are written to the status history; notifications start in M4, with no backfill.
- Metrics: `orders_expired_total`, expiry backlog size.

## 10. Tool versions (re-verify latest patches at M0)

JDK 21 LTS · Maven 3.9.x via wrapper · Spring Boot 4.x (OPEN-06) + matching Spring Cloud train · Node 24 LTS · React 19 / Vite 7 · Keycloak 26.x · MySQL 8.4 LTS · Consul latest 1.x · Jenkins LTS on JDK 21 · SonarQube Community Build · Flyway · JUnit 5, Mockito, Testcontainers, REST Assured · Vitest, RTL, Playwright.

## 11. Git, review, secrets

Current state: `main` + `origin` on GitHub, one initial commit, an empty `.gitignore` (see Context). GitHub-side settings are unverified and will be configured in M0. All further work goes through branches and PRs, not direct pushes to `main`. Protect `main`; `feat|fix|docs/T-xx-…` branches; Conventional Commits; squash merge; PR needs green CI (from M2), Sonar quality gate, linked US/T IDs and updated spec/contract. As A-10 is solo, do not require an unavailable second reviewer; use self-review and automated gates. `.gitignore`: `target/`, `node_modules/`, `dist/`, `.env`, `.env.*` (except `.env.example`), logs, IDE folders, `.DS_Store`, Docker volume data, `*.pem`, `*.key`. Secrets only in `.env` / Jenkins Credentials; Keycloak realm export committed without secrets; gitleaks pre-commit + CI; Dependabot + GitHub secret scanning.

## 12. Verification

- M0: `java -version` → 21, `./mvnw -v`, `node -v` → 24.x, `docker compose version`; every OPEN item is answered or deferred.
- Race and refund behaviour proven by Testcontainers integration tests: concurrent cancel + charge (both orderings), expiry vs late success, lost charge/refund responses, forced refund failures → backoff → `REFUND_FAILED` → admin retry, double-click checkout, `PRICE_CHANGED`, UNKNOWN → same-key re-drive (no double charge), UNKNOWN settled by a guard close, parallel attempt → `409 PAYMENT_IN_PROGRESS`, refund amount = captured amount incl. delivery fee, leftover M2 orders → `EXPIRED` after the M3 upgrade.
- Each milestone: the mapped ACs pass; traceability has no orphan rows; quality gate green (from M2).

### Explicit test cases (they become TC-xx in test.md; Testcontainers MySQL + Toxiproxy for faults; M3)

**Refund idempotency (§4.8)**

- RT-1 Response lost after Payment commits → retry with the same key returns the stored success; one refund row, money moved once, order `REFUNDED`.
- RT-2 Timeout before Payment commits → the retry performs the refund exactly once.
- RT-3 Poller, sweep and admin request a refund for the same order concurrently → at most one SUCCEEDED, refunded total = captured amount.
- RT-4 Forced simulated failure → the FAILED row is retried and later SUCCEEDED; never two successes.
- RT-5 Give-up while Payment is unreachable → `REFUND_FAILED(OUTCOME_UNKNOWN)`; Payment later shows the refund → the sweep sets `REFUNDED` without a new refund call.
- RT-6 Admin retry when Payment has already refunded → status check sets `REFUNDED`; no refund request is sent.
- RT-7 Admin double-click retry → one re-queue, the second gets `409`; exactly one refund.
- RT-8 Admin retry on `REFUND_PENDING` → `409`; on `REFUNDED` → no-op `200`; non-admin caller → `403`.
- RT-9 Refund amount ≠ captured amount → `422`; refund with no capture → `REFUND_FAILED(REJECTED_BY_PAYMENT)`, no money moves.

**Legacy M2 order expiry (§9.2)**

- LE-1 Legacy order past its deadline, no guard → `CLOSED` guard created → `EXPIRED`, `refundStatus = NONE`.
- LE-2 Charge after LE-1 (any key) → `ORDER_CLOSED`; order stays `EXPIRED`.
- LE-3 Legacy order not yet past its deadline → can be paid → `PAID`; the charge creates an `OPEN` guard.
- LE-4 Payment unreachable during expiry → order stays `PENDING_PAYMENT`; it expires once Payment is back.
- LE-5 Crash between close and the `EXPIRED` commit → the rerun expires it once, with one history row.
- LE-6 Customer cancel races expiry → exactly one final state, no refund.
- LE-7 Two expiry job instances → each order is processed once (`SKIP LOCKED`).
- LE-8 Backlog of 1,000 legacy orders → processed in batches; all `EXPIRED`.
- LE-9 Upgrade test: M2 schema + data, then M3 migrations → no data changes needed; the `payment_deadline NOT NULL` constraint holds.
- LE-10 `expiry.enabled=false` (default) → the job never calls Payment.

---

## Decision log update — 2026-11-03

- **A-10 / OPEN-05:** Solo developer. Branch protection must not require a second reviewer unavailable to the project owner. Self-review and automated checks are the baseline.
- **A-11 / OPEN-06:** Spring Boot 4.x direction selected, conditional on verifying the aligned Spring Cloud release train and exact dependency compatibility before scaffolding. Official compatibility mapping currently identifies Spring Cloud 2025.1.x for Boot 4.0.x; re-verify at M1.
- **A-12 / OPEN-17:** INR (₹) selected as the single MVP currency.
- **Approval boundary:** These entries resolve only A-10/A-11/A-12. A-1–A-9 and A-13–A-14 remain pending approval; Part B remains open until its stated milestone gates.
