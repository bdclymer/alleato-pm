# Invoicing — Smoke Test Report

**Date:** 2026-04-12  
**Project:** 767 (Alleato AI)  
**Tester:** Claude Code (automated)  
**Overall Verdict:** PARTIAL — Core flows work, one critical bug blocks subcontractor invoice creation

---

## Summary

| Category | Result |
|----------|--------|
| API endpoints (GET) | 6/6 PASS |
| Page loads | 4/4 PASS |
| Subcontractor invoice CREATE | **FAIL — 500 error (DB trigger bug)** |
| Subcontractor invoice DETAIL | PASS |
| Billing period CREATE | PASS |
| Payment CREATE | PASS |
| Settings PATCH | PASS |
| Console errors | WARN (2× ERR_CONNECTION_REFUSED — Liveblocks, not critical) |

---

## API Health Check

| Endpoint | Method | Status | Verdict |
|----------|--------|--------|---------|
| `/api/projects/767/invoicing/settings` | GET | 200 | PASS |
| `/api/projects/767/invoicing/billing-periods` | GET | 200 | PASS |
| `/api/projects/767/invoicing/payments` | GET | 200 | PASS |
| `/api/projects/767/invoicing/owner` | GET | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor/invoices` | GET | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor` | GET | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor/invoices/3` | GET | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor/invoices/3/change-history` | GET | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor/invoices/3/emails` | GET | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor/invoices/3/related-items` | GET | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor/invoices/3/line-items` | GET | 405 | NOTE (PATCH only — correct) |
| `/api/projects/767/invoicing/settings` | PATCH | 200 | PASS |
| `/api/projects/767/invoicing/billing-periods` | POST | 201 | PASS |
| `/api/projects/767/invoicing/billing-periods/{id}` | DELETE | 200 | PASS |
| `/api/projects/767/invoicing/payments` | POST | 201 | PASS |

---

## Page Load Check

| Page | URL | Loaded | JS Errors | Verdict |
|------|-----|--------|-----------|---------|
| Owner Invoices list | `/767/invoicing` | Yes | None | PASS |
| Owner Invoice new | `/767/invoicing/new` | Yes | None | PASS |
| Subcontractor list | `/767/invoicing/subcontractor` | Yes | None | PASS |
| Subcontractor new | `/767/invoicing/subcontractor/new` | Yes | None | PASS |
| Subcontractor detail | `/767/invoicing/subcontractor/3` | Yes | None | PASS |

**Note:** All pages show 2× `ERR_CONNECTION_REFUSED` in browser console. These come from Liveblocks real-time service and are not specific to invoicing.

---

## CRUD Tests

### CREATE Subcontractor Invoice — FAIL

**Request:**
```json
POST /api/projects/767/invoicing/subcontractor/invoices
{ "subcontract_id": "abf9a05a-3571-4e28-8646-cb672f3048f1" }
```

**Response:** `500 Internal Server Error`
```json
{
  "error": "Failed to create subcontractor invoice",
  "details": "record \"new\" has no field \"created_by\""
}
```

**Root cause:** A PostgreSQL trigger on `subcontractor_invoices` references `NEW.created_by`, but the column does not exist in the table schema. This is a trigger/schema mismatch — the trigger was written for a column that was never added (or was removed).

**Impact:** Cannot create any new subcontractor invoices from the UI or API.

---

### CREATE Billing Period — PASS

Successfully created and deleted a billing period (April 2026, period 1). No issues.

### CREATE Payment — PASS

Successfully created a payment against subcontractor invoice #2:
```json
POST /api/projects/767/invoicing/payments
{ "subcontractor_invoice_id": 2, "payment_date": "2026-04-12", "amount": 1000, "payment_method": "check" }
→ 201 Created
```

### READ Subcontractor Invoice Detail — PASS

Invoice #3 detail page renders correctly with tabs: Summary, Detail, Related Notes, Emails, Change History. Shows "Under Review" status badge, correct vendor and period info.

---

## Screenshots

| Screenshot | Notes |
|-----------|-------|
| `owner-list-full.png` | Clean empty state with correct CTA |
| `sub-list-full.png` | 2 invoices shown (INV-3 Under Review, INV-2 Draft) with amounts |
| `sub-new-full.png` | Create form loads — Commitment Type + Contract dropdowns visible |
| `sub-detail-2.png` | Invoice #3 detail fully rendered with all tabs |

---

## Bug Report

### BUG-001: Cannot create subcontractor invoices (DB trigger references non-existent column)

- **Severity:** HIGH — blocks all new invoice creation
- **Route:** `POST /api/projects/[projectId]/invoicing/subcontractor/invoices`
- **Error:** `record "new" has no field "created_by"`
- **Location:** PostgreSQL trigger on `subcontractor_invoices` table
- **Fix needed:** Either add a `created_by` column to `subcontractor_invoices`, or remove/fix the trigger that references it. Run: `\df+ subcontractor_invoices` in Supabase SQL editor to identify the trigger.

---

## Not Tested (Out of Scope)

- Owner invoice creation (requires valid `prime_contract_id` — no prime contracts in project 767)
- Invoice workflow actions: submit, approve, void, revise, approve-as-noted (require existing invoices in correct status)
- PDF generation endpoint
- Email endpoint
- ERP resend
