# FoodieHub — Clarification Log

> **Status: PARTLY ANSWERED.** Owner decisions **DEC-001 – DEC-015** are recorded in §9.2. Everything
> not covered by those decisions remains open. Recommended defaults (§9.1) take effect only when the owner records an
> answer in §9.2.
>
> Created: 2026-11-04 · Revised: 2026-11-04 (twelve times; owner decisions DEC-001 – DEC-013 recorded; DEC-013 recorded 2026-11-05) · Stage: requirements clarification, ready for owner review before `spec.md`
> Sources: [`raw-requirement.md`](raw-requirement.md) (sha1 `1514270…`), [`plan.md`](plan.md) (sha1 `1a0cbd3…`)

**Terminology and IDs.** RR-/TC-/D/A-/P/OPEN-/US- identifiers and labels (CONFIRMED, PROPOSED, IN, OC, …) are
used exactly as in `raw-requirement.md`. Questions Q-01 – Q-16 are defined there and referenced here. New questions
continue the same series from **Q-17**. The proposed slice is called **VS-1**, its checkpoints **CP-1 – CP-5**, its draft
acceptance criteria **VS1-AC1 – VS1-AC9**, the conflicts found here **CC-1 – CC-6**, and the owner decisions
**DEC-001 – DEC-015** (§9.2). These are distinct from the `raw-requirement.md` findings C-01 – C-17.

---

## 1. Confirmed requirements relevant to the first slice

Only items classified as CONFIRMED (or CONFIRMED-DECISION / PREFERENCE) in `raw-requirement.md`.

| ID | What is confirmed | Relevance to VS-1 |
|---|---|---|
| RR-001 | FoodieHub is a food-ordering system | Context |
| RR-003 | Each order contains items from exactly one restaurant | Server-side validation rule |
| RR-004 | MVP payments are simulated | VS-1 defers payment entirely; the payment increment that follows is simulated |
| RR-006 | Pickup and restaurant self-delivery both exist; the option is chosen per order (owner selection only; who chooses and what self-delivery means are unverified) | Affects the checkout form (Q-18) |
| RR-007 | Order management is never exposed to unauthenticated users | Every order endpoint in VS-1 requires authentication |
| RR-008 | **Preference:** public browsing first (M1), then authenticated checkout (M2) | Consistent: VS-1 spans M1 (browsing, CP-1) and the first increment of M2 (checkout, CP-2 – CP-5) — DEC-002 |
| RR-009 | Single currency: INR (₹) | Prices and totals are in ₹ |
| TC-01 | Planned technology direction (React + Vite, Spring Boot, Gateway, Keycloak, MySQL for Order Service, …) | Components used by VS-1 |
| TC-05 | Incremental milestones; one thin end-to-end vertical slice first; not all services/infrastructure up front | The basis for VS-1 and its checkpoints |
| TC-06 | CI early but never blocking local development | VS-1 must build and test locally without Jenkins |
| TC-11 | Security design topics (roles, OIDC flow, service-side authorization, ownership checks, service-to-service security) | These topics must be covered at CP-2 – CP-4 |
| TC-12 | Explicit acceptance criteria | VS-1 needs acceptance criteria before `spec.md` (§3.4) |

**Topic confirmed, behaviour not confirmed** (`raw-requirement.md` §5.2): RR-011 menus (IN), RR-012 authn/authz,
RR-014 duplicate checkout (IN), RR-020 delivery details, RR-021 pricing, RR-022 order states. VS-1 touches all of
them; their behaviour stays open in §5. Nothing in this document upgrades them to behaviour-confirmed.

---

## 2. Proposed decisions already on record (all pending)

| Item | Proposal | Status | Effect on VS-1 |
|---|---|---|---|
| A-1 / RR-101 | MVP stories and milestones M0–M5 | **Partly decided (DEC-001):** M1 approved as defined; M2's scope kept as the target, delivered incrementally. Other milestones and the story set remain pending. (`plan.md` §0 still shows A-1 as pending; not edited here) | VS-1 spans M1 and the first increment of M2 (DEC-002) |
| A-3 / A2 | Assumption "single currency, no tax or coupons" | pending | VS1-AC4 assumes no tax and no coupons |
| A-8 / RR-105 | PIN serviceability (**proposed until explicitly approved**), flat fee, `expectedTotal` | pending | Not needed if VS-1 is pickup-only (Q-18) |
| A-9 / RR-106 | Orders that can't be paid yet are accepted as temporary, dev-only | **Decided for VS-1 (DEC-004):** local development and portfolio demonstrations; payment clearly labelled as unavailable; no production use | VS-1 creates exactly such orders (§4) |
| RR-102 | Order lifecycle (`plan.md` §4.1), initial state `PENDING_PAYMENT` | pending — **initial state decided by DEC-011**; the rest of the lifecycle is still pending | VS-1 needs only the initial state |
| RR-107 | Roles `CUSTOMER` / `RESTAURANT_OWNER` / `ADMIN` | approval unclear | VS-1 needs only "an authenticated orderer" (Q-23) |
| D1–D7 | Architecture decisions | individual approval unverified (Q-14) | Only some are needed, per checkpoint (§3.2) |
| D8–D11 | Sync REST + outbox; fulfilment per order; Keycloak in M2; one MySQL, a DB per service | owner selections | D10 unchanged: Keycloak arrives at CP-2, which is part of M2 (DEC-002) |

---

## 3. First vertical slice — VS-1 (accepted by the owner, DEC-003)

### 3.1 Proposed outcome
An anonymous visitor browses **one** seeded restaurant and its menu. They sign in, check out a valid single-restaurant
pickup order (Q-18), and see a confirmation saying the order was **received, payment pending**. The order is
persisted with server-computed prices and is visible only to the person who placed it. Simulated payment is the
**next** increment.

### 3.2 Implementation checkpoints within VS-1
These are internal checkpoints for building and verifying VS-1. **Milestone mapping (DEC-002):** CP-1 = M1;
CP-2 – CP-5 = the first increment of M2. The rest of M2's scope remains a future increment (DEC-001). Each checkpoint
lists only the decisions still needed at that point.

| CP | Checkpoint | Product decisions needed | Architecture / infrastructure needed | ACs verified |
|---|---|---|---|---|
| CP-1 | Browse one restaurant and its menu end-to-end | Q-05, Q-06 | Frontend, restaurant-service, MySQL `restaurant_db` (seed); gateway with a static route (part of M1 as defined in `plan.md` §9, approved by DEC-001). D1, D2, D6, D7 (Q-14). **No** Keycloak or order-service | AC1 |
| CP-2 | Add authentication and verify the login flow | Q-07, Q-23 | Keycloak; D3 (JWT checked at the gateway and in the service); D10 (consistent, DEC-002) | CP-2 sign-in checks (§3.5); AC1 still passes. No order AC yet |
| CP-3 | Server-side checkout validation, order creation **and durable persistence** (DEC-005); idempotent creation (DEC-006) | Q-20, Q-25, Q-28, OPEN-13 (VS-1 behaviour), the §5.4 idempotency details (Q-21 deferred unless the owner opts in) | order-service; MySQL `order_db` (D1, D11); authoritative price lookup (Q-29, D8 sync REST, service-to-service security per TC-11); technical request-safety bounds (Q-30); D4 (DEC-006), D5, D6 | AC2 (creation part, through the routed endpoint), AC3, AC4, AC5, AC8 |
| CP-4 | Order retrieval with ownership and access checks (persistence itself is in CP-3, DEC-005) | Q-24 | D3 in order-service | AC2 (retrieval part), AC7 |
| CP-5 | Confirmation UI, automated tests, integration verification | Q-26 (the confirmation wording is decided by DEC-011) | Local run of the VS-1 components (Docker Compose per TC-01) | AC2 (UI part: sign-in required before checkout), AC6; AC9 = complete VS-1 verification (AC1–AC8) |

CP-1 corresponds to M1 (DEC-002), which the owner approved as defined in `plan.md` §9 (DEC-001). It needs no checkout,
authentication or order-service decision.

**CP-3 / CP-4 boundary (owner decision DEC-005).** Durable order persistence is implemented directly in CP-3.

- **CP-3 delivers:**
  - the order-creation API contract (path, request, success and error shapes per D7), with authentication;
  - checkout validation and the technical safety bounds (Q-30);
  - authoritative pricing and availability via restaurant-service (Q-29);
  - order creation with **durable storage** in `order_db`, in one transaction, storing the authenticated orderer with
    the order (needed for CP-4's ownership checks);
  - idempotent order creation (DEC-006; details per §5.4);
  - a routed creation endpoint.

  **An order is not reported as created until durable persistence succeeds** (AC5).
- **CP-3 tests verify:**
  - AC2 (creation part) — 401 without a valid token through the routed endpoint, and no order is stored;
  - AC3 — every invalid case is rejected, and nothing is stored;
  - AC4 — prices come from restaurant-service, client prices are ignored, and amounts are exact decimals;
  - the Q-30 bounds are enforced;
  - AC5 — committed persistence, and no success response if the commit fails;
  - AC8 — a retry with the same idempotency key creates no second order;
  - the authenticated service-to-service price lookup (Q-29).
- **CP-4 keeps only its remaining responsibilities:** the order-retrieval endpoint with ownership and access checks —
  AC2 (retrieval part) and AC7. It contains no persistence work.
- There is **no** temporary persistence abstraction and **no** disabled checkout route.

### 3.3 Not in VS-1
Simulated payment and expiry automation (the payment increment); cancellation; restaurant workflow; notifications;
order list; admin; delivery rules; Consul; Jenkins/SonarQube as a gate. Changing any of this requires an explicit
owner scope decision.

### 3.4 Draft acceptance criteria (proposal; these become ACs in `spec.md` once the open questions are answered)
| # | Criterion | Depends on |
|---|---|---|
| VS1-AC1 | An anonymous visitor can view the restaurant and its menu, with prices in ₹, without signing in. Only active restaurants are shown; an inactive restaurant requested through a public restaurant-detail or menu endpoint returns 404 Not Found, with a response indistinguishable from that for a nonexistent restaurant, so neither its inactive status nor its existence is disclosed. The internal `active` flag is not displayed. *(Test precondition, not an owner decision: the seeded demo restaurant is active.)* | Q-05 (DEC-007), Q-06 (DEC-009), DEC-008, DEC-010 |
| VS1-AC2 | **Creation part:** without authentication, creating an order is rejected with 401, and no order is created. **Retrieval part:** without authentication, retrieving an order is rejected with 401. **UI part:** the UI requires sign-in before checkout. Browsing stays available without sign-in. Where each part is verified: §3.2 | Q-06, Q-07, RR-007 |
| VS1-AC3 | A checkout with items from more than one restaurant, unknown or unavailable items, no items, invalid quantities, or a request that exceeds the technical safety bounds is rejected with a clear validation error. **No order is created** and no confirmation is returned | Q-20, Q-30, RR-003 |
| VS1-AC4 | **Server-side, authoritative pricing.** Unit prices come from the restaurant's current menu at checkout; any client-sent price or total is ignored. Line amount = unit price × quantity; subtotal = sum of line amounts; total = subtotal (pickup; no fees; no tax or coupons per A2, pending A-3). Amounts are exact decimals in INR with 2 decimal places, using **HALF_UP** rounding to 2 dp where rounding is needed (D6, recorded in `plan.md`; individual approval unverified, Q-14). No floating-point arithmetic. With 2-dp prices and whole-number quantities, VS-1 introduces no rounding step | Q-14, Q-18, Q-20, Q-21, A-3 |
| VS1-AC5 | A valid order is persisted in one transaction, with line snapshots (name, unit price, quantity), total and initial status `PENDING_PAYMENT`. The success response and confirmation are returned **only after the order is committed**. If persistence fails, no order exists and no confirmation is shown | Q-19 (DEC-011), Q-25 |
| VS1-AC6 | The confirmation shows the order number, items, total in ₹ and status, and states unambiguously that **payment has not been taken** and **the restaurant has not accepted the order** (approved wording, DEC-011: "Order received — payment pending; not yet accepted by the restaurant.") | Q-19 (DEC-011) |
| VS1-AC7 | Only the authenticated user who placed an order can retrieve it; any other authenticated user gets 404 | Q-24 |
| VS1-AC8 | **Included (DEC-006):** retrying the same logical order-creation request with the same idempotency key does not create another order. Key format, scope, payload mismatch, concurrency, retention and the response when the original response was lost are as specified in §5.4 (**still to be specified**) | Q-22 (DEC-006), §5.4 |
| VS1-AC9 | **Complete VS-1 verification at CP-5:** the acceptance suite for AC1–AC8 passes end-to-end locally from a clean checkout without CI. Local setup is documented and reproducible. Earlier checkpoints are judged by their own definition of done (§3.5), not by AC9 | Q-26, TC-06, §3.5 |

### 3.5 Definition of done per checkpoint (proposal)
- **Every checkpoint** is done when:
  - its features are implemented, with their automated tests added **in the same checkpoint** (scope per Q-26);
  - the ACs mapped to it in §3.2 pass;
  - all tests from earlier checkpoints still pass;
  - everything runs locally without CI (TC-06).
- **No checkpoint depends on a later one.** CP-1 passes its own browse tests (AC1) with no authentication, order-service
  or checkout code. CP-2 needs no order-service. CP-3 includes durable order storage (DEC-005); CP-4 only adds retrieval and ownership checks.
- **CP-2 definition of done (sign-in only, no order-service):**
  - a user can sign in and sign out through Keycloak from the frontend (OIDC flow per `plan.md` §6, which is PROPOSED);
  - requests without a token, or with an invalid or expired token, are rejected with 401, and valid tokens are accepted (D3).
    This is verified at the gateway and against a **test-only** protected route or test configuration — not a new product endpoint;
  - public browsing still works without sign-in (AC1 regression).

  Authorization tests on the order endpoints belong to CP-3 (AC2 creation part) and CP-4 (AC2 retrieval part, AC7),
  not to CP-2.
- **CP-5** runs the complete VS-1 acceptance verification (AC9). The answers to the open owner decisions that apply
  determine the exact checks — for example, AC8's details depend on the §5.4 answers.

---

## 4. Unpaid orders during VS-1 (proposed temporary development behaviour)

**This is not a production policy.** Under VS-1, orders are created as `PENDING_PAYMENT` while payment doesn't exist yet.
This relies on A-9 (pending), which `plan.md` describes as temporary and dev-only.

### 4.1 Proposed behaviour (pending owner decision)
| Topic | Proposed VS-1 behaviour | Decided by |
|---|---|---|
| Customer view after creation | The confirmation states "Order received — payment pending; not yet accepted by the restaurant." *(There is no pay button — an earlier proposal, not part of DEC-011.)* | DEC-011 (Q-19) |
| Meaning of "order received" | It means the order has been durably received and created. It does **not** mean that payment succeeded or that the restaurant has accepted the order; no real payment processing is implied | DEC-011 (Q-19) |
| Several unpaid orders per customer | **OPEN — no recommendation.** The options are to allow several, or to limit to one. It must be answered before CP-3; the final policy is OPEN-13 | OPEN-13 (VS-1 behaviour only) |
| Unpaid orders during development | Proposed: they stay `PENDING_PAYMENT`, with no automated expiry, cancellation or cleanup; developers may reset their local dev database. **Still open:** how far orders may accumulate, and any cleanup or expiry policy (§4.3) | Q-28 |
| Use of VS-1 builds | **Decided (DEC-004):** local development and portfolio demonstrations. Payment is clearly labelled as unavailable; an unpaid order is never shown as paid or accepted by the restaurant. No production deployment and no real payment processing | A-9 (DEC-004) |

### 4.2 Decisions required for VS-1
Q-28 (development handling), OPEN-13 (VS-1 behaviour only). Q-19 (initial status and what the customer is told) is answered by DEC-011.
A-9 is answered for VS-1 by DEC-004.

### 4.3 Decisions that can wait for the payment increment (unresolved; no values proposed here)
- Payment deadline (OPEN-09) and whether and how unpaid orders expire (A-14, A-4).
- Cleanup or migration of unpaid orders left over from development (A-14).
- Whether customers can cancel unpaid orders, and the rules for doing so (Q-08, RR-017, A-6).
- Payment-attempt semantics and idempotency (A-5, RR-015).
- The final policy on several unpaid orders per customer (OPEN-13, gate M2).

---

## 5. Open questions

**Classification:**
- **SPEC** — blocks specification: needed to define VS-1 accurately.
- **IMPL (CP-n)** — blocks implementation: VS-1 can be specified, but this must be decided before checkpoint CP-n is built.
- **DEFER** — doesn't affect the proposed slice yet.

Recommended defaults are suggestions, not decisions.

### 5.1 Product decisions
| ID | Question | Why it matters | Recommended default | Class |
|---|---|---|---|---|
| **Q-17** | Should VS-1 (§3) be the first increment — with checkpoints CP-1 – CP-5 and payment as the next increment — without changing the official milestones yet? | It is a different cut from `plan.md` M1/M2 and from the owner's preference RR-008 (CC-1, CC-2) | Accept VS-1 as a working slice; handle any A-1/D10 change separately through the approval checklist | **ANSWERED** (DEC-003; milestones per DEC-001 / DEC-002) |
| Q-05 | Do restaurants offer menus that customers order from? (RR-011 is IN only) | VS-1 is built around a menu | Yes: menu items with a name, a price in ₹ and an available flag | **ANSWERED** (DEC-003: a menu exists; DEC-007: item fields and restaurant relationship) |
| Q-06 | Is public browsing a permanent product rule or only the M1 order of work? What exactly is public? | Decides whether the browse endpoints are anonymous | Public, read-only: restaurant details and the menu with prices. Nothing order-related is public | **ANSWERED** (DEC-009, MVP demo scope; with DEC-003 and DEC-008). Menu-endpoint sub-point answered by DEC-010 |
| Q-07 | Does "order-management" include placing an order — that is, is guest checkout excluded? | Decides whether checkout needs sign-in | No guest checkout: sign-in is required before an order is placed | **ANSWERED** (DEC-003 for VS-1; DEC-009 for the MVP demo: guest checkout is not supported) |
| **Q-18** | Which fulfilment option(s) does VS-1 support? | Delivery needs address, serviceability and fee rules that are still pending (A-8, OPEN-11/12/19) | **Pickup only in VS-1**; self-delivery in a later increment. This defers part of RR-006 without changing it | **ANSWERED for VS-1** (DEC-003: pickup only) |
| **Q-19** | What status does a new order get, and what is the customer told before payment? | Without payment, "confirmed" could be read as paid or accepted. Relies on A-9 | `PENDING_PAYMENT` (from the RR-102 proposal); the wording is in §4.1 | **ANSWERED** (DEC-011) |
| Q-03 (part) | For VS-1, is the initial state of the §4.1 lifecycle accepted? | Only the initial state is needed now | Accept the initial state only; keep the rest of RR-102 pending | **ANSWERED for the initial state only** (DEC-011); the rest of the §4.1 lifecycle (RR-102) is still pending |
| **Q-20** | Which server-side checkout validations apply in VS-1? | Defines AC3 and AC4 and the API errors | The restaurant exists and is active; all items belong to it (RR-003); the items exist and are available; at least one item; each quantity is a positive integer; prices come from the server | **ANSWERED** — DEC-008 (availability) and DEC-013 (the rest of the set). The business quantity limit is a separate row and stays open |
| Q-20 (business limit) | Is there a **business** upper limit on quantity per line or per order? | A product rule (e.g. kitchen capacity); **no source specifies a value** | Owner to set a value, or explicitly defer it. Deferring it does **not** make quantities unbounded: the technical safeguard Q-30 applies regardless | IMPL (CP-3) |
| **Q-23** | Who may place an order in VS-1: any authenticated user, or only users with a `CUSTOMER` role? | Security configuration; RR-107 and Q-02 are unresolved | Any authenticated user of the FoodieHub realm; the role model is decided later (Q-02). RR-007 applies regardless | IMPL (CP-2) |
| **Q-24** | Who may view an order's confirmation? | AC7; "own orders only" is PROPOSED (RR-012) | Only the user who placed the order; anyone else gets 404 | **ANSWERED** (DEC-013) |
| **Q-28** | What happens to unpaid VS-1 orders during development, until the payment increment? | Unpaid orders accumulate; "unresolved" must not be confused with "will be deleted" | §4.1: they remain `PENDING_PAYMENT`; no automated expiry or cleanup; manual local DB reset is allowed | **ANSWERED** (DEC-013; the related A-9 usage scope is answered by DEC-004) |
| OPEN-13 | One pending (unpaid) order per customer? — for VS-1 only | Changes the checkout validation | **No recommendation** (open; see §4.1). The final policy stays OPEN-13 (gate M2) | **ANSWERED for VS-1** (DEC-013: several unpaid orders per customer are allowed); the final policy stays OPEN-13 (gate M2) |
| Q-22 | Should VS-1 include duplicate-checkout (request) protection on order creation? Whether duplicate checkout is a product requirement at all is a separate question: RR-014 is IN + OC → Q-09 (duplicate-checkout part) | Network retries and double-clicks can create duplicate orders, and adding protection later changes the API contract | **Owner decision DEC-006: include.** The details in §5.4 are still to be specified; DEC-006 doesn't approve any of them | **ANSWERED** (inclusion); details IMPL (CP-3) |
| Q-09 (fulfilment part) | Who chooses the fulfilment type, and what does restaurant self-delivery mean? | Needed for the checkout form once delivery exists | Defer if Q-18 = pickup only | DEFER (SPEC if VS-1 includes delivery) |
| Q-21 | Should VS-1 include the price-change check (`expectedTotal`, P5 / A-8)? | Protects the customer if prices change between viewing and ordering | Defer: seeded prices are static in VS-1, and the confirmation shows the server total | DEFER |
| OPEN-12 | Minimum order value | Checkout rule | None in VS-1 (consistent with "not modelled until decided"); stays OPEN | DEFER |

### 5.2 Architecture and implementation choices
| ID | Question | Why it matters | Recommended default | Class |
|---|---|---|---|---|
| Q-14 (VS-1 part) | Which of D1–D7 apply to VS-1? (Their individual approval is unverified.) | VS-1's design relies on some of them | Confirm per checkpoint only: **CP-1:** D1, D2, D6, D7 · **CP-2:** D3 · **CP-3:** D1 (`order_db`), D4 (DEC-006), D5, D6 · **CP-4:** D3 in order-service | IMPL (per CP). **Order monetary fields: answered by DEC-013** (`DECIMAL(10,2)`, INR; line = price × quantity; total = sum of lines). D1–D7 otherwise remain individually unverified |
| Q-27 | Which components run at each checkpoint? | TC-05 asks for minimal infrastructure | As in the §3.2 table. No payment, notification, Consul or CI gate in VS-1 | IMPL (per CP) |
| **Q-29** | How does order-service get authoritative prices and availability at checkout? | Server-side pricing (AC4) needs restaurant data, and the call between services must be secured (TC-11) | A synchronous internal call from order-service to restaurant-service (D8 "Sync REST"), authenticated service-to-service. The design in `plan.md` §6 (client credentials) is PROPOSED | **ANSWERED** (DEC-013: synchronous internal REST call). How the call is authenticated (SEC-005) is not decided |
| Q-25 | Which order data is persisted? | Schema; the confirmation content is covered by AC5/AC6 | Order id, customer id (token `sub`), restaurant id, fulfilment type, line snapshots (D5), subtotal, total, currency INR, status, created-at. The details go in `data-model.md` | IMPL (CP-3) — moved from CP-4 by DEC-005 |
| Q-26 | What test scope is required? | Definition of done (TC-12, AC9) | Backend unit tests; integration tests against MySQL (Testcontainers); API tests for 401, validation errors and 404 for other users; frontend component tests. Browser E2E deferred (M5 in `plan.md`) | IMPL (CP-1, applied at every CP) |
| Q-16 | Should never exposing or committing secrets and credentials be a permanent project constraint? | The first secret (the MySQL password) appears at CP-1; Keycloak secrets at CP-2 | Yes: `.env` (ignored) plus `.env.example` placeholders | IMPL (CP-1) |
| **Q-30** | Which **technical** request-safety bounds does checkout enforce? This is separate from any business quantity limit (Q-20) | Without bounds, a request could overflow integers or money columns, or submit an unreasonable cart. Unlimited quantities are **not** safe | **Implementation proposal, needs review:** configurable maximums, chosen and justified before CP-3, covering: positive-integer validation of each quantity; maximum request payload size; maximum number of lines per order; maximum quantity per line within the integer range; and a check that line amounts and the total fit the money column (`DECIMAL(10,2)` per D6, i.e. at most 99,999,999.99) using exact-decimal arithmetic. Violations return a clear validation error (RFC 9457 per D7). No values are proposed here. **Before CP-3 is implemented, the concrete values and the rationale for each must be documented** (e.g. in the spec's technical notes or an ADR) and reviewed. They are **technical limits, not business rules**: they only reject out-of-bounds requests, and they don't stand in for the business limit Q-20 | **ANSWERED** (DEC-013: at most 20 lines per order, quantity at most 50 per line). Maximum payload size is not set |

### 5.3 Can defer (unchanged; statuses as recorded in `raw-requirement.md` §8)
Q-01, Q-02, Q-04, Q-08, Q-10, Q-11, Q-12, Q-13, Q-15 (non-blocking) · A-2, A-4, A-5, A-6, A-7, A-13, A-14 ·
OPEN-07, 09, 10, 11, 14, 15, 16, 18, 19, 20, 21 · A-8 (as long as Q-18 = pickup only).

### 5.4 Points to resolve for order-creation idempotency (included by DEC-006; details not yet specified)
This is **request idempotency** for creating an order. It is distinct from **payment idempotency** (RR-015, TC-13, A-5),
which belongs to the payment increment. It protects against creating a second order for a repeated request that carries
the same key. It does **not** guarantee exactly-once processing.

| Point | Question to resolve | Note |
|---|---|---|
| Key format and validation | What does a valid key look like, and how is it validated? | To be specified (DEC-006) |
| Key scope | Is a key unique per customer, or globally? Who generates it (the client, per checkout attempt)? | `plan.md` §4.5 proposes per customer (PROPOSED) |
| Payload mismatch | What happens when the same key arrives with a different cart? | e.g. a rejection with a clear error; to be decided |
| Concurrent requests | What happens when the same key arrives while the first request is still in progress? | Must not create two orders; the exact response is to be decided |
| Persistence | Is the key stored durably with the order, in the same transaction? | Verified at CP-3 (durable storage, DEC-005) |
| Retries | What does the client get when it retries after a timeout, or when the original request succeeded but its response was lost? | To be specified (DEC-006, E-10) |
| Retention | How long are keys kept? | **OPEN-10 — no value proposed** |

---

## 6. Reclassification notes (from the previous version, where all §4 items were "Blocks VS-1")
| ID | Was | Now | Reason |
|---|---|---|---|
| Q-14 | Blocks | IMPL (per CP) | Product behaviour can be specified without it. Each checkpoint needs only a subset of D1–D7, and public browsing doesn't wait for decisions that only matter to checkout (D3–D5) |
| Q-27 | Blocks | IMPL (per CP) | A component list is an implementation choice. Keycloak and order-service aren't needed for CP-1 |
| Q-23 | Blocks | IMPL (CP-2) | The spec can state the confirmed rule RR-007 (authentication required); the role check is a configuration decision for CP-2 |
| Q-25 | Blocks | IMPL (CP-4) | The product-visible content is fixed by AC5/AC6; the full field list belongs to the data model |
| Q-20 (upper limit) | inside Q-20 | IMPL (CP-3) | A parameter value that no source specifies; it can be set before CP-3 without changing the spec |
| Q-03 (part) | Partly | SPEC (initial state only) | Made explicit |
| Q-09 (fulfilment part) | "Only if delivery" | DEFER / SPEC | Made explicit |
| Q-16 | Not blocking | IMPL (CP-1) | Moved earlier because the first secret is introduced at CP-1; security preserved |
| Q-22 | Not blocking | IMPL (CP-3) | It affects the order-creation API. (Superseded: inclusion is now decided by DEC-006; only the §5.4 details remain open) |
| Q-26 | Not blocking | IMPL (CP-1) | The test scope is the definition of done for every checkpoint |
| Q-28, Q-29 | — | new | Added for the unpaid-order behaviour (§4) and for authoritative pricing between services |
| Q-30 | — | new, IMPL (CP-3) | Separates the technical request-safety bounds from the business quantity limit (Q-20) |
| Q-25 | IMPL (CP-4) | IMPL (CP-3) | DEC-005 moves durable persistence to CP-3 |

---

## 7. Explicitly open — not covered by any recommended default
Even if every remaining recommendation in §9.1 is accepted, these stay open. **Resolved since the last revision:**
the A-9 usage scope (DEC-004), the CP-3 / CP-4 cut (DEC-005), conflicts CC-1 – CC-3 (DEC-001 – DEC-003), and whether
idempotency is included (DEC-006).

| Open item | Where | Needed before |
|---|---|---|
| Business upper limit on quantity (per line or per order); no source gives a value | Q-20 (business limit) | CP-3 |
| Technical request-safety bounds: the concrete values and their rationale must be documented and reviewed (technical limits, not business rules) | Q-30 | CP-3 implementation |
| Accumulation of unpaid orders, and any cleanup or expiry behaviour | Q-28, §4.3 (OPEN-09, A-4, A-14) | Cleanup/expiry: the payment increment |
| Several unpaid orders per customer | OPEN-13 (VS-1 behaviour and final policy) | CP-3 (VS-1); M2 gate (final) |
| Idempotency details (§5.4): key format, scope, payload mismatch, concurrency, retention, lost-response behaviour. Inclusion is decided (DEC-006). `raw-requirement.md` still classifies RR-014 as IN + OC (Q-09 duplicate-checkout part); it isn't updated here | §5.4; Q-09 (duplicate-checkout part) | CP-3 |
| Individually verified approval of D1–D7 (only per-checkpoint confirmation is proposed) | Q-14 | Each CP, per §5.2 |
| Database precision and scale for **order** monetary fields, and rounding. The **menu-price** column is settled: `DECIMAL(10,2)`, final (DEC-012). For order fields, D6 (unverified) records `DECIMAL(10,2)` and HALF_UP; DEC-012 explicitly does not approve these | DEC-007, DEC-012, D6, Q-14 | CP-3 (DEC-007 deadline) |
| Checkout validation of restaurant status (BR-002) is **not** decided by DEC-009's browsing rule | Q-20 | `spec.md` |
| Remaining conflicts: CC-5 (CI-1 timing, A-2 pending) and CC-6 (order list outside VS-1). CC-1 – CC-4 are resolved (CC-4 by DEC-003, DEC-004 and DEC-011) | CC-5, CC-6 (§8) | — |
| `plan.md` still shows A-1 and A-9 as pending; DEC-001 and DEC-004 are recorded only here. Updating `plan.md` is a separate edit that needs the owner's approval | `plan.md` §0 | The next `plan.md` revision |
| Self-delivery semantics and who chooses fulfilment | RR-006, Q-09 (fulfilment part) | Only when delivery is added |
| `raw-requirement.md` Q-09 bundles several unrelated inferred outcomes (no double charge, duplicate checkout, delivery address, delivery fee, self-delivery meaning, who chooses fulfilment). This document cites it by part; splitting it is a decision for a future `raw-requirement.md` revision | Q-09 | Flagged only; not changed here |
| The role model (VS-1 sidesteps it via Q-23) | Q-02, RR-107 | Later increments |

## 8. Conflicts and inconsistencies affecting VS-1
| ID | Conflict | Sources | Resolution path |
|---|---|---|---|
| CC-1 | VS-1 puts authenticated checkout in the first slice; the owner's stated preference is "M1 public browsing and M2 authenticated checkout" (RR-008), and D10 puts Keycloak in M2 | RR-008, D10, VS-1 | **Resolved by DEC-002** (CP-1 = M1; CP-2 – CP-5 = first increment of M2; D10 unchanged) |
| CC-2 | `plan.md` M1 = browse only; M2 = Keycloak + order creation **plus** quote, serviceability, fee snapshot, `expectedTotal`, idempotency, order list and cancel. VS-1 is a different cut | `plan.md` §9, A-1 | **Resolved by DEC-001 / DEC-002** (M2 delivered incrementally; VS-1 is its first increment) |
| CC-3 | VS-1 browses **one** restaurant; US-01 proposes browsing **all active** restaurants | `plan.md` §3 US-01 | **Resolved for VS-1 by DEC-003** (one seeded restaurant; US-01 unchanged) |
| CC-4 | "Order confirmation" before payment can be misread as paid or accepted | VS-1, A-9 | **Resolved by DEC-003 / DEC-004 / DEC-011** (status `PENDING_PAYMENT`; approved confirmation wording) |
| CC-5 | CI-1 is planned "at the end of M1" (A-2); VS-1 checkpoints don't map 1:1 to M1 | A-2, TC-06 | Open: with CP-1 = M1 (DEC-002), CI-1 would come at the end of CP-1, but A-2 is still pending; DEFER |
| CC-6 | VS-1 shows a single-order confirmation; `plan.md` §8 also lists `GET /orders` (order list) for M2 | `plan.md` §8 | The order list stays outside VS-1 |

## 9. Decision log

### 9.1 Proposed decisions — RECOMMENDED DEFAULTS ONLY (not owner answers)
These are the assistant's recommendations, prepared for the owner's review. The Status column shows which ones the
owner's decisions in §9.2 now answer, fully or partly. **The others have not been accepted.** To adopt, change or reject
one, the owner records an answer in §9.2.

| Question | Proposed answer | Rationale | Status |
|---|---|---|---|
| Q-17 | Accept VS-1 as a working slice, built through checkpoints CP-1 – CP-5. The official milestones (A-1, M1/M2) are not changed | Delivers a useful browse-to-order increment early (TC-05); CP-1 alone still follows RR-008 | **Answered — DEC-003** |
| Q-05 | Restaurants have orderable menus: items with a name, a price in ₹ and an available flag | VS-1 is built around a menu; RR-011 is IN only | **Answered — DEC-007** (with DEC-003) |
| Q-06 | Public, read-only browsing of restaurant details and the menu with prices; nothing order-related is public | Matches the owner's preference RR-008 and keeps RR-007 intact | **Answered — DEC-009** (MVP demo scope; with DEC-003, DEC-008) |
| Q-07 | Authentication is required before an order is placed; no guest checkout | Consistent with RR-007; resolves whether placing an order counts as order management | **Answered — DEC-003** (VS-1) **and DEC-009** (MVP demo) |
| Q-18 | Pickup only in VS-1; self-delivery in a later increment | Avoids the pending delivery rules (A-8, OPEN-11/12/19); defers part of RR-006 without changing it | **Answered for VS-1 — DEC-003** (pickup only) |
| Q-19 + Q-03 (initial state) | Initial status `PENDING_PAYMENT`. The confirmation means "received" — **not** paid and **not** accepted by the restaurant | Prevents the confirmation being read as a payment or acceptance (CC-4); uses only the initial state of the RR-102 proposal | **Answered — DEC-011** (Q-19; the initial state of Q-03 only) |
| Q-20 | Validate: restaurant status (exists and active); item existence; availability; restaurant consistency (all items from one restaurant, RR-003); positive integer quantities; non-empty cart; server-authoritative prices. **The business quantity limit stays open** (Q-20 business limit); technical safety bounds are Q-30 | Defines VS1-AC3/AC4; stops invalid or manipulated orders | **Answered** — DEC-008 (availability) and DEC-013 (the rest); the business quantity limit stays open |
| Q-24 | Only the customer who placed an order can view it; anyone else gets 404 | Ownership is a confirmed topic (RR-012/TC-11); the rule itself is PROPOSED | **Answered — DEC-013** |
| Q-28 + A-9 | Temporary, development-only handling: unpaid VS-1 orders stay `PENDING_PAYMENT`, with no automated expiry or cleanup; local DB reset allowed. **The exact scope of A-9 and accumulation/cleanup policy stay open** (§7) | Makes VS-1 usable before payment exists without setting a production policy | A-9: **Answered — DEC-004**. Q-28: **Answered — DEC-013** (stay `PENDING_PAYMENT`, no automatic expiry or deletion) |

### 9.2 Owner decisions (answer log)
Only actual owner answers are recorded here. An answer applies only to the question it answers. The decisions below
are reproduced **verbatim** from the owner's message; only the heading levels are adjusted. The owner did not state an
approval date, reviewer or signature, so none is recorded.

**Effect summary** (the assistant's mapping to question IDs; the owner text below is authoritative):

| Decision | Answers | Effect |
|---|---|---|
| DEC-001 | A-1 (partly) | M1 approved as defined; M2 scope retained, delivered incrementally |
| DEC-002 | CC-1, D10 | CP-1 = M1; CP-2 – CP-5 = first increment of M2; D10 unchanged |
| DEC-003 | Q-17; Q-07 and Q-18 for VS-1; partly Q-05, Q-06, Q-19 | VS-1 accepted with its constraints |
| DEC-004 | A-9 (VS-1 usage scope) | Local development and portfolio demos; no production |
| DEC-005 | The CP-3 / CP-4 cut | Durable persistence in CP-3; CP-4 = retrieval and ownership |
| DEC-006 | Q-22, E-10 (inclusion only) | Idempotent order creation; details still to be specified (§5.4) |
| DEC-007 | Q-05 (item fields); restaurant–menu relationship | Menu item: `id`, `name`, `price` (INR, exact decimal), `available`, `restaurantId`; no floating point for money; DB precision/scale open until before CP-3 |
| DEC-008 | Restaurant attributes (`spec.md` FR-001); part of Q-06; part of Q-20 (availability) | Browsing shows restaurant `id`, `name`, `active` (**public display of `active` superseded by DEC-009**); unavailable items visible and marked; can't be added to the cart; server validates availability |
| DEC-009 | Q-06; Q-07 for the MVP demo | Public, read-only browsing; seeded demo data only; active restaurants only; inactive → 404 on public restaurant-detail endpoints; `active` not displayed; no guest checkout; MVP demo scope, not permanent policy |
| DEC-010 | The inactive-restaurant menu-endpoint sub-point of Q-06 (`spec.md` E-11) | Public restaurant-detail **and** menu requests for an inactive restaurant → 404, indistinguishable from a nonexistent restaurant; no disclosure of inactive status or existence; public MVP demo endpoints only — not admin, internal or production behaviour |
| DEC-011 | Q-19; the initial-state part of Q-03 | Initial status `PENDING_PAYMENT`; confirmation = durably received and created, not payment success or restaurant acceptance; no real payment; approved wording "Order received — payment pending; not yet accepted by the restaurant." |
| DEC-012 | Menu-price database precision and scale (the menu-price part of D6 / Q-14; DEC-007's open precision) | Menu prices in INR use `DECIMAL(10,2)` as the final database representation. Order monetary fields and rounding (rest of D6) are **not** approved |
| DEC-013 | Q-20 (rest), Q-30, Q-14 (order money), Q-24, Q-29, Q-28, OPEN-13 (VS-1) | Checkout validation set; 20 lines / 50 per line technical bounds; order amounts `DECIMAL(10,2)` INR, line = price × quantity, total = sum, no tax or fees; owner-only order view (404 otherwise); internal REST price lookup; unpaid orders stay `PENDING_PAYMENT`, no automatic expiry, several allowed |

#### DEC-001 — A-1: Milestone agreement
**Decision:** Approve M1 as defined. Retain the broader M2 scope as the target, delivered incrementally rather than as one large implementation step.

**Rationale:** This provides an agreed milestone direction while allowing a smaller, working end-to-end slice.

**Scope note:** This approval covers M1 and the incremental delivery approach for M2. It does not silently approve or redefine any other milestone scope not covered by this decision.

#### DEC-002 — CC-1 / D10: VS-1 checkpoint-to-milestone mapping
**Decision:** CP-1 corresponds to M1. CP-2 through CP-5 form the first part of M2. Keycloak remains in M2, consistent with D10.

**Rationale:** This resolves the VS-1 versus M1/M2 sequencing conflict without pulling authentication into M1 or redefining D10.

**Consequence:** VS-1 is delivered across M1 and the initial increment of M2.

#### DEC-003 — Q-17: Accept VS-1
**Decision:** Accept the proposed VS-1: anonymous visitor browses a seeded restaurant and menu, signs in, places a valid single-restaurant pickup order, and sees an order-received confirmation with payment pending.

**Constraints:**
- One seeded restaurant for VS-1.
- Pickup only.
- Checkout requires authentication.
- Confirmation must not imply payment or restaurant acceptance.
- The broader M2 features remain future increments.

**Rationale:** Deliver a small, demonstrable end-to-end flow early.

#### DEC-004 — A-9: VS-1 usage scope
**Decision:** VS-1 supports local development and portfolio demonstrations.

**Presentation requirement:** Clearly label payment as unavailable. Do not represent an unpaid order as paid or restaurant-accepted.

**Operational limitation:** This decision does not authorize production deployment or real payment processing.

#### DEC-005 — CP-3 / CP-4: Durable order persistence boundary
**Decision:** Implement durable order persistence directly in CP-3 rather than deferring it to CP-4.

**Required checkpoint adjustment:**
- CP-3 includes checkout validation, trusted pricing/availability integration, order creation, durable database persistence, and the tests needed to establish correct behavior.
- CP-4 must no longer duplicate initial persistence work. Retain only its remaining distinct responsibilities, dependencies, and acceptance criteria after reviewing the existing checkpoint definitions.
- Update dependent checkpoint descriptions, sequencing, and acceptance criteria where necessary.
- Do not silently remove ownership, authorization, routing, or other previously required behavior.

**Rationale:** Avoid a temporary persistence abstraction or disabled checkout route that would add complexity for a solo developer.

**Constraint:** The order must not be reported as successfully created until durable persistence succeeds.

#### DEC-006 — Q-22 / E-10: Order-creation idempotency
**Decision:** Include idempotency for order creation.

**Requirement:** Retrying the same logical order-creation request with the same idempotency key must not create another order.

**Implementation details still requiring specification:**
- Idempotency key format and validation.
- Key scope and uniqueness constraints.
- Behavior when the same key is reused with a different request payload.
- Concurrent requests and transaction handling.
- Key retention and persistence.
- Response behavior when the original request succeeded but its response was lost.

**Rationale:** Reduce accidental duplicate orders caused by double-clicks, retries, or uncertain responses.

**Constraint:** Do not treat the decision to include idempotency as approval of unspecified implementation details.

#### Owner restatement of DEC-001 – DEC-006
The owner later restated the same six decisions in a single message. The wording is reproduced verbatim below; it
**confirms the existing records and creates no new decision IDs**. Where it is more explicit, the existing record
already contains the same content (noted per item).

1. A-1 (→ DEC-001): "Approve M1 as defined. Retain the broader M2 scope as the target, delivered incrementally."
2. CC-1 / D10 (→ DEC-002): "CP-1 corresponds to M1. CP-2 through CP-5 form the first part of M2. Keycloak remains in M2. Do not move authentication into M1." — the last sentence matches DEC-002's rationale.
3. Q-17 (→ DEC-003): "Accept VS-1: anonymous browsing, authentication, valid single-restaurant pickup checkout, durable order creation and order-received confirmation with payment pending." — "durable order creation" is covered by DEC-005.
4. A-9 (→ DEC-004): "Support local development and portfolio demonstrations. Clearly label payment unavailable. This is not approval for production deployment or real payments."
5. CP-3 / CP-4 (→ DEC-005): "Persist orders durably directly in CP-3. Update checkpoint definitions and dependent acceptance criteria. CP-3 must include the necessary persistence, validation, trusted pricing/availability integration and tests. Reconcile CP-4 to remove duplicated initial persistence work while preserving its distinct remaining responsibilities. Do not silently drop authorization, ownership, routing or other required behavior."
6. Q-22 / E-10 (→ DEC-006): "Include idempotency for order creation. Do not create duplicate orders for retries of the same logical request using the same idempotency key. Keep unspecified technical details OPEN for specification, including key scope, payload mismatch, concurrency, retention and response recovery."


#### DEC-007 — Menu item data and restaurant relationship

Each menu item has an identifier (`id`), name (`name`), INR price (`price`), availability flag (`available`), and belongs to exactly one restaurant (`restaurantId`). A restaurant may have multiple menu items.

Monetary values must use exact decimal representation and must not use binary floating-point arithmetic for monetary calculations. Database precision and scale remain an implementation decision to be finalized before CP-3.

#### DEC-008 — Restaurant attributes and unavailable item display

Restaurant browsing displays each restaurant's identifier (`id`), name (`name`), and active flag (`active`), subject to the approved browsing scope.

Unavailable menu items remain visible and are clearly marked as unavailable. Users cannot add unavailable items to the cart. The server must independently validate item availability during checkout; client-side restrictions are not sufficient.

#### DEC-009 — Public browsing scope and restaurant visibility

For the FoodieHub MVP demo, restaurant and menu browsing is public and read-only. Authentication is not required for browsing; checkout requires authentication, and guest checkout is not supported.

Public restaurant browsing is limited to the restaurant dataset explicitly seeded for the demo and includes active restaurants only. Inactive restaurants are excluded from public listings and are treated as not found (404 Not Found) when requested directly through public restaurant-detail endpoints.

Public browsing displays the approved restaurant and menu attributes, excluding the internal `active` flag. Unavailable menu items remain visible and are clearly marked as unavailable.

This decision defines MVP demo scope and does not establish a permanent product policy or authorize production behavior.

#### DEC-010 — Inactive restaurant endpoint behavior and non-disclosure

For public read-only restaurant and menu endpoints within the FoodieHub MVP demo, requests targeting an inactive restaurant must not disclose its inactive status or existence.

Requests targeting an inactive restaurant through public restaurant-detail or menu endpoints return 404 Not Found, using responses indistinguishable from those for a nonexistent restaurant.

This behavior applies only to the public endpoints covered by the MVP demo contract. It does not define administrative or internal service behavior, nor establish permanent or production policy.

#### DEC-011 — Q-19 / Q-03 (initial state only): Initial order status and confirmation meaning
The owner's approval, reproduced verbatim:

- Initial order status: `PENDING_PAYMENT`
- Confirmation means the order has been durably received and created.
- Confirmation does not imply payment success or restaurant acceptance.
- No real payment processing is implied.
- Approved customer-facing wording (option a): "Order received — payment pending; not yet accepted by the restaurant."
- This decides only the initial-state portion of Q-03.

#### DEC-012 — Menu-price database precision and scale

**Decision:** Menu prices in INR shall use `DECIMAL(10,2)` as the final database representation.

**Rationale:** CP-1 persists menu prices, so their precision and scale must be established before implementation.

**Scope:** This decision settles the menu-price column definition. It does not automatically approve the remaining D6 decisions concerning order monetary fields or rounding.

**Consequences:** Update the relevant specification, data-model planning notes and traceability as appropriate. Preserve all unrelated open decisions.

#### DEC-013 — Checkout defaults for CP-3 / CP-4 (Q-20, Q-30, Q-14 order money, Q-24, Q-29, Q-28 / OPEN-13)
The owner's approval, reproduced verbatim (2026-11-05):

> "I approve all the recommended defaults for Q-20, Q-30, Q-14, Q-24, Q-29 and Q-28 / OPEN-13."

The defaults approved are the ones presented to the owner immediately before (assistant wording, quoted):

- **Q-20:** "the restaurant exists and is active; the items exist, belong to it and are available; at least one item; quantities are positive whole numbers; prices come from the server only."
- **Q-30:** "at most 20 lines per order and a quantity of at most 50 per line. These are request-safety limits, not a business rule."
- **Q-14 (order money):** "order amounts stored as `DECIMAL(10,2)` in INR, line amount = price × quantity, total = sum of the lines, no tax or fees."
- **Q-24:** "only the person who placed it. Anyone else gets 404."
- **Q-29:** "the Order Service calls the Restaurant Service internally over REST."
- **Q-28 / OPEN-13:** "they stay `PENDING_PAYMENT`, with nothing automatic expiring or deleting them, and a customer may have several."

The same message instructed implementation in the order CP-2 (Keycloak), CP-3 (Order Service, `order_db`, `POST /api/v1/orders`), CP-4 (`GET /api/v1/orders/{id}`, owner only).

**Not decided by DEC-013** (remain as recorded elsewhere):
- The **business** quantity limit (Q-20 business limit, BR-007): the 20 / 50 values are technical bounds only.
- Maximum request payload size (part of Q-30).
- A rounding rule: none is approved. None is needed for the approved formulas (a 2-decimal price × an integer quantity, and sums of such amounts, are exact).
- Coupons (A-3): DEC-013 covers tax and fees only.
- How the internal call is authenticated (SEC-005), Q-23 (who may order), the idempotency details (§5.4, DEC-006), Q-25 (persisted fields), Q-16, Q-26, Q-27.
- The final OPEN-13 policy beyond VS-1 (gate M2).

#### DEC-014 — ZAYORA brand, menu data model and seed, customer order list (2026-11-06)
Owner selections (multiple-choice answers, 2026-11-06), after the owner supplied the ZAYORA frontend specification
and logo:

- **Brand:** the customer-facing frontend becomes **ZAYORA** ("WHERE HUNGER MEETS FLAVOURS."), an Indian
  restaurant with biryani as its signature. Internal names (repository, realm `foodiehub`, services) are unchanged.
- **Menu data (selected "Extend backend"):** an additive Restaurant Service migration adds category, description,
  diet (veg / egg / non-veg), bestseller and chef-special flags and an image key to menu items, and the menu API
  returns them. The demo seed is replaced by the ZAYORA menu.
- **Menu and prices (selected "Approve as proposed"):** the 42-dish ZAYORA menu with the INR prices, labels and
  combo contents presented to the owner on 2026-11-06 (now in `R__seed_demo_restaurant.sql`); Phirni is seeded as
  unavailable for demonstration. Prices remain `DECIMAL(10,2)` (DEC-012).
- **Customer order list (selected "Build GET /orders"):** `GET /api/v1/orders` returns the signed-in customer's own
  orders, newest first (US-04, list part only). Same authentication and ownership rules as DEC-013 Q-24.
- **Images:** the owner provides AI-generated photos; placeholders are used until then.
- **Frontend libraries (selected "Router + Lucide only"):** React Router and lucide-react are added; styling stays
  on the existing CSS design tokens and the API client on `fetch`.

**Not decided by DEC-014:** pagination or filtering of the order list; cancel (rest of US-04/US-05); combo
customisation; customer reviews (sample content only, labelled); popularity data; multiple restaurants;
everything listed under DEC-013 "Not decided".

#### DEC-015 — Roles, owner slice and who may order (Q-23) (2026-11-06)
Owner selections (multiple-choice answers, 2026-11-06):

- **Scope (selected "Owner slice"):** Keycloak realm roles `CUSTOMER` and `RESTAURANT_OWNER`; a demo owner account; an
  owner dashboard where an owner can mark their restaurant's dishes available or sold out, edit price, description and
  bestseller / chef-special labels, and see incoming orders for their restaurants. **No order status changes** (the
  order state machine remains a proposal) and no admin features.
- **Q-23 — who may order (selected "CUSTOMER role only"):** only users with the `CUSTOMER` realm role may create
  orders; others get 403. Viewing one's own orders is unchanged (any signed-in user, own orders only).

**Implementation choices, not owner-approved (proposals):** an owner is linked to a restaurant by Keycloak username in
`restaurant_db.restaurant_owner` (an admin assigns owners in US-09 later; a switch to the immutable user ID is
recommended then); owner endpoints live under `/api/v1/owner/**`; the Restaurant Service validates tokens only for
those endpoints (audience `restaurant-service`); the Order Service asks the Restaurant Service which restaurants the
caller owns, forwarding the caller's token.

**Not decided by DEC-015:** order status transitions (accept / reject / ready), adding or removing dishes, admin
(US-09), price-change rules or history, notifications.
---

## 10. Decisions needed next
1. **Before `spec.md` can be approved (SPEC):**
   - ~~Q-20 (rest), Q-24, Q-28~~ — answered by DEC-013.
   - A-3: the no-coupons part of the assumption (A2); tax and fees are settled for VS-1 by DEC-013.
2. **Before CP-1 (IMPL):** Q-14 for D1, D2, D7 (the menu-price part of D6 is settled by DEC-012) · Q-27 (CP-1 components) · Q-26 (test scope) · Q-16 (secrets rule).
3. **Before CP-2:** Q-23 (who may order) · Q-14 for D3.
4. **Before CP-3:** the §5.4 idempotency details (DEC-006) · Q-25 (persisted fields; moved from CP-4) · Q-20 (business limit) · Q-14 for D1, D4, D5 · SEC-005 (authentication of the internal call). Answered by DEC-013: Q-29, Q-30 (values; payload size still open), OPEN-13 (VS-1), Q-14 order money (D6 order part).
5. **Before CP-4:** nothing beyond Q-24 (already listed under SPEC).
6. **Deferred:** everything in §5.3, plus Q-09 (fulfilment part), Q-21 and OPEN-12. Payment-increment decisions are listed in §4.3.
