# PRP: Alito — Change Management System
**Product Requirements Prompt for Claude Code**
Version: 1.0 | Date: March 31, 2026 | Status: Ready for Implementation

---

## CONTEXT FOR CLAUDE CODE

You are building the **Change Management module** for **Alito**, a commercial construction project management application for a design-build company. This module handles the full lifecycle of construction change orders — from field-level change events through official executed change orders.

The architectural model is: **Option D (record-centric) + Option C (assembly workspace) + Option B (embedded timeline)** — meaning every PCO and Change Event is a full record page, there is a drag-to-assemble PCO workspace, and every record embeds a full chronological audit timeline.

The immediate reference model is Procore's change event/order system, but the goal is a unified, non-siloed flow that treats Change Events → PCOs → Official Change Orders as one continuous lifecycle, not three separate modules.

**Do not begin coding until you have read this entire document.** All data models, workflows, and acceptance criteria must be implemented as specified before moving to the next phase.

---

## TECH STACK

Use whatever stack is already established in the Alito project. If greenfield, default to:

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes or separate Express/Fastify server
- **Database**: PostgreSQL (Supabase preferred for real-time subscriptions)
- **Auth**: Existing Alito auth system with role-based access (Super, PM, VP, Leadership, Client)
- **Real-time**: Supabase Realtime or Pusher for live notification delivery
- **File storage**: Supabase Storage or S3 for document attachments
- **Email**: Resend or SendGrid for notification emails

---

## ROLE MODEL

Four internal roles + one external:

| Role | Code | Permissions |
|---|---|---|
| Superintendent | `SUPER` | Create Change Events only |
| Project Manager | `PM` | All above + Create/edit PCOs, submit to client, manage revisions |
| VP / Owner | `VP` | All above + Full read, approve internal escalations |
| Leadership | `LEADERSHIP` | Read-only dashboard + record access, login notification queue |
| Client | `CLIENT` | Read simplified PCO view, approve/reject/comment only |

**Role-based view rendering rule:** Every record page accepts a `viewAs` param. Client view hides internal notes, cost breakdowns beyond the total, sub names, and internal comments. Leadership view shows financial and schedule headlines only by default, expandable to full.

---

## DATA MODELS

### 1. `ChangeEvent`

```typescript
interface ChangeEvent {
  id: string                          // UUID
  projectId: string                   // FK → Project
  number: string                      // Auto-incremented: "CE-001"
  title: string
  description: string
  type: 'EXTERNAL' | 'INTERNAL'
  internalSubtype?:                   // Only when type = INTERNAL
    | 'ERROR'
    | 'EFFICIENCY'
    | 'WEATHER_DELAY'
    | 'SAFETY_INCIDENT'
    | 'VALUE_ENGINEERING'
    | 'SCHEDULE_DELAY'
    | 'OTHER'
  status: 'DRAFT' | 'OPEN' | 'GROUPED' | 'CLOSED'
  originatorId: string                // FK → User (Super or PM)
  originatorRole: 'SUPER' | 'PM'
  potentialChangeOrderId?: string     // FK → PCO (when grouped)
  linkedDocuments: LinkedDocument[]
  createdAt: DateTime
  updatedAt: DateTime
}

interface LinkedDocument {
  id: string
  changeEventId: string
  type: 'RFI' | 'EMAIL' | 'TEXT' | 'SUBMITTAL' | 'PHOTO' | 'WEATHER_LOG' | 'OTHER'
  label: string
  url?: string
  fileKey?: string                    // Storage key for uploaded files
  externalRef?: string               // e.g. "RFI-22"
  createdAt: DateTime
}
```

### 2. `PotentialChangeOrder` (PCO)

```typescript
interface PotentialChangeOrder {
  id: string
  projectId: string
  number: string                      // Auto-incremented: "PCO-001"
  title: string
  description: string
  type: 'CLIENT_REQUESTED' | 'INTERNAL' | 'MIXED'
  status:
    | 'DRAFT'
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'REVISION_REQUESTED'
    | 'APPROVED'
    | 'VOID'                          // Only for admin-level correction; never used for client rejection
  currentVersion: number              // Starts at 1, increments on each revision
  createdById: string                 // FK → User (PM+)
  primeChangeOrderId?: string         // FK → PrimeChangeOrder (set on approval)

  // Financial
  estimatedValue?: number
  approvedValue?: number
  lineItems: PCOLineItem[]

  // Schedule
  scheduleImpactDays?: number
  scheduleImpactDescription?: string

  // RFQ tracking
  rfqRequired: boolean
  rfqStatus?: 'NOT_SENT' | 'SENT' | 'RECEIVED'

  // Annotation (set by team post-execution)
  annotation?: 'POSITIVE' | 'NEGATIVE' | 'LESSON_LEARNED'
  annotationNote?: string

  // Root cause
  rootCause?: string                  // Auto-generated summary, editable

  createdAt: DateTime
  updatedAt: DateTime
  submittedAt?: DateTime
  approvedAt?: DateTime
}

interface PCOLineItem {
  id: string
  pcoId: string
  description: string
  subcontractorId?: string            // FK → Subcontractor
  amount: number
  type: 'COST' | 'CREDIT'
  category: 'LABOR' | 'MATERIAL' | 'EQUIPMENT' | 'OTHER'
}

// PCO is versioned — each revision creates a PCOVersion snapshot
interface PCOVersion {
  id: string
  pcoId: string
  version: number
  snapshotData: Partial<PotentialChangeOrder>  // Full PCO state at time of submission
  submittedAt: DateTime
  submittedById: string
  clientDecision?: 'APPROVED' | 'REVISION_REQUESTED'
  clientDecisionAt?: DateTime
  clientDecisionNote?: string
}
```

### 3. `PrimeChangeOrder` (Official CO — Prime Contract)

```typescript
interface PrimeChangeOrder {
  id: string
  projectId: string
  number: string                      // "CO-001"
  pcoId: string                       // FK → PCO that spawned this
  title: string
  description: string
  status:
    | 'DRAFT'
    | 'PENDING_SIGNATURES'
    | 'FULLY_EXECUTED'
  value: number
  scheduleImpactDays: number
  createdById: string
  clientSignedAt?: DateTime
  internalSignedAt?: DateTime
  fullyExecutedAt?: DateTime
  commitmentChangeOrders: CommitmentChangeOrder[]
  createdAt: DateTime
  updatedAt: DateTime
}
```

### 4. `CommitmentChangeOrder` (Sub / PO CO)

```typescript
interface CommitmentChangeOrder {
  id: string
  primeChangeOrderId: string          // FK → PrimeChangeOrder
  projectId: string
  number: string                      // "CCO-001"
  subcontractorId: string             // FK → Subcontractor/Vendor
  contractType: 'SUBCONTRACT' | 'PURCHASE_ORDER'
  status:
    | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'PENDING_SIGNATURES'
    | 'FULLY_EXECUTED'
  value: number
  description: string
  // Commitment COs can be created before prime CO approval (parallel mode)
  parallelMode: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

### 5. `RFQ`

```typescript
interface RFQ {
  id: string
  pcoId: string
  projectId: string
  number: string                      // "RFQ-001"
  subcontractorId: string
  sentAt?: DateTime
  dueDate?: DateTime
  receivedAt?: DateTime
  quotedAmount?: number
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'REJECTED'
  notes?: string
  createdAt: DateTime
}
```

### 6. `Notification`

```typescript
interface Notification {
  id: string
  projectId: string
  recipientId: string
  type:
    | 'PCO_CREATED'
    | 'PCO_SUBMITTED_TO_CLIENT'
    | 'CLIENT_APPROVED'
    | 'CLIENT_REVISION_REQUESTED'
    | 'PCO_REVISED'
    | 'RFQ_RECEIVED'
    | 'CO_EXECUTED'
  referenceType: 'PCO' | 'CO' | 'CCO' | 'RFQ' | 'CHANGE_EVENT'
  referenceId: string
  message: string
  readAt?: DateTime
  emailSentAt?: DateTime
  createdAt: DateTime
}
```

### 7. `TimelineEvent` (Audit trail — append-only)

```typescript
interface TimelineEvent {
  id: string
  projectId: string
  parentType: 'CHANGE_EVENT' | 'PCO' | 'PRIME_CO' | 'COMMITMENT_CO'
  parentId: string
  eventType:
    | 'CREATED'
    | 'DOCUMENT_LINKED'
    | 'GROUPED_INTO_PCO'
    | 'RFQ_SENT'
    | 'RFQ_RECEIVED'
    | 'PCO_SUBMITTED'
    | 'CLIENT_REVISION_REQUESTED'
    | 'PCO_REVISED'
    | 'PCO_APPROVED'
    | 'CO_CREATED'
    | 'CCO_CREATED'
    | 'SIGNATURE_RECEIVED'
    | 'CO_EXECUTED'
    | 'COMMENT_ADDED'
    | 'ANNOTATION_SET'
  actorId: string
  actorRole: string
  summary: string
  metadata?: Record<string, unknown>   // Extra structured data per event type
  createdAt: DateTime
}
```

### 8. `Comment`

```typescript
interface Comment {
  id: string
  parentType: 'CHANGE_EVENT' | 'PCO' | 'PRIME_CO' | 'COMMITMENT_CO'
  parentId: string
  authorId: string
  authorRole: string
  body: string
  visibleToClient: boolean            // PM controls client visibility
  createdAt: DateTime
  updatedAt?: DateTime
}
```

---

## API ENDPOINTS

All endpoints under `/api/v1/`. Auth middleware enforces role. All mutations write a `TimelineEvent`.

### Change Events

```
GET    /projects/:projectId/change-events                  List all (filters: status, type, ungrouped)
POST   /projects/:projectId/change-events                  Create (SUPER, PM)
GET    /projects/:projectId/change-events/:id              Get single + timeline
PATCH  /projects/:projectId/change-events/:id              Update (PM+)
POST   /projects/:projectId/change-events/:id/documents    Attach document
```

### PCOs

```
GET    /projects/:projectId/pcos                           List all
POST   /projects/:projectId/pcos                          Create (PM+) → fires notification
GET    /projects/:projectId/pcos/:id                       Get record + versions + timeline
PATCH  /projects/:projectId/pcos/:id                      Update (PM+)
POST   /projects/:projectId/pcos/:id/change-events         Group change event into this PCO
DELETE /projects/:projectId/pcos/:id/change-events/:ceId  Ungroup change event
POST   /projects/:projectId/pcos/:id/submit                Submit to client (PM+) → snapshot version
POST   /projects/:projectId/pcos/:id/revise                Create revision (PM+)
POST   /projects/:projectId/pcos/:id/client-decision       Client approves or requests revision
POST   /projects/:projectId/pcos/:id/rfqs                 Create RFQ
GET    /projects/:projectId/pcos/:id/rfqs                 List RFQs for this PCO
```

### Official Change Orders

```
POST   /projects/:projectId/pcos/:pcoId/convert-to-co     Approved PCO → Prime CO + Commitment COs
GET    /projects/:projectId/change-orders                  List all COs
GET    /projects/:projectId/change-orders/:id              Get record + commitment COs + timeline
PATCH  /projects/:projectId/change-orders/:id              Update status
POST   /projects/:projectId/change-orders/:id/sign         Record signature (client or internal)
```

### Commitment Change Orders

```
GET    /projects/:projectId/change-orders/:coId/commitments       List CCOs for a prime CO
POST   /projects/:projectId/change-orders/:coId/commitments       Create CCO (can be parallel)
PATCH  /projects/:projectId/change-orders/:coId/commitments/:id   Update
POST   /projects/:projectId/change-orders/:coId/commitments/:id/approve  Approve CCO
```

### Notifications

```
GET    /users/me/notifications                             All notifications (paginated)
PATCH  /users/me/notifications/:id/read                   Mark read
GET    /users/me/notifications/unread-count               Badge count
```

### Comments

```
GET    /comments?parentType=PCO&parentId=:id              List comments
POST   /comments                                           Post comment
PATCH  /comments/:id                                       Edit (own comment only)
DELETE /comments/:id                                       Delete (own or PM+)
```

---

## UI SCREENS

### Screen 1: Change Events List (`/projects/:id/change-events`)

**Components required:**
- Filter bar: All / External / Internal / Ungrouped / In PCO / search input
- `ChangeEventCard` component — shows: type icon, CE number, title, description (truncated), type badge, status badge, linked doc pills, creator + date, "Add to PCO →" CTA button
- Empty state for each filter
- "New Change Event" button → slide-over form drawer

**ChangeEvent create form fields:**
- Title (required)
- Type: External / Internal (required)
- Internal subtype (required if Internal): dropdown
- Description (required)
- Linked documents: multi-attach (type selector + label + file upload or URL)

**Behavior rules:**
- Supers see only Create; no PCO assignment button
- PMs see "Add to PCO →" on every ungrouped event
- Events with status `GROUPED` are visually dimmed at 60% opacity
- Clicking any card navigates to the Change Event record page

---

### Screen 2: PCO Assembly Workspace (`/projects/:id/pcos/new` and `/projects/:id/pcos/:id/edit`)

**Layout:** Two-panel. Left = available change events pool. Right = PCO workspace.

**Left panel:**
- Filterable list of ungrouped change events
- Each card: draggable, shows type icon, CE number, title, origin badge, date
- Cards marked as `in-pco` are grayed out and non-draggable

**Right panel sections:**
1. **PCO form header** — title, type (Client Requested / Internal / Mixed), RFQ required toggle, description textarea, PCO number (auto-assigned, shown as draft)
2. **Grouped events drop zone** — drag-receive area. On drop: event moves to workspace, card in left panel dims. Each grouped event shows: icon, title, CE number, estimated amount field, remove (✕) button.
3. **Line items / pricing summary** — auto-calculates from grouped events + manual line items. Shows subtotal, markup field, total.
4. **Sub Commitment COs preview** — shows which subs will have CCOs generated on approval, based on which line items have subcontractor assignments.
5. **Action bar** — Save Draft | Send RFQ | Submit PCO to Client

**Behavior rules:**
- Drag-and-drop is the primary grouping interaction; also allow a "+ Add" button for click-based flow
- "Submit PCO to Client" is disabled until: title filled, at least one change event grouped, at least one line item with amount
- On submit: snapshot version created, status → SUBMITTED, notification fires to leadership distribution group + login queue, email sent
- RFQ toggle shows/hides the RFQ subpanel

---

### Screen 3: PCO Record Page (`/projects/:id/pcos/:pcoId`)

**This is the core screen. Every section below is required.**

#### 3a. Record Header (sticky)
- PCO number + project name
- Title (large, bold)
- Status badge + version badge (e.g. "Under Review — v2")
- Type badge (External / Internal / Mixed)
- Created date + last updated
- Action buttons: Share | Export PDF | [primary action based on status]

#### 3b. Stage Progress Bar (sticky, below header)
Horizontal progress indicator with nodes for each stage:
1. Change Events → 2. RFQ Sent → 3. PCO Submitted → 4. Revision (if applicable) → 5. Approved → 6. Official CO → 7. Executed

- Done stages: green with checkmark
- Current stage: amber with glow ring
- Future stages: gray
- Revision nodes appear dynamically — one node per revision cycle (v1 returned, v2 submitted, etc.)

#### 3c. Version Tabs (below progress bar)
- One tab per submitted version: "v1 — Mar 22 (Revised)", "v2 — Mar 31 (Current)"
- Active tab shows current version data
- Inactive tabs show read-only snapshots
- Sub-label: "Revision history preserved · v1 returned by client [date]"

#### 3d. Main Body — Two columns

**Left/main column:**

**Timeline section** (`TimelineEvent` records, sorted ascending by `createdAt`)
- Vertical rail with colored dots per event type
- Each entry shows: icon, heading, description, linked doc pills, actor name + role, timestamp
- Timeline starts from the first linked Change Event (even events that happened before the PCO was created)
- Timeline is append-only; nothing can be deleted from the timeline

**Linked Change Events section**
- Each linked CE shown as a card: icon, number, title, origin badge, estimated amount
- Clicking navigates to the CE record
- "Add Event" button for PM+

**Discussion / Comments section**
- Threaded comments
- Each comment shows: avatar, name, role badge, timestamp, body
- PM+ can toggle `visibleToClient` per comment (default: false for internal notes)
- Client-facing view hides all comments where `visibleToClient = false`
- Comment input at bottom (current user avatar + textarea + Send)

**Right sidebar:**

- **Financial Impact** — large card showing total PCO value, delta from prior version, line item breakdown
- **Schedule Impact** — days added/removed, new projected completion date
- **Metadata** — PCO number, status, created, PM name, revision count, linked CE numbers
- **Sub Commitment COs** — list of pending CCOs with subcontractor name and amount
- **Root Cause** — auto-generated text block (editable by PM)
- **Team Annotation** — three toggle buttons: 👍 Positive | 👎 Negative | 📚 Lesson Learned. Multiple can be selected. Optional note field below.
- **Notifications Sent** — log of who was notified and when

**Role-based rendering:**
- `CLIENT` view: hides sidebar sections (Sub CCOs, Root Cause, Metadata detail, internal Notifications). Shows only Financial Impact, Schedule Impact, and a clean Discussion section with client-visible comments only.
- `LEADERSHIP` view: shows financial/schedule/status prominently; collapses linked events and comments by default; shows notification log.
- `PM` view: full detail, all sections visible, all editable.

---

### Screen 4: Official CO Record (`/projects/:id/change-orders/:coId`)

Same layout pattern as PCO Record. Additional sections:
- **Signature status** — client signature (signed/pending) + internal signature (signed/pending). Both required for `FULLY_EXECUTED`.
- **Commitment COs** — expanded list of all CCOs with individual status tracking
- **Financial finalization** — locked final value (no edits after FULLY_EXECUTED)

---

### Screen 5: Project Dashboard Panel

A widget embeddable in the project dashboard. Contains:
- KPI strip: Open Change Events | Active PCOs | Approved This Month | Net Contract Impact
- Pipeline board: three columns (Change Events | Potential COs | Official COs), each showing top 3 cards with overflow count
- Recent activity feed: last 5 timeline events across all records in the project

**Executive Dashboard** — same widget with financial/schedule KPIs only, no pipeline detail. Accessible to `VP` and `LEADERSHIP`.

---

### Screen 6: Notification Center

Accessible via bell icon in global nav.
- Unread badge count (real-time)
- List of all notifications for current user, newest first
- Each item: type icon, message text, linked record (click navigates), timestamp, read/unread state
- "Mark all read" button
- **Login notification queue**: On login, if user has notifications since last login, show a modal summarizing changes before redirecting to dashboard.

---

## WORKFLOW STATE MACHINE

### Change Event

```
DRAFT → OPEN (on save)
OPEN → GROUPED (when added to a PCO)
GROUPED → OPEN (if removed from PCO)
OPEN → CLOSED (when parent PCO reaches FULLY_EXECUTED)
```

### PCO

```
DRAFT → SUBMITTED (PM submits to client)
SUBMITTED → UNDER_REVIEW (client opens)
UNDER_REVIEW → REVISION_REQUESTED (client rejects)
UNDER_REVIEW → APPROVED (client approves)
REVISION_REQUESTED → SUBMITTED (PM creates revision and resubmits)
APPROVED → [triggers PrimeChangeOrder creation]
```

**Revision rule**: When status moves to `REVISION_REQUESTED`, the system does NOT create a new PCO. It increments `currentVersion`, creates a `PCOVersion` snapshot of the current state, and sets status back to `DRAFT` for editing. When the PM resubmits, a new snapshot is taken and status → `SUBMITTED`. The PCO record, its number, all linked events, and all prior version snapshots are preserved permanently.

### Prime Change Order

```
DRAFT → PENDING_SIGNATURES (created from approved PCO)
PENDING_SIGNATURES → FULLY_EXECUTED (both signatures received)
```

### Commitment Change Order

```
DRAFT → PENDING_APPROVAL
PENDING_APPROVAL → APPROVED
APPROVED → PENDING_SIGNATURES
PENDING_SIGNATURES → FULLY_EXECUTED
```

CCOs in `parallelMode = true` can be created and move through `DRAFT → PENDING_APPROVAL → APPROVED` before the Prime CO is executed. They only reach `FULLY_EXECUTED` after the parent Prime CO is executed.

---

## NOTIFICATION SYSTEM

### Trigger → Recipients → Channels

| Trigger | Recipients | Channel |
|---|---|---|
| PCO created by PM | VP + Leadership distribution list | Email + Login queue + Dashboard panel |
| PCO submitted to client | Project PM (confirmation) | In-app |
| Client approves PCO | Project PM | Email + In-app |
| Client requests revision | Project PM | Email + In-app (urgent) |
| RFQ pricing received | Project PM | Email + In-app |
| Official CO fully executed | PM + VP + Leadership | Email + In-app + Login queue |
| New comment (client-visible) | Client | Email |
| New internal comment | PM | In-app |

**Login notification queue logic**: On user login, query `Notification` records where `recipientId = userId` AND `createdAt > user.lastLoginAt` AND `readAt = null`. If count > 0, show a modal summarizing them before redirecting to dashboard. Update `user.lastLoginAt` after showing.

**Leadership distribution group**: Configurable per-project. Store as `ProjectNotificationGroup` with a list of user IDs tagged as `LEADERSHIP_DIST`. All PCO creation events fire to this group.

---

## ACCEPTANCE CRITERIA

### Must pass before Phase 1 is complete:

- [ ] A superintendent can log in and create a Change Event with type, description, and at least one linked document
- [ ] A superintendent cannot create or access PCOs
- [ ] A PM can create a PCO, group multiple change events into it, and submit to client
- [ ] On PCO creation, email fires to configured leadership distribution group
- [ ] On PCO creation, login notification is queued for all recipients in that group
- [ ] Client receives a simplified view of the PCO (no internal notes, no sub names)
- [ ] Client can approve a PCO → status moves to APPROVED → Official CO is auto-created
- [ ] Client can request revision → status returns to editable state → original PCO number retained → version increments
- [ ] All prior PCO versions are accessible via version tabs on the record page
- [ ] No PCO, change event, or timeline entry can be deleted (only voided by admin with audit log)
- [ ] Official CO spawns the correct number of Commitment COs (one per sub referenced in line items)
- [ ] Commitment COs can be created in parallel mode before prime CO execution
- [ ] Timeline on PCO record shows all events back to the originating Change Events, in chronological order
- [ ] Role-based views render correctly: client sees simplified view, PM sees full detail, leadership sees financial headlines
- [ ] Project dashboard panel shows KPIs and pipeline board
- [ ] Login notification modal fires for leadership users with unread notifications since last login
- [ ] Team annotation (Positive / Negative / Lesson Learned) can be set on any executed CO

---

## IMPLEMENTATION PHASES

### Phase 1 — Core Workflow (build in this order)

1. Database schema and migrations (all models above)
2. Auth middleware with role enforcement
3. Change Event CRUD + document attachment
4. PCO CRUD + change event grouping
5. PCO submission + versioning logic (snapshot on submit)
6. Client decision endpoint (approve / revision)
7. Official CO auto-creation from approved PCO
8. Commitment CO creation (parallel mode support)
9. Timeline event writes on every mutation
10. Notification creation on key triggers (in-app only, Phase 1)
11. UI: Change Events list screen
12. UI: PCO Assembly workspace (two-panel, drag-and-drop)
13. UI: PCO Record page (all sections, role-based rendering)
14. UI: Official CO record page
15. UI: Project dashboard panel

### Phase 2 — Notifications + Communication

1. Email delivery integration (Resend or SendGrid)
2. Login notification modal
3. Leadership distribution group configuration
4. Real-time in-app notification badge (Supabase Realtime or WebSocket)
5. Comment system with client visibility toggle
6. Executive/leadership dashboard

### Phase 3 — Financial + Schedule Intelligence

1. Schedule impact calculation and project timeline integration
2. Financial impact aggregation across all COs on a project
3. Root cause auto-generation (AI summary of timeline events)
4. Annotation system + tagging
5. Pattern reporting (frequency of error types, avg CO value, etc.)

### Phase 4 — AI Layer

1. Root cause classification (auto-tag internal subtype from description)
2. Change event clustering recommendations (suggest grouping candidates)
3. Cost estimate pre-fill based on historical similar events
4. Risk flagging (e.g. "3 change events in 7 days — possible scope creep pattern")

---

## CRITICAL IMPLEMENTATION RULES

1. **Never delete.** No hard deletes on Change Events, PCOs, Official COs, or Timeline Events. Use `status = VOID` + audit log for corrections. Timeline is append-only.

2. **PCO revisions are the same record.** When a client requests revision, increment `currentVersion` and snapshot — do not create a new PCO. The PCO number never changes.

3. **Partial approvals do not exist.** The client decision endpoint only accepts `APPROVED` or `REVISION_REQUESTED`. There is no line-item approval mechanism.

4. **Commitment COs support parallel mode.** They can be created and approved before the prime CO is executed. They only reach `FULLY_EXECUTED` after the parent prime CO does.

5. **Timeline is cross-entity.** The PCO timeline must display `TimelineEvent` records from its linked Change Events as well as its own record — sorted chronologically. A user viewing the PCO record sees the full story, going back to when field events were first logged.

6. **Role-based views are server-rendered.** Do not rely on frontend-only conditional rendering for client data visibility. The API must strip sensitive fields (internal comments, sub names, cost breakdowns) when `viewAs=CLIENT` is requested.

7. **Notification emails fire server-side on state transitions.** Use a queue (Bull, Inngest, or Supabase Edge Functions) — do not fire synchronously in the API handler.

8. **Leadership distribution group is per-project.** Store it as a configurable list; do not hard-code roles.

---

## FILE / FOLDER STRUCTURE (suggested)

```
/app
  /projects/[projectId]
    /change-events
      page.tsx                          — Screen 1: Events list
      [eventId]/page.tsx                — CE record (future phase)
    /pcos
      page.tsx                          — PCO list
      new/page.tsx                      — PCO Assembly workspace (create)
      [pcoId]/page.tsx                  — PCO Record page (Screen 3)
      [pcoId]/edit/page.tsx             — PCO Assembly workspace (edit)
    /change-orders
      page.tsx                          — CO list
      [coId]/page.tsx                   — Official CO record (Screen 4)
    /dashboard
      page.tsx                          — Project dashboard (Screen 5)

/components
  /change-management
    ChangeEventCard.tsx
    ChangeEventForm.tsx
    PCOAssemblyWorkspace.tsx
    PCORecordHeader.tsx
    StageProgressBar.tsx
    VersionTabs.tsx
    TimelineRail.tsx
    LinkedEventRow.tsx
    CommentThread.tsx
    PCOSidebar.tsx
    FinancialSummary.tsx
    AnnotationButtons.tsx
    PipelineBoardWidget.tsx
    NotificationModal.tsx

/lib
  /db
    schema.ts
    queries/change-events.ts
    queries/pcos.ts
    queries/change-orders.ts
    queries/notifications.ts
    queries/timeline.ts
  /notifications
    triggers.ts                         — Functions that write Notification records
    email.ts                            — Email send wrappers
  /workflow
    pco-state-machine.ts
    co-state-machine.ts

/api/v1
  /projects/[projectId]/change-events/route.ts
  /projects/[projectId]/pcos/route.ts
  /projects/[projectId]/pcos/[pcoId]/route.ts
  /projects/[projectId]/pcos/[pcoId]/submit/route.ts
  /projects/[projectId]/pcos/[pcoId]/revise/route.ts
  /projects/[projectId]/pcos/[pcoId]/client-decision/route.ts
  /projects/[projectId]/change-orders/route.ts
  /users/me/notifications/route.ts
```

---

## REFERENCE FILES

The following design artifacts are available in the project outputs folder:

- `alito-change-process-flow.html` — Full flow diagram with all stages, decision points, and role annotations
- `alito-ui-prototype.html` — Interactive four-screen UI prototype showing intended layout and interactions for all screens

Use these as the source of truth for UI layout and interaction design. The prototype reflects finalized decisions and should be matched closely in implementation.

---

*End of PRP. Questions or ambiguities: surface them before writing code, not after.*
