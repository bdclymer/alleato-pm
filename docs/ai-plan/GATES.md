# AI Plan Gates

| Gate | Status | Checksum | Timestamp | Notes |
|---|---|---|---|---|
| Patterns | PASSED | `8a8f6020bcc663ef6b2fcf2348971a1cbc409ff14de89411b78ded4fe4ab85b1` | 2026-04-27T15:36:44-0400 | Used live `docs/patterns/index.json`. |
| Knowledge Base Corpus | PASSED | `85e8ef90d67e4e63300ae28a665875a2228d8b05fbfaac958c7677e15baf06fe` | 2026-04-27T15:36:44-0400 | `docs/ai-plan/AI_KNOWLEDGE_BASE.md` reviewed; unresolved `[FILL]`/`[VERIFY]` markers are tracked by the marker gate. |
| Persona + Memory Plan | PASSED | `0374212f4007626aebebd2009da637a58feef336026e4096b4ff31c54809ed60` | 2026-04-27T15:36:44-0400 | `docs/ai-plan/AI_PERSONA_AND_MEMORY.md` mapped into existing AI prompt/memory surfaces without duplicating memory schema. |
| KB marker parser | PASSED_WITH_TRACKED_MARKERS | `c605f55bf28a6f14f3274ac5e6792336a9cee4d7b09532332caf37f96af8efc2` | 2026-04-27 | `npx tsx scripts/check-kb-markers.ts` passed with `KB chunks: 65` and `Unresolved markers: 14`; current branch allows tracked authoring markers. |
| TypeScript | PASSED | n/a | 2026-04-27 | `cd frontend && npm run typecheck` passed. |
| ESLint | PASSED | n/a | 2026-04-27 | Targeted ESLint passed for Ask Alleato, onboarding, AI chat route, operational tools, and focused E2E specs with `--max-warnings=0`. |
| Ask Alleato E2E | PASSED | n/a | 2026-04-27 | `cd frontend && npx playwright test tests/e2e/welcome-onboarding.spec.ts tests/e2e/ask-alleato-pill.spec.ts --config=config/playwright/s20.no-webserver.config.ts` passed 4/4. |
| Ask Alleato Browser AI | PASSED | n/a | 2026-04-27 | Floating widget opened, AI request submitted, and a visible fail-loud assistant fallback rendered in `08-ask-ai-response.png`. |
| Ask Alleato Feedback | PASSED | n/a | 2026-04-27 | Browser-submitted feedback was verified through `/api/admin/feedback`; marker `[S20 verification] Ask Alleato feedback submit smoke 2026-04-27T19:36Z` exists and created GitHub issue `#270`. |
| Production Build | BLOCKED_UNRELATED | n/a | 2026-04-27 | `cd frontend && rm -rf .next && npm run build` compiles then fails during page data with `PageNotFoundError: Cannot find module for page: /_document`; not introduced by this slice. |
