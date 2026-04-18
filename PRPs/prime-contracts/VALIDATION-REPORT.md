# Prime Contracts — PRP Validation Report

**Date:** 2026-04-17
**Validator:** Automated PRP validation gate
**Overall Status:** ❌ **FAIL**

---

## Executive Summary

Prime Contracts fails the validation gate. While the core list-view implementation is in excellent shape and aligns with Procore's column structure, **the validation cannot be completed** as designed because (a) TEST-SCENARIOS.md does not exist, (b) the dev server is not running — blocking Phase 4 browser verification, and (c) 18 of 38 tasks in TASKS.md are still unchecked, including explicit acceptance-criteria items (emails tab, change history tab, approval gate, CO tier lock, allowed_user_ids, erp_status header display, etc.).

The feature may be technically clean (0 TS errors related to prime-contracts, 0 lint errors), but per the gate's PASS rules it cannot be marked PASS while required artifacts are missing, task list is incomplete, and live verification was not possible.

---

## Phase 0 — Preflight

| Check | Result | Notes |
|---|---|---|
| `prp-prime-contracts.md` exists | ✅ | |
| `TEST-SCENARIOS.md` exists | ❌ **MISSING** | TASKS.md line explicitly says "run `/prp:prp-test-scenarios prime-contracts` to generate" |
| `AUDIT.md` exists | ✅ | |
| `TASKS.md` exists | ✅ | |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | in `frontend/.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | in `frontend/.env.local` |
| `TEST_USER_1` | ✅ | in `frontend/.env.local` |
| Dev server on :3000 | ❌ **NOT RUNNING** | `curl` returned 000 |
| Dev server on :3002 | ❌ | also down |
| Procore manifest | ✅ | `.claude/procore-manifests/prime-contracts/manifest.json` present |
| Output directory | ✅ | `verify-output/prime-contracts/` created |

**Preflight verdict:** BLOCKED — 2 of 4 required artifacts missing (TEST-SCENARIOS.md, running dev server).

---

## Phase 1 — Technical Gates

| Gate | Result | Evidence |
|---|---|---|
| TASKS.md complete | ❌ **FAIL** | 20/38 tasks done, **18 unchecked** (47% incomplete). Entire Phase 6 (Workflows), Phase 7 (Integrations), Phase 8 (Testing) unchecked. |
| TypeScript | ⚠️ **PASS with caveat** | 2 total errors in codebase, both in `submittal-types/route.ts` and `submittals/route.ts` — **zero errors in prime-contracts files**. |
| ESLint | ✅ **PASS** | 0 errors |
| Route conflicts | ⚠️ **SKIPPED** | `npm run check:routes` script does not exist (missing from package.json). Manual glob shows prime-contracts uses `[projectId]` and `[contractId]` correctly. |
| TEST-SCENARIOS coverage | ❌ **FAIL** | Document does not exist → 0% coverage |

### Unchecked TASKS.md items (critical gaps)

```
- [ ] Phase 6: Workflows / business rules
- [ ] Phase 7: Integrations
- [ ] Phase 8: Testing
- [ ] Verify prime_contract_line_items table name (schema query returned 0 rows)
- [ ] Fix prime_contract_change_orders.project_id type width
- [ ] Update PUT /contracts/[contractId] to accept allowed_user_ids and allow_sov_view
- [ ] Add Attachments count column
- [ ] Fix "Estimated Completion Date" label
- [ ] Add Access for Non-Admin Users multi-select
- [ ] Add Allow SOV View checkbox
- [ ] Implement Emails tab
- [ ] Implement Change History tab
- [ ] Enforce: Contract must be Approved before owner invoices can be created
- [ ] Enforce: CO tier cannot change after first CO is created
- [ ] Verify SOV import from Budget is functional
- [ ] Display erp_status on detail view header
- [ ] Wire allowed_user_ids to access control on API
- [ ] See PRPs/prime-contracts/TEST-SCENARIOS.md
```

---

## Phase 2 — Procore Compliance

### 2.1 RAG spot-check
✅ `scripts/procore-docs-query.js` responsive; returns real Procore documentation chunks covering permissions, approval workflow, and change orders.

### 2.2 Manifest vs. implementation (list columns)

| Procore column | Implemented (`prime-contracts-table-config.tsx`) | Match |
|---|---|---|
| Number | `contract_number` | ✅ |
| Owner/Client | `client_name` | ✅ |
| Title | `title` | ✅ |
| ERP Status | `erp_status` | ✅ |
| Status | `status` | ✅ |
| Executed | `executed` | ✅ |
| Original Contract Amount | `original_contract_value` | ✅ |
| Approved Change Orders | `approved_change_orders` | ✅ |
| Revised Contract Amount | `revised_contract_value` | ✅ |
| Pending Change Orders | `pending_change_orders` | ✅ |
| Draft Change Orders | `draft_change_orders` | ✅ |
| Invoiced | `invoiced_amount` | ✅ |
| Payments Received | `payments_received` | ✅ |
| % Paid | `percent_paid` | ✅ |
| Remaining Balance Outstanding | `remaining_balance` | ✅ |
| Private | `is_private` | ✅ |
| Attachments | `attachment_count` | ✅ (default hidden — TASKS.md says "Add Attachments count column" still open, so column exists but count may not be wired) |

**Column parity: 17/17 ✅** — this is the strongest part of the implementation.

### 2.3 Status enum compliance
Implementation enum: `draft | out_for_signature | approved | complete | terminated`
ERP status enum: `unsynced | synced | error`

These align with Procore's standard contract lifecycle. No obvious gap, but no RAG-sourced authoritative enum list was reviewed against Procore's actual status dropdown.

### 2.4 Known gaps per TASKS.md
- ❌ Emails tab not implemented
- ❌ Change History tab not implemented
- ❌ Approval-gated owner invoicing not enforced
- ❌ CO tier lock after first CO not enforced
- ❌ `erp_status` not displayed on detail header
- ❌ `allowed_user_ids` / `allow_sov_view` not accepted by PUT route
- ❌ Access for Non-Admin Users multi-select missing from form
- ❌ "Estimated Completion Date" label bug unfixed

---

## Phase 3 — Success Criteria

❌ **NOT PRODUCED.** TEST-SCENARIOS.md does not exist, so `success-criteria.md` cannot be derived from it. Per gate instructions, success criteria must be grounded in the test scenarios document.

---

## Phase 4 — Browser Verification

❌ **NOT EXECUTED.** Dev server is not running on port 3000 or 3002. No screenshots captured, no create/edit/validation flows tested, no DB field validation performed.

| Check | Result |
|---|---|
| List view screenshot | ❌ not captured |
| Detail view screenshot | ❌ not captured |
| Create form screenshot | ❌ not captured |
| Create happy path | ❌ not tested |
| Edit pre-fill | ❌ not tested |
| Validation errors | ❌ not tested |
| JS errors audit | ❌ not performed |
| DB field verification | ❌ not performed |

---

## Phase 5 — Evidence Inventory

| Artifact | Present |
|---|---|
| `verify-output/prime-contracts/screenshots/*` | ❌ empty |
| `verify-output/prime-contracts/videos/*` | ❌ empty |
| `verify-output/prime-contracts/success-criteria.md` | ❌ not written |
| `PRPs/prime-contracts/TEST-SCENARIOS.md` | ❌ missing |

---

## Issues Found

### Critical (block PASS)
1. **TEST-SCENARIOS.md missing.** Gate requires ≥80% scenarios "Ready to test"; cannot measure against a non-existent document.
2. **Dev server not running.** All Phase 4 browser verifications were skipped.
3. **TASKS.md 47% incomplete.** 18 unchecked items include explicit acceptance criteria (approval gate, CO tier lock, Emails tab, Change History tab, access control plumbing).
4. **Phases 6 (Workflows), 7 (Integrations), 8 (Testing) entirely unchecked.** Business rules and tests are both absent.
5. **`prime_contract_line_items` table identity unverified** — AUDIT note says schema query returned 0 rows but routes exist. This is a live data-integrity risk.

### Major
6. **PUT route does not accept `allowed_user_ids` / `allow_sov_view`** — silent data drop if UI ever submits them.
7. **Approval-gated invoicing not enforced** — users can create owner invoices against unapproved contracts, violating Procore's contract lifecycle.
8. **CO tier lock not enforced** — changing tier after a CO exists will corrupt numbering.
9. **Emails tab and Change History tab not implemented** — parity gap vs Procore's detail page.

### Minor
10. "Estimated Completion Date" label bug.
11. `erp_status` not surfaced on detail header (column exists in list but not shown on detail).
12. `prime_contract_change_orders.project_id` type width mismatch (low risk).
13. `npm run check:routes` script advertised in CLAUDE.md does not exist in package.json — rule #2 gate cannot be enforced automatically.

### Unrelated but flagged
14. TypeScript errors in `submittal-types/route.ts:18` and `submittals/route.ts:146` — not prime-contracts, but will eventually block CI if `tsc --noEmit` is gated.

---

## Evidence Artifacts Inventory

| File | Status |
|---|---|
| `PRPs/prime-contracts/prp-prime-contracts.md` | ✅ |
| `PRPs/prime-contracts/AUDIT.md` | ✅ |
| `PRPs/prime-contracts/TASKS.md` | ✅ (20/38 done) |
| `PRPs/prime-contracts/TEST-SCENARIOS.md` | ❌ |
| `PRPs/prime-contracts/VALIDATION-REPORT.md` | ✅ (this file) |
| `.claude/procore-manifests/prime-contracts/manifest.json` | ✅ |
| `verify-output/prime-contracts/screenshots/` | ❌ empty |
| `verify-output/prime-contracts/videos/` | ❌ empty |
| `verify-output/prime-contracts/success-criteria.md` | ❌ |

---

## Confidence Score

**4 / 10**

**What is strong (reason the score is not lower):**
- List-view column parity with Procore manifest is 17/17 ✅
- Status enums are modeled cleanly
- TypeScript and lint are clean for prime-contracts files
- Domain types and Zod validation schemas exist and match the DB shape
- API routes and form components are present and reviewed

**What the score penalizes:**
- Missing TEST-SCENARIOS.md (−2)
- Dev server down → no live verification (−2)
- 47% of tasks unchecked, including business rules (−1)
- Key workflow enforcements (approval gate, CO tier lock) not implemented (−1)

A score ≥ 8 requires live verification + test scenarios + all acceptance criteria checked.

---

## Summary

**Verdict:** ❌ **FAIL — Not ready for merge / production.**

**To reach PASS, do the following in order:**
1. Run `/prp:prp-test-scenarios prime-contracts` to generate TEST-SCENARIOS.md.
2. Start the dev server (`npm run dev:frontend`).
3. Complete the 18 unchecked TASKS.md items, prioritizing: approval gate enforcement, CO tier lock, Emails tab, Change History tab, `allowed_user_ids` write path, `erp_status` header display, `prime_contract_line_items` schema verification.
4. Re-run this validation gate end-to-end so Phases 3, 4, and 5 can actually execute.
5. Add a regression test in `scripts/api-smoke-contracts.mjs` (or Playwright) for each business rule (approval gate, CO lock) per CLAUDE.md Rule #15.

**Files touched / reviewed during validation:**
- `/Users/meganharrison/Documents/github/alleato-pm/PRPs/prime-contracts/TASKS.md`
- `/Users/meganharrison/Documents/github/alleato-pm/PRPs/prime-contracts/AUDIT.md`
- `/Users/meganharrison/Documents/github/alleato-pm/.claude/procore-manifests/prime-contracts/manifest.json`
- `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/features/prime-contracts/prime-contracts-table-config.tsx`
- `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/lib/validation/prime-contracts.ts`
- `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/types/prime-contracts.ts`
