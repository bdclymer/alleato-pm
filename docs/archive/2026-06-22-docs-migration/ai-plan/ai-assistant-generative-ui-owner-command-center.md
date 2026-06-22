# AI Assistant Generative UI Owner Command Center

Last updated: 2026-05-11

## Purpose

The AI Assistant should become an owner command center, not a markdown-heavy chat surface. The default output for owner workflows is a reusable AI SDK data-part widget with actions. Markdown is only the narrative layer around the widget.

This plan is implementation-ready for the current stack:

- Chat route: `frontend/src/app/api/ai-assistant/chat/route.ts`
- Main handler: `frontend/src/lib/ai/chat-handler.ts`
- AI SDK widget payloads: `frontend/src/lib/ai/assistant-widgets.ts`
- Widget renderer: `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx`
- Chat render surface: `frontend/src/components/ai-assistant/chat-area.tsx`
- Welcome surface: `frontend/src/components/ai-assistant/welcome-screen.tsx`
- Existing AI SDK UI primitives: `frontend/src/components/ai-elements/*`

The AI SDK path should use persistent `data-assistant-widget` message parts for durable UI and transient `data-status` parts for progress/loading states. Do not create a parallel transport.

## Product Rule

Use markdown only for short synthesis, caveats, and conversational transitions.

Use generative UI whenever the answer contains:

- records
- tasks
- meetings
- decisions
- money
- dates
- owners
- risks
- source evidence
- editable draft content
- approval or confirmation
- next actions

Before rendering a plain answer, the handler should ask: "Would this be more useful as a widget?" If yes, emit a widget.

## Owner Workflow Loop

Every owner workflow should follow the same loop:

1. Scan: surface what needs attention.
2. Understand: show source-backed facts and context.
3. Decide: present options, recommendation, confidence, and data gaps.
4. Act: provide native buttons for safe next actions.
5. Remember: save decisions, preferences, and outcomes back into assistant memory or project intelligence.

## Visual Baseline

The UI should feel like Linear/Supabase-style operational software:

- compact, quiet, and dense
- clear hierarchy through spacing and typography
- row dividers over boxed nested cards
- tabs for multi-section packets
- icon buttons for common actions
- badges for source/status only when useful
- editable fields for draft and write-preview widgets
- evidence drawers for trust without clutter
- sticky action rail for complex packets

Avoid:

- long markdown walls
- decorative wrapper cards
- nested cards
- repeated CTAs
- generic recommendation lists
- unsupported creative copy
- actions without source context

## Existing Widget Foundation

Already available widget types:

- `draft_email`
- `create_task`
- `task_summary`
- `meeting_intelligence`
- `create_event`
- `project_action_preview`
- `decision_packet`
- `feature_request_packet`

Already available UI patterns:

- `WidgetShell` in `assistant-widget-renderer.tsx`
- editable email/task/event previews
- source evidence widget
- AI SDK `Tool`, `Confirmation`, `Message`, `Conversation`, `PromptInput`, and `Suggestion` primitives
- task feedback buttons
- `data-status` live progress updates

Important: do not replace the current AI SDK message-part system. Extend it.

## New Widget Catalog

### 1. `owner_snapshot`

Use when the user asks:

- "Give me the owner snapshot"
- "What is going on with this project?"
- "What changed since last week?"
- "What should Brandon look at first?"
- "Show project snapshot"

Primary data sources:

- `getProjectBriefingSnapshot`
- executive retrieval packet in `chat-handler.ts`
- source health metadata
- meeting intelligence
- financial tools when needed
- Acumatica tools when accounting data is requested

Payload shape:

```ts
export type OwnerSnapshotWidgetPayload = {
  type: "owner_snapshot";
  id: string;
  title: string;
  projectId: number;
  projectName: string;
  status: "on_track" | "watch" | "critical" | "unknown";
  asOf: string;
  summary: string;
  healthSignals: Array<{
    label: string;
    value: string;
    status: "good" | "watch" | "critical" | "neutral";
  }>;
  money: {
    contractValue?: string;
    committed?: string;
    exposure?: string;
    unbilledChanges?: string;
    marginSignal?: string;
  };
  schedule: {
    status: "on_track" | "watch" | "critical" | "unknown";
    blockers: string[];
    upcomingMilestones: string[];
  };
  risks: Array<{
    id?: string;
    title: string;
    severity: "low" | "medium" | "high" | "critical";
    reason: string;
    href?: string;
  }>;
  ownerActions: OwnerActionItem[];
  recentMovement: Array<{
    label: string;
    sourceType: "meeting" | "email" | "teams" | "document" | "project_record" | "accounting";
    date?: string;
    href?: string;
  }>;
  dataGaps: string[];
  sources: SourceEvidenceItem[];
};
```

Required actions:

- Create follow-up task
- Draft owner update
- Create change event from selected risk
- Open source timeline
- Save snapshot
- Ask CFO
- Ask COO

First implementation can make these actions prompt-backed through `onSubmit`. Later slices should convert high-frequency actions into direct tool-backed buttons.

### 2. `owner_action_queue`

Use when the user asks:

- "What needs my attention?"
- "Show owner tasks"
- "Show owner-blocked items"
- "What should Brandon do today?"
- "Show meeting follow-ups"

Primary data sources:

- `tasks`
- meeting-extracted action items
- `ai_insights`
- RFI/submittal/change-event open items
- source-specific RAG for Teams/email follow-ups

Payload shape:

```ts
export type OwnerActionQueueWidgetPayload = {
  type: "owner_action_queue";
  id: string;
  title: string;
  subtitle: string;
  totalCount: number;
  groups: Array<{
    id: string;
    title: string;
    priority: "now" | "next" | "watch";
    items: OwnerActionItem[];
  }>;
  emptyState?: string;
};

export type OwnerActionItem = {
  id: string;
  title: string;
  description?: string;
  projectId?: number | null;
  projectName?: string | null;
  ownerName?: string | null;
  dueDate?: string | null;
  priority: "low" | "normal" | "high" | "critical";
  sourceType?: "meeting" | "email" | "teams" | "task" | "rfi" | "submittal" | "change_event" | "risk";
  sourceTitle?: string | null;
  href?: string;
  recommendedAction: "review" | "assign" | "create_task" | "draft_message" | "create_rfi" | "create_change_event" | "save_insight";
  confidence: "low" | "medium" | "high";
};
```

Required actions:

- Create task
- Assign owner
- Draft follow-up message
- Mark reviewed
- Open source
- Save insight

### 3. `meeting_insights`

This supersedes or extends the existing `meeting_intelligence` widget when the user needs action-oriented meeting review.

Use when the user asks:

- "View meeting insights"
- "What decisions were made?"
- "What promises need follow-up?"
- "Prep me for the next OAC meeting"
- "Create tasks from this meeting"

Primary data sources:

- `getMeetingIntelligence`
- `getMeetingsByDate`
- `getMeetingDetails`
- `searchMeetingsByTopic`
- source-specific RAG over meeting chunks

Payload shape:

```ts
export type MeetingInsightsWidgetPayload = {
  type: "meeting_insights";
  id: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  projectId?: number | null;
  projectName?: string | null;
  metrics: {
    meetingCount: number;
    decisionCount: number;
    actionItemCount: number;
    riskCount: number;
    unresolvedQuestionCount: number;
  };
  decisions: MeetingInsightItem[];
  promises: MeetingInsightItem[];
  risks: MeetingInsightItem[];
  unresolvedQuestions: MeetingInsightItem[];
  suggestedTasks: OwnerActionItem[];
  sources: SourceEvidenceItem[];
};

export type MeetingInsightItem = {
  id: string;
  title: string;
  detail?: string;
  ownerName?: string | null;
  dueDate?: string | null;
  sourceTitle?: string | null;
  sourceHref?: string | null;
  confidence: "low" | "medium" | "high";
};
```

Required actions:

- Create tasks from selected items
- Create RFI from selected question
- Draft meeting recap
- Save decision
- Open transcript
- Send follow-up email draft

### 4. `risk_exposure_packet`

Use when the user asks:

- "Where are we exposed?"
- "What could cost us money?"
- "What risks should I care about?"
- "What approved changes are not billed?"
- "Where is margin eroding?"

Primary data sources:

- `getProjectRiskAnalysis`
- `getFinancialAnalysis`
- `getChangeOrderDetails`
- `getMarginAnalysis`
- `getForecastComparison`
- `getProjectBudgetSummary`
- Acumatica AP/AR/cash tools where relevant

Payload shape:

```ts
export type RiskExposurePacketWidgetPayload = {
  type: "risk_exposure_packet";
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  projectId?: number | null;
  projectName?: string | null;
  summary: string;
  estimatedImpact?: string;
  exposureType: "cost" | "schedule" | "contract" | "billing" | "vendor" | "quality" | "unknown";
  evidence: SourceEvidenceItem[];
  affectedRecords: Array<{
    label: string;
    recordType: string;
    href?: string;
  }>;
  options: Array<{
    label: string;
    tradeoff: string;
    recommended?: boolean;
  }>;
  nextActions: OwnerActionItem[];
  dataGaps: string[];
};
```

Required actions:

- Create change event
- Draft owner notice
- Create verification task
- Open affected record
- Save risk insight
- Ask CFO for financial impact

### 5. `financial_pulse`

Use when the user asks:

- "Show financial pulse"
- "How are we doing on money?"
- "What is cash/AR/AP?"
- "What changed in financials?"
- "Which project is hurting margin?"

Primary data sources:

- financial tools
- Acumatica tools
- budget snapshots
- direct costs
- commitments
- invoices

Payload shape:

```ts
export type FinancialPulseWidgetPayload = {
  type: "financial_pulse";
  id: string;
  title: string;
  subtitle: string;
  asOf: string;
  scope: "project" | "portfolio" | "company";
  projectId?: number | null;
  kpis: Array<{
    label: string;
    value: string;
    delta?: string;
    status: "good" | "watch" | "critical" | "neutral";
  }>;
  variances: Array<{
    label: string;
    actual: string;
    expected?: string;
    variance?: string;
    href?: string;
  }>;
  alerts: RiskExposurePacketWidgetPayload[];
  recommendedActions: OwnerActionItem[];
  sources: SourceEvidenceItem[];
};
```

Required actions:

- Open budget
- Open Acumatica source
- Draft billing follow-up
- Flag exposure
- Create task

### 6. `creative_draft`

Use when the user asks:

- "Draft a client update"
- "Turn this into a LinkedIn post"
- "Create a case study"
- "Write a difficult email"
- "Create proposal language"

Primary data sources:

- project snapshot packet
- meeting insights
- source-specific document/email/Teams search
- company knowledge
- project records

Payload shape:

```ts
export type CreativeDraftWidgetPayload = {
  type: "creative_draft";
  id: string;
  title: string;
  audience: "owner" | "client" | "subcontractor" | "internal" | "public" | "proposal";
  format: "email" | "linkedin" | "case_study" | "proposal_blurb" | "meeting_recap" | "memo";
  tone: "direct" | "polished" | "warm" | "firm" | "executive";
  sourceFacts: Array<{
    label: string;
    value: string;
    sourceHref?: string;
  }>;
  bannedClaims: string[];
  draftTitle?: string;
  draftBody: string;
  sourceCheck: {
    status: "source_backed" | "needs_review" | "unsupported";
    notes: string[];
  };
};
```

Required actions:

- Regenerate
- Make owner-facing
- Make client-safe
- Shorten
- Source-check
- Save draft
- Create email
- Copy

### 7. `source_evidence_drawer`

Use whenever a widget depends on sources.

Payload shape:

```ts
export type SourceEvidenceDrawerWidgetPayload = {
  type: "source_evidence_drawer";
  id: string;
  title: string;
  sources: SourceEvidenceItem[];
};

export type SourceEvidenceItem = {
  id: string;
  title: string;
  sourceType: "meeting" | "email" | "teams" | "document" | "project_record" | "accounting" | "knowledge";
  date?: string;
  snippet?: string;
  href?: string;
  confidence?: "low" | "medium" | "high";
};
```

Required actions:

- Open source
- Copy excerpt
- Create task from source
- Ask follow-up about source

### 8. `record_write_preview`

Use for every medium/high-risk create or update flow. This should eventually replace one-off action previews.

Payload shape:

```ts
export type RecordWritePreviewWidgetPayload = {
  type: "record_write_preview";
  id: string;
  title: string;
  safetyLevel: "medium" | "high";
  actionLabel: string;
  target: {
    table: string;
    recordType: "task" | "rfi" | "change_event" | "risk" | "email" | "project_status" | "budget" | "unknown";
    projectId?: number | null;
    existingRecordHref?: string;
  };
  fields: AssistantWidgetField[];
  sourceEvidence: SourceEvidenceItem[];
  validation: Array<{
    label: string;
    status: "pass" | "warning" | "fail";
    message: string;
  }>;
  confirmPrompt: string;
};
```

Required actions:

- Approve
- Edit
- Reject
- Run
- Open source

## Action Safety Model

| Level | Examples | UX |
| --- | --- | --- |
| Low | copy draft, save snapshot, mark reviewed | one-click |
| Medium | create task, save insight, assign owner | compact preview or quick confirm |
| High | create change event, update budget, send email, change project status | full `record_write_preview` with source evidence |

High-risk actions must never run directly from a markdown prompt.

## Shortcut Catalog

Add these to the assistant welcome screen as compact grouped prompt buttons. The welcome screen already accepts `onSelectPrompt`; implementation should render buttons there and pass the prompt back through that handler.

### Project Snapshot

- "Give me the owner snapshot for this project"
- "What changed since last week?"
- "What should Brandon look at first?"
- "Show risks, money, meetings, and owner actions"

Widget target: `owner_snapshot`

### Tasks

- "Show tasks created today"
- "Show owner-blocked tasks"
- "Show meeting tasks without owners"
- "Show overdue follow-ups"

Widget target: `owner_action_queue` or existing `task_summary`

### Meetings

- "View meeting insights from this week"
- "What decisions were made?"
- "What promises need follow-up?"
- "Prep me for the next owner meeting"

Widget target: `meeting_insights`

### Money And Risk

- "Where are we exposed?"
- "What approved changes are not billed?"
- "Where is margin eroding?"
- "What costs are not tied to owner revenue?"

Widget target: `risk_exposure_packet` or `financial_pulse`

### Creative Studio

- "Draft a client update from the project snapshot"
- "Turn recent project progress into a LinkedIn post"
- "Draft a difficult client email from the facts"
- "Create a case study outline"

Widget target: `creative_draft`

### Take Action

- "Create tasks from this meeting"
- "Draft RFIs from open questions"
- "Create change events from risks"
- "Save this as company knowledge"

Widget target: `record_write_preview`, `create_task`, or `project_action_preview`

## Handler Routing Rules

Add deterministic routing before model freeform response in `chat-handler.ts` for high-value packet intents.

Routing order:

1. Explicit shortcut intent.
2. Existing deterministic special cases such as generated tasks today and Brandon daily update.
3. Source-specific RAG requests.
4. Packet-worthy project/meeting/risk/money intent.
5. Existing AI SDK model/tool path.
6. Markdown fallback only if no packet fits.

Suggested intent values:

```ts
type AssistantPacketIntent =
  | "owner_snapshot"
  | "owner_action_queue"
  | "meeting_insights"
  | "risk_exposure_packet"
  | "financial_pulse"
  | "creative_draft"
  | "record_write_preview";
```

Each packet branch should:

1. Write a transient `data-status` part while loading.
2. Call the source tools/services.
3. Build a typed widget payload.
4. Write a persistent `data-assistant-widget` part.
5. Persist the data part into `chat_history.metadata.data_parts`.
6. Write a short markdown synthesis only after the widget.
7. Record `tool_trace`, `response_quality`, source health, and data gaps.

## Component Implementation Rules

Use AI SDK UI / existing AI Elements wherever possible:

- `Conversation`, `ConversationContent`, `ConversationScrollButton` for chat framing.
- `Message`, `MessageContent`, `MessageActions`, `MessageAction` for message actions.
- `PromptInput`, `PromptInputTextarea`, `PromptInputActions`, `PromptInputAction` for composer.
- `Suggestions` and `Suggestion` for follow-up chips.
- `Tool`, `ToolHeader`, `ToolContent`, `ToolInput`, `ToolOutput` for raw tool inspection.
- `Confirmation` primitives for approval flows.
- `Reasoning` and `ChainOfThought` only for diagnostics or explicit reasoning views, not default owner UI.

Use shadcn primitives for widget internals:

- `Tabs` for complex packet sections.
- `Button` / icon buttons for actions.
- `Badge` for compact source/status labels.
- `Input`, `Textarea`, `Select`, `Checkbox` for editable previews.
- `Accordion` or `Collapsible` for evidence/details.
- `Table` only for dense record lists.
- `Tooltip` for icon-only actions.

Do not use nested `Card` components inside widgets. Keep `WidgetShell` as the single localized component frame.

## First Implementation Slice

### Slice 1: Owner shortcut panel

Files:

- `frontend/src/components/ai-assistant/welcome-screen.tsx`
- Optional new file: `frontend/src/components/ai-assistant/assistant-shortcut-panel.tsx`

Acceptance:

- Welcome screen renders grouped owner shortcuts.
- Each shortcut calls `onSelectPrompt`.
- Layout is compact and responsive.
- No duplicate primary CTA.
- No nested cards.

### Slice 2: Widget type skeletons

Files:

- `frontend/src/lib/ai/assistant-widgets.ts`
- `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx`

Acceptance:

- Add payload types for `owner_snapshot`, `owner_action_queue`, `meeting_insights`, `risk_exposure_packet`, `financial_pulse`, `creative_draft`, `source_evidence_drawer`, and `record_write_preview`.
- Add placeholder renderers for the first three widgets.
- Extend `isAssistantWidgetPayload`.
- Keep types narrow and serializable.

### Slice 3: Owner snapshot route through chat handler

Files:

- `frontend/src/lib/ai/chat-handler.ts`
- `frontend/src/lib/ai/assistant-widgets.ts`
- `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx`

Acceptance:

- "Give me the owner snapshot for this project" emits `owner_snapshot`.
- Widget persists on reload through `metadata.data_parts`.
- The markdown response is short and action-oriented.
- The widget includes source/data-gap sections.
- Actions are prompt-backed at minimum.

### Slice 4: Meeting insights action widget

Acceptance:

- "View meeting insights from this week" emits `meeting_insights`.
- Decisions, promises, risks, questions, and suggested tasks are separate visual sections.
- Selected items can be converted into task/RFI preview prompts.

### Slice 5: Shared record write preview

Acceptance:

- Medium/high-risk actions route into `record_write_preview`.
- Create task, create RFI, and create change event flows use the same visual shell.
- Preview includes target table, editable fields, source evidence, validation, approve/edit/reject/run actions.

## Verification Plan

Targeted checks after each implementation slice:

```bash
cd frontend && npm run typecheck -- --pretty false
npm run check:routes
npm run test:unit -- --runInBand --runTestsByPath src/components/ai-assistant/__tests__/chat-area-formatting.test.ts
```

Browser verification:

```bash
npm run dev:frontend
agent-browser open http://localhost:3000/ai-assistant
agent-browser snapshot -i
```

Required visual checks:

- welcome shortcuts fit mobile and desktop
- widgets render without nested card noise
- actions are visible and do not wrap badly
- persisted widget reloads in the same conversation
- source/data-gap messaging is visible

Longer checks such as full build or full predeploy should be delegated to a cheaper verification sub-agent per `AGENTS.md`.

## Implementation Guardrails

- Do not create a second widget transport.
- Do not put owner workflows into markdown-only responses.
- Do not run high-risk writes without `record_write_preview`.
- Do not make page-local visual overrides when shared widget primitives can own the layout.
- Do not hide data gaps. Every packet should say what is missing.
- Do not make creative outputs without source facts and unsupported-claim warnings.
- Do not lose persistence. Persistent widgets must be saved through `chat_history.metadata.data_parts`.
