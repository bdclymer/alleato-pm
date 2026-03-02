---
title: API_ENDPOINTS Budget
description: API_ENDPOINTS Budget documentation
---

# Budget API Endpoints Specification

## Endpoint Overview

The Budget API provides comprehensive endpoints for budget management, organized by feature area:

**Core Budget Operations**:

- `GET/POST /api/projects/[id]/budget` - Main budget data and line item creation
- `GET/PATCH/DELETE /api/projects/[id]/budget/lines/[lineId]` - Individual line operations

**Budget Views Management**:

- `GET/POST /api/projects/[id]/budget/views` - List and create custom views
- `GET/PATCH/DELETE /api/projects/[id]/budget/views/[viewId]` - Manage specific views
- `POST /api/projects/[id]/budget/views/[viewId]/clone` - Clone existing views

**Budget Modifications**:

- `GET/POST /api/projects/[id]/budget/modifications` - Budget transfers and changes
- `POST /api/projects/[id]/budget/lock` - Lock/unlock budget for editing

**Snapshots & History**:

- `GET/POST /api/projects/[id]/budget/snapshots` - Point-in-time captures
- `GET /api/projects/[id]/budget/history` - Change audit trail

**Forecasting & Analytics**:

- `GET /api/projects/[id]/budget/forecast` - Forecast calculations
- `GET /api/projects/[id]/budget/details` - Detailed budget analytics

## Detailed Specifications

### 1. Main Budget Data

**Method**: GET
**URL**: `/api/projects/[projectId]/budget`
**Purpose**: Retrieve budget data with calculations from SQL views

#### Request

```typescript
// Query Parameters
interface BudgetQueryParams {
  view_id?: string;        // Custom view ID (optional)
  group_by?: 'none' | 'cost-code-tier-1' | 'cost-code-tier-2' | 'cost-code-tier-3';
  filter_by?: 'all' | 'over_budget' | 'under_budget' | 'no_activity';
  search?: string;         // Search term for descriptions/cost codes
  page?: number;          // Pagination (default: 1)
  limit?: number;         // Items per page (default: 100, max: 1000)
}
```typescript
#### Response
```typescript
interface BudgetResponse {
  lineItems: BudgetLineItem[];
  grandTotals: BudgetGrandTotals;
  metadata: {
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
    lastUpdated: string;
    viewId?: string;
    grouping: string;
    filtering: string;
  };
}

interface BudgetLineItem {
  id: string;
  budgetCodeId: string;
  costCode: string;
  costType?: string;
  description: string;
  subJob?: string;

  // Financial columns (from SQL views)
  originalBudgetAmount: number;
  budgetModifications: number;
  approvedCOs: number;
  revisedBudget: number;
  pendingBudgetChanges: number;
  projectedBudget: number;
  committedCosts: number;
  pendingCostChanges: number;
  projectedCosts: number;
  jobToDateCostDetail: number;
  directCosts: number;
  forecastToComplete: number;
  projectedOverUnder: number;

  // Unit pricing
  unitQty?: number;
  uom?: string;
  unitCost?: number;
  calculationMethod?: 'unit' | 'lump_sum';

  // Metadata
  position: number;
  isLocked: boolean;
  lastModified: string;

  // Hierarchical grouping (if applicable)
  children?: BudgetLineItem[];
  depth?: number;
  isGroup?: boolean;
  groupKey?: string;
}

interface BudgetGrandTotals {
  totalOriginalBudget: number;
  totalBudgetModifications: number;
  totalApprovedCOs: number;
  totalRevisedBudget: number;
  totalPendingBudgetChanges: number;
  totalProjectedBudget: number;
  totalCommittedCosts: number;
  totalPendingCostChanges: number;
  totalProjectedCosts: number;
  totalJobToDateCost: number;
  totalDirectCosts: number;
  totalForecastToComplete: number;
  totalProjectedOverUnder: number;
}
```typescript
#### Implementation Details

```sql
-- Queries mv_budget_rollup materialized view
-- Applies filtering and grouping in SQL
-- Returns calculated fields, no JavaScript math
```typescript
### 2. Create Budget Line Items
**Method**: POST
**URL**: `/api/projects/[projectId]/budget`
**Purpose**: Create new budget line items with automatic budget code creation

#### Request
```typescript
interface CreateBudgetLineItemsRequest {
  lineItems: CreateLineItemInput[];
}

interface CreateLineItemInput {
  costCodeId: string;
  costTypeId?: string;
  subJobId?: string;
  description: string;
  calculationMethod: 'unit' | 'lump_sum';

  // Unit pricing fields
  unitQty?: number;
  uom?: string;
  unitCost?: number;

  // Lump sum field
  originalAmount?: number;

  position?: number;
}
```

#### Response

```typescript
interface CreateBudgetLineItemsResponse {
  success: boolean;
  message: string;
  createdItems: {
    budgetCodeId: string;
    lineItemId: string;
    costCode: string;
    description: string;
    amount: number;
  }[];
  grandTotals: BudgetGrandTotals;
}
```sql
#### Implementation Details
```sql
-- 1. Upsert to project_budget_codes table with conflict handling
-- 2. Insert to budget_lines table
-- 3. Refresh materialized view: SELECT refresh_budget_rollup(project_id)
-- 4. Return updated totals
```typescript
### 3. Budget Views List

**Method**: GET
**URL**: `/api/projects/[projectId]/budget/views`
**Purpose**: List all budget views for project

#### Response

```typescript
interface BudgetViewsResponse {
  views: BudgetView[];
}

interface BudgetView {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isSystem: boolean;
  columnCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```typescript
### 4. Create Budget View
**Method**: POST
**URL**: `/api/projects/[projectId]/budget/views`
**Purpose**: Create custom budget view with column configuration

#### Request
```typescript
interface CreateBudgetViewRequest {
  name: string;
  description?: string;
  isDefault?: boolean;
  columns: BudgetViewColumn[];
}

interface BudgetViewColumn {
  columnKey: string;         // e.g., 'costCode', 'originalBudget'
  displayName?: string;      // Custom display name
  isVisible: boolean;
  displayOrder: number;      // 1, 2, 3...
  widthPx?: number;
  isLocked?: boolean;        // Prevent reordering
}
```

#### Response

```typescript
interface CreateBudgetViewResponse {
  success: boolean;
  message: string;
  view: BudgetView & {
    columns: BudgetViewColumn[];
  };
}
```typescript
### 5. Get Budget View Details
**Method**: GET
**URL**: `/api/projects/[projectId]/budget/views/[viewId]`
**Purpose**: Get specific view with column configuration

#### Response
```typescript
interface BudgetViewDetailsResponse {
  view: BudgetView;
  columns: BudgetViewColumn[];
}
```sql
### 6. Update Budget View

**Method**: PATCH
**URL**: `/api/projects/[projectId]/budget/views/[viewId]`
**Purpose**: Update view name, description, or column configuration

#### Request

```typescript
interface UpdateBudgetViewRequest {
  name?: string;
  description?: string;
  isDefault?: boolean;
  columns?: BudgetViewColumn[];
}
```typescript
### 7. Clone Budget View
**Method**: POST
**URL**: `/api/projects/[projectId]/budget/views/[viewId]/clone`
**Purpose**: Create copy of existing view

#### Request
```typescript
interface CloneBudgetViewRequest {
  name: string;
  description?: string;
  isDefault?: boolean;
}
```

### 8. Delete Budget View

**Method**: DELETE
**URL**: `/api/projects/[projectId]/budget/views/[viewId]`
**Purpose**: Delete custom view (system views protected)

#### Response

```typescript
interface DeleteBudgetViewResponse {
  success: boolean;
  message: string;
  deletedViewId: string;
}
```typescript
### 9. Budget Modifications
**Method**: GET/POST
**URL**: `/api/projects/[projectId]/budget/modifications`
**Purpose**: List and create budget modifications/transfers

#### POST Request
```typescript
interface CreateBudgetModificationRequest {
  fromBudgetCodeId: string;
  toBudgetCodeId: string;
  amount: number;
  description: string;
  effectiveDate: string;      // ISO date
}
```typescript
### 10. Budget Snapshots

**Method**: GET/POST
**URL**: `/api/projects/[projectId]/budget/snapshots`
**Purpose**: List and create budget snapshots

#### POST Request

```typescript
interface CreateBudgetSnapshotRequest {
  name: string;
  snapshotType: 'manual' | 'milestone' | 'baseline';
  description?: string;
  setAsBaseline?: boolean;
}
```typescript
#### GET Response
```typescript
interface BudgetSnapshotsResponse {
  snapshots: BudgetSnapshot[];
}

interface BudgetSnapshot {
  id: string;
  name: string;
  snapshotType: string;
  description?: string;
  isBaseline: boolean;
  createdAt: string;
  createdBy: string;
  lineItemsCount: number;
  totalOriginalBudget: number;
  totalRevisedBudget: number;
}
```

### 11. Budget Lock/Unlock

**Method**: POST
**URL**: `/api/projects/[projectId]/budget/lock` or `/api/projects/[projectId]/budget/unlock`
**Purpose**: Lock or unlock budget for editing

#### Request

```typescript
interface BudgetLockRequest {
  reason?: string;           // Reason for locking/unlocking
}
```typescript
#### Response
```typescript
interface BudgetLockResponse {
  success: boolean;
  message: string;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  lockReason?: string;
}
```typescript
### 12. Budget Details

**Method**: GET
**URL**: `/api/projects/[projectId]/budget/details`
**Purpose**: Detailed budget analytics and breakdown

#### Response

```typescript
interface BudgetDetailsResponse {
  summary: {
    lineItemCount: number;
    activeCostCodes: number;
    lastUpdated: string;
    budgetStatus: 'draft' | 'active' | 'locked';
  };
  breakdown: {
    byCostType: CostTypeBreakdown[];
    bySubJob: SubJobBreakdown[];
    byPeriod: PeriodBreakdown[];
  };
  variance: {
    overBudgetCount: number;
    underBudgetCount: number;
    totalVariance: number;
    largestVariances: VarianceItem[];
  };
}
```typescript
### 13. Budget Forecast
**Method**: GET
**URL**: `/api/projects/[projectId]/budget/forecast`
**Purpose**: Forecasting calculations and projections

#### Response
```typescript
interface BudgetForecastResponse {
  forecast: {
    projectedCompletion: string;    // ISO date
    totalProjectedCost: number;
    forecastToComplete: number;
    burnRate: number;
    confidenceLevel: number;        // 0-100%
  };
  byMonth: ForecastPeriod[];
  scenarios: {
    optimistic: ForecastScenario;
    realistic: ForecastScenario;
    pessimistic: ForecastScenario;
  };
}
```

## Authentication & Authorization

### Required Headers

```typescript
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Project-ID: <project_id>  // For additional validation
```markdown
### Permission Levels
```typescript
enum BudgetPermission {
  VIEW = 'budget:view',           // Read budget data
  EDIT = 'budget:edit',           // Edit line items and amounts
  MANAGE = 'budget:manage',       // Create/delete views, modifications
  ADMIN = 'budget:admin'          // Lock/unlock, snapshots, system config
}
```sql
### RLS (Row Level Security)

All budget endpoints enforce RLS policies:

```sql
-- Users can only access budgets for projects they're assigned to
project_id IN (
  SELECT project_id FROM project_users
  WHERE user_id = auth.uid()
  AND status = 'active'
)
```typescript
## Error Handling

### Standard Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;                 // Machine-readable error code
    message: string;              // Human-readable message
    details?: any;               // Additional error context
    field?: string;              // Specific field for validation errors
  };
  timestamp: string;
  requestId: string;
}
```

### Common Error Codes

```typescript
const BudgetErrorCodes = {
  // Authentication/Authorization
  'BUDGET_UNAUTHORIZED': 401,
  'BUDGET_FORBIDDEN': 403,
  'BUDGET_PROJECT_ACCESS_DENIED': 403,

  // Validation
  'BUDGET_INVALID_INPUT': 400,
  'BUDGET_COST_CODE_NOT_FOUND': 400,
  'BUDGET_DUPLICATE_LINE_ITEM': 409,
  'BUDGET_NEGATIVE_AMOUNT': 400,

  // Business Logic
  'BUDGET_LOCKED': 423,
  'BUDGET_INSUFFICIENT_BALANCE': 400,
  'BUDGET_VIEW_LIMIT_EXCEEDED': 429,
  'BUDGET_SYSTEM_VIEW_READONLY': 403,

  // Server Errors
  'BUDGET_CALCULATION_FAILED': 500,
  'BUDGET_MATERIALIZED_VIEW_STALE': 503,
  'BUDGET_DATABASE_ERROR': 500
};
```yaml
### Error Handling Examples
```typescript
// Validation Error
{
  success: false,
  error: {
    code: 'BUDGET_INVALID_INPUT',
    message: 'Invalid unit quantity',
    field: 'unitQty',
    details: { min: 0.001, max: 999999.999 }
  }
}

// Business Logic Error
{
  success: false,
  error: {
    code: 'BUDGET_LOCKED',
    message: 'Budget is locked for editing',
    details: {
      lockedBy: 'john.doe@company.com',
      lockedAt: '2025-01-18T14:30:00Z',
      reason: 'End of month review'
    }
  }
}
```sql
## Rate Limiting

### Default Limits

```typescript
const RateLimits = {
  'budget:read': '1000 requests per hour',      // GET operations
  'budget:write': '100 requests per hour',      // POST/PATCH operations
  'budget:calculate': '50 requests per hour',   // Heavy calculation endpoints
  'budget:export': '10 requests per hour'       // Export operations
};
```yaml
### Rate Limit Headers
```typescript
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642518000
X-RateLimit-Window: 3600
```

## Performance Considerations

### Caching Strategy

- **Materialized Views**: `mv_budget_rollup` refreshed after write operations
- **Response Caching**: GET endpoints cached for 5 minutes
- **ETags**: Support conditional requests with If-None-Match
- **Pagination**: Large datasets automatically paginated

### Query Optimization

- Database calculations performed in SQL, not application layer
- Proper indexing on all foreign keys and filter columns
- Connection pooling for high concurrency
- Read replicas for heavy reporting queries

### Monitoring Metrics

```typescript
const BudgetAPIMetrics = {
  'budget.api.request.duration': 'Histogram',      // Request duration
  'budget.api.request.count': 'Counter',           // Request count by endpoint
  'budget.api.error.count': 'Counter',             // Error count by type
  'budget.calculation.duration': 'Histogram',      // SQL calculation time
  'budget.materialized_view.refresh.duration': 'Histogram'  // View refresh time
};
```javascript
## Example Usage

### Fetch Budget Data
```typescript
const response = await fetch(`/api/projects/123/budget?group_by=cost-code-tier-1&filter_by=over_budget`, {
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
});

const budgetData = await response.json();
console.log(`Total items: ${budgetData.lineItems.length}`);
console.log(`Total budget: $${budgetData.grandTotals.totalRevisedBudget}`);
```javascript
### Create Budget Line Items

```typescript
const newLineItems = [
  {
    costCodeId: '01-1000',
    description: 'General Conditions',
    calculationMethod: 'unit',
    unitQty: 100,
    uom: 'SF',
    unitCost: 50.00
  }
];

const response = await fetch(`/api/projects/123/budget`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ lineItems: newLineItems })
});

const result = await response.json();
if (result.success) {
  console.log(`Created ${result.createdItems.length} budget line items`);
}
```javascript
### Create Custom Budget View
```typescript
const newView = {
  name: 'Executive Summary',
  description: 'High-level budget view for executives',
  isDefault: false,
  columns: [
    { columnKey: 'costCode', isVisible: true, displayOrder: 1 },
    { columnKey: 'description', isVisible: true, displayOrder: 2 },
    { columnKey: 'revisedBudget', isVisible: true, displayOrder: 3 },
    { columnKey: 'projectedCosts', isVisible: true, displayOrder: 4 },
    { columnKey: 'projectedOverUnder', isVisible: true, displayOrder: 5 }
  ]
};

const response = await fetch(`/api/projects/123/budget/views`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newView)
});
```
