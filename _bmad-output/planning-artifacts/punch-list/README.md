# Punch List — Planning Artifacts

**File Path:** `frontend/src/app/(main)/[projectId]/punch-list/`

**URL:** http://localhost:3000/767/punch-list

**Procore URL:** <https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/punchlist/list?p=1&s=&so%5Battribute%5D=number&so%5Bdirection%5D=desc>

This directory contains all planning, specification, and Procore crawl data used to implement the Alleato punch list feature.

## Files

| File | Purpose |
|------|---------|
| [prp-punch-list-fix.md](prp-punch-list-fix.md) | Product requirements plan — full feature spec aligned to Procore |
| [execution-plan-punch-list.md](execution-plan-punch-list.md) | Step-by-step dev instructions for the AI coding agent |
| [TASKS.md](TASKS.md) | Task checklist with completion status and session log |
| [crawl/](crawl/) | Procore Crawl Data |
| [Procore Manifest](../../../../.claude/procore-manifests/punch-list/manifest.json) | Field-level data captured from live Procore instance |
| [Testing Scenarios](../../../../docs/testing/punch-list-scenarios.md) | Manual test scenarios for punch list workflows |
| [Testing Matrix](../../../../docs/testing/punch-list-test-matrix.md) | Full test coverage matrix |

## Procore Crawl Data

50 pages captured from the live Procore punch list tool on 2026-01-12. See [crawl/](crawl/) for screenshots, DOM, metadata, and reports. Each page folder contains `screenshot.png`, `dom.html`, and `metadata.json`.

## Implementation Location

| Layer | File |
|-------|------|
| Main page | [frontend/src/app/(main)/[projectId]/punch-list/page.tsx](../../../../frontend/src/app/(main)/[projectId]/punch-list/page.tsx) |
| Tables page | [frontend/src/app/(tables)/punch-list/page.tsx](../../../../frontend/src/app/(tables)/punch-list/page.tsx) |
| API routes | [frontend/src/app/api/projects/[projectId]/punch-items/](../../../../frontend/src/app/api/projects/[projectId]/punch-items/) |
| Service | [frontend/src/services/PunchItemService.ts](../../../../frontend/src/services/PunchItemService.ts) |
| Hook | [frontend/src/hooks/use-punch-items.ts](../../../../frontend/src/hooks/use-punch-items.ts) |
| Database migration | [supabase/migrations/](../../../../supabase/migrations/) (`punch_items` table) |

## Re-running the Crawl

```bash
cd scripts/screenshot-capture
node scripts/crawl-punch-list-comprehensive.js
```
