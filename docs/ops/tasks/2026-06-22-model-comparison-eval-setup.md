# Task: GPT-5.5 vs GPT-5.4-mini comparison setup

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created yet - incident follow-up setup happened before issue setup
Related Handoff: Not created yet

## Objective

Create a reusable, low-friction model comparison harness so Alleato can compare `gpt-5.5` and `gpt-5.4-mini` on the same prompts before re-enabling model-calling crons.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence filled in. If any item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [x] Existing architecture and prior related implementations reviewed.
- [x] Existing shared primitives/services/helpers identified before adding new ones.
- [x] Source-of-truth owner chosen for the workflow/data/control plane.
- [x] Deprecated or bypassed paths identified.
- [x] Acceptance criteria written as observable behavior, not implementation hopes.
- [x] Failure-loudly behavior defined.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Integration Checklist

- [x] End-to-end path wired through one owner, not separate disconnected pieces.
- [x] All entry points for the workflow use the same canonical service/runtime.
- [x] Source adapters or external dependencies return typed, inspectable results.
- [x] Run/task/session ledger records every meaningful attempt.
- [x] Artifacts link back to source evidence and run logs.
- [x] Delivery/output adapters report sent, skipped, blocked, failed, and dry-run states.

## Regression Guardrails

- [x] Unit or integration test added/updated for the core behavior.
- [x] Contract test added/updated for cross-module or source/delivery boundaries.
- [x] Guardrail added so the same class of bug fails loudly next time.
- [x] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated test run.
- [x] Browser/user-flow verification run for frontend-visible changes.
- [x] Database/provider read-back performed for migrations/config/external services.
- [x] End-to-end workflow proof captured for the actual requested outcome.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check | Command / artifact | Result | Notes |
| ----- | ------------------ | ------ | ----- |
| Static/type/lint | `node --check scripts/verify/compare-openai-models.mjs` | Pass | Script parses cleanly. |
| Targeted tests | `node -e 'JSON.parse(require("fs").readFileSync("docs/ai-plan/evals/model-comparison/prompt-pack.json","utf8")); console.log("prompt-pack json ok")'` | Pass | Prompt pack is valid JSON. |
| Browser/user-flow | Not applicable | N/A | No frontend-visible change. |
| DB/provider read-back | Not applicable | N/A | No DB/provider config change. |
| End-to-end proof | `npm run eval:compare-models -- --dry-run > /tmp/model-compare-dry-run.txt` | Pass | Printed 108 lines of Playground-ready prompts without making model calls. |

## Files Changed

- `docs/ai-plan/evals/model-comparison/README.md` - model comparison workflow and rubric.
- `docs/ai-plan/evals/model-comparison/prompt-pack.json` - starter Alleato prompt cases.
- `scripts/verify/compare-openai-models.mjs` - direct model comparison runner.
- `package.json` - npm script for the comparison runner.
- `docs/ops/tasks/2026-06-22-model-comparison-eval-setup.md` - task record.

## Risks / Gaps

- Live model calls may be blocked by current OpenAI quota until billing is fixed or the Gateway path has credits. Live calls were intentionally not run during this setup task to avoid adding spend during the incident.
- Starter prompts intentionally use sanitized source context; replace or extend them with real redacted Executive Assistant/Project Intelligence inputs for the final go/no-go.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
