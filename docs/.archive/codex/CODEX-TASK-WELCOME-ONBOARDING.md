# Codex Task: Welcome Onboarding Modal

## Metadata

- Feature: welcome-onboarding
- Priority: HIGH
- Estimated Complexity: SMALL
- Dependencies: none (independent UI task; can ship before AI/memory work)

## Inputs

- Spec: `docs/onboarding/WELCOME_ONBOARDING_SPEC.md`
- Reference component: `docs/onboarding/WelcomeOnboarding.reference.tsx`
- Existing onboarding component to evolve: `frontend/src/components/onboarding/AlleatoAiOnboarding.tsx`
- Existing personalization config: `frontend/src/config/aiPersonalization.ts`
- Existing onboarding builder: `frontend/src/lib/alleato-ai-onboarding.ts`
- Design tokens: `docs/design/` and `frontend/src/lib/design-tokens.ts`

## Success Criteria

- [ ] 4-step modal renders matching the spec exactly (Foundation, Wow, Widget Showcase, Mission)
- [ ] Step 1 copy matches the spec verbatim, including the two-column "What we'll do / What we ask" block
- [ ] Step 2 pulls 3 insights from the RAG endpoint per logged-in user, with Tampa-restaurant fallback when no attended meetings exist
- [ ] Step 3 shows a working preview of the dual-tab Ask Alleato widget (tabs are clickable in-modal)
- [ ] Step 4 has a single primary CTA — `Create your first test project` — that closes the modal and routes into the project creation flow
- [ ] Modal self-gates via `localStorage` key `alleato_onboarding_completed_v3`
- [ ] `?onboarding=1` query param force-opens for demos
- [ ] Skip button persists completion (no half-finished tours)
- [ ] Existing `AlleatoAiOnboarding.tsx` chat-style component is replaced or repurposed — no two onboarding flows running at once
- [ ] Step 2's insights endpoint caches results for 24h (Supabase or KV)
- [ ] All copy is sentence-case, no exclamation points except inside the AI's own messages
- [ ] Mobile renders cleanly (single-column layout for the two-column block on screens <640px)
- [ ] Storybook story added for each step
- [ ] E2E test covers: modal opens for new user, advances through 4 steps, persists completion, skip path
- [ ] Quality gate passes (0 errors)
- [ ] GATES.md shows all PASSED with checksums

## Workflow

1. PATTERNS: Read `.agents/patterns/index.json` and apply relevant patterns. Specifically check for existing modal/dialog patterns and the project's animation conventions.
2. RESEARCH: Read the spec and reference component fully. Audit current `AlleatoAiOnboarding.tsx` to understand what to reuse vs. replace. Confirm with the existing personalization profile system whether to extend it or treat the new modal as a layer on top.
3. PLAN: Create `docs/onboarding/TASKS.md` listing every file to create, modify, and delete.
4. IMPLEMENT: Build the modal in `frontend/src/components/onboarding/WelcomeOnboarding.tsx`. Wire it into the authenticated app shell (likely `frontend/src/app/(authenticated)/layout.tsx` or equivalent — verify path).
5. INSIGHTS PIPELINE: Implement `lib/ai/onboarding-insights.ts` that:
   - Pulls last 14 attended meetings for the user from Supabase
   - Calls the RAG endpoint with a structured-output schema returning `{ insights: [{ kind, text, meta }] }`
   - Caches per-user in Supabase or KV for 24h
   - Falls back to seeded Tampa-restaurant insights if user has zero attended meetings
6. STATS PIPELINE: Implement `lib/feedback/momentum-stats.ts` that returns `{ fixesShipped, activeTesters, launchesThisWeek }` from the existing feedback table.
7. DEPRECATE OLD ONBOARDING: Remove or archive the chat-style `AlleatoAiOnboarding.tsx`. Migrate any still-relevant logic. Two onboarding flows running simultaneously is unacceptable.
8. TEST: Storybook stories for all 4 steps. Playwright E2E covering the full path.
9. VERIFY: Run `npx tsx .agents/tools/enforce-gates.ts welcome-onboarding`.
10. PR: Create PR with screenshots of each step plus a short Loom demo.

## Constraints (MANDATORY)

- Must read `.agents/patterns/` before starting any phase
- Must use auth fixture (`import { test } from '../fixtures'`) for all E2E tests
- Must use `waitForLoadState('domcontentloaded')` NOT `networkidle`
- Must NOT replicate copy in code that exists in `WELCOME_ONBOARDING_SPEC.md` — extract a `lib/onboarding/copy.ts` module that's the single source of truth, imported by the component AND by the spec doc as a reference
- Must NOT remove the existing personalization profile system — `aiPersonalization.ts` and `alleato-ai-onboarding.ts` may still inform Step 2 personalization
- Must NOT replace `AdminFeedbackWidget.tsx` in this task — that's `CODEX-TASK-ASK-ALLEATO-WIDGET.md`'s scope. The Step 3 widget preview is a static visual demo, not the live widget
- Must NOT claim complete without GATES.md checksums

## Gates (Auto-enforced)

| Gate | Command | Must Pass |
|---|---|---|
| Patterns | Read `.agents/patterns/index.json` | Applied |
| TypeScript | `npm run typecheck --prefix frontend` | 0 errors |
| ESLint | `npm run lint --prefix frontend` | 0 errors |
| Tests | `npx playwright test tests/e2e/welcome-onboarding*.spec.ts` | 100% |
| Storybook | `npm run build-storybook --prefix frontend` | Builds clean |
| Gates | `npx tsx .agents/tools/enforce-gates.ts welcome-onboarding` | All PASSED |

## Deliverables

### Frontend

- [ ] `frontend/src/components/onboarding/WelcomeOnboarding.tsx`
- [ ] `frontend/src/components/onboarding/steps/FoundationStep.tsx`
- [ ] `frontend/src/components/onboarding/steps/WowStep.tsx`
- [ ] `frontend/src/components/onboarding/steps/WidgetShowcaseStep.tsx`
- [ ] `frontend/src/components/onboarding/steps/MissionStep.tsx`
- [ ] `frontend/src/lib/onboarding/copy.ts` — single source of truth for all step copy
- [ ] `frontend/src/lib/ai/onboarding-insights.ts`
- [ ] `frontend/src/lib/feedback/momentum-stats.ts`
- [ ] Mounted in authenticated app shell

### Removed/Archived

- [ ] `frontend/src/components/onboarding/AlleatoAiOnboarding.tsx` removed or archived
- [ ] Migration note in handoff explaining what changed

### Tests

- [ ] `frontend/tests/e2e/welcome-onboarding.spec.ts` — full flow + skip + force-open
- [ ] Storybook stories for each step

### Documentation

- [ ] `docs/onboarding/TASKS.md`
- [ ] `docs/onboarding/PLANS.md`
- [ ] `docs/onboarding/GATES.md`

## Completion Evidence

```markdown
## Completion Report
- Feature: welcome-onboarding
- Date: [timestamp]
- PR: [link]

### Gates
| Gate | Status | Checksum | Timestamp |
|---|---|---|---|
| TypeScript | PASSED | [xxxx] | [timestamp] |
| ESLint | PASSED | [xxxx] | [timestamp] |
| E2E | PASSED | [xxxx] | [timestamp] |
| Storybook | PASSED | [xxxx] | [timestamp] |

### Screenshots
- Step 1 (Foundation): [link]
- Step 2 (Wow): [link]
- Step 3 (Widget): [link]
- Step 4 (Mission): [link]

### Loom
[link]
```
