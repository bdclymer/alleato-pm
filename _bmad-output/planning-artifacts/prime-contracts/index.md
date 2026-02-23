# Prime Contracts — PRP Index

**Status:** ~70% Complete | **Investigation Score:** 6/10 | **Last Updated:** 2026-02-23

---

## Start Here

| What you need | File |
|---------------|------|
| **Current task checklist (what's done / what's left)** | [`tasks-prime-contracts.md`](./tasks-prime-contracts.md) |
| **Bug list from live investigation** | [`.claude/investigations/prime-contracts/investigation-report.md`](../../../.claude/investigations/prime-contracts/investigation-report.md) |
| **Overall status summary** | [`status.md`](./status.md) |

---

## Planning Docs

| File | Purpose |
|------|---------|
| [`tasks-prime-contracts.md`](./tasks-prime-contracts.md) | Phase-by-phase task checklist with completion %. **The master to-do list.** |
| [`tasks.md`](./tasks.md) | Alternate/older task list — cross-reference if something seems missing |
| [`execution-plan.md`](./execution-plan.md) | Ordered implementation plan by phase |
| [`overview-plans.md`](./overview-plans.md) | High-level overview of all planned work |
| [`status.md`](./status.md) | Snapshot of phase completion percentages |

---

## Specs

| File | Purpose |
|------|---------|
| [`specs/schema-prime-contracts.md`](./specs/schema-prime-contracts.md) | Database schema — tables, columns, FK relationships |
| [`specs/api-prime-contracts.md`](./specs/api-prime-contracts.md) | API endpoint specs — request/response shapes |
| [`specs/forms-prime-contracts.md`](./specs/forms-prime-contracts.md) | Form field specs — validation rules, field types |
| [`specs/ui-prime-contracts.md`](./specs/ui-prime-contracts.md) | UI layout and component specs |
| [`plans-prime-contracts.md`](./plans-prime-contracts.md) | Combined planning doc |

---

## Research / Reference

| File | Purpose |
|------|---------|
| [`summary.md`](./summary.md) | Procore crawl summary — what Procore's UI actually does |
| [`prime-contracts-page.md`](./prime-contracts-page.md) | Procore page-by-page reference |
| [`crawl/sitemap-prime-contracts.md`](./crawl/sitemap-prime-contracts.md) | All Procore prime contracts URLs crawled |
| [`research/comparison-report-corrected/`](./research/comparison-report-corrected/) | Gap analysis — Procore vs our implementation (corrected version) |
| [`research/comparison-report/`](./research/comparison-report/) | Gap analysis — original version |
| [`research/comparison-summary/`](./research/comparison-summary/) | Summary of the comparison |
| [`research/patterns-pitfalls.md`](./research/patterns-pitfalls.md) | Known gotchas and patterns from research |

---

## Investigation (Bug Reports)

| File | Purpose |
|------|---------|
| [`.claude/investigations/prime-contracts/investigation-report.md`](../../../.claude/investigations/prime-contracts/investigation-report.md) | Prioritized bug list from live browser test (Feb 23) |
| [`.claude/investigations/prime-contracts/code-audit.md`](../../../.claude/investigations/prime-contracts/code-audit.md) | Code-level audit findings |
| [`.claude/investigations/prime-contracts/live-test.md`](../../../.claude/investigations/prime-contracts/live-test.md) | Browser test evidence |
| [`.claude/investigations/prime-contracts/procore-reference.md`](../../../.claude/investigations/prime-contracts/procore-reference.md) | Procore screenshots reference |

---

## Critical Issues (Fix These First)

| Priority | Issue | File | Fix |
|----------|-------|------|-----|
| 🔴 Critical | Permission check disabled — anyone can edit any contract | `api/projects/[projectId]/contracts/route.ts:152` | Uncomment 4 lines |
| 🔴 Critical | Status enum mismatch in types file | `types/prime-contracts.ts` | Run `db:types`, fix enum |
| 🟠 High | `vendor_id` → `client_id` (wrong entity — prime contracts are with clients) | DB + API + UI | Schema migration |
| 🟠 High | Payment terms + billing schedule hardcoded null | `prime-contracts/new/page.tsx` | Add form fields |
| 🟠 High | No React Query hook — raw fetch() everywhere | Missing `hooks/use-prime-contracts.ts` | Create hook |

---

## What's Left (Quick View)

- **Phase 4 Components (63% remaining):** Actions toolbar, advanced filters, line items sub-page, change orders UI, billing/payments UI
- **Phase 5 Data Model (not started):** `vendor_id→client_id`, 7 financial calc columns, `executed_at`, DB views
- **Phase 6 Tests (0%):** All E2E tests
