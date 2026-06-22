# Alleato — Claude Code Handoff Package

> For: Claude Code (VS Code or Desktop)
> From: Claude.ai chat session with Megan Harrison
> Date: March 23, 2026
> Purpose: Everything you need to pick up where this session left off

---

## Who you are and what you're doing

You are Claude Code, working inside the Alleato project for Megan Harrison (Megan Harrison LLC).
Alleato is an AI-powered project management platform for commercial construction firms.
Your job is to continue building it — specifically the agentic AI layer that was started today.

**Your first action:** Read `WORKING_CONTEXT.md` in this project root.
It contains the exact state of what was worked on, what was found, and what's next.
Do not explore the codebase from scratch — the answers are already there.

---

## What was built in this session (March 23, 2026)

### 1. Action tools — the AI write layer
**File:** `frontend/src/lib/ai/tools/action-tools.ts`

This is new. It gives the AI the ability to CREATE and UPDATE records,
not just read them. Before this, the AI could answer questions but couldn't
take actions. Now it can.

Tools implemented (all TypeScript-clean, verified):

| Tool | Table | Confirmation required |
|------|-------|-----------------------|
| createChangeOrder | prime_contract_change_orders | Yes |
| createChangeEvent | change_events | Yes |
| updateProjectStatus | projects | Yes |
| createRFI | rfis | Yes |
| createTask | schedule_tasks | No |
| flagProjectRisk | ai_insights | Yes |
| updateRFIStatus | rfis | No |
| createMeetingNote | document_metadata | No |
| createSubmittal | submittals | No |
| logDailyReport | daily_logs | No |

The confirmation pattern: tools with `confirmed: boolean` default to false.
The AI shows a preview and waits for the user to say "confirm" before writing.
This is intentional — never remove this safety pattern.

### 2. Orchestrator wiring
**File:** `frontend/src/lib/ai/orchestrator.ts`

Two changes were made:
- Line ~25: Added `import { createActionTools } from "@/lib/ai/tools/action-tools";`
- Line ~762: Added `const actionTools = createActionTools(userId, options as any);`
- Line ~768: Added `...actionTools,` to the return object

The action tools are now available to the Strategist agent in every conversation.

### 3. Memory system files
**Files created:**
- `WORKING_CONTEXT.md` — session scratchpad (read this every session, update at end)
- `docs/MEMORY-SYSTEM.md` — plain English explanation of the system
- `docs/AGENTIC-TOOL-LAYER.md` — action tools detail
- `ROADMAP.md` — full prioritized product roadmap (what to build next)

### 4. CLAUDE.md update
The existing `CLAUDE.md` was appended (not overwritten) with:
- The WORKING_CONTEXT protocol (read first, update last)
- A plain English explanation of how context windows and RAG work
- The two-layer memory system design

---

## What to do next (in order)

### Step 1 — Test the write layer (do this first)
Start the dev server and open the Alleato chat. Type:

> "Create a change order for [any project] — HVAC scope addition, $12,500, draft status"

Expected behavior:
1. AI calls `createChangeOrder` with `confirmed: false`
2. Shows a preview block with the fields it will write
3. Waits for user to say "confirm"
4. On confirm, calls the tool again with `confirmed: true`
5. Writes to `prime_contract_change_orders` and returns success message

If the preview doesn't appear, check that `action-tools.ts` is properly imported
in `orchestrator.ts` (see section above).

### Step 2 — Fix the financial markup dropdown (known open issue)
**What's broken:** Financial markup isn't displaying in the dropdown on prime contracts
**What's known:** Data is in the DB somewhere — exact column TBD
**How to start:**
1. Run `npm run db:types` to get fresh types
2. Search for "markup" in `database.types.ts` to find the column
3. Find the dropdown component (search codebase for "markup" or "MarkupDropdown")
4. Trace: DB query → hook → component → display

### Step 3 — Build Tier 3 tools (after Step 1 is verified)
See `docs/AGENTIC-TOOL-LAYER.md` for the full roadmap.
Priority tools:
- `generateProjectSummary` — synthesize + store a project status doc
- `scheduleFollowUp` — create a reminder record
- `createInvoiceDraft` — read SOV data, create invoice record

---

## Key schema facts (don't re-discover these)

These were found by reading the actual `database.types.ts` — verified correct:

| Table | Key facts |
|-------|-----------|
| `prime_contract_change_orders` | No description column. Uses `title`, `total_amount`, `status`, `contract_id` |
| `change_events` | Requires `number` (string), `scope`, `type`, `updated_at`. `id` is UUID auto-generated |
| `rfis` | `number` is integer, `id` is UUID. `question` required, not `description` |
| `submittals` | Column is `submittal_number` (NOT `number`), `specification_section` (NOT `spec_section`), `final_due_date` (NOT `due_date`), `revision: number` required |
| `daily_logs` | Table is `daily_logs` (plural). Columns: `log_date`, `project_id`, `weather_conditions` (Json). No `work_performed` column — extra data goes in `weather_conditions` Json |
| `document_metadata` | Insert requires `id: string` — must pass `crypto.randomUUID()` explicitly |
| `ai_insights` | `resolved` is integer (0/1), not boolean |

---

## Pre-existing TypeScript error (do NOT try to fix)

`orchestrator.ts` line ~517 — VP BD agent `createTools` union return type issue.
This existed before today's session. It does not affect runtime behavior.
The error count before and after our changes is the same.

---

## Architecture overview (what already exists)

This project has a sophisticated AI architecture. Don't rebuild what's already there.

### The C-Suite multi-agent system
`frontend/src/lib/ai/orchestrator.ts`

The Strategist receives all messages and routes to specialists:
- **CFO** — financial analysis, contracts, change orders, invoicing
- **COO** — schedule, RFIs, submittals, operational health
- **CRO** — client relationships, risks
- **CHRO** — team and people
- **VP BD** — business development

Each specialist has its own system prompt in `frontend/src/lib/ai/agents/`.

### The existing tool surface (READ-ONLY tools)
`frontend/src/lib/ai/tools/`

Already working before today:
- `project-tools.ts` — portfolio overview, risk analysis, financial analysis, budget summary
- `financial.ts` — commitments, COs, direct costs, budget trends, margin
- `acumatica.ts` — live AP/AR aging, cash position from ERP
- `operational.ts` — schedule, RFIs, submittals, semantic search
- `web-search.ts` — external research

Today we added:
- `action-tools.ts` — write layer (create/update records)

### Memory system
`frontend/src/lib/ai/services/`

Already working:
- Conversation memory — summaries embedded + retrieved across sessions
- Typed memory extraction — facts, preferences, lessons auto-extracted
- Memory injection — injected into system prompt at session start

### The chat route
`frontend/src/app/api/ai-assistant/chat/route.ts`

This is what the frontend calls. It calls `createStrategistTools()` from the orchestrator,
which now includes the action tools. No changes needed here.

---

## Dev commands

```bash
# Start dev server
npm run dev                    # Both frontend + backend
npm run dev:frontend           # Frontend only (localhost:3000)

# Before any database work
npm run db:types               # Regenerate types from live schema

# Quality checks
npm run quality                # typecheck + lint
npm run quality:fix            # with auto-fix

# Testing
npm run test                   # Playwright (headless)
npm run test:headed            # With browser visible
```

Test credentials (from `.env`):
- App login: `test1@mail.com` / `test12026!!!`
- Procore: `bclymer@alleatogroup.com` / `Clymer926!`

---

## File locations

| What | Where |
|------|-------|
| This handoff | `HANDOFF.md` (project root) |
| Session scratchpad | `WORKING_CONTEXT.md` (project root) |
| Your operating instructions | `CLAUDE.md` (project root) |
| Action tools (new) | `frontend/src/lib/ai/tools/action-tools.ts` |
| Orchestrator | `frontend/src/lib/ai/orchestrator.ts` |
| All AI tools | `frontend/src/lib/ai/tools/` |
| Agent prompts | `frontend/src/lib/ai/agents/` |
| Chat API route | `frontend/src/app/api/ai-assistant/chat/route.ts` |
| DB types | `frontend/src/types/database.types.ts` |
| Agentic roadmap | `docs/AGENTIC-TOOL-LAYER.md` |
| Memory system docs | `docs/MEMORY-SYSTEM.md` |

---

## What Megan cares about (context for working with her)

- She moves fast and has a lot of ideas. Don't slow her down with unnecessary questions.
- She forgets the "why" behind systems — always document reasoning, not just implementation.
- The WORKING_CONTEXT.md protocol exists because she was losing momentum to AI amnesia.
  Keep it updated — it's the most important file in the project for continuity.
- The confirmation pattern on write tools is non-negotiable. She needs to see previews
  before anything gets written to the database.
- When something is broken, find the root cause with evidence before touching code.
  Don't guess — read the actual schema, read the actual component.
- Update WORKING_CONTEXT.md before ending every session. No exceptions.
