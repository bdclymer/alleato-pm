# PROCORE CHANGE EVENTS TOOL

- Comprehensive Development Implementation Specification
- Project: Change Events Management System
- Version: 1.0
- Last Updated: January 2026
- Target Audience: Development Team & Claude Code

## SECTION 1: SYSTEM OVERVIEW
The Change Events tool allows project managers, owners, and contractors to track potential costs by coordinating the entire change management process. The system enables users to:

Create and manage change events from various sources (RFIs, field observations)
Generate requests for quotes (RFQs) to contractors
Track responses and create change orders
Link to commitments, purchase orders, subcontracts, and budgets

### Key Workflows
- Change Event Creation: Users create events based on scope changes
- RFQ Management: Generate and send RFQs to collaborators
- Quote Response Tracking: Receive and review contractor responses
- Change Order Conversion: Convert approved changes to formal orders
- Financial Integration: Update budgets and commitments

### User Roles
- Admin: Full access to configuration and all operations
- Standard: Create, edit, and manage own change events
- Read Only: View-only access to all change events
- None: No access

### FORMS
- [ ] Change Event Creation
- [ ] Change Event Edit
- [ ] Change Event Line Item
- [ ] RFQ Creation
- [ ] RFQ Response

### Database Tables
- [ ] change_events
- [ ] change_event_line_items
- [ ] rfqs
- [ ] rfq_responses
- [ ] rfq_attachments
- [ ] change_event_attachments
- [ ] change_event_audit_log
- [ ] change_event_related_items

## SECTION 2: PHASED IMPLEMENTATION PLAN

### Phase 1: Core Change Event Management

Establish the foundation for change event creation, viewing, and basic management.

#### Implementation Checklist

- [ ] Setup database schemas for change_events table
- [ ] Configure project-level entity relationships
- [ ] Implement authentication & authorization middleware
- [ ] Create change event model and repositories
- [ ] Build API endpoints for CRUD operations
- [ ] Develop frontend list view component
- [ ] Implement detail/edit view panel
- [ ] Add field-level validation logic
- [ ] Create data access layer with caching
- [ ] Setup audit logging for all changes
- [ ] Configure permission checks on all endpoints
- [ ] Build search and filter functionality
- [ ] Implement export to CSV/PDF functionality
- [ ] Create test suites for core operations
- [ ] Document API endpoints and data structures
- [ ] Setup error handling and logging

#### Deliverables

- [ ]  Fully functional change event CRUD system
- [ ]  Working list and detail views
- [ ]  API documentation
- [ ]  Test coverage report

### Phase 2: RFQ Management & Response Tracking

#### Overview
Implement the ability to generate, send, and track requests for quotes.

#### Implementation Checklist

- [ ] Design RFQ data model and relationships
- [ ] Create RFQ template system
- [ ] Implement email notification system
- [ ] Build RFQ creation workflow from change event
- [ ] Develop RFQ list and detail views
- [ ] Create collaborator assignment interface
- [ ] Implement quote response tracking
- [ ] Build response evaluation dashboard
- [ ] Create RFQ status state machine
- [ ] Add cost aggregation logic
- [ ] Implement response comparison tools
- [ ] Setup bulk RFQ creation from change events
- [ ] Create RFQ response notification handlers
- [ ] Build RFQ export and reporting
- [ ] Add RFQ-to-change-order conversion
- [ ] Create comprehensive test coverage

#### Deliverables

- [ ] Functional RFQ management system
- [ ] Email notification infrastructure
- [ ] Response tracking and evaluation tools
- [ ] Integration with change event creation

### Phase 3: Change Order Integration & Financial Tracking

Enable conversion of change events to formal change orders and financial integration.

#### Implementation Checklist

- [ ] Design change order data model
- [ ] Implement commitment change order creation
- [ ] Build prime contract change order support
- [ ] Add funding change order support (limited release)
- [ ] Create client contract change order support (limited release)
- [ ] Implement cost basis logic (Latest Cost vs Latest Price)
- [ ] Build financial aggregation and rollup
- [ ] Create budget modification interface
- [ ] Implement over/under calculation
- [ ] Add revenue tracking logic
- [ ] Build financial reporting views
- [ ] Create cost code integration
- [ ] Implement schedule of values linking
- [ ] Add production quantity tracking
- [ ] Build financial validation rules
- [ ] Create comprehensive financial test suite

#### Deliverables

- Change order creation and management system
- Financial integration with budgets and commitments
- Cost tracking and reporting
- Production quantity management

### Phase 4: Advanced Features & Polish

Implement advanced features, integrations, and user experience enhancements.

#### Implementation Checklist

- [ ] Build advanced filtering and search
- [ ] Implement column customization system
- [ ] Create saved views functionality
- [ ] Add bulk actions framework
- [ ] Implement related items linking
 Build comments and collaboration system
 Create email history tracking
 Add change history audit trail
 Implement keyboard shortcuts
 Build mobile-responsive UI
 Create admin configuration interface
 Implement field customization (custom fields)
 Add configurable fieldsets support
 Build API rate limiting and pagination
 Create comprehensive analytics
 Implement performance optimization

#### Deliverables

Advanced feature set
Enhanced user experience
Admin configuration tools
Performance-optimized system


## SECTION 3: FORMS & DATA STRUCTURES

### Form 1: Change Event Creation Form
Location: Change Events > Create
Permissions: Standard, Admin
Processing: Insert into change_events table

#### Form Fields

| Field Name                          | Type                  |    Required | Default                      | Validation                           | Notes                              |
| ----------------------------------- | --------------------- | ----------: | ---------------------------- | ------------------------------------ | ---------------------------------- |
| Number                              | Text (Auto-generated) |          No | System Generated             | Unique format `###-###`              | Read-only display                  |
| Title                               | Text                  |         Yes | Empty                        | Max 255 chars                        | Core identifier                    |
| Type                                | Select                |         Yes | Owner Change                 | Owner Change / GC Change / SC Change | Dropdown                           |
| Change Reason                       | Select                |        Yes* | *(configurable)*             | Predefined list                      | Configurable per company           |
| Scope                               | Select                |         Yes | In Scope                     | In Scope / Out of Scope              | Budget impact                      |
| Status                              | Select                |          No | Open                         | Open / Closed / Void                 | System-managed initially           |
| Description                         | Text Area             |          No | Empty                        | Max 2000 chars                       | Detailed explanation               |
| Origin                              | Select                |          No | Internal                     | Internal / RFI / Field               | Tracking source                    |
| Expecting Revenue                   | Toggle                |          No | No                           | Boolean                              | Yes/No field                       |
| Line Item Revenue Source            | Select                | Conditional | Match Revenue to Latest Cost | Allowed values list                  | Shows when Expecting Revenue = Yes |
| Prime Contract for Markup Estimates | Link                  |          No | Empty                        | Project Contracts                    | Linked reference                   |
| Vendor                              | Link                  |          No | Empty                        | Directory                            | Contractor/vendor reference        |
| Attachments                         | File Upload           |          No | None                         | Allowed types                        | Multiple files                     |
| Custom Fields                       | Varies                | Conditional | Varies                       | Per configuration                    | Fieldsets                          |


#### Form Actions

Save: Insert/update record
Save & Add Line Item: Save and navigate to line items
Save & Create RFQ: Save and open RFQ creation
Cancel: Return to list without saving
Delete: Remove change event (soft delete to recycle bin)


### Form 2: Change Event Edit Form
Location: Change Events > {Event} > Edit
Permissions: Standard (own only), Admin
Processing: Update change_events record
Editable Fields

Title
Description
Type
Change Reason
Scope
Expecting Revenue
Line Item Revenue Source
Prime Contract for Markup Estimates
Vendor
Status (Admin only)

Non-Editable Display Fields

Number
Origin
Created Date
Created By
Last Modified Date
Last Modified By


### Form 3: Change Event Line Item Form
Location: Change Events > {Event} > Add Line Item
Permissions: Standard, Admin
Processing: Insert into change_event_line_items table

#### Form Fields

| Field Name          | Type      | Required | Default    | Validation                           | Notes                    |
| ------------------- | --------- | -------: | ---------- | ------------------------------------ | ------------------------ |
| Cost Code           | Select    |      Yes | Empty      | Project cost codes                   | WBS hierarchy            |
| Cost Type           | Select    |      Yes | Labor      | Labor / Material / Equipment / Other | Financial categorization |
| Description         | Text      |      Yes | Empty      | Max 500 chars                        | Item details             |
| Unit of Measure     | Select    |      Yes | LS         | Standard units                       | Hour, Day, LS, SF, etc.  |
| Quantity            | Number    |      Yes | 0          | `> 0` decimal                        | Production quantity      |
| Unit Price          | Currency  |      Yes | 0.00       | `>= 0`                               | Individual item cost     |
| Extended Amount     | Currency  |       No | Calculated | Read-only                            | Qty × Unit Price         |
| Markup %            | Number    |       No | 0          | 0–100                                | Financial markup         |
| Commitment          | Link      |       No | Empty      | Project commitments                  | PO/SC link               |
| Production Quantity | Number    |       No | 0          | Decimal                              | Tracking                 |
| Revenue ROM         | Currency  |       No | 0.00       | `>= 0`                               | Revenue potential        |
| Notes               | Text Area |       No | Empty      | Max 1000 chars                       | Additional details       |


Calculation Logic

```
Extended Amount = Quantity × Unit Price
Total with Markup = Extended Amount × (1 + Markup% / 100)
ROM Impact = Extended Amount × Scope Impact Factor
```

### Form 4: RFQ Creation Form
Location: Change Events > {Event} > Create RFQ
Permissions: Standard, Admin
Processing: Insert into rfqs table

Form Fields

| Field Name      | Type        | Required | Default    | Validation    | Notes              |
| --------------- | ----------- | -------: | ---------- | ------------- | ------------------ |
| Line Item       | Display     |       No | Inherited  | Read-only     | Item quoted        |
| Unit Price      | Currency    |      Yes | 0.00       | `>= 0`        | Collaborator price |
| Extended Amount | Currency    |       No | Calculated | Read-only     | Auto-calculated    |
| Notes           | Text Area   |       No | Empty      | Max 500 chars | Additional notes   |
| Attachment      | File Upload |       No | None       | Multiple      | Supporting docs    |
| Submit Response | Button      |        — | —          | —             | Marks as responded |


Calculation Logic

Default Due Date = Current Date + 7 days
Total RFQ Amount = Sum of line item extended amounts
Status = Draft → Sent → Response Received → Closed


### Form 5: RFQ Response Form (Collaborator View)
Location: Email Link > RFQ Response
Permissions: Assigned collaborator with Standard+ on Commitments
Processing: Insert into rfq_responses table
Form Fields
Field NameTypeRequiredDefaultValidationNotesLine ItemDisplayNoInheritedRead-onlyItem being quotedUnit PriceCurrencyYes0.00>= 0Collaborator's priceExtended AmountCurrencyNoCalculatedRead-onlyAuto-calculatedNotesText AreaNoEmptyMax 500 charsAdditional notesAttachmentFile UploadNoNoneMultiple filesSupporting docsSubmit ResponseButton---Mark as responded

## SECTION 4: DATABASE SCHEMAS

### Schema 1: change_events

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

### Schema 2: change_event_line_items

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

### Schema 3: rfqs

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

### Schema 4: rfq_responses

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

### Schema 5: rfq_attachments
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

### Schema 6: change_event_attachments

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

### Schema 7: change_event_audit_log

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

### Schema 8: change_event_related_items

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

### Key Relationships & Calculations

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

## SECTION 5: API ENDPOINTS & EXAMPLES

### Phase 1: Core Operations

```
Endpoint 1.1: Create Change Event
Method: POST
Path: /api/v1/projects/{projectId}/change-events
Authentication: Bearer Token
Authorization: Standard, Admin
Request:
json{
  "title": "Phase 1 & 2 Carpet Installation",
  "type": "OWNER_CHANGE",
  "changeReasonId": 5,
  "scope": "OUT_OF_SCOPE",
  "origin": "FIELD",
  "description": "Includes carpet for phase 1 & 2",
  "expectingRevenue": true,
  "lineItemRevenueSource": "MATCH_LATEST_COST",
  "primeContractId": 42,
  "vendorId": 8
}
Response (201 Created):
json{
  "id": 562949955981358,
  "number": "007",
  "title": "Phase 1 & 2 Carpet Installation",
  "type": "OWNER_CHANGE",
  "changeReason": "Design Development",
  "scope": "OUT_OF_SCOPE",
  "status": "OPEN",
  "origin": "FIELD",
  "expectingRevenue": true,
  "lineItemRevenueSource": "MATCH_LATEST_COST",
  "primeContractForMarkupEstimates": {
    "id": 42,
    "name": "Goodwill Bart"
  },
  "vendor": {
    "id": 8,
    "name": "Carpet Supplier Inc"
  },
  "createdAt": "2026-01-06T20:05:47Z",
  "createdBy": {
    "id": 123,
    "name": "John Manager"
  },
  "_links": {
    "self": "/api/v1/projects/562949954728542/change-events/562949955981358",
    "lineItems": "/api/v1/projects/562949954728542/change-events/562949955981358/line-items",
    "rfqs": "/api/v1/projects/562949954728542/change-events/562949955981358/rfqs"
  }
}
Error (400 Bad Request):
json{
  "error": "VALIDATION_ERROR",
  "message": "Change reason is required",
  "details": [
    {
      "field": "changeReasonId",
      "message": "Field is required"
    }
  ]
}
```

### Endpoint 1.2: Get Change Event

```
Method: GET
Path: /api/v1/projects/{projectId}/change-events/{changeEventId}
Authentication: Bearer Token
Authorization: Read, Standard, Admin
Request: None
Response (200 OK):
json{
  "id": 562949955981358,
  "number": "007",
  "title": "Phase 1 & 2 Carpet Installation",
  "type": "OWNER_CHANGE",
  "changeReason": "Design Development",
  "scope": "OUT_OF_SCOPE",
  "status": "OPEN",
  "origin": "FIELD",
  "description": "Includes carpet for phase 1 & 2",
  "expectingRevenue": true,
  "lineItemRevenueSource": "MATCH_LATEST_COST",
  "primeContractForMarkupEstimates": {
    "id": 42,
    "name": "Goodwill Bart"
  },
  "vendor": {
    "id": 8,
    "name": "Carpet Supplier Inc"
  },
  "totals": {
    "rom": "$0.00",
    "primeTotals": "$0.00",
    "commitmentTotals": "$0.00",
    "rfqs": "$0.00"
  },
  "lineItemsCount": 0,
  "rfqsCount": 0,
  "attachmentsCount": 0,
  "createdAt": "2026-01-06T20:05:47Z",
  "createdBy": {
    "id": 123,
    "name": "John Manager"
  },
  "updatedAt": "2026-01-06T20:05:47Z",
  "updatedBy": {
    "id": 123,
    "name": "John Manager"
  },
  "_links": {
    "self": "/api/v1/projects/562949954728542/change-events/562949955981358",
    "edit": "/api/v1/projects/562949954728542/change-events/562949955981358",
    "delete": "/api/v1/projects/562949954728542/change-events/562949955981358",
    "lineItems": "/api/v1/projects/562949954728542/change-events/562949955981358/line-items",
    "rfqs": "/api/v1/projects/562949954728542/change-events/562949955981358/rfqs",
    "relatedItems": "/api/v1/projects/562949954728542/change-events/562949955981358/related-items"
  }
}
```

### Endpoint 1.3: List Change Events
Method: GET
Path: /api/v1/projects/{projectId}/change-events
Authentication: Bearer Token
Authorization: Read, Standard, Admin
Query Parameters:

page=1 (default: 1)
limit=25 (default: 25, max: 100)
status=OPEN (optional filter)
type=OWNER_CHANGE (optional filter)
scope=IN_SCOPE (optional filter)
search=carpet (optional search term)
sort=createdAt (default: createdAt)
order=desc (asc|desc)
includeDeleted=false (boolean)

Request: None
Response (200 OK):
json{
  "data": [
    {
      "id": 562949955981358,
      "number": "007",
      "title": "Phase 1 & 2 Carpet Installation",
      "type": "OWNER_CHANGE",
      "scope": "OUT_OF_SCOPE",
      "status": "OPEN",
      "origin": "FIELD",
      "changeReason": "Design Development",
      "rom": "$0.00",
      "primeTotals": "$0.00",
      "commitmentTotals": "$0.00",
      "rfqs": "$0.00",
      "rfqCount": 0,
      "lineItemsCount": 0,
      "createdAt": "2026-01-06T20:05:47Z",
      "createdBy": "John Manager",
      "_links": {
        "self": "/api/v1/projects/562949954728542/change-events/562949955981358"
      }
    },
    {
      "id": 562949955981359,
      "number": "006",
      "title": "Phase 2 Plumbing",
      "type": "OWNER_CHANGE",
      "scope": "OUT_OF_SCOPE",
      "status": "OPEN",
      "origin": "FIELD",
      "changeReason": "Design Development",
      "rom": "$0.00",
      "primeTotals": "$0.00",
      "commitmentTotals": "$0.00",
      "rfqs": "$0.00",
      "rfqCount": 0,
      "lineItemsCount": 0,
      "createdAt": "2025-12-15T10:30:00Z",
      "createdBy": "Jane Architect",
      "_links": {
        "self": "/api/v1/projects/562949954728542/change-events/562949955981359"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 25,
    "totalRecords": 3,
    "totalPages": 1
  },
  "_links": {
    "self": "/api/v1/projects/562949954728542/change-events?page=1&limit=25",
    "first": "/api/v1/projects/562949954728542/change-events?page=1&limit=25",
    "last": "/api/v1/projects/562949954728542/change-events?page=1&limit=25"
  }
}

### Endpoint 1.4: Update Change Event

Method: PATCH
Path: /api/v1/projects/{projectId}/change-events/{changeEventId}
Authentication: Bearer Token
Authorization: Standard (own), Admin
Request:
json{
  "title": "Phase 1 & 2 Carpet Installation - Updated",
  "description": "Includes premium carpet for phase 1 & 2",
  "scope": "IN_SCOPE",
  "expectingRevenue": false
}
Response (200 OK):
json{
  "id": 562949955981358,
  "number": "007",
  "title": "Phase 1 & 2 Carpet Installation - Updated",
  "type": "OWNER_CHANGE",
  "description": "Includes premium carpet for phase 1 & 2",
  "scope": "IN_SCOPE",
  "expectingRevenue": false,
  "updatedAt": "2026-01-06T20:15:00Z",
  "updatedBy": {
    "id": 123,
    "name": "John Manager"
  },
  "_links": {
    "self": "/api/v1/projects/562949954728542/change-events/562949955981358"
  }
}

### Endpoint 1.5: Delete Change Event
Method: DELETE
Path: /api/v1/projects/{projectId}/change-events/{changeEventId}
Authentication: Bearer Token
Authorization: Standard (own), Admin
Request: None
Response (204 No Content)
Error (409 Conflict):
json{
  "error": "CANNOT_DELETE",
  "message": "Cannot delete change event with status CLOSED or active related change orders"
}

## PHASE 2: RFQ Management

### Endpoint 2.1: Create RFQ from Change Event

Method: POST
Path: /api/v1/projects/{projectId}/change-events/{changeEventId}/rfqs
Authentication: Bearer Token
Authorization: Standard, Admin
Request:

```
json{
  "assignedUserId": 456,
  "dueDate": "2026-01-20",
  "lineItemIds": [1, 2, 3],
  "customMessage": "Please provide quotes for the attached items",
  "includeAttachments": true
}
Response (201 Created):
json{
  "id": 562949956000001,
  "rfqNumber": "RFQ-007-001",
  "title": "Phase 1 & 2 Carpet Installation",
  "changeEventId": 562949955981358,
  "assignedUser": {
    "id": 456,
    "name": "Contractor Manager",
    "email": "contractor@supplier.com"
  },
  "status": "DRAFT",
  "sentDate": null,
  "dueDate": "2026-01-20",
  "totalAmount": "$0.00",
  "lineItems": [
    {
      "id": 1,
      "description": "Carpet Installation",
      "quantity": 500,
      "unitOfMeasure": "SF",
      "unitPrice": "$0.00",
      "extendedAmount": "$0.00"
    }
  ],
  "createdAt": "2026-01-06T20:05:47Z",
  "createdBy": {
    "id": 123,
    "name": "John Manager"
  },
  "_links": {
    "self": "/api/v1/projects/562949954728542/rfqs/562949956000001",
    "send": "/api/v1/projects/562949954728542/rfqs/562949956000001/send",
    "responses": "/api/v1/projects/562949954728542/rfqs/562949956000001/responses"
  }
}
```

### Endpoint 2.2: Send RFQ

Method: POST
Path: /api/v1/projects/{projectId}/rfqs/{rfqId}/send
Authentication: Bearer Token
Authorization: Standard (creator), Admin
Request:

```
json{
  "sendEmail": true,
  "notifyAssignee": true
}
Response (200 OK):
json{
  "id": 562949956000001,
  "rfqNumber": "RFQ-007-001",
  "status": "SENT",
  "sentDate": "2026-01-06T20:20:00Z",
  "dueDate": "2026-01-20",
  "assignedUser": {
    "id": 456,
    "name": "Contractor Manager",
    "email": "contractor@supplier.com"
  },
  "message": "RFQ successfully sent",
  "_links": {
    "self": "/api/v1/projects/562949954728542/rfqs/562949956000001"
  }
}
```

### Endpoint 2.3: Get RFQ Details
Method: GET
Path: /api/v1/projects/{projectId}/rfqs/{rfqId}
Authentication: Bearer Token
Authorization: Read, Standard, Admin
Request: None
Response (200 OK):

```
json{
  "id": 562949956000001,
  "rfqNumber": "RFQ-007-001",
  "title": "Phase 1 & 2 Carpet Installation",
  "changeEvent": {
    "id": 562949955981358,
    "number": "007",
    "title": "Phase 1 & 2 Carpet Installation"
  },
  "assignedUser": {
    "id": 456,
    "name": "Contractor Manager",
    "email": "contractor@supplier.com"
  },
  "status": "AWAITING_RESPONSE",
  "sentDate": "2026-01-06T20:20:00Z",
  "dueDate": "2026-01-20",
  "totalAmount": "$0.00",
  "responses": [
    {
      "id": 1,
      "lineItem": {
        "id": 1,
        "description": "Carpet Installation"
      },
      "unitPrice": "$15.00",
      "extendedAmount": "$7,500.00",
      "submittedAt": "2026-01-10T14:30:00Z",
      "status": "SUBMITTED"
    }
  ],
  "createdAt": "2026-01-06T20:05:47Z",
  "createdBy": {
    "id": 123,
    "name": "John Manager"
  },
  "_links": {
    "self": "/api/v1/projects/562949954728542/rfqs/562949956000001",
    "changeEvent": "/api/v1/projects/562949954728542/change-events/562949955981358",
    "responses": "/api/v1/projects/562949954728542/rfqs/562949956000001/responses"
  }
}
```

### Endpoint 2.4: Submit RFQ Response

(Collaborator)
Method: POST
Path: /api/v1/public/rfqs/{rfqToken}/responses
Authentication: Token-based (no login required)
Authorization: RFQ assignee

Request:

```
json{
  "lineItemResponses": [
    {
      "lineItemId": 1,
      "unitPrice": "15.00",
      "notes": "Can deliver within 2 weeks"
    },
    {
      "lineItemId": 2,
      "unitPrice": "12.50",
      "notes": "Premium material"
```

## Progress
Every stopping point must be documented here, even if it requires splitting a partially completed task into two (“done” vs. “remaining”). This section must always reflect the actual current state of the work. Use timestamps to measure rates of progress.

## Surprises & Discoveries
Document unexpected behaviors, bugs, optimizations, or insights discovered during implementation. Include date and time next to observation title. Provide concise evidence.

## Decision Log
Record every decision made while working on the plan in the format:
- Decision: …
  Rationale: …
  Date/Author: …

## Outcomes & Retrospective
Summarize outcomes, gaps, and lessons learned at major milestones or at completion. Compare the result against the original purpose.

## Context and Orientation
Describe the current state relevant to this task as if the reader knows nothing. Name the key files and modules by full path. Define any non-obvious term you will use. Do not refer to prior plans.