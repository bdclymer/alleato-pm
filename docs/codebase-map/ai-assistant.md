# AI Assistant

- **Status:** 🟡 messy but working
- **Owner:** project lead
- **Last verified:** 2026-05-19

The chat-based AI surface that answers questions about projects, emails, meetings, finances, and schedule. Backed by a multi-agent orchestrator (Strategist + CFO), a 28-tool toolbelt, and the RAG store. This is the largest and most volatile surface in the app.

## What it controls

**User-facing:**
- `/ai-assistant` — main chat UI
- `/intelligence` — daily digest / insights feed
- Floating assistant widget (when enabled)

**API routes:** `frontend/src/app/api/ai-assistant/*`
- `chat/` — main streaming chat endpoint (handler-v2)
- `conversations/`, `messages/` — session + history persistence
- `feedback/`, `task-feedback/`, `email-draft-feedback/`, `packet-card-feedback/` — user feedback capture
- `memories/` — long-term memory store
- `marketing/`, `workspace/`, `timeline/`, `avatar/`, `speech/`, `usage-stats/` — supporting endpoints

**Background:** none directly — but consumes data produced by the [Sync Pipeline](./sync-pipeline.md).

## Main files

**Orchestration layer** (`frontend/src/lib/ai/`):
- `orchestrator.ts` — top-level agent loop
- `agents/` — agent definitions (Strategist, CFO, content_builder, etc.)
- `intent-router.ts`, `intent-classifier.ts`, `detect-rag-request.ts` — request routing
- `providers.ts`, `provider-config.ts`, `provider-routing.ts` — model/gateway config
- `models.ts`, `assistant-models.ts`, `model-pricing.ts` — model registry
- `prompts/`, `prompts.ts`, `system-prompt.ts`, `rag-assistant-prompt.ts` — prompt assembly
- `fallback-chain.ts`, `preflights.ts`, `strategist-failure-response.ts` — failure handling
- `score-response-quality.ts`, `langfuse-trace.ts`, `prompt-diagnostics.ts` — observability

### Tool layer
(`frontend/src/lib/ai/tools/`):

#### Money

- `financial.ts`, `forecast-tools.ts`, `acumatica.ts`

#### project state

- `operational.ts`, `project-tools.ts`, `schedule-tools.ts`
- `intelligence-tools.ts`, `document-intelligence.ts` — search / retrieval
- `outlook-operations.ts`, `progress-report-tools.ts`, `marketing.ts`, `workspace-tools.ts` — domain actions
- `app-help-tools.ts`, `feature-request-tools.ts`, `mcp-tools.ts`, `web-search.ts` — meta/utility
- `action-tools.ts`, `guardrails.ts`, `tool-utils.ts`, `structured-output.ts`, `structured-queries.ts` — infra
- `create-document.ts`, `update-document.ts`, `request-suggestions.ts` — artifact authoring

**Retrieval** (`frontend/src/lib/ai/retrieval/`): semantic search wrappers over the RAG store.

**UI:** `frontend/src/app/(main)/[projectId]/intelligence/` and the chat page under `(main)`.

## Data

**Tables (PM APP project):**
- `ai_sessions` — chat session metadata
- `ai_messages` — message history
- `ai_tool_runs` — tool invocation traces
- `ai_assistant_evals`, `ai_assistant_eval_runs` — eval suite results
- `insights`, `project_insights` — proactive insights surfaced in the UI
- `tasks`, `source_signal_candidates` — extracted action items

**Tables (AI Database project — RAG store):**
- `document_chunks` — vector embeddings (text-embedding-3-large, halfvec 3072) — what the assistant actually queries
- `rag_document_metadata` — source document index
- `rag_pipeline_state` — embedding cursor

**Key RPCs:** `search_document_chunks`, `search_all_knowledge`, `search_knowledge_base`.

**Models (confirmed 2026-05-07):**
- Strategist: `openai/gpt-5.4`
- CFO: `openai/gpt-5.4-mini`
- Synthesis: `openai/gpt-4.1`
- Titles / artifact metadata: `openai/gpt-4.1-nano`

Provider: OpenAI via Vercel AI Gateway in BYOK mode (`AI_GATEWAY_API_KEY`, fallback `OPENAI_API_KEY`).

## Depends on

- [Sync Pipeline](./sync-pipeline.md) — produces every email/meeting/file the assistant can search
- RAG / Embeddings system (see [AI-RAG-ARCHITECTURE.md](../architecture/AI-RAG-ARCHITECTURE.md))
- Acumatica integration — financial tools call ERP
- Every product surface — tools read from budgets, commitments, RFIs, etc.

## Known risks

- **Persistence gaps** — message storage path has had regressions; sessions occasionally lose state
- **Blank screen regressions** — chat UI has rendered empty during streaming retries
- **Model/prompt drift** — multiple files declare model IDs (`models.ts`, `assistant-models.ts`, `provider-config.ts`); single source of truth not enforced
- **Tool sprawl** — 28+ tools across 20+ files; no central registry doc beyond `AI-RAG-ARCHITECTURE.md`
- **Eval coverage thin** — `assistant-eval-suite.json` exists but doesn't gate deploys
- **Two Supabase projects** — using the wrong client silently returns stale data; see CLAUDE.md "Two Supabase Projects"

## Cleanup targets

1. Consolidate model declarations into one registry file; delete duplicates
2. Generate a live `tools-index.md` (one row per tool: name, file, what it does, which tables it reads) — currently nowhere
3. Add a smoke test that exercises the chat endpoint with 3 canonical questions on every PR
4. Wire `assistant-eval-suite.json` into CI as a non-blocking signal, then promote to blocking
5. Audit `frontend/src/lib/ai/` for dead exports — file count suggests significant cruft

## Source-of-truth docs

- [AI-RAG-ARCHITECTURE.md](../architecture/AI-RAG-ARCHITECTURE.md) — **read this first** for end-to-end architecture
- [AI-ASSISTANT-ARCHITECTURE-REFERENCE.md](../architecture/AI-ASSISTANT-ARCHITECTURE-REFERENCE.md)
- `docs/ai-plan/AI-MASTER-PLAN.md` — phased roadmap
- [COMMUNICATIONS-DATA-PIPELINE.md](../architecture/COMMUNICATIONS-DATA-PIPELINE.md) — what data the assistant can see
- `.claude/rules/RAG-DOCS-GATE.md` — when you must update the RAG docs

## Generated dependency graphs

- [`graphs/ai-lib-folders.svg`](./graphs/ai-lib-folders.svg) — folder-level import map of `src/lib/ai/`
- [`graphs/ai-tools.svg`](./graphs/ai-tools.svg) — file-level map of the 28+ tools and how they relate

## Diagram

```mermaid
flowchart LR
    User[User in /ai-assistant] --> ChatAPI[/api/ai-assistant/chat]
    ChatAPI --> Router[intent-router.ts]
    Router --> Orchestrator[orchestrator.ts]
    Orchestrator --> Strategist[Strategist agent<br/>gpt-5.4]
    Orchestrator --> CFO[CFO agent<br/>gpt-5.4-mini]
    Strategist --> Tools[Tool layer<br/>28+ tools]
    CFO --> Tools
    Tools --> RAG[(document_chunks<br/>AI Database)]
    Tools --> AppDB[(PM APP tables<br/>projects, commitments,<br/>budgets, RFIs, ...)]
    Tools --> Acumatica[Acumatica ERP]
    Orchestrator --> Persist[ai_sessions<br/>ai_messages<br/>ai_tool_runs]
    Orchestrator --> Stream[Streamed response]
    Stream --> User
```
