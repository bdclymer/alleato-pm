# Project Timeline v1

## Route
`/[projectId]/timeline` — standalone page, no nav entry yet.

## Data Layer
Supabase migration creates `project_timeline_events` view (UNION ALL). Single query from server component: `.from('project_timeline_events').eq('project_id', n).order('occurred_at', { ascending: false })`.

### Event kinds
| kind | source | occurred_at |
|---|---|---|
| `project_created` | `projects` | `created_at` |
| `project_start` | `projects` | `"start date"` (nullable) |
| `meeting` | `document_metadata` (type=meeting, deleted_at IS NULL) | `date` |
| `rfi` | `rfis` | `COALESCE(date_initiated, created_at)` |
| `submittal` | `submittals` (deleted_at IS NULL) | `created_at` |
| `commitment` | `commitments` | `created_at` |
| `commitment_executed` | `commitments` (executed=true, executed_date not null) | `executed_date` |
| `change_event` | `change_events` (deleted_at IS NULL) | `created_at` |
| `change_order` | `change_orders` | `created_at` |
| `prime_contract` | `prime_contracts` | `created_at` |
| `prime_contract_executed` | `prime_contracts` (executed=true, executed_at not null) | `executed_at` |

### View columns
`occurred_at timestamptz, kind text, title text, summary text, status text, entity_id text, project_id int4`

### Links (resolved in TS)
`meeting/rfi/submittal/commitment*/change_event/change_order/prime_contract*` → `/:projectId/<tool>/:entity_id`. `project_*` kinds have no link.

## Components
```
page.tsx (server) → ProjectTimeline (server) → TimelineMonthGroup × N → TimelineEventItem × N
```
All server components. `PageShell variant="content"`.

## Visual
- Vertical timeline: dot + vertical line on left, content on right
- Dot colors keyed by kind (use status-badge approach for ESLint compliance)
- Date column: `text-xs text-muted-foreground w-16`
- Group by calendar month, sticky month header
- Event count shown next to page title
- Empty state: `<EmptyState>` from ds

## Out of scope
Collapsible sections, kind filtering, AI narrative, nav entry, pagination.
