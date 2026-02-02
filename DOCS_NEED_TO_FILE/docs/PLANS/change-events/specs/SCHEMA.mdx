# Change Events Database Schema

**Current PostgreSQL/Supabase Schema** | Last Updated: 2026-01-10

> This is our canonical database schema using PostgreSQL with UUID primary keys.
> For the original Procore MySQL schema capture, see [../reference/PROCORE-SCHEMA-CAPTURE.md](../reference/PROCORE-SCHEMA-CAPTURE.md)

## Overview

Change Events in Procore track scope changes, design modifications, and other project alterations that may impact cost or schedule. This module manages the complete lifecycle from creation through approval and conversion to change orders.

## Tables

### `change_events`

Primary table for change event records.

| Column | Type | Nullable | Description | Related To |
|--------|------|----------|-------------|------------|
| id | uuid | NOT NULL | Primary key | - |
| project_id | uuid | NOT NULL | Project reference | projects.id |
| number | varchar(50) | NOT NULL | Change event number (auto-incremented per project) | - |
| title | varchar(255) | NOT NULL | Change event title | - |
| type | varchar(50) | NOT NULL | Type: Owner Change, Design Change, Allowance, etc. | - |
| reason | varchar(100) | NULL | Change reason/category | - |
| scope | varchar(50) | NOT NULL | TBD, Out of Scope, In Scope | - |
| status | varchar(50) | NOT NULL | Open, Closed, Approved, Rejected, Pending | - |
| origin | varchar(100) | NULL | Origin/source of change | - |
| expecting_revenue | boolean | NOT NULL | Whether revenue is expected from this change | - |
| line_item_revenue_source | varchar(100) | NULL | How revenue is calculated (e.g., "Match Revenue to Latest Cost") | - |
| prime_contract_id | uuid | NULL | Prime contract for markup estimates | contracts.id |
| description | text | NULL | Rich text description (HTML) | - |
| created_at | timestamptz | NOT NULL | Creation timestamp | - |
| updated_at | timestamptz | NOT NULL | Last update timestamp | - |
| created_by | uuid | NOT NULL | User who created | users.id |
| updated_by | uuid | NULL | User who last updated | users.id |
| deleted_at | timestamptz | NULL | Soft delete timestamp | - |

**Indexes:**
- `idx_change_events_project_id` on (project_id)
- `idx_change_events_number` on (project_id, number) UNIQUE
- `idx_change_events_status` on (status)
- `idx_change_events_type` on (type)
- `idx_change_events_created_at` on (created_at DESC)
- `idx_change_events_deleted_at` on (deleted_at) WHERE deleted_at IS NULL

**Relationships:**
- `project_id` → `projects.id` (CASCADE on delete)
- `prime_contract_id` → `contracts.id` (SET NULL on delete)
- `created_by` → `users.id` (SET NULL on delete)
- `updated_by` → `users.id` (SET NULL on delete)

**Business Rules:**
- Number is auto-incremented per project (001, 002, 003...)
- Title is required
- Status defaults to "Open"
- Expecting_revenue determines whether revenue calculations are displayed

---

### `change_event_line_items`

Line items/details for change events, tracking revenue and cost impacts.

| Column | Type | Nullable | Description | Related To |
|--------|------|----------|-------------|------------|
| id | uuid | NOT NULL | Primary key | - |
| change_event_id | uuid | NOT NULL | Parent change event | change_events.id |
| budget_code_id | uuid | NULL | Budget line item reference | budget_lines.id |
| description | text | NULL | Line item description | - |
| vendor_id | uuid | NULL | Vendor/subcontractor | companies.id |
| contract_id | uuid | NULL | Related commitment | contracts.id |
| unit_of_measure | varchar(50) | NULL | Unit (e.g., SF, LF, EA) | - |
| quantity | decimal(15,4) | NULL | Quantity | - |
| unit_cost | decimal(15,2) | NULL | Cost per unit | - |
| revenue_rom | decimal(15,2) | NULL | Revenue rough order of magnitude | - |
| cost_rom | decimal(15,2) | NULL | Cost rough order of magnitude | - |
| non_committed_cost | decimal(15,2) | NULL | Costs not yet committed | - |
| sort_order | integer | NOT NULL | Display order | - |
| created_at | timestamptz | NOT NULL | Creation timestamp | - |
| updated_at | timestamptz | NOT NULL | Last update timestamp | - |

**Indexes:**
- `idx_ce_line_items_change_event` on (change_event_id)
- `idx_ce_line_items_budget_code` on (budget_code_id)
- `idx_ce_line_items_vendor` on (vendor_id)
- `idx_ce_line_items_contract` on (contract_id)
- `idx_ce_line_items_sort` on (change_event_id, sort_order)

**Relationships:**
- `change_event_id` → `change_events.id` (CASCADE on delete)
- `budget_code_id` → `budget_lines.id` (SET NULL on delete)
- `vendor_id` → `companies.id` (SET NULL on delete)
- `contract_id` → `contracts.id` (SET NULL on delete)

**Business Rules:**
- At least one line item typically required before approval
- Revenue and cost can be rough estimates (ROM)
- Line items can reference existing budget codes or be unallocated

---

### `change_event_attachments`

File attachments for change events.

| Column | Type | Nullable | Description | Related To |
|--------|------|----------|-------------|------------|
| id | uuid | NOT NULL | Primary key | - |
| change_event_id | uuid | NOT NULL | Parent change event | change_events.id |
| file_name | varchar(255) | NOT NULL | Original file name | - |
| file_path | text | NOT NULL | Storage path/URL | - |
| file_size | bigint | NOT NULL | File size in bytes | - |
| mime_type | varchar(100) | NOT NULL | File MIME type | - |
| uploaded_by | uuid | NOT NULL | User who uploaded | users.id |
| uploaded_at | timestamptz | NOT NULL | Upload timestamp | - |

**Indexes:**
- `idx_ce_attachments_change_event` on (change_event_id)
- `idx_ce_attachments_uploaded_at` on (uploaded_at DESC)

**Relationships:**
- `change_event_id` → `change_events.id` (CASCADE on delete)
- `uploaded_by` → `users.id` (SET NULL on delete)

---

### `change_event_history`

Audit trail for change event modifications.

| Column | Type | Nullable | Description | Related To |
|--------|------|----------|-------------|------------|
| id | uuid | NOT NULL | Primary key | - |
| change_event_id | uuid | NOT NULL | Parent change event | change_events.id |
| field_name | varchar(100) | NOT NULL | Field that changed | - |
| old_value | text | NULL | Previous value | - |
| new_value | text | NULL | New value | - |
| changed_by | uuid | NOT NULL | User who made change | users.id |
| changed_at | timestamptz | NOT NULL | Change timestamp | - |
| change_type | varchar(50) | NOT NULL | create, update, delete, status_change | - |

**Indexes:**
- `idx_ce_history_change_event` on (change_event_id)
- `idx_ce_history_changed_at` on (changed_at DESC)
- `idx_ce_history_changed_by` on (changed_by)

**Relationships:**
- `change_event_id` → `change_events.id` (CASCADE on delete)
- `changed_by` → `users.id` (SET NULL on delete)

---

### `change_event_approvals`

Approval workflow for change events.

| Column | Type | Nullable | Description | Related To |
|--------|------|----------|-------------|------------|
| id | uuid | NOT NULL | Primary key | - |
| change_event_id | uuid | NOT NULL | Parent change event | change_events.id |
| approver_id | uuid | NOT NULL | User who needs to approve | users.id |
| approval_status | varchar(50) | NOT NULL | Pending, Approved, Rejected | - |
| comments | text | NULL | Approval comments | - |
| responded_at | timestamptz | NULL | When approver responded | - |
| created_at | timestamptz | NOT NULL | Request created timestamp | - |

**Indexes:**
- `idx_ce_approvals_change_event` on (change_event_id)
- `idx_ce_approvals_approver` on (approver_id)
- `idx_ce_approvals_status` on (approval_status)

**Relationships:**
- `change_event_id` → `change_events.id` (CASCADE on delete)
- `approver_id` → `users.id` (CASCADE on delete)

---

## Views

### `change_events_summary`

Aggregated view of change events with calculated totals.

```sql
CREATE VIEW change_events_summary AS
SELECT
  ce.id,
  ce.project_id,
  ce.number,
  ce.title,
  ce.type,
  ce.status,
  ce.origin,
  ce.expecting_revenue,
  COALESCE(SUM(cel.revenue_rom), 0) as total_revenue_rom,
  COALESCE(SUM(cel.cost_rom), 0) as total_cost_rom,
  COALESCE(SUM(cel.non_committed_cost), 0) as total_non_committed_cost,
  COUNT(DISTINCT cel.id) as line_item_count,
  COUNT(DISTINCT cea.id) as attachment_count,
  ce.created_at,
  ce.created_by
FROM change_events ce
LEFT JOIN change_event_line_items cel ON ce.id = cel.change_event_id
LEFT JOIN change_event_attachments cea ON ce.id = cea.change_event_id
WHERE ce.deleted_at IS NULL
GROUP BY ce.id;
```

---

## Enums/Lookup Values

### Change Event Types
- Owner Change
- Design Change
- Allowance
- Scope Gap
- Unforeseen Condition
- Value Engineering
- Owner Requested
- Constructability Issue

### Change Event Status
- Open
- Pending Approval
- Approved
- Rejected
- Closed
- Converted (to Change Order)

### Scope Values
- TBD (To Be Determined)
- In Scope
- Out of Scope
- Allowance

### Revenue Source Options
- Match Revenue to Latest Cost
- Manual Entry
- Percentage Markup
- Fixed Amount

---

## Performance Considerations

### Expected Data Volume
- **change_events**: 50-500 per project
- **change_event_line_items**: 5-50 per change event (250-25,000 per project)
- **change_event_attachments**: 0-20 per change event
- **change_event_history**: 10-100 entries per change event

### Recommended Indexes
All indexes listed above are critical for performance, especially:
- Composite index on (project_id, number) for unique constraint and lookups
- Status index for filtering active/closed events
- Foreign key indexes for joins

### Query Optimization
- Use the `change_events_summary` view for list pages to avoid N+1 queries
- Soft delete (deleted_at) should always be checked in WHERE clauses
- Consider partitioning `change_event_history` by month for large projects

---

## Integration Points

### Budget Module
- Line items can reference `budget_lines` for cost tracking
- Change events can be converted to budget modifications

### Change Orders Module
- Change events can be converted to change orders
- Maintains reference to original change event

### Contracts Module
- Line items can reference specific commitments
- Prime contract used for markup calculations

### Documents Module
- Attachments stored in shared document storage
- Same permission model as other project documents

---

## Migration Notes

When migrating from existing systems:
1. Preserve original change event numbers
2. Map old status values to new enum values
3. Convert line item structure to support both revenue and cost
4. Migrate attachments to new storage system
5. Create audit trail entries for historical changes

---

## Sample Queries

### Get all open change events for a project
```sql
SELECT * FROM change_events_summary
WHERE project_id = $1
  AND status = 'Open'
ORDER BY number DESC;
```

### Calculate total impact for a change event
```sql
SELECT
  ce.id,
  ce.number,
  ce.title,
  SUM(cel.revenue_rom) as total_revenue,
  SUM(cel.cost_rom) as total_cost,
  SUM(cel.revenue_rom) - SUM(cel.cost_rom) as potential_profit
FROM change_events ce
JOIN change_event_line_items cel ON ce.id = cel.change_event_id
WHERE ce.id = $1
GROUP BY ce.id, ce.number, ce.title;
```

### Find change events by budget code
```sql
SELECT DISTINCT ce.*
FROM change_events ce
JOIN change_event_line_items cel ON ce.id = cel.change_event_id
WHERE cel.budget_code_id = $1
  AND ce.deleted_at IS NULL;
```
