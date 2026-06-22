# Schema Modeling - Phase 2 Database Design

**Purpose**: This document defines the database schema and entity modeling strategy for Alleato OS, ensuring all UI elements map to a well-structured data model.

**Status**: Core schema complete - ongoing additions for new features

**Related Plans**:

- [PLANS_DOC.md](./PLANS_DOC.md) - Master plan index
- [Component System](./plans-component-system.md) - UI components that display this data
- [Testing Strategy](./plans-testing-strategy.md) - Database testing requirements

---

## Overview

Phase 2 implements a **UI-first schema modeling approach**:

- Every schema element corresponds to an explicit UI element
- No speculative schema without UI evidence
- Database design informed by captured forms, tables, and workflows

### Design Philosophy

1. **UI-driven design**: All entities map to visible UI components
2. **Normalized structure**: Avoid redundant fields; use joins
3. **Tenant scoping**: Every record has `project_id` where applicable
4. **Audit trails**: All tables include `created_at`, `updated_at`, `created_by`
5. **Type safety**: Use Supabase enum types for statuses

---

## Implementation Progress

### Phase 2 Completion Timeline

**2025-12-09**: Schema Foundation Complete

- [x] Created entity matrix mapping UI to database structures
- [x] Defined all enum types for statuses and categories
- [x] Built core tables (companies, projects, users, cost codes)
- [x] Implemented contracts and commitments tables
- [x] Created change management tables
- [x] Built billing and invoicing tables
- [x] Created summary views for reporting
- [x] Implemented daily logs tables

**Status**: ✅ Phase 2 Core Complete

---

## Entity Matrix

Complete mapping of UI components to database entities.

**Document**: [planning/entity-matrix.md](/planning/entity-matrix.md)

### Key Entities

| Entity | Source UI | Status |
| --- | --- | --- |
| `contracts` | Prime Contract Form | ✅ |
| `commitments` | Subcontract/PO Forms | ✅ |
| `contract_line_items` | Schedule of Values Grid | ✅ |
| `vendors` | Vendor Selector | ✅ |
| `cost_codes` | Cost Code Selector | ✅ |
| `change_events` | Change Event Form | ✅ |
| `change_orders` | Change Order Form | ✅ |
| `budget_items` | Budget Table | ✅ |
| `billing_periods` | Billing Periods List | ✅ |
| `invoices` | Invoice Form | ✅ |
| `daily_logs` | Daily Log Form | ✅ |
| `meetings` | Meetings List (via document_metadata) | ✅ |
| `projects` | Project Selector | ✅ |
| `companies` | Company Directory | ✅ |
| `users` | User Directory | ✅ |

---

## Schema Modeling Rules

All entities must follow these standards:

### 1. Tenant Scoping

```sql
-- Every record must be scoped to a project
project_id UUID REFERENCES projects(id) ON DELETE CASCADE
```sql
### 2. Audit Fields
```sql
-- Every table includes these fields
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
created_by UUID REFERENCES users(id)
```sql
### 3. UUID Primary Keys

```sql
-- All tables use UUIDs
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```markdown
### 4. Enum Types
```sql
-- Use Supabase enum types for statuses
CREATE TYPE contract_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'executed',
  'closed'
);
```

### 5. Foreign Key Constraints

```sql
-- Enforce referential integrity
vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL
```sql
---

## Core Financial Schema

### Contracts & Commitments

**Tables**:
- `contracts` - Prime contracts with owner
- `commitments` - Subcontracts and purchase orders
- `contract_line_items` - Schedule of Values (SOV) line items
- `vendors` - Subcontractors and suppliers
- `cost_codes` - Project cost code structure

**Key Fields**:
```sql
-- contracts table
contract_number TEXT NOT NULL
contract_title TEXT NOT NULL
status contract_status NOT NULL DEFAULT 'draft'
contract_value NUMERIC(15,2)
executed_date DATE
start_date DATE
completion_date DATE
retention_percentage NUMERIC(5,2)
private BOOLEAN DEFAULT false

-- commitments table
commitment_type commitment_type NOT NULL -- 'subcontract' or 'purchase_order'
vendor_id UUID REFERENCES vendors(id)
contract_id UUID REFERENCES contracts(id)
commitment_value NUMERIC(15,2)
payment_terms TEXT

-- contract_line_items (SOV)
description TEXT NOT NULL
cost_code_id UUID REFERENCES cost_codes(id)
scheduled_value NUMERIC(15,2)
completed_value NUMERIC(15,2) DEFAULT 0
```sql
**Status**: ✅ Complete - [004_financial_contracts.sql](/frontend/supabase/migrations/004_financial_contracts.sql)

---

### Change Management

**Tables**:

- `change_events` - Potential changes identified
- `change_event_items` - Line items for change events
- `change_orders` - Approved changes
- `change_order_items` - Line items for change orders

**Key Fields**:

```sql
-- change_events table
event_number TEXT NOT NULL
title TEXT NOT NULL
status change_event_status NOT NULL DEFAULT 'draft'
estimated_cost NUMERIC(15,2)
estimated_days INTEGER
source change_source -- 'owner', 'subcontractor', 'design', 'field'

-- change_orders table
order_number TEXT NOT NULL
change_event_id UUID REFERENCES change_events(id)
approved_cost NUMERIC(15,2)
approved_days INTEGER
approval_date DATE
```sql
**Status**: ✅ Complete - [005_financial_change_management.sql](/frontend/supabase/migrations/005_financial_change_management.sql)

---

### Budgeting

**Tables**:
- `budget_items` - Budget line items by cost code
- `forecast_items` - Future cost projections

**Key Fields**:
```sql
-- budget_items table
cost_code_id UUID REFERENCES cost_codes(id)
budgeted_amount NUMERIC(15,2)
committed_amount NUMERIC(15,2) DEFAULT 0
actual_amount NUMERIC(15,2) DEFAULT 0
variance NUMERIC(15,2) GENERATED ALWAYS AS (budgeted_amount - actual_amount)
```

**Views**:

- `budget_summary_view` - Aggregated budget vs actual by cost code

**Status**: ✅ Complete - [006_financial_billing.sql](/frontend/supabase/migrations/006_financial_billing.sql)

---

### Billing & Invoicing

**Tables**:

- `billing_periods` - Monthly billing cycles
- `invoices` - Owner invoices (applications for payment)
- `invoice_line_items` - SOV progress by line item
- `payments` - Payment records

**Key Fields**:

```sql
-- billing_periods table
period_number INTEGER NOT NULL
start_date DATE NOT NULL
end_date DATE NOT NULL
status billing_period_status DEFAULT 'open'

-- invoices table
invoice_number TEXT NOT NULL
billing_period_id UUID REFERENCES billing_periods(id)
contract_id UUID REFERENCES contracts(id)
total_completed NUMERIC(15,2)
retention_held NUMERIC(15,2)
net_payment NUMERIC(15,2)
status invoice_status DEFAULT 'draft'

-- invoice_line_items table
sov_item_id UUID REFERENCES contract_line_items(id)
work_completed_this_period NUMERIC(15,2)
total_completed_to_date NUMERIC(15,2)
```diff
**Status**: ✅ Complete - [006_financial_billing.sql](/frontend/supabase/migrations/006_financial_billing.sql)

---

## Project Management Schema

### Daily Logs

**Tables**:
- `daily_logs` - Daily field reports
- `daily_log_entries` - Individual observations/activities
- `daily_log_manpower` - Labor tracking by crew

**Key Fields**:
```sql
-- daily_logs table
log_date DATE NOT NULL
weather_conditions TEXT
temperature_high INTEGER
temperature_low INTEGER
work_performed TEXT

-- daily_log_entries table
entry_type log_entry_type -- 'observation', 'activity', 'safety', 'material'
description TEXT NOT NULL
hours NUMERIC(5,2)

-- daily_log_manpower table
crew_type TEXT
head_count INTEGER
total_hours NUMERIC(6,2)
```sql
**Status**: ✅ Complete - [008_daily_logs.sql](/frontend/supabase/migrations/008_daily_logs.sql)

---

### Meetings

**IMPORTANT**: Meeting data is stored in `document_metadata` table, NOT a dedicated meetings table.

**Tables**:

- `document_metadata` - Stores meeting metadata and transcripts
- `meeting_segments` - Chunked meeting content for RAG/AI

**Key Fields**:

```sql
-- document_metadata table (filter by type='meeting')
title TEXT
summary TEXT
participants JSONB
date TIMESTAMPTZ
fireflies_link TEXT
fireflies_id TEXT
action_items JSONB
bullet_points JSONB
overview TEXT
content TEXT -- full transcript
duration_minutes INTEGER
audio TEXT
video TEXT

-- meeting_segments table
meeting_id UUID REFERENCES document_metadata(id)
segment_text TEXT
speaker TEXT
start_time NUMERIC
end_time NUMERIC
embedding vector(1536) -- for semantic search
```diff
**Status**: ✅ Complete - Integrated with document management

---

## Summary Views

For efficient querying and reporting, several views aggregate data:

### Budget Summary View
```sql
CREATE VIEW budget_summary_view AS
SELECT
  b.project_id,
  b.cost_code_id,
  c.code,
  c.description,
  b.budgeted_amount,
  COALESCE(SUM(ci.committed_amount), 0) as committed,
  COALESCE(SUM(a.actual_amount), 0) as actual,
  b.budgeted_amount - COALESCE(SUM(a.actual_amount), 0) as variance
FROM budget_items b
LEFT JOIN cost_codes c ON b.cost_code_id = c.id
LEFT JOIN commitments ci ON ci.project_id = b.project_id
LEFT JOIN actual_costs a ON a.cost_code_id = b.cost_code_id
GROUP BY b.project_id, b.cost_code_id, c.code, c.description, b.budgeted_amount;
```

### Contract Summary View

Aggregates contract values, change orders, and billing status.

### Change Order Impact View

Shows cumulative impact of approved change orders on budget.

### Invoice Summary View

Tracks billing progress and payment status.

**Status**: ✅ Complete - [007_financial_views.sql](/frontend/supabase/migrations/007_financial_views.sql)

---

## Type Generation

### Supabase Type Generation

After any schema changes, regenerate TypeScript types:

```bash
# From frontend directory
npm run db:types

# Or directly with Supabase CLI
npx supabase gen types typescript --local > src/types/database.ts
```markdown
### Type Hierarchy

```markdown
Supabase Schema (source of truth)
    ↓
frontend/src/types/database.ts (auto-generated)
    ↓
frontend/src/types/index.ts (derived types, helpers)
    ↓
Application code (import from @/types)

```markdown
### Key Type Mappings

| Application Type | Database Table | Notes |
| --- | --- | --- |
| `Meeting` | `document_metadata` | Filter by `type='meeting'` |
| `Project` | `projects` | Core project data |
| `Commitment` | `commitments` | Subcontracts & POs |
| `ChangeOrder` | `change_orders` | Approved changes |
| `OwnerInvoice` | `owner_invoices` | Billing records |

**IMPORTANT**: Always import types from `@/types`, never directly from `database.ts`.

---

## Validation & Testing

### Schema Validation Script

**CRITICAL**: Always run schema validation before database work:

```bash
cd backend && ./scripts/check_schema.sh
# OR
cd backend && source venv/bin/activate && python scripts/validate_schema.py
```

This script:

- Fetches actual schema from Supabase
- Scans Python files for `.table().select()` patterns
- Reports any columns/tables that don't exist
- Suggests similar column names for typos

**If validation fails, FIX ALL ERRORS before proceeding.**

### Migration Testing

Test migrations in this order:

1. **Apply to local Supabase**:

```bash
npx supabase db reset
```bash
2. **Verify schema**:
```bash
./backend/scripts/check_schema.sh
```text
1. **Regenerate types**:

```bash
npm run db:types
```bash
4. **Run type checking**:
```bash
npm run typecheck
```

---

## Migration Files

All migrations are located in `frontend/supabase/migrations/`:

| File | Description | Status |
| --- | --- | --- |
| [002_financial_enums.sql](/frontend/supabase/migrations/002_financial_enums.sql) | 15 enum types for statuses and categories | ✅ |
| [003_financial_core_tables.sql](/frontend/supabase/migrations/003_financial_core_tables.sql) | Companies, projects, users, cost codes | ✅ |
| [004_financial_contracts.sql](/frontend/supabase/migrations/004_financial_contracts.sql) | Contracts, commitments, SOV | ✅ |
| [005_financial_change_management.sql](/frontend/supabase/migrations/005_financial_change_management.sql) | Change events/orders with approvals | ✅ |
| [006_financial_billing.sql](/frontend/supabase/migrations/006_financial_billing.sql) | Invoices, payments, budget items | ✅ |
| [007_financial_views.sql](/frontend/supabase/migrations/007_financial_views.sql) | 7 summary views for reporting | ✅ |
| [008_daily_logs.sql](/frontend/supabase/migrations/008_daily_logs.sql) | Daily logs with entries and manpower | ✅ |

---

## Common Patterns

### Creating a New Entity

1. **Document UI evidence** in entity-matrix.md
2. **Define enum types** if needed
3. **Create migration file** following naming convention
4. **Include audit fields** (created_at, updated_at, created_by)
5. **Add foreign keys** with proper cascading
6. **Apply migration** locally first
7. **Regenerate types** with `npm run db:types`
8. **Validate schema** with check_schema.sh
9. **Update this document** with new entity details

### Adding Fields to Existing Entity

1. **Verify UI evidence** supports the new field
2. **Create migration file** with ALTER TABLE statements
3. **Test migration** locally
4. **Regenerate types**
5. **Update application code** to use new field
6. **Run type checking**

---

## Future Enhancements

### Planned Tables

- [ ] `rfis` - Requests for Information
- [ ] `submittals` - Submittal tracking
- [ ] `punch_list_items` - Punch list management
- [ ] `drawings` - Drawing management
- [ ] `photos` - Photo uploads with metadata

### Planned Features

- [ ] Full-text search on documents and meetings
- [ ] Advanced budgeting with forecasting
- [ ] Multi-currency support
- [ ] Custom field definitions per project
- [ ] Workflow automation triggers

---

**Last Updated**: 2025-12-17
**Maintained By**: Alleato Engineering Team
