# Change Events Audit Report

**Date:** 2026-04-17  
**PRP:** PRPs/change-events/prp-change-events.md  
**Last Verification Run:** 2026-03-30 (89% completion, deployment gate PASS)

---

## Summary

- ✅ Fully implemented: 52 items
- 🟡 Partially implemented: 11 items
- 🔴 Not implemented: 12 items
- ⚠️ Schema gaps: 4 items

The core feature is production-ready. The remaining gaps are in three clusters:
1. **Budget Changes integration** (no `budget_changes` table exists — entire "Add to Budget Change" path is missing)
2. **RFQs tab in detail view** (API and DB exist; the detail page tab is missing)
3. **Revenue ROM auto-calculation** (DB fields exist; the calculation logic is not wired in the line items grid)

---

## Database Schema

### Tables Found

| Table | Status | Notes |
|-------|--------|-------|
| `change_events` | ✅ Full | 25 columns including all PRP-required fields |
| `change_event_line_items` | ✅ Full | 18 columns; all financial fields present |
| `change_event_rfqs` | ✅ Full | 17 columns; full RFQ workflow supported |
| `change_event_rfq_responses` | ✅ Full | 14 columns; response submission supported |
| `change_event_attachments` | ✅ Full | 8 columns |
| `change_event_history` | ✅ Full | 8 columns; field-level audit trail |
| `change_event_approvals` | ✅ Full | 7 columns (beyond PRP scope — extra) |
| `change_event_pco_links` | ✅ Full | 6 columns; polymorphic PCO links |
| `change_event_related_items` | ✅ Full | 11 columns |
| `pco_change_events` | ✅ Full | Junction table for `potential_change_orders` |
| `budget_changes` | 🔴 Missing | No table exists; "Add to Budget Change" flow blocked |

### Schema Gaps

| Missing | Type | Required By |
|---------|------|-------------|
| `budget_changes` table | New table | "Add to Budget Change" workflow (PRP §3.4, §8.6) |
| `change_event_line_items.latest_price` | Column (`numeric`) | Line items grid "Latest Price" column (PRP §2.8) |
| Status enum not enforced on `change_events.status` | Constraint | DB allows any string; `change_event_status` enum type exists but unused |
| `change_event_line_items.contract_id` FK → `prime_contracts` | Wrong target | Should also support `commitments`; current FK is wrong for commitment contracts |

### Type Inconsistencies (Guardrails)

- `change_events.project_id` is `bigint`; `prime_contract_pcos.project_id` and `commitment_pcos.project_id` are `integer` — coercion happens silently, but new code must use correct types
- `change_event_pco_links.pco_id` is `uuid` with NO FK constraint — polymorphic discriminator (`pco_type` text) connects to either `prime_contract_pcos` or `commitment_pcos`
- `prime_contract_pcos.promoted_to_co_id` is `bigint` FK → `prime_contract_change_orders`; `commitment_pcos.promoted_to_co_id` is `uuid` FK → `contract_change_orders` — these are different tables with different PK types

---

## List View

| Requirement | Status | Notes |
|-------------|--------|-------|
| Column: Number - Title | ✅ | `number_title` column with expand chevron and tooltip |
| Column: Status | ✅ | `StatusBadge` component |
| Column: Scope | ✅ | TBD / In Scope / Out of Scope |
| Column: Type | ✅ | Full type label mapping |
| Column: Change Reason | ✅ | `reason` column |
| Column: Origin | ✅ | `origin` column |
| Column: Prime PCO (Revenue amount) | ✅ | `revenue_prime_pco` column (dollar value) |
| Column: Prime PCO Title | ✅ | `prime_pco_title` column |
| Column: Cost ROM | ✅ | `cost_rom` column |
| Column: RFQ Title | ✅ | `rfq_title` column |
| Column: Commitment (dollar) | ✅ | `commitment` column |
| Column: Commitment Title | ✅ | `commitment_title` column |
| Column: Created | ✅ | `created_at` column |
| Column groups (Change Event / Revenue / Cost) | ✅ | `columnGroups` prop on UnifiedTablePage |
| Tab: Line Items | ✅ | Server-side tab filtering |
| Tab: No Line Items | ✅ | Server-side tab filtering |
| Tab: RFQs | ✅ | Server-side tab count |
| Tab: Recycle Bin | ✅ | Soft-delete with restore |
| Toolbar: Create button | ✅ | `PermissionGate` wrapped |
| Toolbar: Export CSV | ✅ | Client-side CSV export |
| Toolbar: Column visibility | ✅ | Via `UnifiedTablePage` columns prop |
| Toolbar: Filters | ✅ | Status, Scope, Type, Origin, Expecting Revenue, Conversion State, Over/Under, Budget, Budget Code Segments |
| Filter: Status | ✅ | Open, Pending, Closed, Void |
| Filter: Scope | ✅ | TBD, In Scope, Out of Scope |
| Filter: Type | ✅ | 8 type options |
| Filter: Origin | ✅ | 5 origin options |
| Filter: Scope missing "Allowance" | 🟡 | `SCOPE_FILTER_OPTIONS` has no Allowance entry; DB scope column stores free text |
| Row action: View | ✅ | Opens detail page |
| Row action: Edit | ✅ | Navigates to edit mode |
| Row action: Delete | ✅ | With confirmation dialog |
| Row action: Send RFQs | 🟡 | Available via selection bar when row is checked; NOT a direct single-row action |
| Selection bar: Send RFQs | ✅ | `ChangeEventSelectionBar` |
| Selection bar: Add to Prime PCO | ✅ | `AddToPrimePCODialog` via selection bar |
| Selection bar: Add to Commitment CO | ✅ | `AddToCommitmentCODialog` via selection bar |
| Selection bar: Add to Budget Change | 🔴 | Not implemented; no `budget_changes` table |
| Bulk delete | ✅ | Via toolbar |
| Grand totals footer | ✅ | Revenue Prime PCO, Cost ROM, Commitment |
| Server-side pagination | ✅ | Page + perPage + tab passed to API |
| Card view | ✅ | `renderChangeEventCard` |
| List view | ✅ | `renderChangeEventList` |
| Search | ✅ | By number, title, reason |
| Toolbar: Print | 🔴 | Not implemented |
| Configurable Views (Classic Detail / Classic Summary) | 🟡 | Waived by Megan 2026-03-30; deferred to DataTable v2 |
| Grouping by column | 🔴 | Not implemented |

---

## Create / Edit Form

| Requirement | Status | Notes |
|-------------|--------|-------|
| Field: Number (auto-generated) | ✅ | Sequential per project |
| Field: Title (text, required) | ✅ | |
| Field: Status (select, default: Open) | ✅ | |
| Field: Origin (select) | ✅ | |
| Field: Type (select, default: Allowance) | ✅ | |
| Field: Change Reason (select) | ✅ | |
| Field: Scope (select, default: TBD) | ✅ | |
| Field: Line Item Revenue Source (select) | ✅ | |
| Field: Prime Contract for Markup (select) | ✅ | |
| Field: Description (rich text) | ✅ | |
| Field: Attachments (file upload) | ✅ | |
| Field: Expecting Revenue (toggle) | ✅ | Fixed in 2026-03 gap analysis |
| Line items grid: Budget Code (select) | ✅ | |
| Line items grid: Description (text) | ✅ | |
| Line items grid: Vendor (select/combobox) | ✅ | `VendorCombobox` |
| Line items grid: Contract (select/combobox) | ✅ | `ContractCombobox` |
| Line items grid: Unit of Measure (select) | ✅ | |
| Line items grid: Revenue Quantity | ✅ | |
| Line items grid: Revenue Unit Cost | ✅ | |
| Line items grid: Revenue ROM | ✅ | |
| Line items grid: Cost Quantity | ✅ | |
| Line items grid: Cost Unit Cost | ✅ | |
| Line items grid: Cost ROM | ✅ | |
| Line items grid: Non-Committed Cost | ✅ | |
| Line items grid: Latest Price | 🔴 | Column missing from DB (`latest_price` not in `change_event_line_items`) |
| Revenue ROM auto-calculation logic | 🟡 | DB `line_item_revenue_source` field exists; auto-calc behavior not wired in line items grid UI |
| Add row / delete row | ✅ | |
| Totals row | ✅ | Sum footer |

---

## Detail View

| Requirement | Status | Notes |
|-------------|--------|-------|
| Header: CE Number, Title | ✅ | `${number} - ${title}` |
| Header: Status badge | ✅ | |
| Header field display (all general info) | ✅ | `ChangeEventGeneralInfoPanel` |
| Tab: General | ✅ | General info + line items + PCO sections |
| Tab: Lineage | ✅ | Prime PCOs + Commitment PCOs linked |
| Tab: Related Items | ✅ | Link/unlink related items |
| Tab: Comments | ✅ | `EntityComments` with Liveblocks |
| Tab: Change History | ✅ | `ChangeEventHistoryTab` |
| Tab: Emails | 🟡 | Empty state placeholder only; no actual email functionality |
| Tab: Summary | 🔴 | PRP §5.2 lists "Summary" tab; not present in current impl |
| Tab: RFQs | 🔴 | PRP §5.2 requires RFQs tab in detail view; current impl only shows RFQs count in list tabs. DB + API exist (`change_event_rfqs` table, `rfqs/route.ts`); just no detail view tab |
| Line items display | ✅ | `ChangeEventLineItemsTable` with vertical markup |
| Action: Edit | ✅ | |
| Action: Delete | ✅ | |
| Action: Send RFQs | 🟡 | Available via RFQ sheet form; not prominently surfaced as primary action |
| Action: Export CSV | ✅ | |
| Action: Export PDF | ✅ | |
| Action: Clone | ✅ | Extra feature beyond PRP |
| Action: Email Change Event | ✅ | `ChangeEventEmailDialog` |
| Action: Copy ID | ✅ | Extra feature |
| Add to: New Prime PCO | ✅ | `AddToPrimePCODialog` |
| Add to: Link to existing Prime PCO | ✅ | Sub-menu with existing non-void PCOs |
| Add to: New Commitment CO | ✅ | `AddToCommitmentCODialog` |
| Add to: Link to existing Commitment CO | 🔴 | Dialog exists but "Link to existing" path missing |
| Add to: New Purchase Order | 🟡 | Routes to `/commitments/new?type=purchase_order`; no CE pre-population |
| Add to: New Subcontract | 🟡 | Routes to `/commitments/new?type=subcontract`; no CE pre-population |
| Add to: New Budget Change | 🔴 | Not implemented; no `budget_changes` table |
| Add to: Link to existing Budget Change | 🔴 | Not implemented |
| Status transition: Open → Closed | ✅ | "Close" menu item |
| Status transition: Open → Pending Approval | ✅ | "Submit for Approval" (beyond PRP scope — product enhancement) |
| Status transition: Pending → Approved | ✅ | "Approve" (product enhancement) |
| Status transition: Pending → Rejected | ✅ | "Reject" (product enhancement) |

---

## Workflows & Business Rules

| Requirement | Status | Notes |
|-------------|--------|-------|
| Status lifecycle: Open ↔ Closed | ✅ | Implemented (with extra statuses) |
| Revenue ROM auto-calculation: Match to Latest Cost | 🟡 | DB field present; UI does not auto-update Revenue ROM when Cost ROM changes |
| Revenue ROM auto-calculation: Match to Latest Price | 🔴 | `latest_price` column missing from line items; can't implement |
| Revenue ROM auto-calculation: Manual Entry | ✅ | Users can manually enter Revenue ROM |
| Scope → Budget ROM rules (configurable per scope) | 🔴 | No Configure Settings page; budget ROM behavior not configurable |
| Budget impact: CE → Budget Change | 🔴 | No `budget_changes` table |
| Prevent Budget Changes + Prime COs on same line item | 🔴 | No enforcement; no budget changes implemented |
| Commitment CO line item uses latest cost vs latest price | 🟡 | Partially: "Add to" passes data but latest_price passthrough not implemented |
| CE created from RFI | 🔴 | No "Create CE from RFI" flow in RFI tool |
| CE created from Observation | 🔴 | No Observations tool link |
| CE created from Meeting action item | 🔴 | No Meetings tool link |
| CE number auto-increment per project | ✅ | |

---

## Integrations

| Requirement | Status | Notes |
|-------------|--------|-------|
| Budget tool: Cost ROM / Revenue ROM columns in budget view | 🔴 | Budget tool does not show CE ROM columns |
| Prime Contracts: Add CE → Prime PCO | ✅ | Full flow implemented |
| Prime Contracts: Add CE → existing Prime PCO | ✅ | Sub-menu with PCO list |
| Commitments: Add CE → Commitment CO | ✅ | `AddToCommitmentCODialog` |
| Commitments: Add CE → New PO/Subcontract | 🟡 | Navigates but doesn't pre-populate from CE |
| RFI tool: RFI → create CE | 🔴 | Not implemented |
| Observations tool: Observation → create CE | 🔴 | Not implemented |
| Meetings tool: Meeting action → create CE | 🔴 | Not implemented |
| Budget Changes: CE → create Budget Change | 🔴 | No budget_changes table |

---

## Known Guardrails (from Incident Log + Schema Review)

1. **UUID vs INTEGER FK** — `change_events.project_id` is `bigint`; `prime_contract_pcos.project_id` and `commitment_pcos.project_id` are `integer`. Any new query joining these tables must cast correctly or use consistent types. Never `parseInt(changeEventId)` — it's a UUID.

2. **Status casing** — `change_events.status` default is `'Open'` (title case). The `change_event_status` enum has `'open'` (lowercase). The actual column is `varchar` not the enum type, so casing is inconsistent. All lookups should normalize to lowercase.

3. **`change_event_pco_links.pco_id` has no FK** — polymorphic via `pco_type` text. Adding a new PCO type requires updating both insert logic and any queries that JOIN on this table.

4. **`DevAutoFillForms` infinite loop** — Fixed (2026-03-04). Root cause: `MutationObserver` on form without `data-dev-autofill-enhanced` guard. New forms with `MutationObserver` must set the guard attribute before `prepend()`.

5. **`await params` in Next.js App Router** — Change event API routes under `[changeEventId]/` must `await params` before accessing `params.changeEventId`. Missing await causes undefined ID.

---

## Implementation Priority

Ordered by user impact and dependency:

1. **RFQs tab in detail view** — DB and API exist; just needs a tab component showing the RFQ list with status badges. High user impact, low effort.
2. **Revenue ROM auto-calculation** — Wire `line_item_revenue_source` to auto-update Revenue ROM when Cost ROM changes (Match to Latest Cost mode). Medium effort; important for financial accuracy.
3. **`latest_price` column on line items** — Add migration + update line items API to populate from linked Prime PCO. Unblocks "Match Revenue to Latest Price" mode.
4. **RFQs tab list view improvements** — Direct "Send RFQs" row action (currently only via selection bar).
5. **Add to Budget Change** — Requires new `budget_changes` table + full flow. Significant effort; lower priority than above.
6. **CE → RFI / Observations / Meetings cross-tool links** — Low priority; those tools are not currently feature-complete.
7. **Budget tool integration** — CE ROM columns in budget view. Blocked on budget tool roadmap.
8. **Configure Settings page** — Budget ROM per scope configurable. Admin-only feature; low priority.
