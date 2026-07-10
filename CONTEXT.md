# CONTEXT — domain glossary & architecture vocabulary

The shared names for concepts in this codebase. Architecture reviews and the
`/improve-codebase-architecture`, `/codebase-design`, and `/domain-modeling` skills use
this file as the source of truth for domain terms. When a deepened module is named after a
concept, its term goes here.

Architecture vocabulary (module, interface, depth, seam, adapter, leverage, locality)
comes from the `/codebase-design` skill — this file only defines the **domain**.

---

## Invoicing / payment applications

**Payment application** — an AIA G702/G703 application for payment: a schedule-of-values
(SOV) rollup that certifies how much is due on a contract for a billing period. The same
9-line certificate schedule applies to both subcontractor invoices and owner/prime
payment applications.

**Invoice financials** — the money calculation behind a payment application: per-line
figures (completed/stored, retainage) plus the 9-line rollup. Owned by one deep module,
`frontend/src/lib/invoicing/payment-application.ts`, and consumed by the subcontractor
invoice route, the SOV editor tabs, the PDF, and (fast-follow) the prime side. Before this
module the math was forked across four call sites that disagreed on Lines 8 and 9.

**The G702 nine lines** (the canonical certificate schedule):
1. Original Contract Sum
2. Net Change by Change Orders
3. Contract Sum to Date (1 ± 2)
4. Total Completed & Stored to Date
5. Retainage (5a % of completed work + 5b % of stored material)
6. Total Earned Less Retainage (4 − 5)
7. Less Previous Certificates for Payment
8. **Current Payment Due** (6 − 7)
9. **Balance to Finish, Including Retainage** (3 − 6)

**Retainage** — a withheld portion of a contract amount (commonly 5–10%) held until work
is satisfactorily complete. Tracked per line for work and stored materials, split into
this-period / previous / released.

**Retainage release** — a first-class Procore subcontractor-invoice type where previously
withheld retainage is paid out. On a release, Current Payment Due (Line 8) is the released
amount rather than the standard `6 − 7`. The module must handle this case; the prime-side
calc historically did not.

**SOV line item (`SovLineItem`)** — one schedule-of-values row on a payment application.
Per-line stored figures (`net_amount_this_period`, `total_completed_stored`) are Postgres
GENERATED columns — the database is the single source of truth for stored per-line values;
the module recomputes them only for edit **preview** and is pinned to the DB expression by
a parity test.

---

## Data access / Supabase project routing

**Service data router** — the one module that answers "for this table, which Supabase
project, which service-role client, and which generated-types generic?" Exposed as
`serviceDb.from(table)` (planned home: `frontend/src/lib/supabase/service-db.ts`). It owns
the table→project decision *by construction*: it selects the client and calls `.from()`
itself, returning the native Supabase query builder already bound to the right project — so
the table you route on is the table you query, and querying the wrong project is
unrepresentable. The same map drives the return type (`<Database>` for PM-APP tables,
`<RagDatabase>` for AI-DB tables), so a client can no longer be typed for the wrong project
(the `createOutlookIntakeServiceClient` mistype). Scope is the **service-role** surface only
(~470 call sites): RAG is reached exclusively via service-role, so RLS cookie/browser paths
are always PM-APP, already correct, and are left untouched. Two adapters sit behind the
seam — the PM-app service client and the RAG service client (today's `createServiceClient` /
`createRagServiceClient`), constructed once and hidden. Before this module the
project choice was leaked across ~1,300 call sites and re-derived from developer memory,
a lint array, and a DB trigger — the recurring "wrong DB" incident class.

**RAG table registry** — the single exported allowlist of tables that physically live in the
**AI Database** (`document_chunks`, `rag_document_metadata`, `rag_pipeline_state`,
`outlook_email_intake*`, and their siblings). It is the one source of truth the Service data
router routes on, replacing the three scattered copies that exist today: the
`KNOWN_EXTERNAL_TABLES` array in `scripts/audits/check-no-phantom-doc-tables.mjs` (used only
to silence a linter), the "rule of thumb" prose in `CLAUDE.md`, and every developer's memory.
A completeness test pins it to `RagDatabase["public"]["Tables"]` so it can't drift when
types regenerate. Note the legacy overlap: `document_chunks` / `rag_pipeline_state` still
exist in the PM-APP project as trigger-protected read-only copies, so membership is an
explicit allowlist, not "is it absent from the PM-APP types."

**RAG-unconfigured = loud throw (never PM-APP fallback)** — when a RAG table is routed but
`RAG_SUPABASE_URL` is missing, the router throws a specific error rather than falling back to
the PM-APP client. Silent fallback is what "makes the inbox look empty even when sync is
healthy" (the reason `createOutlookIntakeServiceClient` was added as a workaround). The
router owns this drift check; the Python side already has the equivalent
(`rag_supabase_configured()`).

---

## Project intelligence / content retrieval

**Project content source** — the one operation "get me the content for project X in
window Y at granularity G." Today it has no home: it is reimplemented across the executive
brief script, the AI assistant tools, the synthesis sweep, and the intelligence pages,
each independently choosing a database, a table, a date-window predicate, and a
project-name lookup. The deepening target is a single module,
`frontend/src/lib/intelligence/content-source.ts`, exposing `getProjectContent(...)`, that
absorbs all four decisions behind one interface — so switching a source (RAG chunks ↔ full
transcripts) is one edit behind the seam, not six edits across copies. This is why the
2026-06/07 "RAG → full transcripts" change broke the assistant, the daily-brief pages, and
`/intelligence`: the switch had to be made in every copy, and the copies nobody remembered
(the Python synthesis sweep) simply froze.

**Content granularity** — the axis the content source is parameterised on, replacing the
implicit storage choice each caller hardcodes today:
- `chunks` — embedding-searched excerpts (the current `retrieveChunks` path).
- `full` — the COMPLETE transcript: concatenated `document_chunks` in `chunk_index` order,
  or the Storage `transcripts/*.md` markdown. The "full transcripts instead of RAG" path.
- `summary` — the lossy `document_metadata.summary`/`overview` auto-summary.

**Content window** — the normalized date range for a retrieval. The single source of truth
for the `date`/`created_at`/`captured_at`/`source_occurred_at`/`coalesce(...)` predicates
currently forked per caller. Owned by the content source, so project-name resolution
(and its int8-as-string coercion) happens exactly once.

**Operating record** — the full per-project intelligence row in `project_current_state`
(`current_summary`, `health_status`, `active_risks`, `open_decisions`, `needs_attention`,
`financial_read`, `schedule_read`, `field_read`, `source_confidence`, …), plus its sibling
snapshot/timeline projections. Written by ONE deep module,
`backend/.../intelligence/compiler.py::apply_source_operating_record_projection`. The
`/[projectId]/intelligence` page reads the whole record. The Daily Deep Read packet must
feed this writer through a **packet → operating-record adapter**, not a shallow `.mjs` that
updates only `current_summary` and leaves the rest of the record stale.
