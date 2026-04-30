# Alleato Agentic Tool Layer — Architecture & Roadmap

*For Megan Harrison — what exists, what's missing, and what to build next*
*Grounded in the actual codebase as of March 2026*

---

## The big picture

You had an "aha moment" about the difference between an AI that *knows* things
and an AI that *does* things. This document maps exactly where Alleato stands
on that spectrum — and what needs to happen to make it feel like a real team member.

The short version: **you're further along than you think.**
The AI already reads, analyzes, and synthesizes across your entire project portfolio.
What's missing is the *write* direction — the ability to create records,
update statuses, and take actions based on a conversation.

---

## What already exists (read this carefully — it's impressive)

### 1. The C-Suite orchestrator (`/lib/ai/orchestrator.ts`)

Your AI isn't a single chatbot. It's a **multi-agent system** where a Strategist
routes questions to domain specialists:

- **CFO** — financial analysis, contract values, cash position
- **COO** — operational health, schedule, RFIs, submittals
- **CRO** — client relationships, risks
- **CHRO** — team and people
- **VP BD** — business development

Each specialist has its own system prompt, its own tools, and up to 5 internal
tool-call steps before returning its analysis to the Strategist for synthesis.

### 2. The existing tool surface (`/lib/ai/tools/`)

Tools that already work (read/analyze):

| Tool file | What it can do |
|-----------|---------------|
| `project-tools.ts` | Portfolio overview, risk analysis, financial analysis, budget summary |
| `financial.ts` | Commitments, change orders, direct costs, budget trends, margin |
| `acumatica.ts` | Live AP/AR aging, cash position, vendor spend, purchase orders |
| `operational.ts` | People/roles, vendors, RFIs, submittals, cross-project comparison, semantic search, meeting/memory tools |
| `schedule-tools.ts` | Schedule health: overdue tasks, milestones at risk, critical path, % complete |
| `forecast-tools.ts` | Budget forecast vs actuals comparison per cost code |
| `app-help-tools.ts` | Help center article search and navigation action lookup |
| `web-search.ts` | External web search |
| `create-document.ts` | Document creation (partially built) |
| `update-document.ts` | Document updates (partially built) |

### 3. Memory system (`/lib/ai/services/`)

You have a real memory architecture:
- **Conversation memory** — summaries of past sessions embedded and retrieved
- **Typed memory extraction** — facts, preferences, lessons, commitments auto-extracted
- **Memory injection** — relevant memories injected into system prompt at session start

This is why the AI can feel like it "remembers" things across sessions. It actually does.

### 4. The `tool-calling` route (`/api/tool-calling/route.ts`)

A simpler route that currently only has `getTime` and `getCurrentDate`.
This is the scaffolding for adding new action tools quickly.

---

## What's missing — the write layer

Everything above is *read*. The AI can answer "what's the status of the
Vermillian change orders?" but it cannot yet *create* a change order
when you say "create a change order for the HVAC issue."

This is the gap. Here's exactly what needs to be built:


---

## The 15 action tools to build

Organized by priority — start at the top, work down.
Each tool = one Supabase write operation + one AI tool definition.

### Tier 1 — Core actions (build these first, highest daily value)

**1. `createChangeOrder`**
- Trigger: "Create a change order for [client] for [description]"
- What it does: Inserts into `prime_contract_change_orders`
- Needs: projectId, title, description, amount, status (defaults to "draft")
- Confirmation required: Yes — show preview before writing
- Already scaffolded: `/api/tool-calling/route.ts` — add it here

**2. `createChangeEvent`**
- Trigger: "Log a change event for [issue]"
- What it does: Inserts into `change_events`
- Needs: projectId, title, description, estimated_cost, source
- Confirmation required: Yes

**3. `updateProjectStatus`**
- Trigger: "Update [project] status to [status]" / "Mark [project] as at-risk"
- What it does: Updates `projects.health_status` and/or `projects.phase`
- Needs: projectId, field to update, new value
- Confirmation required: Yes

**4. `createRFI`**
- Trigger: "Create an RFI for [issue]"
- What it does: Inserts into `rfis`
- Needs: projectId, subject, question, ball_in_court, due_date
- Confirmation required: Yes

**5. `createTask`**
- Trigger: "Add a task for [assignee] to [description] by [date]"
- What it does: Inserts into `schedule_tasks` or `action_items`
- Needs: projectId, name, assignee, due_date, description
- Confirmation required: No (low stakes)

### Tier 2 — Document & communication actions

**6. `createMeetingNote`**
- Trigger: "Log notes from today's [client] meeting"
- What it does: Inserts into `document_metadata` with type=meeting
- Needs: projectId, title, date, summary, participants, action_items
- Note: Can pre-fill from context if meeting was recorded in Fireflies

**7. `createRisk`**
- Trigger: "Log a risk for [project] — [description]"
- What it does: Inserts into `risks`
- Needs: projectId, description, category, likelihood, impact, owner
- Confirmation required: Yes

**8. `updateBudgetLineItem`**
- Trigger: "Update the [line item] budget to [amount]"
- What it does: Updates `v_budget_lines` / underlying budget table
- Needs: projectId, lineItemId or description match, new amount
- Confirmation required: Yes — financial write, always confirm

**9. `createSubmittal`**
- Trigger: "Create a submittal for [spec section]"
- What it does: Inserts into `submittals`
- Needs: projectId, title, spec_section, due_date, submitted_by
- Confirmation required: No

**10. `updateRFIStatus`**
- Trigger: "Close RFI #[number]" / "Mark RFI [n] as answered"
- What it does: Updates `rfis.status` and optionally adds response
- Needs: rfiId or number + projectId, new status, optional response text
- Confirmation required: No

### Tier 3 — Intelligence & automation actions

**11. `generateProjectSummary`**
- Trigger: "Generate a status summary for [project]"
- What it does: Calls existing read tools, synthesizes, stores as document
- Needs: projectId, summary_type (weekly/monthly/milestone)
- Output: Creates a document + returns formatted summary

**12. `flagProjectRisk`**
- Trigger: "Flag [project] as at-risk because [reason]"
- What it does: Inserts into `ai_insights` with severity=high
- Needs: projectId, title, description, severity, insight_type
- Note: Already has an `ai_insights` table — just needs a write tool

**13. `scheduleFollowUp`**
- Trigger: "Remind me to follow up on [topic] in [n] days"
- What it does: Inserts into a reminders/tasks table
- Needs: userId, description, due_date, linked project/record
- Note: May need a new `reminders` table

**14. `createInvoiceDraft`**
- Trigger: "Draft an invoice for [project] for [period]"
- What it does: Reads contract + SOV data, creates invoice record
- Needs: projectId, billing_period, line_items (pre-filled from SOV)
- Confirmation required: Yes — financial

**15. `logDailyReport`**
- Trigger: "Log today's daily report for [project]"
- What it does: Inserts into `daily_log`
- Needs: projectId, date, weather, crew_count, work_performed, notes
- Confirmation required: No

