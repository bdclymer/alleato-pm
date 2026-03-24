# Alleato — Product Roadmap & Next Steps

> For: Claude Code (VS Code or Desktop)
> From: Claude.ai strategy session with Megan Harrison
> Date: March 23, 2026
> Purpose: Prioritized roadmap of everything to build next, with context and reasoning

---

## How to use this document

This is a living roadmap. Work top to bottom by priority tier.
Each item includes the "why" — read it before building so you understand
the intent, not just the implementation.

When you complete an item, mark it done and update WORKING_CONTEXT.md.

---

## 🔴 IMMEDIATE — Build these now

### 1. Subcontractor invoice & billing submission system

**Why this is urgent:** Subcontractors need to submit invoices and sign commitment
terms, and there's currently no system for this. Every week without it is manual
coordination overhead for Alleato Group.

**The key design insight (from Megan):**
The construction industry is NOT tech-savvy. Subcontractors hate new tools.
The less they have to do, the higher the adoption rate.
Do NOT build a full login portal if a simpler path exists.

**Recommended approach — two-tier system:**

Tier A (no login required): For invoice submission and line item updates,
send subcontractors a **magic link** to a pre-filled form scoped to their
commitment. They see only their line items, fill in quantities/amounts,
and submit. No account creation, no password, no learning curve.
This is essentially a public-facing page behind a UUID token — like
how DocuSign or Typeform work.

Tier B (for terms signing): Use a similar magic link approach for
commitment terms. Show the terms, collect a name + signature (typed or
drawn), timestamp it, store it. Does not require a full DocuSign integration
— can be done in-app with a canvas signature element.

**What to build:**
- `subcontractor_tokens` table — UUID token, commitment_id, expires_at, used_at
- `/sub/[token]` public route — shows commitment details + invoice form
- Token generation triggered when a commitment is created or terms are sent
- Email trigger that sends the magic link to the subcontractor's email
- Signature capture on terms page (typed name + timestamp at minimum)
- Store signed_at, signed_by, ip_address on commitment record
- Admin view showing submission status per subcontractor

**What NOT to build:**
- Full subcontractor account/login system (too much friction)
- A separate app or portal (keep it within Alleato's domain)

**Spreadsheet alternative (if magic link is too complex for v1):**
Generate a pre-formatted Excel file with validation rules per commitment
(locked headers, dropdown status options, formula-protected totals).
Subcontractor fills it in, emails it back or uploads it.
Less ideal but gets the job done immediately.

---

### 2. Nightly proactive intelligence scan

**Why this is urgent:** Right now the AI only responds when asked.
This feature makes it proactive — surfacing issues before anyone thinks to ask.
It changes the relationship with the tool from "assistant" to "team member."

**What it does:** Runs nightly via cron, scans the portfolio, and sends
alerts when thresholds are crossed or patterns are detected.

**What to build:**
- Cron job at `/api/cron/nightly-scan` (cron directory already exists)
- Scans: budget variance > 8% of original, open RFIs past due date,
  change orders pending > 14 days, projects with no meeting in 30 days,
  new AI insights flagged as high/critical since last scan
- Stores scan results in a new `proactive_alerts` table
- Sends a digest (email or in-app notification) to Megan
- Each alert links directly to the relevant record in Alleato

**Schema needed:**
```
proactive_alerts:
  id, project_id, alert_type, message, severity,
  linked_record_type, linked_record_id, sent_at, dismissed_at
```

**Trigger phrases the AI should recognize:**
"What did the nightly scan find?" / "Any alerts today?" / "What's at risk?"

---

### 3. RFI, RFQ, and submittal process — needs definition + implementation

**Why this is urgent:** These are core construction PM workflows. Megan noted
she doesn't fully understand how the RFI/RFQ/submittal process should work
in Alleato yet. This needs to be defined AND built.

**Plain English definitions (for context):**

RFI (Request for Information) — A subcontractor or GC has a question
about the drawings or specs that needs a formal answer from the architect
or engineer. It gets logged, assigned, tracked, and answered. Unanswered
RFIs cause delays and disputes.

RFQ (Request for Quote) — Alleato needs pricing from a subcontractor
or supplier for a specific scope. Gets logged, sent out, responses
tracked, and compared.

Submittal — Before a subcontractor installs something (steel, windows,
mechanical equipment), they submit shop drawings or product data for
the design team to review and approve. If it's not approved, it can't
be installed. Tracking submittals is critical to schedule.

**What's already in the DB:** rfis table, submittals table both exist.
The `createRFI` and `createSubmittal` action tools were built today.

**What's missing:**
- Clear workflow status progression per record type (who does what, when)
- Email/notification triggers at each stage (RFI submitted → architect notified, etc.)
- Dashboard view showing open RFIs by ball-in-court, overdue submittals
- AI tool: `getOpenRFIsByAssignee` — who's holding things up
- AI tool: `getSubmittalLog` — what's approved, pending, overdue

**Recommended first step:** Book a 30-min session with Megan to walk through
the actual field workflow before building the UI. The DB tables exist —
the process definition is what's needed first.

---

## 🟡 HIGH PRIORITY — Build after immediate items

### 4. Meeting → project update automation

**Why:** You already have Fireflies ingestion, embeddings, and action item
extraction. The output side is missing: after a meeting is ingested,
automatically draft a status update, flag new risks mentioned in the transcript,
and create tasks from action items — then ask for review before saving.

**What to build:**
- Trigger: new row inserted into `document_metadata` with type=meeting
- Pipeline: call AI with the transcript → extract risks, action items, decisions
- Output: draft `ai_insights` records (severity=medium, resolved=0),
  draft `schedule_tasks` for each action item
- Review UI: a simple "review meeting output" modal showing what the AI found,
  with approve/dismiss per item
- Only save approved items

**This closes the loop on the Fireflies pipeline — it currently ingests
but doesn't act on what it finds.**

---

### 5. Voice-in → action-out (mobile)

**Why:** Megan has ideas constantly and loses them. The ambient capture
pipeline was designed today (see MEMORY-SYSTEM.md for details). This extends
it specifically to Alleato actions — so a voice note can create a record.

**What to build:**
- Mobile-friendly voice input endpoint in the Alleato chat
- Press-and-hold to record, releases to transcribe via Whisper
- Transcription sent to the AI assistant as a message
- AI recognizes action intent and calls the appropriate action tool
- Example: "Create an RFI for the HVAC clearance issue on Vermillian,
  ball in court is the architect, due this Friday" → creates RFI record

**Dependencies:** Whisper API already available, action tools built today,
mobile viewport already designed for.

---

### 6. Predictive budget variance model

**Why:** Owners pay a premium for visibility into where their budget is going
before it gets there. This is a genuine competitive differentiator.

**What to build:**
- Query historical budget data across all completed/current projects
- Find the pattern: at what % completion do change orders typically spike?
  What types of change events most often become approved COs?
- For current projects: at the same stage, how did similar projects trend?
- Output: "Based on 8 comparable projects, budget is likely to grow 12-18%
  before completion. Current trajectory: 9% growth with 40% complete."
- Display as a range/confidence band in the project financial dashboard

**This is an analytics layer — no new data needed, just new queries + AI synthesis.**

---

## 🟢 FUTURE — High ceiling, longer horizon

### 7. Client-facing dashboard (scoped read-only + AI)

**Why:** Clients currently get updates through email or meetings. A real-time
dashboard where they can log in, see their project, and ask questions without
Alleato Group being in the loop is a huge value-add for owners.

**Design constraints:**
- Scoped: client sees ONLY their project data
- AI responses must be filtered: no internal notes, no margin data,
  no subcontractor pricing
- Read-only: no actions available to clients
- Language: AI responds in owner-appropriate language (not construction jargon)

**What to build:**
- Separate auth role: client (vs. admin, team member)
- RLS policies scoped to client's project_id
- `/client/[projectId]` route with simplified dashboard
- Scoped AI system prompt that strips internal context
- Optional: white-labeled subdomain per client

**This is a significant build — don't start until the immediate items are done.**

---

### 8. Agent-to-agent autonomous workflows

**Why:** Currently agents consult each other (Strategist → CFO). The next level
is agents that hand off tasks autonomously without user prompting.

**Example workflow:**
CFO detects budget variance > 10% →
automatically briefs COO on schedule implications →
COO flags the affected subcontractor commitment →
action tool creates an RFI and a risk record →
nightly scan picks it up and alerts Megan

**This requires:**
- Inter-agent message passing (not just consultation)
- Workflow state machine: what triggers what, in what order
- Guardrails: what requires human approval vs. runs autonomously
- Audit trail: every autonomous action logged with reasoning

**Not a near-term build — but the architecture is already heading here.**

---

### 9. Alleato as a platform (the bigger opportunity)

**Context:** The architecture being built here — multi-agent C-Suite,
Acumatica integration, Fireflies pipeline, action tools, subcontractor
portal — doesn't exist anywhere else at this sophistication level.

Procore costs $300-600/user/month and does not have AI anywhere close
to this. The `procore-crawls` directory in this project suggests the
competitive analysis has already been done.

**The question to eventually answer:** Is Alleato Group the client,
or are they the first customer of a product Megan could sell to
other construction firms?

This is a business question, not a technical one. But the technical
foundation is being built correctly for either path.

---

## Quick reference — all items by priority

| Priority | Item | Est. complexity |
|----------|------|----------------|
| 🔴 Now | Subcontractor invoice + billing + terms signing | Medium-High |
| 🔴 Now | Nightly proactive intelligence scan | Low-Medium |
| 🔴 Now | RFI/RFQ/submittal workflow definition + build | Medium |
| 🟡 High | Meeting → project update automation | Medium |
| 🟡 High | Voice-in → action-out (mobile) | Medium |
| 🟡 High | Predictive budget variance model | Medium |
| 🟢 Future | Client-facing dashboard | High |
| 🟢 Future | Agent-to-agent autonomous workflows | High |
| 🟢 Future | Alleato as a platform | Strategic |

---

## Related documents

- `HANDOFF.md` — what was built today, where files are, how to test
- `WORKING_CONTEXT.md` — current session state, what's in progress
- `CLAUDE.md` — your operating instructions for this codebase
- `docs/AGENTIC-TOOL-LAYER.md` — action tools detail
- `docs/MEMORY-SYSTEM.md` — memory system explanation
