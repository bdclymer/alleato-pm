# Active Test Scenarios (Consolidated)

This file is generated from all scenario source files in `docs/testing/*-scenarios.md`.

## All Test Cases

### Budget
- 1.1 — Open the Budget page
- 1.2 — Budget summary totals match the line items
- 2.1 — Create a new budget line item
- 2.2 — Required fields block save
- 3.1 — Edit a budget line item and verify it persists
- 3.2 — Cancel an edit discards changes
- 4.1 — Delete a budget line item
- 5.1 — Edit the forecast-to-complete value on a line item
- 6.1 — Search filters the budget table
- 7.1 — Export the budget to a file

### Prime Contracts
- 1.1 — Open the Prime Contracts list page
- 1.2 — Open a prime contract detail page
- 1.3 — Return to the list from a detail page
- 1.4 — Switch between tabs on the detail page
- 2.1 — Create a new prime contract with required fields
- 2.2 — Create a contract with all major fields filled in
- 2.3 — Try to create a contract without a title
- 3.1 — Edit the title of an existing contract
- 3.2 — Saved edits persist after refreshing the page
- 3.3 — Cancelling the edit form discards unsaved changes
- 4.1 — Delete a prime contract
- 5.1 — Move a contract from Draft to Out to Bid
- 5.2 — Mark a contract as Executed
- 6.1 — Open the Schedule of Values tab
- 6.2 — Add a line item to the Schedule of Values
- 6.3 — Adding multiple SOV line items updates the contract total
- 7.1 — Open the Change Orders tab on a contract
- 8.1 — Open the Invoices tab on a contract
- 8.2 — Open the Payments tab on a contract
- 9.1 — Search for a contract by title keyword
- 9.2 — Filter contracts by status
- 9.3 — Filter contracts by executed status
- 10.1 — Export the contracts list to a CSV file
- 11.1 — Expand a contract row to reveal its Prime Contract Change Orders
- 12.1 — Select multiple contract rows using checkboxes
- 12.2 — Delete multiple contracts at once using bulk select
- 13.1 — Change orders listed under a contract link to the correct detail page

### Commitments
- 1.1 — Open the Commitments page
- 1.2 — Switch to the Subcontracts tab
- 1.3 — Switch to the Purchase Orders tab
- 1.4 — Open the Recycle Bin tab
- 2.1 — Create a new Subcontract
- 2.2 — Create a Subcontract with all optional fields filled in
- 2.3 — Subcontract form blocks submission when Title is missing
- 2.4 — Cancel subcontract creation returns to list
- 3.1 — Create a new Purchase Order
- 3.2 — Purchase Order form blocks submission when Title is missing
- 4.1 — Edit a commitment to change the title
- 4.2 — Edit a commitment to change the status
- 4.3 — Cancel editing does not save changes
- 4.4 — Edit the retention percentage
- 5.1 — Delete a single commitment using the row action menu
- 5.2 — Cancel delete keeps the commitment
- 5.3 — Bulk delete multiple commitments
- 6.1 — Add a line item to the Schedule of Values
- 6.2 — Edit an existing SOV line item
- 6.3 — Delete a SOV line item
- 7.1 — Subcontractor SOV tab only appears on Subcontracts
- 7.2 — Submit a Subcontractor SOV
- 8.1 — View Change Orders linked to a commitment
- 8.2 — Create a Change Event from a commitment
- 9.1 — View Invoices tab on a commitment
- 9.2 — Create an invoice from a commitment
- 10.1 — View Payments Issued tab on a commitment
- 11.1 — KPI strip shows 5 financial summary blocks
- 11.2 — Revised Contract equals Original plus Approved COs
- 12.1 — Search for a commitment by contract number
- 12.2 — Filter by commitment status
- 12.3 — Sort list by Original Contract Amount
- 13.1 — Export the commitments list
- 14.1 — Sync commitments from Acumatica
- 15.1 — Email a commitment document to someone
- 16.1 — Attachments tab shows uploaded files
- 17.1 — Change History tab records field changes
- 18.1 — Mark a commitment as Private
- 19.1 — Configure page loads for the Commitments tool
- 20.1 — Hide a column from the commitments table

### Direct Costs
- 1.1 — Open the Direct Costs page
- 1.2 — Switch between Summary and Cost Code views
- 1.3 — Open a direct cost detail page
- 2.1 — Create a new direct cost with required fields
- 2.2 — Create with every field filled in
- 2.3 — Submitting without required fields shows an error
- 2.4 — Canceling create does not save anything
- 2.5 — Create a direct cost with a cost line item
- 3.1 — Edit the description and amount
- 3.2 — Saved changes persist after refresh
- 3.3 — Canceling edit discards all changes
- 3.4 — Change the status from Draft to Approved
- 4.1 — Delete a direct cost record
- 4.2 — Canceling delete leaves the record unchanged
- 4.3 — Delete from the detail page
- 5.1 — Status badges show the correct color
- 5.2 — Approve multiple records at once
- 6.1 — Line items add up to the record total
- 6.2 — Line item total = quantity × unit cost
- 6.3 — Footer row shows sum of all visible amounts
- 7.1 — Search for a direct cost by description
- 7.2 — Filter the list to show only Approved records
- 7.3 — Filter to show only a specific cost type
- 7.4 — Clearing filters restores the full list
- 8.1 — Export the direct costs list as a spreadsheet
- 8.2 — Export only filtered results
- 9.1 — Assign a budget code to a line item
- 9.2 — Cost Code view groups direct costs by budget division
- 10.1 — Empty state message appears when no records match
- 10.2 — Hide and show table columns
- 10.3 — ERP sync status column shows the accounting integration state

### Change Events
- 1.1 — Open the Change Events page
- 1.2 — Open a change event detail page
- 2.1 — Create a new change event
- 2.2 — Try to create a change event without a title
- 2.3 — Create a change event with all dropdowns filled
- 3.1 — Edit the title of an existing change event
- 3.2 — Changes persist after refresh
- 3.3 — Cancel discards changes
- 4.1 — Delete a change event
- 5.1 — Submit a change event for approval
- 5.2 — Approve a change event
- 6.1 — Add a line item to a change event
- 7.1 — Upload a file attachment
- 8.1 — View change history
- 9.1 — Search for a change event by title

### Change Orders
- 1.1 — Open the Change Orders page
- 1.2 — Switch between Prime Contract and Commitments tabs
- 1.3 — Open a prime contract change order detail page
- 2.1 — Create a new prime contract change order
- 2.2 — Create fails when PCCO Number or Title is missing
- 2.3 — Create a new commitment change order
- 3.1 — Edit the title and amount of an existing prime contract change order
- 3.2 — Saved edits persist after page refresh
- 4.1 — Delete a prime contract change order
- 5.1 — Approve a proposed prime contract change order
- 5.2 — Reject a proposed prime contract change order
- 6.1 — Search prime contract change orders by title
- 6.2 — Filter prime contract change orders by status

### Invoicing
- 1.1 — Open the Invoices page
- 1.2 — Switch between Owner, Subcontractor, and Billing Periods tabs
- 1.3 — Open an invoice detail page
- 2.1 — Create a new owner invoice
- 2.2 — Try to create an invoice without selecting a contract
- 2.3 — Create a new billing period
- 3.1 — Edit an existing invoice
- 3.2 — Edits persist after page refresh
- 4.1 — Move an invoice from Draft to Submitted
- 4.2 — Approve a submitted invoice
- 4.3 — Mark an approved invoice as Paid
- 5.1 — Verify gross amount and net amount are visible on the list
- 6.1 — Search for an invoice by invoice number
- 6.2 — Filter invoices by status

### Directory
- 1.1 — Open the Directory page
- 1.2 — Open a person detail page
- 2.1 — Add a new person to the directory
- 2.2 — Try to add a person without a first name
- 2.3 — Add a person and assign them to a company
- 3.1 — Add a new company to the directory
- 3.2 — Try to add a company without a name
- 4.1 — Edit a person's phone number
- 4.2 — Edited changes persist after page refresh
- 4.3 — Cancel discards unsaved changes
- 5.1 — Delete a person from the directory
- 6.1 — Search for a person by name
- 6.2 — Search for contacts by company name
- 7.1 — Filter directory by role or permission level

### Schedule
- 1.1 — Open the Schedule page
- 1.2 — Switch between all five view modes
- 2.1 — Create a new task with a name and dates
- 2.2 — Try to create a task without a name
- 2.3 — Create a milestone
- 3.1 — Change a task start and finish date
- 3.2 — Rename an existing task
- 3.3 — Change a task status to In Progress
- 4.1 — Delete a task and confirm it is removed
- 4.2 — Select multiple tasks and delete them all at once
- 5.1 — Create a sub-task under a parent task
- 6.1 — Search for a task by its name
- 6.2 — Filter the task list to show only In Progress tasks

### Documents
- 1.1 — Open the Documents page
- 1.2 — Switch between table, card, and list views
- 1.3 — Click a document row to open the file
- 2.1 — Upload a small PDF file to the project
- 2.2 — Try to upload without entering a title
- 2.3 — Try to save without selecting a file
- 3.1 — Upload a document and assign it to Test Folder
- 3.2 — Use the folder filter to narrow the list
- 4.1 — Search for a document by part of its title
- 4.2 — Filter the list to show only Draft documents
- 5.1 — Delete a single document
- 5.2 — Select multiple documents and delete them all at once
- 6.1 — Export the document list as a spreadsheet file
- 7.1 — Use the column selector to hide the Category column
- 8.1 — Verify the page shows a helpful message when search returns nothing

### Drawings
- 1.1 — Upload 3 starter drawing files
- 1.2 — Open a drawing in the viewer
- 1.3 — Switch between tabs (Current Drawings, Drawing Sets, Recycle Bin)
- 2.1 — Try to upload a drawing without a file attached
- 2.2 — Try to upload a drawing without a Drawing Number
- 3.1 — Filter drawings by discipline
- 3.2 — Search for a drawing by number
- 3.3 — Filter drawings by status
- 4.1 — Zoom in and out on a drawing
- 4.2 — Download a drawing from the viewer
- 5.1 — View the revision history of a drawing
- 5.2 — Upload a new revision of an existing drawing
- 6.1 — Delete a drawing

### Photos
- 1.1 — Open the Photos page
- 1.2 — Switch between tabs
- 1.3 — View the empty state when no photos exist
- 1.4 — View the photo grid with thumbnails
- 1.5 — Open a photo in the lightbox
- 1.6 — Close the photo lightbox
- 1.7 — Use the mobile upload button
- 2.1 — Upload a single photo using the Upload Photo button
- 2.2 — Upload multiple photos at once
- 2.3 — Upload photos by dragging and dropping files directly onto the page
- 2.4 — Upload photos by dragging into the upload dialog drop zone
- 2.5 — Choose a specific album when uploading a photo
- 2.6 — Remove a file from the upload queue before uploading
- 2.7 — Cancel the upload dialog without uploading anything
- 2.8 — Try to upload a non-image file (e.g. a PDF or Word document)
- 2.9 — Try to upload a file larger than 20 MB
- 2.10 — Confirm the photo title is automatically set from the filename after upload
- 3.1 — Search for a photo by its title
- 3.2 — Clear the search filter to show all photos again
- 3.3 — Filter the photo grid to show only photos from a specific album
- 3.4 — Reset album filter back to All Albums
- 3.5 — Use search and album filter at the same time
- 3.6 — See the empty state when search finds no matching photos
- 4.1 — Add or edit the description on a photo
- 4.2 — Change the title of an existing photo
- 4.3 — Assign a location label to a photo
- 4.4 — Assign a trade category to a photo
- 4.5 — Move a photo to a different album by editing it
- 4.6 — Add keyword tags to a photo
- 4.7 — Set or change the "date taken" field on a photo
- 5.1 — Mark a photo as starred by clicking the star icon on the thumbnail
- 5.2 — Remove the star from a previously starred photo
- 5.3 — Star a photo using the Star button inside the lightbox
- 5.4 — Filter the grid to show only starred photos
- 6.1 — Delete a photo using the Delete button inside the lightbox
- 6.2 — Confirm that a deleted photo appears in the Recycle Bin tab
- 6.3 — Restore a deleted photo back to the main photo library
- 6.4 — Permanently remove a photo from the Recycle Bin
- 6.5 — Verify the Recycle Bin shows a retention policy message
- 7.1 — Open the Albums tab and see album groupings
- 7.2 — Create a new custom album
- 7.3 — Delete an album
- 7.4 — Change the display order of albums by dragging them
- 7.5 — Set a specific photo as the cover image for an album
- 8.1 — Download one photo to your computer
- 8.2 — Select multiple photos and download them all at once
- 8.3 — Export one or more photos as a PDF document
- 9.1 — Email one or more photos to someone from within the Photos tool
- 9.2 — Add photos to the project by emailing them to the project's unique email address
- 10.1 — Leave a comment on a photo
- 10.2 — Tag a team member in a photo comment using @mention
- 10.3 — Open a photo and see existing comments
- 11.1 — Set a photo to private
- 11.2 — Make a private photo visible to all project members again
- 12.1 — Move an existing photo from one album to another
- 12.2 — Select multiple photos and move them all to a new album in one action
- 13.1 — Rotate a photo to correct its orientation
- 14.1 — Select multiple photos and change their album all at once
- 14.2 — Assign a location to multiple photos at once
- 14.3 — Assign a trade to multiple photos at once
- 14.4 — Select multiple photos and delete them all at once
- 14.5 — Use a "Select All" action to select every photo on the page
- 15.1 — Subscribe to receive notifications when new photos are added
- 15.2 — Turn off notifications for the Photos tool
- 16.1 — View geotagged photos plotted on the project map
- 16.2 — Assign a map location to a photo so it appears as a pin
- 17.1 — Browse photos by date in the Timeline tab
- 18.1 — Access the advanced configuration settings for the Photos tool
- 18.2 — Designate one photo as the project's main cover photo
- 19.1 — Verify that a user with read-only access cannot upload photos
- 19.2 — Verify that a read-only user cannot delete photos
- 19.3 — Check that a user can see photos they marked as private
- 19.4 — Confirm that a photo marked as private does not appear for other users
- 20.1 — Photo added in Daily Log appears in Photos
- 20.2 — Photos added from Inspections appear in Photos
- 20.3 — Photos added from Observations appear in Photos
- 20.4 — Photos added from Punch List appear in Photos
- 20.5 — Link a photo to a specific spot on a project drawing
- 21.1 — Upload a photo with the same filename as an existing photo
- 21.2 — Upload a photo and set an extremely long title
- 21.3 — Confirm that photos are still visible after refreshing the browser
- 21.4 — Confirm that edited photo metadata survives a page refresh
- 21.5 — Try to submit the upload dialog without selecting any files
- 21.6 — Close the lightbox using the keyboard (Escape key)
- 21.7 — Verify the Photos page looks correct on a mobile-sized screen

### Daily Log
- 1.1 — Open the Daily Log page
- 1.2 — Open a daily log detail page
- 2.1 — Create a new log entry for today
- 2.2 — Try to create a log entry without a date
- 2.3 — Create a log entry with notes
- 3.1 — Edit the weather on an existing log entry
- 3.2 — Edited changes persist after page refresh
- 4.1 — Add a manpower entry (worker count) to a log
- 4.2 — Try to add manpower without a worker count
- 5.1 — Add equipment used on site
- 6.1 — Add a work note to a log entry
- 7.1 — Delete a daily log entry
- 8.1 — Search for a log entry by date
- 8.2 — Sort log entries by date (oldest first)

### Meetings
- 1.1 — Open the Meetings page
- 1.2 — Open a meeting detail page
- 2.1 — Create a new meeting with required fields only
- 2.2 — Create a meeting with all fields filled in
- 2.3 — Try to create a meeting without a title
- 3.1 — Edit the title of a meeting directly in the table
- 3.2 — Edit the date of a meeting directly in the table
- 3.3 — Pressing Escape cancels an inline edit
- 4.1 — Delete a meeting using the row action menu
- 5.1 — Search for a meeting by its title
- 5.2 — Filter meetings to a specific year
- 5.3 — Filter meetings by category
- 6.1 — Toggle column visibility using the column selector
- 7.1 — Download the meetings list as a spreadsheet
- 8.1 — Meeting detail page shows action items extracted from the transcript
- 8.2 — Meeting detail page shows key decisions from the transcript
- 8.3 — Detail page shows links to other recent meetings for the same project
- 9.1 — Meetings page shows a helpful message when no meetings exist

### RFIs
- 1.1 — Open the RFIs page
- 1.2 — Open an RFI detail page
- 2.1 — Create a new RFI with required fields only
- 2.2 — Try to create an RFI without a subject
- 2.3 — Create an RFI with all optional fields filled
- 2.4 — Verify RFI number auto-increments
- 3.1 — Edit the subject of an existing RFI
- 3.2 — Edits persist after page refresh
- 3.3 — Cancel discards changes
- 4.1 — Open an RFI (move from Draft to Open)
- 4.2 — Close an open RFI
- 4.3 — Reopen a closed RFI
- 5.1 — Set a due date on an RFI
- 6.1 — Search for an RFI by subject
- 6.2 — Filter RFIs by status
- 7.1 — Delete an RFI
- 8.1 — Set schedule impact and cost impact on an RFI
- 9.1 — Mark an RFI as private
- 10.1 — Switch between table, card, and list views

### Submittals
- 1.1 — Open the Submittals page
- 1.2 — Open a submittal detail page
- 1.3 — View the Ball In Court tab
- 2.1 — Create a new submittal with required fields
- 2.2 — Create fails when Title is empty
- 2.3 — Create fails when Number is empty
- 2.4 — Create fails when submittal number already exists
- 2.5 — Create a submittal with all optional fields filled
- 3.1 — Edit the title of an existing submittal
- 3.2 — Edits persist after page refresh
- 3.3 — Cancel discards unsaved edits
- 4.1 — Change status from Draft to Open
- 4.2 — Change status to Distributed
- 4.3 — Close a submittal
- 5.1 — Upload a file attachment
- 6.1 — View submittal change history
- 7.1 — Search for a submittal by title
- 7.2 — Filter submittals by status
- 8.1 — Delete a submittal (moves to Recycle Bin)
- 8.2 — View deleted submittals in the Recycle Bin
- 9.1 — Mark a submittal as Private

### Punch List
- 1.1 — Open the Punch List page
- 1.2 — Switch between Items and Recycle Bin tabs
- 2.1 — Create a new punch item with required fields only
- 2.2 — Create a punch item with every field filled in
- 2.3 — Submitting without a title shows an error
- 2.4 — Canceling the create form does not save anything
- 3.1 — Edit an existing punch item and verify changes are saved
- 3.2 — Edit form shows the previously saved values
- 3.3 — Canceling the edit form discards all changes
- 4.1 — Change a punch item status to Closed
- 5.1 — Delete a punch item and verify it moves to the Recycle Bin
- 5.2 — Restore a punch item from the Recycle Bin
- 6.1 — Search for a punch item by part of its title
- 6.2 — Filter the list to show only Work Required items
- 6.3 — Filter the list to show only High priority items
- 7.1 — Hide a column then show it again
- 8.1 — Download the punch list as a CSV file
- 8.2 — Download the punch list as a PDF file
- 9.1 — Switch between the three display styles

## Test Case Details

### Budget
Source: `docs/testing/budget-scenarios.md`

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

### Prime Contracts
Source: `docs/testing/prime-contracts-scenarios.md`

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

### Commitments
Source: `docs/testing/commitments-scenarios.md`

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

### Direct Costs
Source: `docs/testing/direct-costs-scenarios.md`

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

### Change Events
Source: `docs/testing/change-events-scenarios.md`

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

### Change Orders
Source: `docs/testing/change-orders-scenarios.md`

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

### Invoicing
Source: `docs/testing/invoices-scenarios.md`

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

### Directory
Source: `docs/testing/directory-scenarios.md`

### 1.1 — Open the Directory page
**What this checks:** The Directory list page loads without errors and shows existing contacts.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Go to http://localhost:3000/767/directory
3. Wait for the page to finish loading

**Expected result:** The Directory page loads without errors. A list of people (names, companies, roles) is visible. No blank screen or error message appears.

---

### 1.2 — Open a person detail page
**What this checks:** Clicking a person's name opens their full detail view.

**Setup:** The Directory list must have at least one person.

**Steps:**
1. Open the Directory page
2. Click on any person's name in the list
3. Wait for the page to finish loading

**Expected result:** A detail view opens for that person. Their name, email, phone, company, and role are visible. No error messages appear.

---

## 2. Add Person

### 2.1 — Add a new person to the directory
**What this checks:** A user can create a new person and they appear in the list.

**Steps:**
1. Open the Directory page
2. Click the **Add Person** button (top right)
3. In the **First Name** field, type: **John**
4. In the **Last Name** field, type: **Smith**
5. In the **Email** field, type: **jsmith@testco.com**
6. In the **Job Title** field, type: **Project Manager**
7. Click **Save** (or Create)
8. Wait for the page to stop loading

**Expected result:** John Smith appears in the directory list. His email and job title are visible. A success message (toast) briefly appears.

---

### 2.2 — Try to add a person without a first name
**What this checks:** The form prevents saving when the required First Name field is empty.

**Steps:**
1. Open the Directory page
2. Click the **Add Person** button
3. Leave the **First Name** field empty
4. Fill in Last Name: **Smith**
5. Fill in Email: **noname@test.com**
6. Click **Save**

**Expected result:** An error message appears near the First Name field (e.g. "First name is required"). The record is NOT created. The form stays open.

---

### 2.3 — Add a person and assign them to a company
**What this checks:** A new person can be linked to an existing company and the association saves correctly.

**Setup:** ABC Concrete Co must already exist in the companies list.

**Steps:**
1. Open the Directory page
2. Click the **Add Person** button
3. Type **First Name**: **Maria**
4. Type **Last Name**: **Torres**
5. In the **Company** field, select or type **ABC Concrete Co**
6. In the **Job Title** field, type: **Site Supervisor**
7. Click **Save**
8. Find "Maria Torres" in the list and click her name

**Expected result:** Maria Torres appears in the directory. Her company shows "ABC Concrete Co" and job title shows "Site Supervisor". No error appears.

---

## 3. Add Company

### 3.1 — Add a new company to the directory
**What this checks:** A new company record can be created and appears in the companies list.

**Steps:**
1. Open the Directory page
2. Click the **Companies** tab (or navigate to the Companies section)
3. Click the **Add Company** button
4. In the **Company Name** field, type: **Steel Frame Solutions**
5. In the **Trade** (or Type) field, select **Structural Steel** (or the closest option)
6. Click **Save**
7. Wait for the page to stop loading

**Expected result:** Steel Frame Solutions appears in the companies list. No error messages appear.

---

### 3.2 — Try to add a company without a name
**What this checks:** The form prevents saving when the required Company Name field is empty.

**Steps:**
1. Open the Companies section of the Directory
2. Click **Add Company**
3. Leave the **Company Name** field empty
4. Click **Save**

**Expected result:** An error message appears near the Company Name field. The record is NOT created. The form stays open.

---

## 4. Edit

### 4.1 — Edit a person's phone number
**What this checks:** Users can edit a contact's details and the updated value is saved.

**Setup:** At least one person must exist in the directory.

**Steps:**
1. Open the Directory page
2. Click on any person's name to open their detail view
3. Click the **Edit** button
4. In the **Phone** field, clear any existing value and type: **555-867-5309**
5. Click **Save**
6. Wait for the page to stop loading

**Expected result:** The detail view now shows the phone number 555-867-5309. A success toast briefly appears.

---

### 4.2 — Edited changes persist after page refresh
**What this checks:** Saved changes are stored in the database, not just shown temporarily in the browser.

**Setup:** Complete scenario 4.1 first (edit a phone number and save).

**Steps:**
1. After saving the edit in scenario 4.1, stay on the detail page
2. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page
3. Wait for the page to reload

**Expected result:** The phone number 555-867-5309 is still shown after the refresh. No data reverted to the old value.

---

### 4.3 — Cancel discards unsaved changes
**What this checks:** Unsaved edits are discarded when the user cancels the form.

**Setup:** At least one person must exist in the directory.

**Steps:**
1. Open any person's detail view
2. Click the **Edit** button
3. Change the Job Title field to: **DO NOT SAVE THIS**
4. Click **Cancel** (instead of Save)

**Expected result:** The form closes. The original job title is still shown. "DO NOT SAVE THIS" does not appear anywhere on the page.

---

## 5. Delete

### 5.1 — Delete a person from the directory
**What this checks:** A person can be deleted and they disappear from the list afterwards.

**Setup:** Create a person named "John Smith" first (see scenario 2.1).

**Steps:**
1. Open the Directory page
2. Find the person named **John Smith** (created in scenario 2.1)
3. Click the three-dot menu (⋯) on that row, or open the detail view
4. Click **Delete** (or Remove)
5. Confirm the deletion in the dialog that appears
6. Wait for the page to stop loading

**Expected result:** John Smith is no longer visible in the directory list. A success toast briefly appears.

---

## 6. Search

### 6.1 — Search for a person by name
**What this checks:** The search box filters the directory to matching contacts.

**Setup:** At least two people with different names must exist in the directory.

**Steps:**
1. Open the Directory page
2. Click the search box (usually shows a magnifying glass icon or says "Search...")
3. Type: **Maria Torres**
4. Wait for the list to filter

**Expected result:** The list narrows to show only contacts whose name contains "Maria Torres". Other people are hidden. Clearing the search box brings all records back.

---

### 6.2 — Search for contacts by company name
**What this checks:** The search box can find contacts by company name, not just by person name.

**Setup:** At least one person linked to "ABC Concrete Co" must exist.

**Steps:**
1. Open the Directory page
2. Click the search box
3. Type: **ABC Concrete Co**
4. Wait for the list to filter

**Expected result:** Only contacts associated with "ABC Concrete Co" are shown. Contacts from other companies are hidden. Clearing the search brings all records back.

---

## 7. Filter

### 7.1 — Filter directory by role or permission level
**What this checks:** The role filter narrows the list to only people with a specific role on the project.

**Setup:** Multiple people with at least two different roles must exist.

**Steps:**
1. Open the Directory page
2. Click the **Filters** button (or the filter icon in the toolbar)
3. Find the **Role** (or Permission) filter
4. Select a role such as **Project Manager** or **Standard**
5. Click **Apply** (if required)

**Expected result:** The directory list updates to show only people who have the selected role. People with other roles are hidden. Removing the filter restores the full list.

---

### Schedule
Source: `docs/testing/schedule-scenarios.md`

### 1.1 — Open the Schedule page
**What this checks:** The Schedule page loads without errors and shows the task list.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. In the left sidebar, click **"Schedule"** under project "Alleato AI"
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A list of tasks is visible, or an empty state message appears. The page title says "Schedule". No error messages appear.

---

### 1.2 — Switch between all five view modes
**What this checks:** The five views — Gantt, Table, Board, Timeline, Calendar — each load without errors. Each view shows the same tasks in a different layout.

**Steps:**
1. Open the Schedule page at `/767/schedule`
2. Click the **"Table"** tab at the top
3. Wait for the view to load
4. Click the **"Board"** tab
5. Wait for the view to load
6. Click the **"Timeline"** tab
7. Wait for the view to load
8. Click the **"Calendar"** tab
9. Wait for the view to load
10. Click the **"Gantt"** tab to return to the default

**Expected result:** Each view loads without errors. Tasks appear in all views. The active tab is visually highlighted. No error messages appear in any view.

---

## 2. Create

### 2.1 — Create a new task with a name and dates
**What this checks:** A user can create a new schedule task — a unit of work with a start date and end date — and it appears in the task list after saving.

**Steps:**
1. Open the Schedule page
2. Click the **"Add Task"** button (top right)
3. In the **Name** field, type: **Install Drywall**
4. In the **Start Date** field, type or select: **2026-05-01**
5. In the **Finish Date** field, type or select: **2026-05-15**
6. Click the **Save** button
7. Wait for the page to stop loading

**Expected result:** The task "Install Drywall" appears in the list. Its start date shows 2026-05-01 and finish date shows 2026-05-15. A success message (toast) briefly appears. No error messages are shown.

---

### 2.2 — Try to create a task without a name
**What this checks:** The form prevents saving when the required Name field is left blank, so unnamed tasks cannot be accidentally created.

**Steps:**
1. Open the Schedule page
2. Click **"Add Task"**
3. Leave the **Name** field completely blank
4. Click the **Save** button

**Expected result:** An error message appears near the Name field saying the name is required. The task is NOT created. The form stays open.

---

### 2.3 — Create a milestone
**What this checks:** A milestone — a zero-duration target date (like "Foundation complete by June 1") — can be created and is visually distinct from regular tasks.

**Steps:**
1. Open the Schedule page
2. Click **"Add Task"**
3. In the **Name** field, type: **Foundation Complete**
4. Check the **"Milestone"** checkbox or toggle (if visible in the form)
5. Set **Date** to: **2026-06-01**
6. Click **Save**

**Expected result:** The milestone "Foundation Complete" appears in the task list. It is visually different from regular tasks (e.g. a diamond icon, or labeled as milestone). No error appears.

---

## 3. Edit

### 3.1 — Change a task start and finish date
**What this checks:** Editing a task and changing its dates saves correctly and the new dates appear after refreshing.

**Setup:** There must be at least one task in the schedule.

**Steps:**
1. Open the Schedule page
2. Click on any task name to open the edit modal
3. Change the **Start Date** to: **2026-06-10**
4. Change the **Finish Date** to: **2026-06-20**
5. Click **Save**
6. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page

**Expected result:** After refreshing, the task shows Start Date 2026-06-10 and Finish Date 2026-06-20. The updated dates are persisted — they do not revert to the old values.

---

### 3.2 — Rename an existing task
**What this checks:** A task name can be updated and the new name appears everywhere in the schedule.

**Setup:** There must be at least one task in the schedule.

**Steps:**
1. Open the Schedule page
2. Click on any task to open its edit modal
3. Clear the **Name** field and type: **Renamed Task Test**
4. Click **Save**

**Expected result:** The task list shows "Renamed Task Test" in place of the old name. A success toast appears. The old name is no longer visible.

---

### 3.3 — Change a task status to In Progress
**What this checks:** A task status can be updated. Status tracks whether a task has not started yet, is currently being worked on, or is finished.

**Setup:** There must be at least one task with status Not Started.

**Steps:**
1. Open the Schedule page
2. Click on a task with status **"Not Started"**
3. In the edit modal, find the **Status** dropdown and select **"In Progress"**
4. Click **Save**

**Expected result:** The task now shows status "In Progress" in the list. If there is a Board view, the task card has moved to the "In Progress" column.

---

## 4. Delete

### 4.1 — Delete a task and confirm it is removed
**What this checks:** A task can be permanently deleted and disappears from the schedule.

**Setup:** Create a task named **"Delete Me Task"** before running this test.

**Steps:**
1. Open the Schedule page
2. Find the task named **Delete Me Task** in the list
3. Right-click the task row (or click the three-dot context menu on the row)
4. Click **"Delete"**
5. Confirm the deletion if a dialog appears
6. Wait for the page to update

**Expected result:** The task "Delete Me Task" is no longer visible in any view. A success toast briefly appears. No error messages are shown.

---

### 4.2 — Select multiple tasks and delete them all at once
**What this checks:** The bulk delete feature works — useful when you need to remove several tasks in one action.

**Setup:** Create at least two tasks named **"Bulk Delete A"** and **"Bulk Delete B"** before running this test.

**Steps:**
1. Open the Schedule page
2. Check the checkbox on the row for **"Bulk Delete A"**
3. Check the checkbox on the row for **"Bulk Delete B"**
4. A bulk action bar should appear — click **"Delete"**
5. Confirm the deletion

**Expected result:** Both tasks disappear from the list. The success message mentions 2 tasks deleted. No error messages appear.

---

## 5. Hierarchy

### 5.1 — Create a sub-task under a parent task
**What this checks:** Tasks can be nested — for example, "Frame Walls" and "Hang Drywall" could be sub-tasks under a parent task called "Framing Phase". Nesting helps organize work into phases.

**Setup:** There must be at least one parent task in the schedule.

**Steps:**
1. Open the Schedule page (Gantt or Table view)
2. Right-click on any task to open the context menu
3. Click **"Add Sub-task"** or **"Indent"**
4. If a sub-task is added, click on it and name it: **Sub-Task Test**
5. Click **Save**

**Expected result:** The new task "Sub-Task Test" appears indented below the parent task in the list. The parent task shows an expand/collapse arrow.

---

## 6. Filters & Search

### 6.1 — Search for a task by its name
**What this checks:** The search box filters the task list to show only matching tasks.

**Setup:** There must be at least two tasks with different names in the schedule.

**Steps:**
1. Open the Schedule page
2. Click the search box in the toolbar (shows a magnifying glass icon or says **"Search tasks..."**)
3. Type: **Install**
4. Wait for the list to filter

**Expected result:** Only tasks whose name contains "Install" are shown. Tasks with unrelated names disappear. Clearing the search box brings all tasks back.

---

### 6.2 — Filter the task list to show only In Progress tasks
**What this checks:** The status filter narrows the list to tasks in a specific stage of work.

**Setup:** There must be at least one task with status "In Progress" and one with a different status.

**Steps:**
1. Open the Schedule page
2. Click the **Filters** button in the toolbar
3. Find the **Status** filter and select **"In Progress"**
4. Apply the filter

**Expected result:** Only tasks with status "In Progress" are shown. Tasks with other statuses are hidden. Clearing the filter brings all tasks back.

---

### Documents
Source: `docs/testing/documents-scenarios.md`

### 1.1 — Open the Documents page
**What this checks:** The Documents page loads without errors and shows the file list.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. In the left sidebar, click **"Documents"** under project "Alleato AI"
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of documents is visible (or an empty state message if none exist yet). The page title says "Documents". No error messages appear.

---

### 1.2 — Switch between table, card, and list views
**What this checks:** The three different display styles all work for browsing documents.

**Steps:**
1. Go to the Documents page
2. Click the view toggle button in the toolbar (looks like a grid or list icon)
3. Select **"Card"** view and look at the result
4. Select **"List"** view and look at the result
5. Switch back to **"Table"** view

**Expected result:** Each view loads without errors. In Card view, files appear as cards with their names. In List view, files appear as rows. Table view shows a full data grid with columns.

---

### 1.3 — Click a document row to open the file
**What this checks:** Clicking on a file in the list opens it in a new browser tab.

**Setup:** There must be at least one document already uploaded to the project.

**Steps:**
1. Go to the Documents page
2. Click on any document row in the table
3. Watch what happens

**Expected result:** The file opens in a new browser tab. If it is a PDF, it displays in the browser. No error message appears.

---

## 2. Upload

### 2.1 — Upload a small PDF file to the project
**What this checks:** A new file can be added to the project and appears in the list.

**Setup:** Have a small PDF ready on your computer (any PDF under 5 MB).

**Steps:**
1. Go to the Documents page
2. Click the **"Upload"** button (top right)
3. In the **Title** field, type: **Test Document Upload**
4. In the **Folder** field, type: **Test Folder**
5. Select any Category from the dropdown
6. Click the file upload area and select your small PDF
7. Click the **Save** or **Upload** button
8. Wait for the upload to finish

**Expected result:** The dialog closes. The new file "Test Document Upload" appears in the documents list. No error message appears. The Folder column shows "Test Folder".

---

### 2.2 — Try to upload without entering a title
**What this checks:** The form prevents saving when the required Title field is blank.

**Steps:**
1. Click the **"Upload"** button
2. Leave the **Title** field completely empty
3. Select a file to upload
4. Click the **Save** or **Upload** button

**Expected result:** A red error message appears near the Title field saying it is required. The file is NOT uploaded. The dialog stays open.

---

### 2.3 — Try to save without selecting a file
**What this checks:** The form prevents saving when no file has been chosen.

**Steps:**
1. Click the **"Upload"** button
2. Fill in the Title: **Missing File Test**
3. Do NOT select any file
4. Click the **Save** or **Upload** button

**Expected result:** An error message appears saying a file is required. The record is NOT created. The dialog stays open.

---

## 3. Folder Organisation

### 3.1 — Upload a document and assign it to Test Folder
**What this checks:** Files can be organised into named folders — like putting papers into a labeled binder.

**Steps:**
1. Click the **"Upload"** button
2. Fill in Title: **Folder Test Doc**
3. In the **Folder** field, type: **Test Folder**
4. Select a small PDF
5. Click **Save**
6. On the Documents list, click the **Filters** button
7. Filter by Folder: **Test Folder**

**Expected result:** The document "Folder Test Doc" appears in the filtered results. The Folder column shows "Test Folder". Documents in other folders are hidden.

---

### 3.2 — Use the folder filter to narrow the list
**What this checks:** The folder filter correctly limits the list to only files in the chosen folder.

**Setup:** Upload at least two documents in different folders first.

**Steps:**
1. Go to the Documents page
2. Click the **Filters** button in the toolbar
3. Select a folder name from the **Folder** filter dropdown
4. Apply the filter

**Expected result:** Only documents assigned to that folder are shown. Documents in other folders disappear. Clearing the filter restores the full list.

---

## 4. Search

### 4.1 — Search for a document by part of its title
**What this checks:** Typing in the search box filters the list to matching documents.

**Setup:** The list must have at least two documents with different titles.

**Steps:**
1. Go to the Documents page
2. Click the search box (shows "Search documents...")
3. Type: **Test Document**
4. Wait a moment for the list to update

**Expected result:** Only documents whose title or filename contains "Test Document" are shown. Other documents disappear. Clearing the search box brings all documents back.

---

### 4.2 — Filter the list to show only Draft documents
**What this checks:** The status filter works. A "Draft" document has been uploaded but not yet published for the whole team.

**Steps:**
1. Click the **Filters** button in the toolbar
2. Select **Status: Draft**
3. Apply the filter

**Expected result:** Only documents with status "Draft" are shown. Documents with other statuses disappear. The filter label is visible in the toolbar.

---

## 5. Delete

### 5.1 — Delete a single document
**What this checks:** A document can be removed from the project and disappears from the list.

**Setup:** Upload a document titled "Delete Me Test" before running this scenario.

**Steps:**
1. Go to the Documents page
2. Find the row titled **Delete Me Test**
3. Click the **three-dot action menu** on that row
4. Click **"Delete"**
5. In the confirmation dialog, click **Delete**
6. Wait for the page to update

**Expected result:** The document "Delete Me Test" is no longer visible in the list. A success message (toast) briefly appears. No error message is shown.

---

### 5.2 — Select multiple documents and delete them all at once
**What this checks:** You can remove several files in a single action.

**Setup:** Upload at least two documents to use as test data.

**Steps:**
1. On the Documents page, check the checkbox on **2 or more** document rows
2. Click the **"Delete"** bulk action button that appears in the toolbar
3. In the confirmation dialog, confirm the deletion
4. Wait for the page to update

**Expected result:** All selected documents are removed from the list. A success message says how many were deleted (e.g. "2 documents deleted"). No error message appears.

---

## 6. Export

### 6.1 — Export the document list as a spreadsheet file
**What this checks:** The export button downloads a CSV file that can be opened in Excel or Google Sheets.

**Setup:** There must be at least one document in the list.

**Steps:**
1. Go to the Documents page
2. Click the **export (download) icon** in the toolbar
3. Wait for the download to start

**Expected result:** A CSV file downloads to your computer. Opening it in a spreadsheet app shows columns for Title, File Name, Folder, Category, Status, Uploaded By, and Created date.

---

## 7. Column Visibility

### 7.1 — Use the column selector to hide the Category column
**What this checks:** The column visibility control lets you customise which columns appear.

**Steps:**
1. Go to the Documents page in **Table** view
2. Click the **columns selector** button in the toolbar (looks like columns or an eye icon)
3. Uncheck **"Category"** to hide it
4. Close the column selector

**Expected result:** The Category column disappears from the table. All other columns still display correctly. The rest of the data is unchanged.

---

## 8. Empty State

### 8.1 — Verify the page shows a helpful message when search returns nothing
**What this checks:** The page shows a friendly message instead of a blank screen when no documents match the current search or filter.

**Steps:**
1. Apply a search that returns no results (e.g. type **xyzzy999notafile** in the search box)
2. Look at the main content area

**Expected result:** A message appears saying "No documents yet" or similar. An "Upload your first document" button is visible. No blank white space, stuck spinner, or error message appears.

---

### Drawings
Source: `docs/testing/drawings-scenarios.md`

### 1.1 — Upload 3 starter drawing files
**What this checks:** Core upload flow works with realistic inputs and creates a reliable baseline dataset for all remaining drawing scenarios.

**Setup:** Download these three files from the repo folder:
- `docs/testing/drawings/3.-2024.02.29-Architectural-Construction-Drawing_Part1.pdf`
- `docs/testing/drawings/3.-2024.02.29-Architectural-Construction-Drawing_Part2.pdf`
- `docs/testing/drawings/3.-2024.02.29-Architectural-Construction-Drawing_Part3.pdf`

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Go to http://localhost:3000/767/drawings
3. Click **Upload**
4. Upload file 1 with:
   - Drawing Number: **A-101**
   - Title: **Architectural Plan — Part 1**
   - Discipline: **Architectural**
   - Revision: **0**
5. Repeat upload for file 2 with:
   - Drawing Number: **A-102**
   - Title: **Architectural Plan — Part 2**
   - Discipline: **Architectural**
   - Revision: **0**
6. Repeat upload for file 3 with:
   - Drawing Number: **A-103**
   - Title: **Architectural Plan — Part 3**
   - Discipline: **Architectural**
   - Revision: **0**
7. Wait for all uploads to complete and return to the drawings list

**Expected result:** All three drawings appear in the list (A-101, A-102, A-103) with the correct titles and uploaded files. No error messages appear.

---

### 1.2 — Open a drawing in the viewer
**What this checks:** Clicking a drawing row opens the full-screen viewer.

**Setup:** The Drawings list must have at least one existing drawing.

**Steps:**
1. Open the Drawings page
2. Click on any drawing in the list
3. Wait for the viewer page to finish loading

**Expected result:** The drawing viewer page opens. The PDF or image of the drawing is displayed. The drawing number and title are shown at the top. No error messages appear.

---

### 1.3 — Switch between tabs (Current Drawings, Drawing Sets, Recycle Bin)
**What this checks:** The three tab views all render correctly.

**Steps:**
1. Open the Drawings page at `/767/drawings`
2. Click the **Drawing Sets** tab
3. Click the **Recycle Bin** tab
4. Click the **Current Drawings** tab to go back

**Expected result:** Each tab loads without errors. The URL changes to match the selected tab. No blank pages or error screens appear.

---

## 2. Upload

### 2.1 — Try to upload a drawing without a file attached
**What this checks:** The form prevents saving when no file has been selected.

**Steps:**
1. Open the Drawings page
2. Click the **Upload** button
3. Fill in Drawing Number: **A-999** and Title: **No File Test**
4. Do NOT select a file
5. Click **Upload** (or Submit)

**Expected result:** An error message appears (e.g. "File is required"). The drawing is NOT created. The upload dialog stays open.

---

### 2.2 — Try to upload a drawing without a Drawing Number
**What this checks:** Drawing Number is enforced as a required field.

**Steps:**
1. Open the Drawings page
2. Click the **Upload** button
3. Leave the Drawing Number field completely blank
4. Type **Missing Number Test** in the Title field
5. Select a PDF file
6. Click **Upload** (or Submit)

**Expected result:** An error message appears near the Drawing Number field (e.g. "Drawing number is required"). The record is NOT created. The dialog stays open.

---

## 3. Filter / Search

### 3.1 — Filter drawings by discipline
**What this checks:** The discipline filter correctly narrows the drawing list to only the selected discipline.

**Setup:** The list must have drawings from at least two different disciplines (e.g. Architectural and Structural).

**Steps:**
1. Open the Drawings page
2. Click the **Filters** button in the toolbar
3. In the Discipline filter, select **Architectural**
4. Wait for the list to update

**Expected result:** Only drawings with Discipline = "Architectural" are shown. Drawings from other disciplines (e.g. Structural, Mechanical) are hidden. Clearing the filter brings all drawings back.

---

### 3.2 — Search for a drawing by number
**What this checks:** The search box filters the list to matching drawing numbers or titles.

**Setup:** The list must have at least two drawings with different numbers.

**Steps:**
1. Open the Drawings page
2. Click the search box (shows "Search drawings..." placeholder)
3. Type **A-101**
4. Wait for the list to filter

**Expected result:** The list narrows to show only drawings whose number or title contains "A-101". Drawings with unrelated numbers disappear. Clearing the search box restores all drawings.

---

### 3.3 — Filter drawings by status
**What this checks:** The status filter correctly shows only drawings matching the selected status.

**Setup:** The list must contain drawings with at least two different statuses.

**Steps:**
1. Open the Drawings page
2. Click the **Filters** button
3. In the Status filter, select **Superseded**
4. Wait for the list to update

**Expected result:** Only drawings with Status = "Superseded" are shown. Active drawings are hidden. Clearing the filter restores all drawings.

---

## 4. Viewer

### 4.1 — Zoom in and out on a drawing
**What this checks:** The zoom controls in the drawing viewer work correctly.

**Setup:** At least one drawing must be uploaded.

**Steps:**
1. Open any drawing in the viewer
2. Click the **Zoom In** button (magnifying glass with + icon) in the toolbar
3. Click it two more times
4. Click the **Zoom Out** button three times

**Expected result:** The drawing zooms in when Zoom In is clicked — the content gets larger. The drawing zooms back out when Zoom Out is clicked. The drawing remains visible throughout and does not disappear or error.

---

### 4.2 — Download a drawing from the viewer
**What this checks:** The Download button triggers a file download of the current drawing.

**Setup:** At least one drawing with an uploaded file must exist.

**Steps:**
1. Open any drawing in the viewer
2. Click the **Download** button (down arrow icon) in the toolbar
3. Wait for the file download to start

**Expected result:** A file download begins in the browser. The downloaded file has the same name as the drawing file. No error message appears.

---

## 5. Revisions

### 5.1 — View the revision history of a drawing
**What this checks:** The Revisions panel is accessible and displays the list of revisions for a drawing.

**Setup:** At least one drawing must exist. Ideally it has more than one revision.

**Steps:**
1. Open any drawing in the viewer
2. Look for a **Revisions** panel or button in the viewer toolbar
3. Click it to open the revisions list

**Expected result:** A list of revisions is shown. Each revision entry shows a revision number (e.g. "0", "1", "2"), a received date, and a status. The current/active revision is highlighted or marked.

---

### 5.2 — Upload a new revision of an existing drawing
**What this checks:** A second (or later) revision can be uploaded for an existing drawing, and it becomes the current version while the old one is preserved.

**Setup:** A drawing must already exist with at least revision "0". Have a second PDF file ready to upload.

**Steps:**
1. Open any drawing in the viewer
2. Open the **Revisions** panel
3. Click **Add Revision** (or the + button)
4. In the form, type **1** in the Revision Number field
5. Set today's date in the Received Date field
6. Select a new PDF file from your computer
7. Click **Upload** (or Save)
8. Wait for the upload to complete

**Expected result:** The new revision appears in the revisions list with number "1". The viewer updates to show the new file. The previous revision (number "0") is still listed but marked as an older version. No error message appears.

---

## 6. Delete

### 6.1 — Delete a drawing
**What this checks:** A drawing can be deleted from the list and it disappears afterwards.

**Setup:** Create a drawing named "First Floor Plan" with number **A-101** before running this scenario.

**Steps:**
1. Open the Drawings page
2. Find the drawing titled **First Floor Plan** (number A-101) in the list
3. Click the three-dot menu (⋯) on that row
4. Click **Delete**
5. Confirm the deletion in the dialog that appears
6. Wait for the page to stop loading

**Expected result:** The drawing "A-101 — First Floor Plan" is no longer visible in the list. A success message (toast) briefly appears. The drawing is gone even after refreshing the page.

---

### Photos
Source: `docs/testing/photos-scenarios.md`

### 1.1 — Open the Photos page
**What this checks:** The Photos page loads without errors and shows the main photo grid or an empty state.

**Setup:** Make sure you are logged in as test1@mail.com.

**Steps:**
1. In the left sidebar, click **Photos** under the "Alleato AI" project.
2. Wait for the page to finish loading.

**Expected result:** The Photos page opens. Either a grid of photos is visible, or an empty state that says "No photos yet" appears. No error messages are shown.

---

### 1.2 — Switch between tabs
**What this checks:** All five tabs (Photos, Map, Timeline, Albums, Recycle Bin) exist and can be clicked without causing an error.

**Setup:** Be on the Photos page at `/767/photos`.

**Steps:**
1. Click the **Map** tab.
2. Click the **Timeline** tab.
3. Click the **Albums** tab.
4. Click the **Recycle Bin** tab.
5. Click the **Photos** tab to return to the main view.

**Expected result:** Each tab displays without a crash. Map, Timeline, and Albums tabs show an informational message. Recycle Bin tab opens. The Photos tab returns to the grid.

---

### 1.3 — View the empty state when no photos exist
**What this checks:** A helpful message and an Upload button appear when no photos have been added yet.

**Setup:** The project must have zero photos. If photos already exist, this test is not applicable.

**Steps:**
1. Navigate to the Photos page at `/767/photos`.
2. Confirm no photos are present.

**Expected result:** A message "No photos yet" and a prompt to upload or drag-and-drop is visible. An **Upload Photo** button appears.

---

### 1.4 — View the photo grid with thumbnails
**What this checks:** Uploaded photos appear as thumbnail cards in the grid layout.

**Setup:** At least one photo must already exist in the project.

**Steps:**
1. Navigate to `/767/photos`.
2. Look at the main Photos tab.

**Expected result:** Photos appear as thumbnail cards arranged in a grid. Each card shows an image preview, a title, and a date.

---

### 1.5 — Open a photo in the lightbox
**What this checks:** Clicking a photo opens a larger view with full details.

**Setup:** At least one photo must exist in the project.

**Steps:**
1. On the Photos page, click any photo thumbnail.
2. Wait for the detail view to open.

**Expected result:** A dialog opens showing a larger version of the photo, its title, description (if set), album badge, location, trade, file size, date, and dimensions. Action buttons (Star, Delete) are visible.

---

### 1.6 — Close the photo lightbox
**What this checks:** The lightbox can be dismissed and the grid view returns.

**Setup:** A photo lightbox must be open.

**Steps:**
1. Open a photo by clicking its thumbnail.
2. Click the X button at the top-right of the lightbox dialog.

**Expected result:** The lightbox closes and the photo grid is visible again.

---

### 1.7 — Use the mobile upload button
**What this checks:** A floating action button appears on narrow screens for quick photo upload.

**Setup:** Use a mobile-sized browser window (or resize your browser to about 375px wide).

**Steps:**
1. Resize your browser window to a narrow width (like a mobile phone).
2. Navigate to `/767/photos`.
3. Look at the bottom-right corner of the screen.

**Expected result:** A round Upload button appears at the bottom-right. Clicking it opens the Upload Photos dialog.

---

## 2. Upload

### 2.1 — Upload a single photo using the Upload Photo button
**What this checks:** A user can upload one image file and have it appear in the grid.

**Setup:** Have a small image file (JPG or PNG) ready on your computer.

**Steps:**
1. Click the **Upload Photo** button in the top-right of the page.
2. In the dialog that opens, click the drop zone area (it says "Drop photos here or browse").
3. Select one image file from your computer.
4. Click **Upload Photo**.
5. Wait for the page to stop loading.

**Expected result:** The dialog closes. The new photo appears in the grid. An upload progress indicator may briefly appear at the top of the page.

---

### 2.2 — Upload multiple photos at once
**What this checks:** More than one image can be selected and uploaded in a single batch.

**Setup:** Have two or more image files ready on your computer.

**Steps:**
1. Click **Upload Photo**.
2. In the dialog, click the drop zone and select 2–3 image files.
3. Confirm the file list shows all selected files.
4. Click **Upload X Photos**.
5. Wait for the page to finish loading.

**Expected result:** All selected photos appear in the grid. The file count on the upload button showed the correct number before submission.

---

### 2.3 — Upload photos by dragging and dropping files directly onto the page
**What this checks:** Photos can be uploaded without clicking any button — just by dragging files from your desktop.

**Setup:** Have at least one image file ready to drag. Be on the Photos tab (not Map/Timeline/Albums).

**Steps:**
1. Open a folder on your computer with an image file.
2. Drag the image file from the folder and drop it anywhere on the Photos page (the main grid area).
3. Wait for the upload to complete.

**Expected result:** While dragging, a blue overlay appears with the message "Drop images to upload". After dropping, the photo uploads and appears in the grid. An upload progress banner briefly shows "Uploading photos...".

---

### 2.4 — Upload photos by dragging into the upload dialog drop zone
**What this checks:** The dialog drop zone also accepts drag-and-drop, not just file-browser selection.

**Setup:** Have an image file ready to drag.

**Steps:**
1. Click **Upload Photo** to open the dialog.
2. Drag an image file from your desktop and drop it into the dashed drop zone in the dialog.
3. Confirm the file appears in the list below the drop zone.
4. Click **Upload Photo**.

**Expected result:** The file appears in the queue list inside the dialog. After clicking Upload, the photo appears in the grid.

---

### 2.5 — Choose a specific album when uploading a photo
**What this checks:** The album selected in the upload dialog is applied to the uploaded photo.

**Setup:** Have an image file ready.

**Steps:**
1. Click **Upload Photo**.
2. Select one image file.
3. In the **Album** dropdown inside the dialog, change the selection from "Default" to **Safety**.
4. Click **Upload Photo**.
5. After upload, filter the grid by the "Safety" album.

**Expected result:** The uploaded photo appears when the Safety album filter is active. The album badge on the photo card or lightbox shows "Safety".

---

### 2.6 — Remove a file from the upload queue before uploading
**What this checks:** A user can deselect a file they added by mistake before actually uploading.

**Steps:**
1. Click **Upload Photo**.
2. Select two image files.
3. In the file list, click the X button next to the first file.
4. Confirm only one file remains in the list.
5. Click **Upload Photo**.

**Expected result:** Only one photo uploads and appears in the grid. The removed file is not uploaded.

---

### 2.7 — Cancel the upload dialog without uploading anything
**What this checks:** Clicking Cancel closes the dialog and does not upload any files.

**Steps:**
1. Click **Upload Photo**.
2. Select one image file.
3. Click **Cancel**.

**Expected result:** The dialog closes. No new photo appears in the grid.

---

### 2.8 — Try to upload a non-image file (e.g. a PDF or Word document)
**What this checks:** Only image files are accepted and other file types are silently ignored.

**Setup:** Have a non-image file (like a .pdf or .txt) ready.

**Steps:**
1. Click **Upload Photo**.
2. Try to select a PDF or text file in the file browser (you may need to change the file type filter to "All Files").
3. Attempt to submit.

**Expected result:** The non-image file is either not accepted by the file picker, or it is ignored and not added to the queue. No PDF or document appears in the grid after upload.

---

### 2.9 — Try to upload a file larger than 20 MB
**What this checks:** Files over the 20 MB size limit are silently skipped and do not cause an error.

**Setup:** Have an image file larger than 20 MB ready, if available.

**Steps:**
1. Click **Upload Photo**.
2. Select an image file that is larger than 20 MB.
3. Click **Upload Photo**.

**Expected result:** The oversized file is skipped. No error message crashes the page. Other files in the same batch (if any) still upload successfully.

---

### 2.10 — Confirm the photo title is automatically set from the filename after upload
**What this checks:** When a photo is uploaded, its title is generated from the filename (with dashes/underscores replaced by spaces and title-cased).

**Setup:** Upload a photo with a hyphenated filename like "site-progress-01.jpg".

**Steps:**
1. Click **Upload Photo**.
2. Select an image file named something like "site-progress-01.jpg".
3. Upload it.
4. Click on the newly uploaded photo to open the lightbox.

**Expected result:** The lightbox title shows "Site Progress 01" (or similar — underscores/dashes replaced with spaces, first letters capitalized). The filename was used as the source.

---

## 3. View & Search

### 3.1 — Search for a photo by its title
**What this checks:** Typing in the search bar filters the photo grid to show only matching photos.

**Setup:** At least two photos with different titles must exist.

**Steps:**
1. On the Photos page, click in the **Search photos...** box.
2. Type part of a known photo title (e.g. "site").
3. Watch the grid update.

**Expected result:** Only photos whose title, description, or filename contains the search term are shown. Other photos disappear from the grid.

---

### 3.2 — Clear the search filter to show all photos again
**What this checks:** After searching, the X button restores the full photo list.

**Setup:** A search must be active in the search box.

**Steps:**
1. Type a search term in the **Search photos...** box.
2. Click the **X** button that appears inside the search box on the right side.

**Expected result:** The search box clears and all photos reappear in the grid.

---

### 3.3 — Filter the photo grid to show only photos from a specific album
**What this checks:** The album dropdown correctly filters the photo list.

**Setup:** Photos must exist in at least two different albums.

**Steps:**
1. Click the **All Albums** dropdown next to the search box.
2. Select **Safety** from the dropdown.
3. Observe the photo grid.

**Expected result:** Only photos assigned to the "Safety" album appear. Photos in other albums are hidden.

---

### 3.4 — Reset album filter back to All Albums
**What this checks:** Selecting "All Albums" from the dropdown removes the album filter and shows all photos.

**Setup:** An album filter must be active.

**Steps:**
1. Select a specific album from the dropdown (e.g. "Safety").
2. Open the dropdown again and select **All Albums**.

**Expected result:** All photos appear in the grid regardless of their album.

---

### 3.5 — Use search and album filter at the same time
**What this checks:** Combining a text search with an album filter narrows results correctly.

**Setup:** Photos must exist in multiple albums with varied titles.

**Steps:**
1. Select **Progress** from the album dropdown.
2. Type a keyword in the search box.
3. Observe the results.

**Expected result:** Only photos that match both the album "Progress" AND the keyword appear. Photos matching only one criterion are excluded.

---

### 3.6 — See the empty state when search finds no matching photos
**What this checks:** A helpful message appears when search or album filter returns zero results.

**Setup:** At least one photo must exist.

**Steps:**
1. Type a nonsense word like **zzzzzzz** in the search box.

**Expected result:** The grid clears and a message appears explaining no photos match the current filters.

---

## 4. Edit

### 4.1 — Add or edit the description on a photo
**What this checks:** The description field can be set on an existing photo and persists after saving.

**Setup:** At least one photo must exist.

**Steps:**
1. Click a photo thumbnail to open the lightbox.
2. Look for a description field or edit option.
3. Enter the text **Test description for scenario 4.1**.
4. Save the changes.

**Expected result:** The description "Test description for scenario 4.1" appears in the lightbox detail area. After refreshing the page and reopening the photo, the description is still shown.

---

### 4.2 — Change the title of an existing photo
**What this checks:** The photo title can be updated and the new title appears on the card and in the lightbox.

**Setup:** At least one photo must exist.

**Steps:**
1. Click a photo to open the lightbox.
2. Find the title field and change it to **Updated Title Scenario 4.2**.
3. Save the changes.
4. Close the lightbox.

**Expected result:** The photo card in the grid and the lightbox both show the updated title "Updated Title Scenario 4.2".

---

### 4.3 — Assign a location label to a photo
**What this checks:** A location can be added to a photo and shows in the lightbox details.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Location** field and type **Level 2 - Electrical Room**.
3. Save the changes.

**Expected result:** The location "Level 2 - Electrical Room" appears in the photo details in the lightbox. It persists after refreshing the page.

---

### 4.4 — Assign a trade category to a photo
**What this checks:** A trade label can be assigned to a photo and is visible in the lightbox.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Trade** field and enter **Electrical**.
3. Save the changes.

**Expected result:** The trade "Electrical" appears in the photo detail area of the lightbox.

---

### 4.5 — Move a photo to a different album by editing it
**What this checks:** The album assignment on an existing photo can be changed.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Album** field and change it to **Inspections**.
3. Save the changes.

**Expected result:** The album badge on the photo updates to "Inspections". When filtering by "Inspections", the photo appears.

---

### 4.6 — Add keyword tags to a photo
**What this checks:** Tags can be added to a photo and appear as badges in the lightbox view.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Tags** field and add the tags **concrete** and **foundation**.
3. Save the changes.

**Expected result:** The tags "concrete" and "foundation" appear as small badge labels inside the lightbox details section.

---

### 4.7 — Set or change the "date taken" field on a photo
**What this checks:** The capture date can be manually set and is shown in the photo metadata.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Date Taken** field and set it to today's date.
3. Save the changes.

**Expected result:** The date taken is updated and visible in the photo metadata area of the lightbox.

---

## 5. Star / Favorite

### 5.1 — Mark a photo as starred by clicking the star icon on the thumbnail
**What this checks:** Hovering over a photo card reveals a star button, and clicking it marks the photo as starred.

**Setup:** At least one photo must exist that is not yet starred.

**Steps:**
1. Hover your mouse over a photo thumbnail in the grid.
2. Click the star icon that appears in the top-right corner of the thumbnail.
3. Observe the star state.

**Expected result:** The star icon fills in (becomes solid/colored) to indicate the photo is now starred. The change is saved without needing to click a separate Save button.

---

### 5.2 — Remove the star from a previously starred photo
**What this checks:** Clicking the star icon on an already-starred photo removes the favorite status.

**Setup:** At least one starred photo must exist.

**Steps:**
1. Hover over a photo that is already starred (star icon is filled/colored).
2. Click the star icon.

**Expected result:** The star icon becomes hollow/empty, indicating the photo is no longer starred.

---

### 5.3 — Star a photo using the Star button inside the lightbox
**What this checks:** The lightbox action buttons include a Star option that works correctly.

**Setup:** At least one photo must be open in the lightbox.

**Steps:**
1. Click a photo to open the lightbox.
2. Find the **Star** button at the bottom of the dialog.
3. Click it.

**Expected result:** The button label changes to "Starred" and the star icon fills in. The photo is now marked as a favorite.

---

### 5.4 — Filter the grid to show only starred photos
**What this checks:** Starred photos can be found using a filter or dedicated view.

**Setup:** At least one starred photo must exist.

**Steps:**
1. Navigate to `/767/photos`.
2. Look for a way to filter by starred photos (e.g. a "Starred" tab, sidebar item, or filter chip).
3. Select it.

**Expected result:** Only photos that have been starred are shown in the view.

---

## 6. Delete & Recycle Bin

### 6.1 — Delete a photo using the Delete button inside the lightbox
**What this checks:** A photo can be removed from the grid and is sent to the recycle bin.

**Setup:** At least one photo must exist.

**Steps:**
1. Click a photo thumbnail to open the lightbox.
2. Click the **Delete** button (shown in red or with a trash icon).
3. Wait for the action to complete.

**Expected result:** The lightbox closes. The deleted photo no longer appears in the main photo grid.

---

### 6.2 — Confirm that a deleted photo appears in the Recycle Bin tab
**What this checks:** Deleting a photo sends it to the recycle bin rather than permanently removing it.

**Setup:** At least one photo must have been deleted.

**Steps:**
1. After deleting a photo, click the **Recycle Bin** tab.
2. Look for the recently deleted photo.

**Expected result:** The deleted photo appears in the Recycle Bin tab. The main Photos tab no longer shows the photo.

---

### 6.3 — Restore a deleted photo back to the main photo library
**What this checks:** Photos in the recycle bin can be recovered.

**Setup:** At least one photo must be in the Recycle Bin.

**Steps:**
1. Click the **Recycle Bin** tab.
2. Find a deleted photo.
3. Click the restore/retrieve button for that photo.
4. Switch back to the **Photos** tab.

**Expected result:** The photo reappears in the main Photos grid. It no longer appears in the Recycle Bin.

---

### 6.4 — Permanently remove a photo from the Recycle Bin
**What this checks:** Permanent deletion works from the Recycle Bin and truly removes the photo.

**Setup:** At least one photo must be in the Recycle Bin.

**Steps:**
1. Click the **Recycle Bin** tab.
2. Find a photo.
3. Click the permanent delete button (usually a "Delete Permanently" or trash icon option).
4. Confirm the deletion if prompted.

**Expected result:** The photo is removed from the Recycle Bin. It does not appear in the Photos tab either. The action cannot be undone.

---

### 6.5 — Verify the Recycle Bin shows a retention policy message
**What this checks:** The Recycle Bin tab displays a message explaining that deleted photos are kept for 30 days.

**Steps:**
1. Click the **Recycle Bin** tab.

**Expected result:** A message is visible explaining that deleted photos are kept for 30 days before being permanently removed.

---

## 7. Albums

### 7.1 — Open the Albums tab and see album groupings
**What this checks:** The Albums tab exists and shows the list of available albums.

**Steps:**
1. Navigate to `/767/photos`.
2. Click the **Albums** tab.

**Expected result:** The Albums view opens. Available albums are shown (e.g. Default, Progress, Safety, Inspections, Deliveries, Deficiencies, Closeout).

---

### 7.2 — Create a new custom album
**What this checks:** A user can add a named album and that it appears in the album list and the album dropdown.

**Steps:**
1. Click the **Albums** tab.
2. Look for a **Create Album** or **New Album** button and click it.
3. Type a name like **Structural Steel**.
4. Save the album.

**Expected result:** The new album "Structural Steel" appears in the Albums list. It also becomes available in the album dropdown on the main Photos tab.

---

### 7.3 — Delete an album
**What this checks:** An album can be removed from the project.

**Setup:** A custom album must exist (do not delete built-in albums).

**Steps:**
1. Click the **Albums** tab.
2. Find a custom album.
3. Click the delete or remove option for that album.
4. Confirm if prompted.

**Expected result:** The album is removed from the list. Photos that were in it still exist in the project (they may be unassigned or moved to Default).

---

### 7.4 — Change the display order of albums by dragging them
**What this checks:** Albums can be reordered by the user and the new order persists.

**Setup:** At least two albums must exist.

**Steps:**
1. Click the **Albums** tab.
2. Find the drag handle on an album card.
3. Drag one album above another to reorder.
4. Release the mouse button.

**Expected result:** The albums appear in the new order. After refreshing the page, the custom order is preserved.

---

### 7.5 — Set a specific photo as the cover image for an album
**What this checks:** A photo can be designated as the thumbnail/cover for an album.

**Setup:** An album with at least one photo must exist.

**Steps:**
1. Click the **Albums** tab.
2. Open an album that has photos.
3. Find the option to set or change the cover photo.
4. Select a photo to use as the cover.
5. Save.

**Expected result:** The selected photo appears as the cover thumbnail for that album on the Albums tab.

---

## 8. Download & Export

### 8.1 — Download one photo to your computer
**What this checks:** A photo can be downloaded as an image file.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find a **Download** button or link.
3. Click it.

**Expected result:** The photo file downloads to your computer. The file opens as a valid image.

---

### 8.2 — Select multiple photos and download them all at once
**What this checks:** Bulk download works for multiple selected photos.

**Setup:** At least two photos must exist.

**Steps:**
1. Select two or more photos using checkboxes (or shift-click).
2. Look for a **Download** option in the bulk action bar.
3. Click **Download**.

**Expected result:** All selected photos download, either as individual files or as a zip archive.

---

### 8.3 — Export one or more photos as a PDF document
**What this checks:** The PDF export feature creates a downloadable PDF with the selected photos.

**Setup:** At least one photo must exist.

**Steps:**
1. Select one or more photos using checkboxes.
2. Find the **Export as PDF** option in the toolbar or action menu.
3. Click it and wait for the PDF to generate.
4. Open the downloaded file.

**Expected result:** A PDF file downloads. Opening it shows the selected photos with their titles and metadata.

---

## 9. Email

### 9.1 — Email one or more photos to someone from within the Photos tool
**What this checks:** The outbound email feature lets you send photos to an email address.

**Setup:** At least one photo must exist.

**Steps:**
1. Select one or more photos using checkboxes.
2. Find the **Email** button or option in the action bar.
3. Click it.
4. In the email dialog, enter a recipient email address (use your own for testing).
5. Add a subject and message.
6. Click **Send**.

**Expected result:** A success confirmation appears. An email with the selected photos (or a link to them) is sent to the provided address.

---

### 9.2 — Add photos to the project by emailing them to the project's unique email address
**What this checks:** The inbound email feature works — photos sent to the project email appear in the Photos tool.

**Setup:** You need the project's unique inbound email address from the Photos settings.

**Steps:**
1. Open **Configure Advanced Settings** for Photos (settings/gear icon).
2. Find the **Email to Photos** address for this project.
3. Send an email to that address with a photo attached.
4. Wait 1–2 minutes.
5. Refresh the Photos page.

**Expected result:** The photo from the email appears in the photo grid, assigned to the correct project.

---

## 10. Comments & Mentions

### 10.1 — Leave a comment on a photo
**What this checks:** Users can add text comments to individual photos.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Comments** section or input field.
3. Type **This is a test comment from scenario 10.1**.
4. Click **Post** or press Enter to submit.

**Expected result:** The comment "This is a test comment from scenario 10.1" appears in the comments section of the photo.

---

### 10.2 — Tag a team member in a photo comment using @mention
**What this checks:** Typing @ in a comment triggers a list of project members that can be mentioned.

**Setup:** At least one photo must exist. At least one other user must be a member of the project.

**Steps:**
1. Open a photo in the lightbox.
2. In the comment input, type **@** followed by the first few letters of a team member's name.
3. Select the person from the dropdown that appears.
4. Finish typing your comment and click **Post**.

**Expected result:** The comment is posted with the person's name highlighted as a mention. The mentioned person may receive a notification.

---

### 10.3 — Open a photo and see existing comments
**What this checks:** Previously posted comments are visible when a photo is opened.

**Setup:** A photo with at least one comment must exist.

**Steps:**
1. Open a photo that has comments on it.
2. Look at the comments section.

**Expected result:** All existing comments appear in the lightbox, with the commenter's name and the comment text visible.

---

## 11. Privacy

### 11.1 — Set a photo to private
**What this checks:** The private flag can be set on a photo.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Private** toggle or checkbox.
3. Turn it on.
4. Save the change.

**Expected result:** The photo is marked as private. A private indicator (lock icon or "Private" label) appears on the photo card or in the lightbox.

---

### 11.2 — Make a private photo visible to all project members again
**What this checks:** The private setting can be toggled off.

**Setup:** At least one photo marked as private must exist.

**Steps:**
1. Open a private photo in the lightbox.
2. Find the **Private** toggle and turn it off.
3. Save the change.

**Expected result:** The private indicator disappears from the photo. The photo is now visible to all project members.

---

## 12. Move

### 12.1 — Move an existing photo from one album to another
**What this checks:** The Move feature reassigns the photo to a new album.

**Setup:** At least one photo and at least two albums must exist.

**Steps:**
1. Select a photo using its checkbox.
2. Find the **Move** option in the toolbar or right-click menu.
3. Select the destination album (e.g. "Progress").
4. Confirm the move.

**Expected result:** The photo no longer appears in its original album when filtered. It appears in the destination album.

---

### 12.2 — Select multiple photos and move them all to a new album in one action
**What this checks:** The bulk move feature works for more than one photo.

**Setup:** At least two photos must exist.

**Steps:**
1. Select two or more photos using checkboxes.
2. Find the **Move** option in the bulk actions bar.
3. Select the destination album.
4. Confirm.

**Expected result:** All selected photos move to the destination album. They appear when filtering by that album.

---

## 13. Rotate

### 13.1 — Rotate a photo to correct its orientation
**What this checks:** The rotate feature changes the photo orientation and saves the result.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Rotate** button or option.
3. Click it once to rotate 90 degrees clockwise.
4. Save or confirm.

**Expected result:** The photo appears rotated 90 degrees. After closing and reopening the lightbox, the rotated orientation is preserved.

---

## 14. Bulk Edit

### 14.1 — Select multiple photos and change their album all at once
**What this checks:** The bulk edit feature can update the album field on many photos simultaneously.

**Setup:** At least two photos must exist.

**Steps:**
1. Select two or more photos by clicking their checkboxes.
2. Find the **Bulk Edit** or **Edit** option in the selection toolbar.
3. Change the **Album** field to **Safety**.
4. Apply the changes.

**Expected result:** All selected photos are now in the "Safety" album. Filtering by Safety shows all the edited photos.

---

### 14.2 — Assign a location to multiple photos at once
**What this checks:** Bulk edit can set the location field across multiple selected photos.

**Setup:** At least two photos must exist.

**Steps:**
1. Select two or more photos.
2. Open **Bulk Edit**.
3. Set the **Location** field to **Roof Level**.
4. Apply.

**Expected result:** All selected photos have their location updated to "Roof Level". Opening each in the lightbox confirms the location.

---

### 14.3 — Assign a trade to multiple photos at once
**What this checks:** The trade field can be bulk-applied across selected photos.

**Setup:** At least two photos must exist.

**Steps:**
1. Select two or more photos.
2. Open **Bulk Edit**.
3. Set the **Trade** field to **Plumbing**.
4. Apply.

**Expected result:** All selected photos show "Plumbing" as their trade in the lightbox details.

---

### 14.4 — Select multiple photos and delete them all at once
**What this checks:** The bulk delete action removes all selected photos and sends them to the recycle bin.

**Setup:** At least two photos must exist.

**Steps:**
1. Select two or more photos using checkboxes.
2. Find the **Delete** option in the bulk actions bar.
3. Confirm the deletion if prompted.

**Expected result:** All selected photos disappear from the main grid. They appear in the Recycle Bin tab.

---

### 14.5 — Use a "Select All" action to select every photo on the page
**What this checks:** A select-all mechanism exists and selects every visible photo.

**Setup:** At least two photos must be visible.

**Steps:**
1. On the Photos page, find a **Select All** checkbox or button (usually in the toolbar).
2. Click it.

**Expected result:** All photo cards show a checkmark or highlighted border indicating selection. The bulk actions bar appears or updates with the total count.

---

## 15. Subscribe / Notifications

### 15.1 — Subscribe to receive notifications when new photos are added
**What this checks:** A user can subscribe to the Photos tool and will be notified of new activity.

**Steps:**
1. Navigate to `/767/photos`.
2. Find the **Subscribe** button or bell icon.
3. Click it to subscribe.

**Expected result:** A confirmation appears that you are now subscribed. The button may change to "Subscribed" or show an active state.

---

### 15.2 — Turn off notifications for the Photos tool
**What this checks:** A subscribed user can unsubscribe and stop receiving notifications.

**Setup:** You must already be subscribed.

**Steps:**
1. Navigate to `/767/photos`.
2. Find the **Subscribed** or active subscribe button.
3. Click it to unsubscribe.

**Expected result:** The button changes back to an inactive/unsubscribed state. You will no longer receive notifications for new photos.

---

## 16. Map View

### 16.1 — View geotagged photos plotted on the project map
**What this checks:** The Map tab shows geotagged photos as pins on a map.

**Setup:** At least one photo with a location or GPS coordinates must exist.

**Steps:**
1. Navigate to `/767/photos`.
2. Click the **Map** tab.
3. Look for photo pins on the map.

**Expected result:** Photos with location data appear as pins on the map. Clicking a pin shows a preview of the photo.

---

### 16.2 — Assign a map location to a photo so it appears as a pin
**What this checks:** A specific map location (coordinates or drawing pin) can be attached to a photo.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Set Location** or **Add to Map** option.
3. Select or enter coordinates or click on a map to place a pin.
4. Save.

**Expected result:** The photo appears as a pin on the Map tab at the specified location.

---

## 17. Timeline View

### 17.1 — Browse photos by date in the Timeline tab
**What this checks:** The Timeline tab groups photos chronologically to show project progress over time.

**Setup:** At least two photos with different dates must exist.

**Steps:**
1. Navigate to `/767/photos`.
2. Click the **Timeline** tab.

**Expected result:** Photos are organized by date, with oldest first (or newest first). The timeline clearly shows when each photo was taken.

---

## 18. Settings / Configuration

### 18.1 — Access the advanced configuration settings for the Photos tool
**What this checks:** A settings or gear icon is accessible from the Photos page and opens a configuration panel.

**Steps:**
1. Navigate to `/767/photos`.
2. Find the **Settings** or gear icon button.
3. Click it.

**Expected result:** A settings page or dialog opens showing configuration options for the Photos tool.

---

### 18.2 — Designate one photo as the project's main cover photo
**What this checks:** A photo can be set as the project cover image, which appears on the project dashboard.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Find the **Set as Project Photo** option.
3. Click it.
4. Navigate to the project home page.

**Expected result:** The selected photo appears as the project cover or hero image on the project overview page.

---

## 19. Permissions

### 19.1 — Verify that a user with read-only access cannot upload photos
**What this checks:** The Upload button is hidden or disabled for users who only have view access.

**Setup:** A second user account with read-only access to the project must be available.

**Steps:**
1. Log in as a user who only has read-only access to the project.
2. Navigate to `/767/photos`.
3. Look for the Upload Photo button.

**Expected result:** The **Upload Photo** button is either hidden or disabled. The user cannot add new photos.

---

### 19.2 — Verify that a read-only user cannot delete photos
**What this checks:** The Delete button in the lightbox is hidden or disabled for read-only users.

**Setup:** A second user account with read-only access must be available.

**Steps:**
1. Log in as a read-only user.
2. Click a photo to open the lightbox.
3. Look for a Delete button.

**Expected result:** The **Delete** button is absent or grayed out. The user cannot delete photos.

---

### 19.3 — Check that a user can see photos they marked as private
**What this checks:** Private photos are still visible to the user who created them.

**Setup:** A photo marked as private by the test user must exist.

**Steps:**
1. Log in as test1@mail.com.
2. Navigate to `/767/photos`.
3. Look for a photo you previously marked as private.

**Expected result:** The private photo is still visible to you (the owner). A lock icon or "Private" label may appear on the card.

---

### 19.4 — Confirm that a photo marked as private does not appear for other users
**What this checks:** Private photos are not visible to team members who did not upload them.

**Setup:** A photo marked as private by user A must exist. A second user B must have access to the project.

**Steps:**
1. As user A, upload and mark a photo as private.
2. Log out and log in as user B.
3. Navigate to `/767/photos`.
4. Look for the private photo.

**Expected result:** The private photo does not appear in user B's grid view.

---

## 20. Integration

### 20.1 — Photo added in Daily Log appears in Photos
**What this checks:** Photos uploaded through the Daily Log are also accessible from the Photos page.

**Setup:** The Daily Log tool must be enabled for the project.

**Steps:**
1. Navigate to the **Daily Log** for the project.
2. Create or edit a log entry.
3. Attach a photo to the log entry.
4. Save the log entry.
5. Navigate to `/767/photos`.

**Expected result:** The photo attached to the Daily Log entry appears in the Photos tool grid.

---

### 20.2 — Photos added from Inspections appear in Photos
**What this checks:** Cross-tool photo sharing — photos from Inspections flow into the Photos library.

**Setup:** The Inspections tool must be enabled.

**Steps:**
1. Navigate to the **Inspections** tool.
2. Open or create an inspection item.
3. Attach a photo.
4. Save.
5. Navigate to `/767/photos`.

**Expected result:** The photo attached in Inspections now appears in the Photos grid.

---

### 20.3 — Photos added from Observations appear in Photos
**What this checks:** Observations photos cross-populate into the Photos library.

**Setup:** The Observations tool must be enabled.

**Steps:**
1. Navigate to the **Observations** tool.
2. Open or create an observation.
3. Attach a photo.
4. Save.
5. Navigate to `/767/photos`.

**Expected result:** The photo from the Observation appears in the Photos grid.

---

### 20.4 — Photos added from Punch List appear in Photos
**What this checks:** Cross-tool photo integration between Punch List and Photos.

**Setup:** The Punch List tool must be enabled.

**Steps:**
1. Navigate to the **Punch List** tool.
2. Open a punch list item.
3. Attach a photo.
4. Save.
5. Navigate to `/767/photos`.

**Expected result:** The photo from the punch list item appears in the Photos grid.

---

### 20.5 — Link a photo to a specific spot on a project drawing
**What this checks:** Photos can be pinned to drawing sheets, and the pin is visible on the drawing.

**Setup:** The Drawings tool must have at least one drawing sheet uploaded.

**Steps:**
1. Navigate to the **Drawings** tool.
2. Open a drawing sheet.
3. Find the option to add a photo pin to the drawing.
4. Click a location on the drawing and select a photo from the Photos library.
5. Save.

**Expected result:** A photo pin marker appears at the selected spot on the drawing. Clicking the pin shows the linked photo.

---

## 21. Edge Cases

### 21.1 — Upload a photo with the same filename as an existing photo
**What this checks:** Duplicate filenames do not overwrite existing photos — each upload creates a separate record.

**Setup:** Upload a photo, note its filename, then upload another photo with the exact same filename.

**Steps:**
1. Upload a photo named **test.jpg**.
2. Upload another photo also named **test.jpg**.
3. Look at the photo grid.

**Expected result:** Both photos appear as separate items in the grid. The second upload does not overwrite the first.

---

### 21.2 — Upload a photo and set an extremely long title
**What this checks:** The UI handles long titles gracefully — truncating on the card without breaking the layout.

**Setup:** At least one photo must exist.

**Steps:**
1. Open a photo in the lightbox.
2. Edit the title to be 200+ characters long.
3. Save.
4. Close the lightbox and look at the grid.

**Expected result:** The photo card truncates the long title with an ellipsis (...). The card layout does not break or overflow.

---

### 21.3 — Confirm that photos are still visible after refreshing the browser
**What this checks:** The photo data is properly saved to the database and not lost on page reload.

**Setup:** At least one photo must have been uploaded.

**Steps:**
1. Upload a photo.
2. Confirm it appears in the grid.
3. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page.

**Expected result:** After refreshing, the same photo is still visible in the grid. No data was lost.

---

### 21.4 — Confirm that edited photo metadata survives a page refresh
**What this checks:** The PUT/update API correctly saves all metadata fields and they are not reverted on reload.

**Setup:** A photo must have been edited with a title, description, location, and trade set.

**Steps:**
1. Open a photo and set title, description, location, and trade.
2. Save.
3. Press **Ctrl+R** to refresh.
4. Open the same photo again.

**Expected result:** All previously set fields (title, description, location, trade) are still showing the saved values. Nothing was reverted.

---

### 21.5 — Try to submit the upload dialog without selecting any files
**What this checks:** The Upload button is disabled or shows an error when no files are in the queue.

**Steps:**
1. Click **Upload Photo** to open the dialog.
2. Do not select any files.
3. Observe the state of the **Upload Photo** button.

**Expected result:** The **Upload Photo** button is disabled (grayed out) and cannot be clicked. No upload is attempted.

---

### 21.6 — Close the lightbox using the keyboard (Escape key)
**What this checks:** Standard keyboard shortcuts work in the lightbox for accessibility.

**Setup:** A photo must be open in the lightbox.

**Steps:**
1. Click a photo to open the lightbox.
2. Press the **Escape** key on your keyboard.

**Expected result:** The lightbox closes and the photo grid is shown again.

---

### 21.7 — Verify the Photos page looks correct on a mobile-sized screen
**What this checks:** The photo grid and toolbar adapt to narrow screens without horizontal scrolling or overlapping elements.

**Steps:**
1. Resize your browser to a mobile width (about 375px wide) or use browser DevTools mobile simulation.
2. Navigate to `/767/photos`.

**Expected result:** The photo grid switches to 1–2 columns. The toolbar wraps or stacks vertically. The tabs scroll horizontally if needed. No content is cut off or overlapping.

---

### Daily Log
Source: `docs/testing/daily-log-scenarios.md`

### 1.1 — Open the Daily Log page
**What this checks:** The Daily Log list page loads without errors and shows existing records.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Click **"Daily Log"** in the left sidebar of the project
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of daily log entries is visible with columns for Date, Weather, and Created By. No error messages appear.

---

### 1.2 — Open a daily log detail page
**What this checks:** Clicking a log entry opens the detail page.

**Setup:** The Daily Log list must have at least one existing entry.

**Steps:**
1. Open the Daily Log page
2. Click on the date of any log entry in the list
3. Wait for the page to finish loading

**Expected result:** The detail page opens showing the log entry data. No error messages appear.

---

## 2. Create

### 2.1 — Create a new log entry for today
**What this checks:** A user can create a new daily log entry and it appears in the list.

**Steps:**
1. Open the Daily Log page
2. Click the **New Log Entry** button (top right)
3. In the **Date** field, enter: **2026-04-08**
4. In the **Weather** field, type: **Sunny, 68°F, light breeze**
5. Click **Create** (or Save)
6. Wait for the page to stop loading

**Expected result:** The new log entry appears in the list with the date "Apr 8, 2026". No error messages are shown.

---

### 2.2 — Try to create a log entry without a date
**What this checks:** The form prevents saving when the required Date field is empty.

**Steps:**
1. Open the Daily Log page
2. Click the **New Log Entry** button
3. Leave the **Date** field completely empty
4. Click **Create** (or Save)

**Expected result:** An error message appears near the Date field (e.g. "Date is required"). The record is NOT created. The form stays open.

---

### 2.3 — Create a log entry with notes
**What this checks:** Weather and notes fields can be filled in and are saved correctly.

**Steps:**
1. Open the Daily Log page
2. Click the **New Log Entry** button
3. Enter date: **2026-04-08**
4. In the **Weather** field, type: **Overcast, 55°F**
5. In the Notes/Description field, type: **Concrete poured for foundation**
6. Click **Create** and wait for the page to stop loading

**Expected result:** The new log entry appears in the list for Apr 8, 2026. No error message appears.

---

## 3. Edit

### 3.1 — Edit the weather on an existing log entry
**What this checks:** Users can edit a log entry and the updated value is saved.

**Setup:** There must be at least one existing daily log entry.

**Steps:**
1. Open the Daily Log page
2. Click on any log entry to open it
3. Click the **Edit** button
4. Clear the **Weather** field and type: **Partly cloudy, 72°F**
5. Click **Save**
6. Wait for the page to stop loading

**Expected result:** The log entry now shows the updated weather "Partly cloudy, 72°F". A success message (toast) briefly appears.

---

### 3.2 — Edited changes persist after page refresh
**What this checks:** Saved changes are stored in the database, not just shown temporarily in the browser.

**Setup:** Complete scenario 3.1 first (edit weather and save it).

**Steps:**
1. After saving an edit, stay on the detail page
2. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page
3. Wait for the page to load

**Expected result:** The updated weather and any other changes are still shown after the refresh. No data reverted to old values.

---

## 4. Manpower

> **What is manpower?** Manpower means the workers on site that day. Each entry records a trade (type of worker — e.g. Electrician, Plumber, Concrete worker), how many workers were present, and how many hours they worked.

### 4.1 — Add a manpower entry (worker count) to a log
**What this checks:** Users can record workers on site for a specific trade.

**Setup:** There must be at least one existing daily log entry.

**Steps:**
1. Open any daily log detail page
2. Find the **Manpower** section (workers on site)
3. Click **Add Manpower** (or the + button)
4. In the **Trade** field, type: **Concrete**
5. In the **Workers** field, type: **8**
6. In the **Hours Worked** field, type: **9**
7. Click **Save**

**Expected result:** A new manpower row appears showing Trade = Concrete, Workers = 8, Hours = 9. No error message appears.

---

### 4.2 — Try to add manpower without a worker count
**What this checks:** The form prevents saving a manpower entry when workers count is missing.

**Setup:** There must be at least one existing daily log entry.

**Steps:**
1. Open any daily log detail page
2. Click **Add Manpower**
3. Fill in the **Trade** field: **Electrician**
4. Leave the **Workers Count** field empty
5. Click **Save**

**Expected result:** An error message appears (e.g. "Workers count is required"). The manpower entry is NOT saved.

---

## 5. Equipment

> **What is equipment?** Equipment means large machines used on the site that day — such as excavators (digging machines), cranes, concrete mixers, or forklifts. Each entry records the machine name and how many hours it was running.

### 5.1 — Add equipment used on site
**What this checks:** Users can record equipment that was active on site that day.

**Setup:** There must be at least one existing daily log entry.

**Steps:**
1. Open any daily log detail page
2. Find the **Equipment** section
3. Click **Add Equipment** (or the + button)
4. In the **Equipment Name** field, type: **Excavator CAT 320**
5. In the **Hours Operated** field, type: **7**
6. Click **Save**

**Expected result:** A new equipment row appears showing Equipment = Excavator CAT 320, Hours Operated = 7. No error message appears.

---

## 6. Notes

### 6.1 — Add a work note to a log entry
**What this checks:** Users can add a written description of work performed that day.

**Setup:** There must be at least one existing daily log entry.

**Steps:**
1. Open any daily log detail page
2. Find the **Notes** section
3. Click **Add Note** (or the + button)
4. In the **Category** field, select or type: **Work Performed**
5. In the **Description** field, type: **Concrete poured for foundation**
6. Click **Save**

**Expected result:** The note "Concrete poured for foundation" appears in the notes list under category "Work Performed". No error message appears.

---

## 7. Delete

### 7.1 — Delete a daily log entry
**What this checks:** A daily log entry can be deleted and disappears from the list afterwards.

**Setup:** Create a log entry for testing purposes before running this scenario.

**Steps:**
1. Open the Daily Log page
2. Find a log entry you created for testing (e.g. the one from scenario 2.1)
3. Click the three-dot menu (or right-click) on that row
4. Click **Delete**
5. Confirm the deletion in the dialog that appears
6. Wait for the page to stop loading

**Expected result:** The deleted log entry is no longer visible in the list. A success message (toast) briefly appears.

---

## 8. Filter / Search

### 8.1 — Search for a log entry by date
**What this checks:** The search box filters the list to matching records.

**Setup:** The Daily Log list must have at least two entries with different dates.

**Steps:**
1. Open the Daily Log page
2. Click the search box (shows a magnifying glass icon or says "Search by date or author...")
3. Type: **2026-04-08**
4. Wait for the list to filter

**Expected result:** The list narrows to show only entries matching the date "2026-04-08". Unrelated entries are no longer visible. Clearing the search box brings all records back.

---

### 8.2 — Sort log entries by date (oldest first)
**What this checks:** Clicking the Date column header reorders the list.

**Setup:** The Daily Log list must have at least two entries with different dates.

**Steps:**
1. Open the Daily Log page
2. Click the **"Date"** column header once to sort ascending (oldest first)
3. Observe the order of entries in the list

**Expected result:** Log entries are reordered so the oldest date appears at the top and the newest date appears at the bottom.

---

### Meetings
Source: `docs/testing/meetings-scenarios.md`

### 1.1 — Open the Meetings page
**What this checks:** The Meetings list page loads without errors and shows existing meeting records. A meeting record is a log of a real project meeting — who attended, what was discussed, and what decisions were made.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Go to: http://localhost:3000/767/meetings
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of meetings is visible with columns for Title, Date, Project, Description, Participants, and Links. No error messages appear. The page title says "Meetings".

---

### 1.2 — Open a meeting detail page
**What this checks:** Clicking a meeting record opens a detail page with all the meeting information — summary, action items, decisions, transcript, and more.

**Setup:** The Meetings list must have at least one existing record.

**Steps:**
1. Open the Meetings page at /767/meetings
2. Click the title of any meeting in the list
3. Wait for the page to finish loading

**Expected result:** The meeting detail page opens. The meeting title is shown at the top. Sections visible include: Summary, Action Items, Decisions, Risks, and Transcript (or similar). No error messages appear.

---

## 2. Create

### 2.1 — Create a new meeting with required fields only
**What this checks:** A user can log a new meeting with just a title and it appears in the list.

**Steps:**
1. On the Meetings page, click the **New Meeting** or **Add Meeting** button (top right)
2. In the **Title** field, type: **Weekly Coordination Meeting**
3. Click the **Save** or **Create** button
4. Wait for the page to stop loading

**Expected result:** A success message appears. The new meeting "Weekly Coordination Meeting" appears in the list. No error messages are shown.

---

### 2.2 — Create a meeting with all fields filled in
**What this checks:** All optional fields — date, duration, participants, category, description — save correctly and appear on the detail page.

**Steps:**
1. Click **New Meeting**
2. In the **Title** field, type: **Full Fields Meeting Test**
3. In the **Date** field, enter: **2026-04-08**
4. In the **Duration** field, type: **60**
5. In the **Participants** field, type: **Alice Smith, Bob Jones**
6. In the **Category** field, type: **Project**
7. In the **Description** field, type: **This is a test meeting with all fields filled in**
8. Click **Save**
9. Find "Full Fields Meeting Test" in the list and click it to open

**Expected result:** The detail page shows all saved values: date 2026-04-08, duration 60 minutes, participants Alice Smith and Bob Jones, category Project, and the description. No fields are blank.

---

### 2.3 — Try to create a meeting without a title
**What this checks:** The form prevents saving when the required Title field is left empty.

**Steps:**
1. Click **New Meeting**
2. Leave the **Title** field completely empty
3. Click the **Save** or **Create** button

**Expected result:** An error message appears near the Title field (e.g. "Title is required"). The record is NOT created. The form stays open.

---

## 3. Edit

### 3.1 — Edit the title of a meeting directly in the table
**What this checks:** Hovering over the title cell and clicking the pencil icon lets you edit the title inline without leaving the list page.

**Setup:** The Meetings list must have at least one existing record.

**Steps:**
1. On the Meetings page, hover your mouse over the title of any meeting in the table
2. A pencil icon appears — click it
3. Clear the text and type: **Updated Meeting Title**
4. Press **Enter** or click outside the field to save

**Expected result:** The title in the table updates to "Updated Meeting Title" immediately. A success notification briefly appears. No page reload is required.

---

### 3.2 — Edit the date of a meeting directly in the table
**What this checks:** Clicking the date cell opens a date input and the new date is saved.

**Setup:** The Meetings list must have at least one existing record.

**Steps:**
1. On the Meetings page, click the date cell of any meeting row
2. A date input appears — change the date to: **2026-04-08**
3. Press **Enter** or click outside to save

**Expected result:** The date in the table updates to show April 8, 2026. A success notification briefly appears.

---

### 3.3 — Pressing Escape cancels an inline edit
**What this checks:** Pressing the Escape key while editing a cell discards the change and restores the original value.

**Setup:** The Meetings list must have at least one existing record.

**Steps:**
1. Click the pencil icon on any meeting title to start editing
2. Type some random text: **DO NOT SAVE THIS**
3. Press the **Escape** key

**Expected result:** The cell stops editing and shows the original title. "DO NOT SAVE THIS" does not appear anywhere.

---

## 4. Delete

### 4.1 — Delete a meeting using the row action menu
**What this checks:** A meeting record can be deleted from the list and disappears afterwards.

**Setup:** Create a meeting named **Delete Me Meeting** before running this scenario.

**Steps:**
1. On the Meetings page, hover over the row for **Delete Me Meeting**
2. Click the three-dot action menu that appears on the right side of the row
3. Click **Delete**
4. Confirm the deletion in the dialog that appears
5. Wait for the page to stop loading

**Expected result:** The record "Delete Me Meeting" is no longer visible in the list. A success message (toast) briefly appears.

---

## 5. Filters & Search

### 5.1 — Search for a meeting by its title
**What this checks:** The search box filters the list to only show meetings whose title or participants match the typed text.

**Setup:** The Meetings list must have at least two records with different titles.

**Steps:**
1. On the Meetings page, find the search box in the toolbar (usually shows a magnifying glass or says "Search...")
2. Type part of a known meeting title, e.g.: **Weekly**
3. Wait for the list to filter

**Expected result:** The list narrows to show only records whose title or participants contain "Weekly". Records with unrelated titles are hidden. Clearing the search box brings all records back.

---

### 5.2 — Filter meetings to a specific year
**What this checks:** The Year filter shows only meetings that happened in the chosen year.

**Setup:** At least one meeting must exist with a date set.

**Steps:**
1. Click the **Filters** button in the toolbar
2. Find the **Year** filter
3. Select the year **2026**
4. Apply or close the filter panel

**Expected result:** Only meetings with dates in 2026 appear in the list. Meetings from other years are hidden.

---

### 5.3 — Filter meetings by category
**What this checks:** The Category filter narrows the list to meetings tagged with the chosen category.

**Setup:** At least one meeting must have a Category set.

**Steps:**
1. Click the **Filters** button
2. Find the **Category** filter
3. Select a category that at least one meeting has (e.g. **Project**)
4. Apply or close the filter panel

**Expected result:** Only meetings tagged with the selected category appear. All other meetings are hidden.

---

## 6. Column Visibility

### 6.1 — Toggle column visibility using the column selector
**What this checks:** Clicking the column visibility control lets you hide a column and it disappears from the table.

**Steps:**
1. On the Meetings page, find the column selector button in the toolbar (looks like columns or an eye icon)
2. Click it to open the column list
3. Uncheck **Description** to hide it
4. Close the selector

**Expected result:** The Description column disappears from the table. All other columns still appear correctly. No error messages appear.

---

## 7. Export

### 7.1 — Download the meetings list as a spreadsheet
**What this checks:** Clicking the export icon downloads a CSV file that can be opened in Excel or Google Sheets.

**Steps:**
1. On the Meetings page, find the export (download) icon in the toolbar
2. Click it and wait for the download to start

**Expected result:** A CSV file downloads. Opening it shows columns for Title, Date, Project, Description, Participants, and other visible columns. Each row matches a meeting in the list.

---

## 8. Detail Page

### 8.1 — Meeting detail page shows action items extracted from the transcript
**What this checks:** When a meeting has a transcript, the action items (tasks someone committed to doing) are displayed on the detail page.

**Setup:** A meeting must exist that was imported with a transcript (source type: Fireflies or uploaded file). Look for meetings with the transcript icon in the Links column.

**Steps:**
1. Open the Meetings page
2. Click on any meeting that has a transcript (look for the transcript icon in the Links column)
3. On the detail page, look for the **Action Items** or **Tasks** section

**Expected result:** The Action Items section shows at least one task extracted from the meeting. Each task has a description. No error messages appear.

---

### 8.2 — Meeting detail page shows key decisions from the transcript
**What this checks:** Decisions captured from the meeting transcript appear on the detail page.

**Setup:** A meeting must exist that was imported with a transcript.

**Steps:**
1. Open any meeting that has a transcript
2. Find the **Decisions** section on the detail page

**Expected result:** The Decisions section shows at least one decision extracted from the meeting. Each decision has a description. No error message appears.

---

### 8.3 — Detail page shows links to other recent meetings for the same project
**What this checks:** A list of related meetings from the same project is shown on the detail page, making it easy to navigate between meetings.

**Setup:** At least two meetings must exist for project 767.

**Steps:**
1. Open any meeting detail page
2. Look for a **Related Meetings** or **Recent Meetings** panel (usually on the right side or bottom)
3. Click one of the related meeting links

**Expected result:** A list of other meetings for the same project is shown. Clicking a related meeting link navigates to that meeting's detail page.

---

## 9. Edge Cases

### 9.1 — Meetings page shows a helpful message when no meetings exist
**What this checks:** A useful empty state — not a blank screen — is shown when there are no meetings on a project.

**Steps:**
1. Navigate to the Meetings page for a project that has no meetings, or apply a search that matches nothing
2. Look at the main content area

**Expected result:** A message appears such as "No meetings found" or similar. A button to create a new meeting may also appear. No blank white space or error message is shown.

---

### RFIs
Source: `docs/testing/rfis-scenarios.md`

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

### Submittals
Source: `docs/testing/submittals-scenarios.md`

### 1.1 — Open the Submittals page
**What this checks:** The Submittals list page loads without errors and shows existing records.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Navigate to http://localhost:3000/767/submittals
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of submittals is visible with columns for Number, Title, Status, Type, Division, and Due Date. No error messages appear.

---

### 1.2 — Open a submittal detail page
**What this checks:** Clicking a record opens the detail view with all tabs visible.

**Setup:** The Submittals list must have at least one existing record.

**Steps:**
1. Open the Submittals page (`/767/submittals`)
2. Click on the title of any submittal in the list
3. Wait for the page to finish loading

**Expected result:** The detail page opens. Tabs are visible (General, Workflow, Distributions, Attachments, History). The submittal title, number, and status are shown at the top. No error messages appear.

---

### 1.3 — View the Ball In Court tab
**What this checks:** The "Ball In Court" tab filters the list to submittals currently awaiting action from a specific person or team. Think of "ball in court" like a tennis rally — whoever has the ball is the one who needs to act next.

**Setup:** At least one submittal must have a Ball In Court value filled in (e.g. "Architect").

**Steps:**
1. Open the Submittals page (`/767/submittals`)
2. Click the **Ball In Court** tab at the top of the table
3. Wait for the list to update

**Expected result:** Only submittals that have a Ball In Court value are displayed. Submittals with no Ball In Court value are hidden. No error message appears.

---

## 2. Create

### 2.1 — Create a new submittal with required fields
**What this checks:** A user can create a submittal and it appears in the list.

**Steps:**
1. Open the Submittals page (`/767/submittals`)
2. Click the **Add Submittal** button (top right)
3. In the **Number** field, type: **TEST-001**
4. In the **Title** field, type: **Concrete Mix Design**
5. Leave Status as **Draft**
6. Click **Create Submittal**
7. Wait for the dialog to close

**Expected result:** The new submittal "Concrete Mix Design" appears in the list with number TEST-001 and status Draft. No error messages are shown.

---

### 2.2 — Create fails when Title is empty
**What this checks:** The form prevents saving when the required Title field is blank.

**Steps:**
1. Open the Submittals page
2. Click **Add Submittal**
3. Fill in **Number**: **TEST-VAL-001**
4. Leave the **Title** field completely empty
5. Click **Create Submittal**

**Expected result:** An error message appears near the Title field saying "Title is required". The submittal is NOT created. The dialog stays open.

---

### 2.3 — Create fails when Number is empty
**What this checks:** The form prevents saving when the required Number field is blank.

**Steps:**
1. Open the Submittals page
2. Click **Add Submittal**
3. Leave the **Number** field completely empty
4. Type **Doors and Hardware** in the **Title** field
5. Click **Create Submittal**

**Expected result:** An error message appears near the Number field saying "Number is required". The submittal is NOT created. The dialog stays open.

---

### 2.4 — Create fails when submittal number already exists
**What this checks:** The system prevents two submittals from having the same number on the same project.

**Setup:** There must already be a submittal with number TEST-001 (created in scenario 2.1).

**Steps:**
1. Open the Submittals page
2. Click **Add Submittal**
3. In **Number**, type: **TEST-001** (same as the one created in scenario 2.1)
4. In **Title**, type: **Duplicate Number Test**
5. Click **Create Submittal**

**Expected result:** An error message appears saying the submittal number already exists for this project. The submittal is NOT created.

---

### 2.5 — Create a submittal with all optional fields filled
**What this checks:** All form fields (type, division, specification section, due date, lead time, ball in court, description) can be saved correctly.

**Steps:**
1. Open the Submittals page
2. Click **Add Submittal**
3. Enter **Number**: **TEST-FULL-001**
4. Enter **Title**: **Steel Reinforcing Shop Drawings**
5. Enter **Specification Section**: **03-2000 - Concrete Reinforcing**
6. Enter **Division**: **Division 3**
7. Enter **Submittal Type**: **Shop Drawing**
8. Set **Status**: **Open**
9. Set **Final Due Date**: **2026-06-01**
10. Enter **Lead Time (days)**: **14**
11. Enter **Ball In Court**: **Structural Engineer**
12. Enter **Description**: **Shop drawings for all reinforcing steel per structural drawings.**
13. Click **Create Submittal**
14. Find "Steel Reinforcing Shop Drawings" in the list and click to open

**Expected result:** The detail page shows all saved values: Spec Section = 03-2000 - Concrete Reinforcing, Division = Division 3, Type = Shop Drawing, Status = Open, Due Date = 6/1/2026, Lead Time = 14, Ball In Court = Structural Engineer. No fields are blank or reverted.

---

## 3. Edit

### 3.1 — Edit the title of an existing submittal
**What this checks:** Users can update a submittal and the new value is saved.

**Setup:** There must be at least one existing submittal.

**Steps:**
1. Open the Submittals page
2. Click any submittal to open its detail page
3. Click the **Edit** button (pencil icon, top right)
4. Clear the Title field and type: **Updated Submittal Title Test**
5. Click **Update Submittal**
6. Wait for the dialog to close

**Expected result:** The detail page now shows the title "Updated Submittal Title Test". A success message (toast) briefly appears. The old title is no longer visible.

---

### 3.2 — Edits persist after page refresh
**What this checks:** Saved changes are stored in the database, not just shown temporarily in the browser.

**Setup:** Complete scenario 3.1 first (edit a title and save it).

**Steps:**
1. After saving an edit, stay on the detail page
2. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page
3. Wait for the page to reload

**Expected result:** The updated title and any other changes are still shown after the refresh. No data reverted to the old values.

---

### 3.3 — Cancel discards unsaved edits
**What this checks:** Unsaved edits are discarded when the user clicks Cancel.

**Setup:** There must be at least one existing submittal.

**Steps:**
1. Open any submittal detail page
2. Click the **Edit** button
3. Change the Title to something random: **DO NOT SAVE THIS**
4. Click **Cancel** (instead of Update Submittal)

**Expected result:** The dialog closes and the original title is still shown. "DO NOT SAVE THIS" does not appear anywhere on the page.

---

## 4. Status Workflow

Submittals move through a defined review process. The four statuses are:
- **Draft** — just created, not yet sent out
- **Open** — being prepared for review
- **Distributed** — sent to the architect or engineer for their review and comments
- **Closed** — review is complete; the submittal is finalized

### 4.1 — Change status from Draft to Open
**What this checks:** The status workflow moves forward from Draft to Open.

**Setup:** There must be at least one submittal with status Draft.

**Steps:**
1. Open any submittal with status **Draft**
2. Click the **Edit** button
3. In the **Status** dropdown, select **Open**
4. Click **Update Submittal**
5. Wait for the dialog to close

**Expected result:** The status badge on the detail page now shows "Open". No error message appears.

---

### 4.2 — Change status to Distributed
**What this checks:** A submittal can be marked as Distributed, meaning it has been sent to the architect or engineer for review.

**Setup:** There must be at least one submittal with status Open.

**Steps:**
1. Open a submittal with status **Open**
2. Click the **Edit** button
3. In the **Status** dropdown, select **Distributed**
4. Click **Update Submittal**
5. Wait for the dialog to close

**Expected result:** The status badge now shows "Distributed". No error message appears.

---

### 4.3 — Close a submittal
**What this checks:** A submittal can be fully closed once the review process is complete.

**Setup:** There must be at least one submittal with status Distributed.

**Steps:**
1. Open a submittal with status **Distributed**
2. Click the **Edit** button
3. In the **Status** dropdown, select **Closed**
4. Click **Update Submittal**
5. Wait for the dialog to close

**Expected result:** The status badge now shows "Closed". No error message appears. The submittal still appears in the main list (it is not deleted).

---

## 5. Attachments

### 5.1 — Upload a file attachment
**What this checks:** A file can be attached to a submittal and is visible afterwards.

**Setup:**
- Have a small file ready to upload (any image or PDF, under 5 MB)
- There must be at least one existing submittal

**Steps:**
1. Open any submittal detail page
2. Click the **Attachments** tab
3. Click **Upload** or drag a file onto the upload area
4. Select a small file from your computer
5. Wait for the upload to complete

**Expected result:** The uploaded file appears in the attachments list with its filename. No error message appears.

---

## 6. History

### 6.1 — View submittal change history
**What this checks:** The History tab shows a log of edits made to the submittal.

**Setup:** Make at least one edit to a submittal before running this scenario.

**Steps:**
1. Open any submittal that has been edited at least once
2. Click the **History** tab
3. Scroll through the history entries

**Expected result:** At least one history entry is visible. Each entry shows what was changed and when. No error message appears.

---

## 7. Filter / Search

### 7.1 — Search for a submittal by title
**What this checks:** The search box filters the list to matching records.

**Setup:** The Submittals list must have at least two records with different titles.

**Steps:**
1. Open the Submittals page (`/767/submittals`)
2. Click the search box (shows "Search submittals...")
3. Type part of a known submittal title, e.g. **Concrete**
4. Wait for the list to filter

**Expected result:** The list narrows to show only records whose title contains "Concrete". Records with unrelated titles are no longer visible. Clearing the search box brings all records back.

---

### 7.2 — Filter submittals by status
**What this checks:** The status filter correctly narrows the list.

**Setup:** The list must have submittals in at least two different statuses.

**Steps:**
1. Open the Submittals page
2. Click the **Filters** button in the toolbar
3. Select **Status** and choose **Open**
4. Wait for the list to update

**Expected result:** Only submittals with status Open are shown. Submittals with other statuses (Draft, Distributed, Closed) are hidden. Removing the filter brings all records back.

---

## 8. Delete / Recycle Bin

### 8.1 — Delete a submittal (moves to Recycle Bin)
**What this checks:** Deleting a submittal removes it from the main list and places it in the Recycle Bin (it is not permanently deleted).

**Setup:** Create a submittal named "Delete Me Submittal" before running this scenario.

**Steps:**
1. Open the Submittals page
2. Find the row titled **Delete Me Submittal**
3. Click the three-dot menu (⋯) on that row
4. Click **Delete**
5. Confirm the deletion in the dialog that appears
6. Wait for the page to stop loading

**Expected result:** The record "Delete Me Submittal" is no longer visible in the main Items list. Clicking the Recycle Bin tab shows the deleted submittal. A success message (toast) briefly appears.

---

### 8.2 — View deleted submittals in the Recycle Bin
**What this checks:** The Recycle Bin tab shows previously deleted records.

**Setup:** Complete scenario 8.1 first.

**Steps:**
1. Open the Submittals page (`/767/submittals`)
2. Click the **Recycle Bin** tab at the top of the table
3. Wait for the list to load

**Expected result:** The Recycle Bin tab shows the submittal deleted in scenario 8.1. It is not visible on the main Items tab. No error messages appear.

---

## 9. Privacy

### 9.1 — Mark a submittal as Private
**What this checks:** The Private checkbox can be checked and saved. Private submittals are only visible to project admins and anyone on the distribution list — not the full project team.

**Steps:**
1. Open the Submittals page
2. Click **Add Submittal**
3. Enter **Number**: **PRIV-001** and **Title**: **Private Submittal Test**
4. Scroll down to the Content section
5. Check the box labelled **Private (visible only to admins and distribution list)**
6. Click **Create Submittal**
7. Find "Private Submittal Test" in the list and click to open

**Expected result:** The submittal detail page shows the private flag is enabled. No error messages appear.

---

### Punch List
Source: `docs/testing/punch-list-scenarios.md`

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
