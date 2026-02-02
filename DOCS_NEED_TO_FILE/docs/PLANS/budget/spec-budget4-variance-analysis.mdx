# PHASE 3: BUDGET VARIANCE ANALYSIS & REPORTING

## Implementation Instructions (Copy-Paste Ready for Claude Code)

**Priority Level:** P1 (High Priority - Executive visibility and decision-making)
**Estimated Effort:** 18 hours
**Sprint:** Sprint 6-7 (Weeks 6-7)
**Dependencies:** Phase 1A (Budget Modifications), Phase 1B (Cost Actuals Integration), Phase 1C (Project Status Snapshots), Phase 2 (Forecasting Engine)

---

## OVERVIEW

The Variance Analysis & Reporting module provides comprehensive budget performance analysis, identifies variances and trends, and generates executive-level reports. This includes:

- Variance analysis at cost code and project level
- Trend analysis and variance drivers identification
- Custom reporting with export capabilities
- Budget performance dashboards
- Alerts and notifications for significant variances
- Variance commentary and explanations

---

## 1. DATABASE SCHEMA

### TABLE: variance_analyses

```sql
CREATE TABLE variance_analyses (
  analysis_id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  cost_code_id UUID NOT NULL,

  analysis_date TIMESTAMP NOT NULL,
  analysis_period_start TIMESTAMP,
  analysis_period_end TIMESTAMP,

  -- Budget metrics
  original_budget DECIMAL(15,2) NOT NULL,
  revised_budget DECIMAL(15,2) NOT NULL,
  budget_change DECIMAL(15,2),
  budget_change_percent DECIMAL(5,2),

  -- Cost metrics
  job_to_date_cost DECIMAL(15,2) NOT NULL,
  committed_costs DECIMAL(15,2) NOT NULL,
  pending_costs DECIMAL(15,2) NOT NULL,
  total_costs DECIMAL(15,2),

  -- Variance metrics
  current_variance DECIMAL(15,2) NOT NULL,
  current_variance_percent DECIMAL(5,2) NOT NULL,
  prior_variance DECIMAL(15,2),
  variance_change DECIMAL(15,2),
  variance_change_percent DECIMAL(5,2),

  -- Variance categorization
  variance_category VARCHAR(50),
  variance_status VARCHAR(50),
  variance_trend VARCHAR(50),

  -- Variance drivers (quantified)
  variance_due_to_schedule DECIMAL(15,2),
  variance_due_to_productivity DECIMAL(15,2),
  variance_due_to_cost DECIMAL(15,2),
  variance_due_to_scope DECIMAL(15,2),
  variance_due_to_risk DECIMAL(15,2),

  -- Forecast impact
  estimated_cost_at_completion DECIMAL(15,2),
  forecast_variance DECIMAL(15,2),
  forecast_variance_percent DECIMAL(5,2),

  -- Contingency
  contingency_amount DECIMAL(15,2),
  contingency_remaining DECIMAL(15,2),
  contingency_percent_used DECIMAL(5,2),

  -- Metadata
  analysis_notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (cost_code_id) REFERENCES cost_codes(cost_code_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

```

**Indexes:**

- `(project_id, analysis_date DESC)` - for querying latest analyses
- `(project_id, cost_code_id, analysis_date DESC)` - for specific cost code analyses
- `variance_category` - for filtering by category
- `variance_status` - for filtering by status

### TABLE: variance_drivers

```sql
CREATE TABLE variance_drivers (
  driver_id UUID PRIMARY KEY,
  analysis_id UUID NOT NULL,

  driver_type VARCHAR(50),
  driver_name VARCHAR(255) NOT NULL,
  description TEXT,

  impact_amount DECIMAL(15,2),
  impact_percent DECIMAL(5,2),

  root_cause TEXT,
  resolution_action TEXT,
  assigned_to UUID,
  due_date TIMESTAMP,
  status VARCHAR(50),

  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (analysis_id) REFERENCES variance_analyses(analysis_id),
  FOREIGN KEY (assigned_to) REFERENCES users(user_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

```

**Indexes:**

- `(analysis_id)` - for querying drivers for an analysis
- `driver_type` - for filtering by type
- `status` - for filtering open items

### TABLE: variance_explanations

```sql
CREATE TABLE variance_explanations (
  explanation_id UUID PRIMARY KEY,
  analysis_id UUID NOT NULL,

  explanation_type VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,

  variance_impact DECIMAL(15,2),

  attachments JSONB,

  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (analysis_id) REFERENCES variance_analyses(analysis_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

```

**Indexes:**

- `(analysis_id)` - for querying explanations
- `explanation_type` - for filtering

### TABLE: variance_alerts

```sql
CREATE TABLE variance_alerts (
  alert_id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  cost_code_id UUID,

  alert_type VARCHAR(50),
  severity VARCHAR(50),

  title VARCHAR(255) NOT NULL,
  description TEXT,

  threshold_value DECIMAL(15,2),
  current_value DECIMAL(15,2),

  is_active BOOLEAN DEFAULT true,
  dismissed_by UUID,
  dismissed_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (cost_code_id) REFERENCES cost_codes(cost_code_id),
  FOREIGN KEY (dismissed_by) REFERENCES users(user_id)
);

```

**Indexes:**

- `(project_id, is_active)` - for querying active alerts
- `(cost_code_id, is_active)` - for cost code specific alerts
- `alert_type` - for filtering
- `severity` - for prioritization

### TABLE: variance_reports

```sql
CREATE TABLE variance_reports (
  report_id UUID PRIMARY KEY,
  project_id UUID NOT NULL,

  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50),
  description TEXT,

  report_date TIMESTAMP NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,

  include_cost_codes VARCHAR(50),
  cost_code_list JSONB,

  include_sections JSONB,

  total_budget DECIMAL(15,2),
  total_actual_costs DECIMAL(15,2),
  total_variance DECIMAL(15,2),
  total_variance_percent DECIMAL(5,2),
  favorable_count INT,
  unfavorable_count INT,

  status VARCHAR(50),
  approved_by UUID,
  approved_at TIMESTAMP,
  published_at TIMESTAMP,

  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (approved_by) REFERENCES users(user_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

```

**Indexes:**

- `(project_id, report_date DESC)` - for querying latest reports
- `report_type` - for filtering
- `status` - for workflow

---

## 2. API ENDPOINTS

### ENDPOINT 1: Generate Variance Analysis

**Route:** `POST /api/projects/{projectId}/budget/variance/generate`

**Request Body:**

```json
{
  "analysis_date": "2025-01-06T00:00:00Z",
  "cost_code_id": "cc_001",
  "analysis_period_start": "2024-12-01T00:00:00Z",
  "analysis_period_end": "2025-01-06T00:00:00Z",
  "include_drivers": true,
  "include_forecast_impact": true
}

```

**Response (201 Created):**

```json
{
  "analysis_id": "va_123abc",
  "project_id": "proj_123",
  "cost_code_id": "cc_001",
  "cost_code_name": "Foundation",
  "analysis_date": "2025-01-06T00:00:00Z",

  "budget_metrics": {
    "original_budget": 250000.00,
    "revised_budget": 255000.00,
    "budget_change": 5000.00,
    "budget_change_percent": 2.00
  },

  "cost_metrics": {
    "job_to_date_cost": 180000.00,
    "committed_costs": 25000.00,
    "pending_costs": 10000.00,
    "total_costs": 215000.00
  },

  "variance_metrics": {
    "current_variance": 40000.00,
    "current_variance_percent": 15.69,
    "prior_variance": 35000.00,
    "variance_change": 5000.00,
    "variance_change_percent": 14.29,
    "variance_category": "Favorable",
    "variance_status": "Improving",
    "variance_trend": "Positive"
  },

  "variance_drivers": [
    {
      "driver_id": "vd_001",
      "driver_type": "Productivity",
      "driver_name": "Faster Labor Productivity",
      "description": "Labor crew productivity 15% above baseline",
      "impact_amount": 20000.00,
      "impact_percent": 50.0,
      "root_cause": "Experienced crew with familiarity to scope",
      "status": "Open"
    },
    {
      "driver_id": "vd_002",
      "driver_type": "Schedule",
      "driver_name": "Early Completion Timeline",
      "description": "Work completing ahead of schedule",
      "impact_amount": 15000.00,
      "impact_percent": 37.5,
      "root_cause": "Weather delays not materializing",
      "status": "Open"
    },
    {
      "driver_id": "vd_003",
      "driver_type": "Cost",
      "driver_name": "Material Price Increases",
      "description": "Concrete prices increased 5%",
      "impact_amount": -5000.00,
      "impact_percent": -12.5,
      "root_cause": "Market rate increases",
      "status": "Open"
    }
  ],

  "forecast_metrics": {
    "estimated_cost_at_completion": 243231.88,
    "forecast_variance": 11768.12,
    "forecast_variance_percent": 4.61
  },

  "contingency_metrics": {
    "contingency_amount": 12750.00,
    "contingency_remaining": 9521.12,
    "contingency_percent_used": 25.3
  },

  "analysis_notes": "Foundation work proceeding well with favorable productivity metrics. Early completion expected.",
  "created_by": "user_456",
  "created_at": "2025-01-06T08:05:54Z"
}

```

**Backend Logic:**

1. **Fetch current and prior cost metrics:**
    - Query forecasting_data for latest forecast
    - Query budget_lines for budget metrics
    - Query cost_actuals for job_to_date_cost
    - Query commitments for committed and pending costs
2. **Calculate current variance:**

```
   current_variance = revised_budget - total_costs
   current_variance_percent = (current_variance / revised_budget) * 100

```

1. **Calculate variance change:**

```
   prior_variance = previous period's variance (from prior analysis or initial budget)
   variance_change = current_variance - prior_variance
   variance_change_percent = (variance_change / prior_variance) * 100

```

1. **Categorize variance:**

```
   IF current_variance > 0: category = "Favorable"
   ELSE IF current_variance < 0: category = "Unfavorable"
   ELSE: category = "Neutral"

```

1. **Determine variance status:**

```
   IF current_variance is moving toward 0: status = "Improving"
   ELSE IF current_variance moving away from 0: status = "Declining"
   ELSE: status = "Stable"

```

1. **Identify variance drivers (if requested):**
    - Compare current period metrics to baseline
    - Calculate impact of:
        - Schedule variance (delay/early completion)
        - Productivity variance (faster/slower than planned)
        - Cost variance (material, labor rate changes)
        - Scope changes (approved COs)
        - Risk materialization
2. **Include forecast impact (if requested):**
    - Pull latest EAC from forecasting_data
    - Calculate forecast variance vs revised budget
3. **Create analysis record:**
    - Insert into variance_analyses table
    - Insert drivers into variance_drivers table (if included)
    - Return populated analysis object

**Error Handling:**

- `400` analysis_period_end > today
- `403` User lacks PROJECT_MANAGER role
- `404` Cost code not found
- `500` Database transaction failure

---

### ENDPOINT 2: Get Variance Analysis

**Route:** `GET /api/projects/{projectId}/budget/variance/{analysisId}`

**Response (200 OK):**

```json
{
  "analysis_id": "va_123abc",
  "cost_code_id": "cc_001",
  "cost_code_name": "Foundation",
  "analysis_date": "2025-01-06T00:00:00Z",

  "budget_metrics": {...},
  "cost_metrics": {...},
  "variance_metrics": {...},
  "variance_drivers": [...],
  "forecast_metrics": {...},
  "contingency_metrics": {...},

  "explanations": [
    {
      "explanation_id": "ex_001",
      "explanation_type": "Explanation",
      "title": "Productivity Gains Due to Crew Experience",
      "content": "The foundation crew has completed similar projects for this client and is familiar with the scope. This familiarity has resulted in 15% faster productivity than originally estimated.",
      "variance_impact": 20000.00,
      "created_by_name": "John Doe",
      "created_at": "2025-01-06T08:30:00Z"
    }
  ],

  "created_by_name": "John Doe",
  "created_at": "2025-01-06T08:05:54Z"
}

```

**Backend Logic:**

1. Query variance_analyses for analysis_id
2. Query variance_drivers for that analysis
3. Query variance_explanations for that analysis
4. Format and return

---

### ENDPOINT 3: Get Project Variance Summary

**Route:** `GET /api/projects/{projectId}/budget/variance/summary?date={YYYY-MM-DD}`

**Response (200 OK):**

```json
{
  "project_id": "proj_123",
  "analysis_date": "2025-01-06T00:00:00Z",

  "project_summary": {
    "total_revised_budget": 1595192.89,
    "total_actual_costs": 1285000.00,
    "total_committed": 120000.00,
    "total_pending": 35000.00,
    "total_costs": 1440000.00,
    "total_variance": 155192.89,
    "total_variance_percent": 9.72,
    "variance_category": "Favorable",
    "variance_status": "Improving"
  },

  "cost_code_summaries": [
    {
      "cost_code_id": "cc_001",
      "cost_code_name": "Foundation",
      "revised_budget": 255000.00,
      "total_costs": 215000.00,
      "variance": 40000.00,
      "variance_percent": 15.69,
      "variance_category": "Favorable",
      "variance_trend": "Positive"
    },
    {
      "cost_code_id": "cc_002",
      "cost_code_name": "Framing",
      "revised_budget": 440000.00,
      "total_costs": 465000.00,
      "variance": -25000.00,
      "variance_percent": -5.68,
      "variance_category": "Unfavorable",
      "variance_trend": "Negative"
    }
  ],

  "alerts": [
    {
      "alert_id": "al_001",
      "alert_type": "CriticalVariance",
      "severity": "High",
      "title": "Framing Over Budget",
      "description": "Framing cost code currently 5.68% over budget with unfavorable trend",
      "current_value": -25000.00
    }
  ]
}

```

**Backend Logic:**

1. Get latest variance analyses for all cost codes
2. Aggregate for project totals
3. Get active alerts
4. Return summary with all cost codes

---

### ENDPOINT 4: Create/Update Variance Explanation

**Route:** `POST /api/projects/{projectId}/budget/variance/{analysisId}/explanations`

**Request Body:**

```json
{
  "explanation_type": "Commentary",
  "title": "Productivity Gains Due to Crew Experience",
  "content": "The foundation crew has completed similar projects for this client and is familiar with the scope. This familiarity has resulted in 15% faster productivity than originally estimated.",
  "variance_impact": 20000.00
}

```

**Response (201 Created):**

```json
{
  "explanation_id": "ex_001",
  "analysis_id": "va_123abc",
  "explanation_type": "Commentary",
  "title": "Productivity Gains Due to Crew Experience",
  "content": "The foundation crew has completed similar projects for this client and is familiar with the scope. This familiarity has resulted in 15% faster productivity than originally estimated.",
  "variance_impact": 20000.00,
  "created_by": "user_456",
  "created_by_name": "John Doe",
  "created_at": "2025-01-06T08:30:00Z"
}

```

**Backend Logic:**

1. Verify user has PROJECT_MANAGER role
2. Validate explanation_type is valid
3. Insert into variance_explanations
4. Return created explanation

---

### ENDPOINT 5: Get Variance Trend Analysis

**Route:** `GET /api/projects/{projectId}/budget/variance/trends?costCodeId={id}&periods=13`

**Query Parameters:**

- `costCodeId` (optional): Filter to specific cost code
- `periods` (optional): Number of analysis periods (default: 13 = quarterly)

**Response (200 OK):**

```json
{
  "cost_code_id": "cc_001",
  "cost_code_name": "Foundation",
  "trend_periods": 13,

  "variance_history": [
    {
      "analysis_date": "2024-10-01T00:00:00Z",
      "revised_budget": 250000.00,
      "variance": 25000.00,
      "variance_percent": 10.0,
      "variance_category": "Favorable"
    },
    {
      "analysis_date": "2024-11-01T00:00:00Z",
      "revised_budget": 252500.00,
      "variance": 32500.00,
      "variance_percent": 12.87,
      "variance_category": "Favorable"
    },
    {
      "analysis_date": "2025-01-06T00:00:00Z",
      "revised_budget": 255000.00,
      "variance": 40000.00,
      "variance_percent": 15.69,
      "variance_category": "Favorable"
    }
  ],

  "trend_metrics": {
    "variance_trend": "Improving",
    "trend_direction": "Favorable",
    "variance_change_period": 15000.00,
    "variance_change_percent": 60.0,
    "average_variance": 32500.00,
    "best_variance": 40000.00,
    "worst_variance": 25000.00,
    "volatility": "Stable"
  }
}

```

**Backend Logic:**

1. Query variance_analyses ordered by analysis_date DESC, limit N periods
2. Calculate trend metrics
3. Determine volatility (consistency of variance)
4. Return history with metrics

---

### ENDPOINT 6: Generate Variance Report

**Route:** `POST /api/projects/{projectId}/budget/variance/reports`

**Request Body:**

```json
{
  "report_name": "January 2025 Budget Variance Report",
  "report_type": "Monthly",
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-01-06T00:00:00Z",
  "include_cost_codes": "All",
  "include_sections": [
    "SummaryMetrics",
    "DetailedAnalysis",
    "TrendAnalysis",
    "DriverAnalysis",
    "Alerts",
    "Recommendations"
  ]
}

```

**Response (201 Created):**

```json
{
  "report_id": "vr_123abc",
  "project_id": "proj_123",
  "report_name": "January 2025 Budget Variance Report",
  "report_type": "Monthly",
  "report_date": "2025-01-06T00:00:00Z",
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-01-06T00:00:00Z",

  "report_metrics": {
    "total_budget": 1595192.89,
    "total_actual_costs": 1285000.00,
    "total_variance": 310192.89,
    "total_variance_percent": 19.45,
    "favorable_count": 18,
    "unfavorable_count": 2
  },

  "sections": [
    {
      "section_name": "SummaryMetrics",
      "content": {...}
    },
    {
      "section_name": "DetailedAnalysis",
      "content": {...}
    }
  ],

  "status": "Draft",
  "created_by": "user_456",
  "created_by_name": "John Doe",
  "created_at": "2025-01-06T08:05:54Z"
}

```

**Backend Logic:**

1. Create variance analysis for all cost codes in report period
2. Aggregate metrics across cost codes
3. Generate each requested report section
4. Insert into variance_reports
5. Return report object

---

### ENDPOINT 7: Publish Variance Report

**Route:** `PATCH /api/projects/{projectId}/budget/variance/reports/{reportId}/publish`

**Request Body:**

```json
{
  "approved_notes": "Reviewed and approved for stakeholder distribution"
}

```

**Response (200 OK):**

```json
{
  "report_id": "vr_123abc",
  "status": "Published",
  "approved_by": "user_789",
  "approved_by_name": "Jane Smith",
  "approved_at": "2025-01-06T10:00:00Z",
  "published_at": "2025-01-06T10:00:00Z"
}

```

**Backend Logic:**

1. Verify user has PROJECT_MANAGER or EXEC role
2. Update status to "Published"
3. Set approved_by and approved_at
4. Return updated report

---

### ENDPOINT 8: Get Active Variance Alerts

**Route:** `GET /api/projects/{projectId}/budget/variance/alerts?severity=High&limit=20`

**Query Parameters:**

- `severity` (optional): Filter by severity (Critical, High, Medium, Low)
- `limit` (default: 20)

**Response (200 OK):**

```json
{
  "alerts": [
    {
      "alert_id": "al_001",
      "cost_code_id": "cc_002",
      "cost_code_name": "Framing",
      "alert_type": "CriticalVariance",
      "severity": "High",
      "title": "Framing Over Budget",
      "description": "Framing cost code currently 5.68% over budget with unfavorable trend",
      "threshold_value": -2.0,
      "current_value": -5.68,
      "created_at": "2025-01-05T14:30:00Z"
    },
    {
      "alert_id": "al_002",
      "project_id": "proj_123",
      "alert_type": "ContingencyLow",
      "severity": "Medium",
      "title": "Project Contingency Running Low",
      "description": "Project contingency reserve is 23.5% consumed. Remaining: $9,521.12",
      "threshold_value": 25.0,
      "current_value": 23.5,
      "created_at": "2025-01-04T09:15:00Z"
    }
  ],
  "total_count": 5,
  "critical_count": 0,
  "high_count": 2,
  "medium_count": 3,
  "low_count": 0
}

```

**Backend Logic:**

1. Query variance_alerts where is_active = true
2. Filter by severity if provided
3. Order by severity (Critical first)
4. Return with summary counts

---

## 3. BACKEND LOGIC REQUIREMENTS

### Variance Driver Analysis

```tsx
function analyzeVarianceDrivers(costCode, currentPeriod, baselinePeriod) {
  const drivers = [];

  // Schedule variance analysis
  const scheduleVariance = analyzeScheduleVariance(costCode, currentPeriod, baselinePeriod);
  if (Math.abs(scheduleVariance) > 0) {
    drivers.push({
      type: 'Schedule',
      impact: scheduleVariance,
      description: scheduleVariance > 0 ? 'Work ahead of schedule' : 'Work behind schedule'
    });
  }

  // Productivity variance analysis
  const productivityVariance = analyzeProductivityVariance(costCode, currentPeriod, baselinePeriod);
  if (Math.abs(productivityVariance) > 0) {
    drivers.push({
      type: 'Productivity',
      impact: productivityVariance,
      description: productivityVariance > 0 ? 'Higher productivity than planned' : 'Lower productivity than planned'
    });
  }

  // Cost variance analysis (materials, labor rates)
  const costVariance = analyzeCostVariance(costCode, currentPeriod, baselinePeriod);
  if (Math.abs(costVariance) > 0) {
    drivers.push({
      type: 'Cost',
      impact: costVariance,
      description: costVariance > 0 ? 'Costs higher than budgeted' : 'Costs lower than budgeted'
    });
  }

  // Scope variance (change orders)
  const scopeVariance = analyzeScopeVariance(costCode, currentPeriod, baselinePeriod);
  if (Math.abs(scopeVariance) > 0) {
    drivers.push({
      type: 'Scope',
      impact: scopeVariance,
      description: 'Scope changes via change orders'
    });
  }

  // Risk materialization
  const riskImpact = analyzeRiskImpact(costCode, currentPeriod, baselinePeriod);
  if (Math.abs(riskImpact) > 0) {
    drivers.push({
      type: 'Risk',
      impact: riskImpact,
      description: 'Risk factors materializing or avoiding'
    });
  }

  return drivers;
}

```

### Alert Generation Logic

```tsx
function generateVarianceAlerts(projectId, costCode, analysis) {
  const alerts = [];

  // Critical variance alert
  if (Math.abs(analysis.current_variance_percent) > 10) {
    alerts.push({
      alert_type: 'CriticalVariance',
      severity: 'Critical',
      title: `${costCode.name} Variance Critical`,
      description: `Variance of ${Math.abs(analysis.current_variance_percent)}% exceeds 10% threshold`,
      current_value: analysis.current_variance_percent
    });
  }

  // Trending worse alert
  if (analysis.variance_change < -5000 && analysis.variance_status === 'Declining') {
    alerts.push({
      alert_type: 'TrendingWorse',
      severity: 'High',
      title: `${costCode.name} Variance Trending Unfavorable`,
      description: `Variance has declined by $${Math.abs(analysis.variance_change).toFixed(2)} in last period`,
      current_value: analysis.variance_change
    });
  }

  // Contingency low alert
  const contingencyUsedPercent = (analysis.contingency_amount - analysis.contingency_remaining) / analysis.contingency_amount * 100;
  if (contingencyUsedPercent > 75) {
    alerts.push({
      alert_type: 'ContingencyLow',
      severity: 'High',
      title: 'Project Contingency Running Low',
      description: `Project contingency is ${contingencyUsedPercent.toFixed(1)}% consumed. Remaining: $${analysis.contingency_remaining.toFixed(2)}`,
      current_value: contingencyUsedPercent
    });
  }

  // Forecast over budget alert
  if (analysis.estimated_cost_at_completion > analysis.revised_budget) {
    const forecastVariance = analysis.estimated_cost_at_completion - analysis.revised_budget;
    const forecastVariancePercent = (forecastVariance / analysis.revised_budget) * 100;
    alerts.push({
      alert_type: 'ForecastOverBudget',
      severity: 'High',
      title: `${costCode.name} Forecast Over Budget`,
      description: `EAC of $${analysis.estimated_cost_at_completion.toFixed(2)} exceeds budget by ${forecastVariancePercent.toFixed(2)}%`,
      current_value: forecastVariancePercent
    });
  }

  return alerts;
}

```

---

## 4. UI COMPONENTS

### Component 1: Variance Summary Dashboard

**Location:** Budget page → "Variance Analysis" tab

**Visual Elements:**

**Project Overview Cards:**

- Total Revised Budget: $1,595,193
- Total Actual Costs: $1,285,000
- Total Variance: $310,193 (19.45%)
- Variance Trend: ↑ Improving

**Variance Health Indicators:**

- Overall Status: "On Track" (Green)
- Cost Codes Favorable: 18
- Cost Codes Unfavorable: 2
- Alert Count: 5 (2 Critical, 3 High)

**Active Alerts Section:**

- Dismissible alert cards showing critical/high severity alerts
- Color-coded by severity (Red/Orange/Yellow)
- Quick actions: View Details, Acknowledge

**Cost Code Variance List:**

- Table with columns: Cost Code, Budget, Variance, Variance %, Trend, Status
- Sort by: Variance Amount, Variance %, Status
- Filter by: Category (Favorable/Unfavorable), Status (Improving/Declining)
- Row actions: View Analysis, Add Explanation

---

### Component 2: Variance Analysis Detail View

**Triggered by:** Clicking cost code in variance summary

**View Layout:**

**Header:**

- Cost code name and number
- Current variance amount and %
- Status badge (Improving/Declining/Stable)
- Category badge (Favorable/Unfavorable)
- Actions: Edit Analysis, Add Explanation, View History

**Budget vs. Actuals:**

- Revised Budget: $255,000
- Job to Date Cost: $180,000
- Committed Costs: $25,000
- Pending Costs: $10,000
- Total Costs: $215,000
- **Variance: $40,000 (15.69%)**

**Variance Drivers Breakdown:**

- Table showing each identified driver
- Columns: Driver Type, Driver Name, Impact Amount, Impact %, Status
- Example drivers: Productivity +$20K, Schedule +$15K, Material Costs -$5K
- Expandable rows showing root cause and resolution actions

**Prior Period Comparison:**

- Prior Period Variance: $35,000
- Variance Change: +$5,000 (14.29%)
- Improvement: 1.4%
- Trend: Positive ↑

**Forecast Impact:**

- Estimated Cost at Completion: $243,232
- Forecast Variance: $11,768 (4.61%)
- Impact on Project EAC: Improving

**Contingency Status:**

- Contingency Amount: $12,750
- Contingency Used: $3,229 (25.3%)
- Contingency Remaining: $9,521
- Status: Healthy (< 75% used)

**Explanations Section:**

- User-provided commentaries and explanations
- Card layout showing:
    - Title
    - Content excerpt
    - Variance Impact
    - Author and date
    - Edit/Delete buttons (if owner)

**Add Explanation Button:**

- Opens modal to add variance commentary
- Fields: Type (Explanation/Commentary/Justification), Title, Content, Variance Impact

---

### Component 3: Variance Driver Analysis View

**Triggered by:** "View Details" on driver or dedicated driver analysis view

**View Layout:**

**Driver Summary:**

- List of all identified variance drivers
- Filter by: Type (Schedule/Productivity/Cost/Scope/Risk)
- Sort by: Impact Amount, Impact %

**Driver Cards (Expandable):**

- Driver Type (color-coded)
- Driver Name
- Impact: $20,000 (50% of total variance)
- Root Cause: "Experienced crew with familiarity to scope"
- Resolution Action: "N/A - Favorable variance to maintain"
- Status: Open/In Progress/Resolved
- Assigned To: (if action item)
- Due Date: (if action item)

**Driver Waterfall Chart:**

- Visual showing cumulative driver impacts
- X-axis: Each driver
- Y-axis: Variance amount
- Running total showing how drivers combine to total variance
- Color-coded by favorable (green) and unfavorable (red)

---

### Component 4: Variance Report Builder & Viewer

**Triggered by:** "Generate Report" button or report list

**Report Builder:**

- Report Name: Input field
- Report Type: Dropdown (Weekly/Monthly/Custom/Executive)
- Period: Date range selector
- Cost Code Selection: All / Over Budget / At Risk / Custom (with multi-select)
- Sections to Include: Checkboxes
    - Summary Metrics
    - Detailed Analysis
    - Trend Analysis
    - Driver Analysis
    - Alerts
    - Recommendations
- Buttons: Generate, Save as Template

**Report Viewer:**

- Sections displayed in order selected
- Print-friendly layout
- Export to PDF button
- Approval workflow status

**Report Status:**

- Draft → Approve → Publish workflow
- Approval notes field
- Approval timestamp and user

---

### Component 5: Variance Trend Chart

**Location:** Cost Code Analysis Detail → "Trend Analysis" tab

**Visual Elements:**

- Line chart showing variance trend over time
- X-axis: Analysis periods (dates)
- Y-axis: Variance amount and percent
- Two lines: Variance Amount (left axis), Variance % (right axis)
- Horizontal line at 0 showing break-even
- Color zones: Green (favorable), Red (unfavorable)
- Toggle options: Show/Hide Amount, Show/Hide Percent, Period selector (7d/30d/90d)
- Hover tooltips showing exact values

---

## 5. FRONTEND INTEGRATION CHECKLIST

- [ ]  Import API client functions for variance endpoints
- [ ]  Create VarianceContext or Redux store:
    - [ ]  varianceAnalyses (array of analyses)
    - [ ]  selectedAnalysis (current analysis)
    - [ ]  varianceAlerts (active alerts)
    - [ ]  varianceReports (generated reports)
    - [ ]  isLoading (boolean)
    - [ ]  error (error message or null)
- [ ]  Create custom hooks:
    - [ ]  useVarianceAnalysis(costCodeId) - fetch variance for cost code
    - [ ]  useProjectVarianceSummary(projectId) - fetch all variances
    - [ ]  useGenerateVariance(data) - generate variance analysis
    - [ ]  useVarianceAlerts(projectId) - fetch active alerts
    - [ ]  useVarianceTrends(costCodeId, periods) - fetch trend data
    - [ ]  useVarianceReport(data) - generate/manage reports
- [ ]  Create React components:
    - [ ]  VarianceSummaryDashboard
    - [ ]  VarianceAnalysisDetailView
    - [ ]  VarianceDriverAnalysisView
    - [ ]  VarianceReportBuilder
    - [ ]  VarianceReportViewer
    - [ ]  VarianceTrendChart (reusable)
    - [ ]  VarianceAlertCard (reusable)
    - [ ]  VarianceExplanationForm
- [ ]  Integrate into Budget page:
    - [ ]  Add "Variance Analysis" tab to budget tabs
    - [ ]  Add variance summary to budget table (new columns)
    - [ ]  Link variance detail from cost code row
    - [ ]  Add variance alerts to main view
    - [ ]  Add trend charts to detail view
    - [ ]  Add report generation/publishing workflow
- [ ]  Add notifications:
    - [ ]  Toast on successful analysis generation
    - [ ]  Toast on successful explanation added
    - [ ]  Alert notifications for critical variances
    - [ ]  Email notifications for unfavorable trends
    - [ ]  Loading indicators for async operations
- [ ]  Add interactive features:
    - [ ]  Drill-down from project summary to cost code detail
    - [ ]  Driver impact visualization (waterfall chart)
    - [ ]  Period selector for trend analysis
    - [ ]  Export to PDF/Excel
    - [ ]  Report scheduling (weekly/monthly auto-generation)
    - [ ]  Custom alert thresholds

---

## 6. TESTING REQUIREMENTS

### Unit Tests (Backend)

**Test Suite: Variance Analysis**

```tsx
describe('POST /api/projects/:projectId/budget/variance/generate', () => {
  test('should generate variance analysis correctly', async () => {
    // Setup: Cost code with known budget and actuals
    // Action: POST /variance
```