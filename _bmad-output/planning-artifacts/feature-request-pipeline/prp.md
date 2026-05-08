# PRP: Brandon-To-Claude Feature Request Pipeline

**Feature:** AIS stakeholder collaboration and implementation packet workflow  
**Deliverable:** Phase 1 request-packet system that turns Brandon's feature/functionality requests into durable, reviewable, implementation-ready work  
**Confidence Score:** 8/10

---

## Goal

### Feature Goal

Build an AIS assistant workflow that lets Brandon collaborate naturally while converting feature/functionality requests into structured packets that can become implementation plans, Linear issues, and Claude Code handoffs.

AIS owns stakeholder intake, clarification, packet creation, planning, and handoff generation. Linear owns work tracking. Claude Code/Codex owns implementation and verification. Supabase owns the durable request memory.

### Phase 1 Deliverable

Implement the request-packet foundation only:

- Persist feature requests in Supabase.
- Let AIS capture and update a feature request from chat.
- Generate acceptance criteria and implementation plans.
- Render request packets as persisted AIS widgets.
- Add durable request list/detail pages.
- Generate Claude Code handoff markdown.
- Block vague requests from being marked ready for build.

### Success Definition

Milestone 1 is complete when this works end to end:

1. Brandon asks AIS for a feature or workflow improvement.
2. AIS preserves the raw wording and creates a persisted request packet.
3. AIS asks only implementation-critical clarification questions.
4. AIS generates draft acceptance criteria and an implementation plan.
5. The request appears outside chat on a durable page.
6. AIS generates a Claude Code handoff markdown file.
7. The readiness gate blocks vague work from being marked ready for build.

---

## Why

### Business Value

Brandon's requests should not live only in chat, ad hoc notes, or disconnected issue text. The system needs a durable bridge from stakeholder intent to executable engineering work.

This creates:

- A single source of truth for what Brandon asked for.
- Clear acceptance criteria before implementation starts.
- A reusable implementation packet that Claude Code can execute.
- A review surface where Megan/Brandon can approve understanding before build.
- A better foundation for future Linear automation, Teams/email intake, and agent execution routing.

### Problems This Solves

1. **Vague tickets:** Claude Code receives unclear implementation prompts.
2. **Lost context:** Raw stakeholder wording gets summarized away.
3. **No readiness gate:** Ideas can become build work without scope, acceptance criteria, or verification.
4. **Duplicate requests:** Related asks from separate chats can become disconnected work.
5. **Chat-only artifacts:** Important plans disappear into conversation history instead of normal app navigation.
6. **Weak verification:** Generated handoffs may omit browser evidence, route checks, migration ledger proof, or quality gates.

---

## Scope

### In Scope For Phase 1

- Supabase schema for request packets, events, plans, and handoff metadata.
- Server/domain helpers for request creation, update, readiness scoring, plan storage, and handoff generation.
- AIS assistant tools:
  - `captureFeatureRequestPacket`
  - `updateFeatureRequestPacket`
  - `generateImplementationPlan`
  - `generateClaudeCodeHandoff`
  - `scoreFeatureRequestReadiness`
- Persisted assistant widget type:
  - `feature_request_packet`
- Durable app routes:
  - `/ai-assistant/feature-requests`
  - `/ai-assistant/feature-requests/[requestId]`
- A Brandon-style validation scenario.

### Out Of Scope For Phase 1

- Automatic Claude Code session launch.
- Full Teams/email/meeting-source ingestion.
- Fully automatic Linear issue creation.
- Brandon-specific external portal polish.
- Roadmap prioritization scoring.
- Closed-loop learning/outcome capture.

---

## Current Repo Context

### Existing Assistant Surfaces

Relevant files:

- `frontend/src/app/(main)/ai-assistant/page.tsx`
- `frontend/src/app/(main)/ai-assistant/layout.tsx`
- `frontend/src/app/api/ai-assistant/chat/route.ts`
- `frontend/src/app/api/ai-assistant/messages/[sessionId]/route.ts`
- `frontend/src/lib/ai/orchestrator.ts`
- `frontend/src/lib/ai/assistant-widgets.ts`
- `frontend/src/components/ai-assistant/chat-area.tsx`
- `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx`
- `frontend/src/lib/ai/tools/action-tools.ts`

The current assistant already supports persisted `data-assistant-widget` parts. `frontend/src/lib/ai/assistant-widgets.ts` defines widget payloads, and `frontend/src/app/api/ai-assistant/chat/route.ts` persists `metadata.data_parts` into `chat_history`. The implementation should extend that path instead of creating a local-only widget state.

### Existing Feedback Board Is Not Enough

The repo already has admin feedback/product-board behavior through `admin_feedback_items` and the `submitFeedback` tool in `frontend/src/lib/ai/tools/action-tools.ts`.

That system is useful for lightweight bug/feature submission, but it is not the right source of truth for Brandon-to-Claude execution because it lacks:

- packet readiness scoring,
- generated implementation plans,
- open-question gating,
- Claude Code handoff metadata,
- execution status transitions,
- stakeholder/internal packet split.

Phase 1 may optionally link to or reference feedback records later, but the implementation packet workflow should use dedicated tables.

---

## Database Schema

### Current Type Facts From `database.types.ts`

These FK type rules must be preserved:

- `projects.id` is `number`, so any `project_id` FK must be `INTEGER`.
- `people.id` is `string`, so any `person_id` FK must be `UUID`.
- `chat_history.id`, `chat_history.session_id`, and `chat_history.user_id` are `string` in TypeScript.
- `admin_feedback_items.project_id` is `number | null`.

Before implementation, regenerate Supabase types:

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
```

After creating and applying the migration, regenerate the types again.

### New Tables

#### `feature_requests`

```sql
CREATE TABLE feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_user_id UUID NULL,
  requester_person_id UUID NULL REFERENCES people(id),
  source TEXT NOT NULL DEFAULT 'ais_chat',
  project_id INTEGER NULL REFERENCES projects(id),
  company_id UUID NULL,

  request_type TEXT NOT NULL CHECK (
    request_type IN (
      'new_feature',
      'workflow_improvement',
      'bug',
      'report_dashboard',
      'automation',
      'ai_assistant_capability',
      'data_cleanup',
      'integration',
      'permission_admin'
    )
  ),

  raw_request TEXT NOT NULL,
  assistant_summary TEXT NOT NULL,
  stakeholder_problem TEXT NULL,
  desired_outcome TEXT NULL,

  affected_users JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_pages JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_workflows JSONB NOT NULL DEFAULT '[]'::jsonb,
  acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  open_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,

  readiness_goal_clarity TEXT NOT NULL DEFAULT 'low' CHECK (readiness_goal_clarity IN ('low', 'medium', 'high')),
  readiness_data_clarity TEXT NOT NULL DEFAULT 'low' CHECK (readiness_data_clarity IN ('low', 'medium', 'high')),
  readiness_ux_clarity TEXT NOT NULL DEFAULT 'low' CHECK (readiness_ux_clarity IN ('low', 'medium', 'high')),
  readiness_acceptance_status TEXT NOT NULL DEFAULT 'missing' CHECK (readiness_acceptance_status IN ('missing', 'partial', 'complete')),
  readiness_implementation_risk TEXT NOT NULL DEFAULT 'medium' CHECK (readiness_implementation_risk IN ('low', 'medium', 'high')),
  readiness_missing_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  ready_for_build BOOLEAN NOT NULL DEFAULT false,

  status TEXT NOT NULL DEFAULT 'captured' CHECK (
    status IN (
      'captured',
      'needs_clarification',
      'ready_for_planning',
      'plan_generated',
      'linear_drafted',
      'ready_for_build',
      'handoff_generated',
      'sent_to_claude_code',
      'in_progress',
      'ready_for_review',
      'accepted',
      'rejected'
    )
  ),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  linear_issue_id TEXT NULL,
  linear_issue_url TEXT NULL,
  linear_draft_body TEXT NULL,
  claude_handoff_path TEXT NULL,

  source_session_id UUID NULL,
  source_message_id UUID NULL,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Indexes:

```sql
CREATE INDEX idx_feature_requests_status ON feature_requests(status);
CREATE INDEX idx_feature_requests_project_id ON feature_requests(project_id);
CREATE INDEX idx_feature_requests_requester_name ON feature_requests(requester_name);
CREATE INDEX idx_feature_requests_request_type ON feature_requests(request_type);
CREATE INDEX idx_feature_requests_linear_issue_id ON feature_requests(linear_issue_id);
CREATE INDEX idx_feature_requests_updated_at ON feature_requests(updated_at DESC);
```

#### `feature_request_events`

```sql
CREATE TABLE feature_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feature_request_events_request ON feature_request_events(feature_request_id, created_at DESC);
```

#### `implementation_plans`

```sql
CREATE TABLE implementation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  summary TEXT NOT NULL,
  affected_routes JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_components JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  implementation_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  open_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_implementation_plans_request ON implementation_plans(feature_request_id, version DESC);
```

#### `execution_handoffs`

```sql
CREATE TABLE execution_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  implementation_plan_id UUID NULL REFERENCES implementation_plans(id) ON DELETE SET NULL,
  handoff_path TEXT NOT NULL,
  handoff_title TEXT NOT NULL,
  linear_issue_id TEXT NULL,
  validation_status TEXT NOT NULL DEFAULT 'draft' CHECK (validation_status IN ('draft', 'valid', 'blocked')),
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_execution_handoffs_request ON execution_handoffs(feature_request_id, created_at DESC);
```

### RLS Guidance

Use existing project/user permission helpers if available. Do not add permissive policies just to make the first UI work.

Minimum target behavior:

- Service-role assistant/server tools can create/update packets.
- Authenticated users can read packets for projects they can access.
- Internal/admin users can read all packets.
- Updates that mark `ready_for_build`, create handoffs, or alter Linear fields should be server-action/API controlled, not broad client updates.

---

## Product Model

### Request Types

```ts
type FeatureRequestType =
  | "new_feature"
  | "workflow_improvement"
  | "bug"
  | "report_dashboard"
  | "automation"
  | "ai_assistant_capability"
  | "data_cleanup"
  | "integration"
  | "permission_admin";
```

### Status Model

```ts
type FeatureRequestStatus =
  | "captured"
  | "needs_clarification"
  | "ready_for_planning"
  | "plan_generated"
  | "linear_drafted"
  | "ready_for_build"
  | "handoff_generated"
  | "sent_to_claude_code"
  | "in_progress"
  | "ready_for_review"
  | "accepted"
  | "rejected";
```

### Readiness Gate

A request cannot be marked `ready_for_build` unless:

- raw stakeholder request exists,
- AIS summary exists,
- desired outcome exists,
- affected workflow or page exists,
- acceptance criteria exist,
- verification steps exist,
- open implementation-critical questions are resolved or explicitly converted to assumptions,
- implementation plan exists,
- handoff exists or can be generated from the plan,
- Linear issue exists or a Linear draft body is attached.

When blocked, AIS must fail loudly with missing requirements:

```text
This is not ready for build yet.

Missing:
- affected workflow scope
- final acceptance criteria
- verification steps

Recommended next action:
Ask Brandon whether this should cover RFIs, submittals, invoices, commitments, change orders, or all open workflow blockers.
```

---

## Implementation Plan

### 1. Migration And Types

Create:

- `supabase/migrations/<timestamp>_create_feature_request_pipeline.sql`

Then run:

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_create_feature_request_pipeline.sql
```

Do not claim the database-backed work complete until the migration appears in the linked Supabase migration ledger.

### 2. Domain Service Layer

Create:

- `frontend/src/lib/feature-requests/types.ts`
- `frontend/src/lib/feature-requests/server.ts`
- `frontend/src/lib/feature-requests/readiness.ts`
- `frontend/src/lib/feature-requests/planning.ts`
- `frontend/src/lib/feature-requests/handoffs.ts`

Responsibilities:

- Normalize request packet input.
- Create/update packets through server-only helpers.
- Record `feature_request_events` for all meaningful transitions.
- Score readiness deterministically.
- Generate blocked-readiness messages.
- Store implementation plans separately from packets.
- Generate handoff markdown from the latest packet and implementation plan.

Do not put this logic directly into `chat/route.ts`.

### 3. AIS Assistant Tools

Add tools through the existing assistant tool stack, likely near `frontend/src/lib/ai/tools/action-tools.ts` or a new feature-request tool module imported into the orchestrator.

Tools:

- `findRelatedFeatureRequests`
- `captureFeatureRequestPacket`
- `updateFeatureRequestPacket`
- `scoreFeatureRequestReadiness`
- `generateImplementationPlan`
- `generateClaudeCodeHandoff`

Tool behavior:

- Preserve raw stakeholder wording.
- Prefer updating an existing related request over creating a duplicate.
- Ask only clarification questions that affect implementation.
- Never mark `ready_for_build` from a vague request.
- Return structured widget data, not only plain text.

### 4. Assistant Widget

Extend:

- `frontend/src/lib/ai/assistant-widgets.ts`
- `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx`
- `frontend/src/components/ai-assistant/chat-area.tsx` if needed
- `frontend/src/app/api/ai-assistant/chat/route.ts`

Add widget kind:

```ts
type FeatureRequestPacketWidgetPayload = {
  type: "feature_request_packet";
  id: string;
  title: string;
  requestId: string;
  status: FeatureRequestStatus;
  readinessLabel: string;
  readyForBuild: boolean;
  openQuestions: string[];
  acceptanceCriteriaCount: number;
  linearIssueUrl?: string | null;
  handoffPath?: string | null;
  detailHref: string;
};
```

The widget must persist through `chat_history.metadata.data_parts` and rehydrate after reload/conversation switch.

### 5. Durable Request Workspace

Create:

- `frontend/src/app/(main)/ai-assistant/feature-requests/page.tsx`
- `frontend/src/app/(main)/ai-assistant/feature-requests/[requestId]/page.tsx`
- `frontend/src/components/feature-requests/FeatureRequestList.tsx`
- `frontend/src/components/feature-requests/FeatureRequestDetail.tsx`
- `frontend/src/components/feature-requests/ReadinessBadge.tsx`
- `frontend/src/components/feature-requests/RequestTimeline.tsx`

List page shows:

- title,
- requester,
- project,
- request type,
- status,
- readiness,
- Linear link/draft state,
- last updated.

Detail page sections:

- stakeholder summary,
- original request,
- open questions,
- acceptance criteria,
- implementation plan,
- data/UX/risk notes,
- Linear issue/draft,
- Claude Code handoff,
- activity timeline.

Use the normal app shell and the repo's minimal UI baseline. Do not create a full-page bordered wrapper or nested cards. Prefer open sections, compact rows, quiet badges, and row dividers.

### 6. Handoff Generation

Generate markdown under:

- `docs/ops/handoffs/YYYY-MM-DD-S<session>-<topic>.md`

Minimum handoff content:

```md
# Claude Code Handoff: <title>

## Intake
Requester:
Source:
AIS request id:
Linear issue:

## Stakeholder Goal

## Current Understanding

## Acceptance Criteria
- [ ] ...

## Implementation Plan
1. ...

## Likely Files
- ...

## Data Requirements

## Verification Plan
- ...

## Open Questions / Assumptions

## Guardrails
- No silent failures.
- No generic errors.
- Use shared primitives.
- Run route checks if routes change.
- Verify migration ledger if schema changes.
- Attach browser evidence for frontend flows.
```

The generated handoff should also be recorded in `execution_handoffs` and linked back to `feature_requests.claude_handoff_path`.

---

## AIS Prompt Contract

Add this behavior to the assistant planning/system prompt where feature/functionality requests are handled:

```text
When Brandon or another stakeholder asks for a feature, workflow change,
automation, dashboard, report, AI capability, or implementation idea:

1. Detect whether this is build-request intent.
2. Create or update a Feature Request Packet.
3. Preserve the raw stakeholder wording.
4. Produce a plain-English stakeholder summary.
5. Identify missing implementation-critical details.
6. Ask the minimum necessary clarification questions.
7. Generate acceptance criteria when enough information exists.
8. Do not mark ready for build until readiness gates pass.
9. Prefer updating an existing related request over creating a duplicate.
10. Always produce a next action: clarify, plan, draft Linear issue, or generate handoff.
```

---

## Validation Scenario

Use this first real test prompt:

```text
Brandon wants a way to see which subcontractors are holding up a project, with enough detail to know whether the blocker is RFIs, submittals, invoices, commitments, change orders, or all of them.
```

Expected result:

- AIS captures the raw request.
- AIS classifies it as `report_dashboard` or `workflow_improvement`.
- AIS asks what workflows should count as blockers.
- AIS generates draft acceptance criteria.
- AIS blocks `ready_for_build` until scope is confirmed or explicitly assumed.
- Request appears on `/ai-assistant/feature-requests`.
- Detail page renders the full packet.
- Handoff markdown can be generated with open assumptions clearly listed.

---

## Known Pitfalls And Prevention

### Supabase FK Type Mismatch

**Risk:** Using UUID for `project_id` even though `projects.id` is INTEGER.  
**Prevention:** Regenerate and inspect `frontend/src/types/database.types.ts` before writing the migration.  
**Validation:** Confirm `feature_requests.project_id INTEGER REFERENCES projects(id)`.

### Migration File Alone Is Not Completion

**Risk:** Creating a migration locally but never applying it to linked Supabase.  
**Prevention:** Run the repo migration verification command for the exact migration file.  
**Validation:**

```bash
npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_create_feature_request_pipeline.sql
```

### Widget Disappears After Reload

**Risk:** Widget is rendered live but not persisted into `chat_history.metadata.data_parts`.  
**Prevention:** Use the existing `data-assistant-widget` persistence path.  
**Validation:** Reload or switch conversation and confirm the widget rehydrates.

### Vague Requests Become Build Work

**Risk:** AIS marks a request ready without acceptance criteria or verification steps.  
**Prevention:** Centralize readiness scoring in `frontend/src/lib/feature-requests/readiness.ts`; do not let chat route manually set ready states.  
**Validation:** The Brandon bottleneck scenario must remain blocked until workflow scope is clarified or assumed.

### One-Off UI Drift

**Risk:** Request pages become decorative dashboards or nested-card layouts.  
**Prevention:** Use the app shell and existing minimal section patterns. Cards are allowed only for true repeated records or localized modules.  
**Validation:** Review request pages against the Premium Minimal UI baseline in `AGENTS.md`.

### Existing Feedback Tool Confusion

**Risk:** Implementation tries to force request packets into `admin_feedback_items`.  
**Prevention:** Keep feedback board as lightweight intake/tracking only. Use dedicated packet/planning/handoff tables for this workflow.  
**Validation:** Request detail page reads from `feature_requests`, not `admin_feedback_items`.

---

## Verification Plan

Targeted verification:

```bash
npm run check:routes
npm run quality --prefix frontend
```

Database verification:

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_create_feature_request_pipeline.sql
```

Browser verification:

```bash
npm run verify:browser
```

Required evidence:

- Feature request captured from AIS chat.
- `feature_requests` row exists.
- Request visible on `/ai-assistant/feature-requests`.
- Detail page renders packet sections.
- Widget persists after reload/conversation switch.
- Handoff markdown exists under `docs/ops/handoffs/`.
- Readiness gate blocks the Brandon bottleneck scenario until scope is clarified.

For long-running full quality/build checks, delegate to a cheaper verification sub-agent and keep the main implementation thread focused on targeted fixes.

---

## Acceptance Criteria

- [ ] Brandon-style feature/functionality request can be captured from AIS chat.
- [ ] Raw request wording is preserved separately from AIS summary.
- [ ] Request packet is persisted in Supabase.
- [ ] Related request search prevents obvious duplicates.
- [ ] AIS asks implementation-critical clarification questions.
- [ ] Readiness scoring stores missing requirements.
- [ ] Request cannot be marked `ready_for_build` without required fields.
- [ ] Implementation plan is generated and persisted separately.
- [ ] Request appears on `/ai-assistant/feature-requests`.
- [ ] Detail page shows the full stakeholder/internal packet.
- [ ] `feature_request_packet` widget persists through `data_parts`.
- [ ] Claude Code handoff markdown is generated and linked to the packet.
- [ ] Verification commands and browser evidence are recorded before completion.

---

## Recommended Follow-Up Milestones

Phase 2:

- Draft/create Linear issues from packets.
- Create Linear sub-issues from broad implementation plans.
- Sync Linear status and comments back to the packet.

Phase 3:

- Add Brandon-facing request review/approval portal.

Phase 4:

- Add closed-loop outcome learning and rework reason capture.

Phase 5:

- Add prioritization/roadmap intelligence.

Phase 6:

- Add Teams/email/meeting intake as draft request sources.

Phase 7:

- Add request-to-agent execution queueing only after packet and handoff quality is proven.
