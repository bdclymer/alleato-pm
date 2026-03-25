# Alleato — Working Context

> Claude: Read this before touching anything. Update this before ending any session.
> Megan: This file is your project's short-term memory. Keep it current.

---

## Current focus

**Status:** Action tools verified + Tier 3 features built (generateProjectSummary + daily flagging cron)
**Last updated:** 2026-03-23
**Last worked on by:** Claude Code (VS Code session)

---

## Active task

Two major features completed this session. Ready for next steps:
1. Fix financial markup dropdown (prime contracts) — still open from handoff
2. Build remaining Tier 3 tools (scheduleFollowUp, createInvoiceDraft)
3. Test daily flagging cron in production after deploy

---

## What we know (accumulated findings)

### Action tools — write layer (`/lib/ai/tools/action-tools.ts`)
- **Status:** 11 tools total (10 original + generateProjectSummary), verified working in production chat UI ✅
- **Bug fixed:** `createTask` was inserting `notes` column that doesn't exist in `schedule_tasks`. Fixed by appending notes to task name.
- **Tools tested and verified:**
  - `createChangeOrder` — preview + confirm works. Created CO #1700 on project 67.
  - `createTask` — direct create (no confirmation). Task with due date verified in DB.
  - `createRFI` — preview + confirm works. Auto-numbered to RFI #2.
  - `generateProjectSummary` — pulls from 9 tables, synthesizes with LLM, stores in document_metadata. Tested on Vermillion Rise — produced comprehensive multi-section executive report with COO/CFO/CRO assessments.
- **Tools NOT yet tested (7 remaining):** createChangeEvent, updateProjectStatus, flagProjectRisk, updateRFIStatus, createMeetingNote, createSubmittal, logDailyReport
- **Observations:**
  - `createTask` silently drops `assignee` — no column exists in schedule_tasks
  - `createChangeOrder` never sets `prime_contract_id` — only sets `contract_id`
  - Chat input requires Enter key to submit (click alone doesn't work)
  - AI proactively suggests related next actions after each write

### generateProjectSummary (NEW — built this session)
- **File:** `frontend/src/lib/ai/tools/action-tools.ts` (added at end of createActionTools)
- **What it does:** Pulls budget_lines, prime_contract_financial_summary, schedule_tasks, rfis, prime_contract_change_orders, change_events, document_metadata (meetings), ai_insights — then synthesizes with gpt-4o-mini into an executive summary — then stores in document_metadata with type='project_summary'
- **Uses:** OpenAI via AI Gateway (same pattern as operational.ts), crypto.randomUUID() for document ID
- **Table:** `budget_lines` (not `v_budget_lines` — that view doesn't exist in generated types). Has `original_amount` but no `revised_budget` column.
- **TypeScript:** Queries are sequential (not Promise.all) to avoid TS2589 excessive type depth error

### Daily flagging cron (NEW — built this session)
- **File:** `frontend/src/app/api/cron/daily-flags/route.ts` (260 lines)
- **Schedule:** Daily at 6am UTC (configured in vercel.json)
- **What it checks:** 4 conditions per active project:
  1. Budget variance > 10% (via project_health_dashboard.budget_utilization)
  2. Past-due RFIs (open RFIs past due_date)
  3. Late schedule tasks (incomplete tasks past finish_date, milestones = critical)
  4. Stale change events (unresolved > 7 days)
- **Dedup:** Checks for existing unresolved insights with same project_id + insight_type today before inserting
- **Output:** Creates ai_insights records with severity, metadata, confidence_score=1.0
- **Auth:** Bearer CRON_SECRET (same pattern as decay-memories route)
- **vercel.json updated:** crons array added with both decay-memories and daily-flags

### Key schema facts (verified against database.types.ts)
- `schedule_tasks` has NO `notes` column
- `budget_lines` has `original_amount` but NO `revised_budget`
- `v_budget_lines` does NOT exist in generated types (used in some existing tools but may be a Supabase view not in the type gen)
- `submittals` uses `submittal_number` (not `number`), `specification_section` (not `spec_section`), `final_due_date` (not `due_date`), `revision: number` required
- `daily_logs` (plural) has only: `log_date`, `project_id`, `weather_conditions` (Json)
- `document_metadata` Insert requires `id: string` (UUID) — must pass `crypto.randomUUID()`
- `change_events` requires `number`, `scope`, `type`, `updated_at` fields
- `ai_insights.resolved` is integer (0/1), not boolean
- `project_health_dashboard` view has `budget_utilization` (pre-computed ratio)
- `project_risk_current` view has `aging_rfis`, `overdue_tasks`, `open_risks`, `critical_risks`

### Pre-existing TypeScript error (NOT from our work)
- `orchestrator.ts` line 517 — VP BD agent `createTools` union return type
- Existed before our changes, safe to ignore

### Financial markup dropdown (prime contracts)
- **Status:** Still open — not yet investigated
- **To do:** Find component, trace data flow from DB to display

---

## File map (locations we've confirmed)

| Thing | Location | Notes |
|-------|----------|-------|
| Database types | `frontend/src/types/database.types.ts` | Regenerate with `npm run db:types` before DB work |
| Action tools (11 total) | `frontend/src/lib/ai/tools/action-tools.ts` | Write layer + generateProjectSummary |
| Orchestrator | `frontend/src/lib/ai/orchestrator.ts` | Action tools wired at lines 25, 755, 770 |
| AI chat page | `frontend/src/app/(chat)/ai-assistant/page.tsx` | URL: /ai-assistant |
| Chat API route | `frontend/src/app/api/ai-assistant/chat/route.ts` | Calls createStrategistTools |
| Daily flags cron | `frontend/src/app/api/cron/daily-flags/route.ts` | 6am UTC daily |
| Decay memories cron | `frontend/src/app/api/cron/decay-memories/route.ts` | Sundays 4am UTC |
| Vercel config | `vercel.json` | crons array added |
| Supabase service client | `frontend/src/lib/supabase/service.ts` | Uses SUPABASE_SERVICE_ROLE_KEY, bypasses RLS |
| OpenAI helper | `frontend/src/lib/ai/tools/operational.ts` | getOpenAI() singleton, AI Gateway routing |
| Verification report | `verify-output/action-tools/report.md` | Full test report with screenshots |

---

## What's next

1. **Fix financial markup dropdown** — locate component, trace data flow from DB to display
2. **Build remaining Tier 3 tools** — scheduleFollowUp, createInvoiceDraft
3. **Deploy and test cron** — daily-flags needs CRON_SECRET env var set on Vercel
4. **Consider adding `assignee` column to `schedule_tasks`** — or remove the parameter from createTask
5. **Voice capture pipeline** — ambient recorder → Whisper → Supabase (designed but not built)

---

*This file is maintained by Claude Code and should be committed to the repo.*
*It is the single most important file for session continuity.*

### Dev bridge — in-app annotation overlay (built in Claude.ai chat session)
- **Status:** Fully built, DB table live, TypeScript clean ✅
- **Files:**
  - `supabase/migrations/20260323100000_dev_annotations.sql` — table created in DB ✅
  - `frontend/src/app/api/dev/annotate/route.ts` — POST/GET/PATCH endpoint
  - `frontend/src/components/dev/dev-annotation-overlay.tsx` — floating 🤖 UI
  - `scripts/dev-bridge/watch-annotations.ts` — terminal watcher for Claude Code
  - `layout.tsx` — overlay wired in (dev only), import added ✅
- **DB:** `dev_annotations` table live in production Supabase, types regenerated ✅
- **html2canvas:** Already in dependencies (^1.4.1)
- **To activate:**
  1. `npm run dev`
  2. `npx ts-node scripts/dev-bridge/watch-annotations.ts` (second terminal)
  3. 🤖 Dev Bridge button appears bottom-right
  4. Submit annotation → watcher prints it → Claude Code opens page in agent-browser and replies
