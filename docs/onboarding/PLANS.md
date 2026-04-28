# Welcome Onboarding Plan

The implementation uses the existing `(main)` overlay mount and replaces the old chat-style onboarding surface rather than running a second onboarding flow.

Key decisions:
- `frontend/src/lib/onboarding/copy.ts` owns copy and default fallback data.
- `WelcomeOnboarding` dispatches `alleato:onboarding-visibility` so the global Ask Alleato pill hides while the modal is open.
- Step 2 does not fake meeting reads. Until attended-meeting retrieval is implemented, it uses the documented Tampa fallback insights.
- Final CTA routes to `/create-project?testProject=1`; the create-project form consumes that query param and prechecks `test_project`.
