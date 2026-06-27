# AAI-749 Meeting Source Lookup Latency

Date: 2026-06-27
Linear: AAI-749

## Baseline Failure

Command:

```bash
AI_EVAL_BASE_URL=https://projects.alleatogroup.com \
AI_EVAL_CASE_TIMEOUT_MS=180000 \
AI_EVAL_JUDGE_ENABLED=false \
npm run rag:verify:eval-suite:case -- source-lookup-meetings
```

Result:

- Status: FAIL
- Duration: `153819ms`
- Max budget: `75000ms`
- HTTP status: `200`
- Persisted assistant message found: yes
- Artifact:
  `docs/archive/2026-06-22-docs-migration/ai-plan/evals/runs/2026-06-27T12-58-56-114Z-287faf72/source-lookup-meetings.json`

## Root Cause

The deterministic source-specific meeting retrieval was not the slow step.
The persisted trace and stream events show `sourceSpecificRagRetrieval` completed
in `1463ms`.

The latency came after that successful prefetch. The model fell through into the
broad agentic tool loop, where the trace fired unrelated or redundant tools:

- `searchMeetingsByTopic` completed 30 times.
- The repeated meeting tool completions spanned about `128.552s`.
- Off-path tools also fired: `backendDeepAgentExecutiveBriefing`,
  `searchDocuments`, `searchMemories`, `searchPastConversations`, `consultCHRO`,
  and `mcpToolDiscovery`.
- MCP discovery attempted unrelated connectors and hit 401 errors.

This means the route already had enough source-specific meeting context, but it
did not return directly for meeting source-specific prompts the way it already
did for recent Teams source-specific prompts.

## Fix

Changed the direct source-specific fast path in
`frontend/src/app/api/ai-assistant/chat/handler-v2.ts` so successful
source-specific retrieval returns directly for these request kinds:

- recent Teams discussions
- recent meetings
- meetings on a specific date

The direct response still persists:

- provider path `direct-source-specific-rag`
- retrieval plan metadata
- `sourceSpecificRagRetrieval` tool trace
- source debug metadata
- response-quality metadata

Also added a planner regression for the exact failing prompt:

```text
Did Brandon say anything about billing in recent meetings that I need to remember?
```

That prompt now routes to `source_specific_rag_recent_meetings` without semantic
vector search or specialist-tool expansion.

## Related Guardrail Fix

The focused planner suite exposed an unrelated router false positive:

```text
What are Brandon's must-do items today?
```

The app-help regex treated `do` in `must-do` as a product-help feature object.
The router was tightened so app-help definition prompts still work, while
owner-briefing task phrases are no longer stolen into `app_help`.

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Source-specific contract | `npm run rag:verify:source-specific` | PASS |
| Focused planner/router unit tests | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/retrieval/__tests__/planner.test.ts src/lib/ai/__tests__/intent-router.test.ts --runInBand` | PASS, 110/110 |
| Delegated changed-file typecheck | `cd frontend && npm run typecheck:changed -- src/app/api/ai-assistant/chat/handler-v2.ts src/lib/ai/retrieval/__tests__/planner.test.ts src/lib/ai/intent-router.ts src/lib/ai/__tests__/intent-router.test.ts ../scripts/verify/verify_ai_source_specific_rag_contract.mjs` | PASS |
| Eval contract cleanup | `npm run rag:verify:source-specific`; `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/retrieval/__tests__/source-specific-rag.test.ts --runInBand`; `node --check scripts/verify/verify_ai_assistant_eval_suite.mjs`; delegated `cd frontend && npm run typecheck:changed -- src/lib/ai/retrieval/source-specific-rag.ts ../scripts/verify/verify_ai_assistant_eval_suite.mjs` | PASS |

## Deployment / Production Recheck

Deployment `dpl_GeJhJvxRNw9ncjTr1uN8J97bTRNF` is `Ready` on Vercel and aliased
to `projects.alleatogroup.com`.

Production eval command:

```bash
AI_EVAL_BASE_URL=https://projects.alleatogroup.com \
AI_EVAL_CASE_TIMEOUT_MS=180000 \
AI_EVAL_JUDGE_ENABLED=false \
npm run rag:verify:eval-suite:case -- source-lookup-meetings
```

Result:

- PASS, 1/1
- Duration: `5141ms`
- Tools fired: `backendDeepAgentExecutiveBriefing`, `sourceSpecificRagRetrieval`
- Failures: none
- Warnings: none
- Artifact:
  `docs/archive/2026-06-22-docs-migration/ai-plan/evals/runs/2026-06-27T14-36-47-831Z-31a8441e/source-lookup-meetings.json`
