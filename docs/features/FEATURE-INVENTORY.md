# Alleato PM — Development Feature Inventory

> **Last updated:** March 26, 2026
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
- Searchable via RAG: `search_knowledge_base` RPC

**Tables:** `company_knowledge`, `company_context`

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
