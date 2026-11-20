# FoodieHub — Raw Requirements (Reconstructed)

> **Document status: RECONSTRUCTED — this is not the verbatim original requirement.**
> The original project brief was never stored in this repository. This document reconstructs the raw requirements
> from the sources listed in §2 and classifies every statement. It is **not an approval record**: approval status
> lives in [`plan.md`](plan.md) §0 and its decision log, and nothing in this document approves, resolves or changes
> any pending decision. Corrections and owner answers belong in `clarification.md` (not yet created).
>
> Reconstructed: 2026-11-03 · Owner: project owner (solo developer) · SDD stage: M0, first foundation document

---

## 1. Purpose and document status

- **Purpose:** to give the later SDD documents (`clarification.md`, `constitution.md`, `spec.md`, …) one traceable baseline
  of what the owner actually asked for, kept separate from what has only been proposed, assumed or left open.
- **Status:** reconstructed draft for owner review. Every row records its source and evidence type (§2.2).
- **What this document does not do:** it does not repair inconsistencies in `plan.md` (they are reported in §12–§13),
  does not adopt suggested values, and does not convert proposals into requirements.

---

## 2. Source register and source reliability

### 2.1 Sources

| Source | Description | Location | Reliability |
|---|---|---|---|
| SRC-01 | `docs/sdd/plan.md` v7, sections §0–§12 | Repository (untracked) | **Secondary.** Drafted by the AI assistant during planning. Its proposals are not approvals, and its restatements of owner wording are not independent evidence. |
| SRC-02 | `plan.md` rows A-10–A-12 (lines 44–46) and "Decision log update — 2026-11-03" (lines 352–357) | Repository (untracked) | **Primary** for the A-10, A-11 and A-12 decisions only. |
| SRC-03 | The owner's own messages in the planning session of 2026-11-03 | Session transcript — **not stored in the repository** | Exact wording available to the reconstructor; not persisted or independently reviewable → optional persistence (Q-15, non-blocking). |
| SRC-04 | The owner's selections among options written by the assistant in the same session | Session transcript — not stored in the repository | The **decision** is the owner's; the **option wording and descriptions** are the assistant's. |
| SRC-05 | `README.md` (uncommitted) | Repository | **Context only.** It is derived from SRC-01 and is never used as evidence. |

### 2.2 Evidence labels

| Label | Meaning |
|---|---|
| **VQ** | Verified quote: owner wording from SRC-03, reproduced character-for-character. |
| **VR** | Verified repository record: text in SRC-01/SRC-02, with line reference. |
| **OS** | Owner selection of an assistant-written option (SRC-04). |
| **RP** | Reconstructed paraphrase; not exact wording. |
| **IN** | Inference drawn by the reconstructor. |
| **OC** | Owner confirmation needed. |

### 2.3 Interpretation rules

1. A named service, component or topic — including owner instructions phrased "Define…", "Clarify…", "Refine…" or
   "Specify…" — confirms that the **topic** is in scope. It does **not** confirm any particular behaviour or rule.
2. Wording with "Prefer" is recorded as a **preference**, not a mandatory constraint.
3. The owner's architecture approval (VQ: "I approve the technical direction and architecture, subject to the remaining
   approval checklist.") is treated as **technical only**. It confirms no business policy, permission, lifecycle or value.
4. When sources conflict, both versions are recorded and the conflict is flagged (§12). Neither is repaired.
5. A restatement of owner wording inside `plan.md` never counts as verification of that wording.

---

## 3. Project vision and problem statement

| ID | Statement | Classification | Evidence | Source location | Rationale |
|---|---|---|---|---|---|
| RR-001 | FoodieHub is a food-ordering system. | CONFIRMED | VQ: "We are starting the FoodieHub Food Ordering System project." | SRC-03, kickoff message | The owner's own description. |
| RR-002 | FoodieHub is a solo, full-stack learning and portfolio project. | CONFIRMED (project context) | VQ: "We are building FoodieHub, a solo full-stack learning and portfolio project." · VQ: "Introduce FoodieHub as a learning and portfolio food-ordering platform." | SRC-03, raw-requirement request; README request | Two consistent owner statements. |

**Problem statement: UNRESOLVED — source unavailable.** No source describes a business problem, target market or success
measure beyond the learning and portfolio purpose. None is reconstructed here (Q-01).

---

## 4. Target users and stakeholders

| Party | Classification | Evidence | Rationale |
|---|---|---|---|
| Project owner — sole developer and reviewer | CONFIRMED | VR: A-10 "**DECIDED:** solo developer; no mandatory second reviewer" (`plan.md` line 44) | Recorded decision. |
| Customers who place orders | IN + OC | IN from RR-001 and VQ "M2 authenticated checkout" | The word "customer" never appears in the owner's wording. |
| Restaurant owners | IN + OC | IN from VQ "restaurant resource ownership checks" | Implies someone owns restaurant resources; their role and permissions are not stated. |
| Administrators | PROPOSED | VR: `plan.md` §3 US-09, §6 | No owner source (Q-10). |

---

## 5. Confirmed requirements

### 5.1 Confirmed product requirements

These are the only product statements that survived the evidence audit.

| ID | Statement | Classification | Evidence | Source location | Rationale | Dependency |
|---|---|---|---|---|---|---|
| RR-003 | Orders are placed with restaurants; each order contains items from exactly one restaurant. | CONFIRMED | VQ: "Keep simulated payments, single-restaurant-per-order, and no delivery partner system." | SRC-03, first plan review | Explicit constraint. | — |
| RR-004 | MVP payments are simulated; no real money moves. | CONFIRMED | VQ: same sentence as RR-003 | SRC-03, first plan review | "simulated" is explicit. Payment *behaviour* (attempts, failures, timeouts) is not confirmed (RR-015, RR-016). | — |
| RR-005 | There is no delivery-partner system. | CONFIRMED | VQ: same sentence as RR-003 | SRC-03, first plan review | Explicit exclusion. | — |
| RR-006 | Both fulfilment options — pickup and restaurant self-delivery — exist, and the option is chosen per order. | CONFIRMED-DECISION (= D9) — for the owner's selection "Both, chosen per order" only | OS: the owner selected the option "Both, chosen per order". | SRC-04 | Only the selection is the owner's. The following are **assistant-authored and unverified**: the question text ("FoodieHub has no delivery partner system. How does the customer receive the food?"), the other option labels ("Pickup only (Recommended)", "Restaurant self-delivery"), and the option description ("Customer picks pickup or delivery; …"). Therefore **who chooses** the fulfilment type and **what restaurant self-delivery means** (e.g. "restaurant's own staff") are not established. | OC (Q-09) |
| RR-007 | Order management must never be exposed to unauthenticated users. | CONFIRMED (security requirement) | VQ: "Never expose unauthenticated order-management endpoints." | SRC-03, second plan review | Exact owner wording. **Narrow scope:** this row covers order management only. Whether placing an order falls under "order-management" (i.e. whether guest checkout is excluded) is not established here. | Q-07 |
| RR-008 | Public browsing first (M1), then authenticated checkout (M2). | CONFIRMED **PREFERENCE** (milestone sequencing) | VQ: "Prefer M1 public browsing and M2 authenticated checkout." | SRC-03, second plan review | "Prefer" records a preference about milestone order. Whether public browsing is a permanent product rule, and exactly what is public, is unresolved. | Q-06; public serviceability check → A-8 (pending) |
| RR-009 | The MVP uses a single currency: INR (₹). | CONFIRMED (recorded status: "**DECIDED**") | VR: A-12 "**DECIDED:** INR (₹), single currency for MVP" · decision log "INR (₹) selected as the single MVP currency." | `plan.md` lines 46, 356 | Recorded decision. `plan.md` line 29 conflicts with it (§12, C-03). | Q-13 |

### 5.2 Topics confirmed, behaviour pending

The owner named each topic below, so the topic is in scope. The detailed behaviour, policy, semantics and configuration are
**not** confirmed. Confirmed technical protections are listed separately from unapproved policies.
Wherever this table cites D1–D7 as "architecture", it means *recorded in `plan.md`*; their individual approval is
unverified (§5.4).

| ID | Topic (in scope) | Evidence | Confirmed technical protection / capability | Unapproved policy, semantics or configuration |
|---|---|---|---|---|
| RR-010 | Notifications | VQ list item: "Restaurant, Order, Payment and Notification services" — a **service name** only | A Notification service is part of the planned direction (TC-01). | What triggers a notification, who receives it and through which channel: A5 (ASSUMPTION), US-08 (PROPOSED under A-1). The product behaviour itself is IN + OC (Q-04). |
| RR-011 | Restaurant menus | None — the owner's wording never mentions "menu" | — | IN + OC (Q-05). Menu browsing and management are PROPOSED (US-01, US-06 under A-1). |
| RR-012 | Authentication and authorization | VQ: "Define Keycloak roles, OIDC flow, service-side authorization, restaurant resource ownership checks and service-to-service security." | These design topics are required (TC-11). D10 Keycloak enforced in M2 (OS). D3 JWT validated at the gateway and in every service (architecture; see §5.4). RR-007 applies. | Role set `CUSTOMER` / `RESTAURANT_OWNER` / `ADMIN` and permissions per role (`plan.md` §6): PROPOSED; whether the architecture approval covers the §6 design is unclear (Q-02). "Customers see only their own orders" is PROPOSED (§6); no owner source. |
| RR-013 | Restaurant resource ownership | VQ: "restaurant resource ownership checks" (within a "Define" instruction) | Ownership checks are a required design topic (TC-11). | Who may change what, and any admin override: PROPOSED (§6). One owner per restaurant, assigned by an admin: A3 (ASSUMPTION, pending A-3). Owner reassignment: OPEN-16. |
| RR-014 | Duplicate checkout | VQ: "duplicate checkout prevention" (within a "Refine" instruction) | **Topic only.** That duplicate checkouts must be prevented is IN + OC (Q-09): the owner named "duplicate checkout prevention" as a topic to refine, not as a stated requirement. Required outcome (if confirmed): a repeated checkout does not create a second order. Proposed mechanism: D4 idempotency keys — recorded in `plan.md`; individual approval unverified (§5.4). | Exact semantics, e.g. returning the same order for a repeated request and key scope (`plan.md` §4.5): PROPOSED. Key retention: OPEN-10. One pending order per customer: OPEN-13. |
| RR-015 | Payment idempotency | VQ: "payment idempotency" (in both the first and the second plan review) | Payment requests must be idempotent (TC-13); D4. | Business outcome "a customer is never charged twice for one order": IN + OC (Q-09). One active attempt per order and handling of unknown outcomes: A-5 (pending). |
| RR-016 | Payment timeout | VQ: "payment timeout/reconciliation behavior" | Payment-timeout handling is a required topic. | That unpaid orders *expire*, and what happens when expiry races a payment: A-4, A-14 (pending). Deadline value: OPEN-09. Reconciliation mechanism: A-5 (pending). |
| RR-017 | Cancellation | VQ: "cancellation rules" · VQ: "Make refund amount and policy explicit, including delivery fee treatment and cancellation/rejection behavior." | — | That customers can cancel is IN (the rules presuppose the feature) → Q-08. When and by whom: A-6, A-4 (pending). Cancellation after acceptance: OPEN-20. |
| RR-018 | Restaurant rejection | VQ: "restaurant rejection/refund handling" | — | That restaurants can reject orders is IN → Q-08. Rejection rules (reason code, only before acceptance): PROPOSED (`plan.md` §4.1, A-6). Acceptance timeout: OPEN-07. |
| RR-019 | Refunds | VQ: "refund retry/reconciliation strategy" · VQ: "Make refund amount and policy explicit, including delivery fee treatment and cancellation/rejection behavior." · VQ: "Ensure refund idempotency remains safe when the original refund outcome is uncertain, including admin retry." | Refund idempotency under uncertain outcomes is a required topic. | That refunds exist as a product feature is IN → Q-08. Amount and policy: A-6 (pending). Retry: A-7 (pending, technical). Idempotency design: A-13 (pending, technical). Give-up window: OPEN-18. Admin handling: US-09 (PROPOSED). |
| RR-020 | Delivery address, serviceability, delivery fee | VQ: "Specify delivery serviceability, address handling, delivery fee calculation and fee snapshots." · VQ: "Mark PIN code-based serviceability as proposed until explicitly approved." | Prices and fees are snapshotted at order creation: D5 (architecture). | A delivery address being required and a delivery fee existing are IN (strong) → Q-09. Serviceability method (PIN list): **PROPOSED until explicitly approved** (A-8). Fee model (flat per restaurant): A-8 (pending). Free-delivery threshold: OPEN-11. Minimum order value: OPEN-12. Contact-phone format: OPEN-19. Saved addresses: OPEN-14. |
| RR-021 | Pricing | No owner wording beyond "fee snapshots" (RR-020) | D5 price/fee snapshot and D6 money format (architecture). Currency: RR-009. | "Total = items subtotal + delivery fee" and the price-change check (`expectedTotal`, P5): PROPOSED (A-8). No tax or coupons: A2 (ASSUMPTION, pending A-3). |
| RR-022 | Order states / lifecycle | VQ: "order states" · VQ: "Refine order and payment state machines" | The enforcement mechanism (conditional transitions, state history) is described only in agent-written `plan.md` §4.1, and is listed as approved only in agent-written line 29. No owner statement approves it specifically → **unverified** (Q-14; see C-04). | The concrete states and transitions (`plan.md` §4.1) are business workflow → PROPOSED, pending A-1, A-4 and A-6 (Q-03). |

### 5.3 Technical and process constraints

These are kept separate from the product requirements.

| ID | Constraint | Classification | Evidence | Source location |
|---|---|---|---|---|
| TC-01 | Planned technology direction: React + Vite frontend; Java + Spring Boot microservices; Spring Cloud Gateway; Consul; Keycloak + Spring Security + JWT/OIDC; MySQL for Order Service; Restaurant, Order, Payment and Notification services; Jenkins + SonarQube; Docker + Docker Compose | CONFIRMED **planned direction** (the owner did not call it mandatory) | VQ: "Our planned direction:" followed by the list · VQ: "Keep the greenfield monorepo and the proposed stack, but revise the execution plan:" | SRC-03, kickoff message; first plan review |
| TC-02 | Spec-Driven Development | CONFIRMED | VQ list item: "Spec-Driven Development" | SRC-03, kickoff message |
| TC-03 | JDK 21, Maven Wrapper and a supported Node.js LTS | **PREFERENCE** | VQ: "Prefer JDK 21, Maven Wrapper and a supported Node.js LTS." | SRC-03, first plan review |
| TC-04 | Compatible, supported tool versions | CONFIRMED | VQ: "Select compatible, supported tool versions." | SRC-03, first plan review |
| TC-05 | Incremental milestones, starting with one thin end-to-end vertical slice; not all services or infrastructure up front | CONFIRMED | VQ: "Use incremental milestones. First build one thin end-to-end vertical slice; do not scaffold all services or require all infrastructure to be operational immediately." | SRC-03, first plan review |
| TC-06 | CI introduced early but never blocking initial local development | CONFIRMED (exact timing: A-2, pending) | VQ: "Introduce Jenkins and SonarQube early enough to validate the code, but don't block the initial local development setup on them." | SRC-03, first plan review |
| TC-07 | A defined Git/GitHub workflow, `.gitignore`, secrets handling and review requirements | CONFIRMED topic; the specific rules (`plan.md` §11) are PROPOSED | VQ: "Define Git/GitHub workflow, .gitignore, secrets handling and review requirements." | SRC-03, first plan review |
| TC-08 | Solo developer; no mandatory second reviewer | CONFIRMED (recorded status: "**DECIDED**") | VR: A-10 | `plan.md` lines 44, 354 |
| TC-09 | Spring Boot 4.x, conditional on verifying a compatible Spring Cloud release train and dependencies before scaffolding | CONFIRMED (recorded status: "**DECIDED (conditional)**") | VR: A-11 | `plan.md` lines 45, 355 |
| TC-10 | Document the shared MySQL container as logical isolation, including migration ownership and least privilege | CONFIRMED (documentation requirement) | VQ: "Document the single MySQL container with per-service databases/users as logical isolation, including migration ownership and least privilege." | SRC-03, second plan review |
| TC-11 | Security design topics: Keycloak roles, OIDC flow, service-side authorization, restaurant resource ownership checks, service-to-service security | CONFIRMED topics | VQ: see RR-012 | SRC-03, first plan review |
| TC-12 | A realistic MVP scope with explicit acceptance criteria | CONFIRMED | VQ: "Define realistic MVP scope and explicit acceptance criteria." | SRC-03, first plan review |
| TC-13 | Payment idempotency | CONFIRMED | VQ: "payment idempotency" | SRC-03, first and second plan reviews |
| TC-14 | Post-MVP: real payment-gateway integration requires provider-side idempotency and external refund reconciliation | CONFIRMED (deferred; no MVP feature) | VQ: "Document that future real payment gateway integration requires provider-side idempotency and external refund reconciliation." | SRC-03, architecture-approval message |
| TC-15 | Secrets and credentials are never exposed | **Task-specific instruction — not confirmed as a permanent project constraint.** A permanent secrets rule is IN + OC (Q-16). TC-07 confirms only the "secrets handling" topic; the specific rules (`plan.md` §11) are PROPOSED. | VQ: "Do not expose secrets or credentials." — one of the constraints of the initial read-only inspection task | SRC-03, kickoff message |

### 5.4 Architecture decision register (original IDs kept)

Formal ADR numbers will be assigned in `architecture-decisions.md`. This register keeps the original `plan.md` IDs.

| ID | Decision (as recorded in `plan.md`) | Recorded status | Evidence | Note |
|---|---|---|---|---|
| D1–D7 | D1 DB per service · D2 gateway is the only public entry · D3 JWT validated at the gateway and in every service · D4 idempotency keys on checkout, payment and refund · D5 prices/fees snapshotted at order creation · D6 money as `DECIMAL(10,2)`, HALF_UP rounding · D7 OpenAPI 3.1, `/api/v1`, RFC 9457 errors | Listed as approved in agent-written `plan.md` line 29. The owner's general approval statement (VQ) does not enumerate them → **individual approval unverified** (OC, Q-14) | VQ (owner): "I approve the technical direction and architecture, subject to the remaining approval checklist." · VR: `plan.md` lines 29, 76 | The enumeration "D1–D11, service boundaries, data ownership, guard/outbox/reconciliation mechanisms" exists **only in agent-written line 29** → OC (Q-14). |
| D8 | Synchronous REST + transactional outbox, no broker | Decided by the owner (`plan.md` line 74) | OS: "Sync REST + outbox (Recommended)" | Option wording is the assistant's. The decision is verified as an owner selection (OS); its wording in `plan.md` line 74 is agent-written. |
| D9 | Fulfilment chosen per order (`PICKUP` \| `SELF_DELIVERY`, restaurant's own staff) | Decided by the owner (line 74) | OS: "Both, chosen per order" | "restaurant's own staff" and the chooser (customer) are assistant wording → Q-09 (see RR-006). The decision is verified as an owner selection (OS); its wording in `plan.md` line 74 is agent-written. |
| D10 | Keycloak enforced in M2, designed from M0 | Decided by the owner (line 74) | OS: "M2, designed in from day one (Recommended)" | Option wording is the assistant's. The decision is verified as an owner selection (OS); its wording in `plan.md` line 74 is agent-written. |
| D11 | One MySQL container, one DB + users per service | Decided by the owner (line 74) | OS: "MySQL, one DB per service (Recommended)" | Option wording is the assistant's; see TC-10. The decision is verified as an owner selection (OS); its wording in `plan.md` line 74 is agent-written. |

---

## 6. Proposed requirements and policies

**All rows in this section are pending. None is a requirement until the owner approves it.** Statuses are copied from `plan.md`.

| ID | Proposal | `plan.md` reference | Recorded status | Dependency |
|---|---|---|---|---|
| RR-101 | MVP story set US-01…US-10 and milestones M0–M5 | §3, §9; A-1 (line 35) | pending | A-1 |
| RR-102 | Order lifecycle: states and transitions | §4.1 | pending (business workflow) | A-1, A-4, A-6; Q-03 |
| RR-103 | Race policy: a customer cancel wins (with refund); system expiry yields to a payment that succeeded before the deadline | §4.3; A-4 / P1 (line 38) | pending | A-4 |
| RR-104 | Refund policy: the full captured amount including the delivery fee; only on cancel or reject before `ACCEPTED`; no fees, no partial refunds | §4.7; A-6 / P7 (line 40) | pending | A-6 |
| RR-105 | Delivery rules: PIN-list serviceability (**proposed until explicitly approved**), flat per-restaurant fee, `expectedTotal` price-change check | §5; A-8 / P3–P5 (line 42) | pending | A-8 |
| RR-106 | Temporary M2 limitation: orders that cannot be paid yet (temporary, dev-only) | §9.1; A-9 (line 43) | pending | A-9 |
| RR-107 | Role set `CUSTOMER` / `RESTAURANT_OWNER` / `ADMIN` and permissions per role | §6 | approval status unclear | Q-02 |
| RR-108 | Admin functions: create restaurants, assign owners, handle failed refunds | §3 US-09 | pending | A-1; depends on A-7, A-13 |
| RR-109 | Restaurant-owner workflow: accept, prepare, ready for pickup / out for delivery, complete | §3 US-07, §4.1 | pending | A-1 |

**Technical proposals (referenced only; not product requirements):** A-2 / P6 CI timing (line 36) · A-5 / P8 UNKNOWN
payment-attempt semantics (line 39) · A-7 / P2 refund retry (line 41) · A-13 / P9 refund idempotency (line 47) ·
A-14 / P10 legacy M2 expiry (line 48). All are **pending**.

---

## 7. Assumptions

Copied from `plan.md` line 80. All are **ASSUMPTION — pending A-3**.

| ID | Assumption (verbatim from `plan.md`) | Business meaning | Note |
|---|---|---|---|
| A1 | GitHub monorepo | All parts of the project live in one GitHub repository | — |
| A2 | single currency, no tax or coupons | Orders carry one currency; no tax calculation, no coupons | The "single currency" part overlaps the DECIDED A-12. A2 itself is **not** marked resolved (C-06). |
| A3 | admin creates restaurants and assigns one owner | Restaurants are onboarded by an administrator, one owner each | Depends on the administrator role (Q-10). |
| A4 | customers self-register in Keycloak | Customers create their own accounts | Customer account data → Q-11. |
| A5 | in-app notifications only | No e-mail, SMS or push notifications in the MVP | Notification behaviour → Q-04. |
| A6 | local development only | No hosted deployment target for the MVP | Portfolio demo hosting → Q-12. |

---

## 8. Unresolved questions and decision dependencies

### 8.1 Decision status register (copied exactly from `plan.md`; nothing resolved here)

| Item | Status exactly as recorded | Source lines |
|---|---|---|
| A-1 – A-9 | pending — "Every item in Parts A and B is still PENDING/OPEN" (line 29); "A-1–A-9 and A-13–A-14 remain pending approval" (line 357) | 29, 35–43, 357 |
| A-10 | "**DECIDED:** solo developer; no mandatory second reviewer. Use self-review + automated checks; protect main without an impossible approval requirement" | 44, 354 |
| A-11 | "**DECIDED (conditional):** Spring Boot 4.x; verify compatible Spring Cloud train and exact dependencies before scaffolding (official mapping: Boot 4.0.x ↔ Cloud 2025.1.x)" | 45, 355 |
| A-12 | "**DECIDED:** INR (₹), single currency for MVP" | 46, 356 |
| A-13, A-14 | pending (lines 29, 357) | 47–48 |
| Conflicting record | Line 29 also states "Every item in Parts A and B is still PENDING/OPEN" and lists "open answers needed: A-10, A-11, A-12" | 29 — recorded side by side, not repaired (C-03, Q-13) |

### 8.2 OPEN items (copied exactly from `plan.md` §0 Part B; all remain OPEN)

| OPEN | Question (as recorded) | Gate (as recorded) | Source line |
|---|---|---|---|
| OPEN-10 | Idempotency-key retention (suggested 24 h) | M2 | 54 |
| OPEN-11 | Free-delivery threshold | M2 (or post-MVP) | 55 |
| OPEN-12 | Minimum order value | M2 (or post-MVP) | 56 |
| OPEN-13 | One pending (unpaid) order per customer? | M2 | 57 |
| OPEN-19 | Contact-phone format (suggested Indian 10-digit mobile) | M2 | 58 |
| OPEN-09 | Payment deadline (suggested 15 min) | M3 | 59 |
| OPEN-18 | Refund give-up window (suggested 24 h) | M3 | 60 |
| OPEN-07 | Restaurant acceptance timeout | M4 | 61 |
| OPEN-15 | Opening hours / accepting-orders toggle | M4 | 62 |
| OPEN-20 | Restaurant/admin cancellation after `ACCEPTED` (e.g. an item runs out) | M4 (or post-MVP) | 63 |
| OPEN-14 | Saved addresses | post-MVP | 64 |
| OPEN-16 | Owner reassignment | post-MVP | 65 |
| OPEN-21 | Real payment provider choice and integration timing | post-MVP | 66 |

Suggested values (24 h, 15 min, Indian 10-digit mobile) are **not adopted**: "suggested values are not adopted until
answered" (`plan.md` line 50).

**Related OPEN IDs:**
- OPEN-05, OPEN-06 and OPEN-17 are recorded as resolved through A-10, A-11 and A-12 respectively (lines 44–46, 354–356).
- OPEN-08 is recorded as "replaced by proposal P7" (line 82). P7 = A-6, which is **pending**.
- OPEN-01 to OPEN-04 do not appear in `plan.md` (gap C-07).

### 8.3 New questions raised by this reconstruction

| ID | Question | Blocks |
|---|---|---|
| Q-01 | What is the product problem statement, and what are the goals beyond learning and portfolio? | `spec.md` vision |
| Q-02 | Does the architecture approval cover the `plan.md` §6 security **design** (role names, token handling)? Per-role business permissions remain pending either way. | RR-012, RR-107 |
| Q-03 | Should the `plan.md` §4.1 order lifecycle be approved as business workflow, or changed? | RR-022, RR-102 |
| Q-04 | Notifications: which events, which recipients, which channel? | RR-010 |
| Q-05 | Do restaurants offer menus that customers order from? | RR-011 |
| Q-06 | Is public browsing a permanent product rule or only the M1 order of work? What exactly is public? | RR-008 |
| Q-07 | Does "order-management" include placing an order — that is, is guest checkout excluded? | RR-007 |
| Q-08 | Are customer cancellation, restaurant rejection and refunds confirmed product features? | RR-017 – RR-019 |
| Q-09 | Please confirm these inferred outcomes: a customer is never charged twice for one order; duplicate checkouts are prevented (RR-014); delivery requires an address; a delivery fee exists; "restaurant self-delivery" means delivery by the restaurant's own staff; and who chooses the fulfilment type for an order (RR-006). | RR-006, RR-014, RR-015, RR-020 |
| Q-10 | Does an administrator role exist, and with what scope? | §4, RR-108, A3 |
| Q-11 | What customer account data is needed beyond self-registration (A4)? | A4 |
| Q-12 | Is portfolio or demo hosting needed, given A6 (local development only)? | A6 |
| Q-13 | For A-10–A-12, which record is authoritative: the rows and decision log, or line 29? | §8.1 |
| Q-14 | Which "mechanisms" does the architecture approval cover, given that A-5, A-7, A-13 and A-14 are still pending? | §5.4 |
| Q-15 | Optional and non-blocking: persist selected session statements (VQ/OS) in `clarification.md` where useful for traceability. Not every statement needs to be persisted; the VQ/OS evidence in this document remains usable without it. | — (non-blocking) |
| Q-16 | Should never exposing or committing secrets and credentials be a permanent project constraint? | TC-15 |

---

## 9. Scope

| Category | Items | Evidence |
|---|---|---|
| **In scope — confirmed** | RR-001 – RR-009 | §3, §5.1 |
| **In scope — topic confirmed, behaviour pending** | RR-010 – RR-022 | §5.2 |
| **Candidate scope — proposed** | RR-101 – RR-109 | §6 (pending) |
| **Explicitly out of scope (owner evidence)** | Real payment processing in the MVP (RR-004) · orders spanning more than one restaurant (RR-003) · a delivery-partner system (RR-005) · multiple currencies in the MVP (A-12 "single currency for MVP") | VQ / VR as cited |
| **Proposed exclusions (pending A-1; agent-proposed in `plan.md` §3 line 105)** | Reviews, promotions, partial refunds (also A-6), mobile apps, delivery tracking. Tax and coupons excluded per A2 (ASSUMPTION). | VR `plan.md` line 105, line 80 |
| **Deferred (recorded as post-MVP)** | Real payment-gateway integration (TC-14, OPEN-21) · saved addresses (OPEN-14) · owner reassignment (OPEN-16) | VQ / VR as cited |
| **Open, possibly deferred** | Free-delivery threshold (OPEN-11) and minimum order value (OPEN-12): "M2 (or post-MVP)" · cancellation after acceptance (OPEN-20): "M4 (or post-MVP)" | VR lines 55, 56, 63 |
| **Unspecified** | Anything not listed in this document. It is neither required nor excluded, and needs an explicit owner decision before it is added. No examples are listed, so as not to suggest features. | — |

---

## 10. Requirement identifiers

| Prefix | Meaning | Defined in |
|---|---|---|
| RR-001 – RR-099 | Product requirements: confirmed (RR-001 – RR-009) and topic-confirmed (RR-010 – RR-022) | this document |
| RR-101 – RR-199 | Proposed product requirements and policies (pending) | this document |
| TC-01 … | Technical and process constraints | this document |
| Q-01 … | New questions raised by this reconstruction | this document |
| D1 – D11 | Architecture decisions (original IDs; formal ADR numbers come later) | `plan.md` |
| A-1 – A-14, P1 – P10, OPEN-xx, US-xx, A1 – A6 | Approval items, proposals, open items, user stories, assumptions | `plan.md` (referenced only, never renumbered) |

IDs are stable: they are never reused or renumbered. A withdrawn item keeps its ID and is marked withdrawn.

---

## 11. Requirement-to-source mapping

| ID | Evidence | Source location | Rationale for classification |
|---|---|---|---|
| RR-001 | VQ | SRC-03 kickoff | Exact owner statement. |
| RR-002 | VQ ×2 | SRC-03 raw-requirement request; README request | Exact, consistent owner statements. |
| RR-003 | VQ | SRC-03 first plan review | Explicit constraint. |
| RR-004 | VQ | SRC-03 first plan review | Explicit; behaviour excluded from the claim. |
| RR-005 | VQ | SRC-03 first plan review | Explicit exclusion. |
| RR-006 | OS | SRC-04 fulfilment question | Only the selection "Both, chosen per order" is the owner's. The chooser and the self-delivery semantics are assistant wording (OC). |
| RR-007 | VQ | SRC-03 second plan review | Explicit; scope kept narrow (Q-07). |
| RR-008 | VQ | SRC-03 second plan review | "Prefer" → preference. |
| RR-009 | VR | `plan.md` lines 46, 356 | Recorded DECIDED status. |
| RR-010 | VQ (service name) + IN | SRC-03 kickoff list | A service name confirms the topic only. |
| RR-011 | IN | — | No owner wording. |
| RR-012 | VQ + OS + VR | SRC-03 first plan review; SRC-04; `plan.md` lines 29, 76 | The topic is explicit; the design and permissions are not confirmed. |
| RR-013 | VQ | SRC-03 first plan review | A "Define" instruction confirms the topic only. |
| RR-014 | VQ + VR | SRC-03 second plan review; `plan.md` line 76 | Topic named only; outcome inferred (IN + OC); mechanism D4 unverified individually; semantics proposed. |
| RR-015 | VQ + IN | SRC-03 first and second plan reviews | The technical property is explicit; the business outcome is inferred. |
| RR-016 | VQ | SRC-03 second plan review | Topic only. |
| RR-017 | VQ + IN | SRC-03 first plan review; refund-policy review | The rules presuppose the feature (IN). |
| RR-018 | VQ + IN | SRC-03 second plan review | Same as RR-017. |
| RR-019 | VQ ×3 + IN | SRC-03 race/refund review; refund-policy review; refund-idempotency review | Topics explicit; the feature is inferred. |
| RR-020 | VQ ×2 + IN + VR | SRC-03 second plan review; `plan.md` line 76 | Topics explicit; PIN method explicitly "proposed". |
| RR-021 | VR + IN | `plan.md` lines 76, 80; §5.3 | No owner wording beyond RR-020. |
| RR-022 | VQ ×2 + VR | SRC-03 first and second plan reviews; `plan.md` line 29, §4.1 | Topic explicit; lifecycle proposed; enforcement mechanism unverified (agent text only). |
| RR-101 – RR-109 | VR | `plan.md` lines as cited in §6 | Recorded as pending proposals. |
| TC-01 – TC-07, TC-10 – TC-14 | VQ | SRC-03 as cited in §5.3 | Exact owner wording; TC-03 is a preference. |
| TC-08, TC-09 | VR | `plan.md` lines 44–45, 354–355 | Recorded DECIDED statuses. |
| TC-15 | VQ + IN | SRC-03 kickoff | A task-specific instruction; not confirmed as a permanent constraint (Q-16). |
| D1 – D11 | VR + VQ / OS | `plan.md` lines 29, 74, 76; SRC-03; SRC-04 | D1–D7: individual approval unverified (agent-written enumeration only). D8–D11: verified owner selections. See §5.4. |

---

## 12. Conflicts, ambiguities and gaps

Reported only. Nothing is repaired in `plan.md`.

| ID | Finding | Location | Effect on this document |
|---|---|---|---|
| C-01 | Review-tool text at the top of the file ("Ready for review", "Select text to add comments on the plan") | `plan.md` lines 1, 3 | None; noted. |
| C-02 | Context section is out of date: says branch `main`, clean working tree, no SDD docs, "Nothing is implemented, installed, committed or started until this plan is approved" | lines 11–15 | Repository status taken from inspection, not from the Context. |
| C-03 | Line 29 says every Part A item is pending and lists A-10–A-12 as "open answers needed", while rows 44–46 and the decision log record them as DECIDED; line 31 says "mixed status" | lines 29, 31, 44–46, 352–357 | Both records kept (§8.1); Q-13. |
| C-04 | Line 29 says "guard/outbox/reconciliation mechanisms" are approved, while the related technical proposals A-5, A-7, A-13 and A-14 are pending | lines 29, 39, 41, 47, 48 | Mechanisms not treated as confirmed beyond D1–D11; Q-14. |
| C-05 | "The stack is fixed" (line 15) and "Confirmed (user): … JDK 21, Maven Wrapper, Node LTS" (line 72) overstate the owner's "planned direction" and "Prefer" | lines 15, 72 | Recorded as planned direction (TC-01) and preference (TC-03). |
| C-06 | Stale OPEN references after decisions: "single currency (OPEN-17)" (§5.3), "Spring Boot 4.x (OPEN-06)" (§10); A2 "single currency" overlaps the DECIDED A-12 | lines 245, 311, 80 | A2 left as an assumption; overlap noted (§7). |
| C-07 | OPEN-01 to OPEN-04 are not recorded anywhere; D8–D11 have no OPEN trace | line 74; §0 Part B | Recorded as a gap (§8.2). |
| C-08 | The approval enumeration "D1–D11" exists only in agent-written text; the owner's approval statement is not stored in the repository | line 29 | §5.4 marks it OC; Q-14, Q-15. |
| C-09 | The §3 out-of-scope list mixes owner exclusions (multi-restaurant carts, delivery partners) with agent proposals (reviews, promotions, …) without marking which is which | line 105 | §9 separates owner exclusions from proposed exclusions. |
| C-10 | §8 lists a public serviceability endpoint for M2, although serviceability is still PROPOSED (A-8) | line 269 | Treated as proposed (RR-105). |
| C-11 | US-09 "handles failed refunds" depends on the pending technical proposals A-7 and A-13 | §3, lines 41, 47 | RR-108 dependency recorded. |
| C-12 | The approval status of the §6 security design (roles, permissions) is not stated | §6 | Q-02. |
| C-13 | No problem statement and no stakeholder description exist in `plan.md` | — | Q-01; §4 built from evidence only. |
| C-14 | The SDD authoring order puts raw-requirement before plan; in practice the plan came first | §2 | Explains the reconstruction. |
| C-15 | Formatting artifact: the sentence "Consequence: `EXPIRED` orders never hold money …" sits inside a table row | §4.3 table (line 145) | None; noted. |
| C-16 | §11 lists "Docker volume data" among the `.gitignore` entries; the current `.gitignore` has no such rule | line 315 vs `.gitignore` | None; noted for M0. |
| C-17 | Owner wording that confirms the stack, scope constraints and approvals exists only in the session transcript, not in the repository | SRC-03, SRC-04 | Q-15. |

---

## 13. Reconciliation with plan.md

| `plan.md` claim | This document | Reason |
|---|---|---|
| §1 "Confirmed (user): the services and stack above; simulated payments; one restaurant per order; no delivery partners; …" (line 72) | Simulated payments, one restaurant per order and no delivery partners: CONFIRMED (RR-003 – RR-005). Services and stack: CONFIRMED **planned direction** (TC-01). JDK 21 / Maven Wrapper / Node LTS: **preference** (TC-03). | Owner wording: "planned direction", "Prefer". |
| §1 "Decided by the user": D8–D11 (line 74) | Kept as owner decisions (§5.4), with assistant-authored option wording flagged. | Evidence type OS. |
| §0 line 29: architecture "approved (D1–D11, …)" | Recorded as an agent-written claim. The individual approval of D1–D7 and of the mechanisms is unverified; no business policy is treated as approved. | Interpretation rule 3; C-04, C-08; Q-14. |
| §0 A-10 – A-12 DECIDED | Kept as DECIDED; the conflicting line 29 is recorded. | C-03. |
| §3 MVP stories and out-of-scope list | Stories are PROPOSED (RR-101); out-of-scope items split into owner exclusions and proposed exclusions. | A-1 pending; C-09. |
| §4.1 order state machine | PROPOSED business workflow (RR-102). | Q-03. |
| §5 delivery rules | PROPOSED (RR-105); the PIN method is explicitly "proposed until explicitly approved". | Owner instruction (RR-020). |
| §6 security roles and ownership rules | Topic CONFIRMED (TC-11); role set and permissions PROPOSED (RR-107). | Q-02. |
| §0 Part B OPEN items | Copied unchanged (§8.2). | Not resolved here. |

---

## 14. Items requiring approval before specification or implementation

| Group | Items | Needed before |
|---|---|---|
| Business proposals | A-1, A-3, A-4, A-6, A-8, A-9 (RR-101 – RR-106, RR-108, RR-109; assumptions A1–A6) | `spec.md` |
| Technical proposals | A-2, A-5, A-7, A-13, A-14 | `spec.md` / `architecture-decisions.md` for the affected milestone |
| Reconstruction questions | Q-01 – Q-14 and Q-16 (Q-02, Q-03, Q-07, Q-08, Q-09 and Q-13 affect the core order flow). Q-15 is non-blocking. | `clarification.md` → `spec.md` |
| OPEN items by gate | M2: OPEN-10, OPEN-11, OPEN-12, OPEN-13, OPEN-19 · M3: OPEN-09, OPEN-18 · M4: OPEN-07, OPEN-15, OPEN-20 · post-MVP: OPEN-14, OPEN-16, OPEN-21 | The start of the gate milestone |

Until each item is approved or answered, it keeps its current status, and dependent specification or implementation work must not treat it as decided.
