# RAG Strategy Council: Pipeline Trust Dashboard

## Executive Decision

Build the first durable slice on the existing source-sync health surface. The
new operator view should be a source-by-stage matrix backed by real app and RAG
read-back, not a generic "AI is healthy" badge. Project Intelligence freshness
is a required downstream stage and must stay red/stale until current packets are
regenerated within threshold.

## Council Question

What is the lowest-risk strategy for making the RAG pipeline visibly trustworthy
every day without creating another disconnected monitor?

## Evidence Packet

- Existing task `docs/ops/tasks/2026-06-22-source-embedding-health-visibility.md`
  already proved source embedding coverage and identified stale Project
  Intelligence packets as the remaining downstream gap.
- Existing task `docs/ops/tasks/2026-06-22-rag-pipeline-project-intelligence-audit.md`
  mapped the native backend/RAG path and current verifier set.
- Existing route family: `frontend/src/app/(admin)/source-sync` and
  `frontend/src/app/api/admin/source-sync/status`.
- Existing backend health services include source sync and RAG source health
  paths under `backend/src/services/health`.

## Role Positions

### Repo Architect

Position: Reuse `/source-sync` and its status API.

Evidence: The route already owns source operational visibility. Adding a second
AI health dashboard would split operator attention.

Risk in other strategies: A separate monitor can go stale when scheduler/source
health logic changes.

Minimum viable next step: Add daily RAG lifecycle rows to the existing status
payload and UI.

Guardrail required: Verifier must fail if required sources or stages disappear.

Confidence: High.

### RAG Architect

Position: The status must separate vectorized/searchable, project assignment,
task extraction, and Project Intelligence freshness.

Evidence: Prior source embedding health was green while Project Intelligence
packets remained stale.

Risk in other strategies: A single coverage percentage will hide downstream
breakage.

Minimum viable next step: Source-stage matrix with counts and latest timestamps.

Guardrail required: Non-zero failure when packet freshness is outside threshold.

Confidence: High.

### AI SDK And Provider Specialist

Position: No AI SDK changes are needed for this slice unless notification copy is
AI-generated, which it should not be.

Evidence: The goal is operational visibility and alerting, not chat generation
or model/tool behavior.

Risk in other strategies: Pulling models into alerting adds cost and another
provider failure mode.

Minimum viable next step: Deterministic health summaries and notifications.

Guardrail required: Provider health stays a separate verifier.

Confidence: Medium.

### Failure-Mode Reviewer

Position: The dashboard must show the exact failed stage and notification state.

Evidence: The recurring failure pattern is silent fallback or confusing green
status from partial pipeline success.

Risk in other strategies: Operators trust a green page while tasks or packets
are stale.

Minimum viable next step: Stage-level failures with owner hints and recent
failure rows.

Guardrail required: Tests check fail-loud status text and non-empty owner hints.

Confidence: High.

### Product Advisor

Position: The first screen should answer one decision: "Can I trust the
assistant's source answers today?"

Evidence: The user asked for a daily visual view and immediate notification
when errors occur.

Risk in other strategies: Too many cards, counts, or helper panels obscure the
trust decision.

Minimum viable next step: Four source rows by five stage columns, plus concise
alerts.

Guardrail required: UI noise gate: no nested cards, no top KPI row, no duplicate
CTAs.

Confidence: High.

## Disagreements And Resolution

- The only meaningful disagreement is whether notification delivery belongs in
  this first slice. Resolution: expose notification readiness/state now, wire to
  existing alert path if already available, and mark blocked with proof if a
  delivery credential/tool is missing.

## Consensus Implementation Sequence

1. Extend the canonical source-sync status payload with daily lifecycle matrix
   data.
2. Render the matrix and alert list in the existing `/source-sync` admin page.
3. Add or update a narrow verifier so missing required sources/stages fail
   loudly.
4. Verify the UI with agent-browser evidence.
5. Separately repair stale Project Intelligence compiler/payload generation if
   the matrix proves it is still red.

## Verification Gates

- `npm run rag:verify:source-lifecycle -- --days 1 --require-lifecycle-rows false`
- Targeted route/component syntax or lint for changed frontend files.
- Browser proof on `/source-sync`.

## Fail-Loud And Recurrence Guardrails

- Missing source rows, missing embeddings, missing project assignment, missing
  task extraction, stale packets, and notification delivery failure must be
  different states.
- No source can appear healthy because another stage passed.
- Project Intelligence stale state remains a failing downstream stage.

## Open Questions

- Which notification channel is already configured for immediate alerts: Teams,
  email, in-app notification, Sentry, or source health alert rows?
- Whether stale Project Intelligence packets are caused by scheduler drain,
  compiler job failures, or no eligible source-linked evidence.

## Recommended Next Step

Patch the existing source-sync status/UI first, then use the resulting matrix to
repair the exact failing Project Intelligence or notification path.
