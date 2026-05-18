# Consolidated Implementation Plan — 2026-05-15

> **Purpose:** Single source of truth for all architectural changes decided during the 2026-05-15 database + AI assistant audit. Every change below has a phase, an owner-facing deliverable, and verification steps. Do not start a task without reading the linked reference doc first.
>
> **Status:** ✅ ALL PHASES COMPLETE as of 2026-05-17. This document is now a historical record. For current architecture state see `docs/handoffs/2026-05-17-architecture-state-handoff.md`.

## Reference Documents

These are the load-bearing docs this plan depends on. Read them in this order before starting any task below:

1. **[DATABASE-ARCHITECTURE.md](./DATABASE-ARCHITECTURE.md)** — MAIN vs RAG project split, dual-write paths, cross-DB FK pattern.
2. **[TABLE-INVENTORY.md](./TABLE-INVENTORY.md)** — every table's purpose, writers, readers, gotchas. **See corrections in §0 below.**
3. **[RESEARCH-FINDINGS-2026-05-15.md](./RESEARCH-FINDINGS-2026-05-15.md)** — 5-track research synthesis with corrections to TABLE-INVENTORY.
4. **[COMMUNICATIONS-DATA-PIPELINE.md](./COMMUNICATIONS-DATA-PIPELINE.md)** — sync orchestrator, embedding, project assignment.
5. **[AI-RAG-ARCHITECTURE.md](./AI-RAG-ARCHITECTURE.md)** — Pipeline B (insight_cards + intelligence_packets), tool routing.
6. **[PRPs/database-inventory-tool/PRP.md](../PRPs/database-inventory-tool/PRP.md)** — handoff for the `/admin/database-inventory` frontend tool (separate session).

---

## §0. Corrections to Prior Docs (READ FIRST)

These correct factual errors made during the audit. Trust this section over the originals until they're patched.

| Claim in TABLE-INVENTORY.md / earlier analysis | Reality | Source of truth |
|---|---|---|
| `user_profiles` is empty | **25 rows.** Real issue: 24 of 49 auth users have no profile + 167 of 179 RLS policies use bare `auth.uid()` instead of `(select auth.uid())`. | `select count(*) from user_profiles` |
| `acumatica_sync_runs` is empty | **53 rows.** Sync is firing; just hasn't run lately. | `select count(*) from acumatica_sync_runs` |
| 99% of `document_metadata.category` is generic | **17%** is generic (5,059 of 37K). 75% is properly tagged `teams_message`. Audit sampled too narrow a slice. | `select category, count(*) from document_metadata group by 1 order by 2 desc` |
| `client_id` is the canonical project↔company link, keep it; drop `client` text | **`company_id` is canonical** (80 rows). `client_id` (23 rows) points at stale "Alleato Group delete" entries on 6 disagreement rows. Drop BOTH `client` text and `client_id`. | Direct `projects` table audit |
| `document_user_access` / `document_group_access` are dead (empty) | **NOT DEAD.** Wired into RLS policies on `document_metadata`, `document_rows`, `document_chunks` as per-document ACL overrides with FK CASCADE. Empty because management UI isn't built yet. **KEEP.** | `supabase/migrations/20260427130000_secure_rag_documents_rls.sql` |
| `outlook_email_intake_attachments` needs redesign for a processing cycle | **Architecture is correct.** Table already has `promotion_status`, `promotion_reason`, `promotion_attempt_count`, `promoted_at`, `document_metadata_id`. Just incomplete wiring, not a redesign. | Schema inspection |
| Dropping Pipeline A would not break any view | **Broke `project_health_dashboard`** (3 callers). Recreated against `insight_cards` + `intelligence_targets` in migration `20260515100000`. | Already fixed ✅ |

**A correction PR against TABLE-INVENTORY.md is in §11 below.**

---

## §1. Sequenced Phases

Tasks are grouped by phase. Within a phase, items can be parallelized; phases are sequential because later phases depend on earlier ones.

| Phase | Theme | Effort | Status |
|---|---|---|---|
| 1 | Auth waterfall fix (USER PRIORITY 1) | 8–12h | ✅ Complete (2026-05-16/17) |
| 2 | Acumatica consolidation | 6–8h | ✅ Complete (2026-05-17) — drift-prevention triggers added |
| 3 | `projects` schema cleanup (`stage` rename, drop `client` + `client_id`) | 3–4h | ✅ Complete (2026-05-15/16) |
| 4 | Pattern C unified file architecture + `document_type_taxonomy` | 5–6 days | ✅ Complete (2026-05-15) — all junction tables live |
| 5 | Outlook attachment promotion pipeline (finish wiring) | 1–2 days | ✅ Complete (2026-05-15) |
| 6 | Dead-table drops (chat_*, subcontractor*) | 2h | ✅ Complete (2026-05-15) |
| 7 | `documents` table phased drop | 1 day code + 30d soak + 1h drop | ✅ Code complete (2026-05-17) — 30d soak running, **drop eligible 2026-06-17** |
| 8 | `/admin/database-inventory` frontend tool | Separate session (PRP exists) | ✅ Complete (2026-05-15) — live at `/admin/database-inventory` |
| 9 | Document categorization backfill | 4–6h | ✅ Partial — path-based backfill done; ~17% generic rows remain for LLM pass |
| 10 | Deferred items (photos, closeout, marketing/memories) | TBD | Deferred |
| 11 | Documentation updates | 2h | ✅ In progress (2026-05-17) — handoff doc + arch doc updates |

---

## §2. Phase 1 — Auth Waterfall Fix (PRIORITY 1)

**Problem:** Every protected page makes 3 sequential auth calls before rendering: `supabase.auth.getUser` → `user_profiles.is_admin SELECT` → `project_directory_memberships SELECT`. Combined with 167 of 179 RLS policies using bare `auth.uid()` (which re-evaluates per row), pages are slow.

**Reference:** Supabase Postgres best-practices skill (RLS perf) + Vercel auth skill (React `cache()` + JWT custom claims).

### 2.1 Backfill missing profiles (Day 1, 1h)

24 of 49 auth users have no row in `user_profiles`. Backfill them.

```sql
-- supabase/migrations/20260516000000_backfill_user_profiles.sql
insert into user_profiles (id, email, is_admin, created_at)
select u.id, u.email, false, u.created_at
from auth.users u
left join user_profiles p on p.id = u.id
where p.id is null;
```

**Verify:** `select (select count(*) from auth.users) = (select count(*) from user_profiles);` → `true`.

### 2.2 Wrap `auth.uid()` in all RLS policies (Day 1–2, 3–4h)

Replace `auth.uid()` with `(select auth.uid())` in all 167 affected policies. Postgres can cache the subquery result per query instead of re-evaluating per row.

Generate a migration that drops + recreates each policy. Pattern:

```sql
-- For each policy:
drop policy "policy_name" on schema.table;
create policy "policy_name" on schema.table
  for select using ( user_id = (select auth.uid()) );
```

**Helper query to enumerate affected policies:**
```sql
select schemaname, tablename, policyname, qual
from pg_policies
where qual ~ 'auth\.uid\(\)' and qual !~ '\(select auth\.uid\(\)\)';
```

**Verify:** Run an `EXPLAIN ANALYZE` on a SELECT against a multi-row policy before + after; per-row function call count should drop to 1.

### 2.3 Add Supabase Custom Access Token Hook for `is_admin` (Day 2, 2–3h)

Eliminates the `user_profiles.is_admin SELECT` per page render.

1. Create the SQL hook function:

```sql
-- supabase/migrations/20260517000000_custom_access_token_hook.sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_is_admin boolean;
begin
  select is_admin into user_is_admin
  from public.user_profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{is_admin}', to_jsonb(coalesce(user_is_admin, false)));
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on table public.user_profiles to supabase_auth_admin;
```

2. Register the hook in Supabase Dashboard → Auth → Hooks → Custom Access Token. Cannot be done from migration; must be UI or `supabase config push`.

3. Update the `is_admin()` helper to read from JWT:

```ts
// frontend/src/lib/auth/is-admin.ts
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const isAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean((user?.app_metadata as { is_admin?: boolean })?.is_admin);
});
```

4. **Force JWT refresh** for all sessions after rollout (existing JWTs won't have the claim until refresh). Document this in the rollout runbook.

### 2.4 Cache server-component auth lookups with React `cache()` (Day 2, 1h)

```ts
// frontend/src/lib/auth/current-user.ts
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
```

Use `getCurrentUser()` everywhere in server components instead of calling `supabase.auth.getUser()` directly. React dedupes within a single request.

### 2.5 Rewrite `is_admin()` RLS function (Day 2, 1h)

The RLS `is_admin()` function currently runs a subquery against `user_profiles`. Rewrite to read from JWT:

```sql
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'is_admin')::boolean, false);
$$;
```

### Verification (Phase 1 exit)

- Open Network panel on `/projects/67`. Confirm only ONE `/auth/v1/user` request, no `user_profiles` SELECT, no waterfall.
- `EXPLAIN ANALYZE` on `select * from project_directory_memberships where user_id = auth.uid()` shows `init_plan` with 1 subquery eval.
- All admin pages still gate non-admins correctly.

---

## §3. Phase 2 — Acumatica Consolidation

**Problem:** Two parallel sync implementations — Python (canonical, working) and TypeScript (broken, abandoned). 3 entities (accounts, customers, project_tasks) exist only in TS. `acumatica_payment_applications` has rows but no writer.

### 3.1 Port TS-only entities to Python (4–5h)

Add to `backend/src/services/acumatica_sync.py`:
- `sync_accounts()` → `acumatica_accounts`
- `sync_customers()` → `acumatica_customers`
- `sync_project_tasks()` → `acumatica_project_tasks`
- `sync_payment_applications()` → `acumatica_payment_applications` (was never wired)

Pattern: copy from existing `sync_invoices()` in the same file. Use cookie auth (NOT bearer), no `$filter`, filter in-memory.

### 3.2 Change cadence to every 2h (15min)

Edit `render.yaml`:
```yaml
- name: alleato-acumatica-sync
  schedule: "0 */2 * * *"  # every 2 hours
```

### 3.3 Add drift prevention (1h)

Add a Postgres trigger on each `acumatica_*` table that updates `acumatica_sync_runs` with last-write timestamp so we can alert on stale tables.

### 3.4 Delete TS sync code (1h)

```bash
rm -rf frontend/src/lib/acumatica/sync/  # delete the broken TS sync
# Keep frontend/src/lib/acumatica/client.ts — AI tools still read via it
```

Update `docs/patterns/integration-errors.md` to mark TS sync as removed.

### Verification

- All 4 newly-Python entities have non-zero row counts after first run.
- `acumatica_sync_runs` shows runs every 2h.
- TS imports under `frontend/src/lib/acumatica/sync/` are zero (`grep -r "from '@/lib/acumatica/sync"`).

---

## §4. Phase 3 — `projects` Schema Cleanup

### 4.1 Rename `current_phase` → `stage` (1h)

```sql
-- supabase/migrations/20260518000000_rename_projects_current_phase_to_stage.sql
alter table projects rename column current_phase to stage;
```

Codemod across frontend + backend:
```bash
rg -l 'current_phase' frontend/ backend/ | xargs sed -i '' 's/current_phase/stage/g'
```

Regenerate types: `cd frontend && npm run db:types`.

### 4.2 Audit + clean stale "Alleato Group delete" companies (1h)

```sql
select id, name from companies where name ilike '%delete%';
```

For each `projects.client_id` that points at a "delete" row, look up the real company by name and remap, or null out.

### 4.3 Drop `client` text + `client_id` columns (1h)

After 4.2:
```sql
-- supabase/migrations/20260519000000_drop_projects_legacy_client_columns.sql
alter table projects drop column client;
alter table projects drop column client_id;
```

Codemod:
```bash
rg -l "projects\.client\b|projects\.client_id" frontend/ backend/
```

Replace every read with `company_id` → `companies` join.

### Verification

- `select stage, count(*) from projects group by 1;` returns rows.
- No frontend references to `current_phase`, `client`, or `client_id`.
- Project pages render with company name from `company_id` join.

---

## §5. Phase 4 — Pattern C Unified File Architecture

**Decision (confirmed by user):** Same `document_metadata` table for all files. Add `document_type` column + new `document_type_taxonomy` table with `applies_to` array for form filtering. Drawings stay hybrid — keep the dedicated `drawings` table for revision tracking, but link to `document_metadata.id` for the underlying file.

**Goal:** One file location, one search path, one auth surface — for emails, Teams messages, Fireflies transcripts, OneDrive uploads, executed contracts, contract proposals, insurance certs, lien waivers, closeout docs, permits, drawings, progress photos.

### 5.1 Create `document_type_taxonomy` table (Day 1)

```sql
-- supabase/migrations/20260520000000_create_document_type_taxonomy.sql
create table document_type_taxonomy (
  type_key text primary key,
  display_name text not null,
  category text not null,           -- 'contract' | 'closeout' | 'permit' | 'drawing' | 'photo' | 'compliance' | 'communication' | 'other'
  applies_to text[] not null,       -- ['commitment','prime_contract','change_order','project'] — which forms surface this type
  required_metadata jsonb,          -- e.g., {executed_date: 'date', counterparty: 'string'}
  source_system text,               -- 'onedrive' | 'manual_upload' | 'graph_attachment' | 'fireflies' | null
  retention_days integer,           -- null = forever
  is_active boolean default true,
  created_at timestamptz default now()
);

create index on document_type_taxonomy using gin (applies_to);
```

### 5.2 Seed taxonomy values (Day 1)

```sql
insert into document_type_taxonomy (type_key, display_name, category, applies_to) values
  ('executed_contract', 'Executed Contract', 'contract', array['commitment','prime_contract']),
  ('contract_proposal', 'Contract Proposal', 'contract', array['commitment','prime_contract']),
  ('change_order_executed', 'Executed Change Order', 'contract', array['change_order','commitment']),
  ('insurance_certificate', 'Insurance Certificate (COI)', 'compliance', array['commitment','company']),
  ('lien_waiver_progress', 'Progress Lien Waiver', 'compliance', array['invoice','commitment']),
  ('lien_waiver_final', 'Final Lien Waiver', 'compliance', array['invoice','commitment','closeout']),
  ('w9', 'W-9', 'compliance', array['company']),
  ('closeout_manual', 'Closeout O&M Manual', 'closeout', array['project','submittal']),
  ('closeout_warranty', 'Closeout Warranty', 'closeout', array['project','submittal']),
  ('closeout_asbuilt', 'As-Built Drawings', 'closeout', array['project','drawing']),
  ('permit', 'Permit', 'permit', array['project']),
  ('permit_inspection', 'Permit Inspection Report', 'permit', array['project']),
  ('drawing_revision', 'Drawing Revision', 'drawing', array['drawing','project']),
  ('progress_photo', 'Progress Photo', 'photo', array['project','daily_report']),
  ('email_message', 'Email', 'communication', array['project']),
  ('teams_message', 'Teams Message', 'communication', array['project']),
  ('meeting_transcript', 'Meeting Transcript', 'communication', array['project','meeting']);
```

### 5.3 Add `document_type` column to `document_metadata` (Day 2)

```sql
alter table document_metadata
  add column document_type text references document_type_taxonomy(type_key);

create index on document_metadata (document_type);
create index on document_metadata (document_type, category) where document_type is not null;
```

Backfill from existing `category` values:
```sql
update document_metadata set document_type = 'email_message' where category = 'email';
update document_metadata set document_type = 'teams_message' where category = 'teams_message';
update document_metadata set document_type = 'meeting_transcript' where category = 'meeting';
-- etc — derive from OneDrive path patterns where available
```

### 5.4 Add junction tables for entity↔document links (Day 2–3)

```sql
create table commitment_documents (
  commitment_id uuid references commitments(id) on delete cascade,
  document_metadata_id uuid references document_metadata(id) on delete cascade,
  document_type text references document_type_taxonomy(type_key),
  attached_at timestamptz default now(),
  attached_by uuid references auth.users(id),
  primary key (commitment_id, document_metadata_id)
);

-- Same pattern for: prime_contract_documents, change_order_documents,
-- invoice_documents, company_documents, project_documents, submittal_documents
```

RLS: inherit access via the parent entity (commitment access → all its documents).

### 5.5 Drawings hybrid (Day 3)

Keep `drawings` table. Add `document_metadata_id` FK:
```sql
alter table drawings add column document_metadata_id uuid references document_metadata(id) on delete restrict;
```

Drawing-specific fields (revision, sheet_number, discipline) stay in `drawings`. The actual file lives in `document_metadata`.

### 5.6 Frontend file picker (Day 4)

Build a reusable `<DocumentPicker entity="commitment" entityId={id} />` that:
- Reads `document_type_taxonomy` filtered by `applies_to @> array[entity]`
- Renders type-grouped dropdown
- Upload writes to `document_metadata` with `document_type` set
- Junction row inserted on save

### 5.7 Migrate existing attachments (Day 5)

For each existing per-entity attachment table (`commitment_attachments`, `change_order_attachments`, etc.), migrate rows into `document_metadata` + the new junction. Keep old table as read-only for 30 days, then drop.

### 5.8 Embedding for new types (Day 5–6)

Extend `embed_pending_graph_documents()` to embed all new `document_type` values into `document_chunks`. AI assistant's `findProjectDocuments` tool already accepts a category enum — extend the enum to match the taxonomy.

### Verification

- File upload UI on commitment page shows correct type dropdown.
- AI assistant can answer "Show me all executed contracts for project 67" via `findProjectDocuments`.
- `select document_type, count(*) from document_metadata group by 1` shows distribution across new taxonomy.

### Open questions (still need answers)

1. Should `email_message` and `teams_message` get a `document_type` value or stay categorized by `category` only? (Lean: yes, set `document_type`, drop dependence on `category` for these.)
2. Migration from `email_attachments` (legacy table) into `document_metadata` — what's the path? Current proposal: backfill script reading `email_attachments` → upserting `document_metadata` via dual-write helper.
3. Per-entity RLS via junction: do we need explicit policies, or can junction inherit cleanly? Test with a non-admin user mid-Phase-4.

---

## §6. Phase 5 — Finish Outlook Attachment Promotion Pipeline

**State:** Architecture already exists. `outlook_email_intake_attachments` has all required columns. Just need the worker.

### 6.1 Promotion worker (Day 1)

Add to `backend/src/services/integrations/microsoft_graph/sync.py`:

```python
async def promote_pending_attachments(supabase) -> dict:
    """Promote outlook_email_intake_attachments rows to document_metadata."""
    pending = supabase.table('outlook_email_intake_attachments') \
        .select('*').eq('promotion_status', 'pending') \
        .lt('promotion_attempt_count', 3).limit(50).execute()

    for att in pending.data:
        try:
            # Download from Graph, upload to storage, upsert document_metadata
            doc_id = upsert_document_metadata(supabase, {...})
            supabase.table('outlook_email_intake_attachments').update({
                'promotion_status': 'promoted',
                'promoted_at': 'now()',
                'document_metadata_id': doc_id,
            }).eq('id', att['id']).execute()
        except Exception as e:
            supabase.table('outlook_email_intake_attachments').update({
                'promotion_status': 'failed',
                'promotion_reason': str(e),
                'promotion_attempt_count': att['promotion_attempt_count'] + 1,
            }).eq('id', att['id']).execute()
```

Call at the end of `run_graph_sync()` after embedding.

### Verification

- After next graph sync, `select promotion_status, count(*) from outlook_email_intake_attachments group by 1` shows `promoted` > 0.
- Promoted attachments appear in `document_metadata` with `source_system = 'graph_attachment'`.

---

## §7. Phase 6 — Drop Dead Tables (User-Confirmed)

User confirmed: drop dead `chat_*` and dead `subcontractor*` tables. **KEEP** marketing vertical, memories, photos, `document_user_access`, `document_group_access`.

### Tables to drop

```sql
-- supabase/migrations/20260525000000_drop_dead_tables.sql
-- chat_* (legacy, replaced by deep-agent chat flow)
drop table if exists chat_messages cascade;
drop table if exists chat_sessions cascade;
drop table if exists chat_threads cascade;

-- subcontractor* (legacy, replaced by companies + commitments)
drop table if exists subcontractor_contacts cascade;
drop table if exists subcontractor_companies cascade;
-- (verify list against TABLE-INVENTORY before dropping)
```

**Before each `drop`:** grep the codebase for ANY reference. If grep returns hits, that's not a dead table — stop and investigate.

### Verification

- No frontend or backend imports reference the dropped tables.
- App pages still load.

---

## §8. Phase 7 — `documents` Table Phased Drop

**Three subphases:**

### 8.1 Code cleanup (Day 1)
- Rewrite the one Python service that still reads `documents` for keyword fallback. Point it at `document_metadata` + `document_chunks`.
- Grep for ALL readers/writers. Replace with `document_metadata`.

### 8.2 30-day soak
- Add a Postgres trigger that logs any `documents` read or write to an audit table.
- Wait 30 days. If audit shows zero activity, proceed.

### 8.3 Hard drop (1h)
```sql
drop table documents cascade;
```

---

## §9. Phase 8 — `/admin/database-inventory` Frontend Tool

**Handoff is ready.** See `docs/PRPs/database-inventory-tool/PRP.md` and `README.md`.

Assign in a separate Claude Code session. Recommended model: Sonnet 4.6, no reasoning.

---

## §10. Phase 9 — Document Categorization Backfill

**Scope (revised after correction in §0):** Only 17% of `document_metadata.category` rows are generic, not 99%. Narrow this further:

### 10.1 OneDrive path-based backfill (2h)
```sql
update document_metadata set category = case
  when path ilike '%/contracts/%' then 'contract'
  when path ilike '%/permits/%' then 'permit'
  when path ilike '%/closeout/%' then 'closeout'
  when path ilike '%/insurance/%' then 'insurance'
  ...
end
where category is null or category = 'document';
```

Per RESEARCH-FINDINGS, only ~9 rows have parseable OneDrive paths — so this is small. Confirm with sample query first.

### 10.2 LLM categorization for the rest (2–4h)
For remaining uncategorized rows: pass title + first 500 chars of content to gpt-4.1-nano with the taxonomy as choices. Batch 100 at a time.

---

## §11. Phase 10 — Documentation Updates (REQUIRED at end)

After Phase 1–9 changes ship, patch the architecture docs:

1. **TABLE-INVENTORY.md** — apply all corrections from §0 of this plan. Bump row counts. Update writer/reader entries for changed tables. Mark dropped tables as removed. Add new tables (`document_type_taxonomy`, `*_documents` junctions).
2. **DATABASE-ARCHITECTURE.md** — add Pattern C section describing unified document_metadata + taxonomy.
3. **AI-RAG-ARCHITECTURE.md** — update `findProjectDocuments` tool description to reference `document_type` enum.
4. **COMMUNICATIONS-DATA-PIPELINE.md** — add Outlook attachment promotion subsection.
5. **New runbook:** `docs/deployment/AUTH-MIGRATION-RUNBOOK.md` — JWT custom claim hook + force-refresh procedure.

---

## §12. Deferred Items (Do Not Touch Yet)

These were flagged for deferral. **Do not start without explicit user go-ahead.**

| Item | Reason deferred |
|---|---|
| Photo system architecture rework | User: "this is used heavily on the front end... making changes to this would require the entire photo tools to be reworked." Investigate frontend usage map first. |
| Closeout document workflow | Roll into the commitments workflow pass; not standalone. |
| Marketing vertical cleanup | User wants to review personally. |
| `memories` tables | User wants to review personally. |
| `*_attachments` per-entity tables (commitment_attachments, etc.) drop | Wait until Phase 4 (Pattern C) is fully migrated + soak period. |

---

## §13. Open Questions (Need User Input Before Starting Phase 4)

1. **Email/Teams `document_type` value:** confirm we want to set `document_type = 'email_message' | 'teams_message'` on those rows, or keep them as `category`-only.
2. **`email_attachments` → `document_metadata` backfill:** OK to write a one-shot migration script?
3. **Junction RLS:** prefer explicit policies on each `*_documents` table, or a generic helper function that checks the parent entity?
4. **Drawings revision history:** keep all historical revisions in `document_metadata`, or only the current one? (Recommend: all revisions in `document_metadata`, `drawings.document_metadata_id` points at current; revision history is its own table.)

---

## §14. Critical Process Rules (lessons from this audit)

Added to memory at `~/.claude/projects/.../memory/feedback_verify_before_recommending_drops.md` and `feedback_understand_interconnections.md`. Summarized here so they live with the plan:

1. **Never recommend dropping a table based on row count alone.** Query data + grep all references + check RLS + check FKs both directions. Empty + has consumers = incomplete feature, not dead.
2. **Map writers/readers/FKs/RLS/views BEFORE forming any architectural recommendation.** Surface-level "this looks unused" is not analysis.
3. **When data contradicts an earlier claim, surface and correct it immediately** — don't bury or stack new recommendations on a wrong premise.
4. **`select count(*)` is not enough.** Sample broadly, not the first 100 rows in default order.

---

## §15. Quick Index — What Should I Do Right Now?

- **Starting fresh:** Read §0 corrections, then Phase 1.
- **Phase 1 in progress:** Section §2.
- **Need to assign frontend tool:** §9 + `PRPs/database-inventory-tool/`.
- **About to drop a table:** Re-read §0, §7, and the memory feedback files. If still in doubt, ask.
- **Updating docs at the end:** §11.
