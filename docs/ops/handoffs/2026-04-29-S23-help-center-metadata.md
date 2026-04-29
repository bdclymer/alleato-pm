# Handoff: 2026-04-29 — Help Center Metadata Foundation

## Intake Block

1) Session ID: S23
2) Task ID: AAI-204
3) Linear issue: AAI-204
4) Linear URL: https://linear.app/megankharrison/issue/AAI-204/define-help-article-metadata-schema-and-content-source-of-truth
5) Current status: Implemented, pending review
6) Files changed (absolute paths):
- /Users/meganharrison/Documents/alleato-pm/docs/help/README.md
- /Users/meganharrison/Documents/alleato-pm/docs/help/articles/ask-the-ai-assistant.md
- /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/help-articles.ts
- /Users/meganharrison/Documents/alleato-pm/scripts/docs/validate-help-articles.ts
- /Users/meganharrison/Documents/alleato-pm/package.json
7) Commands run and outcome (pass/fail counts):
- PASS: `npm run docs:validate-help`
- PASS: `node frontend/node_modules/typescript/bin/tsc --noEmit --moduleResolution node --module commonjs --target es2020 --esModuleInterop --skipLibCheck frontend/src/lib/help-articles.ts scripts/docs/validate-help-articles.ts`
- PASS: `cd frontend && npx tsx -e "import('./src/lib/help-articles.ts').then(async (m)=>{const mod=m.default??m; const articles=await mod.getHelpArticles({clientVisibleOnly:true}); console.log(articles.map((a)=>a.slug).join(','));})"`
8) Evidence artifacts (screenshot/video/report/log paths):
- Terminal output in current Codex thread confirms validator counts: 1 valid, 1 client-visible, 1 AI-visible, 1 featured client-visible.
9) Top 3 findings (frontend-visible issues first):
- `/docs` is still the old broad docs browser; AAI-205 owns replacing it with a curated Help Center UI.
- Help article source is now isolated to `docs/help/articles`, preventing onboarding/planning/database docs from becoming visible by accident.
- The orchestration session board currently contains pre-existing conflict markers; this handoff did not touch that file.
10) Recommended next action (one line): Start AAI-205 to wire the curated `/docs` UI to the validated help article registry.
11) Handoff file path: docs/ops/handoffs/2026-04-29-S23-help-center-metadata.md
12) Migration ledger evidence: N/A — no database migration in this slice.

## Linear Updates

- Kickoff comment: AAI-204 moved to In Progress with kickoff context in issue description.
- Milestone comments: Pending.
- Completion/blocker comment: Pending.

## Current Status

AAI-204 has the content source and validation foundation in place:

- `docs/help/articles` is the intentionally controlled source for app-help content.
- `frontend/src/lib/help-articles.ts` parses frontmatter, validates required fields, filters published/client-visible/AI-visible/featured articles, and resolves correctly from both repo root and `frontend/` cwd.
- `scripts/docs/validate-help-articles.ts` provides the loud guardrail.
- `npm run docs:validate-help` is wired at the root package level.
- One starter published article exists for asking the AI assistant for help.

## Exact Next Step

Update the `/docs` route to use `getHelpArticles({ clientVisibleOnly: true })` instead of browsing the broad repo `docs` tree.

## Known Pitfalls

- Do not point Help Center display back at broad `docs/`; that reintroduces uncontrolled exposure of planning/internal docs.
- Do not treat `company_knowledge` as the source for app-help articles; this slice intentionally keeps app-help separate from institutional memory.
- Keep `docs/help/articles` metadata validation in the path for future article additions.

## Resume Commands

```bash
npm run docs:validate-help
node frontend/node_modules/typescript/bin/tsc --noEmit --moduleResolution node --module commonjs --target es2020 --esModuleInterop --skipLibCheck frontend/src/lib/help-articles.ts scripts/docs/validate-help-articles.ts
```

## Evidence

Validator output:

```text
Help articles valid: 1
Client-visible articles: 1
AI-visible articles: 1
Featured client-visible articles: 1
```
