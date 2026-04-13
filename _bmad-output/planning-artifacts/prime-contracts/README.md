# Prime Contracts — Planning Artifacts

**File Path:** `frontend/src/app/(main)/[projectId]/prime-contracts/`

**Procore URL:** https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949955214786/tools/contracts/prime_contracts

This directory contains all planning, specification, and Procore crawl data used to implement the Alleato Prime Contracts feature.

## Files

| File | Purpose |
|------|---------|
| [plans-prime-contracts.md](plans-prime-contracts.md) | Product requirements plan — full feature spec aligned to Procore |
| [execution-plan.md](execution-plan.md) | Step-by-step dev instructions for the AI coding agent |
| [tasks-prime-contracts.md](tasks-prime-contracts.md) | Task checklist with completion status |
| [tasks.md](tasks.md) | Additional task tracking |
| [index.md](index.md) | Index / navigation for all artifacts |
| [summary.md](summary.md) | Implementation summary |
| [status.md](status.md) | Implementation status tracker |
| [overview-plans.md](overview-plans.md) | High-level overview and planning notes |
| [prime-contracts-page.md](prime-contracts-page.md) | Page-level design and layout spec |
| [crawl.md](crawl.md) | Procore crawl sitemap (70 pages captured) |
| [research/](research/) | Research notes: comparison reports, patterns, pitfalls |
| [specs/](specs/) | Specs: API, forms, schema, UI |
| [Procore Manifest](../../../../.claude/procore-manifests/prime-contracts/manifest.json) | Field-level data captured from live Procore instance |
| [Testing Scenarios](../../../../docs/testing/prime-contracts-scenarios.md) | Manual test scenarios |
| [Testing Matrix](../../../../docs/testing/prime-contracts-test-matrix.md) | Full test coverage matrix |

## Procore Crawl Data

70 pages captured from the live Procore Prime Contracts tool on 2025-12-27. See [crawl.md](crawl.md) for the full sitemap with screenshots, interactive elements, and dropdown counts per page.

## Research Notes

| File | Purpose |
|------|---------|
| [research/comparison-report.md](research/comparison-report.md) | Procore vs Alleato feature comparison |
| [research/comparison-report-corrected.md](research/comparison-report-corrected.md) | Corrected comparison report |
| [research/comparison-summary.md](research/comparison-summary.md) | Condensed comparison summary |
| [research/patterns-pitfalls.md](research/patterns-pitfalls.md) | Implementation patterns and known pitfalls |

## Specs

| File | Purpose |
|------|---------|
| [specs/api-prime-contracts.md](specs/api-prime-contracts.md) | API route design and endpoint spec |
| [specs/forms-prime-contracts.md](specs/forms-prime-contracts.md) | Form fields, validation, and behavior |
| [specs/schema-prime-contracts.md](specs/schema-prime-contracts.md) | Database schema and relationships |
| [specs/ui-prime-contracts.md](specs/ui-prime-contracts.md) | UI layout and component spec |

## Implementation Location

| Layer | File |
|-------|------|
| Main page (list) | [frontend/src/app/(main)/\[projectId\]/prime-contracts/page.tsx](../../../../frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx) |
| Detail page | [frontend/src/app/(main)/\[projectId\]/prime-contracts/\[contractId\]/page.tsx](../../../../frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx) |
| Change orders tab | [frontend/src/app/(main)/\[projectId\]/prime-contracts/\[contractId\]/change-orders/](../../../../frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/change-orders/) |
| Invoices tab | [frontend/src/app/(main)/\[projectId\]/prime-contracts/\[contractId\]/invoices/](../../../../frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/invoices/) |
| Configure tab | [frontend/src/app/(main)/\[projectId\]/prime-contracts/configure/](../../../../frontend/src/app/(main)/[projectId]/prime-contracts/configure/) |
| API — contracts | [frontend/src/app/api/projects/\[projectId\]/contracts/](../../../../frontend/src/app/api/projects/[projectId]/contracts/) |
| API — prime contract change orders | [frontend/src/app/api/projects/\[projectId\]/prime-contract-change-orders/](../../../../frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/) |
| API — prime contract PCOs | [frontend/src/app/api/projects/\[projectId\]/prime-contract-pcos/](../../../../frontend/src/app/api/projects/[projectId]/prime-contract-pcos/) |
| Hook | [frontend/src/hooks/use-prime-contracts.ts](../../../../frontend/src/hooks/use-prime-contracts.ts) |
