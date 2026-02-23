# Investigation Report: Prime Contracts
**Date:** 2026-02-23
**Overall Status:** PARTIAL — Core CRUD works, but security hole + type mismatch + missing hooks
**Completeness Score:** 6/10

---

## What Works (Confirmed)

| Test | Result | Evidence |
|------|--------|----------|
| Page loads | ✅ PASS | Route exists, no console errors |
| Create form opens | ✅ PASS | `/new` page renders with all fields |
| Form validation fires | ✅ PASS | Contract # and Title show required errors on empty submit |
| API routes exist | ✅ PASS | Full CRUD at `/api/projects/[projectId]/contracts/` |
| SOV line items | ✅ PASS | Add Group / Add Line / Import CSV all in UI |
| Change Orders tab | ✅ PASS | Tab exists in detail view |
| Attachments | ✅ PASS | File upload in create form |
| Database tables | ✅ PASS | All 4 tables exist |
| Column parity | ✅ 89% | 25 of 28 Procore columns implemented |

---

## What's Broken

| Issue | Severity | Evidence | Fix |
|-------|----------|----------|-----|
| Status enum mismatch — types file defines wrong values | 🔴 Critical | `types/prime-contracts.ts` vs `validation.ts` | Run `npm run db:types`, fix type file |
| Permission check disabled — anyone can edit any contract | 🔴 Critical | `route.ts:152-166` commented out with TODO | Uncomment 4 lines |
| Payment terms + billing schedule always null | 🟠 High | `new/page.tsx:31-65` hardcodes null | Add form fields |
| No hooks — raw fetch() on every page | 🟠 High | `page.tsx:108` etc. | Create `use-prime-contracts.ts` |
| ERP Status missing | 🟡 Medium | Not in DB/API/UI | Add (low priority — system-managed) |
| Detail page 71KB / 4 concerns mixed | 🟡 Medium | `[contractId]/page.tsx` | Refactor into tab components |
| Materialized view no refresh policy | 🟡 Medium | `contract_financial_summary_mv` | Document or switch to computed |

---

## What's Missing vs Procore

| Procore Has | We Have | Gap |
|-------------|---------|-----|
| ERP Status column | ❌ nothing | Low priority |
| Payment Terms editable | DB column exists | Form never sets it |
| Billing Schedule editable | DB column exists | Form never sets it |
| List page data (live test) | Unknown | --retest needed |

---

## Priority Fix List

1. **Re-enable permission check** — `route.ts:152` — Effort: XS (uncomment 4 lines)
2. **Fix status enum** — `types/prime-contracts.ts` — Effort: S (run db:types + fix file)
3. **Add payment terms + billing schedule fields** — `ContractForm.tsx` — Effort: M
4. **Create `use-prime-contracts.ts` hook** — Effort: M
5. **Verify list loads data** — run `--retest` with dev server up

---

## Files That Need Changes

| File | Change Needed |
|------|--------------|
| `frontend/src/types/prime-contracts.ts` | Fix status enum to match validation.ts |
| `frontend/src/app/api/projects/[projectId]/contracts/route.ts` | Uncomment permission check (line 152) |
| `frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx` | Remove hardcoded null for payment_terms/billing_schedule |
| `frontend/src/hooks/use-prime-contracts.ts` | Create — does not exist |
