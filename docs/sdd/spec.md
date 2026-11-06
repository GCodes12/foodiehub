# FoodieHub — Specification: VS-1 (First Draft)

> **Status: DRAFT — not approvable yet.** This specification describes the **proposed** first vertical slice VS-1.
> It cannot be approved until the specification gate **G-SPEC** (§14.1) is resolved by owner answers recorded in
> [`clarification.md`](clarification.md) §9.2. **No recommendation from `clarification.md` §9.1 is approved by this
> document.** Requirements that depend on pending answers are marked **[PENDING …]** and become binding only when that
> answer is recorded. Owner decisions **DEC-001 – DEC-013** (`clarification.md` §9.2) are now reflected; the
> remaining G-SPEC items are still open. **DEC-014 – DEC-016** (ZAYORA menu, roles and owner slice, order lifecycle)
> extend the implementation beyond VS-1; their requirements are in **§16**, and §3, §9, §13 and §14.3 point to it.
>
> Created: 2026-11-04 · Revised: 2026-11-04 (two consistency reviews; owner decisions DEC-001 – DEC-012 applied); 2026-11-05 (DEC-013 applied); 2026-11-06 (DEC-014 – DEC-016 added as §16) · Sources: [`raw-requirement.md`](raw-requirement.md) (sha1 `1514270…`),
> [`clarification.md`](clarification.md) (sha1 `4ceecce…`), [`plan.md`](plan.md) (sha1 `1a0cbd3…`)
> This document does not change `plan.md`. Per **DEC-001**, M1 is approved as defined and M2 is delivered incrementally;
> per **DEC-002**, CP-1 = M1 and CP-2 – CP-5 are the first increment of M2 (D10 unchanged). `plan.md` itself still shows
> A-1 as pending; it is not edited here.

---

## 1. Purpose and scope

**Purpose.** To specify, in a testable form, the behaviour of VS-1: browsing one restaurant's menu, placing an
authenticated pickup order with server-validated contents and prices, and seeing a "received, payment pending" confirmation.

**In scope (accepted by the owner, DEC-003).** Public browsing of one seeded restaurant; sign-in; checkout validation; order
creation and persistence; order retrieval restricted to the person who placed the order; the confirmation; automated tests per checkpoint.

**Out of scope.** See §13.

## 2. How to read this specification

### 2.1 Basis labels (every requirement carries one)
| Label | Meaning |
|---|---|
| **CONFIRMED** | Confirmed requirement in `raw-requirement.md` (RR-/TC- rows classified CONFIRMED) |
| **OWNER-DECIDED** | A recorded owner decision: DEC-001 – DEC-012 (`clarification.md` §9.2); D8–D11 (owner selections); or A-10 – A-12 (recorded as DECIDED in `plan.md`; this conflicts with `plan.md` line 29 — see `raw-requirement.md` §8.1, C-03, Q-13) |
| **RECORDED-UNVERIFIED** | An architecture decision D1–D7 recorded in `plan.md` whose individual approval is unverified (Q-14) |
| **PROPOSED [PENDING Q-xx]** | A recommended default from `clarification.md`, not yet answered by the owner |
| **OPEN [GATE …]** | No answer and no adopted default; a decision gate applies (§14) |
| **ASSUMPTION** | A1–A6 in `raw-requirement.md`, pending A-3 |

### 2.2 Requirements vs implementation choices
Requirements (FR-, BR-, SEC-, NFR-, API-) state **observable behaviour**. Implementation choices — components, frameworks,
schema fields, endpoint paths, and concrete technical limits — are **not** fixed here. They are listed only as gates
(§14.2) or deferred to `data-model.md`, `api-contract.md` and `architecture-decisions.md`.

### 2.3 Identifiers
| Prefix | Meaning |
|---|---|
| FR- | Functional requirements |
| BR- | Business rules |
| API- | API behaviour |
| SEC- | Security |
| NFR- | Quality requirements |
| W- | Workflows |
| E- | Error cases |
| G- | Gates |

All IDs are stable and defined only in this document. External IDs are referenced unchanged:
- RR-, TC-, A-, D, OPEN-, US-, Q-01 – Q-16 from `raw-requirement.md` / `plan.md`;
- Q-17 – Q-30, CP-1 – CP-5, VS1-AC1 – VS1-AC9, CC-1 – CC-6 and DEC-001 – DEC-012 from `clarification.md`.

---

## 3. Actors and permissions

| Actor | Description | Permissions in VS-1 | Basis |
|---|---|---|---|
| Visitor | Anonymous person using the frontend | View the restaurant and its menu (read-only). No order actions | OWNER-DECIDED (DEC-009: public, read-only browsing; MVP demo scope); RR-007 CONFIRMED (no order management for unauthenticated users) |
| Signed-in user (orderer) | A user authenticated through Keycloak | Place an order; view **only their own** orders | Authentication: RR-007 CONFIRMED. Who may order: OWNER-DECIDED — `CUSTOMER` role only (DEC-015, Q-23; §16). Ownership rule: OWNER-DECIDED (DEC-013) |
| Restaurant owner, administrator | — | **Not active in VS-1.** The restaurant and menu are seeded data. *After VS-1:* the restaurant owner role exists (§16, DEC-015); the administrator is still not active | RR-107 role set: approval unclear (Q-02); owner role OWNER-DECIDED (DEC-015) |
| restaurant-service, order-service | System components | order-service obtains authoritative menu data from restaurant-service over an internal REST call (DEC-013, Q-29); authenticating that call is PROPOSED (SEC-005) | TC-11 topic CONFIRMED; call OWNER-DECIDED (DEC-013) |

## 4. User workflows

| ID | Workflow | Steps | Related |
|---|---|---|---|
| W-1 | Browse | The visitor opens the app → sees the restaurant details and the menu (name, price in ₹, availability) | FR-001 – FR-003 |
| W-2 | Sign in | The user chooses sign-in → authenticates with Keycloak → returns signed in; can sign out | FR-010, FR-012 |
| W-3 | Place order | The signed-in user selects items and quantities → submits checkout (pickup) → the server validates and prices the order → the order is stored → a confirmation is shown | FR-020 – FR-032 |
| W-4 | View confirmation | The orderer opens their order → sees its details and the payment-pending status | FR-040, FR-050 |
| W-5 | Rejected checkout | An invalid checkout → a clear validation error is shown; no order and no confirmation exist | FR-025, E-03 – E-06 |

---

## 5. Functional requirements

| ID | Requirement | Basis | Gate | AC | CP |
|---|---|---|---|---|---|
| FR-001 | The system shall let a visitor view one restaurant's details and its menu **without signing in**, read-only. Public browsing is limited to the restaurant data explicitly seeded for the demo and includes **active restaurants only**; inactive restaurants are excluded from public listings, and an inactive restaurant requested through a public restaurant-detail or menu endpoint returns **404 Not Found**, with externally observable response status and body matching the corresponding response for a nonexistent restaurant (E-11, SEC-008; DEC-010; MVP demo scope). Public browsing displays the restaurant's identifier (`id`) and name (`name`); the internal `active` flag is **not** displayed (DEC-009). **VS-1 scope:** the demo seed contains one restaurant (DEC-003), and the listing and visibility rules above apply to that seeded dataset; this does not broaden VS-1 to several restaurants. *(Test design, not an owner decision: verifying the inactive-restaurant 404 needs a test-only inactive restaurant fixture, separate from the demo seed.)* | Anonymous browsing and one seeded restaurant: OWNER-DECIDED for VS-1 (DEC-003). Displayed restaurant attributes: OWNER-DECIDED (DEC-008, with public display of `active` excluded by DEC-009). Read-only scope, seeded-data scope, active-only listing and 404 for inactive restaurant-detail requests: OWNER-DECIDED (DEC-009; MVP demo scope, not a permanent product policy). 404 for inactive-restaurant menu requests and non-disclosure: OWNER-DECIDED (DEC-010). RR-008 preference | — | AC1 | CP-1 |
| FR-002 | Each menu item has an identifier (`id`), name (`name`), INR price (`price`) and availability flag (`available`), and belongs to exactly one restaurant (`restaurantId`); a restaurant may have multiple menu items (DEC-007). Each menu item shall show its name, its price in INR (₹) and whether it is available; unavailable items remain visible and are clearly marked as unavailable (DEC-008) | Currency: CONFIRMED (RR-009). Item fields and restaurant relationship: OWNER-DECIDED (DEC-007). Unavailable items visible and marked: OWNER-DECIDED (DEC-008). Public display scope: OWNER-DECIDED (DEC-009) | — | AC1 | CP-1 |
| FR-003 | Public browsing shall expose no order data (the same rule as SEC-006; tested once) | CONFIRMED (RR-007); OWNER-DECIDED (DEC-009: public browsing is read-only and displays only the approved restaurant and menu attributes) | — | AC2 (indirect) | CP-1 |
| FR-010 | A user shall be able to sign in and sign out through Keycloak from the frontend | Topic CONFIRMED (TC-11); D10 OWNER-DECIDED (Keycloak in M2; VS-1's CP-2 is part of M2 — CC-1 resolved by DEC-002); flow details per `plan.md` §6 (PROPOSED) | G-CP2 | CP-2 DoD | CP-2 |
| FR-011 | Creating or retrieving an order without valid authentication shall be rejected (401); no order is created | CONFIRMED (RR-007) for order management; placing an order requires authentication: OWNER-DECIDED for VS-1 (DEC-003); no guest checkout within the MVP demo scope: OWNER-DECIDED (DEC-009; not a permanent or production policy) | — | AC2 | CP-3, CP-4 |
| FR-012 | The UI shall require sign-in before checkout | OWNER-DECIDED for VS-1 (DEC-003: checkout requires authentication); within the MVP demo scope, guest checkout is not supported (DEC-009; not a permanent or production policy) | — | AC2 (UI part) | CP-5 |
| FR-013 | **Authorization policy** for placing an order: as decided under Q-23 (**unresolved**; proposed: any authenticated user of the FoodieHub realm, no role check). This is the policy only. Users can place orders from CP-3, when the routed creation endpoint with durable storage is delivered (DEC-005). CP-2 configures the policy, and CP-3 applies it on the creation endpoint | PROPOSED [PENDING Q-23] | G-CP2 | — (no VS1 AC; verified by CP-2/CP-3 tests) | CP-2, CP-3 |
| FR-020 | A checkout shall contain one restaurant, one or more items with quantities, and the fulfilment type **pickup** | RR-003 CONFIRMED; pickup only: OWNER-DECIDED for VS-1 (DEC-003; part of RR-006 deferred, not changed) | — | AC3 | CP-3 |
| FR-021 | The server shall validate every checkout against BR-001 – BR-006 and BR-008 before creating an order. BR-007 (business quantity limit) is **not enforced until it is decided**; until then the mandatory technical bounds of BR-008 still apply, so quantities are **never** treated as unlimited | OWNER-DECIDED (DEC-013, Q-20); BR-001 CONFIRMED; BR-008 values OWNER-DECIDED (DEC-013, Q-30) | — | AC3 | CP-3 |
| FR-022 | The server shall determine unit prices from the restaurant's current menu and compute line amounts, subtotal and total (BR-009, BR-010). Client-sent prices or totals shall be ignored | OWNER-DECIDED (DEC-013: prices from the server only; order money and formulas); price lookup by internal REST call (DEC-013, Q-29); RR-021 topic CONFIRMED; D5 snapshots RECORDED-UNVERIFIED | — | AC4 | CP-3 |
| FR-023 | The server shall reject checkouts that exceed the technical request-safety bounds (BR-008) | Gate set in `clarification.md` Q-30; values OWNER-DECIDED (DEC-013: at most 20 lines, quantity at most 50 per line). Maximum payload size: OPEN | — | AC3 | CP-3 |
| FR-024 | Retrying the same logical order-creation request with the same idempotency key shall not create another order (DEC-006). Key format, scope, payload mismatch, concurrency, retention and lost-response behaviour are **not yet specified** (`clarification.md` §5.4) | Inclusion: OWNER-DECIDED (DEC-006). Details: OPEN [GATE G-CP3]. D4 RECORDED-UNVERIFIED; RR-014 still IN + OC in `raw-requirement.md` | G-CP3 | AC8 | CP-3 |
| FR-025 | A rejected checkout shall create no order and return no confirmation | OWNER-DECIDED (DEC-013, Q-20 validation set) | — | AC3 | CP-3 |
| FR-030 | A valid checkout shall be stored atomically as one order with line snapshots (name, unit price, quantity), total, currency INR and initial status `PENDING_PAYMENT` | Status: OWNER-DECIDED (DEC-011; initial state only); snapshots: D5 RECORDED-UNVERIFIED; fields: Q-25 | G-CP3 | AC5 | CP-3 |
| FR-031 | The success response and confirmation shall be returned **only after the order is committed**. If storage fails, no order exists and no confirmation is shown | OWNER-DECIDED (DEC-005: not reported as created until durable persistence succeeds) | — | AC5 | CP-3 |
| FR-032 | Each order shall be associated with the authenticated user who placed it, at creation | OWNER-DECIDED (DEC-013, Q-24); RR-012 topic CONFIRMED | — | AC7 | CP-3 |
| FR-040 | The orderer shall be able to retrieve their own order. Any other authenticated user shall receive 404 | OWNER-DECIDED (DEC-013, Q-24) | — | AC7 | CP-4 |
| FR-050 | After a successful order, the confirmation shall show the order number, items, total in ₹ and status. It shall state that **payment has not been taken** and that **the restaurant has not accepted the order**, using the approved wording "Order received — payment pending; not yet accepted by the restaurant." A confirmation means the order has been durably received and created; it does not imply payment success or restaurant acceptance, and no real payment processing is implied | Meaning, status value `PENDING_PAYMENT` and customer-facing wording: OWNER-DECIDED (DEC-003, DEC-004, DEC-011) | — | AC6 | CP-5 |
| FR-060 | In VS-1, orders shall remain `PENDING_PAYMENT`; there is no payment, expiry, cancellation or automated cleanup | Initial status: OWNER-DECIDED (DEC-011). No transitions in VS-1: a consequence of scope (payment and cancellation are out of scope, §13; DEC-003). Usage scope: OWNER-DECIDED (DEC-004: local development and portfolio demos; payment labelled unavailable; no production). No automated expiry or deletion: OWNER-DECIDED (DEC-013, Q-28). Retention beyond VS-1: not decided | — | — (no VS1 AC; the initial-status and confirmation criteria do not test Q-28 behaviour) | CP-3 |
| FR-061 | A customer may hold several unpaid orders at once (VS-1) | OWNER-DECIDED for VS-1 (DEC-013, OPEN-13); the final policy stays OPEN-13 (gate M2) | — | — | CP-3 |

## 6. Business rules and validation

| ID | Rule | Basis | Gate |
|---|---|---|---|
| BR-001 | All items in an order come from exactly one restaurant | **CONFIRMED** (RR-003) | — |
| BR-002 | The restaurant exists and is active | OWNER-DECIDED (DEC-013, Q-20) | — |
| BR-003 | Every item exists and belongs to that restaurant | OWNER-DECIDED (DEC-013, Q-20) | — |
| BR-004 | Every item is available at checkout. The server validates item availability independently during checkout; client-side restrictions are not sufficient | OWNER-DECIDED (DEC-008) | — |
| BR-005 | The cart contains at least one item | OWNER-DECIDED (DEC-013, Q-20) | — |
| BR-006 | Each quantity is a positive integer. As a business rule this is pending Q-20; positive-integer validation is **also** part of the mandatory technical bounds (BR-008), whatever the answer to Q-20 | OWNER-DECIDED (DEC-013, Q-20) | — |
| BR-007 | **Business** quantity limit per line or per order: **not specified.** Placeholder — no value is assumed, and it is **not enforced** until the owner decides. Its absence does **not** mean quantities are unlimited: BR-008 always applies | OPEN [GATE G-CP3] (Q-20 business limit) | G-CP3 |
| BR-008 | **Technical** request-safety bounds: positive integers; maximum payload size; maximum number of lines; a per-line maximum within the integer range; and line amounts and the total must fit the order money columns (`DECIMAL(10,2)`, at most 99,999,999.99, **if D6 applies to order fields** — Q-14; menu prices are already `DECIMAL(10,2)` per DEC-012). Concrete values and their rationale must be documented and reviewed before CP-3 is implemented. These are technical limits, not business rules. **Mandatory:** enforcement can't be deferred, even though BR-007 is | Gate set in `clarification.md` Q-30. Values OWNER-DECIDED (DEC-013): at most 20 lines per order, quantity 1–50 per line; order amounts `DECIMAL(10,2)` (DEC-013), so a line amount or total above 99,999,999.99 is rejected. Maximum payload size: OPEN | G-CP3 (payload size only) |
| BR-009 | Line amount = server unit price × quantity; subtotal = sum of line amounts | OWNER-DECIDED (DEC-013, Q-14 order money) | — |
| BR-010 | Total = subtotal: pickup, no fees, no tax, no coupons | Pickup: OWNER-DECIDED for VS-1 (DEC-003); no tax or fees: OWNER-DECIDED (DEC-013); no coupons: ASSUMPTION A2 [PENDING A-3] | G-SPEC (coupons only) |
| BR-011 | All amounts are in INR | **CONFIRMED** (RR-009, based on A-12, recorded as DECIDED; the status conflict with `plan.md` line 29 is Q-13) | — |
| BR-012 | Monetary values use an exact decimal representation, and monetary calculations shall not use binary floating-point arithmetic (DEC-007). **Menu prices** in INR use `DECIMAL(10,2)` as the final database representation (DEC-012), so a menu price is at most 99,999,999.99; this is settled before CP-1 persists menu prices. **Database precision and scale for order monetary fields, and rounding, are unresolved** (DEC-007: to be finalized before CP-3). D6 records 2 decimal places with HALF_UP rounding for them, but that is not finalized here. If 2 decimal places are adopted for order amounts, whole-number quantities involve no rounding step in VS-1 | No binary floating point, exact decimal: OWNER-DECIDED (DEC-007). Menu-price column `DECIMAL(10,2)`: OWNER-DECIDED (DEC-012). Order-field precision and scale: OWNER-DECIDED (DEC-013: `DECIMAL(10,2)`, INR). Rounding: no rule approved; none is needed for the DEC-013 formulas (exact) | — |
| BR-013 | No minimum order value applies, because none is specified. OPEN-12 remains open | OPEN-12 (DEFER) | — |

## 7. API behaviour (requirements level)

Endpoint paths, payload schemas and status codes other than those stated here belong to `api-contract.md`.
The paths in `plan.md` §8 are PROPOSED references only.

| ID | Behaviour | Related |
|---|---|---|
| API-001 | A public read interface returns the restaurant details and the menu. It requires no authentication and modifies nothing (public, read-only: DEC-009). It covers active restaurants only; an inactive restaurant requested through a public restaurant-detail or menu endpoint returns 404, with externally observable response status and body matching the corresponding response for a nonexistent restaurant (E-11, SEC-008; DEC-010) | FR-001 – FR-003 |
| API-002 | An authenticated order-creation interface accepts a checkout (restaurant, items, quantities, fulfilment type); it also accepts an idempotency key (DEC-006; format per `clarification.md` §5.4). It validates the checkout (FR-021), prices it (FR-022) and stores it (FR-030). It returns the created order's identifier, contents, total and status only after commit (FR-031). The response when the **commit outcome is uncertain** is not yet specified (E-10; DEC-006 requires it to be specified) | FR-020 – FR-031 |
| API-003 | An authenticated order-retrieval interface returns an order only to its orderer (FR-040). Without authentication it returns 401 (FR-011). It requires the client to know the order's identifier; there is no order list in VS-1 (E-10) | FR-040, FR-011 |
| API-004 | Error responses use one consistent error format: RFC 9457 Problem Details per D7 (RECORDED-UNVERIFIED, Q-14). Validation errors are clear (AC3); their exact content and format are defined in `api-contract.md` | §12 |
| API-005 | **Owner decision DEC-005:** the creation interface is delivered, routed and backed by durable storage in CP-3. There is no temporary persistence abstraction and no disabled checkout route. An order is reported as created only after durable persistence succeeds | `clarification.md` §3.2 and `clarification.md` §9.2 |

## 8. Security and order ownership

| ID | Requirement | Basis | AC |
|---|---|---|---|
| SEC-001 | No order-management capability is available to unauthenticated users | **CONFIRMED** (RR-007) | AC2 |
| SEC-002 | Tokens are validated at the gateway **and** in each service that handles orders | D3 RECORDED-UNVERIFIED [PENDING Q-14] | AC2 |
| SEC-003 | A user can only retrieve orders they placed. Requests for other users' orders return 404, which does not reveal that the order exists | OWNER-DECIDED (DEC-013, Q-24) | AC7 |
| SEC-004 | Order ownership is taken from the authenticated identity, never from client-supplied data | OWNER-DECIDED in substance (DEC-013, Q-24: "only the person who placed it"); TC-11 topic | AC7 |
| SEC-005 | Calls from order-service to restaurant-service are authenticated service-to-service | TC-11 topic CONFIRMED; the call is decided (DEC-013, Q-29: internal REST); its authentication is PROPOSED and **not implemented in CP-3**: the lookup uses the public, read-only menu endpoint | — (no VS1 AC; CP-3 test per `clarification.md` §3.2) |
| SEC-006 | Browsing interfaces are read-only and expose no personal or order data | Read-only: OWNER-DECIDED (DEC-009). Only approved restaurant and menu attributes displayed: OWNER-DECIDED (DEC-009); RR-007 | AC2 (indirect) |
| SEC-007 | Secrets and credentials are not committed to the repository | PROPOSED [PENDING Q-16] (TC-15 is a task-specific instruction, not yet a project constraint) | — |
| SEC-008 | **Public inactive-restaurant non-disclosure.** For public restaurant-detail and menu endpoints within the FoodieHub MVP demo contract, requests targeting an inactive restaurant must return 404 Not Found, with externally indistinguishable response status and body from requests targeting a nonexistent restaurant. Other meaningful externally observable response differences that could disclose inactive restaurant existence must be avoided. | OWNER-DECIDED (DEC-010; requirement text provided by the owner). Testable directly by comparing status and body of inactive- vs nonexistent-restaurant requests. **No constant-time or timing-equivalence guarantee and no specific technical mechanism is implied**; any further checks are to be defined in `api-contract.md` / the test plan | AC1 |

Overlapping requirements, each tested once: FR-003 ≡ SEC-006 · FR-011 ⊂ SEC-001 · FR-032 ≈ SEC-004.

## 9. Order lifecycle and unpaid-order behaviour

- **Initial state only:** a new order is `PENDING_PAYMENT` (DEC-011; decides only the initial-state part of Q-03). VS-1 defines **no
  transitions**; the transitions added after VS-1 are in §16.3 (DEC-016). The rest of the RR-102 lifecycle stays PROPOSED and outside this specification.
- **Meaning:** "order received" = durably received and created. It does **not** mean that payment succeeded or that the restaurant has accepted the order, and no real payment processing is implied (DEC-011; FR-050).
- **Temporary, development-only behaviour** [Q-28 decided by DEC-013; usage scope decided by DEC-004 — local development and portfolio demos, payment labelled unavailable, no production]: unpaid orders stay `PENDING_PAYMENT`; there is no automated
  expiry, cancellation or cleanup; developers may reset their local database. This is **not** a production policy.
- **Decided for VS-1 (DEC-013):** a customer may hold several unpaid orders (FR-061). **Open:** the final OPEN-13 policy (gate M2); how far orders may accumulate and any cleanup or expiry policy (OPEN-09,
  A-4, A-14 — payment increment).

## 10. Checkpoints (implementation sequence; CP-1 = M1, CP-2 – CP-5 = first increment of M2 per DEC-002)

| CP | Delivers | Requirements verified | AC |
|---|---|---|---|
| CP-1 | Public browsing end-to-end (no Keycloak, no order-service) | FR-001 – FR-003, SEC-006, SEC-008, BR-011 | AC1 |
| CP-2 | Sign-in and sign-out; token validation against a test-only protected route; browsing still public. CC-1 is resolved by DEC-002 (Keycloak in M2; D10 unchanged) | FR-010, FR-013 (policy configuration), SEC-002 | CP-2 DoD; AC1 regression |
| CP-3 | Validation, pricing, safety bounds, order creation with **durable persistence**, idempotency and a routed creation endpoint (DEC-005, DEC-006) | FR-011 (creation), FR-013, FR-020 – FR-025, FR-030 – FR-032, FR-060, BR-001 – BR-006, BR-008 – BR-010 (BR-007 pending), SEC-001 (creation), SEC-004, SEC-005 | AC2 (creation part), AC3, AC4, AC5, AC8 |
| CP-4 | Order retrieval with ownership and access checks (persistence is in CP-3, DEC-005) | FR-011 (retrieval), FR-040, SEC-003, SEC-004 (retrieval) | AC2 (retrieval part), AC7 |
| CP-5 | Confirmation UI and complete integrated verification of AC1 – AC8 (AC9) | FR-012, FR-050, NFR-001 – NFR-002 | AC2 (UI part), AC6, AC9 |

**Definition of done** (from `clarification.md` §3.5):
- Each checkpoint adds its tests in the same checkpoint, passes its mapped ACs, keeps all earlier tests passing, and runs locally without CI.
- No checkpoint depends on a later one.
- CP-5 runs the complete acceptance verification (AC9).

## 11. Acceptance criteria

These are adopted **by reference** from `clarification.md` §3.4. **That wording is authoritative**; the summaries below
are non-authoritative and do not change it.

| AC | Summary (non-authoritative) | Covered by |
|---|---|---|
| VS1-AC1 | Anonymous, read-only browsing of active seeded restaurants and their menus with ₹ prices; an inactive restaurant requested through a public restaurant-detail or menu endpoint returns 404, indistinguishable from a nonexistent restaurant, so neither its inactive status nor its existence is disclosed; `active` is not displayed | FR-001, FR-002, SEC-008 |
| VS1-AC2 | 401 for unauthenticated creation (no order created) and retrieval; sign-in required before checkout in the UI; browsing stays public | FR-011, FR-012, SEC-001, SEC-002; indirectly FR-003, SEC-006 |
| VS1-AC3 | Invalid checkouts are rejected with a clear validation error; no order and no confirmation | FR-020, FR-021, FR-023, FR-025, BR-001 – BR-006, BR-008 |
| VS1-AC4 | Server-authoritative pricing; exact decimals, no binary floating point (DEC-007); menu prices `DECIMAL(10,2)` (DEC-012); 2 decimal places and HALF_UP for order amounts where needed per D6 (recorded, not owner-approved — Q-14) | FR-022, BR-009 – BR-012 |
| VS1-AC5 | Atomic storage with snapshots and `PENDING_PAYMENT`; success only after commit | FR-030, FR-031 |
| VS1-AC6 | Confirmation content, with the approved wording "Order received — payment pending; not yet accepted by the restaurant." (DEC-011) | FR-050 |
| VS1-AC7 | Only the orderer can retrieve the order; others get 404 | FR-032, FR-040, SEC-003, SEC-004 |
| VS1-AC8 | Included (DEC-006): a retry with the same idempotency key creates no second order; details per `clarification.md` §5.4 | FR-024 |
| VS1-AC9 | Complete VS-1 verification at CP-5, locally, without CI | NFR-001, NFR-002 |

### 11.1 Quality requirements
| ID | Requirement | Basis | AC |
|---|---|---|---|
| NFR-001 | VS-1 builds and its tests run locally from a clean checkout without CI; setup is documented and reproducible | **CONFIRMED** in part (TC-06: CI never blocks local development; TC-05). Clean-checkout reproducibility and documented setup: PROPOSED (VS1-AC9) | AC9 |
| NFR-002 | Automated tests are added with each feature, in the checkpoint that implements it. The test scope follows Q-26 | PROPOSED [PENDING Q-26]; TC-12 | AC9 |

## 12. Error handling expectations

| ID | Condition | Expected outcome | Req. |
|---|---|---|---|
| E-01 | No or invalid authentication on an order interface | 401; no order created; no order data returned | FR-011, SEC-001 |
| E-02 | Authenticated user requests another user's order, or an order that doesn't exist | 404 (no disclosure) | FR-040, SEC-003 |
| E-03 | Items from more than one restaurant | Clear validation error; no order | BR-001 |
| E-04 | Unknown restaurant, inactive restaurant, unknown item or unavailable item | Validation error; no order | BR-002 – BR-004 |
| E-05 | Empty cart, or a quantity that isn't a positive integer | Validation error; no order | BR-005, BR-006 |
| E-06 | Request exceeds the technical safety bounds | Validation error; no order | BR-008 |
| E-07 | Storage **definitely** fails during order creation (the transaction did not commit) | No order exists; no confirmation; an error is returned | FR-031 |
| E-08 | restaurant-service unavailable during pricing | No order is created and an error is returned. **The exact behaviour (status, retry) is not specified** → `api-contract.md` / Q-29 | FR-022 |
| E-09 | Same idempotency key with a different payload, or concurrently (DEC-006) | Per `clarification.md` §5.4 — **not yet decided** | FR-024 |
| E-10 | **The commit outcome is uncertain:** the order may have been committed, but the response never reached the client (timeout, lost connection) | **NOT SPECIFIED** — belongs to the future API and persistence contract (`api-contract.md`, `data-model.md`). Known consequences: the client gets no confirmation even though an order may exist; a retry with the same idempotency key must not create a duplicate (DEC-006), but the response to that retry is not yet specified; without an order list (out of scope, CC-6) the user cannot find the order without its identifier | FR-031, FR-024, API-002, API-003 |
| E-11 | An inactive restaurant is requested through a public restaurant-detail or menu endpoint | 404 Not Found, with response status and body indistinguishable from a request for a nonexistent restaurant (DEC-009, DEC-010) | FR-001, API-001, SEC-008 |

The precise HTTP status for validation errors is left to `api-contract.md`; it is not invented here.

## 13. Out of scope (VS-1)
- Simulated payment, the payment deadline and expiry automation (the payment increment).
- Cancellation, restaurant workflow (accept/reject/prepare), notifications and the order list. *(After VS-1, the order
  list, the restaurant workflow and owner menu edits were added by DEC-014 – DEC-016, §16; cancellation and
  notifications remain out of scope.)*
- Admin functions, restaurant or menu management, and multiple restaurants.
- Self-delivery and all delivery rules (A-8, OPEN-11, OPEN-19), the price-change check (Q-21) and minimum order value (OPEN-12).
- Consul, Jenkins/SonarQube as a gate, and browser E2E tests.
- Any change to `plan.md` milestones.

Changing any of this requires an explicit owner scope decision.

## 14. Dependencies, unresolved decisions and gates

### 14.1 G-SPEC — blocks approval of this specification
**Resolved by owner decisions:** Q-17 (DEC-003) · the CP-3 / CP-4 cut (DEC-005) · the A-9 usage scope
(DEC-004) · Q-07 and Q-18 for VS-1 (DEC-003) · Q-05 menu item fields (DEC-007) · restaurant attributes displayed
(DEC-008) · server-side availability validation (DEC-008, BR-004) · Q-06 public browsing scope (DEC-009) · inactive-restaurant
browsing (DEC-009) · Q-07 for the MVP demo (DEC-009) · inactive-restaurant menu endpoint and non-disclosure (DEC-010, SEC-008) · Q-19 and the initial state of Q-03 (DEC-011).

**Still open:**
- **Cart behaviour for unavailable items — flagged, not adopted as a requirement.** DEC-008 (`clarification.md` §9.2)
  contains the sentence "Users cannot add unavailable items to the cart." Per the owner's instruction for this edit, it
  is **not** adopted as an approved requirement in this specification and is treated as an unresolved behaviour decision.
  The owner needs to confirm its status. The server-side availability check (BR-004) does not depend on it.
- A-3, insofar as BR-010 relies on assumption A2 (no coupons). Tax and fees are settled for VS-1 by DEC-013.

Resolved by DEC-013: Q-20 (rest of the validation set), Q-24 (ownership), Q-28 (unpaid orders stay `PENDING_PAYMENT`,
no automatic expiry or deletion).

The recommended defaults are listed in `clarification.md` §9.1. Those not covered by DEC-001 – DEC-013 are **not** approved.

### 14.2 Implementation gates — can wait until the checkpoint
| Gate | Decisions |
|---|---|
| G-CP1 | Q-14 for D1, D2, D7 · Q-27 (CP-1 components) · Q-26 (test scope) · Q-16 (secrets rule) · (the menu-price precision and scale is settled by DEC-012: `DECIMAL(10,2)`, final) |
| G-CP2 | Q-23 (who may order) · Q-14 for D3 · (CC-1 resolved by DEC-002) |
| G-CP3 | the `clarification.md` §5.4 idempotency details (DEC-006) · Q-25 (persisted fields; moved from G-CP4 by DEC-005) · Q-20 business limit (BR-007) · Q-30 maximum payload size · Q-14 for D1 (`order_db`), D4, D5 · SEC-005 authentication · (answered by DEC-013: Q-29, Q-30 values, OPEN-13 for VS-1, order money) |
| G-CP4 | None (Q-24 answered by DEC-013) |

### 14.3 Recorded owner decisions this specification relies on
- **D8:** sync REST between services. Used for the price lookup (SEC-005); the outbox is not used in VS-1.
- **D9:** fulfilment chosen per order. VS-1 offers pickup only (DEC-003).
- **D10:** Keycloak in M2 — unchanged; VS-1's CP-2 is part of M2 (DEC-002).
- **D11:** one MySQL instance with a database per service.
- **A-11:** Spring Boot 4.x, with its condition.
- **A-12:** INR.
- **DEC-001 – DEC-006** (`clarification.md` §9.2): M1 approved, M2 delivered incrementally; the checkpoint-to-milestone mapping; VS-1 accepted; the A-9 usage scope; durable persistence in CP-3; idempotent order creation.
- **DEC-007 – DEC-008** (`clarification.md` §9.2): menu item fields and the one-restaurant relationship; exact-decimal money without binary floating point; restaurant attributes displayed; unavailable items visible and marked; server-side availability validation.
- **DEC-009** (`clarification.md` §9.2): public, read-only browsing of seeded data, active restaurants only; inactive restaurants → 404 on public restaurant-detail endpoints; `active` not displayed; no guest checkout. MVP demo scope only — not a permanent product policy or production behaviour.
- **DEC-010** (`clarification.md` §9.2): public restaurant-detail and menu requests for an inactive restaurant → 404, indistinguishable from a nonexistent restaurant (SEC-008); public MVP demo endpoints only — not admin, internal or production behaviour.
- **DEC-011** (`clarification.md` §9.2): initial order status `PENDING_PAYMENT`; a confirmation means durably received and created, not payment success or restaurant acceptance; no real payment processing; approved wording "Order received — payment pending; not yet accepted by the restaurant." Decides only the initial-state part of Q-03.
- **DEC-012** (`clarification.md` §9.2): menu prices in INR use `DECIMAL(10,2)` as the final database representation. Does not approve the remaining D6 decisions on order monetary fields or rounding.
- **DEC-013** (`clarification.md` §9.2): checkout validation set (Q-20, except the business quantity limit); technical bounds of at most 20 lines and quantity 1–50 per line (Q-30); order amounts `DECIMAL(10,2)` in INR, line = price × quantity, total = sum, no tax or fees (Q-14 order money); only the orderer can view an order, others get 404 (Q-24); internal REST price lookup (Q-29); unpaid orders stay `PENDING_PAYMENT` with no automatic expiry or deletion, several allowed per customer (Q-28, OPEN-13 for VS-1).

- **DEC-014 – DEC-016** (`clarification.md` §9.2): ZAYORA brand, menu details and the 42-dish seed, the customer's
  own order list (DEC-014); roles `CUSTOMER` / `RESTAURANT_OWNER`, the owner slice and Q-23 (DEC-015); the pickup
  order lifecycle with pay-at-counter acceptance, a final Picked-up step and optional reject reasons (DEC-016). See §16.

These are recorded owner decisions (D8–D11 are owner selections whose wording was written by the assistant; A-10 – A-12 conflict
with line 29 of `plan.md`, Q-13). **No other decision is treated as approved.**

### 14.4 Conflicts with the existing plan
| ID | Conflict | Path |
|---|---|---|
| CC-1 | VS-1 introduces Keycloak at CP-2, but **D10** schedules Keycloak for M2, and the owner's preference RR-008 is "M1 public browsing and M2 authenticated checkout" | **Resolved by DEC-002** |
| CC-2 | VS-1 is a different cut from `plan.md` **M1/M2**: M2 also contains the quote, serviceability, fee snapshot, `expectedTotal`, the order list and cancel | **Resolved by DEC-001 / DEC-002** (M2 delivered incrementally; VS-1 is its first increment) |
| CC-3 | One restaurant in VS-1 vs all active restaurants in US-01 | **Resolved for VS-1 by DEC-003** (US-01 unchanged) |
| CC-4 | "Confirmation" before payment could be misread as paid or accepted | **Resolved by DEC-003 / DEC-004 / DEC-011** |
| CC-5 | CI-1 timing (A-2) is anchored to M1, which is now CP-1 (DEC-002); A-2 is still pending | DEFER |
| CC-6 | The order list (`plan.md` §8) is outside VS-1 | §13 |

---

## 15. Traceability matrix

| Req | Source IDs | Clarification Q | AC | CP |
|---|---|---|---|---|
| FR-001 | RR-008, RR-011, DEC-003, DEC-008, DEC-009, DEC-010 | Q-06 (DEC-009, DEC-010) | AC1 | CP-1 |
| FR-002 | RR-009, RR-011, DEC-007, DEC-008, DEC-009 | Q-05 (DEC-007), Q-06 (DEC-009) | AC1 | CP-1 |
| FR-003 | RR-007, DEC-009 | Q-06 (DEC-009) | AC2 (indirect) | CP-1 |
| FR-010 | TC-01, TC-11, D10, DEC-002 | — (CC-1 resolved by DEC-002) | CP-2 DoD | CP-2 |
| FR-011 | RR-007, DEC-009 | Q-07 (DEC-003, DEC-009) | AC2 | CP-3, CP-4 |
| FR-012 | RR-007, DEC-009 | Q-07 (DEC-003, DEC-009) | AC2 | CP-5 |
| FR-013 | RR-007, RR-107 | Q-23, Q-02 | — | CP-2, CP-3 |
| FR-020 | RR-003, RR-006 | Q-18 (DEC-003) | AC3 | CP-3 |
| FR-021 | RR-003 | Q-20 | AC3 | CP-3 |
| FR-022 | RR-021, D5, D6 | Q-20, Q-29 | AC4 | CP-3 |
| FR-023 | D6 | Q-30 | AC3 | CP-3 |
| FR-024 | RR-014, D4, DEC-006 | Q-22, Q-09 (duplicate-checkout part) | AC8 | CP-3 |
| FR-025 | RR-003 | Q-20 | AC3 | CP-3 |
| FR-030 | RR-022, RR-102, D5, DEC-005, DEC-011 | Q-19 (DEC-011), Q-03 (initial state, DEC-011), Q-25 | AC5 | CP-3 |
| FR-031 | DEC-005 (VS1-AC5) | Q-19 (DEC-011) | AC5 | CP-3 |
| FR-032 | RR-012 | Q-24 | AC7 | CP-3 |
| FR-040 | RR-012 | Q-24 | AC7 | CP-4 |
| FR-050 | RR-004, RR-106, DEC-011 | Q-19 (DEC-011) | AC6 | CP-5 |
| FR-060 | RR-106, A-9 (DEC-004), DEC-011 | Q-28 | — | CP-3 |
| FR-061 | OPEN-13 | — | — | CP-3 |
| BR-001 | RR-003 | — | AC3 | CP-3 |
| BR-002 – BR-003 | RR-003, RR-011 | Q-20 | AC3 | CP-3 |
| BR-004 | RR-011, DEC-008 | Q-20 (availability part, DEC-008) | AC3 | CP-3 |
| BR-005 – BR-006 | RR-003, RR-011 | Q-20 | AC3 | CP-3 |
| BR-007 | — | Q-20 (business limit) | — | CP-3 |
| BR-008 | D6, D7, DEC-012 | Q-30 | AC3 | CP-3 |
| BR-009 – BR-010 | RR-021, A2 | Q-20, Q-18 | AC4 | CP-3 |
| BR-011 | RR-009, A-12 | Q-13 (status record) | AC1, AC4 | CP-1, CP-3 |
| BR-012 | D6, DEC-007, DEC-012 | Q-14 (menu-price part: DEC-012) | AC4 | CP-1, CP-3 |
| BR-013 | OPEN-12 | — | — | — |
| API-001 – API-005 | as their FRs | Q-22, Q-29 | AC1 – AC8 | CP-1 – CP-4 |
| SEC-001 | RR-007 | Q-07 | AC2 | CP-3, CP-4 |
| SEC-002 | D3 | Q-14 | AC2 | CP-2 – CP-4 |
| SEC-003 – SEC-004 | RR-012, TC-11 | Q-24 | AC7 | CP-3, CP-4 |
| SEC-005 | TC-11, D8 | Q-29 | — | CP-3 |
| SEC-006 | RR-007, DEC-009 | Q-06 (DEC-009) | AC2 (indirect) | CP-1 |
| SEC-007 | TC-07, TC-15 | Q-16 | — | CP-1 |
| SEC-008 | DEC-010 | Q-06 (DEC-010) | AC1 | CP-1 |
| NFR-001 | TC-05, TC-06 | — | AC9 | CP-5 |
| NFR-002 | TC-12 | Q-26 | AC9 | all |

---

## 16. After VS-1: menu details, roles and order lifecycle (DEC-014 – DEC-016)

This section adds the requirements decided on 2026-11-06. It does not change §1 – §15 except where they point here,
and it does not approve any open item listed in §14. Basis labels as in §2.1; "PROPOSED" marks implementation choices
recorded with the decision but not approved by the owner.

### 16.1 Menu and order list (DEC-014)

| ID | Requirement | Basis |
|---|---|---|
| FR-101 | Each menu item carries a category code, an optional description (≤ 300 characters), an optional diet (`VEG`, `EGG`, `NON_VEG`), bestseller and chef-special labels, an optional image key and a menu position; the public menu returns them in menu order. | OWNER-DECIDED (DEC-014) |
| FR-102 | The demo restaurant is ZAYORA with the 42 dishes, prices and labels approved on 2026-11-06. | OWNER-DECIDED (DEC-014) |
| FR-103 | `GET /api/v1/orders` returns the signed-in user's own orders, newest first; never another user's. | OWNER-DECIDED (DEC-014); ownership as DEC-013 |
| FR-104 | No pagination or filtering of the order list. | Not decided (DEC-014 "Not decided") |

### 16.2 Roles and the owner slice (DEC-015)

| ID | Requirement | Basis |
|---|---|---|
| SEC-101 | Keycloak realm roles `CUSTOMER` and `RESTAURANT_OWNER`. Only `CUSTOMER` may create orders (Q-23); others get 403. | OWNER-DECIDED (DEC-015) |
| FR-110 | An owner sees the restaurants they manage and their full menu. | OWNER-DECIDED (DEC-015) |
| FR-111 | An owner may mark a dish of their own restaurant available or sold out and change its price, description and labels; customers see the change on the next menu load. Price rules as DEC-012 (INR, `DECIMAL(10,2)`, > 0). | OWNER-DECIDED (DEC-015); "> 0" PROPOSED |
| FR-112 | An owner sees the orders placed at their restaurants, newest first, without customer identities. | OWNER-DECIDED (DEC-015); "without identities" PROPOSED |
| SEC-102 | Another restaurant's data answers 404, never revealing ownership. Owner endpoints need the `RESTAURANT_OWNER` role (403 otherwise) and a token issued for the service. | PROPOSED (DEC-015 implementation choices) |
| SEC-103 | Ownership is stored in Restaurant Service (owner linked by Keycloak username); Order Service asks it with the caller's token. | PROPOSED (DEC-015 implementation choices) |

### 16.3 Order lifecycle (DEC-016)

| ID | Requirement | Basis |
|---|---|---|
| FR-120 | Allowed moves: `PENDING_PAYMENT → ACCEPTED`, `PENDING_PAYMENT → REJECTED`, `ACCEPTED → PREPARING`, `PREPARING → READY_FOR_PICKUP`, `READY_FOR_PICKUP → PICKED_UP`. `REJECTED` and `PICKED_UP` are final. | OWNER-DECIDED (DEC-016) |
| FR-121 | An unpaid order may be accepted; the customer pays at the counter on pickup. Nothing is recorded as paid. | OWNER-DECIDED (DEC-016) |
| FR-122 | A rejection may carry one optional reason, shown to the customer: `SOLD_OUT`, `TOO_BUSY`, `CLOSING`. | Optional reason OWNER-DECIDED (DEC-016); the list PROPOSED |
| FR-123 | Only the owner of the order's restaurant changes its status; the order total never changes. | OWNER-DECIDED (DEC-016) |
| FR-124 | The customer sees the current status and the time of each step; the page refreshes while the order is in progress. | Seeing updates OWNER-DECIDED (DEC-016); polling PROPOSED |
| BR-101 | A skipped step, a reason on a non-rejection, or a change based on an out-of-date status is refused (409); the request states the status the owner saw. | PROPOSED (DEC-016 implementation choices) |
| BR-102 | Every status change is recorded: who, when, from, to, reason. Customers never see who made it. | PROPOSED |

### 16.4 Still open after DEC-016

Customer cancellation; timeouts or automatic expiry; payment and refunds; notifications; adding or removing dishes;
the administrator role (US-09); multiple restaurants; the business quantity limit (BR-007); SEC-005.

### 16.5 Traceability

| Req | Decision | Implemented in | Tests |
|---|---|---|---|
| FR-101, FR-102 | DEC-014 | restaurant-service V2 migration, seed, `MenuResponse` | `RestaurantControllerTest`, `RestaurantApiIntegrationTest` |
| FR-103 | DEC-014 | order-service `GET /api/v1/orders` | `OrderApiIntegrationTest` |
| SEC-101 | DEC-015 | both services' `SecurityConfig`, Keycloak realm | `JwtValidationTest`, `OrderApiIntegrationTest`, `OwnerControllerTest` |
| FR-110 – FR-112, SEC-102, SEC-103 | DEC-015 | `OwnerController`, `OwnerOrderController`, V3 migration | `OwnerControllerTest`, `RestaurantApiIntegrationTest`, `OrderApiIntegrationTest` |
| FR-120 – FR-124, BR-101, BR-102 | DEC-016 | order-service V2 migration, `OrderLifecycle`, Kitchen and order pages | `OrderStatusTest`, `OrderApiIntegrationTest`, frontend `orderStatus.test.ts`, `Owner.test.tsx`, `OrderDetails.test.tsx` |

