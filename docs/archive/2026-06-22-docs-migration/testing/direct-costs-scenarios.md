# Direct Costs — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** direct-costs
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Direct Costs")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

A **direct cost** is a project expense paid directly — for example, buying materials from a store, renting equipment, or logging labor hours — that is NOT billed through a subcontract. These are costs the project team controls and pays on their own.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Direct Costs page | HIGH |
| 1.2 | Navigation | Switch between Summary and Cost Code views | HIGH |
| 1.3 | Navigation | Open a direct cost detail page | HIGH |
| 2.1 | Create | Create a new direct cost with required fields | HIGH |
| 2.2 | Create | Create with every field filled in | MEDIUM |
| 2.3 | Create | Submitting without required fields shows an error | HIGH |
| 2.4 | Create | Canceling create does not save anything | HIGH |
| 2.5 | Create | Create a direct cost with a cost line item | HIGH |
| 3.1 | Edit | Edit the description and amount | HIGH |
| 3.2 | Edit | Saved changes persist after refresh | HIGH |
| 3.3 | Edit | Canceling edit discards all changes | HIGH |
| 3.4 | Edit | Change the status from Draft to Approved | HIGH |
| 4.1 | Delete | Delete a direct cost record | HIGH |
| 4.2 | Delete | Canceling delete leaves the record unchanged | HIGH |
| 4.3 | Delete | Delete from the detail page | MEDIUM |
| 5.1 | Status | Status badges show the correct color | MEDIUM |
| 5.2 | Status | Approve multiple records at once | HIGH |
| 6.1 | Calculations | Line items add up to the record total | HIGH |
| 6.2 | Calculations | Line item total = quantity × unit cost | HIGH |
| 6.3 | Calculations | Footer row shows sum of all visible amounts | HIGH |
| 7.1 | Filters & Search | Search by description | HIGH |
| 7.2 | Filters & Search | Filter by status | HIGH |
| 7.3 | Filters & Search | Filter by type | MEDIUM |
| 7.4 | Filters & Search | Clear filters restores the full list | MEDIUM |
| 8.1 | Export | Export the list as a spreadsheet | MEDIUM |
| 8.2 | Export | Export only filtered results | MEDIUM |
| 9.1 | Budget Integration | Assign a budget code to a line item | HIGH |
| 9.2 | Budget Integration | Cost Code view groups by budget division | HIGH |
| 10.1 | Edge Cases | Empty state message | MEDIUM |
| 10.2 | Edge Cases | Hide and show table columns | LOW |
| 10.3 | Edge Cases | ERP sync status column | LOW |

---

## 1. Navigation

### 1.1 — Open the Direct Costs page
**What this checks:** The Direct Costs list page loads without errors and shows the data table. A direct cost is a project expense paid directly — like buying materials, renting equipment, or logging labor — not through a subcontract.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. In the left sidebar, click **"Direct Costs"** under project "Alleato AI"
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table is visible with columns for Date, Vendor, Type, Invoice #, Status, and Amount. No error messages appear. The page title says "Direct Costs".

---

### 1.2 — Switch between Summary and Cost Code views
**What this checks:** The two views — the default summary list and the cost code hierarchy view — both load correctly.

**Steps:**
1. Open the Direct Costs page
2. Click the **"Cost Code"** or **"By Cost Code"** view toggle in the toolbar
3. Note the layout change
4. Click back to the default **"Summary"** view

**Expected result:** The Cost Code view shows records grouped by budget code/division. Switching back to Summary shows the flat list again. No errors appear in either view.

---

### 1.3 — Open a direct cost detail page
**What this checks:** Clicking a row opens the full detail page for that cost record.

**Setup:** The Direct Costs list must have at least one existing record.

**Steps:**
1. Open the Direct Costs page
2. Click on any row in the table
3. Wait for the page to finish loading

**Expected result:** The detail page opens. The vendor name, date, invoice number, status, and amount are displayed. A line items table shows the individual cost breakdowns. No error messages appear.

---

## 2. Create

### 2.1 — Create a new direct cost with required fields
**What this checks:** A user can create a new direct cost record and it saves correctly and appears in the list.

**Steps:**
1. Click the **"Add Direct Cost"** button (top right of the page)
2. In the **Description** field, type: **Test Direct Cost**
3. In the **Amount** field, type: **5000**
4. Set the **Date** to today's date
5. In the **Type** dropdown, select **Materials**
6. Click **Save**
7. Wait for the page to stop loading

**Expected result:** A success message (toast) appears briefly. The new record "Test Direct Cost" appears in the list with an amount of $5,000.00. No error messages are shown.

---

### 2.2 — Create with every field filled in
**What this checks:** All optional fields — vendor, invoice number, received date, paid date — save correctly.

**Steps:**
1. Click **"Add Direct Cost"**
2. Set Description: **Full Fields Direct Cost**
3. Set Amount: **2500**
4. Set Type: **Equipment**
5. Set Status: **Pending**
6. In the **Vendor** field, select or type any available vendor
7. In the **Invoice #** field, type: **INV-TEST-001**
8. Set the **Received Date** to today
9. Click **Save**

**Expected result:** All fields appear correctly on the detail page. Invoice # shows "INV-TEST-001", vendor shows the selected vendor, and the status shows "Pending".

---

### 2.3 — Submitting without required fields shows an error
**What this checks:** The form prevents saving when required fields like Amount or Date are left blank, so incomplete records cannot be created.

**Steps:**
1. Click **"Add Direct Cost"**
2. Leave the **Amount** field completely empty
3. Leave the **Date** field empty
4. Click **Save**

**Expected result:** Red error messages appear near the required fields saying they are required. The form does not save and does not navigate away. No new record is created.

---

### 2.4 — Canceling create does not save anything
**What this checks:** Pressing Cancel on the create form goes back without creating any record.

**Steps:**
1. Click **"Add Direct Cost"**
2. Fill in Description: **Should Not Be Saved**
3. Fill in Amount: **9999**
4. Click the **Cancel** or **X** button to close the form

**Expected result:** The form closes. No new record named "Should Not Be Saved" appears in the list. The list is unchanged.

---

### 2.5 — Create a direct cost with a cost line item
**What this checks:** When you add a line item (a breakdown of the cost by budget code) during creation, it is saved and the total is correct.

**Setup:** A budget code must exist in the project.

**Steps:**
1. Click **"Add Direct Cost"**
2. Fill in Description: **Labor with Line Item** and Amount: **3000**
3. Set Type: **Labor**
4. Click **"Add Line Item"** inside the form
5. In the line item Description field, type: **Site Labor**
6. Enter Quantity: **8**, Unit Cost: **375**
7. Click **Save** on the form

**Expected result:** The direct cost is created. On the detail page, the line item "Site Labor" appears with quantity 8, unit cost $375, and line total $3,000. The total amount matches. No error is shown.

---

## 3. Edit

### 3.1 — Edit the description and amount
**What this checks:** Changes made in the edit form are saved and displayed correctly after saving.

**Setup:** There must be at least one existing direct cost record.

**Steps:**
1. Open the Direct Costs page
2. Click any row to open the detail page
3. Click the **Edit** (pencil) button
4. Change the Description to: **Updated Direct Cost Description**
5. Change the Amount to: **7500**
6. Click **Save**
7. Wait for the page to stop loading

**Expected result:** The detail page now shows the updated description and amount $7,500.00. A success toast appeared after saving. The old values are no longer shown.

---

### 3.2 — Saved changes persist after refresh
**What this checks:** Changes are stored in the database — not just shown temporarily in the browser.

**Setup:** Complete scenario 3.1 first.

**Steps:**
1. After saving an edit, stay on the detail page
2. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the browser
3. Wait for the page to load

**Expected result:** The updated description and amount are still visible after refresh. No data reverted to old values.

---

### 3.3 — Canceling edit discards all changes
**What this checks:** Pressing Cancel on the edit form does not save any of the in-progress changes.

**Steps:**
1. Open any direct cost detail page
2. Click **Edit**
3. Change the Description to: **THIS SHOULD NOT SAVE**
4. Click **Cancel**

**Expected result:** The form closes and the original description is still shown. "THIS SHOULD NOT SAVE" does not appear anywhere on the page.

---

### 3.4 — Change the status from Draft to Approved
**What this checks:** The status dropdown works correctly and the status badge updates after saving.

**Setup:** There must be a direct cost with status Draft.

**Steps:**
1. Open a direct cost with status **Draft**
2. Click **Edit**
3. In the **Status** dropdown, select **Approved**
4. Click **Save**

**Expected result:** The status badge on the detail page now shows "Approved" in green (or the appropriate color). No error message appears.

---

## 4. Delete

### 4.1 — Delete a direct cost record
**What this checks:** A direct cost can be deleted and disappears from the list after deletion.

**Setup:** Create a direct cost with description "Delete Me Test" before running this scenario.

**Steps:**
1. Open the Direct Costs page
2. Find the record with description **Delete Me Test**
3. Click the **three-dot** (more options) menu on that row
4. Click **Delete**
5. Confirm deletion in the dialog that appears
6. Wait for the page to reload

**Expected result:** The record "Delete Me Test" is no longer visible in the list. A success toast appeared. No error messages are shown.

---

### 4.2 — Canceling delete leaves the record unchanged
**What this checks:** Pressing Cancel in the delete confirmation dialog does not remove the record.

**Steps:**
1. Hover over any row in the list
2. Click the three-dot action menu → **Delete**
3. In the confirmation dialog, click **Cancel**

**Expected result:** The dialog closes. The direct cost record is still visible in the list, unchanged.

---

### 4.3 — Delete from the detail page
**What this checks:** You can delete a record directly from the detail page using the action menu at the top.

**Steps:**
1. Open any direct cost detail page
2. Click the **three-dot** menu at the top right of the page
3. Click **Delete**
4. Confirm in the dialog

**Expected result:** The app returns to the Direct Costs list. The deleted record is no longer shown.

---

## 5. Status

### 5.1 — Status badges show the correct color
**What this checks:** The status labels are color-coded so they are easy to read at a glance: Draft is gray, Pending is yellow, Approved is green.

**Setup:** There must be records with different statuses in the list.

**Steps:**
1. Open the Direct Costs page
2. Look at the **Status** column in the table
3. Find records with different statuses (Draft, Pending, Approved)

**Expected result:** Each status shows a distinct colored badge. Draft appears in gray, Pending in yellow/orange, Approved in green. The colors make it easy to tell statuses apart without reading the text.

---

### 5.2 — Approve multiple records at once
**What this checks:** Selecting multiple records and using the bulk action to approve them all at once works correctly.

**Setup:** There must be at least two direct costs with status Draft or Pending.

**Steps:**
1. On the Direct Costs list, check the **checkbox** on 2 or more rows
2. Look for a bulk action button or dropdown that appears
3. Click **Approve** (or the relevant bulk action)
4. Confirm if prompted

**Expected result:** All selected records now show status "Approved". A message confirms how many were updated (e.g. "2 records approved"). No error messages appear.

---

## 6. Calculations

### 6.1 — Line items add up to the record total
**What this checks:** When a direct cost has multiple line items, the sum of their amounts equals the total amount displayed at the top of the record.

**Steps:**
1. Open any direct cost that has at least two line items
2. Add up the **"Line Total"** column values yourself (e.g. $1,000 + $2,000 = $3,000)
3. Look at the total amount displayed at the top of the page

**Expected result:** The total amount at the top matches the sum of the line items. For example, if line items are $1,000 and $2,000, the total shows $3,000.00.

---

### 6.2 — Line item total = quantity × unit cost
**What this checks:** The math for each line item is correct: multiplying quantity by unit cost gives the line total.

**Steps:**
1. Open a direct cost detail page
2. Look at a line item that has both **Quantity** and **Unit Cost** filled in
3. Multiply Quantity × Unit Cost yourself (e.g. 4 × $250 = $1,000)
4. Compare to the **Line Total** column

**Expected result:** The Line Total column shows the correct product of Quantity × Unit Cost. For example, 4 units at $250 each = $1,000.00.

---

### 6.3 — Footer row shows sum of all visible amounts
**What this checks:** The grand total at the bottom of the table correctly sums all the Amount values for records currently shown.

**Setup:** There must be at least two direct cost records in the list.

**Steps:**
1. Open the Direct Costs page
2. Look at the bottom of the table for a footer/totals row
3. Add up the individual Amount values yourself

**Expected result:** A totals row at the bottom shows the sum of all displayed amounts. The number matches what you get adding up the individual rows.

---

## 7. Filters & Search

### 7.1 — Search for a direct cost by description
**What this checks:** The search box filters the list to records whose description matches the typed text.

**Setup:** The list must have at least two records with different descriptions.

**Steps:**
1. Open the Direct Costs page
2. Click the search box in the toolbar
3. Type: **Test Direct Cost**
4. Wait for the list to update

**Expected result:** Only records whose description contains "Test Direct Cost" are shown. Records with unrelated descriptions disappear. Clearing the search box brings all records back.

---

### 7.2 — Filter the list to show only Approved records
**What this checks:** The status filter narrows the list to only the selected status.

**Steps:**
1. Click the **Filters** button in the toolbar
2. Select **Status: Approved**
3. Apply the filter

**Expected result:** Only records with status "Approved" are visible. Records with other statuses (Draft, Pending) disappear from the list.

---

### 7.3 — Filter to show only a specific cost type
**What this checks:** The Type filter correctly narrows the list.

**Steps:**
1. Click **Filters**
2. Select **Type: Materials** (or whichever type has records)
3. Apply the filter

**Expected result:** Only records with the selected type are shown. Other cost types disappear from the list.

---

### 7.4 — Clearing filters restores the full list
**What this checks:** After applying a filter, you can get back to seeing all records by clearing the filter.

**Steps:**
1. Apply any filter (e.g. Status: Draft)
2. Confirm the list is filtered
3. Click the **X** or **Clear Filters** button

**Expected result:** All records reappear. The filter badge or indicator is gone from the toolbar.

---

## 8. Export

### 8.1 — Export the direct costs list as a spreadsheet
**What this checks:** Clicking the export button downloads a CSV file that can be opened in Excel or Google Sheets.

**Steps:**
1. On the Direct Costs page, click the **export** or **download** icon in the toolbar
2. If a dialog appears, choose **CSV** format
3. Wait for the download to start

**Expected result:** A CSV file downloads. Opening it shows columns like Date, Vendor, Type, Invoice #, Status, Amount. The data matches what is shown on the page.

---

### 8.2 — Export only filtered results
**What this checks:** When a filter is active, the export only includes the filtered records — not everything.

**Steps:**
1. Apply a filter (e.g. Status: Approved)
2. Click the **export** icon
3. Download the CSV

**Expected result:** The downloaded CSV only contains records matching the active filter. Records that were hidden by the filter are not in the file.

---

## 9. Budget Integration

### 9.1 — Assign a budget code to a line item
**What this checks:** A line item can be linked to a budget code (a category in the project budget), and the assignment saves correctly. This is how the cost gets tracked against the project budget.

**Setup:** A budget code must exist in the project.

**Steps:**
1. Open a direct cost detail page
2. Click **Edit**
3. On a line item row, click the **Budget Code** field
4. Select any available budget code from the dropdown
5. Click **Save**

**Expected result:** The line item now shows the selected budget code. After refreshing the page, the budget code is still shown on that line item.

---

### 9.2 — Cost Code view groups direct costs by budget division
**What this checks:** The Cost Code hierarchy view correctly groups all direct costs under their budget divisions so you can see spending by category at a glance.

**Setup:** At least two direct costs with different budget codes must exist.

**Steps:**
1. Open the Direct Costs page
2. Switch to the **Cost Code** view using the view toggle
3. Look at how the records are organized

**Expected result:** Records are grouped by budget division (e.g. "Division 03 - Concrete", "Division 05 - Metals"). Each group shows a subtotal. Expanding a group shows the individual cost records.

---

## 10. Edge Cases

### 10.1 — Empty state message appears when no records match
**What this checks:** The page shows a helpful message rather than a blank screen when no records exist or match the current filter.

**Steps:**
1. Apply a search or filter that matches no records (e.g. search for a term that doesn't exist)
2. Look at the main content area

**Expected result:** A message appears saying something like "No direct costs found" and optionally a button to create one. The page does not show a blank white space or an error.

---

### 10.2 — Hide and show table columns
**What this checks:** The column selector lets you customize which columns appear in the table.

**Steps:**
1. Click the **column visibility** button in the toolbar (looks like a columns or grid icon)
2. Uncheck **"Invoice #"** to hide that column
3. Close the selector

**Expected result:** The "Invoice #" column disappears from the table. All other columns still display correctly. No error message appears.

---

### 10.3 — ERP sync status column shows the accounting integration state
**What this checks:** The ERP Status column (which shows whether a cost has been synced to the accounting system) is visible in the list.

**Steps:**
1. Open the Direct Costs page
2. Look for the **"ERP Status"** column in the table
3. Note the values shown (e.g. "Synced", "Pending", or blank)

**Expected result:** The ERP Status column is visible. Records that have been synced to accounting show a status indicator. Records not yet synced show blank or "Not Synced". No error appears.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Import from CSV | Dialog exists but flow needs E2E coverage |
| Acumatica sync trigger | Requires accounting system connection |
| Attachment upload on detail page | Not covered in current scenarios |
| Paid Date workflow | No automated workflow rule to verify |
