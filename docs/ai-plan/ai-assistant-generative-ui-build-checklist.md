# AI Assistant Generative UI Build Checklist

Last updated: 2026-05-11

Use this checklist when starting implementation of `docs/ai-plan/ai-assistant-generative-ui-owner-command-center.md`.

## Implementation Order

### 1. Shortcut Panel

Goal: make the assistant front door action-oriented.

Files:

- `frontend/src/components/ai-assistant/welcome-screen.tsx`
- `frontend/src/components/ai-assistant/chat-area.tsx`
- Optional: `frontend/src/components/ai-assistant/assistant-shortcut-panel.tsx`

Tasks:

- Render grouped shortcut prompts in the welcome screen.
- Use existing `onSelectPrompt`.
- Keep groups compact: Project Snapshot, Tasks, Meetings, Money And Risk, Creative Studio, Take Action.
- Use lucide icons.
- Use buttons/chips, not decorative cards.
- Add tooltip text only for icon-only controls.

Definition of done:

- Clicking a shortcut starts a chat request.
- Mobile and desktop layouts have no text overlap.
- The composer remains visible and usable.

### 2. Widget Type Registry

Goal: make packet widgets first-class AI SDK data parts.

Files:

- `frontend/src/lib/ai/assistant-widgets.ts`
- `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx`

Tasks:

- Add these payload types:
  - `owner_snapshot`
  - `owner_action_queue`
  - `meeting_insights`
  - `risk_exposure_packet`
  - `financial_pulse`
  - `creative_draft`
  - `source_evidence_drawer`
  - `record_write_preview`
- Extend `AssistantWidgetKind`.
- Extend `AssistantWidgetPayload`.
- Extend `isAssistantWidgetPayload`.
- Add renderer registry entries.

Definition of done:

- Types compile.
- Unknown widget types fail closed and do not crash.
- Existing widgets still render.

### 3. Owner Snapshot Widget

Goal: establish the canonical packet UI.

Files:

- `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx`
- `frontend/src/lib/ai/assistant-widgets.ts`
- `frontend/src/lib/ai/chat-handler.ts`

Tasks:

- Add `OwnerSnapshotWidget`.
- Use `Tabs` for Overview, Money, Schedule, Risks, Actions, Sources.
- Include compact KPI rows for money and health.
- Show data gaps as explicit warnings.
- Include source rows with links when available.
- Include action rail:
  - Create follow-up task
  - Draft owner update
  - Create change event
  - Save snapshot
  - Ask CFO
  - Ask COO

Definition of done:

- Shortcut prompt emits `owner_snapshot`.
- Widget persists and reloads from chat history.
- Markdown summary is short and appears after the widget.

### 4. Owner Action Queue Widget

Goal: make "what needs attention" actionable.

Files:

- `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx`
- `frontend/src/lib/ai/assistant-widgets.ts`
- `frontend/src/lib/ai/chat-handler.ts`

Tasks:

- Add grouped priority sections: Now, Next, Watch.
- Each item shows project, owner, due date, source, confidence, and recommended action.
- Add actions:
  - Create task preview
  - Assign owner prompt
  - Draft follow-up
  - Mark reviewed
  - Open source

Definition of done:

- Owner-blocked and generated-task prompts return a widget, not only markdown.
- Action buttons generate useful follow-up prompts with the record context included.

### 5. Meeting Insights Widget

Goal: turn meetings into decisions and actions.

Files:

- `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx`
- `frontend/src/lib/ai/assistant-widgets.ts`
- `frontend/src/lib/ai/chat-handler.ts`
- Possibly `frontend/src/lib/ai/tools/project-tools.ts`

Tasks:

- Add sections for Decisions, Promises, Risks, Open Questions, Suggested Tasks, Sources.
- Add action buttons:
  - Create tasks from selected items
  - Create RFI from question
  - Draft meeting recap
  - Save decision
  - Open transcript

Definition of done:

- "View meeting insights from this week" returns the widget.
- Action buttons route to existing write-preview flow or prompt-backed action.

### 6. Record Write Preview

Goal: make action execution safe and consistent.

Files:

- `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx`
- `frontend/src/lib/ai/assistant-widgets.ts`
- `frontend/src/lib/ai/action-capabilities.ts`
- `frontend/src/lib/ai/tools/action-tools.ts`

Tasks:

- Add one shared `RecordWritePreviewWidget`.
- Show target table/record type.
- Show editable fields.
- Show validation pass/warning/fail rows.
- Show source evidence.
- Add Approve, Edit, Reject, Run actions.
- Route create task, RFI, and change event previews toward this shared widget.

Definition of done:

- No medium/high-risk action creates records directly from markdown.
- Existing create task/RFI/change event paths still work.

### 7. Creative Draft Widget

Goal: make creative tasks source-backed and editable.

Files:

- `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx`
- `frontend/src/lib/ai/assistant-widgets.ts`
- `frontend/src/lib/ai/chat-handler.ts`

Tasks:

- Add source facts panel.
- Add unsupported/banned claims panel.
- Add editable draft body.
- Add tone/audience/format metadata.
- Add source-check status.
- Add actions:
  - Regenerate
  - Make client-safe
  - Make owner-facing
  - Shorten
  - Source-check
  - Save draft
  - Create email
  - Copy

Definition of done:

- Creative prompts produce a draft widget instead of plain markdown.
- Unsupported claims are visible before the user can reuse the draft.

## Required Tests

At minimum:

- Unit test `isAssistantWidgetPayload` accepts new widget types.
- Unit test shortcut prompt list has unique labels and prompts.
- Unit test owner snapshot widget handles empty data gaps/sources.
- Component test or screenshot smoke for welcome screen and first widget.

## Required Manual Verification

Use `agent-browser` first for frontend verification.

Scenarios:

1. Open `/ai-assistant`.
2. Click "Give me the owner snapshot for this project".
3. Verify a widget renders, not a markdown-only answer.
4. Click "Create follow-up task".
5. Verify the assistant stages a task/write preview.
6. Reload the conversation.
7. Verify the widget persists.

Artifact expectation:

- screenshot before shortcut click
- screenshot after widget render
- screenshot after action preview
- `VERIFICATION_SUMMARY.md`

## Definition Of Done For The First Release

- The AI Assistant home screen has owner shortcuts.
- At least `owner_snapshot`, `owner_action_queue`, and `meeting_insights` render as real widgets.
- Widgets include action rails.
- Medium/high-risk actions go through preview.
- Widgets persist in chat history.
- Data gaps and source evidence are visible.
- Markdown is reduced to short synthesis and transitions.
