# CONTEXT — domain glossary & architecture vocabulary

The shared names for concepts in this codebase. Architecture reviews and the
`/improve-codebase-architecture`, `/codebase-design`, and `/domain-modeling` skills use
this file as the source of truth for domain terms. When a deepened module is named after a
concept, its term goes here.

Architecture vocabulary (module, interface, depth, seam, adapter, leverage, locality)
comes from the `/codebase-design` skill — this file only defines the **domain**.

---

## Invoicing / payment applications

**Payment application** — an AIA G702/G703 application for payment: a schedule-of-values
(SOV) rollup that certifies how much is due on a contract for a billing period. The same
9-line certificate schedule applies to both subcontractor invoices and owner/prime
payment applications.

**Invoice financials** — the money calculation behind a payment application: per-line
figures (completed/stored, retainage) plus the 9-line rollup. Owned by one deep module,
`frontend/src/lib/invoicing/payment-application.ts`, and consumed by the subcontractor
invoice route, the SOV editor tabs, the PDF, and (fast-follow) the prime side. Before this
module the math was forked across four call sites that disagreed on Lines 8 and 9.

**The G702 nine lines** (the canonical certificate schedule):
1. Original Contract Sum
2. Net Change by Change Orders
3. Contract Sum to Date (1 ± 2)
4. Total Completed & Stored to Date
5. Retainage (5a % of completed work + 5b % of stored material)
6. Total Earned Less Retainage (4 − 5)
7. Less Previous Certificates for Payment
8. **Current Payment Due** (6 − 7)
9. **Balance to Finish, Including Retainage** (3 − 6)

**Retainage** — a withheld portion of a contract amount (commonly 5–10%) held until work
is satisfactorily complete. Tracked per line for work and stored materials, split into
this-period / previous / released.

**Retainage release** — a first-class Procore subcontractor-invoice type where previously
withheld retainage is paid out. On a release, Current Payment Due (Line 8) is the released
amount rather than the standard `6 − 7`. The module must handle this case; the prime-side
calc historically did not.

**SOV line item (`SovLineItem`)** — one schedule-of-values row on a payment application.
Per-line stored figures (`net_amount_this_period`, `total_completed_stored`) are Postgres
GENERATED columns — the database is the single source of truth for stored per-line values;
the module recomputes them only for edit **preview** and is pinned to the DB expression by
a parity test.
