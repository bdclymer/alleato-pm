# RAG Strategy for Construction Knowledge Expansion

## Objective
Scale from transcript-only retrieval to a multi-pipeline document intelligence platform for construction operations.

## Recommended Architecture

### 1. Ingestion Router
- Input sources:
  - Local folder (`RAG_LOCAL_SOURCE_DIR`)
  - Existing Fireflies ingestion
  - Future: cloud connectors (SharePoint/OneDrive/Dropbox)
- Responsibilities:
  - Classify incoming file type
  - Attach metadata (`project_id`, source path, hash, category)
  - Route file to pipeline-specific extraction path

### 2. Pipeline Families
- Transcript pipeline (`category=meeting`):
  - Existing Fireflies parser path
  - Speaker/time-aware segmentation and action extraction
- Financial + tabular pipeline (`category=financial_document`):
  - Spreadsheet-first extraction for estimates, budgets, P&L, SOV, cost reports
  - Numeric lookup before semantic fallback
- Specification pipeline (`category=specification`):
  - Heading/section-aware parsing (division/section hierarchy)
  - Hybrid lexical + semantic retrieval
- Drawing/image pipeline (`category=drawing`):
  - OCR + title block and revision metadata
  - Sheet-level retrieval
- Contract/legal pipeline (`category=contract`):
  - Clause and obligation extraction
  - Date/deadline/entity indexing

### 3. Storage Pattern
- Raw files: Supabase Storage bucket (`documents`)
- Metadata/state: `document_metadata`, `fireflies_ingestion_jobs`
- Retrieval corpus:
  - `meeting_segments` + `documents` embeddings (existing)
  - Add specialized structured tables incrementally for financial/spec/drawing entities

### 4. Retrieval Router
- Classify question intent, then choose retrieval mode:
  - Transcript questions: vector + chronology
  - Financial questions: SQL/numeric first, semantic second
  - Specs/contracts: section/keyword hybrid + rerank
  - Drawings: metadata filters + OCR chunks
- Merge evidence into one response with source IDs and confidence hints.

## File Intake Strategy (Local Folder)

### Baseline recommendation
- Use a local root folder as a staging inbox.
- Run ingestion manually when needed, or schedule cron 1-2 times per day.
- Keep watch mode optional, not default.

### Folder shape
- Example:
  - `~/Documents/AlleatoKnowledge/`
  - `financial/`
  - `specifications/`
  - `drawings/`
  - `contracts/`
  - `rfis-submittals/`
  - `meetings/`

### Why this approach
- Lower operational risk than always-on watchers
- Easier recovery and replay with manifest-based incremental ingestion
- Matches your cadence (not highly time-sensitive)

## What Was Implemented

A new local ingestion command was added:
- `scripts/ingestion/ingest_local_documents.py`

Capabilities:
- Recursively scans supported files (PDF, Office docs, spreadsheets, text, images)
- Classifies document category heuristically from extension + filename hints
- Uploads each file to Supabase Storage
- Inserts/upserts `document_metadata` and `fireflies_ingestion_jobs`
- Deduplicates via `content_hash`
- Tracks incremental state in a local manifest
- Optional immediate processing through existing Python pipeline (`--process-now`)
- Optional watch mode via polling

Financial pipeline stage 1 parser was also added:
- `backend/src/services/pipeline/financial_parser.py`

Behavior:
- Parses CSV/TSV/XLS/XLSX into normalized row JSON
- Stores rows in `document_rows` (`dataset_id = document_metadata.id`)
- Creates segment summaries in `meeting_segments` for existing embedding flow
- Routes automatically from orchestrator when category/extension is financial

## Commands

Manual run:

```bash
npm run rag:ingest:local -- --source-dir ~/Documents/AlleatoKnowledge --project-id 43
```

Manual run + immediate parsing/embedding/extraction:

```bash
npm run rag:ingest:local -- --source-dir ~/Documents/AlleatoKnowledge --project-id 43 --process-now
```

Dry run:

```bash
npm run rag:ingest:local -- --source-dir ~/Documents/AlleatoKnowledge --dry-run
```

Watch mode (polling):

```bash
npm run rag:ingest:local:watch -- --source-dir ~/Documents/AlleatoKnowledge --interval-seconds 3600
```

## Cron (Recommended)

Run twice daily at 7:00 and 19:00 local time:

```bash
0 7,19 * * * cd /Users/meganharrison/Documents/alleato-pm && npm run rag:ingest:local -- --source-dir ~/Documents/AlleatoKnowledge --project-id 43 >> /tmp/rag-local-ingest.log 2>&1
```

## Next Build Steps

1. Add pipeline-specific parsers for financial tables and specs while preserving current transcript path.
2. Add retrieval router endpoint that picks query strategy by intent.
3. Add evaluation logging (retriever used, sources returned, groundedness checks).
4. Add entity extraction tables (`entities`, `relationships`) to stay graph-ready without committing to Neo4j yet.
