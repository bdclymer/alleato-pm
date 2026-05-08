# Handoff: 2026-04-29 — Help Article Action Mapping

## Intake Block

1) Session ID: S23
2) Task ID: AAI-208
3) Linear issue: AAI-208
4) Linear URL: https://linear.app/megankharrison/issue/AAI-208/map-help-articles-to-future-ai-actions-with-previewconfirm-safety
5) Current status: Implemented, pending review
6) Files changed (absolute paths):
- /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/help-actions.ts
- /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/help-articles.ts
- /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/tools/operational.ts
- /Users/meganharrison/Documents/alleato-pm/frontend/src/app/(admin)/docs/[[...slug]]/page.tsx
- /Users/meganharrison/Documents/alleato-pm/docs/help/README.md
7) Commands run and outcome (pass/fail counts):
- PASS: `npm run docs:validate-help`
- PASS: `npx tsx -e "import { searchHelpArticles } from './frontend/src/lib/help-articles'; import { getHelpActionsForIds } from './frontend/src/lib/help-actions'; void (async () => { const results = await searchHelpArticles('manage permissions', { aiVisibleOnly: true, limit: 1 }); const actions = getHelpActionsForIds(results[0]?.article.frontmatter.related_actions ?? []); console.log(JSON.stringify({ title: results[0]?.article.frontmatter.title, actions: actions.map((a) => ({ id: a.id, status: a.status, safetyLevel: a.safetyLevel })) }, null, 2)); if (!actions.some((a) => a.id === 'assign_permissions' && a.safetyLevel === 'admin_confirm')) process.exit(1); })();"`
- PASS: `cd frontend && npm run typecheck`
- PASS: Playwright rendered `/docs/manage-permissions` and confirmed the `AI Action Readiness` section contains `Assign permissions`, `Update permission template`, `Admin confirm`, and `Planned`.
8) Evidence artifacts (screenshot/video/report/log paths):
- /Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/2026-04-29-help-center/manage-permissions-action-readiness.png
9) Top 3 findings (frontend-visible issues first):
- Help articles now have explicit future-action mapping through a central registry.
- The Help Center article page shows AI action readiness for articles with mapped actions.
- The AI assistant `searchAppHelp` result now includes action capability status and safety level, so it can avoid implying planned actions are executable.
10) Recommended next action (one line): Start AAI-209 to enforce role/audience visibility before broader client access.
11) Handoff file path: docs/ops/handoffs/2026-04-29-S23-help-action-mapping.md
12) Migration ledger evidence: N/A — no database migration in this slice.

## Linear Updates

- Kickoff comment: AAI-208 moved to In Progress.
- Milestone comments: Pending because the Linear comment helper was unavailable in this session.
- Completion/blocker comment: Pending because the Linear comment helper was unavailable in this session.

## Current Status

AAI-208 is implemented:

- Added a `HELP_ACTIONS` registry with action ID, label, description, status, safety level, related routes, optional tool name, and unavailable reason.
- Added validation so article `related_actions` values must exist in the registry.
- Added action capabilities to AI app-help retrieval output.
- Added an `AI Action Readiness` section to article pages for mapped actions.

## Exact Next Step

Implement audience and role controls so docs can stay internal, client-facing, AI-visible, or hidden based on the current user's access.

## Known Pitfalls

- Current mapped actions are intentionally `planned`; the assistant should guide but not execute user, profile, or permission writes yet.
- The action registry is static TypeScript for now. If non-developers need to manage action readiness later, move the registry into a controlled admin table or CMS-backed config.
- `docs/ops/orchestration/session-board.md` and `docs/ops/orchestration/review-queue.md` already contain conflict markers, so this handoff was created without editing those ledgers.

## Resume Commands

```bash
npm run docs:validate-help
cd frontend && npm run typecheck
```

## Evidence

Action mapping smoke output:

```json
{
  "title": "Manage Permissions",
  "actions": [
    {
      "id": "assign_permissions",
      "status": "planned",
      "safetyLevel": "admin_confirm"
    },
    {
      "id": "update_permission_template",
      "status": "planned",
      "safetyLevel": "admin_confirm"
    }
  ]
}
```
