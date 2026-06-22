# PRP: Real-Time Financial Visibility
*Domain: accounting-automation | Priority: P0 | Stack: Next.js API + Python crons + Supabase + Resend*

---

## Goal

Build four automated financial visibility features that surface critical accounting state in real time — eliminating the conditions that caused a CEO bridge loan (operating account went negative undetected), 140 unsigned subcontracts accumulating invisibly, and retainage only being released when PMs emailed accounting directly.

**Deliverables:**
1. Unsigned Contract Alert — weekly digest of approved subcontracts missing a signed document
2. AP Aging Dashboard — live, always-current view of open subcontractor invoices by age bucket
3. Retainage Release Tracker — checklist surfaced automatically when a project reaches closeout
4. Cash Flow Alert — daily balance check with email+Teams alert when below configurable threshold

---

## Why

- **May 2026:** CEO personally wired $50K to cover a negative operating account — no alert had fired
- **May 2026:** 140 of 147 approved subcontracts had no signed document on file — discovered in a data audit, not a system alert
- **Recurring:** Retainage for S&M Painting ($957.50) was only processed because a PM emailed accounting. Without a PM email, it wouldn't have happened.
- **Recurring:** AP aging report is manually generated for the weekly accounting meeting. Between meetings, no one knows what's overdue.

These features don't add new data. They surface existing data that's already in the database and make it impossible to miss.

---

## What

### Feature 1: Unsigned Contract Alert
A Python cron runs every Monday 8am CT. It queries all subcontracts in `Approved` status with no signed document on file, created more than 14 days ago, and after the suppression cutoff date. It sends a grouped email digest (Resend) to Misty Rogers and Teams DM to the accounting channel listing every unsigned contract by project. A Next.js API route provides the same data for the UI filter.

**User-visible:** Filter on the subcontracts list page — "Show unsigned approved only."

### Feature 2: AP Aging Dashboard
A Next.js API route queries `subcontractor_invoices` and groups results into five age buckets (Current, 1-30, 31-60, 61-90, 90+) based on `billing_date`. A new page at `/[projectId]/accounting/ap-aging` (and a company-wide `/accounting/ap-aging` admin view) displays the results using `UnifiedTablePage` with auto-refresh every 15 minutes.

**User-visible:** Live table replacing the manually generated weekly report.

### Feature 3: Retainage Release Tracker
A Python cron runs every Monday 8am CT. It queries projects where `phase IN ('complete', 'Complete', 'Archive')` and calculates net unreleased retainage per subcontract. For each project with outstanding retainage, it emails Misty and the project PM with a per-sub checklist. A Next.js API route and project tab expose the same data in-app with PM approve/accounting mark-issued workflow.

**User-visible:** "Retainage" tab on the project detail view.

### Feature 4: Cash Flow Alert
A Python cron runs daily at 8am CT. It reads the most recent entry from `cash_balance_snapshots` (populated manually by Misty until QB migration is complete). If balance is below the threshold stored in `accounting_settings`, it sends an email (Resend) to Misty + Brandon and a Teams DM. A settings page at `/admin/accounting/settings` lets Misty configure the threshold without engineer involvement.

**User-visible:** Balance widget on the Alleato Finance project dashboard + settings page.

---

## All Needed Context

```yaml
# SCHEMA — verified against live REST API (2026-05-15)
tables:
  subcontracts:
    note: "App-level table. NOT in database.types.ts — use raw Supabase queries."
    source: "REST API verified"
    key_columns:
      id: uuid
      project_id: integer  # FK → projects.id
      contract_number: text
      title: text
      status: text  # values: Draft, Approved, Complete, void, cancelled, terminated
      executed: boolean  # true = signed contract on file
      signed_contract_received_date: date  # alternative signature confirmation
      default_retainage_percent: decimal
      created_at: timestamptz
      deleted_at: timestamptz  # soft delete — filter with IS NULL

  subcontractor_invoices:
    note: "In database.types.ts. 98.3% have acumatica_ap_bill_id — authoritative AP source."
    key_columns:
      id: uuid
      project_id: integer
      subcontract_id: uuid
      status: text  # values: draft, pending, under_review, approved, paid, not_invited, pending_owner_approval
      billing_date: date  # use for aging calculation
      is_retainage_release: boolean
      acumatica_ap_bill_id: text
      acumatica_ref_nbr: text
      acumatica_sync_at: timestamptz

  projects:
    note: "Main app projects table. state = geographic (e.g. Indiana). phase = lifecycle."
    closeout_condition: "phase IN ('complete', 'Complete', 'Archive')"
    key_columns:
      id: integer  # NOT uuid — integer FK used throughout
      name: text
      phase: text  # values: Current, Complete, complete, Archive, Estimating, Planning, Internal
      state: text  # GEOGRAPHIC — do not use for lifecycle
      archived: boolean
      project_manager: integer

  new_tables_needed:
    accounting_settings:
      columns:
        id: uuid (default gen_random_uuid())
        setting_key: text UNIQUE NOT NULL
        setting_value: jsonb NOT NULL
        updated_by: uuid (references auth.users)
        updated_at: timestamptz (default now())
      initial_rows: |
        INSERT INTO accounting_settings (setting_key, setting_value)
        VALUES
          ('cash_alert_threshold', '100000'),
          ('cash_alert_recipients', '["mrogers@alleatogroup.com","bclymer@alleatogroup.com"]'),
          ('unsigned_contract_suppression_cutoff', '"2026-05-15"'),
          ('unsigned_contract_grace_days', '14');

    cash_balance_snapshots:
      columns:
        id: uuid (default gen_random_uuid())
        balance: numeric NOT NULL
        entered_by: uuid (references auth.users)
        note: text
        created_at: timestamptz (default now())
      note: "Manual entry by Misty until QB migration. Most recent row = current balance."

# OPEN QUESTIONS — resolved
open_questions:
  OQ1_cash_threshold:
    status: "BLOCKING — encode before implementing Feature 4"
    question: "What dollar threshold triggers the cash alert?"
    answer: "TBD — must confirm with Misty Rogers. PRP uses $100,000 as placeholder."
    impact: "accounting_settings seed data and UI default"

  OQ2_closeout_trigger:
    status: RESOLVED
    question: "What field marks project closeout for retainage tracker?"
    answer: "projects.phase IN ('complete', 'Complete', 'Archive'). projects.state is geographic."

  OQ3_unsigned_suppression:
    status: RESOLVED
    question: "Should existing 140 unsigned contracts trigger on week 1?"
    answer: >
      No. Set suppression_cutoff = '2026-05-15' (go-live date). Only contracts
      created after that date get the 14-day grace period. Existing backlog is
      suppressed but still visible via UI filter.

  OQ4_ap_source:
    status: RESOLVED
    question: "Is subcontractor_invoices the authoritative AP source?"
    answer: >
      Yes. 983/1000 sampled rows have acumatica_ap_bill_id (98.3% sync rate).
      Only drafts and newly created invoices lack a ref — not a data reliability issue.

# PATTERNS — reference files
patterns:
  api_route_with_guardrails: "frontend/src/app/api/projects/[projectId]/subcontracts/route.ts"
  resend_email_send: "frontend/src/app/api/commitments/[commitmentId]/email/route.ts"
  unified_table_page: "frontend/src/app/(main)/[projectId]/commitments/page.tsx"
  table_config: "frontend/src/features/commitments/commitments-table-config.ts"
  python_cron_script: "backend/src/scripts/run_graph_sync_phase.py"
  render_yaml_cron: "render.yaml (alleato-acumatica-financial-sync block)"
  supabase_server_client: "frontend/src/lib/supabase/server.ts"
  api_client_fetch: "frontend/src/lib/api-client.ts"
  page_shell: "frontend/src/components/layout/PageShell.tsx"

# EXTERNAL INTEGRATIONS
integrations:
  resend:
    import: "const { Resend } = await import('resend')"
    init: "const resend = new Resend(process.env.RESEND_API_KEY)"
    from: "process.env.EMAIL_FROM_ADDRESS ?? 'Alleato <notifications@alleato.app>'"
  teams_dm:
    note: "Send via Microsoft Graph. Pattern in backend/src/services/agents/deep_project_intelligence.py"
    python_import: "from src.services.integrations.microsoft_graph.client import GraphClient"
  supabase_python:
    note: "Python crons use supabase-py client. See existing cron scripts for pattern."
    import: "from supabase import create_client"
    env: "SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY"

# CONSTRAINTS from CLAUDE.md and .claude/rules/
constraints:
  - "No raw fetch() in components — use apiFetch from @/lib/api-client"
  - "No raw fetch() to external URLs in API routes — use fetchWithGuardrails"
  - "Route params must be named [projectId] not [id]"
  - "All API routes must use withApiGuardrails wrapper"
  - "No <button> raw elements — use <Button> from @/components/ui/button"
  - "No hardcoded colors — semantic tokens only"
  - "Table pages: invoke alleato-table-page skill before writing any table JSX"
  - "New pages: use <PageShell variant='...'> not PageContainer + h1"
  - "Supabase server client: createClient from @/lib/supabase/server (inside handler, not module level)"
  - "Run npm run quality before commit — zero errors required"
  - "New API routes must be added to scripts/api-smoke-test.sh"
```

---

## Implementation Blueprint

> Execute tasks in order within each group. Groups 1-3 are independent and can be parallelized.

---

### Group A — Database Migrations (do first, all features depend)

**Task A1: Create accounting_settings migration**
```
CREATE: supabase/migrations/20260515_accounting_settings.sql
PATTERN: follow supabase/migrations/ existing files for header format

SQL:
CREATE TABLE accounting_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO accounting_settings (setting_key, setting_value) VALUES
  ('cash_alert_threshold', '100000'),
  ('cash_alert_recipients', '["mrogers@alleatogroup.com","bclymer@alleatogroup.com"]'),
  ('unsigned_contract_suppression_cutoff', '"2026-05-15"'),
  ('unsigned_contract_grace_days', '14');

-- RLS: Only admin role can read/write
ALTER TABLE accounting_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only" ON accounting_settings
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' IN (
    SELECT jsonb_array_elements_text(setting_value)
    FROM accounting_settings WHERE setting_key = 'cash_alert_recipients'
  ));
```
After applying: run `npm run db:types` from project root.

**Task A2: Create cash_balance_snapshots migration**
```
CREATE: supabase/migrations/20260515_cash_balance_snapshots.sql

SQL:
CREATE TABLE cash_balance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance numeric NOT NULL,
  note text,
  entered_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cash_balance_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_team_rw" ON cash_balance_snapshots
  FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@alleatogroup.com');
```

---

### Group B — Feature 1: Unsigned Contract Alert

**Task B1: Create Python alert script**
```
CREATE: backend/src/scripts/run_unsigned_contract_alert.py
PATTERN: follow backend/src/scripts/run_graph_sync_phase.py for structure

Logic:
1. Query supabase: subcontracts WHERE status = 'Approved'
     AND executed = false
     AND signed_contract_received_date IS NULL
     AND deleted_at IS NULL
     AND created_at > [suppression_cutoff from accounting_settings]
     AND created_at < NOW() - INTERVAL '[grace_days] days'
2. Group by project_id, join project name
3. If results exist: send Resend email + Teams DM
4. Log results to stdout (Render captures this)

Email format:
  Subject: "[Weekly] Unsigned Subcontracts Requiring Attention — {count} contracts"
  To: recipients from accounting_settings['cash_alert_recipients']
  Body: grouped table by project — contract_number | title | status | created_at
```

**Task B2: Add cron to render.yaml**
```
MODIFY: render.yaml
ADD after alleato-acumatica-financial-sync block:

  - type: cron
    name: alleato-unsigned-contract-alert
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    schedule: "0 13 * * 1"  # Monday 8am CT = 1pm UTC
    dockerCommand: >-
      python3 src/scripts/run_unsigned_contract_alert.py
    envVars:
      - key: PYTHONPATH
        value: /app
```

**Task B3: Create GET API route for UI filter**
```
CREATE: frontend/src/app/api/accounting/unsigned-contracts/route.ts
PATTERN: follow frontend/src/app/api/projects/[projectId]/subcontracts/route.ts

GET handler:
- Auth required (admin role)
- Query subcontracts WHERE status='Approved' AND executed=false
  AND signed_contract_received_date IS NULL AND deleted_at IS NULL
- Join projects for name
- Return { data: [...], count: number }

PATCH handler (mark as received):
- Body: { subcontract_id: string, method: 'executed' | 'date_received' | 'waived', reason?: string }
- Update subcontracts.executed = true OR signed_contract_received_date = today
```

**Task B4: Add filter to subcontracts list page**
```
MODIFY: frontend/src/features/[find existing subcontracts feature dir]/subcontracts-table-config.ts
ADD filter: { id: 'unsigned_approved', label: 'Unsigned (Approved)', ... }
ADD column badge: orange "Awaiting Signature" when executed=false AND status='Approved'
PATTERN: follow commitments-table-config.ts for filter/badge pattern
```

---

### Group C — Feature 2: AP Aging Dashboard

**Task C1: Create AP aging API route**
```
CREATE: frontend/src/app/api/projects/[projectId]/accounting/ap-aging/route.ts
PATTERN: follow frontend/src/app/api/projects/[projectId]/subcontracts/route.ts

GET handler logic:
  today = new Date()
  query subcontractor_invoices WHERE project_id = projectId
    AND status IN ('pending', 'under_review', 'approved')  -- not paid, not draft
    JOIN subcontracts for vendor/company info

  For each invoice, calculate days_outstanding = today - billing_date
  Bucket:
    current:  days_outstanding <= 0  (not yet due — use billing_date + 30 as due date estimate)
    bucket_1_30: 1-30 days
    bucket_31_60: 31-60 days
    bucket_61_90: 61-90 days
    bucket_90_plus: > 90 days
    no_date: billing_date IS NULL

  Return: { summary: {current, bucket_1_30, ...totals}, rows: [...per invoice] }

Also create:
  frontend/src/app/api/accounting/ap-aging/route.ts  (company-wide, admin only)
  — same logic but no project_id filter
```

**Task C2: Create useApAging hook**
```
CREATE: frontend/src/hooks/use-ap-aging.ts
PATTERN: follow frontend/src/hooks/use-subcontracts.ts

export function useApAging(projectId: number) {
  return useQuery({
    queryKey: ['ap-aging', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/accounting/ap-aging`),
    staleTime: 15 * 60 * 1000,  // 15 minutes
    refetchInterval: 15 * 60 * 1000,
  })
}
```

**Task C3: Create AP aging table config**
```
CREATE: frontend/src/features/accounting/ap-aging-table-config.ts
PATTERN: follow frontend/src/features/commitments/commitments-table-config.ts

Columns:
  vendor_name | project (company-wide view only) | invoice_number | billing_date
  | current | 1-30 | 31-60 | 61-90 | 90+ | total_outstanding | status

Row highlighting:
  - red background class: days_outstanding > 90
  - yellow background class: days_outstanding 60-90
```

**Task C4: Create AP aging page**
```
CREATE: frontend/src/app/(main)/[projectId]/accounting/ap-aging/page.tsx
PATTERN: follow frontend/src/app/(main)/[projectId]/commitments/page.tsx EXACTLY

export const dynamic = 'force-dynamic'

PageShell variant: "table"
Uses: UnifiedTablePage + useUnifiedTableState + useApAging hook
Invoke alleato-table-page skill before writing JSX

Header: title="AP Aging", subtitle="Live view — refreshes every 15 minutes"
Summary row at top: KpiRow showing totals per bucket (use <KpiBlock> from @/components/ds/kpi)
```

---

### Group D — Feature 3: Retainage Release Tracker

**Task D1: Create retainage API route**
```
CREATE: frontend/src/app/api/projects/[projectId]/accounting/retainage/route.ts
PATTERN: follow frontend/src/app/api/projects/[projectId]/subcontracts/route.ts

GET: Calculate per subcontract:
  retainage_held = SUM of (approved/paid invoices where is_retainage_release = false)
                   * subcontracts.default_retainage_percent / 100
  retainage_released = SUM of (invoices where is_retainage_release = true AND status IN approved/paid)
  net_outstanding = retainage_held - retainage_released

PATCH /api/projects/[projectId]/accounting/retainage/[subcontractId]/approve:
  Body: { approved: boolean }
  Creates a record in a new retainage_release_approvals table (Task D0)
  Sends notification to Misty via Resend

PATCH /api/projects/[projectId]/accounting/retainage/[subcontractId]/issue:
  Body: { check_number: string, check_issued_at: string }
  Updates retainage_release_approvals record
```

**Task D2: Create Python retainage cron**
```
CREATE: backend/src/scripts/run_retainage_digest.py
PATTERN: follow backend/src/scripts/run_unsigned_contract_alert.py

Logic:
1. Query projects WHERE phase IN ('complete', 'Complete', 'Archive') AND archived = false
2. For each project, calculate net retainage outstanding per subcontract (same formula as API)
3. If net_outstanding > 0: include in digest
4. Send one email per project to [project_manager email, mrogers@alleatogroup.com]
   Subject: "Retainage Release Needed — [Project Name]"
   Body: table of subs with outstanding amounts

Add to render.yaml schedule: "0 13 * * 1"  # Monday 8am CT, same as unsigned alert
```

**Task D3: Create retainage tab on project detail**
```
MODIFY: frontend/src/app/(main)/[projectId]/ [find existing project detail tabs file]
ADD tab: "Retainage"
CREATE: frontend/src/app/(main)/[projectId]/accounting/retainage/page.tsx

Content: checklist table per subcontractor
Columns: sub_name | contract_number | retainage_pct | held | released | outstanding
         | pm_approved | check_issued | check_number
Actions: PM can mark "Approved for release" | Accounting can mark "Check issued"
```

---

### Group E — Feature 4: Cash Flow Alert

**Task E1: Create Python cash alert script**
```
CREATE: backend/src/scripts/run_cash_flow_alert.py
PATTERN: follow backend/src/scripts/run_unsigned_contract_alert.py

Logic:
1. Read most recent cash_balance_snapshots row
2. If none: send alert "No balance recorded — please enter today's balance"
3. Read threshold from accounting_settings['cash_alert_threshold']
4. If balance < threshold:
   - Send Resend email to recipients list from accounting_settings
   - Send Teams DM to accounting channel
   - Subject: "⚠️ Operating Account Balance Alert — ${balance:,.0f}"
   - Body: current balance, threshold, days since last manual entry
5. Do NOT alert on weekends unless balance < threshold * 0.5 (critical level)

Add to render.yaml: schedule "0 13 * * 1-5"  # 8am CT weekdays only
```

**Task E2: Create balance snapshot API route**
```
CREATE: frontend/src/app/api/accounting/cash-balance/route.ts

GET: Return most recent cash_balance_snapshots row + alert status
  { balance, created_at, days_old, threshold, is_below_threshold, entered_by }

POST: Create new snapshot
  Body: { balance: number, note?: string }
  Auth: must be accounting team (check email domain @alleatogroup.com)
```

**Task E3: Create accounting settings page**
```
CREATE: frontend/src/app/(admin)/accounting/settings/page.tsx
PATTERN: follow any existing admin settings page

PageShell variant: "content"
Form fields:
  - Cash alert threshold (number input, default from accounting_settings)
  - Alert recipients (comma-separated emails)
  - Today's cash balance (number input → POST to /api/accounting/cash-balance)
  - Last balance entered: [timestamp + entered_by]

Uses React Hook Form + Zod validation
On submit: PATCH /api/accounting/settings
```

**Task E4: Create dashboard balance widget**
```
MODIFY: [find Alleato Finance project dashboard — project_id=60]
ADD: Cash balance KpiBlock showing:
  - Current balance (from useQuery → /api/accounting/cash-balance)
  - Color: green if above threshold, red if below
  - "Last updated X hours ago"
  - Link to settings page
PATTERN: use <KpiBlock> from @/components/ds/kpi
```

---

### Group F — Smoke Test Additions

**Task F1: Add all new routes to smoke test**
```
MODIFY: scripts/api-smoke-test.sh
ADD:
  curl_check "GET /api/accounting/unsigned-contracts" "$BASE_URL/api/accounting/unsigned-contracts"
  curl_check "GET /api/projects/67/accounting/ap-aging" "$BASE_URL/api/projects/67/accounting/ap-aging"
  curl_check "GET /api/projects/67/accounting/retainage" "$BASE_URL/api/projects/67/accounting/retainage"
  curl_check "GET /api/accounting/cash-balance" "$BASE_URL/api/accounting/cash-balance"
  curl_check "GET /api/accounting/settings" "$BASE_URL/api/accounting/settings"
```

---

## Validation Loop

Run these in sequence. Fix all errors before proceeding to the next level.

### Level 1 — Type Safety
```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run typecheck
# Must: zero errors. Common issues: subcontracts table not in types (use explicit type assertions)
```

### Level 2 — Lint
```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run lint
# Must: zero errors. Common violations:
#   - Raw fetch() instead of apiFetch
#   - Raw <button> instead of <Button>
#   - [id] route param instead of [projectId]
# Fix violations — do NOT add eslint-disable
```

### Level 3 — Quality Gate
```bash
cd /Users/meganharrison/Documents/alleato-pm
npm run quality
# Combined typecheck + lint. This is the pre-commit gate.
```

### Level 4 — API Smoke Test
```bash
# Dev server must be running: npm run dev
curl -s http://localhost:3000/api/accounting/unsigned-contracts | python3 -m json.tool | head -10
curl -s http://localhost:3000/api/projects/67/accounting/ap-aging | python3 -m json.tool | head -10
curl -s http://localhost:3000/api/projects/67/accounting/retainage | python3 -m json.tool | head -10
curl -s http://localhost:3000/api/accounting/cash-balance | python3 -m json.tool
# Must: all return 200 with { data: [...] } or { balance: ... } — not 500
```

### Level 5 — Browser Verification
```bash
# Use agent-browser. Credentials: TEST_USER_1 / TEST_PASSWORD_1 from .env
# Verify:
#   1. /[projectId]/accounting/ap-aging renders table with data, not blank
#   2. Unsigned contract filter on subcontracts list works
#   3. /[projectId]/accounting/retainage shows checklist for a closed project
#   4. /admin/accounting/settings form renders and submits without error
#   5. Cash balance widget appears on Alleato Finance project dashboard
```

### Level 6 — Cron Dry-Run Verification
```bash
cd /Users/meganharrison/Documents/alleato-pm/backend
python3 src/scripts/run_unsigned_contract_alert.py --dry-run
python3 src/scripts/run_retainage_digest.py --dry-run
python3 src/scripts/run_cash_flow_alert.py --dry-run
# Each script must support --dry-run flag: logs what WOULD be sent, doesn't send
# Check output includes: expected recipients, expected content, no Python exceptions
```

---

## Final Validation Checklist

### Database
- [ ] `accounting_settings` migration applied, seed data present
- [ ] `cash_balance_snapshots` migration applied
- [ ] `npm run db:types` run after migrations, no new type errors
- [ ] RLS policies verified: accounting team can read/write, public cannot

### Feature 1 — Unsigned Contracts
- [ ] Python script queries correctly (test with dry-run)
- [ ] Suppression cutoff working — old contracts excluded, new ones after 14 days included
- [ ] render.yaml cron added and validated YAML is parseable
- [ ] UI filter "Unsigned Approved" returns matching rows
- [ ] Orange badge appears on unsigned approved subcontracts in list

### Feature 2 — AP Aging
- [ ] API route returns correct buckets for project 67 (Vermillion Rise Warehouse)
- [ ] Age math is correct: `today - billing_date`, not `today - submitted_at`
- [ ] Summary KPI row shows correct totals
- [ ] Red highlighting appears on 90+ day rows
- [ ] Auto-refresh fires at 15-minute intervals (verify via network tab)
- [ ] Company-wide view (`/accounting/ap-aging`) requires admin role

### Feature 3 — Retainage
- [ ] Retainage calculation is correct: held minus already-released
- [ ] Only projects with `phase IN ('complete', 'Complete', 'Archive')` trigger
- [ ] PM approval action sends Resend notification to Misty
- [ ] Retainage tab visible on project detail for relevant projects

### Feature 4 — Cash Flow Alert
- [ ] Snapshot creation via settings page works end-to-end
- [ ] Alert fires when balance < threshold (verify with test snapshot below threshold)
- [ ] No alert fires on weekend if balance > 50% of threshold
- [ ] Teams DM and email both sent (verify in Resend dashboard)
- [ ] `days_old` on balance widget correctly shows staleness

### Quality
- [ ] All 5 new routes in scripts/api-smoke-test.sh
- [ ] `npm run quality` passes clean
- [ ] No `eslint-disable` comments added
- [ ] All cron scripts handle errors without crashing (try/except with logging)
- [ ] All cron scripts support `--dry-run` flag

---

## Confidence Score

**9/10** — All open questions resolved except OQ1 (cash threshold dollar value, non-blocking with $100K placeholder). Every table verified against live API. Every pattern file exists and is readable. Every cron follows the existing Docker pattern. The one gap: `retainage_release_approvals` table DDL not yet written (Task D1 depends on it — add migration Task D0 before D1).

*Ready for `/prp:prp-execute`*
