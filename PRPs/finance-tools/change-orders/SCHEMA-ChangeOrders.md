# Change Orders Database Schema

## Database Tables Overview

The Change Orders system uses 6 core tables to manage the complete lifecycle from creation to execution:

1. **change_orders** - Main entity with polymorphic support for different contract types
2. **change_order_packages** - Package-based organization grouping related change orders
3. **change_order_lines** - Financial breakdown with budget code linkage
4. **change_order_reviews** - Multi-tier approval workflow tracking
5. **change_order_attachments** - Document and file management
6. **change_order_audit_log** - Complete audit trail for compliance

### Relationship Diagram
```
change_order_packages (1:many) → change_orders
change_orders (1:many) → change_order_lines
change_orders (1:many) → change_order_reviews
change_orders (1:many) → change_order_attachments
change_orders (1:many) → change_order_audit_log
```

## Table Definitions

### 1. change_orders (Main Entity)
```sql
CREATE TABLE change_orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,

  -- Package Organization
  package_id BIGINT REFERENCES change_order_packages(id),

  -- Contract Relationship (Polymorphic)
  change_order_type ENUM('COMMITMENT', 'PRIME_CONTRACT', 'FUNDING', 'CLIENT_CONTRACT') NOT NULL,
  contract_id BIGINT NOT NULL,

  -- Identification
  number VARCHAR(50) UNIQUE NOT NULL,
  revision INT DEFAULT 0,
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Classification
  change_reason_id BIGINT REFERENCES change_reasons(id),
  scope ENUM('IN_SCOPE', 'OUT_OF_SCOPE') DEFAULT 'IN_SCOPE',

  -- Workflow
  status ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'PENDING_BILLABLE', 'REJECTED', 'WITHDRAWN', 'EXECUTED') NOT NULL DEFAULT 'DRAFT',

  -- Dates
  date_initiated DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  review_date DATE,
  executed_date DATE,
  signed_order_received_date DATE,
  revised_completion_date DATE,

  -- Workflow Assignment
  designated_reviewer_id BIGINT REFERENCES users(id),

  -- Properties
  private BOOLEAN DEFAULT FALSE,
  executed BOOLEAN DEFAULT FALSE,
  schedule_impact ENUM('YES', 'NO', 'UNKNOWN'),

  -- Related Items
  change_event_id BIGINT REFERENCES change_events(id),

  -- Audit
  created_by_user_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by_user_id BIGINT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Foreign Keys
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (package_id) REFERENCES change_order_packages(id),

  -- Indexes
  INDEX idx_project_id (project_id),
  INDEX idx_package_id (package_id),
  INDEX idx_contract_id (contract_id),
  INDEX idx_status (status),
  INDEX idx_change_order_type (change_order_type),
  INDEX idx_created_at (created_at),
  INDEX idx_number (number),
  INDEX idx_due_date (due_date),
  INDEX idx_designated_reviewer (designated_reviewer_id)
);
```

### 2. change_order_packages (Package Organization)
```sql
CREATE TABLE change_order_packages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL REFERENCES projects(id),

  -- Identification
  package_number VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Type
  change_order_type ENUM('COMMITMENT', 'PRIME_CONTRACT', 'FUNDING', 'CLIENT_CONTRACT') NOT NULL,

  -- Status
  status ENUM('DRAFT', 'PENDING', 'APPROVED', 'EXECUTED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',

  -- Calculated Fields (updated by triggers)
  total_amount DECIMAL(15, 2) DEFAULT 0,
  change_orders_count INT DEFAULT 0,

  -- Audit
  created_by_user_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by_user_id BIGINT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE KEY unique_package_number (project_id, package_number),

  -- Indexes
  INDEX idx_project_id (project_id),
  INDEX idx_status (status),
  INDEX idx_change_order_type (change_order_type),
  INDEX idx_created_at (created_at)
);
```

### 3. change_order_lines (Financial Breakdown)
```sql
CREATE TABLE change_order_lines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_order_id BIGINT NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,

  -- Budget Integration
  cost_code_id BIGINT REFERENCES cost_codes(id),
  budget_line_id BIGINT REFERENCES budget_lines(id),

  -- Line Item Details
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(12, 4) DEFAULT 1,
  unit_of_measure VARCHAR(20) DEFAULT 'LS',
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Calculated Amount
  extended_amount DECIMAL(14, 2) GENERATED ALWAYS AS (
    CASE WHEN quantity IS NOT NULL AND quantity > 0
    THEN quantity * unit_price
    ELSE unit_price END
  ) STORED,

  -- Ordering
  line_order INT DEFAULT 0,

  -- Additional Info
  notes TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_change_order_id (change_order_id),
  INDEX idx_cost_code_id (cost_code_id),
  INDEX idx_budget_line_id (budget_line_id),
  INDEX idx_line_order (line_order)
);
```

### 4. change_order_reviews (Multi-tier Approval)
```sql
CREATE TABLE change_order_reviews (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_order_id BIGINT NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,

  -- Approval Tier (1-4 tiers supported)
  tier INT NOT NULL DEFAULT 1,
  approver_user_id BIGINT REFERENCES users(id),

  -- Review Status
  approval_status ENUM('PENDING', 'APPROVED', 'REJECTED', 'DELEGATED', 'SKIPPED') DEFAULT 'PENDING',

  -- Review Details
  approval_notes TEXT,
  rejection_reason ENUM('NEEDS_REVISION', 'UNBUDGETED', 'TIMELINE_ISSUE', 'INCOMPLETE', 'SCOPE_CHANGE', 'OTHER'),
  rejection_comments TEXT,

  -- Impact Assessment
  schedule_impact ENUM('YES', 'NO', 'UNKNOWN'),
  budget_impact_notes TEXT,

  -- Dates
  approved_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,

  -- Delegation
  delegated_to_user_id BIGINT REFERENCES users(id),
  delegation_reason TEXT,

  -- DocuSign Integration (Future)
  docusign_envelope_id VARCHAR(255),
  signature_status ENUM('NOT_REQUIRED', 'PENDING', 'SIGNED', 'DECLINED') DEFAULT 'NOT_REQUIRED',
  signed_at TIMESTAMP NULL,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE KEY unique_approval (change_order_id, tier),

  -- Indexes
  INDEX idx_change_order_id (change_order_id),
  INDEX idx_approval_status (approval_status),
  INDEX idx_tier (tier),
  INDEX idx_approver (approver_user_id),
  INDEX idx_approved_at (approved_at)
);
```

### 5. change_order_attachments (Document Management)
```sql
CREATE TABLE change_order_attachments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_order_id BIGINT NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,

  -- File Information
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),

  -- File Categories
  attachment_type ENUM('DRAWING', 'SPECIFICATION', 'PHOTO', 'CALCULATION', 'CORRESPONDENCE', 'OTHER') DEFAULT 'OTHER',

  -- Upload Information
  uploaded_by_user_id BIGINT NOT NULL REFERENCES users(id),
  upload_session_id VARCHAR(255), -- For chunked uploads

  -- File Status
  status ENUM('UPLOADING', 'READY', 'PROCESSING', 'FAILED') DEFAULT 'UPLOADING',
  virus_scan_status ENUM('PENDING', 'CLEAN', 'INFECTED', 'FAILED'),

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_change_order_id (change_order_id),
  INDEX idx_uploaded_by (uploaded_by_user_id),
  INDEX idx_attachment_type (attachment_type),
  INDEX idx_status (status)
);
```

### 6. change_order_audit_log (Complete Audit Trail)
```sql
CREATE TABLE change_order_audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_order_id BIGINT NOT NULL REFERENCES change_orders(id),

  -- Action Information
  action ENUM('CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'SUBMIT', 'DELETE', 'RECOVER', 'SIGN', 'EXECUTE', 'DELEGATE') NOT NULL,
  entity_type ENUM('CHANGE_ORDER', 'LINE_ITEM', 'ATTACHMENT', 'REVIEW', 'PACKAGE') DEFAULT 'CHANGE_ORDER',
  entity_id BIGINT, -- ID of the specific entity being changed

  -- Change Details
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,

  -- Context
  user_id BIGINT NOT NULL REFERENCES users(id),
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),

  -- Additional Context
  reason TEXT,
  metadata JSON,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_change_order_id (change_order_id),
  INDEX idx_action (action),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_entity (entity_type, entity_id)
);
```

## Data Migration Scripts

### Migration from Current Structure
```sql
-- Step 1: Add new columns to existing change_orders table
ALTER TABLE change_orders
ADD COLUMN package_id BIGINT REFERENCES change_order_packages(id),
ADD COLUMN revision INT DEFAULT 0,
ADD COLUMN change_order_type ENUM('COMMITMENT', 'PRIME_CONTRACT') DEFAULT 'COMMITMENT',
ADD COLUMN contract_id BIGINT NOT NULL DEFAULT 0,
ADD COLUMN description TEXT,
ADD COLUMN change_reason_id BIGINT,
ADD COLUMN scope ENUM('IN_SCOPE', 'OUT_OF_SCOPE') DEFAULT 'IN_SCOPE',
ADD COLUMN date_initiated DATE DEFAULT CURRENT_DATE,
ADD COLUMN due_date DATE,
ADD COLUMN review_date DATE,
ADD COLUMN designated_reviewer_id BIGINT REFERENCES users(id),
ADD COLUMN private BOOLEAN DEFAULT FALSE,
ADD COLUMN schedule_impact ENUM('YES', 'NO', 'UNKNOWN'),
ADD COLUMN change_event_id BIGINT,
ADD COLUMN created_by_user_id BIGINT REFERENCES users(id),
ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id),
ADD COLUMN deleted_at TIMESTAMP NULL,
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Step 2: Populate contract_id from commitment_id for existing records
UPDATE change_orders
SET contract_id = commitment_id,
    change_order_type = 'COMMITMENT',
    created_by_user_id = (SELECT id FROM users LIMIT 1) -- Placeholder
WHERE commitment_id IS NOT NULL;

-- Step 3: Create new tables
-- (Execute all CREATE TABLE statements from above)

-- Step 4: Create default packages for existing change orders
INSERT INTO change_order_packages (project_id, package_number, title, change_order_type, created_by_user_id)
SELECT DISTINCT
  project_id,
  CONCAT('PKG-', RIGHT(CONCAT('000', ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY id)), 3)) as package_number,
  'Legacy Package' as title,
  'COMMITMENT' as change_order_type,
  created_by_user_id
FROM change_orders
WHERE package_id IS NULL;

-- Step 5: Update change_orders to reference packages
UPDATE change_orders co
JOIN change_order_packages cop ON co.project_id = cop.project_id
SET co.package_id = cop.id
WHERE co.package_id IS NULL AND cop.title = 'Legacy Package';
```

## Views and Helper Functions

### Total Amount Calculation View
```sql
CREATE VIEW change_order_totals AS
SELECT
  co.id as change_order_id,
  co.number,
  co.title,
  COALESCE(SUM(li.extended_amount), 0) as total_amount,
  COUNT(li.id) as line_items_count,
  co.status,
  co.change_order_type
FROM change_orders co
LEFT JOIN change_order_lines li ON co.id = li.change_order_id
WHERE co.is_deleted = FALSE
GROUP BY co.id, co.number, co.title, co.status, co.change_order_type;
```

### Package Summary View
```sql
CREATE VIEW package_summaries AS
SELECT
  p.id as package_id,
  p.package_number,
  p.title as package_title,
  p.status as package_status,
  COUNT(co.id) as change_orders_count,
  COALESCE(SUM(cot.total_amount), 0) as package_total_amount,
  COUNT(CASE WHEN co.status = 'APPROVED' THEN 1 END) as approved_count,
  COUNT(CASE WHEN co.status = 'PENDING' THEN 1 END) as pending_count
FROM change_order_packages p
LEFT JOIN change_orders co ON p.id = co.package_id AND co.is_deleted = FALSE
LEFT JOIN change_order_totals cot ON co.id = cot.change_order_id
GROUP BY p.id, p.package_number, p.title, p.status;
```

### Approval Status Function
```sql
DELIMITER //
CREATE FUNCTION get_approval_status(change_order_id BIGINT)
RETURNS VARCHAR(20)
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE approval_count INT DEFAULT 0;
  DECLARE rejection_count INT DEFAULT 0;
  DECLARE pending_count INT DEFAULT 0;

  SELECT
    COUNT(CASE WHEN approval_status = 'APPROVED' THEN 1 END),
    COUNT(CASE WHEN approval_status = 'REJECTED' THEN 1 END),
    COUNT(CASE WHEN approval_status = 'PENDING' THEN 1 END)
  INTO approval_count, rejection_count, pending_count
  FROM change_order_reviews
  WHERE change_order_id = change_order_id;

  IF rejection_count > 0 THEN
    RETURN 'REJECTED';
  ELSEIF pending_count > 0 THEN
    RETURN 'PENDING';
  ELSEIF approval_count > 0 THEN
    RETURN 'APPROVED';
  ELSE
    RETURN 'NO_REVIEWS';
  END IF;
END //
DELIMITER ;
```

## Performance Considerations

### Indexing Strategy
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_co_project_status ON change_orders(project_id, status);
CREATE INDEX idx_co_project_type ON change_orders(project_id, change_order_type);
CREATE INDEX idx_co_reviewer_status ON change_orders(designated_reviewer_id, status);
CREATE INDEX idx_co_due_date_status ON change_orders(due_date, status);

-- Package-related indexes
CREATE INDEX idx_package_project_type ON change_order_packages(project_id, change_order_type);

-- Line items performance
CREATE INDEX idx_li_co_order ON change_order_lines(change_order_id, line_order);

-- Audit log partitioning (for high-volume environments)
-- Partition by created_at monthly for better performance
```

### Query Optimization Examples
```sql
-- Efficient change order list with totals
SELECT
  co.id,
  co.number,
  co.title,
  co.status,
  co.due_date,
  co.designated_reviewer_id,
  cot.total_amount,
  cot.line_items_count,
  p.package_number
FROM change_orders co
LEFT JOIN change_order_totals cot ON co.id = cot.change_order_id
LEFT JOIN change_order_packages p ON co.package_id = p.id
WHERE co.project_id = ?
  AND co.is_deleted = FALSE
  AND (? IS NULL OR co.status = ?)
  AND (? IS NULL OR co.change_order_type = ?)
ORDER BY co.created_at DESC
LIMIT ? OFFSET ?;

-- Efficient approval workflow query
SELECT
  co.id,
  co.number,
  co.title,
  cor.tier,
  cor.approval_status,
  cor.approved_at,
  u.name as approver_name
FROM change_orders co
JOIN change_order_reviews cor ON co.id = cor.change_order_id
LEFT JOIN users u ON cor.approver_user_id = u.id
WHERE co.designated_reviewer_id = ?
  AND cor.approval_status = 'PENDING'
ORDER BY co.due_date ASC;
```

### Triggers for Data Consistency
```sql
-- Update package totals when change orders change
DELIMITER //
CREATE TRIGGER update_package_totals_after_co_update
AFTER UPDATE ON change_orders
FOR EACH ROW
BEGIN
  IF NEW.package_id IS NOT NULL THEN
    UPDATE change_order_packages
    SET
      total_amount = (
        SELECT COALESCE(SUM(cot.total_amount), 0)
        FROM change_order_totals cot
        JOIN change_orders co2 ON cot.change_order_id = co2.id
        WHERE co2.package_id = NEW.package_id
      ),
      change_orders_count = (
        SELECT COUNT(*)
        FROM change_orders co3
        WHERE co3.package_id = NEW.package_id AND co3.is_deleted = FALSE
      )
    WHERE id = NEW.package_id;
  END IF;
END //
DELIMITER ;
```

This comprehensive schema provides the foundation for a robust change orders system with proper audit trails, multi-tier approvals, and performance optimization.