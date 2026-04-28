# Welcome Onboarding Tasks

## Done in S20

- Replaced the old `AlleatoAiOnboarding` implementation with `WelcomeOnboarding`.
- Added step components for Foundation, Wow, Widget Showcase, and Mission.
- Added `frontend/src/lib/onboarding/copy.ts` as the single source of truth for onboarding copy.
- Mounted the welcome modal in the existing `(main)` app overlay.
- Added `alleato_onboarding_completed_v3` gating, `?onboarding=1` force-open, skip persistence, and create-project routing.
- Added Storybook coverage for the modal and all four steps.
- Added Playwright coverage for force-open, step advance, skip persistence, and CTA routing.

## Remaining

- Replace fallback Step 2 insights with the real per-user attended-meeting structured-output RAG pipeline.
- Replace fallback momentum counters with production launch/tester metrics once those tables are confirmed.
- Add visual screenshots after browser verification.
