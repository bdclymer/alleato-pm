# Handoff — RAG embedding-encoding inconsistency + retrieval seam

**Created:** 2026-07-09
**Source:** `/improve-codebase-architecture` review, Card 2 (AI/RAG deepening)
**Type:** Correctness fix (fast) + deepening refactor (durable guardrail)
**Owner DB:** AI Database (RAG) `fqcvmfqldlewvbsuxdvz` — the `search_document_chunks` RPC lives here
**Est. blast radius:** the category-scoped document searches in the assistant (6 tool call sites)

---

## TL;DR

The core RAG retrieval step — embed a query, call the `search_document_chunks` RPC — is copy-pasted across **7 call sites**. Six of them encode the query embedding as a **JSON string**; **one outlier passes a raw `number[]` array**. The RPC argument is typed `unknown`, so TypeScript cannot catch the mismatch. Fix the outlier, then collapse all seven sites onto **one deep `retrieveChunks` module** so the encoding lives in exactly one place and this class of bug cannot recur.

Do the **fast fix first** (one-line-ish, un-blocks retrieval), ship it, then do the **deepening** as a follow-up slice.

---

## Confirmed facts (verified against the code 2026-07-09)

### The canonical encoding is a JSON string

`generateEmbedding` in `frontend/src/lib/ai/tools/tool-utils.ts:44` returns the vector **already JSON-stringified**, with an explicit warning comment:

```ts
// tool-utils.ts:40-42
/**
 * Generate an embedding and return it JSON-stringified for use in RPC args.
 * NOTE: The return value is already a JSON string — do NOT wrap it in JSON.stringify() again.
 */
// ...
return JSON.stringify(resp.data[0].embedding);   // :60
```

The RPC arg type is loose, which is why the compiler is blind to the mismatch:

```ts
// frontend/src/types/rag-database.types.ts:1096-1103
search_document_chunks: {
  Args: {
    ...
    query_embedding: unknown        // <-- accepts string OR array; no type safety
  }
```

### Call-site inventory — `search_document_chunks(query_embedding: …)`

| # | File / line | How the embedding is produced | Encoding passed to RPC | Status |
|---|---|---|---|---|
| 1 | `frontend/src/lib/ai/tools/operational.ts:1537` (`semanticSearch`) | `generateEmbedding(...)` | **JSON string** | ✅ canonical |
| 2 | `frontend/src/lib/ai/tools/operational.ts:3522` (`searchDocumentChunksByCategory`) | raw `openaiClient.embeddings.create` → `data[0].embedding` | **raw `number[]`** | ⚠️ **OUTLIER** |
| 3 | `frontend/src/lib/ai/tools/document-intelligence.ts:1028` | `generateEmbedding(...)` | **JSON string** | ✅ canonical |
| 4 | `frontend/src/lib/ai/services/ai-memory-service.ts:625` | `embed()` then `JSON.stringify(embeddingVec)` | **JSON string** | ✅ canonical |
| 5 | `frontend/src/lib/ai/services/workspace-artifact-service.ts:531` | `embed()` then `JSON.stringify(embeddingVec)` | **JSON string** | ✅ canonical |
| 6 | `frontend/src/lib/ai/services/agent-learning-service.ts:412` | `embedLearning()` then `JSON.stringify(queryEmbedding)` | **JSON string** | ✅ canonical |
| 7 | `frontend/src/lib/executive/brandon-daily-update.ts:1523` (`runChunkSearch`) | receives `queryEmbedding: string` | **JSON string** | ✅ canonical |

The outlier, in full:

```ts
// frontend/src/lib/ai/tools/operational.ts:3513-3523  (inside searchDocumentChunksByCategory)
const openaiClient = getOpenAI();
const embeddingResponse = await openaiClient.embeddings.create({
  model: "text-embedding-3-large",
  dimensions: 3072,
  input: query,
});
const queryEmbedding = embeddingResponse.data[0].embedding;   // number[]  ← NOT stringified

const { data, error } = await supabase.rpc("search_document_chunks", {
  query_embedding: queryEmbedding,                            // ← passes raw array
  ...
});
```

### Blast radius of the outlier

`searchDocumentChunksByCategory` is the shared helper behind the assistant's **category-scoped document search**. It is called from **6 sites** in `operational.ts`: lines **3000, 3011, 3023, 3405, 3432, 3457** (plus a `searchDocumentChunksByCategoryFallback` at 3544). If the array encoding does not retrieve correctly, every one of these tool paths returns degraded or empty results.

### When it was introduced

The raw-array block landed **2026-05-13** in commit `aa9b0fc72` "Cut over RAG reads for assistant and Render jobs" — the RAG-read migration to the AI Database. So the outlier has plausibly been degraded **since the cutover** if the array form does not work.

---

## The ONE open question you must answer first (do not skip)

**Does the raw `number[]` form actually fail, or does PostgREST/pgvector coerce it?**

`search_document_chunks`'s `query_embedding` parameter is a `halfvec(3072)`. A JSON **string** `"[0.1,0.2,…]"` casts cleanly to a vector literal. A JSON **array** may be coerced by PostgREST into a Postgres array literal `{0.1,0.2}` — which is **not** a valid vector literal — and either error or silently mis-cast. The whole codebase stringifies precisely to avoid this. **But confirm empirically before assuming.**

**How to confirm (pick the cheapest that gives a definitive answer):**

1. **Direct RPC probe against the RAG DB** (fastest). Using the RAG service client (`createRagServiceClient()` / `get_rag_read_client()`, project `fqcvmfqldlewvbsuxdvz`), call `search_document_chunks` twice with the **same** embedding — once as `JSON.stringify(vec)`, once as the raw `vec` — with `filter_source_types` matching one of the categories `searchDocumentChunksByCategory` uses. Compare row counts / errors. Write the probe as a throwaway script under `scripts/` (not repo root — see FILE-ORGANIZATION-GATE) or run via the Supabase MCP once authorized.
2. **Langfuse / production traces.** Check whether the assistant's category document searches have been returning hits since 2026-05-13. If they've been empty/degraded, that corroborates a real regression. (See `reference_ai_master_plan` in memory for Langfuse access; note `LANGFUSE_BASE_URL` gotcha.)
3. **Check the error path.** `searchDocumentChunksByCategory` has timeout/error handling (`operational.ts:3533+`) and a `searchDocumentChunksByCategoryFallback` (`:3544`). Confirm whether an RPC error on the array form is being **silently swallowed into the fallback** — that would explain why nobody noticed. Per CLAUDE.md core principle: **never ship silent failures** — if the fallback is masking a hard error, that's a second bug to fix (make it log/raise).

Record the answer in this file before proceeding, so the fix is grounded, not assumed.

---

## The fast fix (do this first, ship it)

Route the outlier through the canonical helper so it matches the other six sites.

In `frontend/src/lib/ai/tools/operational.ts`, inside `searchDocumentChunksByCategory` (~3512-3523), replace the raw `embeddings.create` + raw-array pass with `generateEmbedding` (already imported in this file and used at line 1514):

```ts
// BEFORE
const openaiClient = getOpenAI();
const embeddingResponse = await openaiClient.embeddings.create({
  model: "text-embedding-3-large",
  dimensions: 3072,
  input: query,
});
const queryEmbedding = embeddingResponse.data[0].embedding;
const { data, error } = await supabase.rpc("search_document_chunks", {
  query_embedding: queryEmbedding,
  ...
});

// AFTER
const queryEmbedding = await generateEmbedding(getOpenAI(), query, EMBEDDING.LARGE);
const { data, error } = await supabase.rpc("search_document_chunks", {
  query_embedding: queryEmbedding,   // now a JSON string, matching all other call sites
  ...
});
```

Confirm `EMBEDDING.LARGE` (= `text-embedding-3-large`, 3072 dims) matches the model/dimensions the outlier hard-coded — it does per `tool-utils.ts`. Keep the same `getOpenAI()` client this module already uses.

> **Note on the fake ToolContext:** the Explore review also flagged that this helper reaches for `getOpenAI()` directly rather than `ctx.openai`, so it can't be exercised with `createFakeToolContext`. If you're doing the deepening below, thread `ctx` through instead. For the fast fix alone, leaving `getOpenAI()` is acceptable.

---

## The deepening (durable guardrail — follow-up slice)

**This is the real Card 2.** The fast fix patches one site; the deepening removes the ability for any site to get the encoding wrong again.

**Shape:** one module — working name `retrieveChunks` — that owns the entire "embed query → call `search_document_chunks` → normalize rows" step. Suggested home: `frontend/src/lib/ai/retrieval/retrieve-chunks.ts` (co-located with the existing `retrieval/` folder).

It owns, in one place:
- embedding generation (via `generateEmbedding` — encoding decided **once**)
- RPC args (`filter_source_types`, `filter_project_id`, `match_count`, `match_threshold`, hybrid/ranking flags)
- threshold + project-scope defaults
- row normalization + error surfacing (no silent empties)

All seven call sites become thin callers of its interface. Do NOT design the interface here — that happens in the `/grilling` step of the architecture review (the interface is the test surface; design it deliberately).

**Wins (glossary terms):**
- locality: the embedding encoding lives in one module; bugs concentrate there
- leverage: one interface, 7 call sites
- testable without a live provider (inject the embed fn / use the fake ToolContext)
- interface shrinks; the seven call sites absorb nothing

**Deletion test:** collapsing the six inline copies onto `retrieveChunks` concentrates retrieval complexity (good) rather than moving it (the signal we want).

---

## Guardrails (required — per CLAUDE.md "never fix a recurring bug without a guardrail")

Answer the three buckets. This bug was **should-have-been-caught-pre-deploy**:

1. **Prevention (types).** The root enabler is `query_embedding: unknown` in `rag-database.types.ts`. After the deepening, no call site touches the RPC directly, so the loose type stops mattering. If you keep any direct call sites, add a typed wrapper so `query_embedding` can only be a `string` (a branded `EmbeddingArg` type returned by `generateEmbedding`).
2. **Test that would have caught it.** Add a unit test asserting that every retrieval path passes a **string** (not an array) to `search_document_chunks`. After the deepening this is one test on `retrieveChunks`; before it, mock the RPC and assert `typeof query_embedding === "string"` for `searchDocumentChunksByCategory`. Extend `frontend/src/lib/ai/tools/__tests__/tool-utils.test.ts` (already exercises `generateEmbedding`) or add a sibling test.
3. **Monitoring / no silent failures.** Ensure a hard RPC error in `searchDocumentChunksByCategory` is **logged/raised**, not swallowed into the fallback. If the fallback is load-bearing, log a warning with the source category so a future regression is visible in traces.

---

## Verification (before calling it done — VISUAL-PROOF-GATE applies)

1. **Data proof:** run the RPC probe (above) and show that string-encoded and (post-fix) both retrieval calls return the expected non-empty rows for a known query. Capture the before (empty/errored array form) and after (populated) results.
2. **Feature proof:** exercise a category document search through the assistant (real user role) and show it now returns hits. Screenshot the assistant response citing retrieved chunks.
3. **Delegate heavy checks:** run `npm run typecheck` + the AI unit tests via a background/low-cost sub-agent (per CLAUDE.md Verification Delegation), not the main thread.

---

## RAG-DOCS-GATE reminder

Any edit under `frontend/src/lib/ai/**` trips `.claude/rules/RAG-DOCS-GATE.md`. You MUST stage an update to **one** of:
- `docs/architecture/AI-RAG-ARCHITECTURE.md` (bump `Last verified:` and note the single-encoding retrieval seam), or
- `docs/architecture/tables.yaml` (then run `npm run db:inventory` to regenerate `TABLE-LIST.md`).

The retrieval-flow change (one `retrieveChunks` seam) belongs in `AI-RAG-ARCHITECTURE.md`.

---

## Git workflow

Branch from fresh `main`: `fix/rag-embedding-encoding-inconsistency` (fast fix) — separate branch `feat/rag-retrieve-chunks-seam` for the deepening if you split them. PR each; preview-deploy gates. Do not commit to `main`. (See CLAUDE.md Git Workflow.)

---

## Key file reference

| Purpose | Path |
|---|---|
| Canonical encoder | `frontend/src/lib/ai/tools/tool-utils.ts:44` (`generateEmbedding`) |
| The outlier to fix | `frontend/src/lib/ai/tools/operational.ts:3493-3531` (`searchDocumentChunksByCategory`) |
| Outlier callers (6) | `operational.ts` lines 3000, 3011, 3023, 3405, 3432, 3457 |
| RPC type (root enabler) | `frontend/src/types/rag-database.types.ts:1096` |
| Other canonical sites | `document-intelligence.ts:1028`, `ai-memory-service.ts:625`, `workspace-artifact-service.ts:531`, `agent-learning-service.ts:412`, `brandon-daily-update.ts:1523` |
| RAG client helpers | `createRagServiceClient()` / `get_rag_read_client()` (AI DB `fqcvmfqldlewvbsuxdvz`) |
| Architecture doc | `docs/architecture/AI-RAG-ARCHITECTURE.md` |
