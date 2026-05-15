# Research Findings & Recommendations — 2026-05-15

> Investigation pass following the table-inventory audit. Four parallel research agents + manual verification across: auth/RLS performance, Acumatica sync ownership, `documents` table drop safety, and `current_phase` / `client` legacy column status. **This document corrects two claims in earlier docs (`TABLE-INVENTORY.md` and `DATABASE-ARCHITECTURE.md`)** and replaces hand-wave recommendations with verified, actionable plans.

---

## Corrections to earlier documents

| Earlier claim | Verified reality | Where corrected |
|---|---|---|
| "`user_profiles` is empty (0 rows) but 123 code paths read it" | **25 rows of 49 auth users.** 24 users have no profile → silent non-admin for them. Real issue is sparse coverage + no INSERT policy + no signup hook. | Track 1 |
| "`acumatica_sync_runs` is empty despite a writer" | **53 rows.** Writer fires; my pg_class read was stale. | Track 2 |
| "`document_metadata.category` is 99% generic `'document'`" | **75% is `teams_message` (27,282 rows, properly tagged).** Only ~6,500 rows need a real category — and 6,228 of those have NO file path to parse. | Track 5 |

---

## Track 1 — Auth waterfall + RLS performance

### Verified state

- `auth.users`: 49 rows
- `user_profiles`: 25 rows — **24 auth users have no profile row**
- `users_auth`: 26 rows — bridge to `people` (1,086 rows) is sparse
- No `INSERT` policy on `user_profiles`. No signup trigger. The 25 rows are likely manual historical seeds.
- The `is_admin()` SQL function reads from `user_profiles` per query. Called from many RLS policies.

### The page-load waterfall (cold path)

For a project page request (verified by grep):

1. Edge middleware reads cookie + parses JWT locally — no DB call (good)
2. `[projectId]/layout.tsx` calls `getApiRouteUser()` + `getProjectAuthorization()`:
   - SELECT `user_profiles.is_admin`
   - SELECT `users_auth.person_id` (in parallel with above)
   - If non-admin: SELECT `project_directory_memberships` (third call)
   - Wrapped in `unstable_cache` 60s — steady-state is cached but cold path = 2-3 round-trips
3. Each API route called by the page re-runs `verifyProjectAccess()` (same 3 queries)
4. Several server components (`client-dashboard`, `my-work`, `rfis/[id]`) call `auth.getUser()` + a fresh `user_profiles` read on top of what the layout already did
5. Client-side `DevDebugPanel`, `permission-guard.tsx`, `team-chat/page.tsx` add another `auth.getUser()` + `user_profiles` round-trip

**Result on a project dashboard with 6 widgets:** 12-18 DB queries before content renders, all asking "who is this user and are they admin?"

### The real performance killer

**167 of 179 RLS policies (93%) use bare `auth.uid()` instead of `(select auth.uid())`.** Spread across 101 tables. Per Supabase Database Advisor lint `0003_auth_rls_initplan`:

> "auth.uid() is called only once at the beginning of the query execution, and its result is reused for each row comparison. That change reduces the overhead from a few seconds to a few microseconds with no impact on the result set."

This is the page-speed pain. The `is_admin()` function (called from `user_profiles` admin policy) is worse — Supabase's benchmark shows 11,000 ms → 7 ms when wrapped in `(select …)`.

### Recommended pattern (verified against Supabase docs)

Five phases, each independently shippable:

**Phase 1 — Backfill (15 min, safe, no code changes)**
```sql
-- Backfill user_profiles for every auth user
insert into public.user_profiles (id, full_name, is_admin)
select u.id,
       coalesce(p.first_name || ' ' || p.last_name, split_part(u.email, '@', 1)),
       false
from auth.users u
left join public.people p on p.auth_user_id = u.id
where not exists (select 1 from public.user_profiles up where up.id = u.id);

-- Backfill users_auth where person can be matched
insert into public.users_auth (auth_user_id, person_id)
select u.id, p.id
from auth.users u
join public.people p on p.auth_user_id = u.id or lower(p.email) = lower(u.email)
on conflict (auth_user_id) do nothing;
```
Then add a trigger on `auth.users INSERT` to auto-create `user_profiles` so this never recurs.

**Phase 2 — RLS `(select auth.uid())` migration (1 hr, mechanical)**

Generate `ALTER POLICY` statements for all 167 offending policies. Single migration. Zero behavior change, massive perf win.

**Phase 3 — Custom Access Token Hook (½ day)**

Per Supabase docs (`supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook`):

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims jsonb := event->'claims';
  v_is_admin boolean;
begin
  select coalesce(is_admin, false) into v_is_admin
  from public.user_profiles where id = (event->>'user_id')::uuid;
  claims := jsonb_set(claims, '{is_admin}', to_jsonb(coalesce(v_is_admin,false)));
  return jsonb_set(event, '{claims}', claims);
end; $$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on public.user_profiles to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
```

Register in **Dashboard → Authentication → Hooks → Customize Access Token**. JWT now carries `is_admin`. Reads in code:

```ts
const { data: { user } } = await supabase.auth.getUser();
const isAdmin = (user?.app_metadata as { is_admin?: boolean })?.is_admin === true;
```

**Caveat per docs:** "A JWT is not always 'fresh'. If you remove a user from a team and update the `app_metadata` field, that will not be reflected using `auth.jwt()` until the user's JWT is refreshed." For admin grants/revokes, force token refresh on the API that toggles it.

**Phase 4 — React `cache()` wrap (2 hrs)**

Per Next.js 15 + Supabase docs:

```ts
// lib/supabase/current-user.ts
import { cache } from 'react';

export const getCurrentUser = cache(async () => {
  return await getApiRouteUser(); // cookie-JWT only, no DB
});

export const getIdentity = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  // is_admin now from JWT, so this is zero DB calls
  const isAdmin = (user.app_metadata as { is_admin?: boolean })?.is_admin === true;
  return { user, isAdmin };
});
```

Same render, multiple server components, ONE evaluation.

**Phase 5 — Rewrite `is_admin()` SQL function (15 min)**

```sql
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'is_admin')::boolean, false)
$$;
```

Every RLS policy that calls `is_admin()` is now free — no `user_profiles` subselect.

### Effort + sequencing

- Phase 1: 15 min (backfill SQL)
- Phase 2: 1 hr (mechanical migration)
- Phase 3: 4 hr (hook + Dashboard config + helper + verify in prod)
- Phase 4: 2 hr (cache wrap; replace user_profiles reads with JWT lookups — codemod for the 176 callsites)
- Phase 5: 15 min (one SQL migration)
- **Total: 1.5–2 engineering days. Cold-page-load auth cost drops from 3 DB queries → 0. RLS overhead drops from "few seconds" → "few microseconds" on 101 tables.**

### Files to touch

- `frontend/src/lib/supabase/server.ts` (add `getIdentityFromJwt`)
- `frontend/src/lib/supabase/auth-guard.ts` (drop `user_profiles` reads)
- `frontend/src/app/(main)/[projectId]/layout.tsx` (use cache + JWT)
- `frontend/src/lib/users/current-user-profile-server.ts`
- `frontend/src/lib/permissions.ts`, `permissions-guard.ts`, `components/guards/permission-guard.tsx`
- New: `supabase/migrations/<ts>_rls_wrap_auth_uid.sql`
- New: `supabase/migrations/<ts>_custom_access_token_hook.sql`
- New: `supabase/migrations/<ts>_user_profiles_signup_trigger.sql`

### References (verified URLs)

- https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
- https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0003_auth_rls_initplan
- https://supabase.com/docs/guides/database/postgres/row-level-security

---

## Track 2 — Acumatica sync ownership

### Verified state

Two parallel sync systems exist, but they don't truly overlap:

**Python (`backend/src/services/acumatica_sync.py`)** — actively scheduled, healthy:
- Render cron `alleato-acumatica-financial-sync` runs `0 0,7 * * *` (2×/day)
- All cursors updated 2026-05-11 20:42–43 — running on schedule
- 53 audit rows in `acumatica_sync_runs`
- Handles: projects, AP bills (+lines), AR invoices (+lines), checks, payments, change orders, subcontracts, purchase orders, project budgets
- All downstream projections (`direct_costs`, `subcontracts`, `prime_contract_change_orders`, `contract_change_orders`, `commitment_payments`, subcontractor_invoices paid-flag) live here

**TypeScript (`frontend/src/lib/acumatica/sync-service.ts` + `mirror-sync.ts` + `/api/cron/acumatica-sync`)** — not scheduled, broken:
- No cron in `render.yaml`
- 53 historical runs in `erp_sync_log`, **ALL with `sync_status='partial_failure'`** ("No prime contract found for this project. Create one first." for AR invoices/payments)
- Most recent run: 2026-05-08 (7 days stale)
- Two outliers refreshed manually 2026-05-13: `purchase_orders` and `subcontracts`
- Handles 3 entities Python doesn't: `acumatica_accounts`, `acumatica_customers`, `acumatica_project_tasks`

### Key findings

1. **`acumatica_payment_applications` is an orphan island.** 183 rows, all created 2026-04-13 16:16:26 in a 0.6-second burst. No writer in either codebase today. The migration that created the table only exists in stale worktrees, never landed in main. Three accounting routes (`/api/accounting/payments`, `invoices`, `dashboard`) read this table — they're serving stale 2026-04-13 data forever.

2. **`acumatica_sync_runs` was not actually empty** — has 53 rows. Earlier doc was wrong.

3. **Cursor entity-name collision is non-existent in practice.** Python uses prefixed names (`acumatica_ap_bills`); TypeScript uses unprefixed (`ap_bills`). Same `acumatica_sync_state` table, different keyspace. No race today.

4. **Three entities only the TypeScript path handles** — these would go stale if TS is deleted:
   - `acumatica_accounts` (chart of accounts, 154 rows, cursor stuck 2026-04-07)
   - `acumatica_customers` (vendor master, 58 rows, cursor 2026-04-27)
   - `acumatica_project_tasks` (99 rows, cursor 2026-05-06)

### Architecture assessment

**"Acumatica as source of truth, project into operational tables" is the right architecture, conditionally.** Acumatica is the system-of-record for finance — bypassing it breaks accounting/audit. Local mirrors give sub-second query speed and decouple app uptime from Acumatica's. Projections (`direct_costs`, etc.) let the app use stable Procore-shaped schemas instead of Acumatica's.

**The fatal weakness today:** nothing prevents direct UPDATEs to projection tables from the UI. A user editing `direct_costs.amount` silently diverges from Acumatica. The next sync may or may not overwrite it depending on the upsert conflict key. **This is the drift you're worried about. It's real.**

### Recommended changes

1. **Keep Python; delete TypeScript** — but first:
   - Port the 3 entities Python doesn't handle (`acumatica_accounts`, `acumatica_customers`, `acumatica_project_tasks`) into Python with their own `_sync_*` methods.
   - Port `erp_sync_log` per-project audit writes from TS into Python (useful idea; broken in TS).
   - Then delete `frontend/src/lib/acumatica/sync-service.ts`, `mirror-sync.ts`, `/api/cron/acumatica-sync/route.ts`.

2. **Sync cadence: 2×/day → every 2 hours.**
   - Change `render.yaml` cron: `0 0,7 * * *` → `0 */2 * * *`
   - Why not hourly: a full sync run takes ~70 seconds. 12 runs/day at 70s each = fine. 24 runs/day starts to cluster. ProjectTransactions endpoints in Acumatica are expensive (detail line fetch per bill).

3. **Drift prevention — combined approach:**
   - **App-level (do first):** delete all PATCH/POST/DELETE routes for projection tables (`direct_costs`, `subcontracts`, `purchase_orders`, `prime_contract_change_orders`, `contract_change_orders`, `commitment_payments`). You already said these are never edited from the app — enforce it by deleting the routes.
   - **DB-level (do second):** add a `BEFORE UPDATE` trigger on those projection tables that raises unless `current_setting('app.sync_in_progress', true) = 'on'`. Python sync sets the session variable per transaction.
   - **Audit-level:** add a nightly `projection_drift_audit` cron that compares row counts and last-modified per `acumatica_external_key`. Alert on mismatch.

4. **`acumatica_payment_applications` writer:** add `_sync_payment_applications` to Python, hitting Acumatica's `Payment/$expand=Documents` endpoint, upserting on `(payment_reference_nbr, invoice_reference_nbr)`. Without this, three accounting routes serve permanently stale data.

5. **Future-proof for ERP swap:** defer this. When a second ERP is on the roadmap (NetSuite, Sage), introduce an `ERPAdapter` interface that normalizes shapes. Premature abstraction costs more than it saves.

### Effort

- Port 3 TS-only entities to Python: 3 hr
- Port `erp_sync_log` write into Python: 1 hr
- Delete TS sync code + routes: 1 hr
- Change cron schedule: 5 min
- Drift trigger + audit view: 2 hr
- Delete projection mutate routes: 2 hr (~5 routes to audit)
- `acumatica_payment_applications` writer: 2 hr
- **Total: ~1.5 engineering days**

---

## Track 3 — `documents` table drop

### Verified state

- 12,685 rows (table size 14 MB + indexes/embedding = 186 MB total)
- Last write: 2026-03-22 (7 weeks stale)
- 0 writes in last 30 days
- 0 inbound dependency rows in `chunks`, `private.document_processing_queue`, `tasks.source_chunk_id`
- All 12,685 rows have a `document_metadata` counterpart (no orphans)

### Active code references (must be addressed before drop)

**Reads that still fire:**
- `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items/options/route.ts:241` — invoice "related items" picker
- `frontend/src/lib/ai/services/marketing-service.ts:152` — marketing source candidates
- `backend/src/services/supabase_helpers.py:426` — `search_chunks_by_keyword` (RAG keyword fallback)
- `backend/src/services/supabase_helpers.py:450` — `fetch_recent_chunks`
- `frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:106` — already broken (queries columns that don't exist)

**Writes (dead-on-arrival — nothing downstream reads what they write):**
- `frontend/src/components/project-setup-wizard/document-upload-setup.tsx:133, :217`
- `frontend/src/components/project-setup-wizard/drawings-setup.tsx:180`

**DB-level dependencies:**
- View `documents_ordered_view`
- View `project_health_dashboard` (and `_no_summary`) — subselects `recent_documents_count`, `last_document_date`
- Functions `match_documents`, `match_documents_enhanced`, `match_documents_full`, `match_recent_documents`, `search_by_category`, `search_by_participants` — all SELECT from `documents`
- Stale trigger updating `documents.ai_insights_count` (column doesn't exist)

### Drop plan (phased)

**Phase A — code cleanup (1 day)**
- Rewrite `supabase_helpers.search_chunks_by_keyword` and `fetch_recent_chunks` against `document_chunks` joined to `document_metadata` (not `documents`).
- Rewrite the invoice related-items picker's `case "document"` to query `document_metadata`.
- Rewrite `marketing-service.ts` documents branch.
- Delete the broken `client-dashboard/page.tsx:104-111` documents block.
- Replace the wizard's `documents` writes with `document_metadata` writes (or remove the file-upload step pending product decision).

**Phase B — DB-level rename + 30-day soak (15 min)**
```sql
ALTER TABLE public.documents RENAME TO documents_archived_2026_05_15;
-- Drop dependent views (recreate from document_metadata if still wanted):
DROP VIEW IF EXISTS public.documents_ordered_view CASCADE;
-- Drop or rewrite project_health_dashboard subselects (already recreated 2026-05-15)
-- Drop functions:
DROP FUNCTION IF EXISTS public.match_documents(vector, int, double precision, int);
DROP FUNCTION IF EXISTS public.match_documents_enhanced(...);
DROP FUNCTION IF EXISTS public.match_documents_full(...);
DROP FUNCTION IF EXISTS public.match_recent_documents(...);
DROP FUNCTION IF EXISTS public.search_by_category(...);
DROP FUNCTION IF EXISTS public.search_by_participants(...);
-- Drop the stale trigger:
DROP TRIGGER IF EXISTS update_documents_ai_insights_count ON public.ai_insights;  -- if it still exists
```

**Phase C — hard drop (after 30 days, 5 min)**
```sql
DROP TABLE public.documents_archived_2026_05_15 CASCADE;
```
Regenerate `database.types.ts`.

### Risk: LOW–MEDIUM

- Low: zero writes in 30+ days, zero inbound dependency rows, all rows mirrored in `document_metadata`
- Medium because: `supabase_helpers.py` keyword fallback IS live (must be rewritten); 6 DB functions could be called by ad-hoc tooling outside the repo

### Effort

- Phase A: 1 day
- Phase B: 30 min (after Phase A ships clean for 1 week)
- Phase C: 5 min (after 30-day soak)

---

## Track 4 — `current_phase` and `client` columns

### `current_phase` — NOT legacy

Two parallel columns on `projects`, but they hold different concepts:

| Column | Population | Distinct values | Concept |
|---|---|---|---|
| `phase` | 110/111 (99%) | Current, Complete, Archive, Internal, Estimating, Planning (mixed case) | **Portfolio bucket** — which list does this project show up in |
| `current_phase` | 9/111 (8%) | Course of Construction, Pre-Construction | **Construction lifecycle** — where in the project lifecycle |

Both have meaning. The bug is naming, not redundancy.

**Recommendation: rename `current_phase` → `stage`.**

Code already calls it "stage" everywhere it's user-facing:
- `create-project/page.tsx:129` writes `current_phase: values.stage`
- `edit-project-sidebar.tsx:264` writes `current_phase: form.stage`
- `portfolio/edit-project-dialog.tsx:360` writes `current_phase: formData.stage`
- `project-home-client.tsx:183-184` reads as `localProject.stage` AND `currentPhase`

Migration plan:
```sql
ALTER TABLE public.projects RENAME COLUMN current_phase TO stage;
```
Then codemod all `current_phase` → `stage` in code (~12 sites). Regenerate types. Effort: 1 hr.

Also: normalize `phase` casing. "complete":44 and "Complete":18 are the same value. One-shot UPDATE + CHECK constraint:
```sql
UPDATE public.projects SET phase = lower(phase) WHERE phase IS NOT NULL;
ALTER TABLE public.projects ADD CONSTRAINT projects_phase_check
  CHECK (phase IS NULL OR phase IN ('current','complete','archive','internal','estimating','planning'));
```

### `client` text column — legacy, drop

| Column | Population | Type |
|---|---|---|
| `client` (text) | 23/111 | Free-form vendor name |
| `client_id` (uuid) | 23/111 | FK to `companies.id` (same 23 rows) |
| `company_id` (uuid) | populated | Often equals `client_id` |

All 23 rows have both `client` and `client_id` populated. `client_id` already FKs to `companies.id`. The text column is redundant — the projects API already maps `companyNameById.get(project.client_id) ?? cleanClientName(project.client)`.

**Recommendation: drop `client` text. Keep `client_id` as the primary-client FK. Use `project_companies` for SECONDARY parties only.**

Reasoning:
- Your stated architecture: one `companies` table with `type` for client/vendor/sub. `client_id → companies.id` already satisfies that.
- `project_companies` currently only has rows for subs (18), vendors (13), suppliers (3). Zero client rows. The code treats `projects.client_id` as the canonical primary client.
- Modeling primary client as a row in `project_companies` with `company_type='CLIENT'` adds a JOIN to every "show me the client name" query — for a 1:1 relationship that's never going to be N:M.

Migration plan:
1. Refactor reads (~15 sites) to derive `client` from `companies` join via `client_id` (the API already does this; just stop reading the text column).
2. Add explicit FK constraint if missing: `ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES companies(id);`
3. After one release without reads from the text column: `ALTER TABLE projects DROP COLUMN client;`
4. Normalize `companies.type` casing ("client" / "vendor" / "subcontractor" / "supplier" all lowercase, plus a CHECK constraint).

Also: **audit `projects.company_id` separately.** It duplicates `client_id` in most rows. May be a different legacy column or the same thing under a different name. Worth its own review pass.

### Effort

- Rename `current_phase` → `stage` + codemod + normalize `phase` casing: 2 hr
- Refactor `client` reads + drop column: 4 hr (15 read sites + migration + verification)
- Audit `company_id` purpose: 1 hr investigation
- **Total: ~1 day**

---

## Track 5 — Document categorization (correction + revised plan)

### What I got wrong

In `TABLE-INVENTORY.md` I claimed "99% of `document_metadata` rows are tagged generic `'document'`." That was based on a 1,000-row sample. The actual distribution across all 37K rows:

| Category | Rows | Notes |
|---|---|---|
| `teams_message` | 27,282 | properly tagged ✓ |
| `document` | 5,059 | generic — needs real category |
| `email` | 2,445 | properly tagged ✓ |
| `null` | 1,404 | needs category |
| Specific (specification, drawing, contract, rfi_document, financial_document, etc.) | ~250 | small but precise |
| Mixed case (`Drawing` vs `drawing`, `Contract` vs `contract`) | small | casing hygiene needed |

**Real backfill scope: ~6,463 rows** (5,059 generic `document` + 1,404 null).

### What you said the backfill should do

> "All of the documents can easily be categorized and mapped to the correct project because it came directly from OneDrive, which has the categories determined based on what folder it came from and the exact project based on the project folder. So everything was organized in the 2026 jobs folder with subfolders for each project that contain the project number and the project name and then within each of those folders had subfolders for every single category like RFIs or submittals or photos or schedule."

I confirmed the OneDrive path pattern in real data — one example row has:

```
source_path: "Alleato Group/2025 Jobs/Noblesville Goodwill R2.pdf"
source_web_url: "https://alleato-my.sharepoint.com/personal/bclymer_alleatogroup_com/Documents/
                 Alleato%20Group/2025%20Jobs/
                 25-%20125%20-%20Goodwill%20Noblesville%20(Noblesville,%20IN)/
                 06%20-%20Bid%20(Responses)/
                 04%20-%20Masonry/
                 D4/Noblesville%20Goodwill%20R2.pdf"
```

The URL contains everything we need: year folder, `25-125` project number + name, `Bid Responses` category, `Masonry` trade.

### The problem: most rows have no path

Of the 6,463 generic/null-category rows:

| State | Count |
|---|---|
| Has OneDrive-parseable path (`source_web_url` matches sharepoint.com, or `source_path` present) | **9** |
| Has only `file_name` (no path) | 226 |
| Completely pathless (no `file_name`, `file_path`, `source_path`, `source_web_url`) | **6,228** |

**Only 9 of 6,463 rows have a parseable OneDrive path.** The path-based backfill you described would categorize 0.1% of the target set.

### Why so many pathless rows

Looking at recent additions: pathless rows are dated 2026-05-13 to 2026-05-15 with `source_system=NULL`, no `file_name`, no `file_path`. They look like **stub/placeholder rows** created by some upstream process — possibly Fireflies meeting prep, possibly intake email reference records, possibly attribution-candidate stubs.

This needs a separate investigation: **what process is creating 6,000+ pathless `document_metadata` rows?** That's the root cause of the categorization gap. Backfilling categories on rows that have no content is treating the symptom.

### Revised backfill recommendation

1. **First, investigate the pathless rows.** Sample 20 of the 6,228 pathless rows by creation date + look at the `id` patterns. Many may be:
   - Meeting placeholder rows where the actual content is in `meeting_segments`
   - Email reference rows where the content is in `outlook_email_intake`
   - Source-signal candidate stubs that should be in `source_signal_candidates`, not `document_metadata`

   If these are legitimate but mis-classified, the right move is to **delete or relocate them**, not categorize them.

2. **Path-based rule (deterministic, ~9 rows today, more as new OneDrive docs come in):**
   ```sql
   -- Example rule for the OneDrive corpus
   UPDATE public.document_metadata
   SET category = CASE
     WHEN source_web_url ILIKE '%/06%20-%20Bid%20(Responses)/%' THEN 'bid_response'
     WHEN source_web_url ILIKE '%/Permits/%' THEN 'permit'
     WHEN source_web_url ILIKE '%/Drawings/%' THEN 'drawing'
     WHEN source_web_url ILIKE '%/Specs/%' OR source_web_url ILIKE '%/Specifications/%' THEN 'specification'
     WHEN source_web_url ILIKE '%/RFIs/%' THEN 'rfi_document'
     WHEN source_web_url ILIKE '%/Submittals/%' THEN 'submittal_document'
     WHEN source_web_url ILIKE '%/Photos/%' THEN 'photo'
     WHEN source_web_url ILIKE '%/Schedule/%' THEN 'schedule_document'
     WHEN source_web_url ILIKE '%/Contracts/%' THEN 'contract'
     -- … fill in the rest based on inspecting your actual folder structure
     ELSE category
   END
   WHERE (category IS NULL OR category = 'document') AND source_web_url IS NOT NULL;
   ```

   You'll need to inspect a sample of OneDrive paths to enumerate every category subfolder. I can do that in a follow-up by sampling 100 distinct path prefixes from `document_metadata` and grouping by the 3rd-level segment.

3. **LLM classifier for narrow batches (your direction):**
   - Meetings without category, last 12 months: run via Anthropic / OpenAI classification using `meeting_segments.summary` + `file_name`. Estimated 100 docs per your guess; verify with a count query.
   - Emails from last 30 days with `category=null OR 'document'`: probably most are already tagged `email`; check first.
   - Teams messages from last 30 days: should all be `category='teams_message'` already; verify there are none mis-classified.
   - Cap budget per batch. Use the cheaper model (Haiku) for classification — it's a 12-way classification task, not analysis.

4. **Manual admin UI for bulk tagging:**
   - Build a `/admin/document-categorization` page using `UnifiedTablePage` showing rows where `category IS NULL OR category = 'document'`.
   - Bulk-select + category dropdown.
   - Already part of the `database-inventory-tool` PRP pattern — could be added to that workstream.

### Effort

- Investigate pathless-row root cause: 2 hr
- Path rule SQL (after sampling actual folder structure): 1 hr
- LLM classifier batch for meetings: 2 hr (script + dry run + apply)
- Manual admin UI for bulk tagging: 4 hr (UnifiedTablePage instance)
- **Total: ~1.5 days**

---

## Summary of recommended priorities

Sorted by user impact + dependency order:

| # | Track | Action | Effort | Blocks |
|---|---|---|---|---|
| 1 | Auth | **Backfill `user_profiles` + RLS `(select auth.uid())` migration** | 1.5 hr | Nothing — purely additive, ship today |
| 2 | Auth | Custom Access Token Hook + JWT-based `is_admin` reads | 1 day | Phase 1 |
| 3 | Auth | React `cache()` wrap + rewrite `is_admin()` SQL fn | ½ day | Phase 2 verified in prod |
| 4 | Documents | Investigate the 6,228 pathless `document_metadata` rows root cause | 2 hr | Before any document cleanup |
| 5 | `current_phase` rename → `stage` + `phase` casing normalization | 2 hr | Nothing |
| 6 | Acumatica | Port 3 TS-only entities into Python; delete TS sync code | ~1 day | Nothing |
| 7 | Acumatica | Add `_sync_payment_applications` writer for the orphan island | 2 hr | Nothing |
| 8 | Acumatica | Sync cadence: `0 0,7 * * *` → `0 */2 * * *` | 5 min | After Python is sole writer |
| 9 | Acumatica | Drift prevention (DB trigger + delete mutate routes + audit cron) | 4 hr | After consolidation |
| 10 | `client` column | Refactor reads to use `client_id` join + drop text column | 4 hr | Nothing |
| 11 | `company_id` audit | Investigate whether duplicate of `client_id` or distinct | 1 hr | Before #10 ships |
| 12 | Documents | Code cleanup (Python keyword fallback + 4 frontend sites) | 1 day | Before drop |
| 13 | Documents | Rename `documents` → `documents_archived_2026_05_15`, drop dep views | 30 min | After #12 |
| 14 | Documents | Hard drop after 30-day soak | 5 min | After #13 |
| 15 | Document categorization | OneDrive path rule SQL + LLM batch for meetings + admin UI | 1.5 days | After #4 root-cause |

**Aggregate: roughly 6–7 engineering days for the full cleanup pass.** Auth (#1-3) is the highest user-visible win (page load speed) and should ship first. Acumatica (#6-9) is the next-highest leverage for data quality. Documents (#12-14) is mostly mechanical cleanup that can run in parallel.

---

## Open questions still requiring user input

1. **Acumatica TS-only entities** (`acumatica_accounts`, `acumatica_customers`, `acumatica_project_tasks`): need to remain synced after TS deletion. Add to Python? Confirm yes/no.
2. **Wizard `documents` writes**: when these are removed in the documents-table drop, do you want the project-setup wizard's file-upload step to (a) write to `document_metadata` instead, (b) skip the file-tracking step entirely, or (c) be removed from the wizard?
3. **`projects.company_id`** column: its purpose vs `client_id`. Want me to dig further or hold for your input?
4. **LLM classifier model + budget cap**: Haiku is cheap and adequate for category classification. OK to use? Budget cap per batch?
5. **Admin UI for document categorization**: Should this be a standalone page or integrated into the existing `database-inventory-tool` PRP (which is staged but not started)?

---

## What was verified vs claimed

| Claim | Status |
|---|---|
| `user_profiles` empty | ❌ Wrong — 25 rows |
| `users_auth` only 1 row | ❌ Wrong — 26 rows |
| RLS perf issue from bare `auth.uid()` | ✅ Verified — 167/179 policies |
| 24 auth users with no profile row | ✅ Verified |
| `acumatica_sync_runs` empty | ❌ Wrong — 53 rows |
| `acumatica_payment_applications` no writer | ✅ Verified — orphan 0.6s burst |
| Python Acumatica sync is canonical | ✅ Verified — cursors fresh 2026-05-11 |
| TS Acumatica sync broken | ✅ Verified — all 53 historical runs `partial_failure` |
| `documents` table mostly safe to drop | ✅ Verified — 0 writes in 30 days, all rows mirrored |
| `documents` actively read by 2 Python paths | ✅ Verified — `supabase_helpers.py:426, :450` |
| `current_phase` is legacy | ❌ Wrong — distinct concept from `phase` |
| `client` text is legacy | ✅ Verified — redundant with `client_id` |
| 99% of document_metadata.category is "document" | ❌ Wrong — only 17% (5,059 of 37K) |
| ~6,500 docs need real category | ✅ Verified — but most are pathless, can't path-classify |

---

*Generated 2026-05-15 via 4 parallel research agents + manual SQL verification on project lgveqfnpkxvzbnnwuled.*
