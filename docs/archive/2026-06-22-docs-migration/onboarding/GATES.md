# Welcome Onboarding Gates

| Gate | Status | Checksum | Timestamp | Notes |
|---|---|---|---|---|
| Patterns | PASSED | `8a8f6020bcc663ef6b2fcf2348971a1cbc409ff14de89411b78ded4fe4ab85b1` | 2026-04-27T15:36:44-0400 | Used `docs/patterns/index.json`; task doc path `.agents/patterns/index.json` is stale. |
| Spec | PASSED | `8798f2b444c6956efeb5d8167c7df463983e1e31a570e41a271cc3fbe4927b67` | 2026-04-27T15:36:44-0400 | `docs/onboarding/WELCOME_ONBOARDING_SPEC.md` reviewed and implemented against the live app shell. |
| Reference | PASSED | `814f81fc0e652513dd1cbe5c5f012ca254ab301a8e27bb8c31e84b3ab43f95dc` | 2026-04-27T15:36:44-0400 | `docs/onboarding/WelcomeOnboarding.reference.tsx` used as a read-only design/reference source; no import dependency added. |
| TypeScript | PASSED | n/a | 2026-04-27 | `cd frontend && npm run typecheck` passed. |
| ESLint | PASSED | n/a | 2026-04-27 | Targeted ESLint passed for onboarding, Ask Alleato, chat route, operational tools, and focused E2E specs with `--max-warnings=0`. |
| E2E | PASSED | n/a | 2026-04-27 | `cd frontend && npx playwright test tests/e2e/welcome-onboarding.spec.ts tests/e2e/ask-alleato-pill.spec.ts --config=config/playwright/s20.no-webserver.config.ts` passed 4/4. |
| Browser Evidence | PASSED | n/a | 2026-04-27 | Agent-browser artifacts captured in `frontend/tests/agent-browser-runs/2026-04-27-S20-welcome-onboarding-ai-foundations/`. |
| Storybook | PASSED | n/a | 2026-04-27 | `cd frontend && npm run build-storybook` passed in sub-agent verification. |
| Production Build | BLOCKED_UNRELATED | n/a | 2026-04-27 | `cd frontend && rm -rf .next && npm run build` compiles then fails during page data with `PageNotFoundError: Cannot find module for page: /_document`; treated as unrelated build infrastructure debt. |
