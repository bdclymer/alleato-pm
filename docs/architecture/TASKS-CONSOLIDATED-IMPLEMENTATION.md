# Tasks — Consolidated Implementation Plan

> Checklist derived from [CONSOLIDATED-IMPLEMENTATION-PLAN.md](./CONSOLIDATED-IMPLEMENTATION-PLAN.md). Items checked are verified complete per that document (as of 2026-05-18).

## Phase 1 — Auth Waterfall Fix

- [x] Backfill missing `user_profiles` for 24 auth users
- [x] Wrap `auth.uid()` in `(select auth.uid())` across all 167 affected RLS policies
- [x] Create `custom_access_token_hook` SQL function for `is_admin` JWT claim
- [x] Register Custom Access Token Hook in Supabase Dashboard
- [x] Update `isAdmin()` TS helper to read `is_admin` from JWT
- [x] Force JWT refresh for all existing sessions (rollout)
- [x] Add `getCurrentUser()` React `cache()` helper for server components
- [x] Replace direct `supabase.auth.getUser()` calls in server components with `getCurrentUser()`
- [x] Rewrite RLS `is_admin()` function to read from JWT
- [x] Verify single `/auth/v1/user` request per page (no waterfall)
- [x] Verify `EXPLAIN ANALYZE` shows 1 subquery eval for wrapped policies

## Phase 2 — Acumatica Consolidation

- [x] Port `sync_accounts()` to Python (`acumatica_accounts`)
- [x] Port `sync_customers()` to Python (`acumatica_customers`)
- [x] Port `sync_project_tasks()` to Python (`acumatica_project_tasks`)
- [x] Wire `sync_payment_applications()` writer (`acumatica_payment_applications`)
- [x] Change Render cron cadence to every 2h
- [x] Add drift-prevention triggers on `acumatica_*` tables → `acumatica_sync_runs`
- [x] Delete `frontend/src/lib/acumatica/sync/` (broken TS sync)
- [x] Update `docs/patterns/integration-errors.md` to mark TS sync removed
- [x] Verify all 4 newly-Python entities have non-zero row counts
- [x] Verify `acumatica_sync_runs` shows runs every 2h

## Phase 3 — `projects` Schema Cleanup

- [x] Rename `projects.current_phase` → `projects.stage`
- [x] Codemod `current_phase` → `stage` across frontend + backend
- [x] Regenerate `database.types.ts`
- [x] Audit + remap/clear stale "Alleato Group delete" `companies` rows
- [x] Drop `projects.client` text column
- [x] Drop `projects.client_id` column
- [x] Codemod reads to use `company_id` → `companies` join
- [x] Verify project pages render company name via `company_id`

## Phase 4 — Pattern C Unified File Architecture

- [x] Create `document_type_taxonomy` table
- [x] Seed taxonomy values (executed_contract, COI, lien_waiver, closeout, permit, drawing, photo, email, teams, transcript, etc.)
- [x] Add `document_type` column + indexes to `document_metadata`
- [x] Backfill `document_type` from existing `category` values
- [x] Create `commitment_documents` junction table
- [x] Create `prime_contract_documents` junction
- [x] Create `change_order_documents` junction
- [x] Create `invoice_documents` junction
- [x] Create `company_documents` junction
- [x] Create `project_documents` junction
- [x] Create `submittal_documents` junction
- [x] Add `drawings.document_metadata_id` FK (hybrid model)
- [x] Build `<DocumentPicker>` component (`frontend/src/components/ds/document-picker.tsx`)
- [x] Extend `embed_pending_graph_documents()` for new types
- [x] Extend `findProjectDocuments` AI tool enum to match taxonomy
- [x] Migrate per-entity attachment writers/readers → `document_metadata` + junctions
  - [x] `cco_attachments` → `commitment_change_order_documents`
  - [x] `invoice_attachments` → `owner_invoice_documents` / `subcontractor_invoice_documents`
  - [x] `submittal_attachments` → `submittal_doc_links`
  - [x] `change_event_attachments` → `change_event_documents`
  - [x] `purchase_order_attachments` → `purchase_order_documents`
  - [x] `subcontract_attachments` → `subcontract_documents`
  - [x] `pcco_attachments` → `prime_contract_change_order_documents`
  - [x] `prime_contract_pco_attachments` → `prime_contract_pco_documents`
  - [x] Drop legacy attachment tables after browser verification and final row reconciliation (`20260524030000_drop_legacy_pattern_c_attachment_tables.sql`)

## Phase 5 — Outlook Attachment Promotion Pipeline

- [x] Implement `promote_pending_attachments()` worker
- [x] Wire into `run_graph_sync()` after embedding
- [x] Verify `promotion_status = 'promoted'` rows appear after sync
- [x] Verify promoted attachments show `source_system = 'graph_attachment'` in `document_metadata`

## Phase 6 — Drop Dead Tables

- [x] Grep-verify no references to `chat_messages`, `chat_sessions`, `chat_threads`
- [x] Drop `chat_messages`, `chat_sessions`, `chat_threads`
- [x] Grep-verify no references to `subcontractor_contacts`, `subcontractor_companies`
- [x] Drop `subcontractor_contacts`, `subcontractor_companies`
- [x] Verify app pages still load post-drop

## Phase 7 — `documents` Table Phased Drop

- [x] Migrate all TS reads/writes from `documents` to `document_metadata`
- [x] Install `documents_access_audit_trigger`
- [ ] 30-day soak verification (eligible 2026-06-17): `select count(*) from documents_access_audit where accessed_at > '2026-05-17'` = 0
- [ ] `drop table documents cascade`
- [ ] `drop table documents_access_audit cascade`

## Phase 8 — `/admin/database-inventory` Frontend Tool

- [x] Ship `/admin/database-inventory` page
- [x] Search/filter/sort across 402 tables
- [x] Detail drawer with live stats + columns + codebase refs

## Phase 9 — Document Categorization Backfill

- [x] OneDrive path-based backfill (small set, ~9 rows)
- [ ] LLM categorization for remaining ~6,567 generic-`category` rows (gpt-4.1-nano, batch 100)

## Phase 10 — Deferred Items (do NOT start without user go-ahead)

- [ ] Photo system architecture rework
- [ ] Closeout document workflow
- [ ] Marketing vertical cleanup
- [ ] `memories` tables review
- [x] Per-entity `*_attachments` drop (completed with Pattern C closeout migration `20260524030000`)

## Phase 11 — Documentation Updates

- [x] TABLE-INVENTORY.md — apply §0 corrections, update row counts, mark drops, add new tables
- [x] DATABASE-ARCHITECTURE.md — Pattern C section
- [x] AI-RAG-ARCHITECTURE.md — `findProjectDocuments` references `document_type` enum
- [x] COMMUNICATIONS-DATA-PIPELINE.md — Outlook attachment promotion subsection
- [x] `docs/deployment/AUTH-MIGRATION-RUNBOOK.md` written

## Other Outstanding (from §12)

- [x] Azure OCR env vars on Render + backfill triggered
- [ ] Deep Agents rollout — validate `/ai-assistant-v2`, then switch main AI assistant over
- [ ] Low-confidence review queue UI (`document_attribution_candidates`)
- [ ] GitHub Actions billing resolved (external — github.com/settings/billing)

## Open Questions (need answers before related work)

- [ ] Set `document_type` on email/teams rows, or keep `category`-only?
- [ ] Approve one-shot `email_attachments` → `document_metadata` backfill script?
- [ ] Junction RLS — explicit per-table policies or generic helper function?
- [ ] Drawings revision history — keep all revisions in `document_metadata` with separate revision-history table?
