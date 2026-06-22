# Handoff: 2026-04-29 — AI App Help Retrieval

## Intake Block

1) Session ID: S23
2) Task ID: AAI-207
3) Linear issue: AAI-207
4) Linear URL: https://linear.app/megankharrison/issue/AAI-207/add-app-help-retrieval-source-for-the-ai-assistant
5) Current status: Implemented, pending review
6) Files changed (absolute paths):
- /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/help-articles.ts
- /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/tools/operational.ts
- /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/agents/strategist.ts
7) Commands run and outcome (pass/fail counts):
- PASS: `npx tsx -e "import { searchHelpArticles } from './frontend/src/lib/help-articles'; void (async () => { const results = await searchHelpArticles('how do I create a user', { aiVisibleOnly: true, limit: 3 }); console.log(JSON.stringify(results.map((r) => ({ title: r.article.frontmatter.title, href: r.article.href, score: r.score })), null, 2)); if (!results.some((r) => r.article.slug === 'create-or-invite-a-user')) process.exit(1); })();"`
- PASS: `npm run docs:validate-help`
- PASS: `cd frontend && npm run typecheck`
8) Evidence artifacts (screenshot/video/report/log paths):
- Search smoke output returned `/docs/create-or-invite-a-user` as the top result for "how do I create a user".
- Existing rendered route evidence remains in /Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/2026-04-29-help-center/
9) Top 3 findings (frontend-visible issues first):
- AI app-help retrieval now uses the same `docs/help/articles` registry as the curated `/docs` UI.
- The new `searchAppHelp` tool returns only published `ai_visible: true` help articles.
- The strategist prompt now instructs the AI assistant to call `searchAppHelp` first for app workflow, setup, location, and how-to questions.
10) Recommended next action (one line): Start AAI-208 to add authoring/review workflow controls for docs before scaling article volume.
11) Handoff file path: docs/ops/handoffs/2026-04-29-S23-ai-app-help-retrieval.md
12) Migration ledger evidence: N/A — no database migration in this slice.

## Linear Updates

- Kickoff comment: AAI-207 moved to In Progress with scope captured in the issue description.
- Milestone comments: Pending because the Linear comment helper was unavailable in this session.
- Completion/blocker comment: Pending because the Linear comment helper was unavailable in this session.

## Current Status

AAI-207 is implemented:

- Added `searchHelpArticles()` to the help article registry with weighted scoring across title, description, tags, routes, actions, and article body.
- Added `searchAppHelp` to the AI assistant operational tool set.
- Updated the strategist system prompt so app-help questions use controlled docs first.
- Verified the query "how do I create a user" ranks `Create or Invite a User` first.

## Exact Next Step

Build the documentation authoring/review workflow so new articles can move through draft, published, client-visible, and AI-visible states without editing page code.

## Known Pitfalls

- Retrieval is keyword-weighted, not vectorized yet. That is acceptable for the first controlled help layer but should become embeddings-backed when article count grows.
- The assistant can retrieve app-help articles, but it cannot yet execute user-management/profile/permission actions for the user. That belongs in later action-tool subtasks.
- `docs/ops/orchestration/session-board.md` and `docs/ops/orchestration/review-queue.md` already contain conflict markers, so this handoff was created without editing those ledgers.

## Resume Commands

```bash
npm run docs:validate-help
cd frontend && npm run typecheck
```

## Evidence

Search smoke output:

```json
[
  {
    "title": "Create or Invite a User",
    "href": "/docs/create-or-invite-a-user",
    "score": 39
  },
  {
    "title": "Ask the AI Assistant for Help",
    "href": "/docs/ask-the-ai-assistant",
    "score": 15
  },
  {
    "title": "Update Your Profile",
    "href": "/docs/update-your-profile",
    "score": 8
  }
]
```
