# AAI-739 Product Retrieval Smoke Proof

Date: 2026-06-27
Linear: AAI-739

This proof verifies the user-visible assistant/RAG path after backend pipeline
and provider verifiers passed. It uses the production assistant eval harness,
which posts to `/api/ai-assistant/chat`, drains the SSE response, and reads back
the persisted assistant message from `chat_history.metadata.tool_trace`.

## Primary Passing Smoke: Live Outlook Source Lookup

Command:

```bash
AI_EVAL_BASE_URL=https://projects.alleatogroup.com \
AI_EVAL_CASE_TIMEOUT_MS=180000 \
AI_EVAL_JUDGE_ENABLED=false \
npm run rag:verify:eval-suite:case -- realworld-last-five-emails
```

Result:

- Status: PASS
- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Case: `realworld-last-five-emails`
- Intent: `source_lookup`
- Duration: `13982ms`
- HTTP status: `200`
- Persisted assistant message found: yes
- Session ID: `b6bbd1c8-173a-4d8e-9b31-5685353012cc`
- Run artifact:
  `docs/archive/2026-06-22-docs-migration/ai-plan/evals/runs/2026-06-27T13-01-50-951Z-d39c135f/`

Persisted tool trace proof:

- Tool fired: `consultMicrosoftExecutiveAssistant`
- Tool status: `success`
- Tool output source: `microsoft_graph_live`
- Nested tool trace:
  - read_live_outlook_inbox
  - `status=success`
  - `source=microsoft_graph_live`
  - `count=5`
  - `mailboxUserId=bclymer@alleatogroup.com`
  - `fetchedAt=2026-06-27T13:01:56.905019+00:00`
- Forbidden stale sources did not appear:
  - `outlook_email_intake`
  - `outlook_email_intake_fallback`

Interpretation:

- This is strong user-visible proof that the production assistant source lookup
  path can answer through the finalized Microsoft Executive Assistant tool path
  and live Microsoft Graph, then persist retrievable metadata for audit.
- Judge quality was intentionally disabled for speed/cost; this proof validates
  route, auth, source selection, tool execution, persistence, and live-source
  evidence, not subjective answer quality.

## Secondary Smoke: Teams Source Lookup

Command:

```bash
AI_EVAL_BASE_URL=https://projects.alleatogroup.com \
AI_EVAL_CASE_TIMEOUT_MS=180000 \
AI_EVAL_JUDGE_ENABLED=false \
npm run rag:verify:eval-suite:case -- source-lookup-teams
```

Result:

- Status: PASS
- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Case: `source-lookup-teams`
- Intent: `source_lookup`
- Duration: `33360ms`
- HTTP status: `200`
- Persisted assistant message found: yes
- Session ID: `813f4b11-f675-47f0-9f73-df8a51123ba9`
- Run artifact:
  `docs/archive/2026-06-22-docs-migration/ai-plan/evals/runs/2026-06-27T12-57-54-350Z-3b228bd6/`

Tool evidence:

- Tools fired:
  - `clientProjectIntelligencePacket`
  - `getProjectBriefingSnapshot`
  - `semanticSearch`
  - `searchMemories`
  - `searchMeetingsByTopic`
  - `searchDocuments`
  - `mcpToolDiscovery`
  - `loadIntelligencePacket`
- `semanticSearch` ran with `selectedProjectId=43`.
- Response quality metadata reported `sourceQuality=high`.

Limitations:

- The final answer stated Teams-specific Westfield rows were unavailable and
  fell back to packet/context evidence.
- The run passed the harness but is weaker than the Outlook smoke as direct
  source-specific proof.
- Warning: duration exceeded the 30s warning budget by about 3.4s.

## Latency Finding: Meeting Source Lookup

Update 2026-06-27: tracked and patched under AAI-749. The baseline failure
below is retained as the original production smoke finding. The fix evidence is
recorded in
`docs/ops/evidence/2026-06-25-ai-rag-production-finalization/meeting-source-lookup-latency-aai-749.md`.

Command:

```bash
AI_EVAL_BASE_URL=https://projects.alleatogroup.com \
AI_EVAL_CASE_TIMEOUT_MS=180000 \
AI_EVAL_JUDGE_ENABLED=false \
npm run rag:verify:eval-suite:case -- source-lookup-meetings
```

Result:

- Status: FAIL
- Endpoint: `https://projects.alleatogroup.com/api/ai-assistant/chat`
- Case: `source-lookup-meetings`
- Intent: `source_lookup`
- Duration: `153819ms`
- HTTP status: `200`
- Persisted assistant message found: yes
- Session ID: `6a332d01-fb07-40f7-85df-ef9f6fb0abec`
- Failure reason: exceeded eval max duration budget of `75000ms`.
- Run artifact:
  `docs/archive/2026-06-22-docs-migration/ai-plan/evals/runs/2026-06-27T12-58-56-114Z-287faf72/`

Tool evidence despite failure:

- Tools fired:
  - `backendDeepAgentExecutiveBriefing`
  - `sourceSpecificRagRetrieval`
  - `semanticSearch`
  - `searchDocuments`
  - `searchMeetingsByTopic`
  - `searchMemories`
  - `searchPastConversations`
  - `consultCHRO`
  - `mcpToolDiscovery`
- Response quality metadata reported `sourceQuality=high`.

Interpretation:

- The product path executed and persisted source-lookup/retrieval metadata, but
  meeting lookup latency is not acceptable for a clean product smoke pass.
- This should be tracked as a performance hardening follow-up, not hidden as a
  successful user-visible proof.

## Final Smoke Conclusion

- Product-facing assistant route: verified.
- Auth/session refresh: verified.
- SSE response and persisted assistant readback: verified.
- Live-source Outlook retrieval through Microsoft Graph: verified.
- Stale Outlook fallback prevention: verified by required/forbidden trace
  assertions.
- Teams source lookup: route/persistence verified, but direct Teams row proof is
  weak for this specific prompt.
- Meeting source lookup: retrieval path runs but failed latency budget.

The final production-readiness package can cite the live Outlook smoke as the
strong user-visible retrieval proof and list meeting-source latency as a
follow-up risk.
