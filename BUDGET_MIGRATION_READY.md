# CRITICAL BUDGET COMPONENTS - MIGRATION READY

## IMMEDIATE ACTION REQUIRED

The missing database components for the budget system have been implemented and are ready for deployment.

**Migration File**: `supabase/migrations/20260131_add_missing_budget_components.sql`

## WHAT'S BEEN IMPLEMENTED

✅ **PRIORITY 1 - CRITICAL MISSING TABLES:**
1. `budget_snapshots` table - Point-in-time budget captures with RLS policies
2. `budget_line_forecasts` table - Forecast calculations per budget line with RLS policies

✅ **PRIORITY 2 - MISSING CALCULATION VIEWS:**
3. `v_budget_rollup` view - Real-time budget calculations with all financial aggregations
4. `mv_budget_rollup` materialized view - High-performance cached calculations
5. `v_budget_grand_totals` view - Project-level budget aggregations and metrics
6. `v_budget_with_markup` view - Markup calculations by cost type

✅ **PRIORITY 3 - HELPER FUNCTIONS:**
7. `refresh_budget_rollup()` function - Refresh materialized view with error handling
8. `create_budget_snapshot()` function - Create point-in-time budget captures

## SCHEMA COMPATIBILITY

The migration has been adapted to work with the **EXISTING ALLEATO SCHEMA**:

- Uses `budget_lines` (not `budget_line_items`)
- Uses `project_budget_codes` (not `budget_codes`)
- Uses `commitment_change_order_lines` for commitment costs
- Uses `change_event_line_items` for change order costs
- Uses `direct_costs` table with `status` field (not `approved`)
- Uses proper status enums: `'open'`/`'closed'` for change events

## KEY COMPONENTS BREAKDOWN

### 1. Budget Snapshots Table
```sql
CREATE TABLE budget_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id BIGINT NOT NULL REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    snapshot_type TEXT DEFAULT 'manual',
    description TEXT,
    is_baseline BOOLEAN DEFAULT false,
    line_items JSONB NOT NULL,
    grand_totals JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
```

### 2. Budget Line Forecasts Table
```sql
CREATE TABLE budget_line_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_line_id UUID NOT NULL REFERENCES budget_lines(id),
    forecast_date DATE NOT NULL,
    forecasted_cost DECIMAL(15,2) NOT NULL,
    forecast_to_complete DECIMAL(15,2) NOT NULL,
    projected_final_cost DECIMAL(15,2) NOT NULL,
    variance_at_completion DECIMAL(15,2) NOT NULL,
    -- ... additional forecasting fields
);
```

### 3. Core Budget Rollup View
The `v_budget_rollup` view provides:
- Original budget amounts
- Budget modifications aggregation
- Approved change orders aggregation
- Committed costs from commitments
- Direct costs (approved only)
- Forecast to complete calculations
- Projected over/under budget analysis

### 4. Performance Materialized View
`mv_budget_rollup` materializes the view for fast queries with proper indexing.

### 5. Project-Level Aggregations
`v_budget_grand_totals` provides project summary metrics:
- Total budget utilization percentage
- Budget status (on_budget/over_budget)
- All financial totals rolled up

## SECURITY & PERFORMANCE

✅ **Row Level Security (RLS)**:
- All new tables have RLS enabled
- Project-based access control
- Admin override capabilities

✅ **Performance Optimizations**:
- Proper indexes on all foreign keys
- Materialized view for expensive calculations
- CONCURRENTLY refresh for zero-downtime updates

✅ **Data Integrity**:
- Proper foreign key constraints
- Check constraints for enums
- Unique constraints where needed

## TO APPLY THE MIGRATION

1. **Navigate to Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and paste the entire content of**:
   `/supabase/migrations/20260131_add_missing_budget_components.sql`
4. **Execute the migration**
5. **Verify tables were created**:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('budget_snapshots', 'budget_line_forecasts');
   ```

## AFTER MIGRATION

1. **Update TypeScript types**:
   ```bash
   npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
   ```

2. **Test budget calculations**:
   ```sql
   SELECT * FROM v_budget_rollup WHERE project_id = [TEST_PROJECT_ID];
   SELECT * FROM v_budget_grand_totals WHERE project_id = [TEST_PROJECT_ID];
   ```

3. **Create a test snapshot**:
   ```sql
   SELECT create_budget_snapshot([PROJECT_ID], 'Test Snapshot', 'manual', 'Initial test');
   ```

## IMMEDIATE BENEFITS

Once applied, this fixes the budget system by providing:

1. **Real-time budget calculations** - No more broken aggregations
2. **Point-in-time snapshots** - Track budget changes over time
3. **Performance optimizations** - Fast queries via materialized views
4. **Proper forecasting** - Budget forecast to complete functionality
5. **Security** - Proper RLS policies protecting budget data

## RISK MITIGATION

- Migration uses `CREATE TABLE IF NOT EXISTS` where appropriate
- Proper error handling in functions
- Backward compatible with existing schema
- No data loss or breaking changes

**This migration is critical for budget system functionality and should be applied immediately.**