# Codex Task: Ask Alleato Widget (unify AI + Feedback)

## Metadata

- Feature: ask-alleato-widget
- Priority: HIGH
- Estimated Complexity: MEDIUM
- Dependencies: existing `AdminFeedbackWidget.tsx`, existing RAG chat at `frontend/src/components/ai-assistant/`

## Inputs

- Spec: `docs/onboarding/WELCOME_ONBOARDING_SPEC.md` (Step 3 section)
- Reference component: `docs/onboarding/WelcomeOnboarding.reference.tsx` (the `AskAlleatoPill` and tab components inside it)
- Existing feedback widget: `frontend/src/components/admin-feedback/AdminFeedbackWidget.tsx`
- Existing AI chat surface: `frontend/src/components/ai-assistant/rag-chat-page.tsx`
- Existing chat handler/API route: locate via `rg "rag-assistant-prompt" frontend/src` to find the live entry point

## Success Criteria

- [ ] A single floating pill in the bottom-right corner of every authenticated page, labeled "Ask Alleato" with a sparkle icon
- [ ] Clicking the pill opens a panel with two tabs: **Ask AI** (default) and **Send feedback**
- [ ] Ask AI tab streams a real response from the existing RAG chat backend (not a separate one) — reuse the existing chat hook/endpoint
- [ ] Send feedback tab uses the existing `AdminFeedbackWidget` submission API but with reduced tags: **Bug**, **Idea**, **Confused**
- [ ] Feedback textarea placeholder reads exactly: `"Bug, idea, or just confused — anything works"`
- [ ] After feedback submits, panel shows the success state and auto-closes after 1.6s
- [ ] `Cmd+I` / `Ctrl+I` global shortcut opens the panel (kept in code, not visually surfaced)
- [ ] Pill hides when the welcome onboarding modal is open (handled via prop or shared state)
- [ ] Pill is hidden on auth/login routes
- [ ] Existing `AdminFeedbackWidget` is consolidated into this widget — not running in parallel
- [ ] Existing standalone `rag-chat-page.tsx` continues to work as the dedicated /assistant page; this widget is a quick-access surface that uses the same backend
- [ ] All 3 feedback tags map cleanly to the existing feedback type column (`Issue`, `Wishlist`, `General thought`) — pick the mapping during implementation: Bug→Issue, Idea→Wishlist, Confused→General thought
- [ ] Storybook stories for all panel states (Ask AI empty, Ask AI streaming, Feedback empty, Feedback success)
- [ ] E2E test: pill is visible on dashboard, opening it opens the panel, submitting feedback lands in the feedback table, asking a question hits the chat endpoint
- [ ] Quality gate passes (0 errors)
- [ ] GATES.md shows all PASSED with checksums

## Workflow

1. PATTERNS: Read `.agents/patterns/index.json` and existing widget patterns. Specifically check the AdminFeedbackWidget for screenshot/snapshot/targeting helpers — those are valuable and should be preserved if relevant.
2. AUDIT: Read AdminFeedbackWidget end-to-end. Identify which capabilities (screenshot capture, target selection, snapshot helpers) are unique to admin feedback vs. universal feedback. Decide whether the unified widget should keep all of them or only the basic submission flow. Recommendation: keep all of them; the admin power tools enhance feedback quality without adding cognitive load to non-admins (the buttons appear conditionally).
3. AUDIT: Read the RAG chat backend to understand how to invoke a chat session from a non-page surface. Look for an existing hook (likely `useChat` or similar) — reuse, don't duplicate.
4. PLAN: Create `docs/ai-plan/ASK-ALLEATO-WIDGET-PLAN.md` documenting the consolidation plan.
5. IMPLEMENT:
   - Create `frontend/src/components/ask-alleato/AskAlleatoPill.tsx` (the floating button)
   - Create `frontend/src/components/ask-alleato/AskAlleatoPanel.tsx` (the tabbed dialog)
   - Create `frontend/src/components/ask-alleato/tabs/AskAITab.tsx` and `FeedbackTab.tsx`
   - Map the existing feedback type strings to the new 3-tag UI
   - Wire to the existing RAG chat hook
6. CONSOLIDATE: Replace AdminFeedbackWidget mounts in the app shell with the new AskAlleatoPill. Keep AdminFeedbackWidget code temporarily but unmount it. Schedule removal in a follow-up task once all admin-specific flows are confirmed migrated.
7. TEST: Storybook + Playwright E2E.
8. VERIFY: `npx tsx .agents/tools/enforce-gates.ts ask-alleato-widget`.
9. PR: Screenshots + Loom showing both tabs working end-to-end.

## Constraints (MANDATORY)

- Must NOT create a new chat backend — reuse the existing RAG endpoint and prompt assembly
- Must NOT duplicate the feedback submission API — reuse the existing endpoint
- Must NOT break existing admin-feedback-targeting behavior (DOM element selection for screenshot-attached feedback) — port it into the new widget if it exists today
- Must keep `Cmd+I` / `Ctrl+I` shortcut in code but NOT show it visually in the pill (not all testers are keyboard-shortcut users)
- Must auto-close the panel 1.6 seconds after successful feedback submission with the green checkmark state shown briefly
- Must NOT show the pill on auth routes (`/auth/*`, `/login`, `/signup`)

## Gates

| Gate | Command | Must Pass |
|---|---|---|
| Patterns | Read `.agents/patterns/index.json` | Applied |
| TypeScript | `npm run typecheck --prefix frontend` | 0 errors |
| ESLint | `npm run lint --prefix frontend` | 0 errors |
| Tests | `npx playwright test tests/e2e/ask-alleato*.spec.ts` | 100% |
| Storybook | `npm run build-storybook --prefix frontend` | Builds clean |
| Gates | `npx tsx .agents/tools/enforce-gates.ts ask-alleato-widget` | All PASSED |

## Deliverables

### Frontend

- [ ] `frontend/src/components/ask-alleato/AskAlleatoPill.tsx`
- [ ] `frontend/src/components/ask-alleato/AskAlleatoPanel.tsx`
- [ ] `frontend/src/components/ask-alleato/tabs/AskAITab.tsx`
- [ ] `frontend/src/components/ask-alleato/tabs/FeedbackTab.tsx`
- [ ] `frontend/src/lib/ask-alleato/feedback-tag-mapping.ts` — maps Bug/Idea/Confused → existing feedback types
- [ ] Mounted in authenticated app shell, unmounted on auth routes

### Tests

- [ ] `frontend/tests/e2e/ask-alleato-pill.spec.ts`
- [ ] `frontend/tests/e2e/ask-alleato-feedback.spec.ts`
- [ ] `frontend/tests/e2e/ask-alleato-chat.spec.ts`
- [ ] Storybook stories for all panel states

### Documentation

- [ ] `docs/ai-plan/ASK-ALLEATO-WIDGET-PLAN.md`
- [ ] `docs/ai-plan/TASKS.md` updated
- [ ] `docs/ai-plan/GATES.md`

## Completion Evidence

```markdown
## Completion Report
- Feature: ask-alleato-widget
- Date: [timestamp]
- PR: [link]

### Gates
| Gate | Status | Checksum | Timestamp |
|---|---|---|---|
| TypeScript | PASSED | [xxxx] | [timestamp] |
| ESLint | PASSED | [xxxx] | [timestamp] |
| E2E | PASSED | [xxxx] | [timestamp] |

### Screenshots
- Pill (collapsed): [link]
- Panel - Ask AI tab: [link]
- Panel - Feedback tab: [link]
- Panel - Feedback success: [link]

### Loom
[link]
```
