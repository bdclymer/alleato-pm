# Deep Agents Project Intelligence Orchestrator PRP

Date: 2026-05-13
Status: Slice 1 implemented
Feature slug: `deep-agents-project-intelligence`
Linear issue: AAI-356
Confidence score: 8/10

## Goal

Evaluate and pilot LangChain Deep Agents as the backend orchestration harness for Alleato project intelligence while preserving the existing AI SDK chat/UI layer.

The goal is not to chase a new framework because the current assistant feels weak. The goal is to stop hand-assembling core agent behavior that already has a proven runtime pattern:

1. classify intent before answering,
2. load the right project/source context,
3. delegate focused source work to specialist subagents,
4. require evidence and source coverage,
5. fail loudly when packet/source requirements are not met,
6. persist memory candidates only through scoped, auditable rules,
7. return a structured answer packet the current AI SDK UI can stream and render.

## Executive Decision

Deep Agents should be treated as a backend orchestration candidate, not as a replacement for the AI SDK frontend path.

Recommended boundary:

```text
Next.js / AI SDK chat UI
  -> /api/ai-assistant/chat
  -> backend project-intelligence orchestration endpoint
  -> Deep Agents / LangGraph workflow for complex advisory requests
  -> source-specific subagents and packet compiler
  -> structured evidence packet
  -> AI SDK data parts / chat response / project intelligence page
```

Keep AI SDK for:

- `useChat`, AI Elements, UI message parts, and streaming response transport.
- `streamText`, `generateText`, and `ToolLoopAgent` paths that are already useful inside Next.js.
- Typed data-part widgets, confirmation UI, and lightweight structured output.

Evaluate Deep Agents for:

- multi-step project-status, risk, and source-cross-check workflows,
- source-specific subagents with isolated tool sets,
- file-backed working context for large source packets,
- scoped long-term memory and background consolidation,
- declarative read/write permissions around memory and working files,
- durable backend execution for workflows that should not live inside Vercel route handlers.

## Why This PRP Exists

The current assistant has the right pieces but not enough runtime discipline. Existing repo evidence shows packet-first project intelligence, source-specific lookup, provider gates, and AI SDK tool loops are present. The weak spot is that route logic, fallback logic, retrieval checks, memory, and quality gates are distributed across several layers.

Observed product failure mode:

- Assistant sounds plausible but chooses the wrong path.
- It can answer without proving the right source/tool was used.
- It sometimes falls back from packet/source evidence into generic synthesis.
- Tool health and response quality can be recorded after the fact instead of forcing the correct path before the answer.
- Memory and project intelligence are not yet governed by a single agent operating model.

Deep Agents is interesting because its first-class primitives map to this gap: planning, subagents, file-backed context, backends, permissions, memory, and human approval.

## Current Repo Evidence

### Existing AI SDK / Next.js Layer

- `frontend/src/components/ai-assistant/chat-area.tsx` consumes AI SDK UI state.
- `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` uses `streamText` with tools and `stopWhen`.
- `frontend/src/lib/ai/orchestrator.ts` already constructs specialist agents with `ToolLoopAgent`.
- `frontend/src/lib/ai/chat-handler.ts` injects packet-first project intelligence before strategist synthesis.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` documents the current C-suite strategist and specialist-agent model.

This layer should not be discarded. It owns the app UX and existing message-part/widget system.

### Existing Packet-First Backend/Data Layer

- `backend/src/services/intelligence/compiler.py` and `backend/src/services/intelligence/operating_summary.py` already compile source intelligence into packet-first tables.
- `backend/src/services/intelligence/teams_compiler.py` is a source-specific compiler for Teams signals.
- `frontend/src/lib/ai/intelligence/packet-service.ts` loads current project intelligence packets for the chat/page surfaces.
- `docs/PRPs/real-time-source-sync-intelligence-observability/prp-real-time-source-sync-intelligence-observability.md` defines the ingestion, sync-health, vectorization, compiler, and packet health model.

Deep Agents should orchestrate these services, not replace them.

### Existing Strategy Decision

`docs/ai-plan/councils/2026-05-08-rag-strategy-council-durable-assistant-strategy.md` says not to rebuild RAG or replace AI SDK. This PRP keeps that decision but adds a new option: use Deep Agents as the backend harness that enforces the product contract around the current RAG/packet system.

## Deep Agents Capabilities To Use

Based on the reviewed LangChain docs:

- Overview: Deep Agents is an agent harness on LangGraph with planning, subagents, filesystem context, memory, permissions, and deployment patterns.
- Memory: memory can be scoped by agent, user, and organization, with read-only shared policy memory and background consolidation.
- Subagents: specialist subagents can have focused prompts, model choices, small tool sets, and concise result contracts.
- Permissions: filesystem read/write permissions can prevent unsafe writes to memory or working context paths.
- Backends: state, filesystem, store, composite, and custom backends can route different virtual paths to different stores.

Important caveat: Deep Agents permissions cover built-in filesystem tools, not every custom tool or arbitrary sandbox command. Alleato must still enforce application-level tool permissions.

## Proposed Pilot

Build one narrow backend pilot:

> Given a project and a user question like "What is the current risk/status on this project?", produce an evidence-backed project intelligence answer packet with source coverage, missing-source warnings, confidence, and recommended next actions.

### Pilot Request Contract

```json
{
  "userId": "string",
  "projectId": 43,
  "sessionId": "string",
  "question": "What is the current risk/status on this project?",
  "mode": "project_status_risk"
}
```

### Pilot Response Contract

```json
{
  "answer": "string",
  "confidence": "high | medium | low",
  "intent": "project_status_risk",
  "project": {
    "id": 43,
    "name": "string"
  },
  "sourcesChecked": [
    {
      "sourceType": "teams | meetings | emails | documents | financials | schedule | rfi | submittal | packet",
      "status": "checked | missing | stale | failed",
      "recordCount": 0,
      "latestSourceAt": "ISO timestamp or null",
      "notes": "string"
    }
  ],
  "evidence": [
    {
      "sourceType": "string",
      "sourceId": "string",
      "title": "string",
      "excerpt": "string",
      "occurredAt": "ISO timestamp or null",
      "confidence": "high | medium | low"
    }
  ],
  "recommendedActions": [
    {
      "label": "string",
      "ownerRole": "string",
      "reason": "string",
      "sourceId": "string or null"
    }
  ],
  "toolTrace": [
    {
      "agent": "string",
      "tool": "string",
      "status": "success | failed | skipped",
      "durationMs": 0
    }
  ],
  "memoryCandidates": [
    {
      "scope": "user | project | organization",
      "fact": "string",
      "requiresApproval": true
    }
  ]
}
```

## Proposed Deep Agents Shape

```text
project-intelligence-orchestrator
  planner
    - classify intent
    - decide required source coverage
    - write todo/checklist
  packet-reader subagent
    - current packet, insight cards, operating summary
  teams subagent
    - recent Teams messages and compiled Teams intelligence
  meetings subagent
    - Fireflies transcripts, meeting tasks, decisions, risks
  financial subagent
    - budget, commitments, change orders, invoices, direct costs
  project-controls subagent
    - RFIs, submittals, drawings, schedule, daily logs
  evidence-reviewer subagent
    - verifies source/project/citation correctness
  response-writer
    - produces final structured packet, not loose markdown
```

Each subagent should return concise structured results, not raw tool output. The parent orchestrator should fail the run if required source categories are missing without an explicit `missing` or `stale` status.

## Backend Integration Plan

### Slice 1: Architecture Spike

Implementation status: completed 2026-05-13 as a backend-only contract spike.

Files:

- `backend/src/services/agents/deep_project_intelligence.py`
- `backend/src/services/agents/deep_project_intelligence_contracts.py`
- `backend/src/api/main.py`
- `backend/tests/test_deep_project_intelligence.py`
- `docs/PRPs/deep-agents-project-intelligence/**`

Work:

1. Add `deepagents` and required LangGraph/LangChain packages only after confirming compatibility with the existing backend dependencies.
   - Slice 1 did not add the dependency yet; the contract was proven first to avoid framework churn.
2. Create a backend-only orchestrator module with a mocked model/tool path first.
   - Completed with `build_project_status_contract_spike(...)`.
3. Add one internal endpoint, gated behind an environment flag:

```text
POST /api/intelligence/deep-agent/project-status
```

4. Return the pilot response contract even if the first implementation uses deterministic service calls around the agent harness.
   - Completed with `DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED=true` gate and Pydantic response models.

Acceptance:

- Done: endpoint can run locally without touching the Next.js chat route.
- Done: response validates against a typed Pydantic schema.
- Done: missing packet/source coverage is explicit in response, not hidden.
- Done: no production chat behavior changes.
- Done: project lookup failure returns a loud 404 instead of generic synthesis.

### Slice 2: Real Source Tools

Work:

1. Add read-only tools for current packet, Teams intelligence, meeting intelligence, financial summary, project controls, and source health.
2. Enforce project ID and user/org context in every tool.
3. Make tool failures return structured failure states to the parent orchestrator.

Acceptance:

- A project-status request returns checked/stale/missing for every required source family.
- Wrong-project evidence is rejected by the evidence reviewer.
- Tool failures are visible in `toolTrace` and response metadata.

### Slice 3: AI SDK Bridge

Work:

1. Add a Next.js server-side client that calls the backend endpoint for `project_status_risk` and similar complex advisory intents.
2. Keep AI SDK streaming/UI response shape intact.
3. Render the backend packet as existing AI SDK data parts or assistant widgets.

Acceptance:

- Existing chat UI still uses AI SDK.
- Complex project-intelligence prompts can call the backend orchestrator.
- The response includes answer, evidence, source coverage, confidence, and recommended actions.
- Existing assistant-routing and provider-matrix verifiers still pass.

### Slice 4: Memory Governance

Work:

1. Treat user preferences as user-scoped memory.
2. Treat project facts as project intelligence candidates, not private chat memory.
3. Treat organization policy as read-only memory.
4. Add approval flow for any shared memory write.

Acceptance:

- No agent can silently write shared organization/project facts.
- Memory candidates are returned separately from confirmed facts.
- Approved project facts are promoted through packet/intelligence tables, not hidden in a private markdown file.

## Required Guardrails

The pilot must fail loudly when:

- intent cannot be classified,
- project ID cannot be resolved,
- no current packet exists and source tools also fail,
- evidence source project does not match requested project,
- answer has fewer than the required source categories checked,
- tool trace is missing,
- confidence is high while source coverage is stale/missing,
- memory candidate would write shared facts without approval.

## Verification Commands

Short targeted checks for the architecture/doc slice:

```bash
git diff --check -- docs/PRPs/deep-agents-project-intelligence/prp-deep-agents-project-intelligence.md
npm run linear:codex:check -- docs/ops/handoffs/2026-05-13-S45-deep-agents-orchestrator-prp.md
```

Future implementation checks:

```bash
python -m pytest backend/tests/services/agents/test_deep_project_intelligence.py
npm run rag:verify:chat-architecture
node scripts/verify/verify_ai_tool_calling_provider_matrix.mjs
npm run rag:verify:assistant-routing
node scripts/verify/verify_ai_intelligence_packet_contract.mjs
```

Do not run full frontend build as part of this PRP doc slice. Delegate it when implementation starts.

## Non-Goals

- Do not replace AI SDK UI, AI Elements, or `useChat`.
- Do not replace existing packet-first tables.
- Do not move heavy source compilation into Vercel route handlers.
- Do not use Deep Agents as a generic chat bot layer.
- Do not let Deep Agents write shared memory without approval.
- Do not introduce LangChain abstractions into frontend code.
- Do not treat a framework install as proof of intelligence quality.

## Risks

| Risk | Mitigation |
|---|---|
| Framework churn adds complexity without improving answer quality. | Start with one backend pilot and a strict response contract. |
| Deep Agents duplicates existing AI SDK specialists. | Keep Deep Agents only for backend orchestration; preserve AI SDK specialists where they work. |
| Memory becomes another prompt-injection surface. | Default to user-scoped writable memory, read-only org policy, and approval for shared writes. |
| Python backend dependency conflicts. | Add dependencies in a spike branch/slice and verify backend tests before integration. |
| Assistant becomes slower. | Use backend orchestration only for complex advisory intents; keep simple exact-source lookups deterministic. |
| Evidence remains weak but formatted better. | Add evidence-reviewer and retrieval-grounding gates before user-facing rollout. |

## Recommended Next Step

Implement Slice 2 by wiring read-only source tools into the backend orchestrator. Do not touch the production chat route until the backend endpoint can return checked/stale/missing/failed coverage for packet, Teams, meetings, financials, and project controls.

## Open Questions

1. Should the first proof project be Westfield Collective because it already has seeded packet evidence, or a more painful current live project where the assistant is failing?
2. Should the first orchestrator use LangSmith deployment/checkpointing immediately, or start inside Render/FastAPI with local state and add LangSmith after the contract is proven?
3. Should Deep Agents own memory consolidation, or should Alleato keep memory extraction in the current AI SDK/Supabase path and only borrow the scoped-memory model?
