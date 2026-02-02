# PHASE 4: CHANGE HISTORY & AUDIT TRAIL

## Implementation Instructions (Copy-Paste Ready for Claude Code)

**Priority Level:** P0 (Critical - Compliance and accountability)
**Estimated Effort:** 16 hours
**Sprint:** Sprint 8 (Week 8)
**Dependencies:** Phase 1A (Budget Modifications), Phase 1B (Cost Actuals Integration), Phase 2 (Forecasting Engine), Phase 3 (Variance Analysis)

---

## OVERVIEW

The Change History & Audit Trail module provides complete traceability and accountability for all budget changes. This includes:

- Complete audit log of all budget modifications
- Change approval workflows and sign-offs
- Before/after snapshots for all changes
- Change impact analysis
- Compliance reporting and export
- Change commentary and justifications
- Change reversal/rollback capabilities

---

## 1. DATABASE SCHEMA

### TABLE: budget_change_history

```sql
CREATE TABLE budget_change_history (
  change_id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  cost_code_id UUID NOT NULL,

  change_type VARCHAR(50),
  change_category VARCHAR(50),

  entity_id UUID,
  entity_type VARCHAR(50),

  change_description TEXT NOT NULL,
  change_reason TEXT,

  previous_state JSONB,
  new_state JSONB,
  changed_fields JSONB,

  amount_change DECIMAL(15,2),
  percent_change DECIMAL(5,2),

  change_status VARCHAR(50),
  requested_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP,
  rejected_reason TEXT,

  change_date TIMESTAMP NOT NULL,
  effective_date TIMESTAMP,

  change_sequence_number INT,
  is_reversible BOOLEAN DEFAULT true,
  reversal_of_change_id UUID,
  reversed_by_change_id UUID,

  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (cost_code_id) REFERENCES cost_codes(cost_code_id),
  FOREIGN KEY (requested_by) REFERENCES users(user_id),
  FOREIGN KEY (approved_by) REFERENCES users(user_id),
  FOREIGN KEY (reversal_of_change_id) REFERENCES budget_change_history(change_id)
);

```

**Indexes:**

- `(project_id, change_date DESC)` - for querying project history
- `(project_id, cost_code_id, change_date DESC)` - for cost code history
- `change_type` - for filtering by type
- `change_status` - for workflow
- `entity_id` - for finding all changes to entity
- `requested_by` - for user activity
- `approved_by` - for approver activity
- `change_sequence_number` - for chronological ordering

### TABLE: change_approvals

```sql
CREATE TABLE change_approvals (
  approval_id UUID PRIMARY KEY,
  change_id UUID NOT NULL,

  approval_sequence INT,
  approver_id UUID NOT NULL,
  approver_role VARCHAR(50),

  approval_status VARCHAR(50),
  approval_notes TEXT,

  approval_date TIMESTAMP,
  reminder_sent_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (change_id) REFERENCES budget_change_history(change_id),
  FOREIGN KEY (approver_id) REFERENCES users(user_id)
);

```

**Indexes:**

- `(change_id)` - for querying approvals for a change
- `(approver_id, approval_status)` - for user's pending approvals
- `approval_status` - for workflow

### TABLE: change_impact_analysis

```sql
CREATE TABLE change_impact_analysis (
  impact_id UUID PRIMARY KEY,
  change_id UUID NOT NULL,

  impact_on_cost_code_variance DECIMAL(15,2),
  impact_on_project_variance DECIMAL(15,2),
  impact_on_forecast DECIMAL(15,2),
  impact_on_contingency DECIMAL(15,2),

  affects_other_cost_codes BOOLEAN,
  affected_cost_codes JSONB,

  affects_forecast BOOLEAN,
  forecast_impact_description TEXT,

  affects_schedule BOOLEAN,
  schedule_impact_days INT,
  schedule_impact_description TEXT,

  risk_level VARCHAR(50),
  risk_description TEXT,
  mitigation_actions TEXT,

  analyzed_by UUID NOT NULL,
  analyzed_at TIMESTAMP NOT NULL,

  FOREIGN KEY (change_id) REFERENCES budget_change_history(change_id),
  FOREIGN KEY (analyzed_by) REFERENCES users(user_id)
);

```

**Indexes:**

- `(change_id)` - for querying impact for a change
- `risk_level` - for filtering by risk

### TABLE: change_commentary

```sql
CREATE TABLE change_commentary (
  commentary_id UUID PRIMARY KEY,
  change_id UUID NOT NULL,

  comment_type VARCHAR(50),
  title VARCHAR(255),
  content TEXT NOT NULL,

  is_summary BOOLEAN DEFAULT false,

  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (change_id) REFERENCES budget_change_history(change_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

```

**Indexes:**

- `(change_id)` - for querying commentary
- `comment_type` - for filtering
- `is_summary` - for finding primary justification

### TABLE: change_audit_log

```sql
CREATE TABLE change_audit_log (
  audit_id UUID PRIMARY KEY,
  change_id UUID NOT NULL,

  action VARCHAR(100) NOT NULL,
  action_description TEXT,

  performed_by UUID NOT NULL,
  performed_at TIMESTAMP NOT NULL,

  ip_address VARCHAR(45),
  user_agent TEXT,

  FOREIGN KEY (change_id) REFERENCES budget_change_history(change_id),
  FOREIGN KEY (performed_by) REFERENCES users(user_id)
);

```

**Indexes:**

- `(change_id)` - for querying audit log for change
- `performed_by` - for user activity
- `performed_at` - for time-based queries
- `action` - for filtering by action type

---

## 2. API ENDPOINTS

### ENDPOINT 1: Get Budget Change History

**Route:** `GET /api/projects/{projectId}/budget/history?costCodeId={id}&limit=50&offset=0`

**Query Parameters:**

- `costCodeId` (optional): Filter to specific cost code
- `changeType` (optional): Filter by change type
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date
- `limit` (default: 50)
- `offset` (default: 0)

**Response (200 OK):**

```json
{
  "changes": [
    {
      "change_id": "ch_001",
      "project_id": "proj_123",
      "cost_code_id": "cc_001",
      "cost_code_name": "Foundation",

      "change_type": "BudgetModification",
      "change_category": "Budget",
      "change_description": "Approved budget modification for concrete price increase",
      "change_reason": "Material cost escalation due to market conditions",

      "entity_id": "bm_001",
      "entity_type": "BudgetModification",

      "amount_change": 5000.00,
      "percent_change": 2.00,

      "change_status": "Approved",
      "change_date": "2025-01-06T10:30:00Z",
      "effective_date": "2025-01-06T10:30:00Z",

      "requested_by": "user_456",
      "requested_by_name": "John Doe",
      "approved_by": "user_789",
      "approved_by_name": "Jane Smith",
      "approved_at": "2025-01-06T11:00:00Z",

      "change_sequence_number": 15,

      "previous_state": {
        "original_budget": 250000.00,
        "budget_modifications": 0.00,
        "revised_budget": 250000.00
      },

      "new_state": {
        "original_budget": 250000.00,
        "budget_modifications": 5000.00,
        "revised_budget": 255000.00
      },

      "changed_fields": ["budget_modifications", "revised_budget"],

      "created_at": "2025-01-06T10:30:00Z"
    }
  ],
  "total_count": 127,
  "limit": 50,
  "offset": 0,
  "has_more": true
}

```

**Backend Logic:**

1. Query budget_change_history with filters
2. Order by change_sequence_number DESC (most recent first)
3. Apply pagination
4. Join with users table for approver/requester names
5. Return with total count

---

### ENDPOINT 2: Get Detailed Change Record

**Route:** `GET /api/projects/{projectId}/budget/history/{changeId}`

**Response (200 OK):**

```json
{
  "change_id": "ch_001",
  "project_id": "proj_123",
  "cost_code_id": "cc_001",
  "cost_code_name": "Foundation",

  "change_type": "BudgetModification",
  "change_category": "Budget",
  "change_description": "Approved budget modification for concrete price increase",
  "change_reason": "Material cost escalation due to market conditions",

  "amount_change": 5000.00,
  "percent_change": 2.00,

  "change_status": "Approved",
  "change_date": "2025-01-06T10:30:00Z",
  "effective_date": "2025-01-06T10:30:00Z",

  "requested_by_name": "John Doe",
  "requested_by_email": "john@example.com",
  "approved_by_name": "Jane Smith",
  "approved_by_email": "jane@example.com",
  "approved_at": "2025-01-06T11:00:00Z",

  "previous_state": {
    "original_budget": 250000.00,
    "budget_modifications": 0.00,
    "revised_budget": 250000.00,
    "job_to_date_cost": 150000.00
  },

  "new_state": {
    "original_budget": 250000.00,
    "budget_modifications": 5000.00,
    "revised_budget": 255000.00,
    "job_to_date_cost": 150000.00
  },

  "changed_fields": [
    {
      "field_name": "budget_modifications",
      "previous_value": 0.00,
      "new_value": 5000.00,
      "change_amount": 5000.00
    },
    {
      "field_name": "revised_budget",
      "previous_value": 250000.00,
      "new_value": 255000.00,
      "change_amount": 5000.00
    }
  ],

  "approvals": [
    {
      "approval_id": "app_001",
      "approver_name": "Jane Smith",
      "approver_role": "ProjectManager",
      "approval_status": "Approved",
      "approval_notes": "Approved. Confirmed with vendor.",
      "approval_date": "2025-01-06T11:00:00Z"
    }
  ],

  "impact_analysis": {
    "impact_on_cost_code_variance": -5000.00,
    "impact_on_project_variance": -5000.00,
    "impact_on_forecast": -5000.00,
    "affects_other_cost_codes": false,
    "affects_forecast": true,
    "forecast_impact_description": "Reduces contingency available for other cost codes",
    "risk_level": "Low",
    "risk_description": "Material price increase is isolated to this cost code"
  },

  "commentary": [
    {
      "commentary_id": "cc_001",
      "comment_type": "Justification",
      "title": "Concrete Price Escalation",
      "content": "Concrete prices increased 5% due to recent market conditions. This modification reflects the revised estimate from our concrete supplier based on current market rates.",
      "is_summary": true,
      "created_by_name": "John Doe",
      "created_at": "2025-01-06T10:30:00Z"
    }
  ],

  "audit_log": [
    {
      "audit_id": "au_001",
      "action": "Created",
      "action_description": "Change record created",
      "performed_by_name": "John Doe",
      "performed_at": "2025-01-06T10:30:00Z"
    },
    {
      "audit_id": "au_002",
      "action": "Submitted",
      "action_description": "Change submitted for approval",
      "performed_by_name": "John Doe",
      "performed_at": "2025-01-06T10:45:00Z"
    },
    {
      "audit_id": "au_003",
      "action": "Approved",
      "action_description": "Change approved",
      "performed_by_name": "Jane Smith",
      "performed_at": "2025-01-06T11:00:00Z"
    }
  ],

  "is_reversible": true,
  "created_at": "2025-01-06T10:30:00Z"
}

```

**Backend Logic:**

1. Query budget_change_history for change_id
2. Query change_approvals for that change
3. Query change_impact_analysis for that change
4. Query change_commentary for that change
5. Query change_audit_log for that change
6. Parse JSONB fields for display
7. Return complete change record

---

### ENDPOINT 3: Reverse/Rollback Change

**Route:** `POST /api/projects/{projectId}/budget/history/{changeId}/reverse`

**Request Body:**

```json
{
  "reversal_reason": "Concrete prices stabilized, reverting to original estimate",
  "effective_date": "2025-01-07T00:00:00Z"
}

```

**Response (201 Created):**

```json
{
  "original_change_id": "ch_001",
  "reversal_change_id": "ch_002",

  "change_description": "Reversal of change ch_001: Approved budget modification for concrete price increase",
  "change_reason": "Concrete prices stabilized, reverting to original estimate",

  "amount_change": -5000.00,
  "percent_change": -2.00,

  "previous_state": {
    "original_budget": 250000.00,
    "budget_modifications": 5000.00,
    "revised_budget": 255000.00
  },

  "new_state": {
    "original_budget": 250000.00,
    "budget_modifications": 0.00,
    "revised_budget": 250000.00
  },

  "change_status": "Approved",
  "reversal_of_change_id": "ch_001",
  "created_at": "2025-01-07T08:00:00Z"
}

```

**Backend Logic:**

1. Verify user has PROJECT_MANAGER role
2. Query budget_change_history for change_id
3. Check if change is_reversible = true
4. Create new change record:
    - Set reversal_of_change_id = original change_id
    - Set change_description = "Reversal of change {original_id}: {description}"
    - Set previous_state = original new_state
    - Set new_state = original previous_state
    - Set amount_change = negative of original
5. Update original change: set reversed_by_change_id = new change_id
6. Auto-approve reversal (mark as Approved)
7. Log reversal action
8. Return new reversal change record

**Error Handling:**

- `400` Change is not reversible (e.g., historical changes)
- `403` User lacks PROJECT_MANAGER role
- `404` Change not found
- `409` Change already reversed

---

### ENDPOINT 4: Submit Change for Approval

**Route:** `PATCH /api/projects/{projectId}/budget/history/{changeId}/submit`

**Request Body:**

```json
{
  "submission_notes": "Ready for review and approval"
}

```

**Response (200 OK):**

```json
{
  "change_id": "ch_001",
  "change_status": "Submitted",
  "submission_notes": "Ready for review and approval",
  "submitted_at": "2025-01-06T10:45:00Z",

  "approvals": [
    {
      "approval_id": "app_001",
      "approver_name": "Jane Smith",
      "approver_role": "ProjectManager",
      "approval_status": "Pending",
      "created_at": "2025-01-06T10:45:00Z"
    }
  ]
}

```

**Backend Logic:**

1. Verify user has permission to submit (usually requester)
2. Query budget_change_history for change_id
3. Verify change_status = "Draft"
4. Update change_status = "Submitted"
5. Create change_approvals records for required approvers (based on project rules)
6. Log "Submitted" action
7. Send notifications to approvers
8. Return updated change with approvals

---

### ENDPOINT 5: Approve Change

**Route:** `PATCH /api/projects/{projectId}/budget/history/{changeId}/approve`

**Request Body:**

```json
{
  "approval_id": "app_001",
  "approval_notes": "Approved. Confirmed with vendor."
}

```

**Response (200 OK):**

```json
{
  "change_id": "ch_001",
  "change_status": "Approved",
  "approved_by": "user_789",
  "approved_by_name": "Jane Smith",
  "approved_at": "2025-01-06T11:00:00Z",

  "approvals": [
    {
      "approval_id": "app_001",
      "approver_name": "Jane Smith",
      "approval_status": "Approved",
      "approval_notes": "Approved. Confirmed with vendor.",
      "approval_date": "2025-01-06T11:00:00Z"
    }
  ]
}

```

**Backend Logic:**

1. Verify user is the assigned approver
2. Query budget_change_history for change_id
3. Update change_approvals: set approval_status = "Approved", approval_notes, approval_date
4. Check if all required approvals completed
5. If all approved: update change_status = "Approved", set approved_by, approved_at
6. Log "Approved" action
7. Update related entities (e.g., apply budget modification)
8. Return updated change

---

### ENDPOINT 6: Reject Change

**Route:** `PATCH /api/projects/{projectId}/budget/history/{changeId}/reject`

**Request Body:**

```json
{
  "rejection_reason": "Needs clarification on pricing assumptions"
}

```

**Response (200 OK):**

```json
{
  "change_id": "ch_001",
  "change_status": "Rejected",
  "rejected_reason": "Needs clarification on pricing assumptions",
  "rejected_by": "user_789",
  "rejected_by_name": "Jane Smith",
  "rejected_at": "2025-01-06T11:00:00Z"
}

```

**Backend Logic:**

1. Verify user is assigned approver
2. Query budget_change_history for change_id
3. Update change_status = "Rejected"
4. Store rejection_reason
5. Log "Rejected" action
6. Notify requester
7. Return updated change

---

### ENDPOINT 7: Export Change History

**Route:** `POST /api/projects/{projectId}/budget/history/export`

**Request Body:**

```json
{
  "export_format": "PDF",
  "include_sections": [
    "SummaryTable",
    "DetailedChanges",
    "ApprovalLog",
    "AuditTrail"
  ],
  "date_range": {
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2025-01-06T00:00:00Z"
  },
  "filters": {
    "change_status": "Approved",
    "change_type": "BudgetModification"
  }
}

```

**Response (200 OK):**

```json
{
  "export_id": "exp_001",
  "project_id": "proj_123",
  "export_format": "PDF",
  "export_date": "2025-01-06T12:00:00Z",
  "file_url": "<https://bucket.s3.amazonaws.com/exports/exp_001.pdf>",
  "file_size_bytes": 1248576,

  "summary": {
    "total_changes": 127,
    "changes_in_export": 85,
    "total_amount_changed": 1437486.89,
    "changes_approved": 85,
    "changes_pending": 0,
    "changes_rejected": 0
  },

  "created_at": "2025-01-06T12:00:00Z",
  "expires_at": "2025-01-13T12:00:00Z"
}

```

**Backend Logic:**

1. Query budget_change_history with filters
2. Generate report sections:
    - Summary table with key metrics
    - Detailed change records
    - Approval workflow logs
    - Complete audit trail
3. Format as requested (PDF, Excel, CSV)
4. Store export metadata
5. Generate time-limited download URL
6. Log export action
7. Return export record

---

### ENDPOINT 8: Get Change Statistics

**Route:** `GET /api/projects/{projectId}/budget/history/statistics?period=monthly`

**Query Parameters:**

- `period` (optional): monthly, quarterly, yearly (default: monthly)

**Response (200 OK):**

```json
{
  "project_id": "proj_123",
  "statistics_period": "monthly",

  "change_summary": {
    "total_changes": 127,
    "total_amount_changed": 1437486.89,
    "total_budget_modifications": 1437486.89,
    "total_cost_adjustments": 0.00,
    "total_forecast_updates": 45,
    "total_reversals": 3
  },

  "change_by_type": [
    {
      "change_type": "BudgetModification",
      "count": 52,
      "total_amount": 925000.00
    },
    {
      "change_type": "CostActual",
      "count": 45,
      "total_amount": 450000.00
    },
    {
      "change_type": "Forecast",
      "count": 25,
      "total_amount": 62486.89
    }
  ],

  "change_by_status": [
    {
      "status": "Approved",
      "count": 122,
      "percent": 96.1
    },
    {
      "status": "Pending",
      "count": 3,
      "percent": 2.4
    },
    {
      "status": "Rejected",
      "count": 2,
      "percent": 1.5
    }
  ],

  "approval_metrics": {
    "average_approval_time_hours": 4.2,
    "fastest_approval_hours": 0.5,
    "slowest_approval_hours": 24.3,
    "total_approvals": 127,
    "approved_on_first_try": 120,
    "required_revision_count": 7
  },

  "top_requesters": [
    {
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "change_count": 45,
      "total_amount": 450000.00
    }
  ],

  "top_approvers": [
    {
      "user_name": "Jane Smith",
      "user_email": "jane@example.com",
      "approval_count": 52,
      "rejection_count": 0,
      "average_approval_time_hours": 3.5
    }
  ],

  "monthly_trends": [
    {
      "month": "2024-11",
      "changes": 35,
      "total_amount": 425000.00,
      "approved_count": 33,
      "rejected_count": 2
    },
    {
      "month": "2024-12",
      "changes": 48,
      "total_amount": 612486.89,
      "approved_count": 46,
      "rejected_count": 0
    },
    {
      "month": "2025-01",
      "changes": 44,
      "total_amount": 400000.00,
      "approved_count": 43,
      "rejected_count": 1
    }
  ]
}

```

**Backend Logic:**

1. Query budget_change_history with period grouping
2. Aggregate by change_type, change_status
3. Calculate approval metrics (average time, success rate)
4. Identify top requesters and approvers
5. Generate monthly/quarterly trend data
6. Return comprehensive statistics

---

## 3. BACKEND LOGIC REQUIREMENTS

### Change Recording Logic

```tsx
function recordChange(
  projectId: UUID,
  costCodeId: UUID,
  changeType: string,
  entityId: UUID,
  entityType: string,
  previousState: object,
  newState: object,
  requestedBy: UUID,
  reason: string
) {
  // Calculate field differences
  const changedFields = [];
  const changes = {};

  for (const key in newState) {
    if (previousState[key] !== newState[key]) {
      changedFields.push(key);
      changes[key] = {
        previous: previousState[key],
        new: newState[key]
      };
    }
  }

  // Calculate amount and percent change
  const amountChange = calculateAmountChange(previousState, newState, changeType);
  const percentChange = previousState.revised_budget
    ? (amountChange / previousState.revised_budget) * 100
    : 0;

  // Create change record
  const changeRecord = {
    change_id: generateUUID(),
    project_id: projectId,
    cost_code_id: costCodeId,
    change_type: changeType,
    entity_id: entityId,
    entity_type: entityType,
    previous_state: previousState,
    new_state: newState,
    changed_fields: changedFields,
    amount_change: amountChange,
    percent_change: percentChange,
    change_status: 'Draft',
    requested_by: requestedBy,
    change_date: new Date(),
    change_sequence_number: getNextSequenceNumber(projectId),
    created_at: new Date()
  };

  // Insert change record
  database.insert('budget_change_history', changeRecord);

  // Log initial action
  logAuditAction(changeRecord.change_id, 'Created', requestedBy);

  return changeRecord;
}

```

### Change Approval Workflow

```tsx
function createApprovalWorkflow(changeId: UUID, projectId: UUID) {
  // Get approval requirements based on project policy and change amount
  const change = getChange(changeId);
  const approvalRequirements = getApprovalRequirements(projectId, change.amount_change);

  // Create approval records
  const approvals = approvalRequirements.map((requirement, index) => ({
    approval_id: generateUUID(),
    change_id: changeId,
    approval_sequence: index + 1,
    approver_role: requirement.role,
    approver_id: requirement.userId || null,
    approval_status: 'Pending',
    created_at: new Date()
  }));

  // Insert approval records
  database.insertMany('change_approvals', approvals);

  // Notify approvers
  approvals.forEach(approval => {
    if (approval.approver_id) {
      sendApprovalNotification(approval.approver_id, changeId);
    } else {
      notifyUsersWithRole(projectId, approval.approver_role, changeId);
    }
  });

  return approvals;
}

```

### Impact Analysis Logic

```tsx
function analyzeChangeImpact(changeId: UUID) {
  const change = getChange(changeId);
  const impact = {
    impact_id: generateUUID(),
    change_id: changeId,

    impact_on_cost_code_variance: change.amount_change,
    impact_on_project_variance: calculateProjectImpact(change),
    impact_on_forecast: calculateForecastImpact(change),
    impact_on_contingency: calculateContingencyImpact(change),

    affects_other_cost_codes: checkAffectsOtherCodes(change),
    affected_cost_codes: getAffectedCostCodes(change),

    affects_forecast: change.amount_change > 0,

    affects_schedule: checkAffectsSchedule(change),
    schedule_impact_days: calculateScheduleImpact(change),

    risk_level: assessRiskLevel(change),
    risk_description: describeRisks(change)
  };

  // Insert impact analysis
  database.insert('change_impact_analysis', impact);

  return impact;
}

```

---

## 4. UI COMPONENTS

### Component 1: Budget Change History Timeline

**Location:** Budget page → "Change History" tab

**Visual Elements:**

**Filter & Sort Controls:**

- Date range picker (start/end)
- Filter by: Change Type, Status, Requester, Cost Code
- Sort by: Date (newest/oldest), Amount, Status
- Search by: Description, Reason

**Timeline Display:**

- Vertical timeline showing chronological changes
- Each change as card/entry showing:
    - Change date and time
    - Change description (one-liner)
    - Amount changed (color-coded: red for negative, green for positive)
    - Status badge (Draft/Submitted/Approved/Rejected)
    - Requester name and avatar
    - Quick action buttons: View Details, Reverse

**Change Summary Statistics:**

- Total Changes This Period: 127
- Total Amount Changed: +$1,437,486.89
- Approved: 122 (96%)
- Pending: 3 (2%)
- Rejected: 2 (2%)

---

### Component 2: Change Detail View

**Triggered by:** "View Details" on change entry

**View Layout:**

**Header:**

- Change type badge
- Change description (full text)
- Change date and status
- Amount changed (highlighted)
- Actions: Approve, Reject, Reverse, Export, Add Commentary

**Change Summary Cards:**

- Requested By: John Doe ([john@example.com](mailto:john@example.com)) on Jan 6, 10:30 AM
- Approved By: Jane Smith ([jane@example.com](mailto:jane@example.com)) on Jan 6, 11:00 AM
- Change Category: Budget
- Change Reason: Material cost escalation due to market conditions

**Before/After Comparison:**

- Table showing:
    - Field Name | Previous Value | New Value | Change Amount
    - Example: revised_budget | $250,000 | $255,000 | +$5,000

**Impact Analysis Section:**

- Impact on Cost Code Variance: -$5,000
- Impact on Project Variance: -$5,000
- Impact on Forecast: -$5,000
- Affects Other Cost Codes: No
- Risk Level: Low
- Risk Description: Material price increase is isolated to this cost code

**Approval Workflow:**

- Step 1: ProjectManager (Jane Smith) - Approved on Jan 6, 11:00 AM
    - Approval notes: "Approved. Confirmed with vendor."
- All approvals complete ✓

**Commentary Section:**

- Justification: "Concrete Price Escalation"
    - "Concrete prices increased 5% due to recent market conditions. This modification reflects the revised estimate from our concrete supplier based on current market rates."
    - Added by John Doe on Jan 6, 10:30 AM
- Add new commentary button

**Audit Trail:**

- Jan 6, 10:30 AM - Change Created by John Doe
- Jan 6, 10:45 AM - Change Submitted by John Doe
- Jan 6, 11:00 AM - Change Approved by Jane Smith

---

### Component 3: Change Approval Interface

**Location:** User's approval queue or change detail view

**Visual Elements:**

**Approval Card:**

- Change description
- Amount changed
- Requester info
- Change reason
- Impact summary
- Request date
- Status: "Awaiting Your Approval"

**Approval Details Section:**

- Before/After comparison table
- Commentary from requester
- Previous approvals (if any)

**Approval Action Section:**

- Approval notes textarea
- Buttons: "Approve", "Request Revision", "Reject"

**If Rejecting:**

- Rejection reason textarea (required)
- Optional: "Request Revision" checkbox to allow resubmission

---

### Component 4: Change History Export View

**Triggered by:** "Export" button or "Export History" button

**View Layout:**

**Export Configuration:**

- Export Format: Dropdown (PDF, Excel, CSV)
- Date Range: Start/End date pickers
- Sections to Include: Checkboxes
    - Summary Metrics
    - Detailed Changes
    - Approval Log
    - Audit Trail
    - Cost Code Impact Analysis

**Filters:**

- Change Status: Checkboxes (Approved, Pending, Rejected)
- Change Type: Checkboxes (BudgetModification, CostActual, etc.)
- Cost Code: Multi-select dropdown

**Export Summary:**

- Total changes matching filters: 85
- Date range: Jan 1, 2024 - Jan 6, 2025
- Total amount changed: $1,437,486.89

**Buttons:**

- "Generate Export" (primary)
- "Save Configuration as Template" (secondary)
- Cancel

**Export Results (after generation):**

- File ready for download
- File size
- Download button
- Link expires in: 7 days
- Copy link to email button

---

### Component 5: Change Statistics Dashboard

**Location:** Budget page → "History" tab → "Statistics" section

**Visual Elements:**

**Key Metrics Cards:**

- Total Changes: 127
- Total Amount Changed: +$1,437,486.89
- Approval Rate: 96.1%
- Average Approval Time: 4.2 hours

**Changes by Type (Pie Chart):**

- BudgetModification: 52 (41%)
- CostActual: 45 (35%)
- Forecast: 25 (20%)
- Other: 5 (4%)

**Changes by Status (Pie Chart):**

- Approved: 122 (96%)
- Pending: 3 (2%)
- Rejected: 2 (2%)

**Monthly Trend Chart (Line Chart):**

- X-axis: Month
- Y-axis: Number of changes
- Lines: Total Changes, Approved, Rejected
- Shows 12-month trend

**Top Requesters (Table):**

- User | Changes | Total Amount | Approval Rate
- John Doe | 45 | $450,000 | 98%
- Jane Smith | 32 | $387,486 | 94%
- Bob Johnson | 28 | $350,000 | 96%

**Approval Performance (Table):**

- Approver | Total Approved | Avg Time | Rejection Rate
- Jane Smith | 52 | 3.5 hrs | 0%
- Mike Davis | 38 | 5.2 hrs | 5%

---

## 5. FRONTEND INTEGRATION CHECKLIST

- [ ]  Import API client functions for change history endpoints
- [ ]  Create ChangeHistoryContext or Redux store:
    - [ ]  changes (array of changes)
    - [ ]  selectedChange (current change)
    - [ ]  changeStatistics (aggregated stats)
    - [ ]  pendingApprovals (user's approvals)
    - [ ]  isLoading (boolean)
    - [ ]  error (error message or null)
- [ ]  Create custom hooks:
    - [ ]  useChangeHistory(projectId, filters) - fetch changes
    - [ ]  useChangeDetail(changeId) - fetch single change
    - [ ]  useApproveChange(changeId, notes) - approve
    - [ ]  useRejectChange(changeId, reason) - reject
    - [ ]  useReverseChange(changeId, reason) - reverse
    - [ ]  useChangeStatistics(projectId) - fetch stats
    - [ ]  usePendingApprovals(userId) - fetch pending approvals
- [ ]  Create React components:
    - [ ]  ChangeHistoryTimeline
    - [ ]  ChangeDetailView
    - [ ]  ChangeApprovalInterface
    - [ ]  ChangeHistoryExportView
    - [ ]  ChangeStatisticsDashboard
- [ ]  Integrate into Budget page:
    - [ ]  Add "Change History" tab to budget tabs
    - [ ]  Add change timeline to main view
    - [ ]  Link change detail from timeline entries
    - [ ]  Add approval queue to user dashboard
    - [ ]  Add statistics dashboard to budget summary
- [ ]  Add notifications:
    - [ ]  Toast on successful change creation
    - [ ]  Toast on successful change approval
    - [ ]  Toast on successful change reversal
    - [ ]  Email notifications for pending approvals
    - [ ]  Reminder emails for overdue approvals
    - [ ]  Loading indicators for async operations
- [ ]  Add interactive features:
    - [ ]  Drill-down from timeline to detail
    - [ ]  Before/after side-by-side comparison
    - [ ]  Filter and search functionality
    - [ ]  Export to PDF/Excel
    - [ ]  Bulk export of multiple changes
    - [ ]  Change reversal confirmation dialog
    - [ ]  Timeline view toggle (list/timeline)

---

## 6. TESTING REQUIREMENTS

### Unit Tests (Backend)

**Test Suite: Change Recording**

```tsx
describe('recordChange function', () => {
  test('should create change record with all metadata', async () => {
    // Setup: Cost code with known previous state
    // Action: recordChange() with new state
    // Assert:
    //   - change_id generated
    //   - changed_fields populated correctly
    //   - amount_change calculated
    //   - percent_change calculated
    //   - change_sequence_number assigned
    //   - created_at
```