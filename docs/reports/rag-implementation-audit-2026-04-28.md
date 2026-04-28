# RAG Implementation Audit — Teams DMs, Emails, and Chunking Strategy

**Date:** 2026-04-28
**Author:** Senior RAG architect (audit)
**Scope:** Teams DMs, Outlook emails, meeting transcripts, and document chunking inside `document_chunks` (unified pgvector store, 85K+ rows, `text-embedding-3-large` @ 3072d).

---

## Executive Summary (plain English)

**You are right.** A one-sentence Teams DM should not be embedded as its own row. It is the single biggest source of noise in your retrieval pipeline today. The current code does not aggregate DMs — every short message becomes its own chunk, and the database is now full of low-content vectors that compete with high-value meeting content for retrieval slots.

There are five things to fix, in this order:

1. **Group Teams DMs by conversation per day, not per message.** Code at `backend/src/services/integrations/microsoft_graph/teams.py` already partially does this (`_conversation_doc_id("teamsdm", chat_id, date_key)` keys by chat-id + day). The problem is each new message _appends_ to that doc and re-embeds it as a single big chunk. That part is good. The real issue is **20,883 of these are stuck in `raw_ingested`** — never embedded at all. So step one is unblock the embedding queue, not redesign chunking. The chunking design for DMs is already mostly correct; we just need to enforce a minimum content threshold and embed the daily-aggregated text once a day, not on every new message arrival.
2. **Group emails by thread (`conversationId`), not by message.** The current code treats each email as its own document (`outlook_{msg_id}`). This is wrong for threads. We should aggregate by `conversationId` and re-embed when a new reply arrives.
3. **Add a minimum-content gate.** Any aggregated DM doc under ~200 chars of substantive content should be skipped from embedding entirely. Most Teams DMs that look like "ok", "thanks", "lol" should never reach pgvector.
4. **Fix the Outlook JSON parse errors** (separate bug, 673 stuck) — almost certainly malformed `body.content` HTML stripping or missing recipient fields. Triage in parallel.
5. **Add a reranker quality gate and source-aware retrieval boosting.** You already have an LLM reranker (`operational.ts:146`) and time-decay logic. The missing piece is suppressing low-content sources at retrieval time when meetings/docs already have a strong signal — a simple "if top-3 contains a meeting with sim > 0.6, drop all teams_message hits below 0.5" rule would dramatically cut noise.

You do not need to rebuild anything. The architecture is sound — meetings, sections, summaries, and segment chunks are all flowing into a unified `document_chunks` table with the right embedding model and dimensions. The ratios are wrong: too many tiny DM chunks, not enough thread-aggregated emails, no gate against noise. Calm fix list, not a rewrite.

---

## 1. Current State

### 1.1 Pipeline architecture (what exists today)

```
document_metadata (12,685 rows)
   │
   ├─ source = "fireflies"          → orchestrator → parser.py     → meeting_segments → embedder.py → document_chunks
   ├─ source = "microsoft_graph"    → microsoft_graph/embed.py     → document_chunks (direct, no segmentation)
   └─ category in {pdf,docx,xlsx}   → document_parser.py           → meeting_segments → embedder.py → document_chunks
```

**Embedding model:** `text-embedding-3-large`, 3072 dimensions, halfvec column with HNSW index (just dropped — see §6).
**Chat model for reranker / segmentation:** `gpt-4o-mini`.
**Chunking targets:**
- `backend/src/services/pipeline/embedder.py:25-26` — `CHUNK_TARGET_CHARS = 3000`, `CHUNK_OVERLAP_CHARS = 500` (~750 / 125 tokens)
- `backend/src/services/integrations/microsoft_graph/embed.py:20-21` — `CHUNK_MAX_CHARS = 3000`, `CHUNK_OVERLAP_CHARS = 400`

These are reasonable values, aligned with LlamaIndex/LangChain defaults (~512–1024 tokens with 10–20% overlap). Good.

### 1.2 Meetings (Fireflies) — solid pattern

`backend/src/services/pipeline/embedder.py` produces multiple chunk types per meeting (lines 286–326):

- One `meeting_summary` chunk (whole-meeting summary)
- One `segment_summary` chunk per LLM-derived semantic segment
- N `meeting_transcript` chunks per segment (sentence-aware sliding window)
- N `meeting_section` chunks (rich Fireflies sections — Action Items, Outline, Bullet Gist, etc.)
- N `meeting_notes` chunks (per Notes topic)

This is a **multi-granularity / hierarchical retrieval** layout — exactly what Anthropic's contextual retrieval paper and LlamaIndex's "auto-merging retriever" recommend. The summary chunks help with broad questions, the transcript chunks help with verbatim quotes. **Keep this. Don't change anything here.**

One nice touch worth preserving: section chunks are prefixed with `[{meeting_title}] {section_name}:\n\n` (line 175) — that's a manual form of contextual retrieval and improves recall meaningfully.

### 1.3 Teams DMs — what's actually happening

Code: `backend/src/services/integrations/microsoft_graph/teams.py:280-366` (`_process_chat_message`).

What it does today:
- Per-message: strip HTML, gate at 20 chars min (`MIN_MESSAGE_CHARS = 20`).
- Compute a **per-conversation-per-day** doc_id: `teamsdm_<sha16(chat_id)>_<YYYY-MM-DD>`.
- If the doc exists, **append** the new line `[message:{msg_id}] [time] {sender}: {body}` to its `content` field and `UPDATE`.
- If not, insert with `status = 'raw_ingested'`.
- Status = `raw_ingested` is the queue input for `embed_pending_graph_documents`.

What's broken:
- **19,400 rows stuck at `raw_ingested`** — embedding has not been running, or has been throttled. The chunking design is mostly right; the worker isn't draining.
- **No minimum-content threshold at the document level.** A `teamsdm` doc with only "ok" + "thanks" still gets embedded.
- **Re-embed thrash:** every new message in an active chat triggers an UPDATE on the doc, but the worker doesn't know it needs to re-embed — there's no `status` rollback to `raw_ingested` after content append. So once a doc is `embedded`, later same-day messages silently sit unindexed inside the row.
- **Source type confusion:** `category = "teams_message"` is used for both channel messages AND DMs (line 354 has the comment "same category → picked up by searchTeamsMessages tool"). DMs and channel messages have very different signal density and should be retrievable separately.

### 1.4 Outlook emails — what's actually happening

Code: `backend/src/services/integrations/microsoft_graph/outlook.py:85-238`.

What it does today:
- Per-email: strip HTML body, doc_id = `outlook_{msg_id}` — **one document per email message**.
- Inserts `category = "email"`, `status = 'raw_ingested'`.
- Embedding then prepends title (subject) and chunks at 3000 chars.

What's broken:
- **No thread aggregation.** A 12-reply email thread becomes 12 separate documents, each with its own subject/body and a lot of overlapping quoted history. This bloats vector count, fragments retrieval, and means the LLM gets the same quoted text 12 times.
- **No quoted-text stripping.** The HTML strip leaves "On Mon, ... wrote:" reply chains in every message body — this is a well-known retrieval poisoner. Each reply re-embeds all the parent text.
- **673 stuck in error / parse failure** — separate bug. Likely cause: emails where `body.content` is null or `from`/`recipients` is missing fields. Worth a 30-minute triage pass through `embed_pending_graph_documents` log output.

### 1.5 Retrieval side (what the chat route does)

`frontend/src/lib/ai/tools/operational.ts`:
- Calls `search_document_chunks` / `search_all_knowledge` / `search_knowledge_base` RPCs (vector-only, threshold ~0.4).
- Has a **time-decay blend** (lines 1767–1798): `score = similarity * (1 - recencyWeight) + recency * recencyWeight`. Good.
- Has an **LLM reranker** (`rerankWithLLM`, line 146 + line 1808) that re-scores candidates by query relevance. Good.
- Source-type filtering: there's a flag `allowAdminCommsSources` that gates email/teams_message visibility for non-admin users (line 1879). Good privacy hygiene.
- **No BM25 / full-text hybrid search** on `document_chunks`. There's a `full_text_search_meetings` RPC (line 2196) but it's only used on `document_metadata.summary`, not chunks.

What's missing:
- Hybrid search (vector + BM25) at the chunk level. State of the art (per Anthropic contextual retrieval, LlamaIndex hybrid retrievers, Pinecone hybrid) is +30–40% recall over pure vector.
- Source-aware quotas at the retrieval level. Currently all chunk types compete in one similarity ranking.

---

## 2. Verdict on Your Concerns

### "Single-sentence Teams DMs shouldn't be embedded individually."

**Confirmed. You are correct.**

Industry convention (LlamaIndex `ChatMessageReader`, LangChain `MessagesAggregator`, Glean, Notion AI):
- **Always aggregate chat messages into time-bounded conversation windows** before embedding.
- Typical windowing: per-channel-per-day, or per-thread (root + replies), or rolling N-message windows of 8–20 messages.
- **Never** index individual one-line messages.

Your current code _does_ aggregate per-chat-per-day at the document level. That part is fine. The fixes are: actually run the embedder, drop docs under a content-density threshold, and refresh embeddings when new messages append.

### "Emails — would the entire thread be better?"

**Yes — by `conversationId`, with quoted text stripped.**

Standard approach (Gmail/Outlook RAG patterns from Glean, Hebbia, Cohere):
1. Aggregate by `conversationId` (Microsoft Graph provides this — `message.conversationId`).
2. Strip quoted history (`On … wrote:`, `> ` prefixes, `<blockquote>` tags). The signal is in the *new* content of each reply, not the requoted history.
3. Embed the thread as one document with all replies in chronological order, prefixed by subject + participants.
4. Re-embed on new replies (rolling thread).

This collapses your 673 stuck emails + future inflow by ~5–10× and dramatically improves retrieval accuracy.

---

## 3. Concrete Chunking Strategy Per Source Type

| Source | Group by | Min content | Max chunk chars | Overlap | Notes |
|---|---|---|---|---|---|
| **Teams DM** | chat_id + date (per-day window) — already implemented | 200 substantive chars after dedup of "ok/thanks/lol" | 3000 | 300 | Re-embed when new msgs append. Skip days where total substantive content < 200 chars. Consider a per-week rollup for low-volume DMs. |
| **Teams Channel msg** | thread root + all replies (already implemented in `sync_teams_channel`) | 200 chars | 3000 | 300 | Channel threads are higher signal than DMs — keep as-is, just enforce min content. |
| **Email** | `conversationId` (NEW — currently per-message) | 300 chars after quote-strip | 3000 | 400 | Strip quoted history. Prefix with `Subject: …\nParticipants: …\n\n` for context. Re-embed on new reply. |
| **Meeting (Fireflies)** | LLM-derived semantic segment + section + summary (existing) | Existing thresholds fine | 3000 | 500 | **No change.** Already multi-granularity. |
| **Document (PDF/DOCX)** | LLM-derived semantic segment (existing) | Existing fine | 3000 | 500 | **No change.** |

**Rule of thumb (LlamaIndex / LangChain):** 512–1024 tokens per chunk, 10–20% overlap, semantic boundaries when possible. Your 3000 chars / 500 overlap (~750 / ~125 tokens) is on the small end but appropriate for short-context QA against gpt-4o-mini.

---

## 4. Retrieval-Time Fixes

### 4.1 Hybrid search (BM25 + vector) — recommended, not present
You currently use vector-only via `search_document_chunks`. Postgres has `tsvector` + `pgvector` working together — typical hybrid pattern is RRF (Reciprocal Rank Fusion) of two ranked lists. Implementation cost: one new RPC, ~100 lines SQL. Expected lift: +20–35% recall on keyword-heavy queries (proper nouns, project codes, ticket IDs).

**Priority: medium.** Do after fixing the DM/email backlog.

### 4.2 Reranker — already present, working well
`rerankWithLLM` (`operational.ts:146` + `:1808`) re-scores top 20 candidates with `gpt-4o-mini`. This is fine. You could swap to Cohere Rerank 3.5 for ~2× speed and slightly better quality, but not urgent.

### 4.3 Source-aware retrieval — partial, needs hardening
Today: `allowAdminCommsSources` flag gates whether email/teams_message are visible at all. That's a privacy gate, not a quality gate.

What's missing — **a quality-aware quota system**:
- When the query is broad ("what's the status of project X"), bias toward `meeting_summary` and `meeting_section` chunks first; only include `teams_message` if no high-similarity meeting hits exist.
- When the query is narrow ("did Alex reply about the change order"), bias toward `email` and `teams_message`.
- A simple heuristic that works: **force a minimum number of meeting/doc chunks in the top-K result set**, with DMs/emails competing for the remaining slots. Pinecone calls this "diversity by metadata."

**Priority: high.** This is a 50-line change that solves most of your noise problem at retrieval time, even if you don't change ingestion.

---

## 5. Implementation Priority

### Tier 1 — Do this week (highest leverage)
1. **Drain the 19,400 `teamsdm_*` queue** with a content-density gate. Add: `if substantive_chars < 200: skip + mark status='skipped_low_content'`. This alone removes the bulk of the noise problem without re-architecting anything.
2. **Triage the 673 outlook errors.** Read 5 random failed rows from `fireflies_ingestion_jobs.error_message`. The fix is almost certainly a null-safe field access in `outlook.py:_format_email_as_text`.
3. **Recreate the HNSW index** that was just dropped. After backlog drains and noise is filtered, rebuild — it'll be smaller and faster. Set `maintenance_work_mem` high and use `CREATE INDEX CONCURRENTLY` to avoid lock-out.

### Tier 2 — Next 1–2 weeks (high value, real work)
4. **Email thread aggregation by `conversationId`.** Backfill: walk existing `outlook_*` rows, group by `conversationId` (need to fetch this from Graph or store it during sync), merge content, re-embed, delete the per-message rows. This collapses email count ~5–10× and fixes retrieval quality on email questions.
5. **Quoted-text stripper** for emails (regex on `On … wrote:`, `^> `, `<blockquote>`). 50 lines. Big quality win.
6. **Re-embed-on-append** for `teamsdm` rows: when content is appended, set `status = 'raw_ingested'` so the embedder picks it up again. One-line change in `_process_chat_message`.

### Tier 3 — Next month (architectural improvement)
7. **Source-aware retrieval quota** in the chat route (Pinecone-style diversity-by-metadata).
8. **Hybrid search RPC** (BM25 + vector + RRF) for `document_chunks`.
9. **Split `category = "teams_message"`** into `teams_channel` vs `teams_dm` so retrieval can weight them differently.

### Not worth doing now
- Switching embedding models. `text-embedding-3-large` @ 3072d is fine — 85K rows is small.
- Cohere Rerank migration. Your LLM reranker works.
- Contextual retrieval (Anthropic paper) — costs ~$1 per 1000 docs to add a chunk-prefix LLM call. Worth it _after_ DM/email cleanup, not before.

---

## 6. Sharp Edges in Current Code

These are real bugs / risks that will bite you, listed by file path.

### `backend/src/services/pipeline/embedder.py`
- **Line 8 / docstring out of date:** says "stored in the `documents` table" — actually writes to `document_chunks`. Cosmetic, but confusing.
- **Line 451:** `_get_existing_chunks_by_hash` SELECT-loads ALL chunks for a doc (no LIMIT). For meetings with hundreds of chunks this is fine; for the (future) thread-aggregated email case where one doc could have 100+ chunks it's still fine, but watch payload size if you ever raise `CHUNK_TARGET_CHARS`.
- **Line 446:** the upsert is per-chunk, not batched. Embedding a 100-segment meeting fires 100+ separate UPSERT round trips. **Likely contributor to the recent insert-timeout issue that forced the HNSW drop.** Batch these into chunks of 50 (matches the pattern in `microsoft_graph/embed.py:228`).

### `backend/src/services/integrations/microsoft_graph/embed.py`
- **Line 226:** `delete().eq("document_id", metadata_id)` then re-insert. This is fine for single-doc re-embed but not idempotent under concurrency — if two workers process the same doc, one will see partial state. Add a `SELECT FOR UPDATE` or use `ON CONFLICT (chunk_id) DO UPDATE` (the schema already has a unique chunk_id constraint).
- **Line 100-108 `_source_type_for_document`:** maps `category="teams_message"` → `source_type="teams_message"` for both channel msgs and DMs. As noted, these have very different signal density — split them.

### `backend/src/services/integrations/microsoft_graph/teams.py`
- **Line 366:** doc UPDATE on append doesn't reset `status`. Means new same-day messages never get re-embedded into existing chunks. **This is a real data correctness bug.** Set `status = 'raw_ingested'` whenever you append.
- **Line 117:** `doc_id = f"teams_{msg_id}"` for channel root messages — but channel _replies_ are folded into the root. If the channel has 100 root msgs each with 50 replies, that's still 100 docs, which is fine. But if the same root msg gets re-fetched from delta, the existing-check at line 120 prevents re-ingestion of new replies. **You will lose late-arriving replies on hot channel threads.** Consider a per-day rollup like DMs use.

### `backend/src/services/integrations/microsoft_graph/outlook.py`
- **Line 173:** `doc_id = f"outlook_{msg_id}"` — per-message, not per-thread. As discussed, this is the primary email RAG bug.
- **Line 161:** `_format_email_as_text` does NOT strip quoted history. Every reply re-embeds the entire conversation. This both wastes embedding budget and pollutes retrieval.

### `frontend/src/lib/ai/tools/operational.ts`
- **Line 1605:** `["email", "teams_message"]` source-type filtering is done in JS after the RPC returns. Move to the RPC for less wire traffic.
- **Line 2647:** `matchThreshold: 0.4` is on the loose end. `text-embedding-3-large` typically wants 0.45–0.55 as a default floor. Might be why low-content DMs are appearing in results — they pass the threshold easily because they're short and generic. After backlog drain, raise to 0.5 and re-evaluate with `rag_eval.py`.

### Schema / index
- **HNSW index just dropped (701 MB).** Until you rebuild, all vector queries fall back to seq scan — chat performance will be bad. Rebuild plan: fix backlog → filter low-content rows → `CREATE INDEX CONCURRENTLY ... USING hnsw (embedding halfvec_cosine_ops)` with `m=16, ef_construction=64` (standard pgvector defaults). Expected size after cleanup: ~300–400 MB.

### Embedding consistency
- Both `pipeline/embedder.py` and `microsoft_graph/embed.py` use the same model (`text-embedding-3-large`, dim=3072). Good — no embedding-space drift.
- Both call `dimensions=3072` explicitly (good — defends against the OpenAI default-changes-someday risk).
- Both truncate input to 8000 chars (good — avoids overflow on the model's 8192-token limit).

---

## 7. What "Done" Looks Like

After Tier 1 + Tier 2:

- `document_chunks` row count drops from 85K → ~50K (DM noise filtered, emails consolidated by thread).
- HNSW index rebuilds at ~300 MB instead of 701 MB.
- Retrieval P95 latency drops by 30–50%.
- `rag_eval.py` accuracy on Teams/email questions rises measurably (you have eval scripts in `backend/src/scripts/rag_eval.py`, `rag_reranker_eval.py`, `eval_graph_sync.py` — use them as the regression bar).
- Zero rows stuck in `raw_ingested` for >24h; alerting / a daily cron reports the count.

---

## 8. Open Questions for You

1. **DMs older than 90 days — do you care?** If not, add a date floor at sync time. Could halve volume immediately.
2. **Channel messages vs DMs — different retention?** Channels are usually more project-relevant. If you want, we can index channels with full granularity and DMs only as daily summaries (LLM-condensed to ~3 sentences per chat-day).
3. **Email retention scope.** Are you syncing _every_ email or only project-keyword-matching ones? `outlook.py:158` already calls `_is_relevant_email(msg, project_keywords)` — confirm those keywords are tight.

These three answers determine whether your final chunk count is 30K, 50K, or 100K. All three are tractable.
