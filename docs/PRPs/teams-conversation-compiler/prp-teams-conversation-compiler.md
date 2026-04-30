# Advanced Teams Conversation Compiler

Date: 2026-04-30
Status: Implementation PRP
Feature: `teams-conversation-compiler`
Confidence Score: 9/10

## Goal

Build a dedicated Teams conversation compiler that transforms raw Teams DM conversations
from `document_metadata` into structured intelligence: project attribution candidates,
insight cards, tasks, risks, decisions, and sentiment signals.

The generic document pipeline already generates `overview` text but produces noisy,
unreliable results for Teams DM conversations. This compiler replaces it for the
`teams_dm_conversation` type with a purpose-built, multi-output extraction pipeline
that treats Teams traffic as a strategic intelligence asset rather than a searchable
chat archive.

**Deliverable:** A Python module `backend/src/services/intelligence/teams_compiler.py`
plus a new Supabase migration for `document_attribution_candidates`, an updated
`document_metadata` pipeline status enum, and a new FastAPI endpoint for triggering
batch compiler runs.

**Success Definition:** The compiler is complete when a batch of 25 rows processes
with 0 hard failures, `document_metadata.overview` fields are project-specific
(not generic templates), attribution candidates are written for uncertain rows, and
the monitoring endpoint returns correct metrics.

## Non-Goals

- Do not replace the Microsoft Graph sync pipeline (`teams.py`). The compiler is a
  post-ingestion step that reads already-ingested `document_metadata` rows.
- Do not build a real-time streaming pipeline. Batch processing is sufficient for V1.
- Do not build the human review UI in this PRP. The compiler writes to a review queue;
  the review UI is a separate task.
- Do not change the embedding pipeline (`embed.py`). The compiler updates `overview`
  in `document_metadata`, which the embedding pipeline already re-processes.
- Do not modify the existing generic document pipeline. It remains as a fallback.

## Why

Teams DMs are the highest-signal source of project intelligence in the system — they
contain real decisions, risks, and action items that never make it into structured
fields. The generic pipeline fails on 40%+ of Teams rows (non-JSON LLM returns) and
produces "This document is a Teams conversation about…" output even when it succeeds.
381 rows are eligible for compilation and stuck in `raw_ingested` or `embedded` status
with no structured intelligence extracted.

## Required Outcome

Given a `document_metadata` row of type `teams_dm_conversation`:

1. The compiler reads the raw `content` field (compiled conversation text).
2. It runs multi-stage extraction: project attribution, overview generation, insight
   cards, tasks, risks, decisions, and sentiment signals.
3. Safe outputs are written automatically:
   - `document_metadata.overview` (readable summary)
   - `document_metadata.project_id` and `document_metadata.project` (only when
     attribution confidence ≥ 0.85 and no conflicting evidence)
   - `project_insights` rows (insight cards with high confidence)
   - `insights` rows (risks, decisions, opportunities)
   - `tasks` rows (clear action items with identifiable owners)
4. Uncertain or ambiguous outputs are written to `document_attribution_candidates`
   for human review instead of being silently dropped.
5. The compiler runs in bounded batches of 25–50 rows with full progress tracking.

## Core Context

### Requirements Document

The authoritative requirements for this feature:
`docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/ADVANCED-TEAMS-CONVERSATION-COMPILER-REQUIREMENTS-2026-04-30.md`

> **Path note:** The `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/` directory
> is slated for deletion from git (visible in `git status` as staged deletes).
> Verify this file still exists before reading it. If deleted, the key requirements
> are fully reproduced in this PRP's Implementation Tasks and JSON schema sections.

Read this document in full before implementing. It defines all 8 output types, field
names, confidence rules, batch requirements, and the quality bar for what a good
compiler output looks like.

### Current Pipeline Architecture

The existing pipeline flow is:

```
Microsoft Graph sync (teams.py)
  → sync_teams_chat()
  → _process_chat_message()
  → document_metadata INSERT (status="raw_ingested", type="teams_dm_conversation")
  → embed_pending_graph_documents() (embed.py)
  → document_chunks INSERT (status="embedded")
```

The compiler inserts between `raw_ingested` and `embedded`:

```
document_metadata WHERE type="teams_dm_conversation" AND status IN ("raw_ingested", "embedded")
  → teams_compiler.compile_conversation()
  → document_metadata UPDATE (overview, project_id, status="compiled")
  → document_attribution_candidates INSERT (uncertain attributions for review)
  → project_insights INSERT (high-confidence insight cards)
  → insights INSERT (risks, decisions, opportunities)
  → tasks INSERT (action items)
```

The embedding pipeline re-embeds after `overview` is set, replacing the old chunks
with embeddings that now include the richer summary in the content prefix.

### Key Existing Files (Read Before Implementing)

```
backend/src/services/integrations/microsoft_graph/teams.py
  - _conversation_doc_id()          line ~78  — doc ID scheme
  - _process_chat_message()                   — how conversations are ingested
  - _substantive_text_length()                — low-content filter

backend/src/services/integrations/microsoft_graph/project_inference.py
  - infer_project_id()                        — wraps ProjectAssigner, returns (project_id, method, confidence)
  - ProjectAssigner.assign_project()          — 3-strategy attribution (title, email domain, content)
  - _project_cache                            — loaded once per instance, used across calls

backend/src/services/ingestion/project_assignment.py
  - batch_assign_projects()                   — batch attribution for unassigned rows

backend/src/services/integrations/microsoft_graph/embed.py
  - embed_pending_graph_documents()           — embedding pipeline entry point
  - embed_graph_document()                    — per-document embed
  - _substantive_text_length()                line 130 — shared low-content filter (copy, do not import)
  - embed.py:317                              — status query to update: add "compiled" to IN list

backend/src/services/integrations/microsoft_graph/sync.py
  - run_graph_sync()                          — top-level sync orchestrator

backend/src/services/pipeline/llm.py
  - _provider_configs()             line 24   — AI Gateway + direct OpenAI provider list
  - _client(provider)               line 51   — constructs OpenAI() from provider dict
  - _model_for_provider()           line 58   — prepends "openai/" prefix for AI Gateway
  - _call_llm()                     line 99   — full provider-retry pattern to copy for compiler
  - CRITICAL line 114: AI Gateway does NOT support response_format={"type": "json_object"}
    The condition is: if json_mode and provider["name"] != "AI Gateway"
    Use instructed JSON in the prompt itself when targeting AI Gateway.
```

### Database Schema

#### `document_metadata` (write target — existing table)

Primary target table. Compiler reads `content` and writes structured outputs back.

Key columns used by this feature:

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | Stable doc ID: `teamsdm_{sha256[:16]}_{YYYY-MM-DD}` |
| `type` | text | `'teams_dm_conversation'` for DM rows |
| `category` | text | `'teams_message'` |
| `source` | text | `'microsoft_graph'` |
| `content` | text | Raw compiled conversation text |
| `overview` | text | AI-generated summary — compiler writes here |
| `project_id` | bigint | FK → projects.id (nullable) — compiler writes for high-confidence |
| `project` | text | Project name — compiler writes alongside project_id |
| `participants` | text | Raw participant string from sync |
| `date` | timestamptz | Conversation date |
| `status` | text | Pipeline status: `raw_ingested` → `compiled` → `embedded` |
| `tags` | text | Comma-separated tags incl. `project_auto:{method}` |
| `title` | text | Chat display name e.g. `"Teams DM Conversation: Ulta Fresno"` |
| `source_metadata` | jsonb | NOT NULL DEFAULT `{}` — extra provenance data |

**Status values for this feature:**

| Value | Meaning |
|-------|---------|
| `raw_ingested` | Ingested, not yet compiled or embedded |
| `compiled` | Compiler has run, overview + structured outputs written |
| `skipped_low_content` | Below minimum useful content length threshold |
| `embedded` | Embedded; includes re-embed after compile |
| `error` | Hard failure in compile or embed stage |
| `needs_review` | Attribution or content requires human review before further processing |

**IMPORTANT FK type:** `document_metadata.project_id` is `bigint`. `projects.id` is
`bigint`. Any project_id written by the compiler must be a Python `int`, not a `str`
or `UUID`.

#### `projects` (read-only — existing table)

Compiler uses this to resolve project names, aliases, and team members.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | Integer, not UUID |
| `name` | text | Official project name |
| `aliases` | text[] | Known alternative names/codes |
| `client` | text | Client company name |
| `team_members` | text[] | Team member emails |
| `stakeholders` | jsonb | `[{name, email, role}]` |
| `job number` | text | Note: column has a space in the name |
| `project_number` | varchar | Alternative project number field |

#### `project_insights` (write target — existing table)

Used for high-confidence insight cards.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `project_id` | integer NOT NULL | FK → projects.id (integer, not bigint) |
| `summary` | text NOT NULL | One-paragraph insight summary |
| `detail` | jsonb NOT NULL DEFAULT `{}` | Full structured insight fields |
| `severity` | text | `critical`, `high`, `medium`, `low`, `info` |
| `captured_at` | timestamptz NOT NULL | Defaults to now() |
| `source_document_ids` | text[] | `ARRAY[]::text[]` default |
| `metadata` | jsonb NOT NULL DEFAULT `{}` | Extra fields |
| `created_at` | timestamptz NOT NULL | Defaults to now() |

**IMPORTANT:** `project_insights.project_id` is `integer` (not `bigint`). Cast when
writing: `int(project_id)`.

#### `insights` (write target — existing table)

Used for risks, decisions, opportunities extracted from conversations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `metadata_id` | text | FK → document_metadata.id |
| `project_id` | bigint | FK → projects.id |
| `project_ids` | integer[] | Multi-project support: `'{}'` default |
| `type` | text NOT NULL | e.g. `'risk'`, `'decision'`, `'opportunity'`, `'action_item'` |
| `description` | text NOT NULL | Readable description |
| `owner_name` | text | Person responsible (if any) |
| `status` | text NOT NULL DEFAULT `'open'` | |
| `details` | jsonb DEFAULT `'{}'` | Full structured fields |
| `embedding` | vector | Set by embedding pipeline, not compiler |
| `created_at` | timestamptz NOT NULL | |
| `updated_at` | timestamptz NOT NULL | |

#### `tasks` (write target — existing table)

Used for clear action items extracted from conversations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `metadata_id` | text NOT NULL | FK → document_metadata.id |
| `description` | text NOT NULL | Task text |
| `assignee_name` | text | Owner name |
| `assignee_email` | text | Owner email (if known) |
| `project_id` | bigint | FK → projects.id |
| `project_ids` | integer[] | Multi-project: `'{}'` default |
| `due_date` | date | Extracted due date |
| `priority` | text | |
| `status` | text NOT NULL DEFAULT `'open'` | |
| `source_system` | text NOT NULL DEFAULT `'fireflies'` | **Set to `'microsoft_teams'`** |
| `file_name` | text | |
| `created_at` | timestamptz NOT NULL | |
| `updated_at` | timestamptz NOT NULL | |

**Note:** `tasks.source_chunk_id` has a broken FK pointing to `documents.id` (a uuid
table) rather than `document_chunks.chunk_id` (text). Do NOT populate
`source_chunk_id` — leave it NULL.

#### `document_attribution_candidates` (NEW table — requires migration)

This table does not exist and must be created via a Supabase migration.

Recommended schema:

```sql
CREATE TABLE public.document_attribution_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_document_id text NOT NULL REFERENCES public.document_metadata(id),
  candidate_project_id bigint REFERENCES public.projects(id),
  candidate_project_name text,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  attribution_method text NOT NULL,
  evidence_terms text[] NOT NULL DEFAULT '{}',
  reasoning text,
  status text NOT NULL DEFAULT 'pending_review',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_attribution_candidates_status_check
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'auto_assigned'))
);

CREATE INDEX idx_attribution_candidates_doc ON public.document_attribution_candidates(source_document_id);
CREATE INDEX idx_attribution_candidates_project ON public.document_attribution_candidates(candidate_project_id);
CREATE INDEX idx_attribution_candidates_status ON public.document_attribution_candidates(status);

ALTER TABLE public.document_attribution_candidates ENABLE ROW LEVEL SECURITY;
```

### Compiler Input Format

The `content` field in `document_metadata` for `teams_dm_conversation` rows follows
this format (read carefully — the compiler must parse this):

```
[Teams Direct Message Conversation: <chat display name>]
Date: YYYY-MM-DD

[message:<msg_id>] [YYYY-MM-DD HH:MM:SS] Person Name: message text
[message:<msg_id>] [YYYY-MM-DD HH:MM:SS] Person Name: message text
```

The title field contains the chat display name like `"Teams DM Conversation: Ulta Fresno"`.

### Attribution Correction Example

A critical real-world case found during batch verification:
- Rows titled `"Teams DM Conversation: Ulta Fresno"` were incorrectly assigned to
  `Ulta Dallas` (project 762) due to stale assignment.
- 12 rows were corrected to project `761` / `Ulta Beauty Fresno`.
- **Rule:** When the conversation title contains a high-confidence alias
  (e.g., "Ulta Fresno" directly in the title), that title-level evidence must override
  any weaker stale or inferred project_id. Write a correction candidate to
  `document_attribution_candidates` with `attribution_method = 'title_override'`.

### Existing Batch Evidence

From manual runs on 2026-04-30:
- 419 total `teams_dm_conversation` rows; 381 eligible by content length
- 61 have `overview` after two batch runs (10 + 25)
- 358 still need compiler processing
- Fallback path runs too often: segmentation and structured extraction frequently
  return non-JSON from the generic pipeline

---

## Implementation Tasks

**Phase execution order:** Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phases 1 and 2 (client setup + prompts) must be written first because Phase 3
(the compiler module) imports from both.

---

### Phase 0: Database Migration

**Task 0.1 — Create `document_attribution_candidates` table**

Create migration: `supabase/migrations/{timestamp}_add_document_attribution_candidates.sql`

Use the schema defined in the Database Schema section above.

Also add a comment to the migration explaining the purpose:
```sql
-- Attribution candidates table for the Teams conversation compiler.
-- Stores multi-project or uncertain project attributions for human review.
-- auto_assigned rows have confidence >= 0.85 and no conflicting evidence.
-- pending_review rows require human approval before affecting project records.
```

Run the migration after creation:
```bash
cd frontend && npx supabase db push
```

**Task 0.2 — Verify migration applied**

Query via Supabase MCP:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'document_attribution_candidates';
```

---

### Phase 1: OpenAI Client Setup

Create: `backend/src/services/intelligence/client.py`

Also create: `backend/src/services/intelligence/__init__.py` (empty)

**Task 1.1 — Provider config and client factory**

Copy the exact pattern from `backend/src/services/pipeline/llm.py:24-62`. The
compiler must use the same provider-loop pattern, not a single `AsyncOpenAI` call.

```python
from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

from openai import OpenAI

logger = logging.getLogger(__name__)

AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1"
COMPILER_MODEL_DEFAULT = "gpt-4.1-mini"
COMPILER_MODEL_LARGE = "gpt-4.1"


def _provider_configs() -> List[Dict[str, str]]:
    providers: List[Dict[str, str]] = []
    gateway_key = os.getenv("AI_GATEWAY_API_KEY")
    if gateway_key:
        providers.append({
            "name": "AI Gateway",
            "api_key": gateway_key,
            "base_url": AI_GATEWAY_BASE_URL,
            "model_prefix": "openai/",
        })
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        providers.append({
            "name": "OpenAI direct",
            "api_key": openai_key,
            "base_url": "",
            "model_prefix": "",
        })
    if not providers:
        raise RuntimeError("AI_GATEWAY_API_KEY or OPENAI_API_KEY is required for Teams compiler")
    return providers


def _client(provider: Dict[str, str]) -> OpenAI:
    kwargs: Dict[str, str] = {"api_key": provider["api_key"]}
    if provider.get("base_url"):
        kwargs["base_url"] = provider["base_url"]
    return OpenAI(**kwargs)


def _model_for_provider(model: str, provider: Dict[str, str]) -> str:
    prefix = provider.get("model_prefix", "")
    if prefix and not model.startswith(prefix):
        return f"{prefix}{model}"
    return model
```

**Task 1.2 — Retry wrapper for JSON extraction**

The core problem with the generic pipeline is non-JSON LLM returns.
Build a retry wrapper that never raises — always returns a dict.

**Critical:** The AI Gateway does NOT support `response_format={"type": "json_object"}`.
Per `llm.py:114`, only apply this when `provider["name"] != "AI Gateway"`. For the
AI Gateway path, rely on the system prompt's JSON instruction instead.

```python
def extract_with_retry(
    messages: List[Dict[str, Any]],
    model: str = COMPILER_MODEL_DEFAULT,
    max_retries: int = 2,
) -> dict:
    """
    Call LLM with JSON mode across all configured providers.
    Retry up to max_retries on JSON parse failure.
    On final failure, returns minimal valid dict with _extraction_failed=True.
    Never raises.
    """
    errors: List[str] = []
    for provider in _provider_configs():
        for attempt in range(max_retries + 1):
            try:
                kwargs: Dict[str, Any] = {
                    "model": _model_for_provider(model, provider),
                    "messages": messages,
                    "temperature": 0.2,
                }
                # AI Gateway does not support response_format=json_object
                if provider["name"] != "AI Gateway":
                    kwargs["response_format"] = {"type": "json_object"}

                response = _client(provider).chat.completions.create(**kwargs)
                raw = response.choices[0].message.content or ""
                return json.loads(raw)
            except json.JSONDecodeError as e:
                logger.warning(
                    "[TeamsCompiler] JSON parse failure (provider=%s attempt=%d): %s",
                    provider["name"], attempt, e
                )
                if attempt == max_retries:
                    errors.append(f"{provider['name']}: JSON parse failed after {max_retries+1} attempts")
            except Exception as e:
                logger.error("[TeamsCompiler] Provider %s failed: %s", provider["name"], e)
                errors.append(f"{provider['name']}: {e}")
                break  # don't retry on non-JSON errors; try next provider

    logger.error("[TeamsCompiler] All providers failed: %s", " | ".join(errors))
    return {
        "overview": "",
        "conversation_topic": "",
        "confidence": 0,
        "insights": [],
        "tasks": [],
        "risks": [],
        "decisions": [],
        "sentiment": None,
        "initiative_signals": [],
        "_extraction_failed": True,
    }
```

---

### Phase 2: LLM Prompt Engineering

Create: `backend/src/services/intelligence/prompts.py`

Do not embed prompts inline in the compiler — they need iteration without touching
business logic.

**Task 2.1 — JSON schema for LLM output**

The LLM must return a single JSON object with this structure:

```json
{
  "overview": "string — what actually happened, not 'this is a conversation about'",
  "conversation_topic": "string — 1-sentence topic label",
  "confidence": 0.0,
  "insights": [
    {
      "insight_type": "schedule_risk|financial_risk|change_order_risk|procurement_risk|field_coordination|client_relationship|decision_needed|task|initiative_signal|process_breakdown|root_cause|sentiment",
      "severity": "critical|high|medium|low|info",
      "summary": "string",
      "strategic_read": "string — what leadership should understand",
      "why_it_matters": "string",
      "recommended_action": "string",
      "watch_items": ["string"],
      "source_message_ids": ["message_id"],
      "confidence": 0.0,
      "target_type": "client_project|internal_initiative"
    }
  ],
  "tasks": [
    {
      "task_text": "string",
      "owner": "string|null",
      "due_date": "YYYY-MM-DD|null",
      "source_message_id": "string",
      "confidence": 0.0,
      "needs_review": false
    }
  ],
  "risks": [
    {
      "risk_title": "string",
      "risk_category": "schedule|cost|cash_flow|subcontractor|owner_client|design|permitting|procurement|quality|system|people",
      "severity": "critical|high|medium|low",
      "evidence": "string — quoted or paraphrased from conversation",
      "likely_impact": "string",
      "recommended_action": "string",
      "confidence": 0.0,
      "needs_review": false
    }
  ],
  "decisions": [
    {
      "decision_text": "string",
      "decision_status": "proposed|decided|blocked|reversed|needs_approval",
      "decider": "string|null",
      "source_message_id": "string",
      "impact": "string",
      "confidence": 0.0
    }
  ],
  "sentiment": {
    "sentiment": "positive|neutral|concerned|frustrated|urgent|conflict",
    "sentiment_reason": "string",
    "people_or_team_involved": ["string"],
    "business_implication": "string",
    "confidence": 0.0
  },
  "initiative_signals": [
    {
      "initiative_name": "string",
      "signal_type": "string",
      "summary": "string",
      "strategic_read": "string",
      "requested_capability": "string|null",
      "pain_point": "string|null",
      "source_message_ids": ["string"],
      "recommended_product_requirement": "string|null"
    }
  ]
}
```

**Task 2.2 — Prompt template**

Store the system prompt as a module-level constant `TEAMS_COMPILER_SYSTEM_PROMPT` in
`prompts.py`. Include the quality bar examples verbatim:

System prompt structure:
```
You are an intelligence compiler for a construction company's internal Teams conversations.
Your job is to extract project intelligence, not summarize chat.

QUALITY BAR:
Good: "This conversation suggests the project is not blocked yet, but the risk is
forming around material delivery and installer sequencing."
Bad: "This document is a Teams direct message conversation discussing project-related topics."

If the project context is known, reference the project by name in the overview.
Return ONLY a valid JSON object matching the schema below. No markdown, no commentary.

RULES:
- Never generate tasks from vague acknowledgment messages ("ok", "sounds good", "thanks")
- Distinguish explicit commitments ("I'll send it by Friday") from casual mentions
- Preserve source_message_id for every extracted item
- Use confidence: 0 and needs_review: true rather than hallucinating details
- Identify internal Alleato initiatives by name: "Alleato AI", "JobPlanner", "Financial workflow"

JSON SCHEMA:
[paste full schema from Task 2.1]
```

Also export a helper:
```python
def build_extraction_messages(
    conversation_text: str,
    project_name: Optional[str],
    chat_name: str,
) -> List[Dict[str, Any]]:
    """Build the messages list for the LLM extraction call."""
    context = f"Project: {project_name}" if project_name else "Project: unknown"
    user_content = f"{context}\nChat: {chat_name}\n\n{conversation_text}"
    return [
        {"role": "system", "content": TEAMS_COMPILER_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
```

---

### Phase 3: Core Compiler Module

Create: `backend/src/services/intelligence/teams_compiler.py`

Imports needed from previous phases:
```python
from .client import extract_with_retry, COMPILER_MODEL_DEFAULT, COMPILER_MODEL_LARGE
from .prompts import build_extraction_messages
from src.services.integrations.microsoft_graph.project_inference import infer_project_id
```

**Task 3.1 — Message parser**

```python
def parse_conversation_messages(content: str) -> list[dict]:
    """
    Parse raw conversation content into structured message objects.

    Returns list of:
    {
        "message_id": str,
        "timestamp": str,  # ISO format
        "sender": str,
        "text": str
    }
    """
```

Parse the `[message:<id>] [YYYY-MM-DD HH:MM:SS] Person Name: text` format.
Handle multi-line messages (text continues on next line with no marker).
Strip `[message:...]` markers. Return empty list if content is malformed.

**Task 3.2 — Conversation normalizer**

```python
def normalize_conversation(doc: dict, messages: list[dict]) -> dict:
    """
    Extract structured conversation metadata from doc + parsed messages.

    Returns:
    {
        "chat_name": str,          # from doc title or content header
        "date": str,               # YYYY-MM-DD
        "participants": list[str], # unique sender names
        "message_count": int,
        "substantive_length": int, # from _substantive_text_length()
        "conversation_text": str,  # clean text for LLM input
        "title_signals": list[str] # project signals from title
    }
    """
```

Extract the `[Teams Direct Message Conversation: <name>]` header.
Participants are unique sender names from parsed messages.
`conversation_text` should be a clean version suitable for LLM consumption:
`"{sender} ({timestamp}): {text}\n"` lines, no `[message:...]` markers.

Copy `_substantive_text_length()` from `embed.py:130-146` verbatim into
`teams_compiler.py` — do not import it (it's a private helper in embed.py).

**Task 3.3 — Project attribution with override logic**

```python
def attribute_project(
    supabase,
    doc_id: str,
    normalized: dict,
    existing_project_id: int | None
) -> dict:
    """
    Run multi-strategy project attribution.

    Returns:
    {
        "project_id": int | None,
        "project_name": str | None,
        "confidence": float,
        "method": str,
        "evidence_terms": list[str],
        "candidates": list[dict],
        "needs_review": bool,
        "is_correction": bool  # True if overriding existing project_id
    }
    """
```

Strategy order (highest confidence wins):
1. **Title alias match** — check `normalized["title_signals"]` against `projects.aliases` and
   `projects.name`. Confidence 0.90–0.95. This must override a conflicting existing
   `project_id` when confidence ≥ 0.90.
2. **Existing inference** — call `infer_project_id()` from `project_inference.py`.
3. **Fallback** — return `needs_review=True` with all candidate projects.

Auto-assign rules:
- `confidence >= 0.85` AND no conflicting existing project → auto-assign to
  `document_metadata.project_id`
- `is_correction=True` → write to `document_attribution_candidates` with
  `status='pending_review'` even if confidence is high, so the correction is visible
- Multiple candidates → write all to `document_attribution_candidates` with
  `status='pending_review'`

**Task 3.4 — LLM extraction (single call, structured JSON output)**

```python
def extract_intelligence(
    conversation_text: str,
    normalized: dict,
    attribution: dict,
    model: str = COMPILER_MODEL_DEFAULT
) -> dict:
    """
    Single LLM call that extracts all intelligence in one pass.
    Uses extract_with_retry() from client.py.

    Returns structured dict with keys:
    - overview, conversation_topic, confidence
    - insights, tasks, risks, decisions, sentiment, initiative_signals
    """
```

Choose model based on content size:
```python
token_estimate = len(conversation_text) // 4
model = COMPILER_MODEL_LARGE if token_estimate > 2000 else COMPILER_MODEL_DEFAULT
```

Do NOT use separate LLM calls per output type — single call only. This is the core
fix for the generic pipeline's non-JSON failure rate.

Call via `build_extraction_messages()` from `prompts.py`, then `extract_with_retry()`.

**Task 3.5 — Output writers**

```python
def write_overview(supabase, doc_id: str, overview: str, attribution: dict) -> None:
    """Update document_metadata with overview and high-confidence project attribution."""

def write_attribution_candidates(supabase, doc_id: str, candidates: list[dict]) -> None:
    """Write uncertain attributions to document_attribution_candidates."""

def write_insight_cards(supabase, doc_id: str, insights: list[dict], project_id: int | None) -> None:
    """Write high-confidence insights to project_insights."""

def write_structured_insights(supabase, doc_id: str, risks_and_decisions: list[dict], project_id: int | None) -> None:
    """Write risks and decisions to insights table."""

def write_tasks(supabase, doc_id: str, tasks: list[dict], project_id: int | None) -> None:
    """Write action items to tasks table (source_system='microsoft_teams')."""
```

Write rules per output type:

| Output | Auto-write condition |
|--------|---------------------|
| `overview` | Always safe |
| `project_id` on doc | `attribution.confidence >= 0.85` AND not a correction |
| `project_insights` | `insight.confidence >= 0.8` AND clear project attribution |
| `insights` (risks/decisions) | `confidence >= 0.7` AND source evidence preserved |
| `tasks` | Owner is identifiable AND not vague chatter |
| Correction candidate | Always write to `document_attribution_candidates` |
| Low-confidence attribution | Write to `document_attribution_candidates` as `pending_review` |

**Task 3.6 — Single-row compile function**

```python
def compile_conversation(supabase, doc_id: str) -> dict:
    """
    Compile a single teams_dm_conversation document.

    Returns:
    {
        "doc_id": str,
        "status": "success" | "skipped" | "error",
        "overview_written": bool,
        "project_assigned": bool,
        "insight_cards_written": int,
        "structured_insights_written": int,
        "tasks_written": int,
        "attribution_candidates_written": int,
        "error": str | None
    }
    """
```

Flow:
1. Fetch doc from `document_metadata`
2. Check `_substantive_text_length(content) >= 200` — return `status="skipped"` if below,
   update `document_metadata.status = 'skipped_low_content'`
3. Parse messages, normalize conversation
4. Run attribution
5. Run LLM extraction — if `_extraction_failed` in result, set status `'error'` and return
6. Write all outputs
7. Update `document_metadata.status = 'compiled'`
8. On any exception: update `status = 'error'`, log with doc_id + stage + error, return `status="error"`

**Task 3.7 — Batch runner**

```python
def run_compiler_batch(
    supabase,
    batch_size: int = 25,
    max_retries: int = 2,
    target_status: list[str] = None  # default: ["raw_ingested", "embedded"]
) -> dict:
    """
    Process a batch of teams_dm_conversation documents.

    Returns:
    {
        "total_processed": int,
        "succeeded": int,
        "failed": int,
        "skipped": int,
        "overview_written": int,
        "insight_cards_written": int,
        "tasks_written": int,
        "attribution_candidates_written": int,
        "failed_doc_ids": list[str],
        "processing_time_ms": int
    }
    """
```

Query:
```sql
SELECT id FROM document_metadata
WHERE type = 'teams_dm_conversation'
  AND (overview IS NULL OR overview = '')
  AND status NOT IN ('error', 'skipped_low_content', 'needs_review')
ORDER BY date DESC NULLS LAST
LIMIT {batch_size}
```

Process with `max_retries` per row. Never let one failed row stop the batch.
Log each failure with `doc_id`, `stage`, and error message.

---

### Phase 4: API Endpoint

Add routes to: **`backend/src/api/main.py`** — all routes in this backend are defined
inline in this file. Do not create a separate router module; register routes directly
in `main.py` following the existing `@app.post` / `@app.get` pattern (see line ~455
for the `graph_sync_endpoint` example).

**Task 4.1 — Batch trigger endpoint**

```
POST /api/intelligence/teams-compiler/run
```

Add near the other `/api/intelligence/` endpoints if any exist, otherwise after the
graph sync endpoints.

Request body (Pydantic model):
```python
class TeamsCompilerRunRequest(BaseModel):
    batch_size: int = 25
    dry_run: bool = False
```

Response:
```json
{
  "job_id": "...",
  "status": "completed",
  "results": { ... }
}
```

Implementation:
```python
@app.post("/api/intelligence/teams-compiler/run")
async def run_teams_compiler(
    request: TeamsCompilerRunRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    from src.services.intelligence.teams_compiler import run_compiler_batch
    from src.services.supabase_helpers import get_supabase_client
    import uuid

    job_id = str(uuid.uuid4())
    if request.dry_run:
        return {"job_id": job_id, "status": "dry_run", "results": {}}

    sb = get_supabase_client()
    results = run_compiler_batch(sb, batch_size=request.batch_size)
    return {"job_id": job_id, "status": "completed", "results": results}
```

**Task 4.2 — Monitoring endpoint**

```
GET /api/intelligence/teams-compiler/status
```

Response must include all monitoring metrics:
- `total_teams_dm_rows`
- `rows_with_overview`
- `rows_missing_overview`
- `rows_with_project_id`
- `rows_with_attribution_candidates`
- `rows_with_insight_cards`
- `rows_failed_compiler`
- `last_successful_run`
- `avg_processing_time_ms`

Implementation — use the `get_teams_compiler_status` RPC defined in Task 4.3:
```python
@app.get("/api/intelligence/teams-compiler/status")
async def get_teams_compiler_status() -> Dict[str, Any]:
    from src.services.supabase_helpers import get_supabase_client
    sb = get_supabase_client()
    result = sb.rpc("get_teams_compiler_status").execute()
    return result.data or {}
```

**Task 4.3 — Supabase RPC function for monitoring metrics**

Create migration: `supabase/migrations/{timestamp}_add_teams_compiler_status_fn.sql`

```sql
CREATE OR REPLACE FUNCTION public.get_teams_compiler_status()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'total_teams_dm_rows',
      (SELECT COUNT(*) FROM document_metadata WHERE type = 'teams_dm_conversation'),
    'rows_with_overview',
      (SELECT COUNT(*) FROM document_metadata
       WHERE type = 'teams_dm_conversation' AND overview IS NOT NULL AND overview != ''),
    'rows_missing_overview',
      (SELECT COUNT(*) FROM document_metadata
       WHERE type = 'teams_dm_conversation' AND (overview IS NULL OR overview = '')),
    'rows_with_project_id',
      (SELECT COUNT(*) FROM document_metadata
       WHERE type = 'teams_dm_conversation' AND project_id IS NOT NULL),
    'rows_with_attribution_candidates',
      (SELECT COUNT(DISTINCT source_document_id) FROM document_attribution_candidates),
    'rows_with_insight_cards',
      (SELECT COUNT(DISTINCT source_document_ids[1]) FROM project_insights
       WHERE source_document_ids IS NOT NULL AND array_length(source_document_ids, 1) > 0),
    'rows_failed_compiler',
      (SELECT COUNT(*) FROM document_metadata
       WHERE type = 'teams_dm_conversation' AND status = 'error'),
    'rows_compiled',
      (SELECT COUNT(*) FROM document_metadata
       WHERE type = 'teams_dm_conversation' AND status = 'compiled'),
    'last_successful_run',
      (SELECT MAX(updated_at) FROM document_metadata
       WHERE type = 'teams_dm_conversation' AND status = 'compiled'),
    'avg_processing_time_ms', NULL
  );
$$;
```

Run migration: `cd frontend && npx supabase db push`

---

### Phase 5: Attribution Correction Backfill

**Task 5.1 — Correction script for known wrong attributions**

Create: `scripts/fix-teams-attribution.py`

This script corrects the known Ulta Fresno misattribution (12 rows titled
`"Teams DM Conversation: Ulta Fresno"` assigned to Ulta Dallas / project 762
instead of Ulta Beauty Fresno / project 761).

```python
# Query: document_metadata WHERE title ILIKE '%Ulta Fresno%' AND project_id = 762
# For each row: update project_id = 761, project = 'Ulta Beauty Fresno'
# Write correction record to document_attribution_candidates
```

**Do not hard-code project IDs without verifying them first:**
```sql
SELECT id, name, aliases FROM projects WHERE name ILIKE '%ulta%';
```

**Task 5.2 — Alias-based attribution correction logic**

Add `title_override` method to `attribute_project()` (in Phase 3, Task 3.3):
- When `doc.title` contains a direct project alias match (from `projects.aliases`),
  flag as potential correction if `doc.project_id` differs.
- Write to `document_attribution_candidates` with `status='pending_review'` and
  `attribution_method='title_override'`.
- Only auto-apply if confidence ≥ 0.90 AND no other conflicting signals.

---

### Phase 6: Integration and Testing

**Task 6.1 — Single-row smoke test**

After implementing, run a single-row test from the `backend/` directory:

```python
# From backend/ directory
python -c "
import sys
sys.path.insert(0, 'src')
from services.intelligence.teams_compiler import compile_conversation
from services.supabase_helpers import get_supabase_client

sb = get_supabase_client()
# Get one row with content
row = sb.table('document_metadata')\
    .select('id')\
    .eq('type', 'teams_dm_conversation')\
    .not_.is_('content', 'null')\
    .limit(1)\
    .execute()
if row.data:
    import asyncio
    result = compile_conversation(sb, row.data[0]['id'])
    print(result)
"
```

Verify:
- No exception raised
- `overview_written: True`
- `document_metadata.status = 'compiled'` for the test row
- `document_metadata.overview` is not a generic template phrase

**Task 6.2 — Batch test (25 rows)**

```bash
curl -X POST http://localhost:8051/api/intelligence/teams-compiler/run \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 25}'
```

Verify:
- Returns within 3 minutes
- `succeeded >= 20` (allow for low-content skips)
- `failed == 0` (or all failures have logged errors, not silent)
- No unhandled exceptions in server logs

**Task 6.3 — Attribution verification**

```sql
-- Check high-confidence auto-assignments
SELECT id, title, project_id, project, status, tags
FROM document_metadata
WHERE type = 'teams_dm_conversation'
  AND project_id IS NOT NULL
  AND status = 'compiled'
LIMIT 20;

-- Check attribution candidates
SELECT source_document_id, candidate_project_name, confidence, attribution_method, status
FROM document_attribution_candidates
ORDER BY created_at DESC
LIMIT 20;
```

**Task 6.4 — Quality bar check**

Read 5 generated overviews from `document_metadata.overview` where `status='compiled'`.
Each should:
1. Not start with "This document is a Teams..."
2. Describe what actually happened in operational terms
3. If project context is known, reference the project by name
4. Be 2–5 sentences (not a single generic sentence)

**Task 6.5 — Update embed.py status query**

Edit `backend/src/services/integrations/microsoft_graph/embed.py:317`:

```python
# Before:
.in_("status", ["raw_ingested", "segmented"])

# After:
.in_("status", ["raw_ingested", "segmented", "compiled"])
```

This ensures the embedding pipeline picks up compiled rows and re-embeds them with
the enriched `overview` in the chunk content prefix.

---

## Validation Loop

Run these gates in order before closing the implementation.

**Level 1 — Syntax and imports**
```bash
cd backend
python -m py_compile src/services/intelligence/client.py
python -m py_compile src/services/intelligence/prompts.py
python -m py_compile src/services/intelligence/teams_compiler.py
```

**Level 2 — Single-row functional test**
Run Task 6.1. Must produce `overview_written: True` with non-template content.

**Level 3 — Integration: batch + monitoring**
1. Run Task 6.2 curl command against `localhost:8051`
2. Run Task 6.3 attribution SQL queries — verify at least 1 candidate row exists
3. Hit `GET localhost:8051/api/intelligence/teams-compiler/status` — verify all metric keys present

**Level 4 — Quality bar**
Run Task 6.4. Read 5 overviews. Reject any that are generic. Recheck prompt if needed.

---

## Known Pitfalls & Prevention

### 1. project_id Type Mismatch (INTEGER vs BIGINT)

**Risk:** `document_metadata.project_id` is `bigint`, `project_insights.project_id`
is `integer`, `projects.id` is `bigint`. Python `int` works for both, but ensure you
never pass a `str` or UUID.

**Prevention:** Always cast: `int(project_id)` before writing to any table.

**Detection:** `select project_id, pg_typeof(project_id) from document_metadata limit 1`

### 2. LLM Non-JSON Returns (The Core Problem)

**Root cause:** The generic pipeline fails silently when LLM returns non-JSON.
The fallback preserves overview but drops structured outputs.

**Prevention:** Use `extract_with_retry()` from `client.py`. AI Gateway does NOT
support `response_format={"type": "json_object"}` — only apply it for direct OpenAI.
Never let a JSON parse failure become a silent success — always log and set
`_extraction_failed`.

**Detection:** Check `document_metadata.status` — rows with `status='error'` after
compile indicate JSON extraction failures.

### 3. False Stale Attribution Preserved

**Root cause:** The sync pipeline (`teams.py:406`) preserves `existing_project_id`
and passes it to `infer_project_id()`. The existing inference uses it as a signal
rather than overriding it. This caused the Ulta Fresno → Ulta Dallas misattribution.

**Prevention:** In `attribute_project()`, always check title signals first. If title
contains a direct alias match at confidence ≥ 0.90, flag `is_correction=True` and
write to `document_attribution_candidates` even if the existing assignment looks fine.

**Detection:** `SELECT id, title, project FROM document_metadata WHERE title ILIKE '%Ulta Fresno%'`

### 4. Module-Level Server Client Initialization

**Rule (from CLAUDE.md Gate 17):** Never initialize an OpenAI client at module level
in the backend. Use a factory function or lazy singleton.

**Prevention:** `_client(provider)` in `client.py` is only called at request time,
inside the provider loop. Never do `client = OpenAI(...)` at module top level.

### 5. Missing force-dynamic for Next.js Pages

This feature is backend-only (Python FastAPI). No Next.js pages are created.
Gate 17 Pattern B does not apply here.

### 6. Embedding Pipeline Conflict

The embedding pipeline (`embed.py`) processes rows with `status IN ("raw_ingested", "segmented")`.
After the compiler writes `status="compiled"`, the embed pipeline will not re-process
the row unless Task 6.5 is applied.

**Prevention:** Task 6.5 adds `"compiled"` to the embed pipeline's target statuses.
Do not forget this step — it is what causes overview text to be included in embeddings.

### 7. Batch Concurrency

Do not run the compiler concurrently with the sync pipeline on the same row.
The sync pipeline appends messages to existing day-doc rows. If the compiler is
reading the same row simultaneously, you get a partial conversation.

**Prevention:** The batch runner queries by `status NOT IN ('error', 'skipped_low_content', 'needs_review')`.
After the sync pipeline finishes appending, it leaves rows in `raw_ingested` status.
The compiler can safely process `raw_ingested` rows because the sync writes full day-docs
(one document per day-per-chat). Do not run both in the same process simultaneously.

### 8. task.source_chunk_id Broken FK

`tasks.source_chunk_id` has a FK pointing to `documents.id` (a UUID table), but
`document_chunks.chunk_id` is a text field. **Leave `source_chunk_id` NULL** when
writing tasks from the compiler. Use `metadata_id` (FK to `document_metadata.id`)
instead.

### 9. Insight Cards Without Project Attribution

`project_insights.project_id` is NOT NULL. Do not write to `project_insights` if
project attribution failed or is uncertain. Write to `insights` instead, which
allows NULL `project_id`.

---

## Validation Checklist

Before marking this PRP's implementation complete:

- [ ] `document_attribution_candidates` table exists in production
- [ ] `get_teams_compiler_status()` RPC function exists in production
- [ ] Compiler processes a single row without exception
- [ ] `document_metadata.overview` is populated with meaningful content (not template text)
- [ ] Batch of 25 runs with 0 hard failures (Task 6.2 against port 8051)
- [ ] Attribution candidates written for any multi-project or uncertain rows
- [ ] `tasks.source_system = 'microsoft_teams'` for all tasks written by compiler
- [ ] `project_insights` rows have `int(project_id)` cast correctly
- [ ] LLM JSON parse failures are caught and logged, never silent
- [ ] `document_metadata.status = 'compiled'` after successful compile
- [ ] Embedding pipeline picks up `compiled` status rows (Task 6.5 applied to embed.py)
- [ ] Ulta Fresno misattribution correction script runs without error
- [ ] Monitoring endpoint returns all required metrics
- [ ] No module-level `OpenAI()` initialization (factory function only)

---

## Open Questions

From the requirements document — decisions needed before or during implementation:

1. **Compilation schedule:** Run daily after the sync pipeline, or on-demand via API?
   Recommended V1: on-demand batch via API endpoint, scheduled via existing cron
   infrastructure once batch runs stably.

2. **Low-volume chat exclusion:** Should high-volume but low-value chats (e.g., pure
   social or logistics chats below a quality threshold) be automatically excluded?
   Recommended: add a `min_insight_signal_words` threshold check before LLM call.
   Skip if conversation has < N substantive content words.

3. **Private/sensitive messages:** The requirements doc asks how to permission sensitive
   content in the assistant. For V1: all compiled conversations inherit the existing
   `access_level` from `document_metadata` (default `'team'`). The semantic search
   tool already gates comms sources behind `isAdmin`. No additional permissioning needed
   in the compiler.

4. **Internal initiatives table:** Should `initiative_signals` be written to `projects`,
   `initiatives`, or a new table? Recommended V1: write to `insights` table with
   `type='initiative_signal'` and `details.initiative_name` set. This keeps the storage
   in the existing system without requiring a new table or FK decisions.

5. **Feedback loop:** How should human attribution corrections feed back into future
   compiler runs? Recommended V1: when a `document_attribution_candidates` row is
   approved/rejected, update the `ProjectAssigner._project_cache` OR add the correction
   to a `project_aliases` table. Defer this to Phase 2.

6. **Card vs document:** Should the compiler produce one insight card per conversation
   or one per project signal? Recommended: one card per distinct project signal
   (insight type × project combination). A single Teams conversation about two projects
   should produce separate cards for each.

## Confidence Score: 9/10

**What gives confidence:**
- Full requirements document available with precise field names
- Database schema fully queried and documented
- Existing pipeline code fully analyzed (entry points, data formats, patterns)
- Known failure modes (JSON non-return, stale attribution, type mismatches) documented
- Real-world attribution correction case documented with specific evidence
- AI Gateway pattern verified against actual `llm.py` implementation (provider loop, no AsyncOpenAI)
- AI Gateway `response_format` caveat documented (line 114 in llm.py)
- Backend port verified as 8051 (not 8000)
- Supabase client import path verified: `from src.services.supabase_helpers import get_supabase_client`
- FastAPI router pattern verified: routes are inline in `backend/src/api/main.py`

**What creates uncertainty:**
- The `compile_conversation` function is defined as sync in the flow but the batch runner
  is async — decide at implementation time whether to use `asyncio.run()` wrapper or
  make the entire chain sync (matching the existing pipeline pattern in `llm.py`)
- The `embed.py` status query update (Task 6.5) is a cross-cutting change; read
  `embed.py` in full before touching it to avoid breaking the existing embedding flow

**What to verify before writing the first line of code:**

```bash
# 1. Confirm intelligence directory doesn't already exist
ls backend/src/services/intelligence/ 2>/dev/null || echo "directory does not exist — create it"

# 2. Confirm supabase client getter
grep -n "def get_supabase_client" backend/src/services/supabase_helpers.py

# 3. Confirm embed.py status query line
grep -n "in_.*status.*raw_ingested" backend/src/services/integrations/microsoft_graph/embed.py

# 4. Confirm FastAPI app object name in main.py
grep -n "^app = " backend/src/api/main.py

# 5. Confirm backend port
grep -n "localhost:" backend/src/api/main.py | head -3
```
