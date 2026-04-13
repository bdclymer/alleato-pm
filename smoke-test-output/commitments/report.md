# Smoke Test Report: Commitments

| Field | Value |
|-------|-------|
| **Date** | 2026-04-13 |
| **Tool** | Commitments |
| **Project** | 67 (Vermillion Rise Warehouse) |
| **URL** | http://localhost:3000/67/commitments |
| **Verdict** | **PARTIAL** |
| **Duration** | ~8 minutes |
| **Previous Run** | 2026-04-10 (FAIL) |

---

## Summary

| Check | Count | Pass | Fail | Verdict |
|-------|-------|------|------|---------|
| API Endpoints | 12 | 12 | 0 | PASS |
| Page Loads | 8 | 8 | 0 | PASS |
| CRUD Tests | 4 | 3 | 1 | PARTIAL |
| DB Validation | 1 | 1 | 0 | PASS |
| Negative Path | 1 | 1 | 0 | PASS |

### Improvement Since Last Run (2026-04-10)

- API: 3 failures fixed (PCO create 500, line-items import 404, export 404) — all endpoints now healthy
- Date fields now persist on create (previously lost until edit-save)
- Overall: FAIL → PARTIAL (remaining issue: missing delete UI)

---

## API Health

| Endpoint | Method | Status | Expected | Verdict |
|----------|--------|--------|----------|---------|
| `/api/commitments?project_id=67` | GET | 200 | 200 | PASS |
| `/api/commitments/[id]` | GET | 200 | 200 | PASS* |
| `/api/commitments/[id]/advanced-settings` | GET | 200 | 200 | PASS |
| `/api/commitments/[id]/change-orders` | GET | 200 | 200 | PASS |
| `/api/commitments/[id]/invoices` | GET | 200 | 200 | PASS |
| `/api/commitments/[id]/rfqs` | GET | 200 | 200 | PASS |
| `/api/commitments/[id]/emails` | GET | 200 | 200 | PASS |
| `/api/commitments/[id]/attachments` | GET | 200 | 200 | PASS |
| `/api/commitments/[id]/related-items` | GET | 200 | 200 | PASS |
| `/api/projects/67/.../line-items` | GET | 200 | 200 | PASS |
| `/api/projects/67/.../subcontractor-sov` | GET | 400 | 400 | PASS (PO record — business rule) |
| `/api/projects/67/.../pcos` | GET | 200 | 200 | PASS |

*Required `.next` cache clear — stale turbopack manifest, not a code bug.

---

## Page Loads

| Page | URL | Loaded | JS Errors | Verdict |
|------|-----|--------|-----------|---------|
| List | /67/commitments | Yes | None | PASS |
| Detail | /67/commitments/[id] | Yes | None | PASS |
| New | /67/commitments/new | Yes | None | PASS |
| Edit | /67/commitments/[id]/edit | Yes | None | PASS |
| Settings | /67/commitments/settings | Yes | None | PASS |
| Configure | /67/commitments/configure | Yes | None | PASS |
| Recycle Bin | /67/commitments/recycle-bin | Yes | None | PASS |
| Invoice Detail | — | — | — | SKIPPED |

---

## CRUD Tests

### Create (Test 1.1.1)

**Test:** Create a new Subcontract with required fields
**Result:** PASS

Created "Smoke Test Subcontract 203221" with Contract # SMOKE-001, Contract Company "Alleato Group". Record appeared in list immediately.

| Field | Value Entered | DB Value | Match |
|-------|--------------|----------|-------|
| Title | Smoke Test Subcontract 203221 | Smoke Test Subcontract 203221 | YES |
| Contract # | SMOKE-001 | SMOKE-001 | YES |
| Contract Company | Alleato Group | Alleato Group | YES |
| Status | Draft | Draft | YES |
| Type | Subcontract | subcontract | YES |

### Read / Detail

**Result:** PASS

Detail page loads with KPI strip, 11 tabs (General, SOV, Change Orders, RFQs, Invoices, Payments Issued, Emails, Attachments, Change History, Related Items, Advanced Settings), contract settings, and key dates.

### Edit (Test 1.2.1)

**Result:** PASS
**Pre-fill check:** All dropdowns show saved values? **YES** (for subcontract type)

Edited title to "Smoke Test Subcontract EDITED". Success toast shown. Title updated on detail page.

**Note:** Earlier PO (PO-01236) edit page showed "Search vendors..." placeholder instead of saved company — potential FK pre-fill issue for Purchase Orders specifically (see FAILURE-002).

### Delete (Tests 1.3.1, 1.3.2)

**Result:** FAIL (UI) / PASS (API)

- **API DELETE** works correctly — soft deletes to recycle bin with `canRestore: true`
- **UI row actions menu** only shows: Edit Commitment, Related Items, Add Line Item — **no Delete option**
- **Bulk delete** — selecting rows does not surface a bulk action toolbar with Delete

---

## Negative Path

**Empty form submit:** PASS

Three inline validation errors appear correctly:
- "Title is required"
- "Contract number is required"
- "Please select a vendor"

No crash, no silent save, no console errors.

---

## Failures

### FAILURE-001: No Delete option in UI (HIGH)

| Field | Value |
|-------|-------|
| **Phase** | CRUD |
| **Severity** | high |
| **What happened** | Row actions menu lacks a "Delete" option. Selecting rows does not surface a bulk action toolbar. Delete only works via direct API call. |
| **Expected** | Row actions menu should include "Delete" option. Selecting 1+ rows should show a bulk action bar with "Delete Selected" button. |

### FAILURE-002: PO edit form — Contract Company not pre-filled (MEDIUM)

| Field | Value |
|-------|-------|
| **Phase** | CRUD |
| **Severity** | medium |
| **What happened** | When editing Purchase Order PO-01236, the Contract Company dropdown shows "Search vendors..." placeholder instead of the saved company name ("Sales Ghost LLC"). |
| **Expected** | Contract Company dropdown should show the saved company name when editing. |

**Note:** Subcontracts pre-fill correctly. This may be a Gate 11 (Form FK Validation) issue specific to Purchase Orders.

---

## Test Matrix Coverage

| Matrix Test ID | Name | Executed | Result |
|---------------|------|----------|--------|
| 1.1.1 | Create Subcontract with required fields | Yes | PASS |
| 1.1.3 | Create fails with missing required fields | Yes | PASS |
| 1.2.1 | Edit — change title | Yes | PASS |
| 1.3.1 | Delete a single commitment | Yes | FAIL (no UI delete) |
| 2.1 | List view loads with correct columns | Yes | PASS |
| 2.2 | Detail view loads | Yes | PASS |
| 14.1 | Advanced Settings tab loads | Yes | PASS |
| 14.2 | Configure page loads | Yes | PASS |

**Coverage:** 8 of 89 tests executed (HIGH-priority subset for smoke test)

---

## Next Steps

- **Fix FAILURE-001 (high):** Add "Delete" to row actions menu and implement bulk delete toolbar on row selection
- **Investigate FAILURE-002 (medium):** Check PO edit form Contract Company dropdown — may be Gate 11 FK mismatch
- Consider `/feature-audit commitments` for deeper testing of SOV, Change Orders, Invoices, and Payments Issued tabs
