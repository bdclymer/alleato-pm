# Task: Drawings Procore Parity Audit

Status: Complete
Owner: Codex
Created: 2026-06-23
Linear Issue: Not created - audit/report only, no coding
Related Handoff: N/A

## Objective

Verify whether the requested Procore Drawings requirements are implemented in
the current Alleato PM codebase and report concrete gaps with source evidence.

## Non-Negotiable Done Rule

This task is not done until every audit checklist item below is checked, with
evidence filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [x] Existing architecture and prior related implementations reviewed.
- [x] Existing shared primitives/services/helpers identified.
- [x] Source-of-truth owner chosen for Drawings workflow/data.
- [x] Deprecated or bypassed paths identified.
- [x] Acceptance criteria mapped to observable implementation evidence.
- [x] Failure-loudly behavior assessed.

## Audit Checklist

- [x] Procore official tutorial behavior sampled from support docs.
- [x] Planning artifacts and prior reports reviewed.
- [x] Database schema and migrations inventoried.
- [x] Frontend routes, components, hooks, services, and API routes inventoried.
- [x] Each requested phase/task classified as implemented, partial, or gap.
- [x] Report includes evidence paths and recommended next steps.

## Verification Checklist

- [x] Static/type/lint check not required because no code implementation changes.
- [x] Targeted automated test discovery performed.
- [x] Browser/user-flow verification deferred unless implementation evidence is ambiguous.
- [x] Database/provider read-back not required because no schema changes are being made.
- [x] End-to-end workflow proof assessed from existing tests and code paths.
- [x] Evidence artifacts recorded below.

## Evidence

| Check | Command / artifact | Result | Notes |
| ----- | ------------------ | ------ | ----- |
| Procore docs | Official support pages under `v2.support.procore.com/product-manuals/drawings-project/tutorials` | Complete | Upload/publish/log/view/edit/download sampled |
| RAG preflight | `node scripts/procore-docs-query.js "procore drawings statuses upload publish revisions markups"` | Failed | AI Gateway returned 401; official web docs used instead |
| Repo inventory | `find frontend/src/app -path '*drawings*'`, `find frontend/src/components ...`, `rg` schema/migration reads | Complete | Drawings surface cataloged |
| Targeted tests | `find frontend/tests frontend/src ... drawing...` and test file reads | Complete | Existing tests are smoke/partial only |

## Files Changed

- `docs/ops/tasks/2026-06-23-drawings-procore-parity-audit.md` - audit ledger and evidence.

## Risks / Gaps

- No code changes were made beyond this required audit ledger.
- Existing tests do not prove OCR/review queue/revision auto-detection/markup persistence/report exports.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
