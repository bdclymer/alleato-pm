# Commitments — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** commitments
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Commitments")
- **Test Project:** Project 67 — Vermillion Rise Warehouse
- **Login:** test1@mail.com / test12026!!!

A **commitment** is a contract with a subcontractor or vendor — for example, an agreement to pay a roofing company $50,000 to complete the roof, or a purchase order to a supplier for materials. It tracks what was agreed, how much it costs, and what has been paid so far.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Commitments page | HIGH |
| 1.2 | Navigation | Switch to the Subcontracts tab | HIGH |
| 1.3 | Navigation | Switch to the Purchase Orders tab | HIGH |
| 1.4 | Navigation | Open the Recycle Bin tab | MEDIUM |
| 2.1 | Create | Create a new Subcontract | HIGH |
| 2.2 | Create | Create a Subcontract with all optional fields | MEDIUM |
| 2.3 | Create | Subcontract form blocks submission when Title is missing | HIGH |
| 2.4 | Create | Cancel subcontract creation returns to list | HIGH |
| 3.1 | Create | Create a new Purchase Order | HIGH |
| 3.2 | Create | Purchase Order form blocks submission when Title is missing | HIGH |
| 4.1 | Edit | Edit a commitment title | HIGH |
| 4.2 | Edit | Change the commitment status | HIGH |
| 4.3 | Edit | Cancel editing does not save changes | HIGH |
| 4.4 | Edit | Edit the retention percentage | MEDIUM |
| 5.1 | Delete | Delete a single commitment | HIGH |
| 5.2 | Delete | Cancel delete keeps the commitment | HIGH |
| 5.3 | Delete | Bulk delete multiple commitments | HIGH |
| 6.1 | Schedule of Values | Add a line item to the SOV | HIGH |
| 6.2 | Schedule of Values | Edit an existing SOV line item | HIGH |
| 6.3 | Schedule of Values | Delete a SOV line item | HIGH |
| 7.1 | Subcontractor SOV | Subcontractor SOV only appears on Subcontracts | HIGH |
| 7.2 | Subcontractor SOV | Submit a Subcontractor SOV | HIGH |
| 8.1 | Change Orders | View Change Orders linked to a commitment | HIGH |
| 8.2 | Change Orders | Create a Change Event from a commitment | HIGH |
| 9.1 | Invoices | View Invoices tab on a commitment | HIGH |
| 9.2 | Invoices | Create an invoice from a commitment | HIGH |
| 10.1 | Payments Issued | View Payments Issued tab | HIGH |
| 11.1 | Financial KPIs | KPI strip shows 5 financial summary blocks | HIGH |
| 11.2 | Financial KPIs | Revised Contract equals Original plus Approved COs | HIGH |
| 12.1 | Search & Filter | Search by contract number | HIGH |
| 12.2 | Search & Filter | Filter by commitment status | MEDIUM |
| 12.3 | Search & Filter | Sort by Original Contract Amount | MEDIUM |
| 13.1 | Export | Export the commitments list | MEDIUM |
| 14.1 | ERP Integration | Sync commitments from Acumatica | HIGH |
| 15.1 | Collaboration | Email a commitment document | MEDIUM |
| 16.1 | Collaboration | Attachments tab shows uploaded files | MEDIUM |
| 17.1 | Change History | Change History tab records field changes | MEDIUM |
| 18.1 | Privacy | Mark a commitment as Private | MEDIUM |
| 19.1 | Settings & Config | Configure page loads | LOW |
| 20.1 | Views & Navigation | Hide a column from the table | LOW |

---

## 1. Navigation

### 1.1 — Open the Commitments page
**What this checks:** The Commitments list page loads without errors and shows existing records.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Click **"Commitments"** in the left sidebar under project "Vermillion Rise Warehouse"
3. Wait for the page to stop loading

**Expected result:** The Commitments page loads. A table is visible with columns including Number, Contract Company, Title, and Status. No error messages appear.

---

### 1.2 — Switch to the Subcontracts tab
**What this checks:** Clicking the Subcontracts tab filters the list to show only subcontract-type commitments.

**Setup:** Be on the Commitments page at `/67/commitments`.

**Steps:**
1. Click the **"Subcontracts"** tab near the top of the page
2. Wait for the page to stop loading

**Expected result:** Only subcontract-type commitments appear in the table. The Subcontracts tab is highlighted as active.

---

### 1.3 — Switch to the Purchase Orders tab
**What this checks:** Clicking the Purchase Orders tab filters the list to show only purchase order commitments.

**Setup:** Be on the Commitments page.

**Steps:**
1. Click the **"Purchase Orders"** tab near the top of the page
2. Wait for the page to stop loading

**Expected result:** Only purchase order commitments appear. The Purchase Orders tab is highlighted as active.

---

### 1.4 — Open the Recycle Bin tab
**What this checks:** Deleted commitments move to the Recycle Bin rather than being permanently erased.

**Setup:** Be on the Commitments page.

**Steps:**
1. Click the **"Recycle Bin"** tab
2. Wait for the page to stop loading

**Expected result:** The Recycle Bin tab loads. Either a list of deleted commitments is shown, or an empty state message saying there are no deleted commitments. No error appears.

---

## 2. Create — Subcontracts

### 2.1 — Create a new Subcontract
**What this checks:** A user can create a new subcontract and it appears in the list.

**Setup:** Be on the Commitments page. There must be at least one vendor in the project directory.

**Steps:**
1. Click the blue **"Create"** button in the top right
2. Select **"Subcontract"** from the dropdown
3. Wait for the form to load
4. Type **SC-TEST-001** in the "Contract Number" field
5. Type **Test Subcontract** in the "Title" field
6. Select any company from the "Contract Company" dropdown
7. Click the **Create** button at the bottom
8. Wait for the page to stop loading

**Expected result:** You are redirected to the Commitments list. A new row appears with Number SC-TEST-001, Title "Test Subcontract", and Status "Draft".

---

### 2.2 — Create a Subcontract with all optional fields filled in
**What this checks:** Every optional field on the subcontract form saves correctly — dates, retention percentage, accounting method, and description.

**Setup:** Be on the Commitments page.

**Steps:**
1. Click **"Create"** then **"Subcontract"**
2. Fill in Contract Number: **SC-FULL-001**
3. Fill in Title: **Full Fields Subcontract**
4. Select a Contract Company
5. Fill in Description: **Test description**
6. Set Start Date to today's date
7. Set Estimated Completion to one month from today
8. Set Contract Date to today
9. Set Retention to **10**
10. Select **"Amount Based"** for Accounting Method
11. Click **Create**

**Expected result:** The subcontract is created. Opening the detail page shows all fields saved correctly — dates, retention at 10%, and Accounting Method as Amount Based.

---

### 2.3 — Subcontract form blocks submission when Title is missing
**What this checks:** You cannot accidentally save a subcontract without a title, which would make it impossible to identify later.

**Setup:** Be on the Commitments page.

**Steps:**
1. Click **"Create"** then **"Subcontract"**
2. Fill in Contract Number: **SC-NOVAL-001**
3. Leave the Title field completely blank
4. Select a Contract Company
5. Click **Create**

**Expected result:** A red validation error appears near the Title field. The form does not submit and you stay on the form page.

---

### 2.4 — Cancel subcontract creation returns to list
**What this checks:** Clicking Cancel discards all entered data and returns to the commitments list without saving anything.

**Setup:** Be on the Commitments page.

**Steps:**
1. Click **"Create"** then **"Subcontract"**
2. Type **SC-CANCEL-001** in Contract Number
3. Type **Should Not Save** in Title
4. Click the **Cancel** button (or click the back arrow)

**Expected result:** You are returned to the Commitments list. No new entry for "Should Not Save" appears in the list.

---

## 3. Create — Purchase Orders

### 3.1 — Create a new Purchase Order
**What this checks:** A user can create a new purchase order and it appears in the list.

**Setup:** Be on the Commitments page.

**Steps:**
1. Click **"Create"** then **"Purchase Order"**
2. Type **PO-TEST-001** in the "Contract Number" field
3. Type **Test Purchase Order** in the "Title" field
4. Select a Contract Company
5. Click **Create**
6. Wait for the page to stop loading

**Expected result:** You are redirected to the Commitments list. A new row appears with Number PO-TEST-001 and Status "Draft".

---

### 3.2 — Purchase Order form blocks submission when Title is missing
**What this checks:** The PO form validates required fields the same way the subcontract form does.

**Setup:** Be on the Commitments page.

**Steps:**
1. Click **"Create"** then **"Purchase Order"**
2. Fill in Contract Number: **PO-NOVAL-001**
3. Leave the Title field blank
4. Click **Create**

**Expected result:** A validation error appears near the Title field. The form does not submit and you stay on the form page.

---

## 4. Edit

### 4.1 — Edit a commitment to change the title
**What this checks:** Editing a commitment saves the changes and they are still visible after refreshing the page.

**Setup:** There must be at least one commitment in the list. Open the detail page for any commitment.

**Steps:**
1. Open any commitment from the list
2. Click the pencil (Edit) icon in the top right of the page
3. Clear the Title field and type **Updated Title Test**
4. Click **Save**
5. Press **Ctrl+R** (Cmd+R on Mac) to refresh the page

**Expected result:** After refreshing, the title shows "Updated Title Test". The page heading reflects the new title.

---

### 4.2 — Edit a commitment to change the status
**What this checks:** The status of a commitment can be changed and the colored status badge updates correctly.

**Setup:** Open any Draft commitment on its detail page.

**Steps:**
1. Click the pencil (Edit) icon
2. Find the Status dropdown
3. Select **"Approved"**
4. Click **Save**
5. Wait for the page to reload

**Expected result:** The status badge changes from "Draft" to "Approved". The list view also shows the updated status.

---

### 4.3 — Cancel editing does not save changes
**What this checks:** Clicking Cancel on the edit form discards all unsaved changes and returns to the original values.

**Setup:** Open any commitment on its detail page.

**Steps:**
1. Click the pencil (Edit) icon
2. Change the Title to **DO NOT SAVE**
3. Click **Cancel**

**Expected result:** You are returned to the detail view. The title still shows the original value, not "DO NOT SAVE".

---

### 4.4 — Edit the retention percentage
**What this checks:** The retention percentage (the amount withheld from each payment until work is complete) saves correctly.

**Setup:** Open any commitment edit form.

**Steps:**
1. Click **Edit** on any commitment
2. Find the **"Retention %"** field
3. Clear the field and type **5**
4. Click **Save**

**Expected result:** The Contract Settings section on the detail page shows Retention at 5%.

---

## 5. Delete

### 5.1 — Delete a single commitment using the row action menu
**What this checks:** Clicking delete from the list removes the commitment (or moves it to the recycle bin for later recovery).

**Setup:** There must be at least one commitment you are okay deleting. Be on the Commitments list.

**Steps:**
1. Hover over any commitment row
2. Click the three-dot action menu icon on the right side of the row
3. Click **"Delete"**
4. Read the confirmation dialog and click the **Delete** button to confirm

**Expected result:** The commitment disappears from the list. A success message (toast notification) briefly appears at the bottom of the screen.

---

### 5.2 — Cancel delete keeps the commitment
**What this checks:** The Cancel button on the delete confirmation dialog works — clicking Cancel should not delete anything.

**Setup:** Be on the Commitments list.

**Steps:**
1. Hover over any commitment row
2. Click the action menu then **"Delete"**
3. When the confirmation dialog appears, click **Cancel**

**Expected result:** The dialog closes. The commitment is still visible in the list.

---

### 5.3 — Bulk delete multiple commitments
**What this checks:** You can select multiple commitments at once and delete them all together in one action.

**Setup:** There must be at least 2 commitments in the list that you are okay deleting.

**Steps:**
1. Click the checkbox on the left of at least 2 commitment rows
2. Look for a **"Delete"** button that appears in the toolbar at the top
3. Click it
4. Confirm the deletion in the dialog that appears

**Expected result:** All selected commitments are removed from the list. A success toast shows how many were deleted.

---

## 6. Schedule of Values

The Schedule of Values (SOV) is a breakdown of what work is included in the contract and how much each part costs — for example: Framing = $10,000, Plumbing = $5,000.

### 6.1 — Add a line item to the Schedule of Values
**What this checks:** A user can add a cost line item to the SOV and it is saved.

**Setup:** Open any commitment that is in Draft status. You should be on the commitment detail page.

**Steps:**
1. Click the **"SC SOV"** or **"PO SOV"** tab (the name depends on whether it is a subcontract or purchase order)
2. Click the **"Add Line Item"** button (or the plus button)
3. Type **Framing** in the Description field
4. Type **10000** in the Amount field
5. Click **Save**

**Expected result:** A new line item appears in the SOV table with description "Framing" and amount $10,000. The SOV Total increases by $10,000.

---

### 6.2 — Edit an existing SOV line item
**What this checks:** You can change the amount on an existing SOV line item and the total automatically updates.

**Setup:** Open a commitment that has at least one SOV line item.

**Steps:**
1. Click the SOV tab
2. Click the Edit button or click on the amount of an existing line item
3. Change the amount to **20000**
4. Click **Save**

**Expected result:** The line item amount shows $20,000 and the SOV Total updates to reflect the new amount.

---

### 6.3 — Delete a SOV line item
**What this checks:** You can remove an unwanted line item from the Schedule of Values.

**Setup:** Open a commitment with at least one SOV line item.

**Steps:**
1. Click the SOV tab
2. Click the delete button (trash icon) next to a line item
3. Confirm if a confirmation prompt appears

**Expected result:** The line item is removed from the table. The SOV Total decreases by that item's amount.

---

## 7. Subcontractor SOV

The Subcontractor SOV is a detailed cost breakdown submitted by the subcontractor. It only exists on Subcontracts, not Purchase Orders.

### 7.1 — Subcontractor SOV tab only appears on Subcontracts
**What this checks:** The "Subcontractor SOV" tab is visible on Subcontracts but does not appear on Purchase Orders.

**Setup:** Have at least one Subcontract and one Purchase Order in the list.

**Steps:**
1. Open a Subcontract detail page
2. Look at the row of tabs and find **"Subcontractor SOV"**
3. Go back to the list
4. Open a Purchase Order detail page
5. Look at the row of tabs

**Expected result:** The Subcontract detail has a "Subcontractor SOV" tab. The Purchase Order detail does NOT have this tab.

---

### 7.2 — Submit a Subcontractor SOV
**What this checks:** The Subcontractor SOV can be submitted once all amounts are fully allocated. The Submit button is disabled until the "Remaining to Allocate" field shows $0.00.

**Setup:** Open a Subcontract that has SOV line items. Click the Subcontractor SOV tab.

**Steps:**
1. On the Subcontractor SOV tab, add line item rows
2. Make sure the **"Remaining to Allocate"** field shows **$0.00** (all amounts are fully broken down)
3. Click the **Submit** button

**Expected result:** The SSOV status changes to "Under Review". The Submit button becomes greyed out (inactive).

---

## 8. Change Orders

### 8.1 — View Change Orders linked to a commitment
**What this checks:** The Change Orders tab loads and shows any change orders that modify this contract.

**Setup:** Open any commitment detail page.

**Steps:**
1. Click the **"Change Orders"** tab on the commitment detail page
2. Wait for the tab to load

**Expected result:** The Change Orders tab shows either a list of change orders or an empty state message saying there are none yet. No error appears.

---

### 8.2 — Create a Change Event from a commitment
**What this checks:** The "Create Change Event" action is accessible from the commitment detail page.

**Setup:** Open a commitment detail page.

**Steps:**
1. Click the **"Create"** button in the top right
2. Select **"Change Event"** from the dropdown

**Expected result:** Either you are taken to a change event creation form, or a guidance message appears. No error toast appears.

---

## 9. Invoices

### 9.1 — View Invoices tab on a commitment
**What this checks:** The Invoices tab loads and shows any invoices submitted against this contract.

**Setup:** Open any commitment detail page.

**Steps:**
1. Click the **"Invoices"** tab
2. Wait for the tab to load

**Expected result:** The Invoices tab loads. Either a list of invoices is shown or an empty state message. No error appears.

---

### 9.2 — Create an invoice from a commitment
**What this checks:** Clicking Create > Invoice takes you to the invoice creation form with the commitment pre-linked.

**Setup:** Open any commitment detail page.

**Steps:**
1. Click the **"Create"** button in the top right
2. Select **"Invoice"** from the dropdown
3. Wait for the page to load

**Expected result:** You are taken to an invoice creation form. The form is pre-filled with the commitment's information.

---

## 10. Payments Issued

### 10.1 — View Payments Issued tab on a commitment
**What this checks:** The Payments Issued tab loads and shows any payments recorded against this contract.

**Setup:** Open any commitment detail page.

**Steps:**
1. Click the **"Payments Issued"** tab
2. Wait for the tab to load

**Expected result:** The Payments Issued tab loads. Either payments are listed or an empty state message appears. No error.

---

## 11. Financial KPIs

### 11.1 — KPI strip shows 5 financial summary blocks
**What this checks:** The 5 summary blocks at the top of the commitment detail give a quick financial snapshot. All 5 should appear and show dollar values.

**Setup:** Open any commitment detail page.

**Steps:**
1. Look at the top area of the commitment detail page, just below the title and description
2. Count the colored summary blocks

**Expected result:** Exactly 5 summary blocks are visible: "Original Contract", "Approved COs", "Revised Contract", "Billed to Date", and "Balance to Finish". Each shows a dollar amount.

---

### 11.2 — Revised Contract equals Original plus Approved COs
**What this checks:** The financial math is correct — Revised Contract Amount should always equal Original Amount plus all Approved Change Orders.

**Setup:** Open a commitment that has at least one approved change order.

**Steps:**
1. Note the **"Original Contract"** dollar amount in the top summary strip
2. Note the **"Approved COs"** dollar amount
3. Add those two numbers together (on paper or a calculator)
4. Compare your total to the **"Revised Contract"** amount shown

**Expected result:** The "Revised Contract" amount exactly equals Original Contract plus Approved COs. The math is correct.

---

## 12. Search & Filter

### 12.1 — Search for a commitment by contract number
**What this checks:** Typing in the search box filters the list to show only commitments matching what you typed.

**Setup:** Be on the Commitments list. There must be at least one commitment.

**Steps:**
1. Click the search box labeled **"Search commitments..."**
2. Type the contract number of a commitment you know exists
3. Wait for the list to update (it may update as you type)

**Expected result:** Only commitments matching the contract number are shown. The list shrinks to the matching result(s).

---

### 12.2 — Filter by commitment status
**What this checks:** Applying a status filter shows only commitments with that specific status.

**Setup:** Be on the Commitments list with at least one commitment in Draft status.

**Steps:**
1. Click the **"Filters"** button in the toolbar
2. Find the Status filter option
3. Select **"Draft"**
4. Apply the filter

**Expected result:** Only commitments with status "Draft" appear in the list. Commitments with other statuses are hidden.

---

### 12.3 — Sort list by Original Contract Amount
**What this checks:** Clicking a column header sorts the list by that column value, and clicking again reverses the sort direction.

**Setup:** Be on the Commitments list with at least 2 commitments that have different contract amounts.

**Steps:**
1. Click the **"Original Contract Amount"** column header
2. Click it a second time to reverse the sort direction

**Expected result:** First click: commitments sort from lowest to highest amount. Second click: they sort from highest to lowest.

---

## 13. Export

### 13.1 — Export the commitments list
**What this checks:** The export function lets you download commitment data as a file you can open in Excel or similar.

**Setup:** Be on the Commitments list.

**Steps:**
1. Look for an Export button or download icon in the toolbar at the top of the table
2. Click it
3. If a dialog appears, select a format (such as CSV or Excel) and click **Export** or **Download**

**Expected result:** A file downloads to your computer containing the commitment data. The file opens without errors and contains the commitment rows.

---

## 14. ERP Integration

### 14.1 — Sync commitments from Acumatica
**What this checks:** Commitments can be imported automatically from the accounting system (Acumatica). The sync button should run and show a result message.

**Setup:** Be on the Commitments list.

**Steps:**
1. Look for a circular refresh/sync icon in the toolbar
2. Hover over it to see the tooltip — it should say **"Sync commitments from Acumatica"**
3. Click the icon
4. Wait for it to finish (the icon will spin and then stop)

**Expected result:** A success message appears at the bottom of the screen showing how many commitments were created or updated. The icon stops spinning.

---

## 15. Collaboration — Email

### 15.1 — Email a commitment document to someone
**What this checks:** You can send the commitment document as an email directly from the detail page — useful for sending contract details to a subcontractor.

**Setup:** Open any commitment detail page.

**Steps:**
1. Click the envelope (mail) icon in the top right header area of the commitment detail
2. Wait for the email dialog to open

**Expected result:** The email dialog opens without errors. It shows fields for recipient, subject, and message. No error toast appears.

---

## 16. Collaboration — Attachments

### 16.1 — Attachments tab shows uploaded files
**What this checks:** Files attached to a commitment (like signed contracts or photos) appear in the Attachments tab.

**Setup:** Open any commitment detail page.

**Steps:**
1. Click the **"Attachments"** tab
2. Wait for the tab to load

**Expected result:** The Attachments tab loads. Either a list of attached files is shown or an empty state message. No error appears.

---

## 17. Change History

### 17.1 — Change History tab records field changes
**What this checks:** Any edits made to a commitment are automatically logged — showing who changed what, when, and what the old and new values were.

**Setup:** Open any commitment that has been edited at least once.

**Steps:**
1. Click the **"Change History"** tab
2. Wait for the tab to load

**Expected result:** A list of changes is shown. Each entry shows the field that changed, the old value, the new value, the user who made the change, and the date and time.

---

## 18. Privacy

### 18.1 — Mark a commitment as Private
**What this checks:** A private commitment is only visible to users with Admin access. This test checks the private setting saves correctly.

**Setup:** Open any commitment edit form.

**Steps:**
1. Click **Edit** on any commitment
2. Find the **"Private"** checkbox or toggle
3. Turn it on (check the box or flip the toggle to the on position)
4. Click **Save**

**Expected result:** The detail page shows "Private" in the Privacy section. The Visibility field reads "Private".

---

## 19. Settings & Config

### 19.1 — Configure page loads for the Commitments tool
**What this checks:** The Settings/Configure page for the Commitments tool loads without errors.

**Setup:** Be logged in to the app.

**Steps:**
1. Navigate to `/67/commitments/configure` (type this into the browser address bar)

**Expected result:** The configure page loads. Tool-level settings for the Commitments tool are visible. No error message appears.

---

## 20. Views & Navigation

### 20.1 — Hide a column from the commitments table
**What this checks:** You can hide columns you do not need to make the table less cluttered and easier to read.

**Setup:** Be on the Commitments list.

**Steps:**
1. Look for a **"Columns"** button or icon in the toolbar (it may show a table/column icon)
2. Click it to open the column visibility menu
3. Uncheck one column (for example, **"ERP Status"**)
4. Close the menu by clicking elsewhere

**Expected result:** The unchecked column disappears from the table. The remaining columns still show correct data.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Send Contract to Subcontractor (DocuSign/e-sign) | Multi-step signing flow, requires external integration |
| Prime Contract PCO linkage | Cross-tool relationship not fully verified |
| Retention release workflow | Complex multi-step process, needs dedicated test flow |
| Lien waivers on payment | Not confirmed to exist in current implementation |
| Bulk status update | Multi-select status change not confirmed available |
| SOV import from file | File-based import flow needs dedicated testing |
