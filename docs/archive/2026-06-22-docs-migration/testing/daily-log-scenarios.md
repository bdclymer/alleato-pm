# Daily Log — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** daily-log
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Daily Log")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

A **daily log** (also called a site diary) is a record of everything that happened on a construction site on a specific day. It captures the weather, how many workers were on site, what equipment was used, and what work was completed. It is a legal record — like a journal entry for the job site.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Daily Log page | HIGH |
| 1.2 | Navigation | Open a daily log detail page | HIGH |
| 2.1 | Create | Create a new log entry for today | HIGH |
| 2.2 | Create | Try to create a log entry without a date | HIGH |
| 2.3 | Create | Create a log entry with notes | MEDIUM |
| 3.1 | Edit | Edit the weather on an existing log entry | HIGH |
| 3.2 | Edit | Edited changes persist after page refresh | HIGH |
| 4.1 | Manpower | Add a manpower entry (worker count) to a log | HIGH |
| 4.2 | Manpower | Try to add manpower without a worker count | MEDIUM |
| 5.1 | Equipment | Add equipment used on site | HIGH |
| 6.1 | Notes | Add a work note to a log entry | HIGH |
| 7.1 | Delete | Delete a daily log entry | HIGH |
| 8.1 | Filter / Search | Search for a log entry by date | MEDIUM |
| 8.2 | Filter / Search | Sort log entries by date (oldest first) | MEDIUM |

---

## 1. Navigation

### 1.1 — Open the Daily Log page
**What this checks:** The Daily Log list page loads without errors and shows existing records.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Click **"Daily Log"** in the left sidebar of the project
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of daily log entries is visible with columns for Date, Weather, and Created By. No error messages appear.

---

### 1.2 — Open a daily log detail page
**What this checks:** Clicking a log entry opens the detail page.

**Setup:** The Daily Log list must have at least one existing entry.

**Steps:**
1. Open the Daily Log page
2. Click on the date of any log entry in the list
3. Wait for the page to finish loading

**Expected result:** The detail page opens showing the log entry data. No error messages appear.

---

## 2. Create

### 2.1 — Create a new log entry for today
**What this checks:** A user can create a new daily log entry and it appears in the list.

**Steps:**
1. Open the Daily Log page
2. Click the **New Log Entry** button (top right)
3. In the **Date** field, enter: **2026-04-08**
4. In the **Weather** field, type: **Sunny, 68°F, light breeze**
5. Click **Create** (or Save)
6. Wait for the page to stop loading

**Expected result:** The new log entry appears in the list with the date "Apr 8, 2026". No error messages are shown.

---

### 2.2 — Try to create a log entry without a date
**What this checks:** The form prevents saving when the required Date field is empty.

**Steps:**
1. Open the Daily Log page
2. Click the **New Log Entry** button
3. Leave the **Date** field completely empty
4. Click **Create** (or Save)

**Expected result:** An error message appears near the Date field (e.g. "Date is required"). The record is NOT created. The form stays open.

---

### 2.3 — Create a log entry with notes
**What this checks:** Weather and notes fields can be filled in and are saved correctly.

**Steps:**
1. Open the Daily Log page
2. Click the **New Log Entry** button
3. Enter date: **2026-04-08**
4. In the **Weather** field, type: **Overcast, 55°F**
5. In the Notes/Description field, type: **Concrete poured for foundation**
6. Click **Create** and wait for the page to stop loading

**Expected result:** The new log entry appears in the list for Apr 8, 2026. No error message appears.

---

## 3. Edit

### 3.1 — Edit the weather on an existing log entry
**What this checks:** Users can edit a log entry and the updated value is saved.

**Setup:** There must be at least one existing daily log entry.

**Steps:**
1. Open the Daily Log page
2. Click on any log entry to open it
3. Click the **Edit** button
4. Clear the **Weather** field and type: **Partly cloudy, 72°F**
5. Click **Save**
6. Wait for the page to stop loading

**Expected result:** The log entry now shows the updated weather "Partly cloudy, 72°F". A success message (toast) briefly appears.

---

### 3.2 — Edited changes persist after page refresh
**What this checks:** Saved changes are stored in the database, not just shown temporarily in the browser.

**Setup:** Complete scenario 3.1 first (edit weather and save it).

**Steps:**
1. After saving an edit, stay on the detail page
2. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page
3. Wait for the page to load

**Expected result:** The updated weather and any other changes are still shown after the refresh. No data reverted to old values.

---

## 4. Manpower

> **What is manpower?** Manpower means the workers on site that day. Each entry records a trade (type of worker — e.g. Electrician, Plumber, Concrete worker), how many workers were present, and how many hours they worked.

### 4.1 — Add a manpower entry (worker count) to a log
**What this checks:** Users can record workers on site for a specific trade.

**Setup:** There must be at least one existing daily log entry.

**Steps:**
1. Open any daily log detail page
2. Find the **Manpower** section (workers on site)
3. Click **Add Manpower** (or the + button)
4. In the **Trade** field, type: **Concrete**
5. In the **Workers** field, type: **8**
6. In the **Hours Worked** field, type: **9**
7. Click **Save**

**Expected result:** A new manpower row appears showing Trade = Concrete, Workers = 8, Hours = 9. No error message appears.

---

### 4.2 — Try to add manpower without a worker count
**What this checks:** The form prevents saving a manpower entry when workers count is missing.

**Setup:** There must be at least one existing daily log entry.

**Steps:**
1. Open any daily log detail page
2. Click **Add Manpower**
3. Fill in the **Trade** field: **Electrician**
4. Leave the **Workers Count** field empty
5. Click **Save**

**Expected result:** An error message appears (e.g. "Workers count is required"). The manpower entry is NOT saved.

---

## 5. Equipment

> **What is equipment?** Equipment means large machines used on the site that day — such as excavators (digging machines), cranes, concrete mixers, or forklifts. Each entry records the machine name and how many hours it was running.

### 5.1 — Add equipment used on site
**What this checks:** Users can record equipment that was active on site that day.

**Setup:** There must be at least one existing daily log entry.

**Steps:**
1. Open any daily log detail page
2. Find the **Equipment** section
3. Click **Add Equipment** (or the + button)
4. In the **Equipment Name** field, type: **Excavator CAT 320**
5. In the **Hours Operated** field, type: **7**
6. Click **Save**

**Expected result:** A new equipment row appears showing Equipment = Excavator CAT 320, Hours Operated = 7. No error message appears.

---

## 6. Notes

### 6.1 — Add a work note to a log entry
**What this checks:** Users can add a written description of work performed that day.

**Setup:** There must be at least one existing daily log entry.

**Steps:**
1. Open any daily log detail page
2. Find the **Notes** section
3. Click **Add Note** (or the + button)
4. In the **Category** field, select or type: **Work Performed**
5. In the **Description** field, type: **Concrete poured for foundation**
6. Click **Save**

**Expected result:** The note "Concrete poured for foundation" appears in the notes list under category "Work Performed". No error message appears.

---

## 7. Delete

### 7.1 — Delete a daily log entry
**What this checks:** A daily log entry can be deleted and disappears from the list afterwards.

**Setup:** Create a log entry for testing purposes before running this scenario.

**Steps:**
1. Open the Daily Log page
2. Find a log entry you created for testing (e.g. the one from scenario 2.1)
3. Click the three-dot menu (or right-click) on that row
4. Click **Delete**
5. Confirm the deletion in the dialog that appears
6. Wait for the page to stop loading

**Expected result:** The deleted log entry is no longer visible in the list. A success message (toast) briefly appears.

---

## 8. Filter / Search

### 8.1 — Search for a log entry by date
**What this checks:** The search box filters the list to matching records.

**Setup:** The Daily Log list must have at least two entries with different dates.

**Steps:**
1. Open the Daily Log page
2. Click the search box (shows a magnifying glass icon or says "Search by date or author...")
3. Type: **2026-04-08**
4. Wait for the list to filter

**Expected result:** The list narrows to show only entries matching the date "2026-04-08". Unrelated entries are no longer visible. Clearing the search box brings all records back.

---

### 8.2 — Sort log entries by date (oldest first)
**What this checks:** Clicking the Date column header reorders the list.

**Setup:** The Daily Log list must have at least two entries with different dates.

**Steps:**
1. Open the Daily Log page
2. Click the **"Date"** column header once to sort ascending (oldest first)
3. Observe the order of entries in the list

**Expected result:** Log entries are reordered so the oldest date appears at the top and the newest date appears at the bottom.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| View manpower totals / summary | Aggregate display not confirmed in UI |
| Edit or delete individual manpower rows | Edit flow for sub-records not verified |
| Edit or delete individual equipment rows | Edit flow for sub-records not verified |
| Export daily log to PDF | Not confirmed in current UI |
| Weather as structured data (temp, condition) | Currently stored as free text |
