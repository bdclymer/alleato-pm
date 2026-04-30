# PRP: Unified RAG Pipeline — document_chunks as Single Embedding Table

## Status: DRAFT
## Priority: CRITICAL
## Estimated Phases: 3

---

## Context

The RAG system currently has meeting transcript embeddings split across two tables (`documents` with 11,207 embedded Fireflies chunks and `document_chunks` with 12,873 chunks from MS Graph + some Fireflies). Other searchable content is scattered across `insights` (8,741 rows), `ai_memories` (4,153 rows), `document_metadata.summary_embedding` (2,359 rows), `memories` (8 rows), and `company_knowledge` (1 row).

The `document_chunks` table is the most actively used search table — it has an HNSW index on `halfvec(3072)`, powers the `search_document_chunks_by_category` RPC used by the live AI chat, and is written to by the MS Graph embed pipeline. It should become the single unified embedding table.

## Verified Database State (2026-03-22)

| Table | Total Rows | With Embeddings | Embedding Type | Dims |
|-------|-----------|----------------|---------------|------|
| document_chunks | 12,873 | 12,252 | halfvec | 3072 |
| documents | 12,685 | 11,207 | vector | 3072 |
| insights | 8,741 | 8,741 | halfvec | 3072 |
| meeting_segments | 5,032 | 0 | (dropped) | — |
| document_metadata | 4,624 | 2,359 (summary) | halfvec | 3072 |
| ai_memories | 4,153 | 4,150 | halfvec | 3072 |
| memories | 8 | 8 | vector | 1536 |
| company_knowledge | 1 | 0 | halfvec | 3072 |

### document_chunks breakdown by source:
- MS Graph documents (OneDrive): 8,506 chunks
- Fireflies meetings: ~4,033 chunks
- Emails: 122 chunks
- Zapier: 90 chunks
- Teams messages: 4 chunks

### documents table:
- ALL 12,685 rows are source='fireflies' across 1,408 meetings
- 11,207 have embeddings (vector 3072) — cast to halfvec, NO re-embedding needed

## Phase 1: Migrate Fireflies Chunks to document_chunks (URGENT)

### Goal
Get the 11,207 Fireflies transcript embeddings into `document_chunks` so everything is searchable from one table.

### Step 1.1: Add source_type column to document_chunks

```sql
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'document';

-- Backfill existing rows based on document_metadata.category/source
UPDATE document_chunks dc
SET source_type = CASE
  WHEN dm.category = 'email' THEN 'email'
  WHEN dm.category = 'teams_message' THEN 'teams_message'
  WHEN dm.source = 'fireflies' THEN 'meeting_transcript'
  WHEN dm.source = 'microsoft_graph' AND dm.category = 'document' THEN 'onedrive_document'
  WHEN dm.source = 'Zapier' THEN 'zapier'
  ELSE 'document'
END
FROM document_metadata dm
WHERE dc.document_id = dm.id;

CREATE INDEX IF NOT EXISTS idx_document_chunks_source_type
  ON document_chunks(source_type);
```

### Step 1.2: Migrate Fireflies chunks from documents → document_chunks

The `documents` table stores Fireflies chunks with `vector(3072)` embeddings. These can be cast to `halfvec(3072)` directly in SQL — no OpenAI API calls needed.

```sql
INSERT INTO document_chunks (
  chunk_id,
  document_id,
  chunk_index,
  text,
  metadata,
  content_hash,
  embedding,
  source_type,
  created_at
)
SELECT
  -- Generate a chunk_id matching the pattern used by embed.py
  d.file_id || '__chunk_' || COALESCE((d.metadata->>'chunk_index')::int, 0),
  d.file_id,                                    -- document_id = metadata row id
  COALESCE((d.metadata->>'chunk_index')::int, 0),
  d.content,                                     -- chunk text
  jsonb_build_object(
    'title', d.title,
    'source', d.source,
    'doc_type', d.metadata->>'doc_type',
    'segment_index', d.metadata->>'segment_index',
    'segment_id', d.metadata->>'segment_id',
    'participants', d.metadata->>'participants',
    'project_id', d.project_id,
    'chunk_index', COALESCE((d.metadata->>'chunk_index')::int, 0),
    'content_hash', d.metadata->>'content_hash'
  ),
  d.metadata->>'content_hash',
  d.embedding::halfvec(3072),                    -- Cast vector → halfvec (no re-embed)
  'meeting_transcript',                          -- source_type
  d.created_at
FROM documents d
WHERE d.embedding IS NOT NULL
  AND d.source = 'fireflies'
ON CONFLICT (chunk_id) DO NOTHING;
```

### Step 1.3: Add chunk_id unique constraint if missing

```sql
-- chunk_id needs to be unique for ON CONFLICT to work
ALTER TABLE document_chunks
  ADD CONSTRAINT document_chunks_chunk_id_key UNIQUE (chunk_id);
```

### Step 1.4: Also migrate the 1,478 Fireflies chunks WITHOUT embeddings

These need to be embedded. Run the existing backfill script or a new one targeting document_chunks rows where embedding IS NULL and source_type = 'meeting_transcript'.

### Step 1.5: Update search_document_chunks_by_category RPC

The current RPC filters by `dm.category`. Add an option to filter by `source_type` too, or replace the category filter entirely:

```sql
CREATE OR REPLACE FUNCTION search_document_chunks(
    query_embedding  halfvec(3072),
    filter_source_types text[] DEFAULT NULL,
    filter_project_id bigint DEFAULT NULL,
    match_count      int     DEFAULT 10,
    match_threshold  float   DEFAULT 0.25
)
RETURNS TABLE (
    chunk_id        text,
    document_id     text,
    chunk_index     int,
    chunk_text      text,
    source_type     text,
    similarity      float,
    doc_title       text,
    doc_category    text,
    doc_source      text,
    doc_date        timestamptz,
    doc_project_id  bigint,
    doc_metadata    jsonb
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    SET LOCAL hnsw.ef_search = 100;

    RETURN QUERY
    SELECT
        dc.chunk_id,
        dc.document_id,
        dc.chunk_index,
        dc.text                                              AS chunk_text,
        dc.source_type,
        (1 - (dc.embedding <=> query_embedding))::float     AS similarity,
        dm.title                                            AS doc_title,
        dm.category                                         AS doc_category,
        dm.source                                           AS doc_source,
        dm.date                                             AS doc_date,
        dm.project_id                                       AS doc_project_id,
        dc.metadata                                         AS doc_metadata
    FROM document_chunks dc
    JOIN document_metadata dm ON dc.document_id = dm.id
    WHERE
        dc.embedding IS NOT NULL
        AND (filter_source_types IS NULL OR dc.source_type = ANY(filter_source_types))
        AND (filter_project_id IS NULL OR dm.project_id = filter_project_id)
        AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

### Step 1.6: Update the Fireflies embedder pipeline

Modify `backend/src/services/pipeline/embedder.py` to write to `document_chunks` instead of `documents`:

- Change `_upsert_document()` to write to `document_chunks` with the same schema
- Set `source_type = 'meeting_transcript'` for transcript chunks
- Set `source_type = 'meeting_summary'` for summary chunks
- Set `source_type = 'meeting_segment_summary'` for segment summary chunks
- Keep the contextual prefix pattern from the TS chunker (`[Meeting: "title" | date | Segment: "topic"]`)

### Step 1.7: Verify

- Count document_chunks rows — should be ~24,000+ after migration
- Run a test semantic search for a known meeting topic
- Verify the AI chat `semanticSearch` tool returns meeting results

---

## Phase 2: Consolidate Other Embedding Sources

### Step 2.1: Migrate insights embeddings to document_chunks

8,741 insight rows with embeddings → add as chunks with `source_type = 'insight'`.

```sql
INSERT INTO document_chunks (chunk_id, document_id, chunk_index, text, metadata, embedding, source_type, created_at)
SELECT
  'insight_' || i.id::text,
  i.metadata_id,
  0,
  i.type || ': ' || i.description || COALESCE(' (Owner: ' || i.owner_name || ')', ''),
  jsonb_build_object(
    'type', i.type,
    'owner', i.owner_name,
    'status', i.status,
    'details', i.details,
    'project_id', i.project_id
  ),
  i.embedding,
  'insight',
  i.created_at
FROM insights i
WHERE i.embedding IS NOT NULL
ON CONFLICT (chunk_id) DO NOTHING;
```

### Step 2.2: Migrate document_metadata summary embeddings

2,359 meeting summaries with embeddings → add as chunks with `source_type = 'meeting_summary'`.

```sql
INSERT INTO document_chunks (chunk_id, document_id, chunk_index, text, metadata, embedding, source_type, created_at)
SELECT
  'summary_' || dm.id,
  dm.id,
  -1,
  COALESCE(dm.summary, dm.overview, ''),
  jsonb_build_object(
    'title', dm.title,
    'source', dm.source,
    'category', dm.category,
    'project_id', dm.project_id,
    'date', dm.date
  ),
  dm.summary_embedding,
  'meeting_summary',
  dm.created_at
FROM document_metadata dm
WHERE dm.summary_embedding IS NOT NULL
  AND COALESCE(dm.summary, dm.overview, '') != ''
ON CONFLICT (chunk_id) DO NOTHING;
```

### Step 2.3: Migrate ai_memories embeddings

4,150 memory rows with embeddings → add as chunks with `source_type = 'ai_memory'`.

### Step 2.4: Update frontend semanticSearch tool

Replace the 3-way parallel RPC call in `operational.ts` with a single call to the new `search_document_chunks` RPC. Keep the old RPCs as fallbacks initially.

### Step 2.5: Embed the 1 company_knowledge entry and future entries ✅ DONE (PR #303)

> PR #303 completed this work: `company_knowledge` table has been replaced by `document_metadata` (category='knowledge') + `document_chunks` (source_type='knowledge'). The upload pipeline writes directly to `document_metadata` and triggers ingestion into `document_chunks`. The `search_knowledge_base` RPC is no longer used — queries route through `search_document_chunks_by_category` instead.

Modify `saveToKnowledgeBase` tool to also write a chunk to `document_chunks` with `source_type = 'knowledge_base'`.

---

## Phase 3: Pipeline Updates + Query Router + Cleanup

### Step 3.1: Add source_type-aware query routing

Add a lightweight classifier that determines which `source_type` filters to apply:
- "What did Brandon say about drywall?" → `['meeting_transcript']`
- "Any emails about the permit delay?" → `['email']`
- "What risks are we facing?" → `['insight', 'meeting_transcript']`
- "What's the budget for electrical?" → SQL tool (skip vector search entirely)
- No clear signal → `NULL` (search everything)

### Step 3.2: Add SQL tools for structured data

- `queryBudgetData` — direct SQL against budget tables
- `queryDocumentRows` — direct SQL against `document_rows` for financial spreadsheets
- `queryAcumaticaData` — API call to Acumatica

### Step 3.3: Fix broken backend agent tools

- Rewrite `backend/src/services/alleato_agent_workflow/tools/vector_search.py` to use the new unified RPC
- Rewrite `backend/src/services/alleato_agent_workflow/tools/retrieval.py` to use `insights` table

### Step 3.4: Add reranker (optional, quality improvement)

Cross-encoder reranking on top-20 results before sending to LLM.

### Step 3.5: Drop dead tables

After everything is migrated and verified working:
- Drop: chats, parts, chunks, chat_threads + 4 sub-tables, document_insights, fm_text_chunks, actionable_insights, rag_pipeline_state
- Drop: chat_sessions, chat_messages (confirmed 0 rows)
- Evaluate: documents table — once all data is in document_chunks and pipeline is redirected

### Step 3.6: Backfill missing embeddings

- 1,478 Fireflies chunks in documents without embeddings
- 621 document_chunks without embeddings
- 2,265 document_metadata rows without summary_embedding
- 1 company_knowledge entry without embedding

---

## Success Criteria

1. Single `search_document_chunks` RPC returns results from meetings, emails, Teams, OneDrive, insights, and knowledge base
2. AI chat `semanticSearch` tool uses one RPC instead of 3 parallel calls
3. "What did we discuss about [topic]?" returns actual transcript content, not just summaries
4. Fireflies pipeline writes new meeting chunks to `document_chunks`
5. All 11,207 Fireflies embeddings are searchable in `document_chunks`

## Risk Mitigation

- Keep the old `search_document_chunks_by_category` and `search_all_knowledge` RPCs alive during transition
- Don't drop `documents` table until Phase 3 verification is complete
- Run the migration INSERT with ON CONFLICT DO NOTHING to be idempotent
- Test with known queries before switching the frontend

## Files to Modify

### Phase 1
- `supabase/migrations/` — new migration for schema changes + data migration
- `backend/src/services/pipeline/embedder.py` — write to document_chunks
- `backend/src/services/pipeline/embedder.py` — add source_type

### Phase 2
- `frontend/src/lib/ai/tools/operational.ts` — update semanticSearch tool
- `frontend/src/lib/ai/tools/operational.ts` — update searchMeetingsByTopic

### Phase 3
- `backend/src/services/alleato_agent_workflow/tools/vector_search.py` — rewrite
- `backend/src/services/alleato_agent_workflow/tools/retrieval.py` — rewrite
- `frontend/src/lib/ai/tools/operational.ts` — add SQL tools
- `frontend/src/lib/ai/tools/financial.ts` — add queryDocumentRows
