# Alleato PM — Development Feature Inventory

> **Last updated:** May 2, 2026
>
> Custom-built platform features, developer tools, integrations, and AI systems.
> This does NOT include standard Procore application tools (Budget, RFIs, Submittals, etc.).

---

## Table of Contents

1. [AI Assistant (C-Suite Multi-Agent Chat)](#1-ai-assistant-c-suite-multi-agent-chat)
2. [RAG Pipeline & Semantic Search](#2-rag-pipeline--semantic-search)
3. [AI Action Tools (Write Layer)](#3-ai-action-tools-write-layer)
4. [AI Memory System](#4-ai-memory-system)
5. [Proactive Daily Flagging (Cron)](#5-proactive-daily-flagging-cron)
6. [Acumatica ERP Integration](#6-acumatica-erp-integration)
7. [Fireflies Meeting Ingestion](#7-fireflies-meeting-ingestion)
8. [Client Feedback Inbox](#8-client-feedback-inbox)
9. [Design Violation Tracker](#9-design-violation-tracker)
10. [Procore Crawl & Parity System](#10-procore-crawl--parity-system)
11. [Database Explorer (Admin)](#11-database-explorer-admin)
12. [Design System & Style Guide](#12-design-system--style-guide)
13. [Company Knowledge Base](#13-company-knowledge-base)
14. [Financial Modeling (FM Global)](#14-financial-modeling-fm-global)
15. [Notification System](#15-notification-system)
16. [Command Center](#16-command-center)
17. [Team Chat](#17-team-chat)
18. [Meeting Prep (AI-Generated)](#18-meeting-prep-ai-generated)
19. [Project Health Dashboard](#19-project-health-dashboard)
20. [RAG Evaluation Tool](#20-rag-evaluation-tool)
21. [API Documentation Viewer](#21-api-documentation-viewer)
22. [Developer Utilities](#22-developer-utilities)
23. [Scheduled Jobs (Cron)](#23-scheduled-jobs-cron)
24. [Pre-Commit Hooks & Code Quality](#24-pre-commit-hooks--code-quality)
25. [Teams Conversation Intelligence Compiler](#25-teams-conversation-intelligence-compiler)
26. [Drawings System](#26-drawings-system)
27. [Live Cursors (Real-Time Presence)](#27-live-cursors-real-time-presence)
28. [Real-Time Comments (Liveblocks)](#28-real-time-comments-liveblocks)
29. [Photos & Media Upload](#29-photos--media-upload)
30. [Scheduling System (Multi-View)](#30-scheduling-system-multi-view)
31. [Project Directory](#31-project-directory)
32. [Company Directory (Global)](#32-company-directory-global)
33. [Punch List](#33-punch-list)
34. [Daily Log](#34-daily-log)
35. [Specifications](#35-specifications)
36. [Documents (Per-Project)](#36-documents-per-project)
37. [Emails & Email Attachments (Per-Project)](#37-emails--email-attachments-per-project)
38. [Transmittals](#38-transmittals)
39. [Project Home / Command Center](#39-project-home--command-center)
40. [My Work & Subcontractor Portal](#40-my-work--subcontractor-portal)
41. [Permissions & Access Control System](#41-permissions--access-control-system)
42. [Project Intelligence Packet Viewer](#42-project-intelligence-packet-viewer)
43. [Ask Alleato Widget (Global Overlay)](#43-ask-alleato-widget-global-overlay)
44. [AI Chat Sidebar (Inline)](#44-ai-chat-sidebar-inline)
45. [AI Conversation History Panel](#45-ai-conversation-history-panel)
46. [AI Tool Trace Panel](#46-ai-tool-trace-panel)
47. [AI Intent Router](#47-ai-intent-router)
48. [AI Provider Routing](#48-ai-provider-routing)
49. [AI Agent Learning System](#49-ai-agent-learning-system)
50. [AI Tool Guardrails / Scope Enforcement](#50-ai-tool-guardrails--scope-enforcement)
51. [AI Web Search (Tavily)](#51-ai-web-search-tavily)
52. [AI MCP Tool Bridge](#52-ai-mcp-tool-bridge)
53. [Tavus AI Video Avatar](#53-tavus-ai-video-avatar)
54. [Welcome Onboarding Flow](#54-welcome-onboarding-flow)
55. [Microsoft Graph Integration (Outlook + Teams + OneDrive)](#55-microsoft-graph-integration-outlook--teams--onedrive)
56. [Acumatica Mirror Sync & Outbound Write](#56-acumatica-mirror-sync--outbound-write)
57. [Guardrails Framework (API + External Calls)](#57-guardrails-framework-api--external-calls)
58. [Annotation Inbox (Agentation Dev Tool)](#58-annotation-inbox-agentation-dev-tool)
59. [Procore Reference Panel (Dev Sidebar)](#59-procore-reference-panel-dev-sidebar)
60. [What's New / Changelog](#60-whats-new--changelog)
61. [Help Article System](#61-help-article-system)
62. [Live Component Gallery & Design Lab](#62-live-component-gallery--design-lab)
63. [Subcontractor Navigation Mode](#63-subcontractor-navigation-mode)

---

## 1. AI Assistant (C-Suite Multi-Agent Chat)

**What it is:** A multi-agent AI chat system where a Strategist agent routes conversations to domain specialists (CFO, COO, CRO, CHRO, VP BD). Each specialist has its own system prompt, personality, and tool access.

**URL:** `/ai-assistant`

| Component | File |
|-----------|------|
| Orchestrator (wires everything) | `frontend/src/lib/ai/orchestrator.ts` |
| Strategist agent | `frontend/src/lib/ai/agents/strategist.ts` |
| CFO agent (financial) | `frontend/src/lib/ai/agents/cfo.ts` |
| COO agent (operations) | `frontend/src/lib/ai/agents/coo.ts` |
| CRO agent (client relationships) | `frontend/src/lib/ai/agents/cro.ts` |
| CHRO agent (people/team) | `frontend/src/lib/ai/agents/chro.ts` |
| VP BD agent (business dev) | `frontend/src/lib/ai/agents/vpbd.ts` |
| Identity & personality | `frontend/src/lib/ai/identity.ts`, `soul.ts` |
| System prompt | `frontend/src/lib/ai/rag-assistant-prompt.ts` |
| Chat API route | `frontend/src/app/api/ai-assistant/chat/route.ts` |
| Chat page | `frontend/src/app/(chat)/ai-assistant/page.tsx` |
| Alternate RAG chat | `frontend/src/app/(chat)/rag/page.tsx` |
| Sidebar chat | `frontend/src/app/(main)/chat-rag/page.tsx` |

**AI provider:** OpenAI via AI Gateway (BYOK mode). Billing stays with OpenAI. Auth via `AI_GATEWAY_API_KEY`. Falls back to direct `OPENAI_API_KEY`.

**Read tools (15+):** Portfolio overview, risk analysis, financial analysis, budget summary, commitments, change orders, direct costs, cost trends, schedule analysis, RFI status, submittal status, vendor performance, cross-project comparison, historical trends, forecast comparison, semantic search.

**Files:** `frontend/src/lib/ai/tools/project-tools.ts`, `financial.ts`, `operational.ts`

---

## 2. RAG Pipeline & Semantic Search

**What it is:** A unified retrieval-augmented generation pipeline that chunks, embeds, and searches documents, meeting transcripts, and knowledge articles. Powers the AI assistant's ability to answer questions grounded in real project data.

| Component | Detail |
|-----------|--------|
| Embedding table | `document_chunks` (24,000+ rows) |
| Vector engine | Supabase pgvector |
| Embedding model | `text-embedding-3-small` / `text-embedding-3-large` |
| Search RPCs | `search_document_chunks`, `search_all_knowledge`, `search_knowledge_base` |
| Hybrid search | Semantic + full-text across documents, meetings, company knowledge |
| LLM reranker | Cross-encoder reranking of search results |
| Pipeline state | `rag_pipeline_state` table |

**Data sources:** Meeting transcripts (Fireflies), documents, company knowledge base, support articles, code examples.

---

## 3. AI Action Tools (Write Layer)

**What it is:** 10 tools that let the AI create and update records directly from chat. Financial/destructive tools require user confirmation before writing.

| Tool | Table | Confirmation |
|------|-------|-------------|
| `createChangeOrder` | `prime_contract_change_orders` | Required |
| `createChangeEvent` | `change_events` | Required |
| `updateProjectStatus` | `projects` | Required |
| `createRFI` | `rfis` | Required |
| `flagProjectRisk` | `ai_insights` | Required |
| `createTask` | `schedule_tasks` | No |
| `updateRFIStatus` | `rfis` | No |
| `createMeetingNote` | `document_metadata` | No |
| `createSubmittal` | `submittals` | No |
| `logDailyReport` | `daily_logs` | No |

**File:** `frontend/src/lib/ai/tools/action-tools.ts`

**Safety pattern:** Tools with `confirmed: boolean` default to `false`. The AI shows a preview and waits for "confirm" before writing.

---

## 4. AI Memory System

**What it is:** Persistent memory across AI chat sessions. Auto-extracts facts, preferences, and lessons from conversations. Memories are embedded and retrieved semantically at session start.

| Component | Purpose | File |
|-----------|---------|------|
| Conversation Memory | Summaries embedded + retrieved across sessions | `frontend/src/lib/ai/services/conversation-memory.ts` |
| Memory Extraction | Auto-extracts facts, preferences, lessons | `frontend/src/lib/ai/services/memory-extraction.ts` |
| AI Memory Service | Long-term memory CRUD with decay | `frontend/src/lib/ai/services/ai-memory-service.ts` |
| Memory Settings Page | View/manage AI memory records | `/settings/memory` |

**Tables:** `ai_memories`, `conversations`, `chat_sessions`, `chat_messages`

**RPCs:** `search_ai_memories`, `search_conversation_memories`, `decay_memory_confidence`, `expire_ai_memories`, `touch_ai_memories`

---

## 5. Proactive Daily Flagging (Cron)

**What it is:** A scheduled function that runs daily at 6am UTC. Checks all active projects for issues and auto-creates `ai_insights` records.

**Checks performed:**
- Budget variance > 10% (uses `project_health_dashboard` view)
- Past-due RFIs (open RFIs past `due_date`)
- Late schedule tasks (incomplete tasks past `finish_date`, milestones flagged as critical)
- Stale change events (unresolved > 7 days, critical if > 30 days)

**Deduplication:** Checks for existing unresolved insights with the same `project_id` + `insight_type` created today before inserting.

**File:** `frontend/src/app/api/cron/daily-flags/route.ts`

**Auth:** `CRON_SECRET` bearer token (set in all Vercel environments).

---

## 6. Acumatica ERP Integration

**What it is:** Live connection to Acumatica accounting system. Provides real-time AP/AR aging, cash position, and budget data to the AI assistant.

| Component | File |
|-----------|------|
| REST API client | `frontend/src/lib/acumatica/client.ts` |
| AI tools | `frontend/src/lib/ai/tools/acumatica.ts` |

**AI tools:** `getAPAgingSummary`, `getARAgingSummary`, `getCashPosition`, `getProjectBudgetFromERP`

**Auth:** Cookie-based (POST `/entity/auth/login` → 204 + cookies). NOT bearer token.

**Credentials:** `ACCOUNTING_USER` + `ACCOUNTING_PASSWORD` in `.env`

**Critical notes:**
- Company name: `"Alleato Group LLC"` (exact casing required)
- API version: `24.200.001`
- NEVER use OData `$filter` — causes HTTP 500. Filter in-memory instead.
- Safe OData params: `$select`, `$top`, `$expand`

**Sync tables:** `acumatica_ap_bills`, `acumatica_ar_invoices`, `acumatica_sync_state`, `erp_sync_log` (11 tables total)

---

## 7. Fireflies Meeting Ingestion

**What it is:** Automated pipeline that ingests meeting transcripts from Fireflies.ai, segments them into searchable chunks, and embeds them for RAG search.

**Pipeline:**
1. Fireflies webhook/API delivers transcript
2. Transcript stored in `document_metadata` with type `meeting`
3. Segmented into `meeting_segments` / `document_chunks`
4. Embedded with `text-embedding-3-small`
5. Searchable via `match_meeting_chunks`, `search_meeting_chunks_semantic`, `full_text_search_meetings`

**Tables:** `fireflies_ingestion_jobs`, `meeting_segments`, `document_metadata`, `document_chunks`

**Meeting features:**
- Meeting list page: `/{projectId}/meetings`
- Meeting detail with transcript, action items, insights: `/{projectId}/meetings/{meetingId}`
- AI-generated meeting prep: `/{projectId}/meetings/{meetingId}/prep`
- Meeting analytics RPCs: `get_meeting_analytics`, `get_meeting_statistics`, `get_meeting_frequency_stats`

---

## 8. Client Feedback Inbox

**What it is:** A Linear-style inbox for collecting and triaging client feedback. Includes screenshot capture, tool context resolution, and resolve/delete workflows.

**URL:** `/feedback-inbox`

**Capabilities:**
- Feedback items with screenshots, descriptions, severity levels
- Resolve and delete actions
- Screenshot display in detail panel
- Tool context resolver — auto-links feedback to the correct Procore tool, PRP, research folder, manifest, and crawl command
- Context bundling for AI agents: `contextToAgentPayload()`

**Key files:**
- Page: `frontend/src/app/(other)/feedback-inbox/page.tsx`
- Context resolver: `frontend/src/lib/admin-feedback/context-resolver.ts`
- API: `frontend/src/app/api/admin/feedback/route.ts`

**Table:** `admin_feedback_items`, `admin_feedback_comments`

---

## 9. Design Violation Tracker

**What it is:** A two-part system for tracking and fixing design system violations. Includes an in-app right-click overlay for flagging issues and a Linear-style inbox for managing them.

**URLs:**
- Violation inbox: `/design-violations`
- Overlay: Active in dev mode on every page

**Overlay capabilities:**
- Right-click any element to flag 10 violation types: `wrong_button`, `bg_white`, `card_trap`, `wrong_text_hierarchy`, `hardcoded_color`, `arbitrary_spacing`, `missing_token`, `wrong_component`, `inconsistent_pattern`, `other`
- Auto-generates element selectors and labels
- Screenshot capture with element highlighting
- Stats badge showing open violation count

**Inbox capabilities:**
- Status workflow: open → in_progress → fixed
- Screenshot upload to Supabase storage
- Filterable by status

**Key files:**
- Overlay: `frontend/src/components/dev/design-violation-overlay.tsx`
- API: `frontend/src/app/api/dev/violations/route.ts`
- Inbox page: `frontend/src/app/(main)/design-violations/page.tsx`

**Table:** `design_violations`

---

## 10. Procore Crawl & Parity System

**What it is:** A suite of tools for crawling the live Procore application, capturing screenshots and structured data, and tracking feature parity between Procore and Alleato.

**URLs:**
- Tool registry: `/procore-tools`
- Feature parity tracker: `/procore-tracker`
- Feature detail: `/procore-tracker/{featureId}`
- Crawled pages browser: `/crawled-pages`
- Support articles: `/support-articles`
- Procore docs browser: `/procore-docs`

**Crawler scripts:** `scripts/screenshot-capture/`, `scripts/playwright-crawl/`
- All crawlers use automatic authentication from `.env` (PROCORE_USER/PROCORE_PASSWORD)
- Capture screenshots, DOM structure, form fields, and action buttons
- Generate structured manifests at `.claude/procore-manifests/{tool-slug}/manifest.json`

**Tables:** `procore_tools`, `procore_features`, `procore_components`, `procore_modules`, `procore_pages`, `procore_screenshots`, `procore_capture_sessions`, `app_parity_checks`, `app_functional_capabilities`, `app_crawl_sessions` (18 tables total)

**Support articles:** Procore help articles scraped, chunked, and embedded for RAG search. Tables: `support_articles`, `support_article_chunks`

---

## 11. Database Explorer (Admin)

**What it is:** A generic admin interface that can browse, view, create, and edit records in any Supabase table. Auto-generates forms from column metadata.

**URLs:**
- Tables directory: `/tables-directory`
- Table listing: `/tables`
- Table view: `/tables/{table}`
- Record detail: `/tables/{table}/{recordId}`
- New record: `/tables/{table}/new`
- Database admin: `/database`

**Capabilities:**
- Auto-generated forms (AutoForm) supporting 12+ input types
- Column picker for visibility toggle
- View switcher: table, list, gallery, grid
- Pagination with record counts
- Mode-based submit (Create vs Save)
- Nullable and readonly field indicators

**Key files:**
- Shell: `frontend/src/components/admin/table-explorer/TableExplorerShell.tsx`
- AutoForm: `frontend/src/components/admin/table-explorer/AutoForm.tsx`
- ViewSwitcher: `frontend/src/components/admin/table-explorer/ViewSwitcher.tsx`
- ColumnPicker: `frontend/src/components/admin/table-explorer/ColumnPicker.tsx`

---

## 12. Design System & Style Guide

**What it is:** A comprehensive design system with enforced tokens, golden examples, component library, and ESLint rules that block the build on violations.

**URLs:**
- Design system reference: `/design-system`
- Design system migration: `/design-system-update`
- Style guide: `/style-guide`
- Component browser: `/components`
- Data table template: `/template/data-table`
- Form template: `/template/form-standard`
- Form template v2: `/template/form-template`
- Project-level design system: `/{projectId}/design-system`

**Key docs:**
- Full reference: `docs/design/DESIGN.md`
- Tokens: `docs/design/tokens.md`
- Golden examples: `frontend/src/components/ds/GOLDEN-EXAMPLES.tsx`

**ESLint enforcement (3 rules as ERRORS):**
- `design-system/no-hardcoded-colors`
- `design-system/no-arbitrary-spacing`
- `design-system/require-semantic-colors`

**Component libraries:**
- `@/components/ui/` — Pure shadcn base primitives
- `@/components/ds/` — Custom design system components (StatusBadge, KpiBlock, DataTable, SectionHeader, AvatarStack, EmptyState, Eyebrow, etc.)
- `@/components/layout/` — PageShell, PageContainer, ProjectPageHeader

---

## 13. Company Knowledge Base

**What it is:** A knowledge management system for storing company-level information, articles, and documents that feed into the RAG pipeline.

**URLs:**
- Knowledge base: `/knowledge`
- Company info admin: `/admin/company-info` (3 tabs: Company Profile, Knowledge Articles, Documents)

**Capabilities:**
- 9 company profile fields
- 8 knowledge article categories
- File upload with progress tracking
- File upload ingested through RAG pipeline into `document_chunks` with source_type='knowledge'
- Searchable via `search_document_chunks_by_category` RPC (replaces deprecated `search_knowledge_base`)

**Tables:** `document_metadata` (category='knowledge'), `document_chunks` (source_type='knowledge'), `company_context`

---

## 14. Financial Modeling (FM Global)

**What it is:** A specialized system for fire protection/sprinkler financial modeling with optimization rules, cost factors, and global reference tables.

**URLs:**
- FM Global home: `/fm-global`
- Reference tables: `/fm-global/fm_global_tables`
- Form interface: `/fm-global/form`

**Capabilities:**
- Sprinkler requirement calculations (`interpolate_sprinkler_requirements` RPC)
- Optimization suggestions (`generate_optimization_recommendations`, `generate_optimizations`)
- Cost factor analysis
- Global reference library with vector search (`hybrid_search_fm_global`)
- Form submission tracking

**Tables:** `fm_documents`, `fm_sections`, `fm_blocks`, `fm_form_submissions`, `fm_text_chunks`, `fm_table_vectors`, `optimization_rules`, `fm_optimization_rules`, `fm_optimization_suggestions`, `cost_factors`, `fm_cost_factors` (12 tables)

---

## 15. Notification System

**What it is:** A backend notification system that supports multiple alert types and delivery channels.

**Supported notification kinds:**
- `$budgetAlert` — Budget threshold alerts
- `$deadline` — Deadline reminders
- `$criticalIssue` — Critical issue notifications
- `$weeklyDigest` — Weekly summary digests

**File:** `frontend/src/app/api/notifications/trigger/route.ts`

**Tables:** `user_email_notifications`, `user_schedule_notifications`

---

## 16. Command Center

**What it is:** An operations command center page for monitoring project activity.

**URL:** `/command-center`

**File:** `frontend/src/app/(other)/command-center/page.tsx`

---

## 17. Team Chat

**What it is:** Internal team messaging system.

**URL:** `/team-chat`

**File:** `frontend/src/app/(other)/team-chat/page.tsx`

**Table:** `team_chat_messages`

---

## 18. Meeting Prep (AI-Generated)

**What it is:** AI-generated meeting preparation documents that synthesize project context, open items, and relevant history before a meeting.

**URL:** `/{projectId}/meetings/{meetingId}/prep`

**Prompt:** `frontend/src/lib/ai/prompts/meeting-prep.ts`

**Data sources:** Meeting history, project status, open RFIs, budget data, recent change events.

---

## 19. Project Health Dashboard

**What it is:** Pre-computed views that aggregate project health metrics for portfolio-level monitoring.

**Views:**
- `project_health_dashboard` — Overall health metrics (budget utilization, overdue tasks, aging RFIs, etc.)
- `project_risk_current` — Current risk snapshot (aging RFIs, overdue tasks, open/critical risks)
- `project_risk_deteriorating` — Projects with worsening risk trends
- `project_activity_view` — Recent project activity
- `project_issue_summary` — Open issue counts

**Used by:** Portfolio dashboard (`/`), AI tools (`getProjectRiskAnalysis`), daily flagging cron.

---

## 20. RAG Evaluation Tool

**What it is:** A tool for evaluating the quality of RAG retrieval — tests whether the right chunks are returned for given queries.

**URL:** `/rag-eval`

**File:** `frontend/src/app/(admin)/rag-eval/page.tsx`

---

## 21. API Documentation Viewer

**What it is:** Auto-generated API documentation with two viewer options.

**URLs:**
- API Docs: `/api-docs`
- ReDoc viewer: `/redoc`
- Docs search: `/api/docs-search`

---

## 22. Developer Utilities

| Tool | URL / Command | Purpose |
|------|--------------|---------|
| Route conflict checker | `/api/dev-tools/check-routes` | Detects Next.js route parameter conflicts |
| Cache clearer | `/api/dev-tools/clear-cache` | Clears Next.js `.next/` cache |
| Type regenerator | `/api/dev-tools/regenerate-types` | Regenerates Supabase TypeScript types |
| Admin status check | `/admin-check` | Verifies current user's admin status |
| Site map | `/site-map` | Complete application sitemap |
| Table V2 demo | `/table-v2` | Next-gen table component experimentation |
| Spreadsheet demo | `/spreadsheet-demo` | Spreadsheet component experimentation |
| Projects table demo | `/projects-table-demo` | Table component demo |
| Stats dashboard | `/stats` | Platform usage statistics |
| Make admin | `/api/dev/make-admin` | Grant admin status (dev only) |

---

## 23. Scheduled Jobs (Cron)

| Job | Schedule | Purpose | File |
|-----|----------|---------|------|
| Memory Decay | Sundays 4am UTC | Reduces confidence on stale AI memories | `api/cron/decay-memories/route.ts` |
| Daily Flags | Daily 6am UTC | Auto-flags budget variance, past-due RFIs, late tasks, stale change events | `api/cron/daily-flags/route.ts` |

**Config:** `vercel.json` → `crons` array

**Auth:** `CRON_SECRET` bearer token (set in Production, Preview, Development on Vercel)

---

## 24. Pre-Commit Hooks & Code Quality

**What it is:** Husky pre-commit hooks that enforce code quality and project organization rules.

| Hook | What it does |
|------|-------------|
| `pre-commit` | Route conflict check + root file guard + lint-staged |
| `pre-commit-docs` | Documentation structure validation |
| `pre-commit-dangerous-patterns` | Catches dangerous code patterns |
| `pre-push` | Pre-push validation |
| `pre-push-verify` | Pre-push verification |
| `post-commit-monitor` | Post-commit monitoring |

**Root file guard:** Blocks commits that add `.md`, `.js`, `.ts`, `.py`, `.sh`, or `.html` to the project root unless on the explicit allowlist (README.md, CLAUDE.md, AGENTS.md, CONTRIBUTING.md, WORKING_CONTEXT.md, DESIGN.md).

**ESLint design system rules (3, all ERRORS):**
- `design-system/no-hardcoded-colors`
- `design-system/no-arbitrary-spacing`
- `design-system/require-semantic-colors`

---

## 25. Teams Conversation Intelligence Compiler

**What it is:** A Python batch service that reads raw Microsoft Teams DM conversations and extracts structured intelligence via LLM — overviews, tasks, risks, decisions, and sentiment. The "digestion layer" between raw message ingestion and anything the AI assistant can actually use.

**Deep-dive doc:** [`docs/features/teams-compiler.md`](./teams-compiler.md)

| Component | File |
|-----------|------|
| Pipeline logic | `backend/src/services/intelligence/teams_compiler.py` |
| LLM client (provider routing, retry) | `backend/src/services/intelligence/client.py` |
| System prompt + JSON schema | `backend/src/services/intelligence/prompts.py` |
| Project inference (fallback) | `backend/src/services/integrations/microsoft_graph/project_inference.py` |

**Model:** gpt-5.5 (upgraded May 2026 — backfill complete, only a few docs/day going forward)

**Run it:** `/run-teams-compiler` (or `/run-teams-compiler 50` for a larger batch)

**Tables written:** `document_metadata` (overview + project attribution), `tasks`, `insights`, `project_insights`, `document_attribution_candidates`

---

## 26. Drawings System

**What it is:** A complete construction drawings management system — upload, versioning, area/set organization, recycle bin, revisions report, and a full PDF viewer with annotation tools and pinned links to RFIs, punch items, and photos.

**URLs:** `/{projectId}/drawings`, `/drawings/sets`, `/drawings/areas`, `/drawings/recycle-bin`, `/drawings/revisions-report`, `/drawings/viewer/[drawingId]`

| Component | File |
|-----------|------|
| Main list | `frontend/src/app/(main)/[projectId]/drawings/page.tsx` |
| PDF viewer | `frontend/src/components/drawings/DrawingViewer.tsx` |
| Viewer with comments | `frontend/src/components/drawings/DrawingViewerWithComments.tsx` |
| Upload dialog | `frontend/src/components/drawings/DrawingUploadDialog.tsx` |
| Link pin modal | `frontend/src/components/drawings/LinkPinModal.tsx` |
| Filename parser | `frontend/src/lib/drawings/drawing-identity.ts` |
| Email subscriptions | `frontend/src/app/api/projects/[projectId]/drawings/subscribe/route.ts` |

**Annotation tools:** pen, highlighter, rectangle, arrow, text, eraser, comment, link (via `react-pdf`)

**Link pins:** Drawings pins can be linked to RFIs, punch items, photos, and new records via `LinkPinModal`.

**Tables:** `drawings`, `drawing_areas`, `drawing_sets`, `drawing_markup_pins`

---

## 27. Live Cursors (Real-Time Presence)

**What it is:** Multiplayer cursor tracking — shows other users' cursor positions in real-time while viewing the same project entity. Uses Supabase Realtime broadcast channels with 50ms throttle. Opt-in per user via localStorage toggle.

| Component | File |
|-----------|------|
| Cursor renderer | `frontend/src/components/live-cursors/LiveCursors.tsx` |
| Lower-level implementation | `frontend/src/components/realtime-cursors.tsx` |
| Broadcast hook | `frontend/src/hooks/use-realtime-cursors.ts` |
| Opt-in toggle | `frontend/src/hooks/use-live-cursors-enabled.ts` |
| Room ID utility | `frontend/src/lib/liveblocks/rooms.ts` |

**Transport:** Supabase Realtime broadcast (room IDs generated via `rooms.ts` but Liveblocks SDK is not used for cursor transport)

---

## 28. Real-Time Comments (Liveblocks)

**What it is:** Entity-scoped comment threads attachable to any of 20 commentable entity types (RFI, submittal, change order, punch item, drawing, schedule task, budget, etc.) via Liveblocks rooms. Accessible from a slide-in sidebar panel in the page header.

| Component | File |
|-----------|------|
| Sidebar panel | `frontend/src/components/header/comments-sidebar.tsx` |
| Thread UI | `frontend/src/components/comments/entity-comments.tsx` |
| Room ID definitions | `frontend/src/lib/liveblocks/rooms.ts` |

**Room ID format:** `alleato:{entityType}:{entityId}`

**Storage:** Liveblocks-hosted (not Supabase tables)

---

## 29. Photos & Media Upload

**What it is:** Photo management per project with album organization, privacy controls, map pin geotagging, favorites, grid/list view, and upload from device or URL. 20 MB per file limit.

**URL:** `/{projectId}/photos`

| Component | File |
|-----------|------|
| Page | `frontend/src/app/(main)/[projectId]/photos/page.tsx` |
| Upload API | `frontend/src/app/api/projects/[projectId]/photos/upload/route.ts` |
| Hook | `frontend/src/hooks/use-photos.ts` |

**Tables:** `photos` (album, is_private, is_starred, has_location fields)

---

## 30. Scheduling System (Multi-View)

**What it is:** Full project scheduling tool with 5 view modes: Grid (table), Board (Kanban by status), Schedule (split table + Gantt), Timeline (enhanced Gantt), and Calendar (monthly). Supports task CRUD, hierarchy (indent/outdent), context menu, and import/export.

**URL:** `/{projectId}/schedule`

| Component | File |
|-----------|------|
| Page | `frontend/src/app/(main)/[projectId]/schedule/page.tsx` |
| Gantt chart | `frontend/src/components/scheduling/gantt-chart.tsx` |
| View switcher | `frontend/src/components/scheduling/schedule-views.tsx` |
| Task edit modal | `frontend/src/components/scheduling/task-edit-modal.tsx` |
| Import/export | `frontend/src/components/scheduling/import-export-modal.tsx` |
| Context menu | `frontend/src/components/scheduling/task-context-menu.tsx` |

**Tables:** `tasks`

---

## 31. Project Directory

**What it is:** Project-scoped directory listing team members with roles, contact info, and company affiliation. Includes inline role assignment dialog.

**URL:** `/{projectId}/directory`

| Component | File |
|-----------|------|
| Page | `frontend/src/app/(main)/[projectId]/directory/page.tsx` |
| Assign member dialog | `frontend/src/components/domain/directory/AssignMemberDialog.tsx` |

**Tables:** `project_directory`, `people`, `companies`

---

## 32. Company Directory (Global)

**What it is:** Company-level directory with 7 tabs: Companies, Clients, Contacts, Vendors, Prospects, Distribution Groups, and Employees. Separate from per-project directory.

**URLs:** `/directory/companies`, `/directory/clients`, `/directory/contacts`, `/directory/vendors`, `/directory/prospects`, `/directory/groups`, `/directory/employees`

**Key files:** `frontend/src/config/directory-tabs.ts`, `frontend/src/hooks/use-global-project-companies.ts`

**Tables:** `companies`, `people`, `vendors`

---

## 33. Punch List

**What it is:** Punch item tracking with status filtering, assignee management, and a `PunchItemService` server-side service class.

**URL:** `/{projectId}/punch-list`

| Component | File |
|-----------|------|
| Page | `frontend/src/app/(main)/[projectId]/punch-list/page.tsx` |
| API | `frontend/src/app/api/projects/[projectId]/punch-items/route.ts` |
| Service | `frontend/src/services/PunchItemService.ts` |
| Form fields | `frontend/src/components/domain/punch-items/punch-item-form-fields.tsx` |

**Tables:** `punch_items`

---

## 34. Daily Log

**What it is:** Daily field log with date-ordered entries for field conditions, labor, equipment, weather, and notes.

**URL:** `/{projectId}/daily-log`

| Component | File |
|-----------|------|
| Page | `frontend/src/app/(main)/[projectId]/daily-log/page.tsx` |
| Client | `frontend/src/app/(main)/[projectId]/daily-log/daily-log-client.tsx` |

**Tables:** `daily_logs`

---

## 35. Specifications

**What it is:** Specifications browser per project with bell notification/subscription, archive, download, and revision tracking.

**URL:** `/{projectId}/specifications`

**Tables:** `specifications` (or `document_metadata` filtered by type)

---

## 36. Documents (Per-Project)

**What it is:** Project document management with upload dialog, version tracking, folder hierarchy, and download.

**URL:** `/{projectId}/documents`

| Component | File |
|-----------|------|
| Page | `frontend/src/app/(main)/[projectId]/documents/page.tsx` |
| Client | `frontend/src/app/(main)/[projectId]/documents/documents-client.tsx` |
| Upload dialog | `frontend/src/features/documents/document-upload-dialog.tsx` |
| Table config | `frontend/src/features/documents/project-documents-table-config.tsx` |
| Hook | `frontend/src/hooks/use-documents.ts` |

**Tables:** `documents` or `document_metadata`

---

## 37. Emails & Email Attachments (Per-Project)

**What it is:** Project email management — view, compose, send, and delete emails. Includes an `EmailAttachmentsClient` tab for viewing extracted attachment content with an inline PDF viewer.

**URLs:** `/{projectId}/emails`, `/{projectId}/email-attachments`

| Component | File |
|-----------|------|
| Email page | `frontend/src/app/(main)/[projectId]/emails/page.tsx` |
| Email client | `frontend/src/app/(main)/[projectId]/emails/emails-client.tsx` |
| Attachments client | `frontend/src/app/(main)/[projectId]/email-attachments/email-attachments-client.tsx` |
| API | `frontend/src/app/api/projects/[projectId]/emails/route.ts` |
| Compose dialog | `frontend/src/features/emails/email-compose-dialog.tsx` |
| Hook | `frontend/src/hooks/use-emails.ts` |

**Tables:** `project_emails`, `email_attachments`

---

## 38. Transmittals

**What it is:** Formal document transmittal records (cover sheets for sending document packages) with delivery method tracking.

**URL:** `/{projectId}/transmittals`

| Component | File |
|-----------|------|
| Client | `frontend/src/app/(main)/[projectId]/transmittals/transmittals-client.tsx` |
| Table config | `frontend/src/features/transmittals/transmittals-table-config.tsx` |
| Form dialog | `frontend/src/features/transmittals/transmittal-form-dialog.tsx` |
| Hook | `frontend/src/hooks/use-transmittals.ts` |

**Tables:** `transmittals`

---

## 39. Project Home / Command Center

**What it is:** Per-project dashboard showing KPIs, team roster, open RFIs, pending submittals, recent meetings, budget summary, and active commitments. Includes live cursors.

**URL:** `/{projectId}/home`

**Key files:**
- `frontend/src/app/(main)/[projectId]/home/page.tsx`
- `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx`

---

## 40. My Work & Subcontractor Portal

**What it is:** Two connected features for subcontractor access. "My Work" shows the subcontractor's SOV submission status, assigned open RFIs, submittals, and invoice submission link. The standalone invoice submission form is a schedule-of-values-based flow for submitting pay applications.

**URLs:** `/{projectId}/my-work`, `/{projectId}/invoicing/subcontractor/new`

**Tables:** `commitment_ssov_submissions`, `rfis`, `submittals`

---

## 41. Permissions & Access Control System

**What it is:** Granular role-based permission system with templates (None/Read/Write/Admin per module), per-user overrides, and 8 granular capability flags (approve_change_orders, approve_invoices, etc.). Admin UI for setting permissions per project member with full audit log.

**URLs:** `/{projectId}/admin` (Members + Audit Log tabs), `/{projectId}/user-management`

| Component | File |
|-----------|------|
| Types + pure helpers | `frontend/src/lib/permissions-shared.ts` |
| Server-side helpers | `frontend/src/lib/permissions.ts` |
| Hook | `frontend/src/hooks/use-project-permissions.ts` |
| Admin page | `frontend/src/app/(main)/[projectId]/admin/page.tsx` |
| Members tab | `frontend/src/app/(main)/[projectId]/admin/_components/members-tab.tsx` |
| Audit log tab | `frontend/src/app/(main)/[projectId]/admin/_components/audit-log-tab.tsx` |
| Permission gate component | `frontend/src/components/domain/permissions/PermissionGate.tsx` |
| API | `frontend/src/app/api/projects/[projectId]/permissions/route.ts` |
| Audit API | `frontend/src/app/api/projects/[projectId]/permissions/audit/route.ts` |

**Tables:** `permission_templates`, `project_member_permissions`, `permission_audit_log`

---

## 42. Project Intelligence Packet Viewer

**What it is:** Per-project page rendering an AI-compiled intelligence packet: KPI summary, confidence ratings, freshness status (fresh/stale/partial/failed), and typed insight cards (risk, decision, blocker, financial_exposure, schedule_risk, etc.) with evidence citations.

**URL:** `/{projectId}/intelligence`

| Component | File |
|-----------|------|
| Page | `frontend/src/app/(main)/[projectId]/intelligence/page.tsx` |
| Packet service | `frontend/src/lib/ai/intelligence/packet-service.ts` |
| Advisor synthesis | `frontend/src/lib/ai/intelligence/advisor-synthesis.ts` |
| Types | `frontend/src/lib/ai/intelligence/types.ts` |

**Tables:** `intelligence_targets`, `intelligence_packets`, `intelligence_packet_cards`, `insight_cards`, `insight_card_evidence`

---

## 43. Ask Alleato Widget (Global Overlay)

**What it is:** A global floating panel (keyboard shortcut `⌘I`) with two tabs: "Feedback" (submits admin feedback) and "Alleato AI" (quick-access chat). Rendered in root layout, hidden on auth pages.

| Component | File |
|-----------|------|
| Root container | `frontend/src/components/ask-alleato/AskAlleatoRoot.tsx` |
| Panel | `frontend/src/components/ask-alleato/AskAlleatoPanel.tsx` |
| Pill trigger | `frontend/src/components/ask-alleato/AskAlleatoPill.tsx` |
| AI tab | `frontend/src/components/ask-alleato/tabs/AskAITab.tsx` |
| Feedback tab | `frontend/src/components/ask-alleato/tabs/FeedbackTab.tsx` |

---

## 44. AI Chat Sidebar (Inline)

**What it is:** A collapsible right-side chat panel embedded inside the main app layout — not the full `/ai-assistant` page. Uses the same `/api/ai-assistant/chat` endpoint. Toggled via a BrainCircuit icon in the header.

| Component | File |
|-----------|------|
| Sidebar component | `frontend/src/components/ai-assistant/ai-chat-sidebar.tsx` |
| Zustand store | `frontend/src/lib/stores/ai-chat-sidebar-store.ts` |

---

## 45. AI Conversation History Panel

**What it is:** Left-side conversation history panel in the full `/ai-assistant` page. Lists past conversations, supports rename, delete, and new conversation creation.

| Component | File |
|-----------|------|
| Sidebar | `frontend/src/components/ai-assistant/conversation-sidebar.tsx` |
| Hook | `frontend/src/hooks/use-rag-conversations.ts` |

**Tables:** `rag_conversations`

---

## 46. AI Tool Trace Panel

**What it is:** Collapsible debug panel rendered below AI messages in the chat UI showing the full tool call trace: tool name, input, output, error, and timestamp for each step.

**File:** `frontend/src/components/ai-assistant/trace-panel.tsx`

---

## 47. AI Intent Router

**What it is:** Classifies incoming chat messages into one of 12 intent categories (target_briefing, financial_analysis, risk_review, source_lookup, app_help, general_conversation, etc.) and routes them to the packet-first or tool-first code path.

**File:** `frontend/src/lib/ai/intent-router.ts`

---

## 48. AI Provider Routing

**What it is:** Configurable decision layer that determines which AI provider path to use for tool-calling: `ai_sdk_gateway_openai`, `ai_sdk_direct_openai`, or `raw_openai`. Supports env-variable overrides and a kill-switch to disable streaming tools.

**File:** `frontend/src/lib/ai/provider-routing.ts`

---

## 49. AI Agent Learning System

**What it is:** Stores "learnings" from thumbs-down feedback, admin feedback, and eval failures as vectorized prevention prompts. Injects semantically relevant learnings into the system context at the start of each session. Tracks usage outcomes to measure effectiveness.

**File:** `frontend/src/lib/ai/services/agent-learning-service.ts`

**Tables:** `agent_learnings`, `agent_learning_usages`

---

## 50. AI Tool Guardrails / Scope Enforcement

**What it is:** Security layer for all AI tools. Loads the user's allowed project and company IDs, enforces project access, and applies pinned project context so tools never return data outside the user's permission scope.

**File:** `frontend/src/lib/ai/tools/guardrails.ts`

---

## 51. AI Web Search (Tavily)

**What it is:** Real-time web search capability available to the VP BD agent and Strategist for competitive intelligence, industry trends, and questions requiring current external knowledge.

**File:** `frontend/src/lib/ai/tools/web-search.ts`

**Env:** `TAVILY_API_KEY`

---

## 52. AI MCP Tool Bridge

**What it is:** Dynamically loads tool sets from external MCP servers. The official Excalidraw MCP App server at `https://mcp.excalidraw.com/mcp` is enabled by default with a precise diagram-tool allowlist; additional servers can be configured via `AI_ASSISTANT_MCP_SERVERS`. Generic MCP servers filter out dangerous mutation tools by pattern matching — read-only tools are allowed; write/delete tools are blocked unless an explicit per-server `allowedTools` list is configured.

**File:** `frontend/src/lib/ai/tools/mcp-tools.ts`

---

## 53. Tavus AI Video Avatar

**What it is:** Live video conversation with a Tavus AI persona ("Ava"). Creates a Tavus conversation via API and opens the video room in a new tab.

**URL:** `/ai-avatar`

| Component | File |
|-----------|------|
| Page | `frontend/src/app/(main)/ai-avatar/page.tsx` |
| Avatar component | `frontend/src/components/ai-assistant/tavus-avatar-page.tsx` |
| API | `frontend/src/app/api/ai-assistant/avatar/conversation/route.ts` |

**Env:** `TAVUS_API_KEY`, `TAVUS_PERSONA_ID`, `TAVUS_REPLICA_ID`

---

## 54. Welcome Onboarding Flow

**What it is:** Multi-step modal dialog auto-shown on first visit (localStorage-gated, suppressed for subcontractors). Shows momentum stats and mission statement in two steps: IntroFeedbackStep and MissionStep.

| Component | File |
|-----------|------|
| Container | `frontend/src/components/onboarding/WelcomeOnboarding.tsx` |
| Step 1 | `frontend/src/components/onboarding/steps/IntroFeedbackStep.tsx` |
| Step 2 | `frontend/src/components/onboarding/steps/MissionStep.tsx` |
| Copy | `frontend/src/lib/onboarding/copy.ts` |

---

## 55. Microsoft Graph Integration (Outlook + Teams + OneDrive)

**What it is:** Python backend service that syncs emails (with attachment extraction), Teams channel messages and DM chats, and OneDrive/SharePoint files into the RAG pipeline. Uses delta token-based incremental sync and auto-assigns documents to projects via `ProjectAssigner`.

| Component | File |
|-----------|------|
| OAuth2 client | `backend/src/services/integrations/microsoft_graph/client.py` |
| Sync orchestrator | `backend/src/services/integrations/microsoft_graph/sync.py` |
| Outlook ingestion | `backend/src/services/integrations/microsoft_graph/outlook.py` |
| Teams ingestion | `backend/src/services/integrations/microsoft_graph/teams.py` |
| OneDrive ingestion | `backend/src/services/integrations/microsoft_graph/onedrive.py` |
| Chunking + embedding | `backend/src/services/integrations/microsoft_graph/embed.py` |
| Project inference | `backend/src/services/integrations/microsoft_graph/project_inference.py` |
| Project assigner | `backend/src/services/ingestion/project_assignment.py` |

**Env:** `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`, `COMPANY_EMAIL_DOMAINS`

**Tables:** `project_emails`, `email_attachments`, `document_metadata`, `document_chunks`, `graph_sync_state`

**Note:** Teams DM ingestion feeds the Teams Compiler (item #25). Emails feed the Emails per-project view (item #37).

---

## 56. Acumatica Mirror Sync & Outbound Write

**What it is:** Full two-directional Acumatica ERP sync. Inbound: cron-scheduled mirror that pulls vendors, customers, invoices, payments, bills, purchase orders, subcontracts, and project budgets into `acumatica_*` tables (incremental via `LastModifiedDateTime`). Outbound: projects vendors/AR data back into Supabase for use by the rest of the app.

**Note:** The AI tools for Acumatica are documented in item #6. This entry covers the sync engine.

| Component | File |
|-----------|------|
| REST client | `frontend/src/lib/acumatica/client.ts` |
| Mirror sync engine | `frontend/src/lib/acumatica/mirror-sync.ts` |
| Projection layer | `frontend/src/lib/acumatica/sync-service.ts` |
| Cron endpoint | `frontend/src/app/api/cron/acumatica-sync/route.ts` |
| Sync log viewer | `frontend/src/app/(admin)/acumatica-sync-logs/page.tsx` |

**Tables:** `acumatica_*` mirror tables (11+), `acumatica_sync_state`, `acumatica_outbound_audit`

**Critical:** Never use OData `$filter` — causes HTTP 500. Filter in-memory. Only safe OData params: `$select`, `$top`, `$expand`.

---

## 57. Guardrails Framework (API + External Calls)

**What it is:** Shared wrapper system for all API routes and external HTTP calls. `withApiGuardrails` standardizes error envelopes, request ID propagation, and observability. `fetchWithGuardrails` adds timeout, retry, and structured error output to all outbound HTTP calls.

| Component | File |
|-----------|------|
| API wrapper | `frontend/src/lib/guardrails/api.ts` |
| Error class | `frontend/src/lib/guardrails/errors.ts` |
| Error catalog | `frontend/src/lib/guardrails/error-catalog.ts` |
| Observability | `frontend/src/lib/guardrails/observability.ts` |
| Fetch with policy | `frontend/src/lib/guardrails/dependency.ts` |
| Public API | `frontend/src/lib/fetch-with-guardrails.ts` |
| Auth guard | `frontend/src/lib/supabase/auth-guard.ts` |

---

## 58. Annotation Inbox (Agentation Dev Tool)

**What it is:** Admin inbox for dev-time visual annotations captured by the `agentation` toolbar widget. Annotations can be dispatched to AI agents (Codex/Claude Code) with verification checklists and comment threads.

**URL:** `/annotation-inbox`

| Component | File |
|-----------|------|
| Inbox page | `frontend/src/app/(admin)/annotation-inbox/page.tsx` |
| Webhook receiver | `frontend/src/app/api/agentation/route.ts` |
| Toolbar widget | `frontend/src/components/dev/UnifiedFeedbackWidget.tsx` |
| Theme sync | `frontend/src/components/dev/AgentationThemeSync.tsx` |
| Dev auto-fill | `frontend/src/components/dev/DevAutoFillForms.tsx` |

**Tables:** `agentation_annotations`, `agentation_annotation_comments`

---

## 59. Procore Reference Panel (Dev Sidebar)

**What it is:** Dev-only slide-in panel accessible from any page showing Procore screenshots, specs, schema, gaps analysis, feedback, debug info, annotations, and comments for the current tool. Used during parity development.

| Component | File |
|-----------|------|
| Panel | `frontend/src/components/header/procore-reference-panel.tsx` |
| Tab components | `frontend/src/components/dev-panel/` (AnnotationsTab, ChatTab, CommentsTab, DebugTab, FeedbackTab, GapsTab, SchemaTab, ScreenshotsTab, SpecTab) |
| Store | `frontend/src/lib/stores/procore-panel-store.ts` |

---

## 60. What's New / Changelog

**What it is:** Searchable, filterable release notes page with categorized entries (new/improved/fixed/coming-soon) across 7 areas: ai, financial, operations, ui, infrastructure, integrations, security.

**URL:** `/updates`

**File:** `frontend/src/app/(admin)/updates/page.tsx`

---

## 61. Help Article System

**What it is:** Controlled help documentation backed by Markdown files in `docs/help/articles/`. Articles have frontmatter with `title`, `description`, `audience` (internal/client/subcontractor/admin), and `visibility` (draft/published/internal/archived). Searchable by the AI's app-help tool.

| Component | File |
|-----------|------|
| Article loader | `frontend/src/lib/help-articles.ts` |
| Visibility policy | `frontend/src/lib/help-visibility.ts` |
| Actionable shortcuts | `frontend/src/lib/help-actions.ts` |
| AI tool | `frontend/src/lib/ai/tools/app-help-tools.ts` |
| Article files | `docs/help/articles/` |

---

## 62. Live Component Gallery & Design Lab

**What it is:** Three dev/admin pages for component exploration. `/design` is a live interactive component gallery with 20+ sections. `/design-ideas` is a design exploration sandbox with morphing dialogs, animated lists, marquee, motion tabs, and text effects. `/motion` hosts advanced motion component demos.

**URLs:** `/design`, `/design-ideas`, `/motion`

| Component | File |
|-----------|------|
| Gallery | `frontend/src/app/(admin)/design/page.tsx` |
| Design ideas | `frontend/src/app/(admin)/design-ideas/page.tsx` |
| Motion demos | `frontend/src/app/(admin)/motion/page.tsx` |
| Motion components | `frontend/src/components/motion/` |

---

## 63. Subcontractor Navigation Mode

**What it is:** A distinct sidebar navigation mode that activates when `user_type = 'subcontractor'`. Replaces the full Financial/Operations sidebar with a simplified group showing only: My Work, My Schedule of Values, Submit Invoice, RFIs, Submittals, and Documents.

**Key files:**
- `frontend/src/lib/navigation-config.ts` — `subcontractorTools` array, `subcontractorSidebarGroup`
- `frontend/src/components/app-sidebar.tsx`


1. [AI Assistant (C-Suite Multi-Agent Chat)](#1-ai-assistant-c-suite-multi-agent-chat)
2. [RAG Pipeline & Semantic Search](#2-rag-pipeline--semantic-search)
3. [AI Action Tools (Write Layer)](#3-ai-action-tools-write-layer)
4. [AI Memory System](#4-ai-memory-system)
5. [Proactive Daily Flagging (Cron)](#5-proactive-daily-flagging-cron)
6. [Acumatica ERP Integration](#6-acumatica-erp-integration)
7. [Fireflies Meeting Ingestion](#7-fireflies-meeting-ingestion)
8. [Client Feedback Inbox](#8-client-feedback-inbox)
9. [Design Violation Tracker](#9-design-violation-tracker)
10. [Procore Crawl & Parity System](#10-procore-crawl--parity-system)
11. [Database Explorer (Admin)](#11-database-explorer-admin)
13. [Company Knowledge Base](#13-company-knowledge-base)
14. [Financial Modeling (FM Global)](#14-financial-modeling-fm-global)
15. [Notification System](#15-notification-system)
16. [Command Center](#16-command-center)
17. [Team Chat](#17-team-chat)
18. [Meeting Prep (AI-Generated)](#18-meeting-prep-ai-generated)
19. [Project Health Dashboard](#19-project-health-dashboard)
20. [RAG Evaluation Tool](#20-rag-evaluation-tool)
21. [API Documentation Viewer](#21-api-documentation-viewer)
22. [Developer Utilities](#22-developer-utilities)
23. [Scheduled Jobs (Cron)](#23-scheduled-jobs-cron)
24. [Pre-Commit Hooks & Code Quality](#24-pre-commit-hooks--code-quality)
25. [Teams Conversation Intelligence Compiler](#25-teams-conversation-intelligence-compiler)
26. [Drawings System](#26-drawings-system)
27. [Live Cursors (Real-Time Presence)](#27-live-cursors-real-time-presence)
28. [Real-Time Comments (Liveblocks)](#28-real-time-comments-liveblocks)

36. [Documents (Per-Project)](#36-documents-per-project)
37. [Emails & Email Attachments (Per-Project)](#37-emails--email-attachments-per-project)

39. [Project Home / Command Center](#39-project-home--command-center)
40. [My Work & Subcontractor Portal](#40-my-work--subcontractor-portal)
41. [Permissions & Access Control System](#41-permissions--access-control-system)
42. [Project Intelligence Packet Viewer](#42-project-intelligence-packet-viewer)
43. [Ask Alleato Widget (Global Overlay)](#43-ask-alleato-widget-global-overlay)
44. [AI Chat Sidebar (Inline)](#44-ai-chat-sidebar-inline)
45. [AI Conversation History Panel](#45-ai-conversation-history-panel)
46. [AI Tool Trace Panel](#46-ai-tool-trace-panel)
47. [AI Intent Router](#47-ai-intent-router)
48. [AI Provider Routing](#48-ai-provider-routing)
49. [AI Agent Learning System](#49-ai-agent-learning-system)
50. [AI Tool Guardrails / Scope Enforcement](#50-ai-tool-guardrails--scope-enforcement)
51. [AI Web Search (Tavily)](#51-ai-web-search-tavily)
52. [AI MCP Tool Bridge](#52-ai-mcp-tool-bridge)
53. [Tavus AI Video Avatar](#53-tavus-ai-video-avatar)
54. [Welcome Onboarding Flow](#54-welcome-onboarding-flow)
55. [Microsoft Graph Integration (Outlook + Teams + OneDrive)](#55-microsoft-graph-integration-outlook--teams--onedrive)
56. [Acumatica Mirror Sync & Outbound Write](#56-acumatica-mirror-sync--outbound-write)
57. [Guardrails Framework (API + External Calls)](#57-guardrails-framework-api--external-calls)
58. [Annotation Inbox (Agentation Dev Tool)](#58-annotation-inbox-agentation-dev-tool)
59. [Procore Reference Panel (Dev Sidebar)](#59-procore-reference-panel-dev-sidebar)
60. [What's New / Changelog](#60-whats-new--changelog)
61. [Help Article System](#61-help-article-system)
62. [Live Component Gallery & Design Lab](#62-live-component-gallery--design-lab)
63. [Subcontractor Navigation Mode](#63-subcontractor-navigation-mode)


1. [AI Assistant (C-Suite Multi-Agent Chat)](#1-ai-assistant-c-suite-multi-agent-chat)
2. [RAG Pipeline & Semantic Search](#2-rag-pipeline--semantic-search)
3. [AI Action Tools (Write Layer)](#3-ai-action-tools-write-layer)
4. [AI Memory System](#4-ai-memory-system)
58. [Annotation Inbox (Agentation Dev Tool)](#58-annotation-inbox-agentation-dev-tool)
55. [Microsoft Graph Integration (Outlook + Teams + OneDrive)](#55-microsoft-graph-integration-outlook--teams--onedrive)
56. [Acumatica Mirror Sync & Outbound Write](#56-acumatica-mirror-sync--outbound-write)
57. [Guardrails Framework (API + External Calls)](#57-guardrails-framework-api--external-calls)
51. [AI Web Search (Tavily)](#51-ai-web-search-tavily)
52. [AI MCP Tool Bridge](#52-ai-mcp-tool-bridge)
53. [Tavus AI Video Avatar](#53-tavus-ai-video-avatar)
49. [AI Agent Learning System](#49-ai-agent-learning-system)
47. [AI Intent Router](#47-ai-intent-router)
42. [Project Intelligence Packet Viewer](#42-project-intelligence-packet-viewer)
40. [My Work & Subcontractor Portal](#40-my-work--subcontractor-portal)
