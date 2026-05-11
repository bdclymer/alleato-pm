# PRP: CMO Agent Phase 1

**Feature:** CMO specialist agent for weekly content planning and marketing execution
**Deliverable:** Phase 1 CMO agent that turns project wins, owner updates, leadership thoughts, and market context into a reviewable weekly content calendar plus draft content assets
**Confidence Score:** 8/10
**Status:** Ready for implementation planning, pending Linear issue creation and Supabase typegen recovery

---

## Goal

### Feature Goal

Add a dedicated CMO specialist to the Alleato AI C-Suite so the assistant can reason about brand, reputation, thought leadership, content strategy, campaign opportunities, and marketing execution without burying those responsibilities inside VP of Business Development.

The CMO should not start as a generic content bot. Phase 1 should implement one concrete business workflow:

1. Gather recent project wins, owner updates, leadership notes, uploaded marketing documents, and relevant market signals.
2. Propose a weekly content calendar.
3. Draft platform-specific content assets.
4. Save the calendar and drafts outside chat so they can be reviewed, edited, reused, and measured.

### Phase 1 Deliverable

Implement a narrow, durable CMO workflow:

- Add a `cmo` specialist agent prompt.
- Register `consultCMO` in the C-Suite orchestrator.
- Add marketing-specific tools for source discovery, content calendar creation, and draft generation.
- Create durable Supabase tables for content calendar items, generated assets, marketing intelligence notes, and performance snapshots.
- Add a normal app page for reviewing planned content and generated drafts.
- Add a first validation scenario that proves a user can ask: "Turn recent project wins and owner updates into next week's content calendar."

### Success Definition

Phase 1 is complete when this works end to end:

1. User asks the AI assistant for a weekly marketing plan.
2. The Strategist routes the request to the CMO.
3. The CMO calls tools before making factual claims.
4. The CMO returns a content calendar with sources, rationale, target channel, funnel stage, and review status.
5. Draft content assets are persisted outside chat.
6. The user can open a durable marketing page and review the generated calendar and drafts.
7. The workflow fails loudly if data sources, AI provider config, or persistence fail.

---

## Why

### Business Value

Alleato has project activity, owner updates, meeting transcripts, emails, documents, lessons learned, and leadership ideas that can become high-leverage marketing material. Today that marketing value is trapped in operational systems or chats.

The CMO agent creates:

- A repeatable marketing operating rhythm.
- Less dependence on ad hoc content effort.
- Better conversion of real project wins into case studies, social posts, and thought leadership.
- A bridge between project intelligence and growth execution.
- A durable marketing memory that compounds over time.

### Problems This Solves

1. **Project wins disappear:** Completed milestones and owner praise are not automatically turned into marketing assets.
2. **Marketing remains chat-only:** Ideas and drafts can be generated in chat but are not managed as a workflow.
3. **VP BD scope is overloaded:** Pipeline and pursuit strategy should stay distinct from brand/content/campaign execution.
4. **No source discipline:** Marketing copy risks generic claims unless it cites project, meeting, document, or market sources.
5. **No review workflow:** Generated content needs review states before publishing.
6. **No measurement loop:** Performance data needs somewhere to live so recommendations improve over time.

---

## Scope

### In Scope For Phase 1

- `cmo` agent prompt and type registration.
- `consultCMO` Strategist tool.
- Marketing tool factory, likely `frontend/src/lib/ai/tools/marketing.ts`.
- Durable marketing tables:
  - `marketing_intelligence_items`
  - `marketing_content_calendar_items`
  - `marketing_content_assets`
  - `marketing_performance_snapshots`
- API routes for calendar and asset review.
- App page for reviewing planned content and drafts.
- First workflow: weekly content calendar from internal wins and leadership inputs.
- Browser verification with screenshots for the review page.

### Out Of Scope For Phase 1

- Automatic posting to LinkedIn, email, or social platforms.
- Paid ad campaign management.
- Full competitor crawler.
- Full analytics integration from every platform.
- Automated image generation pipeline.
- Approval routing to external stakeholders.
- Replacing VP BD pipeline and pursuit workflows.

---

## Product Decision

### CMO Should Be Standalone, Not Permanently Combined With VP BD

The existing AI C-Suite architecture notes that CMO may initially be combined with VP BD because the CMO has the lightest data footprint. That is a valid temporary shortcut, but Phase 1 should create the CMO as its own registered specialist.

Reasoning:

- VP BD owns pipeline, client relationships, pursuits, bid/no-bid, and revenue growth.
- CMO owns brand, reputation, content, campaigns, digital presence, and audience development.
- Combining them permanently makes routing muddy and encourages generic "growth" answers.
- A standalone CMO can still share tools with VP BD and project intelligence in Phase 1.

Implementation stance:

- Create `cmo` as a separate agent.
- Let CMO use project, document, web-search, and selected VP BD-style context tools.
- Keep CMO routing keywords focused on brand/content/campaign language.
- Use cross-agent routing for strategic growth questions that need both VP BD and CMO.

---

## Current Repo Context

### Canonical Source Docs

- `docs/issues/CMO-AGENT.md` is the canonical CMO scope document.
- `docs/ai-plan/AI-CSUITE-ARCHITECTURE.md` defines the executive-team model and includes CMO as brand/reputation/marketing strategy/thought leadership.
- `docs/ai-plan/notebooklm-marketing-accounting-upload/00-README.md` explicitly says the marketing/CMO agent is mostly planned, not fully implemented.
- `docs/ai-plan/notebooklm-marketing-accounting-upload/01-EPISODE-FOCUS-MARKETING-ACCOUNTING.md` recommends the first pilot: turn project wins, owner updates, or leadership thoughts into a weekly content calendar and content drafts.

### Current AI Implementation

Relevant files:

- `frontend/src/lib/ai/orchestrator.ts`
- `frontend/src/lib/ai/agents/types.ts`
- `frontend/src/lib/ai/agents/strategist.ts`
- `frontend/src/lib/ai/agents/cfo.ts`
- `frontend/src/lib/ai/agents/coo.ts`
- `frontend/src/lib/ai/agents/cro.ts`
- `frontend/src/lib/ai/agents/chro.ts`
- `frontend/src/lib/ai/agents/vpbd.ts`
- `frontend/src/lib/ai/tools/project-tools.ts`
- `frontend/src/lib/ai/tools/web-search.ts`
- `frontend/src/lib/ai/tools/document-intelligence.ts`
- `frontend/src/lib/ai/providers.ts`
- `frontend/src/lib/ai/provider-config.ts`
- `frontend/src/app/api/ai-assistant/chat/route.ts`
- `frontend/src/app/api/ai-assistant/chat/handler-v2.ts`

Current facts from code inspection:

- `orchestrator.ts` already registers `cfo`, `coo`, `cro`, `chro`, and `vpbd`.
- Each specialist uses an `AgentConfig` with `systemPrompt`, `modelId`, `triggerKeywords`, and optional `createTools`.
- `makeConsultTool` already provides the reusable consult-tool pattern using AI SDK `tool({ inputSchema, execute })`.
- Specialist calls use AI SDK `ToolLoopAgent` with `stopWhen: stepCountIs(5)`.
- `providers.ts` currently defaults to direct OpenAI unless `AI_PROVIDER_PATH=vercel_gateway`.
- `provider-config.ts` supports Vercel AI Gateway as an explicit provider path.
- `handler-v2.ts` has `createStrategistTools` wired but the actual `tools` argument is commented out behind a temporary bisect. The main chat route currently calls `handleChatLegacy`.

Implementation implication:

- CMO registration should follow the live `orchestrator.ts` pattern, not older PRP text that says only CFO exists.
- Before testing CMO in chat, confirm whether the active route is legacy or V2 and whether the tool registry is enabled in the path being exercised.
- If the active chat path cannot call consult tools, fix that integration or explicitly scope Phase 1 verification to the path that can.

---

## Database Schema

### Supabase Typegen Status

Required command:

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
```

Current verification attempt on 2026-05-11 failed with:

```text
failed to retrieve generated types: {"message":"{\"code\":\"PGRST002\",\"details\":null,\"hint\":null,\"message\":\"Could not query the database for the schema cache. Retrying.\"}"}
```

The generated type file was restored from `HEAD` after the failed redirect. Implementation must rerun typegen using a temp file first, then replace `frontend/src/types/database.types.ts` only after success.

Safer command pattern:

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > /tmp/database.types.ts
test -s /tmp/database.types.ts
mv /tmp/database.types.ts frontend/src/types/database.types.ts
```

### Current Schema Facts From Last Committed `database.types.ts`

- `projects.id` is `number`; any `project_id` FK must be `INTEGER`.
- `companies.id` is `string`; any `company_id` FK must be `UUID`.
- `people.id` is `string`; any `person_id` FK must be `UUID`.
- `chat_history.id`, `chat_history.session_id`, and `chat_history.user_id` are `string`.
- `documents.project_id` is `number | null`.
- `document_metadata.id` is `string`.
- No obvious dedicated marketing calendar/campaign/content tables exist in the committed generated types.

### New Tables

#### `marketing_intelligence_items`

Stores source-backed marketing opportunities, trends, project wins, owner praise, leadership ideas, competitor observations, and reusable positioning notes.

```sql
CREATE TABLE marketing_intelligence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NULL REFERENCES companies(id),
  project_id INTEGER NULL REFERENCES projects(id),
  source_table TEXT NULL,
  source_id TEXT NULL,
  source_url TEXT NULL,
  source_title TEXT NULL,
  source_date DATE NULL,
  item_type TEXT NOT NULL CHECK (
    item_type IN (
      'project_win',
      'owner_update',
      'leadership_thought',
      'market_trend',
      'competitor_signal',
      'testimonial',
      'case_study_candidate',
      'event_opportunity',
      'campaign_idea'
    )
  ),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  strategic_rationale TEXT NULL,
  recommended_use JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'approved', 'dismissed', 'used')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `marketing_content_calendar_items`

Stores reviewable content plans.

```sql
CREATE TABLE marketing_content_calendar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NULL REFERENCES companies(id),
  project_id INTEGER NULL REFERENCES projects(id),
  campaign_id UUID NULL,
  planned_date DATE NOT NULL,
  channel TEXT NOT NULL CHECK (
    channel IN ('linkedin', 'blog', 'email', 'website', 'case_study', 'video', 'presentation', 'internal')
  ),
  funnel_stage TEXT NOT NULL DEFAULT 'awareness' CHECK (
    funnel_stage IN ('awareness', 'consideration', 'conversion', 'retention', 'reputation')
  ),
  title TEXT NOT NULL,
  angle TEXT NOT NULL,
  target_audience TEXT NULL,
  source_item_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  rationale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'needs_review', 'approved', 'scheduled', 'published', 'archived')
  ),
  owner_user_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `marketing_content_assets`

Stores draft outputs tied to calendar items.

```sql
CREATE TABLE marketing_content_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_item_id UUID NOT NULL REFERENCES marketing_content_calendar_items(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (
    asset_type IN ('linkedin_post', 'blog_outline', 'blog_draft', 'email_draft', 'case_study_outline', 'video_script', 'image_prompt', 'sales_blurb')
  ),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source_citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_notes TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'needs_review', 'approved', 'revision_requested', 'published', 'archived')
  ),
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `marketing_performance_snapshots`

Stores manually entered or eventually synced performance data.

```sql
CREATE TABLE marketing_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NULL REFERENCES marketing_content_assets(id) ON DELETE SET NULL,
  calendar_item_id UUID NULL REFERENCES marketing_content_calendar_items(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  impressions INTEGER NULL,
  engagements INTEGER NULL,
  clicks INTEGER NULL,
  leads INTEGER NULL,
  notes TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Migration requirements:

- Add updated-at triggers using the repo's existing trigger/helper pattern.
- Add indexes on `project_id`, `company_id`, `planned_date`, `status`, and source linkage fields.
- Add RLS or service-role-only access consistent with adjacent AI assistant persistence patterns.
- After migration: run `npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_<name>.sql`.
- Regenerate Supabase types after the migration is applied.

---

## CMO Agent Contract

### Prompt Requirements

Create `frontend/src/lib/ai/agents/cmo.ts`.

The prompt must follow the existing CFO/COO/VPBD structure:

- Identity and domain.
- Analytical lenses.
- Available tools.
- Tool strategy.
- Proactive alerts.
- Hard rules.
- Response style.

CMO analytical lenses:

1. Brand positioning: what Alleato should be known for and why.
2. Project proof: which real work validates the message.
3. Audience fit: owner, developer, architect, subcontractor, recruit, or internal audience.
4. Channel-native execution: LinkedIn, blog, email, website, case study, video, or presentation.
5. Campaign continuity: how one idea becomes a series rather than a one-off post.
6. Measurement loop: what result should be tracked.

Hard rules:

- Always call tools before claiming a project win, client quote, trend, statistic, or recent event.
- Never invent project facts, client praise, dates, dollar values, project names, or performance metrics.
- Every content recommendation must include source rationale.
- Separate draft copy from approved/publishable copy.
- Do not suggest posting externally until the item is reviewed and approved.
- If source data is thin, say exactly what source is missing.

### Routing Keywords

Add CMO keywords in `frontend/src/lib/ai/orchestrator.ts`:

- brand
- marketing
- content
- content calendar
- campaign
- social
- linkedin
- thought leadership
- website
- case study
- testimonial
- newsletter
- audience
- positioning
- reputation
- story
- publish
- announcement
- event
- award

Routing distinction:

- `vpbd`: pursuit, bid, pipeline, client relationship, proposal, go/no-go, revenue growth.
- `cmo`: content, brand, campaign, thought leadership, digital presence, case studies, testimonials.
- Strategic market expansion may consult both.

---

## Tools

Create `frontend/src/lib/ai/tools/marketing.ts`.

Recommended Phase 1 tools:

### `findMarketingSourceCandidates`

Purpose: gather source-backed inputs for a content plan.

Inputs:

- `dateRange?: { start: string; end: string }`
- `projectId?: number`
- `topics?: string[]`
- `sourceTypes?: string[]`

Searches:

- `document_metadata` for owner updates, meeting notes, email/Teams summaries, client praise, milestones, decisions, and project completion signals.
- `documents` for ingested project/company documents.
- `projects` for active/completed project metadata.
- `ai_insights` for notable project or portfolio insights.
- Existing semantic search helpers where available.

Output:

- candidate source items with table, id, title, date, summary, project, confidence, and citation text.

### `createMarketingIntelligenceItem`

Purpose: persist a reusable marketing opportunity or source signal.

Output:

- persisted `marketing_intelligence_items` row.

### `createContentCalendarDraft`

Purpose: persist a week of planned content items.

Input:

- week start date
- content items
- source item references
- rationale

Output:

- inserted `marketing_content_calendar_items` rows.

### `createMarketingContentAsset`

Purpose: persist a draft asset tied to a calendar item.

Input:

- calendar item id
- asset type
- draft body
- citations

Output:

- inserted `marketing_content_assets` row.

### `getMarketingCalendar`

Purpose: retrieve calendar items and assets for review.

Input:

- date range
- status
- project id

Output:

- calendar rows with assets, source citations, and review state.

Implementation rules:

- Use typed Supabase inserts after type regeneration.
- Return structured errors with cause and prevention guidance.
- Do not swallow insert failures.
- Use the repo's `withTrace`/tool tracing conventions if available for tool observability.

---

## App Surface

### Route

Add a durable marketing review surface under the normal app shell:

- `/ai-assistant/marketing`

Do not create a full-bleed experimental page. Use the standard app shell and shared page layout conventions.

Expected page sections:

- Week selector.
- Calendar list grouped by planned date.
- Status filters.
- Draft asset preview.
- Source citations.
- Review actions: approve, request revision, archive.

Use existing shared primitives and app styles. Avoid page-level decorative wrapper cards.

### API Routes

Recommended routes:

- `GET /api/ai-assistant/marketing/calendar`
- `POST /api/ai-assistant/marketing/calendar`
- `PATCH /api/ai-assistant/marketing/calendar/[calendarItemId]`
- `POST /api/ai-assistant/marketing/assets`
- `PATCH /api/ai-assistant/marketing/assets/[assetId]`

Route naming rule:

- Use `[calendarItemId]` and `[assetId]`.
- Never use generic `[id]`.
- Run `npm run check:routes` after creating routes.

---

## Implementation Tasks

### Task 1: Create Linear Issue And Handoff

- Create or link a Linear issue before coding starts.
- Record the Linear issue ID/URL in the handoff intake block.
- Create worker handoff under `docs/ops/handoffs/YYYY-MM-DD-S<session>-cmo-agent.md` if this is run as an implementation session.

### Task 2: Recover Typegen Gate

- Rerun Supabase typegen to a temp file.
- Replace `frontend/src/types/database.types.ts` only after success.
- Document the current PGRST002 failure if still blocked.

### Task 3: Add Migration

- Create migration under `supabase/migrations/`.
- Add the four Phase 1 marketing tables.
- Add indexes, updated-at triggers, and access policy.
- Apply migration.
- Verify with `npm run db:migrations:verify-applied -- supabase/migrations/<file>.sql`.
- Regenerate Supabase types.

### Task 4: Add Marketing Domain Service

Suggested file:

- `frontend/src/lib/ai/services/marketing-service.ts`

Responsibilities:

- Query source candidates.
- Normalize project/document/insight references.
- Persist intelligence items.
- Persist calendar items.
- Persist content assets.
- Fetch calendar review data.

### Task 5: Add Marketing Tools

Suggested file:

- `frontend/src/lib/ai/tools/marketing.ts`

Wire the Phase 1 tools into CMO only at first. Expose to Strategist only if needed for non-agent direct actions.

### Task 6: Add CMO Agent

Suggested file:

- `frontend/src/lib/ai/agents/cmo.ts`

Prompt should enforce source-backed claims, draft-vs-approved distinction, and weekly workflow structure.

### Task 7: Register CMO In Types And Orchestrator

Files:

- `frontend/src/lib/ai/agents/types.ts`
- `frontend/src/lib/ai/orchestrator.ts`

Changes:

- Add `CMO: "cmo"` to `AGENT_NAMES`.
- Add label and description.
- Import `cmoSystemPrompt`.
- Add `cmo` to `agentRegistry`.
- Add `consultCMO` using `makeConsultTool`.
- Add Council Mode roster support automatically through registry.

### Task 8: Add Marketing Review API

Files under:

- `frontend/src/app/api/ai-assistant/marketing/`

Use `withApiGuardrails` and specific route params.

### Task 9: Add Marketing Review Page

Suggested route:

- `frontend/src/app/(main)/ai-assistant/marketing/page.tsx`

Use:

- `ProjectPageHeader` only if project scoped.
- Otherwise use the existing non-project page layout pattern for AI assistant admin/review surfaces.

Page must show persisted content, not only generated chat output.

### Task 10: Add Tests And Verification

Minimum targeted checks:

```bash
npm run check:routes
cd frontend && npm run typecheck
```

Focused unit tests:

- marketing service source normalization
- calendar insert validation
- CMO routing keyword coverage
- API route guardrails

Browser verification:

- Generate or seed a draft calendar item.
- Open `/ai-assistant/marketing`.
- Verify calendar rows, asset preview, source citations, and review actions render.
- Save screenshots under the standard verification artifact path.

---

## First Workflow: Weekly Content Calendar

### User Prompt

> Turn recent project wins, owner updates, and leadership thoughts into next week's content calendar.

### Expected Agent Behavior

1. Strategist routes to CMO via `consultCMO`.
2. CMO calls `findMarketingSourceCandidates`.
3. CMO identifies 3-5 source-backed opportunities.
4. CMO creates 5 calendar items:
   - 2 LinkedIn posts
   - 1 case study outline
   - 1 leadership/thought-leadership post
   - 1 website/newsletter update
5. CMO creates draft assets for at least the LinkedIn posts and case study outline.
6. CMO returns a concise summary with deep links to the marketing review page.

### Output Contract

Each calendar item must include:

- planned date
- channel
- title
- angle
- target audience
- funnel stage
- source citations
- rationale
- review status

Each asset must include:

- asset type
- draft copy
- source citations
- review status
- explicit disclaimer that it is not approved for publishing yet

---

## Known Pitfalls And Prevention

### Supabase Typegen Can Truncate The Generated File

Historical/current failure:

- Direct redirect to `frontend/src/types/database.types.ts` failed while the remote schema cache returned PGRST002.
- The file was truncated to 0 lines and had to be restored from `HEAD`.

Prevention:

- Generate to `/tmp/database.types.ts`.
- Validate it is non-empty.
- Move it into place only after success.

### FK Type Mismatches

Known repo rule:

- `projects.id` is `number`, so marketing `project_id` must be `INTEGER`.
- `companies.id` and `people.id` are UUID strings.

Prevention:

- Read `frontend/src/types/database.types.ts` before writing code.
- Use typed inserts from generated types.

### Route Param Collisions

Known repo rule:

- Never use generic `[id]`.

Prevention:

- Use `[calendarItemId]` and `[assetId]`.
- Run `npm run check:routes`.

### Agent Claims Without Tool Evidence

Risk:

- Marketing content can sound plausible while inventing project wins, client quotes, or market facts.

Prevention:

- CMO prompt must require tool calls before factual claims.
- Assets must store `source_citations`.
- Empty source results must produce a loud "not enough source data" response.

### Chat-Only Output

Risk:

- Generated calendars live only in chat and become hard to reuse.

Prevention:

- CMO tools must persist calendar and asset rows.
- Review page must be part of Phase 1 completion.

### Active Chat Path Ambiguity

Risk:

- `handler-v2.ts` has `tools` commented out and `route.ts` currently calls the legacy handler.

Prevention:

- Verify the active chat path before claiming CMO is reachable from the assistant.
- If needed, enable consult tools in the active path as part of implementation or scope the first test to the path where tools are active.

---

## Validation Gates

### Required Before Coding

- Linear issue exists.
- Supabase typegen succeeds to temp file.
- Implementation owner confirms whether active chat route is legacy or V2.

### Required Before Completion

```bash
npm run check:routes
cd frontend && npm run typecheck
npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_<name>.sql
```

Browser evidence:

- Screenshot of generated calendar review page.
- Screenshot of asset preview with source citations.
- Summary of the prompt used to generate the calendar.

### Fail Loudly Checks

- Missing AI provider key returns a structured provider error.
- Empty source candidates produces a clear "not enough source material" response.
- Failed persistence returns the exact table/action that failed.
- Route param check catches any accidental `[id]` route.
- Migration ledger check proves the database fix is applied, not just written locally.

---

## Recommended Build Sequence

1. Migration and types.
2. Marketing service.
3. Marketing tools.
4. CMO prompt and orchestrator registration.
5. API review routes.
6. Review page.
7. Targeted tests.
8. Browser verification.
9. `codex:finish` on `main` with exact task-owned files.

---

## Open Questions

1. Should Phase 1 content review be restricted to Megan and Brandon only, or visible to all admins?
2. Which channels are real near-term targets: LinkedIn only, or LinkedIn plus website/newsletter?
3. Should source candidates include external market/web search by default, or only when the user asks for market context?
4. What is the preferred approval state name: `approved`, `ready_to_publish`, or `scheduled`?
