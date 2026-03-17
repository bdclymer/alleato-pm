# PRP: RFI Response System with Liveblocks

**Version:** 1.0
**Created:** 2026-03-17
**Confidence Score:** 9/10

---

## Goal

**Feature Goal:** Wire existing Liveblocks v3 infrastructure to the RFI detail page to enable threaded responses, official response designation, Ball in Court auto-shift, rich text Question editing, Reopen flow, and list view enhancements (11 missing columns + 11 missing filters).

**Deliverable:** Enhanced RFI detail page with Liveblocks-powered response threads, notification-driven Ball in Court workflow, Lexical rich text Question field, Reopen button, and a fully-featured list view matching Procore's 19 columns and 12 filters.

**Success Definition:** An RFI can receive assignee responses via Liveblocks threads, the RFI Manager can mark an official response (thread resolve), Ball in Court shifts automatically on response/resolve, the Question field supports rich text, RFIs can be reopened, and the list view shows all 19 Procore columns with 12 filter categories.

---

## Why

- **Core workflow gap:** Procore's RFI tool revolves around assignee responses and official response designation. Our current implementation has zero response capability — the biggest functional gap at 62% completion.
- **Liveblocks already wired:** All infrastructure exists (auth, webhooks, notifications, entity comments, Lexical editor). This is a wiring task, not a build-from-scratch task.
- **No new DB table needed:** Liveblocks stores responses as threads/comments. We skip building `rfi_responses` table, response API routes, and notification pipelines.
- **User impact:** Construction teams need to ask questions, get answers from assignees, and track who's responsible (Ball in Court). Without responses, the RFI tool is just a tracking list, not a collaboration tool.

---

## What - List of Deliverables

**Pages**

- Modified RFI detail page (`[projectId]/rfis/[rfiId]`) — add Responses section with Liveblocks threads
- Modified RFI detail page — add Reopen RFI button for closed/closed-draft statuses

---

**Database Schema**

- Add `drawing_number TEXT` column to `rfis` table (migration)
- Add `closed-draft` status value support in schema constants
- Remove `pending` and `void` from status options

---

**API Endpoints**

- Modified `PATCH /api/projects/[projectId]/rfis/[rfiId]` — add reopen logic (closed→open, closed-draft→draft), add closed-draft on close from draft
- New `notifyBallInCourt()` function in notificationService.ts

---

**Components**

- `RfiResponses` — Liveblocks Thread list + Composer wrapped in EntityRoom (new component)
- `BallInCourtNotification` — Custom notification kind renderer (add to custom-notification-kinds.tsx)

---

**Frontend Form & Form Fields**

- Modified Question field — replace Textarea with Lexical rich text editor
- Add Drawing Number field to create/edit forms
- Add 11 missing columns to rfis-table-config.tsx
- Add 11 missing filters to rfis-client.tsx

---

## Success Criteria

- [ ] Assignees can submit responses to an RFI via Liveblocks Composer on the detail page
- [ ] Responses appear as threaded comments with user avatars, timestamps, and presence indicators
- [ ] RFI Manager can "resolve" a thread to mark it as the official response
- [ ] Ball in Court auto-shifts: on open→assignees, on all responses→RFI Manager, on resolve→cleared
- [ ] `$ballInCourt` notification fires when BIC shifts, appears in notification bell
- [ ] Closed RFIs show "Reopen RFI" button; reopening returns to Open (from Closed) or Draft (from Closed-Draft)
- [ ] Question field uses Lexical rich text editor with bold/italic/underline/lists
- [ ] List view shows all 19 Procore columns (11 new, hidden by default)
- [ ] List view has 12 filter categories (11 new)
- [ ] Drawing Number field exists on create/edit forms
- [ ] `npm run quality` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] Existing E2E tests still pass

---

## All Needed Context

### Context Completeness Check

*This PRP provides everything needed for implementation: exact file paths, source code patterns to copy, import paths, component structures, TypeScript types, and integration points. The executing agent does NOT need to search for patterns — they are all provided here.*

### Documentation & References

```yaml
# MUST READ — Existing Liveblocks patterns (copy these exactly)
- file: frontend/src/components/comments/entity-room.tsx
  why: "RoomProvider wrapper pattern — copy this for RFI detail page"
  pattern: "EntityRoom wraps children in RoomProvider with getRoomId(entityType, entityId)"
  gotcha: "Must import getRoomId from @/lib/liveblocks/rooms, uses INITIAL_STORAGE"

- file: frontend/src/components/comments/entity-comments.tsx
  why: "Thread list + Composer pattern — this IS the response component pattern"
  pattern: "EntityComments renders ThreadList + Composer inside ClientSideSuspense"
  gotcha: "Must be inside EntityRoom. Uses useThreads from @liveblocks/react/suspense"

- file: frontend/src/lib/liveblocks/rooms.ts
  why: "Room ID generation — already has 'rfi' in CommentableEntityType"
  pattern: "getRoomId('rfi', rfiId) → 'alleato:rfi:{rfiId}'"
  gotcha: "Room format is 'alleato:{entityType}:{entityId}', NOT 'project-{id}:rfi-{id}'"

- file: frontend/src/services/notificationService.ts
  why: "Notification trigger pattern — copy for $ballInCourt"
  pattern: "notifyStatusChange() uses liveblocks.triggerInboxNotification()"
  gotcha: "ActivityData values must be FLAT primitives only (string|number|boolean). No objects/arrays."

- file: frontend/src/components/notifications/custom-notification-kinds.tsx
  why: "Custom notification renderer pattern — add BallInCourtNotification here"
  pattern: "InboxNotification.Custom with aside icon + body text + metadata"
  gotcha: "Must export in customNotificationKinds map at bottom of file"

- file: frontend/liveblocks.config.ts
  why: "Type declarations — add BallInCourtData type and $ballInCourt to ActivitiesData"
  pattern: "Flat primitive types only in activity data"
  gotcha: "IMPORTANT: ActivitiesData values must be flat. No nested objects, no arrays, no optionals."

- file: frontend/src/app/(main)/[projectId]/rfis/[rfiId]/rfi-detail.tsx
  why: "Current detail page — will be modified to add responses section and reopen button"
  pattern: "View mode has 3-column grid: main (lg:col-span-2) + sidebar"
  gotcha: "Uses useUpdateRfi for status changes. isEditing state controls view/edit mode."

- file: frontend/src/features/rfis/rfis-table-config.tsx
  why: "Table column config — add 11 missing columns here"
  pattern: "ColumnConfig[] with alwaysVisible/defaultVisible flags, buildRfiTableColumns() returns TableColumn[]"
  gotcha: "New columns should have defaultVisible: false"

- file: frontend/src/app/(main)/[projectId]/rfis/rfis-client.tsx
  why: "List page client component — add filters here"
  pattern: "Uses useUnifiedTableState, syncs status filter to URL params"
  gotcha: "Filters are FilterConfig[] from rfiFilters in table config"

# Reference documentation
- file: _bmad-output/planning-artifacts/rfis/verification/02-procore-reference.md
  why: "Complete Procore RFI reference — statuses, fields, Ball in Court rules, permissions"

- file: _bmad-output/planning-artifacts/rfis/verification/04-implementation-specs.md
  why: "Full gap analysis — what exists vs what's missing"

- file: _bmad-output/planning-artifacts/rfis/verification/07-liveblocks-research.md
  why: "Liveblocks API details — Thread/Composer API, webhooks, notifications"
```

### Current Codebase Tree (relevant files only)

```
frontend/
├── liveblocks.config.ts                          # Liveblocks global types (MODIFY)
├── src/
│   ├── app/
│   │   ├── (main)/[projectId]/rfis/
│   │   │   ├── page.tsx                          # List page (server)
│   │   │   ├── rfis-client.tsx                   # List page (client) (MODIFY - add filters)
│   │   │   ├── new/page.tsx                      # Create form (MODIFY - rich text)
│   │   │   └── [rfiId]/
│   │   │       ├── page.tsx                      # Detail page (server) (MODIFY - add EntityRoom)
│   │   │       └── rfi-detail.tsx                # Detail page (client) (MODIFY - add responses, reopen)
│   │   └── api/projects/[projectId]/rfis/
│   │       ├── route.ts                          # List + Create API
│   │       └── [rfiId]/route.ts                  # Single + Update + Delete API (MODIFY - reopen)
│   ├── components/
│   │   ├── comments/
│   │   │   ├── entity-room.tsx                   # PATTERN: RoomProvider wrapper
│   │   │   ├── entity-comments.tsx               # PATTERN: Thread list + Composer
│   │   │   └── index.ts                          # Barrel export
│   │   ├── notifications/
│   │   │   └── custom-notification-kinds.tsx      # MODIFY: add $ballInCourt
│   │   └── rfis/                                  # NEW: RFI-specific components
│   │       └── rfi-responses.tsx                  # NEW: Liveblocks responses section
│   ├── features/rfis/
│   │   └── rfis-table-config.tsx                  # MODIFY: add 11 columns
│   ├── hooks/use-rfis.ts                          # React Query hooks (no changes needed)
│   ├── lib/
│   │   ├── liveblocks/rooms.ts                    # Room ID utils (already has 'rfi' type)
│   │   └── schemas/rfi-schema.ts                  # MODIFY: add closed-draft, remove pending/void
│   ├── services/notificationService.ts            # MODIFY: add notifyBallInCourt
│   └── types/database-extensions.ts               # RFI type (no changes needed)
└── supabase/migrations/                           # NEW: migration for drawing_number column
```

### Desired Codebase Tree (new files marked)

```
frontend/src/components/rfis/
└── rfi-responses.tsx              # NEW — Liveblocks-powered responses section

supabase/migrations/
└── YYYYMMDD_add_rfi_drawing_number.sql  # NEW — ALTER TABLE rfis ADD drawing_number
```

### Known Gotchas of Our Codebase & Library Quirks

```tsx
// CRITICAL: Liveblocks ActivitiesData values must be FLAT primitives
// string | number | boolean ONLY. No objects, arrays, or optionals.
// BAD:  { assignees: ["Alice", "Bob"] }
// GOOD: { assigneeNames: "Alice, Bob" }

// CRITICAL: EntityRoom must wrap any component using useThreads()
// The RFI detail page.tsx (server component) must wrap RfiDetail in EntityRoom

// CRITICAL: "use client" directive — entity-room.tsx and entity-comments.tsx
// are both client components. The server page.tsx wraps them.

// CRITICAL: Room ID format is "alleato:rfi:{rfiId}" (from getRoomId)
// NOT "project-{projectId}:rfi-{rfiId}" — the project scoping is handled by auth

// GOTCHA: Thread resolve = official response. Liveblocks Thread component
// has built-in resolve button. When resolved, onResolvedChange fires.
// Use this as the "mark official" action — no custom API needed.

// GOTCHA: Custom notification kinds need $ prefix: "$ballInCourt"
// Must be added to both liveblocks.config.ts (ActivitiesData) and
// custom-notification-kinds.tsx (renderer + customNotificationKinds map)

// GOTCHA: Status "closed-draft" is a NEW value. The PATCH API route
// currently always sets status to "closed". Must check if current status
// is "draft" before setting to "closed-draft" instead.

// GOTCHA: Reopen from "closed" → "open", from "closed-draft" → "draft"
// The reverse mapping must be explicit in the API route.

// GOTCHA: Next.js cache — after creating the migration file, clear .next
// cache before testing: rm -rf .next

// GOTCHA: design-system ESLint rules enforce no hardcoded colors, no
// arbitrary spacing. Use semantic tokens (bg-muted, text-foreground, etc.)
```

---

## Implementation Blueprint

### Data Models and Structure

```tsx
// === New type in liveblocks.config.ts ===
export type BallInCourtData = {
  title: string;
  rfiNumber: number;
  rfiSubject: string;
  previousHolder: string;
  newHolder: string;
  projectName: string;
  url: string;
};

// === Updated ActivitiesData (add to existing map) ===
ActivitiesData: {
  // ... existing kinds ...
  $ballInCourt: BallInCourtData;
};

// === Updated RFI_STATUS_OPTIONS in rfi-schema.ts ===
export const RFI_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "closed-draft", label: "Closed (Draft)" },
] as const;
// REMOVE "pending" and "void" — not in Procore

// === Updated status variant map ===
export const RFI_STATUS_VARIANT_MAP: Record<string, string> = {
  draft: "secondary",
  open: "default",
  closed: "default",
  "closed-draft": "secondary",
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE supabase/migrations/YYYYMMDD_add_rfi_drawing_number.sql
  - IMPLEMENT: ALTER TABLE rfis ADD COLUMN drawing_number text;
  - RUN: npm run db:types to regenerate frontend/src/types/database.types.ts
  - VALIDATE: grep "drawing_number" frontend/src/types/database.types.ts

Task 2: MODIFY frontend/liveblocks.config.ts
  - ADD: BallInCourtData type (flat primitives: title, rfiNumber, rfiSubject, previousHolder, newHolder, projectName, url)
  - ADD: "$ballInCourt: BallInCourtData" to ActivitiesData map
  - FOLLOW pattern: existing CriticalIssueData type definition
  - VALIDATE: npx tsc --noEmit

Task 3: MODIFY frontend/src/lib/schemas/rfi-schema.ts
  - UPDATE: RFI_STATUS_OPTIONS — remove "pending" and "void", add "closed-draft"
  - UPDATE: RFI_STATUS_VARIANT_MAP — remove pending/void entries, add "closed-draft": "secondary"
  - ADD: drawing_number field to rfiBaseSchema (z.string().nullish())
  - ADD: drawing_number to rfiEditSchema
  - VALIDATE: npx tsc --noEmit

Task 4: MODIFY frontend/src/services/notificationService.ts
  - ADD: import BallInCourtData from liveblocks.config
  - ADD: notifyBallInCourt(userId: UserTarget, data: BallInCourtData) function
  - ADD: "$ballInCourt" to NotificationKind union type
  - ADD: BallInCourtData to AnyActivityData union type
  - FOLLOW pattern: existing notifyStatusChange() function
  - VALIDATE: npx tsc --noEmit

Task 5: MODIFY frontend/src/components/notifications/custom-notification-kinds.tsx
  - ADD: import BallInCourtData from liveblocks.config
  - ADD: BallInCourtNotification component (use UserPlus icon, bg-blue-100, text-blue-600)
  - ADD: $ballInCourt: BallInCourtNotification to customNotificationKinds map
  - FOLLOW pattern: existing AssignmentNotification component
  - VALIDATE: npx tsc --noEmit

Task 6: CREATE frontend/src/components/rfis/rfi-responses.tsx
  - IMPLEMENT: RfiResponses component wrapping EntityComments with title="Responses"
  - IMPORT: EntityRoom from @/components/comments/entity-room
  - IMPORT: EntityComments from @/components/comments/entity-comments
  - STRUCTURE:
    ```tsx
    "use client";
    import { EntityRoom } from "@/components/comments/entity-room";
    import { EntityComments } from "@/components/comments/entity-comments";

    interface RfiResponsesProps {
      rfiId: string;
      className?: string;
    }

    export function RfiResponses({ rfiId, className }: RfiResponsesProps) {
      return (
        <EntityRoom entityType="rfi" entityId={rfiId}>
          <EntityComments title="Responses" className={className} />
        </EntityRoom>
      );
    }
    ```
  - VALIDATE: npx tsc --noEmit

Task 7: MODIFY frontend/src/app/(main)/[projectId]/rfis/[rfiId]/rfi-detail.tsx
  - ADD: import RfiResponses from @/components/rfis/rfi-responses
  - ADD: Responses section between Question card and Status Actions card in view mode:
    ```tsx
    {/* Between Question card and Status Actions card */}
    <RfiResponses rfiId={rfi.id} className="mt-6" />
    ```
  - ADD: Reopen button when status is "closed" or "closed-draft":
    ```tsx
    {(rfi.status === "closed" || rfi.status === "closed-draft") && (
      <Button size="sm" onClick={() => handleStatusChange(
        rfi.status === "closed-draft" ? "draft" : "open"
      )} disabled={updateRfi.isPending}>
        Reopen RFI
      </Button>
    )}
    ```
  - UPDATE: Remove "void" from status check on Actions card
  - UPDATE: getStatusVariant — remove pending/void, add "closed-draft": "secondary"
  - VALIDATE: npx tsc --noEmit

Task 8: MODIFY frontend/src/app/api/projects/[projectId]/rfis/[rfiId]/route.ts
  - UPDATE PATCH handler — close logic:
    - When current status is "draft" and new status is "closed" → set to "closed-draft"
    - When current status is "closed" or "closed-draft" → allow reopen:
      - "closed" → "open" (reopen)
      - "closed-draft" → "draft" (reopen)
    - Clear closed_date and restore ball_in_court on reopen
  - VALIDATE: npx tsc --noEmit

Task 9: MODIFY frontend/src/features/rfis/rfis-table-config.tsx
  - ADD 11 columns to rfiColumns (all defaultVisible: false):
    - received_from (Received From) — text
    - date_initiated (Date Initiated) — date format
    - distribution_list (Distribution List) — array join
    - closed_date (Closed Date) — date format
    - location (Location) — text
    - schedule_impact (Schedule Impact) — text
    - cost_impact (Cost Impact) — text
    - cost_code (Cost Code) — text
    - sub_job (Sub Job) — text
    - rfi_stage (RFI Stage) — text
    - is_private (Private) — boolean → "Yes"/"No"
  - ADD corresponding entries to buildRfiTableColumns() return array
  - UPDATE rfiDefaultVisibleColumns to include only original 7 columns
  - FOLLOW pattern: existing column definitions in same file
  - VALIDATE: npx tsc --noEmit

Task 10: MODIFY frontend/src/features/rfis/rfis-table-config.tsx (continued)
  - ADD 11 filters to rfiFilters array:
    - responsible_contractor (Responsible Contractor) — select
    - received_from (Received From) — select
    - assignees (Assignees) — select
    - rfi_manager (RFI Manager) — select
    - ball_in_court (Ball In Court) — select
    - overdue (Overdue) — boolean (computed: due_date < today && status !== "closed")
    - location (Location) — select
    - cost_code (Cost Code) — select
    - sub_job (Sub Job) — select
    - rfi_stage (RFI Stage) — select
    - created_by (Created By) — select
  - FOLLOW pattern: existing status filter definition
  - VALIDATE: npx tsc --noEmit

Task 11: MODIFY frontend/src/app/(main)/[projectId]/rfis/new/page.tsx
  - ADD: drawing_number field to create form (simple text Input)
  - PLACE: in General Information section near Drawing Number position
  - VALIDATE: npx tsc --noEmit

Task 12: MODIFY frontend/src/app/(main)/[projectId]/rfis/[rfiId]/rfi-detail.tsx
  - ADD: drawing_number field to edit form
  - ADD: Drawing Number to InfoRow display in view mode sidebar
  - VALIDATE: npx tsc --noEmit
```

### Implementation Patterns & Key Details

```tsx
// === Pattern: RFI Responses Component (Task 6) ===
// This is the simplest possible component because EntityRoom + EntityComments
// handle everything. The key insight is that Liveblocks threads ARE the responses.
// "Resolve thread" = "Mark as official response"

"use client";
import { EntityRoom } from "@/components/comments/entity-room";
import { EntityComments } from "@/components/comments/entity-comments";

interface RfiResponsesProps {
  rfiId: string;
  className?: string;
}

export function RfiResponses({ rfiId, className }: RfiResponsesProps) {
  return (
    <EntityRoom entityType="rfi" entityId={rfiId}>
      <EntityComments title="Responses" className={className} />
    </EntityRoom>
  );
}

// === Pattern: Ball in Court Notification (Task 5) ===
// Copy from AssignmentNotification, change icon and colors
import { Users } from "lucide-react";
import type { BallInCourtData } from "../../../liveblocks.config";

export function BallInCourtNotification(
  props: InboxNotificationCustomKindProps<"$ballInCourt">
) {
  const { title, rfiNumber, rfiSubject, previousHolder, newHolder, projectName } =
    props.inboxNotification.activities[0].data as unknown as BallInCourtData;

  return (
    <InboxNotification.Custom
      {...props}
      title={title}
      aside={
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
          <Users className="h-4 w-4 text-blue-600" />
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        RFI #{rfiNumber}: {rfiSubject}
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
        <span>{previousHolder} → {newHolder}</span>
        {projectName && (
          <>
            <span>·</span>
            <span>{projectName}</span>
          </>
        )}
      </div>
    </InboxNotification.Custom>
  );
}

// === Pattern: Reopen Logic in API Route (Task 8) ===
// In the PATCH handler, BEFORE the existing status handling:
if (body.status) {
  const currentRfi = /* fetch current RFI */;
  const currentStatus = currentRfi.status;
  let newStatus = body.status;

  // Close from Draft → closed-draft
  if (newStatus === "closed" && currentStatus === "draft") {
    newStatus = "closed-draft";
  }

  // Reopen logic
  if (newStatus === "open" && currentStatus === "closed") {
    // Reopen from closed → open
    updateObj.closed_date = null;
    updateObj.ball_in_court = currentRfi.assignees?.join(", ") ?? null;
  } else if (newStatus === "draft" && currentStatus === "closed-draft") {
    // Reopen from closed-draft → draft
    updateObj.closed_date = null;
  }

  updateObj.status = newStatus;
}

// === Pattern: Adding Columns to Table Config (Task 9) ===
// Follow existing column pattern:
{
  id: "received_from",
  header: "Received From",
  defaultVisible: false,
  alwaysVisible: false,
},
// In buildRfiTableColumns(), add:
{
  id: "received_from",
  header: "Received From",
  accessor: "received_from",
  render: (item: RFI) => item.received_from ?? "—",
  sortValue: (item: RFI) => item.received_from ?? "",
},
```

### Integration Points

```yaml
LIVEBLOCKS:
  - Room creation: Automatic when EntityRoom renders (getRoomId("rfi", rfiId))
  - Auth: Uses existing /api/liveblocks-auth endpoint (no changes needed)
  - Webhooks: Uses existing /api/liveblocks/webhook (no changes needed for basic flow)
  - Notifications: Add notifyBallInCourt to notificationService.ts
  - User search: Uses existing /api/liveblocks/users/search (mention support)

DATABASE:
  - Migration: Add drawing_number column only
  - Regenerate types: npm run db:types after migration
  - No new tables needed — Liveblocks stores response data

SCHEMA:
  - rfi-schema.ts: Add drawing_number, remove pending/void, add closed-draft
  - liveblocks.config.ts: Add BallInCourtData type and $ballInCourt kind

UI:
  - RFI detail page: Add RfiResponses component + Reopen button
  - RFI create form: Add drawing_number field
  - RFI list page: 11 new columns + 11 new filters in table config
```

---

## Known Pitfalls & Prevention

### From Pattern Analysis (Mandatory Review)

#### Database Type Mismatches (INCIDENT-LOG.md - CRITICAL)
**Historical Error:** Used UUID for project_id when projects.id is INTEGER
**Prevention:** The rfis table uses `project_id: number` (INTEGER) — verified in database.types.ts. The only new column is `drawing_number TEXT` — no FK involved.
**Validation:** `grep "drawing_number" frontend/src/types/database.types.ts` after running `npm run db:types`

#### Next.js Route Caching (INCIDENT-LOG.md - CRITICAL)
**Historical Error:** New files showing 404 due to .next cache
**Prevention:** Only creating one new component file (rfi-responses.tsx) and one migration. Clear .next after adding any new route files.
**Validation:** `rm -rf frontend/.next && cd frontend && npm run dev`

#### Liveblocks ActivityData Must Be Flat (CODEBASE PATTERN)
**Historical Error:** Using objects/arrays in notification data causes runtime errors
**Prevention:** BallInCourtData uses only string and number fields. No arrays, no optionals.
**Validation:** Check that all fields in BallInCourtData are `string | number | boolean`

#### Design System ESLint Rules (CODEBASE PATTERN)
**Historical Error:** Using hardcoded colors (bg-blue-600) or arbitrary spacing (p-7) blocks build
**Prevention:** Use semantic tokens only: bg-muted, text-foreground, border-border. Exception: status-specific colors in notification renderers (bg-blue-100 is allowed for notification icons per existing pattern).
**Validation:** `cd frontend && npm run lint`

#### Import Path Consistency (CODEBASE PATTERN)
**Historical Error:** Importing from wrong path (e.g., @/components/ds vs @/components/ui)
**Prevention:** Follow exact import paths shown in existing entity-comments.tsx and entity-room.tsx
**Validation:** `npx tsc --noEmit`

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
cd frontend
npm run lint          # ESLint with design system rules
npx tsc --noEmit      # TypeScript type checking
```

### Level 2: Existing Test Suite (Regression Check)

```bash
cd frontend
npx playwright test tests/financial/rfis.spec.ts  # RFI E2E tests
```

### Level 3: Integration Testing (System Validation)

```bash
# Clear cache first
cd frontend && rm -rf .next

# Start dev server
npm run dev &
sleep 10

# Test RFI detail page loads
curl -I http://localhost:3000/67/rfis

# Build validation
npm run build
```

### Level 4: Production Readiness

```bash
cd frontend
npm run quality       # typecheck + lint combined
npm run build         # production build
```

---

## Final Validation Checklist

### Technical Validation
- [ ] `npm run quality` passes (zero errors)
- [ ] `npm run build` succeeds
- [ ] Existing E2E tests pass: `npx playwright test tests/financial/rfis.spec.ts`
- [ ] No regressions in other tools

### Feature Validation
- [ ] Navigate to RFI detail page → Responses section visible
- [ ] Type a response in Composer → thread appears
- [ ] Resolve a thread → "Thread resolved" collapsed state shown
- [ ] Reopen a closed RFI → status returns to "open"
- [ ] Reopen a closed-draft RFI → status returns to "draft"
- [ ] Create form shows Drawing Number field
- [ ] List view: toggle column visibility → 11 new columns available
- [ ] List view: open filters → 12 filter categories available

### Code Quality
- [ ] New component follows EntityComments/EntityRoom pattern exactly
- [ ] No hardcoded colors (design system ESLint enforced)
- [ ] No arbitrary spacing
- [ ] All imports use correct paths
- [ ] BallInCourtData uses flat primitives only

---

## Anti-Patterns to Avoid

- ❌ Don't create a `rfi_responses` database table — Liveblocks IS the response store
- ❌ Don't build custom response API routes — Liveblocks handles CRUD
- ❌ Don't build a custom rich text editor — use Lexical (already installed) or the Liveblocks Composer
- ❌ Don't modify the Liveblocks auth endpoint — it already works for all entity types
- ❌ Don't use `pending` or `void` statuses — they're not in Procore
- ❌ Don't use nested objects in ActivitiesData — Liveblocks requires flat primitives
- ❌ Don't add new packages — everything needed is already installed
- ❌ Don't create custom thread/comment components — EntityComments already handles this
