# AI Feature Implementation Audit

Created: 2026-06-25
Owner: Product and AI Platform
Status: Planning source of truth
Related issues: AAI-644, AAI-646, AAI-658

## Purpose

This audit grounds the AI access plan in the current codebase. It separates what
is already implemented, what is partially implemented or readiness-gated, and
what is still a product gap. The goal is to make existing AI features easier to
find and safer to use without creating decision fatigue.

## Recommendation

Use this implementation order:

1. Ship a visible AI command center action catalog backed by the existing action
   and tool registries.
2. Add a shared suggestion resolver that powers page actions, the global widget,
   and onboarding prompts from the same source.
3. Add the shared approval review and ledger for AI-created previews before
   expanding write actions.
4. Add the AI Profile surface so the assistant can show what it knows about the
   user and why it is making suggestions.
5. Route notifications through one shared notification router after actions have
   clear ownership and approval states.
6. Add assistant-led onboarding tours only after the action catalog and
   suggestion resolver exist.

This is the best path because the app already has many powerful AI tools, but
the product layer is still fragmented. The fastest UX win is not more AI logic;
it is making the existing logic visible, contextual, and approval-safe.

## Code Evidence Reviewed

| Area | Evidence |
| --- | --- |
| Assistant runtime | `frontend/src/app/api/ai-assistant/chat/route.ts`, `frontend/src/app/api/ai-assistant/chat/handler-v2.ts`, `frontend/src/components/ai-assistant/rag-chat-page.tsx`, `frontend/src/components/ai-assistant/widget-ai-chat.tsx` |
| Global widget | `frontend/src/components/ai-assistant/global-ai-widget.tsx`, `frontend/src/app/root-client-widgets.tsx` |
| Tool registry | `frontend/src/lib/ai/tool-registry.ts`, `frontend/src/lib/ai/action-capabilities.ts` |
| Write/action tools | `frontend/src/lib/ai/tools/action-tools.ts`, `frontend/src/lib/ai/tools/outbound-action-policy.ts`, `frontend/src/lib/ai/tools/guardrails.ts` |
| Source/RAG tools | `frontend/src/lib/ai/tools/operational.ts`, `frontend/src/lib/ai/tools/project-tools.ts`, `frontend/src/lib/ai/retrieval/**` |
| Progress reports | `frontend/src/lib/ai/tools/progress-report-tools.ts`, `frontend/src/app/api/projects/[projectId]/progress-reports/[reportId]/ai-generate/route.ts` |
| Submittal/document intelligence | `frontend/src/lib/ai/tools/document-intelligence.ts`, `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/ai-review/route.ts` |
| Memories/profile inputs | `frontend/src/lib/ai/services/ai-memory-service.ts`, `frontend/src/lib/ai/services/memory-extraction.ts`, `frontend/src/app/api/ai-assistant/memories/**` |
| Learning/teach flows | `frontend/src/lib/ai/services/teach-alleato-intake-service.ts`, `frontend/src/app/api/ai-assistant/teach/route.ts`, `frontend/src/app/api/admin/ai-learning-promotions/**` |
| Notifications/delivery | `frontend/src/hooks/use-collaboration-notifications.ts`, `frontend/src/app/api/collaboration/notifications/route.ts`, `frontend/src/app/api/bot/teams/notify/route.ts`, `frontend/src/app/api/executive/daily-brief/send-teams/route.ts` |
| Feedback/evaluation | `frontend/src/app/api/ai-assistant/feedback/route.ts`, `frontend/src/app/api/ai-assistant/task-feedback/route.ts`, `frontend/src/lib/ai/langfuse-feedback.ts`, `frontend/src/components/ai/TaskFeedbackButtons.tsx` |

## Status Definitions

| Status | Meaning |
| --- | --- |
| Implemented, needs UX access | Code exists and should be promoted through command center/widget/page actions after targeted verification. |
| Implemented, high-risk | Code exists but must stay behind explicit preview/approval/ledger UX. |
| Partial/readiness-gated | Useful code exists, but prerequisites, source readiness, permissions, or UI flow are incomplete. |
| Internal/admin only | Useful for operations, but not a general user-facing AI capability yet. |
| Product gap | Needed for the intended UX, but no complete product layer exists yet. |

## Implemented Capabilities That Need Better Access

| Capability | Status | Current access | UX problem | Recommended access | Notification stance |
| --- | --- | --- | --- | --- | --- |
| AI assistant chat with RAG/tools | Implemented, needs UX access | Full `/ai` experience and global widget | Users must know what to ask; capabilities are hidden behind chat | Command center action catalog, page-aware widget suggestions | Quiet unless an action/draft needs attention |
| Source-backed project answers | Implemented, needs UX access | Assistant chat and project intelligence surfaces | Source selection is powerful but not clearly surfaced as a user action | `Find project evidence` action everywhere, source confidence visible | Quiet |
| Search meetings, emails, Teams, documents | Implemented, needs UX access | Assistant tools | Users do not see source-specific actions | Action catalog group: `Find evidence` with source filters | Quiet |
| Create RFI | Implemented, needs live UX verification | Assistant write tool | Not discoverable from RFI page/widget; approval UX is tool-result based | RFI page action, widget action, command center action | Interrupt only when assigned/due/overdue |
| Create change event | Implemented, needs live UX verification | Assistant write tool | Valuable but not page-contextual enough from emails/RFIs/meetings | Context action from RFI/email/meeting/source evidence | Quiet until approval/stale |
| Create generated task | Implemented, needs UX access | Assistant write tool | Useful as a general follow-up, but hidden | Widget quick action and source-context action | Interrupt assignee when due soon/blocking |
| Update/delete generated task | Implemented, needs UX access | Assistant write tool | Needs safer confirmation and task-detail entry points | Task detail action plus approval review | Quiet unless assignment/deadline changes |
| Project/company/contact creation | Implemented, needs UX access | Assistant write tools | Directory actions are hard to discover and can duplicate records | Directory page action with duplicate detection preview | Quiet, route conflicts to approval |
| Draft Outlook email | Implemented, needs UX access | Assistant write/delivery tool | Users need direct “draft reply” from email/source contexts | Email detail action, widget action, command center | Quiet unless urgent response |
| Outlook calendar invite | Implemented, needs UX access | Assistant write/delivery tool | Needs explicit attendee/time confirmation UI | Meeting/email action with preview | Quiet unless creation fails |
| Send Teams message | Implemented, setup-dependent | Assistant delivery tool | Needs recipient resolution and visible delivery failure state | Approval review plus notification router | Interrupt only on delivery failure or critical event |
| Workspace artifacts | Implemented, needs UX access | Assistant tools and workspace APIs | Artifacts are useful but not clearly surfaced as drafts | Command center `Drafts and artifacts` section | Quiet |
| Feedback/evaluation controls | Implemented, needs UX access | Message feedback components and API routes | Feedback exists but is not tied to product improvement flow users can see | Add feedback history to AI Profile/admin AI quality | Quiet |

## Implemented But High-Risk Capabilities

| Capability | Current evidence | Risk | Required product guardrail | Recommended timing |
| --- | --- | --- | --- | --- |
| Create commitment / purchase order | `createCommitment`, commitment draft widget, SOV line support | Financial record, vendor, contract dates, line items | Field-level and line-item checkoff, approval ledger, role authority | After shared approval review |
| Create prime change order | `createChangeOrder` and change-order routes | Financial/owner-facing workflow | Source evidence, field confirmation, approval state | After change event approval UX |
| Update project status | `updateProjectStatus` | Broad project truth | Preview, reason, audit trail | After action ledger |
| Flag project risk | `flagProjectRisk` | Can over-alert leadership | Source evidence and confidence | After notification router |
| Create initiative card / executive action | `createInitiativeCard`, executive tooling | Leadership visibility and prioritization | Source evidence, owner assignment, approval | After executive workflow review |
| Save knowledge / write memory | `saveToKnowledgeBase`, `writeMemory`, memory extraction | Persistent personalization/source truth | User-visible source, edit/delete, audit | After AI Profile MVP |
| Send outbound Teams/email | Teams and Outlook delivery tools | Users may assume delivery happened | Recipient/channel confirmation and delivery ledger | After shared delivery state |

## Partial Or Readiness-Gated Capabilities

| Capability | Evidence | What works | Gap before promotion | Recommended next step |
| --- | --- | --- | --- | --- |
| Submittal AI review | `reviewSubmittalAgainstDrawings`, submittal AI review route | Review logic and route exist | Needs readiness UI, linked drawing/source proof, browser verification | Add page action with `ready/not_ready` state |
| Drawing/document intelligence | Document intelligence tools and OCR/readiness routes | OCR/vector/drawing review pieces exist | Needs unified readiness state and recovery actions | Build source readiness panel and admin queue |
| Progress report generation | Progress report tools, AI generate route, PDF/email routes | Draft/generate/update/send pieces exist | Needs command center action and source snapshot confidence | Add `Generate report` action with preview/send approval |
| Executive daily brief | Daily brief tools, Teams delivery route, executive APIs | Brief generation/delivery paths exist | Needs source coverage visibility and approval queue | Add executive review/send workflow |
| AI memories | Memory service/routes and extraction | Memories can be written/searched/extracted | No user-facing “what AI knows about me” profile | Build AI Profile MVP |
| Teach Alleato / learning promotions | Teach intake service, admin promotion routes | Intake and promotion workflow exists | Needs user-facing guided submit/status loop | Add AI Profile/Teach section with review state |
| Assistant skills | Skills routes, skill disclosure, injection service | Skill retrieval/injection exists | Needs readable skill catalog and user trust UX | Add command center `Skills in use` panel |
| Prompt diagnostics / AI system health | Admin routes and diagnostics files | Admin inspection exists | Not tied to user-facing failure explanations | Link failures to admin queue and assistant warning states |
| Automation blueprints | Blueprint catalog/planner | Planning logic exists | No productized automation creation/approval loop | Keep as command-center future slice |
| Tavus/avatar assistant | Avatar page and conversation route | Route and API exist | Not central to construction workflow; likely distraction | Keep experimental/admin-only |

## Product Gaps Needed For The Intended Experience

| Gap | Why it matters | Recommended build |
| --- | --- | --- |
| Registry-backed visible action catalog | Users cannot discover what AI can do | `AICommandCenterActionCatalog` from registry/action metadata |
| Shared route/context suggestion resolver | Page actions and widget prompts will drift if hard-coded | `resolveAiSuggestions({ route, project, record, userProfile })` |
| Shared approval review component | High-risk writes need consistent confirmation and audit | `AiActionReview` with risk policies and field/line-item checks |
| AI action/delivery ledger | Notifications, audit, and recovery need durable action state | `ai_action_runs` or equivalent ledger with preview/commit/delivery states |
| AI Profile page | Users need to see memories, preferences, role/responsibility, and leadership context | `/ai/profile` or command center tab |
| Notification router | Events need one owner for Teams/email/in-app routing | Shared router over `collaboration_notifications` plus delivery adapters |
| Assistant-led onboarding | Users need guided discovery without helper clutter | Tour/widget prompts driven by action catalog and user adoption state |
| Notification preferences and digest rules | Prevents Teams/email overload | AI Profile notification preferences + routing ledger |
| Source readiness dashboard | AI must fail loudly when evidence is stale/missing | Shared readiness state for drawings, documents, Teams, Outlook, meetings |

## Recommended Access Model By User Role

| Role | Default command center focus | Widget suggestions | Page actions |
| --- | --- | --- | --- |
| Project manager | RFIs, submittals, change events, commitments, progress reports, source evidence | Current page blockers, create RFI/change event/task, progress report | RFI, submittal, change event, commitment, report actions |
| Executive | Daily brief, risks, decisions, project evidence, client/owner commitments | Urgent risks, ask for source-backed status, assign follow-up | Executive page and project intelligence actions |
| Field/superintendent | Tasks, daily logs, RFIs assigned, photo/source capture | Assigned work, quick daily update, ask for next steps | Daily log, RFI, task actions |
| Finance/admin | Commitments, SOVs, invoices, change orders, source sync health | Approval queue, delivery failures, missing cost codes | Commitment, invoice, change order actions |
| Submittal reviewer | Submittal AI review, linked drawings/specs, response actions | Review readiness, missing source, overdue ball-in-court | Submittal detail, drawing detail actions |
| System/admin | AI health, source sync, prompt diagnostics, learning promotions | System blockers and failed delivery/source sync | Admin AI control plane actions |

## Recommended Onboarding Flow

Option A: page tours only.

- Pros: easy to understand on specific pages.
- Cons: becomes repetitive and does not teach the assistant as one coherent product.

Option B: assistant-led onboarding only.

- Pros: flexible and conversational.
- Cons: can feel vague if users do not know what to ask.

Option C: hybrid action-aware onboarding. Recommended.

- The first AI command center visit shows the action catalog and the approval model.
- The global widget gives a short welcome and 3-4 useful starter actions.
- High-value pages show one-time contextual prompts driven by the suggestion resolver.
- AI Profile has a “what Alleato AI knows about me” tour.
- Every tour links to one real action, not explanatory filler.

## Low-Hanging Fruit Backlog

| Priority | Feature/tool | Why low-hanging | Recommended scope |
| --- | --- | --- | --- |
| P0 | Command center action catalog | Metadata and tools already exist | Read from action capability copy plus registry; label readiness honestly |
| P0 | Page-aware widget suggestions | Global widget now exists and can accept suggestion props | Add resolver and show 2-4 route-aware actions |
| P0 | AI Profile MVP | Memory routes/services already exist | Show identity, role, memories, preferences, recent AI activity |
| P1 | Progress report action launcher | Routes/tools already exist | Add `Generate weekly report` action with source snapshot/preview |
| P1 | RFI/change event contextual actions | Write tools and routes exist | Add page actions that seed approval review or widget prompt |
| P1 | Submittal readiness action | AI review route exists | Add readiness-state button on submittal detail |
| P1 | Delivery failure notifications | Notification hook and delivery tools exist | Route failed Teams/email sends into in-app/admin queue |
| P2 | Learning/Teach status loop | Teach intake exists | Show submitted learnings and review state in AI Profile |
| P2 | Skills disclosure panel | Skill traces already render in assistant | Add “skills used / available” panel in command center |
| P2 | Source health warnings in assistant | Source health concepts exist | Add visible stale/missing-source warning to source-backed answers |

## Notification Recommendations From This Audit

Start with notifications that have a clear next action and existing data path.

Interruption list:

- AI-created draft awaiting approval for high-risk writes.
- Delivery failure for Teams/email/progress report sends.
- RFI/submittal due or overdue when user owns next action.
- Submittal AI conflict found with source evidence.
- Source sync failure that makes an active AI workflow unsafe.

Quiet unboxing list:

- AI memory created/updated.
- Source evidence ingested.
- Progress report draft created but not near deadline.
- AI review completed with no major conflict.
- Assistant skill used or updated.
- Suggested automation/workflow improvement.

## Recommended Next Three Implementation Slices

### Slice 1: AI Command Center Action Catalog

Scope:

- Add a visible action catalog grouped by job-to-be-done.
- Use registry/action metadata where available.
- Label each action as ready, preview required, needs setup, admin only, or not ready.
- Include “why unavailable” explanations.

Why first:

- It makes the platform’s existing AI value visible without changing risky write flows.

### Slice 2: Shared Suggestion Resolver

Scope:

- Build one resolver for widget suggestions, page actions, and onboarding prompts.
- Inputs: route, project, record type, record state, user role/profile, source readiness.
- Outputs: max four actions with label, prompt, target surface, readiness, and unavailable reason.

Why second:

- It prevents every page from inventing its own AI buttons and copy.

### Slice 3: AI Profile MVP

Scope:

- Show identity, role, project responsibility, memories, preferences, notification settings, and recent AI activity.
- Include leadership/coaching context as visible-by-policy with audit metadata.
- Add edit/delete for user-owned preferences and memories.

Why third:

- It makes the assistant feel like it knows the user while keeping personalization transparent and governable.

## Decisions Already Recommended

| Decision | Recommendation |
| --- | --- |
| Should the widget be the only access point? | No. Use widget plus full command center plus contextual page actions. |
| Should AI-created records auto-commit? | No. Preview-first with explicit commit. |
| Should financial line items need checkoff? | Yes. Line-level confirmation for SOVs, commitments, change orders, invoices. |
| Should user intelligence be hidden? | No. Make it visible by policy with clear source and audit metadata. |
| Should notifications ship before approval UX? | No. Route notifications into clear actions and approval states. |
| Should onboarding be tours or chat? | Hybrid, driven by the same action catalog/suggestion resolver. |

## Open Items For Future Review

- Decide the exact database table or existing ledger to own AI action approval state.
- Decide whether AI Profile is a full route (`/ai/profile`) or a command center tab first.
- Verify every write tool in a browser flow before labeling it “Ready” in product UI.
- Define leadership/coaching context policy with legal/HR visibility expectations.
- Decide default notification preferences by role before routing Teams/email automatically.
- Add screenshot/design research to the command center and widget suggestion UI before large UI changes.

## Failure-Loud Requirements

- If action metadata is missing, the action catalog should show `Unavailable: metadata missing`, not hide silently in development.
- If user identity or role cannot be resolved, write/delivery actions default to preview-only or hidden with an explanation.
- If source readiness is missing, source-backed actions show the missing source layer.
- If delivery fails, the failed channel and provider error become visible product state.
- If the suggestion resolver returns more than four actions for a page, it must rank and truncate with a logged reason.
- If a memory or leadership context item influences an answer, the AI Profile should be able to show that context was available and where it came from.
