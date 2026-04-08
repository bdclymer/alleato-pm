# Invoicing — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** invoices
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Invoicing")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

An **invoice** (also called a pay application or billing) is a record of how much work has been completed and how much the client owes for a given period of time. For example, at the end of May you might send Invoice #3 saying "we completed $50,000 of work this month — please pay us." Invoices go through a lifecycle: Draft → Submitted → Approved → Paid.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Invoices page | HIGH |
| 1.2 | Navigation | Switch between Owner, Subcontractor, and Billing Periods tabs | HIGH |
| 1.3 | Navigation | Open an invoice detail page | HIGH |
| 2.1 | Create | Create a new owner invoice | HIGH |
| 2.2 | Create | Try to create an invoice without selecting a contract | HIGH |
| 2.3 | Create | Create a new billing period | HIGH |
| 3.1 | Edit | Edit an existing invoice | HIGH |
| 3.2 | Edit | Edits persist after page refresh | HIGH |
| 4.1 | Status | Move an invoice from Draft to Submitted | HIGH |
| 4.2 | Status | Approve a submitted invoice | HIGH |
| 4.3 | Status | Mark an approved invoice as Paid | MEDIUM |
| 5.1 | Amounts | Verify gross amount and net amount are visible on the list | MEDIUM |
| 6.1 | Filter / Search | Search for an invoice by invoice number | MEDIUM |
| 6.2 | Filter / Search | Filter invoices by status | MEDIUM |

---

## 1. Navigation

### 1.1 — Open the Invoices page
**What this checks:** The Invoices list page loads without errors and shows existing records.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Click **"Invoices"** in the left sidebar of the project
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of owner invoices is visible with columns for Invoice #, Status, Billing Period, Gross Amount, Net Amount, and Paid Amount. No error messages appear.

---

### 1.2 — Switch between Owner, Subcontractor, and Billing Periods tabs
**What this checks:** All three tabs load correctly and show different data.

**Steps:**
1. Open the Invoices page at `/767/invoices`
2. Click the **"Subcontractor"** tab near the top of the table
3. Wait for the tab to load
4. Click the **"Billing Periods"** tab
5. Wait for the tab to load
6. Click **"Owner"** to return to the default tab

**Expected result:** Each tab loads without error and shows a different data set. Owner tab shows invoices. Subcontractor tab shows commitment records. Billing Periods tab shows billing cycle rows.

---

### 1.3 — Open an invoice detail page
**What this checks:** Clicking an invoice opens its detail page with full information.

**Setup:** The Owner Invoices list must have at least one existing record.

**Steps:**
1. Open the Invoices page
2. Click on the Invoice # of any existing invoice in the list
3. Wait for the page to finish loading

**Expected result:** The invoice detail page opens showing the invoice number, status, billing period dates, and line item breakdown. No error messages appear.

---

## 2. Create

### 2.1 — Create a new owner invoice
**What this checks:** A user can create a new invoice and it appears in the Owner list.

> **What is an invoice?** Think of it like a bill you send to your client at the end of a month, saying "here is how much work we completed and how much you owe us."

**Steps:**
1. Open the Invoices page
2. Click the **"New Invoice"** button (top right)
3. In the **Invoice Number** field, type: **Invoice #001**
4. Select a contract from the **Contract** dropdown (pick any option shown)
5. Set the **Invoice Date** to today's date
6. Click **Save** (or Create)
7. Wait for the page to stop loading

**Expected result:** The new invoice appears in the Owner tab list with the number "Invoice #001" and a status of "Draft". A success message (toast) briefly appears.

---

### 2.2 — Try to create an invoice without selecting a contract
**What this checks:** The form prevents saving when the required Contract field is empty.

**Steps:**
1. Open the Invoices page
2. Click the **"New Invoice"** button
3. Type **Invoice #VALIDATION-TEST** in the Invoice Number field
4. Leave the **Contract** dropdown unselected
5. Click **Save** (or Create)

**Expected result:** An error message appears near the Contract field (e.g. "Contract is required"). The invoice is NOT created. The form stays open.

---

### 2.3 — Create a new billing period
**What this checks:** A billing period can be created from the Billing Periods tab.

> **What is a billing period?** A billing period is a time window (like a month) that groups invoices together. For example, "May 2026" could be one billing period. You usually create one billing period per month.

**Setup:** The project must have a prime contract. If a "No prime contract found" error appears, first create a prime contract for project 767.

**Steps:**
1. Open the Invoices page
2. Click the **"Billing Periods"** tab
3. Click the **"Create Billing Period"** button (top right)
4. In the **Start Date** field, enter **2026-05-01**
5. In the **End Date** field, enter **2026-05-31**
6. In the **Billing Date** field, enter **2026-06-01**
7. Click **Create**
8. Wait for the dialog to close

**Expected result:** A new billing period row appears in the Billing Periods table showing the dates 05/01/2026 – 05/31/2026 and a status of "Draft". No error message appears.

---

## 3. Edit

### 3.1 — Edit an existing invoice
**What this checks:** Users can edit an invoice and the updated value is saved.

**Setup:** There must be at least one existing invoice in the Owner tab list.

**Steps:**
1. Open the Invoices page
2. Click on any existing invoice to open its detail page
3. Click the **Edit** button (or find an editable field)
4. Change the invoice number to **Invoice #001-EDITED**
5. Click **Save**
6. Wait for the page to stop loading

**Expected result:** The detail page now shows the updated invoice number "Invoice #001-EDITED". A success message briefly appears. The old number is no longer shown.

---

### 3.2 — Edits persist after page refresh
**What this checks:** Saved changes are stored in the database, not just shown temporarily in the browser.

**Setup:** Complete scenario 3.1 first (edit an invoice and save it).

**Steps:**
1. After saving an edit, stay on the invoice detail page
2. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the browser
3. Wait for the page to reload

**Expected result:** The updated invoice number "Invoice #001-EDITED" is still shown after the refresh. No data reverted to the original value.

---

## 4. Status / Workflow

### 4.1 — Move an invoice from Draft to Submitted
**What this checks:** A user can submit a draft invoice to move it forward in the workflow.

> **What does submitting mean?** Submitting an invoice means you have officially sent it to your client for review. Before submitting, it is just a draft that only you can see.

**Setup:** There must be at least one invoice with status Draft.

**Steps:**
1. Open the Invoices page
2. Click on any invoice with status **Draft**
3. Find the Status field or a **Submit** button
4. Change the status to **Submitted** (or click Submit)
5. Save and wait for the page to stop loading

**Expected result:** The status badge on the invoice now shows "Submitted". No error message appears.

---

### 4.2 — Approve a submitted invoice
**What this checks:** A submitted invoice can be approved.

> **What does approving mean?** Approving an invoice means the client has agreed to pay it. After approval, the invoice is ready to be paid.

**Setup:** There must be at least one invoice with status Submitted. Complete scenario 4.1 first if needed.

**Steps:**
1. Open the Invoices page
2. Click on any invoice with status **Submitted**
3. Change the status to **Approved** (or click Approve)
4. Save and wait for the page to stop loading

**Expected result:** The status badge on the invoice now shows "Approved". No error message appears.

---

### 4.3 — Mark an approved invoice as Paid
**What this checks:** An approved invoice can be marked as paid, completing the lifecycle.

> **What does Paid mean?** Marking an invoice as Paid means the client has actually sent the money. This is the final step in the invoice lifecycle.

**Setup:** There must be at least one invoice with status Approved. Complete scenario 4.2 first if needed.

**Steps:**
1. Open the Invoices page
2. Click on any invoice with status **Approved**
3. Change the status to **Paid** (or click Mark as Paid)
4. Save and wait for the page to stop loading

**Expected result:** The status badge on the invoice now shows "Paid". The Paid Amount column in the list updates to reflect the payment. No error message appears.

---

## 5. Amounts / Calculations

### 5.1 — Verify gross amount and net amount are visible on the list
**What this checks:** The financial columns are correctly displayed and formatted.

> **Gross vs. Net:** Gross Amount = full amount billed. Net Amount = what the client actually owes after deducting any retention (a small percentage held back until all work is confirmed complete — like a security deposit).

**Setup:** There must be at least one invoice with a Gross Amount greater than $0.

**Steps:**
1. Open the Invoices page (Owner tab)
2. Look at the table columns
3. Find an invoice with a non-zero Gross Amount
4. Compare the **Gross Amount** and **Net Amount** columns for that row

**Expected result:** The Gross Amount and Net Amount columns are visible. The Net Amount is less than or equal to the Gross Amount. Dollar amounts are formatted correctly (e.g. $12,500.00).

---

## 6. Filter / Search

### 6.1 — Search for an invoice by invoice number
**What this checks:** The search box filters the list to matching records.

**Setup:** The Owner Invoices list must have at least two invoices with different numbers.

**Steps:**
1. Open the Invoices page
2. Click the search box (shows a magnifying glass icon or says "Search owner invoices...")
3. Type part of a known invoice number, e.g. **INV** or **Invoice #001**
4. Wait for the list to filter

**Expected result:** The list narrows to show only invoices whose number contains the search text. Invoices with unrelated numbers are hidden. Clearing the search box brings all invoices back.

---

### 6.2 — Filter invoices by status
**What this checks:** The status filter narrows the list to the selected status only.

**Setup:** The Owner Invoices list must have invoices with at least two different statuses.

**Steps:**
1. Open the Invoices page
2. Click the **Filters** button in the toolbar (usually shows a funnel icon)
3. Select **"Draft"** from the Status filter dropdown
4. Wait for the list to update

**Expected result:** The list shows only invoices with a "Draft" status badge. Invoices with other statuses (Submitted, Approved, Paid) are hidden. Removing the filter brings all invoices back.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Schedule of Values (SOV) line items on new invoice form | Multi-column form with complex calculations |
| Retainage / retention percentage editing | Requires prime contract SOV setup |
| Export invoice to PDF | Not confirmed present in current UI |
| Subcontractor invoice creation flow | Flows through Commitments tool |
| ERP sync status | Requires Acumatica integration to be active |
