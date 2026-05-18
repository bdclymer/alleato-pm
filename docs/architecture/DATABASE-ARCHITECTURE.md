# Database Architecture: MAIN vs RAG

> **Authoritative reference, verified 2026-05-17.** Read this BEFORE writing any migration, AI tool, or sync job that touches documents, embeddings, or intelligence. Past sessions skipped this step and produced reckless work.

## 1. TL;DR

| | MAIN | RAG |
|---|---|---|
| Supabase project id | `lgveqfnpkxvzbnnwuled` | `fqcvmfqldlewvbsuxdvz` |
| Display name | "PM APP" | "AI Database" |
| Env vars | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `RAG_SUPABASE_URL`, `RAG_SUPABASE_SERVICE_ROLE_KEY` |
| Holds | Business / app catalog | Embeddings + content + pipeline state |
| Optimized for | OLTP / app queries | Vector search + heavy text I/O |
| Tables that matter | `projects`, `document_metadata`, `tasks`, `insight_cards`, `intelligence_packets`, `outlook_email_intake`, `meetings_*`, all financial tables | `document_chunks`, `rag_document_metadata`, `packet_refresh_jobs` (duplicated), `insight_cards` (none — MAIN-only) |
| Active for AI assistant | YES — most tool reads | YES — vector search reads, content hydration |

**Both databases are live and dual-written for documents.** Neither is a replica or backup of the other; they hold complementary slices of the same data.

## 2. Why The Split Exists

The original architecture put both workloads on a single Postgres instance:
- Business / app OLTP queries (small rows, lots of joins on `projects` / `tasks` / `companies` / etc.)
- Vector search + large text scans (heavy memory, large rows, sequential reads)

The vector workload was making the app database unhealthy — slow queries, latency spikes on simple lookups. The split moves the heavy embedding/content work off the operational DB so each can scale independently.

## 3. The Two Document Tables

The single most confusing thing about this architecture is that BOTH databases have a "document metadata" table, with overlapping but different schemas.

### `MAIN.document_metadata` (~70 columns, 36,736 rows as of 2026-05-15)

This is the **business catalog**. Every meeting, email, OneDrive doc, Teams thread we ingest gets a row here. Holds the rich structured metadata the app uses:

- Identity: `id` (text — same value in RAG), `title`, `url`, `created_at`, `updated_at`
- Source: `source`, `source_system` (outlook_email / teams_dm / teams_channel / fireflies / onedrive / ...), `source_system_id`, `source_drive_id`, `source_item_id`, `source_web_url`, `source_etag`, `source_last_modified_at`
- Project linkage: `project_id` (FK → projects.id), `project` (text fallback), `phase`
- Document classification: `type`, `category`, `tags`, `division`, `trade`, `workflow_target`
- Meeting-specific: `date`, `duration_minutes`, `participants`, `participants_array`, `organizer_email`, `host_email`, `meeting_link`, `meeting_type`, `speakers`, `meeting_attendees`, `meeting_attendance`, `transcript_chapters`, `is_silent_meeting`, `calendar_type`
- Extracted intelligence: `action_items`, `bullet_points`, `summary_bullets`, `decisions`, `key_topics`, `keywords`, `topics_discussed`, `sentiment`, `analytics`, `extended_sections`, `notes`, `outline`, `description`, `overview`
- Storage: `file_id`, `file_name`, `file_path`, `storage_bucket`
- **Heavy text fields ARE present on the schema (`content`, `raw_text`, `summary_embedding`) but are STRIPPED at write time** — see `_app_document_catalog_payload` at `backend/src/services/supabase_helpers.py:188`. The columns exist for historical rows; new writes don't populate them.

### `RAG.rag_document_metadata` (32 columns, 36,719 rows as of 2026-05-15)

This is the **RAG / embedding catalog**. One row per document, mirroring MAIN's identity but holding only what the search and ingestion pipelines need:

- Identity: `id` (same text value as MAIN.document_metadata.id), `app_document_id` (FK back to MAIN.document_metadata.id; currently always equals `id`), `project_id`, `source`, `source_system`, `source_item_id`, `fireflies_id`, `title`, `type`, `category`
- Storage: `source_web_url`, `url`, `storage_bucket`, `storage_path`, `file_name`
- Content: **`content`, `raw_text`, `content_hash`, `content_length`** — the heavy text fields, here on the RAG side
- Summary: `summary`, `overview`, `summary_embedding` (vector)
- Pipeline state: `parsing_status`, `embedding_status`, `processing_metadata` (jsonb), `source_metadata` (jsonb)
- Lifecycle: `last_synced_at`, `last_content_loaded_at`, `last_indexed_at`, `created_at`, `updated_at`

**Does NOT hold** the business extractions: `action_items`, `decisions`, `sentiment`, `analytics`, `transcript_chapters`, `meeting_attendees`. Those live only in MAIN.

### How the two are linked

```
RAG.rag_document_metadata.id           = MAIN.document_metadata.id            (same text value)
RAG.rag_document_metadata.app_document_id → MAIN.document_metadata.id          (FK; today equals id)
RAG.document_chunks.document_id        → MAIN.document_metadata.id            (text FK across DBs)
```

**`app_document_id` is redundant today** — the writer at `_rag_document_metadata_payload` (supabase_helpers.py:194) sets it equal to `id`. 100% of RAG rows have it populated; 0% have it differ from `id`. The column exists in case a future scheme wants RAG rows to point to a different upstream id (e.g. re-chunked versions sharing a logical document).

## 4. The Ingestion Pipeline (Dual-Write)

Single function owns this: `SupabaseHelper.upsert_document_metadata()` at `backend/src/services/supabase_helpers.py:158`.

```python
def upsert_document_metadata(self, metadata):
    has_rag_payload = any(metadata.get(f) is not None for f in ("content", "raw_text", "summary_embedding"))
    app_payload = self._app_document_catalog_payload(metadata)   # strips content/raw_text/embedding
    rag_payload = self._rag_document_metadata_payload(metadata) if document_id and has_rag_payload else None

    if app_payload.get("id") and app_has_fields_beyond_id:
        self.upsert_app_document_catalog(app_payload)            # writes MAIN.document_metadata

    if rag_payload:
        self.upsert_rag_document_metadata(rag_payload)           # writes RAG.rag_document_metadata
```

**Order:** MAIN first, RAG second. **Atomicity:** NONE. If the RAG write fails after MAIN succeeds, you get a row in MAIN with no embedding partner. No retry queue exists today. The 17-row drift between table counts is the running balance of these failures.

**Callers of `upsert_document_metadata`** (every ingestion path eventually funnels here):
- Outlook email sync (`backend/src/services/integrations/microsoft_graph/sync.py`)
- Teams channel + DM sync (same module)
- OneDrive sync
- Fireflies meeting ingest
- Document parser (`backend/src/services/pipeline/document_parser.py`)
- Financial parser (`backend/src/services/pipeline/financial_parser.py`)
- Manual admin uploads (frontend → API → backend)

## 5. Reader Paths (Who Reads What)

### MAIN.document_metadata readers
Tools and routes that need business metadata:
- `getMeetingDetails`, `getMeetingsByDate`, `getMeetingIntelligence`, `getActionItemsAndInsights` — meeting/email metadata + action items + decisions
- `findProjectDocuments` (new this session) — file lookup by category/type/title
- `getProjectBriefingSnapshot`, `getProjectDetails` — for joining recent docs to a project
- Owner briefing builder — pulls intelligence_packets + insight_cards, joins to intelligence_targets
- `/api/financial-insights/scan` — pulls financial docs

### RAG.rag_document_metadata readers
Tools that need content snippets after vector search:
- `searchDocuments`, `searchEmails`, `searchTeamsMessages`, `searchMeetingsByTopic` — vector search in `document_chunks` joins to `rag_document_metadata` for content + title in the result rows
- Backend compilers (`teams_compiler.py`, `email_compiler.py`) — `_hydrate_rag_thread_content` reads `content` / `raw_text` from RAG when they need to extract from a thread

### Cross-DB join pattern
The TypeScript helper `searchDocumentChunksByCategory` in `frontend/src/lib/ai/tools/operational.ts` (around line 3170) takes BOTH clients:

```typescript
searchDocumentChunksByCategory({
  supabase: ragSupabase,            // for the chunk vector search
  metadataSupabase: supabase,       // for hydrating business fields from MAIN
  query, category, ...
})
```

This is the pattern any consumer that needs both content and business metadata must use.

## 6. The Intelligence Layer (MAIN-only)

Pipeline B intelligence tables all live in MAIN. None of these have RAG-side counterparts:

```
intelligence_targets (88 rows)
   ↓ primary_target_id
insight_cards (6,899 rows; oldest 2021-09-02 via backfill, newest 2026-05-14)
   ↓ insight_card_id
intelligence_packet_cards (2,230 rows)
   ↓ packet_id
intelligence_packets (86 rows, 1 current per target)
```

Plus `insight_card_evidence` (7,519 rows) — joins `insight_cards` to `document_metadata` via `source_document_id`. This is the only place cards know which raw documents they were extracted from.

`packet_refresh_jobs` exists in **both** databases (1,534 in MAIN, 1,525 in RAG). The compiler writes to RAG via `_rag_write()`. The MAIN copy appears to be vestigial or a stale snapshot — needs investigation; possibly safe to drop but not in this session.

## 7. Data Quality State (Honest Inventory)

What's actually populated, what's not:

| Field | Where | Populated? | Implication |
|---|---|---|---|
| `projects.name` | MAIN | ✅ all rows | Project resolution by name works |
| `projects.project_number` | MAIN | ✅ all rows | Useful for cross-system lookup |
| `projects.address` | MAIN | ❌ mostly null (sampled 5 Goodwill projects, all null) | Owner questions about addresses cannot be answered without backfill |
| ~~`projects.client`~~ | MAIN | DROPPED 2026-05-15 (Wave 3) | Use `company_id` → `companies` join |
| ~~`projects.current_phase`~~ | MAIN | RENAMED to `stage` (Wave 3) | Still mostly null; backfill TBD |
| `projects.state` | MAIN | ❌ mostly null | Same |
| `projects.budget`, `projects.budget_used` | MAIN | Partially populated (depends on Acumatica sync) | Budget questions work for some projects, not others |
| `document_metadata.category` | MAIN | ❌ 99% set to "document" (generic) | `findProjectDocuments(category=...)` can't narrow to permits/drawings/specs without backfill |
| `document_metadata.type` | MAIN | Mostly "document" + small "daily report"/"change order" pockets | Same problem |
| `document_metadata.project_id` | MAIN | Mixed — some rows linked via Outlook intake / Teams compiler, others null | Project-scoped doc lookups miss unlinked documents |
| `insight_cards.title`, `.summary`, `.why_it_matters`, `.next_action` | MAIN | ✅ populated for ~95% of cards | Owner briefing works |
| `insight_cards.suggested_owner_person_id` | MAIN | Mostly null | Can't reliably route by owner; falls back to `suggested_owner_label` (also sparse) |
| `intelligence_packets.generated_at` | MAIN | ✅ all rows, freshness <24h via cron | Packet freshness works |

## 8. Known Issues / Footguns

1. **No retry on dual-write partial failure.** If MAIN succeeds and RAG fails, the row in MAIN has no embedding partner forever. No queue, no reconciliation job. The 17-row drift is silent rot.
2. **Schema drift risk.** Anyone adding a column to `MAIN.document_metadata` won't see it on RAG unless they also update `_rag_document_metadata_payload`. There's exactly one writer, but it has to be edited in lockstep.
3. **`app_document_id` is dead weight today.** Always equals `id`. Either commit to the design (some path that sets it different) or drop the column.
4. **`packet_refresh_jobs` exists in both DBs.** Slight drift (1,534 vs 1,525). Compiler writes to RAG via `_rag_write()`. The MAIN copy needs investigation — probably should be dropped or moved entirely.
5. **`projects` row data quality.** Address / phase / client / state are nullable and largely null. Owner-facing tools that promise these facts will return "not found" until a backfill pass populates them (likely from Acumatica or contract PDFs).
6. **`document_metadata.category` granularity.** 99% generic "document". Until this is backfilled with category labels (permit / drawing / spec / certificate / etc.), the new `findProjectDocuments` tool can only narrow by title keyword, not by category.
7. **Foreign keys across DBs aren't enforced.** Postgres can't enforce a FK from RAG → MAIN (different instances). Integrity relies on application discipline.
8. **MAIN.document_chunks (103,955 rows) is a stale legacy snapshot** the user has not yet dropped. Production reads only RAG.document_chunks (109,171 rows). Pending decision on cleanup.

## 9. Decision Log

| Date | Decision | Why | Where to find it |
|---|---|---|---|
| ~April 2026 | Split out the RAG database | MAIN was becoming unhealthy under combined vector + OLTP load | Verbal context, no design doc yet |
| April 30 2026 | Pipeline B (intelligence_compiler_v0_1) launched alongside Pipeline A | LangChain deep-agents migration | `backend/src/services/intelligence/compiler.py` |
| May 15 2026 | Pipeline A tables dropped (`ai_insights`, `project_insights`, `insights`) and dependent views CASCADE-dropped | Pipeline B coverage verified via backfill (6,899 cards covering 2021-09 → 2026-05) | Migration `20260515080000_drop_pipeline_a_intelligence.sql` |
| May 15 2026 | `project_health_dashboard` view recreated from `insight_cards` | Three callers still depended on the column contract | Migration `20260515100000_recreate_project_health_dashboard_pipeline_b.sql` |
| May 15 2026 | `insight_cards.card_type` CHECK extended to allow `sentiment` + `initiative_signal` | These Pipeline A extraction types had no Pipeline B home | Migration `20260515090000_extend_insight_card_types_sentiment_initiative.sql` |

## 10. Glossary

- **MAIN** — the app/operational Supabase project (`lgveqfnpkxvzbnnwuled`).
- **RAG** — the embedding/content Supabase project (`fqcvmfqldlewvbsuxdvz`).
- **Pipeline A** — legacy intelligence layer: `insights`, `project_insights`, `ai_insights`. Dropped 2026-05-15.
- **Pipeline B** — current intelligence layer: `insight_cards`, `intelligence_packets`, `intelligence_packet_cards`, `intelligence_targets`, `insight_card_evidence`. All in MAIN.
- **Insight card** — a deduplicated extraction (risk / decision / blocker / task / etc.) with confidence, attribution status, freshness, and links back to source documents via `insight_card_evidence`.
- **Intelligence packet** — a rendered briefing JSON per project, generated by the compiler and refreshed via `packet_refresh_jobs`.
- **app_document_id** — column on `RAG.rag_document_metadata` linking back to `MAIN.document_metadata.id`. Currently always equals `id`.

## 11. Open Questions That Should Be Resolved Before More Work

These are things I (or anyone) should NOT assume the answer to:

1. Who owns the Acumatica sync that should populate `projects.address` / `client` / `phase`? Is it broken, never finished, or just not configured?
2. Is there a roadmap for backfilling `document_metadata.category` to enable structured document filters?
3. Should `app_document_id` be dropped, or is there an active plan to use it?
4. Should `MAIN.document_chunks` (103K stale) and `MAIN.packet_refresh_jobs` be dropped? (Both are duplicate snapshots of RAG counterparts.)
5. Is there a target for closing the dual-write reliability gap (queue + retry)?

When in doubt, ask before changing anything in either database.

---

## 12. Unified File Architecture (Pattern C)

**Decision (2026-05-15, user-confirmed):** ONE `document_metadata` table for all file content — no per-entity attachment tables, no per-source tables, no parallel uploads index. Email bodies, Teams messages, Fireflies transcripts, OneDrive uploads, executed contracts, proposals, insurance certs, lien waivers, closeout binders, permits, photos, and the file part of drawings all share the same row shape and the same RLS surface. Entity association is via lightweight junction tables, not by duplicating the file row.

This supersedes the prior `documents` (legacy), `email_attachments`, per-entity `*_attachments`, and OneDrive-specific upload tables. Those will be migrated or dropped phase-by-phase (Phase 4 Day 5–6; Phase 7 for legacy `documents`).

### 12.1 Why "Pattern C"

We considered three patterns:

- **A: Per-entity attachment tables.** What we had (`commitment_attachments`, `change_event_attachments`, etc.). Each table was a parallel mini-implementation of upload + storage + RLS. Drift was inevitable; the AI assistant couldn't see all files in one query.
- **B: One `document_metadata` but separate tables per source system** (`email_documents`, `teams_documents`, `onedrive_documents`). Slightly cleaner than A but still N writers and N readers.
- **C: One `document_metadata`, one taxonomy table, junction rows for entity links.** Selected. Single search path, single auth surface, single embedding pipeline.

### 12.2 Components

```
┌────────────────────────────────────────────────────────────┐
│  document_type_taxonomy  (23 rows)                         │
│    type_key (pk)  ── display_name ── category              │
│    applies_to text[]   ── source_system   ── retention_days│
└────────────────────────────────────────────────────────────┘
                   ▲
                   │ FK
┌──────────────────┴────────────────────────────────────────┐
│  document_metadata  (~36.9K rows; see §3)                 │
│    + document_type text ── references taxonomy(type_key)  │
└───────────────────────────────────────────────────────────┘
                   ▲
                   │ FK (CASCADE)
┌──────────────────┴────────────────────────────────────────┐
│  *_documents junction tables (one per parent entity)      │
│    parent_entity_id ─ document_metadata_id ─ document_type│
│    attached_at  ──  attached_by                           │
└───────────────────────────────────────────────────────────┘
```

### 12.3 `document_type_taxonomy`

Created 2026-05-15 (Phase 4 Day 1, migrations `20260520000000` + `20260520010000`).

| Column | Purpose |
|---|---|
| `type_key` | Primary key. Stable string identifier (e.g. `executed_contract`, `lien_waiver_final`) |
| `display_name` | Human-readable label in dropdowns |
| `category` | Coarse grouping: `contract`, `compliance`, `closeout`, `permit`, `drawing`, `photo`, `communication`, `financial`, `other` |
| `applies_to` | `text[]` of entity slugs the type can attach to (`commitment`, `prime_contract`, `change_order`, `invoice`, `company`, `project`, `submittal`, `rfi`, `drawing`, `meeting`, `daily_report`) — drives the file-picker dropdown |
| `source_system` | Nullable. Used when type is system-injected (`graph_email`, `graph_teams`, `fireflies`, `graph_attachment`) — keeps the picker from showing user-uploadable types |
| `required_metadata` | Reserved for per-type required fields (e.g. executed_date on contracts) |
| `retention_days` | Reserved for retention policy enforcement |
| `is_active` | Soft-disable flag |
| `sort_order` | Render order |

Seeded with 23 type keys spanning all eight categories. New types can be inserted by migration without code changes.

### 12.4 `document_metadata.document_type`

Added by migration `20260520020000`. References `document_type_taxonomy(type_key)`. Backfilled from `category` patterns by migration `20260520030000`:

- `category='teams_message'` → `document_type='teams_message'`
- `category='email'` → `document_type='email_message'`
- `category='meeting'` → `document_type='meeting_transcript'`
- Path patterns under `/contracts/`, `/permits/`, `/closeout/`, `/insurance/` → respective taxonomy keys

As of 2026-05-15: **30,288 of 36,855 rows populated.** Remaining 6,567 rows await Phase 9 LLM categorization (gpt-4.1-nano with taxonomy as choices, batched 100).

### 12.5 Junction tables

Pattern (one per parent entity):

```sql
create table commitment_documents (
  commitment_id uuid references commitments(id) on delete cascade,
  document_metadata_id uuid references document_metadata(id) on delete cascade,
  document_type text references document_type_taxonomy(type_key),
  attached_at timestamptz default now(),
  attached_by uuid references auth.users(id),
  primary key (commitment_id, document_metadata_id)
);
```

RLS inherits from parent entity access via a `user_can_access_entity()` helper (read access to the commitment = read access to every doc in `commitment_documents` for that commitment).

**Status as of 2026-05-17 (all complete):**

| Junction table | State |
|---|---|
| `subcontract_documents` | ✅ Live |
| `purchase_order_documents` | ✅ Live |
| `submittal_doc_links` | ✅ Live (named to avoid conflict with pre-existing `submittal_documents` file-storage table) |
| `project_documents_v2` | ✅ Live (named to avoid conflict with pre-existing `project_documents` file-storage table) |
| `prime_contract_documents` | ✅ Live |
| `change_order_documents` | ✅ Live |
| `owner_invoice_documents` | ✅ Live |
| `company_documents` | ✅ Live |
| `rfi_documents` | ✅ Live |

> **Note:** `commitments` is a UNION ALL view over `subcontracts` + `purchase_orders` — FK constraints cannot reference views, so commitment documents use two tables: `subcontract_documents` and `purchase_order_documents`.

### 12.6 Drawings: hybrid (file + revision history)

Drawings are the one exception to a pure junction layout. Drawing-specific fields (sheet_number, discipline, revision, set_id) stay on `drawings`. The underlying file (PDF, DWG) goes through `document_metadata` like everything else. `drawing_revisions` (44 rows, preexisting) tracks revision history; each revision FK-links to its `document_metadata.id` so the current and historical files coexist with the rest of the file system.

```
drawings.document_metadata_id  →  document_metadata.id   (current file)
drawing_revisions.document_metadata_id  →  document_metadata.id   (per revision)
```

### 12.7 Migration sequence

1. **Taxonomy** — create + seed ✅ (migration `20260520000000` + `20260520010000`)
2. **Column on `document_metadata`** — add `document_type` FK + indexes ✅ (migration `20260520020000`)
3. **Backfill `document_type`** from `category` + path patterns ✅ (migration `20260520030000`)
4. **Junction tables per entity** ✅ (migration `20260523110000` — all 9 junction tables live)
5. **Drawings hybrid** ✅ (migrations `20260523120000` — `drawings.document_metadata_id` + `drawing_revisions.document_metadata_id`)
6. **Frontend file picker** ✅ `<DocumentPicker>` + `<LinkedDocumentsList>` in `frontend/src/components/ds/document-picker.tsx`; wired to Commitments detail page `AttachmentsTab`
7. **Embedding pipeline extension** ✅ `embed_pending_attachment_documents()` in `ocr_worker.py`; hooked into `run_graph_sync()`
8. **Phase 9 LLM categorization** ⬜ ~17% of rows still generic; use gpt-4.1-nano in batches of 100

### 12.8 Pattern C readers

- AI assistant: `findProjectDocuments({ project_id, document_type })` filters by taxonomy
- Each entity detail page: junction join → `document_metadata` for the file list; `<DocumentPicker>` component handles attachment
- Owner briefing builder: joins `insight_card_evidence.source_document_id` → `document_metadata` and can resolve to taxonomy type for richer rendering

### 12.9 Status summary (as of 2026-05-17)

- **Landed:** taxonomy, column, path-based backfill (82% → ~83%), all 9 junction tables, drawings hybrid FKs, frontend picker, embedding extension, `email_attachments` legacy backfill (471 rows promoted)
- **Running:** 30-day `documents` table soak audit — drop eligible **2026-06-17** if `documents_access_audit` shows zero rows
- **Deferred:** LLM categorization of remaining ~17% generic rows; per-entity legacy attachment tables (`cco_attachments`, `invoice_attachments`, etc.) migration deferred until after soak drop
