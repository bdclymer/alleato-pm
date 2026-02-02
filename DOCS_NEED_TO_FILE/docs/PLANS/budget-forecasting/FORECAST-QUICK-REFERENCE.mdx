# Forecast to Complete - Quick Reference Guide

**Quick lookup for implementation details**

---

## CALCULATION FORMULAS

### Core Budget Calculations
```typescript
// Forecast to Complete (Automatic)
forecast_to_complete = projected_budget - projected_costs

// Projected Costs
projected_costs = committed_costs + actual_costs

// Projected Budget
projected_budget = original_budget + approved_budget_changes

// Estimated Cost at Completion
estimated_cost_at_completion = projected_costs + forecast_to_complete

// Projected Over/Under
projected_over_under = projected_budget - estimated_cost_at_completion
```

---

## 4 CALCULATION METHODS

### 1. Automatic (Default)
- **Formula**: `Projected Budget - Projected Costs`
- **Use Case**: Default behavior, auto-updates
- **Result**: $0 over/under when under budget
- **User Input**: None required

### 2. Manual Entry
- **Formula**: User-entered value
- **Use Case**: One-time costs (permits, fees, future commitments)
- **Result**: Fixed amount, no auto-update
- **User Input**: Dollar amount in Budget tab cell

### 3. Lump Sum Entry
- **Formula**: User-entered value in Forecasting tab
- **Use Case**: Single figure override for entire forecast
- **Result**: Overrides Budget tab automatic calculation
- **User Input**: Dollar amount in Forecasting tab
- **Critical**: This OVERRIDES Budget tab value

### 4. Monitored Resources
- **Formula**: Time-based linear drawdown
- **Use Case**: Recurring costs (payroll, equipment rental, trailer rental)
- **Result**: Auto-decreases over time as project progresses
- **User Input**: Rate, start date, end date, resource type

---

## FORECASTING CURVE TYPES

### Linear
- **Distribution**: Equal across all periods
- **Formula**: `total_amount / number_of_periods`
- **Use Case**: Evenly distributed costs

### S-Curve
- **Distribution**: 15% start, 70% middle, 15% end
- **Formula**: Cumulative normal distribution
- **Use Case**: Typical construction project pattern

### Bell Curve
- **Distribution**: Normal distribution (peaks in middle)
- **Formula**: Gaussian distribution
- **Use Case**: Resource-intensive mid-project phase

### Front Loaded
- **Distribution**: 80% early, 20% late
- **Formula**: Exponential decay
- **Use Case**: Mobilization, materials procurement

### Back Loaded
- **Distribution**: 20% early, 80% late
- **Formula**: Exponential growth
- **Use Case**: Finishes, punchlist, closeout

---

## DATABASE SCHEMA QUICK REF

### Budget Lines Table (Modified)
```sql
ALTER TABLE budget_lines ADD COLUMN:
- forecast_to_complete DECIMAL(15,2) DEFAULT 0
- forecast_calculation_method ENUM ('automatic', 'manual', 'lump_sum', 'monitored_resources')
- forecast_curve_type ENUM ('linear', 's_curve', 'bell', 'front_loaded', 'back_loaded', 'custom')
- monitored_resource_config JSONB
- estimated_cost_at_completion DECIMAL(15,2) GENERATED
- projected_over_under DECIMAL(15,2) GENERATED
```

### New Tables
- `forecasting_views` - Company-level view configurations
- `project_forecasting_views` - Project-to-view assignments
- `forecasting_data` - Time-phased forecast data
- `monitored_resources` - Monitored resource configurations
- `forecast_snapshots` - Point-in-time snapshots

---

## API ENDPOINTS

### Budget Line Forecast
```
PATCH /api/budget-lines/:id/forecast
GET   /api/budget-lines/:id/forecast/calculation
POST  /api/budget-lines/:id/forecast/recalculate
```

### Forecasting Views
```
GET    /api/forecasting-views
POST   /api/forecasting-views
GET    /api/forecasting-views/:id
PATCH  /api/forecasting-views/:id
DELETE /api/forecasting-views/:id
POST   /api/forecasting-views/:id/assign
GET    /api/projects/:projectId/forecasting-views
```

### Forecasting Data
```
GET  /api/projects/:projectId/forecasting-data
POST /api/forecasting-data
PATCH /api/forecasting-data/:id
POST /api/forecasting-data/apply-curve
POST /api/forecasting-data/bulk-update
```

---

## UI COMPONENTS TO BUILD

### Budget Tab
- `ForecastToCompleteCell.tsx` - Editable cell with dropdown
- `ForecastMethodSelector.tsx` - 4-method dropdown
- `EstimatedCostAtCompletionColumn.tsx` - Calculated column
- `ProjectedOverUnderColumn.tsx` - Calculated column

### Forecasting Tab
- `ForecastingTable.tsx` - Main table with time periods
- `ForecastingCurveSelector.tsx` - Curve type dropdown
- `TimePeriodColumns.tsx` - Monthly/quarterly columns
- `LumpSumEntryField.tsx` - Override input
- `CurvePreviewChart.tsx` - Visual curve display

### Admin
- `ForecastingViewBuilder.tsx` - View creation UI
- `ColumnConfigurator.tsx` - Column config builder
- `ViewAssignmentModal.tsx` - Assign views to projects

---

## CALCULATION EXAMPLES

### Example 1: Automatic Calculation
```
Original Budget:      $100,000
Approved Changes:     $10,000
Projected Budget:     $110,000
Committed Costs:      $60,000
Actual Costs:         $5,000
Projected Costs:      $65,000
---
Forecast to Complete: $110,000 - $65,000 = $45,000 (automatic)
Est. Cost at Compl:   $65,000 + $45,000 = $110,000
Projected Over/Under: $110,000 - $110,000 = $0
```

### Example 2: Manual Entry Override
```
Projected Budget:     $110,000
Projected Costs:      $65,000
---
User enters:          $50,000 (manual)
Forecast to Complete: $50,000 (manual override)
Est. Cost at Compl:   $65,000 + $50,000 = $115,000
Projected Over/Under: $110,000 - $115,000 = ($5,000) OVER
```

### Example 3: S-Curve Spreading
```
Total Forecast:       $45,000
Periods:              12 months
Curve Type:           S-Curve

Month 1:  $675   (1.5%)
Month 2:  $1,125 (2.5%)
Month 3:  $2,250 (5.0%)
Month 4:  $4,050 (9.0%)
Month 5:  $6,750 (15.0%)
Month 6:  $8,100 (18.0%)
Month 7:  $8,100 (18.0%)
Month 8:  $6,750 (15.0%)
Month 9:  $4,050 (9.0%)
Month 10: $2,250 (5.0%)
Month 11: $1,125 (2.5%)
Month 12: $675   (1.5%)
---
Total:    $45,000 (100%)
```

---

## VALIDATION RULES

### Forecast to Complete
- Must be >= 0 (no negative forecasts)
- Must be numeric
- Max 2 decimal places for currency
- Cannot be edited when method = 'automatic'

### Lump Sum Entry
- Overrides Budget tab value (must warn user)
- Updates Budget tab Forecast to Complete
- Must be numeric and >= 0

### Monitored Resources
- Start date must be <= end date
- Rate per period must be > 0
- Resource type required
- Dates must overlap with project dates

### Forecasting Curves
- All period amounts must sum to total
- Individual periods can be manually adjusted after curve application
- Curve selection persists until user changes

---

## PERMISSIONS MATRIX

| Action | Budget Viewer | Budget Editor | Project Admin | Company Admin |
|--------|--------------|--------------|---------------|---------------|
| View Forecast to Complete | ✅ | ✅ | ✅ | ✅ |
| Change Forecast Method | ❌ | ✅ | ✅ | ✅ |
| Edit Manual Forecast | ❌ | ✅ | ✅ | ✅ |
| Edit Lump Sum | ❌ | ✅ | ✅ | ✅ |
| Configure Monitored Resource | ❌ | ✅ | ✅ | ✅ |
| View Forecasting Tab | ✅ | ✅ | ✅ | ✅ |
| Apply Curves | ❌ | ✅ | ✅ | ✅ |
| Create Forecasting View | ❌ | ❌ | ❌ | ✅ |
| Assign View to Project | ❌ | ❌ | ✅ | ✅ |

---

## TESTING CHECKLIST

### Unit Tests
- [ ] Automatic calculation formula
- [ ] Manual entry validation
- [ ] Lump sum override logic
- [ ] Monitored resource drawdown
- [ ] Each curve algorithm
- [ ] Time period generation
- [ ] Currency formatting

### Integration Tests
- [ ] Method change updates calculations
- [ ] Lump sum syncs Budget tab ↔ Forecasting tab
- [ ] Budget modification triggers recalculation
- [ ] Commitment change updates projected costs
- [ ] Curve application spreads correctly
- [ ] Monitored resource decreases on schedule

### E2E Tests
- [ ] User selects automatic method
- [ ] User enters manual forecast
- [ ] User enters lump sum in Forecasting tab
- [ ] User applies S-curve
- [ ] User creates monitored resource
- [ ] Admin creates forecasting view
- [ ] Admin assigns view to project

---

## COMMON PITFALLS TO AVOID

1. **Lump Sum Override Not Clear**: Users don't realize lump sum overrides Budget tab
   - **Solution**: Show warning modal when selecting lump sum method

2. **Negative Forecasts**: Allow negative forecast_to_complete
   - **Solution**: Validate >= 0 on input

3. **Curve Doesn't Sum**: Rounding errors in curve distribution
   - **Solution**: Adjust last period to ensure exact total

4. **Performance**: Recalculating all forecasts on every change
   - **Solution**: Only recalculate affected rows, use debouncing

5. **RLS Gaps**: Forecasting data accessible without budget permissions
   - **Solution**: Match RLS policies to budget_lines table

6. **Time Zone Issues**: Period boundaries differ across timezones
   - **Solution**: Store all dates in UTC, convert for display

---

## PROCORE STANDARD FORECAST VIEW

**Default Columns** (14 total):
1. Cost Code
2. Description
3. Original Budget
4. Approved Changes
5. Projected Budget
6. Committed Costs
7. Actual Costs
8. Projected Costs
9. **Forecast to Complete**
10. **Estimated Cost at Completion**
11. **Projected Over/Under**
12. % Complete
13. Variance
14. Status

**Spread Column**: Forecast to Complete
**Time Period Type**: Monthly

---

## IMPLEMENTATION PHASES

### Phase 1 (Week 1-2): Foundation
- Database schema
- Automatic & manual methods
- Basic UI in Budget tab

### Phase 2 (Week 3-4): Forecasting Tab
- Time period columns
- Lump sum entry
- Tab navigation

### Phase 3 (Week 5-6): Curves
- All 5 curve types
- Visual preview
- Application logic

### Phase 4 (Week 7): Monitored Resources
- Resource configuration
- Time-based drawdown
- Scheduled jobs

### Phase 5 (Week 8): Company Admin
- View creation
- View assignment
- Preview

### Phase 6 (Week 9-10): Polish
- Import/export
- Snapshots
- Performance
- Production deployment

---

## LINKS TO DOCUMENTATION

**Procore Pages Analyzed:**
- `procore-support-crawl/pages/use-the-forecast-to-complete-feature/`
- `procore-support-crawl/pages/which-calculation-method-should-i-choose-when-using-the-forecast-to-complete-feature/`
- `procore-support-crawl/pages/set-up-a-new-forecasting-view/`
- `procore-support-crawl/pages/apply-advanced-forecasting-curves/`

**Implementation Plan:**
- `FORECAST-TO-COMPLETE-IMPLEMENTATION.md` (this directory)

---

## QUICK COMMANDS

```bash
# Generate database types
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts

# Run migration
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "postgres://postgres@db.lgveqfnpkxvzbnnwuled.supabase.co:5432/postgres?sslmode=require" -f supabase/migrations/20251229_forecasting_infrastructure.sql

# Run tests
npm run test frontend/src/lib/calculations/__tests__/forecastCalculations.test.ts

# Run E2E
npx playwright test frontend/tests/e2e/budget-forecast-to-complete.spec.ts
```
