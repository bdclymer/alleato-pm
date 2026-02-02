# Forecast to Complete & Forecasting Tab Implementation Plan

**Based on**: Procore Support Documentation Analysis
**Date**: 2025-12-29
**Status**: Planning Phase

---

## EXECUTIVE SUMMARY

This document outlines the implementation tasks required to add Procore's "Forecast to Complete" column functionality to the Budget tab, and the separate "Forecasting Tab" for advanced time-phased cost forecasting.

### Core Capabilities to Implement:
1. **Forecast to Complete Column** - Budget tab column with 4 calculation methods
2. **Forecasting Tab** - Separate tab for time-phased forecasting with curves
3. **Company-Level Views** - Admin configuration for forecasting views
4. **Advanced Calculations** - Curve-based cost spreading algorithms

---

## 1. UI COMPONENTS IMPLEMENTATION

### 1.1 Budget Tab - Forecast to Complete Column

**Files to Create/Modify:**
- `frontend/src/components/domain/budget/ForecastToCompleteCell.tsx` (NEW)
- `frontend/src/components/domain/budget/ForecastMethodSelector.tsx` (NEW)
- `frontend/src/app/[projectId]/budget/page.tsx` (MODIFY)

**Tasks:**
- [ ] Add "Forecast to Complete" column to budget table
- [ ] Create dropdown selector with 4 calculation methods:
  - [ ] Automatic Calculation (default)
  - [ ] Manual Entry
  - [ ] Lump Sum Entry (with link to Forecasting Tab)
  - [ ] Monitored Resources
- [ ] Implement inline editing for manual entries
- [ ] Add visual indicator showing active calculation method
- [ ] Currency formatting for forecast values
- [ ] Real-time calculation updates

**Related Calculated Columns:**
- [ ] Add "Estimated Cost at Completion" column (Projected Costs + Forecast to Complete)
- [ ] Add "Projected Over/Under" column (Projected Budget - Est. Cost at Completion)
- [ ] Update "Projected Costs" calculation (Committed Costs + Actual Costs)
- [ ] Update "Projected Budget" calculation (Original Budget + Approved Changes)

### 1.2 Forecasting Tab

**Files to Create:**
- `frontend/src/app/[projectId]/budget/forecasting/page.tsx` (NEW)
- `frontend/src/components/domain/budget/ForecastingTable.tsx` (NEW)
- `frontend/src/components/domain/budget/ForecastingCurveSelector.tsx` (NEW)
- `frontend/src/components/domain/budget/TimePeriodColumns.tsx` (NEW)

**Tasks:**
- [ ] Create new "Forecasting" tab in Budget tool navigation
- [ ] Build forecasting table with time-period columns (monthly/quarterly)
- [ ] Implement view selector dropdown (for configured forecasting views)
- [ ] Add lump sum entry input field
- [ ] Create forecasting curve type selector with options:
  - [ ] Linear
  - [ ] S-Curve
  - [ ] Bell Curve
  - [ ] Front Loaded
  - [ ] Back Loaded
  - [ ] Custom
- [ ] Display period totals row
- [ ] Add visual chart preview of selected curve
- [ ] Implement export functionality

### 1.3 Company Admin - Forecasting Views

**Files to Create:**
- `frontend/src/app/admin/forecasting-views/page.tsx` (NEW)
- `frontend/src/components/domain/admin/ForecastingViewBuilder.tsx` (NEW)
- `frontend/src/components/domain/admin/ColumnConfigurator.tsx` (NEW)

**Tasks:**
- [ ] Create Forecasting Views management page (company-level)
- [ ] Build view creation form with:
  - [ ] View name input
  - [ ] Column configuration builder
  - [ ] Spread column selector
  - [ ] Time period type selector (monthly/quarterly/custom)
- [ ] Implement view preview functionality
- [ ] Add view assignment to projects
- [ ] Create view templates management
- [ ] Implement view duplication/cloning

---

## 2. DATABASE SCHEMA IMPLEMENTATION

### 2.1 Core Tables

**Migration File:** `supabase/migrations/20251229_forecasting_infrastructure.sql`

```sql
-- Forecasting calculation methods enum
CREATE TYPE forecast_calculation_method AS ENUM (
  'automatic',
  'manual',
  'lump_sum',
  'monitored_resources'
);

-- Forecasting curve types enum
CREATE TYPE forecasting_curve_type AS ENUM (
  'linear',
  's_curve',
  'bell',
  'front_loaded',
  'back_loaded',
  'custom'
);

-- Time period types enum
CREATE TYPE time_period_type AS ENUM (
  'monthly',
  'quarterly',
  'custom'
);

-- Add columns to budget_lines table
ALTER TABLE budget_lines
ADD COLUMN forecast_to_complete DECIMAL(15,2) DEFAULT 0,
ADD COLUMN forecast_calculation_method forecast_calculation_method DEFAULT 'automatic',
ADD COLUMN forecast_curve_type forecasting_curve_type,
ADD COLUMN monitored_resource_config JSONB,
ADD COLUMN estimated_cost_at_completion DECIMAL(15,2) GENERATED ALWAYS AS (
  projected_costs + COALESCE(forecast_to_complete, 0)
) STORED,
ADD COLUMN projected_over_under DECIMAL(15,2) GENERATED ALWAYS AS (
  projected_budget - (projected_costs + COALESCE(forecast_to_complete, 0))
) STORED;

-- Forecasting views (company-level configuration)
CREATE TABLE forecasting_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  columns_config JSONB NOT NULL DEFAULT '[]',
  spread_column TEXT, -- which column to spread across time
  time_period_type time_period_type DEFAULT 'monthly',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_company_view_name UNIQUE(company_id, name)
);

-- Project forecasting view assignments
CREATE TABLE project_forecasting_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  forecasting_view_id UUID NOT NULL REFERENCES forecasting_views(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_project_view UNIQUE(project_id, forecasting_view_id)
);

-- Forecasting data (time-phased forecast amounts)
CREATE TABLE forecasting_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_line_id UUID NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE,
  forecasting_view_id UUID NOT NULL REFERENCES forecasting_views(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  forecasted_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  curve_type forecasting_curve_type,
  lump_sum_override DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_budget_line_period UNIQUE(budget_line_id, forecasting_view_id, period_start_date)
);

-- Monitored resources configuration
CREATE TABLE monitored_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_line_id UUID NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'payroll', 'equipment_rental', 'trailer_rental', etc.
  rate_per_period DECIMAL(15,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  drawdown_method TEXT DEFAULT 'linear', -- 'linear', 'actual_time'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_budget_line_resource UNIQUE(budget_line_id)
);

-- Forecast snapshots (point-in-time captures)
CREATE TABLE forecast_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  forecast_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_project_snapshot_name UNIQUE(project_id, name)
);

-- Indexes for performance
CREATE INDEX idx_forecasting_data_budget_line ON forecasting_data(budget_line_id);
CREATE INDEX idx_forecasting_data_view ON forecasting_data(forecasting_view_id);
CREATE INDEX idx_forecasting_data_period ON forecasting_data(period_start_date, period_end_date);
CREATE INDEX idx_monitored_resources_dates ON monitored_resources(start_date, end_date);
CREATE INDEX idx_project_forecasting_views_project ON project_forecasting_views(project_id);
```

**Tasks:**
- [ ] Create migration file with all tables and enums
- [ ] Add RLS policies for all new tables
- [ ] Create database triggers for updated_at timestamps
- [ ] Add foreign key constraints with proper cascades
- [ ] Generate TypeScript types from schema
- [ ] Write seed data for default Procore Standard Forecast View

### 2.2 RLS Policies

**Tasks:**
- [ ] `forecasting_views` - Company admins can CRUD, project users can READ
- [ ] `project_forecasting_views` - Project users with budget permissions
- [ ] `forecasting_data` - Project users with budget edit permissions
- [ ] `monitored_resources` - Project users with budget edit permissions
- [ ] `forecast_snapshots` - Project users can read, budget editors can create

### 2.3 Database Functions

**Files to Create:**
- Migration with helper functions for forecast calculations

**Tasks:**
- [ ] `calculate_automatic_forecast(budget_line_id)` - Returns projected_budget - projected_costs
- [ ] `generate_time_periods(start_date, end_date, period_type)` - Returns array of period objects
- [ ] `apply_forecasting_curve(total_amount, periods[], curve_type)` - Spreads amount across periods
- [ ] `calculate_monitored_resource_forecast(resource_id, as_of_date)` - Returns remaining forecast
- [ ] `recalculate_all_forecasts(project_id)` - Batch recalculation function

---

## 3. API IMPLEMENTATION

### 3.1 Budget Line Forecast Endpoints

**Files to Create/Modify:**
- `frontend/src/app/api/budget-lines/[id]/forecast/route.ts` (NEW)
- `frontend/src/app/api/budget-lines/[id]/route.ts` (MODIFY)

**Endpoints:**
- [ ] `PATCH /api/budget-lines/:id/forecast` - Update forecast method and amount
- [ ] `GET /api/budget-lines/:id/forecast/calculation` - Get current calculation details
- [ ] `POST /api/budget-lines/:id/forecast/recalculate` - Force recalculation

### 3.2 Forecasting Views Endpoints

**Files to Create:**
- `frontend/src/app/api/forecasting-views/route.ts` (NEW)
- `frontend/src/app/api/forecasting-views/[id]/route.ts` (NEW)
- `frontend/src/app/api/forecasting-views/[id]/assign/route.ts` (NEW)

**Endpoints:**
- [ ] `GET /api/forecasting-views` - List company forecasting views
- [ ] `POST /api/forecasting-views` - Create new view
- [ ] `GET /api/forecasting-views/:id` - Get view details
- [ ] `PATCH /api/forecasting-views/:id` - Update view
- [ ] `DELETE /api/forecasting-views/:id` - Delete view
- [ ] `POST /api/forecasting-views/:id/assign` - Assign view to project
- [ ] `GET /api/projects/:projectId/forecasting-views` - Get project's views

### 3.3 Forecasting Data Endpoints

**Files to Create:**
- `frontend/src/app/api/projects/[projectId]/forecasting-data/route.ts` (NEW)
- `frontend/src/app/api/forecasting-data/[id]/route.ts` (NEW)

**Endpoints:**
- [ ] `GET /api/projects/:projectId/forecasting-data` - Get all forecasting data for project
- [ ] `POST /api/forecasting-data` - Create/update forecasting data entry
- [ ] `PATCH /api/forecasting-data/:id` - Update specific period forecast
- [ ] `POST /api/forecasting-data/apply-curve` - Apply curve to budget line
- [ ] `POST /api/forecasting-data/bulk-update` - Bulk update multiple periods

### 3.4 Monitored Resources Endpoints

**Files to Create:**
- `frontend/src/app/api/monitored-resources/route.ts` (NEW)
- `frontend/src/app/api/monitored-resources/[id]/route.ts` (NEW)

**Endpoints:**
- [ ] `GET /api/budget-lines/:budgetLineId/monitored-resource` - Get monitored resource config
- [ ] `POST /api/monitored-resources` - Create monitored resource
- [ ] `PATCH /api/monitored-resources/:id` - Update config
- [ ] `DELETE /api/monitored-resources/:id` - Remove monitored resource
- [ ] `GET /api/monitored-resources/:id/forecast` - Get current forecast based on time

---

## 4. BUSINESS LOGIC IMPLEMENTATION

### 4.1 Forecast Calculation Engine

**Files to Create:**
- `frontend/src/lib/calculations/forecastCalculations.ts` (NEW)
- `frontend/src/lib/calculations/forecastingCurves.ts` (NEW)

**Tasks:**
- [ ] Implement automatic calculation: `projectedBudget - projectedCosts`
- [ ] Implement manual entry validation
- [ ] Implement lump sum override logic
- [ ] Implement monitored resources time-based drawdown
- [ ] Create curve algorithms:
  - [ ] Linear distribution
  - [ ] S-Curve (slow-fast-slow)
  - [ ] Bell curve (normal distribution)
  - [ ] Front loaded (80/20 early)
  - [ ] Back loaded (20/80 late)
  - [ ] Custom curve (user-defined)

### 4.2 Time Period Generation

**Files to Create:**
- `frontend/src/lib/utils/timePeriods.ts` (NEW)

**Tasks:**
- [ ] Generate monthly periods from project start to end
- [ ] Generate quarterly periods
- [ ] Handle custom period definitions
- [ ] Calculate period boundaries (start/end dates)
- [ ] Handle fiscal year vs calendar year

### 4.3 Forecast Spreading Algorithms

**Files to Create:**
- `frontend/src/lib/algorithms/costSpreading.ts` (NEW)

**Tasks:**
- [ ] Linear spreading: equal distribution across periods
- [ ] S-Curve spreading: 15% start, 70% middle, 15% end
- [ ] Bell curve: normal distribution across periods
- [ ] Front loaded: exponential decay from start
- [ ] Back loaded: exponential growth to end
- [ ] Validate totals match original amount

---

## 5. STATE MANAGEMENT

### 5.1 Forecast State

**Files to Create/Modify:**
- `frontend/src/stores/forecastStore.ts` (NEW)
- `frontend/src/stores/budgetStore.ts` (MODIFY)

**Tasks:**
- [ ] Create Zustand store for forecast data
- [ ] Implement optimistic updates for forecast changes
- [ ] Cache forecasting views data
- [ ] Handle forecast calculation method changes
- [ ] Sync forecast data with budget table
- [ ] Implement undo/redo for forecast edits

### 5.2 Forecasting Tab State

**Files to Create:**
- `frontend/src/stores/forecastingTabStore.ts` (NEW)

**Tasks:**
- [ ] Store active view selection
- [ ] Cache time period data
- [ ] Track curve selections per line item
- [ ] Manage lump sum overrides
- [ ] Handle period expansions/collapses

---

## 6. INTEGRATION POINTS

### 6.1 Budget Tab Integration

**Tasks:**
- [ ] Update budget table columns configuration
- [ ] Integrate forecast calculations into existing formulas
- [ ] Update export functionality to include forecast columns
- [ ] Add forecast data to budget snapshots
- [ ] Handle budget lock interactions with forecasts

### 6.2 Budget Modifications Integration

**Tasks:**
- [ ] Recalculate automatic forecasts when budget changes approved
- [ ] Update projected budget calculation
- [ ] Trigger forecast recalculation on modification

### 6.3 Commitments Integration

**Tasks:**
- [ ] Update projected costs when commitments change
- [ ] Recalculate automatic forecasts on commitment updates
- [ ] Factor in change orders to committed costs

---

## 7. TESTING REQUIREMENTS

### 7.1 Unit Tests

**Files to Create:**
- `frontend/src/lib/calculations/__tests__/forecastCalculations.test.ts`
- `frontend/src/lib/algorithms/__tests__/costSpreading.test.ts`
- `frontend/src/lib/utils/__tests__/timePeriods.test.ts`

**Test Cases:**
- [ ] Automatic calculation: `projectedBudget - projectedCosts = forecastToComplete`
- [ ] Manual entry validation (positive numbers, no negatives)
- [ ] Lump sum override replaces automatic calculation
- [ ] Monitored resources decrease over time
- [ ] All curve algorithms sum to original amount
- [ ] Time period generation handles edge cases
- [ ] Currency rounding is consistent

### 7.2 Integration Tests

**Files to Create:**
- `frontend/tests/integration/forecast-to-complete.test.ts`
- `frontend/tests/integration/forecasting-tab.test.ts`

**Test Scenarios:**
- [ ] User changes forecast method from automatic to manual
- [ ] User enters lump sum in Forecasting tab, Budget tab updates
- [ ] Monitored resource auto-decreases on schedule
- [ ] Applying S-curve spreads costs correctly
- [ ] Forecast recalculates when budget modification approved
- [ ] Export includes forecast columns

### 7.3 E2E Tests

**Files to Create:**
- `frontend/tests/e2e/budget-forecast-to-complete.spec.ts`
- `frontend/tests/e2e/budget-forecasting-tab.spec.ts`

**User Journeys:**
- [ ] Create budget line, verify automatic forecast calculation
- [ ] Switch to manual entry, input amount, verify update
- [ ] Navigate to Forecasting tab, enter lump sum, verify Budget tab sync
- [ ] Apply S-curve to line item, verify time-phased spread
- [ ] Create monitored resource, verify drawdown over time
- [ ] Company admin creates forecasting view, assigns to project
- [ ] Export budget with forecast columns

---

## 8. DOCUMENTATION

**Files to Create:**
- `docs/features/forecast-to-complete.md` (NEW)
- `docs/features/forecasting-tab.md` (NEW)
- `docs/admin/forecasting-views.md` (NEW)

**Tasks:**
- [ ] User guide for Forecast to Complete column
- [ ] User guide for Forecasting Tab
- [ ] Admin guide for creating forecasting views
- [ ] Developer documentation for forecast calculations
- [ ] API documentation for forecast endpoints
- [ ] Database schema documentation

---

## 9. PERMISSIONS & SECURITY

### 9.1 RLS Policies

**Tasks:**
- [ ] Budget viewers can READ forecast data
- [ ] Budget editors can UPDATE forecast method and amounts
- [ ] Company admins can CRUD forecasting views
- [ ] Project admins can assign views to projects
- [ ] Audit trail for forecast changes

### 9.2 Frontend Permissions

**Tasks:**
- [ ] Disable forecast editing if user lacks budget edit permission
- [ ] Hide Forecasting tab if user lacks access
- [ ] Restrict view creation to company admins
- [ ] Show read-only mode for viewers

---

## 10. PERFORMANCE OPTIMIZATION

**Tasks:**
- [ ] Index forecast_to_complete column
- [ ] Cache forecasting curve calculations
- [ ] Lazy load Forecasting tab data
- [ ] Paginate time periods if >12 months
- [ ] Debounce forecast amount changes
- [ ] Batch forecast recalculations
- [ ] Use database functions for complex calculations

---

## 11. MIGRATION & DEPLOYMENT

### 11.1 Data Migration

**Tasks:**
- [ ] Backfill existing budget lines with `forecast_calculation_method = 'automatic'`
- [ ] Calculate initial `forecast_to_complete` for all lines
- [ ] Create default "Procore Standard Forecast View"
- [ ] Assign standard view to all existing projects

### 11.2 Feature Flags

**Tasks:**
- [ ] Create feature flag: `forecast_to_complete_enabled`
- [ ] Create feature flag: `forecasting_tab_enabled`
- [ ] Create feature flag: `advanced_curves_enabled`
- [ ] Gradual rollout strategy

### 11.3 Rollback Plan

**Tasks:**
- [ ] Document rollback procedure
- [ ] Backup forecast data before migration
- [ ] Create migration rollback SQL script
- [ ] Test rollback in staging environment

---

## 12. PHASED IMPLEMENTATION PLAN

### Phase 1: Foundation (Week 1-2)
**Goal**: Basic Forecast to Complete column with automatic and manual calculations

- [ ] Database schema migration
- [ ] Basic forecast calculations
- [ ] Forecast to Complete column in Budget tab
- [ ] Method selector dropdown (automatic, manual only)
- [ ] API endpoints for forecast CRUD
- [ ] Unit tests for calculations

### Phase 2: Forecasting Tab (Week 3-4)
**Goal**: Separate Forecasting tab with time periods and lump sum

- [ ] Forecasting tab UI
- [ ] Time period generation (monthly)
- [ ] Lump sum entry functionality
- [ ] Basic forecasting data table
- [ ] Integration with Budget tab
- [ ] E2E tests for lump sum workflow

### Phase 3: Advanced Curves (Week 5-6)
**Goal**: Forecasting curves and spreading algorithms

- [ ] Curve selection dropdown
- [ ] Linear, S-Curve, Bell curve algorithms
- [ ] Front/back loaded algorithms
- [ ] Visual curve preview charts
- [ ] Curve application to budget lines
- [ ] Integration tests for curves

### Phase 4: Monitored Resources (Week 7)
**Goal**: Time-based monitored resources

- [ ] Monitored resources configuration
- [ ] Time-based drawdown calculation
- [ ] Scheduled recalculation job
- [ ] UI for resource setup
- [ ] Tests for drawdown logic

### Phase 5: Company Admin (Week 8)
**Goal**: Forecasting views management

- [ ] Forecasting views CRUD UI
- [ ] View configuration builder
- [ ] Project assignment functionality
- [ ] View preview
- [ ] Admin permissions

### Phase 6: Polish & Production (Week 9-10)
**Goal**: Production-ready with full testing

- [ ] Import/export functionality
- [ ] Snapshot capability
- [ ] Performance optimization
- [ ] Security audit
- [ ] Full E2E test suite
- [ ] Documentation complete
- [ ] Feature flag rollout

---

## 13. SUCCESS CRITERIA

**Definition of Done:**
- [ ] All 4 forecast calculation methods functional
- [ ] Forecasting tab displays time-phased data
- [ ] All 5 curve types working correctly
- [ ] Monitored resources auto-decrease
- [ ] Company admin can create and assign views
- [ ] All formulas match Procore exactly
- [ ] 95%+ test coverage
- [ ] Performance < 200ms for forecast calculations
- [ ] Zero data loss during migration
- [ ] Documentation complete
- [ ] Security audit passed
- [ ] Successfully deployed to production

---

## 14. RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Curve algorithms incorrect | High | Extensive unit testing, compare to Procore examples |
| Performance issues with large budgets | Medium | Database indexing, caching, pagination |
| Data migration failures | High | Thorough testing, rollback plan, backups |
| User confusion with multiple methods | Medium | Clear UI indicators, tooltips, documentation |
| RLS policy gaps | High | Security audit, penetration testing |
| Integration bugs with budget modifications | Medium | Comprehensive integration tests |

---

## 15. REFERENCES

**Procore Documentation:**
- Use the Forecast to Complete Feature: `procore-support-crawl/pages/use-the-forecast-to-complete-feature/`
- Which Calculation Method FAQ: `procore-support-crawl/pages/which-calculation-method-should-i-choose-when-using-the-forecast-to-complete-feature/`
- Set Up Forecasting View: `procore-support-crawl/pages/set-up-a-new-forecasting-view/`
- Apply Advanced Forecasting Curves: `procore-support-crawl/pages/apply-advanced-forecasting-curves/`
- About Procore Standard Forecast View: `procore-support-crawl/pages/about-the-procore-standard-forecast-view/`

**Related Files:**
- Budget Tab: `frontend/src/app/[projectId]/budget/page.tsx`
- Budget API: `frontend/src/app/api/budget-lines/`
- Budget Schema: `supabase/migrations/*budget*.sql`

---

## NEXT STEPS

1. Review this implementation plan with team
2. Refine estimates for each phase
3. Create GitHub issues for all tasks
4. Set up feature flags in environment
5. Create staging environment for testing
6. Begin Phase 1: Foundation
