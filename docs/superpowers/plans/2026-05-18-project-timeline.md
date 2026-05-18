# Project Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `/[projectId]/timeline` page that renders a vertical chronological event stream from 11 sources across the project's Supabase tables.

**Architecture:** A single Supabase view (`project_timeline_events`) aggregates 11 event kinds via UNION ALL. A Next.js server component queries the view, groups results by calendar month, and passes grouped arrays to pure render components. No client state, no API route — single DB round-trip, server render.

**Tech Stack:** Next.js 15 App Router (server components), Supabase PostgreSQL view, TypeScript, Tailwind CSS, shadcn/ui primitives, `@/components/ds` design system.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260518000000_create_project_timeline_view.sql` | Create | SQL view definition |
| `frontend/src/components/project/timeline/timeline-types.ts` | Create | Shared TypeScript types |
| `frontend/src/components/project/timeline/timeline-link.ts` | Create | `kind + entity_id → URL` resolver |
| `frontend/src/components/project/timeline/timeline-event-item.tsx` | Create | Single event row (dot + date + content) |
| `frontend/src/components/project/timeline/timeline-month-group.tsx` | Create | Sticky month header + its event list |
| `frontend/src/components/project/timeline/project-timeline.tsx` | Create | Full timeline: grouping logic + empty state |
| `frontend/src/app/(main)/[projectId]/timeline/page.tsx` | Create | Server page: DB query → ProjectTimeline |

---

## Task 1: SQL Migration — `project_timeline_events` View

**Files:**
- Create: `supabase/migrations/20260518000000_create_project_timeline_view.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260518000000_create_project_timeline_view.sql

CREATE OR REPLACE VIEW project_timeline_events AS

-- Project created
SELECT
  created_at::timestamptz                                     AS occurred_at,
  'project_created'::text                                     AS kind,
  COALESCE(name, 'Project')                                   AS title,
  NULL::text                                                  AS summary,
  stage                                                       AS status,
  id::text                                                    AS entity_id,
  id                                                          AS project_id
FROM projects

UNION ALL

-- Construction start (only when start date is set)
SELECT
  "start date"::timestamptz                                   AS occurred_at,
  'project_start'::text                                       AS kind,
  'Construction start'                                        AS title,
  NULL::text                                                  AS summary,
  stage                                                       AS status,
  id::text                                                    AS entity_id,
  id                                                          AS project_id
FROM projects
WHERE "start date" IS NOT NULL

UNION ALL

-- Meetings (document_metadata where type = 'meeting')
SELECT
  date::timestamptz                                           AS occurred_at,
  'meeting'::text                                             AS kind,
  COALESCE(title, file_name, 'Meeting')                       AS title,
  overview                                                    AS summary,
  NULL::text                                                  AS status,
  id                                                          AS entity_id,
  project_id
FROM document_metadata
WHERE type = 'meeting'
  AND deleted_at IS NULL
  AND date IS NOT NULL
  AND project_id IS NOT NULL

UNION ALL

-- RFIs
SELECT
  COALESCE(date_initiated::timestamptz, created_at::timestamptz) AS occurred_at,
  'rfi'::text                                                 AS kind,
  'RFI #' || number::text || ': ' || LEFT(question, 80)       AS title,
  NULL::text                                                  AS summary,
  status                                                      AS status,
  id                                                          AS entity_id,
  project_id
FROM rfis

UNION ALL

-- Submittals
SELECT
  created_at::timestamptz                                     AS occurred_at,
  'submittal'::text                                           AS kind,
  'Submittal ' || submittal_number || ': ' || title           AS title,
  NULL::text                                                  AS summary,
  status                                                      AS status,
  id                                                          AS entity_id,
  project_id
FROM submittals
WHERE deleted_at IS NULL

UNION ALL

-- Commitments: creation event
SELECT
  created_at::timestamptz                                     AS occurred_at,
  'commitment'::text                                          AS kind,
  COALESCE(title, 'Commitment #' || number)                   AS title,
  NULL::text                                                  AS summary,
  status                                                      AS status,
  id                                                          AS entity_id,
  project_id
FROM commitments

UNION ALL

-- Commitments: execution event (separate row when executed)
SELECT
  executed_date::timestamptz                                  AS occurred_at,
  'commitment_executed'::text                                 AS kind,
  COALESCE(title, 'Commitment #' || number) || ' — executed'  AS title,
  NULL::text                                                  AS summary,
  status                                                      AS status,
  id                                                          AS entity_id,
  project_id
FROM commitments
WHERE executed = true
  AND executed_date IS NOT NULL

UNION ALL

-- Change Events
SELECT
  created_at::timestamptz                                     AS occurred_at,
  'change_event'::text                                        AS kind,
  'CE #' || number || CASE
    WHEN scope IS NOT NULL AND scope <> '' THEN ': ' || LEFT(scope, 80)
    ELSE ''
  END                                                         AS title,
  description                                                 AS summary,
  status                                                      AS status,
  id                                                          AS entity_id,
  project_id
FROM change_events
WHERE deleted_at IS NULL

UNION ALL

-- Change Orders
SELECT
  created_at::timestamptz                                     AS occurred_at,
  'change_order'::text                                        AS kind,
  CASE
    WHEN number IS NOT NULL THEN 'CO #' || number::text || ': ' || title
    ELSE title
  END                                                         AS title,
  description                                                 AS summary,
  status                                                      AS status,
  id                                                          AS entity_id,
  project_id
FROM change_orders

UNION ALL

-- Prime Contracts: creation event
SELECT
  created_at::timestamptz                                     AS occurred_at,
  'prime_contract'::text                                      AS kind,
  'Prime Contract ' || contract_number                        AS title,
  description                                                 AS summary,
  CASE WHEN executed THEN 'executed' ELSE 'draft' END         AS status,
  id                                                          AS entity_id,
  project_id
FROM prime_contracts

UNION ALL

-- Prime Contracts: execution event
SELECT
  executed_at::timestamptz                                    AS occurred_at,
  'prime_contract_executed'::text                             AS kind,
  'Prime Contract ' || contract_number || ' — executed'       AS title,
  NULL::text                                                  AS summary,
  'executed'                                                  AS status,
  id                                                          AS entity_id,
  project_id
FROM prime_contracts
WHERE executed = true
  AND executed_at IS NOT NULL;

-- Grant read access to authenticated users (RLS on underlying tables still applies)
GRANT SELECT ON project_timeline_events TO authenticated;
GRANT SELECT ON project_timeline_events TO anon;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with project_id `lgveqfnpkxvzbnnwuled` and the SQL above.

- [ ] **Step 3: Verify with a test query**

Run via `mcp__claude_ai_Supabase__execute_sql`:
```sql
SELECT kind, COUNT(*) 
FROM project_timeline_events 
WHERE project_id = 67 
GROUP BY kind 
ORDER BY kind;
```
Expected: rows for each kind that has data on project 67 (Vermillion Rise Warehouse). If any kind returns an error instead of 0 rows, the column reference is wrong — fix the SQL and re-apply.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260518000000_create_project_timeline_view.sql
git commit -m "feat(timeline): add project_timeline_events view"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `frontend/src/components/project/timeline/timeline-types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// frontend/src/components/project/timeline/timeline-types.ts

export const TIMELINE_EVENT_KINDS = [
  'project_created',
  'project_start',
  'meeting',
  'rfi',
  'submittal',
  'commitment',
  'commitment_executed',
  'change_event',
  'change_order',
  'prime_contract',
  'prime_contract_executed',
] as const;

export type TimelineEventKind = typeof TIMELINE_EVENT_KINDS[number];

export interface TimelineEvent {
  occurred_at: string;
  kind: TimelineEventKind;
  title: string;
  summary: string | null;
  status: string | null;
  entity_id: string;
  project_id: number;
}

export interface TimelineMonthGroup {
  /** "May 2026" */
  label: string;
  /** ISO string used for sorting — first day of the month */
  monthKey: string;
  events: TimelineEvent[];
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/project/timeline/timeline-types.ts
git commit -m "feat(timeline): add TypeScript types"
```

---

## Task 3: Link Resolver

**Files:**
- Create: `frontend/src/components/project/timeline/timeline-link.ts`

- [ ] **Step 1: Create the link resolver**

```typescript
// frontend/src/components/project/timeline/timeline-link.ts

import type { TimelineEventKind } from './timeline-types';

const KIND_TO_PATH: Partial<Record<TimelineEventKind, string>> = {
  meeting:                    'meetings',
  rfi:                        'rfis',
  submittal:                  'submittals',
  commitment:                 'commitments',
  commitment_executed:        'commitments',
  change_event:               'change-events',
  change_order:               'change-orders',
  prime_contract:             'prime-contracts',
  prime_contract_executed:    'prime-contracts',
  // project_created and project_start intentionally omitted — no detail page
};

export function resolveTimelineLink(
  projectId: number,
  kind: TimelineEventKind,
  entityId: string,
): string | null {
  const path = KIND_TO_PATH[kind];
  if (!path) return null;
  return `/${projectId}/${path}/${entityId}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/project/timeline/timeline-link.ts
git commit -m "feat(timeline): add link resolver"
```

---

## Task 4: TimelineEventItem Component

**Files:**
- Create: `frontend/src/components/project/timeline/timeline-event-item.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/project/timeline/timeline-event-item.tsx

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ds/status-badge';
import { ArrowRight } from 'lucide-react';
import type { TimelineEvent } from './timeline-types';
import type { TimelineEventKind } from './timeline-types';
import { resolveTimelineLink } from './timeline-link';

// Dot color per kind — follows the same pattern as StatusBadge.
// bg-* classes are allowed for data-viz contexts in the ds layer.
const DOT_COLOR: Record<TimelineEventKind, string> = {
  project_created:          'bg-primary',
  project_start:            'bg-primary',
  meeting:                  'bg-muted-foreground',
  rfi:                      'bg-orange-500',
  submittal:                'bg-violet-500',
  commitment:               'bg-green-600',
  commitment_executed:      'bg-green-600',
  change_event:             'bg-amber-500',
  change_order:             'bg-destructive',
  prime_contract:           'bg-blue-600',
  prime_contract_executed:  'bg-blue-600',
};

interface Props {
  event: TimelineEvent;
  isLast: boolean;
}

export function TimelineEventItem({ event, isLast }: Props) {
  const link = resolveTimelineLink(event.project_id, event.kind, event.entity_id);
  const date = new Date(event.occurred_at);
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex gap-3">
      {/* Dot + vertical line */}
      <div className="flex flex-col items-center">
        <span className={cn('mt-1 h-2 w-2 rounded-full shrink-0', DOT_COLOR[event.kind])} />
        {!isLast && <span className="mt-1 w-px flex-1 bg-border" />}
      </div>

      {/* Date */}
      <span className="w-14 shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">
        {dateLabel}
      </span>

      {/* Content */}
      <div className="pb-5 min-w-0">
        <p className="text-sm font-medium leading-snug">{event.title}</p>

        {(event.summary || event.status) && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {event.summary}
            {event.summary && event.status && ' · '}
            {event.status && (
              <StatusBadge status={event.status} className="inline-flex text-[11px] px-1.5 py-0" />
            )}
          </p>
        )}

        {link && (
          <Link
            href={link}
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/project/timeline/timeline-event-item.tsx
git commit -m "feat(timeline): add TimelineEventItem component"
```

---

## Task 5: TimelineMonthGroup Component

**Files:**
- Create: `frontend/src/components/project/timeline/timeline-month-group.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/project/timeline/timeline-month-group.tsx

import type { TimelineMonthGroup } from './timeline-types';
import { TimelineEventItem } from './timeline-event-item';

interface Props {
  group: TimelineMonthGroup;
}

export function TimelineMonthGroupSection({ group }: Props) {
  return (
    <section>
      {/* Sticky month header */}
      <div className="sticky top-0 z-10 bg-background py-2 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            {group.label}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>

      {/* Events */}
      <div>
        {group.events.map((event, i) => (
          <TimelineEventItem
            key={`${event.kind}-${event.entity_id}-${event.occurred_at}`}
            event={event}
            isLast={i === group.events.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/project/timeline/timeline-month-group.tsx
git commit -m "feat(timeline): add TimelineMonthGroup component"
```

---

## Task 6: ProjectTimeline Component

**Files:**
- Create: `frontend/src/components/project/timeline/project-timeline.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/project/timeline/project-timeline.tsx

import { EmptyState } from '@/components/ds';
import { Clock } from 'lucide-react';
import type { TimelineEvent, TimelineMonthGroup } from './timeline-types';
import { TimelineMonthGroupSection } from './timeline-month-group';

interface Props {
  events: TimelineEvent[];
}

function groupByMonth(events: TimelineEvent[]): TimelineMonthGroup[] {
  const map = new Map<string, TimelineMonthGroup>();

  for (const event of events) {
    const d = new Date(event.occurred_at);
    // Key: "YYYY-MM" for sorting
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!map.has(monthKey)) {
      map.set(monthKey, { label, monthKey, events: [] });
    }
    map.get(monthKey)!.events.push(event);
  }

  // Events arrive sorted desc from DB; groups should also be newest-first
  return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export function ProjectTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Clock />}
        title="No events yet"
        description="Events will appear here as the project progresses."
      />
    );
  }

  const groups = groupByMonth(events);

  return (
    <div className="space-y-6 max-w-2xl">
      {groups.map((group) => (
        <TimelineMonthGroupSection key={group.monthKey} group={group} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/project/timeline/project-timeline.tsx
git commit -m "feat(timeline): add ProjectTimeline grouping component"
```

---

## Task 7: Page Component

**Files:**
- Create: `frontend/src/app/(main)/[projectId]/timeline/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// frontend/src/app/(main)/[projectId]/timeline/page.tsx

import { createClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/layout';
import { ProjectTimeline } from '@/components/project/timeline/project-timeline';
import { notFound } from 'next/navigation';
import type { TimelineEvent } from '@/components/project/timeline/timeline-types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectTimelinePage({ params }: Props) {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);

  if (isNaN(projectIdNum)) notFound();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_timeline_events')
    .select('occurred_at, kind, title, summary, status, entity_id, project_id')
    .eq('project_id', projectIdNum)
    .order('occurred_at', { ascending: false });

  if (error) {
    // Surface the error — never swallow silently
    throw new Error(`Timeline query failed: ${error.message}`);
  }

  const events = (data ?? []) as TimelineEvent[];

  return (
    <PageShell
      variant="content"
      title="Timeline"
      description={
        events.length > 0
          ? `${events.length} event${events.length === 1 ? '' : 's'}`
          : undefined
      }
    >
      <ProjectTimeline events={events} />
    </PageShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(main)/[projectId]/timeline/page.tsx
git commit -m "feat(timeline): add timeline page route"
```

---

## Task 8: Typecheck & Verify

- [ ] **Step 1: Run typecheck in a background sub-agent**

Delegate to a sub-agent: `cd frontend && npm run typecheck`

Fix any type errors before proceeding. Common issues:
- `project_timeline_events` not in `database.types.ts` (the view won't auto-generate — the query uses `.from('project_timeline_events')` which TypeScript may not know about; cast the result with `as TimelineEvent[]` as already done in the page)
- `StatusBadge` props don't accept `className` — if so, remove that prop from `timeline-event-item.tsx`

- [ ] **Step 2: Take screenshots of both test projects**

Navigate to:
- `http://localhost:3001/67/timeline` (Vermillion Rise Warehouse)
- Find the Union Collective project ID by checking the projects list, then navigate to `/[id]/timeline`

Take a screenshot of each using agent-browser. Report what you see — event counts, kinds present, any visual issues.

- [ ] **Step 3: Final commit**

```bash
git add -p
git commit -m "feat(timeline): project timeline v1 complete"
```
