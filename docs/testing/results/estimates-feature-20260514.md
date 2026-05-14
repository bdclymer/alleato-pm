# Estimates Feature Test Results
**Date:** 2026-05-14
**Run ID:** b251d9c7-fe88-4968-a2bd-342b70f850b4
**Suite:** estimates feature (suite_id: 3988da5c-ab91-4942-a4bf-3d43963d8cb6)
**Environment:** localhost:3000 · Project 67 (Vermillion Rise Warehouse)
**Tester:** Claude Sonnet 4.6 (agent-browser v0.15.2)
**Artifacts:** `tests/agent-browser-runs/20260514-094819-feature-estimates/`

---

## Summary

| Metric | Count |
|--------|-------|
| Total cases | 32 |
| Passed | 29 |
| Failed | 2 |
| Skipped | 1 |

**Pass rate:** 90.6% (29/32 executed; 90.6% of all 32 cases)

---

## Pre-Run Bug Fixed

Before any tests could run, the `/67/estimates/new` page crashed with a Radix UI runtime error:

> `Error: A <Select.Item /> must have a value prop that is not an empty string`

**Root cause:** `EstimateType` `<SelectField>` had `{ value: "", label: "None" }` as the placeholder option.
**Fix:** Changed option value to `"none"` and updated `onValueChange` to map `"none" → null`.
**Commit:** `9454aa4ea` — pushed to `main`.

---

## Failures (2)

### FAIL — 2.2 Edit via row actions menu (HIGH severity)
**Expected:** Clicking Edit from row actions menu navigates to an edit form.
**Actual:** Route `/67/estimates/6/edit` returns 404. The edit page directory does not exist at `frontend/src/app/(main)/[projectId]/estimates/[estimateId]/edit/`.
**Impact:** No way to edit existing estimate metadata (title, number, revision, estimator, location, dates) through the UI.
**Fix needed:** Create the `/[estimateId]/edit/page.tsx` route.

### FAIL — 4.1 Status transitions (HIGH severity)
**Expected:** An estimate can move through all four statuses via the UI.
**Actual:** No UI path exists to change estimate status. The detail page shows status as read-only text in the description line. The only edit path is the missing edit form (2.2 above).
**Impact:** Status is permanently stuck at creation value unless changed via direct DB update.
**Fix needed:** Either add a status dropdown to the detail page sidebar, or create the edit form (which fixes 2.2 simultaneously).
**Note:** DB constraint correctly accepts all 4 values (`draft`, `pending_review`, `approved`, `rejected`); backend is fine.

---

## Skip (1)

### SKIP — 11.1 Rows-per-page selector
**Reason:** The UnifiedTablePage rows-per-page selector only renders when `totalPages > 1` (line 1853 in `unified-table-page.tsx`). With 3 test estimates and `perPage=25`, the pagination is single-page so the selector is hidden. This is intentional design, not a defect.

---

## Passed Cases (29)

| # | Test | Notes |
|---|------|-------|
| 1.1 | Create estimate with all fields | All fields saved; detail page redirected correctly. Pre-run Select.Item crash fixed first. |
| 1.2 | Title required validation | Empty title shows validation error, form does not submit. |
| 1.3 | Create minimal estimate (title only) | Title-only estimate created; defaults applied. |
| 2.1 | Settings auto-save | Duration changed → "saving…" indicator appeared → DB confirmed `project_duration_weeks=16`. |
| 3.1 | Delete shows confirmation dialog | Dialog appeared with estimate title before removal. |
| 3.2 | Delete removes from list | Estimate disappeared from list; DB `is_deleted=true` confirmed. |
| 3.3 | Cancel delete leaves unchanged | Cancel kept estimate in list and DB unchanged. |
| 4.2 | Status badge colors | Draft=muted, Pending Review=amber, Approved=emerald, Rejected=rose. All correct per `estimates-table-utils.ts`. |
| 5.1 | GC Qty change updates totals | PM Qty 14→20: GC total $198,344→$221,120, Grand Total updated. |
| 5.2 | GC Rate change recalculates line total | PM Rate 3796→4000: row total $75,920→$80,000, Grand Total updated. |
| 6.1 | Add item to QTO division | New editable row appeared with description/qty/rate/total fields. |
| 6.2 | Trash icon removes QTO row | Row disappeared from table immediately on click. |
| 6.3 | Expand All / Collapse All | All 22 divisions expanded then collapsed correctly. |
| 6.4 | Edit description saves on tab | Description changed to "E2E Test Item", DB confirmed. |
| 7.1 | Grand Total formula | `subtotal + contingency + (subtotal × insurance_rate) + ((subtotal+insurance) × fee_rate)` confirmed correct. |
| 7.2 | Division Summary matches QTO | Sidebar per-division totals matched QTO tab values. |
| 7.3 | Rate labels show actual % | "Insurance (1.25%)" and "Fee (10.0%)" displayed correctly. |
| 8.1 | Search filters by estimator | "Jane Doe" search showed only her estimate. |
| 8.2 | Status filter — Approved | Only 1 approved estimate shown after selecting Approved filter. |
| 8.3 | Title column sort | Rows sorted alphabetically ascending after clicking Title header. |
| 8.4 | Location column toggle | Location column shown/hidden correctly via Toggle columns menu. |
| 9.1 | Select all rows | Header checkbox selects all 3 rows. |
| 9.2 | Uncheck one row | Header checkbox becomes indeterminate (mixed) after unchecking 1 of 3. |
| 10.1 | List view card display | Each estimate shown as card with title · estimator · revision · date · status. |
| 12.1 | Back button navigation | Navigates from detail page back to `/67/estimates` list. |
| 12.2 | Non-existent estimate ID | `/67/estimates/99999` shows "Estimate not found." |
| 12.3 | Saving indicator | "saving…" label confirmed on sidebar during PUT (captured in 2.1 evidence). |
| 12.4 | No costs empty state | "No costs yet" shown in Division Summary for estimate with zero line items. |
| 12.5 | Alternates placeholder | "No alternates defined." shown on Alternates & Allowances tab when empty. |

---

## Recommended Actions

1. **Create `/[estimateId]/edit/page.tsx`** — fixes both 2.2 (Edit route 404) and 4.1 (no status change path). The new form already exists at `/new/page.tsx` and can be adapted with pre-fill from the existing estimate.
2. **Consider inline status select on detail page** — even without a full edit form, the status field is a natural candidate for inline editing in the detail page header or sidebar, similar to how the settings sidebar already auto-saves duration/rates.
