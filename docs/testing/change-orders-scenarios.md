# Change Orders — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** change-orders
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Change Orders")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

A **change order** is a formal, approved modification to a construction contract. It officially changes the price or scope of work after both the owner and contractor have agreed to it. Change orders come in two types: **Prime Contract** change orders (changes to the main owner-contractor agreement) and **Commitment** change orders (changes to subcontractor or vendor contracts).

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Change Orders page | HIGH |
| 1.2 | Navigation | Switch between Prime Contract and Commitments tabs | HIGH |
| 1.3 | Navigation | Open a prime contract change order detail page | HIGH |
| 2.1 | Create | Create a new prime contract change order | HIGH |
| 2.2 | Create | Create fails when PCCO Number or Title is missing | HIGH |
| 2.3 | Create | Create a new commitment change order | HIGH |
| 3.1 | Edit | Edit the title and amount of an existing prime contract change order | HIGH |
| 3.2 | Edit | Saved edits persist after page refresh | HIGH |
| 4.1 | Delete | Delete a prime contract change order | HIGH |
| 5.1 | Status / Workflow | Approve a proposed prime contract change order | HIGH |
| 5.2 | Status / Workflow | Reject a proposed prime contract change order | MEDIUM |
| 6.1 | Filter / Search | Search prime contract change orders by title | MEDIUM |
| 6.2 | Filter / Search | Filter prime contract change orders by status | MEDIUM |

---

## 1. Navigation

### 1.1 — Open the Change Orders page
**What this checks:** The Change Orders list page loads without errors and shows the correct columns and tabs.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Navigate to `/767/change-orders`
3. Wait for the page to finish loading

**Expected result:** The page loads fully. A table of change orders is visible with columns for #, Title, Status, Amount, and Contract Company. Two tabs are visible: "Prime Contract" and "Commitments". No error messages appear.

---

### 1.2 — Switch between Prime Contract and Commitments tabs
**What this checks:** Both tabs load their respective data without errors and the URL updates correctly.

**Steps:**
1. Open the Change Orders page at `/767/change-orders`
2. Click the **"Commitments"** tab
3. Wait for the table to reload
4. Click the **"Prime Contract"** tab

**Expected result:** Clicking "Commitments" loads the commitments change orders table. The URL updates to include `?tab=commitment`. Clicking "Prime Contract" switches back to the prime list. No errors appear on either tab.

---

### 1.3 — Open a prime contract change order detail page
**What this checks:** Clicking a record in the list opens the correct detail page with all expected sections.

**Setup:** The Prime Contract tab must have at least one existing record.

**Steps:**
1. Open the Change Orders page
2. Make sure the **"Prime Contract"** tab is selected
3. Click on the title of any change order in the list

**Expected result:** The detail page opens at `/767/change-orders/prime/{id}`. The change order title, PCCO number, status badge, and amount are displayed. Tabs are visible (Details, Line Items, Attachments). No error messages appear.

---

## 2. Create

### 2.1 — Create a new prime contract change order
**What this checks:** A user can fill out the prime contract CO form and the new record is saved correctly.

**Steps:**
1. Open the Change Orders page at `/767/change-orders`
2. Click the **"New Change Order"** button (top right)
3. In the **"PCCO Number"** field, type: **001776**
4. In the **"Title"** field, type: **Test PCCO from Scenario**
5. Leave Status as **"Proposed"**
6. In the **"Amount ($)"** field, type: **15000**
7. Click the **"Create"** button
8. Wait for the page to stop loading

**Expected result:** The new change order is created and the page navigates to the detail view. The PCCO number "001776", title "Test PCCO from Scenario", status "Proposed", and amount "$15,000.00" are all shown correctly. A success toast appears briefly.

---

### 2.2 — Create fails when PCCO Number or Title is missing
**What this checks:** The form prevents saving when required fields are empty.

**Steps:**
1. Open the Change Orders page
2. Click the **"New Change Order"** button
3. Leave both **"PCCO Number"** and **"Title"** fields completely empty
4. Click the **"Create"** button

**Expected result:** Error messages appear below the PCCO Number and Title fields (e.g. "PCCO number is required", "Title is required"). The record is NOT created. The form stays open.

---

### 2.3 — Create a new commitment change order
**What this checks:** A user can create a commitment change order linked to an existing contract.

**Setup:** At least one contract must exist in the project for the Contract dropdown to have options.

**Steps:**
1. Open `/767/change-orders?tab=commitment`
2. Click the **"New Change Order"** button
3. Select a contract from the **"Contract"** dropdown
4. In the **"CO Number"** field, type: **001816**
5. In the **"Description"** field, type: **Test Commitment CO from Scenario**
6. In the **"Amount ($)"** field, type: **5000**
7. Click the **"Create"** button
8. Wait for the page to stop loading

**Expected result:** The new commitment change order is created and the detail page opens. The CO number "001816", description "Test Commitment CO from Scenario", and amount "$5,000.00" are all shown. A success toast appears briefly.

---

## 3. Edit

### 3.1 — Edit the title and amount of an existing prime contract change order
**What this checks:** Users can edit a change order and the updated values are saved.

**Setup:** Create a prime contract change order first (scenario 2.1).

**Steps:**
1. Open a prime contract change order detail page
2. Click the **"Edit"** button
3. Change the Title to: **Updated PCCO Title Test**
4. Change the Amount to: **20000**
5. Click **"Save"**
6. Wait for the page to stop loading

**Expected result:** The detail page now shows the title "Updated PCCO Title Test" and amount "$20,000.00". A success toast appears briefly. The old values are no longer shown.

---

### 3.2 — Saved edits persist after page refresh
**What this checks:** Saved changes are stored in the database, not just shown temporarily in the browser.

**Setup:** Complete scenario 3.1 first (edit a title/amount and save).

**Steps:**
1. After saving an edit, stay on the detail page
2. Press **Ctrl+R** (or **Cmd+R** on Mac) to refresh the browser
3. Wait for the page to reload

**Expected result:** The updated title "Updated PCCO Title Test" and amount "$20,000.00" are still shown after the refresh. No data reverted to the original values.

---

## 4. Delete

### 4.1 — Delete a prime contract change order
**What this checks:** A change order can be deleted and it disappears from the list afterwards.

**Setup:** Create a prime contract change order named "Test PCCO from Scenario" (scenario 2.1).

**Steps:**
1. Open the Change Orders page
2. Find the row titled **Test PCCO from Scenario** in the Prime Contract tab
3. Click the three-dot menu (**⋯**) on that row
4. Click **"Delete"**
5. Confirm the deletion in the dialog that appears
6. Wait for the page to reload

**Expected result:** The record "Test PCCO from Scenario" is no longer visible in the list. A success toast ("Change order deleted") appears briefly.

---

## 5. Status / Workflow

### 5.1 — Approve a proposed prime contract change order
**What this checks:** A change order can be moved from "Proposed" to "Approved" and the status badge updates.

**Setup:** A prime contract change order with status "Proposed" must exist.

**Steps:**
1. Open a prime contract change order with status **"Proposed"**
2. Click the **"Edit"** button
3. In the **"Status"** dropdown, select **"Approved"**
4. Click **"Save"**
5. Wait for the page to stop loading

**Expected result:** The status badge now shows "Approved" in green. No error messages appear. The change is saved and visible after refresh.

---

### 5.2 — Reject a proposed prime contract change order
**What this checks:** A change order can be moved to "Rejected" status.

**Setup:** A prime contract change order with status "Proposed" must exist.

**Steps:**
1. Open a prime contract change order with status **"Proposed"**
2. Click the **"Edit"** button
3. In the **"Status"** dropdown, select **"Rejected"**
4. Click **"Save"**
5. Wait for the page to stop loading

**Expected result:** The status badge now shows "Rejected". The change is saved. No error messages appear.

---

## 6. Filter / Search

### 6.1 — Search prime contract change orders by title
**What this checks:** The search box filters the list to matching records.

**Setup:** The Prime Contract list must have at least two records with different titles.

**Steps:**
1. Open the Change Orders page at `/767/change-orders`
2. Make sure the **"Prime Contract"** tab is selected
3. Click the search box (shows "Search prime contract COs...")
4. Type part of a known change order title, e.g. **Test PCCO**
5. Wait for the list to filter

**Expected result:** The list narrows to show only records whose title or PCCO number contains "Test PCCO". Records with unrelated titles are hidden. Clearing the search box brings all records back.

---

### 6.2 — Filter prime contract change orders by status
**What this checks:** The Status filter narrows the list to matching records.

**Setup:** At least one Approved and one non-Approved prime contract change order must exist.

**Steps:**
1. Open the Change Orders page at `/767/change-orders`
2. Click the **"Filters"** button in the toolbar
3. In the **Status** filter, select **"Approved"**
4. Wait for the list to update

**Expected result:** Only change orders with status "Approved" are shown. The record count in the toolbar updates to reflect the filtered results. Clearing the filter brings all records back.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Executed / Not Executed filter | Executes toggle exists in filter but needs dedicated scenario |
| Column visibility toggle | Show/hide columns feature needs verification |
| Card and List view modes | Three view modes exist (table/card/list) — card and list not explicitly tested |
| Commitment CO edit and delete | Detail page exists but edit/delete flow not scenario-covered |
| Contract amount impact | Verifying that approving a CO updates the prime contract total |
| Export to CSV/PDF | Export feature not yet enabled (features.enableExport = false) |
