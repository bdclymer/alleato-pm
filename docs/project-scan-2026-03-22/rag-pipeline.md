# RAG Pipeline — Alleato-PM

> Generated: 2026-03-22 | Source: `backend/src/services/pipeline/`, `backend/src/services/ingestion/`

---

## Overview

The RAG (Retrieval-Augmented Generation) pipeline ingests documents and meeting transcripts into Supabase pgvector, enabling semantic search for the AI assistant. It runs as a **3-stage Python backend pipeline** triggered per document via `metadata_id` (a UUID referencing `document_metadata`).

---

## Pipeline Entry Point

```
POST /api/documents/trigger-pipeline
  → backend/src/services/pipeline/orchestrator.py → run_full_pipeline(metadata_id)
```

**Input:** `metadata_id` (UUID in `document_metadata` table)
**Tracking:** `fireflies_ingestion_jobs` table (stage: `chunked` → `embedded` → `done` / `error`)

---

## Stage 1: Parser (Document Type Routing)

The orchestrator inspects `document_metadata` to select the correct parser:

```
document_metadata row
  ├── source == "fireflies"
  │   OR category in {"meeting", "transcript", "meeting_transcript"}
  │   └──► Meeting Parser (fireflies_pipeline.py)
  │
  ├── file_name ends with .pdf / .docx / .doc
  │   OR non-meeting category
  │   └──► Generic Document Parser (document_parser.py)
  │
  └── category in {"financial", "budget", "estimate"} AND
      file_name ends with .csv / .tsv / .xls / .xlsx
      └──► Financial Parser (financial_parser.py) — tabular only
```

### Meeting Parser (`ingestion/fireflies_pipeline.py`)
Parses Fireflies.ai markdown transcript format:
- Extracts `[HH:MM] **Speaker**: text` lines via regex
- Parses rich Fireflies sections: Summary, Short Summary, Action Items, Shorthand Bullet, Outline, Bullet Gist, Gist, Notes topics
- Produces `ParsedTranscript` with `transcript_segments`, `rich_sections`, `notes_topics`, `attendees`, `overview`
- Calls `llm.segment_transcript()` (GPT-4o-mini) to divide transcript into semantic segments
- Writes segments to `meeting_segments` table

### Generic Document Parser (`document_parser.py`)
Handles PDFs, DOCX, and other non-meeting documents.

### Financial Parser (`financial_parser.py`)
Handles tabular financial data (CSV/TSV/Excel). Not used for PDF/DOCX financial docs — those go through the generic parser.

---

## Stage 2: Embedder (`pipeline/embedder.py`)

Reads `meeting_segments`, creates overlapping chunks, batch-embeds everything, and stores results.

### Chunking Strategy

| Parameter | Value |
|-----------|-------|
| Chunk target | 3,000 characters (~750 tokens) |
| Overlap | 500 characters (~125 tokens) |
| Split boundary | Sentence boundaries (`[.!?]` + uppercase) |

**Chunk types produced per document:**

| `doc_type` | Description |
|------------|-------------|
| `chunk` | Overlapping transcript line chunks (speaker-prefixed) |
| `meeting_summary` | Full meeting-level summary |
| `segment_summary` | Per-segment summary chunk |
| `section_summary` | Fireflies "Summary" section |
| `section_short_summary` | Fireflies "Short Summary" |
| `section_action_items` | Fireflies "Action Items" |
| `section_shorthand` | Fireflies "Shorthand Bullet" |
| `section_outline` | Fireflies "Outline" |
| `section_bullet_gist` | Fireflies "Bullet Gist" |
| `section_gist` | Fireflies "Gist" |
| `notes_topic` | Individual Notes sub-heading chunks |

Each chunk prefixed with `[Meeting Title] Section Name:` for better RAG retrieval.

### Embedding Model

| Scope | Model | Dimensions |
|-------|-------|------------|
| **Pipeline (primary)** | `text-embedding-3-large` | **3072** |
| Segment summaries | `text-embedding-3-large` | 3072 |
| AI memories (`ai_memories`) | `text-embedding-3-large` | 3072 |
| Operational tools (`match_memories`, `company_knowledge`) | `text-embedding-3-large` | 3072 |
| Conversation memory summary | `text-embedding-3-small` | 1536 |

> **Important:** The pipeline uses `text-embedding-3-large` at **3072 dimensions** (stored as `halfvec(3072)`). Do NOT use `text-embedding-3-small` for queries against pipeline-embedded content — dimensions must match.

### Storage

Chunks are upserted into the **`documents` table** (not `document_chunks`):

```python
{
  "file_id": metadata_id,       # FK to document_metadata
  "content": chunk.content,
  "embedding": [...],            # halfvec(3072)
  "source": "fireflies",
  "file_date": started_at,
  "project_id": project_id,
  "processing_status": "complete",
  "metadata": {
    "doc_type": "chunk",
    "chunk_index": 0,
    "segment_index": 1,
    "segment_id": "uuid",
    "content_hash": "sha256[:16]",
    "participants": [...]
  }
}
```

Duplicate detection: content-hash map loaded once per `metadata_id` to avoid per-chunk SELECTs.

Segment summary embeddings written back to `meeting_segments.summary_embedding`.

---

## Stage 3: Extractor (`pipeline/extractor.py`)

Reads all segments, calls GPT-4o-mini to normalize and deduplicate extracted items, then stores structured data.

**Inputs:** raw decisions, risks, tasks from all `meeting_segments` + Notes/Action Items sections
**LLM call:** `gpt-4o-mini` with JSON mode, temperature 0.3

**Outputs stored:**

| Table | Content |
|-------|---------|
| `insights` | Normalized decisions, risks, opportunities (type column distinguishes) |
| `tasks` | Action items with assignee, email, due date, priority |

**Priority logic:**
- `urgent` — health, safety, inspection, compliance, hard deadline
- `high` — financial impact > $10k or blocking work
- `medium` — standard follow-ups
- `low` — nice-to-haves

**Due date inference:** Relative dates calculated from meeting date ("by Friday" → next Friday, "ASAP" → +2 business days).

---

## LLM Models Used in Pipeline

| Stage | Model | Purpose |
|-------|-------|---------|
| Stage 1 (segmentation) | `gpt-4o-mini` | Semantic segment detection |
| Stage 2 (embedding) | `text-embedding-3-large` | Vector embeddings |
| Stage 3 (extraction) | `gpt-4o-mini` | Normalize decisions/risks/tasks/opportunities |
| Digest generation | `gpt-4o-mini` | Executive post-meeting digest |

All LLM calls use direct `openai.OpenAI(api_key=OPENAI_API_KEY)` — **not** through AI Gateway (backend uses direct key).

---

## Error Handling & Retry

- Transient DB errors (statement timeout, 502 Bad Gateway, `57014`) trigger exponential backoff retry
- Default: 2 retries (`PIPELINE_TRANSIENT_RETRIES` env var)
- Backoff: 2^(attempt+1) seconds
- On final failure: `fireflies_ingestion_jobs.stage = "error"`, exception re-raised

---

## Fireflies-Specific Ingestion (`ingestion/fireflies_pipeline.py`)

Fireflies transcripts are the **primary** content source (all meetings). The pipeline handles the Fireflies markdown format specifically:

```
[HH:MM] **Speaker Name**: transcript text
## Section Name
Section content...
```

**Fireflies sections parsed:** Summary, Short Summary, Action Items, Shorthand Bullet, Outline, Bullet Gist, Gist, Notes (with sub-topics)

The `FirefliesIngestionPipeline` class is also instantiated statelessly in Stage 2 and 3 for content re-parsing.

---

## Database Tables Involved

| Table | Role |
|-------|------|
| `document_metadata` | Pipeline input — UUID per document, holds content/title/participants/status |
| `meeting_segments` | Stage 1 output — semantic segments with decisions/risks/tasks per segment |
| `documents` | Stage 2 output — all chunks with vector embeddings |
| `fireflies_ingestion_jobs` | Job tracking — stage progression (`chunked` → `embedded` → `done` / `error`) |
| `insights` | Stage 3 output — decisions, risks, opportunities |
| `tasks` | Stage 3 output — action items with assignee + due date |

---

## pgvector Search Functions (Query Time)

Used by the AI orchestrator in `frontend/src/lib/ai/orchestrator.ts` + tools:

| Function | Embedding Model Required | Use Case |
|----------|--------------------------|----------|
| `match_documents` | `text-embedding-3-large` (3072-dim) | General document semantic search |
| `match_meeting_chunks_with_project` | `text-embedding-3-large` (3072-dim) | Project-scoped meeting search |
| `match_memories` | `text-embedding-3-large` (3072-dim) | AI memory retrieval |
| `hybrid_search` | `text-embedding-3-large` (3072-dim) | Semantic + full-text combined |
| `full_text_search_meetings` | N/A (full-text only) | Keyword meeting search |
| `match_crawled_pages` | Varies | Procore docs search |

---

## Frontend RAG API Routes

| Route | Description |
|-------|-------------|
| `POST /api/documents/upload` | Upload document to Vercel Blob + create `document_metadata` |
| `POST /api/documents/trigger-pipeline` | Trigger backend pipeline for a `metadata_id` |
| `POST /api/documents/status` | Check pipeline processing status |
| `POST /api/rag-chat` | RAG-enhanced chat (Next.js route handler) |
| `POST /api/rag-chatkit` | OpenAI ChatKit-compatible endpoint (proxied to backend) |
| `POST /api/procore-docs/ask` | Query Procore documentation RAG |
| `GET /api/knowledge` | Knowledge base management |

---

## Corrections to Prior Documentation

The following was **inaccurate** in `architecture-backend.md`:

| Was documented | Actual |
|----------------|--------|
| Embedding model: `text-embedding-3-small (1536-dim)` | `text-embedding-3-large (3072-dim)` |
| Simple 4-step: extract → chunk → embed → store | 3-stage pipeline with 3 parser variants + extractor |
| Chunks stored in `document_chunks` | Chunks stored in `documents` table |
| pypdf / python-docx as primary parsers | Fireflies markdown parser is primary; pypdf/docx in generic parser |
| No mention of `meeting_segments`, `insights`, `tasks` tables | All three are central to the pipeline |
| No mention of structured extraction (decisions/risks/tasks/opportunities) | Stage 3 extracts all of these |
