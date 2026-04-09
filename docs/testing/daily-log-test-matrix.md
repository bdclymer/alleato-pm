# Daily Log — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 17 | HIGH |
| Views & Navigation | 9 | HIGH |
| Sections & Sub-Records | 20 | HIGH |
| Fields & Data | 14 | HIGH |
| Statuses & Workflows | 4 | HIGH |
| Permissions | 2 | MEDIUM |
| Integrations | 5 | MEDIUM |
| Reporting & Export | 3 | MEDIUM |
| Advanced Features | 11 | MEDIUM |
| **TOTAL** | **85** | |

---

## 1. Core Actions

> Source: Codebase — DailyLogClient, CreateDialogs, page.tsx; Procore Daily Log manifest (list view, create/edit flows)

### 1.1 Create

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Create a log entry with required field only (date) | 1. Navigate to /767/daily-log<br>2. Click "New Log Entry"<br>3. Enter date: 2026-04-08<br>4. Click Create | New row appears in list with date "Apr 8, 2026"; no error shown | HIGH | 🔲 | |
| 1.1.2 | Create a log entry with weather conditions | 1. Click "New Log Entry"<br>2. Enter date: 2026-04-08<br>3. Enter weather: "Sunny, 68°F, light breeze"<br>4. Click Create | Entry appears in list; weather column shows truncated text | HIGH | 🔲 | |
| 1.1.3 | Create fails when date is missing | 1. Click "New Log Entry"<br>2. Leave date blank<br>3. Click Create | Validation error on Date field; form stays open; no record created | HIGH | 🔲 | |
| 1.1.4 | Cannot create duplicate log for same date | 1. Create a log for 2026-04-08<br>2. Attempt to create another log for 2026-04-08 | Error or warning shown: duplicate date; second record not created | MEDIUM | 🔲 | Verify DB constraint behavior |
| 1.1.5 | Date field accepts YYYY-MM-DD format | 1. Click "New Log Entry"<br>2. Enter date as "2026-01-15"<br>3. Click Create | Entry created; list renders date as "Jan 15, 2026" | HIGH | 🔲 | |

### 1.2 Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit weather on an existing log entry | 1. Open any log entry detail<br>2. Click Edit<br>3. Update weather to "Partly cloudy, 72°F"<br>4. Click Save | Updated weather shown; success toast displayed | HIGH | 🔲 | |
| 1.2.2 | Cancel edit discards changes | 1. Open detail → click Edit<br>2. Change weather field<br>3. Click Cancel | Original weather value restored; no data changed | HIGH | 🔲 | |
| 1.2.3 | Edited changes persist after page refresh | 1. Edit and save log entry<br>2. Press Ctrl+R to refresh<br>3. Observe field values | All saved fields retain updated values after reload | HIGH | 🔲 | |
| 1.2.4 | Edit from row action menu | 1. Hover over a list row<br>2. Click row action menu → Edit | Opens edit mode for that log entry | MEDIUM | 🔲 | |

### 1.3 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Delete a single log entry from list | 1. Navigate to /767/daily-log<br>2. Click row action menu on any entry<br>3. Click Delete<br>4. Confirm in dialog | Entry removed from list; success toast shown | HIGH | 🔲 | |
| 1.3.2 | Cancel delete leaves record intact | 1. Click row action → Delete<br>2. Click Cancel in confirmation dialog | Record remains in list unchanged | HIGH | 🔲 | |
| 1.3.3 | Delete from detail page | 1. Open log entry detail<br>2. Action menu → Delete → Confirm | Redirected to list; deleted entry no longer shown | HIGH | 🔲 | |

### 1.4 Sub-Record Create — Manpower

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.4.1 | Add a manpower entry to a log | 1. Open a log entry detail<br>2. Find Manpower section → click "Add Manpower"<br>3. Select log date, enter Trade: "Concrete", Workers: 8, Hours: 9<br>4. Click Create | Manpower row appears with Trade = Concrete, Workers = 8, Hours = 9 | HIGH | 🔲 | |
| 1.4.2 | Add manpower without workers count fails | 1. Click "Add Manpower"<br>2. Enter Trade, leave Workers blank<br>3. Click Create | Error shown; manpower entry not saved | HIGH | 🔲 | workers_count is required in DB |

### 1.5 Sub-Record Create — Equipment

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.5.1 | Add equipment to a log | 1. Open a log entry detail → Equipment section<br>2. Click "Add Equipment"<br>3. Select log, enter Equipment Name: "Excavator CAT 320", Hours Operated: 7<br>4. Click Create | Equipment row appears with correct name and hours | HIGH | 🔲 | |
| 1.5.2 | Add equipment without a name fails | 1. Click "Add Equipment"<br>2. Leave Equipment Name blank<br>3. Click Create | Error shown; entry not saved | HIGH | 🔲 | equipment_name required |

### 1.6 Sub-Record Create — Notes

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.6.1 | Add a note to a log entry | 1. Open a log entry detail → Notes section<br>2. Click "Add Note"<br>3. Select log, enter Description: "Concrete poured for foundation"<br>4. Click Create | Note appears with the entered description | HIGH | 🔲 | |
| 1.6.2 | Add note without description fails | 1. Click "Add Note"<br>2. Leave Description blank<br>3. Click Create | Error shown; note not saved | HIGH | 🔲 | description required |

---

## 2. Views & Navigation

> Source: Codebase — DailyLogClient (table/card/list views, UnifiedTablePage), Procore manifest list state

### 2.1 List View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | List view loads with correct columns | Navigate to /767/daily-log | Table renders with columns: Date, Weather, Created By; default sort is date descending | HIGH | 🔲 | |
| 2.1.2 | Empty state shown when no logs exist | Navigate to a project with no daily logs | Empty state message: "No daily log entries have been created yet." with a New Log Entry button | HIGH | 🔲 | |
| 2.1.3 | Most recent log appears at top | Create two log entries for different dates | Latest date displayed first (default sort: date desc) | HIGH | 🔲 | |

### 2.2 Card View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Switch to card view | Click the card view toggle in toolbar | Each log entry shown as a card with: "Daily Log" label, date as heading, weather preview, Created By line | MEDIUM | 🔲 | |
| 2.2.2 | Card shows fallback text when fields empty | Switch to card view for a log with no weather | Card shows "No weather details" and "Unknown" for empty author | LOW | 🔲 | |

### 2.3 List (Compact) View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | Switch to list (compact) view | Click the list view toggle in toolbar | Each entry shown as a compact row: date as primary text, author as secondary | MEDIUM | 🔲 | |

### 2.4 Detail View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.4.1 | Clicking a row opens log detail | Click on any row in the list | Detail page opens for that log; date shown in header | HIGH | 🔲 | |
| 2.4.2 | Detail page loads sections | Open any log detail | Sections visible: Manpower, Equipment, Notes (and Weather); no error | HIGH | 🔲 | |
| 2.4.3 | Back navigation from detail | Click browser back or back button | Returns to /767/daily-log list | MEDIUM | 🔲 | |

---

## 3. Sections & Sub-Records

> Source: Database tables — daily_log_manpower, daily_log_equipment, daily_log_notes; Procore manifest fields (Workers, Hours, Equipment Name, Hours Operating, Hours Idle, Visitors, Area, Location, Delay, Comments)

### 3.1 Manpower Section

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.1.1 | Manpower section displays existing entries | Open a log with manpower records | Table shows: Trade, Workers Count, Hours Worked, Company columns | HIGH | 🔲 | |
| 3.1.2 | Manpower entry links to a company | Add manpower → select a company from the dropdown | Company name saved and displayed in manpower row | MEDIUM | 🔲 | company_id FK → companies |
| 3.1.3 | Multiple manpower entries per log | Add 3 manpower entries to one log | All 3 rows visible under the same log; totals shown correctly | HIGH | 🔲 | |
| 3.1.4 | Manpower total hours calculated | Add entries with workers × hours | Total hours column shows sum (workers_count × hours_worked) | MEDIUM | 🔲 | |
| 3.1.5 | Delete a manpower entry | Click delete on a manpower row → confirm | Row removed; remaining rows unaffected | HIGH | 🔲 | |

### 3.2 Equipment Section

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.2.1 | Equipment section displays existing entries | Open a log with equipment records | Table shows: Equipment Name, Hours Operated, Hours Idle, Notes | HIGH | 🔲 | |
| 3.2.2 | Equipment hours_idle saved and displayed | Add equipment with Hours Idle: 2 | Equipment row shows Hours Idle = 2 after save | MEDIUM | 🔲 | |
| 3.2.3 | Equipment notes field saved | Add equipment with Notes: "Needs inspection" | Notes value shown in equipment row | MEDIUM | 🔲 | |
| 3.2.4 | Delete an equipment entry | Click delete on an equipment row → confirm | Row removed; log still open | HIGH | 🔲 | |

### 3.3 Notes Section

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.3.1 | Notes section displays existing notes | Open a log with saved notes | Notes shown with: Category, Description | HIGH | 🔲 | |
| 3.3.2 | Note category saved correctly | Add note with category: "Work Performed" | Category displayed in notes list | MEDIUM | 🔲 | |
| 3.3.3 | Delete a note entry | Click delete on a note row → confirm | Note removed from list | HIGH | 🔲 | |

### 3.4 Weather Section

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.4.1 | Weather stored as free text | Create log with weather: "Sunny, 68°F, light breeze" | Weather field shows full entered text | HIGH | 🔲 | Currently stored as Json in DB |
| 3.4.2 | Weather conditions column in list shows truncated text | Enter weather > 100 chars | List shows first 100 chars with "…" ellipsis | MEDIUM | 🔲 | |
| 3.4.3 | Weather column shows "—" when empty | Create log without weather | List weather cell shows "—" | LOW | 🔲 | |

---

## 4. Fields & Data

> Source: database.types.ts — daily_logs, daily_log_manpower, daily_log_equipment, daily_log_notes; Procore manifest columns (Area, Company, Time Observed, Delay, Location, Sky, Temperature, Calamity, Average, Precipitation, Wind, Ground/Sea, Comments, Attachments, Related Items)

### 4.1 Core Log Fields

| # | Field | DB Column | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|-----------|---------|--------------------------|----------------------|---------|--------|
| 4.1.1 | Log Date | log_date | Yes | "2026-04-08" → displays as "Apr 8, 2026" | Blank → validation error | HIGH | 🔲 |
| 4.1.2 | Weather Conditions | weather_conditions | No | Free text "Sunny, 68°F" → saved and displayed | — | HIGH | 🔲 |
| 4.1.3 | Created By | created_by | No | Auto-populated with logged-in user | — | MEDIUM | 🔲 |

### 4.2 Manpower Fields

| # | Field | DB Column | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|-----------|---------|--------------------------|----------------------|---------|--------|
| 4.2.1 | Trade | trade | No | "Electrician" → shown in manpower row | — | HIGH | 🔲 |
| 4.2.2 | Workers Count | workers_count | Yes | 8 → saved as integer | Blank → error | HIGH | 🔲 |
| 4.2.3 | Hours Worked | hours_worked | No | 9.5 → saved as decimal | — | MEDIUM | 🔲 |
| 4.2.4 | Company | company_id | No | Select from company dropdown → FK saved | — | MEDIUM | 🔲 |

### 4.3 Equipment Fields

| # | Field | DB Column | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|-----------|---------|--------------------------|----------------------|---------|--------|
| 4.3.1 | Equipment Name | equipment_name | Yes | "Excavator CAT 320" → shown in table | Blank → error | HIGH | 🔲 |
| 4.3.2 | Hours Operated | hours_operated | No | 7 → saved; shown in row | — | MEDIUM | 🔲 |
| 4.3.3 | Hours Idle | hours_idle | No | 2 → saved; shown in row | — | MEDIUM | 🔲 |
| 4.3.4 | Equipment Notes | notes | No | "Needs inspection" → saved | — | LOW | 🔲 |

### 4.4 Notes Fields

| # | Field | DB Column | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|-----------|---------|--------------------------|----------------------|---------|--------|
| 4.4.1 | Description | description | Yes | "Concrete poured" → shown in notes | Blank → error | HIGH | 🔲 |
| 4.4.2 | Category | category | No | "Work Performed" → shown in notes | — | MEDIUM | 🔲 |

---

## 5. Statuses & Workflows

> Source: Procore Daily Log — daily logs can be in Draft or Submitted state; Procore manifest (Export, Email, Copy actions observed)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | New log created in Draft status | Create a new log entry | Status shows "Draft" (or equivalent default) | HIGH | 🔲 | Verify if status field is implemented |
| 5.1.2 | Submit a daily log | Open a draft log → action menu → Submit | Status changes to "Submitted"; submit action no longer available | HIGH | 🔲 | |
| 5.1.3 | Submitted log is read-only | Open a submitted log | Edit controls disabled or hidden; data displayed in read-only mode | HIGH | 🔲 | |
| 5.1.4 | Log date shown consistently across status changes | Submit a log; verify date field | Log date unchanged after status transition | MEDIUM | 🔲 | |

---

## 6. Permissions

> Source: Procore Permissions Matrix — Daily Log; general project member roles

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 6.1.1 | Read permission: user can view list | Standard user | Navigate to /767/daily-log | List loads; no access denied message | MEDIUM | 🔲 | |
| 6.1.2 | Non-admin cannot delete another user's log | Standard user | Row action on a log created by a different user → Delete | Delete option hidden or disabled; error shown if attempted | MEDIUM | 🔲 | |

---

## 7. Integrations

> Source: Procore manifest (Attachments, Related Items columns); daily-log-scenarios.md (photos integration); Procore Daily Log — schedule, punch list cross-links

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1.1 | Attach a file to a log entry | Open log detail → click "Attach File(s)"<br>→ upload a PDF | Attachment appears with filename and download link | MEDIUM | 🔲 | |
| 7.1.2 | Attachment shown in list view | Open log with an attachment | Attachments column shows count or indicator | MEDIUM | 🔲 | Procore manifest has Attachments column |
| 7.1.3 | Add a related item to a log | Log detail → Related Items section → Add → select an RFI | Item appears under Related Items; link is clickable | MEDIUM | 🔲 | Procore manifest has Related Items column |
| 7.1.4 | Remove a related item from a log | Related Items section → click unlink on a linked item | Item removed from list; log unaffected | MEDIUM | 🔲 | |
| 7.1.5 | Email a daily log | Log detail → action menu → Email | Email dialog opens; can enter recipient and send | MEDIUM | 🔲 | Procore manifest shows Email action |

---

## 8. Reporting & Export

> Source: Procore manifest (Export and Reports toolbar actions); daily-log-scenarios.md known gaps (PDF export)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Export daily log list | Navigate to /767/daily-log → click Export (toolbar) | CSV or PDF file downloads with visible log records | MEDIUM | 🔲 | Export action visible in Procore manifest |
| 8.1.2 | Generate daily log PDF report | Log detail or list → click Reports → select PDF | PDF report downloads showing date, weather, manpower, equipment, notes | MEDIUM | 🔲 | Procore manifest shows Reports action |
| 8.1.3 | Copy / duplicate a log entry | Log detail or list → action menu → Copy | New log entry created with same data; date field editable | LOW | 🔲 | Procore manifest shows Copy action |

---

## 9. Advanced Features

> Source: Codebase — DailyLogClient search/sort/column toggle; Procore manifest (Search, All Areas, date grouping)

### 9.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Search by date string | Type "2026-04-08" in search box | List filters to log entries matching that date string | HIGH | 🔲 | |
| 9.1.2 | Search by author (Created By) | Type a username in search box | List filters to entries created by that user | MEDIUM | 🔲 | |
| 9.1.3 | Clear search restores full list | Clear the search box after filtering | All records re-appear | HIGH | 🔲 | |
| 9.1.4 | Search with no matches shows filtered empty state | Type a date that has no log | "Try adjusting your search." message shown; no table rows | MEDIUM | 🔲 | |

### 9.2 Sorting

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.2.1 | Sort by date ascending (oldest first) | Click "Date" column header | Records reordered with oldest date at top | HIGH | 🔲 | |
| 9.2.2 | Sort by date descending (newest first) | Click "Date" column header again | Records reordered with newest date at top (default) | HIGH | 🔲 | |
| 9.2.3 | Sort by Created By | Click "Created By" column header | Records sorted alphabetically by author name | MEDIUM | 🔲 | |

### 9.3 Column Visibility

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.3.1 | Toggle Created At column visible | Open column selector → enable "Created" | Created column appears in table | LOW | 🔲 | defaultVisible: false |
| 9.3.2 | Toggle Weather column off | Open column selector → hide "Weather" | Weather column disappears; Date and Created By remain | LOW | 🔲 | |

### 9.4 Pagination

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.4.1 | Pagination controls shown with >25 entries | Create 26 log entries | Pagination controls appear; page 1 shows 25 entries; page 2 shows remaining | MEDIUM | 🔲 | Default perPage = 25 |

---

## Sources

| # | Title | URL / Location | Category |
|---|-------|----------------|---------|
| 1 | Daily Log list page | `frontend/src/app/(main)/[projectId]/daily-log/page.tsx` | Codebase |
| 2 | Daily Log client component | `frontend/src/app/(main)/[projectId]/daily-log/daily-log-client.tsx` | Codebase |
| 3 | Create Dialogs (Manpower, Equipment, Notes) | `frontend/src/components/daily-log/CreateDialogs.tsx` | Codebase |
| 4 | Database types — daily_logs table | `frontend/src/types/database.types.ts` (line 6472) | Codebase |
| 5 | Database types — daily_log_manpower | `frontend/src/types/database.types.ts` (line 6395) | Codebase |
| 6 | Database types — daily_log_equipment | `frontend/src/types/database.types.ts` (line 6357) | Codebase |
| 7 | Database types — daily_log_notes | `frontend/src/types/database.types.ts` (line 6440) | Codebase |
| 8 | Procore Daily Log manifest — list state | `.claude/procore-manifests/daily-log/manifest.json` | Procore Capture |
| 9 | Daily Log guided test scenarios | `docs/testing/daily-log-scenarios.md` | Codebase |
| 10 | Create a Daily Log (Procore docs) | https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/create-a-daily-log | Procore Docs |
| 11 | Edit a Daily Log (Procore docs) | https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/edit-a-daily-log | Procore Docs |
| 12 | Delete a Daily Log (Procore docs) | https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/delete-a-daily-log | Procore Docs |
| 13 | Add Manpower to a Daily Log | https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/add-manpower-to-a-daily-log | Procore Docs |
| 14 | Add Equipment to a Daily Log | https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/add-equipment-to-a-daily-log | Procore Docs |
| 15 | Add Notes to a Daily Log | https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/add-notes-to-a-daily-log | Procore Docs |
| 16 | Export a Daily Log as PDF | https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/export-a-daily-log-as-a-pdf | Procore Docs |
| 17 | Submit a Daily Log (Procore docs) | https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/submit-a-daily-log | Procore Docs |
| 18 | Permissions Matrix — Daily Log | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-daily-log-permissions | Procore Docs |
| 19 | Add Related Items to a Daily Log | https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/add-related-items-to-a-daily-log | Procore Docs |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
