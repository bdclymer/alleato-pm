# Test Run Report: Prime Contracts — Smoke (Ephemeral)

**Run ID:** ephemeral-20260420
**Tester:** claude-code
**Environment:** localhost:3000
**Branch:** main
**Started:** 2026-04-20
**Duration:** ~8 mins

> ⚠️ No smoke suite exists for `prime-contracts` in Supabase. Ran ephemeral sweep against discovered pages and routes. To persist these cases and track trends, run `/test-scenario-audit prime-contracts smoke` to generate a real suite.

---

## Summary

| Status   | Count |
|----------|-------|
| Passed   | 12    |
| Failed   | 2     |
| Skipped  | 0     |
| Blocked  | 0     |
| **Total**| **14**|

Pass rate: **86%**

---

## API Sweep (Phase 0)

curl-based sweep returned 10/10 false 500s due to shell escaping of the Supabase auth cookie (HttpOnly cookie with base64 JSON causes `Invalid Base64-URL character '"'` when passed via `-H "Cookie: ..."` in a subshell). Verified all 10 endpoints return valid JSON when accessed via the authenticated browser session.

**API sweep verdict: PASS** (false negatives — curl cookie encoding issue, not real server errors)

**Note:** The `scripts/api-smoke-contracts.mjs` pattern should be used for reliable sweeping (it handles auth differently). Do not use raw curl with `document.cookie` for Supabase sessions.

---

## Page Results

| # | Page | URL | Status | Notes |
|---|------|-----|--------|-------|
| 1 | List | `/67/prime-contracts` | **pass** | 2 contracts, table/grid/list views, correct columns |
| 2 | Detail — General | `/67/prime-contracts/:id` | **pass** | All fields, financial summary, breadcrumb correct |
| 3 | Detail — SOV | tab | **pass** | 14 line items, Budget Code + Amount + Bill to Date + Remaining |
| 4 | Detail — Change Orders | tab | **pass** | Correct EmptyState, "No change orders" copy |
| 5 | Detail — Commitments | tab | **pass** | Renders without error |
| 6 | Detail — Invoices | tab | **pass** | EmptyState with "+ Create Invoice" CTA in body |
| 7 | Detail — Payments Received | tab | **pass (slow)** | Shows "Loading payments..." for ~2s; resolves to 1 item |
| 8 | Detail — Related Items | tab | **pass** | EmptyState, "Link Item" action visible |
| 9 | Detail — Change History | tab | **pass** | 2 audit entries with timestamps |
| 10 | Detail — Financial Markup | tab | **pass** | 2 markup rules, "+ Add Markup" button |
| 11 | Create New Contract | `/67/prime-contracts/new` | **pass** | All form fields render, required fields marked |
| 12 | Edit Contract | `/67/prime-contracts/:id/edit` | **fail** | See failure detail below |
| 13 | Change Orders List | `/67/prime-contracts/change-orders` | **pass** | 2 items, Prime Contract + Commitments tabs, Export CSV |
| 14 | Configure | `/67/prime-contracts/configure` | **pass** | CO workflow tiers, permissions toggles all visible |
| 15 | New Invoice | `/67/prime-contracts/:id/invoices/new` | **fail** | See failure detail below |

---

## Failures

### F1 — Edit form: Owner/Client not pre-filling

- **Page:** `/67/prime-contracts/fafebfbe-e5e7-434c-ad29-375107d4b4c2/edit`
- **Expected:** Owner/Client dropdown pre-fills with "Hillsdale Holdings" (value visible in detail view)
- **Actual:** Dropdown shows placeholder "Select company" — value not restored on edit
- **Severity:** high — every user clicking Edit loses the owner field silently
- **Root cause:** Likely FK mismatch — `prime_contracts.owner_id` FK target table differs from the dropdown's options source table (Gate 11 violation). The API response needs to map the stored FK back to the dropdown's option ID.
- **Remediation:** Check `prime_contracts.owner_id` FK target vs dropdown source in `database.types.ts`. Apply same fix pattern as `docs/patterns/form-id-mismatch-prevention.md`.
- **Screenshot:** `/tmp/pc-test-11-edit-retry.png`

### F2 — New Invoice: Contract not pre-selected from URL param

- **Page:** Redirects to `/67/invoices/new?contractType=prime&contractId=fafebfbe-...`
- **Expected:** Contract dropdown pre-selects the contract (contractId is in the URL)
- **Actual:** Contract dropdown is empty — user must manually select contract
- **Severity:** medium — creates friction; user arriving from a specific contract's "Create Invoice" button expects context to carry over
- **Root cause:** The New Invoice page reads `contractType` from the query param (correctly sets "Prime Contract") but does not use `contractId` to pre-select the contract in the Contract dropdown.
- **Remediation:** In the New Invoice form component, read `contractId` from `useSearchParams()` and set it as the default value for the Contract field on mount.
- **Screenshot:** `/tmp/pc-test-14-new-invoice-retry.png`

---

## Observations (Non-Blocking)

- **"1 Issue" badge (bottom-left):** Appears on detail pages throughout the run. This is the agent-browser/MCP overlay badge — not an application issue.
- **Slow initial loads:** Configure page and New Invoice page show skeleton for ~3–4s before rendering. Not a failure but worth monitoring — both resolve correctly with enough wait time.
- **Financial Summary discrepancy:** Detail shows `Original Contract Amount: $0.00` and `Payments Received: $335,186.10`, resulting in `Remaining Balance: -$335,186.10`. This may be intentional (data state) or a data integrity issue — worth confirming against seed data expectations.

---

## Next Steps

- [ ] **Fix F1** — Resolve Owner/Client FK mismatch in edit form (`prime_contracts.owner_id` → dropdown source mapping)
- [ ] **Fix F2** — Pre-select contract in New Invoice form using `contractId` query param
- [ ] **Generate real suite** — Run `/test-scenario-audit prime-contracts smoke` to create persisted test cases in Supabase
- [ ] **Re-run after fixes** — `/test-scenario-run prime-contracts smoke`
- [ ] **Investigate** — Financial Summary $0 original amount vs $335k payments received (data integrity question)
