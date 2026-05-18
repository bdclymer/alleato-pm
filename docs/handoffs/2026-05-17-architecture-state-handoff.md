# Alleato PM — Architecture State Handoff
**Date:** 2026-05-17  
**Purpose:** Full system state briefing for a new AI session. Read this before touching anything. Supersedes any older handoff documents.

---

## What Alleato PM Is

Next.js 15 / Supabase construction project management platform. Mirrors Procore: budgets, contracts, change orders, commitments, RFIs, submittals, drawings, invoicing, prime contracts. Stack: Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui, TanStack Query, Supabase (PostgreSQL + Auth + RLS + Storage), Python FastAPI backend.

**Production URL:** https://projects.alleatogroup.com  
**GitHub:** `MeganHarrison/alleato-pm` — work directly on `main`, no feature branches, no PRs.  
**Dev server:** port 3001 (port 3000 is occupied by another repo).  
**Test project:** project ID 67 (Vermillion Rise Warehouse).  
**Test credentials:** `test1@mail.com` / `test12026!!!` (from `.env` `TEST_USER_1`/`TEST_PASSWORD_1`).

---

## Two Supabase Projects — Critical

This is the most important thing to know before touching any database code.

| Project | Ref ID | What lives here | Env var |
|---------|--------|----------------|---------|
| **PM APP** (primary) | `lgveqfnpkxvzbnnwuled` | All app tables: projects, contracts, budgets, commitments, invoices, RFIs, submittals, companies, people, emails, meetings, insights, tasks, files, Acumatica sync | `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` |
| **AI Database** (RAG store) | `fqcvmfqldlewvbsuxdvz` | `document_chunks` (pgvector embeddings), `rag_document_metadata`, `rag_pipeline_state` | `RAG_SUPABASE_URL` + `RAG_SUPABASE_SERVICE_ROLE_KEY` |

**Rule:** anything RAG/embeddings → AI Database. Everything else → PM APP.  
**Legacy:** `document_chunks` and `rag_pipeline_state` still physically exist in PM APP but are write-blocked by a trigger (migrated 2026-05-15).

### Supabase clients
```ts
// Client components
import { createClient } from "@/lib/supabase/client"
// Server components / API routes
import { createClient } from "@/lib/supabase/server"
// Never install @supabase/auth-helpers-nextjs — conflicts with @supabase/ssr
```

---

## Auth Architecture (Phase 1 — complete as of 2026-05-16/17)

### What was built
1. **Custom Access Token Hook** — `public.custom_access_token_hook` injects `is_admin` into the JWT at sign-in. Registered on remote (`hook_custom_access_token_enabled: true`). New JWTs carry the claim; no `user_profiles` DB round-trip per page.
2. **`is_admin()` RLS function** — reads `(auth.jwt() -> 'is_admin')::boolean` directly from JWT. Zero DB subquery.
3. **`user_profiles` backfill** — all 49 auth users now have a profile row (was 24 missing).
4. **RLS `auth.uid()` wrap** — all 167 affected policies now use `(select auth.uid())` instead of bare `auth.uid()`, enabling Postgres to cache the result per query instead of re-evaluating per row.
5. **`getCurrentUser` cache helper** — `frontend/src/lib/auth/current-user.ts` uses React `cache()` to deduplicate `supabase.auth.getUser()` within a single server render.

### How to check admin status in server components
```ts
import { getCurrentUser, getIsAdmin } from "@/lib/auth/current-user";
const user = await getCurrentUser();   // deduplicated via React cache()
const isAdmin = await getIsAdmin();    // reads JWT claim, no DB round-trip
```

---

## Document Architecture — Pattern C (complete as of 2026-05-23)

### The canonical table: `document_metadata`
Every file in the system — emails, Teams messages, OneDrive files, meeting transcripts, uploaded contracts, lien waivers, insurance certs, drawings, photos — has a row in `document_metadata`. This is the unified search and auth surface.

Key columns added for Pattern C:
- `document_type text` → FK to `document_type_taxonomy(type_key)` (e.g., `'executed_contract'`, `'insurance_certificate'`, `'email_message'`)
- `file_name text`, `file_path text`, `storage_bucket text` — for file uploads
- `source_size bigint` — file size in bytes
- `deleted_at timestamptz` — soft delete (always filter `.is('deleted_at', null)`)

### `document_type_taxonomy` table
Defines all document types with `applies_to text[]` arrays — used by the frontend file picker to filter relevant types per entity (commitment, prime_contract, etc.).

### Junction tables (entity ↔ document links)
Each entity has a junction table linking it to `document_metadata`:
- `commitment_documents`, `prime_contract_documents`, `change_order_documents`
- `invoice_documents`, `company_documents`, `project_documents`, `submittal_documents`

Pattern: `(entity_id, document_metadata_id, document_type)` with RLS inheriting parent entity access.

### Drawings hybrid
`drawings` table keeps revision tracking. `drawings.document_metadata_id` FK points at the underlying file in `document_metadata`.

### Storage bucket
The physical files live in Supabase Storage bucket named `"documents"`. This bucket is NOT being dropped — only the legacy `documents` DB table is on a deprecation path.

### Legacy `documents` table — 30-day soak (drop eligible 2026-06-17)
The legacy `documents` DB table (distinct from the storage bucket) still exists. All application code was migrated to `document_metadata` on 2026-05-17. An audit trigger (`documents_access_audit_trigger`) now logs every INSERT/UPDATE/DELETE. Check `select count(*) from documents_access_audit where accessed_at > '2026-05-17'` — if zero on 2026-06-17, drop both the table and the audit table.

### Attachment tables — deferred
`cco_attachments`, `invoice_attachments`, `submittal_attachments`, `change_event_attachments`, `purchase_order_attachments`, `subcontract_attachments`, `pcco_attachments`, `prime_contract_pco_attachments` — still exist. Migration to `document_metadata` + junction tables is deferred until Pattern C soak period is complete.

---

## Communications & AI Pipeline

**Full reference:** `docs/architecture/COMMUNICATIONS-DATA-PIPELINE.md`

### Four tables, one flow
```
outlook_email_intake        ← all emails synced from Microsoft Graph
        ↓ (relevance filter + project matching)
document_metadata           ← AI-ready documents (emails, Teams, OneDrive, transcripts, uploads)
        ↓ (pgvector embedding)
document_chunks (AI DB)     ← what the RAG assistant actually queries
        ↓
project_insights / intelligence_packets / insight_cards
```

### Sync orchestrator
`backend/src/services/integrations/microsoft_graph/sync.py` — `run_graph_sync()` is the main entry point. Pipeline: sync → embed → OCR → promote attachments → (optional) Teams compiler.

### Key pipeline steps inside `run_graph_sync()`
1. Outlook sync (`sync_outlook_emails`)
2. OneDrive sync (`sync_onedrive_folder`, `sync_sharepoint_folder`)
3. Embedding (`embed_pending_graph_documents` + `embed_pending_attachment_documents`)
4. Azure OCR (`ocr_worker.py` — for scanned PDFs with `status='no_text'`)
5. Attachment promotion (`promote_outlook_intake_attachments`)
6. (Optional) Teams compiler

### Outlook attachment promotion
`backend/src/services/integrations/microsoft_graph/attachment_promotion.py` — downloads Graph attachments, uploads to Storage, creates `document_metadata` rows. Wired into `run_graph_sync()` with `run_attachment_promotion=True` by default.

### Render cron jobs (in `render.yaml`)
| Cron | Schedule | What it runs |
|------|----------|-------------|
| `alleato-teams-channel-sync` | `:10` every hour | Teams channel sync only (no embed) |
| `alleato-teams-dm-sync` | `:40` every hour | Teams DM sync only |
| `alleato-graph-sync` | `:20` every 2h | Outlook + OneDrive + embed + OCR + promotions |
| `alleato-acumatica-financial-sync` | `0 */2 * * *` | Acumatica financial data sync |
| `alleato-daily-recap` | 9:30 UTC daily | AI project recap from transcripts |
| `alleato-task-extraction` | 7:00 UTC daily | Extract action items |
| `alleato-rag-health` | 12:15 UTC daily | RAG health check + Slack alert |
| `alleato-packet-refresh-periodic` | 2,9,15,21 UTC | Intelligence packet refresh |
| `alleato-domain-packet-compiler` | 2:30,9:30,15:30,21:30 UTC | Domain-level synthesis |
| `alleato-executive-daily-brief-*` | Weekdays 11/12 UTC + 22:30/23:30 UTC | CEO briefing |

---

## Acumatica Integration

**Pattern docs:** `docs/patterns/integration-errors.md`  
**Python client:** `backend/src/services/acumatica_sync.py` — canonical implementation.  
**Frontend read client:** `frontend/src/lib/acumatica/client.ts` — used by AI tools only.

### Critical rules
- Auth is cookie-based (POST `/entity/auth/login` → 204 + cookies). NOT bearer token.
- **Never use `$filter` in OData queries** — causes HTTP 500. Use `$select`, `$top`, `$expand` only. Filter in-memory.
- Company name must be exact: `"Alleato Group LLC"` (case-sensitive).
- API version: `24.200.001`.
- When testing via CLI, use Node.js (not curl) — passwords with `!` break shell escaping.

### Tables synced (Python, runs every 2h)
`acumatica_ar_invoices`, `acumatica_ap_bills`, `acumatica_accounts`, `acumatica_customers`, `acumatica_project_tasks`, `acumatica_payment_applications`, `acumatica_projects`, `acumatica_project_budgets`, `acumatica_change_orders`, `acumatica_subcontracts`, `acumatica_purchase_orders`, `acumatica_payments`, `acumatica_checks`

### Drift prevention (added 2026-05-17)
Every table above has an `AFTER INSERT OR UPDATE FOR EACH STATEMENT` trigger that inserts a sentinel row into `acumatica_sync_runs`. If any table shows no sync in >2h, you can query `acumatica_sync_runs` by `entity_name` and `started_at` to detect stale tables.

---

## AI Assistant Architecture

**Full reference:** `docs/architecture/AI-RAG-ARCHITECTURE.md`  
**Model stack:**
- Strategist: `openai/gpt-5.4` (via Vercel AI Gateway)
- CFO: `openai/gpt-5.4-mini`
- Synthesis: `openai/gpt-4.1`
- Title/artifact: `openai/gpt-4.1-nano`
- Embeddings: `text-embedding-3-large` (halfvec 3072)

**AI SDK:** Vercel AI SDK v6. Auth via `AI_GATEWAY_API_KEY` (BYOK — billing to OpenAI, not Vercel).

**Tool files:**
- `frontend/src/lib/ai/tools/financial.ts` — budget, contracts, cost codes
- `frontend/src/lib/ai/tools/operational.ts` — RFIs, submittals, schedule
- `frontend/src/lib/ai/tools/project-tools.ts` — project health, directory
- `frontend/src/lib/ai/tools/acumatica.ts` — ERP financial data
- `frontend/src/lib/ai/tools/schedule-tools.ts` — scheduling
- `frontend/src/lib/ai/tools/forecast-tools.ts` — financial forecast

**RAG read path:** `search_document_chunks` RPC (pgvector cosine similarity) against AI Database. NOT `document_metadata` directly.

---

## Key UI Patterns (Enforced by ESLint)

| Pattern | Rule |
|---------|------|
| Every table page | `UnifiedTablePage` + `useUnifiedTableState` from `@/components/tables/unified` |
| Every new page | `<PageShell variant="table|dashboard|form|detail|content">` |
| Every API fetch from components | `apiFetch` from `@/lib/api-client` — never raw `fetch` |
| Every external fetch from API routes | `fetchWithGuardrails` from `@/lib/fetch-with-guardrails` |
| DB columns | Always run `npm run db:types` before querying. `projects.id` is `INTEGER` not UUID. |

**Design system components:** check `frontend/src/components/ds/` first. Golden examples: `frontend/src/components/ds/GOLDEN-EXAMPLES.tsx`.

---

## Projects Table — Important Columns

The `projects` table uses `INTEGER` IDs (not UUID). Key columns:
- `company_id uuid` — canonical client company FK → `companies.id`
- `stage varchar` — project phase (renamed from `current_phase` 2026-05-16)
- `project_manager bigint` → `people.id`
- `acumatica_project_id text` — ERP link

Dropped columns (no longer exist): `client` (text), `client_id` (uuid). The projects API (`/api/projects`) computes `client` as a virtual field from `company_id → companies.name` for backwards compatibility.

---

## Pending Work (as of 2026-05-17)

| Item | Target Date | Notes |
|------|------------|-------|
| Drop `documents` DB table (hard) | 2026-06-17 | Conditional on `documents_access_audit` showing zero rows |
| Per-entity attachment tables → `document_metadata` | After 2026-06-17 | `cco_attachments`, `invoice_attachments`, `submittal_attachments`, etc. |
| LLM categorization backfill | Anytime | ~17% of `document_metadata` rows still have generic `category`. Use gpt-4.1-nano, batch 100. |
| `TABLE-INVENTORY.md` doc updates | Anytime | Apply §0 corrections from `docs/architecture/CONSOLIDATED-IMPLEMENTATION-PLAN.md` |
| Azure OCR activation | Anytime | Add `AZURE_DOCUMENT_INTELLIGENCE_*` env vars, deploy, run backfill |
| Deep Agents production toggle | Blocked on validation | `AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED` — needs end-to-end test with real project |
| Low-confidence review queue UI | Deferred | `document_attribution_candidates` table has no frontend yet |
| GitHub billing | Blocked | CI workflows disabled (billing lock at github.com/settings/billing) |

---

## Key File Index

| Thing | File |
|-------|------|
| Auth helper (server) | `frontend/src/lib/auth/current-user.ts` |
| Supabase client (browser) | `frontend/src/lib/supabase/client.ts` |
| Supabase client (server) | `frontend/src/lib/supabase/server.ts` |
| API fetch wrapper | `frontend/src/lib/api-client.ts` |
| External fetch wrapper | `frontend/src/lib/fetch-with-guardrails.ts` |
| DB types (generated) | `frontend/src/types/database.types.ts` |
| Project type (manual) | `frontend/src/types/project.ts` |
| Graph sync orchestrator | `backend/src/services/integrations/microsoft_graph/sync.py` |
| Attachment promotion | `backend/src/services/integrations/microsoft_graph/attachment_promotion.py` |
| Azure OCR worker | `backend/src/services/integrations/microsoft_graph/ocr_worker.py` |
| Acumatica Python sync | `backend/src/services/acumatica_sync.py` |
| Acumatica TS client | `frontend/src/lib/acumatica/client.ts` |
| AI orchestrator | `frontend/src/lib/ai/orchestrator.ts` |
| AI providers | `frontend/src/lib/ai/providers.ts` |
| Teams compiler | `backend/src/services/intelligence/teams_compiler.py` |
| Render cron config | `render.yaml` |
| Table page reference | `frontend/src/app/(main)/[projectId]/commitments/page.tsx` |
| Design system examples | `frontend/src/components/ds/GOLDEN-EXAMPLES.tsx` |
| Form FK mismatch pattern | `docs/patterns/form-id-mismatch-prevention.md` |
| Communications pipeline doc | `docs/architecture/COMMUNICATIONS-DATA-PIPELINE.md` |
| AI/RAG architecture doc | `docs/architecture/AI-RAG-ARCHITECTURE.md` |
| Consolidated audit + plan | `docs/architecture/CONSOLIDATED-IMPLEMENTATION-PLAN.md` |

---

## Session History (2026-05-15 to 2026-05-17)

The 2026-05-15 database audit produced `docs/architecture/CONSOLIDATED-IMPLEMENTATION-PLAN.md` with 11 phases. All phases are now complete:

- **Phase 1 (Auth):** JWT hook live, RLS policies wrapped, `user_profiles` backfilled, React cache helpers in place.
- **Phase 2 (Acumatica):** TypeScript sync deleted, 4 entities ported to Python, 2h cron live, drift prevention triggers deployed.
- **Phase 3 (Projects schema):** `current_phase` renamed to `stage`, `client`/`client_id` columns dropped, API injects virtual `client` field.
- **Phase 4 (Pattern C):** `document_type_taxonomy` created + seeded, `document_type` column on `document_metadata`, all junction tables live, drawings hybrid FK, email attachment backfill, frontend `<DocumentPicker>` built, embedding extended.
- **Phase 5 (Outlook attachments):** `promote_outlook_intake_attachments` wired into `run_graph_sync`.
- **Phase 6 (Dead tables):** `chat_*` and `subcontractor*` tables dropped.
- **Phase 7 (documents table):** All TypeScript reads/writes migrated to `document_metadata`. 30-day soak audit trigger live. Drop date: 2026-06-17.
- **Phase 8 (DB inventory):** `/admin/database-inventory` page live (402 tables, search, detail drawer).
- **Phases 9–10:** Path-based categorization backfill done, `config.toml` synced, auth hook confirmed enabled via Management API.
