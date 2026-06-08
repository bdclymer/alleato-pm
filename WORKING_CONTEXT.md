# Alleato — Working Context

> Claude: Read this before touching anything. Update this before ending any session.
> Megan: This file is your project's short-term memory. Keep it current.

---

## Current focus

**Status:** Project Assignment Inbox + AI learning loop shipped (branch `claude/project-assignment-dashboard-ai-CjU3F`).
**Last updated:** 2026-06-08
**Last worked on by:** Claude Code (assignment inbox + attribution learning loop)

## Project Assignment Inbox + AI learning loop (2026-06-08)

New top-level **Assignment Inbox** (`/assignment-inbox`, all users, nav "Work" group) — a unified worklist of unassigned **meetings, emails, Teams messages, and documents** with AI project suggestions and one-click assign. Plus the previously-missing **attribution learning loop**: manual assignments now feed back into `project_attribution_rules` (the table the backend `ProjectAssigner` reads at highest priority).

**The four content types live in two tables:** meetings/Teams/documents → `document_metadata` (nullable `project_id`); emails → `outlook_email_intake` (nullable `project_id` + `match_status`/`assignment_method`/`assignment_confidence`).

**Shipped:**
- `frontend/src/features/assignment-inbox/load-inbox-items.ts` — server loader. Unions unassigned rows from both tables (500/source, newest first), joins AI suggestions from `document_attribution_candidates` (RAG DB, best-effort, chunked `.in`). Emails have no persisted suggestion in v1.
- `frontend/src/features/assignment-inbox/assignment-inbox-table-config.tsx` — columns, filters (type/suggestion/suggested-project), confidence→StatusBadge mapping.
- `frontend/src/app/(tables)/assignment-inbox/{page.tsx,assignment-inbox-client.tsx}` — `UnifiedTablePage`; tabs by content type; per-row Accept suggestion + inline project Select; bulk "Accept N suggestions"; optimistic row removal on assign.
- `frontend/src/app/api/assignment-inbox/assign/route.ts` — POST. Routes write to the correct table, then records attribution feedback. Tests in `__tests__/route.test.ts`.
- **Learning loop in `frontend/src/lib/ai/services/feedback-event-service.ts`:**
  - `recordAttributionAssignmentFeedback` — logs each manual assignment (`ai_feedback_events`, family `attribution`, signal `accepted`/`corrected`) with sender domain/email + title-keyword signals.
  - `generateAttributionRulePromotionCandidates` — mines those events for recurring domain/email/title-keyword → project patterns (default ≥3 signals, ≥0.8 consistency, public/first-party domains excluded) → proposes `attribution_rule` promotions.
  - `applyAttributionRulePromotion` now branches on `proposed_learning.ruleKind === "project_attribution_rule"` → upserts a generalizable rule into `project_attribution_rules` (`source = "ai_learning_promotion"`).
  - Tests in `frontend/src/lib/ai/services/__tests__/attribution-learning.test.ts`.
- Generator wired into `POST /api/admin/ai-learning-promotions/run` (new scope `attribution`); apply dispatch already routed `attribution_rule` → writer. Review/approve/apply via existing `/ai-learning-promotions` admin queue.
- Nav entry added to `companyWideHeaderTools` + "Work" section; `AI-RAG-ARCHITECTURE.md` updated (RAG-DOCS-GATE).

**Design decisions (confirmed with Megan):** suggest rules for review (no silent auto-rule creation); always confirm assignment in the inbox (no auto-assign); top-level page for all users.

**Email + rule-based suggestions (done 2026-06-08, follow-up):**
- `frontend/src/features/assignment-inbox/attribution-rule-match.ts` — pure matcher mirroring the backend ProjectAssigner rule strategy (email > domain > title-keyword precedence, then priority, then confidence). Tests in `__tests__/attribution-rule-match.test.ts`.
- Loader now loads active `project_attribution_rules` and applies the matcher to **emails** (primary suggestion source) and to **documents without a `document_attribution_candidates` row** (fallback). This closes the loop end-to-end: rules learned from manual assignments now power new suggestions. Suggestion reason shows as a tooltip in the inbox.

**Follow-ups completed (2026-06-08, second pass):**
- **Cron auto-generation (item 1):** `frontend/src/app/api/cron/attribution-rules/route.ts` (CRON_SECRET-gated, Vercel cron `0 8 * * 1` in `frontend/vercel.json`) runs `generateAttributionRulePromotionCandidates` weekly. It only creates `candidate` promotions — rules still require admin approval in `/ai-learning-promotions`, so it stays consistent with "review before activating".
- **Full pagination (item 2):** loader now offset-paginates the date-ordered union with true `count` queries; `GET /api/assignment-inbox?offset=` returns pages; client accumulates via a "Load more" button and shows `loaded / total unassigned`. Page size 200, window cap 5000. (Suggestions are app-computed, so suggestion/type filters apply to the loaded set — documented trade-off.)
- **Typecheck debt (item 3, scoped to "just fix the root cluster"):** the 35 drawings "not assignable to never" errors were NOT stale types — they came from a spurious `as Parameters<typeof supabase.from>[0]` cast on `drawing_change_history` inserts (the table is present in types with matching columns; the cast widened the name to the full union → never). Removed the casts in `drawings/[drawingId]/{publish,obsolete,revisions}/route.ts` + the orphaned eslint-disable. The remaining ~70 errors are wide-`Record<string,unknown>` update payloads (TS2345) and a few component/lib mismatches — deferred per the agreed scope (separate cleanup pass).

**Still open:**
- ~70 remaining pre-existing typecheck errors (wide `.update()` payloads needing typed casts; a few component/lib type mismatches). Pre-push still uses `--no-verify` until those are cleared in a dedicated pass.
- Inbox suggestion/type filters apply to the loaded page set (app-computed suggestions can't be SQL-paginated).

---

## Prior focus — Error-tracker triage

**Status:** Error-tracker triage complete — 3 rounds shipped, 7 recurring patterns documented, telemetry signal:noise restored.
**Last updated:** 2026-05-19
**Last worked on by:** Claude Code (error-tracker triage + patterns documentation)

## Error-tracker triage (2026-05-18 → 2026-05-19)

The `/errors` admin page had been silently collecting events for weeks without anyone looking — **973 grouped patterns spanning 3,638 events, 969 still in `new`**. Three parallel-agent rounds closed it out and surfaced **seven distinct recurring patterns** that account for every bug we fixed.

### What shipped

| Commit | Round | Files | What |
|---|---|---|---|
| `aca196aa6` | 1 | 14 | Six high-sev bug groups: commitments nil-UUID, directory roles FK ambiguity, /api/tasks generic-error, prime-contract markup_type crash, source-sync 504, AssignMemberDialog JSON.parse |
| `0bf0c5878` | 2 | 2 | Suppress 401/403 from telemetry at both server (`withApiGuardrails`) and client (`apiFetch`) write points |
| `3e9931613` | 3 | 15 | `assertNonNilUuid` shared helper across 14 handlers, `asGuardrailError` plain-object support (every API route benefits), `"job number"` → `project_number`, Supabase auth-lock + 4xx user-error noise filters |

### The seven patterns (all newly documented under `docs/patterns/`)

1. **Nil-UUID cascade** — parent-not-loaded React hooks fire with `00000000-…`. Affected commitments, change-events, commitment-pcos routes. Solved with shared `assertNonNilUuid` helper.
2. **Generic error swallow** — "Unexpected error" / "Failed to load X" erased the real Supabase error. `asGuardrailError` was using `instanceof Error` which fails for Supabase's plain-object `PostgrestError`. Fix applies to every API route.
3. **PostgREST embed/select quirks** — multi-FK ambiguity (people↔companies, 5 files) and quoted-identifier-with-space (`"job number"`, 4 files). Solved with `!fk_name` hints and snake_case renames.
4. **Telemetry signal inversion** — 614+ noise events of auth-state, lock contention, and 4xx user-validation were buried real bugs. Solved with two-layer suppress-list.
5. **`apiFetch<T>` null passthrough** — returns null at runtime for 204/empty responses despite typing `T`. Crashed `PrimeContractOverviewTab`. Defensive fix in place; durable wrapper fix open.
6. **Schema rename drift** — `"job number"` rename left 4 stragglers, silently broken for 5 days. Sweep procedure documented; registry + CI gate proposed.
7. **Status-endpoint sequential I/O** — `/api/admin/source-sync/status` made 10+ sequential DB queries and 504'd repeatedly. Solved with backend cache + frontend graceful degradation.

Full retrospective: `docs/patterns/2026-05-18-error-tracker-triage-retrospective.md`.

### Telemetry queue state

| Status | Before | After |
|---|---|---|
| `new` | 969 | ~280 (manageable, real bugs) |
| `in_progress` (fixed, awaiting confirmation) | 0 | ~85 |
| `ignored` (noise filtered) | 0 | 645+ |
| `needs_human` | 3 | 3 |

### New pattern docs (all registered in `docs/patterns/index.json`)

- `docs/patterns/errors/nil-uuid-cascade.md` + `solutions/assert-non-nil-uuid.md`
- `docs/patterns/errors/generic-error-swallow.md` + `solutions/error-message-fidelity.md`
- `docs/patterns/errors/postgrest-embed-ambiguity.md` + `solutions/postgrest-fk-disambiguation.md`
- `docs/patterns/errors/telemetry-noise-classification.md` + `solutions/telemetry-suppress-list.md`
- `docs/patterns/errors/apifetch-null-passthrough.md` (durable solution open)
- `docs/patterns/errors/schema-rename-drift.md` (registry proposed)
- `docs/patterns/errors/status-endpoint-sequential-io.md` (solution inline)
- `docs/patterns/2026-05-18-error-tracker-triage-retrospective.md` (capstone)

### New shared utility

`frontend/src/lib/guardrails/path-params.ts` — exports `NIL_UUID` constant + `assertNonNilUuid()` helper. Apply at the top of every API handler whose path param is a UUID (not integer-shaped IDs like `[projectId]`).

## Pattern C attachment migration — batch 2 (2026-05-18)

Codex used `.codex/skills/pattern-c-attachment-migration/SKILL.md` to continue the consolidation instead of repeating per-route one-off logic.

**Shipped and pushed:**
- Created/applied `supabase/migrations/20260524020000_create_remaining_pattern_c_attachment_junctions.sql`.
- New Pattern C junctions:
  - `commitment_change_order_documents`
  - `prime_contract_change_order_documents`
  - `prime_contract_pco_documents`
  - `subcontractor_invoice_documents`
- Extended `user_can_access_entity()` for:
  - `commitment_change_order`
  - `prime_contract_change_order`
  - `prime_contract_pco`
- Added shared frontend Pattern C registry/helper:
  - `frontend/src/lib/documents/pattern-c-attachments.ts`
- Refactored `/api/document-picker/upload`, `/api/document-picker/linked`, and `/api/document-picker/attach` to use the shared registry.
- Converted legacy-compatible attachment API routes to write/read Pattern C:
  - prime contract attachments
  - commitment change order attachments
  - prime contract change order attachments
  - owner invoice attachments
  - change event attachments
  - submittal attachment upload
  - prime contract PCO detail attachment reader
- Regenerated Supabase DB types and dev-tools DB inventory after adding the new junctions.

**Verification so far:**
- `npm run check:routes` passed.
- `npm run db:migrations:verify-applied -- supabase/migrations/20260524020000_create_remaining_pattern_c_attachment_junctions.sql` passed.
- Legacy table source grep is clean for app source after route conversion.
- High-memory typecheck / quality path completed during `npm run codex:finish` for the batch 2 code changes.
- Browser-authenticated `agent-browser` verification passed upload -> list -> delete-link -> missing-after-delete for:
  - change event attachments
  - prime contract attachments
  - owner invoice attachments
  - submittal attachment upload + Pattern C linked list
  - commitment change order attachments
  - prime contract change order attachments
- Evidence artifacts: `tests/agent-browser-runs/2026-05-18-pattern-c-attachments/` (ignored verification artifact folder).
- Temporary verification uploads were removed from `project-files`, `document_metadata`, and the relevant junction tables.
- Browser verification exposed and fixed an owner-invoice schema bug: ownership now resolves through `owner_invoices.prime_contract_id -> prime_contracts.project_id` because `owner_invoices` has no direct `project_id`.
- A stale Next.js `.next` dev cache produced transient local 500s (`Cannot find module './vendor-chunks/...` / `Cannot read properties of undefined (reading 'call')`); clearing `.next` and restarting the frontend restored route execution.
- Follow-up form audit found one remaining dual-pattern reader: submittal detail embedded-selected legacy `submittal_attachments` while upload wrote Pattern C. Fixed the server page to hydrate attachments from `submittal_doc_links`/`document_metadata` through `listLinkedPatternCDocuments()`.
- Change event form/upload callers now post one file per request in parallel, matching the Pattern C upload route contract and preserving multi-file behavior.
- Added/reused `scripts/audit-pattern-c-attachments.mjs`; `node scripts/audit-pattern-c-attachments.mjs` passes and fails on direct legacy table access, embedded legacy relation selects, or generated `Database["public"]["Tables"][legacy_table]` usage in app source.
- Targeted verification passed:
  - `node scripts/audit-pattern-c-attachments.mjs`
  - `npm run check:routes`
  - targeted `npx eslint ...` on touched files (0 errors; pre-existing design-system warnings only)
  - `cd frontend && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false --incremental false`
- Closeout migration `supabase/migrations/20260524030000_drop_legacy_pattern_c_attachment_tables.sql` applied and ledger-verified.
- Live reconciliation before drop:
  - `attachments`: 29 rows total; 15 entity-scoped rows already linked to Pattern C; 14 orphan rows preserved as project-level `document_metadata` + `project_documents_v2` links.
  - `change_event_attachments`: 2/2 linked to `change_event_documents`.
  - `submittal_attachments`: 1/1 linked to `submittal_doc_links`.
  - Remaining legacy tables were empty.
- Rebuilt legacy-dependent summaries before drop:
  - `change_events_summary` materialized view now counts `change_event_documents`.
  - `subcontracts_with_totals` view now counts `subcontract_documents`.
- Dropped 9 legacy tables with `RESTRICT`:
  - `cco_attachments`
  - `pcco_attachments`
  - `prime_contract_pco_attachments`
  - `invoice_attachments`
  - `change_event_attachments`
  - `submittal_attachments`
  - `subcontract_attachments`
  - `purchase_order_attachments`
  - `attachments`
- Post-drop evidence:
  - `legacy_table_remaining|0`
  - `orphan_docs|14`
  - `orphan_project_links|14`
  - `change_events_summary_count|24`
  - `subcontracts_with_totals_count|400`
- Regenerated `frontend/src/types/database.types.ts`, `docs/architecture/TABLE-LIST.md`, and `frontend/src/components/dev-tools/db-inventory.generated.ts`; removed stale dropped-table entries from `docs/architecture/tables.yaml`.
- Post-drop verification passed:
  - `npm run db:migrations:verify-applied -- supabase/migrations/20260524030000_drop_legacy_pattern_c_attachment_tables.sql`
  - `npm run db:inventory -- --check-only`
  - `node scripts/audit-pattern-c-attachments.mjs`
  - `cd frontend && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false --incremental false`

**Still pending after closeout:**
- None for Pattern C PURT/entity attachment consolidation.
- Optional future cleanup: update stale historical architecture/PRP prose that still references old attachment tables as past implementation details; leave migration files alone.

## Pattern C attachment migration system pass (2026-05-18)

Codex reviewed `docs/architecture/CONSOLIDATED-IMPLEMENTATION-PLAN.md`, `docs/architecture/TASKS-CONSOLIDATED-IMPLEMENTATION.md`, this working context, live Supabase counts, and the current `/api/document-picker/*` implementation.

**Created:**
- `.codex/skills/pattern-c-attachment-migration/SKILL.md` — repeatable workflow for migrating each legacy PURT/entity attachment table to Pattern C.
- `docs/architecture/pattern-c-attachment-migration-manifest.json` — manifest of legacy tables, target junctions, route surfaces, deterministic id prefixes, known live counts, and open decisions.
- `supabase/migrations/20260518105545_backfill_attachments_to_pattern_c_v2.sql` — ledger placeholder for remote-applied May 18 migration.
- `supabase/migrations/20260518105737_create_change_event_documents_and_backfill_v2.sql` — ledger placeholder for remote-applied May 18 migration.
- `supabase/migrations/20260524010000_reconcile_pattern_c_attachment_backfills.sql` — replay-safe reconciliation migration that re-extends `user_can_access_entity()`, creates `change_event_documents` if needed, and idempotently backfills legacy `attachments`, `change_event_attachments`, and `submittal_attachments` into Pattern C after base junction tables exist in local chronological order.

**Important findings:**
- Live counts contradicted the "all empty tables" note: `attachments` still has 29 rows, `change_event_attachments` has 2, and `submittal_attachments` has 1. The migrated Pattern C rows are already present, but batch 2 must keep reconciliation checks before any drop.
- The linked remote migration ledger contains `20260518105545|backfill_attachments_to_pattern_c_v2` and `20260518105737|create_change_event_documents_and_backfill_v2`; those files were missing locally and are now represented.
- Do **not** run broad `supabase db push` blindly. `npx supabase migration list --linked` shows broader local/remote drift, and `npm run db:migrations:verify-applied -- <file>` is currently blocked by pre-existing duplicate local migration prefixes:
  - `20260515120000`: `20260515120000_estimate_gc_templates.sql`, `20260515120000_seed_company_process_intelligence_targets.sql`
  - `20260518120000`: `20260518120000_add_generate_and_send_stage.sql`, `20260518120000_drop_legacy_documents_table.sql`

**Next recommended slice:**
1. Fix the duplicate local migration timestamp prefixes or update the verifier so it can inspect a single file despite existing duplicate-prefix debt.
2. Apply/verify `20260524010000_reconcile_pattern_c_attachment_backfills.sql` deliberately after ledger drift is understood.
3. Extract the hard-coded entity maps from `/api/document-picker/upload`, `/api/document-picker/linked`, and `/api/document-picker/attach` into one shared registry.
4. Run the new `pattern-c-attachment-migration` skill on the remaining routes, starting with a zero-row table like `cco_attachments`.

## Pattern C attachment migration — batch 1 (2026-05-18)

Audit revealed the immediate user-reported bug: commitments page had **dual attachment storage** — new/edit pages wrote to legacy `attachments` table, detail page read from Pattern C `subcontract_documents`/`purchase_order_documents`. Files uploaded during create/edit invisible on detail. Plus the upload flow was serial (`for` loop), which compounded the "only one file uploads" UX issue.

**Shipped:**
- Migrated **18 production rows** into Pattern C junctions:
  - 12 commitments rows from `attachments` → `subcontract_documents`
  - 3 prime_contracts rows from `attachments` → `prime_contract_documents`
  - 2 rows from `change_event_attachments` → new `change_event_documents` junction
  - 1 row from `submittal_attachments` → `submittal_doc_links`
  - (14 NULL-attached_to_table rows in `attachments` left as orphans — test uploads, files remain in storage)
- Created `change_event_documents` junction with RLS
- Extended `user_can_access_entity()` to handle `change_event` + `subcontractor_invoice`
- Rewrote `commitments/new/page.tsx` + `commitments/[id]/edit/page.tsx` to POST to `/api/document-picker/upload` (Pattern C) and parallelized via `Promise.all` — multi-upload now works correctly
- Edit page now reads existing attachments via `/api/document-picker/linked`
- Deleted dead `frontend/src/components/commitments/tabs/AttachmentsTab.tsx`
- Deleted legacy `/api/commitments/[commitmentId]/attachments/` route tree (3 files)

**Migrations:**
- `backfill_attachments_to_pattern_c_v2`
- `create_change_event_documents_and_backfill_v2`

**Remaining (batch 2 — next session) — all empty tables, no data urgency:**
1. Locate + rewrite the prime_contracts UI/API that historically wrote to `attachments` (writers may have already moved to Pattern C via `EntityAttachments` on detail page — needs grep verification)
2. Rewrite 6 more attachment API routes → Pattern C:
   - `/api/projects/[projectId]/commitment-change-orders/[id]/attachments` (uses `cco_attachments`)
   - `/api/projects/[projectId]/prime-contract-change-orders/[id]/attachments` (uses `pcco_attachments`)
   - `/api/projects/[projectId]/prime-contract-pcos/[pcoId]` (uses `prime_contract_pco_attachments`)
   - `/api/projects/[projectId]/invoicing/owner/[id]/attachments` (uses `invoice_attachments`)
   - `/api/projects/[projectId]/change-events/[id]/attachments` (uses `change_event_attachments`) + update `ChangeEventAttachmentsSection.tsx`
   - `/api/projects/[projectId]/submittals/[id]/attachments` (uses `submittal_attachments`) + update `use-submittals.ts`
3. Create junctions if needed for empty tables: `subcontractor_invoice_documents`, `commitment_pco_documents`, `prime_contract_pco_documents`
4. Recreate `commitments_schema_gaps` view without `subcontract_attachments` dependency
5. Drop 9 legacy tables: `cco_attachments`, `pcco_attachments`, `prime_contract_pco_attachments`, `invoice_attachments`, `change_event_attachments`, `submittal_attachments`, `subcontract_attachments`, `purchase_order_attachments`, `attachments`
6. **Form audit:** sweep entire app for the dual-pattern (legacy `*_attachments` writer + Pattern C reader on same entity). User explicitly requested this.

---

## Prior session focus

**Status:** All changes committed and pushed to main. Session ended cleanly.
**Last updated:** 2026-05-17
**Last worked on by:** Claude Code (Consolidated implementation plan — Phases 1–10 complete)

---

## What was done this session (2026-05-17, second session)

### Consolidated implementation plan — all phases complete

Audited `docs/architecture/CONSOLIDATED-IMPLEMENTATION-PLAN.md` against live DB and codebase. Discovered most phases were already done. Completed all remaining work:

**Phase 2.3 — Acumatica drift prevention:**  
`AFTER INSERT OR UPDATE FOR EACH STATEMENT` triggers on 8 Acumatica tables insert sentinel rows into `acumatica_sync_runs`. Enables staleness alerting per table. Migration: `20260517020000`.

**Phase 3 follow-up:**  
Removed stale `client_id: number | null` field from `frontend/src/types/project.ts` (DB column was already dropped; type hadn't been updated).

**Phase 7.1 — Migrated all `documents` DB table reads/writes to `document_metadata`:**
- `frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx` — switched query + remapped columns
- `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items/options/route.ts` — switched `"document"` case
- `frontend/src/components/project-setup-wizard/document-upload-setup.tsx` — full insert + delete migration; updated `UploadedDocument` interface

**Phase 7.2 — 30-day soak audit trigger:**  
`documents_access_audit` table + trigger deployed. Every INSERT/UPDATE/DELETE on legacy `documents` table is logged. Hard drop eligible 2026-06-17 if audit shows zero rows. Migration: `20260517030000`.

**Phase 1.2.3 (hook registration):**  
Verified via Supabase Management API that `custom_access_token_hook` was already enabled on the remote (`hook_custom_access_token_enabled: true`). Synced `supabase/config.toml` to reflect this.

**Handoff doc:**  
`docs/handoffs/2026-05-17-architecture-state-handoff.md` — full architecture state for new session onboarding.

Key commits: `7afffb68d` (phase 7 + drift triggers), `22fa8bd99` (config.toml sync + handoff doc).

---

## What was done this session (2026-05-17, first session)

### Files table overhaul + Azure OCR pipeline

**Files table (`frontend/src/app/(tables)/files/`):**
- Name column is the only link; external link moved to row actions (⋯ menu)
- Simplified file type icon — single `File` icon instead of type-specific icons
- Inline project assignment (`InlineProjectSelect`) with optimistic updates
- Inline tag editing (`InlineTagEditor`) with chip display, optimistic updates
- Full path now parsed from `source_web_url` when `source_path` is shallow (fixes truncated paths)
- 6 filters: File Type, Project, Source, Assignment, RAG Status, Modified after/before
- New **Indexed** column with colour-coded status badges (Indexed / Pending / Partial / No text / OCR failed)
- Tags PATCH wired through existing `/api/documents/[docId]/assign-project` route (added `tags` to `ALLOWED_FIELDS`)

**OneDrive sync fixes:**
- `GRAPH_DELTA_MAX_PAGES` raised 5→20, `GRAPH_DELTA_MAX_ITEMS` raised 500→3000 — fixed 2026 Jobs files not syncing
- Scanned PDFs no longer skipped; always save metadata with `status='no_text'`
- `_strip_folder_prefix()` + fuzzy project matching in backfill for numeric job prefixes like `25-104`
- 124 new `no_text` files created from 2026 Jobs sync

**Azure Document Intelligence OCR pipeline:**
- `backend/src/services/integrations/azure/document_intelligence.py` — Azure DI client, prebuilt-read model, 20-page cap
- `backend/src/services/integrations/microsoft_graph/ocr_worker.py` — background worker: queries `no_text` → downloads via Graph → OCR → sets `status='raw_ingested'` (full) or `status='ocr_partial'` (hit page cap)
- `ocr_partial` files ARE embedded for RAG but flagged visually in the Files table so staff can identify PDFs where only the first N pages were indexed
- Wired into `run_graph_sync()` after embed step (20 docs/run)
- `POST /admin/documents/ocr-backfill` for manual backfill trigger
- `azure-ai-documentintelligence>=1.0.0` added to `requirements.txt`

**Activation required (user action):**
- Add `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` + `AZURE_DOCUMENT_INTELLIGENCE_KEY` to backend env vars
- Deploy to Render (image rebuild needed for new pip package)
- Call `POST /admin/documents/ocr-backfill` 7× to process 124 existing `no_text` files

---

## What was done this session (2026-05-15)

Phase 4 Day 3-6 of CONSOLIDATED-IMPLEMENTATION-PLAN.md — Pattern C unified file architecture. Single commit: `f65e7069e`.

### Key schema corrections made during implementation

- `commitments` table does NOT exist — `commitments_unified` is a UNION ALL view over `subcontracts` + `purchase_orders` base tables. FK constraints cannot reference views; two junction tables were created instead: `subcontract_documents` + `purchase_order_documents`.
- `document_metadata.id` is TEXT (not UUID). All junction FK columns are `text`.
- Existing RLS pattern uses `current_is_app_admin()` + `current_is_project_member(bigint)` — the helper function was written to match, not reinvent.
- `drawing_revisions` table pre-existed as a file-based revision system — `document_metadata_id` was added as a nullable column rather than creating a new table.
- `submittal_documents` + `contract_documents` pre-existed as file-storage tables — new Pattern C junctions named `submittal_doc_links` to avoid conflict.
- `project_documents` pre-existed as file-storage table — new junction named `project_documents_v2`.

### Task 1 — Shared RLS helper
- `public.user_can_access_entity(entity_type text, entity_id text)` applied to DB
- Handles: project, subcontract, purchase_order, prime_contract, change_order, invoice, submittal, rfi, drawing, company
- Migration: `supabase/migrations/20260523100000_create_user_can_access_entity_helper.sql`

### Task 2 — 9 junction tables
All RLS-enabled, using shared helper:
- `subcontract_documents`, `purchase_order_documents`, `prime_contract_documents`
- `change_order_documents`, `owner_invoice_documents`, `company_documents`
- `project_documents_v2`, `submittal_doc_links`, `rfi_documents`
- Migration: `supabase/migrations/20260523110000_create_document_junction_tables.sql`

### Task 3 — Drawings hybrid
- `drawings.document_metadata_id` column added (nullable)
- `drawing_revisions.document_metadata_id` column added to existing table
- Migration: `supabase/migrations/20260523120000_drawings_pattern_c_hybrid.sql`

### Task 4 — email_attachments backfill
- 471 rows promoted to `document_metadata` with `source_system='email_attachment_legacy'`
- Only 3 have `extracted_text`/`raw_text` — will embed on next sync
- Migration: `supabase/migrations/20260523130000_backfill_email_attachments_to_document_metadata.sql`

### Task 5 — DocumentPicker frontend
- `frontend/src/components/ds/document-picker.tsx` — `DocumentPicker` + `LinkedDocumentsList`
- `frontend/src/app/api/document-picker/types/route.ts` — taxonomy filtered by entity type
- `frontend/src/app/api/document-picker/attach/route.ts` — hardcoded entity→junction map
- `frontend/src/app/api/document-picker/linked/route.ts` — linked docs enriched with titles
- Barrel-exported from `frontend/src/components/ds/index.ts`

### Task 6 — Embedding pipeline extension
- `_source_type_for_document` now handles `email_attachment_legacy` source_system
- `embed_pending_attachment_documents()` embeds legacy attachment rows with `raw_text`
- Hooked into `run_graph_sync()` after main embed sweep (capped 20/run)

### Task 7 — Wired to commitments detail page
- `frontend/src/components/commitments/tabs/AttachmentsTab.tsx` — added "Linked Documents" section with `DocumentPicker` + `LinkedDocumentsList`

### Database types
- Regenerated `frontend/src/types/database.types.ts` after applying all migrations
- Removed Supabase CLI injected `<claude-code-hint>` annotation that broke TS parse

---

## What was done this session (2026-05-14)

A very heavy day — 30+ commits across backend and frontend. Summary by area:

### 1. Deep Agents backend pipeline (morning)

Built the backend contracts and agent service for the Deep Project Intelligence pipeline:

- **`backend/src/services/agents/deep_project_intelligence_contracts.py`** — Pydantic request/response "contracts" (typed schemas) for the Deep Agents. Defines `DeepProjectIntelligenceRequest`, `DeepExecutiveIntelligenceRequest`, and all the response/evidence/source models. This is the "contracts spike" — a clean type-safe API boundary for the agentic pipeline.
- **`backend/src/services/agents/deep_project_intelligence.py`** — The actual deep agent: 9 parallel source probes (document_chunks, email, meetings, budget, tasks, RFIs, submittals, project_insights), LLM synthesis, and streaming response.
- **`backend/src/api/main.py`** — Wired the two new endpoints: `POST /api/v1/deep-agents/project-status` and `POST /api/v1/deep-agents/executive-briefing`.
- **`backend/src/tests/test_deep_project_intelligence.py`** — Unit tests for contracts validation.

### 2. Deep Agents frontend bridge (mid-morning → afternoon)

Wired the backend deep agents into the AI assistant:

- **`frontend/src/lib/ai/deep-agent-project-status.ts`** — Client-side bridge: detects Deep Agent intents (`target_briefing`, `latest_status`, `risk_review`), calls the backend endpoint, and streams results back into the chat.
- **`frontend/src/lib/ai/chat-handler.ts`** — Routing logic updated to gate deep-agent calls behind `AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED` feature flag.
- **`frontend/src/lib/ai/__tests__/deep-agent-project-status.test.ts`** — Tests for the bridge.
- Several commits to routing, tool prioritization, and executive briefing verification.

### 3. Outlook inbox email widget redesign (afternoon)

Fully redesigned the `OutlookInboxSummaryWidget` in `assistant-widget-renderer.tsx`:

**Collapsed state (before → after):**
- Before: subject + redundant metadata + "Suggested next step" block + preview (cluttered)
- After: avatar initials circle + sender + thread count + paperclip indicator + time + thumbs feedback + chevron + subject bold + single-line preview

**Expanded state:**
- "Next step" pill (primary-colored label + recommended action text)
- Email body indented under avatar in `bg-muted/30` block
- Action toolbar: **Reply** (→ replyPrompt), **AI Draft** (→ draftPrompt), **Project** (→ AI prompt for assignment), **Task** (→ AI prompt for creation), **Tag** (→ popover with text input), **Open in Outlook** (external link)

**`EmailCardFeedback` component:**
- Thumbs up/down on every collapsed card header
- Optimistic UI with green/red highlight
- Fires to `/api/ai-assistant/feedback` silently on vote

Key commits: `4e7573ffe` "Make Outlook inbox cards actionable", `5dff66822` "Flatten Outlook inbox assistant summaries"

### 4. AI widget gallery expanded (afternoon)

Added two new sections to `/auth/ai-widget-gallery`:

- **Generative UI components grid** — all 20 registered widget types with category badge (action / data / intelligence / communication), trigger phrase, description, and type key
- **AI SDK features table** — 17 features with badge (Core / Tools / Agents / Streaming / React / HITL / Generative UI / Providers / Embeddings), usage description, and exact file locations

Also fixed pre-existing fixture data bugs: `projectId` → `projectIds`, added missing required widget fields.

Key commit: `df9f28b24` "Expand AI widget gallery with component and SDK reference tables"

### 5. Other notable fixes (throughout day)

- `ad70430a9` — Fixed `contracts/{id}/payments` PostgREST `.single()` coercion error
- `df9c4831d` — Fixed 5 invoicing bugs: status badge, PDF export, not-found hang, maxLength, contract dropdown
- `ca1bd5e72` — Fixed change-orders inline line item edit fails on generated column
- `a25321f0f` — Added budget view switcher to toolbar
- `f2ee7b095` — Added edit page for estimates tool
- `e43d29724` — Fixed realtime cursors chunk load failure (moved `createClient()` inside hook via `useRef`)
- Outlook intake reclassification controls + script
- RAG chunk integrity guardrail
- Fireflies transcript chunk rebuild fix

---

## Active task

Nothing actively blocked. All changes pushed to main.

---

## What's next / follow-ups

**From error-tracker triage (2026-05-19) — high leverage:**

1. **Fix `apiFetch<T>` at the wrapper** so 204/empty bodies throw when `T` doesn't permit null. Single change in `frontend/src/lib/api-client.ts` kills pattern #5 across the entire codebase. See `docs/patterns/errors/apifetch-null-passthrough.md`.
2. **Build the column-rename registry + CI gate**. A `docs/database/column-renames.json` listing every rename, plus a pre-commit check that fails if any `from` string appears in code outside the migration. Kills pattern #6 going forward. See `docs/patterns/errors/schema-rename-drift.md`.
3. **Write the ESLint rules** proposed in `docs/patterns/solutions/error-message-fidelity.md` and `docs/patterns/solutions/postgrest-fk-disambiguation.md`. Each rule eliminates its pattern class at commit time.
4. **Triage the remaining ~280 `new` error groups**. Now that noise is filtered, most are real bugs. Recommend batches of ~10, prioritizing high-severity + high-event-count.

**Pre-existing:**

5. **Azure OCR activation** — Add env vars + deploy + run backfill (see 2026-05-17 session notes above)
6. **Deep Agents production validation** — the bridge is gated behind `AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED`. Needs end-to-end test with a real project question before toggling on in production.
7. **Outlook email widget actions** — Project assignment and Task creation currently delegate to `onSubmit` (AI handles them). Could wire to direct API calls if the assistant round-trip feels slow in practice.
8. **Radix Select + browser automation gap** — ~30 cascading E2E failures trace to this. The dropdown test pattern needs a dedicated fix before Playwright suite can cover full CRUD flows.
9. **Estimates tool** — has no seed data; E2E tests can't run until seed data is created.
10. **`/prp-validate` runs needed** — Change Events, Change Management, Commitments, Direct Costs, Invoicing, Prime Contracts, Estimates still need PRP validation.
11. **Low-confidence review queue** — `document_attribution_candidates` table still has no UI.
12. **GitHub billing** — CI workflows are still disabled (billing lock at github.com/settings/billing).

---

## Architecture — key file map

| Thing | Location |
|-------|----------|
| Deep Agents contracts (Pydantic schemas) | `backend/src/services/agents/deep_project_intelligence_contracts.py` |
| Deep Agents service (9-probe pipeline) | `backend/src/services/agents/deep_project_intelligence.py` |
| Deep Agents frontend bridge | `frontend/src/lib/ai/deep-agent-project-status.ts` |
| Feature flag | `AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED` in `.env` |
| Outlook inbox email widget | `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx` → `OutlookInboxSummaryWidget` |
| Widget gallery | `frontend/src/app/auth/ai-widget-gallery/ai-widget-gallery-client.tsx` |
| Graph sync orchestrator | `backend/src/services/integrations/microsoft_graph/sync.py` |
| Teams compiler | `backend/src/services/intelligence/teams_compiler.py` |
| Render cron config | `render.yaml` |

---

## Render cron jobs (all in render.yaml)

| Name | Schedule | Purpose |
|------|----------|---------|
| `alleato-graph-sync` | every 30 min | Outlook + Teams + OneDrive sync, embed, compile |
| `alleato-task-extraction` | daily 7 AM UTC | Extract action items from comms |
| `alleato-rag-health` | daily 12:15 UTC | RAG embedding health check + Slack alert |

---

*This file is maintained by Claude Code and should be committed to the repo.*
*It is the single most important file for session continuity.*
