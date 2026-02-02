# Supabase Schema Relationships

This document maps the key relationships between tables in the Alleato-Procore database.

[← Back to Schema Index](INDEX.md)

---

## Core Entity Relationships

### Project Hierarchy

```
projects (root)
├── contracts
│   ├── change_orders
│   └── schedule_of_values
├── commitments
│   ├── change_orders
│   └── invoices
├── budget_codes
│   ├── budget_line_items
│   ├── change_order_line_items
│   └── direct_cost_line_items
├── tasks
├── issues
├── rfis
├── submittals
├── meetings
│   └── meeting_segments
├── daily_logs
└── documents
    └── document_chunks
```

---

## Key Foreign Key Relationships

### Financial Module

| Child Table | Parent Table | Foreign Key | Description |
|-------------|-------------|-------------|-------------|
| `contracts` | `projects` | `project_id` | Prime contracts belong to projects |
| `contracts` | `clients` | `client_id` | Contracts have client/owner |
| `commitments` | `projects` | `project_id` | Subcontracts belong to projects |
| `commitments` | `companies` | `contract_company_id` | Commitments have vendor/sub |
| `change_orders` | `commitments` | `commitment_id` | Change orders modify commitments |
| `change_orders` | `change_events` | `change_event_id` | Change orders track events |
| `budget_codes` | `projects` | `project_id` | Budget codes are project-specific |
| `budget_codes` | `cost_codes` | `cost_code_id` | Budget codes reference cost codes |
| `budget_line_items` | `budget_codes` | `budget_code_id` | Line items belong to budget codes |
| `direct_cost_line_items` | `projects` | `project_id` | Direct costs are project-specific |
| `direct_cost_line_items` | `budget_codes` | `budget_code_id` | Direct costs tie to budget codes |

### Project Management

| Child Table | Parent Table | Foreign Key | Description |
|-------------|-------------|-------------|-------------|
| `tasks` | `projects` | `project_id` | Tasks belong to projects |
| `issues` | `projects` | `project_id` | Issues belong to projects |
| `rfis` | `projects` | `project_id` | RFIs belong to projects |
| `submittals` | `projects` | `project_id` | Submittals belong to projects |
| `daily_logs` | `projects` | `project_id` | Daily logs belong to projects |
| `meetings` | `projects` | `project_id` | Meetings belong to projects |
| `meeting_segments` | `meetings` | `meeting_id` | Segments belong to meetings |

### Documents & AI

| Child Table | Parent Table | Foreign Key | Description |
|-------------|-------------|-------------|-------------|
| `documents` | `projects` | `project_id` | Documents belong to projects |
| `document_chunks` | `documents` | `document_id` | Chunks belong to documents |
| `document_metadata` | `projects` | `project_id` | Metadata belongs to projects |
| `ai_insights` | `projects` | `project_id` | Insights belong to projects |
| `ai_tasks` | `projects` | `project_id` | AI tasks belong to projects |

---

## Common Patterns

### Project-Scoped Tables

**50 tables** (28%) have a `project_id` column, meaning they belong to a specific project:

- Budget & Financial: `budget_codes`, `budget_items`, `commitments`, `contracts`, `change_orders`, etc.
- Project Management: `tasks`, `issues`, `rfis`, `submittals`, `daily_logs`, etc.
- Documents: `documents`, `document_metadata`
- AI: `ai_insights`, `ai_tasks`

**Query Pattern:**
```sql
SELECT * FROM {table} WHERE project_id = $1;
```

### Timestamped Tables

**139 tables** (78%) have `created_at` and often `updated_at`:

- Enables audit trails
- Supports chronological queries
- Standard pattern: `created_at TIMESTAMPTZ DEFAULT NOW()`

### User Attribution

Many tables track who created or modified records:

- `created_by` → References `auth.users(id)`
- `updated_by` → References `auth.users(id)`
- `approved_by` → References `auth.users(id)`

---

## Critical Relationships

### Budget System

```
projects
└── budget_codes (cost_code + sub_job + cost_type)
    ├── budget_line_items (original budget amounts)
    ├── change_order_line_items (approved changes)
    └── direct_cost_line_items (actual costs)

Views:
├── mv_budget_rollup (materialized, calculations)
└── v_budget_grand_totals (aggregated totals)
```

**Key Insight:** Budget calculations are done in SQL via materialized views, not in application code.

### Contract → Commitment → Change Order Flow

```
1. projects (root)
   ├── contracts (prime contract with owner)
   │   └── amount: $2,500,000
   │
   └── commitments (subcontracts)
       ├── commitment_1 (concrete sub)
       │   ├── amount: $450,000
       │   └── change_orders
       │       └── CO-001: +$125,000
       │
       └── commitment_2 (electrical sub)
           └── amount: $225,000
```

### Document → Chunk → Embedding (RAG Pipeline)

```
documents
├── id: doc_123
├── project_id: 67
├── file_name: "specs.pdf"
└── chunks
    ├── chunk_1 (page 1-5)
    │   └── embedding: [0.12, 0.45, ...]
    ├── chunk_2 (page 6-10)
    │   └── embedding: [0.33, 0.22, ...]
    └── ...
```

**Used for:** AI-powered search, semantic similarity, chat RAG

---

## Views & Materialized Views

### Materialized Views (Pre-calculated)

| View | Purpose | Refresh Trigger |
|------|---------|-----------------|
| `mv_budget_rollup` | Budget calculations per cost code | Manual (`refresh_budget_rollup()`) |

**Why Materialized?**
- Complex calculations (original + mods + COs + costs)
- Performance-critical (budget page loads)
- Updated via `REFRESH MATERIALIZED VIEW` after changes

### Regular Views

| View | Purpose |
|------|---------|
| `v_budget_grand_totals` | Summed totals across all budget codes |
| Various `v_*` views | Real-time aggregations |

---

## Cascade Delete Behavior

**ON DELETE CASCADE** means child records are automatically deleted when parent is deleted:

| Parent | Child | Cascade? |
|--------|-------|----------|
| `projects` | `contracts` | ✅ Yes |
| `projects` | `budget_codes` | ✅ Yes |
| `budget_codes` | `budget_line_items` | ✅ Yes |
| `documents` | `document_chunks` | ✅ Yes |
| `meetings` | `meeting_segments` | ✅ Yes |

**ON DELETE SET NULL** means child's foreign key is set to NULL:

| Parent | Child | Field Set to NULL |
|--------|-------|-------------------|
| `sub_jobs` | `budget_codes` | `sub_job_id` |
| `cost_code_types` | `budget_codes` | `cost_type_id` |

---

## Indexes for Performance

### Most Common Index Patterns

1. **Primary Key** - Every table has `id` as primary key
2. **Project Lookups** - `CREATE INDEX idx_{table}_project ON {table}(project_id)`
3. **Foreign Keys** - Indexes on all foreign key columns
4. **Composite Unique** - Multi-column uniqueness (e.g., `budget_codes` on project + cost_code + sub_job)

### Example: Budget Codes Indexes

```sql
-- Unique constraint
CREATE UNIQUE INDEX idx_budget_codes_unique
    ON budget_codes(project_id, cost_code_id, COALESCE(sub_job_id::text, ''), COALESCE(cost_type_id::text, ''));

-- Performance indexes
CREATE INDEX idx_budget_codes_project ON budget_codes(project_id);
CREATE INDEX idx_budget_codes_cost_code ON budget_codes(cost_code_id);
CREATE INDEX idx_budget_codes_cost_type ON budget_codes(cost_type_id) WHERE cost_type_id IS NOT NULL;
```

---

## RLS (Row Level Security)

Most tables have RLS enabled with policies like:

```sql
-- Read access
CREATE POLICY "table_read" ON table FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write access
CREATE POLICY "table_write" ON table FOR ALL USING (auth.uid() IS NOT NULL);
```

**Current Pattern:** Simple authenticated user check. Future: Project-based access control.

---

## Next Steps

1. **Add Foreign Key Diagrams** - Visual ERD for complex relationships
2. **Document Triggers** - List all `update_updated_at_column()` triggers
3. **Add Sample Queries** - Common SQL patterns for each relationship
4. **Document RPC Functions** - List all stored procedures (e.g., `refresh_budget_rollup`)

---

*Generated: 2025-12-17*
