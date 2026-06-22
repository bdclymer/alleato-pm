# RFIs — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** rfis
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "RFIs")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

An **RFI (Request for Information)** is a formal question sent to the architect or project owner when something on the construction plans is unclear, missing, or contradictory. Think of it like sending an official email asking "what do you mean by this?" — except it becomes a permanent part of the project record. Once the architect answers, the RFI is closed.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the RFIs page | HIGH |
| 1.2 | Navigation | Open an RFI detail page | HIGH |
| 2.1 | Create | Create a new RFI with required fields only | HIGH |
| 2.2 | Create | Try to create an RFI without a subject | HIGH |
| 2.3 | Create | Create an RFI with all optional fields filled | MEDIUM |
| 2.4 | Create | Verify RFI number auto-increments | HIGH |
| 3.1 | Edit | Edit the subject of an existing RFI | HIGH |
| 3.2 | Edit | Edits persist after page refresh | HIGH |
| 3.3 | Edit | Cancel discards changes | MEDIUM |
| 4.1 | Status | Open an RFI (move from Draft to Open) | HIGH |
| 4.2 | Status | Close an open RFI | HIGH |
| 4.3 | Status | Reopen a closed RFI | MEDIUM |
| 5.1 | Due Dates | Set a due date on an RFI | MEDIUM |
| 6.1 | Filter / Search | Search for an RFI by subject | MEDIUM |
| 6.2 | Filter / Search | Filter RFIs by status | MEDIUM |
| 7.1 | Delete | Delete an RFI | HIGH |
| 8.1 | Impact Fields | Set schedule impact and cost impact | MEDIUM |
| 9.1 | Privacy | Mark an RFI as private | LOW |
| 10.1 | Views | Switch between table, card, and list views | MEDIUM |

---

## 1. Navigation

### 1.1 — Open the RFIs page
**What this checks:** The RFIs list page loads without errors and shows existing records.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Navigate to http://localhost:3000/767/rfis
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of RFIs is visible with columns for Number, Status, Subject, Assignees, RFI Manager, Ball In Court, and Due Date. No error messages appear.

---

### 1.2 — Open an RFI detail page
**What this checks:** Clicking a record opens the detail page with all sections visible.

**Setup:** The RFIs list must have at least one existing record.

**Steps:**
1. Open the RFIs page at /767/rfis
2. Click on the Subject of any RFI in the list
3. Wait for the page to finish loading

**Expected result:** The detail page opens. The RFI number and subject appear at the top. Sections visible include: Question, General Information sidebar, Responses, and Actions. No error messages appear.

---

## 2. Create

### 2.1 — Create a new RFI with required fields only
**What this checks:** A user can create an RFI with only the subject filled in.

**Steps:**
1. Open the RFIs page at /767/rfis
2. Click the **Create RFI** button (top right)
3. In the **Subject** field, type: **What is the ceiling height in Room 101?**
4. Click **Create** (or Save)
5. Wait for the page to stop loading

**Expected result:** The new RFI appears in the list with the subject "What is the ceiling height in Room 101?". It is automatically assigned an RFI number (e.g. #1, #2). No error messages appear.

---

### 2.2 — Try to create an RFI without a subject
**What this checks:** The form prevents saving when the required Subject field is empty.

**Steps:**
1. Open the RFIs page at /767/rfis
2. Click the **Create RFI** button
3. Leave the **Subject** field completely empty
4. Click **Create** (or Save)

**Expected result:** An error message appears near the Subject field (e.g. "Subject is required"). The record is NOT created. The form stays open.

---

### 2.3 — Create an RFI with all optional fields filled
**What this checks:** All optional fields (Question, Due Date, RFI Manager, Assignees, Location) can be set and are saved correctly.

**Steps:**
1. Open the RFIs page at /767/rfis
2. Click **Create RFI**
3. In **Subject**, type: **Confirm footing depth at column B-4**
4. In **Question**, type: **Drawings show 36" depth but geotech report says 42". Which takes precedence?**
5. Set **Due Date** to a date one week from today
6. In **RFI Manager**, type: **John Smith**
7. In **Assignees**, type: **Jane Doe**
8. In **Location**, type: **Level 1 - Column B-4**
9. Click **Create** and wait for the page to stop loading
10. Find the new RFI in the list and click it to open

**Expected result:** The detail page shows all entered values: subject, question, due date, RFI manager, assignees, and location. All fields saved correctly.

---

### 2.4 — Verify RFI number auto-increments
**What this checks:** RFIs are automatically numbered in sequence — you never have to set a number manually.

**Steps:**
1. Open the RFIs page at /767/rfis and note the highest RFI number shown in the list
2. Click **Create RFI**
3. Type any subject, e.g. **Auto-number test**
4. Click **Create** and wait for the page to stop loading

**Expected result:** The new RFI is assigned the next sequential number (one higher than the previous highest). For example, if the list showed #5 as the highest, the new RFI is #6.

---

## 3. Edit

### 3.1 — Edit the subject of an existing RFI
**What this checks:** Users can edit an RFI and the updated value is saved.

**Setup:** There must be at least one existing RFI.

**Steps:**
1. Open the RFIs page at /767/rfis
2. Click on any RFI to open its detail page
3. Click the **Edit** button
4. Clear the **Subject** field and type: **Updated Subject Test**
5. Click **Save Changes**
6. Wait for the page to stop loading

**Expected result:** The detail page now shows the subject "Updated Subject Test". A success message (toast) briefly appears. The old subject is no longer visible.

---

### 3.2 — Edits persist after page refresh
**What this checks:** Saved edits are stored in the database, not just shown temporarily in the browser.

**Setup:** Complete scenario 3.1 first (edit a subject and save it).

**Steps:**
1. After saving an edit, stay on the detail page
2. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page
3. Wait for the page to load

**Expected result:** The updated subject and any other saved changes are still shown after the refresh. No data reverted to the old values.

---

### 3.3 — Cancel discards changes
**What this checks:** Unsaved edits are discarded when the user cancels the form.

**Setup:** There must be at least one existing RFI.

**Steps:**
1. Open any RFI detail page
2. Click the **Edit** button
3. Change the Subject to **DO NOT SAVE THIS**
4. Click **Cancel** (instead of Save Changes)

**Expected result:** The form closes and the original subject is still shown. "DO NOT SAVE THIS" does not appear anywhere on the page.

---

## 4. Status Workflow

RFIs move through three statuses: **Draft** (just created, not yet sent) → **Open** (sent and waiting for an answer) → **Closed** (answered and complete).

### 4.1 — Open an RFI (move from Draft to Open)
**What this checks:** An RFI can be moved from Draft to Open status.

**Setup:** Create a new RFI first — it starts in Draft status automatically.

**Steps:**
1. Create a new RFI (it will be in Draft status by default)
2. Open that RFI's detail page
3. In the **Actions** section, click **Open RFI**
4. Wait for the page to stop loading

**Expected result:** The status badge at the top of the page changes from "Draft" to "Open". The "Open RFI" button is no longer visible. A "Close RFI" button appears instead.

---

### 4.2 — Close an open RFI
**What this checks:** An open RFI can be closed once a response has been provided.

**Setup:** There must be at least one RFI with status Open.

**Steps:**
1. Open an RFI that has status **Open**
2. In the **Actions** section, click **Close RFI**
3. Wait for the page to stop loading

**Expected result:** The status badge changes to "Closed". The "Close RFI" button is replaced by a "Reopen RFI" button.

---

### 4.3 — Reopen a closed RFI
**What this checks:** A closed RFI can be reopened if the answer was insufficient or a follow-up question is needed.

**Setup:** There must be at least one RFI with status Closed. Complete scenario 4.2 first if needed.

**Steps:**
1. Open an RFI that has status **Closed**
2. In the **Actions** section, click **Reopen RFI**
3. Wait for the page to stop loading

**Expected result:** The status badge changes back to "Open". The "Close RFI" button reappears.

---

## 5. Due Dates

### 5.1 — Set a due date on an RFI
**What this checks:** A due date can be set on an RFI and is displayed correctly in the sidebar.

**Setup:** There must be at least one existing RFI.

**Steps:**
1. Open any RFI detail page
2. Click **Edit**
3. In the **Due Date** field, type or select a date two weeks from today (e.g. 2026-04-22)
4. Click **Save Changes**
5. Wait for the page to stop loading

**Expected result:** The General Information sidebar shows the due date you entered (e.g. "Apr 22, 2026"). No error message appears.

---

## 6. Filter / Search

### 6.1 — Search for an RFI by subject
**What this checks:** The search box filters the list to matching records.

**Setup:** The RFIs list must have at least two records with different subjects.

**Steps:**
1. Open the RFIs page at /767/rfis
2. Click the search box (shows "Search RFIs..." placeholder)
3. Type part of a known RFI subject, e.g. **ceiling height**
4. Wait for the list to filter

**Expected result:** The list narrows to show only RFIs whose subject contains "ceiling height". RFIs with unrelated subjects are no longer visible. Clearing the search box brings all records back.

---

### 6.2 — Filter RFIs by status
**What this checks:** The Status filter correctly limits the displayed records.

**Setup:** The RFIs list must have records with at least two different statuses.

**Steps:**
1. Open the RFIs page at /767/rfis
2. Click the **Filters** button in the toolbar
3. In the **Status** filter dropdown, select **Open**
4. Wait for the list to update

**Expected result:** The list shows only RFIs with status "Open". RFIs with status Draft or Closed are hidden. Clearing the filter restores all records.

---

## 7. Delete

### 7.1 — Delete an RFI
**What this checks:** An RFI can be deleted and disappears from the list afterwards.

**Setup:** Create an RFI named "Delete Me RFI Test" before running this scenario.

**Steps:**
1. Create an RFI named **Delete Me RFI Test** (or identify one to delete)
2. Open the RFIs page at /767/rfis
3. Find the record titled **Delete Me RFI Test** in the list
4. Click the three-dot menu on that row and click **Delete** (or open the detail page and click the red Delete button)
5. Confirm the deletion in the dialog that appears
6. Wait for the page to stop loading

**Expected result:** The record "Delete Me RFI Test" is no longer visible in the list. A success message (toast) briefly appears.

---

## 8. Impact Fields

### 8.1 — Set schedule impact and cost impact on an RFI
**What this checks:** The schedule and cost impact fields can be set and are saved correctly. These fields tell the team whether the question might delay the project or add cost.

**Setup:** There must be at least one existing RFI.

**Steps:**
1. Open any RFI detail page
2. Click **Edit**
3. In the **Schedule Impact** dropdown, select **Yes**
4. In the **Cost Impact** dropdown, select **Yes**
5. Click **Save Changes**
6. Wait for the page to stop loading

**Expected result:** The General Information sidebar shows Schedule Impact = "Yes" and Cost Impact = "Yes". Both values are saved and visible after the save.

---

## 9. Privacy

### 9.1 — Mark an RFI as private
**What this checks:** An RFI can be marked as private so that only authorized team members can see it.

**Setup:** There must be at least one existing RFI.

**Steps:**
1. Open any RFI detail page
2. Click **Edit**
3. Check the **Private** checkbox
4. Click **Save Changes**
5. Wait for the page to stop loading

**Expected result:** A "Private" badge appears next to the status badge at the top of the detail page. The checkbox remains checked. No error message appears.

---

## 10. Views

### 10.1 — Switch between table, card, and list views
**What this checks:** The three view modes (table, card, list) all work correctly on the RFIs list page.

**Steps:**
1. Open the RFIs page at /767/rfis
2. Look for the view toggle buttons in the toolbar (table icon, card icon, list icon)
3. Click the **Card** view icon
4. Then click the **List** view icon
5. Then click the **Table** view icon

**Expected result:** Each click switches the display format: Card view shows records as cards, List view shows a condensed list, Table view shows the default grid. Records are visible in all three views with no errors.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| RFI Responses (threaded answers) | Liveblocks integration — requires live connection |
| Attachments | No attachments tab present in current implementation |
| Distribution List | Field exists in the form but needs multi-user picker |
| Export to PDF/CSV | Not yet implemented for RFIs |
| Ball In Court tracking | Auto-set on creation, manual update not yet exposed |
