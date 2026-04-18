# Change Events - Frontend Test Scenarios

**Generated from:** PRPs/change-events/prp-change-events.md + PRPs/change-events/AUDIT.md
**Date:** 2026-04-17
**Total scenarios:** 58
**Ready to test:** 51 | **Blocked (not yet implemented):** 7

---

## Quick Reference

| Group | Scenarios | Ready | Blocked |
|-------|-----------|-------|----------|
| 1. Navigation & Access | 5 | 5 | 0 |
| 2. Create | 8 | 8 | 0 |
| 3. Edit | 6 | 5 | 1 |
| 4. Detail View | 7 | 5 | 2 |
| 5. Status Workflows | 5 | 5 | 0 |
| 6. List View Features | 8 | 7 | 1 |
| 7. Row Actions | 5 | 5 | 0 |
| 8. Business Rules & Calculations | 6 | 4 | 2 |
| 9. Integration with Other Tools | 5 | 4 | 1 |
| 10. Error States | 3 | 3 | 0 |
| **Total** | **58** | **51** | **7** |

---

## Scenarios

---

## Group 1: Navigation & Access

### Scenario: Navigate to Change Events from project sidebar
**Status:** Ready to test

**Given** a user is on any page within a project
**When** the user clicks Change Events in the project sidebar navigation
**Then** the Change Events list view loads, scoped to the current project, with the page title Change Events and the list table visible

**Edge cases:**
- No change events exist: an empty state is shown with a prompt to create the first one
- User has no project access: redirected to an unauthorized page or the projects list

---

### Scenario: Change Events page loads correct layout
**Status:** Ready to test

**Given** the user navigates to the Change Events tool
**When** the page finishes loading
**Then** the page displays: a title header, a toolbar with Create New Change Event button, column group headers (Change Event / Revenue / Cost), a list table with all defined columns, tab filters (Line Items, No Line Items, RFQs, Recycle Bin), and a grand totals footer row

**Edge cases:**
- Slow network: a loading skeleton or spinner is shown while data fetches
- No data: the footer totals show $0 for all financial columns

---

### Scenario: Empty state displays when no change events exist
**Status:** Ready to test

**Given** a project has zero change events
**When** the user opens the Change Events tool
**Then** an empty state is shown with a message indicating no change events exist and a clear call-to-action to create the first one

**Edge cases:**
- Navigating to the Line Items tab with no CEs: empty state shown, not an error
- After deleting the last change event: list transitions to empty state without a page reload

---

### Scenario: Correct tabs are visible in the list view
**Status:** Ready to test

**Given** the Change Events list view is loaded with at least one change event that has line items
**When** the user looks at the tab bar above the table
**Then** four tabs are visible: Line Items, No Line Items, RFQs, and Recycle Bin

**Edge cases:**
- Line Items tab: only change events with at least one line item are shown
- No Line Items tab: only change events with zero line items are shown
- RFQs tab: only change events with at least one linked RFQ are shown
- Recycle Bin tab: soft-deleted change events shown with a restore option

---

### Scenario: All expected columns are visible in the list
**Status:** Ready to test

**Given** the Change Events list view is open with records present
**When** the user scans the column headers
**Then** the following columns are visible under their correct group headers:
- Under Change Event: Number-Title, Status, Scope, Type, Change Reason, Origin, Created
- Under Revenue: Prime PCO (amount), Prime PCO Title
- Under Cost: Cost ROM, RFQ Title, Commitment (amount), Commitment Title

**Edge cases:**
- Columns with no data show blank or dash, not an error
- Currency columns format values with $ and 2 decimal places

---

## Group 2: Create

### Scenario: Happy path - create a change event with all fields
**Status:** Ready to test

**Given** the user is on the Change Events list view
**When** the user clicks Create New Change Event, fills in Title, selects Origin, Type, Change Reason, Scope, Line Item Revenue Source, Prime Contract for Markup, adds a description, and clicks Save
**Then** the new change event is saved, the user is taken to the detail view, the auto-generated Number is visible (e.g., 001), the status badge shows Open, and all entered fields match what was saved

**Edge cases:**
- No Title entered: form still saves (Title not required per PRP); list shows blank title cell
- All optional fields left blank: record saves with defaults (Status=Open, Type=Allowance, Scope=TBD)

---

### Scenario: Create with minimum fields only
**Status:** Ready to test

**Given** the Create Change Event form is open
**When** the user enters only a Title and clicks Save
**Then** the change event is created with auto-generated Number, Status=Open, Type=Allowance (default), Scope=TBD (default), and blank optional fields; user is redirected to detail view

**Edge cases:**
- Saving with no fields at all: record saves with system defaults; Number is auto-assigned

---

### Scenario: Auto-generated number is sequential per project
**Status:** Ready to test

**Given** a project has 3 existing change events numbered 001, 002, 003
**When** the user creates a new change event
**Then** the new change event is auto-assigned number 004; visible in the header and list

**Edge cases:**
- Number can be manually overridden in the Number field
- Deleted CE numbers are not reused for new records

---

### Scenario: Dropdown fields load correct options on the create form
**Status:** Ready to test

**Given** the Create Change Event form is open
**When** the user clicks each dropdown field
**Then** all dropdowns load with correct options:
- Status: Open, Closed (and possibly Pending Approval, Approved, Rejected per product enhancements)
- Scope: TBD, In Scope, Out of Scope, Allowance
- Type: Owner Change, Design Change, Allowance, Scope Gap, Unforeseen Condition, Value Engineering (and more per company config)
- Change Reason: relevant subcategory options
- Origin: Owner, Design Team, Field, Subcontractor, Unforeseen Condition (configurable per company)
- Line Item Revenue Source: Match Revenue to Latest Cost, Match Revenue to Latest Price, Manual Entry
- Prime Contract for Markup: loads the project's active prime contracts

**Edge cases:**
- No prime contracts on project: the Prime Contract for Markup field is empty or shows a placeholder
- Type and Change Reason options vary per company configuration

---

### Scenario: Description field accepts rich text formatting
**Status:** Ready to test

**Given** the Create Change Event form is open
**When** the user clicks into the Description field and applies formatting (bold, italic, bullet list)
**Then** the formatting toolbar is visible and functional; the description saves with formatting and renders correctly in the detail view

**Edge cases:**
- Pasting from Word: formatting preserved or cleanly stripped
- Very long descriptions (1000+ words): field scrolls; does not overflow the layout

---

### Scenario: File attachments can be added on create
**Status:** Ready to test

**Given** the Create Change Event form is open
**When** the user drags a file onto the Attachments area or clicks to browse and selects a file
**Then** the file appears in the attachments list; after saving, the attachment is accessible from the detail view

**Edge cases:**
- Unsupported file type: error message shown; file not uploaded
- File over size limit: error message specifies the limit
- Multiple files: all listed and saved

---

### Scenario: Add line items after creating a change event
**Status:** Ready to test

**Given** a change event has just been created and the detail view is open
**When** the user navigates to the line items grid, clicks + Add Line Item, fills in Budget Code, Description, Vendor, Cost Quantity, Cost Unit Cost, then saves
**Then** a new line item row appears in the grid; Cost ROM auto-calculates as Quantity x Unit Cost; the totals footer updates

**Edge cases:**
- Budget Code dropdown empty: line item saves without a budget code
- Vendor has no matching results: combobox shows No results
- Multiple line items: each added independently; totals update after each save

---

### Scenario: Cancel create returns to list without saving
**Status:** Ready to test

**Given** the Create Change Event form is open and the user has entered several fields
**When** the user clicks Cancel or navigates away
**Then** no change event is created; the user returns to the list view; the list is unchanged

**Edge cases:**
- Accidental back button: if a confirmation dialog exists, it prompts; if not, data is lost silently (UX gap to note)
- Browser refresh: partially filled form is cleared

---

## Group 3: Edit

### Scenario: Open edit form with all fields pre-populated
**Status:** Ready to test

**Given** an existing change event has Title, Origin, Type, Change Reason, Scope, and Description set
**When** the user opens the detail view and clicks Edit
**Then** the edit form opens with all fields pre-populated; no dropdown shows a blank Select... for a field that has a saved value

**Edge cases:**
- FK/relation fields (Origin, Type, Scope): show the saved label, not an ID or blank
- Rich text description: renders with formatting intact

---

### Scenario: Edit a field and verify the change persists
**Status:** Ready to test

**Given** a change event exists with Scope = TBD
**When** the user opens Edit, changes Scope to Out of Scope, and clicks Save
**Then** the detail view shows Scope = Out of Scope; the list row also shows the updated scope

**Edge cases:**
- Editing Title: both the detail view header and the list row update
- Editing Status: the status badge updates immediately

---

### Scenario: FK dropdown fields pre-populate correctly on edit
**Status:** Ready to test

**Given** a change event was created with Origin = Field, Type = Design Change, and Scope = Out of Scope
**When** the user clicks Edit
**Then** Origin shows Field, Type shows Design Change, Scope shows Out of Scope - none show as blank or Select...

**Edge cases:**
- Previously valid option removed from list (company config change): saved value still displays; dropdown may not include it as selectable

---

### Scenario: Edit line items inline in the detail view grid
**Status:** Ready to test

**Given** a change event with one or more line items exists
**When** the user clicks a cell in the line items grid (e.g., Description or Cost Quantity)
**Then** the cell becomes editable inline; typing a new value and pressing Enter or clicking away saves it; the totals footer recalculates

**Edge cases:**
- Changing Cost Quantity: Cost ROM = Quantity x Unit Cost recalculates automatically
- Deleting a line item: row is removed and totals update
- Editing Budget Code (FK): a searchable combobox opens; selecting a new code updates the cell

---

### Scenario: Cancel edit discards changes
**Status:** Ready to test

**Given** the edit form is open with changes made to Title and Scope
**When** the user clicks Cancel
**Then** the form closes without saving; the detail view still shows the original values; no API mutation was triggered

**Edge cases:**
- Browser back button: same behavior as Cancel

---

### Scenario: Latest Price column not yet available in line items grid
**Status:** Blocked (requires: latest_price column added to change_event_line_items DB table)

**Given** a change event line item is linked to a Prime PCO
**When** the user views the line items grid
**Then** a Latest Price column is visible showing the Prime PCO markup-inclusive price; the column is read-only

**Edge cases:**
- No linked Prime PCO: Latest Price column shows blank or $0
- Prime PCO price updated: Latest Price reflects the updated value after refresh

---

## Group 4: Detail View

### Scenario: Detail view shows correct header fields
**Status:** Ready to test

**Given** a change event with all fields populated exists
**When** the user opens the detail view by clicking the record
**Then** the header shows: CE Number (e.g., 001 - My Change Event), Status badge, Scope, Type, Change Reason, Origin, Line Item Revenue Source, Prime Contract for Markup, Description (formatted), and any Attachments

**Edge cases:**
- Fields with no value: shown as blank or a placeholder dash; not as undefined or an error

---

### Scenario: Detail view tabs are all present and load without error
**Status:** Ready to test

**Given** a change event detail view is open
**When** the user clicks each tab in the tab bar
**Then** these tabs are present and load without error: General, Lineage, Related Items, Comments, Change History; the active tab is visually highlighted

**Edge cases:**
- Comments tab: shows the Liveblocks comment thread; new comments can be submitted
- Change History tab: shows a chronological audit trail with timestamps and user names

---

### Scenario: Emails tab shows placeholder state (partial implementation)
**Status:** Ready to test

**Given** the change event detail view is open
**When** the user clicks the Emails tab
**Then** the tab loads with an empty state or placeholder; no actual email thread is shown (known partial implementation); the app does not crash

**Edge cases:**
- No error is thrown; the empty state is informative

---

### Scenario: Summary tab is not yet present in detail view
**Status:** Blocked (requires: Summary tab implementation showing aggregate financial totals)

**Given** the PRP specifies a Summary tab in the detail view
**When** the user looks at the tab bar
**Then** a Summary tab should be present showing aggregate financial totals for the change event

**Edge cases:**
- Summary totals should match the sum of all line items

---

### Scenario: RFQs tab is missing from detail view
**Status:** Blocked (requires: RFQs tab component in detail view - DB and API already exist)

**Given** a change event has one or more RFQs sent to subcontractors
**When** the user opens the change event detail view
**Then** a RFQs tab should be present showing the RFQ list with status badges (Draft, Open, Accepted, Rejected, Revise and Resubmit, Pending Final Approval), vendor name, due date, and a Send RFQs action

**Edge cases:**
- RFQ with status Accepted: line item values from the response should be visible
- RFQ with Revise and Resubmit status: vendor should be able to resubmit

---

### Scenario: Lineage tab shows linked Prime PCOs and Commitment COs
**Status:** Ready to test

**Given** a change event has been linked to a Prime PCO and a Commitment CO via Add to
**When** the user opens the Lineage tab
**Then** both the Prime PCO and Commitment CO are listed with numbers, titles, and statuses; each is a clickable link to the respective record

**Edge cases:**
- No linked PCOs: Lineage tab shows an empty state
- Linked PCO is deleted: link shows but navigating may 404; graceful error handling expected

---

### Scenario: Primary actions are accessible from the detail view
**Status:** Ready to test

**Given** the change event detail view is open
**When** the user looks at the action bar
**Then** the following actions are available: Edit, Delete, Export CSV, Export PDF, Clone, Email Change Event, Add to (dropdown with PCO options), and status transition actions (Close, Submit for Approval, etc.)

**Edge cases:**
- Delete: shows a confirmation dialog before deleting
- Export PDF: generates and downloads a formatted PDF
- Clone: creates a copy with a new auto-incremented number

---

## Group 5: Status Workflows

### Scenario: Default status is Open on create
**Status:** Ready to test

**Given** the user creates a new change event without changing the Status field
**When** the record is saved
**Then** the status badge on the list row and detail view header shows Open in the correct badge color

**Edge cases:**
- User manually sets Status = Closed during create: record saves as Closed with no transition event logged

---

### Scenario: Close an Open change event
**Status:** Ready to test

**Given** a change event with status Open exists
**When** the user opens the detail view, selects the Close action from the actions menu, and confirms
**Then** the status badge changes to Closed; the change is logged in Change History with timestamp and user name; the record remains visible in the list (not deleted)

**Edge cases:**
- Closing a CE with open RFQs: allowed; RFQs remain in their current state
- Closing a CE with no line items: allowed

---

### Scenario: Reopen a Closed change event
**Status:** Ready to test

**Given** a change event with status Closed exists
**When** the user opens Edit, changes Status back to Open, and saves
**Then** the status badge returns to Open; the transition is logged in Change History

**Edge cases:**
- Closed CE in the list view: still visible (not hidden by default unless filtered)

---

### Scenario: Submit for Approval, Approve, and Reject (product enhancement beyond PRP scope)
**Status:** Ready to test

**Given** a change event with status Open exists
**When** the user selects Submit for Approval from the actions menu
**Then** status changes to Pending Approval; the appropriate badge style is shown; the action is logged in Change History

**Edge cases:**
- Approving a Pending CE: status changes to Approved; logged in history
- Rejecting a Pending CE: status changes to Rejected; logged in history

---

### Scenario: Status filter in list view reflects transitions
**Status:** Ready to test

**Given** the list has change events in both Open and Closed status
**When** the user applies the Status filter and selects Closed
**Then** only Closed change events are shown; the count updates accordingly

**Edge cases:**
- Multiple filters (Status=Closed AND Scope=Out of Scope): only records matching both conditions shown
- Clearing filters: all records restored

---

## Group 6: List View Features

### Scenario: Search by number, title, or change reason
**Status:** Ready to test

**Given** the Change Events list has 10+ records with varied titles and numbers
**When** the user types a partial title in the search box (e.g., roof)
**Then** only change events matching that term in number, title, or change reason are shown; results update as the user types

**Edge cases:**
- Search with no matches: empty state shown, not an error
- Search cleared: full list restored

---

### Scenario: Filter by Status
**Status:** Ready to test

**Given** the list has change events with Open and Closed statuses
**When** the user opens Filters, selects the Status filter group, and checks Closed
**Then** only Closed change events appear; the filter chip shows the active filter; removing it restores all records

**Edge cases:**
- Multiple status values selected: records matching any selected status shown (OR logic within the filter group)

---

### Scenario: Filter by Scope
**Status:** Ready to test

**Given** the list has change events with TBD, In Scope, and Out of Scope values
**When** the user filters by Scope = Out of Scope
**Then** only Out of Scope change events are shown

**Edge cases:**
- Scope = Allowance filter option may be missing (known partial implementation per AUDIT.md); Allowance records appear in the unfiltered list but cannot be isolated by filter

---

### Scenario: Filter by Type and Origin uses cross-group AND logic
**Status:** Ready to test

**Given** the list has change events of various types and origins
**When** the user applies Type = Design Change AND Origin = Field
**Then** only records matching both conditions are shown (AND logic between different filter groups)

**Edge cases:**
- Multiple values within the same filter group: OR logic applies
- Combining filters from different groups: AND logic applies

---

### Scenario: Export to CSV generates correct file
**Status:** Ready to test

**Given** the Change Events list has at least 3 records
**When** the user clicks Export and selects CSV
**Then** a CSV file downloads with one header row, one data row per change event, correct values in each column (no HTML tags, correct currency formatting)

**Edge cases:**
- Exporting with active filters: only filtered records are exported
- Empty list: CSV downloads with only the header row

---

### Scenario: Grand totals footer shows correct sums
**Status:** Ready to test

**Given** the Change Events list has records with various Cost ROM and Commitment values
**When** the list loads or filters change
**Then** the footer row displays summed totals for: Revenue Prime PCO, Cost ROM, and Commitment; currency values are correctly formatted

**Edge cases:**
- After adding a new line item: footer totals update to include the new value
- With active filters: totals reflect only visible (filtered) records

---

### Scenario: Server-side pagination works correctly
**Status:** Ready to test

**Given** a project has 30+ change events and the page size is 20
**When** the user navigates to the next page
**Then** the next page of records loads; the page indicator updates; navigating back to page 1 restores the first set of records

**Edge cases:**
- Changing filters resets to page 1
- Large datasets (100+ records): pagination is stable and performant

---

### Scenario: Print action is not yet implemented
**Status:** Blocked (requires: Print toolbar action implementation)

**Given** the Change Events list view toolbar
**When** the user looks for a Print button
**Then** a Print button should be available in the toolbar, opening the browser print dialog with a formatted print view

**Edge cases:**
- Print view should hide toolbar actions and show only the data table
- Landscape orientation recommended for wide tables

---

## Group 7: Row Actions

### Scenario: Click row to open detail view
**Status:** Ready to test

**Given** the Change Events list has at least one record
**When** the user clicks a change event row
**Then** the detail view opens; the URL updates to include the change event ID; the header shows the correct CE number and title

**Edge cases:**
- Middle-click or Ctrl+click: opens the detail view in a new browser tab (standard browser behavior)

---

### Scenario: Edit from row actions kebab menu
**Status:** Ready to test

**Given** the Change Events list has at least one record
**When** the user opens the row actions menu (kebab/ellipsis) and clicks Edit
**Then** the edit form opens for that change event with all fields pre-populated; equivalent to clicking Edit from the detail view

**Edge cases:**
- Edit from list vs. from detail view: both open the same form with the same fields

---

### Scenario: Delete from row actions menu with confirmation dialog
**Status:** Ready to test

**Given** the Change Events list has at least one record
**When** the user opens the row actions menu, clicks Delete, and confirms the confirmation dialog
**Then** the change event is soft-deleted; the row disappears from the active list; the record appears in the Recycle Bin tab with a Restore option

**Edge cases:**
- Cancelling the confirmation dialog: the CE is NOT deleted; the row remains
- Restoring from Recycle Bin: the CE reappears in the active list with original data intact

---

### Scenario: Bulk delete via toolbar
**Status:** Ready to test

**Given** the Change Events list has multiple records
**When** the user checks checkboxes for 3 change events and clicks the bulk delete button
**Then** all 3 are soft-deleted; they disappear from the active list; the grand totals footer updates

**Edge cases:**
- Select all (header checkbox): selects all records on the current page
- Bulk delete with one already-deleted record in selection: handled gracefully (no crash)

---

### Scenario: Send RFQs is only accessible via selection bar, not the row kebab
**Status:** Ready to test

**Given** the Change Events list has records
**When** the user opens the row actions kebab menu for a single change event
**Then** there is no direct Send RFQs option in the row kebab; the user must check the row checkbox to trigger the selection bar, then use Send RFQs from the selection bar

**Edge cases:**
- A direct single-row Send RFQs action is a known future improvement
- The selection bar appears at the bottom of the page when any checkbox is checked
- Add to Prime PCO and Add to Commitment CO are also accessible from the selection bar

---

## Group 8: Business Rules & Calculations

### Scenario: Cost ROM auto-calculates from Quantity x Unit Cost
**Status:** Ready to test

**Given** a line item row has Quantity = 10 and Unit Cost = $50.00
**When** the user saves or moves focus away from the Unit Cost cell
**Then** Cost ROM auto-calculates to $500.00; the totals footer updates accordingly

**Edge cases:**
- Quantity or Unit Cost is blank/zero: Cost ROM = $0.00
- Changing Quantity after Cost ROM is set: Cost ROM recalculates
- Manually overriding Cost ROM directly: behavior depends on whether manual override is allowed by settings

---

### Scenario: Revenue ROM auto-calculation - Match to Latest Cost (partial implementation)
**Status:** Ready to test

**Given** a change event has Line Item Revenue Source = Match Revenue to Latest Cost
AND a line item has Cost ROM = $500.00
**When** the line item is saved
**Then** Revenue ROM on that line item should auto-update to $500.00 (matching Cost ROM)

**Note:** Per AUDIT.md, the DB field exists but the auto-calc is not wired in the line items grid UI. This test is expected to fail, confirming the known gap.

**Edge cases:**
- Changing Cost ROM after Revenue ROM was auto-set: Revenue ROM should update automatically (currently not wired)

---

### Scenario: Revenue ROM - Manual Entry mode allows direct input
**Status:** Ready to test

**Given** a change event has Line Item Revenue Source = Manual Entry
**When** the user enters a Revenue ROM value directly in the Revenue ROM cell
**Then** the entered value is saved as-is; no auto-calculation overrides the manual entry

**Edge cases:**
- Switching from Manual Entry to Match to Latest Cost: existing manual values may be overwritten by auto-calc; test for data loss risk

---

### Scenario: Revenue ROM - Match to Latest Price is not yet implemented
**Status:** Blocked (requires: latest_price column on change_event_line_items and Prime PCO markup logic wired)

**Given** a change event line item is linked to a Prime PCO with markup applied
AND Line Item Revenue Source = Match Revenue to Latest Price
**When** the line item is viewed
**Then** Revenue ROM equals the Prime PCO markup-inclusive price (Latest Price), not just Cost ROM

**Edge cases:**
- Latest Price changes when Prime PCO markup changes: Revenue ROM should update
- No linked Prime PCO: Latest Price = $0; Revenue ROM = $0

---

### Scenario: Scope-based Budget ROM behavior is not yet configurable
**Status:** Blocked (requires: Configure Settings page for Budget ROM per scope)

**Given** an admin has configured Budget ROM settings (e.g., In Scope = Show Cost ROM, Out of Scope = Show Both, TBD = Do Not Show)
**When** change events with each scope value are viewed in the Budget tool
**Then** Budget views display the correct ROM columns per scope configuration

**Edge cases:**
- Changing scope on a CE: Budget view updates accordingly
- No configuration set: a default behavior applies without crashing

---

### Scenario: Commitment CO SOV uses latest cost vs latest price rule (partial)
**Status:** Ready to test

**Given** a change event line item has Cost ROM = $400 and is NOT yet linked to a Prime PCO
**When** the user creates a new Commitment CO from the CE via Add to
**Then** the Commitment CO SOV is populated with $400 (the latest cost amount, not a markup price)

**Note:** The follow-up case - line item linked to Prime PCO first (Latest Price = $500), then Commitment CO created, SOV should show $500 - is partially implemented. Test the first case; flag the second as a known gap.

**Edge cases:**
- Line item linked to Prime PCO before Commitment CO is created: SOV should show Latest Price (may not yet work; confirms gap)
- Multiple line items: each passes its own latest cost or latest price independently

---

## Group 9: Integration with Other Tools

### Scenario: Add to New Prime PCO from selection bar
**Status:** Ready to test

**Given** at least one change event with line items exists AND a prime contract exists on the project
**When** the user checks the CE checkbox, clicks Add to in the selection bar, and selects New Prime Change Order / Potential Change Order
**Then** the Add to Prime PCO dialog opens; confirming creates a new Prime PCO linked to the CE; the CE Lineage tab shows the new Prime PCO

**Edge cases:**
- No prime contract on project: option is disabled or shows an informative error
- Prime PCO is created in Open status; can subsequently be promoted to a PCCO

---

### Scenario: Add to existing Prime PCO is blocked for Approved PCOs
**Status:** Ready to test

**Given** a project has an existing Prime PCO that is NOT in Approved status
**When** the user selects a CE, clicks Add to -> Link to existing Prime Change Order, and selects the existing PCO
**Then** the CE line items are added to the existing Prime PCO SOV; the CE Lineage tab shows the link

**Edge cases:**
- Existing PCO is in Approved status: it does NOT appear in the linkable PCO list (business rule from PRP section 7.4)
- No existing non-approved PCOs: Link to existing sub-menu shows empty state

---

### Scenario: Add to New Commitment Change Order
**Status:** Ready to test

**Given** a change event has at least one line item AND a commitment (subcontract or PO) exists on the project
**When** the user selects the CE and clicks Add to -> New Commitment Change Order
**Then** the dialog opens; user selects the commitment; the Commitment CO is created with CE line item data; CE Lineage tab shows the new Commitment CO

**Edge cases:**
- No commitments exist: option is disabled or shows an error explaining a commitment is required
- Multiple commitments: user is prompted to select which one

---

### Scenario: Add to New PO or Subcontract navigates but does not pre-populate CE data
**Status:** Ready to test

**Given** the user selects a CE and clicks Add to -> New Purchase Order or Add to -> New Subcontract
**When** the navigation completes
**Then** the user is redirected to the new commitment form at the correct URL; CE data is NOT pre-populated in the form (known partial implementation - navigation works, pre-population does not)

**Edge cases:**
- This test is expected to expose the pre-population gap, confirming the known issue

---

### Scenario: Add to Budget Change is not yet implemented
**Status:** Blocked (requires: budget_changes table and full Budget Change workflow)

**Given** a change event has line items with Cost ROM values
**When** the user selects Add to -> New Budget Change
**Then** a Budget Change is created linked to the CE; the Budget tool updates to reflect the change; CE Lineage shows the Budget Change link

**Edge cases:**
- Prevention setting enabled (Prevent Budget Changes + Prime COs on same line item): if a line item is already linked to a Prime PCO, the Budget Change option for that line item is blocked
- Link to existing Budget Change is also not implemented

---

## Group 10: Error States

### Scenario: Network error during list load shows human-readable error
**Status:** Ready to test

**Given** the user navigates to Change Events with the network offline or the API returning a 500 error
**When** the page attempts to load the change events list
**Then** an error state is shown (not a blank page or infinite spinner); the error message is human-readable (e.g., Failed to load change events. Please try again.); a retry option is available

**Edge cases:**
- Network recovers: clicking retry successfully loads the list
- Partial load followed by network drop: partial list shown with an error banner

---

### Scenario: Server error during save preserves form data
**Status:** Ready to test

**Given** the user has filled out the Create Change Event form
**When** the user clicks Save and the API returns a 500 or 422 error
**Then** the form remains open with the user's entered data intact (not wiped); a toast or inline error message describes the failure; the user can try saving again without re-entering data

**Edge cases:**
- 422 validation error with field-level details: error message is specific (not a generic Something went wrong)
- Timeout: a timeout error is shown after ~10 seconds; user is prompted to retry

---

### Scenario: Unauthorized action is blocked or surfaced gracefully
**Status:** Ready to test

**Given** a user with Standard (non-Admin) permissions on Change Events
**When** the user attempts an Admin-only action (e.g., creating a Prime PCO from a CE, which requires Admin on both Change Events and Prime Contracts tools)
**Then** the unauthorized action is either: (a) hidden from the UI entirely, or (b) shown but clicking it displays an informative permission error; the user is never left with a broken or undefined UI state

**Edge cases:**
- Read-only user: the Create button is hidden or disabled; row actions show only View
- Admin-only Configure Settings: non-admins do not see the Configure Settings link in the toolbar or sidebar
