# Meetings — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** meetings
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Meetings")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

A **meeting record** is a log of a real project meeting — who attended, what was discussed, what decisions were made, and what tasks were assigned. The Meetings tool stores these records so the whole team has a formal written history of every project meeting.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Meetings page | HIGH |
| 1.2 | Navigation | Open a meeting detail page | HIGH |
| 2.1 | Create | Create a new meeting with required fields only | HIGH |
| 2.2 | Create | Create a meeting with all fields filled in | MEDIUM |
| 2.3 | Create | Try to create a meeting without a title | HIGH |
| 3.1 | Edit | Edit the title of a meeting directly in the table | HIGH |
| 3.2 | Edit | Edit the date of a meeting directly in the table | HIGH |
| 3.3 | Edit | Pressing Escape cancels an inline edit | MEDIUM |
| 4.1 | Delete | Delete a meeting using the row action menu | HIGH |
| 5.1 | Filters & Search | Search for a meeting by its title | HIGH |
| 5.2 | Filters & Search | Filter meetings to a specific year | MEDIUM |
| 5.3 | Filters & Search | Filter meetings by category | MEDIUM |
| 6.1 | Column Visibility | Toggle column visibility using the column selector | LOW |
| 7.1 | Export | Download the meetings list as a spreadsheet | MEDIUM |
| 8.1 | Detail Page | Action items visible | HIGH |
| 8.2 | Detail Page | Decisions visible | HIGH |
| 8.3 | Detail Page | Related meetings sidebar | MEDIUM |
| 9.1 | Edge Cases | Meetings page shows a helpful message when no meetings exist | MEDIUM |

---

## 1. Navigation

### 1.1 — Open the Meetings page
**What this checks:** The Meetings list page loads without errors and shows existing meeting records. A meeting record is a log of a real project meeting — who attended, what was discussed, and what decisions were made.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Go to: http://localhost:3000/767/meetings
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of meetings is visible with columns for Title, Date, Project, Description, Participants, and Links. No error messages appear. The page title says "Meetings".

---

### 1.2 — Open a meeting detail page
**What this checks:** Clicking a meeting record opens a detail page with all the meeting information — summary, action items, decisions, transcript, and more.

**Setup:** The Meetings list must have at least one existing record.

**Steps:**
1. Open the Meetings page at /767/meetings
2. Click the title of any meeting in the list
3. Wait for the page to finish loading

**Expected result:** The meeting detail page opens. The meeting title is shown at the top. Sections visible include: Summary, Action Items, Decisions, Risks, and Transcript (or similar). No error messages appear.

---

## 2. Create

### 2.1 — Create a new meeting with required fields only
**What this checks:** A user can log a new meeting with just a title and it appears in the list.

**Steps:**
1. On the Meetings page, click the **New Meeting** or **Add Meeting** button (top right)
2. In the **Title** field, type: **Weekly Coordination Meeting**
3. Click the **Save** or **Create** button
4. Wait for the page to stop loading

**Expected result:** A success message appears. The new meeting "Weekly Coordination Meeting" appears in the list. No error messages are shown.

---

### 2.2 — Create a meeting with all fields filled in
**What this checks:** All optional fields — date, duration, participants, category, description — save correctly and appear on the detail page.

**Steps:**
1. Click **New Meeting**
2. In the **Title** field, type: **Full Fields Meeting Test**
3. In the **Date** field, enter: **2026-04-08**
4. In the **Duration** field, type: **60**
5. In the **Participants** field, type: **Alice Smith, Bob Jones**
6. In the **Category** field, type: **Project**
7. In the **Description** field, type: **This is a test meeting with all fields filled in**
8. Click **Save**
9. Find "Full Fields Meeting Test" in the list and click it to open

**Expected result:** The detail page shows all saved values: date 2026-04-08, duration 60 minutes, participants Alice Smith and Bob Jones, category Project, and the description. No fields are blank.

---

### 2.3 — Try to create a meeting without a title
**What this checks:** The form prevents saving when the required Title field is left empty.

**Steps:**
1. Click **New Meeting**
2. Leave the **Title** field completely empty
3. Click the **Save** or **Create** button

**Expected result:** An error message appears near the Title field (e.g. "Title is required"). The record is NOT created. The form stays open.

---

## 3. Edit

### 3.1 — Edit the title of a meeting directly in the table
**What this checks:** Hovering over the title cell and clicking the pencil icon lets you edit the title inline without leaving the list page.

**Setup:** The Meetings list must have at least one existing record.

**Steps:**
1. On the Meetings page, hover your mouse over the title of any meeting in the table
2. A pencil icon appears — click it
3. Clear the text and type: **Updated Meeting Title**
4. Press **Enter** or click outside the field to save

**Expected result:** The title in the table updates to "Updated Meeting Title" immediately. A success notification briefly appears. No page reload is required.

---

### 3.2 — Edit the date of a meeting directly in the table
**What this checks:** Clicking the date cell opens a date input and the new date is saved.

**Setup:** The Meetings list must have at least one existing record.

**Steps:**
1. On the Meetings page, click the date cell of any meeting row
2. A date input appears — change the date to: **2026-04-08**
3. Press **Enter** or click outside to save

**Expected result:** The date in the table updates to show April 8, 2026. A success notification briefly appears.

---

### 3.3 — Pressing Escape cancels an inline edit
**What this checks:** Pressing the Escape key while editing a cell discards the change and restores the original value.

**Setup:** The Meetings list must have at least one existing record.

**Steps:**
1. Click the pencil icon on any meeting title to start editing
2. Type some random text: **DO NOT SAVE THIS**
3. Press the **Escape** key

**Expected result:** The cell stops editing and shows the original title. "DO NOT SAVE THIS" does not appear anywhere.

---

## 4. Delete

### 4.1 — Delete a meeting using the row action menu
**What this checks:** A meeting record can be deleted from the list and disappears afterwards.

**Setup:** Create a meeting named **Delete Me Meeting** before running this scenario.

**Steps:**
1. On the Meetings page, hover over the row for **Delete Me Meeting**
2. Click the three-dot action menu that appears on the right side of the row
3. Click **Delete**
4. Confirm the deletion in the dialog that appears
5. Wait for the page to stop loading

**Expected result:** The record "Delete Me Meeting" is no longer visible in the list. A success message (toast) briefly appears.

---

## 5. Filters & Search

### 5.1 — Search for a meeting by its title
**What this checks:** The search box filters the list to only show meetings whose title or participants match the typed text.

**Setup:** The Meetings list must have at least two records with different titles.

**Steps:**
1. On the Meetings page, find the search box in the toolbar (usually shows a magnifying glass or says "Search...")
2. Type part of a known meeting title, e.g.: **Weekly**
3. Wait for the list to filter

**Expected result:** The list narrows to show only records whose title or participants contain "Weekly". Records with unrelated titles are hidden. Clearing the search box brings all records back.

---

### 5.2 — Filter meetings to a specific year
**What this checks:** The Year filter shows only meetings that happened in the chosen year.

**Setup:** At least one meeting must exist with a date set.

**Steps:**
1. Click the **Filters** button in the toolbar
2. Find the **Year** filter
3. Select the year **2026**
4. Apply or close the filter panel

**Expected result:** Only meetings with dates in 2026 appear in the list. Meetings from other years are hidden.

---

### 5.3 — Filter meetings by category
**What this checks:** The Category filter narrows the list to meetings tagged with the chosen category.

**Setup:** At least one meeting must have a Category set.

**Steps:**
1. Click the **Filters** button
2. Find the **Category** filter
3. Select a category that at least one meeting has (e.g. **Project**)
4. Apply or close the filter panel

**Expected result:** Only meetings tagged with the selected category appear. All other meetings are hidden.

---

## 6. Column Visibility

### 6.1 — Toggle column visibility using the column selector
**What this checks:** Clicking the column visibility control lets you hide a column and it disappears from the table.

**Steps:**
1. On the Meetings page, find the column selector button in the toolbar (looks like columns or an eye icon)
2. Click it to open the column list
3. Uncheck **Description** to hide it
4. Close the selector

**Expected result:** The Description column disappears from the table. All other columns still appear correctly. No error messages appear.

---

## 7. Export

### 7.1 — Download the meetings list as a spreadsheet
**What this checks:** Clicking the export icon downloads a CSV file that can be opened in Excel or Google Sheets.

**Steps:**
1. On the Meetings page, find the export (download) icon in the toolbar
2. Click it and wait for the download to start

**Expected result:** A CSV file downloads. Opening it shows columns for Title, Date, Project, Description, Participants, and other visible columns. Each row matches a meeting in the list.

---

## 8. Detail Page

### 8.1 — Meeting detail page shows action items extracted from the transcript
**What this checks:** When a meeting has a transcript, the action items (tasks someone committed to doing) are displayed on the detail page.

**Setup:** A meeting must exist that was imported with a transcript (source type: Fireflies or uploaded file). Look for meetings with the transcript icon in the Links column.

**Steps:**
1. Open the Meetings page
2. Click on any meeting that has a transcript (look for the transcript icon in the Links column)
3. On the detail page, look for the **Action Items** or **Tasks** section

**Expected result:** The Action Items section shows at least one task extracted from the meeting. Each task has a description. No error messages appear.

---

### 8.2 — Meeting detail page shows key decisions from the transcript
**What this checks:** Decisions captured from the meeting transcript appear on the detail page.

**Setup:** A meeting must exist that was imported with a transcript.

**Steps:**
1. Open any meeting that has a transcript
2. Find the **Decisions** section on the detail page

**Expected result:** The Decisions section shows at least one decision extracted from the meeting. Each decision has a description. No error message appears.

---

### 8.3 — Detail page shows links to other recent meetings for the same project
**What this checks:** A list of related meetings from the same project is shown on the detail page, making it easy to navigate between meetings.

**Setup:** At least two meetings must exist for project 767.

**Steps:**
1. Open any meeting detail page
2. Look for a **Related Meetings** or **Recent Meetings** panel (usually on the right side or bottom)
3. Click one of the related meeting links

**Expected result:** A list of other meetings for the same project is shown. Clicking a related meeting link navigates to that meeting's detail page.

---

## 9. Edge Cases

### 9.1 — Meetings page shows a helpful message when no meetings exist
**What this checks:** A useful empty state — not a blank screen — is shown when there are no meetings on a project.

**Steps:**
1. Navigate to the Meetings page for a project that has no meetings, or apply a search that matches nothing
2. Look at the main content area

**Expected result:** A message appears such as "No meetings found" or similar. A button to create a new meeting may also appear. No blank white space or error message is shown.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Fireflies auto-import | Requires live Fireflies webhook integration to trigger |
| AI digest / insights | AI-generated summary needs real transcript data |
| Bulk delete meetings | Multi-select delete not confirmed in current UI |
| Schedule a meeting | `/schedule` sub-page exists but flow not fully tested |
| Upload transcript file manually | Requires file upload integration to be active |
