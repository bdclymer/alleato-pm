# Prime Contracts — Test Scenarios

Generated from PRP audit implementation. Covers all gap fixes applied in the April 2026 sprint.

---

## 1. Contract Status Enum — `out_for_bid` Removed

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1.1 | Contract status dropdown has no `out_for_bid` | Open New Prime Contract form → inspect Status dropdown | Options: Draft, Out for Signature, Approved, Complete, Terminated — no "Out for Bid" |
| 1.2 | List filter has no `out_for_bid` | Navigate to prime contracts list → open status filter | Filter options do not include "Out for Bid" |
| 1.3 | API rejects `out_for_bid` | `POST /api/projects/{id}/contracts` with `{"status":"out_for_bid"}` | 400 validation error |

---

## 2. ERP Status

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 2.1 | New contracts default to Unsynced | Create a contract → check detail page header | ERP status badge shows "Unsynced" |
| 2.2 | ERP status visible in list | Navigate to contracts list → check columns | "ERP Status" column visible, shows Unsynced/Synced/Error badge |
| 2.3 | ERP status filter works | Click ERP Status filter → select "Synced" | List shows only synced contracts |

---

## 3. Attachments Count

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 3.1 | Attachment count shows in list | Upload a file to a contract → return to list | Attachments column shows correct count with paperclip icon |
| 3.2 | Zero attachments is blank | Contract with no files → check list | Attachments column shows "0" or empty |

---

## 4. Column Visibility Defaults

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 4.1 | Invoiced Amount visible by default | Navigate to contracts list | "Invoiced Amount" column visible without toggling |
| 4.2 | Remaining Balance visible by default | Navigate to contracts list | "Remaining Balance" column visible without toggling |
| 4.3 | Percent Paid visible by default | Navigate to contracts list | "% Paid" column visible without toggling |

---

## 5. Privacy — `allowed_user_ids` & `allow_sov_view`

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 5.1 | Private checkbox shows user multi-select | Create contract → check "Private" → verify | Multi-select for non-admin users appears and is enabled |
| 5.2 | Private unchecked disables multi-select | Leave Private unchecked | Multi-select is disabled with hint text |
| 5.3 | Allow SOV view checkbox conditional | Check "Private" | "Allow these non-admin users to view SOV items" checkbox appears |
| 5.4 | Saved `allowed_user_ids` pre-fills on edit | Create private contract with selected users → click Edit | Multi-select shows the previously saved users |
| 5.5 | `allow_sov_view` saved correctly | Create contract with SOV view enabled → open API response | `allow_sov_view: true` in contract JSON |
| 5.6 | Private contract hidden from non-allowed user | Create private contract → log in as user not in allowed list → check list | Contract not visible in list |
| 5.7 | Private contract visible to admin | Admin visits list → private contract without allowed_user_ids | Admin can see it |
| 5.8 | Non-allowed user gets 404 on direct URL | User not in `allowed_user_ids` hits `GET /contracts/{id}` directly | 404 response |

---

## 6. Approved Status Gate — Invoices

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 6.1 | Create Invoice button disabled for Draft | Open contract in Draft status → go to Invoices tab | "Create Invoice" button is disabled, tooltip explains requirement |
| 6.2 | Create Invoice button disabled for Out for Signature | Contract in `out_for_signature` → Invoices tab | Button disabled |
| 6.3 | Create Invoice button enabled for Approved | Contract in `approved` → Invoices tab | Button is enabled, click navigates to new invoice form |
| 6.4 | API rejects non-approved | `POST /api/projects/{id}/contracts/{id}/payment-applications` on draft contract | 422 with message "Contract must be in 'Approved' status" |

---

## 7. CO Tier Lock

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 7.1 | Tier dropdown editable when no COs | Contract with 0 change orders → Advanced Settings | CO tier select dropdown is editable |
| 7.2 | Tier locked when COs exist | Contract with ≥1 change orders → Advanced Settings | CO tier shows read-only display, tooltip explains lock |
| 7.3 | API enforces lock | Create a CO → attempt `PUT /advanced-settings` changing co_tier_count | 422 with message explaining CO count and lock |
| 7.4 | Tier remains changeable when COs deleted | Delete all COs from contract → Advanced Settings | Select is editable again |

---

## 8. SOV Import from Budget

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 8.1 | Import button opens modal | New contract form → SOV section → Actions → "Import from Budget" | Modal opens showing budget line items |
| 8.2 | Import populates SOV rows | Select 3 budget lines → click Import | 3 SOV rows added with budget code, description, and amount pre-filled |
| 8.3 | Already-imported codes are grayed out | Import once → open modal again | Previously imported cost codes appear grayed/unselectable |
| 8.4 | Import on existing contract | Open contract → SOV tab → Import from Budget | API POST to `line-items/import`, new rows added to SOV |

---

## 9. Schedule of Values Tab

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 9.1 | SOV tab appears | Open any contract → check tabs | "Schedule of Values" tab visible between General and Change Orders |
| 9.2 | SOV tab shows line count | Contract with 3 SOV lines | Tab label shows "(3)" |
| 9.3 | Drag-and-drop reorder works | SOV tab → drag a line item up | Line item reorders, Save persists new order |

---

## 10. Related Items Tab

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 10.1 | Related Items tab appears | Open contract → check tabs | "Related Items" tab visible |
| 10.2 | Related Items renders without error | Click Related Items tab | No JS errors, content renders (may be stub) |

---

## 11. Regression Checks

| # | Scenario | Expected |
|---|----------|----------|
| 11.1 | Contract list loads without error | 200, enriched contracts with financial summary |
| 11.2 | Contract detail loads without error | All financial KPIs displayed correctly |
| 11.3 | Create contract saves successfully | 201, redirect to detail page |
| 11.4 | Edit contract saves successfully | Updated fields reflected immediately |
| 11.5 | COL id-to-index map doesn't break with new columns | All existing columns still render at correct positions |
