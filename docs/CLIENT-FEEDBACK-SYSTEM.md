# Client Feedback System — Full Spec

> Written: March 23, 2026
> Status: Specced, not yet built
> Priority: High — needed before any client-facing features go live

---

## The core idea

Clients can annotate anything on their project pages. You review it in a
triage inbox and decide what happens next — assign to Claude Code, create
a GitHub issue, post to Slack, or just respond. Nothing goes to AI coding
automatically. You are the gatekeeper.

---

## Why this approach (the reasoning)

The instinct to build a full login portal for clients is correct for the
long term, but the instinct to control what reaches the AI coding layer
is even more important. A client clicking on a button and saying "make
this blue" could — if connected directly to an autonomous agent — trigger
a cascade of changes that breaks the schema or violates the design system.

The human-in-the-loop triage layer is what makes this safe to ship.

---

## System architecture — two distinct surfaces

### Surface 1: Client-facing annotation UI

What the client sees and uses. Must be:
- Extremely simple (one button, one text field, submit)
- Scoped to their project only — they cannot see other projects
- Mobile friendly — owners are often on their phone
- Shows their own submission history with status
- No jargon, no construction terminology in the UI language

**How it works:**
1. Client logs in (or uses magic link — see ROADMAP.md subcontractor section)
2. On any page, they see a subtle "Leave feedback" button
3. Click → small panel appears. Current page URL pre-filled.
4. They type their note. Optional: click an element to attach it.
5. Submit → saved to `client_feedback` table
6. They see a confirmation and their submission in "My feedback" list
7. When Megan responds or resolves it, they get a notification

### Surface 2: Internal triage inbox

What Megan (and team) sees. Linear-style list of all client feedback
across all projects. Must be:
- Scannable at a glance (project, client name, page, time, status)
- One-click actions to route items
- Status tracking (new → acknowledged → in progress → resolved)
- Threaded responses back to client
- Integration hooks to external tools

---

## Database schema

```sql
create table client_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- What and where
  project_id integer references projects(id) not null,
  page_url text not null,
  page_title text,
  comment text not null,
  screenshot_url text,
  element_selector text,
  element_label text,          -- human-readable: "Submit button", "Budget table"

  -- Who
  submitted_by uuid references auth.users(id),
  submitted_by_name text,      -- denormalized for display

  -- Status lifecycle
  status text default 'new'
    check (status in ('new', 'acknowledged', 'in_progress', 'resolved', 'dismissed')),
  acknowledged_at timestamptz,
  resolved_at timestamptz,

  -- Internal routing
  priority text default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid references auth.users(id),  -- internal team member
  internal_notes text,         -- private, not shown to client

  -- Response to client (shown in their feedback list)
  response text,
  responded_at timestamptz,
  responded_by uuid references auth.users(id),

  -- External integrations (populated when routed)
  github_issue_url text,
  linear_issue_url text,
  slack_thread_url text,
  sent_to_ai_at timestamptz,   -- when Megan pushed it to Claude Code
  ai_session_id text           -- which Claude Code session handled it
);

-- Index for inbox query (most common: all new items across projects)
create index client_feedback_status_idx on client_feedback(status, created_at desc);
create index client_feedback_project_idx on client_feedback(project_id, status);
```

---

## Files to build

### 1. Migration
`supabase/migrations/20260323200000_client_feedback.sql`
SQL above + RLS policies:
- Clients can INSERT their own feedback
- Clients can SELECT only their own feedback (project-scoped)
- Internal team (admin/member role) can SELECT/UPDATE all feedback
- Service role has full access (for notifications + integrations)

### 2. Client feedback button + panel
`frontend/src/components/client/feedback-button.tsx`

Floating button, renders only for client-role users.
Same concept as DevAnnotationOverlay but client-appropriate:
- No technical fields (no element selector shown to client)
- Simple text input + optional screenshot
- "My feedback" tab showing their history
- Status badges: New → We're on it → Done
- Language: "We'll review this shortly" not "acknowledged"

Add to the client-dashboard layout, NOT the main app layout.

### 3. Triage inbox page
`frontend/src/app/(main)/feedback/page.tsx`

Linear-style list view. Columns:
- Status indicator (colored dot)
- Project name
- Client name
- Comment preview (truncated)
- Page (route, linkable)
- Time ago
- Priority badge
- Action buttons: Respond | Route | Dismiss

Filters: All / New / In Progress / Resolved | by project | by priority
Sort: Newest first (default) | Priority | Project

### 4. Feedback detail panel (slide-over)
`frontend/src/components/feedback/feedback-detail.tsx`

Slide-over panel when clicking an item in the inbox. Shows:
- Full comment
- Screenshot (if captured)
- Page URL (clickable)
- Element info (if annotated)
- Response thread (visible to client)
- Internal notes (private)
- Action buttons (see routing section)

### 5. API routes
`frontend/src/app/api/feedback/route.ts` — POST (create), GET (list)
`frontend/src/app/api/feedback/[id]/route.ts` — GET, PATCH (update/respond)
`frontend/src/app/api/feedback/[id]/route.ts` — POST to route to integrations

### 6. AI action tool
Add `createFeedbackItem` and `resolveFeedbackItem` to action-tools.ts
so the AI assistant can reference and update feedback in conversation.

---

## Routing actions (what Megan can do from the inbox)

Each action is one click in the detail panel:

**Respond to client**
- Opens a text field
- Response saved to `client_feedback.response`
- Client sees it in their feedback list
- Status → 'resolved' (or 'acknowledged' if more work needed)

**Send to Claude Code**
- Sets `sent_to_ai_at` timestamp
- Creates a structured prompt: page URL + comment + screenshot URL + element info
- Copies prompt to clipboard (for now)
- Future: directly creates an Agentation annotation or Linear issue
- Status → 'in_progress'

**Create GitHub issue**
- Calls GitHub API with pre-filled title + body
- Stores `github_issue_url` on the record
- Status → 'in_progress'

**Post to Slack**
- Sends formatted message to a configured channel
- Stores `slack_thread_url`
- Status → 'acknowledged'

**Create Linear issue**
- Calls Linear API
- Stores `linear_issue_url`
- Status → 'in_progress'

**Dismiss**
- Soft-delete with optional reason
- Status → 'dismissed'
- Client sees "We reviewed this and won't be making changes" (generic)

---

## Notification system

**Client notifications (when their item is updated):**
- In-app: badge on "My feedback" button
- Email: "Update on your feedback for [project]" — simple, no details leaked

**Internal notifications (when new feedback arrives):**
- In-app: badge on triage inbox nav item
- Slack: post to internal channel (configurable)
- Email: digest (not per-item, too noisy)

---

## Integration setup needed (future config page)

A settings page at `/settings/integrations` where Megan configures:
- Slack webhook URL + channel for new feedback notifications
- GitHub repo to create issues in (+ personal access token)
- Linear API key + team ID
- Whether to auto-notify Slack on new feedback (yes/no)

---

## Client role and auth

Currently the app has `app_roles` table. Client users need:
- A `client` role that restricts access to their project(s) only
- RLS policies on all tables scoped to `project_id` for client role
- The client-dashboard route is the only route they should see
- All other routes redirect to their dashboard if role = client

This ties into the broader "client-facing dashboard" item in ROADMAP.md.
Build the feedback system first (it works without full client auth via
magic links), then build the full client auth/role system.

---

## Build order

1. Migration + RLS
2. API routes (POST + GET + PATCH)
3. Triage inbox page (Megan uses this immediately, even before client UI)
4. Client feedback button (scoped to client-dashboard layout)
5. Respond action (closes the loop with client)
6. Slack notification on new feedback
7. "Send to Claude Code" action (structured prompt copy)
8. GitHub / Linear integrations
9. Full client auth role + scoping

---

## Connection to Agentation

Agentation is the internal dev annotation tool (Megan → Claude Code).
Client feedback is the external annotation tool (Client → Megan → Claude Code).

They are complementary, not competing. The flow is:
```
Client annotates → Megan reviews in triage inbox → Megan pushes to Agentation → Claude Code fixes
```

Never:
```
Client annotates → Claude Code (too risky, no human review)
```
