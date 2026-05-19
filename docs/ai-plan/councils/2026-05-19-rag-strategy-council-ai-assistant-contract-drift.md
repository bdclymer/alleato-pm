# RAG Strategy Council: AI assistant contract drift

Date: 2026-05-19
Status: Implemented first slice
Council question: Why do the strategic advisor and email operator evals fail even when answers sometimes sound good and expected retrieval tools appear to run?

## Executive Decision

Fix the observability and routing contract before changing retrieval architecture. The active chat path already has the right shape: intent planning, backend Deep Agents bridge, local retrieval fallback, and AI SDK synthesis. The failure layer is contract drift: persisted metadata did not consistently expose `backendDeepAgentExecutiveBriefing` and `response_quality`, while email evals proved structured Outlook routing without proving mailbox identity.

Do not rebuild RAG, swap providers, or tune prompts first. Those changes can improve prose while leaving the system unable to prove which backend path, mailbox, source freshness, or response-quality gate was actually used.

## Evidence Packet

| Evidence | Source | What it proves | Gap |
|---|---|---|---|
| Strategic advisor eval: 2/6 passed, judge passed 6/6 | `docs/ai-plan/evals/runs/2026-05-19T04-23-04-166Z-f130e740/summary.md` | Answer prose can pass while required tool/metadata contracts fail | Need rerun after deploy |
| Email operator eval: 3/9 passed | `docs/ai-plan/evals/runs/2026-05-19T04-23-08-875Z-6c38c20f/summary.md` | `getRecentEmails` fires, but mailbox/data usefulness is weak | Need mailbox preflight |
| Active handler omitted response quality on normal stream path | `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` | AI SDK does not emit app-specific `response_quality`; app must persist it | Fixed locally, needs prod deploy |
| Backend executive bridge uses FastAPI/Render packet path | `frontend/src/lib/ai/deep-agent-project-status.ts` | `backendDeepAgentExecutiveBriefing` is a frontend contract label, not an AI SDK tool | Eval should inspect canonical metadata |
| `getRecentEmails` defaults to signed-in user mailbox | `frontend/src/lib/ai/tools/operational.ts` | Brandon prompts can target `test1@mail.com` in eval auth unless mailbox is explicit | Needs guardrail |

## Role Positions

### Repo Architect

Position: Keep the current architecture and realign contracts.

Evidence: `handler-v2.ts` checks backend Deep Agents before local retrieval, but persisted backend traces used backend-internal names like `deepagents_runtime` rather than eval-facing `backendDeepAgentExecutiveBriefing`.

Risk in the other strategies: Rebuilding retrieval would not fix missing metadata or trace-name mismatch.

Minimum viable next step: Persist canonical bridge trace names and response quality in the active handler.

Guardrail required: Static verifier must inspect the active chat handler.

Confidence: High.

### RAG Architect

Position: Email routing is mostly correct; mailbox truth is the weak layer.

Evidence: `planRetrieval` routes recent inbox/date prompts to structured `getRecentEmails` before source-specific RAG.

Risk in the other strategies: More vector search can mask the fact that inbox questions need structured Outlook intake, not document chunks.

Minimum viable next step: Add mailbox identity preflight for Brandon/email evals.

Guardrail required: Eval fails when target mailbox, sync timestamp, and applied date window are absent.

Confidence: Medium-high.

### AI SDK And Provider Specialist

Position: `response_quality` is app metadata, not AI SDK metadata.

Evidence: Installed AI SDK docs require explicit message metadata; current route persists custom metadata itself.

Risk in the other strategies: Provider changes cannot produce missing app-specific observability fields.

Minimum viable next step: Compute response quality from final content and normalized tool trace at persistence.

Guardrail required: Every assistant persistence path carries `response_quality`.

Confidence: High.

### Failure-Mode Reviewer

Position: Judge quality is not enough because polished answers can be structurally unproven.

Evidence: The eval quality audit says current judge checks are not factual source gates.

Risk in the other strategies: Tool-name-only evals can pass without evidence counts, source IDs, errors, or mailbox freshness.

Minimum viable next step: Make metadata mandatory, then add golden source-fact evals.

Guardrail required: Required planned retrieval must persist success or failure evidence.

Confidence: High.

### Product Advisor

Position: Accept only behavior that proves the operator path is real and useful.

Evidence: Strategic cases require `backendDeepAgentExecutiveBriefing`; email cases require `getRecentEmails`, no stale RAG, and decision-ready output.

Risk in the other strategies: A good-sounding answer from the wrong mailbox or stale source is worse than an explicit blocked state.

Minimum viable next step: Pass hard routing and metadata gates before judging answer style.

Guardrail required: Brandon prompts must prove the mailbox target or fail loudly.

Confidence: High.

## Disagreements And Resolution

| Disagreement | Positions | Resolution method | Decision |
|---|---|---|---|
| Fix retrieval quality or metadata first | RAG Architect wants mailbox proof; Repo/SDK roles want contract repair | Compare eval failures and code path | Metadata/routing contract first, mailbox guardrail second |
| Treat backend Deep Agents as an AI SDK tool | Eval expects a tool name; SDK role says it is a bridge | Source inspection | Persist canonical bridge trace entry |
| Trust judge pass rate | Product Advisor wants quality pass; Failure Reviewer rejects judge-only | Eval audit | Judge is secondary to hard metadata/tool/source gates |

## Consensus Implementation Sequence

1. Restore canonical persisted observability: `backendDeepAgentExecutiveBriefing`, `response_quality`, normalized `toolName`, and backend bridge status.
2. Retarget stale static guardrails to `handler-v2.ts`.
3. Add mailbox identity and sync freshness assertions for Brandon/email operator evals.
4. Add golden source-fact evals for source row IDs, dates, names, and totals.
5. Only then tune prompts, retrieval ranking, or provider/model routing.

## Verification Gates

| Gate | Command or evidence | Required result | Owner layer |
|---|---|---|---|
| Typecheck active handler | `npm --prefix frontend run typecheck -- --pretty false` | No TypeScript errors from this slice | app/runtime |
| Static chat architecture | `npm run rag:verify:chat-architecture` | Active handler persists tool trace and response quality | observability |
| Executive routing eval | `npm run rag:verify:deep-agents-executive-evals` | Broad no-project prompts include canonical bridge trace | routing |
| Strategic quality eval | `npm run rag:verify:strategic-advisor-evals` | Hard contracts and judge pass | product |
| Email operator eval | `npm run rag:verify:email-operator-evals` | Structured Outlook plus mailbox proof | email/data |

## Fail-Loud And Recurrence Guardrails

- Cause: Active chat handler and eval expectations drifted apart.
- Detection gap: Evals could pass prose quality while missing required metadata or using ambiguous mailbox identity.
- Prevention step: Persist canonical bridge traces and response quality in the active handler, then retarget static verifiers.
- Fail-loud behavior: Missing required metadata, failed bridge status, stale sync, or mailbox mismatch should fail evals explicitly.

## Open Questions

- Does production currently have fresh `outlook_email_intake` rows for Brandon's mailbox?
- Is the eval auth user intentionally `test1@mail.com`, or should Brandon cases force `bclymer@alleatogroup.com`?
- Should backend bridge failures count as required-tool failures or as source-health failures with explicit blocked-state copy?

## Recommended Next Step

Run the narrow static and local checks for the metadata patch, then add the Brandon mailbox preflight before rerunning the two production bundles.
