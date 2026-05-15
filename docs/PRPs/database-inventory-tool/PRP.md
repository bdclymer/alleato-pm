# PRP: Database Inventory Tool

> **Recommended model:** Claude Sonnet 4.6 (no reasoning mode). This is mechanical implementation work following established patterns in the codebase — TypeScript/Next.js/Supabase boilerplate plus a Node generator script. A reasoning model would waste tokens re-deliberating decisions that are already settled in this PRP. If a phase blocks on a non-obvious design call, escalate to the user; do not invent.
>
> **Total estimated effort:** 10–12 hours, broken into 5 phases. MVP (phases 1–3) ships in 5–6 hours.
>
> **Scope discipline:** every architectural decision below is final. Do not redesign the data model, do not pick a different framework, do not skip the YAML port to "save time." If you disagree with a decision, finish the phase as specified and raise the disagreement to the user separately.

---

## 1. Why this exists

The repo has two large architecture docs:

- `docs/architecture/DATABASE-ARCHITECTURE.md` — explains the MAIN vs RAG split, dual-write paths, why each database exists.
- `docs/architecture/TABLE-INVENTORY.md` — a 770-line per-table reference (purpose, writers with file:line, readers, row counts, gotchas) for all 327 MAIN + 12 RAG tables.

The inventory markdown is too large to scan or search. Every "where is X populated?" question still requires Ctrl+F through 770 lines, and the row counts go stale the moment they're written.

This PRP delivers a **filterable, searchable, always-fresh frontend page** at `/admin/database-inventory` that consolidates the same information, plus a generator that keeps it in lockstep with both the live database schema and the codebase.

---

## 2. Architecture (final — do not redesign)

Three layers, single source of truth split by concern:

```
docs/architecture/tables.yaml              human-authored metadata (purpose, gotchas, domain, cleanup_status)
                  │
scripts/dev-tools/generate-db-inventory.mjs  generator — runs SQL queries + git grep + YAML merge
                  │
                  ▼
frontend/src/components/dev-tools/db-inventory.generated.ts   typed JSON (one big const)
                  │
                  ▼
frontend/src/app/(admin)/database-inventory/page.tsx   UnifiedTablePage UI
                  │
                  └── frontend/src/app/api/admin/db-inventory/refresh/route.ts   live row counts on demand
```

### Why this shape (don't second-guess)

- **YAML for human content** because purpose / gotchas / cleanup priority cannot be auto-generated. PR-reviewable, version-controlled, human-editable.
- **Generator + .generated.ts file** because the existing precedent for "code-derived data the frontend needs" in this repo is exactly this pattern. See `scripts/dev-tools/generate-page-schema-fk-map.mjs` → `frontend/src/components/dev-tools/page-schema-fk.generated.ts`. Use the same shape.
- **UnifiedTablePage** because every admin table page in this repo uses it. See `frontend/src/app/(main)/[projectId]/commitments/page.tsx` for the reference implementation. CLAUDE.md `.claude/rules/TABLE-PAGE-GATE.md` makes this mandatory.
- **API route for live refresh** because the generated file is built at commit time, but the user wants to see current row counts without waiting for a regenerate. The refresh route only updates row counts + last_write_at; everything else stays from the generated file.

### What the generator combines

1. **Live SQL** to both Supabase projects:
   - From MAIN (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`) and RAG (`RAG_SUPABASE_URL` / `RAG_SUPABASE_SERVICE_ROLE_KEY`).
   - Per-table: row count (`pg_class.reltuples`), total size (`pg_total_relation_size`), column list with types (`information_schema.columns`), last-write timestamp (`pg_stat_user_tables.last_autoanalyze` as a proxy, or query a known timestamp column when available).
2. **Codebase grep** across `frontend/src` and `backend/src` (excluding `__tests__`, `node_modules`, `.next`, `.claude/worktrees`, `dist`):
   - Patterns: `.from("$TABLE")`, `.table("$TABLE")`, and `FROM public.$TABLE` / `INTO public.$TABLE` in SQL migration files.
   - Output per match: file path, line number, surrounding 1-line context, whether it looks like a read (`.select`) or write (`.insert`, `.update`, `.upsert`, `.delete`).
3. **YAML metadata** from `docs/architecture/tables.yaml`:
   - One entry per table with shape defined in Phase 1 below.

### Status taxonomy (use exactly these values, do not invent more)

- `live` — populated, written, read
- `live-empty` — wired (writers + readers in code), no rows yet
- `dormant` — referenced in DB only, no code writes or reads
- `dead` — zero rows + zero code references; safe to drop
- `legacy` — rows exist, code still touches it, but a successor table exists (e.g., `documents` vs `document_metadata`)
- `orphan-mirror` — rows exist in this DB but canonical lives elsewhere (e.g., MAIN.document_chunks vs RAG.document_chunks)

---

## 3. Required references (read these before writing code)

The implementing session MUST open and skim these files first. They establish the patterns to follow:

| File | What to learn from it |
|---|---|
| `scripts/dev-tools/generate-page-schema-fk-map.mjs` | The exact precedent for "Node script that reads from the codebase and writes a `.generated.ts` file." Mirror its structure: ESM imports, `repoRoot` resolution, fail-loud helpers, header comment in output file. |
| `frontend/src/components/dev-tools/page-schema-fk.generated.ts` | What a typed generated TS file looks like in this repo. Header banner, no manual edits warning, single `export const` of a typed object. |
| `frontend/src/components/tables/unified/unified-table-page.tsx` | The table page wrapper. Required props: `header`, `toolbar`, `columns`, `data`, `selection`, `pagination`, `emptyState`, `rowActions`. Read the props type before writing the page. |
| `frontend/src/components/tables/unified/use-unified-table-state.ts` | The hook every UnifiedTablePage uses for search/sort/filter/pagination state. |
| `frontend/src/app/(main)/[projectId]/commitments/page.tsx` | The reference table-page implementation. Copy its skeleton; don't reinvent. |
| `frontend/src/features/commitments/commitments-table-config.ts` | The companion column/filter config file. Same pattern applies to this new page — extract config to `frontend/src/features/database-inventory/db-inventory-table-config.ts`. |
| `docs/architecture/TABLE-INVENTORY.md` | The 770-line master inventory. **This is the source content for the YAML port in Phase 1.** Do not paraphrase or reword the content; preserve it. |
| `docs/architecture/DATABASE-ARCHITECTURE.md` | Background on the MAIN vs RAG split. Required reading for understanding column meanings in the generated output. |
| `.claude/rules/TABLE-PAGE-GATE.md` | Repo rule about table pages. Follow it. |
| `.claude/rules/FILE-ORGANIZATION-GATE.md` | Where new files belong. |
| `.claude/rules/DESIGN-SYSTEM-GATE.md` | UI primitives to use. No raw `<button>`, no hardcoded colors, use `@/components/ds/*` components. |

The implementing session should also run `Skill alleato-table-page` before writing the page; it captures table-page conventions that are non-negotiable in this codebase.

---

## 4. Phase 1 — Convert `TABLE-INVENTORY.md` to `tables.yaml`

**Goal:** Port human-authored content from the markdown into structured YAML, one entry per table, preserving fidelity.

**Output:** `docs/architecture/tables.yaml`

### YAML entry schema (mandatory shape)

```yaml
tables:
  - name: insight_cards
    db: MAIN                          # MAIN | RAG (exactly these two values)
    domain: intelligence              # see allowed domains below
    status: live                      # live | live-empty | dormant | dead | legacy | orphan-mirror
    purpose: |
      Durable extracted signals from the Pipeline B compiler. Deduplicated by
      normalized_signal_key. The model reads these to answer owner questions
      about risks, decisions, blockers, financial exposure, etc.
    gotchas: |
      Confidence is alpha-sorted wrong by Postgres ("high|low|medium"). Always
      sort client-side using CONFIDENCE_RANK from @/lib/ai/insight-cards.
      attribution_status="rejected" rows must be filtered from every read.
    cleanup_priority: null            # null | low | medium | high (only set when status is dead/dormant/orphan-mirror)
    owner: ai-intelligence            # free-form short tag — see allowed owners below
    related_tables:                   # OPTIONAL — other tables this one joins/depends on
      - intelligence_targets
      - insight_card_evidence
      - intelligence_packets
    notes_for_ai: |                   # OPTIONAL — extra context for the assistant on how to query
      Filter active cards with current_status IN ('open','blocked','needs_review','stale')
      AND attribution_status != 'rejected'. See ACTIVE_CARD_STATUSES constant.
```

### Allowed `domain` values (closed enum — do not invent)

- `projects` — projects table itself + project_* ancillary
- `people` — people, companies, subcontractors, vendor contacts
- `permissions` — users_auth, user_profiles, permission_*
- `financial` — budget_*, contract_*, owner invoices, estimates, schedule of values
- `acumatica-erp` — every acumatica_* mirror, direct_costs, commitment_payments, erp_sync_log
- `change-management` — change_events*, contract_change_orders, prime_contract_change_orders, pco_*, cco_*, pcco_*
- `commitments` — subcontracts, purchase_orders, subcontractor_invoices, commitment_*
- `documents` — document_metadata, documents, document_*, drawings, drawing_*, files, attachments, search_documents
- `communications` — outlook_email_intake, project_emails, email_*, meeting_segments, fireflies_*, daily_recaps, briefing_*, executive_*
- `chat-bot` — chat_history, conversations, bot_*, team_chat_*, telegram_*, teams_link_codes, the dead chat_* family
- `intelligence` — insight_cards, insight_card_*, intelligence_*, source_signal_*, source_intelligence_*, project_attribution_*, document_attribution_*, recurring_issues, initiative_cards
- `ai-feedback-memory` — ai_memories, memories, ai_retrieval_*, ai_feedback_*, ai_learning_*, ai_review_feedback, ai_task_feedback, ai_models, ai_analysis_jobs, ai_tool_write_audits
- `sync-infrastructure` — graph_subscriptions, graph_sync_state, source_sync_runs, source_sync_health_snapshots, ingestion_*, sources, system_alerts, sync_status, processing_queue, pipeline_config, rag_pipeline_state
- `workflow` — tasks, todos, rfis, submittals, submittal_*, schedule_tasks, schedule_*, specifications, specification_*, punch_items, punch_*, inspections, observations, observation_*, daily_logs, daily_log_*, transmittal_items, issues, discrepancies, timeline_events, requests, implementation_plans, execution_handoffs, collaboration_*, recurring_issue_*, reviews, review_comments
- `marketing` — marketing_*, initiatives, workspace_artifacts
- `admin-feedback` — admin_feedback_*, feature_requests, feature_request_*, roadmap_items
- `media` — photos, photo_*, project_photos, project_progress_report_photos, observation_photos, daily_logs_project_photos_links
- `fm-asrs` — fm_*, asrs_*, block_embeddings, design_recommendations, design_violations, optimization_rules
- `procore-parity` — procore_*, qa_page_audit
- `support-knowledge` — support_articles, support_article_chunks, chunks, code_examples, nods_page, nods_page_section
- `infra-meta` — app_*, dev_*, database_tables_catalog, table_metadata, admin_view_backups, test_*, organizations, organization_members, groups, group_members, app_roles, billing_invitations

### Allowed `owner` tags (closed enum)

- `core-app` — project / directory / general app
- `financial-erp` — Acumatica + accounting
- `ai-intelligence` — Pipeline B compiler + insight cards + packets
- `ai-assistant` — chat handler, retrieval, tools, memory
- `comms-pipeline` — Outlook / Teams / Fireflies / OneDrive sync
- `executive-briefing` — owner briefing, daily recaps
- `admin-tools` — dev panel, procore parity, qa audit, feedback inbox
- `fm-vertical` — FM Global / ASRS sprinkler design
- `legacy` — anything explicitly slated for removal
- `unknown` — no clear owner; flag for triage

### Sourcing rules

1. Read `docs/architecture/TABLE-INVENTORY.md` end to end before writing YAML.
2. For every table mentioned in the markdown, create a YAML entry. Preserve the markdown's purpose/gotcha text verbatim (or as close as possible) — do not paraphrase aggressively.
3. The markdown's "Critical findings" section lists tables with known bugs (e.g., `user_profiles` empty, `acumatica_payment_applications` no writer). Capture those in `gotchas` for the relevant table.
4. For tables in the markdown's "Dormant / unused" lists, set `status: dormant` (if 0 rows) or `status: dead` (if 0 rows AND zero code references confirmed in the markdown).
5. For the four MAIN-side stale-copy tables (`document_chunks`, `packet_refresh_jobs`, `source_signal_candidates`, `source_intelligence_jobs`), set `status: orphan-mirror` and note in `gotchas` that RAG is canonical.

### Coverage requirement

Every table in **both** of these inventories must have a YAML entry:

```sql
-- MAIN
SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r';

-- RAG
(same query, RAG project)
```

The generator in Phase 2 will FAIL the build if any live table is missing from the YAML. So coverage is enforced; don't skip the long tail.

### Success criteria for Phase 1

- [ ] `docs/architecture/tables.yaml` exists with one entry per table in both databases.
- [ ] All required fields populated (`name`, `db`, `domain`, `status`, `purpose`).
- [ ] No paraphrasing that drops critical-finding gotchas from the markdown.
- [ ] YAML parses cleanly (`yaml-cli` or `npx js-yaml`). Add `yaml` to devDependencies if not present.

### Estimated time: 2–3 hours

If you delegate this to a sub-agent (recommended): give the agent both the markdown and the YAML schema, instruct it to produce the full file in one pass, then verify coverage by diffing the table list.

---

## 5. Phase 2 — Generator script

**Goal:** Combine YAML + live SQL + code grep into one typed `.generated.ts` consumed by the frontend.

**Output:**
- `scripts/dev-tools/generate-db-inventory.mjs` — the generator
- `frontend/src/components/dev-tools/db-inventory.generated.ts` — the output
- `package.json` script: `"db:inventory": "node scripts/dev-tools/generate-db-inventory.mjs"`

### Generator behavior

1. Load `.env` from repo root (use the same pattern as `backend/src/services/env_loader.py` but in Node — likely just `dotenv/config`).
2. Create two `@supabase/supabase-js` clients: MAIN and RAG, both with service-role keys.
3. Read `docs/architecture/tables.yaml` via `js-yaml`.
4. For each table entry in the YAML, query its DB:
   ```sql
   SELECT
     c.relname AS name,
     c.reltuples::bigint AS approx_rows,
     pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
     pg_stat.last_autoanalyze,
     pg_stat.last_autovacuum,
     pg_stat.n_live_tup,
     pg_stat.n_dead_tup
   FROM pg_class c
   JOIN pg_namespace n ON n.oid=c.relnamespace
   LEFT JOIN pg_stat_user_tables pg_stat ON pg_stat.relid=c.oid
   WHERE n.nspname='public' AND c.relkind='r' AND c.relname=$1;
   ```
5. For each table, query column metadata:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_schema='public' AND table_name=$1
   ORDER BY ordinal_position;
   ```
6. Walk the codebase (use Node's `fs` + glob; do NOT shell out to `git grep`). Patterns to match per table name:
   - `.from("$TABLE")` and `.from('$TABLE')`
   - `.table("$TABLE")` and `.table('$TABLE')`
   - For SQL migration files (`supabase/migrations/*.sql`): `FROM public.$TABLE`, `INTO public.$TABLE`, `UPDATE public.$TABLE`, `DELETE FROM public.$TABLE`, `CREATE.*ON public.$TABLE`. Treat these as a separate "migrations" reference category.
   - Walk roots: `frontend/src/`, `backend/src/`, `supabase/migrations/`.
   - Exclude paths matching: `__tests__/`, `node_modules/`, `.next/`, `.claude/worktrees/`, `dist/`, `.archive/`.
   - For each match, capture: `file_path` (repo-relative), `line_number`, `kind` ("read" if surrounded by `.select`, "write" if surrounded by `.insert|.update|.upsert|.delete`, "unknown" otherwise — check up to 3 lines after the match).
7. Schema-drift check: list every table actually present in MAIN and RAG. If any table exists in the DB but NOT in the YAML, FAIL the generator with a clear message ("Table $X exists in $DB but is missing from tables.yaml. Add it before regenerating."). If any YAML entry references a table that no longer exists, FAIL similarly.
8. Emit the output file as a single typed const:

```ts
// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Regenerate with: npm run db:inventory
// Source: docs/architecture/tables.yaml + live Supabase + code grep.

export type DbInventoryStatus =
  | "live"
  | "live-empty"
  | "dormant"
  | "dead"
  | "legacy"
  | "orphan-mirror";

export type DbInventoryDomain =
  | "projects" | "people" | "permissions" | "financial" | "acumatica-erp"
  | "change-management" | "commitments" | "documents" | "communications"
  | "chat-bot" | "intelligence" | "ai-feedback-memory" | "sync-infrastructure"
  | "workflow" | "marketing" | "admin-feedback" | "media" | "fm-asrs"
  | "procore-parity" | "support-knowledge" | "infra-meta";

export type DbInventoryReference = {
  filePath: string;
  lineNumber: number;
  kind: "read" | "write" | "migration" | "unknown";
  snippet: string;            // up to 120 chars of context
};

export type DbInventoryTable = {
  name: string;
  db: "MAIN" | "RAG";
  domain: DbInventoryDomain;
  status: DbInventoryStatus;
  purpose: string;
  gotchas: string | null;
  cleanupPriority: "low" | "medium" | "high" | null;
  owner: string;
  relatedTables: string[];
  notesForAi: string | null;
  liveStats: {
    approxRows: number;
    totalSize: string;        // e.g. "15 MB"
    lastAutoanalyze: string | null;  // ISO timestamp
    nLiveTup: number;
    nDeadTup: number;
    refreshedAt: string;      // ISO timestamp when this was queried
  };
  columns: Array<{
    name: string;
    dataType: string;
    isNullable: boolean;
  }>;
  references: {
    writes: DbInventoryReference[];
    reads: DbInventoryReference[];
    migrations: DbInventoryReference[];
    unknown: DbInventoryReference[];
  };
};

export type DbInventory = {
  generatedAt: string;        // ISO
  generatorVersion: "1";
  tables: DbInventoryTable[];
};

export const DB_INVENTORY: DbInventory = {
  generatedAt: "...",
  generatorVersion: "1",
  tables: [
    { name: "insight_cards", db: "MAIN", domain: "intelligence", ... },
    ...
  ],
};
```

### Reliability requirements

- Generator MUST be idempotent — running twice in a row produces the same output (modulo `generatedAt` and `refreshedAt`).
- Generator MUST NOT mutate the database. Read-only SQL.
- Generator MUST fail loud (`process.exit(1)`) on missing env vars, schema-drift, YAML parse errors, or DB connection failures. No silent fallbacks.
- Code grep MUST handle both single- and double-quoted table names: `.from("tasks")` and `.from('tasks')`. Test with a known table.
- Snippet capture MUST escape backticks and template-literal sequences so the output file parses.

### Success criteria for Phase 2

- [ ] `npm run db:inventory` regenerates the file successfully.
- [ ] `frontend/src/components/dev-tools/db-inventory.generated.ts` typechecks (`npm run typecheck` in `frontend/`).
- [ ] Schema-drift check fires when you intentionally add a fake table to the YAML, or omit a known one.
- [ ] Grep correctly identifies at least one write and one read for `projects`, `document_metadata`, `insight_cards`, `chat_history` (sanity-check tables).
- [ ] Output file is < 500 KB. If larger, truncate `snippet` length further.

### Estimated time: 2–3 hours

---

## 6. Phase 3 — Frontend page

**Goal:** Browsable, filterable, searchable admin page at `/admin/database-inventory` consuming the generated file.

**Output:**
- `frontend/src/app/(admin)/database-inventory/page.tsx` — the page route
- `frontend/src/features/database-inventory/db-inventory-table-config.ts` — column + filter config (per the alleato-table-page skill pattern)
- `frontend/src/features/database-inventory/db-inventory-detail-panel.tsx` — the detail drawer for row click

### Page structure (UnifiedTablePage — mandatory)

Columns (default visible):

| Column | Source | Notes |
|---|---|---|
| Name | `table.name` | sortable, searchable, bold |
| DB | `table.db` | `<StatusBadge>` (MAIN = neutral, RAG = accent) |
| Domain | `table.domain` | filterable enum |
| Status | `table.status` | `<StatusBadge>` colored (live=good, dormant=warning, dead=attention, orphan-mirror=warning, legacy=warning, live-empty=neutral) |
| Rows | `table.liveStats.approxRows` | right-aligned, formatted with thousands separator |
| Size | `table.liveStats.totalSize` | right-aligned, hidden by default |
| Writers | `table.references.writes.length` | sortable, click to filter |
| Readers | `table.references.reads.length` | sortable, click to filter |
| Owner | `table.owner` | filterable |
| Gotchas | `table.gotchas ? "⚠" : ""` | visual flag for tables with documented gotchas |

Toolbar — required:

- Search input (matches `name`, `purpose`, `gotchas` substring)
- Filters: `db`, `domain`, `status`, `owner`, `has gotchas` (boolean)
- Column visibility toggle (UnifiedTablePage default)
- Export CSV (UnifiedTablePage default)
- **Refresh button** — calls `POST /api/admin/db-inventory/refresh` (see Phase 4) and reloads row counts client-side.

Header:

- Title: "Database Inventory"
- Subtitle: `${tables.length} tables across MAIN + RAG · generated ${formatRelative(generatedAt)}`
- Primary action: a `<Button>` opening this PRP in a new tab (link to GitHub doc URL)

Row interaction:

- Click anywhere on a row → opens a detail drawer (right-side `<Sheet>` from shadcn). The drawer shows:
  - Full purpose paragraph
  - Gotchas block (only if present)
  - Live stats block (rows, size, last_autoanalyze, live tup, dead tup, refreshedAt)
  - Columns table (name / type / nullable)
  - **Writers** — list of `references.writes` rendered as `<filepath>:<line>` with the snippet on hover; click copies the path
  - **Readers** — same pattern
  - **Migrations** — only if non-empty
  - Related tables — chips that navigate to those table rows
  - Notes for AI block (only if present)

Mobile: rely on `mobile-card-list.tsx` from the unified table folder. Don't reinvent.

### Access control

- Page route lives under `(admin)/` segment, which is access-controlled per existing project convention. Verify by reading another admin page (`frontend/src/app/(admin)/insights/page.tsx` already exists per the recent migration).
- No additional auth code needed in this page — the admin layout enforces it.

### Routing / navigation

- Add a sidebar entry under the admin section. Find the admin sidebar config file (search for "Insights" link to find the admin nav file) and add "Database Inventory" with an appropriate Lucide icon (`Database` is fine).

### Success criteria for Phase 3

- [ ] Page loads at `http://localhost:3000/admin/database-inventory`.
- [ ] All filters work; search narrows the list correctly.
- [ ] Sort by row count surfaces `document_chunks` (MAIN copy at 103K) and other high-row tables first.
- [ ] Clicking a row opens the detail drawer with column schema, writers, readers visible.
- [ ] Refresh button updates the "Rows" column without a full page reload.
- [ ] Typecheck + lint + audit:db + audit:forms all pass (run `npm run quality` in `frontend/`).
- [ ] No `<h1>`, no raw `<button>`, no hardcoded colors. Use `<PageShell variant="table">`, `<Button>`, `<StatusBadge>`, design-system tokens only.

### Estimated time: 3–4 hours

---

## 7. Phase 4 — Live refresh API route + GitHub Action

**Goal:** Two automations: an on-demand refresh that updates row counts without rebuilding the whole generated file, and a CI job that keeps the generated file from drifting.

### Phase 4a — `/api/admin/db-inventory/refresh`

`frontend/src/app/api/admin/db-inventory/refresh/route.ts`. POST endpoint. Auth: existing admin middleware (the route lives under `api/admin/*`).

Body:
```ts
{ tables?: string[] }   // optional filter; omit = refresh all
```

Behavior:
- For each requested table, query MAIN or RAG (depending on the entry's `db` in the generated file) for fresh row count + last_autoanalyze.
- Return:
  ```ts
  {
    refreshedAt: string;
    updates: Array<{ name: string; db: "MAIN"|"RAG"; approxRows: number; totalSize: string; lastAutoanalyze: string|null }>;
  }
  ```
- Frontend merges this into client-side state to update the table without rerouting.

### Phase 4b — GitHub Action: schema drift

`.github/workflows/db-inventory-drift.yml`. Triggers:
- `push` to any branch touching `supabase/migrations/*.sql` OR `frontend/src/**/*.ts` OR `backend/src/**/*.py`
- `schedule: cron: "0 7 * * *"` (daily at 07:00 UTC)
- `workflow_dispatch` (manual run)

Steps:
1. Checkout the branch.
2. `npm ci` in repo root + `cd frontend && npm ci`.
3. Set env vars from secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAG_SUPABASE_URL`, `RAG_SUPABASE_SERVICE_ROLE_KEY`. These should already exist as repo secrets — confirm.
4. Run `npm run db:inventory`.
5. If `git diff --quiet frontend/src/components/dev-tools/db-inventory.generated.ts`: nothing to do. Exit 0.
6. If diff: open a pull request titled "chore(db-inventory): regenerate after schema/code drift" with the regenerated file. Body should include a `git diff --stat` summary.
7. On schema-drift FAIL (table in DB but not YAML), exit with code 1 and post a comment on the most recent merged PR with the required YAML addition. Do not auto-add to YAML — that needs human review of `purpose` / `gotchas`.

### Phase 4c — Pre-commit hook (optional, defer if time-constrained)

Husky hook at `.husky/pre-commit`. If the staged files contain any of: `supabase/migrations/*.sql`, `frontend/src/**/*.ts`, `backend/src/**/*.py`, run `npm run db:inventory` and `git add frontend/src/components/dev-tools/db-inventory.generated.ts`.

Catch: this runs on every dev commit. Time it — if `db:inventory` takes more than ~5 seconds, do not enable the pre-commit hook; rely on CI only.

### Success criteria for Phase 4

- [ ] Refresh button on the page actually updates row counts.
- [ ] GitHub Action runs successfully on a test PR (force a tiny migration change).
- [ ] Schema-drift CI fails cleanly when you intentionally remove a YAML entry for an existing table.
- [ ] No leaked secrets in workflow logs.

### Estimated time: 1 hour (4a) + 1 hour (4b) + skip 4c unless time permits

---

## 8. Phase 5 — Schema-drift CI gate (recommended hardening)

**Goal:** Prevent merging migrations that add new tables without their YAML entry.

Add a job to existing CI workflow (likely `.github/workflows/ci.yml` or similar — search for it):

1. Run `npm run db:inventory --check-only`. This new flag does the generator's schema-drift check but does NOT write the output file. Exits 1 if any table is missing from YAML.
2. Wire as a required check for PRs to main.

Update the generator to support `--check-only`:
- Same SQL queries + YAML parse.
- If drift detected, print a list of missing tables + a YAML stub the dev can copy-paste, then exit 1.
- Otherwise exit 0 without writing the output file.

### Success criteria for Phase 5

- [ ] CI fails on a PR that drops a `CREATE TABLE` migration without a YAML entry.
- [ ] CI message clearly states which tables need YAML entries and provides a stub.

### Estimated time: 1 hour

---

## 9. Out of scope (do not do these in this session)

The implementing session should explicitly NOT:

- Drop any tables flagged "dead" in the markdown or the YAML.
- Backfill `projects.address` or `document_metadata.category` — those are separate work items tracked elsewhere.
- Fix the `user_profiles` empty bug — separate work item, requires investigation outside this PRP.
- Redesign the MAIN vs RAG split or any data flow.
- Add Postgres triggers to either database.
- Build any AI tool that consumes the generated file. (One could be built later; not now.)
- Migrate the `documents` legacy table.
- Touch the existing `TABLE-INVENTORY.md` markdown until the YAML is verified working. Once the page is live and verified, the markdown can be reduced to a one-line stub pointing to the page.

If the implementer thinks any of these are necessary mid-task, STOP and ask the user.

---

## 10. Verification before declaring done

Run these in order and ensure all pass:

1. `cd frontend && npm run quality` — typecheck + lint + audit:db + audit:forms all green.
2. `npm run db:inventory` — regenerates without errors.
3. Manual smoke: load `/admin/database-inventory`, verify search/filter/sort/drawer behavior.
4. Manual smoke: click Refresh, verify row counts update for at least one table.
5. Trigger the GitHub Action manually (`workflow_dispatch`) — verify it runs and exits cleanly when there's no drift.
6. Test schema-drift: temporarily remove a YAML entry, run `npm run db:inventory`, verify it fails with a clear message; restore.
7. Test schema-drift CI: same as #6 but verify the CI job catches it.

Report back to user with:
- Screenshot of the live page (use Playwright or agent-browser if available; otherwise a clean description)
- The output file size
- Total table count rendered
- Any tables that couldn't be auto-classified into a domain (these should be `unknown` and flagged)

---

## 11. Commit strategy

One commit per phase, all on main. Commit messages:

- `feat(db-inventory): port table inventory markdown to tables.yaml`
- `feat(db-inventory): add generator script and generated TS output`
- `feat(db-inventory): add /admin/database-inventory page with filter+search+detail drawer`
- `feat(db-inventory): live refresh API + GitHub Action for schema drift`
- `feat(db-inventory): CI schema-drift gate`

If any phase exceeds 4 hours, break it into smaller commits at logical seams. Do NOT batch all phases into one commit.

Push to main directly per the project's git workflow (no feature branches; see `WORKING_CONTEXT.md` and CLAUDE.md memory).

---

## 12. Open questions to ask the user BEFORE starting

If any of these are unclear when the implementing session opens this PRP, ask before writing code:

1. Are repo secrets `RAG_SUPABASE_URL` and `RAG_SUPABASE_SERVICE_ROLE_KEY` set on GitHub Actions? (Check via the existing GitHub Actions workflows if any of them already reference these secrets.)
2. Is there an existing admin sidebar config to modify, or should the page be discoverable via direct URL only? (Likely the former — find the sidebar by searching for "Insights" or "Procore Tools".)
3. Should the YAML's `owner` field map to actual Linear teams or GitHub CODEOWNERS, or are these tags purely informational? (Default: informational.)
4. Are there tables with row counts > 10M where `pg_class.reltuples` is unreliable? If yes, fall back to an explicit `count(*)` only for those. (For this codebase: largest is 109K, so reltuples is fine.)

---

## 13. Reference: the source markdown to port

The implementing session MUST read `docs/architecture/TABLE-INVENTORY.md` (770 lines) in full before starting Phase 1. The critical-findings section at the top of that document is REQUIRED context for the gotcha fields on multiple tables.

Also required reading: `docs/architecture/DATABASE-ARCHITECTURE.md` (~200 lines) for the MAIN vs RAG mental model.

---

## 14. After it ships

Once this tool is live and verified:

1. Reduce `TABLE-INVENTORY.md` to a one-line redirect to the page. Keep the file for backward links.
2. Add a memory entry to `~/.claude/projects/-Users-meganharrison-Documents-alleato-pm/memory/MEMORY.md` directing future sessions to use the admin page instead of grepping for `.from("X")`.
3. Update `CLAUDE.md` "Reference Docs" section to add a pointer to the page.
4. Open follow-up tickets for the "Critical findings" in the inventory (e.g., `user_profiles` privilege gap) so they don't get lost.

This PRP itself can be archived to `docs/PRPs/database-inventory-tool/PRP-COMPLETED.md` after delivery.
