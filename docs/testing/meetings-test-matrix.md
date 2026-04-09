# Meetings — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 18 | HIGH |
| Views & Navigation | 11 | HIGH |
| Fields & Data | 14 | HIGH |
| Meeting Prep (AI) | 7 | MEDIUM |
| Transcript & Digest | 8 | HIGH |
| Statuses | 6 | HIGH |
| Permissions | 2 | MEDIUM |
| Integrations | 5 | MEDIUM |
| Reporting & Export | 3 | MEDIUM |
| Advanced Features | 13 | MEDIUM |
| **TOTAL** | **87** | |

---

## 1. Core Actions

> Source: Codebase — `CreateMeetingDialog`, `EditMeetingModal`, schedule page (`/schedule`), `useMeetingsTable` delete flow, API routes `POST /api/projects/[projectId]/meetings`, `PUT/DELETE /api/projects/[projectId]/meetings/[meetingId]`

### 1.1 Create (Quick Dialog)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Create a meeting with Title only | 1. Navigate to `/767/meetings`<br>2. Click **Create Meeting**<br>3. Enter Title: **Weekly OAC**<br>4. Click **Create Meeting** | Meeting appears in the list with title "Weekly OAC". Status defaults to "complete". Access level defaults to "private". | HIGH | 🔲 | |
| 1.1.2 | Create with all fields filled in | Fill Title, Date, Duration (60), Category (OAC Meeting), Participants (Alice, Bob), Access Level (public), Description, then click Create | All fields persisted; meeting appears in list; clicking the row opens a detail page with all values | MEDIUM | 🔲 | |
| 1.1.3 | Create fails when title is empty | Open Create dialog, leave Title blank, click Create | Validation error "Title is required" shown; dialog stays open; no record created | HIGH | 🔲 | |
| 1.1.4 | Cancel create discards data | Open Create dialog, fill Title, click Cancel | Dialog closes; no new record appears in list | HIGH | 🔲 | |
| 1.1.5 | Dialog closes after successful create | Create a meeting with valid data | Dialog closes automatically; new record visible in list without full page reload | HIGH | 🔲 | |

### 1.2 Schedule Meeting (Dedicated Form)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Navigate to Schedule Meeting page | Click **Schedule Meeting** button from the list toolbar | Navigates to `/767/meetings/schedule`; form page loads with title "Schedule Meeting" | HIGH | 🔲 | |
| 1.2.2 | Schedule with required fields | Fill Title and Date & Time; click **Schedule & Prep** | Meeting created with status "scheduled"; redirected to `/767/meetings/[id]/prep` | HIGH | 🔲 | |
| 1.2.3 | Duration validation — minimum 1 minute | Enter Duration = 0; submit | Validation error "Duration must be at least 1 minute"; form not submitted | HIGH | 🔲 | |
| 1.2.4 | Duration validation — maximum 1440 minutes | Enter Duration = 1441; submit | Validation error "Duration cannot exceed 1440 minutes" | MEDIUM | 🔲 | |
| 1.2.5 | Meeting type dropdown lists all options | Open Category / Meeting Type dropdown | Options include: OAC Meeting, Subcontractor Meeting, Internal Meeting, Safety Meeting, Design Review, Progress Meeting, Kickoff Meeting, Other | MEDIUM | 🔲 | |
| 1.2.6 | Back link returns to meetings list | Click **Back to Meetings** | Navigates to `/767/meetings` | LOW | 🔲 | |

### 1.3 Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Edit meeting via row action menu | Row action menu → **Edit details** → change Title → Save | Changes persist; updated title visible in list | HIGH | 🔲 | |
| 1.3.2 | Edit opens pre-filled with saved values | Open edit dialog for an existing meeting | All fields (title, date, duration, participants, status, access level, summary) show previously saved values; no blank placeholders | HIGH | 🔲 | |
| 1.3.3 | Edit project assignment with autocomplete | In Edit modal, type 2+ characters in Project field | Matching project names appear in a dropdown; selecting one links the meeting to that project | MEDIUM | 🔲 | |
| 1.3.4 | Cancel edit discards changes | Open Edit modal, change Title, click Cancel | Original title unchanged; modal closes | HIGH | 🔲 | |

### 1.4 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.4.1 | Delete a single meeting | Row action menu → **Delete** → confirm dialog | Meeting removed from list; success toast shown | HIGH | 🔲 | |
| 1.4.2 | Cancel delete leaves record intact | Row action menu → Delete → click **Cancel** in dialog | Meeting remains in list unchanged | HIGH | 🔲 | |
| 1.4.3 | Delete also removes meeting segments | Delete a meeting that has transcript segments | Associated rows in `meeting_segments` are also deleted; no orphaned data | HIGH | 🔲 | |
| 1.4.4 | Bulk delete multiple meetings | Select 2+ meetings via checkboxes → click bulk delete → confirm | All selected meetings removed; toast shows count; unselected meetings unchanged | HIGH | 🔲 | |

---

## 2. Views & Navigation

> Source: `MeetingsTablePage`, `UnifiedTablePage`, detail page (`/[meetingId]/page.tsx`), `MeetingDetailContent`

### 2.1 List View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | List page loads with correct default columns | Navigate to `/767/meetings` | Table renders with columns: Title, Date, Project, Description, Participants, Links | HIGH | 🔲 | |
| 2.1.2 | Title column links to detail page | Click a meeting title in the table | Navigates to `/767/meetings/[meetingId]` | HIGH | 🔲 | |
| 2.1.3 | Status dot shown on title column | At least one meeting with a status set | Colored status dot appears to the left of the title text | MEDIUM | 🔲 | |
| 2.1.4 | Participants column shows avatar stack | Meeting with participants set | Participant initials/avatars shown; full list visible on hover | MEDIUM | 🔲 | |
| 2.1.5 | Links column shows transcript and Fireflies icons | Meeting with `source` and/or `fireflies_link` set | Transcript icon and/or Fireflies flame icon appear; clicking opens link in new tab | MEDIUM | 🔲 | |
| 2.1.6 | Card view renders correctly | Switch to card view via view toggle | Each meeting shown as a card with Date, Title, Project, Type/Category | MEDIUM | 🔲 | |
| 2.1.7 | List view renders correctly | Switch to list view via view toggle | Each meeting shown as a compact row with Title, Date, and Type | MEDIUM | 🔲 | |

### 2.2 Side Preview Pane

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Clicking a row opens preview pane | Click a meeting row (not the title link) | Right-side preview pane opens showing meeting details; pane width ~512px | HIGH | 🔲 | |
| 2.2.2 | Preview pane keyboard navigation | Use arrow keys on focused table row | Active row moves; preview pane updates to show newly focused meeting | MEDIUM | 🔲 | |

### 2.3 Detail Page

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | Detail page meta bar shows date, duration, project, and Fireflies link | Open any meeting with all those fields | Meta bar at top shows: date formatted as "Weekday, Month D, YYYY", duration in minutes, project name, and external links | HIGH | 🔲 | |
| 2.3.2 | Back link returns to meetings list | Click the back breadcrumb at the top of the detail page | Navigates to `/767/meetings` | MEDIUM | 🔲 | |

---

## 3. Fields & Data

> Source: `CreateMeetingDialog`, `EditMeetingModal`, schedule form, `document_metadata` DB table, API `POST /meetings`, `PUT /meetings/[id]`

### 3.1 Create / Edit Form Fields

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 3.1.1 | Title | Text | Yes | Any non-blank string saved | Blank → "Title is required" | HIGH | 🔲 |
| 3.1.2 | Date | Date picker | No | ISO date (2026-04-08) saved and shown as "Apr 8, 2026" in list | — | HIGH | 🔲 |
| 3.1.3 | Duration (minutes) | Number | No (schedule form requires it) | 60 → shown as "60 min" in list and detail | 0 or negative → validation error on schedule form | HIGH | 🔲 |
| 3.1.4 | Category / Type | Dropdown | No | OAC Meeting, Subcontractor Meeting, Internal Meeting, Safety Meeting, Design Review, Progress Meeting, Kickoff Meeting, Other | — | HIGH | 🔲 |
| 3.1.5 | Participants | Comma-separated text | No | "Alice Smith, Bob Jones" → participant avatars shown | — | MEDIUM | 🔲 |
| 3.1.6 | Access Level | Dropdown | No | public, private, restricted — all save correctly | — | MEDIUM | 🔲 |
| 3.1.7 | Description / Purpose | Textarea | No | Multi-line text saved and shown on detail page | — | MEDIUM | 🔲 |
| 3.1.8 | Status (edit only) | Dropdown | No | complete, processing, pending, error — all selectable | — | MEDIUM | 🔲 |
| 3.1.9 | Summary (edit only) | Textarea | No | Multi-line summary saved and visible on detail page | — | LOW | 🔲 |

### 3.2 Inline Editing

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.2.1 | Inline edit title via pencil icon | Hover over title cell → click pencil → change text → press Enter | Title updated in-place; changes persist after page refresh | HIGH | 🔲 | |
| 3.2.2 | Inline edit date by clicking date cell | Click date cell → change date → press Enter or Tab | Date updated in list; change persists after refresh | HIGH | 🔲 | |
| 3.2.3 | Inline edit project via dropdown | Click project cell → select a different project → saves | Project tag updates immediately | MEDIUM | 🔲 | |
| 3.2.4 | Tab moves to next inline-editable cell | While in title inline edit → press Tab | Focus moves to the next editable cell in the row | MEDIUM | 🔲 | |
| 3.2.5 | Escape cancels inline edit | While editing title → press Escape | Original value restored; no changes saved | HIGH | 🔲 | |

---

## 4. Meeting Prep (AI)

> Source: `/[meetingId]/prep/page.tsx`, `use-meeting-prep` hooks, `POST /api/projects/[projectId]/meetings/[meetingId]/prep/generate`, `PUT .../prep`

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | Prep page accessible from row action menu | Row action menu → **Meeting Prep** | Navigates to `/767/meetings/[id]/prep` | HIGH | 🔲 | |
| 4.1.2 | Empty prep shows Generate and Start from Scratch options | Open prep page for a meeting with no existing prep | Empty state shown with two buttons: "Generate Meeting Prep" and "Start from Scratch" | HIGH | 🔲 | |
| 4.1.3 | Generate AI prep button triggers generation | Click **Generate Meeting Prep** | Loading state shown; after 15–30 seconds, generated content appears in the editor | HIGH | 🔲 | |
| 4.1.4 | Start from Scratch populates editor with template | Click **Start from Scratch** | Editor pre-populated with "# Meeting Prep: [Title]" template; cursor ready to edit | MEDIUM | 🔲 | |
| 4.1.5 | Auto-save triggers after typing | Type content in the editor | After 1.5 seconds, "Saving..." indicator briefly appears, then "Last saved [time]" | HIGH | 🔲 | |
| 4.1.6 | Regenerate replaces content after confirmation | Existing prep present → click **Regenerate Prep** → confirm dialog | Confirmation prompt shown; after confirming, old content replaced with new generation | MEDIUM | 🔲 | |
| 4.1.7 | Prep sidebar shows project tool quick links | Open any prep page | Sidebar "Project Tools" section shows links to Budget, Change Orders, RFIs, Schedule, Commitments | LOW | 🔲 | |

---

## 5. Transcript & AI Digest

> Source: `MeetingDetailContent`, `DigestSection`, `FormattedTranscript`, `parseTranscriptSections`, `GET /api/projects/[projectId]/meetings/[meetingId]/digest`

### 5.1 Transcript Sections

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Meeting Overview section renders from transcript | Open a meeting with a Fireflies transcript | "Meeting Overview" accordion section visible at top; shows bullet summary or short overview | HIGH | 🔲 | |
| 5.1.2 | Summary section collapses by default | Meeting with parsed summary | "Summary" section is collapsed by default; clicking expands it with full text | MEDIUM | 🔲 | |
| 5.1.3 | Discussion Topics section shows segment list | Meeting with `meeting_segments` rows | "Discussion Topics (N)" section lists each segment with its title and summary | HIGH | 🔲 | |
| 5.1.4 | Full Transcript section renders speaker turns | Meeting with formatted transcript content | "Transcript" section shows speaker-labeled turns; speakers highlighted by name | HIGH | 🔲 | |
| 5.1.5 | Notes section collapses by default | Meeting with notes parsed from transcript | "Notes" section present and collapsed; expands on click | LOW | 🔲 | |

### 5.2 AI Digest

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.2.1 | AI Digest section shows when digest exists | Open a meeting that has a `meeting_digests` row | "AI Digest" section appears with Sparkles icon; shows Decisions, Action Items, Risks, Opportunities | HIGH | 🔲 | |
| 5.2.2 | AI Digest not rendered when missing | Open a meeting with no digest | AI Digest section not visible; no error shown | MEDIUM | 🔲 | |
| 5.2.3 | Action items in digest show assignee and due date | Meeting digest with action items that have assignee/due fields | Each action item shows text, assignee (e.g. "— Alice"), and due date "(by 2026-05-01)" | HIGH | 🔲 | |

---

## 6. Statuses

> Source: `EditMeetingModal` status dropdown, `MeetingsTable` StatusBadge, `document_metadata.status` column

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 6.1.1 | Default status on new meeting is "complete" | Create a meeting via the quick dialog without specifying status | StatusBadge in list shows "complete" | HIGH | 🔲 | |
| 6.1.2 | Default status on scheduled meeting is "scheduled" | Create meeting via /schedule form | StatusBadge shows "scheduled" after creation | HIGH | 🔲 | |
| 6.1.3 | Status "complete" — embedded indicator shows Yes | Meeting with status = complete | Embedded column shows green dot and "Yes" | MEDIUM | 🔲 | |
| 6.1.4 | Status other than "complete" — embedded shows No | Meeting with status = processing or pending | Embedded column shows grey dot and "No" | MEDIUM | 🔲 | |
| 6.1.5 | Edit status to "processing" | Edit modal → Status → Processing → Save | StatusBadge updates to "processing" | HIGH | 🔲 | |
| 6.1.6 | Edit status to "error" | Edit modal → Status → Error → Save | StatusBadge updates to "error" | MEDIUM | 🔲 | |

---

## 7. Permissions

> Source: API auth guards, `supabase.auth.getUser()` checks in all API routes

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 7.1.1 | Unauthenticated user cannot call meetings API | Unauthenticated | Call `GET /api/projects/767/meetings` without a session | Returns 401 Unauthorized | MEDIUM | 🔲 | |
| 7.1.2 | Authenticated user can view meetings list | Standard user (test1@mail.com) | Navigate to `/767/meetings` | Page loads; meetings visible; no access denied | MEDIUM | 🔲 | |

---

## 8. Integrations

> Source: Meeting detail sidebar — "Project Tools" section; home page meetings-section; `(tables)/meetings` global view; related meetings panel

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Related meetings sidebar links work | Open a meeting detail page; sidebar shows related meetings | Clicking a related meeting link navigates to that meeting's detail page | MEDIUM | 🔲 | |
| 8.1.2 | Home page meetings section links to list | Navigate to `/767` (project home) | Recent meetings section visible; "View all" link navigates to `/767/meetings` | MEDIUM | 🔲 | |
| 8.1.3 | Global meetings table at /meetings | Navigate to `/meetings` (tables route) | Global meetings table loads with data from all projects | MEDIUM | 🔲 | |
| 8.1.4 | Fireflies link opens external recording | Open a meeting that has `fireflies_link` set | Clicking the Fireflies icon or "View in Fireflies" opens the external URL in a new tab | MEDIUM | 🔲 | |
| 8.1.5 | Source transcript file link works | Meeting with `source` URL pointing to Supabase storage | Clicking the transcript icon in the Links column opens or downloads the transcript file | MEDIUM | 🔲 | |

---

## 9. Reporting & Export

> Source: `UnifiedTablePage` export handler, `handleExport` in `use-meetings-table`, `browser_pdf_save` detail page

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Export meetings list as CSV | List page → click export (download) icon in toolbar | CSV file downloads; columns include: Title, Date, Project, Description, Participants, Type, Category, Links | MEDIUM | 🔲 | |
| 9.1.2 | CSV export respects active filters | Apply a Year filter, then export | Downloaded CSV contains only the filtered rows | MEDIUM | 🔲 | |
| 9.1.3 | Detail page View file link opens transcript | Open meeting detail; click "View file" link in meta bar | Transcript file opens in a new tab (Supabase storage URL) | LOW | 🔲 | |

---

## 10. Advanced Features

> Source: `useMeetingsTable`, `buildMeetingFilters`, `UnifiedTablePage` toolbar, pagination config, `EMPTY_FILTERS`

### 10.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.1.1 | Search by title | Type part of a meeting title in the search box | List filters in real-time to matching meetings | HIGH | 🔲 | |
| 10.1.2 | Search by participant name | Type a participant's name | List shows meetings whose participants field contains that name | HIGH | 🔲 | |
| 10.1.3 | Clearing search restores full list | Type a search term, then clear the field | All meetings reappear | HIGH | 🔲 | |

### 10.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.2.1 | Filter by Year | Click Filters → select Year = 2026 | Only meetings with dates in 2026 shown | HIGH | 🔲 | |
| 10.2.2 | Filter by Type | Filters → Type = "OAC Meeting" | Only meetings with category/type "OAC Meeting" shown | MEDIUM | 🔲 | |
| 10.2.3 | Filter by Category | Filters → Category | Only meetings with matching category shown | MEDIUM | 🔲 | |
| 10.2.4 | Clear all filters | Apply filters → click Clear Filters | All meetings restored; filter chips removed | MEDIUM | 🔲 | |

### 10.3 Column Visibility

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.3.1 | Hide Description column | Column selector → uncheck Description | Description column disappears from table; all other columns intact | LOW | 🔲 | |
| 10.3.2 | Show hidden columns (Type, Category) | Column selector → check Type and Category | Type and Category columns appear in table | LOW | 🔲 | |

### 10.4 Pagination

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.4.1 | Pagination controls visible with large dataset | More meetings than per-page limit | Page navigation controls appear at bottom; clicking next page loads next set | MEDIUM | 🔲 | |
| 10.4.2 | Per-page count change takes effect | Change per-page from 25 to 50 | Table re-renders with more rows; page resets to 1 | LOW | 🔲 | |

### 10.5 Sorting

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.5.1 | Default sort is date descending | Open meetings list with data | Most recent meeting appears at top | HIGH | 🔲 | |
| 10.5.2 | Sort by title ascending | Click Title column header | Meetings sorted A→Z by title | MEDIUM | 🔲 | |

---

## Sources

| # | Title | URL / Location | Category |
|---|-------|---------------|---------|
| 1 | Meetings list page | `frontend/src/app/(main)/[projectId]/meetings/page.tsx` | Core |
| 2 | Meeting detail page | `frontend/src/app/(main)/[projectId]/meetings/[meetingId]/page.tsx` | Core |
| 3 | Schedule meeting page | `frontend/src/app/(main)/[projectId]/meetings/schedule/page.tsx` | Core |
| 4 | Meeting prep page | `frontend/src/app/(main)/[projectId]/meetings/[meetingId]/prep/page.tsx` | AI |
| 5 | Meetings list API | `frontend/src/app/api/projects/[projectId]/meetings/route.ts` | API |
| 6 | Meeting detail API | `frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/route.ts` | API |
| 7 | Meeting prep API | `frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/prep/route.ts` | API |
| 8 | Meeting digest API | `frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/digest/route.ts` | API |
| 9 | Create Meeting Dialog | `frontend/src/components/meetings/create-meeting-dialog.tsx` | UI |
| 10 | Edit Meeting Modal | `frontend/src/components/meetings/edit-meeting-modal.tsx` | UI |
| 11 | Meeting detail content | `frontend/src/components/meetings/meeting-detail-content.tsx` | UI |
| 12 | Meetings table component | `frontend/src/components/meetings/meetings-table.tsx` | UI |
| 13 | Digest section component | `frontend/src/app/(main)/[projectId]/meetings/[meetingId]/digest-section.tsx` | UI |
| 14 | MeetingsTablePage feature | `frontend/src/features/meetings/meetings-table-page.tsx` | Feature |
| 15 | Meetings table config | `frontend/src/features/meetings/meetings-table-config.tsx` | Feature |
| 16 | useMeetingsTable hook | `frontend/src/features/meetings/use-meetings-table.tsx` | Hook |
| 17 | Meetings actions bar | `frontend/src/app/(main)/[projectId]/meetings/meetings-actions.tsx` | UI |
| 18 | Meetings scenarios (non-technical) | `docs/testing/meetings-scenarios.md` | Testing |
| 19 | Document metadata table | `frontend/src/types/database.types.ts` — `document_metadata` | DB |
| 20 | Meeting segments table | `frontend/src/types/database.types.ts` — `meeting_segments` | DB |
| 21 | Meeting digests table | `frontend/src/types/database.types.ts` — `meeting_digests` | DB |
| 22 | Meeting preps table | `frontend/src/types/database.types.ts` — `meeting_preps` | DB |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | | | | | |
