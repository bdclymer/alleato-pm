# SubList Improvements — Task List

**Feature:** Estimate SubList tab (bid management workflow)
**Status:** In Progress — current implementation mirrors the Excel sheet (basic CRUD only)
**Goal:** Own the full subcontractor bidding workflow from invitation to award to commitment

---

## Current State

- 5 slots per CSI division (Divisions 02–33)
- Fields: Company (free text), Intend to Submit (Y/N), Email Sent (Y/N), Phone Follow-Up (Y/N), Bid Received (Y/N), Contact, Email, Cell, Price, Comments
- No connection to Company Directory, Outlook, estimate line items, or commitments
- `estimate_sublist_subs` table exists; GET/POST/PATCH/DELETE API routes exist
- UI renders in the SubList tab of the estimate detail page (`estimate-detail-client-v2.tsx`)

---

## Phase 1 — Data Foundation (Quick Wins)

### 1.1 Link Company Field to Company Directory

- [ ] Replace free-text `company` input with a combobox that searches the Company Directory
- [ ] Store `company_id` FK on `estimate_sublist_subs` (migration required)
- [ ] Auto-populate `contact_name`, `email`, `cell` from the selected company's primary contact
- [ ] Keep manual override — if a company isn't in the directory, allow free-text entry and optionally create a new directory record
- [ ] Display company trade tags (Electrical, Mechanical, etc.) as a hint when searching

**Files to touch:**
- `supabase/migrations/` — add `company_id uuid references companies(id)`
- `estimate-detail-client-v2.tsx` — replace `InlineText` with combobox for company field
- `app/api/projects/[projectId]/estimates/[estimateId]/sublist/route.ts` — accept `company_id`

---

### 1.2 Filter Suggested Subs by Division Trade

- [ ] Tag companies in the Company Directory with CSI trade categories (already has `trade` field — confirm mapping)
- [ ] When adding a sub to Division 26 Electrical, filter company suggestions to companies tagged as electrical
- [ ] Allow user to search all companies if their trade isn't in the filtered list

---

### 1.3 Expand from 5 to Unlimited Slots per Division

- [ ] Remove the hardcoded 5-position limit — allow adding as many subs as needed
- [ ] Keep position ordering for display (drag-to-reorder optional for later)
- [ ] Update "Add sub" UX to always show at the bottom of each division's list

---

## Phase 2 — Bid Invitation via Outlook

### 2.1 Scope Package Builder per Division

- [ ] Add a "Scope Package" section per division in the SubList (collapsible)
- [ ] Scope items are a checklist — pre-populated from the estimate's line items for that division
- [ ] User can add/remove/reorder scope items, add clarifications per item
- [ ] Scope package is stored as structured data (new `estimate_sublist_scope_items` table)
- [ ] Scope package can be exported as a PDF or rendered as a shareable link

**New table:**
```sql
estimate_sublist_scope_items (
  id          serial primary key,
  estimate_id integer references estimates(estimate_id),
  division_code text,
  sort_order  integer,
  description text,
  notes       text,
  created_at  timestamptz default now()
)
```

---

### 2.2 Send Bid Invitation via Outlook Integration

- [ ] Add "Send Bid Invitation" button on each sub row (replaces manual "Email Sent Y/N" toggle)
- [ ] Button opens a pre-composed email modal with: subject, body (template), scope package attachment
- [ ] Send via Outlook integration (existing `microsoft_graph` sync infrastructure)
- [ ] On send: mark `email_sent = 'Yes'`, record timestamp, log as a project email in `outlook_email_intake`
- [ ] Schedule a follow-up reminder (configurable days, default 3 business days)
- [ ] "Email Sent Y/N" field becomes read-only once sent, shows timestamp instead of Y/N

**Bid invitation email template fields:**
- Project name, address, bid due date
- Division name and scope package (PDF attachment or link)
- Response instructions (email or upload link)

---

### 2.3 Phone Follow-Up Log

- [ ] Replace "Phone Follow-Up Y/N" with a log entry (date, outcome: Reached / Voicemail / No Answer / Declined, notes)
- [ ] Show most recent call outcome as the column value; full log accessible via expand/tooltip
- [ ] Option to schedule a callback reminder

---

## Phase 3 — Bid Receipt & Leveling

### 3.1 Structured Bid Entry

- [ ] Replace single `price` field with structured bid entry aligned to the scope checklist
- [ ] Each scope item can have a line-item bid value (optional — sub can enter lump sum instead)
- [ ] Flag scope items the sub explicitly excluded (scope gaps)
- [ ] Record bid validity date and any sub-supplied alternates or clarifications

**New table:**
```sql
estimate_sublist_bid_items (
  id            serial primary key,
  sub_id        integer references estimate_sublist_subs(id),
  scope_item_id integer references estimate_sublist_scope_items(id) null,
  description   text,
  amount        numeric(15,2),
  is_excluded   boolean default false,
  notes         text
)
```

---

### 3.2 Bid Leveling View

- [ ] Per-division leveling table: scope items as rows, each sub as a column
- [ ] Show each sub's price per scope item (or "—" if excluded)
- [ ] Calculate leveled total per sub (raw bid + value of scope gaps based on estimator's fill-in)
- [ ] Highlight low bid (raw) and leveled low bid (may differ)
- [ ] Show delta from estimate budget for each sub
- [ ] Exportable as PDF or Excel for owner/client presentation

---

### 3.3 Bid Comparison Summary

- [ ] Per-division summary card showing:
  - Estimate budget
  - Number of bids received
  - Low bid (raw)
  - Average bid
  - Leveled low bid
  - Recommended sub (with reasoning field)
- [ ] Roll up to an estimate-level bid summary page showing all divisions at once

---

## Phase 4 — Sub Selection & Award

### 4.1 Formal Award Action

- [ ] "Award" button per sub row — only one sub can be awarded per division
- [ ] Award records: selected sub, runner-up(s), award date, decision notes
- [ ] Awarded sub is visually distinguished (highlighted row, award badge)
- [ ] Division header shows awarded company name once a selection is made

---

### 4.2 Award → Pre-populate Commitment

- [ ] On award, offer to create a commitment (subcontract) directly from the bid
- [ ] Pre-populate commitment form:
  - Vendor: from `company_id`
  - Scope of work: from scope package description
  - Contract value: from awarded bid total
  - Budget code: from division's estimate line item budget code
  - Project: inherited from estimate
- [ ] Link commitment back to the SubList entry — commitment ID stored on `estimate_sublist_subs`
- [ ] SubList row shows commitment status (Draft / Executed) once created

---

### 4.3 Award → Flow Bid into Estimate

- [ ] "Use this bid" action on the leveling view updates the estimate's line item for that division
- [ ] Records the source (sub name, bid date) as an audit note on the line item
- [ ] Estimate summary auto-updates with the new division total

---

## Phase 5 — Cross-Project Intelligence (AI)

### 5.1 Sub Performance History

- [ ] Track bid history per company across all estimates/projects
- [ ] Per-sub stats: projects bid, win rate, average bid vs. budget delta, average bid vs. final commitment value
- [ ] Surface on sub row as a hover card: "Bid 6 projects, won 2, avg 8% over budget"

---

### 5.2 Smart Invite Suggestions

- [ ] When starting SubList for a division, AI suggests subs to invite based on:
  - Previously bid this division on similar project types
  - Located in the project's region
  - Good performance history
  - Not currently overloaded (no other active commitments in same timeframe — future)
- [ ] Ranked suggestion list with one-click add

---

### 5.3 Pre-Bid Budget Benchmark

- [ ] Before bids arrive, show a benchmark range for each division:
  "Division 09 Finishes — based on 12 similar TI projects, typical range $28–34/SF"
- [ ] Powered by historical bid data from `estimate_sublist_subs` across all projects
- [ ] Flags divisions where current estimate is outside the historical range

---

### 5.4 Sub Reliability Scoring

- [ ] Score each sub on: bid-to-award rate, change order frequency, schedule performance
- [ ] Surface score as a signal in the invite and leveling views
- [ ] Input data comes from commitments (awarded) + change events (post-award performance)

---

## Implementation Order (Recommended)

| Priority | Phase | Task | Effort |
|----------|-------|------|--------|
| 1 | 1.1 | Link Company to Directory | Medium |
| 2 | 1.3 | Remove 5-slot limit | Small |
| 3 | 2.1 | Scope package builder | Medium |
| 4 | 2.2 | Send bid invitation via Outlook | Medium |
| 5 | 3.2 | Bid leveling view | Large |
| 6 | 3.3 | Bid comparison summary | Small |
| 7 | 4.1 | Formal award action | Small |
| 8 | 4.2 | Award → pre-populate commitment | Medium |
| 9 | 4.3 | Award → flow bid into estimate | Small |
| 10 | 1.2 | Filter subs by division trade | Small |
| 11 | 2.3 | Phone follow-up log | Small |
| 12 | 3.1 | Structured bid entry | Large |
| 13 | 5.1 | Sub performance history | Medium |
| 14 | 5.2 | Smart invite suggestions | Large |
| 15 | 5.3 | Pre-bid budget benchmark | Medium |
| 16 | 5.4 | Sub reliability scoring | Large |

---

## Key Design Principles

- **The Company Directory is the source of truth** — no duplicate company records between SubList and Directory
- **Every manual toggle becomes an action** — "Email Sent Y/N" should be the result of actually sending, not a checkbox
- **Bid data flows forward** — SubList → Estimate → Commitment, not three separate manual entries
- **Scope clarity before bid day** — structured scope packages eliminate the "what did they include?" guessing game
- **History compounds** — every project's bid data makes future project estimates more accurate
