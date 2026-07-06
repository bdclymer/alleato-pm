# Issue #539 Verification

**Route:** `http://127.0.0.1:3001/876/directory`
**Issue:** I should be able to sort these and roll it up by company.
**Result:** PASS
**Classification:** Verified fixed

## Summary

The exact `/876/directory` route loads successfully for the authenticated project and exposes the Subcontractors table controls. Sorting works: clicking the `Name` header reorders the rows alphabetically by contact name. The company roll-up also works: the `Group by` control changes the table from the flat 26-row contact list to a 20-row company list, collapsing contacts under each company row.

## What I Verified

- Default Subcontractors table renders on the exact route.
- `Name` sort changes the visible row order.
- `Group by` changes the table into a company roll-up.
- The grouped view reduces row count and shows one row per company.

## Evidence

- Default table render: `/Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-07-04-brandon-verify/batch-1/issue-539/screenshots/directory-default.png`
- Name sort result: `/Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-07-04-brandon-verify/batch-1/issue-539/screenshots/sort-name.png`
- Group-by click state: `/Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-07-04-brandon-verify/batch-1/issue-539/screenshots/group-by-clicked.png`
- Stable directory render: `/Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-07-04-brandon-verify/batch-1/issue-539/screenshots/directory-8s-stable.png`
- Video: `/Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-07-04-brandon-verify/batch-1/issue-539/videos/a380ade9d3615e21fd8b1f3b6de9c931.webm`

## Commands Used

- `./node_modules/.bin/next dev --port 3001`
- Browser verification scripts executed with Playwright + Chromium against `127.0.0.1:3001`, using the repo Supabase auth bootstrap pattern to mint a valid session cookie.

## Remaining

- No product gap remains for #539 on the current route.
- A dedicated Playwright regression for the `Name` sort and `Group by` company flow would reduce future drift.

## Recommended Next Step

- Add an automated browser test covering the Subcontractors table sort and company roll-up so this route stays fixed.
