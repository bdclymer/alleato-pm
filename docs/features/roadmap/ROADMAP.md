# Alleato — Product Roadmap & Next Steps

> For: Claude Code (VS Code or Desktop)
> From: Claude.ai strategy session with Megan Harrison
> Date: March 23, 2026
> Purpose: Prioritized roadmap of everything to build next, with context and reasoning

---

## How to use this document

Work top to bottom by priority tier. Each item includes the "why" — read it
before building so you understand the intent, not just the implementation.
When you complete an item, mark it done and update WORKING_CONTEXT.md.

---

## 🔵 IN PROGRESS — Currently being built

### 0. Integrated dev environment — in-app AI coding bridge

**Why this matters:** Right now there are three separate contexts: Claude.ai
chat (thinking), Claude Code in terminal (building), Alleato in browser
(testing). Every context switch kills momentum. This collapses them into one.

**What it does:**
Megan sees a floating "Report Issue" button on any page (dev mode only).
She clicks it, types a note ("markup dropdown still broken"), and submits.
The annotation is saved with the current URL, a screenshot, and element info.
Claude Code polls for new annotations, opens the page in agent-browser,
reads the relevant component, diagnoses the issue, and posts a reply —
visible back in the overlay without leaving the app.

**Files to build (being built now):**
- `supabase/migrations/20260323100000_dev_annotations.sql`
- `frontend/src/app/api/dev/annotate/route.ts`
- `frontend/src/components/dev/dev-annotation-overlay.tsx`
- `scripts/dev-bridge/watch-annotations.ts`

**Wire into root layout (dev only):**
```tsx
{process.env.NODE_ENV === 'development' && <DevAnnotationOverlay />}
```

**Future extensions once v1 works:**
- Liveblocks threads: Claude Code's cursor visible in real time on the page
- Element picker: click any element, auto-capture selector + component path
- Playwright failures auto-create annotations
- Voice note → Whisper → annotation (zero typing)

---

## 🔴 IMMEDIATE — Build these next

### 1. Client feedback system (triage inbox + client annotation UI)

**Full spec:** `docs/CLIENT-FEEDBACK-SYSTEM.md`

**Why this is urgent:** Before any client gets access to Alleato, there needs
to be a way for them to report issues and for you to manage them. Without this,
client feedback happens via text/email and gets lost.

**The key design decision:**
Clients annotate → Megan reviews in triage inbox → Megan decides what happens.
Nothing goes directly to AI coding. Megan is the gatekeeper. Always.

**Two surfaces to build:**

Client-facing: A subtle "Leave feedback" button on client-dashboard pages.
Simple text + optional screenshot. Shows their own submission history with
plain-language status (not jargon). Mobile friendly.

Internal triage inbox: Linear-style list at `/feedback`. All client feedback
across all projects. One-click actions: Respond / Send to Claude Code /
Create GitHub issue / Post to Slack / Create Linear issue / Dismiss.

**Build order (from spec):**
1. Migration (`supabase/migrations/20260323200000_client_feedback.sql`)
2. API routes (`/api/feedback/`)
3. Triage inbox page (useful to Megan immediately, before client UI)
4. Client feedback button (client-dashboard layout only)
5. Respond action + client notification
6. Slack notification on new feedback
7. "Send to Claude Code" structured prompt
8. GitHub / Linear integrations

**Connection to Agentation:**
Agentation = internal (Megan → Claude Code directly)
Client feedback = external (Client → Megan → Claude Code via triage)
These are complementary. Never connect client feedback directly to AI coding.

---

### 1. Subcontractor invoice & billing submission system

**Why this is urgent:** Subcontractors need to submit invoices and sign
commitment terms. There is no system for this. Every week without it is
manual coordination overhead for Alleato Group.

**The key design insight:**
The construction industry is NOT tech-savvy. Subcontractors hate new tools.
The less they have to do, the higher the adoption rate. Do NOT build a full
login portal — a magic link approach gets better adoption.

**Recommended approach — two-tier system:**

Tier A (no login): Send subcontractors a magic link scoped to their
commitment. They see only their line items, fill in amounts, and submit.
No account creation, no password, no learning curve. Works like DocuSign
or Typeform — public page behind a UUID token.

Tier B (terms signing): Same magic link. Show terms, collect name +
typed signature, timestamp it, store it. No DocuSign integration needed.

**What to build:**
- `subcontractor_tokens` table: uuid token, commitment_id, expires_at, used_at
- `/sub/[token]` public route: shows commitment + invoice form
- Token generation when commitment is created
- Email trigger with magic link
- Signature capture (typed name + timestamp minimum)
- Store signed_at, signed_by, ip_address on commitment record
- Admin view: submission status per subcontractor

**What NOT to build:**
- Full subcontractor login/account system (too much friction)
- Separate app or portal

---

### 2. Nightly proactive intelligence scan

**Why this is urgent:** The AI only responds when asked. This makes it
proactive — surfacing issues before anyone thinks to ask. It changes the
relationship from "assistant" to "team member."

**What to build:**
- Cron job at `/api/cron/nightly-scan` (cron dir exists)
- Scans: budget variance > 8%, RFIs past due, COs pending > 14 days,
  projects with no meeting in 30 days, new high/critical AI insights
- Stores results in `proactive_alerts` table
- Sends digest (email or in-app notification) with links to records

**Schema:**
```sql
create table proactive_alerts (
  id uuid primary key default gen_random_uuid(),
  project_id integer references projects(id),
  alert_type text not null,
  message text not null,
  severity text default 'medium',
  linked_record_type text,
  linked_record_id text,
  sent_at timestamptz default now(),
  dismissed_at timestamptz
);
```

---

### 3. RFI, RFQ, and submittal process — define then build

**Plain English definitions:**

RFI (Request for Information) — A question about drawings/specs that
needs a formal answer from the architect. Unanswered RFIs cause delays.

RFQ (Request for Quote) — Alleato needs pricing from a subcontractor.
Gets logged, sent out, responses tracked and compared.

Submittal — Before a subcontractor installs something, they submit shop
drawings for design team approval. Not approved = can't install.

**What's already in the DB:** rfis and submittals tables exist.
createRFI and createSubmittal action tools were built March 23.

**What's missing:**
- Workflow status progression (who does what, in what order)
- Email/notification triggers at each stage
- Dashboard: open RFIs by ball-in-court, overdue submittals by project
- AI tool: getOpenRFIsByAssignee — who's holding things up
- AI tool: getSubmittalLog — approved, pending, overdue

**Recommended first step:** Walk through the actual field workflow with
Megan before building the UI. The DB tables exist — the process needs
definition first.

---

## 🟡 HIGH PRIORITY — Build after immediate items

### 4. Meeting → project update automation

**Why:** Fireflies ingestion already works. What's missing is the output
side: after a meeting is ingested, automatically draft a status update,
flag new risks from the transcript, and create tasks from action items —
then ask for review before saving.

**What to build:**
- Trigger: new row in `document_metadata` with type=meeting
- Pipeline: AI reads transcript → extracts risks, action items, decisions
- Output: draft `ai_insights` (resolved=0) + draft `schedule_tasks`
- Review UI: modal showing AI findings with approve/dismiss per item
- Only save approved items — never auto-write without review

---

### 5. Voice-in → action-out (mobile)

**Why:** Megan loses ideas constantly due to capture friction. This lets
a voice note directly create an Alleato record while driving to a jobsite.

**What to build:**
- Mobile-friendly voice input in the chat (press-hold to record)
- Releases to transcribe via Whisper API
- AI recognizes action intent → calls the appropriate action tool
- "Create an RFI for the HVAC clearance issue, ball in court is the
  architect, due Friday" → creates the RFI record, done

---

### 6. Predictive budget variance model

**Why:** Owners pay a premium for forward-looking financial visibility.

**What to build:**
- Query historical budget data across completed/current projects
- Pattern: at what % complete do COs typically spike?
- For current projects: at same stage, how did similar projects trend?
- Output: "Based on 8 comparable projects, budget likely grows 12-18%
  before completion. Current trajectory: 9% at 40% complete."
- Display as confidence range in the financial dashboard

---

## 🟢 FUTURE — High ceiling, longer horizon

### 7. Client-facing dashboard (scoped read-only + AI)

Clients log in to see their project in real time and ask the AI questions
without Alleato Group being in the loop. Significant build — don't start
until immediate items are complete.

**Constraints:**
- Scoped: client sees ONLY their project
- AI filtered: no internal notes, no margin data, no subcontractor pricing
- Read-only: no actions for clients
- Language: owner-appropriate, not construction jargon

### 8. Agent-to-agent autonomous workflows

CFO detects budget variance → briefs COO on schedule impact → COO flags
subcontractor → action tool creates RFI + risk record → nightly scan alerts.

Architecture already heading here. Not a near-term build.

### 9. Alleato as a platform

The architecture being built — multi-agent C-Suite, Acumatica integration,
Fireflies pipeline, action tools, subcontractor portal — doesn't exist
anywhere else at this sophistication level. The procore-crawls directory
suggests the competitive analysis has been done. Whether Alleato Group is
the client or the first customer of a product Megan sells more broadly
is a business question — but the technical foundation handles either path.

---

## Priority quick reference

| Priority | Item | Complexity |
|----------|------|-----------|
| 🔵 Now | Dev bridge (disabled — Agentation handles this) | Done |
| 🔴 Now | **Client feedback system** (triage inbox + client UI) | Med-High |
| 🔴 Now | Subcontractor invoice + terms signing | Med-High |
| 🔴 Now | Nightly proactive scan | Low-Med |
| 🔴 Now | RFI/RFQ/submittal workflow | Med |
| 🟡 High | Meeting → project update automation | Med |
| 🟡 High | Voice-in → action-out | Med |
| 🟡 High | Predictive budget variance | Med |
| 🟢 Future | Client-facing dashboard (full auth + scoping) | High |
| 🟢 Future | Agent-to-agent workflows | High |
| 🟢 Future | Alleato as a platform | Strategic |

---

## Related documents

- `HANDOFF.md` — what was built March 23, file locations, how to test
- `WORKING_CONTEXT.md` — current session state, what's in progress
- `CLAUDE.md` — your operating instructions for this codebase
- `docs/AGENTIC-TOOL-LAYER.md` — action tools detail
- `docs/MEMORY-SYSTEM.md` — memory system explanation
