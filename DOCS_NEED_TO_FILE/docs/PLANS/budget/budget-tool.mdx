PROJECT: Alleato Budget Application - Phase 1 Foundation
PHASE: 1 (Foundation - Enable Core CRUD)
SPRINT: 1A + 1B (Budget Modifications + Cost Actuals Integration)

CURRENT APPLICATION STATUS:
- Tech Stack: React/TypeScript frontend + Node.js/Express backend
- Database: PostgreSQL
- UI Framework: Tailwind CSS
- Current Implementation: 60% complete
  ✓ Core budget CRUD works
  ✓ Budget table display functional
  ✓ Tab navigation (Budget, Budget Details, Forecasting, Change History, Settings)
  ✓ Header buttons visible (Create, Resend to ERP, Lock Budget, Import, Export)
  ✓ Cost codes table
  ✓ UI structure for all features
  ✗ Budget modifications not implemented
  ✗ Cost actuals integration missing
  ✗ Forecasting calculations incomplete
  ✗ Edit functionality not wired

PROJECT_URL: https://alleato-pm.vercel.app/67/budget
SPECIFICATION_REFERENCE: See sections below for complete API and data model requirements

===== PHASE 1A: BUDGET MODIFICATIONS SYSTEM =====

OBJECTIVE:
Enable users to create, approve, and void budget modifications. Modifications represent budget changes (additions/deductions) that get tracked separately from the original budget.

DATABASE SCHEMA CHANGES:

CREATE TABLE budget_modifications (
  id UUID PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES budget_line_items(id) ON DELETE CASCADE,
  modification_type VARCHAR(50) NOT NULL, -- 'addition' or 'deduction'
  reason TEXT,
  change_event_id UUID, -- Optional link to change events
  amount DECIMAL(15,2) NOT NULL,
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  approved_by_id UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  voided_by_id UUID REFERENCES users(id),
  voided_at TIMESTAMP,
  voided_reason TEXT,
  is_voided BOOLEAN DEFAULT false,
  approval_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  INDEX(budget_id),
  INDEX(line_item_id),
  INDEX(is_voided),
  INDEX(approval_status)
);

BACKEND API ENDPOINTS:

1. CREATE MODIFICATION
POST /api/budgets/{budgetId}/modifications
Request Body:
{
  "line_item_id": "uuid",
  "modification_type": "addition|deduction",
  "amount": 5000.00,
  "reason": "Change order #123",
  "change_event_id": "uuid (optional)"
}
Response 201:
{
  "id": "uuid",
  "budget_id": "uuid",
  "line_item_id": "uuid",
  "modification_type": "addition",
  "amount": 5000.00,
  "reason": "Change order #123",
  "approval_status": "pending",
  "created_by_id": "uuid",
  "created_at": "2025-01-06T08:00:00Z",
  "is_voided": false
}
Response 400: { "error": "line_item_id is required" }
Response 403: { "error": "Insufficient permissions to create modifications" }

2. LIST MODIFICATIONS
GET /api/budgets/{budgetId}/modifications?approval_status=pending&limit=50&offset=0
Response 200:
{
  "data": [
    { ...modification object... }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}

3. APPROVE MODIFICATION
PATCH /api/budgets/{budgetId}/modifications/{modId}/approve
Request Body:
{
  "approval_note": "Approved by PM"
}
Response 200:
{
  "id": "uuid",
  ...modification object...,
  "approval_status": "approved",
  "approved_by_id": "uuid",
  "approved_at": "2025-01-06T08:05:00Z"
}
Response 403: { "error": "Only admins can approve modifications" }

4. REJECT MODIFICATION
PATCH /api/budgets/{budgetId}/modifications/{modId}/reject
Request Body:
{
  "rejection_reason": "Insufficient justification"
}
Response 200:
{
  ...modification object...,
  "approval_status": "rejected"
}

5. VOID MODIFICATION
POST /api/budgets/{budgetId}/modifications/{modId}/void
Request Body:
{
  "voided_reason": "Changed scope"
}
Response 200:
{
  ...modification object...,
  "is_voided": true,
  "voided_by_id": "uuid",
  "voided_at": "2025-01-06T08:10:00Z"
}

BACKEND LOGIC REQUIREMENTS:

1. When modification is created:
   - Validate line_item_id exists
   - Validate amount > 0
   - Check user has "create_budget_modifications" permission
   - Save modification with approval_status = "pending"
   - Trigger change history event (see Section 3A for details)

2. When modification is approved:
   - Set approval_status = "approved"
   - Set approved_by_id = current_user_id
   - Set approved_at = NOW()
   - RECALCULATE budget totals for the budget
   - Recalculate revised_budget for line_item: revised_budget = original_budget + SUM(approved modifications)
   - Update "Budget Modifications" column total for budget
   - Trigger change history event
   - Send notification to creator

3. When modification is voided:
   - Set is_voided = true
   - Set voided_by_id = current_user_id
   - Set voided_at = NOW()
   - Set voided_reason
   - RECALCULATE budget totals (subtract voided modification amount)
   - Trigger change history event

4. Budget Total Recalculation Logic:
   - total_budget_modifications = SUM(all approved modifications where is_voided=false)
   - total_revised_budget = total_original_budget + total_budget_modifications + total_approved_cos
   - For each line_item:
     - line_item.budget_modifications = SUM(approved mods for this line where is_voided=false)
     - line_item.revised_budget = line_item.original_budget + line_item.budget_modifications + line_item.approved_cos

FRONTEND UI COMPONENTS:

1. CREATE MODIFICATION BUTTON
   - Add button to Budget tab header (next to Create Line Item button)
   - Label: "Create Modification" with + icon
   - Opens modification creation modal

2. MODIFICATION CREATION MODAL
   - Form fields:
     a) "Select Line Item" - dropdown showing cost codes (01-3126, 03-3000, etc.)
     b) "Modification Type" - radio buttons: "Addition" or "Deduction"
     c) "Amount" - currency input field, validation: > 0
     d) "Reason" - text area (optional)
     e) "Link Change Event" - dropdown (optional) showing available change events
     f) Buttons: "Create" (orange) and "Cancel"
   - On success: Show toast "Modification created - awaiting approval"
   - On error: Show validation errors inline

3. MODIFICATIONS APPROVAL WORKFLOW UI
   - Show in a new tab or drawer
   - Display pending modifications in a list/table:
     - Cost Code, Amount, Type, Reason, Created By, Created Date
     - Action buttons: "Approve" and "Reject" for each
   - Approved modifications shown in separate section with green checkmark
   - When approve button clicked:
     - Show approval modal with optional note field
     - On confirm: Send PATCH request
     - Show success toast
     - Refresh modifications list

4. BUDGET MODIFICATIONS COLUMN
   - In Budget tab main table, "Budget Mods" column should display:
     - For each line item: SUM of approved (non-voided) modifications
     - Format: blue hyperlink showing amount (e.g., "+$5,000.00")
     - Clicking hyperlink opens modification detail drawer showing:
       - All modifications for this line (approved, pending, voided)
       - Summary: Total additions, Total deductions, Net change
       - Change history for this line

5. MODIFICATION DETAIL DRAWER
   - Shows when clicking modification amount or "view modifications" link
   - Display:
     a) Line item info (cost code, original budget)
     b) Modifications table with columns:
        - Amount
        - Type (Addition/Deduction)
        - Status (Pending/Approved/Rejected)
        - Reason
        - Created By
        - Created Date
        - Actions (Approve/Reject if pending, Void if approved)
     c) Summary: Original + Approved Mods + Approved COs = Revised Budget

FRONTEND INTEGRATION CHECKLIST:

- [ ] Import modification types and interfaces from backend
- [ ] Create useModifications hook (fetch, create, approve, void)
- [ ] Create ModificationModal component
- [ ] Create ModificationApprovalList component
- [ ] Update Budget table to show modification amounts
- [ ] Add "Create Modification" button to Budget header
- [ ] Wire button to open ModificationModal
- [ ] Implement modification detail drawer
- [ ] Handle approval workflow UI
- [ ] Show loading states and error messages
- [ ] Refresh budget totals after modification approved/voided
- [ ] Update change history on modification events

TESTING REQUIREMENTS:

1. Unit Tests (Backend):
   - Test modification creation with valid data
   - Test modification creation validation errors
   - Test budget recalculation on approval
   - Test budget recalculation on void
   - Test permissions enforcement

2. Integration Tests:
   - Create modification → Approve → Verify budget totals updated
   - Create modification → Void → Verify budget totals reverted
   - Create two modifications on same line → Approve both → Verify sum is correct

3. UI Tests:
   - Modal opens/closes correctly
   - Form validation shows errors
   - Approve button triggers correct request
   - Budget totals refresh after approval

SAMPLE TEST DATA:

Budget ID: 67
Line Item: 01-3126 (Pre-construction, Original Budget: $49,356.00)

Test Modification 1:
- Type: Addition
- Amount: $5,000.00
- Reason: "Change order for additional permits"
- Expected Result: Budget Modifications = $5,000.00, Revised = $54,356.00

Test Modification 2 (Voiding):
- Create modification for $3,000.00
- Approve it
- Then void it
- Expected Result: Budget Modifications should revert, Revised Budget back to original

===== PHASE 1B: COST ACTUALS INTEGRATION =====

OBJECTIVE:
Pull actual costs from various sources (Timesheet, Direct Costs, Vendor Invoices) and populate the "Job to Date Cost Detail" column so users can see budget vs. actual costs.

DATABASE SCHEMA CHANGES:

ALTER TABLE budget_line_items ADD COLUMN (
  job_to_date_cost DECIMAL(15,2) DEFAULT 0.00,
  last_actuals_sync_date TIMESTAMP,
  last_actuals_sync_source VARCHAR(255) -- 'timesheet|direct_cost|vendor_invoice|all'
);

CREATE TABLE actuals_sync_log (
  id UUID PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets(id),
  sync_type VARCHAR(50), -- 'manual' or 'automatic'
  status VARCHAR(50), -- 'pending', 'in_progress', 'completed', 'failed'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  synced_items_count INTEGER,
  error_message TEXT,
  next_sync_scheduled TIMESTAMP
);

BACKEND API ENDPOINTS:

1. GET CURRENT ACTUALS
GET /api/budgets/{budgetId}/actuals
Response 200:
{
  "data": {
    "budget_id": "uuid",
    "total_job_to_date_cost": 125000.00,
    "by_line_item": [
      {
        "line_item_id": "uuid",
        "cost_code": "01-3126",
        "original_budget": 49356.00,
        "job_to_date_cost": 12500.00,
        "last_updated": "2025-01-06T08:00:00Z",
        "source": "timesheet"
      },
      ...more items...
    ],
    "sync_status": {
      "last_sync": "2025-01-06T08:00:00Z",
      "next_sync": "2025-01-06T09:00:00Z",
      "sync_frequency": "hourly"
    }
  }
}

2. MANUAL SYNC ACTUALS
POST /api/budgets/{budgetId}/sync-actuals
Request Body: {} (empty)
Response 202 (Accepted - async processing):
{
  "sync_id": "uuid",
  "status": "in_progress",
  "message": "Syncing actuals from Timesheet and Direct Costs..."
}

3. GET SYNC STATUS
GET /api/budgets/{budgetId}/actuals/sync/{syncId}
Response 200:
{
  "sync_id": "uuid",
  "status": "completed",
  "started_at": "2025-01-06T08:00:00Z",
  "completed_at": "2025-01-06T08:02:15Z",
  "synced_items_count": 42,
  "error_count": 0
}

4. GET ACTUALS HISTORY
GET /api/budgets/{budgetId}/actuals/history?limit=10
Response 200:
{
  "data": [
    {
      "sync_id": "uuid",
      "sync_type": "automatic",
      "status": "completed",
      "synced_at": "2025-01-06T08:00:00Z",
      "items_count": 42
    },
    ...more syncs...
  ]
}

BACKEND SYNC LOGIC:

1. AUTOMATIC SYNC JOB (runs every hour):
   - Queries all budgets with sync enabled
   - For each budget:
     a) Fetch timesheet entries for project
        - GROUP BY cost_code
        - SUM(hours * hourly_rate) = labor cost
     b) Fetch direct cost items for project
        - GROUP BY cost_code (if available)
        - SUM(amount)
     c) Fetch vendor invoice items
        - GROUP BY cost_code (if line item has cost code)
        - SUM(amount)
     d) AGGREGATE by cost code
     e) Update budget_line_items.job_to_date_cost for each line
     f) Log sync in actuals_sync_log table
     g) Update last_actuals_sync_date and source
   - Handle errors gracefully (log, don't fail)

2. MANUAL SYNC (triggered by user):
   - Same logic as automatic
   - Execute as background job (return 202 immediately)
   - User can check status with GET /sync/{syncId}

3. ERROR HANDLING:
   - If sync fails, don't overwrite existing actuals
   - Log error with details
   - Schedule retry (exponential backoff)
   - Notify admin if repeated failures

SAMPLE INTEGRATION WITH EXISTING TOOLS:

For Timesheet Tool:
- GET /api/timesheets?project_id={projectId}&cost_code={costCode}
- Extract: hours, rate, calculate labor_cost = hours * rate
- Group by cost_code, sum total

For Direct Costs Tool (if exists):
- GET /api/direct-costs?project_id={projectId}
- Extract: cost_code, amount
- Group by cost_code, sum total

For Vendor Invoices (if integrated):
- GET /api/vendor-invoices?project_id={projectId}&status=approved
- Extract: line_items[].cost_code, line_items[].amount
- Group by cost_code, sum total

FRONTEND DISPLAY:

1. JOB TO DATE COST DETAIL COLUMN
   - In Budget tab main table, add "JTD Cost Detail" column
   - Display: Currency value (e.g., "$12,500.00")
   - Format: Black text, right-aligned
   - If last_actuals_sync_date within 1 hour: show green indicator
   - If last_actuals_sync_date > 1 day old: show yellow warning indicator
   - Hovering shows tooltip:
     "Last updated: 2 hours ago from Timesheet tool"

2. SYNC STATUS INDICATOR (in Budget header):
   - Show small icon + text: "Actuals synced 2 hours ago"
   - Clicking opens sync details drawer showing:
     - Last sync timestamp
     - Next scheduled sync time
     - Number of items synced
     - Any errors or warnings
     - "Sync Now" button for manual trigger

3. SYNC NOW BUTTON:
   - Add to Budget header (next to other buttons)
   - On click:
     - Disable button and show spinner
     - Send POST /sync-actuals
     - Show toast "Syncing actuals..."
     - Poll GET /sync/{syncId} every 2 seconds
     - On complete: Show "Sync complete - 42 items updated"
     - Refresh budget totals
     - Re-enable button

4. ACTUALS SYNC SETTINGS:
   - In Settings tab, add section:
     "Cost Actuals Sync"
     - Toggle: "Enable automatic sync" (default: ON)
     - Dropdown: "Sync frequency" (default: Every 1 hour)
     - Checkboxes:
       ☑ Sync from Timesheet tool
       ☑ Sync from Direct Costs tool
       ☑ Sync from Vendor Invoices
     - Last sync timestamp
     - Manual "Sync Now" button

FRONTEND INTEGRATION CHECKLIST:

- [ ] Add job_to_date_cost column to budget table
- [ ] Create actuals sync status display
- [ ] Create "Sync Now" button with loading state
- [ ] Implement sync status polling
- [ ] Add sync details drawer/modal
- [ ] Create actuals sync settings in Settings tab
- [ ] Add tooltip showing last sync timestamp and source
- [ ] Handle sync errors and show user-friendly messages
- [ ] Refresh budget calculations when actuals updated
- [ ] Add loading skeletons while syncing

TESTING REQUIREMENTS:

1. Unit Tests (Backend):
   - Test timesheet cost aggregation by cost code
   - Test direct cost aggregation
   - Test vendor invoice aggregation
   - Test combining all three sources
   - Test error handling on missing tool integration

2. Integration Tests:
   - Create timesheet entry → Sync → Verify JTD cost updated
   - Create direct cost entry → Sync → Verify JTD cost updated
   - Create both timesheet + direct cost → Sync → Verify combined

3. UI Tests:
   - "Sync Now" button triggers sync
   - Loading state shows during sync
   - JTD Cost column populated after sync
   - Sync status indicator shows correct timestamp
   - Settings persist across page reload

SAMPLE TEST DATA:

Budget ID: 67, Line Item: 01-3126 (Pre-construction)

Timesheet Entry 1:
- Date: 2025-01-01
- Cost Code: 01-3126
- Hours: 40
- Rate: $125/hour
- Labor Cost: $5,000

Timesheet Entry 2:
- Date: 2025-01-03
- Cost Code: 01-3126
- Hours: 20
- Rate: $125/hour
- Labor Cost: $2,500

Direct Cost Entry:
- Date: 2025-01-04
- Cost Code: 01-3126
- Amount: $5,000

Expected JTD Cost: $5,000 + $2,500 + $5,000 = $12,500

===== INTEGRATION BETWEEN 1A AND 1B =====

When modifications are approved and actuals are synced:
1. Revised Budget = Original Budget + Approved Modifications + Approved COs
2. Variance = (Job to Date Cost + Projected Remaining) - Revised Budget
3. Budget totals should update in this order:
   - Original Budget (fixed)
   - + Approved Modifications (from 1A)
   - + Approved COs (existing)
   = Revised Budget
   - Minus Job to Date Cost (from 1B)
   = Remaining Budget

===== IMPLEMENTATION PRIORITY =====

1. Start with 1A (Budget Modifications):
   - Modifications are foundational to budget management
   - Enables change tracking
   - Not dependent on external tool integration

2. Follow with 1B (Cost Actuals):
   - Requires Timesheet/Direct Costs tool integration
   - Can be done in parallel if tools already available
   - Enables variance analysis

3. Both should be complete before moving to Phase 2 (Forecasting)

===== COMPLETION CHECKLIST =====

PHASE 1A (Modifications):
- [ ] Database migration created and tested
- [ ] API endpoints implemented and tested
- [ ] Permission checks working
- [ ] Budget recalculation logic verified
- [ ] UI components created
- [ ] Modal opens/closes correctly
- [ ] Form validation working
- [ ] Approve workflow functional
- [ ] Change history events triggered
- [ ] All tests passing

PHASE 1B (Actuals):
- [ ] Database schema updated
- [ ] Sync job scheduled and running
- [ ] API endpoints implemented
- [ ] Timesheet integration working
- [ ] Direct costs integration working
- [ ] Budget totals updating correctly
- [ ] Sync status display working
- [ ] Manual sync button functional
- [ ] Error handling robust
- [ ] All tests passing

REPORTING:
When complete, provide:
1. Git commit SHA for each completed component
2. List of any blockers or dependencies discovered
3. Database migration status
4. Test coverage percentages
5. Any deviations from specification and why
6. Ready to move to Phase 2? (Y/N)