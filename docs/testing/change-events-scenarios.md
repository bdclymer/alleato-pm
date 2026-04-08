# Change Events — Guided Test Scenarios

**Generated:** 2026-04-07
**Tool:** change-events
**Audience:** Non-technical testers — no construction knowledge required
**Test Runner UI:** http://localhost:3000/testing (select "Change Events")
**Test Project:** Project 67 — Vermillion Rise Warehouse
**Login:** test1@mail.com / test12026!!!

> A **change event** is a record of a potential cost or scope change on a construction project.
> It tracks what changed, why, and how much it might cost or add to revenue.

---

## How to Use

1. Open the test runner at http://localhost:3000/testing and select **Change Events**, OR follow steps manually below
2. For each scenario: follow the numbered steps, then check whether the expected result matches what you see
3. Mark: ✅ Pass | ❌ Fail | ⏭️ Skip
4. For failures, note what you actually saw

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Change Events page | HIGH |
| 1.2 | Navigation | Open a change event detail page | HIGH |
| 2.1 | Create | Create a new change event | HIGH |
| 2.2 | Create | Try to create without a title | HIGH |
| 2.3 | Create | Create with all dropdowns filled | MEDIUM |
| 3.1 | Edit | Edit the title | HIGH |
| 3.2 | Edit | Changes persist after refresh | HIGH |
| 3.3 | Edit | Cancel discards changes | MEDIUM |
| 4.1 | Delete | Delete a change event | HIGH |
| 5.1 | Status | Submit for approval | HIGH |
| 5.2 | Status | Approve a change event | HIGH |
| 6.1 | Line Items | Add a line item | HIGH |
| 7.1 | Attachments | Upload an attachment | MEDIUM |
| 8.1 | History | View change history | MEDIUM |
| 9.1 | Filter / Search | Search by title | MEDIUM |

---

## 1. Navigation

### 1.1 — Open the Change Events page
**What this checks:** The Change Events list page loads without errors and shows existing records.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Click **"Change Events"** in the left sidebar of project "Vermillion Rise Warehouse"
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of change events is visible with columns for Status, Scope, Type, Change Reason, and others. No error messages appear.

---

### 1.2 — Open a change event detail page
**What this checks:** Clicking a record opens the detail page with all tabs visible.

**Setup:** The Change Events list must have at least one existing record.

**Steps:**
1. Open the Change Events page
2. Click on the title of any change event in the list
3. Wait for the page to finish loading

**Expected result:** The detail page opens. Tabs are visible (e.g. General, Line Items, Attachments, History). The change event title and status are shown at the top. No error messages appear.

---

## 2. Create

### 2.1 — Create a new change event
**What this checks:** A user can create a new change event and it appears in the list.

**Steps:**
1. Open the Change Events page
2. Click the **New Change Event** button (top right)
3. In the **Title** field, type: **Test CE from scenario**
4. In the **Status** dropdown, select **Open**
5. In the **Type** dropdown, select **Owner Change**
6. Click the **Create** button (or Save)
7. Wait for the page to stop loading

**Expected result:** The new change event appears in the list with the title "Test CE from scenario". No error messages are shown.

---

### 2.2 — Try to create a change event without a title
**What this checks:** The form prevents saving when the required Title field is empty.

**Steps:**
1. Open the Change Events page
2. Click the **New Change Event** button
3. Leave the **Title** field completely empty
4. Click the **Create** button (or Save)

**Expected result:** An error message appears near the Title field (e.g. "Title is required"). The record is NOT created. The form stays open.

---

### 2.3 — Create a change event with all dropdowns filled
**What this checks:** All dropdown fields (Origin, Change Reason, Scope, Type) can be set and are saved correctly.

**Steps:**
1. Open the Change Events page
2. Click the **New Change Event** button
3. Type **Full Fields Test** in the Title field
4. Select **Internal** in the Origin dropdown
5. Select **Client Request** in the Change Reason dropdown
6. Select **In Scope** in the Scope dropdown
7. Select **Contingency** in the Type dropdown
8. Click **Create** and wait for the page to stop loading
9. Find "Full Fields Test" in the list and click it to open

**Expected result:** The detail page shows Origin = Internal, Change Reason = Client Request, Scope = In Scope, and Type = Contingency. All values are saved correctly.

---

## 3. Edit

### 3.1 — Edit the title of an existing change event
**What this checks:** Users can edit a change event and the updated value is saved.

**Setup:** There must be at least one existing change event with status Open.

**Steps:**
1. Open the Change Events page
2. Click on any change event to open its detail page
3. Click the **Edit** button
4. Clear the Title field and type: **Updated Title Test**
5. Click **Save**
6. Wait for the page to stop loading

**Expected result:** The detail page now shows the title "Updated Title Test". A success message (toast) briefly appears. The old title is no longer visible.

---

### 3.2 — Changes persist after refresh
**What this checks:** Saved changes are stored in the database, not just shown temporarily in the browser.

**Setup:** Complete scenario 3.1 first (edit a title and save it).

**Steps:**
1. After saving an edit, stay on the detail page
2. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page
3. Wait for the page to load

**Expected result:** The updated title and any other changes you made are still shown after the refresh. No data reverted to the old values.

---

### 3.3 — Cancel discards changes
**What this checks:** Unsaved edits are discarded when the user cancels the form.

**Setup:** There must be at least one existing change event.

**Steps:**
1. Open any change event detail page
2. Click the **Edit** button
3. Change the Title to something random, e.g. **DO NOT SAVE THIS**
4. Click **Cancel** (instead of Save)

**Expected result:** The form closes and the original title is still shown. "DO NOT SAVE THIS" does not appear anywhere on the page.

---

## 4. Delete

### 4.1 — Delete a change event
**What this checks:** A change event can be deleted and it disappears from the list afterwards.

**Setup:** Create a change event named "Delete Me Test" before running this scenario.

**Steps:**
1. Open the Change Events page
2. Find the record titled **Delete Me Test** in the list
3. Click the three-dot menu (or right-click) on that row
4. Click **Delete**
5. Confirm the deletion in the dialog that appears
6. Wait for the page to stop loading

**Expected result:** The record "Delete Me Test" is no longer visible in the list. A success message (toast) briefly appears.

---

## 5. Status / Workflow

### 5.1 — Submit a change event for approval
**What this checks:** A user can move a change event from Open to Pending Approval.

**Setup:** There must be at least one change event with status Open.

**Steps:**
1. Open any change event with status **Open**
2. Click the **Edit** button
3. In the **Status** dropdown, select **Pending Approval**
4. Click **Save**
5. Wait for the page to stop loading

**Expected result:** The status badge on the page now shows "Pending Approval". The change is also visible in the History tab.

---

### 5.2 — Approve a change event
**What this checks:** A change event can be approved and the status updates correctly.

**Setup:** There must be at least one change event with status Pending Approval.

**Steps:**
1. Open a change event with status **Pending Approval**
2. Click the **Approve** button (or use Edit → change Status to Approved → Save)
3. Wait for the page to stop loading

**Expected result:** The status badge now shows "Approved". No error message appears.

---

## 6. Line Items

### 6.1 — Add a line item to a change event
**What this checks:** Users can add a cost/revenue line item and it is saved.

**Setup:** There must be at least one change event with status Open.

**Steps:**
1. Open any change event detail page
2. Click the **Line Items** tab
3. Click **Add Line Item** (or the + button)
4. In the Description field, type: **Labor - Test Line Item**
5. In the Quantity field, type: **10**
6. In the Unit Cost field, type: **500**
7. Click **Save** on the line item
8. Wait for the page to stop loading

**Expected result:** The new line item "Labor - Test Line Item" appears in the line items table. The quantity shows 10 and unit cost shows $500. No error message appears.

---

## 7. Attachments

### 7.1 — Upload a file attachment
**What this checks:** A file can be attached to a change event and is visible afterwards.

**Setup:**
- Have a small file ready to upload (any image or PDF, under 5 MB)
- There must be at least one existing change event

**Steps:**
1. Open any change event detail page
2. Click the **Attachments** tab
3. Click **Upload** or drag a file onto the upload area
4. Select or drop a small file from your computer
5. Wait for the upload to complete

**Expected result:** The uploaded file appears in the attachments list with its filename. No error message appears.

---

## 8. History

### 8.1 — View change history
**What this checks:** The History tab shows a log of edits made to the change event.

**Setup:** Make at least one edit to a change event before running this scenario.

**Steps:**
1. Open any change event that has been edited at least once
2. Click the **History** tab
3. Scroll through the history entries

**Expected result:** At least one history entry is visible. Each entry shows what was changed and when. No error message appears.

---

## 9. Filter / Search

### 9.1 — Search for a change event by title
**What this checks:** The search box filters the list to matching records.

**Setup:** The Change Events list must have at least two records with different titles.

**Steps:**
1. Open the Change Events page
2. Click the search box (usually shows a magnifying glass icon or says "Search...")
3. Type part of a known change event title, e.g. **Test CE**
4. Wait for the list to filter

**Expected result:** The list narrows to show only records whose title contains "Test CE". Records with unrelated titles are no longer visible. Clearing the search box brings all records back.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Convert to Change Order | Action exists but needs verification |
| Send RFQ (Request for Quote) | Multi-step flow, complex to test manually |
| Add to Prime Contract PCO | Marked "coming soon" in the UI |
| Export to PDF/CSV | List-level only, not on detail page |
