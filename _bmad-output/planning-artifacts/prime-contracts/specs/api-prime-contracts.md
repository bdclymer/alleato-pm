---
title: API_ENDPOINTS PrimeContracts
description: API_ENDPOINTS PrimeContracts documentation
---

# Prime Contracts API Endpoints Specification

## Endpoint Overview

The Prime Contracts API provides comprehensive CRUD operations for contract management, including change orders, line items, billing periods, payments, and attachments. All endpoints follow RESTful conventions with proper authentication and validation.

**Base Path**: `/api/projects/[projectId]/contracts`

### Endpoint Categories

1. **Contract CRUD** - Basic contract operations
2. **Line Items** - Contract line item management
3. **Change Orders** - Change order workflow
4. **Billing & Payments** - Financial tracking
5. **Attachments** - Document management
6. **Reporting** - Financial summaries and exports

## Detailed Specifications

### 1. Contract CRUD Operations

#### List Contracts

**Method**: GET
**URL**: `/api/projects/[projectId]/contracts`
**Purpose**: Retrieve all prime contracts for a project with financial calculations

**Query Parameters**:

- `status` (optional): Filter by contract status
- `search` (optional): Search in number, title, description
- `limit` (optional): Page size (default: 50)
- `offset` (optional): Pagination offset
- `sort` (optional): Sort field (created_at, title, number)
- `order` (optional): Sort direction (asc, desc)

**Request Example**:

```bash
GET /api/projects/123/contracts?status=active&search=renovation&limit=10&sort=title&order=asc
```text
**Response**:
```json
{
  "contracts": [
    {
      "id": "uuid",
      "project_id": 123,
      "contract_number": "PC-001",
      "title": "Main Construction Contract",
      "client_id": "uuid",
      "client": {
        "id": "uuid",
        "name": "ABC Construction Client"
      },
      "vendor_id": "uuid", // ⚠️ ISSUE: Should be client_id
      "vendor": {           // ⚠️ ISSUE: Should be client
        "id": "uuid",
        "name": "Current Vendor"
      },
      "description": "Primary construction contract",
      "status": "active",
      "executed_at": "2024-01-15T00:00:00Z",
      "original_contract_value": 1000000.00,
      "revised_contract_value": 1050000.00,
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "retention_percentage": 5.0,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T00:00:00Z",

      // Calculated Financial Fields (from aggregation)
      "approved_change_orders": 50000.00,
      "pending_change_orders": 25000.00,
      "draft_change_orders": 10000.00,
      "total_billed": 750000.00,
      "total_payments": 700000.00,
      "retention_withheld": 37500.00,
      "retention_released": 5000.00,
      "percent_paid": 70.0,
      "remaining_balance": 350000.00
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10
}
```diff
**Error Responses**:

- `400`: Invalid query parameters
- `401`: Unauthorized
- `403`: Insufficient project permissions
- `500`: Server error

#### Create Contract

**Method**: POST
**URL**: `/api/projects/[projectId]/contracts`
**Purpose**: Create a new prime contract

**Request Body**:

```json
{
  "contract_number": "PC-002", // Optional - auto-generated if not provided
  "title": "Electrical Work Contract",
  "client_id": "uuid",          // ⚠️ Currently vendor_id in schema
  "description": "Main electrical installation work",
  "status": "draft",
  "executed": false,
  "original_contract_value": 250000.00,
  "start_date": "2024-02-01",
  "end_date": "2024-08-31",
  "retention_percentage": 10.0,
  "payment_terms": "Net 30",
  "billing_schedule": "Monthly",
  "is_private": false
}
```text
**Response** (201 Created):
```json
{
  "id": "uuid",
  "project_id": 123,
  "contract_number": "PC-002",
  "title": "Electrical Work Contract",
  // ... all contract fields
  "created_at": "2024-01-20T00:00:00Z",
  "updated_at": "2024-01-20T00:00:00Z"
}
```

**Validation Rules**:

- `title`: Required, 1-255 characters
- `contract_number`: Unique within project
- `client_id`: Must reference valid client/company
- `original_contract_value`: Must be ≥ 0
- `retention_percentage`: Must be 0-100
- `start_date` ≤ `end_date` if both provided

#### Get Single Contract

**Method**: GET
**URL**: `/api/projects/[projectId]/contracts/[contractId]`
**Purpose**: Get detailed contract information with related data

**Response**:

```json
{
  "id": "uuid",
  "project_id": 123,
  // ... all contract fields

  // Related data
  "line_items": [
    {
      "id": "uuid",
      "line_number": 1,
      "description": "Site preparation",
      "cost_code_id": "uuid",
      "total_cost": 50000.00
    }
  ],
  "change_orders": [
    {
      "id": "uuid",
      "change_order_number": "CO-001",
      "title": "Additional excavation",
      "amount": 25000.00,
      "status": "approved"
    }
  ],
  "billing_periods": [
    {
      "id": "uuid",
      "period_number": 1,
      "billed_amount": 100000.00,
      "status": "paid"
    }
  ],
  "payments": [
    {
      "id": "uuid",
      "payment_date": "2024-01-15",
      "amount": 95000.00,
      "retention_released": 0.00
    }
  ]
}
```markdown
#### Update Contract
**Method**: PUT
**URL**: `/api/projects/[projectId]/contracts/[contractId]`
**Purpose**: Update contract details (partial updates supported)

**Request Body** (partial update example):
```json
{
  "title": "Updated Contract Title",
  "status": "active",
  "end_date": "2024-12-31"
}
```text
**Response** (200 OK):

```json
{
  // Updated contract object
  "updated_at": "2024-01-20T12:00:00Z"
}
```markdown
#### Delete Contract
**Method**: DELETE
**URL**: `/api/projects/[projectId]/contracts/[contractId]`
**Purpose**: Soft delete contract (sets deleted_at timestamp)

**Response** (204 No Content)

### 2. Line Items Management

#### List Line Items
**Method**: GET
**URL**: `/api/projects/[projectId]/contracts/[contractId]/line-items`
**Purpose**: Get all line items for a contract

**Response**:
```json
{
  "line_items": [
    {
      "id": "uuid",
      "contract_id": "uuid",
      "line_number": 1,
      "description": "Site preparation and excavation",
      "cost_code_id": "uuid",
      "cost_code": {
        "id": "uuid",
        "code": "01.100",
        "description": "Site Preparation"
      },
      "quantity": 1000.0,
      "unit_of_measure": "SF",
      "unit_cost": 50.00,
      "total_cost": 50000.00
    }
  ]
}
```

#### Create Line Item

**Method**: POST
**URL**: `/api/projects/[projectId]/contracts/[contractId]/line-items`

**Request Body**:

```json
{
  "line_number": 2,
  "description": "Foundation work",
  "cost_code_id": "uuid",
  "quantity": 500.0,
  "unit_of_measure": "CY",
  "unit_cost": 150.00,
  "total_cost": 75000.00
}
```sql
#### Update Line Item
**Method**: PUT
**URL**: `/api/projects/[projectId]/contracts/[contractId]/line-items/[lineItemId]`

#### Delete Line Item
**Method**: DELETE
**URL**: `/api/projects/[projectId]/contracts/[contractId]/line-items/[lineItemId]`

#### Import Line Items
**Method**: POST
**URL**: `/api/projects/[projectId]/contracts/[contractId]/line-items/import`
**Purpose**: Bulk import line items from CSV/Excel

**Request Body** (multipart/form-data):
```yaml
file: [CSV/Excel file]
mapping: {
  "description": "column_1",
  "cost_code": "column_2",
  "total_cost": "column_3"
}

```text
**Response**:
```json
{
  "imported": 25,
  "errors": [
    {
      "line": 5,
      "error": "Invalid cost code: 99.999"
    }
  ]
}
```

### 3. Change Orders Workflow

#### List Change Orders

**Method**: GET
**URL**: `/api/projects/[projectId]/contracts/[contractId]/change-orders`

**Query Parameters**:

- `status`: Filter by status (draft, pending, approved, rejected)
- `date_from`: Start date filter
- `date_to`: End date filter

**Response**:

```json
{
  "change_orders": [
    {
      "id": "uuid",
      "contract_id": "uuid",
      "change_order_number": "CO-001",
      "title": "Additional electrical outlets",
      "description": "Add 10 additional outlets in office area",
      "amount": 5000.00,
      "status": "pending",
      "requested_by": "uuid",
      "requested_date": "2024-01-15T00:00:00Z",
      "approved_by": null,
      "approved_date": null,
      "rejection_reason": null
    }
  ]
}
```markdown
#### Create Change Order
**Method**: POST
**URL**: `/api/projects/[projectId]/contracts/[contractId]/change-orders`

**Request Body**:
```json
{
  "change_order_number": "CO-002", // Optional - auto-generated
  "title": "HVAC system upgrade",
  "description": "Upgrade to more efficient HVAC system",
  "amount": 15000.00,
  "justification": "Energy efficiency improvement",
  "impact_description": "3-day schedule delay",
  "requested_by": "uuid"
}
```markdown
#### Update Change Order

**Method**: PUT
**URL**: `/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]`

#### Approve Change Order

**Method**: POST
**URL**: `/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve`

**Request Body**:

```json
{
  "approved_by": "uuid",
  "approval_notes": "Approved with conditions"
}
```text
**Response**:
```json
{
  "id": "uuid",
  "status": "approved",
  "approved_by": "uuid",
  "approved_date": "2024-01-20T12:00:00Z",
  // Updated contract totals
  "contract": {
    "revised_contract_value": 1015000.00
  }
}
```

#### Reject Change Order

**Method**: POST
**URL**: `/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/reject`

**Request Body**:

```json
{
  "rejection_reason": "Exceeds budget constraints",
  "rejected_by": "uuid"
}
```markdown
### 4. Billing & Payments

#### List Billing Periods
**Method**: GET
**URL**: `/api/projects/[projectId]/contracts/[contractId]/billing-periods`

**Response**:
```json
{
  "billing_periods": [
    {
      "id": "uuid",
      "contract_id": "uuid",
      "period_number": 1,
      "period_start_date": "2024-01-01",
      "period_end_date": "2024-01-31",
      "billed_amount": 100000.00,
      "retention_withheld": 5000.00,
      "status": "submitted",
      "invoice_number": "INV-001",
      "invoice_date": "2024-02-01",
      "due_date": "2024-03-02"
    }
  ]
}
```markdown
#### Create Billing Period

**Method**: POST
**URL**: `/api/projects/[projectId]/contracts/[contractId]/billing-periods`

#### List Payments

**Method**: GET
**URL**: `/api/projects/[projectId]/contracts/[contractId]/payments`

#### Record Payment

**Method**: POST
**URL**: `/api/projects/[projectId]/contracts/[contractId]/payments`

**Request Body**:

```json
{
  "payment_date": "2024-01-15",
  "amount": 95000.00,
  "retention_released": 0.00,
  "check_number": "CHK-12345",
  "payment_method": "check",
  "notes": "Payment for January billing period",
  "billing_period_id": "uuid"
}
```markdown
### 5. Attachments Management

#### List Attachments
**Method**: GET
**URL**: `/api/projects/[projectId]/contracts/[contractId]/attachments`

#### Upload Attachment
**Method**: POST
**URL**: `/api/projects/[projectId]/contracts/[contractId]/attachments`
**Content-Type**: multipart/form-data

**Request Body**:
```

file: [File object]
description: "Signed contract document"
category: "contract" | "amendment" | "change_order" | "invoice" | "other"

```markdown
#### Download Attachment
**Method**: GET
**URL**: `/api/projects/[projectId]/contracts/[contractId]/attachments/[attachmentId]/download`

#### Delete Attachment
**Method**: DELETE
**URL**: `/api/projects/[projectId]/contracts/[contractId]/attachments/[attachmentId]`

### 6. Reporting & Exports

#### Financial Summary
**Method**: GET
**URL**: `/api/projects/[projectId]/contracts/[contractId]/financial-summary`

**Response**:
```json
{
  "contract": {
    "original_value": 1000000.00,
    "revised_value": 1050000.00,
    "total_change_orders": 50000.00
  },
  "change_orders": {
    "approved": 50000.00,
    "pending": 25000.00,
    "draft": 10000.00,
    "count": 5
  },
  "billing": {
    "total_billed": 750000.00,
    "total_payments": 700000.00,
    "outstanding_balance": 350000.00,
    "retention_withheld": 37500.00,
    "retention_released": 5000.00,
    "percent_paid": 70.0
  },
  "schedule": {
    "percent_complete": 75.0,
    "days_remaining": 45,
    "is_on_schedule": true
  }
}
```markdown
#### Export Contracts

**Method**: GET
**URL**: `/api/projects/[projectId]/contracts/export`

**Query Parameters**:

- `format`: csv, excel, pdf
- `fields`: Comma-separated list of fields to include
- `filter`: JSON filter criteria

**Response**: File download with appropriate Content-Type

## Authentication & Authorization

### Authentication Requirements

- **JWT Token**: Required in Authorization header
- **Project Access**: User must have access to specified project
- **Role Permissions**: Different endpoints require different permission levels

### Permission Levels

- **Viewer**: GET operations only
- **Editor**: GET, POST, PUT operations
- **Manager**: All operations including DELETE
- **Admin**: Full access including sensitive financial data

### Row Level Security

- Users can only access contracts in projects they have permissions for
- Private contracts have additional access restrictions
- Financial data may require elevated permissions

## Rate Limiting

- **Standard Endpoints**: 100 requests per minute per user
- **File Uploads**: 10 uploads per minute per user
- **Bulk Operations**: 5 requests per minute per user
- **Export Operations**: 3 requests per minute per user

## Error Codes & Handling

### Standard HTTP Status Codes

- `200`: Success
- `201`: Created
- `204`: No Content (successful delete)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden (permission denied)
- `404`: Not Found
- `409`: Conflict (duplicate contract number)
- `422`: Unprocessable Entity (business logic errors)
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid contract data",
    "details": {
      "fields": {
        "title": "Title is required",
        "original_contract_value": "Must be greater than 0"
      }
    },
    "request_id": "uuid"
  }
}
```markdown
### Business Logic Error Codes
- `CONTRACT_NUMBER_EXISTS`: Duplicate contract number in project
- `INVALID_CLIENT`: Client ID does not exist
- `CHANGE_ORDER_APPROVAL_REQUIRED`: Change order must be approved first
- `INSUFFICIENT_BALANCE`: Payment exceeds outstanding balance
- `CONTRACT_EXECUTED_READONLY`: Executed contracts cannot be modified

## Example Requests & Responses

### Create Contract with Line Items
```bash
# 1. Create contract
POST /api/projects/123/contracts
{
  "title": "Plumbing Contract",
  "client_id": "uuid",
  "original_contract_value": 150000.00
}

# 2. Add line items
POST /api/projects/123/contracts/{contractId}/line-items
{
  "description": "Rough plumbing",
  "total_cost": 75000.00
}

# 3. Create change order
POST /api/projects/123/contracts/{contractId}/change-orders
{
  "title": "Additional fixtures",
  "amount": 10000.00
}

# 4. Approve change order
POST /api/projects/123/contracts/{contractId}/change-orders/{coId}/approve
```

### Search and Filter Contracts

```bash
# Complex filtering
GET /api/projects/123/contracts?status=active,approved&search=electrical&sort=title&limit=20

# Date range filtering
GET /api/projects/123/contracts?start_date_from=2024-01-01&start_date_to=2024-12-31
```

This API specification provides comprehensive coverage of all prime contract operations with proper validation, security, and error handling patterns.
