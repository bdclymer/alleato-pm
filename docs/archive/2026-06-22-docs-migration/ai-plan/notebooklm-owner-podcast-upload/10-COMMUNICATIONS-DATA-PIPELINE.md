# Communications Data Pipeline

This document is the authoritative reference for the Microsoft Graph communications pipeline. Read it before touching any sync job, email ingestion, Teams sync, embedding, or AI email/comms tool. All design decisions, table relationships, known limitations, and runbook steps are here.

---

## 1. Overview

The communications pipeline ingests Outlook email, Teams channel messages, Teams direct messages, and OneDrive/SharePoint files from the Microsoft 365 tenant into Supabase. Each source goes through three stages: **raw intake** (write everything), **relevance filter** (drop noise, assign projects), and **vectorization** (chunk and embed for AI retrieval). A fourth stage — the **Teams compiler** — runs an LLM pass over DM conversations to extract structured intelligence (tasks, insights, risks, decisions). The AI assistant queries the resulting `document_chunks` table via pgvector RPCs; it does not read `document_metadata` or `outlook_email_intake` directly.

---

## 2. Data Flow

```
Microsoft 365
  Outlook Mail ──────────────────────────────────┐
  Teams Channels ─────────────────────────────┐  │
  Teams Direct Messages ───────────────────┐  │  │
  OneDrive / SharePoint ────────────────┐  │  │  │
                                        │  │  │  │
                                        ▼  ▼  ▼  ▼
                             ┌─────────────────────────┐
                             │   microsoft_graph sync   │
                             │   (run_graph_sync())     │
                             └──────────┬──────────────┘
                                        │
              ┌─────────────────────────┼──────────────────────────┐
              ▼                         ▼                           ▼
  ┌───────────────────────┐  ┌─────────────────────┐  ┌───────────────────────┐
  │  outlook_email_intake │  │  document_metadata  │  │    project_emails     │
  │  (all emails, raw)    │  │  (relevance-filter) │  │  (project-matched)    │
  └───────────────────────┘  └──────────┬──────────┘  └───────────────────────┘
                                        │
                             embed_pending_graph_documents()
                             (text-embedding-3-large, 3072d)
                                        │
                                        ▼
                             ┌─────────────────────┐
                             │   document_chunks   │  ◄── AI queries HERE
                             │  (pgvector, halfvec)│
                             └─────────────────────┘
                                        │
                             run_compiler_batch()
                             (Teams DMs only — LLM pass)
                                        │
                         ┌──────────────┼──────────────┐
                         ▼              ▼               ▼
               project_insights      tasks    source_signal_candidates
```

**What the AI never reads directly:** `document_metadata`, `outlook_email_intake`, `project_emails`. The AI reads only `document_chunks` (via RPC) and the compiled intelligence tables.

---

## 3. Tables Reference

### 3.1 `outlook_email_intake`

**Purpose:** Raw Outlook email store. Every non-noise email seen by the sync is written here, regardless of project relevance. This is the source of truth for "what emails exist in the system."

**Written by:** `sync_outlook_emails()` in `backend/src/services/integrations/microsoft_graph/outlook.py`

**Read by:** `getRecentEmails` AI tool (date-based queries — "what emails arrived today?"). Also read by the admin inbox UI and any audit queries.

**Key columns:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `message_id` | text | Microsoft Graph message ID (dedup key) |
| `subject` | text | Email subject |
| `from_address` | text | Sender email address |
| `to_addresses` | text[] | All `To:` recipients |
| `cc_addresses` | text[] | All `Cc:` recipients |
| `received_at` | timestamptz | When the email arrived |
| `body_preview` | text | First ~255 chars of body |
| `body_text` | text | Full plain-text body (up to 8 000 chars) |
| `has_attachments` | bool | Whether attachments exist |
| `mailbox` | text | Which mailbox this came from (MICROSOFT_SYNC_USERS) |
| `document_metadata_id` | uuid | FK → `document_metadata` when indexed for RAG |
| `is_project_relevant` | bool | True if passed relevance filter |

**Do NOT query this table for AI semantic search.** Use the `searchEmails` tool (which hits `document_chunks`) or `getRecentEmails` for date-based retrieval.

---

### 3.2 `document_metadata`

**Purpose:** The relevance-filtered, AI-ready document store. One row per indexable communication artifact: emails that passed the noise/relevance filter, Teams messages, Teams DM conversations, OneDrive files. This is the staging area before vectorization.

**Written by:** `sync_outlook_emails()`, `sync_teams_channel()`, `sync_user_chat_messages()`, `sync_onedrive_folder()`, `sync_sharepoint_folder()`

**Read by:** `embed_pending_graph_documents()` (picks up rows with `status='raw_ingested'`), `embed_graph_document()` (individual embed), admin dashboards.

**Key columns:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `source` | text | Always `'microsoft_graph'` for this pipeline |
| `source_system` | text | `'outlook_email'`, `'teams_message'`, `'onedrive_file'` |
| `source_path` | text | Durable path, e.g. `outlook/user@company.com/<msg_id>` |
| `title` | text | Subject, channel name, or filename |
| `content` | text | Full text content |
| `category` | text | `'email'`, `'teams_message'`, `'document'` |
| `type` | text | Subtype, e.g. `'teams_dm_conversation'` |
| `date` | date | Date of the communication |
| `participants` | text[] | Email addresses involved |
| `project_id` | int | FK → `projects`, null if unassigned |
| `status` | text | `'raw_ingested'` → `'embedded'` (or `'skipped_low_content'`, `'error'`) |
| `tags` | text[] | Keywords extracted during ingestion |

**Status lifecycle:** `raw_ingested` → (embed step) → `embedded`. Low-content items become `skipped_low_content`. Embedding errors become `error`. The embed step also picks up `segmented` and `compiled` as recovery paths.

---

### 3.3 `project_emails`

**Purpose:** Project-matched email index. A separate, narrower table that holds only emails that have been assigned to a specific project. Used by project-scoped email views in the UI.

**Written by:** `sync_outlook_emails()` — only when a project match is found

**Read by:** Project email UI views, project-scoped AI queries

**Key columns:** mirrors `outlook_email_intake` with an explicit `project_id` FK and a denormalized `project_name`.

---

### 3.4 `document_chunks`

**Purpose:** The vector embedding store. This is the only table the AI assistant queries for semantic search. Each `document_metadata` row produces one or more chunks (3 000 chars max, 400-char overlap). Chunks carry the embedding vector plus denormalized metadata so the AI can surface context without joins.

**Written by:** `embed_graph_document()` in `backend/src/services/integrations/microsoft_graph/embed.py`

**Read by:** `search_document_chunks` RPC (pgvector cosine similarity), `search_document_chunks_by_category` RPC. Both are called by the AI tools — never directly from product code.

**Key columns:**

| Column | Type | Notes |
|--------|------|-------|
| `document_id` | uuid | FK → `document_metadata.id` |
| `chunk_id` | text | `{document_id}__chunk_{index}` |
| `chunk_index` | int | Position within the document |
| `text` | text | Chunk text (title prepended for retrieval quality) |
| `embedding` | halfvec(3072) | text-embedding-3-large vector |
| `source_type` | text | `'email'`, `'teams_channel'`, `'teams_dm'`, `'onedrive_document'` |
| `metadata` | jsonb | title, category, date, participants, project_id, tags, chunk stats |
| `content_hash` | text | SHA-256 prefix for dedup detection |

---

### 3.5 Supporting tables

| Table | Purpose |
|-------|---------|
| `graph_sync_state` | Stores delta tokens and timestamps between runs, one row per (source, resource_id) pair |
| `source_sync_runs` | Ledger of every sync run — source, status, items_seen, items_synced, errors |
| `outlook_email_intake_attachments` | Attachment metadata and extracted text for email attachments |
| `document_attribution_candidates` | Low-confidence project assignments queued for human review |
| `project_insights` | LLM-compiled structured insights from Teams DM conversations |
| `tasks` | Action items extracted from conversations by the Teams compiler |
| `source_signal_candidates` | Candidate signals (risks, decisions) before promotion to `insights` |

---

## 4. Sync Orchestration

**Entry point:** `run_graph_sync()` in `backend/src/services/integrations/microsoft_graph/sync.py`

**Triggered by:** Render cron job `alleato-graph-sync` every 30 minutes (`*/30 * * * *`). Can also be triggered manually via the `/api/graph/sync` endpoint.

**Execution sequence (strictly serial within each phase):**

```
1. Outlook sync
   For each user in MICROSOFT_SYNC_USERS:
   - Fetch delta token from graph_sync_state
   - Call sync_outlook_emails() → delta query from Graph API
   - Filter noise (_is_noise_email), filter relevance (_is_relevant_email)
   - Write to outlook_email_intake (all non-noise)
   - Write to document_metadata (relevance-passed only)
   - Write to project_emails (project-matched only)
   - Save new delta token to graph_sync_state
   - Record run in source_sync_runs

2. Teams channel sync
   - Enumerate teams/channels from graph_sync_state or Graph API
   - For each channel: delta query, upsert into document_metadata
   - Save delta tokens

3. Teams DM sync
   For each user in MICROSOFT_SYNC_USERS:
   - Timestamp-based (NOT delta query — Graph API limitation with app-only auth)
   - Fetch last_sync_at from graph_sync_state
   - Sync messages newer than that timestamp
   - Group into conversations, write to document_metadata as teams_dm_conversation

4. OneDrive / SharePoint sync
   For each user × folder in ONEDRIVE_SYNC_FOLDERS:
   - Delta query, extract text from supported file types
   - Write to document_metadata
   For each entry in SHAREPOINT_SYNC_FOLDERS:
   - Same pattern

5. Embedding phase (run_embedding=True, default)
   embed_pending_graph_documents(supabase, limit=1000)
   - Picks up all document_metadata where source='microsoft_graph'
     AND status IN ('raw_ingested', 'segmented', 'compiled')
   - Runs embed_graph_document() on each
   - Writes chunks to document_chunks
   - Updates document_metadata.status → 'embedded'

6. Teams compiler phase (run_teams_compiler=True, default)
   run_compiler_batch(supabase, batch_size=25)
   - Processes uncompiled Teams DM conversations
   - LLM extraction of tasks, insights, risks, decisions
   - Writes to project_insights, tasks, source_signal_candidates
   - Time-limited to ~170 seconds per batch
```

**Error behavior:** Each source is wrapped independently. A failure in Outlook sync does not block Teams sync. All errors accumulate in `summary["errors"]`. The cron exits with code 1 only when there are errors AND total_synced is 0 (complete failure). Partial success returns code 0.

**Toggle env vars:**

| Var | Default | Controls |
|-----|---------|---------|
| `GRAPH_SYNC_OUTLOOK` | `true` | Outlook email sync |
| `GRAPH_SYNC_TEAMS` | `true` | Teams channel sync |
| `GRAPH_SYNC_TEAMS_DM` | `true` | Teams DM sync |
| `GRAPH_SYNC_ONEDRIVE` | `true` | OneDrive/SharePoint sync |
| `MICROSOFT_SYNC_USERS` | (required) | Comma-separated mailboxes to sync |
| `ONEDRIVE_SYNC_FOLDERS` | `/Projects` | Comma-separated folder paths |
| `SHAREPOINT_SYNC_FOLDERS` | (empty) | Format: `hostname/site:folder_path` |
| `OUTLOOK_SYNC_SINCE` | (none) | Initial full-sync start date, e.g. `2024-01-01` |

---

## 5. Embedding

**Function:** `embed_pending_graph_documents()` in `backend/src/services/integrations/microsoft_graph/embed.py`

**When it runs:** Synchronously at the end of every `run_graph_sync()` call, before the Teams compiler. There is no DB trigger.

**Model:** `text-embedding-3-large` at native 3072 dimensions (`halfvec(3072)` pgvector column)

**Provider chain:** AI Gateway (`ai-gateway.vercel.sh`) is tried first if `AI_GATEWAY_API_KEY` is set; falls back to direct OpenAI if `OPENAI_API_KEY` is set. Both must be absent for the step to fail hard.

**Chunking parameters:**
- Max chunk size: 3 000 chars
- Overlap: 400 chars (sentence-boundary aligned)
- Title prepended to each chunk's text for retrieval quality

**Minimum content thresholds (substantive chars, excluding filler words):**
- `teams_dm_conversation`: 200 chars
- `teams_message`: 200 chars
- `email`: 300 chars
- Other types: 1 char

Items that fail the threshold are marked `skipped_low_content` and not retried.

**Status lifecycle on `document_metadata`:**

```
raw_ingested  →  embedded           (success)
raw_ingested  →  skipped_low_content  (too short)
raw_ingested  →  error              (embedding provider failure)
```

Re-embedding: deletes existing chunks for the document before inserting new ones, so re-running is safe.

---

## 6. Project Assignment

**Function:** `infer_project_id()` in `backend/src/services/integrations/microsoft_graph/project_inference.py`, which delegates to `ProjectAssigner` in `backend/src/services/ingestion/project_assignment.py`

**Minimum confidence threshold:** 0.70 (controlled by `GRAPH_PROJECT_ASSIGN_MIN_CONFIDENCE` env var)

**The four strategies (tried in order):**

| Strategy | Method | Typical confidence |
|----------|--------|-------------------|
| 1. Title match | Project name / alias appears in subject/title | High (0.90+) |
| 2. Contacts match | Participant email domain or address matches known project contacts | Medium-high (0.75–0.90) |
| 3. Domain match | Sender/recipient domain matches a client domain on a project | Medium (0.70–0.80) |
| 4. Content match | Project name / alias mentioned in body text | Medium (0.70–0.85) |

**When confidence ≥ 0.70:** `project_id` is set on `document_metadata` and `outlook_email_intake`. The email is also written to `project_emails`.

**When confidence < 0.70:** `project_id` is left null. The record is written to `document_attribution_candidates` for manual review. These are visible in the source sync health dashboard but have no dedicated review UI as of 2026-05-07.

**Known gap:** There is no UI for the `document_attribution_candidates` review queue. Admins must query the table directly to find and assign unmatched items.

---

## 7. AI Read Path

The AI assistant uses three RPCs. All are pgvector-backed. **Never query `document_metadata`, `outlook_email_intake`, or `project_emails` directly in AI tools** — those tables are not indexed for semantic search and will miss the vector ranking.

| RPC | What it searches | When to use |
|-----|-----------------|-------------|
| `search_document_chunks` | All embedded documents: emails, Teams messages, Teams DMs, OneDrive files, meeting transcripts | Any topic/semantic question |
| `search_all_knowledge` | `insights` table (LLM-compiled decisions, risks, opportunities) | "What decisions were made about X?" |
| `search_knowledge_base` | `company_knowledge` table | Company policy, standard procedures |

**AI tool mapping:**

| User question type | Tool | Backing table |
|-------------------|------|--------------|
| "What emails today / this week?" | `getRecentEmails` | `outlook_email_intake` (date filter) |
| "Find emails about [topic]" | `searchEmails` | `document_chunks` via `search_document_chunks` |
| "What Teams messages mention X?" | `searchTeamsMessages` | `document_chunks` via `search_document_chunks` |
| "What's the latest on [project]?" | `searchEmails` + `searchTeamsMessages` + `searchMeetingsByTopic` + `semanticSearch` in parallel | `document_chunks` |
| "What risks / decisions on X?" | `semanticSearch` | `document_chunks` + `search_all_knowledge` |

The `semanticSearch` tool calls `search_document_chunks` + `search_all_knowledge` + `search_knowledge_base` in parallel and merges results.

---

## 8. Known Limitations

### Teams DM 403 errors (permanent, no fix possible)

**Status as of 2026-05-06:** 273 of 283 configured chats sync successfully. 10 chats return permanent HTTP 403s.

**Affected chat types:**
- Cross-tenant chats (thread IDs ending in `@unq.gbl.spaces`) — external guests in the tenant
- Meeting chats (thread IDs ending in `@thread.v2`) — ad-hoc meeting chat threads

**Root cause:** The Microsoft Graph API does not expose these chat types to app-only (client credentials) authentication regardless of consent scopes granted. This is a hard Microsoft limitation. Delegated auth would resolve it but requires a user-signed-in flow incompatible with background cron jobs.

**What this means:** These 10 conversations are not in the system and will never be unless Microsoft changes its API. Do not file a bug or attempt a fix.

**Detection:** The sync logs `ChatReadPermissionError` for these chats and records them in `source_sync_runs` with `status='skipped'` and `metadata.required_permission='Chat.Read.All'`. The cron does not fail due to these — it breaks out of the DM loop for all users since all share the same tenant.

### No review UI for low-confidence project assignments

Items where the project assignment confidence falls below 0.70 are written to `document_attribution_candidates` but there is no frontend for reviewing and correcting them. A developer must query the table directly:

```sql
SELECT source_document_id, title, method, confidence, created_at
FROM document_attribution_candidates
ORDER BY created_at DESC
LIMIT 50;
```

The table has been populated since the pipeline launched. Building a review UI is a known gap on the roadmap.

### Delta queries not supported for Teams DMs with app-only auth

Teams channel messages support Graph delta queries (incremental fetch). Teams direct messages do not — the Graph API rejects delta query parameters when using client credentials auth. The DM sync uses timestamp-based incremental sync: it stores the last sync timestamp in `graph_sync_state` and fetches messages newer than that value each run. This means very recent messages (within the same 30-minute window) may be fetched twice and deduplicated by upsert.

---

## 9. Runbook

### Sync appears to have stopped (no new documents)

1. Check the Render dashboard for `alleato-graph-sync` — confirm the cron is firing and look at the last run's logs.
2. Query the sync ledger:
   ```sql
   SELECT source, resource_name, status, items_synced, error_message, finished_at
   FROM source_sync_runs
   ORDER BY finished_at DESC
   LIMIT 20;
   ```
3. Check `graph_sync_state` for delta token staleness:
   ```sql
   SELECT source, resource_name, last_sync_at, sync_status, error_message
   FROM graph_sync_state
   ORDER BY last_sync_at DESC;
   ```
4. If `sync_status = 'error'` on a mailbox, check whether the Graph API token is valid. A common cause is expired Azure AD client credentials. Rotate `MICROSOFT_CLIENT_SECRET` in Render env vars and redeploy.

### Embedding not keeping up (items stuck in raw_ingested)

1. Count stuck items:
   ```sql
   SELECT count(*), category
   FROM document_metadata
   WHERE source = 'microsoft_graph' AND status = 'raw_ingested'
   GROUP BY category;
   ```
2. Check `source_sync_runs` for the `graph_embed` resource_id — look for `status = 'failed'`.
3. A common cause is the AI Gateway key expiring. Check `AI_GATEWAY_API_KEY` in Render. The embed step falls back to `OPENAI_API_KEY` if the gateway key is absent, so the fallback may be silently active.
4. To manually trigger a backfill, POST to `/api/graph/sync` with `{"run_embedding": true, "run_teams_compiler": false}` from a service-role-authenticated client, or trigger the cron manually from the Render dashboard.

### Document has wrong or missing project assignment

1. Find the document:
   ```sql
   SELECT id, title, project_id, status, source_path
   FROM document_metadata
   WHERE id = '<uuid>';
   ```
2. If `project_id` is null, check `document_attribution_candidates`:
   ```sql
   SELECT * FROM document_attribution_candidates
   WHERE source_document_id = '<uuid>';
   ```
3. To manually assign: update `document_metadata.project_id` directly. This does not re-embed; the existing chunks inherit the project_id via the `metadata` jsonb, so a re-embed is needed for the chunk metadata to reflect the change:
   ```sql
   UPDATE document_metadata SET project_id = <id>, status = 'raw_ingested'
   WHERE id = '<uuid>';
   ```
   The next sync run's embedding phase will re-chunk and re-embed with the correct project.

### Teams compiler not producing insights

1. Check for uncompiled DM conversations:
   ```sql
   SELECT count(*) FROM document_metadata
   WHERE type = 'teams_dm_conversation' AND status != 'embedded';
   ```
2. Look at `source_sync_runs` for `resource_id = 'teams_compiler'`.
3. The compiler runs with a 170-second internal time limit and a batch cap of 25 per sync run. If there is a large backlog, it will catch up over multiple runs. This is expected behavior.
4. If the compiler is erroring, check the Render cron logs for LLM provider failures — the compiler uses the same AI Gateway / OpenAI fallback chain as the embedding step.

### How to trigger a manual full resync of a mailbox

Clear the delta token for the mailbox so the next run does a full pull:
```sql
UPDATE graph_sync_state
SET delta_token = NULL, sync_status = 'pending'
WHERE source = 'outlook_email' AND resource_id = 'user@company.com';
```
The next cron run will fetch all mail from `OUTLOOK_SYNC_SINCE` (or the beginning if that var is unset). This can produce a large number of items; set `OUTLOOK_SYNC_SINCE` to a reasonable date before triggering.
