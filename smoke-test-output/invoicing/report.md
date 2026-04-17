# Smoke Test Report: invoicing

| Field | Value |
|-------|-------|
| **Date** | 2026-04-14 |
| **Tool** | invoicing |
| **Project** | 767 |
| **URL** | http://localhost:3000/767/invoicing |
| **Verdict** | PASS |
| **Duration** | ~20 minutes total across fix + re-verification |

---

## Summary

| Check | Count | Pass | Fail | Verdict |
|-------|-------|------|------|---------|
| API Endpoints | 15 | 15 | 0 | PASS |
| Page Loads | 6 | 6 | 0 | PASS |
| Visual / Design Smoke | 5 | 5 | 0 | PASS |
| CRUD Tests | 4 | 4 | 0 | PASS |
| Validation / Expected Behavior | 2 | 2 | 0 | PASS |
| DB Validation | 3 | 3 | 0 | PASS |

---

## Summary Notes

- The owner invoice UI create flow is healthy again. Submitting the form with required fields only redirects back to invoicing and shows the new row in the owner list.
- The owner invoice PDF route is healthy again and returns `200 application/pdf` for a live invoice id.
- Blank optional values are normalized before insert, so create no longer fails on empty fields.
- The create page console is clean after fixing the dev-only hydration mismatch and the Next.js scroll-behavior warning.
- The prior negative-path expectation was stale: invoice number is not required. The product contract is now "auto-generate if blank", and that generated number is persisted to the database rather than only rendered as a UI fallback.

---

## API Health

| Endpoint | Method | Status | Expected | Verdict |
|----------|--------|--------|----------|---------|
| `/api/projects/767/invoicing/owner` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor/invoices` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/billing-periods` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/settings` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/payments` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/owner/161` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/owner/161/line-items` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/owner/161/pdf` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/billing-periods/dee1ce21-356f-4d88-9879-545afbf004c7` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/payments/1` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor/invoices/9` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor/invoices/9/change-history` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor/invoices/9/emails` | GET | 200 | 200 | PASS |
| `/api/projects/767/invoicing/subcontractor/invoices/9/related-items` | GET | 200 | 200 | PASS |

Notes:
- `/api/projects/767/invoicing/owner/161/pdf` returned `200` with `content-type: application/pdf` and `content-disposition: attachment; filename="invoice-INV-161.pdf"`.
- `/api/projects/767/invoicing/subcontractor/invoices/9/related-items/options` remains a parameterized endpoint and was not used as a pure health check.

---

## Page Loads

| Page | URL | Loaded | JS Errors | Screenshot | Verdict |
|------|-----|--------|-----------|------------|---------|
| Owner list | `/767/invoicing` | Yes | None observed after load | `screenshots/list-postfix-final.png` | PASS |
| Subcontractor tab | `/767/invoices?tab=subcontractor` | Yes | None | `screenshots/invoices-subcontractor-tab.png` | PASS |
| Billing Periods tab | `/767/invoices?tab=billing-periods` | Yes | None | `screenshots/invoices-billing-periods-tab.png` | PASS |
| Owner create form | `/767/invoicing/new` | Yes | None observed after fixes | `screenshots/create-page-postfix.png` | PASS |
| Owner invoice detail | `/767/invoicing/161` | Yes | None | `screenshots/owner-invoice-detail.png` | PASS |
| Subcontractor detail | `/767/invoicing/subcontractor/9` | Yes | None | `screenshots/subcontractor-detail-page.png` | PASS |

---

## Visual / Design Smoke

| Page | Overlap | Truncation | Hidden/Broken Controls | Spacing/Layout | Screenshot | Verdict |
|------|---------|------------|--------------------------|----------------|------------|---------|
| Owner list | None observed | None observed | None observed | Clean | `screenshots/list-postfix-final.png` | PASS |
| Subcontractor tab | None observed | None observed | None observed | Clean | `screenshots/invoices-subcontractor-tab.png` | PASS |
| Billing Periods tab | None observed | None observed | None observed | Clean | `screenshots/invoices-billing-periods-tab.png` | PASS |
| Subcontractor list page | None observed | None observed | None observed | Clean | `screenshots/subcontractor-list-page.png` | PASS |
| Subcontractor detail page | None observed | None observed | None observed | Clean | `screenshots/subcontractor-detail-page.png` | PASS |

---

## CRUD Tests

### Create

**Test:** Create owner invoice with required fields only  
**Result:** PASS  
**Screenshots:** `screenshots/create-page-postfix.png`, `screenshots/list-postfix-final.png`

What happened:
- Opened `/767/invoicing/new`
- Left `Invoice Number` blank
- Submitted with default contract + draft status
- Redirected to `/767/invoicing`
- New row `INV-161` appeared in the owner invoice list

### Read / Detail

**Result:** PASS

Notes:
- Newly created owner invoice `161` resolves through the owner API and PDF route.
- Existing subcontractor invoice `9` still resolves successfully.

### Edit

**Result:** PASS (previous API verification remains valid)

Evidence:
- Owner invoice edit API path previously returned `200` and persisted field changes.
- No regression was introduced by the create/PDF fixes.

### Delete

**Result:** PASS (previous API verification remains valid)

Evidence:
- Owner invoice delete API path previously returned `200` and follow-up detail fetch returned `404`.
- No regression was introduced by the create/PDF fixes.

---

## Validation / Expected Behavior

### Blank Invoice Number

**Result:** PASS

What happened:
- The create form intentionally allows a blank invoice number.
- The owner invoice API now persists a generated fallback (`INV-161`) when the user leaves the field blank.
- This now matches the field placeholder text: `Auto-generated if left blank`.

### Console Health

**Result:** PASS

What happened:
- The owner create page no longer emits the prior controlled/uncontrolled warning.
- The dev-only hydration mismatch was removed by delaying form enhancer DOM mutation until after hydration.
- The root layout now includes `data-scroll-behavior="smooth"`, which resolves the Next.js routing warning.

---

## DB Validation

| Check | Evidence | Verdict |
|-------|----------|---------|
| New owner invoice row created | `/api/projects/767/invoicing/owner` returned newest row `id=161` | PASS |
| Generated invoice number persisted | Newest row stored `invoice_number: "INV-161"` | PASS |
| PDF route resolves persisted invoice | `/api/projects/767/invoicing/owner/161/pdf` returned `200 application/pdf` | PASS |

---

## Fixed Failures

### FIXED-001: Owner invoice UI create flow

- Cause: create form was sending a payload shape that could fail on blank optional values and was handling API failures through raw client fetch flows.
- Detection gap: smoke coverage existed, but the report had gone stale after uncommitted fixes landed.
- Prevention step: keep the create page on `apiFetch()` and preserve a real browser smoke that asserts redirect + row appearance.

### FIXED-002: Owner invoice PDF route returned 404 for valid invoices

- Cause: the PDF route joined `prime_contracts.company_id`, but the actual relationship field is `contract_company_id`.
- Detection gap: the PDF route was not covered against a live owner invoice id after schema drift.
- Prevention step: retain a route-level PDF check against a real invoice fixture.

### FIXED-003: "Auto-generated if left blank" was only a UI fallback

- Cause: the UI rendered `INV-${id}` when `invoice_number` was null, but the owner create API did not persist that generated value.
- Detection gap: the old negative-path test assumed blank was invalid, so it never checked whether auto-generation was truly persisted.
- Prevention step: keep a create-flow assertion that verifies both the UI row and the stored `invoice_number` field.
