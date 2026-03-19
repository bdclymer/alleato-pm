# Change Management — Complete Process, Status & Gaps

**Date:** 2026-03-19

---

## How the Complete Process Works

In Procore (and our system), changes to a construction project flow through a pipeline:

```
Change Event → Change Order → Budget Impact
```

### Step 1: Change Event (the "something happened" trigger)

A **Change Event** is the starting point. It captures that *something changed* on the project — a field condition, an owner request, a design error, etc. — before anyone knows the financial impact.

**What happens here:**
1. Someone creates a Change Event with a description, origin (owner, field, design, etc.), and scope classification
2. Line items are added with estimated costs and revenue impact
3. RFQs (Requests for Quote) can be sent to subcontractors to get real pricing
4. Subs respond to RFQs with their pricing
5. Attachments (photos, drawings, correspondence) are added as evidence
6. An approval workflow routes the event through reviewers
7. A full audit trail tracks every change

**Once pricing is known and approved, the Change Event is "converted" into a Change Order.**

### Step 2: Change Order (the "here's the money" formalization)

A **Change Order** makes the financial change official. There are two types because there are two sides of every construction contract:

#### Prime Contract Change Orders (PCCOs)
- **Direction:** Money flowing IN (owner pays the GC more)
- **Table:** `prime_contract_change_orders`
- **Example:** Owner approves $15,120 for a new tile wall
- **Impact:** Increases the Revised Contract Value of the Prime Contract

#### Commitment Change Orders (CCOs)
- **Direction:** Money flowing OUT (GC pays the sub more)
- **Table:** `contract_change_orders`
- **Example:** Plumber charges $1,650 for as-built drawings
- **Impact:** Increases the Revised Contract Value of the Commitment/Subcontract

#### The Financial Relationship
The GC's profit on a change = PCCO amount (what owner pays) minus CCO amount (what sub charges). If the owner approves $15,000 and the sub charges $12,000, the GC makes $3,000 on that change.

### Step 3: Budget Impact

When a Change Order is approved:
- PCCOs adjust the prime contract's revised value (revenue side)
- CCOs adjust the commitment's revised value (cost side)
- Both feed into the project budget showing the delta between original and revised values

---

## What's Actually Implemented vs. What's Not

### Change Events — ~98% Complete

| Feature | Status | Notes |
|---------|--------|-------|
| CRUD (create, read, update, delete) | DONE | Full API + UI, UUID-based IDs |
| List page with filtering | DONE | |
| Detail page with tabs | DONE | General, Line Items, Attachments, RFQs, Approvals, History |
| Line items with cost/revenue estimates | DONE | UUID parsing fixed |
| File attachments (upload/download/delete) | DONE | Supabase Storage |
| Approval workflow (API + UI) | DONE | GET/POST/PATCH endpoints |
| RFQ creation and listing | DONE | Tab wired into detail page |
| RFQ responses from subs | DONE | API exists |
| RFQ close/delete | DONE | Draft-only delete |
| Audit history trail | DONE | Automatic via triggers |
| Convert to Change Order | DONE | Dialog + API, copies line items, prevents double conversion |
| Revenue source calculations | DONE | Enum mismatch resolved |
| Playwright tests | DONE | 42 passed, 13 skipped (intentionally pending features), 0 failed |

**What's NOT done for Change Events:**
- Monitoring/operational docs (minor)
- 13 skipped tests cover: summary tab, RFQs tab on list page, recycle bin tab

---

### Change Orders — Reality Check

The planning docs claim 72-97.5% complete, but those numbers are **inflated** because they were tracking work against the legacy `change_orders` table (which has 0 rows and is being deleted). Here's what's actually true as of today:

#### Prime Contract Change Orders (PCCOs)

| Feature | Status | Notes |
|---------|--------|-------|
| Data in database | DONE | 100 rows synced from Acumatica |
| List page (table view) | DONE | New tabbed UI with Prime Contract tab |
| Detail page (view) | DONE | `/change-orders/prime/[primeCoId]` — just built today |
| Edit form | DONE | Inline edit on detail page |
| Delete | DONE | Via API + UI |
| API route (GET/PUT/DELETE) | DONE | `/api/projects/[projectId]/prime-contract-change-orders/[id]` |
| Status filtering | DONE | Proposed, Approved, Rejected |
| Executed flag display | DONE | Shown in table + detail |
| Search | DONE | By number and title |
| Card/list mobile views | DONE | |
| Footer totals | DONE | Sum of visible amounts |
| Approval workflow | NOT DONE | No approve/reject API for PCCOs |
| Line items | NOT DONE | No `pcco_line_items` table or UI |
| Attachments | NOT DONE | No attachment support for PCCOs |
| Create new PCCO form | NOT DONE | Can only view/edit synced data |
| Designated reviewer | NOT DONE | Field doesn't exist on this table |
| PDF generation | NOT DONE | |
| Email notifications | NOT DONE | |

#### Commitment Change Orders (CCOs)

| Feature | Status | Notes |
|---------|--------|-------|
| Data in database | DONE | 133 rows synced from Acumatica |
| List page (table view) | DONE | New tabbed UI with Commitment tab |
| Detail page (view) | DONE | `/change-orders/commitment/[commitmentCoId]` — just built today |
| Edit form | DONE | Inline edit on detail page |
| Delete | DONE | Via existing contracts API |
| API routes | DONE | Both direct lookup and contract-scoped routes |
| Status filtering | DONE | Pending, Approved, Rejected |
| Search | DONE | By number and description |
| Card/list mobile views | DONE | |
| Footer totals | DONE | Sum of visible amounts |
| Approval workflow | PARTIAL | Approve/reject API exists at `/contracts/[contractId]/change-orders/[id]/approve` |
| Line items | PARTIAL | `commitment_change_order_lines` table exists (0 rows), API exists |
| Attachments | NOT DONE | No attachment support for CCOs |
| Create new CCO form | NOT DONE | Can only view/edit synced data |
| Rejection reason display | DONE | Shown on detail page when rejected |
| PDF generation | NOT DONE | |
| Email notifications | NOT DONE | |

#### Legacy "General" Change Orders (being deleted)

| Feature | Status | Notes |
|---------|--------|-------|
| All CRUD, forms, detail page, approval, line items, attachments, CSV export | BUILT BUT DEAD | All code targets the `change_orders` table which has 0 rows. This entire feature tree was built against a table that never received data. |

---

### Cross-Cutting Features

| Feature | Status | Notes |
|---------|--------|-------|
| Prime vs Commitment tabs | DONE | Just rebuilt today with proper separation |
| Change Event → CO conversion | DONE | Works end-to-end |
| CSV export | PARTIAL | Export dropdown exists but targets legacy table |
| Reports (Unexecuted, Overdue) | PARTIAL | URL-based filter shortcuts exist but target legacy table |
| Package-based organization | NOT DONE | Procore groups COs into packages (PCO-001, etc.) — not started |
| Multi-tier approval (2-4 tiers) | NOT DONE | Only single-tier exists |
| Budget integration | PARTIAL | Approved CCOs update prime contract revised value; PCCOs don't yet |
| Reviewer settings dialog | DONE | UI exists but only for legacy table context |

---

## What Still Needs to Be Done (Priority Order)

### P0 — Critical (the system doesn't work right without these)

1. **Delete legacy tables and dead code** — 8 tables to drop, ~15 files to delete (see `change-order-table-audit.md`)
2. **Wire CSV export to real tables** — Currently exports from `change_orders` (empty). Needs to export from `prime_contract_change_orders` and `contract_change_orders`
3. **Wire reports to real tables** — Unexecuted/Overdue report filters currently target legacy table

### P1 — High (core functionality gaps)

4. **PCCO approval workflow** — Add approve/reject API endpoints for `prime_contract_change_orders`
5. **CCO approval integration on detail page** — The API exists but the detail page doesn't have an approval UI
6. **Create new PCCO form** — Currently can only view/edit synced data, can't create new ones
7. **Create new CCO form** — Same gap
8. **Line items for PCCOs** — No table or UI exists for PCCO line items

### P2 — Medium (Procore parity)

9. **Attachments for PCCOs and CCOs** — Neither type has attachment support
10. **Designated reviewer for PCCOs** — Procore has this; our table doesn't
11. **Budget impact from PCCOs** — Approved PCCOs should update the prime contract revised value
12. **Package-based organization** — Procore groups COs into numbered packages
13. **Revision tracking** — Track CO revision history

### P3 — Lower (nice-to-have)

14. **Multi-tier approval** (2-4 tier configurable workflow)
15. **PDF generation** for individual COs and packages
16. **Email notifications** on status changes
17. **Advanced reporting** (dashboards, charts, analytics)
18. **Batch operations** (bulk approve, bulk delete)
19. **Templates** for common change order types
20. **DocuSign integration**

---

## Documentation Accuracy Warning

The planning docs in this directory have significant accuracy issues:

- **IMPLEMENTATION-SUMMARY.md** claims "97.5% complete" — this was for work against the legacy `change_orders` table (0 rows, being deleted). The real completion for the *live* system is much lower.
- **PLANS-CHANGE-ORDERS.md** says "15% complete" — this was written before the legacy implementation and is now outdated in the other direction.
- **TASKS-CHANGE-ORDERS.md** says "72% complete" — most of the checked items are for the legacy table's code paths.

The most reliable status is what's documented in the tables above in this file.
