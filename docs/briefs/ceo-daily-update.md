# Brandon Daily Update

## Purpose

The Brandon Daily Update is an executive operating brief generated from recent company communication and meeting evidence. It is intended to answer three questions:

1. What needs an owner-level decision or confirmation?
2. What is waiting on another person, vendor, client, or internal team?
3. What broader business signal is worth seeing today?

The current source of truth is the persisted executive briefing draft in `daily_recaps` where `recap_kind = executive_briefing`. The older backend daily digest is a legacy meeting recap stored as `recap_kind = meeting_digest`; it should not be treated as the CEO operating brief.

The main surface is a review and approval page. Teams delivery exists as an explicit send endpoint, but scheduled automatic delivery should still use approved drafts only.

## Primary Entry Points

- Page: `frontend/src/app/(main)/executive/page.tsx`
- Generator: `frontend/src/lib/executive/brandon-daily-update.ts`
- Draft and follow-up workflow: `frontend/src/lib/executive/executive-briefing-workflow.ts`
- Server actions: `frontend/src/app/(main)/actions/executive-briefing-actions.ts`
- API route: `frontend/src/app/api/executive/brandon-daily-update/route.ts`
- Teams send route: `frontend/src/app/api/executive/daily-brief/send-teams/route.ts`
- Source activity component: `frontend/src/components/executive/executive-source-activity.tsx`
- Database migration: `supabase/migrations/20260502013000_executive_briefing_workflow.sql`
- Follow-up migration adjustment: `supabase/migrations/20260502014500_executive_briefing_workflow_followup.sql`

Local page:

```text
http://localhost:3000/executive
```

Manual API route:

```text
http://localhost:3000/api/executive/brandon-daily-update?days=3
http://localhost:3000/api/executive/brandon-daily-update?days=3&fresh=true
```

The API route requires an authenticated user session. By default it returns the persisted draft for the day. Use `fresh=true` only when a caller intentionally wants to regenerate and save a new draft.

## Data Flow

The system has four layers:

1. Retrieve recent source evidence.
2. Synthesize that evidence into executive-readable items.
3. Persist the generated draft and follow-up state.
4. Render the review page and approval controls.

High-level flow:

```text
/executive page
  -> getExecutiveBriefingDashboard({ windowDays: 3 })
    -> load today's executive briefing draft from daily_recaps
    -> if no draft exists, regenerateExecutiveBriefingDraft()
      -> generateBrandonDailyUpdate()
        -> embed query specs
        -> search_document_chunks by source group
        -> load document_metadata attribution
        -> rank, filter, dedupe
        -> synthesize sections with LLM
        -> record source-health warnings
        -> normalize relative dates
      -> save packet to daily_recaps.briefing_packet
      -> upsert executive_briefing_follow_ups
    -> load open follow-ups
    -> split current vs stale carry-forward items
  -> render dashboard sections and approval actions
```

## Retrieval Order

The generator intentionally searches recent raw business sources before broad knowledge. This avoids stale high-similarity memory dominating a daily operating brief.

Retrieval order:

1. Recent email evidence
2. Recent Teams direct and channel messages
3. Recent meeting transcripts and summaries
4. Recent document records fallback
5. Older knowledge only as secondary context

The source groups are defined in `SOURCE_GROUPS` inside `frontend/src/lib/executive/brandon-daily-update.ts`.

Current source filters:

```text
Email:
  email

Teams:
  teams_dm
  teams_channel

Meeting:
  meeting_transcript
  meeting_summary
  meeting_segment_summary
  meeting_section
  meeting_notes
  meeting_summary_embed
```

The RAG RPC used for source chunks is:

```text
search_document_chunks
```

The query arguments are:

```text
query_embedding
filter_source_types
filter_project_id: null
match_count: 10
match_threshold: 0.08
```

After retrieval, candidates are filtered again by:

- text length greater than 30 characters
- source date inside the requested window
- similarity at or above 0.25

## Query Specs

The generator uses several seeded query specs. They are intentionally business-oriented, not generic semantic search prompts.

Current sections:

- `needsBrandon`
- `waitingOnOthers`
- `importantUpdates`

Current query themes:

- insurance, license, COI, or permit blocks
- finance actions Brandon asked about
- access removal or company property recovery
- pricing, quote, proposal, or estimate waiting on someone else
- drawings, survey, or client design decisions pending
- high-priority project or business issue

The query specs live in `QUERY_SPECS` inside `frontend/src/lib/executive/brandon-daily-update.ts`.

## Metadata And Source Attribution

RAG chunk hits are not enough by themselves. The generator loads `document_metadata` rows for matched document IDs so the page can show attribution.

Loaded metadata fields include:

```text
id
title
project
project_id
date
created_at
captured_at
source_system
source
type
category
summary
overview
action_items
content
raw_text
url
source_web_url
fireflies_link
meeting_link
```

Source link priority:

1. `source_web_url`
2. `fireflies_link`
3. `meeting_link`
4. `url`

Only `http` links are rendered as clickable source links. If no link exists, the page falls back to the source ID when available.

Each surfaced item should keep:

- source type
- source title/detail
- source date
- project label
- source URL or source ID
- evidence excerpt

## Synthesis Step

The first implementation surfaced raw RAG excerpts, which produced unclear and sometimes truncated text. The current implementation adds a synthesis pass in `synthesizeSections()`.

The default synthesis model is `gpt-5.5`, set by `DEFAULT_EXECUTIVE_BRIEFING_SYNTHESIS_MODEL` in `frontend/src/lib/executive/brandon-daily-update.ts`. Override it with `EXECUTIVE_BRIEFING_SYNTHESIS_MODEL` only when the CEO brief intentionally needs a different model.

The synthesis model receives the retrieved candidate payload and returns JSON with:

```text
needsBrandon
waitingOnOthers
importantUpdates
```

Each synthesized item must include:

```text
title
summary
bullets
recommendedAction
whyItMatters
sourceIndex
status
tone
```

Rules enforced in the synthesis prompt:

- write as a daily executive business brief
- do not refer to Brandon in the third person
- use direct facts and only use "you" when needed
- turn raw RAG excerpts into clear business insights
- do not copy truncated excerpts
- include concrete names, dates, dollars, quantities, blockers, and commitments when present
- include exact calendar dates when using relative date phrasing
- exclude vague sources
- do not repeat the same source index in multiple sections
- use `needsBrandon` only for owner-level decisions, confirmations, commitments, money/risk issues, or escalations
- use `waitingOnOthers` for project-team, client, vendor, estimating, finance, or design inputs that are pending
- keep titles specific instead of bucket names
- keep bullets short

If the synthesis call fails, the generator returns the pre-synthesis section assignment instead of throwing away the whole brief.

## Relative Date Guardrail

Relative dates reduce trust because a reader may not know whether "next Wednesday" is based on the meeting date, the generation date, or the day they are reading it.

The generator post-processes synthesized text with `expandRelativeWeekdays()`.

It currently normalizes:

- `next Monday`
- `next Tuesday`
- `next Wednesday`
- `next Thursday`
- `next Friday`
- `next Saturday`
- `next Sunday`
- `early next week`
- `next week`

The source item date is the base date. For example, if the source date is April 30, 2026:

```text
next Wednesday
```

becomes:

```text
next Wednesday, May 6th, 2026
```

And:

```text
early next week
```

becomes:

```text
early next week, May 4th-May 6th, 2026
```

This normalization is applied to:

- item summary
- bullets
- recommended action
- why it matters

Known gap: `tomorrow`, `yesterday`, bare weekdays like `Friday`, and phrases like `end of week` are not normalized yet.

## Draft Persistence

The page should not regenerate the live brief on every normal read. The dashboard flow uses `daily_recaps` as the persisted draft store.

The executive briefing draft is stored with:

```text
recap_kind: executive_briefing
recap_date: current Eastern date
date_range_start
date_range_end
recap_text
briefing_packet
workflow_status
approved_at
approved_by
model_used
sent_email
sent_teams
```

`briefing_packet` stores the full `BrandonDailyUpdatePacket`.

For each date, the system loads the latest `daily_recaps` row where:

```text
recap_kind = executive_briefing
recap_date = current Eastern date
```

If no valid packet exists for the day, it regenerates one and saves it.

The draft can be refreshed manually from the page through `regenerateExecutiveBriefingAction()`.

The draft can be approved through `approveExecutiveBriefingAction()`.

Approval sets:

```text
workflow_status: approved
approved_at
approved_by
```

## Follow-Up Queue

The follow-up queue prevents important items from disappearing just because a later retrieval pass ranks something else higher.

Follow-ups are stored in:

```text
executive_briefing_follow_ups
```

Each generated item gets a stable fingerprint built from:

```text
section
title
project
source
sourceId
recommendedAction
```

When a new draft is generated:

1. Current briefing items are fingerprinted.
2. Existing open follow-ups with matching fingerprints are updated.
3. New follow-up rows are inserted.
4. Open follow-ups not present in the current brief become stale carry-forward items.

Follow-up states:

```text
open
resolved
```

Page actions:

- Mark resolved
- Reopen

These call:

```text
resolveExecutiveFollowUpAction()
reopenExecutiveFollowUpAction()
```

## Page Sections

The executive page renders:

- headline summary
- focus panels
- operating posture
- KPI row
- source activity
- automation rule
- stale follow-ups
- critical actions
- unblock your people
- business signal
- retrieval method
- carry-forward rules
- draft workflow

Current section mapping:

```text
needsBrandon -> Critical Actions
waitingOnOthers -> Unblock Your People
importantUpdates -> Business Signal
```

The page is intentionally framed as a review and approval surface. It is not an automatic delivery endpoint; use the Teams send route for explicit delivery.

## API Route

The API route is:

```text
GET /api/executive/brandon-daily-update?days=3
GET /api/executive/brandon-daily-update?days=3&fresh=true
```

Behavior:

- requires an authenticated user
- reads `days` from the query string
- clamps `days` from 1 to 14
- default: calls `getExecutiveBriefingDashboard({ windowDays })` and returns the persisted draft packet as JSON
- with `fresh=true`: calls `regenerateExecutiveBriefingDraft({ windowDays })`, saves the new draft, and returns the new packet as JSON

Use the default behavior for inspection of the current reviewed draft. Use `fresh=true` only for deliberate regeneration.

The widget route at `/api/executive/brandon-daily-update/widget` still returns a packet plus a widget payload for assistant/UI embedding.

## Teams Delivery Route

The Teams send route is:

```text
POST /api/executive/daily-brief/send-teams
```

Behavior:

- authorizes with `CRON_SECRET` bearer auth or an active Supabase session
- resolves the target Teams-linked user from the request body or latest Teams conversation reference
- calls `getExecutiveBriefingDashboard({ windowDays: DEFAULT_EXECUTIVE_WINDOW_DAYS })`
- formats the persisted draft packet into a conversational Teams message
- sends through `sendProactiveMessage()`
- marks the `daily_recaps` executive briefing row as `sent_teams = true`

## Failure And Trust Rules

This brief should fail loudly instead of producing polished but unsupported copy.

Trust requirements for surfaced items:

- source attribution exists
- source date exists
- evidence excerpt exists
- source title/detail is understandable
- synthesized item is specific enough to be useful
- relative dates include calendar dates
- stale broad knowledge does not outrank recent communication and meeting evidence
- source-health warnings are visible in `retrievalNotes` when email, Teams, fallback document, or source-coverage queries fail

The page currently shows an automation rule panel:

```text
Missing source attribution, stale timestamps, or blank evidence should suppress automation and render a visible empty or error state instead of polished copy.
```

## Current Known Gaps

- The generator still has seeded query specs rather than a learned or configurable strategy.
- `search_all_knowledge` is intentionally not leading the retrieval path because it previously surfaced stale high-similarity results.
- Date normalization handles next weekdays and next-week phrases, but not all relative date phrases.
- Source coverage can show zero email or Teams items if the current filtered hits do not pass confidence and recency thresholds.
- The follow-up fingerprint includes title and recommended action, so large wording changes can create a new follow-up instead of updating an existing one.
- The page is approved manually, and Teams delivery exists, but scheduled automatic delivery is not yet wired to approved-only drafts.

## How To Tune The Brief

When the content is wrong or low-value, update the generator in this order:

1. Adjust `QUERY_SPECS` if retrieval is missing the right kind of business item.
2. Adjust source filters in `SOURCE_GROUPS` if the wrong source type is leading.
3. Adjust confidence and recency filters if items are stale or too weak.
4. Adjust the synthesis prompt if retrieved evidence is good but the writing is poor.
5. Adjust normalization helpers if the generated text contains ambiguous dates or vague phrasing.
6. Adjust the page only after the packet data is correct.

Avoid fixing bad content only in the React page. The reusable packet should be high-quality before presentation.

## Verification Checklist

Targeted lint:

```bash
cd frontend
npx eslint 'src/lib/executive/brandon-daily-update.ts' 'src/lib/executive/executive-briefing-workflow.ts' 'src/app/(main)/executive/page.tsx' 'src/app/(main)/actions/executive-briefing-actions.ts' 'src/app/api/executive/brandon-daily-update/route.ts'
```

Manual generator check:

```bash
cd frontend
set -a
source ../.env
set +a
npm exec -- tsx -e "import { generateBrandonDailyUpdate } from './src/lib/executive/brandon-daily-update'; generateBrandonDailyUpdate({ windowDays: 3 }).then((packet) => console.log(JSON.stringify({ counts: { critical: packet.sections.needsBrandon.length, unblocks: packet.sections.waitingOnOthers.length, signals: packet.sections.importantUpdates.length }, generatedAt: packet.generatedAt, notes: packet.retrievalNotes }, null, 2))).catch((error) => { console.error(error); process.exit(1); });"
```

Browser verification:

```text
http://localhost:3000/executive
```

Things to verify visually:

- the page loads with status 200
- the brief reads like a report, not debug output
- each item has source, date, and evidence
- relative dates include actual calendar dates
- source links render when available
- stale carry-forward items are visible when applicable
- approval and follow-up buttons are present

## Future Automation Path

Recommended path before sending this automatically:

1. Keep generating a daily draft.
2. Require manual approval on `/executive`.
3. Store approved packets in `daily_recaps`.
4. Use only approved drafts for delivery.
5. Use the existing Teams send route for approved/manual delivery.
6. Add a scheduled job that sends only if `workflow_status = approved`.

The current design should keep generation separate from delivery so a weak draft cannot silently reach Brandon.
