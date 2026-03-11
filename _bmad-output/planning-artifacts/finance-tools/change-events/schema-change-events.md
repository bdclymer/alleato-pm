---
title: SCHEMA ChangeEvents
description: SCHEMA ChangeEvents documentation
---

# Change Events Database Schema

## Database Tables Overview

The Change Events module uses 5 interconnected PostgreSQL tables with UUID primary keys:

- **change_events** - Main change event records
- **change_event_line_items** - Cost/revenue line items
- **change_event_attachments** - File attachments
- **change_event_history** - Audit trail
- **change_event_approvals** - Approval workflow

## Table Definitions

### 1. change_events

Main table for change event records with complete scope change tracking.

```sql
CREATE TABLE IF NOT EXISTS change_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    reason VARCHAR(100),
    scope VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
    origin VARCHAR(100),
    expecting_revenue BOOLEAN NOT NULL DEFAULT true,
    line_item_revenue_source VARCHAR(100),
    prime_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT change_events_number_project_unique UNIQUE (project_id, number),
    CONSTRAINT change_events_type_check CHECK (type IN (
        'Owner Change',
        'Design Change',
        'Allowance',
        'Scope Gap',
        'Unforeseen Condition',
        'Value Engineering',
        'Owner Requested',
        'Constructability Issue'
    )),
    CONSTRAINT change_events_scope_check CHECK (scope IN ('TBD', 'In Scope', 'Out of Scope', 'Allowance')),
    CONSTRAINT change_events_status_check CHECK (status IN (
        'Open',
        'Pending Approval',
        'Approved',
        'Rejected',
        'Closed',
        'Converted'
    ))
);

-- Indexes for change_events
CREATE INDEX idx_change_events_project_id ON change_events(project_id);
CREATE INDEX idx_change_events_number ON change_events(project_id, number);
CREATE INDEX idx_change_events_status ON change_events(status);
CREATE INDEX idx_change_events_type ON change_events(type);
CREATE INDEX idx_change_events_created_at ON change_events(created_at DESC);
CREATE INDEX idx_change_events_deleted_at ON change_events(deleted_at) WHERE deleted_at IS NULL;
```
### 2. change_event_line_items
Line items tracking revenue and cost impacts for each change event.

```sql
CREATE TABLE change_event_line_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    change_event_id uuid NOT NULL REFERENCES change_events(id) ON DELETE CASCADE,
    budget_code_id uuid REFERENCES budget_lines(id) ON DELETE SET NULL,
    description text,
    vendor_id uuid REFERENCES companies(id) ON DELETE SET NULL,
    contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
    unit_of_measure varchar(50),
    quantity decimal(15,4),
    unit_cost decimal(15,2),
    revenue_rom decimal(15,2),
    cost_rom decimal(15,2),
    non_committed_cost decimal(15,2),
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT line_items_quantity_positive CHECK (quantity IS NULL OR quantity >= 0),
    CONSTRAINT line_items_unit_cost_positive CHECK (unit_cost IS NULL OR unit_cost >= 0),
    CONSTRAINT line_items_revenue_rom_positive CHECK (revenue_rom IS NULL OR revenue_rom >= 0),
    CONSTRAINT line_items_cost_rom_positive CHECK (cost_rom IS NULL OR cost_rom >= 0)
);

-- Indexes
CREATE INDEX idx_ce_line_items_change_event ON change_event_line_items(change_event_id);
CREATE INDEX idx_ce_line_items_budget_code ON change_event_line_items(budget_code_id);
CREATE INDEX idx_ce_line_items_vendor ON change_event_line_items(vendor_id);
CREATE INDEX idx_ce_line_items_contract ON change_event_line_items(contract_id);
CREATE INDEX idx_ce_line_items_sort ON change_event_line_items(change_event_id, sort_order);

```
### 3. change_event_attachments

File attachments for change events with metadata tracking.

```sql
CREATE TABLE change_event_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    change_event_id uuid NOT NULL REFERENCES change_events(id) ON DELETE CASCADE,
    file_name varchar(255) NOT NULL,
    file_path text NOT NULL,
    file_size bigint NOT NULL,
    mime_type varchar(100) NOT NULL,
    uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT attachments_file_size_positive CHECK (file_size > 0),
    CONSTRAINT attachments_file_name_not_empty CHECK (length(file_name) > 0),
    CONSTRAINT attachments_file_path_not_empty CHECK (length(file_path) > 0)
);

-- Indexes
CREATE INDEX idx_ce_attachments_change_event ON change_event_attachments(change_event_id);
CREATE INDEX idx_ce_attachments_uploaded_at ON change_event_attachments(uploaded_at DESC);
CREATE INDEX idx_ce_attachments_uploaded_by ON change_event_attachments(uploaded_by);
```
### 4. change_event_history
Complete audit trail for all change event modifications.

```sql
CREATE TABLE change_event_history (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    change_event_id uuid NOT NULL REFERENCES change_events(id) ON DELETE CASCADE,
    field_name varchar(100) NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    changed_at timestamptz NOT NULL DEFAULT now(),
    change_type varchar(50) NOT NULL,

    CONSTRAINT history_change_type_check CHECK (change_type IN (
        'create',
        'update',
        'delete',
        'status_change'
    ))
);

-- Indexes
CREATE INDEX idx_ce_history_change_event ON change_event_history(change_event_id);
CREATE INDEX idx_ce_history_changed_at ON change_event_history(changed_at DESC);
CREATE INDEX idx_ce_history_changed_by ON change_event_history(changed_by);
CREATE INDEX idx_ce_history_change_type ON change_event_history(change_type);
```

### 5. change_event_approvals

Approval workflow management for change events.

```sql
CREATE TABLE IF NOT EXISTS change_event_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_event_id UUID NOT NULL REFERENCES change_events(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    comments TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT change_event_approvals_status_check CHECK (approval_status IN (
        'Pending',
        'Approved',
        'Rejected'
    ))
);

-- Indexes
CREATE INDEX idx_ce_approvals_change_event ON change_event_approvals(change_event_id);
CREATE INDEX idx_ce_approvals_approver ON change_event_approvals(approver_id);
CREATE INDEX idx_ce_approvals_status ON change_event_approvals(approval_status);
```
## Data Migration Scripts

### Migration from Existing System
```sql
-- Migrate existing change events data
INSERT INTO change_events (
    id, project_id, number, title, type, reason, scope, status,
    description, created_at, created_by
)
SELECT
    gen_random_uuid(),
    p.new_project_id,
    LPAD(ce.number::text, 3, '0'),
    ce.title,
    CASE ce.type
        WHEN 'owner' THEN 'Owner Change'
        WHEN 'design' THEN 'Design Change'
        ELSE 'Owner Change'
    END,
    ce.reason,
    CASE ce.scope
        WHEN 'in' THEN 'In Scope'
        WHEN 'out' THEN 'Out of Scope'
        ELSE 'TBD'
    END,
    CASE ce.status
        WHEN 'open' THEN 'Open'
        WHEN 'closed' THEN 'Closed'
        ELSE 'Open'
    END,
    ce.description,
    ce.created_at,
    u.new_user_id
FROM old_change_events ce
JOIN project_migration_map p ON p.old_project_id = ce.project_id
JOIN user_migration_map u ON u.old_user_id = ce.created_by;

-- Migrate line items
INSERT INTO change_event_line_items (
    change_event_id, budget_code_id, description, quantity,
    unit_cost, revenue_rom, cost_rom, sort_order
)
SELECT
    ce_map.new_id,
    bc.new_budget_code_id,
    li.description,
    li.quantity,
    li.unit_cost,
    li.revenue_amount,
    li.cost_amount,
    li.sort_order
FROM old_line_items li
JOIN change_event_migration_map ce_map ON ce_map.old_id = li.change_event_id
LEFT JOIN budget_code_migration_map bc ON bc.old_id = li.budget_code_id;
```
## Views and Helper Functions

### change_events_summary View

Materialized view for optimized list queries with calculated totals.

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS change_events_summary AS
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

-- Index on materialized view
CREATE INDEX idx_change_events_summary_project ON change_events_summary(project_id);
CREATE INDEX idx_change_events_summary_status ON change_events_summary(status);
```
### Helper Functions & Triggers

```sql
-- Automatically refresh the updated_at timestamp for events and line items
CREATE OR REPLACE FUNCTION update_change_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER change_events_updated_at
    BEFORE UPDATE ON change_events
    FOR EACH ROW
    EXECUTE FUNCTION update_change_events_updated_at();

CREATE TRIGGER change_event_line_items_updated_at
    BEFORE UPDATE ON change_event_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_change_events_updated_at();

-- Record creation and status changes in the audit trail
CREATE OR REPLACE FUNCTION log_change_event_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO change_event_history (
            change_event_id,
            field_name,
            old_value,
            new_value,
            changed_by,
            change_type
        ) VALUES (
            NEW.id,
            'status',
            NULL,
            NEW.status,
            NEW.created_by,
            'create'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO change_event_history (
                change_event_id,
                field_name,
                old_value,
                new_value,
                changed_by,
                change_type
            ) VALUES (
                NEW.id,
                'status',
                OLD.status,
                NEW.status,
                NEW.updated_by,
                'status_change'
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_change_events_audit
    AFTER INSERT OR UPDATE ON change_events
    FOR EACH ROW
    EXECUTE FUNCTION log_change_event_changes();

-- Refresh the summary materialized view when change events or line items change
CREATE OR REPLACE FUNCTION refresh_change_events_summary()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY change_events_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_summary_on_change_event
    AFTER INSERT OR UPDATE OR DELETE ON change_events
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_change_events_summary();

CREATE TRIGGER refresh_summary_on_line_item
    AFTER INSERT OR UPDATE OR DELETE ON change_event_line_items
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_change_events_summary();

-- Generate sequential numbers for change events (001, 002...) per project
CREATE OR REPLACE FUNCTION get_next_change_event_number(p_project_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(number AS INTEGER)), 0) + 1
    INTO next_num
    FROM change_events
    WHERE project_id = p_project_id
      AND deleted_at IS NULL
      AND number ~ '^[0-9]+$';

    RETURN LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
```

## Performance Considerations

### Expected Data Volume

- **change_events**: 50-500 per project (avg 200)
- **change_event_line_items**: 5-50 per event (avg 15) = 3,000 per project
- **change_event_attachments**: 0-20 per event (avg 3) = 600 per project
- **change_event_history**: 10-100 per event (avg 30) = 6,000 per project
- **change_event_approvals**: 1-5 per event (avg 2) = 400 per project

### Index Strategy

All critical indexes implemented for:

- **Primary lookups**: project_id, status, type filtering
- **Relationship joins**: Foreign key indexes on all references
- **Sorting**: created_at DESC for chronological listings
- **Composite indexes**: (project_id, number) for unique constraints

### Query Optimization Tips

1. **Use materialized view** for list pages to avoid N+1 queries
2. **Include soft delete check** in all WHERE clauses (`deleted_at IS NULL`)
3. **Limit result sets** with proper pagination
4. **Use EXISTS** instead of IN for better performance with large datasets
5. **Partition history table** by month for projects with >10K entries

## Integration Points

### Budget Module Integration

```sql
-- Link to budget lines for cost tracking
ALTER TABLE change_event_line_items
ADD CONSTRAINT fk_budget_line
FOREIGN KEY (budget_code_id) REFERENCES budget_lines(id) ON DELETE SET NULL;

-- Update budget when change event approved
CREATE OR REPLACE FUNCTION update_budget_from_change_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
        -- Update related budget lines with change event impact
        UPDATE budget_lines
        SET revised_budget = original_budget + (
            SELECT COALESCE(SUM(cost_rom), 0)
            FROM change_event_line_items
            WHERE change_event_id = NEW.id
            AND budget_code_id = budget_lines.id
        )
        WHERE id IN (
            SELECT DISTINCT budget_code_id
            FROM change_event_line_items
            WHERE change_event_id = NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_budget_from_change_event
    AFTER UPDATE ON change_events
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_from_change_event();
```
### Document Storage Integration
```sql
-- Ensure consistent document storage path format
CREATE OR REPLACE FUNCTION format_attachment_path()
RETURNS TRIGGER AS $$
BEGIN
    NEW.file_path = format(
        'projects/%s/change-events/%s/attachments/%s',
        (SELECT project_id FROM change_events WHERE id = NEW.change_event_id),
        NEW.change_event_id,
        NEW.id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_format_attachment_path
    BEFORE INSERT ON change_event_attachments
    FOR EACH ROW
    EXECUTE FUNCTION format_attachment_path();
```

This schema provides a robust foundation for the Change Events module with proper relationships, constraints, indexes, and integration points for optimal performance and data integrity.
