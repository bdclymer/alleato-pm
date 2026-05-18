# Handoff: Operational Intelligence Reports for AI Assistant

**Date:** 2026-05-15
**For:** A fresh Claude Code session
**Status:** Design approved in concept by user; needs verification + implementation

---

## STOP — Read this first

The previous session recommended writing this feature against a Supabase table called `company_knowledge`. **That table does not exist** — it was dropped. The code at `frontend/src/lib/ai/tools/...` literally has the comment `// company_knowledge table has been dropped`.

**Before you propose ANY architecture, verify what actually exists:**

1. Run `npm run db:types` in `frontend/`
2. Read `frontend/src/types/database.types.ts` for the actual current schema
3. Grep `frontend/src/lib/ai/tools/` to see what tools the assistant actually has wired up today
4. Read `docs/architecture/AI-RAG-ARCHITECTURE.md` and `docs/architecture/COMMUNICATIONS-DATA-PIPELINE.md` — these are the canonical AI architecture docs
5. Read `~/.claude/projects/-Users-meganharrison-Documents-alleato-pm/memory/MEMORY.md` — the user's project memory

If your design references any table, tool, or API route, you must have grepped for it first. No exceptions. The user has been burned repeatedly by AI sessions confidently recommending things that don't exist.

---

## What the user wants

A system where the AI assistant can answer questions like *"what's going on with accounting?"* with a response that combines (a) deep multi-month synthesis already pre-built, plus (b) today's live data — and where recurring issues are tracked over time so the user can see *"this AP bottleneck has appeared in 14 consecutive synthesis runs since March 3rd."*

**Source material that triggered this:** `docs/reports/2026-05-15-alleato-finance-accounting-analysis.md` — a one-shot Claude-generated report that the user found dramatically more useful than anything the AI assistant has produced. They want the assistant to be able to read reports like this and keep them current.

---

## User's stated requirements (verbatim intent)

1. **Pre-built synthesis per domain** — one report per project / business operation / department. AI identifies intent from question, pulls the relevant report, layers in today's data.
2. **Refresh multiple times per day** — not weekly. Brandon needs to ask a question and get current answers.
3. **Layered freshness** — start with the pre-built report, then pull today's emails / meeting transcripts / Teams messages / documents from `document_metadata` or RAG retrieval.
4. **Recurring issue tracking** — NOT git history. The user explicitly rejected "git history is your backlog." They want a queryable system showing what issues have been recurring, for how long, and whether they're resolved.
5. **CFO agent constraints must change** — current prompt says *"NEVER attribute statements to specific people unless the tool result explicitly contains that name"* and prevents qualitative editorial judgment. User said this is *"ridiculous and stupid"* — a CFO synthesizes patterns, flags red flags, makes judgments. Data-integrity rules should apply ONLY to financial figures (dollar amounts, percentages, dates, contract numbers), not to organizational/process observations.

---

## Proposed architecture (from previous session, NEEDS VERIFICATION before building)

### Two new tables

**`operational_intelligence`** — the synthesis cache:
- `domain` (e.g., `accounting`, `project-60`, `operations`)
- `report_markdown` — full synthesized report text
- `generated_at` — timestamp
- `is_current` — boolean (one active per domain)

**`intelligence_findings`** — recurring issue tracker:
- `finding_key` — stable slug (e.g., `ap-ceo-approval-bottleneck`)
- `domain`
- `title` / `description` / `category` / `severity`
- `status` — `open` / `watching` / `resolved`
- `first_seen_at` / `last_seen_at`
- `occurrence_count`
- `resolution_notes`

### Synthesis cron (Render, NOT GitHub Actions)

Per `MEMORY.md`, all backend scheduled jobs run on Render as Docker cron jobs. Add to `render.yaml`. Pattern to follow: existing `alleato-graph-sync` cron at `backend/src/services/integrations/microsoft_graph/sync.py`.

Pipeline per run:
1. Pull source material for the domain from past N hours (`document_chunks`, `outlook_email_intake`, Teams data — verify these table names exist)
2. Claude synthesis (use AI Gateway pattern from `frontend/src/lib/ai/providers.ts`)
3. Write to `operational_intelligence` (overwrite current)
4. Extract structured findings → match against existing `intelligence_findings` rows by key/embedding similarity → increment `occurrence_count` for recurring, insert new ones, mark resolved if absent for N runs

### AI assistant integration

When a question comes in:
1. Identify domain from question
2. Pull current `operational_intelligence` report (instant)
3. Pull today's raw data via existing RAG tools
4. Combine in response

Add a new tool — something like `getDomainIntelligence(domain)` — and wire it into the orchestrator at `frontend/src/lib/ai/orchestrator.ts`.

### CFO agent prompt changes

File: `frontend/src/lib/ai/providers.ts` (or wherever the CFO system prompt lives — grep for it).

Replace the blanket "NEVER attribute" rule with:
- **For financial figures** (dollars, percentages, dates, contract numbers, line items): cite the exact source, never invent.
- **For qualitative observations** (team behavior, process failures, recurring patterns, organizational dynamics): full editorial judgment encouraged. Attribution to specific people is allowed and expected when supported by tool results.
- **Default behavior on broad operational questions**: read the relevant `operational_intelligence` report FIRST, then layer in today's raw data.

---

## Critical rules the user has established (from CLAUDE.md and memory)

- **NEVER run `npm run typecheck`, `npm run quality`, or `npm run build` in the main thread.** Delegate to a background sub-agent.
- **Two Supabase projects.** Main app = `lgveqfnpkxvzbnnwuled`. RAG = `fqcvmfqldlewvbsuxdvz`. Operational intelligence is NOT RAG — it goes in the main app DB.
- **Work directly on `main`.** No feature branches, no PRs.
- **No `Co-Authored-By` in commits.** Breaks Vercel deployments.
- **Migration files** go in `supabase/migrations/`. Use the date prefix pattern from existing files.
- **Verify before recommending.** Before suggesting any architectural change, query the data, grep the code, check FKs both directions, check RLS. The user explicitly called out this discipline failure as the trigger for this entire conversation.

---

## What you should do first (before writing any code)

1. Verify the proposed architecture against current reality — confirm `document_chunks`, `outlook_email_intake`, `project_insights` etc. exist with the columns you'll need
2. Find the actual CFO system prompt (grep for `NEVER attribute` or `CFO`)
3. Find the actual orchestrator and tool registration pattern
4. Find the actual Render cron pattern in `render.yaml` and `backend/src/services/`
5. Report back to the user with: *"Here's what I verified, here's what I found that contradicts the proposal, here's my refined design."* Do NOT start building until the user approves the verified design.

---

## Source materials to read

- `docs/reports/2026-05-15-alleato-finance-accounting-analysis.md` — the example report
- `docs/architecture/AI-RAG-ARCHITECTURE.md`
- `docs/architecture/COMMUNICATIONS-DATA-PIPELINE.md`
- `frontend/src/lib/ai/orchestrator.ts`
- `frontend/src/lib/ai/providers.ts`
- `frontend/src/lib/ai/tools/` (all files)
- `render.yaml`
- `~/.claude/projects/-Users-meganharrison-Documents-alleato-pm/memory/MEMORY.md`
- `CLAUDE.md`
