# Prime Contracts — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** prime-contracts
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Prime Contracts")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

A **prime contract** is the main legal agreement between the project owner (the client paying for construction) and the general contractor who builds it. It sets the total price, scope of work, and schedule for the entire project. All change orders, invoices, and payments on a project flow through this contract.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Prime Contracts list page | HIGH |
| 1.2 | Navigation | Open a prime contract detail page | HIGH |
| 1.3 | Navigation | Return to the list from a detail page | MEDIUM |
| 1.4 | Navigation | Switch between tabs on the detail page | HIGH |
| 2.1 | Create | Create a new prime contract with required fields | HIGH |
| 2.2 | Create | Create a contract with all major fields filled in | MEDIUM |
| 2.3 | Create | Try to create a contract without a title | HIGH |
| 3.1 | Edit | Edit the title of an existing contract | HIGH |
| 3.2 | Edit | Saved edits persist after refreshing the page | HIGH |
| 3.3 | Edit | Cancelling the edit form discards unsaved changes | MEDIUM |
| 4.1 | Delete | Delete a prime contract | HIGH |
| 5.1 | Status | Move a contract from Draft to Out to Bid | HIGH |
| 5.2 | Status | Mark a contract as Executed | MEDIUM |
| 6.1 | Schedule of Values | Open the Schedule of Values tab | HIGH |
| 6.2 | Schedule of Values | Add a line item to the Schedule of Values | HIGH |
| 6.3 | Schedule of Values | Adding multiple SOV line items updates the contract total | HIGH |
| 7.1 | Change Orders | Open the Change Orders tab on a contract | HIGH |
| 8.1 | Invoices | Open the Invoices tab on a contract | HIGH |
| 8.2 | Payments | Open the Payments tab on a contract | MEDIUM |
| 9.1 | Filter / Search | Search for a contract by title keyword | MEDIUM |
| 9.2 | Filter / Search | Filter contracts by status | MEDIUM |
| 9.3 | Filter / Search | Filter contracts by executed status | LOW |
| 10.1 | Export | Export the contracts list to a CSV file | MEDIUM |
| 11.1 | Row Expand | Expand a contract row to reveal its change orders | MEDIUM |
| 12.1 | Bulk Actions | Select multiple contract rows using checkboxes | MEDIUM |
| 12.2 | Bulk Actions | Delete multiple contracts at once using bulk select | MEDIUM |
| 13.1 | Integration | Change orders listed under a contract link to the correct detail page | HIGH |

---

## 1. Navigation

### 1.1 — Open the Prime Contracts list page
**What this checks:** The Prime Contracts page loads without errors and shows the list of contracts.

A prime contract is the main legal agreement between the project owner (the client paying for construction) and the general contractor who builds it. It sets the total price, scope, and schedule for the entire project.

**Steps:**
1. Log in as test1@mail.com
2. Navigate to http://localhost:3000/767/prime-contracts
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of prime contracts is visible (or an empty-state message). Column headers include Contract #, Owner/Client, Title, Status, Executed, Original Contract Amount, Revised Contract Amount. No error messages appear.

---

### 1.2 — Open a prime contract detail page
**What this checks:** Clicking a row opens the full detail page for that contract, where all contract information and tabs are visible.

**Setup:** The Prime Contracts list must have at least one existing record.

**Steps:**
1. Open the Prime Contracts list page
2. Click on any contract row in the table
3. Wait for the page to stop loading

**Expected result:** The detail page opens. The contract number, title, and status are shown at the top. Tabs are visible — at minimum: Overview (or General), Schedule of Values, Change Orders, Invoices, and Payments. No error messages appear.

---

### 1.3 — Return to the list from a detail page
**What this checks:** The back button or breadcrumb on the detail page navigates the user back to the Prime Contracts list.

**Setup:** Open any prime contract detail page first.

**Steps:**
1. Open a prime contract detail page
2. Click the back arrow or "Prime Contracts" breadcrumb link at the top of the page
3. Wait for the page to load

**Expected result:** The Prime Contracts list page loads. The previously viewed contract is still visible in the list. No error messages appear.

---

### 1.4 — Switch between tabs on the detail page
**What this checks:** Each tab on the contract detail page loads without errors. Tabs hold different sections of contract data: overview info, the payment schedule (SOV), change orders issued against this contract, invoices, and payments received.

**Setup:** Open any prime contract detail page.

**Steps:**
1. Open a prime contract detail page
2. Click the **Schedule of Values** tab
3. Click the **Change Orders** tab
4. Click the **Invoices** tab
5. Click the **Payments** tab
6. Click back to the first tab (Overview or General)

**Expected result:** Each tab loads without an error or blank screen. The active tab is visually highlighted. No JavaScript errors appear in the page.

---

## 2. Create

### 2.1 — Create a new prime contract with required fields
**What this checks:** The basic creation flow — filling in the minimum required fields and saving the contract so it appears in the list.

**Steps:**
1. On the Prime Contracts list page, click the **Create** button (top right)
2. In the **Contract #** field, type: **PC-TEST-001**
3. In the **Title** field, type: **Test Prime Contract**
4. Leave Status as **Draft** (the default)
5. Click **Save** (or Create)
6. Wait for the page to stop loading

**Expected result:** A success message (toast notification) briefly appears. The app navigates to the detail page for the new contract, or back to the list showing "Test Prime Contract". No error messages appear.

---

### 2.2 — Create a contract with all major fields filled in
**What this checks:** Optional fields — Owner/Client, Contractor, Architect, Start Date, Estimated Completion Date, Default Retainage, and Description — all save correctly.

**Steps:**
1. Click **Create** on the Prime Contracts page
2. In **Contract #** type: **PC-FULL-001**
3. In **Title** type: **Full Fields Test Contract**
4. Set Status to **Draft**
5. In the **Owner/Client** dropdown, select any available company
6. In the **Contractor** dropdown, select any available company
7. In **Start Date**, enter **2026-01-01**
8. In **Estimated Completion Date**, enter **2026-12-31**
9. In **Default Retainage**, type: **10**
10. Click **Save**

**Expected result:** The detail page opens showing all filled-in values. Owner/Client, Contractor, Start Date, Completion Date, and Retainage are all shown correctly. No fields revert to blank.

---

### 2.3 — Try to create a contract without a title
**What this checks:** The form prevents saving when the required Title field is left blank, so incomplete contracts cannot be accidentally created.

**Steps:**
1. Click **Create** on the Prime Contracts page
2. Leave the **Title** field completely empty
3. In **Contract #** type: **PC-BLANK-TITLE**
4. Click the **Save** button

**Expected result:** A red error message appears near the Title field saying something like "Title is required". The form does not save and does not navigate away. The Create button can be clicked again after filling in the title.

---

## 3. Edit

### 3.1 — Edit the title of an existing contract
**What this checks:** A user can open the edit form, change the title, and save it successfully.

**Setup:** There must be at least one existing prime contract in the list.

**Steps:**
1. Open the Prime Contracts list
2. Click on any contract to open its detail page
3. Click the **Edit** button (pencil icon or "Edit" label)
4. Clear the Title field and type: **Updated Contract Title**
5. Click **Save**
6. Wait for the page to stop loading

**Expected result:** The detail page now shows "Updated Contract Title". A success toast briefly appears. The old title is no longer visible.

---

### 3.2 — Saved edits persist after refreshing the page
**What this checks:** Data is actually saved to the database, not just shown temporarily in the browser.

**Setup:** Complete scenario 3.1 first (edit a title and save it).

**Steps:**
1. After saving an edit, stay on the detail page
2. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page
3. Wait for the page to finish loading

**Expected result:** The updated title and any other changes are still shown after the refresh. No data reverted to the old values.

---

### 3.3 — Cancelling the edit form discards unsaved changes
**What this checks:** Clicking Cancel does not save anything, so accidental edits cannot corrupt the contract.

**Setup:** There must be at least one existing prime contract.

**Steps:**
1. Open any prime contract detail page
2. Click the **Edit** button
3. Change the Title to: **DO NOT SAVE THIS**
4. Click **Cancel** (instead of Save)

**Expected result:** The form closes and the original title is still displayed. "DO NOT SAVE THIS" does not appear anywhere on the page.

---

## 4. Delete

### 4.1 — Delete a prime contract
**What this checks:** A contract can be permanently deleted and disappears from the list. Note: contracts with associated line items or change orders may be blocked from deletion.

**Setup:** Create a contract named **"Delete Me Contract"** before running this scenario.

**Steps:**
1. On the Prime Contracts list, find the row titled **Delete Me Contract**
2. Click the three-dot menu (⋯) on that row
3. Click **Delete**
4. In the confirmation dialog that appears, click **Delete Contract**
5. Wait for the page to stop loading

**Expected result:** "Delete Me Contract" is no longer visible in the list. A success toast briefly appears. The total contract count decreases by 1.

---

## 5. Status / Workflow

### 5.1 — Move a contract from Draft to Out to Bid
**What this checks:** The status dropdown works. "Out to Bid" means the contract has been sent out for pricing quotes but is not yet signed.

**Setup:** There must be at least one contract with status Draft.

**Steps:**
1. Open a contract with status **Draft**
2. Click **Edit**
3. In the **Status** dropdown, select **Out to Bid**
4. Click **Save**
5. Wait for the page to stop loading

**Expected result:** The status badge on the page now shows "Out to Bid". The change is saved. No error messages appear.

---

### 5.2 — Mark a contract as Executed
**What this checks:** The Executed checkbox/toggle works. "Executed" means the contract has been signed by both parties — the owner and the contractor.

**Setup:** There must be at least one contract that has NOT been marked Executed.

**Steps:**
1. Open any prime contract detail page
2. Click **Edit**
3. Check the **Executed** checkbox (or toggle it to Yes)
4. Click **Save**
5. Wait for the page to stop loading

**Expected result:** The Executed field on the detail page now shows "Yes" (or a checkmark). The contract row in the list also shows Executed as checked. No error messages appear.

---

## 6. Schedule of Values

### 6.1 — Open the Schedule of Values tab
**What this checks:** The SOV tab loads without errors. A Schedule of Values (SOV) is a breakdown of the total contract price into individual line items — for example, "Foundation Work: $50,000" or "Electrical: $120,000". It is used to track how much of the work has been completed and invoiced.

**Setup:** There must be at least one existing prime contract.

**Steps:**
1. Open any prime contract detail page
2. Click the **Schedule of Values** tab
3. Wait for the tab content to load

**Expected result:** The SOV tab displays without errors. Either a table of SOV line items is visible, or an empty-state message like "No line items yet" is shown. Column headers such as Description, Scheduled Value, % Complete, and Balance to Finish are visible.

---

### 6.2 — Add a line item to the Schedule of Values
**What this checks:** A user can add a new SOV line item — a single priced work item — and it is saved with the correct amount.

**Setup:** Open a prime contract and go to the Schedule of Values tab.

**Steps:**
1. On the Schedule of Values tab, click **Add Line Item** (or the + button)
2. In the **Description** field, type: **Foundation Work**
3. In the **Scheduled Value** (amount) field, type: **50000**
4. Click **Save** on the line item
5. Wait for the page to stop loading

**Expected result:** The line item "Foundation Work" appears in the SOV table with a Scheduled Value of $50,000.00. The contract's Original Contract Amount updates to reflect the new total. No error messages appear.

---

### 6.3 — Adding multiple SOV line items updates the contract total
**What this checks:** The Original Contract Amount shown in the Contract Summary reflects the sum of all SOV line items.

**Setup:** Have a contract with at least one SOV line item already added (e.g., Foundation Work = $50,000).

**Steps:**
1. On the Schedule of Values tab, add a second line item: **Electrical Work** with value **120000**
2. Add a third line item: **Plumbing** with value **80000**
3. After saving, look at the Contract Summary section

**Expected result:** The Original Contract Amount in the Contract Summary equals the sum of all line items ($250,000 if using the example values). Each line item shows the correct individual amount.

---

## 7. Change Orders

### 7.1 — Open the Change Orders tab on a contract
**What this checks:** The Change Orders tab loads. Change orders are official amendments to the original contract — they adjust the price or scope after the contract is signed.

**Setup:** There must be at least one existing prime contract.

**Steps:**
1. Open any prime contract detail page
2. Click the **Change Orders** tab
3. Wait for the tab to load

**Expected result:** The Change Orders tab loads without errors. Either a table of change orders is shown (with columns for Number, Title, Status, Amount, etc.) or an empty-state message appears. No error messages appear.

---

## 8. Invoices and Payments

### 8.1 — Open the Invoices tab on a contract
**What this checks:** The Invoices tab loads. Invoices (also called Pay Applications or Pay Apps) are requests the contractor submits to the owner asking to be paid for completed work.

**Setup:** There must be at least one existing prime contract.

**Steps:**
1. Open any prime contract detail page
2. Click the **Invoices** tab
3. Wait for the tab to load

**Expected result:** The Invoices tab loads without errors. Either a list of invoices is shown or an empty-state message appears. The tab does not show a blank white screen or a spinner that never stops.

---

### 8.2 — Open the Payments tab on a contract
**What this checks:** The Payments tab loads. Payments are records of money the owner has actually sent to the contractor in response to invoices.

**Setup:** There must be at least one existing prime contract.

**Steps:**
1. Open any prime contract detail page
2. Click the **Payments** tab
3. Wait for the tab to load

**Expected result:** The Payments tab loads without errors. Either a table of payments is shown (with columns for Invoice, Amount, Date Paid, Payment Number, Check Number) or an empty-state message is displayed. No error messages appear.

---

## 9. Filter / Search

### 9.1 — Search for a contract by title keyword
**What this checks:** The search box on the list page filters contracts by title in real time.

**Setup:** The list must have at least two contracts with different titles.

**Steps:**
1. Open the Prime Contracts list
2. Click the search box (shows a magnifying glass icon or placeholder "Search contracts...")
3. Type: **Test Prime**
4. Wait for the list to filter

**Expected result:** The list narrows to show only contracts whose title or contract number contains "Test Prime". Contracts with unrelated titles disappear. Clearing the search box restores all contracts.

---

### 9.2 — Filter contracts by status
**What this checks:** The Status filter correctly narrows the list to only contracts with the chosen status.

**Setup:** The list must have contracts with at least two different statuses (e.g., Draft and Approved).

**Steps:**
1. Open the Prime Contracts list
2. Click the **Filters** button in the toolbar
3. Find the **Status** filter and select **Draft**
4. Wait for the list to update

**Expected result:** Only contracts with status "Draft" are shown. Contracts with other statuses (e.g., Approved, Out to Bid) are hidden. The active filter chip is displayed in the toolbar.

---

### 9.3 — Filter contracts by executed status
**What this checks:** The Executed filter works. "Executed" means the contract has been formally signed.

**Setup:** The list must have at least one Executed and one non-Executed contract.

**Steps:**
1. Open the Prime Contracts list
2. Click the **Filters** button
3. Find the **Executed** filter and select **Yes**
4. Wait for the list to update

**Expected result:** Only contracts marked as Executed are shown in the list. Non-executed contracts are hidden. Clearing the filter restores all contracts.

---

## 10. Export

### 10.1 — Export the contracts list to a CSV file
**What this checks:** The Export function downloads a CSV file of the current contract list. A CSV is a spreadsheet-like file that can be opened in Excel or Google Sheets.

**Setup:** The list must have at least one contract.

**Steps:**
1. Open the Prime Contracts list
2. Click the **Export** icon in the toolbar (looks like a download arrow)
3. Wait for the download to start

**Expected result:** A file named something like "prime-contracts-1.csv" is downloaded to your computer. Opening the file shows the contract data with column headers matching what is visible in the table. No error messages appear.

---

## 11. Row Expand

### 11.1 — Expand a contract row to reveal its Prime Contract Change Orders
**What this checks:** The expand/collapse feature on the list. Each contract row has a small arrow on the left — clicking it shows change orders linked to that contract without leaving the list page.

**Setup:** There must be at least one prime contract in the list. Change orders linked to it are ideal but not required.

**Steps:**
1. On the Prime Contracts list, find the small arrow (chevron) icon on the far left of any contract row
2. Click that arrow
3. Wait for the sub-rows to load

**Expected result:** The row expands to reveal a nested table showing Prime Contract Change Orders (PCCOs) for that contract, or the message "No change orders" if there are none. Clicking the arrow again collapses the row.

---

## 12. Bulk Actions

### 12.1 — Select multiple contract rows using checkboxes
**What this checks:** The bulk-selection checkboxes work and the bulk-action toolbar appears when rows are selected.

**Setup:** The list must have at least two contracts.

**Steps:**
1. On the Prime Contracts list, click the checkbox on the left of the first contract row
2. Click the checkbox on the second contract row
3. Look at the toolbar

**Expected result:** Both rows are visually highlighted (checkbox checked). The toolbar shows a count like "2 selected" and a bulk-delete button appears. Unchecking both rows hides the bulk-action toolbar.

---

### 12.2 — Delete multiple contracts at once using bulk select
**What this checks:** The bulk-delete workflow — selecting multiple rows and deleting them all in one action.

**Setup:** Create two contracts named **"Bulk Delete A"** and **"Bulk Delete B"** before running this scenario.

**Steps:**
1. On the Prime Contracts list, check the checkbox for **Bulk Delete A**
2. Check the checkbox for **Bulk Delete B**
3. Click the bulk-delete button that appears in the toolbar (trash icon or "Delete selected")
4. In the confirmation dialog, click **Delete 2 Contracts**
5. Wait for the page to stop loading

**Expected result:** Both "Bulk Delete A" and "Bulk Delete B" are removed from the list. A success toast shows how many were deleted. The selection count resets to 0.

---

## 13. Integration

### 13.1 — Change orders listed under a contract link to the correct detail page
**What this checks:** When you expand a contract row and click a change order, it navigates to that change order's detail page.

**Setup:** There must be at least one prime contract with at least one linked prime contract change order (PCCO).

**Steps:**
1. On the Prime Contracts list, expand a contract row that has change orders
2. Click on one of the change order rows in the expanded sub-table
3. Wait for the page to load

**Expected result:** The browser navigates to the detail page for that specific change order. The change order number and title match what was shown in the sub-row. No 404 or error page appears.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Create Invoice (Pay App) from contract | Multi-step flow requires existing SOV items |
| Add Payment record | Requires existing invoice to link to |
| Financial Markup tab | Advanced configuration, needs verified setup |
| Advanced Settings tab | Project-level configuration, varies by project |
| Privacy / Access control | Requires multiple user roles to test properly |
| Column visibility toggles | Low priority, covered by table system tests |
