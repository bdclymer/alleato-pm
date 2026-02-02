# Budget Tool Phase 1c - Project Status Snapshots

**Priority Level:** P1 (High Priority - Dependency for reporting)
**Estimated Effort:** 14 hours
**Sprint:** Sprint 3 (Week 3)
**Dependencies:** Phase 1A (Budget Modifications), Phase 1B (Cost Actuals)

### Overview

Project Status Snapshots capture point-in-time views of the budget, actuals, and forecasts. This feature allows project managers to track how the budget has changed over time and compare different snapshots side-by-side. Essential for change order tracking and budget performance analysis.

---

## 1. Database Schema

### Table: budget_snapshots

| Column | Type | Constraints |
| --- | --- | --- |
| snapshot_id | UUID | PRIMARY KEY |
| project_id | UUID | NOT NULL, FK → projects.project_id |
| snapshot_date | TIMESTAMP | NOT NULL |
| snapshot_name | VARCHAR(255) | NOT NULL |
| created_by | UUID | NOT NULL, FK → users.user_id |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |
| is_active | BOOLEAN | DEFAULT true |
| notes | TEXT | NULLABLE |

**Indexes:**

- `(project_id, snapshot_date)` - for querying snapshots by project and date
- `(project_id, is_active)` - for active snapshots query
- `created_at` - for sorting by creation date

### Table: snapshot_cost_codes

| Column | Type | Constraints |
| --- | --- | --- |
| snapshot_cost_code_id | UUID | PRIMARY KEY |
| snapshot_id | UUID | NOT NULL, FK → budget_snapshots.snapshot_id |
| cost_code_id | UUID | NOT NULL, FK → cost_codes.cost_code_id |
| original_budget | DECIMAL(15,2) | NOT NULL |
| budget_modifications | DECIMAL(15,2) | NOT NULL (cumulative at snapshot time) |
| approved_change_orders | DECIMAL(15,2) | NOT NULL (cumulative at snapshot time) |
| revised_budget | DECIMAL(15,2) | NOT NULL (calculated) |
| actual_costs | DECIMAL(15,2) | NOT NULL (cumulative through snapshot_date) |
| remaining_budget | DECIMAL(15,2) | NOT NULL (calculated) |
| forecast_at_completion | DECIMAL(15,2) | NOT NULL |
| variance | DECIMAL(15,2) | NOT NULL (calculated) |
| variance_percent | DECIMAL(5,2) | NOT NULL (calculated) |

**Indexes:**

- `(snapshot_id, cost_code_id)` - for querying specific cost code in snapshot

---

## 2. API Endpoints

### ENDPOINT 1: Create Budget Snapshot

```
POST /api/projects/{projectId}/snapshots

```

**Request Body:**

```json
{
  "snapshot_name": "Pre-Change Order #5",
  "snapshot_date": "2025-01-06T00:00:00Z",
  "notes": "Baseline before major structural modifications"
}

```

**Response (201 Created):**

```json
{
  "snapshot_id": "snap_789abc",
  "project_id": "proj_123",
  "snapshot_name": "Pre-Change Order #5",
  "snapshot_date": "2025-01-06T00:00:00Z",
  "created_by": "user_456",
  "created_at": "2025-01-06T08:05:54Z",
  "is_active": true,
  "notes": "Baseline before major structural modifications",
  "cost_code_snapshots": [
    {
      "snapshot_cost_code_id": "sncc_111",
      "cost_code_id": "cc_001",
      "cost_code_name": "Foundation",
      "original_budget": 250000.00,
      "budget_modifications": 5000.00,
      "approved_change_orders": 0.00,
      "revised_budget": 255000.00,
      "actual_costs": 180000.00,
      "remaining_budget": 75000.00,
      "forecast_at_completion": 245000.00,
      "variance": 10000.00,
      "variance_percent": 3.92
    }
  ]
}

```

**Backend Logic:**

1. Verify project exists and user has PROJECT_MANAGER or ADMIN role
2. If snapshot_date is in future, reject with 400 error: "Snapshot date cannot be in the future"
3. Query budget_modifications table - sum all modifications up to snapshot_date for each cost code
4. Query change_orders table - sum all approved COs up to snapshot_date
5. Query cost_actuals table - sum all actuals up to snapshot_date for each cost code
6. Calculate revised_budget = original_budget + budget_modifications + approved_change_orders
7. Query forecasting engine - get forecast_at_completion for each cost code as of snapshot_date
8. Calculate variance = revised_budget - forecast_at_completion
9. Insert into budget_snapshots table
10. Insert cost code data into snapshot_cost_codes table (one row per cost code in project)
11. Return populated snapshot with all cost codes

**Error Handling:**

- `400` Invalid snapshot_date format
- `400` Snapshot date cannot be in the future
- `403` User lacks PROJECT_MANAGER role
- `404` Project not found
- `500` Database transaction failure

---

### ENDPOINT 2: Get Snapshot Details

```
GET /api/projects/{projectId}/snapshots/{snapshotId}

```

**Response (200 OK):**

```json
{
  "snapshot_id": "snap_789abc",
  "project_id": "proj_123",
  "snapshot_name": "Pre-Change Order #5",
  "snapshot_date": "2025-01-06T00:00:00Z",
  "created_by": "user_456",
  "created_by_name": "John Doe",
  "created_at": "2025-01-06T08:05:54Z",
  "updated_at": "2025-01-06T08:05:54Z",
  "is_active": true,
  "notes": "Baseline before major structural modifications",
  "snapshot_totals": {
    "total_original_budget": 1000000.00,
    "total_budget_modifications": 50000.00,
    "total_approved_change_orders": 25000.00,
    "total_revised_budget": 1075000.00,
    "total_actual_costs": 600000.00,
    "total_remaining_budget": 475000.00,
    "total_forecast_at_completion": 950000.00,
    "total_variance": 125000.00,
    "total_variance_percent": 11.63
  },
  "cost_code_snapshots": [
    {
      "snapshot_cost_code_id": "sncc_111",
      "cost_code_id": "cc_001",
      "cost_code_name": "Foundation",
      "original_budget": 250000.00,
      "budget_modifications": 5000.00,
      "approved_change_orders": 0.00,
      "revised_budget": 255000.00,
      "actual_costs": 180000.00,
      "remaining_budget": 75000.00,
      "forecast_at_completion": 245000.00,
      "variance": 10000.00,
      "variance_percent": 3.92
    },
    {
      "snapshot_cost_code_id": "sncc_112",
      "cost_code_id": "cc_002",
      "cost_code_name": "Framing",
      "original_budget": 400000.00,
      "budget_modifications": 15000.00,
      "approved_change_orders": 25000.00,
      "revised_budget": 440000.00,
      "actual_costs": 320000.00,
      "remaining_budget": 120000.00,
      "forecast_at_completion": 420000.00,
      "variance": 20000.00,
      "variance_percent": 4.55
    }
  ]
}

```

**Backend Logic:**

1. Query budget_snapshots table for snapshot_id
2. Verify user has PROJECT_MANAGER or VIEWER role for this project
3. Query snapshot_cost_codes table - get all cost codes for this snapshot
4. Calculate snapshot_totals by summing all cost code columns
5. Format user_name by joining with users table
6. Return complete snapshot with totals

---

### ENDPOINT 3: List Project Snapshots

```
GET /api/projects/{projectId}/snapshots?sort=date&order=desc&limit=20&offset=0

```

**Query Parameters:**

- `sort`: "date" | "name" | "created_at" (default: "date")
- `order`: "asc" | "desc" (default: "desc")
- `limit`: 1-100 (default: 20)
- `offset`: 0+ (default: 0)
- `filter_active`: true | false | "all" (default: true)

**Response (200 OK):**

```json
{
  "snapshots": [
    {
      "snapshot_id": "snap_789abc",
      "snapshot_name": "Pre-Change Order #5",
      "snapshot_date": "2025-01-06T00:00:00Z",
      "created_by_name": "John Doe",
      "created_at": "2025-01-06T08:05:54Z",
      "is_active": true,
      "snapshot_totals": {
        "total_revised_budget": 1075000.00,
        "total_actual_costs": 600000.00,
        "total_remaining_budget": 475000.00,
        "total_variance": 125000.00,
        "total_variance_percent": 11.63
      }
    },
    {
      "snapshot_id": "snap_456def",
      "snapshot_name": "Pre-Change Order #4",
      "snapshot_date": "2024-12-20T00:00:00Z",
      "created_by_name": "Jane Smith",
      "created_at": "2024-12-20T15:30:00Z",
      "is_active": true,
      "snapshot_totals": {
        "total_revised_budget": 1050000.00,
        "total_actual_costs": 550000.00,
        "total_remaining_budget": 500000.00,
        "total_variance": 100000.00,
        "total_variance_percent": 9.52
      }
    }
  ],
  "total_count": 12,
  "limit": 20,
  "offset": 0,
  "has_more": false
}

```

**Backend Logic:**

1. Verify user has PROJECT_MANAGER or VIEWER role
2. Apply filter_active filter if provided
3. Query budget_snapshots table with sorting and pagination
4. For each snapshot, calculate snapshot_totals by summing snapshot_cost_codes
5. Join with users table to get created_by_name
6. Return list with pagination metadata

---

### ENDPOINT 4: Compare Two Snapshots

```
GET /api/projects/{projectId}/snapshots/{snapshotId1}/compare/{snapshotId2}

```

**Response (200 OK):**

```json
{
  "snapshot_1": {
    "snapshot_id": "snap_789abc",
    "snapshot_name": "Pre-Change Order #5",
    "snapshot_date": "2025-01-06T00:00:00Z",
    "snapshot_totals": {
      "total_revised_budget": 1075000.00,
      "total_actual_costs": 600000.00,
      "total_variance": 125000.00
    }
  },
  "snapshot_2": {
    "snapshot_id": "snap_456def",
    "snapshot_name": "Pre-Change Order #4",
    "snapshot_date": "2024-12-20T00:00:00Z",
    "snapshot_totals": {
      "total_revised_budget": 1050000.00,
      "total_actual_costs": 550000.00,
      "total_variance": 100000.00
    }
  },
  "comparison": {
    "revised_budget_change": 25000.00,
    "revised_budget_change_percent": 2.38,
    "actual_costs_change": 50000.00,
    "actual_costs_change_percent": 9.09,
    "variance_change": 25000.00,
    "variance_change_percent": 25.00,
    "cost_code_changes": [
      {
        "cost_code_id": "cc_001",
        "cost_code_name": "Foundation",
        "snapshot_1_revised_budget": 255000.00,
        "snapshot_2_revised_budget": 250000.00,
        "revised_budget_change": 5000.00,
        "snapshot_1_actual_costs": 180000.00,
        "snapshot_2_actual_costs": 170000.00,
        "actual_costs_change": 10000.00,
        "snapshot_1_variance": 10000.00,
        "snapshot_2_variance": 15000.00,
        "variance_change": -5000.00
      }
    ]
  }
}

```

**Backend Logic:**

1. Query both snapshots
2. Verify both exist in same project
3. Verify user has PROJECT_MANAGER or VIEWER role
4. Calculate deltas between snapshot totals
5. For each cost code, calculate individual deltas
6. Return comparison with both snapshots and delta calculations

---

### ENDPOINT 5: Update Snapshot Metadata

```
PATCH /api/projects/{projectId}/snapshots/{snapshotId}

```

**Request Body:**

```json
{
  "snapshot_name": "Pre-Change Order #5 - FINAL",
  "notes": "Updated baseline after client approval",
  "is_active": true
}

```

**Response (200 OK):**

```json
{
  "snapshot_id": "snap_789abc",
  "snapshot_name": "Pre-Change Order #5 - FINAL",
  "notes": "Updated baseline after client approval",
  "is_active": true,
  "updated_at": "2025-01-06T10:30:00Z"
}

```

**Backend Logic:**

1. Verify user has PROJECT_MANAGER role
2. Query budget_snapshots for snapshot_id
3. Validate snapshot_name is not empty and < 255 chars
4. Update only provided fields
5. Set updated_at to current timestamp
6. Return updated snapshot

**Error Handling:**

- `400` snapshot_name is empty or exceeds 255 characters
- `403` User lacks PROJECT_MANAGER role
- `404` Snapshot not found
- `409` Cannot modify archived snapshot (if is_active = false)

---

## 3. Backend Logic Requirements

### Snapshot Creation Logic

When creating a snapshot, capture the EXACT state of the budget at that moment:

**1. Original Budget Values**

- Source: cost_codes table
- Query: `SELECT original_budget FROM cost_codes WHERE project_id = ?`

**2. Budget Modifications (Cumulative)**

- Source: budget_modifications table
- Query: `SELECT SUM(modification_amount) FROM budget_modifications WHERE project_id = ? AND cost_code_id = ? AND created_at <= snapshot_date`
- Include: All modifications (approved, pending, rejected) created by snapshot_date
- Store: Total modifications applied to that cost code

**3. Approved Change Orders (Cumulative)**

- Source: change_orders table
- Query: `SELECT SUM(approval_amount) FROM change_orders WHERE project_id = ? AND cost_code_id = ? AND approved_at <= snapshot_date`

**4. Actual Costs (Cumulative through snapshot date)**

- Source: cost_actuals table
- Query: `SELECT SUM(actual_amount) FROM cost_actuals WHERE project_id = ? AND cost_code_id = ? AND actual_date <= snapshot_date`
- Include: Timesheet actuals + Direct Costs + Vendor Invoices

**5. Revised Budget Calculation**

- Formula: `revised_budget = original_budget + budget_modifications + approved_change_orders`
- Store: For quick retrieval (do not recalculate on read)

**6. Forecast at Completion**

- Source: forecasting_data table or calculated from forecast engine
- Query: `SELECT forecast_eac FROM forecasting_data WHERE project_id = ? AND cost_code_id = ? AND forecast_date <= snapshot_date`
- Use: Most recent forecast as of snapshot_date

**7. Variance Calculation**

- Formula: `variance = revised_budget - forecast_at_completion`
- Formula: `variance_percent = (variance / revised_budget) * 100`
- Store: For quick retrieval

### Snapshot Data Immutability

Once snapshot_cost_codes are created, they should NOT be modified (except via PATCH endpoint for metadata only). This ensures historical accuracy.

---

## 4. UI Components

### Component 1: Snapshots List View

**Location:** Budget Tab → "Project Status Snapshots" section or separate tab

**Visual Elements:**

- **Table with columns:**
    - Snapshot Name (text, clickable to detail view)
    - Snapshot Date (formatted: "Jan 6, 2025")
    - Created By (user name)
    - Total Revised Budget (currency, right-aligned)
    - Total Actual Costs (currency, right-aligned)
    - Variance (currency + %, color-coded: green if favorable, red if unfavorable)
    - Actions (menu: Compare, View Details, Edit Metadata, Delete)
- **Header Controls:**
    - "Create New Snapshot" button (primary)
    - Filter dropdown: "Active Snapshots" | "All Snapshots"
    - Sort dropdown: "By Date (Newest)" | "By Date (Oldest)" | "By Name"
- **Empty State:**
    - Icon + message: "No snapshots yet. Create your first snapshot to track budget status over time."
    - "Create Snapshot" button

---

### Component 2: Create Snapshot Modal

**Triggered by:** "Create New Snapshot" button

**Modal Content:**

- Title: "Create Project Status Snapshot"
- **Form Fields:**
    - Snapshot Name (text input, placeholder: "e.g., Pre-Change Order #5")
    - Snapshot Date (date picker, default: today, max: today)
    - Notes (textarea, optional, placeholder: "Optional notes about this snapshot")
    - Buttons: "Create Snapshot" (primary), "Cancel" (secondary)

**Logic:**

1. When form loads, populate date picker with current date (max allowed)
2. On submit, validate:
    - snapshot_name is not empty
    - snapshot_date is valid and not in future
3. Disable submit button while loading
4. Show loading state with spinner
5. On success: Close modal, refresh snapshot list, show success toast
6. On error: Show error message in modal

---

### Component 3: Snapshot Detail View

**Triggered by:** Clicking snapshot name in list

**View Layout:**

**Header Section:**

- Snapshot Name (editable, inline edit icon)
- Snapshot Date
- Created By: [User Name] on [Date]
- Actions dropdown: "Compare with Another", "Edit", "Download", "Delete"

**Summary Cards (4 cards in row):**

- Total Revised Budget: [amount]
- Total Actual Costs: [amount]
- Remaining Budget: [amount]
- Total Variance: [amount] ([%], color-coded)

**Cost Code Breakdown Table:**

- **Columns:**
    - Cost Code (text, left-aligned)
    - Original Budget
    - Budget Mods
    - Change Orders
    - Revised Budget
    - Actual Costs
    - Remaining
    - Variance (amount + %)
- Expandable rows: Click to see detail breakdown by vendor/lineitem
- Footer row: TOTALS for each column

**Notes Section:**

- If notes exist, display with edit icon
- If no notes, show "Add notes" link

---

### Component 4: Compare Snapshots View

**Triggered by:** "Compare with Another" action

**View Layout:**

**Header:** "Compare Snapshots"

**Snapshot Selector:**

- Dropdown 1: Select "Snapshot 1" (default: current snapshot)
- Dropdown 2: Select "Snapshot 2" (list of other snapshots)
- "Compare" button (primary)

**Comparison Table (after both selected):**

- **Columns:**
    - Metric
    - Snapshot 1 Value
    - Snapshot 2 Value
    - Change (amount)
    - Change (%)
- **Rows:**
    - Total Revised Budget
    - Total Actual Costs
    - Total Remaining Budget
    - Total Variance
    - [Cost Code 1] Revised Budget
    - [Cost Code 1] Actual Costs
    - [Cost Code 1] Variance
    - ... (repeat for each cost code)

**Color Coding:**

- Green: Favorable changes (variance improved)
- Red: Unfavorable changes (variance worsened or costs increased)
- Gray: Neutral (no change)

**Export Option:**

- "Export Comparison to PDF" button
- Generates report with both snapshots side-by-side

---

### Component 5: Snapshot Edit Modal

**Triggered by:** "Edit" action on snapshot detail

**Modal Content:**

- Title: "Edit Snapshot"
- **Form Fields:**
    - Snapshot Name (text input, current value pre-filled)
    - Notes (textarea, current value pre-filled)
    - Buttons: "Save Changes" (primary), "Cancel" (secondary)

**Logic:**

1. Pre-fill form with current snapshot data
2. On submit, validate snapshot_name
3. Show loading state
4. On success: Close modal, refresh snapshot detail view, show success toast
5. On error: Show error message in modal

---

## 5. Frontend Integration Checklist

- [ ]  Import API client functions for snapshot endpoints
- [ ]  Create SnapshotContext or Redux store:
    - [ ]  snapshots (array of snapshot summaries)
    - [ ]  selectedSnapshot (current snapshot object)
    - [ ]  snapshotComparison (comparison data)
    - [ ]  isLoading (boolean)
    - [ ]  error (error message or null)
- [ ]  Create custom hooks:
    - [ ]  useSnapshots() - fetch and manage snapshots list
    - [ ]  useSnapshotDetail(snapshotId) - fetch single snapshot
    - [ ]  useCompareSnapshots(snapshot1Id, snapshot2Id) - fetch comparison
    - [ ]  useCreateSnapshot(data) - create new snapshot
- [ ]  Create React components:
    - [ ]  SnapshotsListView
    - [ ]  CreateSnapshotModal
    - [ ]  SnapshotDetailView
    - [ ]  CompareSnapshotsView
    - [ ]  SnapshotEditModal
- [ ]  Integrate snapshots into Budget page:
    - [ ]  Add "Project Status Snapshots" tab or section
    - [ ]  Add snapshots list below budget table
    - [ ]  Add "Create Snapshot" button to toolbar
    - [ ]  Link snapshot detail from list view
    - [ ]  Add compare functionality
- [ ]  Add notifications:
    - [ ]  Toast on successful snapshot creation
    - [ ]  Toast on successful snapshot update
    - [ ]  Error alerts for failed operations
    - [ ]  Loading indicators for async operations
- [ ]  Add keyboard shortcuts (optional):
    - [ ]  Ctrl+N / Cmd+N to create new snapshot
    - [ ]  Escape to close modals

---

## 6. Testing Requirements

### Unit Tests (Backend)

**Test Suite: Snapshot Creation**

```jsx
describe('POST /api/projects/:projectId/snapshots', () => {
  test('should create snapshot with all cost codes', async () => {
    // Setup: Create project with 5 cost codes, add some modifications
    // Action: POST /snapshots with snapshot_name and snapshot_date
    // Assert:
    //   - snapshot_id returned
    //   - snapshot_cost_codes table has 5 rows
    //   - budget_modifications sum is correct
    //   - actual_costs sum is correct
    //   - revised_budget calculated correctly
  })

  test('should reject future snapshot dates', async () => {
    // Setup: Create project
    // Action: POST /snapshots with snapshot_date = tomorrow
    // Assert: 400 error "Snapshot date cannot be in the future"
  })

  test('should require PROJECT_MANAGER role', async () => {
    // Setup: Create project, login as VIEWER
    // Action: POST /snapshots
    // Assert: 403 Forbidden error
  })

  test('should sum modifications correctly across all cost codes', async () => {
    // Setup:
    //   - Cost Code 1: $10K original, $5K modifications, $2K approved COs
    //   - Cost Code 2: $20K original, -$3K modifications (reduction)
    // Action: Create snapshot
    // Assert:
    //   - CC1: revised_budget = 17K
    //   - CC2: revised_budget = 17K
    //   - Total revised = 34K
  })
})

describe('GET /api/projects/:projectId/snapshots/:snapshotId', () => {
  test('should return snapshot with all cost codes and totals', async () => {
    // Setup: Create snapshot with known data
    // Action: GET /snapshots/:snapshotId
    // Assert:
    //   - Returns snapshot_id, name, date
    //   - Returns all cost code snapshots
    //   - snapshot_totals calculated correctly
  })

  test('should calculate variance correctly', async () => {
    // Setup: Snapshot with revised_budget=$100K, forecast_eac=$95K
    // Action: GET /snapshots/:snapshotId
    // Assert:
    //   - variance = 5K
    //   - variance_percent = 5%
  })
})

describe('GET /api/projects/:projectId/snapshots/:id1/compare/:id2', () => {
  test('should calculate differences between snapshots', async () => {
    // Setup: Create two snapshots with different data
    // Action: GET /compare/:id1/:id2
    // Assert:
    //   - revised_budget_change calculated
    //   - actual_costs_change calculated
    //   - cost_code_changes populated
    //   - All math verified
  })
})

describe('PATCH /api/projects/:projectId/snapshots/:snapshotId', () => {
  test('should update snapshot name', async () => {
    // Setup: Create snapshot
    // Action: PATCH /snapshots/:snapshotId with new snapshot_name
    // Assert:
    //   - snapshot_name updated
    //   - updated_at timestamp changed
    //   - snapshot_cost_codes unchanged
  })

  test('should reject invalid snapshot names', async () => {
    // Action: PATCH /snapshots/:snapshotId with empty snapshot_name
    // Assert: 400 error
  })
})

```

### Integration Tests (Frontend)

**Test Suite: Snapshots List View**

```jsx
describe('SnapshotsListView Component', () => {
  test('should display list of snapshots', async () => {
    // Setup: Mock API returns 3 snapshots
    // Render: SnapshotsListView
    // Assert:
    //   - Table displays 3 rows
    //   - Snapshot names visible
    //   - Variance values displayed with color coding
  })

  test('should open create snapshot modal on button click', async () => {
    // Render: SnapshotsListView
    // Action: Click "Create New Snapshot" button
    // Assert:
    //   - CreateSnapshotModal displayed
    //   - Form fields visible
  })

  test('should navigate to detail view on row click', async () => {
    // Render: SnapshotsListView
    // Action: Click snapshot name
    // Assert:
    //   - Navigate to SnapshotDetailView for that snapshot
    //   - Snapshot data loaded and displayed
  })

  test('should filter by active/all snapshots', async () => {
    // Setup: Mock 5 snapshots (3 active, 2 inactive)
    // Action: Select "Active Snapshots" filter
    // Assert:
    //   - Only 3 snapshots displayed
    //   - Inactive snapshots hidden
  })
})

describe('CreateSnapshotModal Component', () => {
  test('should validate snapshot name is required', async () => {
    // Render: CreateSnapshotModal
    // Action: Leave name empty, click submit
    // Assert:
    //   - Error message displayed
    //   - API not called
  })

  test('should prevent future dates', async () => {
    // Render: CreateSnapshotModal
    // Action: Try to select tomorrow's date
    // Assert:
    //   - Date picker disabled for future dates
  })

  test('should create snapshot and refresh list', async () => {
    // Render: CreateSnapshotModal
    // Action: Fill form and submit
    // Assert:
    //   - API POST /snapshots called with correct data
    //   - Modal closes
    //   - Snapshot list refreshed
    //   - Success toast displayed
  })
})

describe('CompareSnapshotsView Component', () => {
  test('should display comparison table', async () => {
    // Setup: Mock 2 snapshots
    // Action: Select both and click compare
    // Assert:
    //   - Comparison table displayed
    //   - All metrics shown
    //   - Changes calculated
    //   - Color coding applied
  })

  test('should export comparison to PDF', async () => {
    // Action: Click "Export to PDF"
    // Assert:
    //   - PDF generated
    //   - Both snapshots shown side-by-side
  })
})

```

### End-to-End Tests

**Test Scenario 1: Create and Compare Snapshots**

```
1. Navigate to Budget page
2. Click "Create New Snapshot"
3. Enter "Baseline" as name, today's date, submit
4. Verify snapshot created and appears in list
5. Make some budget modifications to a cost code
6. Create second snapshot: "After Modifications"
7. Click "Compare" on first snapshot
8. Select second snapshot
9. Verify comparison shows budget changes
10. Verify variance calculations are correct

```

**Test Scenario 2: Snapshot Data Accuracy**

```
1. Setup project with:
   - Cost Code 1: $100K budget
   - Cost Code 2: $200K budget
2. Create Snapshot A (baseline)
3. Add $10K modification to CC1
4. Add $5K actual cost to CC1
5. Create Snapshot B (after changes)
6. Verify Snapshot A shows original values
7. Verify Snapshot B shows updated values
8. Verify Snapshot A data unchanged (immutability test)

```

---

## 7. Sample Test Data

### Sample Snapshot Creation

```json
{
  "snapshot_name": "Pre-Change Order #5",
  "snapshot_date": "2025-01-06T00:00:00Z",
  "notes": "Baseline before major structural modifications"
}

```

### Sample Snapshot Response

```json
{
  "snapshot_id": "snap_789abc",
  "project_id": "proj_123",
  "snapshot_name": "Pre-Change Order #5",
  "snapshot_date": "2025-01-06T00:00:00Z",
  "created_by": "user_456",
  "created_by_name": "John Doe",
  "created_at": "2025-01-06T08:05:54Z",
  "is_active": true,
  "notes": "Baseline before major structural modifications",
  "snapshot_totals": {
    "total_original_budget": 1000000.00,
    "total_budget_modifications": 50000.00,
    "total_approved_change_orders": 25000.00,
    "total_revised_budget": 1075000.00,
    "total_actual_costs": 600000.00,
    "total_remaining_budget": 475000.00,
    "total_forecast_at_completion": 950000.00,
    "total_variance": 125000.00,
    "total_variance_percent": 11.63
  },
  "cost_code_snapshots": [
    {
      "snapshot_cost_code_id": "sncc_111",
      "cost_code_id": "cc_001",
      "cost_code_name": "Foundation",
      "cost_code_tier": "Division 1",
      "original_budget": 250000.00,
      "budget_modifications": 5000.00,
      "approved_change_orders": 0.00,
      "revised_budget": 255000.00,
      "actual_costs": 180000.00,
      "remaining_budget": 75000.00,
      "forecast_at_completion": 245000.00,
      "variance": 10000.00,
      "variance_percent": 3.92
    },
    {
      "snapshot_cost_code_id": "sncc_112",
      "cost_code_id": "cc_002",
      "cost_code_name": "Framing",
      "cost_code_tier": "Division 2",
      "original_budget": 400000.00,
      "budget_modifications": 15000.00,
      "approved_change_orders": 25000.00,
      "revised_budget": 440000.00,
      "actual_costs": 320000.00,
      "remaining_budget": 120000.00,
      "forecast_at_completion": 420000.00,
      "variance": 20000.00,
      "variance_percent": 4.55
    }
  ]
}

```

### Sample Comparison Data

```json
{
  "snapshot_1": {
    "snapshot_id": "snap_789abc",
    "snapshot_name": "Pre-Change Order #5",
    "snapshot_date": "2025-01-06T00:00:00Z",
    "snapshot_totals": {
      "total_revised_budget": 1075000.00,
      "total_actual_costs": 600000.00,
      "total_variance": 125000.00
    }
  },
  "snapshot_2": {
    "snapshot_id": "snap_456def",
    "snapshot_name": "Pre-Change Order #4",
    "snapshot_date": "2024-12-20T00:00:00Z",
    "snapshot_totals": {
      "total_revised_budget": 1050000.00,
      "total_actual_costs": 550000.00,
      "total_variance": 100000.00
    }
  },
  "comparison": {
    "revised_budget_change": 25000.00,
    "revised_budget_change_percent": 2.38,
    "actual_costs_change": 50000.00,
    "actual_costs_change_percent": 9.09,
    "variance_change": 25000.00,
    "variance_change_percent": 25.00,
    "cost_code_changes": [
      {
        "cost_code_id": "cc_001",
        "cost_code_name": "Foundation",
        "snapshot_1_revised_budget": 255000.00,
        "snapshot_2_revised_budget": 250000.00,
        "revised_budget_change": 5000.00,
        "snapshot_1_actual_costs": 180000.00,
        "snapshot_2_actual_costs": 170000.00,
        "actual_costs_change": 10000.00,
        "snapshot_1_variance": 10000.00,
        "snapshot_2_variance": 15000.00,
        "variance_change": -5000.00,
        "trend": "favorable"
      }
    ]
  }
}

```

---

## 8. Implementation Checklist

**Database & Backend:**

- [ ]  Create budget_snapshots table with indexes
- [ ]  Create snapshot_cost_codes table with indexes
- [ ]  Implement POST /snapshots endpoint
- [ ]  Implement GET /snapshots/:snapshotId endpoint
- [ ]  Implement GET /snapshots list endpoint (with pagination)
- [ ]  Implement GET /snapshots/:id1/compare/:id2 endpoint
- [ ]  Implement PATCH /snapshots/:snapshotId endpoint
- [ ]  Add error handling for all endpoints
- [ ]  Add role-based access control (PROJECT_MANAGER, VIEWER)
- [ ]  Write and pass all unit tests
- [ ]  Test data immutability (snapshots cannot be modified after creation)

**Frontend:**

- [ ]  Create SnapshotsListView component
- [ ]  Create CreateSnapshotModal component
- [ ]  Create SnapshotDetailView component
- [ ]  Create CompareSnapshotsView component
- [ ]  Create SnapshotEditModal component
- [ ]  Create custom hooks for snapshot API calls
- [ ]  Integrate into Budget page UI
- [ ]  Add success/error toast notifications
- [ ]  Implement color coding for variance (green/red)
- [ ]  Write and pass component tests
- [ ]  Write and pass integration tests

**QA & Documentation:**

- [ ]  Write end-to-end test scenarios
- [ ]  Test with multiple snapshots
- [ ]  Test comparison functionality
- [ ]  Test export to PDF (if implemented)
- [ ]  Verify data accuracy across all endpoints
- [ ]  Document API changes in team wiki
- [ ]  Update user-facing documentation
- [ ]  Create screenshot documentation

**Performance & Monitoring:**

- [ ]  Verify snapshot creation performance (< 2 seconds)
- [ ]  Verify list view loads in < 500ms
- [ ]  Monitor database query performance
- [ ]  Add logging for snapshot operations
- [ ]  Test with large projects (100+ cost codes)

---

## 9. Completion Criteria

This phase is complete when:

✅ All 5 API endpoints created and tested
✅ Budget snapshot and cost code data captured accurately
✅ Snapshot comparison functionality working
✅ All 5 UI components rendered and functional
✅ Snapshots list displays with sorting/filtering
✅ Create snapshot modal validates input correctly
✅ Snapshot detail view shows accurate calculations
✅ Compare snapshots shows correct deltas
✅ All unit tests passing (>90% code coverage)
✅ All integration tests passing
✅ End-to-end test scenarios passing
✅ No console errors or warnings
✅ Performance benchmarks met
✅ Ready to proceed to Phase 2 (Forecasting Engine)

---

**ESTIMATED TIME:** 14 hours
**PRIORITY:** P1
**SPRINT:** Sprint 3 (Week 3)