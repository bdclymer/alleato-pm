# Punch List — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** punch-list
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Punch List")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

A **punch list** is a list of defects and incomplete work items found during a walkthrough near the end of a construction project. Each item represents something that must be fixed or finished before the project is officially complete. Example: "Paint chipped on north wall of Room 101."

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Punch List page | HIGH |
| 1.2 | Navigation | Switch between Items and Recycle Bin tabs | HIGH |
| 2.1 | Create | Create a new punch item with required fields only | HIGH |
| 2.2 | Create | Create a punch item with every field filled in | MEDIUM |
| 2.3 | Create | Submitting without a title shows an error | HIGH |
| 2.4 | Create | Canceling the create form does not save anything | HIGH |
| 3.1 | Edit | Edit an existing punch item and verify changes are saved | HIGH |
| 3.2 | Edit | Edit form shows the previously saved values | HIGH |
| 3.3 | Edit | Canceling the edit form discards all changes | HIGH |
| 4.1 | Status | Change a punch item status to Closed | HIGH |
| 5.1 | Delete & Restore | Delete a punch item and verify it moves to the Recycle Bin | HIGH |
| 5.2 | Delete & Restore | Restore a punch item from the Recycle Bin | HIGH |
| 6.1 | Filter & Search | Search for a punch item by part of its title | MEDIUM |
| 6.2 | Filter & Search | Filter the list to show only Work Required items | MEDIUM |
| 6.3 | Filter & Search | Filter the list to show only High priority items | MEDIUM |
| 7.1 | Column Visibility | Hide a column then show it again | LOW |
| 8.1 | Export | Download the punch list as a CSV file | MEDIUM |
| 8.2 | Export | Download the punch list as a PDF file | MEDIUM |
| 9.1 | Views | Switch between the three display styles | MEDIUM |

---

## 1. Navigation

### 1.1 — Open the Punch List page
**What this checks:** The Punch List page loads without errors and shows the list of items.

A punch list is a record of defects or incomplete work found during a construction walkthrough — things that need to be fixed before the project is considered done.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Click **"Punch List"** in the left sidebar of project "Alleato AI"
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of punch items is visible (or a "No punch items found" empty state message). The page title says "Punch List". No error messages appear.

---

### 1.2 — Switch between Items and Recycle Bin tabs
**What this checks:** The two tabs — Items and Recycle Bin — each show the correct set of records.

**Steps:**
1. On the Punch List page, click the **"Items"** tab
2. Note how many records are shown
3. Click the **"Recycle Bin"** tab
4. Look at what is shown

**Expected result:** The Items tab shows active punch items. The Recycle Bin tab shows deleted items (or an empty state if none have been deleted). The counts in each tab badge are correct. No errors appear.

---

## 2. Create

### 2.1 — Create a new punch item with required fields only
**What this checks:** A user can create a basic punch item and it appears in the list.

A punch item describes one specific defect or task — for example, "Paint chipped on north wall of Room 101."

**Steps:**
1. Click the **"Create Punch Item"** button (top right of the page)
2. In the **Title** field, type: **Paint chipped on north wall**
3. Leave all other fields at their defaults
4. Click **"Create Punch Item"**
5. Wait for the dialog to close

**Expected result:** The dialog closes. The new punch item "Paint chipped on north wall" appears in the list with a status of "Draft". A success message briefly appears. No errors are shown.

---

### 2.2 — Create a punch item with every field filled in
**What this checks:** All optional fields — description, priority, assignee, location, trade, type, reference, due date, ball in court — save correctly and appear in the list.

**Steps:**
1. Click **"Create Punch Item"**
2. **Title:** Broken window latch in stairwell B
3. **Description:** Latch does not engage when door is closed
4. **Status:** Work Required
5. **Priority:** High
6. **Assignee Company:** ABC Glass Co
7. **Ball in Court:** Site Superintendent
8. **Due Date:** pick any future date
9. **Location:** Stairwell B, Level 2
10. **Trade:** Glazing
11. **Type:** Deficiency
12. **Reference:** RFI-042
13. Click **"Create Punch Item"**

**Expected result:** The dialog closes. The new item appears in the list. The Assignee column shows "ABC Glass Co", Location shows "Stairwell B, Level 2", and the Priority badge shows "High". No fields are blank when they were filled in.

---

### 2.3 — Submitting without a title shows an error
**What this checks:** The form prevents saving if the Title field is left blank, so incomplete records cannot be created by accident.

**Steps:**
1. Click **"Create Punch Item"**
2. Leave the **Title** field completely blank
3. Click **"Create Punch Item"** to submit

**Expected result:** A red error message appears near the Title field saying the title is required. The dialog stays open. No record is created.

---

### 2.4 — Canceling the create form does not save anything
**What this checks:** Pressing Cancel on the create dialog goes back to the list without creating any record.

**Steps:**
1. Click **"Create Punch Item"**
2. Type: **Should Not Be Saved** in the Title field
3. Click the **Cancel** button

**Expected result:** The dialog closes. No new record named "Should Not Be Saved" appears in the list.

---

## 3. Edit

### 3.1 — Edit an existing punch item and verify changes are saved
**What this checks:** Changes made in the edit form are saved and appear correctly after the dialog closes.

**Setup:** There must be at least one existing punch item in the list.

**Steps:**
1. Hover over any row in the Punch List table
2. Click the **three-dot action menu** on the right side of that row
3. Click **"Edit"**
4. Change the Title to: **Updated — Cracked tile in lobby**
5. Change Priority to: **Medium**
6. Click **"Save Changes"**

**Expected result:** The dialog closes. The row in the list now shows the title "Updated — Cracked tile in lobby" and the Priority badge shows "Medium". A success message briefly appears.

---

### 3.2 — Edit form shows the previously saved values
**What this checks:** When you open the edit form, every field shows the value that was previously saved — not a blank placeholder. This prevents accidentally overwriting data.

**Steps:**
1. Create a punch item with **Location: Room 204** and **Trade: Electrical**
2. Hover over that row and click the action menu → **Edit**
3. Look at the Location and Trade fields in the edit form

**Expected result:** The Location field shows "Room 204" and the Trade field shows "Electrical". No field shows a blank or placeholder when a value was previously saved.

---

### 3.3 — Canceling the edit form discards all changes
**What this checks:** Pressing Cancel on the edit dialog does not save any of the changes made.

**Setup:** There must be at least one existing punch item.

**Steps:**
1. Open the edit form for any punch item
2. Change the Title to: **This Should Not Save**
3. Click **Cancel**

**Expected result:** The dialog closes. The original title is still shown in the list. "This Should Not Save" does not appear anywhere.

---

## 4. Status

### 4.1 — Change a punch item status to Closed
**What this checks:** A punch item can be marked as Closed — meaning the defect has been fixed and the work is complete. Closing a punch item is the main goal of the entire punch list process.

**Setup:** There must be at least one punch item with status Draft or Work Required.

**Steps:**
1. Hover over any active punch item in the list
2. Click the three-dot action menu → **Edit**
3. Change the **Status** dropdown to: **Closed**
4. Click **"Save Changes"**

**Expected result:** The dialog closes. The punch item now shows a "Closed" status badge in the list. No error appears.

---

## 5. Delete & Restore

### 5.1 — Delete a punch item and verify it moves to the Recycle Bin
**What this checks:** Deleting a punch item moves it to the Recycle Bin rather than permanently erasing it, so it can be recovered if needed.

**Steps:**
1. Create a punch item titled: **Delete Me Test**
2. Hover over that row and click the **three-dot action menu**
3. Click **"Delete"**
4. Wait for the action to complete
5. Click the **"Recycle Bin"** tab

**Expected result:** The item "Delete Me Test" disappears from the Items tab. It appears in the Recycle Bin tab. A success message briefly appears.

---

### 5.2 — Restore a punch item from the Recycle Bin
**What this checks:** A deleted punch item can be recovered from the Recycle Bin and returned to the active list.

**Setup:** Complete scenario 5.1 first so there is at least one item in the Recycle Bin.

**Steps:**
1. Click the **"Recycle Bin"** tab
2. Find **"Delete Me Test"** in the list
3. Click the **"Restore"** button on that row
4. Click the **"Items"** tab

**Expected result:** The item "Delete Me Test" reappears in the Items tab. It is no longer in the Recycle Bin.

---

## 6. Filter & Search

### 6.1 — Search for a punch item by part of its title
**What this checks:** Typing in the search box filters the list to only show matching records.

**Setup:** There must be at least two punch items with different titles.

**Steps:**
1. Find the search box in the toolbar (shows "Search punch items...")
2. Type: **cracked**
3. Wait for the list to update

**Expected result:** Only punch items whose title or location contains "cracked" are shown. All other rows disappear. Clearing the search box brings all records back.

---

### 6.2 — Filter the list to show only Work Required items
**What this checks:** The Status filter narrows the list to matching records only.

**Setup:** There must be punch items with different statuses.

**Steps:**
1. Click the **Filters** button in the toolbar
2. In the **Status** dropdown, select: **Work Required**
3. Apply the filter
4. Look at the results

**Expected result:** Only punch items with status "Work Required" are shown. Items with other statuses (Draft, Initiated, Closed) are hidden. Clearing the filter brings all items back.

---

### 6.3 — Filter the list to show only High priority items
**What this checks:** The Priority filter works correctly to help users focus on the most urgent deficiencies.

**Setup:** There must be punch items with different priority levels.

**Steps:**
1. Click the **Filters** button in the toolbar
2. In the **Priority** dropdown, select: **High**
3. Apply the filter

**Expected result:** Only punch items with priority "High" are shown in the list. Low and Medium priority items are hidden.

---

## 7. Column Visibility

### 7.1 — Hide a column then show it again
**What this checks:** The column visibility control lets you customize which columns appear in the table.

**Steps:**
1. Click the **column selector button** in the toolbar (looks like a list/columns icon)
2. Uncheck **"Trade"** to hide it
3. Close the column selector
4. Open the column selector again and re-check **"Trade"**

**Expected result:** After unchecking, the Trade column disappears from the table. After re-checking, it reappears. All other columns remain unchanged throughout.

---

## 8. Export

### 8.1 — Download the punch list as a CSV file
**What this checks:** Clicking the Export button downloads a spreadsheet-compatible file with all visible punch items.

**Setup:** There must be at least one punch item in the list.

**Steps:**
1. On the Punch List page, click the **"Export"** button (top right, next to "Create Punch Item")
2. Click **"CSV"** from the dropdown menu
3. Wait for the download to start

**Expected result:** A CSV file downloads to your computer. Opening it in a spreadsheet app shows columns including #, Title, Status, Priority, Assignee, Location, Trade, and Due Date. No error appears.

---

### 8.2 — Download the punch list as a PDF file
**What this checks:** A printable PDF version of the punch list can be downloaded.

**Setup:** There must be at least one punch item in the list.

**Steps:**
1. Click the **"Export"** button (top right)
2. Click **"PDF"** from the dropdown menu
3. Wait for the download to start

**Expected result:** A PDF file downloads. It contains the punch list items in a readable format. No error appears.

---

## 9. Views

### 9.1 — Switch between the three display styles
**What this checks:** All three view options — Table, Card, and List — display the punch items correctly without errors.

**Steps:**
1. In the toolbar, find the **view toggle** (grid/list icons)
2. Click **"Card"** view
3. Look at how items are displayed
4. Click **"List"** view
5. Look at how items are displayed
6. Switch back to **"Table"** view

**Expected result:** Card view shows each punch item as a card with title, status, assignee, and due date. List view shows compact rows. Table view shows the full data grid. No errors appear in any view.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Bulk delete | Feature flag `enableBulkDelete` is set to false in current implementation |
| Row selection checkboxes | Feature flag `enableRowSelection` is set to false in current implementation |
| Punch item detail page | No dedicated detail page exists yet — edits happen via dialog |
| Assign to specific user | Current field is free-text "Assignee Company", not a user picker |
| Comments / notes on items | Not yet implemented in the UI |
