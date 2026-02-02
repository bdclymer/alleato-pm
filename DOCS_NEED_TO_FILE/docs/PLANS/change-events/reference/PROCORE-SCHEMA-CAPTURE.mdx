# CHANGE EVENTS DATABASE SCHEMAS

## Schema 1: change_events

```
CREATE TABLE change_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  number VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('OWNER_CHANGE', 'GC_CHANGE', 'SC_CHANGE') NOT NULL,
  change_reason_id BIGINT,
  scope ENUM('IN_SCOPE', 'OUT_OF_SCOPE') NOT NULL DEFAULT 'IN_SCOPE',
  status ENUM('OPEN', 'CLOSED', 'VOID') NOT NULL DEFAULT 'OPEN',
  origin ENUM('INTERNAL', 'RFI', 'FIELD') DEFAULT 'INTERNAL',
  expecting_revenue BOOLEAN DEFAULT FALSE,
  line_item_revenue_source ENUM('MATCH_LATEST_COST', 'LATEST_COST', 'LATEST_PRICE'),
  prime_contract_id BIGINT,
  vendor_id BIGINT,
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by_user_id BIGINT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (change_reason_id) REFERENCES change_reasons(id),
  FOREIGN KEY (prime_contract_id) REFERENCES prime_contracts(id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id),
  
  INDEX idx_project_id (project_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_at (deleted_at)
);
```

## Schema 2: change_event_line_items

```
CREATE TABLE change_event_line_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_event_id BIGINT NOT NULL,
  cost_code_id BIGINT NOT NULL,
  cost_type ENUM('LABOR', 'MATERIAL', 'EQUIPMENT', 'OTHER') NOT NULL,
  description VARCHAR(500) NOT NULL,
  unit_of_measure VARCHAR(20) NOT NULL,
  quantity DECIMAL(12, 4) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  extended_amount DECIMAL(14, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  markup_percentage DECIMAL(5, 2) DEFAULT 0.00,
  markup_amount DECIMAL(14, 2) GENERATED ALWAYS AS (extended_amount * (markup_percentage / 100)) STORED,
  total_with_markup DECIMAL(14, 2) GENERATED ALWAYS AS (extended_amount + markup_amount) STORED,
  commitment_id BIGINT,
  production_quantity DECIMAL(12, 4),
  revenue_rom DECIMAL(14, 2) DEFAULT 0.00,
  notes TEXT,
  line_item_status ENUM('DRAFT', 'ACTIVE', 'CONVERTED', 'VOID') DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (change_event_id) REFERENCES change_events(id) ON DELETE CASCADE,
  FOREIGN KEY (cost_code_id) REFERENCES cost_codes(id),
  FOREIGN KEY (commitment_id) REFERENCES commitments(id),
  
  INDEX idx_change_event_id (change_event_id),
  INDEX idx_cost_code_id (cost_code_id),
  INDEX idx_commitment_id (commitment_id),
  INDEX idx_status (line_item_status)
);
```

## Schema 3: rfqs

```
sqlCREATE TABLE rfqs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  change_event_id BIGINT NOT NULL,
  rfq_number VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  assigned_user_id BIGINT NOT NULL,
  sent_date TIMESTAMP,
  due_date DATE NOT NULL,
  status ENUM('DRAFT', 'SENT', 'AWAITING_RESPONSE', 'RESPONSE_RECEIVED', 'CLOSED') DEFAULT 'DRAFT',
  total_amount DECIMAL(14, 2) GENERATED ALWAYS AS (SELECT COALESCE(SUM(extended_amount), 0) FROM change_event_line_items WHERE change_event_id = rfqs.change_event_id) STORED,
  custom_message TEXT,
  include_attachments BOOLEAN DEFAULT TRUE,
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (change_event_id) REFERENCES change_events(id),
  FOREIGN KEY (assigned_user_id) REFERENCES users(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  
  INDEX idx_project_id (project_id),
  INDEX idx_change_event_id (change_event_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date)
);
```

## Schema 4: rfq_responses

```
sqlCREATE TABLE rfq_responses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  rfq_id BIGINT NOT NULL,
  line_item_id BIGINT NOT NULL,
  collaborator_user_id BIGINT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  extended_amount DECIMAL(14, 2) GENERATED ALWAYS AS (
    (SELECT quantity FROM change_event_line_items WHERE id = line_item_id) * unit_price
  ) STORED,
  notes TEXT,
  response_status ENUM('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED') DEFAULT 'DRAFT',
  submitted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE,
  FOREIGN KEY (line_item_id) REFERENCES change_event_line_items(id),
  FOREIGN KEY (collaborator_user_id) REFERENCES users(id),
  
  INDEX idx_rfq_id (rfq_id),
  INDEX idx_response_status (response_status),
  INDEX idx_submitted_at (submitted_at),
  UNIQUE KEY unique_response (rfq_id, line_item_id, collaborator_user_id)
);
```

## Schema 5: rfq_attachments
```
sqlCREATE TABLE rfq_attachments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  rfq_id BIGINT NOT NULL,
  change_event_attachment_id BIGINT,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE,
  FOREIGN KEY (change_event_attachment_id) REFERENCES change_event_attachments(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  
  INDEX idx_rfq_id (rfq_id)
);
```

## Schema 6: change_event_attachments

```
CREATE TABLE change_event_attachments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_event_id BIGINT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  uploaded_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (change_event_id) REFERENCES change_events(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id),
  
  INDEX idx_change_event_id (change_event_id)
);
```

## Schema 7: change_event_audit_log

```
CREATE TABLE change_event_audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_event_id BIGINT NOT NULL,
  action ENUM('CREATE', 'UPDATE', 'DELETE', 'VOID', 'RECOVER') NOT NULL,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  user_id BIGINT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (change_event_id) REFERENCES change_events(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  
  INDEX idx_change_event_id (change_event_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);
```

## Schema 8: change_event_related_items

```
CREATE TABLE change_event_related_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_event_id BIGINT NOT NULL,
  related_item_type ENUM('RFI', 'COMMITMENT', 'BUDGET', 'SUBMITTAL', 'OTHER') NOT NULL,
  related_item_id BIGINT NOT NULL,
  related_item_number VARCHAR(100),
  related_item_title VARCHAR(255),
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (change_event_id) REFERENCES change_events(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  
  INDEX idx_change_event_id (change_event_id),
  INDEX idx_related_item (related_item_type, related_item_id),
  UNIQUE KEY unique_relation (change_event_id, related_item_type, related_item_id)
);
```

## Key Relationships & Calculations

**Totals Calculation**:

```
Change Event Total ROM = SUM(line_item.extended_amount) for all line items
Change Event Total with Markup = SUM(line_item.total_with_markup) for all line items
Over/Under = Budget Allocated - Total with Markup
```

**Status Dependencies**:
```
- Cannot void if related change orders exist
- Cannot delete if status != OPEN or VOID
- Cannot close if line items exist without responses
- RFQ status drives change event financial calculations
```