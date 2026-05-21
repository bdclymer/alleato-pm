# AI Documentation Inventory

**Purpose:** every AI-facing capability in the app that needs a public-facing technical doc on `/docs` so the AI assistant can answer "how does X work?" questions about itself. Organized by area, prioritized by how often the AI will be asked about it.

**Doc location:** `docs/help/articles/<slug>.md`
**Category on /docs:** `AI & Intelligence` (new category — currently AI articles are split across "Financial Tools", "Meetings", and untagged)
**Frontmatter pattern:** matches `budget-reference.md` — `ai_visible: true`, `client_visible: true`

---

## What already exists

These articles live in `docs/help/articles/` today. Most are thin overviews from before the architecture matured.

| Slug | Status | Notes |
|---|---|---|
| `ai-assistant-overview.md` | EXISTS — review | The "what is the AI" entry point. Likely needs rewriting against current architecture. |
| `ai-assistant-actions.md` | EXISTS — review | Action capabilities (write actions, preview/confirm). |
| `ai-capabilities-index.md` | EXISTS — review | Index of what the assistant can do. Probably stale. |
| `ai-financial-advisor.md` | EXISTS — review | The CFO agent. Needs alignment with current C-Suite design. |
| `ai-meeting-intelligence.md` | EXISTS — review | Meeting transcript intelligence. |
| `ai-memory.md` | EXISTS — review | How the assistant remembers prior context. |
| `ai-proactive-alerts.md` | EXISTS — review | Phase 2 alerts (margin, schedule, cash flow). Likely aspirational vs shipped. |
| `ai-project-updates.md` | EXISTS — review | Project-level updates surfaced by the AI. |
| `ask-the-ai-assistant.md` | EXISTS — review | How to actually use chat. |
| `use-help-center-and-ai-assistant.md` | EXISTS — review | Bridges the help center and the AI. |

**First pass on these:** audit each, decide if it's still accurate, mark for rewrite/keep/delete. Cheaper than authoring net-new where overlap exists.

---

## What needs to be written (by area)

### Area 1 — Chat & Orchestration (P0)

Where the AI lives, how it routes a question, what it can see.

| # | Slug | Type | What it covers |
|---|---|---|---|
| 1 | `ai-chat-overview` | Reference | The chat UI, conversations, threads, history, deletion, conversation pinning. Routes: `/ai-assistant`. |
| 2 | `ai-architecture` | Explanation | The C-Suite multi-agent model: Strategist routes to CFO/COO/CHRO/CMO/CRO/VPBD. What each agent's specialty is. Plain-English version of `AI-RAG-ARCHITECTURE.md`. |
| 3 | `ai-models-and-providers` | Reference | Which model runs what (Strategist = gpt-5.4, CFO = gpt-5.4-mini, etc.), Vercel AI Gateway, BYOK billing model. |
| 4 | `ai-retrieval-rag` | Explanation | How RAG works in plain English: vector embeddings, `document_chunks`, semantic vs keyword search, hybrid retrieval, reranking. |
| 5 | `ai-data-sources` | Reference | Every data source the assistant can read: emails, meetings, Teams, contracts, budgets, commitments, RFIs, submittals, Acumatica. What's indexed vs queried directly. |
| 6 | `ai-conversation-memory` | Reference | Short-term (within a chat) vs long-term (cross-session) memory. The `ai-memory-service` and `conversation-memory`. What gets remembered, what doesn't, how to clear it. |
| 7 | `ai-intent-routing` | Explanation | How the intent classifier picks an agent. When the Strategist hands off vs. handles directly. Read-heavy direct-return fast path via Render Deep Agents. |
| 8 | `ai-feedback-and-learning` | Reference | Thumbs up/down on responses, task feedback, email-draft feedback, packet-card feedback — what each feeds into. |

### Area 2 — Task Creation & Extraction (P0)

The user called this out by name.

| # | Slug | Type | What it covers |
|---|---|---|---|
| 9 | `ai-task-extraction` | Explanation | How tasks get created automatically from emails, meetings, Teams. The daily `alleato-task-extraction` cron. `task_extraction.py`, `fireflies_task_rewriter.py`, `task_assignees.py`. |
| 10 | `ai-task-creation-reference` | Reference | Where extracted tasks land (`tasks` table), how assignees are resolved, statuses, dedup logic, confidence thresholds. |
| 11 | `ai-task-source-review` | How-To | The human review queue for AI-extracted tasks. When tasks need review vs. auto-publish. `task-source-review.ts`, `task-feedback-types.ts`. |
| 12 | `ai-task-training` | Explanation | How thumbs-up/down on tasks teaches the system. `task-training-service.ts`. |

### Area 3 — Email Assistant for Brandon (P0)

User called this out by name. Brandon is the named executive user — his email assistant is a distinct surface.

| # | Slug | Type | What it covers |
|---|---|---|---|
| 13 | `email-assistant-overview` | Explanation | What the email assistant does — triage Brandon's Outlook, surface what needs attention, draft replies, file/dismiss. |
| 14 | `email-assistant-daily-update` | Reference | The Brandon Daily Update widget and report. Route: `/api/executive/brandon-daily-update`. What's in it, when it runs, how it's generated. |
| 15 | `email-assistant-drafts` | How-To | How AI-drafted email replies work. Feedback loop on drafts (`email-draft-feedback`). |
| 16 | `email-assistant-rules` | How-To | Email filter rules (`/api/email-filter-rules`), skip audit (`/api/outlook-skip-audit`), and how the assistant respects them. |
| 17 | `email-inbox-and-intake` | Reference | The pipeline: `outlook_email_intake` → relevance filter → `document_metadata` → embeddings → AI-visible. From `COMMUNICATIONS-DATA-PIPELINE.md`. |

### Area 4 — Daily Briefs & Proactive Intelligence (P1)

| # | Slug | Type | What it covers |
|---|---|---|---|
| 18 | `ai-executive-daily-brief` | Reference | The daily executive brief. Cron: `cron/executive-daily-brief`. What's in it (margin, schedule, cash flow callouts). |
| 19 | `ai-daily-flags` | Reference | The daily-flags cron — what gets flagged and why. `cron/daily-flags`. |
| 20 | `ai-insight-cards` | Reference | The insight cards system. `frontend/src/lib/ai/insight-cards/`. What insights look like in the UI, how they're generated, dismiss/snooze. |
| 21 | `ai-project-intelligence` | Reference | Per-project intelligence summary. `project-intelligence-summary.ts`, `deep-agent-project-status.ts`. |
| 22 | `ai-personal-daily-brief` | Reference | Per-user daily brief (distinct from executive brief). `personal-daily-brief.ts`. |

### Area 5 — Meeting Intelligence (P1)

| # | Slug | Type | What it covers |
|---|---|---|---|
| 23 | `ai-meeting-transcripts` | Explanation | Fireflies pipeline, transcript ingest, speaker mapping, embedding. `fireflies_pipeline.py`. |
| 24 | `ai-meeting-prep` | How-To | The meeting prep prompt — what the AI prepares before a meeting. `prompts/meeting-prep.ts`. |
| 25 | `ai-meeting-insights` | Reference | Insights extracted from meetings — decisions, action items, blockers. `meeting-insight-signals.ts`. |
| 26 | `ai-teams-compiler` | Reference | How Teams messages get compiled into project context. `teams_compiler.py`, runs at end of every Graph sync. |

### Area 6 — Tool Catalog (P1)

The AI's "hands". Each is a discrete capability the assistant can invoke.

| # | Slug | Type | What it covers |
|---|---|---|---|
| 27 | `ai-tools-overview` | Reference | The complete tool catalog grouped by domain (financial, operational, project, schedule, forecast, outlook, marketing, etc.). |
| 28 | `ai-tools-financial` | Reference | `financial.ts` — every financial tool the AI can use (budget, commitments, change orders, invoices, direct costs). |
| 29 | `ai-tools-operational` | Reference | `operational.ts` — RFIs, submittals, daily logs, drawings. |
| 30 | `ai-tools-schedule-forecast` | Reference | `schedule-tools.ts` + `forecast-tools.ts`. |
| 31 | `ai-tools-acumatica` | Reference | `acumatica.ts` — the accounting integration tools. |
| 32 | `ai-tools-action-tools` | Reference | `action-tools.ts` — write actions (creating things), preview/confirm safety pattern. |
| 33 | `ai-tools-app-help` | Reference | `app-help-tools.ts` — the tools the AI uses to answer questions about the app itself (this is what the new technical docs feed into). |

### Area 7 — Workspace & Artifacts (P2)

| # | Slug | Type | What it covers |
|---|---|---|---|
| 34 | `ai-workspace` | Reference | The AI workspace — pinned context, attached docs, scratchpad. `workspace-tools.ts`, `workspace-artifact-service.ts`. |
| 35 | `ai-artifacts` | Reference | Documents the AI creates and updates (`create-document.ts`, `update-document.ts`). |
| 36 | `ai-voice` | Reference | Speech input/output. `ai-assistant/speech`. |
| 37 | `ai-avatar` | Reference | The AI's visual identity / avatar configuration. |

### Area 8 — Trust, Safety, Observability (P2)

| # | Slug | Type | What it covers |
|---|---|---|---|
| 38 | `ai-guardrails` | Reference | Tool-level guardrails (`guardrails.ts`), preflights, fallback chain. What happens when a tool fails. |
| 39 | `ai-entitlements` | Reference | Who can use what AI features. Per-user entitlements. |
| 40 | `ai-tracing-langfuse` | Explanation | How every AI response is traced, what's logged, privacy implications. |
| 41 | `ai-quality-scoring` | Explanation | `score-response-quality.ts` — automatic quality grading of responses. |
| 42 | `ai-source-health` | Reference | Source health monitoring — when data sources are stale or failing, how the AI reports that to the user. `source-health.ts`. |
| 43 | `ai-usage-stats` | Reference | Per-user usage tracking. `ai-assistant/usage-stats`. |

### Area 9 — Infrastructure (P2 — internal-leaning, but useful for power users)

| # | Slug | Type | What it covers |
|---|---|---|---|
| 44 | `ai-sync-pipeline` | Explanation | The 30-min Graph sync cron, embedding pipeline, Teams compiler. End-to-end "how does new data become AI-visible?". |
| 45 | `ai-rag-health` | Reference | The daily RAG health check, embedding coverage stats, Slack alerts. |
| 46 | `ai-project-assignment` | Explanation | How emails and meetings get matched to projects (4-strategy ladder: title → contacts → domain → content), confidence thresholds, the review queue. |
| 47 | `ai-acumatica-sync` | Reference | Accounting data sync — cookie auth, OData limitations, what syncs and when. |

---

## Recommended order of work

**Phase A (foundation — 1 week):**
Audit and rewrite the 10 existing AI articles. They're the most likely landing spots when a user asks "how does the AI work?" — making them accurate is higher leverage than adding new articles to a misleading base.

**Phase B (P0 net-new — 1–2 weeks):**
Areas 1, 2, 3 (Chat & Orchestration, Tasks, Email Assistant). 17 articles. These are what the user explicitly named.

**Phase C (P1 net-new — 1 week):**
Areas 4, 5, 6 (Daily Briefs, Meeting Intelligence, Tool Catalog). 15 articles.

**Phase D (P2 net-new — as time allows):**
Areas 7, 8, 9. 14 articles.

**Total scope: ~46 articles.** ~10 audits + ~36 new.

---

## Cross-cutting decisions to make now

Before writing the first article, lock these in. Each one ripples across every article.

1. **New `/docs` category for AI?** Currently AI articles are scattered. Propose: `AI & Intelligence` as a top-level category, with all AI articles grouped under it.
2. **Brandon-specific vs. general?** Some articles (Daily Update, Email Assistant) are about a feature built around Brandon. Document them as the general feature with Brandon as the example, or as Brandon-specific? Recommend: general feature framing, Brandon called out as the current user.
3. **Frontmatter additions for AI articles?** Suggest adding:
   - `source_files: [...]` — actual code paths the article describes
   - `last_verified: YYYY-MM-DD` — so staleness is visible
   - `ai_self_knowledge: true` — distinguish "the AI's docs about itself" from generic help
4. **Where does this fit with `AI-RAG-ARCHITECTURE.md`?** That doc is the *internal* engineering reference. The /docs articles are the *user-facing* version. Decide: do user-facing articles link to the engineering doc, or stay self-contained? Recommend: self-contained for users, with a single "developer reference" link at the bottom of `ai-architecture`.
5. **Audience.** Most existing articles target end users. Some of these (especially Area 6 Tool Catalog and Area 9 Infrastructure) lean more developer/power-user. Decide whether to:
   - (a) Write everything for end users, omit developer-leaning detail.
   - (b) Two audiences — user articles on `/docs`, dev articles in `docs/architecture/`.
   - (c) Mix — single article with a "Deep dive" section at the bottom for developers.

Recommend **(c)** — keeps the AI's retrieval surface in one place and lets the assistant answer both end-user and developer questions from the same source.

---

## Next step

Pick the first article from Phase B and I'll write it. Recommend starting with either:
- `ai-chat-overview` (the user's first touchpoint), or
- `ai-task-extraction` (you called tasks out by name)
