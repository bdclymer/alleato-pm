# Budget — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** budget
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Budget")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

A **budget** is a breakdown of how much money is allocated to each category of work on a construction project. Each row (called a line item) represents one cost area — for example, concrete, electrical, or labor. The budget also tracks how costs change over time as change orders are approved.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Budget page | HIGH |
| 1.2 | Read | Summary totals match the line items | HIGH |
| 2.1 | Create | Create a new budget line item | HIGH |
| 2.2 | Create | Required fields block save | MEDIUM |
| 3.1 | Edit | Edit a line item value and verify it persists | HIGH |
| 3.2 | Edit | Cancel an edit discards changes | MEDIUM |
| 4.1 | Delete | Delete a budget line item | HIGH |
| 5.1 | Forecast | Edit the forecast-to-complete value | HIGH |
| 6.1 | Filter / Search | Search filters the budget table | MEDIUM |
| 7.1 | Export | Export the budget to a file | LOW |

---

## 1. Navigation

### 1.1 — Open the Budget page
**What this checks:** The Budget page loads without errors and displays line items with column totals.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Open project **Alleato AI** (Project 767)
3. Click **"Budget"** in the left sidebar
4. Wait for the page to stop loading

**Expected result:** The budget table loads and is visible. Columns include Description, Original Budget Amount, Revised Budget, Committed Costs, and others. No error messages appear. No spinner is stuck on the screen.

---

## 2. Read

### 1.2 — Budget summary totals match the line items
**What this checks:** The totals row at the top (or bottom) of the table correctly adds up the individual line item values.

**Steps:**
1. Open the Budget page
2. Note the **Original Budget** total shown in the summary or footer row
3. Mentally (or with a calculator) add the Original Budget values from each visible row in the table

**Expected result:** The summary total equals the sum of the individual row values, allowing for rounding to the nearest whole dollar. No rows are unexpectedly missing from the calculation.

---

## 3. Create

### 2.1 — Create a new budget line item
**What this checks:** A user can add a new line item to the budget and it appears in the table with the correct value.

**Steps:**
1. Open the Budget page
2. Click the **New Line Item** button (or equivalent button in the top right)
3. In the **Cost Code** field, select any option from the dropdown
4. In the **Description** field, type: **Test line**
5. In the **Original Budget** field, type: **1000**
6. Click **Save**
7. Wait for the page to stop loading

**Expected result:** A new row appears in the table with the description "Test line" and Original Budget of $1,000. The Original Budget summary total increases by $1,000. No error toast appears.

---

### 2.2 — Required fields block save
**What this checks:** The form prevents saving when the required Cost Code field is left empty.

**Steps:**
1. Open the Budget page
2. Click the **New Line Item** button
3. Leave the **Cost Code** field empty (do not select anything)
4. Click **Save**

**Expected result:** An error message appears near the Cost Code field (e.g. "Cost Code is required"). The record is NOT created. No new row appears in the table. The form stays open.

---

## 4. Edit

### 3.1 — Edit a budget line item and verify it persists
**What this checks:** Changes made to a line item are saved to the database and survive a page refresh.

**Setup:** There must be at least one existing line item in the budget table.

**Steps:**
1. Open the Budget page
2. Click on an existing line item to open or select it for editing
3. Change the **Original Budget** value to a new dollar amount (e.g. **5000**)
4. Click **Save**
5. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page
6. Find the same line item in the table

**Expected result:** After the refresh, the new value ($5,000) is still shown. The summary totals at the top of the table reflect the updated amount. No data reverted to the old value.

---

### 3.2 — Cancel an edit discards changes
**What this checks:** Clicking Cancel on the edit form does not save any changes.

**Setup:** There must be at least one existing line item.

**Steps:**
1. Open the Budget page
2. Open a line item for editing
3. Change the **Original Budget** to a different value (e.g. type **99999**)
4. Click **Cancel** (instead of Save)
5. Refresh the page

**Expected result:** The original value is still in place after the refresh. $99,999 does not appear anywhere in the table. Nothing was saved.

---

## 5. Delete

### 4.1 — Delete a budget line item
**What this checks:** A line item can be deleted and it disappears from the table permanently.

**Setup:** Create a line item named "Test line" (from scenario 2.1) before running this test, or use any existing line item you are comfortable deleting.

**Steps:**
1. Open the Budget page
2. Find the row with description **Test line** (or the row you want to delete)
3. Click the three-dot menu (or row action menu) on that row
4. Click **Delete**
5. Confirm the deletion in the dialog that appears
6. Wait for the page to stop loading

**Expected result:** The deleted row is no longer visible in the table. The Original Budget summary total decreases by the amount that was on the deleted line. Refreshing the page confirms the row stays deleted.

---

## 6. Forecast

### 5.1 — Edit the forecast-to-complete value on a line item
**What this checks:** The Forecast to Complete field can be updated and the projected total recalculates correctly.

**Setup:** There must be at least one existing line item. The budget page must show a forecast column (look for a column labeled "Forecast to Complete" or similar).

**Steps:**
1. Open the Budget page
2. Find a line item that has a forecast column visible
3. Click to edit the **Forecast to Complete** value on that line item
4. Type a new value (e.g. **2500**)
5. Click **Save**
6. Refresh the page

**Expected result:** The Forecast to Complete value shows $2,500 after the refresh. Any derived columns (such as Variance or Projected Budget) recalculate to reflect the new forecast. No error message appears.

---

## 7. Filter / Search

### 6.1 — Search filters the budget table
**What this checks:** Typing in the search box narrows the table to only matching rows.

**Setup:** The budget table must have at least two line items with different descriptions or cost codes.

**Steps:**
1. Open the Budget page
2. Locate the search box in the toolbar (usually shows a magnifying glass icon or the placeholder text "Search...")
3. Type a known cost code number or description word, e.g. **Test**
4. Wait for the table to filter

**Expected result:** The table narrows to show only rows whose description or cost code contains "Test". Rows that do not match are hidden. Clearing the search box brings all rows back.

---

## 8. Export

### 7.1 — Export the budget to a file
**What this checks:** The export feature downloads a file that contains the budget data visible on the screen.

**Steps:**
1. Open the Budget page
2. Click the **export icon** in the toolbar (usually looks like a down-arrow or a grid icon)
3. Select **CSV** or **Excel** if prompted
4. Wait for the file to download
5. Open the downloaded file

**Expected result:** The file downloads without errors. It contains the same line items shown in the table, with matching descriptions and dollar values. No rows are missing.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Budget Modifications column (inline editing) | Requires the budget to be unlocked — workflow not yet documented |
| Approved COs / Revised Budget columns | Values are driven by approved change orders; requires a full change order workflow to test end-to-end |
| Forecasting tab | Tab exists but dedicated forecasting configuration flow needs a separate test pass |
| Project Status Snapshots | Snapshot creation and comparison is a multi-step workflow; not covered here |
| Change History tab | Audit log exists but requires multiple prior edits to have meaningful entries |
| Budget Settings | Settings page exists (formatting, permissions) but is not covered in basic scenarios |
| Import from CSV | Import workflow not yet verified |
