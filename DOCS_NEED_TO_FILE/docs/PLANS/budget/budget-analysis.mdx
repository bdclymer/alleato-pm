# BUDGET TOOL - Development Specification for AI Coding Agents

## SECTION 0: HUMAN-FRIENDLY OVERVIEW

### What is the Budget Tool?

The Procore Budget tool enables construction teams to create, manage, and forecast project budgets throughout the entire project lifecycle. It's a comprehensive financial management system that allows teams to:

- Build budgets from scratch or import existing budgets from Excel
- Track costs against original budgets with real-time updates from integrated tools
- Create modifications to budgets as scope changes and manage change orders
- Forecast completion costs using various forecasting methods and curves
- Analyze variance between budgeted and actual costs
- Create custom views for different stakeholders (owners, contractors, general contractors)
- Generate reports for financial analysis and decision-making
- Integrate with ERP systems for seamless accounting workflows

The tool is financial in nature, dealing with large dollar amounts and precise tracking. It's highly configurable with support for cost codes, cost types, vendors, and various budget modification types. Key users are project managers, accountants, and finance teams who need visibility into project spending.

**Real-world example:** A $157M project budget with modifications, approved change orders, and real-time cost tracking across multiple contractors and cost categories.

## SECTION 1: PROJECT SETUP & PREREQUISITES

### 1.1 Core Dependencies

**Financial Libraries:**

- Currency formatting and decimal precision libraries (handle $M+ amounts)
- Statistical analysis for forecasting (curve fitting algorithms)
- Cost code parsing and validation

**Integration Points:**

- ERP system API integrations (CMiC, Sage 300 CRE, ViewPoint Spectrum, Vista)
- Timesheet tool for labor cost actuals
- Change Event tool for change order tracking
- Vendor management tool for supplier tracking
- Direct Costs tool for cost tracking
- Client Contracts / Funding / Prime Contracts tools

**UI Framework:**

- Complex data grid/table library (sortable, filterable, groupable)
- Advanced forecasting visualization (curve displays)
- Responsive layout system
- Export functionality (PDF, Excel)

### 1.2 Tech Stack (Recommended)

- **Frontend:** React with TypeScript
- **Backend:** Node.js/Python with async job processing
- **Database:** PostgreSQL with jsonb for flexible cost codes
- **Data Grid:** AG-Grid or similar for complex budget tables
- **Charts:** Chart.js or D3.js for variance analysis

---

## SECTION 2: DATA MODEL
### 2.1 Core Entities (TypeScript Definitions)

```typescript
// Budget Master Record
interface Budget {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: BudgetStatus; // 'draft' | 'active' | 'locked'
  erp_synced: boolean;
  erp_sync_status?: string;
  erp_last_sync_date?: ISO8601;
  created_at: ISO8601;
  created_by_id: string;
  updated_at: ISO8601;
  updated_by_id: string;
  locked_by_id?: string;
  locked_date?: ISO8601;
  total_original_budget: Decimal; // High precision decimal
  total_budget_modifications: Decimal;
  total_approved_cos: Decimal;
  total_revised_budget: Decimal;
  total_job_to_date_cost: Decimal;
  metadata?: Record<string, any>; // Flexible for custom fields
}

// Budget Line Item (Core)
interface BudgetLineItem {
  id: string;
  budgetId: string;
  cost_code: string; // e.g., "01-3120.L"
  cost_code_id: string; // Reference to cost code master
  cost_type?: string; // 'labor' | 'material' | 'equipment' | 'subcontract' | 'other'
  description: string; // Full description like "Vice President.Labor"
  sequence_number?: number; // For ordering in UI
  original_budget_amount: Decimal;
  budget_modifications: Decimal; // Sum of all modifications
  approved_cos: Decimal; // Approved Change Orders
  revised_budget: Decimal; // original + modifications + approved_cos
  job_to_date_cost: Decimal; // Actual costs incurred
  sub_job_id?: string; // Hierarchical sub-job reference
  vendor_id?: string; // Link to vendor/subcontractor
  notes?: string; // New feature: line item notes
  attributes?: Record<string, string>; // WBS attributes for flexible grouping
  is_red_text?: boolean; // Negative value indicator
  warnings?: BudgetLineWarning[]; // Cost code not budgeted, missing type, etc.
  created_at: ISO8601;
  updated_at: ISO8601;
}

// Budget Line Item Detail (Detailed tracking)
interface BudgetLineItemDetail {
  id: string;
  budget_line_item_id: string;
  vendor?: string; // Vendor name for materials, subcontractors
  item_description?: string; // Specific item being budgeted
  detail_type: BudgetDetailType; // 'original_budget' | 'budget_modification' | 'direct_cost' | etc.
  amount: Decimal;
  change_event_id?: string; // Link to change event/change order
  created_from?: string; // Source: 'direct_cost' | 'timesheet' | 'vendor_invoice' | 'manual'
  created_at: ISO8601;
}

// Budget Modification (Change to budget)
interface BudgetModification {
  id: string;
  budgetId: string;
  line_item_id: string;
  modification_type: ModificationType; // 'addition' | 'deduction'
  reason?: string;
  change_event_id?: string;
  approved_co_id?: string;
  amount: Decimal;
  created_by_id: string;
  created_at: ISO8601;
  approved_by_id?: string;
  approved_at?: ISO8601;
  voided_by_id?: string;
  voided_at?: ISO8601;
  voided_reason?: string;
  is_voided: boolean;
}

// Budget Views (Different perspectives)
interface BudgetView {
  id: string;
  budgetId: string;
  name: string; // "Procore Standard Budget", "ERP Job Cost Detail Budget", etc.
  view_type: ViewType; // 'standard' | 'custom' | 'labor_productivity' | 'erp_integration'
  is_system_default: boolean;
  columns: BudgetColumn[];
  filters?: BudgetFilter[];
  grouping?: GroupingRule;
  snapshot_type?: SnapshotType;
  applies_to_company?: boolean;
  created_at: ISO8601;
}

// Budget Column (What data to display)
interface BudgetColumn {
  id: string;
  column_type: ColumnType; // 'standard' | 'source' | 'calculated'
  field_name: string; // 'original_budget_amount', 'approved_cos', etc.
  display_label: string;
  width?: number;
  is_pinned?: boolean; // New: pinned columns
  format_type?: FormatType; // 'currency' | 'integer' | 'percentage' | 'date'
  is_sortable: boolean;
  is_filterable: boolean;
  is_editable: boolean;
  alignment?: 'left' | 'right' | 'center';
}

// Budget Change (Audit trail)
interface BudgetChange {
  id: string;
  budgetId: string;
  line_item_id?: string;
  change_type: string; // 'field_update' | 'line_item_added' | 'modification_voided', etc.
  field_name?: string;
  old_value?: string;
  new_value?: string;
  changed_by_id: string;
  changed_at: ISO8601;
}

// Budget Forecast (Prediction of final cost)
interface BudgetForecast {
  id: string;
  budgetId: string;
  line_item_id: string;
  forecast_method: ForecastMethod; // 'percent_complete' | 'curve' | 'quantity' | 'to_complete'
  percent_complete?: number; // 0-100
  curve_id?: string; // Reference to forecasting curve
  production_quantity?: number; // Units installed
  production_unit?: string; // Unit of measure
  projected_total_cost: Decimal; // Forecasted final cost
  variance: Decimal; // projected_total_cost - revised_budget
  calculated_at: ISO8601;
}

// Budget Snapshot (Point-in-time capture)
interface BudgetSnapshot {
  id: string;
  budgetId: string;
  snapshot_type: SnapshotType; // 'manual' | 'automatic' | 'project_status'
  snapshot_date: Date;
  snapshot_data: BudgetSnapshotData; // Full budget state at snapshot time
  created_by_id: string;
  created_at: ISO8601;
}

// Cost Code Master (System-wide configuration)
interface CostCode {
  id: string;
  companyId: string;
  code: string; // "01-3120.L"
  description: string; // "Vice President.Labor"
  cost_type: string;
  attributes?: CostCodeAttribute[]; // WBS flexible attributes
  is_active: boolean;
  is_default: boolean;
  created_at: ISO8601;
}

type BudgetStatus = 'draft' | 'active' | 'locked';
type ModificationType = 'addition' | 'deduction' | 'approved_co';
type ViewType = 'standard' | 'custom' | 'labor_productivity' | 'erp_integration';
type ColumnType = 'standard' | 'source' | 'calculated';
type FormatType = 'currency' | 'integer' | 'percentage' | 'date' | 'text';
type ForecastMethod = 'percent_complete' | 'curve' | 'quantity' | 'to_complete';
type SnapshotType = 'manual' | 'automatic' | 'project_status';
type BudgetLineWarning = {
  warning_type: string; // "cost_code_not_budgeted" | "missing_cost_type"
  message: string;
  severity: 'info' | 'warning' | 'error';
};
```

### 2.2 Database Schema

```sql

-- Budget Master

CREATE TABLE budgets (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  erp_synced BOOLEAN DEFAULT false,
  erp_sync_status VARCHAR(255),
  erp_last_sync_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by_id UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by_id UUID REFERENCES users(id),
  locked_by_id UUID REFERENCES users(id),
  locked_date TIMESTAMP,
  total_original_budget DECIMAL(15,2),
  total_budget_modifications DECIMAL(15,2),
  total_approved_cos DECIMAL(15,2),
  total_revised_budget DECIMAL(15,2),
  total_job_to_date_cost DECIMAL(15,2),
  metadata JSONB,
  INDEX(project_id),
  INDEX(erp_synced)
);

-- Budget Line Items

CREATE TABLE budget_line_items (
  id UUID PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  cost_code VARCHAR(50),
  cost_code_id UUID REFERENCES cost_codes(id),
  cost_type VARCHAR(50),
  description VARCHAR(500),
  sequence_number INTEGER,
  original_budget_amount DECIMAL(15,2),
  budget_modifications DECIMAL(15,2),
  approved_cos DECIMAL(15,2),
  revised_budget DECIMAL(15,2),
  job_to_date_cost DECIMAL(15,2),
  sub_job_id UUID,
  vendor_id UUID REFERENCES vendors(id),
  notes TEXT,
  attributes JSONB,
  is_red_text BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX(budget_id),
  INDEX(cost_code),
  UNIQUE(budget_id, cost_code)
);

-- Budget Line Item Details

CREATE TABLE budget_line_item_details (
  id UUID PRIMARY KEY,
  budget_line_item_id UUID NOT NULL REFERENCES budget_line_items(id) ON DELETE CASCADE,
  vendor VARCHAR(255),
  item_description TEXT,
  detail_type VARCHAR(50),
  amount DECIMAL(15,2),
  change_event_id UUID,
  created_from VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(budget_line_item_id)
);

-- Budget Modifications

CREATE TABLE budget_modifications (
  id UUID PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES budget_line_items(id) ON DELETE CASCADE,
  modification_type VARCHAR(50),
  reason TEXT,
  change_event_id UUID,
  approved_co_id UUID,
  amount DECIMAL(15,2),
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  approved_by_id UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  voided_by_id UUID REFERENCES users(id),
  voided_at TIMESTAMP,
  voided_reason TEXT,
  is_voided BOOLEAN DEFAULT false,
  INDEX(budget_id),
  INDEX(line_item_id),
  INDEX(is_voided)
);

-- Budget Views

CREATE TABLE budget_views (
  id UUID PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  view_type VARCHAR(50),
  is_system_default BOOLEAN DEFAULT false,
  applies_to_company BOOLEAN DEFAULT false,
  snapshot_type VARCHAR(50),
  config JSONB, -- Stores columns, filters, grouping
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(budget_id),
  INDEX(view_type)
);

-- Budget Changes (Change History)

CREATE TABLE budget_changes (
  id UUID PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  line_item_id UUID REFERENCES budget_line_items(id),
  change_type VARCHAR(100),
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by_id UUID REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  INDEX(budget_id),
  INDEX(changed_at),
  INDEX(change_type)
);

-- Budget Forecasts

CREATE TABLE budget_forecasts (
  id UUID PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES budget_line_items(id) ON DELETE CASCADE,
  forecast_method VARCHAR(50),
  percent_complete DECIMAL(5,2),
  curve_id UUID,
  production_quantity DECIMAL(12,2),
  production_unit VARCHAR(50),
  projected_total_cost DECIMAL(15,2),
  variance DECIMAL(15,2),
  calculated_at TIMESTAMP DEFAULT NOW(),
  INDEX(budget_id),
  INDEX(line_item_id)
);

-- Budget Snapshots

CREATE TABLE budget_snapshots (
  id UUID PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  snapshot_type VARCHAR(50),
  snapshot_date DATE,
  snapshot_data JSONB, -- Full budget state
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(budget_id),
  INDEX(snapshot_date)
);

-- Cost Codes

CREATE TABLE cost_codes (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  code VARCHAR(50) UNIQUE,
  description VARCHAR(500),
  cost_type VARCHAR(50),
  attributes JSONB, -- WBS attributes
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(company_id),
  INDEX(code)
);
```

---

## SECTION 3: CORE FEATURES & REQUIREMENTS

### 3.1 Budget Management

#### Feature: Create Budget

- User selects project
- System initializes empty budget or imports from Excel template
- All line items start with $0 original budget
- System creates default Budget View (Procore Standard Budget)

#### Feature: Add Budget Line Items

- User enters cost code (autocomplete from master list)
- System validates cost code exists or allows new creation
- User enters original budget amount
- System calculates subtotals and grand totals in real-time
- Support for partial line items (e.g., percentage of main line)

#### Feature: Lock/Unlock Budget

- Admin can lock budget to prevent modifications
- Only user with special permission can unlock
- Locked budgets still allow viewing and reporting

#### Feature: Delete Budget Line Items

- Soft delete (marked as deleted, not removed)
- Recalculates totals
- Change log entry created

### 3.2 Budget Modifications

#### Feature: Create Budget Modification

- Select line item to modify
- Specify modification type: Addition or Deduction
- Link to Change Event (required or optional based on config)
- Approval workflow: created → pending → approved/rejected
- If auto-create change events enabled: auto-create when no event selected

#### Feature: Void Budget Modifications

- Only admin or original creator can void
- Reverses the modification amount
- Creates audit trail entry
- Updates revised budget calculations

#### Feature: Approve Budget Changes

- Approver reviews and approves pending modifications
- Modifications become part of "Budget Modifications" column total
- Email notification to stakeholder

### 3.3 Views & Reporting

#### Feature: Budget Views

- **Procore Standard Budget View (default):** Original Budget, Budget Modifications, Approved COs, Revised Budget, Job to Date Cost, Detail
- **ERP Integration Views:** Format for specific ERP systems (CMiC, Sage 300)
- **Labor Productivity View:** Shows budget vs. actual labor hours and costs
- **Custom Views:** User-created views with configurable columns, filters, grouping

#### Feature: Apply Filters to Views

- Filter by cost code, cost type, vendor, status
- Filter by amount ranges (e.g., > $10,000)
- Filter by change status
- Multi-filter capability
- Save filtered views

#### Feature: Group Budget Data

- Group by cost code, cost type, vendor, sub-job
- Group by modification status
- Dynamic grouping with subtotals

#### Feature: Budget Snapshots

- **Manual snapshots:** User takes snapshot at any time
- **Automatic snapshots:** System creates on schedule
- **Project Status Snapshots:** Integration with company-level snapshot tool
- Snapshot captures entire budget state for variance analysis

### 3.4 Forecasting

#### Feature: Forecast to Complete

Multiple forecasting methods:

- **Percent Complete:** User enters % completion, system calculates projected cost
- **Forecasting Curves:** System applies curve to distribute remaining budget
- **Production Quantities:** Based on units installed vs. budgeted units
- **Advanced Forecasting:** Multiple curve types with AI/ML recommendations

#### Feature: Forecasting Views

- Dedicated forecasting tab with configured views
- "Configure Forecasting Views" admin function
- Display projected costs vs. budgeted costs
- Variance visualization

#### Feature: Production Quantities

- Track budgeted quantities (units to install)
- Track actual installed quantities (from timesheet or manual entry)
- Calculate remaining quantities
- Integrate with Labor Productivity Budget View

### 3.5 Cost Tracking & Integration

#### Feature: Real-time Cost Actuals

- Pull costs from Timesheets (labor hours × rate)
- Pull costs from Direct Costs tool
- Pull costs from Vendor Invoices
- Pull costs from Change Events
- Update "Job to Date Cost" column in real-time
- Show "last update" timestamp and source

#### Feature: Budget vs. Actual Analysis

- "Analyze Variance" button on main budget view
- Calculate variance: (Job to Date Cost + Projected To Complete) - Revised Budget
- Color code: Red = over budget, Green = under budget
- Sort by largest variances

#### Feature: Advanced Forecasting Curves

- Pre-built curves: Linear, S-curve, J-curve
- Custom curves for specific trades
- Apply curve to distribute "Projected Cost to Complete"
- View curve visualization

### 3.6 ERP Integration

#### Feature: ERP Sync Status

- Display sync status: "ERP - Synced" with last sync timestamp
- Pending sync button for manual sync
- Sync errors/warnings displayed
- Different views for each ERP system (CMiC, Sage, etc.)

#### Feature: Export to ERP

- Map Procore cost codes to ERP GL accounts
- Validate data before export
- Support export formats for each ERP
- Track export history and versioning

#### Feature: Retrieve from ERP

- Pull back approved cost forecasts from ERP
- Compare to Procore forecasts
- Identify discrepancies

### 3.7 Configuration & Admin

#### Feature: Configure Budget Settings

- Enable/disable specific cost types
- Set automatic change event creation
- Configure red text display for negative values
- Set approval workflows
- Enable labor productivity features

#### Feature: Budget Code Attributes (WBS)

- Create custom attributes at budget code level
- Assign attributes to cost codes
- Filter and group by attributes
- Support flexible work breakdown structure

#### Feature: Configure Budget Views (Admin)

- Create custom views available to company or project
- Define columns: Standard, Source, Calculated
- Set column widths, pinning, formatting
- Configure filters and grouping options
- Mark as system default or custom

---

## SECTION 4: IMPLEMENTATION TASKS (Ordered by Dependency)

### TASK 1: Core Data Model & Database Setup

**PRIORITY:** P0 (blocks all other tasks)
**EFFORT:** 8 hours
**ACCEPTANCE_CRITERIA:**

- ✓ All tables created with proper indexes
- ✓ Decimal fields configured for financial precision (15,2)
- ✓ Foreign key constraints enforced
- ✓ JSONB fields working for flexible attributes
- ✓ Migrations versioned and testable
- ✓ Sample data loads without errors

### TASK 2: Budget CRUD API Endpoints

**PRIORITY:** P0
**EFFORT:** 6 hours
**ACCEPTANCE_CRITERIA:**

- ✓ POST /api/budgets (create budget)
- ✓ GET /api/budgets/{id} (retrieve budget with totals)
- ✓ PATCH /api/budgets/{id} (update budget fields)
- ✓ DELETE /api/budgets/{id} (soft delete)
- ✓ GET /api/budgets?projectId={id} (list by project)
- ✓ POST /api/budgets/{id}/lock (lock budget)
- ✓ POST /api/budgets/{id}/unlock (unlock budget)
- ✓ All endpoints return 400 for validation errors with specific messages

### TASK 3: Budget Line Item API Endpoints

**PRIORITY:** P0
**EFFORT:** 8 hours
**ACCEPTANCE_CRITERIA:**

- ✓ POST /api/budgets/{budgetId}/line-items (add line)
- ✓ PATCH /api/budgets/{budgetId}/line-items/{itemId} (update line)
- ✓ DELETE /api/budgets/{budgetId}/line-items/{itemId} (soft delete)
- ✓ GET /api/budgets/{budgetId}/line-items (list with pagination)
- ✓ Automatic recalculation of budget totals on any change
- ✓ Cost code validation against master
- ✓ Validation: cost_code + budget_id is unique
- ✓ Support for negative amounts (deductions)

### TASK 4: Budget Modification API

**PRIORITY:** P1
**EFFORT:** 6 hours
**ACCEPTANCE_CRITERIA:**

- ✓ POST /api/budgets/{budgetId}/modifications (create mod)
- ✓ PATCH /api/budgets/{budgetId}/modifications/{modId}/approve (approve)
- ✓ POST /api/budgets/{budgetId}/modifications/{modId}/void (void mod)
- ✓ Modifications only affect "Budget Modifications" column total
- ✓ Voiding reverts the modification amount
- ✓ Audit trail created for all modifications
- ✓ Support optional change event linking (configurable)

### TASK 5: Budget Views & Column Configuration

**PRIORITY:** P1
**EFFORT:** 10 hours
**ACCEPTANCE_CRITERIA:**
✓ POST /api/budget-views (create view)
✓ PATCH /api/budget-views/{viewId} (update view config)
✓ GET /api/budget-views?budgetId={id} (list views)
✓ Standard view has: Description, Original Budget, Mods, Approved COs, Revised, Job to Date, Detail
✓ Support column types: standard, source, calculated
✓ Calculated columns (e.g., Variance) compute on-the-fly
✓ Columns support: pinning, width, formatting, sort, filter
✓ Views support: filters, grouping, snapshots
✓ System default views provided out of box

### TASK 6: Data Grid / Table Display Component

**PRIORITY:** P1
**EFFORT:** 12 hours
**ACCEPTANCE_CRITERIA:**
✓ Render budget line items in table format
✓ Support column pinning (keep critical columns visible)
✓ Multi-select rows with checkboxes
✓ Sort by any column (click header)
✓ Filter by any column
✓ Group by selected column
✓ Keyboard navigation (Tab, Arrow keys, Enter)
✓ Copy values to clipboard
✓ Row expansion for detailed view (new UI: side panel instead of modal)
✓ Real-time total calculations as rows update
✓ Handle 1000+ rows without performance degradation

### TASK 7: Budget Creation & Import

**PRIORITY:** P1
**EFFORT:** 8 hours
**ACCEPTANCE_CRITERIA:**
✓ Create new empty budget
✓ Import budget from Excel file
✓ Excel mapping: Cost Code → Column A, Original Budget → Column B, etc.
✓ Validate all rows before import
✓ Show import errors/warnings before committing
✓ Support phased imports (multiple uploads)
✓ Duplicate cost code handling (update existing or error)

### TASK 8: Cost Code Management

**PRIORITY:** P1
**EFFORT:** 6 hours
**ACCEPTANCE_CRITERIA:**
✓ POST /api/cost-codes (create cost code)
✓ GET /api/cost-codes?companyId={id} (list by company)
✓ Autocomplete search in budget creation
✓ Support WBS attributes on cost codes
✓ Default cost codes provided by Procore (01-3120.L, etc.)
✓ Validate cost code format during creation

### TASK 9: Forecasting Calculation Engine

**PRIORITY:** P2
**EFFORT:** 12 hours
**ACCEPTANCE_CRITERIA:**
✓ Percent Complete method: Projected Cost = Revised Budget / % Complete
✓ Curve method: Apply curve to distribute remaining budget
✓ Quantity method: Calculate based on actual vs. budgeted units
✓ To Complete method: Add manual "cost to complete" estimate
✓ Variance calculation: (Job to Date + Projected Remaining) - Revised Budget
✓ Support multiple forecasting curves (Linear, S-curve, J-curve)
✓ Batch recalculation of all forecasts in budget
✓ Cache results with timestamp

### TASK 10: Budget Snapshots

**PRIORITY:** P2
**EFFORT:** 6 hours
**ACCEPTANCE_CRITERIA:**
✓ POST /api/budgets/{budgetId}/snapshots (create snapshot)
✓ GET /api/budgets/{budgetId}/snapshots (list snapshots)
✓ Snapshot captures entire budget state (JSONB)
✓ Support snapshot types: manual, automatic, project_status
✓ Calculate variance between snapshots
✓ Snapshot dates stored for timeline view
✓ Restore from snapshot (with confirmation)

### TASK 11: Change History / Audit Trail

**PRIORITY:** P1
**EFFORT:** 6 hours
**ACCEPTANCE_CRITERIA:**
✓ POST /api/budgets/{budgetId}/changes (create audit entry - internal)
✓ GET /api/budgets/{budgetId}/changes (list with filters and pagination)
✓ Track: who changed what, when, old value → new value
✓ Filter by: cost code, cost type, sub-job, change type, date range
✓ Sortable by date (most recent first)
✓ Modernized UI with dropdown filters
✓ Export change history

### TASK 12: Export Functionality

**PRIORITY:** P1
**EFFORT:** 8 hours
**ACCEPTANCE_CRITERIA:**
✓ Export budget to PDF (formatted table with totals)
✓ Export budget to Excel (.xlsx format)
✓ Export respects current view (columns, filters, grouping)
✓ Include change history in export
✓ Include snapshots in export
✓ Preserve formatting: currency, alignment, red text
✓ Background job processing for large exports

### TASK 13: Budget Details Tab

**PRIORITY:** P2
**EFFORT:** 8 hours
**ACCEPTANCE_CRITERIA:**
✓ Display line item details with drill-down
✓ Show associated change events, direct costs, vendor invoices
✓ Link to related documents
✓ "ERP Job Cost Detail Budget" view for ERP integration
✓ Filter by budget code, vendor, detail type
✓ Support custom reporting views

### TASK 14: Forecasting Views & UI

**PRIORITY:** P2
**EFFORT:** 10 hours
**ACCEPTANCE_CRITERIA:**
✓ "Forecasting" tab displays forecasting views
✓ "No views applied" empty state with button to configure
✓ Display forecasted costs vs. budgeted costs
✓ Variance visualization (% over/under)
✓ Curve visualization for Advanced Forecasting
✓ "Forecast to Complete" button with modal/form
✓ Support multiple forecasting methods per line item

### TASK 15: ERP Integration Endpoints

**PRIORITY:** P2
**EFFORT:** 12 hours
**ACCEPTANCE_CRITERIA:**
✓ POST /api/budgets/{budgetId}/sync-to-erp (export to ERP)
✓ GET /api/budgets/{budgetId}/erp-status (check sync status)
✓ Map Procore cost codes to ERP GL accounts
✓ Support multiple ERP formats (CMiC, Sage, ViewPoint, Vista)
✓ Validate data before sync
✓ Track sync history and timestamps
✓ Handle sync errors with retry logic
✓ "Resend to ERP" button in UI

### TASK 16: Real-time Cost Actuals Integration

**PRIORITY:** P2
**EFFORT:** 10 hours
**ACCEPTANCE_CRITERIA:**
✓ Fetch actuals from Timesheet tool (labor hours × rate)
✓ Fetch actuals from Direct Costs tool
✓ Fetch actuals from Vendor Invoice tool
✓ Fetch actuals from Change Events
✓ Aggregate by cost code/line item
✓ Update "Job to Date Cost" column
✓ Display "last updated" timestamp and source
✓ Background job for periodic sync (hourly/daily)
✓ Manual refresh button in UI

### TASK 17: Analyze Variance Feature

**PRIORITY:** P2
**EFFORT:** 8 hours
**ACCEPTANCE_CRITERIA:**
✓ "Analyze Variance" button triggers calculation
✓ Calculate variance for each line: (Actuals + Forecast) - Revised Budget
✓ Color code: Red (over), Yellow (near), Green (under)
✓ Sort by largest variances (default)
✓ Show $ variance and % variance
✓ Drill-down to see calculation details
✓ Export variance report

### TASK 18: Budget Permissions & Access Control

**PRIORITY:** P1
**EFFORT:** 6 hours
**ACCEPTANCE_CRITERIA:**
✓ Enforce role-based permissions:

Admin: Full access (create, modify, lock, approve, configure)
Standard: Create items, modify own items, view all
Read Only: View only, no edits
✓ Granular permissions:
"Add Budget Line Item"
"Create Budget Modifications"
"Approve Budget Changes"
"Lock/Unlock Budget"
"Configure Settings"
✓ Return 403 Forbidden for unauthorized actions
✓ Row-level access control (e.g., only own company items)


### TASK 19: Budget Configuration Panel

**PRIORITY:** P2
**EFFORT:** 6 hours
**ACCEPTANCE_CRITERIA:**
✓ Admin-only config page
✓ Toggle: Red text for negative values (ON by default)
✓ Toggle: Auto-create change events
✓ Toggle: Labor productivity features
✓ Select: Default forecasting method
✓ Select: Required approval workflow
✓ Configure cost types available for project
✓ Save config to database

### TASK 20: Production Quantities Tracking

**PRIORITY:** P3
**EFFORT:** 8 hours
**ACCEPTANCE_CRITERIA:**
✓ Add "Budgeted Quantity" column to budget views
✓ Add "Unit of Measure" column (feet, tons, hours, etc.)
✓ Import production quantities from Excel
✓ Link to actual quantities from Timesheets
✓ Calculate remaining quantities: Budgeted - Actual
✓ Support in Labor Productivity Budget View


---

## SECTION 5: API SPECIFICATION (OpenAPI Format)

```yaml
openapi: 3.0.0
info:
  title: Budget Tool API
  version: 1.0.0
servers:

  - url: /api/budgets

paths:
  /:
    post:
      summary: Create a new budget
      tags: [Budget]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:

                - project_id
                - name

              properties:
                project_id:
                  type: string
                  format: uuid
                name:
                  type: string
                  maxLength: 255
                description:
                  type: string
      responses:
        201:
          description: Budget created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Budget'
        400:
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        401:
          description: Unauthorized
        403:
          description: Insufficient permissions

    get:
      summary: List budgets by project
      tags: [Budget]
      parameters:

        - in: query

          name: project_id
          required: true
          schema:
            type: string
            format: uuid

        - in: query

          name: limit
          schema:
            type: integer
            default: 50

        - in: query

          name: offset
          schema:
            type: integer
            default: 0
      responses:
        200:
          description: List of budgets
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Budget'
                  total:
                    type: integer
                  limit:
                    type: integer
                  offset:
                    type: integer

  /{budgetId}:
    get:
      summary: Get budget with details
      tags: [Budget]
      parameters:

        - in: path

          name: budgetId
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: Budget details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BudgetDetail'
        404:
          description: Budget not found

    patch:
      summary: Update budget
      tags: [Budget]
      parameters:

        - in: path

          name: budgetId
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                description:
                  type: string
      responses:
        200:
          description: Budget updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Budget'

    delete:
      summary: Soft delete budget
      tags: [Budget]
      parameters:

        - in: path

          name: budgetId
          required: true
          schema:
            type: string
            format: uuid
      responses:
        204:
          description: Budget deleted

  /{budgetId}/line-items:
    post:
      summary: Add budget line item
      tags: [Line Items]
      parameters:

        - in: path

          name: budgetId
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:

                - cost_code
                - original_budget_amount

              properties:
                cost_code:
                  type: string
                  pattern: '^\\d{2}-\\d{4}[A-Z]?$'
                description:
                  type: string
                original_budget_amount:
                  type: number
                  format: decimal
                cost_type:
                  type: string
                vendor_id:
                  type: string
                  format: uuid
      responses:
        201:
          description: Line item created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BudgetLineItem'
        400:
          description: Validation error

    get:
      summary: List budget line items
      tags: [Line Items]
      parameters:

        - in: path```
