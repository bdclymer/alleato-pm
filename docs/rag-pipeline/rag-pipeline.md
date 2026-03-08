# RAG Pipeline Documentation

The RAG (Retrieval-Augmented Generation) pipeline processes Fireflies meeting transcripts into
searchable vector embeddings and structured data. It runs entirely inside the Python FastAPI
backend — no Cloudflare Workers required.

---

## Architecture Overview

```
[Fireflies Markdown] → document_metadata INSERT
                              │
                     DB trigger (pg_net)
                              │
                              ▼
              POST /api/pipeline/process
                              │
                    FastAPI BackgroundTask
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
          Stage 1          Stage 2         Stage 3
          Parser           Embedder        Extractor
              │               │               │
    meeting_segments    documents table   decisions
                                          risks
                                          tasks
                                          opportunities
```

---

## Trigger Flow

1. A row is INSERTed into `document_metadata` (e.g. by the ingest endpoint).
2. The Supabase DB trigger `trg_enqueue_document_metadata_rag_job` fires.
3. The trigger creates a `fireflies_ingestion_jobs` row with `stage = raw_ingested`.
4. If `app.pipeline_url` is set, pg_net immediately POSTs `{"metadataId": "<id>"}` to the
   FastAPI backend — no polling delay.
5. FastAPI runs all three stages in a `BackgroundTask` and updates the job stage as it progresses.

### Configuring the trigger URL

The trigger reads its URL from the `pipeline_config` table (migration `20260227000002`).
`ALTER DATABASE` is not used because Supabase cloud SQL Editor does not have superuser privileges.

**Step 1 — Run the migration** (paste full contents of `20260227000002_pipeline_config_table.sql` in the Supabase SQL Editor).

**Step 2 — Set the URL:**

```sql
-- Production (Render / Railway / etc.)
UPDATE public.pipeline_config
SET value = 'https://your-backend.com/api/pipeline/process'
WHERE key = 'pipeline_url';

-- Local development (Docker)
UPDATE public.pipeline_config
SET value = 'http://host.docker.internal:8051/api/pipeline/process'
WHERE key = 'pipeline_url';
```

The trigger is a no-op when `pipeline_url` is empty — documents must then be processed
manually via `POST /api/pipeline/process`.

---

## Pipeline Stages

### Stage 1 — Parser (`backend/src/services/pipeline/parser.py`)

**Input:** `document_metadata.id` (UUID)

**What it does:**
- Fetches the raw Fireflies markdown from `document_metadata.content`
- Parses it with `FirefliesIngestionPipeline.parse_markdown()` (extracts transcript lines, participants, metadata)
- Calls `gpt-4o-mini` to generate a 3–5 paragraph **meeting summary**
- Calls `gpt-4o-mini` with JSON mode to **semantically segment** the transcript into 10–50 line topic blocks

**Output:**
- `meeting_segments` rows (one per segment) with title, start/end indices, summary, decisions, risks, tasks
- `document_metadata.overview` updated with the generated summary
- `document_metadata.status = "segmented"`
- `fireflies_ingestion_jobs.stage = "segmented"`

---

### Stage 2 — Embedder (`backend/src/services/pipeline/embedder.py`)

**Input:** `document_metadata.id` (UUID)

**What it does:**
- Fetches segments from `meeting_segments`
- Re-parses the transcript to get indexed lines for precise chunking
- Creates overlapping text chunks (≈3000 chars with 500-char overlap) per segment
- Adds meeting-level summary chunk and per-segment summary chunks
- Batch-embeds all chunks with `text-embedding-3-small` (1536 dimensions)
- Embeds segment summaries and writes them back to `meeting_segments.summary_embedding`
- Stores all chunks in the `documents` table with metadata including content hash for deduplication

**Output:**
- `documents` rows (one per chunk) with `embedding`, `file_id`, `source = "fireflies"`
- `meeting_segments.summary_embedding` updated for each segment
- `document_metadata.status = "embedded"`
- `fireflies_ingestion_jobs.stage = "embedded"` (via `"chunked"` → `"embedded"`)

---

### Stage 3 — Extractor (`backend/src/services/pipeline/extractor.py`)

**Input:** `document_metadata.id` (UUID)

**What it does:**
- Collects raw decisions, risks, and tasks from all `meeting_segments`
- Adds action items from `document_metadata.action_items`
- Calls `gpt-4o-mini` with JSON mode to normalize, deduplicate, add context, and **identify opportunities**
- Batch-embeds all structured item descriptions
- Upserts to `decisions`, `risks`, `tasks`, and `opportunities` tables (idempotent on `metadata_id,description`)

**Output:**
- Rows in `decisions`, `risks`, `tasks`, `opportunities` with embeddings
- `document_metadata.status = "complete"`
- `fireflies_ingestion_jobs.stage = "done"`

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/services/pipeline/__init__.py` | Package entry — exports `run_full_pipeline` |
| `backend/src/services/pipeline/models.py` | Shared dataclasses (`TranscriptLine`, `MeetingSegment`, `DocumentChunk`, `StructuredData`, etc.) |
| `backend/src/services/pipeline/llm.py` | OpenAI helpers — `batch_embed`, `generate_meeting_summary`, `segment_transcript`, `extract_structured_data` |
| `backend/src/services/pipeline/parser.py` | Stage 1 |
| `backend/src/services/pipeline/embedder.py` | Stage 2 |
| `backend/src/services/pipeline/extractor.py` | Stage 3 |
| `backend/src/services/pipeline/orchestrator.py` | Chains all 3 stages; marks job `error` on failure |
| `backend/src/api/main.py` | `POST /api/pipeline/process` endpoint |
| `supabase/migrations/20260227000001_auto_trigger_pipeline_on_document_insert.sql` | DB trigger + `net.http_post` call |
| `supabase/migrations/20260227000002_pipeline_config_table.sql` | `pipeline_config` key-value table; updated trigger to read URL from table instead of `current_setting()` |

---

## Database Tables

| Table | Written by | Purpose |
|-------|-----------|---------|
| `document_metadata` | Ingest endpoint | Source of truth — raw content, title, participants |
| `fireflies_ingestion_jobs` | Trigger + each stage | Job tracking (`raw_ingested → segmented → chunked → embedded → done / error`) |
| `meeting_segments` | Parser (Stage 1) | Semantic segments with LLM-extracted decisions/risks/tasks |
| `documents` | Embedder (Stage 2) | Chunked content with pgvector embeddings for similarity search |
| `decisions` | Extractor (Stage 3) | Normalized decisions with embeddings |
| `risks` | Extractor (Stage 3) | Normalized risks with category/likelihood/impact |
| `tasks` | Extractor (Stage 3) | Normalized action items with assignee/due_date/priority |
| `opportunities` | Extractor (Stage 3) | LLM-identified opportunities from discussion |

---

## API Endpoint

```
POST /api/pipeline/process
Content-Type: application/json

{"metadataId": "uuid-of-document-metadata-row"}

→ 200 {"status": "queued", "metadataId": "..."}
```

The pipeline runs in a FastAPI `BackgroundTask` so the HTTP response returns immediately.
Monitor progress via `fireflies_ingestion_jobs.stage`.

---

## Models

| | Model |
|-|-------|
| Chat completions | `gpt-4o-mini` (temperature 0.3) |
| Embeddings | `text-embedding-3-small` (1536 dimensions) |

Segmentation and extraction use JSON mode.

---

## document_metadata.status Values

| Value | Set by | Meaning |
|-------|--------|---------|
| `null` | — | Row inserted, not yet processed |
| `"segmented"` | Parser (Stage 1) | Transcript parsed and segmented |
| `"embedded"` | Embedder (Stage 2) | Chunks embedded and stored in `documents` |
| `"complete"` | Extractor (Stage 3) | All structured data extracted; fully searchable |

Query to see counts by status:

```sql
SELECT status, COUNT(*) FROM public.document_metadata GROUP BY status ORDER BY count DESC;
```

---

## Backfill Processing

To process existing rows that haven't been embedded yet, run this in the Supabase SQL Editor.
Re-running it is safe — it skips rows that already have a `done` job.

```sql
DO $$
DECLARE
  rec          RECORD;
  pipeline_url TEXT;
BEGIN
  SELECT value INTO pipeline_url
  FROM public.pipeline_config
  WHERE key = 'pipeline_url';

  IF pipeline_url IS NULL OR pipeline_url = '' THEN
    RAISE EXCEPTION 'pipeline_url not configured in pipeline_config';
  END IF;

  FOR rec IN
    SELECT dm.id
    FROM public.document_metadata dm
    LEFT JOIN public.fireflies_ingestion_jobs j
      ON j.metadata_id = dm.id::TEXT AND j.stage = 'done'
    WHERE j.fireflies_id IS NULL
    ORDER BY dm.created_at DESC
    LIMIT 20                        -- increase or remove for full backfill
  LOOP
    PERFORM net.http_post(
      url     := pipeline_url,
      body    := json_build_object('metadataId', rec.id::TEXT)::jsonb,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
    RAISE NOTICE 'Queued: %', rec.id;
  END LOOP;
END;
$$;
```

Monitor progress:

```sql
SELECT stage, COUNT(*) FROM public.fireflies_ingestion_jobs GROUP BY stage ORDER BY count DESC;
```

---

## Error Handling

If any stage throws, `orchestrator.py` catches the exception, sets
`fireflies_ingestion_jobs.stage = "error"` with `error_message`, and re-raises so FastAPI
logs the traceback. The document remains in whatever partial state it reached.

To re-process a document manually:

```bash
# Local
curl -X POST http://localhost:8051/api/pipeline/process \
  -H "Content-Type: application/json" \
  -d '{"metadataId": "your-metadata-uuid"}'

# Production
curl -X POST https://alleato-backend-3mmq.onrender.com/api/pipeline/process \
  -H "Content-Type: application/json" \
  -d '{"metadataId": "your-metadata-uuid"}'
```

---

## Previous Architecture (Cloudflare Workers — deprecated)

The pipeline previously ran as three separate Cloudflare Workers (`parser`, `embedder`,
`extractor`) with cron triggers that polled for pending jobs every 5 minutes. This created
~5-minute latency from ingest to searchable embeddings.

The current Python implementation eliminates:
- Separate CF Workers deployment
- Cron polling delays
- Worker chaining via `ctx.waitUntil`

The TS worker code remains in `backend/src/workers/` for reference but is no longer the
active pipeline.
