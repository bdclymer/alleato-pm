# Database Architecture & Procore Mapping Guide

**Version:** 1.0.0
**Last Updated:** December 2024

This guide provides a comprehensive overview of the Alleato database schema and explains how it maps to Procore's construction management concepts. Understanding this is essential for developers who need to work with the data layer.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Entity Relationships](#core-entity-relationships)
3. [Entity Reference](#entity-reference)
4. [Procore Concept Mapping](#procore-concept-mapping)
5. [Financial Data Model](#financial-data-model)
6. [Working with the Database](#working-with-the-database)
7. [Views and Computed Data](#views-and-computed-data)
8. [Best Practices](#best-practices)

---

## Overview

### Database Technology

- **Database:** PostgreSQL (hosted on Supabase)
- **ORM:** None - Direct queries via Supabase client
- **Type Safety:** Auto-generated TypeScript types from schema
- **Security:** Row-Level Security (RLS) policies

### Type Generation

Types are auto-generated from the live Supabase schema:

```bash
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public > frontend/src/types/database.types.ts
```

**Always regenerate types after schema changes!**

---

## Core Entity Relationships

### High-Level Entity Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              DIRECTORY                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐   │
│   │  companies   │◄────────│   clients    │         │   contacts   │   │
│   │              │         │  (Company    │────────►│  (People at  │   │
│   │ (Vendors,    │         │   customers) │         │   companies) │   │
│   │  Subcontr.)  │         └──────────────┘         └──────────────┘   │
│   └──────────────┘                                                       │
│                                                                          │
│   ┌──────────────┐         ┌──────────────┐                             │
│   │  employees   │         │    users     │                             │
│   │ (Internal    │         │ (System      │                             │
│   │  staff)      │         │  accounts)   │                             │
│   └──────────────┘         └──────────────┘                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              PROJECTS                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                          projects                                 │  │
│   │  - Core project entity                                           │  │
│   │  - Links to: client, project_manager (employee)                  │  │
│   │  - Contains: budget, phase, health_score, etc.                   │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                    PROJECT CHILDREN                               │  │
│   ├──────────────────────────────────────────────────────────────────┤  │
│   │  Financial:        │  Documents:         │  Workflow:            │  │
│   │  - budget_items    │  - documents        │  - tasks              │  │
│   │  - contracts       │  - drawings         │  - daily_logs         │  │
│   │  - change_orders   │  - specifications   │  - meetings           │  │
│   │  - commitments     │  - submittals       │  - punch_list         │  │
│   │  - invoices        │                     │  - rfis               │  │
│   │  - direct_costs    │                     │                       │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Entity Reference

### Directory Entities

#### `companies`
Organizations that participate in projects (vendors, subcontractors, etc.)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Company name |
| `type` | text | Company type (vendor, subcontractor, etc.) |
| `address`, `city`, `state` | text | Location |
| `website` | text | Company website |
| `currency_code` | text | Default currency |

**Procore Equivalent:** Company Directory

#### `clients`
Customer organizations (project owners who pay for work)

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key |
| `name` | text | Client name |
| `code` | text | Client code/shorthand |
| `company_id` | uuid | FK to companies |
| `status` | text | Client status |

**Procore Equivalent:** Clients (part of Project Owner)

#### `contacts`
Individual people associated with companies

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key |
| `first_name`, `last_name` | text | Person's name |
| `email`, `phone` | text | Contact info |
| `company_id` | uuid | FK to companies |
| `job_title` | text | Role at company |
| `type` | text | Contact type |

**Procore Equivalent:** People/Contacts in Directory

#### `employees`
Internal company staff members

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key |
| `first_name`, `last_name` | text | Employee name |
| `email`, `phone` | text | Contact info |
| `department` | text | Department |
| `job_title` | text | Position |
| `supervisor` | integer | FK to employees (manager) |

**Procore Equivalent:** Company Employees

#### `users`
System user accounts (for authentication)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (Supabase auth) |
| `email` | text | Login email |
| `name` | text | Display name |
| `role` | text | System role |

**Procore Equivalent:** User accounts

---

### Project Entities

#### `projects` (Core Entity)
The central entity - all other data relates to a project

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key |
| `name` | text | Project name |
| `project_number` | text | Project number/code |
| `client_id` | integer | FK to clients |
| `project_manager` | integer | FK to employees |
| `phase` | text | Current phase |
| `state` | text | Status state |
| `budget` | number | Total budget |
| `budget_locked` | boolean | Budget lock status |
| `address` | text | Project location |
| `start date` | date | Project start |
| `est completion` | date | Expected completion |
| `health_score` | number | Project health metric |
| `work_scope` | text | Scope of work |
| `category` | text | Project category |
| `delivery_method` | text | Delivery method |
| `archived` | boolean | Archived status |

**Procore Equivalent:** Project (core entity)

---

### Financial Entities

#### `budget_codes`
Categories for organizing budget line items (Cost Code + Cost Type + Sub Job)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `project_id` | integer | FK to projects |
| `cost_code_id` | uuid | FK to cost_codes |
| `cost_type_id` | uuid | FK to cost_code_types |
| `sub_job_id` | uuid | FK to sub_jobs |
| `description` | text | Budget code description |
| `position` | integer | Sort order |

**Procore Equivalent:** Budget Code (combination of Cost Code + Cost Type)

#### `budget_items`
Actual budget line items with financial values

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `project_id` | integer | FK to projects |
| `budget_code_id` | uuid | FK to budget_codes |
| `cost_code_id` | uuid | FK to cost_codes |
| `original_budget_amount` | number | Original amount |
| `budget_modifications` | number | Sum of modifications |
| `approved_cos` | number | Approved change orders |
| `committed_cost` | number | Committed amount |
| `direct_cost` | number | Direct costs incurred |
| `forecast_to_complete` | number | Forecast remaining |
| `projected_cost` | number | Projected final cost |
| `revised_budget` | number | Current budget |

**Procore Equivalent:** Budget Line Items

#### `budget_modifications`
Adjustments to budget items

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `budget_item_id` | uuid | FK to budget_items |
| `amount` | number | Modification amount |
| `description` | text | Reason for modification |
| `approved` | boolean | Approval status |
| `approved_at` | timestamp | Approval date |

**Procore Equivalent:** Budget Modifications

#### `contracts`
Prime contracts (agreements with project owners/clients)

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key |
| `project_id` | integer | FK to projects |
| `title` | text | Contract title |
| `contract_number` | text | Contract number |
| `client_id` | integer | FK to clients |
| `original_contract_amount` | number | Original value |
| `approved_change_orders` | number | Approved CO total |
| `revised_contract_amount` | number | Current value |
| `status` | text | Contract status |
| `start_date` | date | Contract start |
| `retention_percentage` | number | Retention rate |

**Procore Equivalent:** Prime Contracts

#### `change_orders`
Modifications to prime contracts

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key |
| `project_id` | integer | FK to projects |
| `co_number` | text | Change order number |
| `title` | text | CO title |
| `description` | text | Description |
| `status` | text | Status (draft, pending, approved) |
| `apply_vertical_markup` | boolean | Apply markup |
| `approved_at` | timestamp | Approval date |
| `approved_by` | text | Approver |

**Procore Equivalent:** Change Orders (PCOs)

#### `change_order_line_items`
Individual items within a change order

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `change_order_id` | integer | FK to change_orders |
| `description` | text | Line item description |
| `amount` | number | Line item amount |
| `budget_code_id` | uuid | FK to budget_codes |
| `cost_code_id` | uuid | FK to cost_codes |
| `unit_qty`, `unit_cost`, `uom` | number/text | Quantity details |

**Procore Equivalent:** Change Order Line Items

#### `change_events`
Initial tracking of potential changes (before becoming change orders)

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key |
| `project_id` | integer | FK to projects |
| `title` | text | Event title |
| `event_number` | text | Event identifier |
| `status` | text | Event status |
| `scope` | text | Scope description |
| `reason` | text | Reason for change |

**Procore Equivalent:** Change Events

#### `commitments`
Subcontracts and purchase orders (money going out)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `project_id` | integer | FK to projects |
| `budget_item_id` | uuid | FK to budget_items |
| `vendor_id` | uuid | FK to companies |
| `contract_amount` | number | Commitment amount |
| `status` | text | Status |
| `retention_percentage` | number | Retention rate |
| `executed_at` | timestamp | Execution date |

**Procore Equivalent:** Commitments (Subcontracts/POs)

#### `commitment_changes`
Change orders against commitments

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `commitment_id` | uuid | FK to commitments |
| `budget_item_id` | uuid | FK to budget_items |
| `amount` | number | Change amount |
| `status` | text | Change status |
| `approved_at` | timestamp | Approval date |

**Procore Equivalent:** Commitment Change Orders

#### `direct_costs`
Costs incurred directly (not through commitments)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `project_id` | integer | FK to projects |
| `budget_item_id` | uuid | FK to budget_items |
| `amount` | number | Cost amount |
| `description` | text | Cost description |
| `cost_type` | text | Type of cost |
| `vendor_id` | uuid | FK to companies |
| `incurred_date` | date | Date incurred |

**Procore Equivalent:** Direct Costs

#### `billing_periods`
Defined billing cycles for a project

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `project_id` | integer | FK to projects |
| `period_number` | integer | Period sequence |
| `start_date` | date | Period start |
| `end_date` | date | Period end |
| `is_closed` | boolean | Period closed status |

**Procore Equivalent:** Billing Periods

---

### Supporting Entities

#### `cost_codes`
Standard cost code definitions (company-wide)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `code` | text | Cost code number |
| `name` | text | Cost code name |
| `division` | text | CSI division |
| `parent_id` | uuid | Parent code (hierarchy) |

**Procore Equivalent:** Cost Codes

#### `cost_code_types`
Types/categories of costs (Labor, Material, etc.)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Type name |
| `code` | text | Type code |

**Procore Equivalent:** Cost Types

#### `sub_jobs`
Sub-divisions of a project (phases, areas, etc.)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `project_id` | integer | FK to projects |
| `name` | text | Sub-job name |
| `code` | text | Sub-job code |

**Procore Equivalent:** Sub Jobs

---

## Procore Concept Mapping

### Key Terminology Mapping

| Procore Term | Alleato Table | Notes |
|--------------|---------------|-------|
| Project | `projects` | Core entity |
| Company Directory | `companies` | Vendors, subs, etc. |
| People | `contacts` | Contact persons |
| Cost Codes | `cost_codes` | CSI divisions |
| Budget | `budget_items` | Via budget_codes |
| Prime Contract | `contracts` | Owner contracts |
| Prime Contract CO | `change_orders` | Contract changes |
| Potential Change Order | `change_events` | Pre-CO tracking |
| Commitment | `commitments` | Subcontracts/POs |
| Commitment CO | `commitment_changes` | Subcontract changes |
| Direct Costs | `direct_costs` | Non-commitment costs |
| Billing Period | `billing_periods` | Pay periods |
| Submittal | `submittals` | Document submittals |
| RFI | `rfis` | Request for info |
| Punch List | `punch_list_items` | Deficiency items |
| Daily Log | `daily_logs` | Daily reports |
| Meeting | `meetings` | Meeting minutes |
| Drawing | `drawings` | Construction drawings |
| Specification | `specifications` | Project specs |

### Financial Flow (Procore-style)

```
                    REVENUE SIDE                     COST SIDE
                    ────────────                     ─────────

                    ┌─────────────┐                 ┌─────────────┐
                    │  contracts  │                 │ commitments │
                    │ (Prime      │                 │ (Subcontr./ │
                    │  Contracts) │                 │  POs)       │
                    └──────┬──────┘                 └──────┬──────┘
                           │                               │
                           ▼                               ▼
                    ┌─────────────┐                 ┌─────────────┐
                    │   change    │                 │ commitment  │
                    │   _orders   │                 │  _changes   │
                    │ (PCOs)      │                 │ (CCOs)      │
                    └──────┬──────┘                 └──────┬──────┘
                           │                               │
                           │         ┌─────────┐           │
                           └────────►│ budget_ │◄──────────┘
                                     │  items  │
                                     └────┬────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────┐
                    │              budget_codes               │
                    │  (Cost Code + Cost Type + Sub Job)      │
                    └─────────────────────────────────────────┘
```

### Budget Calculation Logic

The budget system uses the following calculation:

```
Revised Budget = Original Budget + Budget Modifications + Approved COs

Projected Cost = Committed Cost + Direct Cost + Pending Changes

Variance = Revised Budget - Projected Cost
```

---

## Working with the Database

### Reading Data (Frontend)

```typescript
// In a React component using our hooks
import { useProjects } from '@/hooks/use-projects'

export function ProjectList() {
  const { data: projects, isLoading } = useProjects()

  if (isLoading) return <Loading />
  return <div>{projects?.map(p => <ProjectCard key={p.id} project={p} />)}</div>
}
```

### Reading Data (API Route)

```typescript
// In an API route
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(*),
      manager:employees(*)
    `)
    .eq('archived', false)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
```

### Writing Data

```typescript
// Creating a new record
const { data, error } = await supabase
  .from('change_orders')
  .insert({
    project_id: projectId,
    title: 'New Change Order',
    status: 'draft',
  })
  .select()
  .single()

// Updating a record
const { data, error } = await supabase
  .from('change_orders')
  .update({ status: 'approved', approved_at: new Date().toISOString() })
  .eq('id', changeOrderId)
  .select()
  .single()

// Deleting a record
const { error } = await supabase
  .from('change_orders')
  .delete()
  .eq('id', changeOrderId)
```

### Using Type Safety

```typescript
import type { Database } from '@/types/database.types'

// Table row type
type Project = Database['public']['Tables']['projects']['Row']

// Insert type (for creating)
type NewProject = Database['public']['Tables']['projects']['Insert']

// Update type (for updating)
type ProjectUpdate = Database['public']['Tables']['projects']['Update']
```

---

## Views and Computed Data

The database includes several views for common queries:

### `project_with_manager`
Projects joined with manager information

### `project_health_dashboard`
Project health metrics aggregated

### `v_budget_rollup`
Budget summaries rolled up by project

### `v_budget_with_markup`
Budget with markup calculations applied

### `mv_budget_rollup`
Materialized view for performance (budget rollup)

---

## Best Practices

### 1. Always Use Generated Types

```typescript
// Good
import type { Database } from '@/types/database.types'
type Project = Database['public']['Tables']['projects']['Row']

// Avoid
interface Project {
  id: number
  name: string
  // manually typing...
}
```

### 2. Regenerate Types After Schema Changes

```bash
npm run db:types --prefix frontend
```

### 3. Use Proper Foreign Key Relationships

When querying related data, use Supabase's join syntax:

```typescript
// Good - single query with joins
const { data } = await supabase
  .from('contracts')
  .select(`
    *,
    client:clients(*),
    project:projects(name, project_number)
  `)

// Avoid - multiple queries
const { data: contracts } = await supabase.from('contracts').select()
const { data: clients } = await supabase.from('clients').select()
// manually joining...
```

### 4. Handle Null Values

Many fields are nullable. Always handle null cases:

```typescript
// Good
const projectName = project.name ?? 'Unnamed Project'

// Risky
const projectName = project.name // could be null
```

### 5. Use Proper Error Handling

```typescript
const { data, error } = await supabase.from('projects').select()

if (error) {
  console.error('Failed to fetch projects:', error.message)
  throw new Error('Failed to load projects')
}

// data is now safely typed as non-null
```

### 6. Respect Project Boundaries

Almost all entities are scoped to a project. Always filter by `project_id`:

```typescript
// Good
const { data } = await supabase
  .from('change_orders')
  .select()
  .eq('project_id', projectId)

// Avoid - returns all change orders across all projects
const { data } = await supabase.from('change_orders').select()
```

---

## Quick Reference

### Common Queries

```typescript
// Get all projects for a client
.from('projects').select().eq('client_id', clientId)

// Get budget items for a project
.from('budget_items').select().eq('project_id', projectId)

// Get change orders with line items
.from('change_orders')
  .select(`
    *,
    line_items:change_order_line_items(*)
  `)
  .eq('project_id', projectId)

// Get commitments with vendor info
.from('commitments')
  .select(`
    *,
    vendor:companies(*)
  `)
  .eq('project_id', projectId)
```

### Table Counts (Approximate)

| Table | Est. Records | Notes |
|-------|-------------|-------|
| projects | 50-200 | Active + archived |
| budget_items | 5,000-20,000 | ~100 per project |
| change_orders | 500-2,000 | ~10-50 per project |
| contracts | 50-200 | 1-2 per project |
| commitments | 1,000-5,000 | ~20-50 per project |
| documents | 10,000+ | Varies widely |

---

*This is a living document. Update it when the schema changes.*
