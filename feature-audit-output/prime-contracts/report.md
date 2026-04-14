# Prime Contracts Feature Audit

**Date:** 2026-04-14  
**Scope:** Prime Contracts list, detail, edit prefill, SOV rendering, change orders, attachments, and key detail-page interactions

## Verdict

**PARTIAL**

The core Prime Contracts experience works: list page loads, detail page loads, edit prefill is correct, SOV renders, and the main contract summary is coherent. I fixed one real user-facing defect during the audit, but there are still product gaps versus Procore that remain intentional/unfinished rather than broken.

## What I Verified

| Check | Result | Notes |
|---|---|---|
| Prime Contracts list loads | PASS | Table rendered with 3 items and expected visible columns. |
| Contract detail page loads | PASS | Contract summary, tabs, attachments, and SOV rendered. |
| Edit prefill | PASS | Owner, contractor, status, dates, retainage, description, inclusions, exclusions, and SOV values were prefilled correctly. |
| SOV rendering | PASS | Existing SOV line item loaded and total matched the line item value. |
| Attachments surface | PASS | No attachments state was shown correctly for the current contract. |
| Change Orders tab | PASS after fix | The tab now shows only actual contract change orders. |

## Issue Fixed During Audit

### Fixed: Change Orders tab was mixing PCCOs into the contract change order list

The detail page was merging `/contracts/[contractId]/change-orders` with `/prime-contract-change-orders`, which caused PCCO rows to appear in the Change Orders table while the dedicated Potential Change Orders section still reported zero items. That created contradictory state on the same page.

**Fix applied:** I scoped the Change Orders table to actual contract change orders only and left PCOs in the dedicated PCO section.

**Files changed:**
- `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx`

**Verification:** Reloaded the page and confirmed the Change Orders tab now shows 4 contract change orders, while the PCO section remains separate.

## Remaining Procore Gaps

| Gap | Verdict | Impact |
|---|---|---|
| Dedicated Schedule of Values tab | Gap | High |
| Related Items tab | Gap | High |
| Change History and Emails are placeholders | Gap | Medium |
| List view ERP status / attachment count parity | Gap | Low |
| Procore-style contract privacy / SOV visibility permissions | Gap | Medium |

## UX / Architecture Findings

### REC-001: Split the Prime Contract detail page

| Field | Value |
|---|---|
| **Category** | Architecture |
| **Impact** | High |
| **Effort** | M |
| **Priority** | Do first |

**Current state:** `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx` is 1033 lines long and owns data fetching, mutation handlers, tab wiring, dialogs, and summary state.

**Recommended:** Extract the fetching/mutation logic into section-specific hooks and keep the page component focused on composition.

**Why:** The current page size is already high-risk for regressions. Smaller ownership boundaries will reduce accidental coupling and make future fixes less expensive.

**How:** Split contract fetch, change-order fetch, attachment handling, invoice handling, and advanced settings into dedicated hooks or section controllers.

### REC-002: Break up the overview tab component

| Field | Value |
|---|---|
| **Category** | Architecture |
| **Impact** | High |
| **Effort** | L |
| **Priority** | Plan next |

**Current state:** `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/components/PrimeContractOverviewTab.tsx` is 854 lines long and combines summary, attachments, SOV, change order summary, and editing controls.

**Recommended:** Split the overview into discrete subcomponents for summary, attachments, SOV, and change-order totals.

**Why:** This is the main maintainability hotspot on the page. It is already large enough that small product changes can easily introduce unrelated regressions.

**How:** Keep the overview tab as a shell and move each section into its own component under the same folder.

### REC-003: Fail loudly on contract-detail fetch paths

| Field | Value |
|---|---|
| **Category** | Reliability |
| **Impact** | Medium |
| **Effort** | S |
| **Priority** | Quick win |

**Current state:** The main page now shows toasts for line-items, change orders, and attachments failures, but a few optional fetches still degrade to empty UI rather than a visible error.

**Recommended:** Standardize the contract-detail data fetch pattern so a failed fetch always surfaces a visible message.

**Why:** Quiet failures look like missing data and make operators trust the wrong screen state.

**How:** Centralize fetch error handling for detail sections and stop using silent fallbacks for user-visible contract data.

## Evidence

Screenshot:
- `/Users/meganharrison/Documents/github/alleato-pm/feature-audit-output/prime-contracts/screenshots/change-orders-tab.png`

## Bottom Line

Core Prime Contracts flows are working, and the most confusing change-order state issue was fixed during the audit. The remaining work is mostly product completeness and maintainability, not a broken core workflow.
