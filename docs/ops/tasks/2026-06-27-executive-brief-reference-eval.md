# Task: Executive Brief Reference Eval

Status: Complete
Owner: Codex
Created: 2026-06-27
Linear Issue: AAI-740 - https://linear.app/megankharrison/issue/AAI-740/rebuild-executive-daily-brief-as-ai-chief-of-staff-operating-brief

## Objective

Add a durable evaluation guardrail that scores the Executive Daily Brief against
the user-provided June 25/26 reference brief quality bar: multi-project coverage,
cross-meeting synthesis, business-health framing, strategic risks, leadership
watchlist, actionability, and duplicate-topic suppression.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Implementation Checklist

- [x] Define an executable reference-quality rubric for executive brief packets.
- [x] Add regression coverage showing the prior Goodwill / duplicate-$422K style
      packet fails the rubric.
- [x] Add regression coverage showing a June 25/26 reference-shaped operating
      brief passes the rubric.
- [x] Keep the eval packet-level and deterministic so it can run without live AI
      calls or database writes.

## Verification Checklist

- [x] Targeted unit tests pass.
- [x] Focused lint/static check passes.
- [x] Changed-file typecheck passes or failure is documented.
- [x] Evidence below is complete before final response.

## Evidence

| Check | Command / artifact | Result | Notes |
| --- | --- | --- | --- |
| Unit regressions | `cd frontend && npm run test:unit -- src/lib/executive/__tests__/executive-brief-reference-eval.test.ts --runInBand` | Pass | 3 tests pass. The prior Goodwill / duplicate-$422K thin packet fails the rubric; a June 25/26 reference-shaped operating brief passes. |
| Focused lint | `cd frontend && npx eslint src/lib/executive/executive-brief-reference-eval.ts src/lib/executive/__tests__/executive-brief-reference-eval.test.ts` | Pass | No errors. |
| Changed type debt | `cd frontend && npm run typecheck:changed` | Pass | No new `any` usage detected. |

## Files To Change

- `frontend/src/lib/executive/executive-brief-reference-eval.ts`
- `frontend/src/lib/executive/__tests__/executive-brief-reference-eval.test.ts`
- `docs/ops/tasks/2026-06-27-executive-brief-reference-eval.md`

## Risks / Gaps

- A rubric is a guardrail, not a substitute for reading the final brief; it must
  detect structural collapse without overfitting to exact June 25/26 wording.
- Live visual verification remains auth-gated in this Codex session unless a
  valid browser session is available.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
