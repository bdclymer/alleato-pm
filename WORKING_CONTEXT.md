# Alleato — Working Context

> Claude: Read this before touching anything. Update this before ending any session.
> Megan: This file is your project's short-term memory. Keep it current.

---

## Current focus

**Status:** All changes committed and pushed to main. Session ended cleanly.
**Last updated:** 2026-05-14
**Last worked on by:** Claude Code (session ending ~4:30pm ET)

---

## What was done this session (2026-05-14)

A very heavy day — 30+ commits across backend and frontend. Summary by area:

### 1. Deep Agents backend pipeline (morning)

Built the backend contracts and agent service for the Deep Project Intelligence pipeline:

- **`backend/src/services/agents/deep_project_intelligence_contracts.py`** — Pydantic request/response "contracts" (typed schemas) for the Deep Agents. Defines `DeepProjectIntelligenceRequest`, `DeepExecutiveIntelligenceRequest`, and all the response/evidence/source models. This is the "contracts spike" — a clean type-safe API boundary for the agentic pipeline.
- **`backend/src/services/agents/deep_project_intelligence.py`** — The actual deep agent: 9 parallel source probes (document_chunks, email, meetings, budget, tasks, RFIs, submittals, project_insights), LLM synthesis, and streaming response.
- **`backend/src/api/main.py`** — Wired the two new endpoints: `POST /api/v1/deep-agents/project-status` and `POST /api/v1/deep-agents/executive-briefing`.
- **`backend/src/tests/test_deep_project_intelligence.py`** — Unit tests for contracts validation.

### 2. Deep Agents frontend bridge (mid-morning → afternoon)

Wired the backend deep agents into the AI assistant:

- **`frontend/src/lib/ai/deep-agent-project-status.ts`** — Client-side bridge: detects Deep Agent intents (`target_briefing`, `latest_status`, `risk_review`), calls the backend endpoint, and streams results back into the chat.
- **`frontend/src/lib/ai/chat-handler.ts`** — Routing logic updated to gate deep-agent calls behind `AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED` feature flag.
- **`frontend/src/lib/ai/__tests__/deep-agent-project-status.test.ts`** — Tests for the bridge.
- Several commits to routing, tool prioritization, and executive briefing verification.

### 3. Outlook inbox email widget redesign (afternoon)

Fully redesigned the `OutlookInboxSummaryWidget` in `assistant-widget-renderer.tsx`:

**Collapsed state (before → after):**
- Before: subject + redundant metadata + "Suggested next step" block + preview (cluttered)
- After: avatar initials circle + sender + thread count + paperclip indicator + time + thumbs feedback + chevron + subject bold + single-line preview

**Expanded state:**
- "Next step" pill (primary-colored label + recommended action text)
- Email body indented under avatar in `bg-muted/30` block
- Action toolbar: **Reply** (→ replyPrompt), **AI Draft** (→ draftPrompt), **Project** (→ AI prompt for assignment), **Task** (→ AI prompt for creation), **Tag** (→ popover with text input), **Open in Outlook** (external link)

**`EmailCardFeedback` component:**
- Thumbs up/down on every collapsed card header
- Optimistic UI with green/red highlight
- Fires to `/api/ai-assistant/feedback` silently on vote

Key commits: `4e7573ffe` "Make Outlook inbox cards actionable", `5dff66822` "Flatten Outlook inbox assistant summaries"

### 4. AI widget gallery expanded (afternoon)

Added two new sections to `/auth/ai-widget-gallery`:

- **Generative UI components grid** — all 20 registered widget types with category badge (action / data / intelligence / communication), trigger phrase, description, and type key
- **AI SDK features table** — 17 features with badge (Core / Tools / Agents / Streaming / React / HITL / Generative UI / Providers / Embeddings), usage description, and exact file locations

Also fixed pre-existing fixture data bugs: `projectId` → `projectIds`, added missing required widget fields.

Key commit: `df9f28b24` "Expand AI widget gallery with component and SDK reference tables"

### 5. Other notable fixes (throughout day)

- `ad70430a9` — Fixed `contracts/{id}/payments` PostgREST `.single()` coercion error
- `df9c4831d` — Fixed 5 invoicing bugs: status badge, PDF export, not-found hang, maxLength, contract dropdown
- `ca1bd5e72` — Fixed change-orders inline line item edit fails on generated column
- `a25321f0f` — Added budget view switcher to toolbar
- `f2ee7b095` — Added edit page for estimates tool
- `e43d29724` — Fixed realtime cursors chunk load failure (moved `createClient()` inside hook via `useRef`)
- Outlook intake reclassification controls + script
- RAG chunk integrity guardrail
- Fireflies transcript chunk rebuild fix

---

## Active task

Nothing actively blocked. All changes pushed to main.

---

## What's next / follow-ups

1. **Deep Agents production validation** — the bridge is gated behind `AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED`. Needs end-to-end test with a real project question before toggling on in production.
2. **Outlook email widget actions** — Project assignment and Task creation currently delegate to `onSubmit` (AI handles them). Could wire to direct API calls if the assistant round-trip feels slow in practice.
3. **Radix Select + browser automation gap** — ~30 cascading E2E failures trace to this. The dropdown test pattern needs a dedicated fix before Playwright suite can cover full CRUD flows.
4. **Estimates tool** — has no seed data; E2E tests can't run until seed data is created.
5. **`/prp-validate` runs needed** — Change Events, Change Management, Commitments, Direct Costs, Invoicing, Prime Contracts, Estimates still need PRP validation.
6. **Low-confidence review queue** — `document_attribution_candidates` table still has no UI.
7. **GitHub billing** — CI workflows are still disabled (billing lock at github.com/settings/billing).

---

## Architecture — key file map

| Thing | Location |
|-------|----------|
| Deep Agents contracts (Pydantic schemas) | `backend/src/services/agents/deep_project_intelligence_contracts.py` |
| Deep Agents service (9-probe pipeline) | `backend/src/services/agents/deep_project_intelligence.py` |
| Deep Agents frontend bridge | `frontend/src/lib/ai/deep-agent-project-status.ts` |
| Feature flag | `AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED` in `.env` |
| Outlook inbox email widget | `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx` → `OutlookInboxSummaryWidget` |
| Widget gallery | `frontend/src/app/auth/ai-widget-gallery/ai-widget-gallery-client.tsx` |
| Graph sync orchestrator | `backend/src/services/integrations/microsoft_graph/sync.py` |
| Teams compiler | `backend/src/services/intelligence/teams_compiler.py` |
| Render cron config | `render.yaml` |

---

## Render cron jobs (all in render.yaml)

| Name | Schedule | Purpose |
|------|----------|---------|
| `alleato-graph-sync` | every 30 min | Outlook + Teams + OneDrive sync, embed, compile |
| `alleato-task-extraction` | daily 7 AM UTC | Extract action items from comms |
| `alleato-rag-health` | daily 12:15 UTC | RAG embedding health check + Slack alert |

---

*This file is maintained by Claude Code and should be committed to the repo.*
*It is the single most important file for session continuity.*
