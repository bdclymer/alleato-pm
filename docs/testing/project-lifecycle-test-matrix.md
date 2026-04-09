# Project Lifecycle End-to-End Test Matrix

**Purpose:** A sequential, narrative end-to-end test that follows how a real construction PM uses Alleato day-to-day. Tests are ordered — data created in earlier phases is referenced in later ones. The tester carries context forward throughout the session.

**Each tester creates their own project** — this prevents data collision between testers.
**Test user:** test1@mail.com
**Base URL:** https://alleato-hub.vercel.app (or http://localhost:3000)

---

## How to run this matrix

1. **Start by creating your own test project** (test 1.1). Note the project ID from the URL.
2. Enter that project ID in the "Project ID" field in the test run form — all "Open in app" links will then auto-navigate to your project.
3. Work through phases in order — do not skip ahead.
4. Each test's `context_note` tells you what prior data to use.
5. At the end of each test, note any IDs or names you created — you will need them in the next phase.
6. If a test fails, note it and continue — most later tests can still run.

---

## Phase 1: Project Setup

**Goal:** Create your own test project, confirm details are correct, and ensure the team/permissions are ready for financial work.

---

### 1.1 — Create a new test project (HIGH)

**start_url:** `/create-project`

**context_note:** Every tester creates their own isolated project so data from different testers does not collide. Name your project using the pattern "Test – [Your Name] – [Today's Date]" so it is easy to identify and clean up later.

**Steps:**
1. Navigate to /create-project
2. In Project Name, type: `Test – [Your Name] – [Today's Date]` (e.g. "Test – Jordan – 2026-04-08")
3. Fill in any other required fields (e.g. Project Number: TEST-001, Status: Active, Start Date: today)
4. Click Save / Create
5. Wait for the page to redirect to your new project dashboard
6. Note the project ID from the URL (e.g. `https://app.alleato.com/123/home` — the ID is `123`)
7. Enter that project ID in the "Project ID" field in the test run form (top of the sidebar)

**Expected result:** A success toast appears. The app redirects to the new project dashboard. The URL contains your new project ID. After entering the ID in the test run form, all "Open in app" links throughout this test suite will open pages in your new project.

---

### 1.2 — Verify project details are saved correctly (HIGH)

**start_url:** `/[projectId]`

**context_note:** Confirm the details you just entered are correct before doing any financial work. The project name and number will appear throughout the lifecycle.

**setup_steps:** Complete test 1.1 and enter your project ID in the run form.

**Steps:**
1. From your new project dashboard, navigate to project Settings or the Project Overview page
2. Verify that the following fields are populated: Project Name, Project Number, Status, Start Date
3. Confirm the project name matches what you typed in test 1.1

**Expected result:** All key project fields display the data you entered. No field is blank or shows a placeholder. The project name is exactly what you typed.

---

### 1.3 — Check directory is ready for later steps (MEDIUM)

**start_url:** `/[projectId]/directory`

**context_note:** Later phases (commitments, prime contracts) require companies and people to be assigned as owners, vendors, and contractors. Confirm the project directory has usable entries — if not, add them now.

**setup_steps:** Complete test 1.2 first.

**Steps:**
1. Navigate to your project's Directory page
2. Check the People tab — confirm at least 1 person is listed (you may need to add yourself)
3. Check the Companies tab — confirm at least 1 company is listed
4. If empty, add a test person and a test company now before continuing

**Expected result:** The directory shows at least 1 person and 1 company. Role labels are visible. The tester can proceed knowing dropdowns in later forms will have options to select.

---

### 1.4 — Verify create permissions on financial tools (HIGH)

**start_url:** `/[projectId]/budget`

**context_note:** Before creating any financial records, confirm you have write access. If Create buttons are missing, stop and fix permissions before proceeding.

**setup_steps:** Complete test 1.3 first.

**Steps:**
1. Navigate to your project's Budget page
2. Look for a "New Line Item" or "Add" button in the toolbar or header
3. Navigate to /[projectId]/prime-contracts and look for a "Create" button
4. Navigate to /[projectId]/change-events and look for a "New Change Event" button

**Expected result:** All three pages show a primary action button. If any are missing, the logged-in user lacks write permission — stop here and fix permissions before continuing the lifecycle.

---

## Phase 2: Budget

**Goal:** Build out the project budget with real cost codes and amounts. These totals become the baseline for all financial tracking in later phases.

---

### 2.1 — Add budget line items for major cost divisions (HIGH)

**start_url:** `/[projectId]/budget`

**context_note:** You are creating the original budget. These line items will be compared against the prime contract SOV in Phase 3 and commitments in Phase 4.

**setup_steps:** The budget page must load without errors. At least 3 cost codes must exist in the system (they are pre-seeded).

**Steps:**
1. Navigate to /[projectId]/budget
2. Click "New Line Item" (or the equivalent add button)
3. Set Cost Code = first available code (e.g. 03-000 Concrete), Description = "Concrete & Foundation", Original Budget = 85000
4. Save the line item
5. Click "New Line Item" again
6. Set Cost Code = second available code (e.g. 16-000 Electrical), Description = "Electrical Systems", Original Budget = 120000
7. Save the line item
8. Click "New Line Item" again
9. Set Cost Code = third available code (e.g. 09-000 Finishes), Description = "Interior Finishes", Original Budget = 65000
10. Save the line item

**Expected result:** Three new rows appear in the budget table. The "Original Budget" total column at the top or bottom of the table updates to reflect the sum ($270,000 for the example values). No error toasts appear. All three line items are visible after the saves.

---

### 2.2 — Verify budget totals update correctly (HIGH)

**start_url:** `/[projectId]/budget`

**context_note:** You are confirming that the summary numbers at the top of the Budget page match the individual line items you just created.

**Steps:**
1. Stay on or return to the /[projectId]/budget page
2. Note the "Original Budget" summary total shown at the top of the page
3. Add up the Original Budget values from the individual line item rows
4. Compare the sum to the displayed total

**Expected result:** The summary total equals the sum of all visible line item rows (allowing for rounding to the nearest dollar). No discrepancy. If you added Concrete ($85,000) + Electrical ($120,000) + Finishes ($65,000), the total should read $270,000.

---

### 2.3 — Edit a budget line item amount (HIGH)

**start_url:** `/[projectId]/budget`

**context_note:** Budgets often need adjustment. You are testing that edits persist correctly.

**Steps:**
1. Click on the "Concrete & Foundation" line item you created in 2.1 to open/edit it
2. Change Original Budget from 85000 to 90000
3. Save the change
4. Press Ctrl+R (or Cmd+R on Mac) to refresh the page

**Expected result:** After refresh, the "Concrete & Foundation" row shows $90,000 (not the old $85,000). The summary total also updates to $275,000. The change persisted through a full page refresh.

---

### 2.4 — Check the budget breakdown / cost code grouping (MEDIUM)

**start_url:** `/[projectId]/budget`

**context_note:** The budget should organize line items by cost division or cost code. This test confirms the groupings are logical.

**Steps:**
1. On the /[projectId]/budget page, scan the table for any grouping headers or sort order
2. If a "Group by" or "View" toggle exists, switch to a grouped view
3. Confirm each of your three line items appears under an appropriate cost code heading

**Expected result:** Line items appear organized — either alphabetically by cost code, numerically by division, or under collapsible group headers. No line items are invisible or hidden behind collapsed groups that cannot be opened.

---

### 2.5 — Record the final budget total (HIGH)

**start_url:** `/[projectId]/budget`

**context_note:** Write down the total Original Budget displayed. You will compare this to the Prime Contract value in Phase 3. For the example values: $275,000.

**Steps:**
1. Open /[projectId]/budget
2. Note the total Original Budget figure from the summary at the top of the page
3. Write it down — you will use this number in test 3.3

**Expected result:** A clear total is visible. Write it down before proceeding to Phase 3.

---

## Phase 3: Prime Contract

**Goal:** Create the prime contract (the legal agreement with the project owner), add Schedule of Values line items that mirror the budget, and verify the contract value.

---

### 3.1 — Create a new prime contract (HIGH)

**start_url:** `/[projectId]/prime-contracts/new`

**context_note:** The prime contract is the master agreement between the owner and the general contractor. This is the contract you will attach change events and invoices to in later phases. Use the details below exactly — later tests reference this contract by name.

**Steps:**
1. Navigate to /[projectId]/prime-contracts
2. Click the "Create" button
3. In Contract #, type: PC-LIFECYCLE-001
4. In Title, type: [Your Project Name] — Prime Contract
5. Set Status to Draft
6. In the Owner/Client dropdown, select any available owner company
7. In the Contractor dropdown, select any available general contractor
8. In Start Date, enter 2026-01-15
9. In Estimated Completion Date, enter 2026-12-15
10. In Default Retainage, type: 10
11. Click Save

**Expected result:** A success toast appears. The app navigates to the detail page for "[Your Project Name] — Prime Contract" (PC-LIFECYCLE-001). The status shows Draft, the retainage shows 10%, and the dates are correct. The contract appears in the list at /[projectId]/prime-contracts.

---

### 3.2 — Add Schedule of Values line items (HIGH)

**start_url:** `/[projectId]/prime-contracts` (then open PC-LIFECYCLE-001)

**context_note:** The SOV breaks the contract price into individual work items. Add three line items that roughly match the budget divisions you created in Phase 2.

**Steps:**
1. Open the detail page for "Vermillion Rise — Prime Contract" (PC-LIFECYCLE-001)
2. Click the "Schedule of Values" tab
3. Click "Add Line Item"
4. Description = "Concrete & Foundation Work", Scheduled Value = 90000
5. Save the line item
6. Click "Add Line Item" again
7. Description = "Electrical Systems", Scheduled Value = 120000
8. Save
9. Click "Add Line Item" again
10. Description = "Interior Finishes", Scheduled Value = 65000
11. Save

**Expected result:** All three SOV line items appear in the Schedule of Values table. Each shows the correct Scheduled Value. The "Original Contract Amount" in the contract summary updates to $275,000 (the sum of all three). No errors appear.

---

### 3.3 — Verify contract value matches budget (HIGH)

**start_url:** `/[projectId]/prime-contracts` (then open PC-LIFECYCLE-001)

**context_note:** Cross-check: the prime contract Original Contract Amount should equal the budget total you noted at the end of Phase 2 ($275,000 in the example).

**Steps:**
1. Open the detail page for PC-LIFECYCLE-001
2. Note the "Original Contract Amount" figure in the contract header or overview
3. Compare it to the budget total you recorded at the end of Phase 2 (test 2.5)

**Expected result:** The Original Contract Amount ($275,000) matches the budget total from Phase 2. If they differ, note the discrepancy but continue with the test. The contract summary clearly displays the total without requiring a page refresh.

---

### 3.4 — Change the contract status to Approved (HIGH)

**start_url:** `/[projectId]/prime-contracts` (then open PC-LIFECYCLE-001)

**context_note:** Moving the contract from Draft to Approved simulates the owner signing the contract. Some later steps (invoicing) may require an Approved contract.

**Steps:**
1. Open the detail page for PC-LIFECYCLE-001
2. Click Edit
3. In the Status dropdown, select "Approved" (or the closest available approved status)
4. Check the "Executed" checkbox
5. Click Save

**Expected result:** The status badge on the detail page updates to "Approved" (or the equivalent). The Executed field shows Yes/checked. A success toast appears. No error messages.

---

### 3.5 — Verify SOV line items persist after refresh (MEDIUM)

**start_url:** `/[projectId]/prime-contracts` (then open PC-LIFECYCLE-001, SOV tab)

**context_note:** Confirm the SOV data actually saved to the database.

**Steps:**
1. Open PC-LIFECYCLE-001 and click the "Schedule of Values" tab
2. Press Ctrl+R (or Cmd+R) to refresh
3. Confirm all three SOV line items are still present

**Expected result:** After refresh, all three SOV line items ("Concrete & Foundation Work", "Electrical Systems", "Interior Finishes") are still visible with their original dollar amounts. Nothing reverted to blank.

---

## Phase 4: Commitments

**Goal:** Create a subcontractor commitment (a contract with a sub), add line items, and verify it rolls up to the budget correctly.

---

### 4.1 — Create a framing subcontractor commitment (HIGH)

**start_url:** `/[projectId]/commitments/new`

**context_note:** A commitment is a contract between the general contractor and a subcontractor or supplier. You are creating a commitment for the framing work. Note the commitment number — you will reference it in Phase 5.

**setup_steps:** At least one subcontractor company must exist in the project directory.

**Steps:**
1. Navigate to /[projectId]/commitments
2. Click "Create" (or "New Commitment")
3. In Contract #, type: SC-FRAME-001
4. In Title, type: Framing Subcontract
5. In the Vendor/Subcontractor dropdown, select any available subcontractor company
6. Set Status to Draft
7. In Start Date, enter 2026-02-01
8. In Completion Date, enter 2026-06-30
9. Click Save

**Expected result:** The commitment "Framing Subcontract" (SC-FRAME-001) is created. The app navigates to its detail page. Status shows Draft. The commitment appears in the list at /[projectId]/commitments.

---

### 4.2 — Add line items to the framing commitment (HIGH)

**start_url:** `/[projectId]/commitments` (then open SC-FRAME-001)

**context_note:** Commitment line items describe exactly what work the subcontractor will perform and for how much. These amounts reduce the budget's "committed" balance.

**Steps:**
1. Open the detail page for SC-FRAME-001 (Framing Subcontract)
2. Go to the Line Items tab (or the main detail form)
3. Click "Add Line Item"
4. Description = "Wall Framing", Amount = 45000, link to a cost code if prompted
5. Save
6. Click "Add Line Item" again
7. Description = "Roof Framing", Amount = 35000
8. Save

**Expected result:** Both line items appear in the commitment. The commitment total (Contract Amount) updates to $80,000. No error toasts. The line items persist after a page refresh.

---

### 4.3 — Verify commitment rolls up to budget (HIGH)

**start_url:** `/[projectId]/budget`

**context_note:** The Budget page should reflect the committed amounts from the framing subcontract. Look for a "Committed Costs" or "Subcontracted" column in the budget table.

**Steps:**
1. Navigate to /[projectId]/budget
2. Find a line item that corresponds to the cost code used in the framing commitment (if cost codes were linked in 4.2)
3. Look for a "Committed Costs" or "Commitments" column in the budget table
4. Compare the committed amount shown against the $80,000 framing subcontract total

**Expected result:** The budget shows at least $80,000 in the Committed Costs column (or an equivalent rollup column). If the commitment used a specific cost code, that code's row reflects the $80,000. If cost codes weren't linked, look for a total committed figure in the budget summary row.

---

### 4.4 — Add a second commitment for electrical (MEDIUM)

**start_url:** `/[projectId]/commitments/new`

**context_note:** Creating a second commitment confirms the list and budget can handle multiple subs. This electrical commitment also sets up a realistic scenario for the change event in Phase 5.

**Steps:**
1. Navigate to /[projectId]/commitments and click "Create"
2. Contract # = SC-ELEC-001, Title = Electrical Subcontract
3. Select a different subcontractor vendor (or the same if only one exists)
4. Set Status to Draft
5. Click Save
6. Add one line item: Description = "Electrical Rough-In", Amount = 95000
7. Save

**Expected result:** SC-ELEC-001 appears in the commitments list alongside SC-FRAME-001. The line item saves correctly. The commitment total shows $95,000.

---

### 4.5 — Change a commitment status to Approved (MEDIUM)

**start_url:** `/[projectId]/commitments` (then open SC-FRAME-001)

**context_note:** Approved commitments are "locked in" costs. Simulates the GC signing the framing sub's contract.

**Steps:**
1. Open SC-FRAME-001 (Framing Subcontract)
2. Click Edit
3. Change Status to Approved (or the closest available status)
4. Click Save

**Expected result:** The status badge updates to Approved. A success toast appears. The status persists after refreshing the page.

---

## Phase 5: Change Events

**Goal:** Create a change event for an owner-requested scope change, attach cost items, and verify it shows up in the pending changes list.

---

### 5.1 — Create a change event for owner-requested electrical work (HIGH)

**start_url:** `/[projectId]/change-events/new`

**context_note:** A Change Event captures a potential change to the project scope before it becomes a formal change order. You are recording an owner's request for additional electrical outlets. Note the change event number — you will use it in Phase 6 to create a PCO.

**Steps:**
1. Navigate to /[projectId]/change-events
2. Click "New Change Event" (or "Create")
3. In Number, type: CE-001 (or accept the auto-generated number)
4. In Title, type: Additional Electrical Outlets — Owner Request
5. In Description, type: Owner has requested 24 additional duplex outlets in the office area per RFI #12
6. Set Status to Open
7. Link to Prime Contract: select "Vermillion Rise — Prime Contract" (PC-LIFECYCLE-001)
8. Click Save

**Expected result:** Change Event CE-001 is created and appears in the change events list. The title "Additional Electrical Outlets — Owner Request" is visible. Status shows Open. The linked prime contract is shown on the detail page.

---

### 5.2 — Attach cost line items to the change event (HIGH)

**start_url:** `/[projectId]/change-events` (then open CE-001)

**context_note:** Cost items quantify the financial impact of the scope change. You are estimating the cost of the additional electrical outlets.

**Steps:**
1. Open the detail page for CE-001 (Additional Electrical Outlets — Owner Request)
2. Navigate to the Cost Items or Line Items section/tab
3. Click "Add Cost Item" (or "Add Line Item")
4. Description = "Additional Duplex Outlets (24 units)", Estimated Cost = 8500
5. Link to the Electrical cost code if prompted
6. Save the cost item
7. Optionally add a second cost item: Description = "Additional Conduit & Wire", Estimated Cost = 3200
8. Save

**Expected result:** The cost item(s) appear on the change event detail page. The Total Estimated Cost shown on CE-001 reflects the sum ($11,700 if both items were added). The change event status remains Open.

---

### 5.3 — Verify change event shows in the list with correct status (HIGH)

**start_url:** `/[projectId]/change-events`

**context_note:** Confirm the change event is visible to anyone checking the list — not hidden or filtered out.

**Steps:**
1. Navigate to /[projectId]/change-events
2. Scan the list for CE-001 "Additional Electrical Outlets — Owner Request"
3. Confirm the Status column shows "Open"
4. Confirm the Total Cost or Estimated Cost column shows approximately $11,700

**Expected result:** CE-001 is visible in the list. Status column shows Open. The estimated cost is displayed in the appropriate column. No filtering is hiding the record.

---

### 5.4 — Edit the change event description (MEDIUM)

**start_url:** `/[projectId]/change-events` (then open CE-001)

**context_note:** Testing that edits to a change event save correctly.

**Steps:**
1. Open CE-001
2. Click Edit
3. Append to the Description: " — Approved verbally by John Smith on 2026-02-15"
4. Click Save

**Expected result:** The updated description is shown on the detail page. A success toast appears. Refreshing the page confirms the appended text is still there.

---

### 5.5 — Check pending changes summary (HIGH)

**start_url:** `/[projectId]/change-events`

**context_note:** The system should aggregate open change events into a "pending changes" total. This total shows the financial exposure from unapproved scope changes.

**Steps:**
1. Stay on or return to /[projectId]/change-events
2. Look for a summary row, footer, or header card that shows Total Pending Changes or Total Open
3. Note whether CE-001's cost ($11,700) is included in that figure

**Expected result:** A summary total is visible somewhere on the page (header card, table footer, or sidebar). The amount includes CE-001's estimated cost. If the project has other open change events, the total is their combined sum.

---

## Phase 6: Change Orders

**Goal:** Generate a PCO (potential change order) from the change event, mark it approved, and verify the budget impact is reflected.

---

### 6.1 — Generate a PCO from the change event (HIGH)

**start_url:** `/[projectId]/change-orders`

**context_note:** A PCO (Potential Change Order) is the formal document sent to the owner to request approval for a scope change. You are promoting CE-001 into a PCO. Note the PCO number — you will track it through approval.

**Steps:**
1. Navigate to /[projectId]/change-orders
2. Click "Create" or "New Change Order" (or "Generate PCO")
3. In Number, type: PCO-001
4. In Title, type: PCO — Additional Electrical Outlets
5. Link to Change Event: select CE-001 (Additional Electrical Outlets — Owner Request)
6. Link to Prime Contract: select PC-LIFECYCLE-001
7. Set Amount to 11700
8. Set Status to Draft (or Pending)
9. Click Save

**Expected result:** PCO-001 appears in the change orders list. It is linked to CE-001. The amount shows $11,700. Status is Draft/Pending.

---

### 6.2 — Review and approve the PCO (HIGH)

**start_url:** `/[projectId]/change-orders` (then open PCO-001)

**context_note:** Approving the PCO means the owner has agreed to pay for the additional electrical work. After approval, the budget should be updated.

**Steps:**
1. Open the detail page for PCO-001
2. Click Edit
3. Change Status to Approved
4. Click Save
5. Note the approved amount ($11,700)

**Expected result:** The status badge on PCO-001 updates to Approved. A success toast appears. The approved amount ($11,700) is clearly displayed. The status persists after a page refresh.

---

### 6.3 — Verify the budget reflects the approved change order (HIGH)

**start_url:** `/[projectId]/budget`

**context_note:** An approved change order should increase the Revised Contract Amount and show up in the budget's "Approved Changes" column. Compare the budget before and after.

**Steps:**
1. Navigate to /[projectId]/budget
2. Look for an "Approved Changes" or "Owner Change Orders" or "Revised Budget" column
3. Find the electrical cost code row and note whether $11,700 appears
4. Look at the overall budget summary — the Revised Budget total should be $275,000 + $11,700 = $286,700

**Expected result:** The budget shows the $11,700 approved change in the appropriate column. The Revised Budget total reflects the original $275,000 plus the $11,700 change order = $286,700. The Original Budget column still shows $275,000 (unchanged).

---

### 6.4 — Verify the prime contract Revised Amount updated (HIGH)

**start_url:** `/[projectId]/prime-contracts` (then open PC-LIFECYCLE-001)

**context_note:** Approving a change order against a prime contract should increase the contract's "Revised Contract Amount" to reflect the new total obligation.

**Steps:**
1. Open the detail page for PC-LIFECYCLE-001 (Vermillion Rise — Prime Contract)
2. Look at the "Revised Contract Amount" or "Adjusted Contract Amount" in the contract summary
3. Compare it to the Original Contract Amount ($275,000) — it should now be $286,700

**Expected result:** The Revised Contract Amount shows $286,700 ($275,000 original + $11,700 approved PCO). The Original Contract Amount still shows $275,000. The Change Orders tab on this contract shows PCO-001 with amount $11,700 and status Approved.

---

### 6.5 — Check change event CE-001 links back to PCO-001 (MEDIUM)

**start_url:** `/[projectId]/change-events` (then open CE-001)

**context_note:** Traceability check — navigating from a change event to its resulting change order should work in both directions.

**Steps:**
1. Open CE-001 (Additional Electrical Outlets — Owner Request)
2. Look for a linked Change Orders section on the detail page
3. Confirm PCO-001 is listed as a linked change order
4. Click on PCO-001 to navigate to its detail page

**Expected result:** CE-001 shows PCO-001 in its linked change orders section. Clicking PCO-001 navigates to its detail page without a 404 error.

---

## Phase 7: Invoicing

**Goal:** Create a pay application (invoice) against the prime contract, add line items with percent complete, and verify the invoice totals are correct.

---

### 7.1 — Create a pay application against the prime contract (HIGH)

**start_url:** `/[projectId]/invoices/new` or `/[projectId]/pay-applications/new`

**context_note:** A Pay Application (Pay App) is the invoice the general contractor submits to the project owner at the end of each billing period. It lists all SOV items and shows how much work has been completed since the last pay app. You are creating Pay App #1.

**setup_steps:** PC-LIFECYCLE-001 must be in Approved status (completed in Phase 3, test 3.4).

**Steps:**
1. Navigate to /[projectId]/invoices (or /[projectId]/pay-applications)
2. Click "Create" (or "New Invoice" / "New Pay Application")
3. In Application Number, type: PA-001 (or accept the auto-generated number)
4. Link to Prime Contract: select PC-LIFECYCLE-001 (Vermillion Rise — Prime Contract)
5. Set Period From: 2026-01-15
6. Set Period To: 2026-02-28
7. Click Save (or continue to the line items screen)

**Expected result:** Pay Application PA-001 is created and linked to PC-LIFECYCLE-001. The app navigates to the pay app detail page or a form to enter line items. No error messages appear.

---

### 7.2 — Add line items with percent complete (HIGH)

**start_url:** `/[projectId]/invoices` (then open PA-001)

**context_note:** You are marking how much of each SOV line item has been completed in this billing period. The three SOV items were created in Phase 3: Concrete & Foundation ($90,000), Electrical Systems ($120,000), Interior Finishes ($65,000).

**Steps:**
1. Open the detail page for PA-001
2. Find the Schedule of Values / Line Items section
3. For the "Concrete & Foundation Work" line item, set % Complete to 100
4. For the "Electrical Systems" line item, set % Complete to 40
5. For the "Interior Finishes" line item, set % Complete to 0
6. Click Save (or "Calculate")

**Expected result:** The system calculates the billing amounts:
- Concrete & Foundation: 100% of $90,000 = $90,000
- Electrical Systems: 40% of $120,000 = $48,000
- Interior Finishes: 0% of $65,000 = $0
- Gross Amount This Period: $138,000
- Less Retainage (10%): -$13,800
- Net Amount Due: $124,200

All calculated totals appear on the pay application. No errors.

---

### 7.3 — Verify invoice totals (HIGH)

**start_url:** `/[projectId]/invoices` (then open PA-001)

**context_note:** Cross-check the arithmetic. The totals on the pay app must match the individual line item percentages applied to the SOV scheduled values.

**Steps:**
1. Open PA-001
2. Review the following summary figures:
   - Scheduled Value Total: should be $275,000 (or $286,700 if the change order SOV was added)
   - Work Completed This Period: should be $138,000
   - Retainage Withheld: should be $13,800 (10% of $138,000)
   - Net Payment Due: should be $124,200
3. Verify each figure matches the line item calculations from test 7.2

**Expected result:** All summary totals match the expected calculated values within $1 (rounding). The pay application clearly displays a "Net Amount Due" or equivalent total. No columns are blank or showing $0 when they should have values.

---

### 7.4 — Change pay application status to Submitted (HIGH)

**start_url:** `/[projectId]/invoices` (then open PA-001)

**context_note:** "Submitted" means the GC has sent the pay app to the owner for review. This is a key workflow milestone.

**Steps:**
1. Open PA-001
2. Click Edit (or look for a "Submit" action button)
3. Change the status to Submitted
4. Click Save

**Expected result:** The status badge on PA-001 updates to Submitted. The status persists after a page refresh. If there is a "Submitted Date" field, it should be populated with today's date.

---

### 7.5 — Verify the pay application appears on the prime contract's Invoices tab (HIGH)

**start_url:** `/[projectId]/prime-contracts` (then open PC-LIFECYCLE-001, Invoices tab)

**context_note:** Traceability check — the pay application you created against PC-LIFECYCLE-001 should be visible under that contract's Invoices tab.

**Steps:**
1. Open the detail page for PC-LIFECYCLE-001 (Vermillion Rise — Prime Contract)
2. Click the "Invoices" tab
3. Look for PA-001 in the list

**Expected result:** PA-001 appears in the Invoices tab with the correct amount ($124,200 net or $138,000 gross) and status "Submitted". Clicking on PA-001 navigates to the pay application detail page. No 404 or blank screen.

---

## Summary Checklist

| Phase | Tests | Critical Path Tests |
|-------|-------|-------------------|
| 1. Project Setup | 1.1 – 1.4 | 1.1, 1.2, 1.4 |
| 2. Budget | 2.1 – 2.5 | 2.1, 2.2, 2.3 |
| 3. Prime Contract | 3.1 – 3.5 | 3.1, 3.2, 3.3, 3.4 |
| 4. Commitments | 4.1 – 4.5 | 4.1, 4.2, 4.3 |
| 5. Change Events | 5.1 – 5.5 | 5.1, 5.2, 5.3, 5.5 |
| 6. Change Orders | 6.1 – 6.5 | 6.1, 6.2, 6.3, 6.4 |
| 7. Invoicing | 7.1 – 7.5 | 7.1, 7.2, 7.3, 7.5 |

**Total test cases: 35**
**HIGH priority: 26**
**MEDIUM priority: 9**

---

## Data lineage map

```
Phase 2 — Budget line items
  → Phase 3: SOV line items mirror budget divisions
    → Phase 6: Revised Budget reflects approved change orders
      → Phase 7: SOV is the basis for pay app billing amounts

Phase 3 — Prime Contract PC-LIFECYCLE-001
  → Phase 5: Change Events linked to this contract
    → Phase 6: PCO-001 generated from CE-001, linked to PC-LIFECYCLE-001
      → Phase 7: Pay Application PA-001 billed against PC-LIFECYCLE-001

Phase 5 — Change Event CE-001
  → Phase 6: PCO-001 created from CE-001
    → CE-001 should show PCO-001 as a linked change order (traceability)

Phase 4 — Commitments
  → Phase 3: Budget "Committed Costs" reflects commitment amounts
  → Phase 5: Additional electrical outlets change event references the electrical sub's scope
```
