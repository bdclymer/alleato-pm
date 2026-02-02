# PHASE 2: FORECASTING ENGINE

## Implementation Instructions (Copy-Paste Ready for Claude Code)

**Priority Level:** P1 (High Priority - Core feature for budget variance analysis)
**Estimated Effort:** 20 hours
**Sprint:** Sprint 4-5 (Weeks 4-5)
**Dependencies:** Phase 1A (Budget Modifications), Phase 1B (Cost Actuals Integration), Phase 1C (Project Status Snapshots)

---

## OVERVIEW

The Forecasting Engine calculates the Estimated Cost at Completion (EAC) and other forecast metrics for each cost code based on:

- Historical actuals (Job to Date Cost Detail)
- Current burn rate trends
- Committed costs (approved COs, subcontracts, POs)
- Budget modifications
- Risk factors and contingencies

This feeds into variance analysis, project health indicators, and budget performance dashboards.

---

## 1. DATABASE SCHEMA

### TABLE: forecasting_data

```sql
CREATE TABLE forecasting_data (
  forecast_id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  cost_code_id UUID NOT NULL,
  forecast_date TIMESTAMP NOT NULL,

  -- Input metrics (from Phase 1A & 1B)
  original_budget DECIMAL(15,2) NOT NULL,
  budget_modifications DECIMAL(15,2) NOT NULL,
  approved_cos DECIMAL(15,2) NOT NULL,
  revised_budget DECIMAL(15,2) NOT NULL,

  job_to_date_cost DECIMAL(15,2) NOT NULL,
  direct_costs DECIMAL(15,2) NOT NULL,
  committed_costs DECIMAL(15,2) NOT NULL,
  pending_costs DECIMAL(15,2) NOT NULL,

  -- Calculated metrics
  burn_rate_daily DECIMAL(15,4),
  burn_rate_weekly DECIMAL(15,2),
  days_since_start INT,
  days_remaining INT,

  -- Forecast calculations
  forecast_method VARCHAR(50), -- 'LinearTrend', 'BurnRate', 'CommittedBased', 'Manual'
  forecast_to_complete DECIMAL(15,2) NOT NULL,
  estimated_cost_at_completion DECIMAL(15,2) NOT NULL,
  variance DECIMAL(15,2) NOT NULL,
  variance_percent DECIMAL(5,2) NOT NULL,

  -- Confidence metrics
  confidence_level VARCHAR(50), -- 'High' (>90%), 'Medium' (70-90%), 'Low' (<70%)
  confidence_percent DECIMAL(5,2),

  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  is_manual_override BOOLEAN DEFAULT false,
  manual_override_notes TEXT,

  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (cost_code_id) REFERENCES cost_codes(cost_code_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

```

**Indexes:**

- `(project_id, forecast_date DESC)` - for querying latest forecasts
- `(project_id, cost_code_id, forecast_date DESC)` - for specific cost code forecasts
- `created_at DESC` - for sorting by creation date

### TABLE: forecast_assumptions

```sql
CREATE TABLE forecast_assumptions (
  assumption_id UUID PRIMARY KEY,
  forecast_id UUID NOT NULL,

  assumption_name VARCHAR(255) NOT NULL,
  assumption_type VARCHAR(50), -- 'BurnRate', 'ContingencyFactor', 'ProductivityTrend', 'RiskFactor'
  description TEXT,

  base_value DECIMAL(15,4),
  adjusted_value DECIMAL(15,4),
  adjustment_reason TEXT,

  impact_on_forecast DECIMAL(15,2), -- $ impact
  confidence_level VARCHAR(50), -- 'High', 'Medium', 'Low'

  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (forecast_id) REFERENCES forecasting_data(forecast_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

```

**Indexes:**

- `(forecast_id)` - for querying all assumptions for a forecast
- `assumption_type` - for filtering by type

### TABLE: forecast_scenarios

```sql
CREATE TABLE forecast_scenarios (
  scenario_id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  cost_code_id UUID NOT NULL,

  scenario_name VARCHAR(255) NOT NULL,
  scenario_type VARCHAR(50), -- 'Base', 'Optimistic', 'Pessimistic', 'RiskAdjusted'
  description TEXT,

  base_forecast_id UUID,

  forecast_to_complete DECIMAL(15,2),
  estimated_cost_at_completion DECIMAL(15,2),
  variance DECIMAL(15,2),
  variance_percent DECIMAL(5,2),

  probability DECIMAL(5,2), -- Likelihood: 0-100%
  weighted_eac DECIMAL(15,2), -- Probability-weighted EAC

  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (cost_code_id) REFERENCES cost_codes(cost_code_id),
  FOREIGN KEY (base_forecast_id) REFERENCES forecasting_data(forecast_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

```

**Indexes:**

- `(project_id, cost_code_id)` - for querying scenarios
- `scenario_type` - for filtering

---

## 2. API ENDPOINTS

### ENDPOINT 1: Generate Forecast for Cost Code

**Route:** `POST /api/projects/{projectId}/budget/forecast/generate`

**Request Body:**

```json
{
  "cost_code_id": "cc_001",
  "forecast_method": "LinearTrend",
  "include_risk_adjustment": true,
  "contingency_percent": 10,
  "forecast_date": "2025-01-06T00:00:00Z"
}

```

**Response (201 Created):**

```json
{
  "forecast_id": "fc_123abc",
  "project_id": "proj_123",
  "cost_code_id": "cc_001",
  "cost_code_name": "Foundation",
  "forecast_date": "2025-01-06T00:00:00Z",

  "input_metrics": {
    "original_budget": 250000.00,
    "budget_modifications": 5000.00,
    "approved_cos": 0.00,
    "revised_budget": 255000.00,
    "job_to_date_cost": 180000.00,
    "direct_costs": 180000.00,
    "committed_costs": 0.00,
    "pending_costs": 0.00
  },

  "calculated_metrics": {
    "burn_rate_daily": 1234.25,
    "burn_rate_weekly": 8639.75,
    "days_since_start": 146,
    "days_remaining": 50,
    "percent_complete": 70.6
  },

  "forecast_results": {
    "forecast_method": "LinearTrend",
    "forecast_to_complete": 69650.00,
    "estimated_cost_at_completion": 249650.00,
    "variance": 5350.00,
    "variance_percent": 2.10,
    "confidence_level": "High",
    "confidence_percent": 92
  },

  "assumptions": [
    {
      "assumption_name": "Daily Burn Rate",
      "assumption_type": "BurnRate",
      "base_value": 1234.25,
      "adjusted_value": 1234.25,
      "impact_on_forecast": 49650.00,
      "confidence_level": "High"
    },
    {
      "assumption_name": "Contingency Buffer",
      "assumption_type": "ContingencyFactor",
      "base_value": 0.00,
      "adjusted_value": 10000.00,
      "adjustment_reason": "Risk adjustment for remaining work",
      "impact_on_forecast": 10000.00,
      "confidence_level": "Medium"
    }
  ],

  "created_by": "user_456",
  "created_at": "2025-01-06T08:05:54Z",
  "created_by_name": "John Doe"
}

```

**Backend Logic:**

1. **Fetch current cost code data:**
    - Query budget_lines for original_budget
    - Query budget_modifications for modifications total
    - Query approved COs for approved_cos total
    - Query cost_actuals (direct_costs table) for job_to_date_cost
    - Query commitments for committed_costs total
2. **Calculate burn rate metrics:**

```
   days_since_start = TODAY - project_start_date
   percent_complete = job_to_date_cost / revised_budget * 100
   burn_rate_daily = job_to_date_cost / days_since_start
   burn_rate_weekly = burn_rate_daily * 7

```

1. **Calculate days remaining:**
    - If project has scheduled end date: days_remaining = project_end_date - TODAY
    - Otherwise: days_remaining = (remaining_budget / burn_rate_daily)
2. **Select forecast method and calculate:**
    
    **Method: LinearTrend** (Most common)
    

```
   remaining_budget = revised_budget - job_to_date_cost
   forecast_to_complete = remaining_budget / (1 + trend_factor)
   trend_factor = (percent_complete - 50%) / 100  // Accounts for speed-up/slow-down
   estimated_cost_at_completion = job_to_date_cost + forecast_to_complete

```

**Method: BurnRate**

```
   forecast_to_complete = burn_rate_daily * days_remaining
   estimated_cost_at_completion = job_to_date_cost + forecast_to_complete

```

**Method: CommittedBased**

```
   remaining_committed = (committed_costs + pending_costs) - job_to_date_cost
   remaining_unbudgeted = remaining_budget - remaining_committed
   forecast_to_complete = remaining_committed + (remaining_unbudgeted * adjustment_factor)
   estimated_cost_at_completion = job_to_date_cost + forecast_to_complete

```

**Method: Manual**

```
   forecast_to_complete = user_provided_value
   estimated_cost_at_completion = job_to_date_cost + forecast_to_complete

```

1. **Calculate variance:**

```
   variance = revised_budget - estimated_cost_at_completion
   variance_percent = (variance / revised_budget) * 100

```

1. **Determine confidence level:**

```
   IF percent_complete < 20%: confidence = Low (20%)
   ELSE IF percent_complete < 50%: confidence = Medium (70%)
   ELSE IF percent_complete >= 50%: confidence = High (90%)

   IF forecast_method == 'Manual': confidence -= 10%
   IF has_risk_adjustments: confidence += 5%

```

1. **Apply contingency if requested:**

```
   contingency_amount = revised_budget * (contingency_percent / 100)
   estimated_cost_at_completion += contingency_amount

```

1. **Create forecast record:**
    - Insert into forecasting_data table
    - Insert assumptions into forecast_assumptions table
    - Return populated forecast object

**Error Handling:**

- `400` Invalid forecast_method
- `400` Invalid contingency_percent (must be 0-50)
- `403` User lacks PROJECT_MANAGER role
- `404` Cost code not found
- `404` Project not found
- `500` Database transaction failure

---

### ENDPOINT 2: Get Cost Code Forecast

**Route:** `GET /api/projects/{projectId}/budget/forecast/{costCodeId}?date={YYYY-MM-DD}`

**Query Parameters:**

- `date` (optional): Forecast date - returns latest if not provided

**Response (200 OK):**

```json
{
  "forecast_id": "fc_123abc",
  "project_id": "proj_123",
  "cost_code_id": "cc_001",
  "cost_code_name": "Foundation",
  "forecast_date": "2025-01-06T00:00:00Z",
  "input_metrics": {...},
  "calculated_metrics": {...},
  "forecast_results": {...},
  "assumptions": [...]
}

```

**Backend Logic:**

1. Query forecasting_data for latest forecast of cost_code_id (or specific date)
2. Query forecast_assumptions for that forecast
3. Format and return

---

### ENDPOINT 3: Get All Project Forecasts (Summary)

**Route:** `GET /api/projects/{projectId}/budget/forecast/summary?date={YYYY-MM-DD}`

**Response (200 OK):**

```json
{
  "project_id": "proj_123",
  "forecast_date": "2025-01-06T00:00:00Z",
  "total_revised_budget": 1595192.89,
  "total_job_to_date_cost": 1382452.74,
  "total_estimated_cost_at_completion": 1575000.00,
  "total_variance": 20192.89,
  "total_variance_percent": 1.26,

  "project_health": {
    "status": "On Track",
    "percent_complete": 86.6,
    "burn_rate_daily": 9460.50,
    "days_remaining": 23
  },

  "cost_code_forecasts": [
    {
      "cost_code_id": "cc_001",
      "cost_code_name": "Foundation",
      "revised_budget": 255000.00,
      "estimated_cost_at_completion": 249650.00,
      "variance": 5350.00,
      "variance_percent": 2.10,
      "forecast_method": "LinearTrend",
      "confidence_level": "High"
    }
  ]
}

```

**Backend Logic:**

1. Get latest forecasts for all cost codes in project
2. Sum all cost codes for totals
3. Determine project_health status based on variance_percent:
    - "On Track": variance_percent > 2%
    - "At Risk": variance_percent -2% to 2%
    - "Over Budget": variance_percent < -2%
4. Return summary with all cost codes

---

### ENDPOINT 4: Update Forecast (Manual Override)

**Route:** `PATCH /api/projects/{projectId}/budget/forecast/{forecastId}`

**Request Body:**

```json
{
  "forecast_method": "Manual",
  "forecast_to_complete": 75000.00,
  "estimated_cost_at_completion": 255000.00,
  "override_notes": "Adjusted based on recent site assessment and pending change orders"
}

```

**Response (200 OK):**

```json
{
  "forecast_id": "fc_123abc",
  "is_manual_override": true,
  "manual_override_notes": "Adjusted based on recent site assessment and pending change orders",
  "forecast_to_complete": 75000.00,
  "estimated_cost_at_completion": 255000.00,
  "variance": 0.00,
  "variance_percent": 0.00,
  "updated_at": "2025-01-06T10:30:00Z"
}

```

**Backend Logic:**

1. Verify user has PROJECT_MANAGER role
2. Query forecasting_data for forecast_id
3. Validate EAC >= job_to_date_cost
4. Update is_manual_override = true
5. Store override_notes
6. Update confidence_level to account for manual override
7. Return updated forecast

**Error Handling:**

- `400` EAC must be >= job_to_date_cost
- `403` User lacks PROJECT_MANAGER role
- `404` Forecast not found

---

### ENDPOINT 5: Generate Forecast Scenarios

**Route:** `POST /api/projects/{projectId}/budget/forecast/scenarios`

**Request Body:**

```json
{
  "cost_code_id": "cc_001",
  "base_forecast_id": "fc_123abc",
  "generate_scenarios": ["Optimistic", "Pessimistic", "RiskAdjusted"]
}

```

**Response (201 Created):**

```json
{
  "scenarios": [
    {
      "scenario_id": "sc_001opt",
      "cost_code_id": "cc_001",
      "scenario_name": "Optimistic Scenario",
      "scenario_type": "Optimistic",
      "description": "Assumes best-case productivity and no additional delays",
      "base_forecast_id": "fc_123abc",
      "forecast_to_complete": 55000.00,
      "estimated_cost_at_completion": 235000.00,
      "variance": 20000.00,
      "variance_percent": 7.84,
      "probability": 20,
      "weighted_eac": 47000.00,
      "created_at": "2025-01-06T08:05:54Z"
    },
    {
      "scenario_id": "sc_001base",
      "cost_code_id": "cc_001",
      "scenario_name": "Base Case Scenario",
      "scenario_type": "Base",
      "description": "Most likely outcome based on current trends",
      "base_forecast_id": "fc_123abc",
      "forecast_to_complete": 69650.00,
      "estimated_cost_at_completion": 249650.00,
      "variance": 5350.00,
      "variance_percent": 2.10,
      "probability": 50,
      "weighted_eac": 124825.00,
      "created_at": "2025-01-06T08:05:54Z"
    },
    {
      "scenario_id": "sc_001pess",
      "cost_code_id": "cc_001",
      "scenario_name": "Pessimistic Scenario",
      "scenario_type": "Pessimistic",
      "description": "Accounts for delays, rework, and cost increases",
      "base_forecast_id": "fc_123abc",
      "forecast_to_complete": 85000.00,
      "estimated_cost_at_completion": 265000.00,
      "variance": -10000.00,
      "variance_percent": -3.92,
      "probability": 30,
      "weighted_eac": 79500.00,
      "created_at": "2025-01-06T08:05:54Z"
    }
  ],
  "weighted_average_eac": 251325.00
}

```

**Backend Logic:**

For each requested scenario type:

**Optimistic Scenario:**

```
Assumption: 20% better burn rate than linear trend
forecast_to_complete = base_forecast * 0.80
Probability: 20%

```

**Pessimistic Scenario:**

```
Assumption: 20% worse burn rate, risk factors included
forecast_to_complete = base_forecast * 1.25
Probability: 30%

```

**RiskAdjusted Scenario:**

```
Assumption: Base forecast + risk contingency (15%)
forecast_to_complete = base_forecast * 1.15
Probability: 25%

```

**Base Case Scenario (always included):**

```
Probability: 50% (or 25% if three other scenarios)

```

Then calculate weighted EAC:

```
weighted_eac = estimated_cost_at_completion * (probability / 100)
weighted_average_eac = SUM of all weighted_eac values

```

---

### ENDPOINT 6: Get Project Forecast Trends

**Route:** `GET /api/projects/{projectId}/budget/forecast/trends?costCodeId={id}&days=30`

**Query Parameters:**

- `costCodeId` (optional): Filter to specific cost code
- `days` (optional): Number of days of history (default: 30)

**Response (200 OK):**

```json
{
  "cost_code_id": "cc_001",
  "cost_code_name": "Foundation",
  "period_days": 30,
  "forecast_history": [
    {
      "forecast_date": "2024-12-07T00:00:00Z",
      "estimated_cost_at_completion": 252000.00,
      "variance": 3000.00,
      "variance_percent": 1.18,
      "job_to_date_cost": 170000.00
    },
    {
      "forecast_date": "2024-12-14T00:00:00Z",
      "estimated_cost_at_completion": 250500.00,
      "variance": 4500.00,
      "variance_percent": 1.76,
      "job_to_date_cost": 175000.00
    },
    {
      "forecast_date": "2025-01-06T00:00:00Z",
      "estimated_cost_at_completion": 249650.00,
      "variance": 5350.00,
      "variance_percent": 2.10,
      "job_to_date_cost": 180000.00
    }
  ],
  "trend_analysis": {
    "variance_trend": "Improving",
    "trend_direction": "Positive",
    "eac_change_30d": 2350.00,
    "eac_change_percent": 0.93,
    "burn_rate_trend": "Increasing"
  }
}

```

**Backend Logic:**

1. Query forecasting_data for cost_code_id, ordered by forecast_date DESC, limit last N days
2. Calculate trend by comparing first and last forecast
3. Determine if variance is improving (getting closer to 0)
4. Calculate EAC change over period
5. Return history with trend analysis

---

## 3. BACKEND LOGIC REQUIREMENTS

### Forecast Method Selection Logic

```tsx
function selectForecastMethod(costCode) {
  // Rule-based selection of best forecast method

  if (costCode.percent_complete < 20) {
    // Not enough data yet - use committed costs
    return 'CommittedBased';
  }

  if (costCode.has_recent_change_orders) {
    // Recent changes - need manual review
    return 'Manual';
  }

  if (costCode.percent_complete >= 50) {
    // Enough historical data - use trend analysis
    return 'LinearTrend';
  }

  if (costCode.days_remaining < 20) {
    // Near completion - use burn rate
    return 'BurnRate';
  }

  return 'LinearTrend'; // Default
}

```

### Confidence Level Calculation

```tsx
function calculateConfidence(forecast) {
  let confidence = 50; // Base confidence

  // Increase confidence based on percent complete
  if (forecast.percent_complete >= 75) confidence = 90;
  else if (forecast.percent_complete >= 50) confidence = 85;
  else if (forecast.percent_complete >= 30) confidence = 75;
  else if (forecast.percent_complete >= 10) confidence = 60;

  // Adjust by forecast method
  if (forecast.forecast_method === 'Manual') confidence -= 10;
  if (forecast.forecast_method === 'BurnRate') confidence -= 5;
  if (forecast.forecast_method === 'LinearTrend') confidence += 5;

  // Adjust by data quality
  if (forecast.has_inconsistent_actuals) confidence -= 15;
  if (forecast.has_recent_actuals) confidence += 10;

  // Ensure bounds
  return Math.min(95, Math.max(20, confidence));
}

```

### Variance Trend Analysis

```tsx
function analyzeTrend(forecastHistory) {
  const recent = forecastHistory[0].variance;
  const previous = forecastHistory[forecastHistory.length - 1].variance;

  // Trend is "Improving" if moving toward 0
  if (Math.abs(recent) < Math.abs(previous)) {
    return 'Improving';
  } else if (Math.abs(recent) > Math.abs(previous)) {
    return 'Declining';
  } else {
    return 'Stable';
  }
}

```

---

## 4. UI COMPONENTS

### Component 1: Forecast Summary Card

**Location:** Budget page → "Forecasting" tab

**Visual Elements:**

- **Cost Code Row with Forecast Data:**
    - Cost Code (clickable to detail)
    - Revised Budget
    - Estimated Cost at Completion (EAC) - highlighted, color-coded
    - Variance (amount + %)
    - Forecast Method badge
    - Confidence Level indicator (progress bar)
    - Trend arrow (up/down/stable)
- **Color Coding:**
    - Green: Favorable variance (>2%)
    - Yellow: At risk (-2% to 2%)
    - Red: Over budget (<-2%)

**Interactions:**

- Click cost code → Open forecast detail view
- Click EAC value → Show what-if analysis
- Hover on confidence → Show assumptions

---

### Component 2: Forecast Detail View

**Triggered by:** Clicking cost code in forecast summary

**View Layout:**

**Header:**

- Cost code name and number
- Revised Budget vs EAC (visual comparison)
- Variance (amount + %, color-coded)
- Last updated timestamp
- Actions: Edit Forecast, View Scenarios, Export

**Metrics Grid (4x3):**

- Original Budget | Budget Modifications | Approved COs
- Job to Date Cost | Remaining Budget | Burn Rate (daily)
- Forecast Method | Days Remaining | Percent Complete
- Days Since Start | Confidence Level | Forecast Date

**Forecast Calculation Details:**

- Input: job_to_date_cost = $180,000
- Burn Rate Calculation: $1,234.25/day
- Days Remaining: 50 days
- Linear Trend Factor: +2.5%
- **Calculation:** $1,234.25 × 50 × 1.025 = $63,231.88
- **Forecast to Complete:** $63,231.88
- **Estimated Cost at Completion:** $243,231.88

**Assumptions Section:**

- Table showing all assumptions used in calculation
- Columns: Assumption, Type, Base Value, Adjusted Value, Impact, Confidence
- Buttons: Edit Assumption, Add Assumption

**Scenarios Section:**

- Cards showing: Optimistic, Base, Pessimistic, Risk-Adjusted
- Each shows: EAC, Variance, Probability, Weighted EAC
- Visual: Weighted average line on chart
- Button: Regenerate Scenarios

**Trend Chart:**

- 30-day forecast history
- X-axis: Date
- Y-axis: EAC and Variance
- Lines: EAC trend, Budget line, Variance trend
- Toggle: Show actuals overlay, Show burn rate line

---

### Component 3: Forecast Edit Modal

**Triggered by:** "Edit Forecast" button

**Modal Content:**

- Title: "Update Forecast for [Cost Code]"
- **Form Fields:**
    - Forecast Method dropdown (LinearTrend, BurnRate, CommittedBased, Manual)
    - If Manual selected:
        - Forecast to Complete (currency input)
        - Estimated Cost at Completion (currency input, auto-calculated)
        - Override Notes (textarea)
    - Include Contingency? (toggle)
    - Contingency Percent (0-50, if toggle enabled)
    - Re-calculate button (shows impact before saving)
    - Buttons: Save, Cancel

**Logic:**

1. Show current forecast method and values
2. If changing to Manual: disable calculated fields, enable input fields
3. Show confidence change on save
4. Show what-if impact on total project EAC

---

### Component 4: Scenario Comparison View

**Triggered by:** "View Scenarios" button

**View Layout:**

**Scenario Cards (4 cards in row):**

- Card Title: "Optimistic" / "Base" / "Pessimistic" / "Risk-Adjusted"
- Probability: "20%"
- EAC: "$235,000"
- Variance: "$20,000 (7.84%)"
- Weighted EAC: "$47,000"
- Trend line showing impact

**Weighted Average Summary:**

- "Most Likely EAC: $251,325"
- Range: Low ($235K) - High ($265K)
- Visual range bar showing scenarios

**Scenario Grid:**

- Columns: Scenario, EAC, Variance, Probability, Weighted EAC, Impact
- Rows: Each scenario
- Footer: Weighted Average and Expected Value

**Actions:**

- Toggle probability % (for sensitivity analysis)
- Re-calculate weighted average
- Export scenario analysis

---

### Component 5: Project Forecast Health Dashboard

**Location:** Budget page → Summary/Dashboard section

**Visual Elements:**

**Project Status Card:**

- Status: "On Track" / "At Risk" / "Over Budget" (icon + color)
- Project Completion: 86.6%
- Total EAC vs Budget: $1,575,000 vs $1,595,192.89
- Overall Variance: $20,192.89 (1.26%)
- Burn Rate: $9,460.50/day
- Days Remaining: 23 days

**Cost Code Health Table:**

- List all cost codes sorted by variance
- Highlight: Green (favorable), Yellow (at risk), Red (over budget)
- Show: Cost Code, Budget, EAC, Variance, Trend
- Color-coded variance column

**Trend Chart:**

- 30-day forecast history for entire project
- Total budget line
- Total EAC trend line (moving average)
- Variance zone (favorable/unfavorable)

**Risk Indicators:**

- Cost codes trending over budget (red list)
- Cost codes with low confidence forecasts (yellow list)
- Cost codes needing review

---

## 5. FRONTEND INTEGRATION CHECKLIST

- [ ]  Import API client functions for forecast endpoints
- [ ]  Create ForecastContext or Redux store:
    - [ ]  forecasts (array of cost code forecasts)
    - [ ]  selectedForecast (current forecast object)
    - [ ]  scenarios (forecast scenarios)
    - [ ]  trendData (forecast history)
    - [ ]  isLoading (boolean)
    - [ ]  error (error message or null)
- [ ]  Create custom hooks:
    - [ ]  useForecast(costCodeId) - fetch forecast for cost code
    - [ ]  useProjectForecasts(projectId) - fetch all forecasts
    - [ ]  useGenerateForecast(data) - generate new forecast
    - [ ]  useScenarios(forecastId) - fetch/generate scenarios
    - [ ]  useForecastTrends(costCodeId, days) - fetch trend data
- [ ]  Create React components:
    - [ ]  ForecastSummaryCard (for list view)
    - [ ]  ForecastDetailView
    - [ ]  ForecastEditModal
    - [ ]  ScenarioComparisonView
    - [ ]  ProjectForecastHealthDashboard
    - [ ]  TrendChart (reusable)
- [ ]  Integrate into Budget page:
    - [ ]  Add "Forecasting" tab to budget tabs
    - [ ]  Add forecast summary to budget table (new columns)
    - [ ]  Link forecast detail from cost code row
    - [ ]  Add forecast health dashboard to main view
    - [ ]  Add trend charts to detail view
- [ ]  Add notifications:
    - [ ]  Toast on successful forecast generation
    - [ ]  Toast on successful forecast update
    - [ ]  Warning alerts for low confidence forecasts
    - [ ]  Error alerts for failed operations
    - [ ]  Loading indicators for async operations
- [ ]  Add interactive features:
    - [ ]  Drill-down from project summary to cost code detail
    - [ ]  What-if analysis (adjust assumptions, see EAC change)
    - [ ]  Scenario comparison toggle
    - [ ]  Forecast method selector
    - [ ]  Trend period selector (7/14/30/60 days)

---

## 6. TESTING REQUIREMENTS

### Unit Tests (Backend)

**Test Suite: Forecast Generation**

```tsx
describe('POST /api/projects/:projectId/budget/forecast/generate', () => {
  test('should generate LinearTrend forecast correctly', async () => {
    // Setup: Cost code at 70% complete with 50 days remaining
    // Action: POST /forecast/generate with LinearTrend method
    // Assert:
    //   - forecast_id returned
    //   - burn_rate_daily calculated correctly
    //   - estimated_cost_at_completion = job_to_date_cost + forecast_to_complete
    //   - variance = revised_budget - eac
    //   - confidence_level = "High" (for >50% complete)
  })

  test('should generate BurnRate forecast correctly', async () => {
    // Setup: Cost code with known daily burn rate
    // Action: POST /forecast/generate with BurnRate method
    // Assert:
    //   - forecast_to_complete = burn_rate_daily * days_remaining
    //   - accuracy verified against expected value
  })

  test('should generate CommittedBased forecast correctly', async () => {
    // Setup: Cost code with committed subcontracts and POs
    // Action: POST /forecast/generate with CommittedBased method
    // Assert:
    //   - committed costs included in forecast
    //   - remaining unbudgeted calculated
    //   - eac reflects committed amounts
  })

  test('should apply contingency adjustment', async () => {
    // Setup: Forecast without contingency
    // Action: POST /forecast/generate with contingency_percent=10
    // Assert:
    //   - contingency_amount = revised_budget * 0.10
    //   - eac includes contingency
    //   - assumptions show contingency entry
  })

  test('should calculate confidence level correctly', async () => {
    // Test at different completion percentages
    // <20%: Low confidence (~20%)
    // 20-50%: Medium confidence (~70%)
    // >50%: High confidence (~90%)
    // Manual override: -10%
    // Recent actuals: +10%
  })

  test('should require PROJECT_MANAGER role', async () => {
    // Setup: Login as VIEWER
    // Action: POST /forecast/generate
    // Assert: 403 Forbidden error
  })
})

describe('GET /api/projects/:projectId/budget/forecast/summary', () => {
  test('should aggregate all cost code forecasts to project total', async () => {
    // Setup: 5 cost codes with different forecasts
    // Action: GET /forecast/summary
    // Assert:
    //   - total_estimated_cost_at_completion = sum of all cost codes
    //   - total_variance calculated correctly
    //   - project_health determined correctly
  })

  test('should determine project health status correctly', async () => {
    // variance_percent > 2%: "On Track"
    // variance_percent -2% to 2%: "At Risk"
    // variance_percent < -2%: "Over Budget"
  })
})

describe('POST /api/projects/:projectId/budget/forecast/scenarios', () => {
  test('should generate three scenarios with correct probabilities', async () => {
    // Setup: Cost code with base forecast
    // Action: POST /forecast/scenarios with ["Optimistic", "Pessimistic", "RiskAdjusted"]
    // Assert:
    //   - 4 scenarios created (base + 3 new)
    //   - Optimistic EAC < Base EAC < Pessimistic EAC
    //   - Probabilities sum to 100% (or 125% if base is separate)
    //   - weighted_average_eac calculated correctly
  })

  test('should calculate weighted EAC correctly', async () => {
    // Setup: Scenarios with known probabilities
    // Optimistic: $235K @ 20%
    // Base: $250K @ 50%
    // Pessimistic: $265K @ 30%
    // Action: Calculate weighted average
    // Assert: $251,500 (47K + 125K + 79.5K)
  })
})

describe('GET /api/projects/:projectId/budget/forecast/trends', () => {
  test('should return 30-day forecast history', async () => {
    // Setup: Multiple forecasts created over 30 days
    // Action: GET /forecast/trends
    // Assert:
    //   - Returns last 30 days of forecasts
    //   - Ordered chronologically
    //   - Trend analysis calculated
  })

  test('should detect variance improvement trend', async () => {
    // Setup: Forecasts with improving variance (getting closer to 0)
    // Assert: trend_analysis.variance_trend = "Improving"
  })
})

```

### Integration Tests (Frontend)

**Test Suite: Forecast UI Components**

```tsx
describe('ForecastDetailView Component', () => {
  test('should display current forecast data', async () => {
    // Setup: Mock API returns forecast for cost code
    // Render: ForecastDetailView
    // Assert:
    //   - EAC displayed
    //   - Variance color-coded
    //   - Forecast method shown
    //   - Confidence level displayed as progress bar
  })

  test('should show forecast calculation breakdown', async () => {
    // Render: ForecastDetailView
    // Assert:
    //   - Shows input metrics (job_to_date_cost, burn_rate)
    //   - Shows calculation steps
    //   - Shows resulting EAC with formula
  })

  test('should allow editing forecast with manual override', async () => {
    // Render: ForecastDetailView
    // Action: Click "Edit Forecast"
    // Assert:
    //   - EditModal opens
    //   - Can change forecast method to "Manual"
    //   - Can input custom EAC value
    //   - Can add override notes
  })
})

describe('ScenarioComparisonView Component', () => {
  test('should display all scenarios with weighted EAC', async () => {
    // Setup: Mock API returns 4 scenarios
    // Render: ScenarioComparisonView
    // Assert:
    //   - 4 scenario cards displayed
    //   - Weighted average shown
    //   - Range indicators visible
  })

  test('should allow probability adjustment', async () => {
    // Render: ScenarioComparisonView
    // Action: Adjust probability for scenario
    // Assert:
    //   - Weighted average recalculates
    //   - Update reflected in cards
  })
})

describe('ProjectForecastHealthDashboard Component', () => {
  test('should display project health status', async () => {
    // Setup: Project with known variance
    // Render: ProjectForecastHealthDashboard
    // Assert:
    //   - Shows "On Track" / "At Risk" / "Over Budget" status
    //   - Displays project completion %
    //   - Shows total EAC vs budget
    //   - Lists cost codes by variance
  })

  test('should color-code cost codes by health', async () => {
    // Setup: Mix of favorable, at-risk, and over-budget
```