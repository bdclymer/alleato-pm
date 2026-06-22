# Handoff: 2026-04-29 — Curated Help Center UI

## Intake Block

1) Session ID: S23
2) Task ID: AAI-205
3) Linear issue: AAI-205
4) Linear URL: https://linear.app/megankharrison/issue/AAI-205/replace-uncontrolled-docs-browsing-with-curated-help-center-experience
5) Current status: Implemented, pending review
6) Files changed (absolute paths):
- /Users/meganharrison/Documents/alleato-pm/frontend/src/app/(admin)/docs/[[...slug]]/page.tsx
- /Users/meganharrison/Documents/alleato-pm/frontend/src/app/(admin)/docs/layout.tsx
- /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/help-articles.ts
7) Commands run and outcome (pass/fail counts):
- PASS: `npm run docs:validate-help`
- PASS: `cd frontend && npm run typecheck`
- PASS: `agent-browser --state frontend/tests/.auth/user.json open http://localhost:3000/docs` after refreshing expired auth through the login form
- PASS: `agent-browser click @e26` to open `/docs/ask-the-ai-assistant`
8) Evidence artifacts (screenshot/video/report/log paths):
- /Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/2026-04-29-help-center/index.png
- /Users/meganharrison/Documents/alleato-pm/tests/agent-browser-runs/2026-04-29-help-center/article.png
9) Top 3 findings (frontend-visible issues first):
- `/docs` now renders curated Help Center content from `docs/help/articles`, not broad repo docs.
- `/docs/ask-the-ai-assistant` renders the published help article and hides the pre-commit override marker from the page.
- The old Procore docs chat widget was removed from the general Help Center layout to avoid mixing Procore-support chat with Alleato app-help docs.
10) Recommended next action (one line): Start AAI-206 to author the create-user, update-profile, and manage-permissions tutorials against verified UI routes.
11) Handoff file path: docs/ops/handoffs/2026-04-29-S23-help-center-ui.md
12) Migration ledger evidence: N/A — no database migration in this slice.

## Linear Updates

- Kickoff comment: AAI-205 moved to In Progress with kickoff context in issue description.
- Milestone comments: Pending.
- Completion/blocker comment: Pending.

## Current Status

AAI-205 is implemented:

- The docs route no longer walks the broad `docs/` folder.
- Root `/docs` shows a controlled Help Center home with search, category filters, and featured guide listing.
- Direct article routes only resolve validated, published, client-visible help articles.
- Unknown or non-visible slugs call `notFound()`.
- The page uses open page layout, dividers, and restrained controls instead of a card-heavy docs browser.

## Exact Next Step

Author and verify the first three operational tutorials for AAI-206.

## Known Pitfalls

- The current first article is intentionally minimal. The product value appears once the user/profile/permissions tutorials are authored.
- Help article visibility is registry-driven but not yet role-specific. AAI-209 owns deeper permission/audience rules.
- AI assistant retrieval is not wired yet. AAI-207 owns RAG/app-help integration.

## Resume Commands

```bash
npm run docs:validate-help
cd frontend && npm run typecheck
agent-browser open http://localhost:3000/docs
```

## Evidence

Browser evidence:

- `/docs` rendered "Alleato OS Help", "Start here", and the controlled "Ask the AI Assistant for Help" article.
- `/docs/ask-the-ai-assistant` rendered the article body without exposing `<!-- allow-outside-documentation -->`.
