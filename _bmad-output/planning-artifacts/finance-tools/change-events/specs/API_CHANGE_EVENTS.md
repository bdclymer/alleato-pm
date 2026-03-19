---
title: API_ENDPOINTS ChangeEvents
description: API_ENDPOINTS ChangeEvents documentation
---

# Change Events API Endpoints Specification

## Endpoint Overview

**Base Path**: `/api/projects/{projectId}/change-events`
**Authentication**: Bearer token required for all endpoints
**Total Endpoints**: 21 implemented across 4 main resource groups

### Resource Groups

1. **Change Events CRUD** (5 endpoints) - Main change event management
2. **Line Items CRUD** (5 endpoints) - Line item management
3. **Attachments** (5 endpoints) - File upload and management
4. **History** (1 endpoint) - Audit trail access
5. **RFQs** (5 endpoints) - Request for Quote management
6. **Approvals** (0 endpoints implemented) - Table exists in schema, but no REST routes currently expose approval workflows.

## Reality Check

- The collection (`GET`/`POST`) and detail (`GET`/`PATCH`/`DELETE`) routes for change events respond when called with UUIDs, but the supporting line item/attachment/history subroutes currently cast `changeEventId` to a `Number` (`parseInt`) and therefore never retrieve the stored records.
- Attachment uploads expect a single `file` field, yet the UI sends multiple entries under the `files` key, so the handler short-circuits before the file is written to Supabase storage.
- The approval workflow UI references `/approvals` routes, but no REST implementation exists in the codebase (the only persistence is the `change_event_approvals` table in the schema).
- RFQ endpoints for listing, creating, and posting responses exist, but the UX is not wired to them yet and we have not validated end-to-end behavior.

## Detailed Specifications

### 1. Change Events CRUD

#### 1.1 List Change Events

**Method**: GET
**URL**: `/api/projects/{projectId}/change-events`
**Purpose**: Retrieve paginated list of change events with filtering

**Authentication**: Bearer token
**Authorization**: Read, Standard, Admin

**Query Parameters**:

```typescript
interface ListChangeEventsQuery {
  page?: number;           // Default: 1
  limit?: number;          // Default: 25, max: 100
  status?: string;         // Filter by status
  type?: string;           // Filter by type
  scope?: string;          // Filter by scope
  search?: string;         // Text search
  sort?: string;           // Default: created_at
  order?: 'asc' | 'desc';  // Default: desc
  includeDeleted?: boolean; // Default: false
}
```

**Request**: None

**Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "number": "007",
      "title": "Phase 1 & 2 Carpet Installation",
      "type": "Owner Change",
      "scope": "Out of Scope",
      "status": "Open",
      "origin": "Field",
      "changeReason": "Design Development",
      "totalRevenueRom": 45000.00,
      "totalCostRom": 37500.00,
      "totalNonCommittedCost": 5000.00,
      "lineItemCount": 3,
      "attachmentCount": 2,
      "pendingApprovals": 1,
      "createdAt": "2026-01-15T10:30:00Z",
      "createdBy": {
        "id": "user-123",
        "name": "John Manager"
      },
      "_links": {
        "self": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 25,
    "totalRecords": 127,
    "totalPages": 6
  },
  "_links": {
    "self": "/api/projects/proj-456/change-events?page=1&limit=25",
    "next": "/api/projects/proj-456/change-events?page=2&limit=25",
    "last": "/api/projects/proj-456/change-events?page=6&limit=25"
  }
}
```

#### 1.2 Create Change Event

**Method**: POST
**URL**: `/api/projects/{projectId}/change-events`
**Purpose**: Create new change event

**Authentication**: Bearer token
**Authorization**: Standard, Admin

**Request**:

```json
{
  "title": "Phase 1 & 2 Carpet Installation",
  "type": "Owner Change",
  "reason": "Design Development",
  "scope": "Out of Scope",
  "origin": "Field",
  "description": "Includes premium carpet installation for phase 1 & 2 areas",
  "expectingRevenue": true,
  "lineItemRevenueSource": "Match Revenue to Latest Cost",
  "primeContractId": "contract-789"
}
```

> 🔧 The API enforces `lineItemRevenueSource` as one of `Match Latest Cost`, `Latest Cost`, or `Latest Price`. Values such as `match_latest_cost`, `manual_entry`, or `percentage_markup` will be rejected by the validation schema until they are mapped.

**Response (201 Created)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "number": "008",
  "title": "Phase 1 & 2 Carpet Installation",
  "type": "Owner Change",
  "reason": "Design Development",
  "scope": "Out of Scope",
  "status": "Open",
  "origin": "Field",
  "description": "Includes premium carpet installation for phase 1 & 2 areas",
  "expectingRevenue": true,
  "lineItemRevenueSource": "Match Revenue to Latest Cost",
  "primeContract": {
    "id": "contract-789",
    "name": "Main Construction Contract"
  },
  "totals": {
    "revenueRom": 0.00,
    "costRom": 0.00,
    "nonCommittedCost": 0.00
  },
  "createdAt": "2026-01-15T14:22:00Z",
  "createdBy": {
    "id": "user-123",
    "name": "John Manager"
  },
  "_links": {
    "self": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001",
    "edit": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001",
    "lineItems": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001/line-items",
    "attachments": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001/attachments"
  }
}
```

#### 1.3 Get Change Event

**Method**: GET
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}`
**Purpose**: Retrieve single change event with full details

**Authentication**: Bearer token
**Authorization**: Read, Standard, Admin

**Request**: None

**Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "number": "007",
  "title": "Phase 1 & 2 Carpet Installation",
  "type": "Owner Change",
  "reason": "Design Development",
  "scope": "Out of Scope",
  "status": "Open",
  "origin": "Field",
  "description": "Includes premium carpet installation for phase 1 & 2 areas",
  "expectingRevenue": true,
  "lineItemRevenueSource": "Match Revenue to Latest Cost",
  "primeContract": {
    "id": "contract-789",
    "name": "Main Construction Contract"
  },
  "totals": {
    "revenueRom": 45000.00,
    "costRom": 37500.00,
    "nonCommittedCost": 5000.00,
    "potentialProfit": 7500.00
  },
  "lineItemCount": 3,
  "attachmentCount": 2,
  "rfqCount": 1,
  "approvals": [
    {
      "id": "approval-001",
      "approver": {
        "id": "user-456",
        "name": "Sarah Director"
      },
      "status": "Pending",
      "createdAt": "2026-01-15T14:30:00Z"
    }
  ],
  "createdAt": "2026-01-15T10:30:00Z",
  "createdBy": {
    "id": "user-123",
    "name": "John Manager"
  },
  "updatedAt": "2026-01-15T14:22:00Z",
  "updatedBy": {
    "id": "user-123",
    "name": "John Manager"
  },
  "_links": {
    "self": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001",
    "edit": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001",
    "delete": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001",
    "lineItems": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001/line-items",
    "attachments": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001/attachments",
    "history": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001/history",
    "rfqs": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001/rfqs"
  }
}
```

#### 1.4 Update Change Event

**Method**: PUT
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}`
**Purpose**: Update existing change event

**Authentication**: Bearer token
**Authorization**: Standard (own records), Admin

**Request**:

```json
{
  "title": "Phase 1 & 2 Premium Carpet Installation",
  "description": "Updated to include premium carpet with enhanced padding",
  "scope": "In Scope",
  "expectingRevenue": false
}
```

**Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "number": "007",
  "title": "Phase 1 & 2 Premium Carpet Installation",
  "description": "Updated to include premium carpet with enhanced padding",
  "scope": "In Scope",
  "expectingRevenue": false,
  "updatedAt": "2026-01-15T15:45:00Z",
  "updatedBy": {
    "id": "user-123",
    "name": "John Manager"
  },
  "_links": {
    "self": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001"
  }
}
```

#### 1.5 Delete Change Event

**Method**: DELETE
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}`
**Purpose**: Soft delete change event (moves to recycle bin)

**Authentication**: Bearer token
**Authorization**: Standard (own records), Admin

**Request**: None

**Response (204 No Content)**: Empty body

**Error Responses**:

```json
// 409 Conflict - Cannot delete
{
  "error": "CANNOT_DELETE",
  "message": "Cannot delete change event with status 'Approved' or active change orders",
  "details": {
    "status": "Approved",
    "hasActiveChangeOrders": true
  }
}

// 403 Forbidden
{
  "error": "ACCESS_DENIED",
  "message": "You do not have permission to delete this change event"
}
```

### 2. Line Items CRUD

#### 2.1 List Line Items

**Method**: GET
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/line-items`
**Purpose**: Get all line items for a change event

> ⚠️ Implementation detail: the current route casts `{changeEventId}` to an integer before querying Supabase. Because `change_events.id` is a UUID, the query never matches any row and the response is always empty until the parameter is treated as the UUID string.

**Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "line-001",
      "changeEventId": "550e8400-e29b-41d4-a716-446655440001",
      "budgetCode": {
        "id": "budget-123",
        "code": "01.01.01",
        "description": "Foundation Work"
      },
      "description": "Concrete foundation for new structure",
      "vendor": {
        "id": "vendor-456",
        "name": "ABC Construction Corp"
      },
      "contract": {
        "id": "contract-789",
        "number": "SC-001"
      },
      "unitOfMeasure": "CY",
      "quantity": 150.00,
      "unitCost": 250.00,
      "extendedAmount": 37500.00,
      "revenueRom": 45000.00,
      "costRom": 37500.00,
      "nonCommittedCost": 5000.00,
      "sortOrder": 1,
      "createdAt": "2026-01-15T11:00:00Z",
      "updatedAt": "2026-01-15T14:30:00Z"
    }
  ],
  "totals": {
    "totalExtendedAmount": 37500.00,
    "totalRevenueRom": 45000.00,
    "totalCostRom": 37500.00,
    "totalNonCommittedCost": 5000.00
  }
}
```

#### 2.2 Create Line Item

**Method**: POST
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/line-items`

**Request**:

```json
{
  "budgetCodeId": "budget-123",
  "description": "Concrete foundation for new structure",
  "vendorId": "vendor-456",
  "contractId": "contract-789",
  "unitOfMeasure": "CY",
  "quantity": 150.00,
  "unitCost": 250.00,
  "revenueRom": 45000.00,
  "costRom": 37500.00,
  "nonCommittedCost": 5000.00
}
```

#### 2.3 Update Line Item

**Method**: PUT
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/line-items/{lineItemId}`

#### 2.4 Delete Line Item

**Method**: DELETE
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/line-items/{lineItemId}`

#### 2.5 Reorder Line Items

**Method**: PATCH
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/line-items/reorder`

**Request**:

```json
{
  "lineItems": [
    { "id": "line-001", "sortOrder": 2 },
    { "id": "line-002", "sortOrder": 1 },
    { "id": "line-003", "sortOrder": 3 }
  ]
}
```

### 3. Attachments

> ⚠️ Note: Every attachments route currently casts `{changeEventId}` to an integer before querying, so no rows match the UUID-based key. The upload handler also expects a single `file` field, while the UI sends `files`, so uploads fail before Supabase storage.

#### 3.1 List Attachments

**Method**: GET
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/attachments`

**Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "attachment-001",
      "changeEventId": "550e8400-e29b-41d4-a716-446655440001",
      "fileName": "foundation-specs.pdf",
      "filePath": "/storage/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001/foundation-specs.pdf",
      "fileSize": 2048576,
      "mimeType": "application/pdf",
      "uploadedBy": {
        "id": "user-123",
        "name": "John Manager"
      },
      "uploadedAt": "2026-01-15T12:15:00Z",
      "_links": {
        "download": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001/attachments/attachment-001/download",
        "delete": "/api/projects/proj-456/change-events/550e8400-e29b-41d4-a716-446655440001/attachments/attachment-001"
      }
    }
  ]
}
```

#### 3.2 Upload Attachment

**Method**: POST
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/attachments`
**Content-Type**: multipart/form-data

**Request**:

```yaml
file: [File]
description: "Foundation specifications document"
```

#### 3.3 Download Attachment

**Method**: GET
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/attachments/{attachmentId}/download`

**Response**: File stream with appropriate headers

#### 3.4 Get Attachment Metadata

**Method**: GET
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/attachments/{attachmentId}`

#### 3.5 Delete Attachment

**Method**: DELETE
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/attachments/{attachmentId}`

### 4. History

> ⚠️ Note: The route currently parses `{changeEventId}` as an integer, so the query never matches the UUID-stored rows and the response is an empty list until the parameter is treated as the UUID string.

#### 4.1 Get Audit Trail

**Method**: GET
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/history`
**Purpose**: Retrieve complete audit trail

**Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "history-001",
      "changeEventId": "550e8400-e29b-41d4-a716-446655440001",
      "fieldName": "title",
      "oldValue": "Phase 1 & 2 Carpet Installation",
      "newValue": "Phase 1 & 2 Premium Carpet Installation",
      "changeType": "update",
      "changedBy": {
        "id": "user-123",
        "name": "John Manager"
      },
      "changedAt": "2026-01-15T15:45:00Z"
    },
    {
      "id": "history-002",
      "changeEventId": "550e8400-e29b-41d4-a716-446655440001",
      "fieldName": "status",
      "oldValue": null,
      "newValue": "Open",
      "changeType": "create",
      "changedBy": {
        "id": "user-123",
        "name": "John Manager"
      },
      "changedAt": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 50,
    "totalRecords": 15,
    "totalPages": 1
  }
}
```

### 5. RFQs (Request for Quotes)

#### 5.1 List RFQs

**Method**: GET
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/rfqs`

#### 5.2 Create RFQ

**Method**: POST
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/rfqs`

**Request**:

```json
{
  "title": "Foundation Work RFQ",
  "description": "Request for quotes on foundation and site preparation",
  "lineItemIds": ["line-001", "line-003"],
  "vendorIds": ["vendor-456", "vendor-789"],
  "dueDate": "2026-01-25T17:00:00Z",
  "instructions": "Please include material and labor costs separately",
  "sendEmail": true
}
```

#### 5.3 Get RFQ Details

**Method**: GET
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/rfqs/{rfqId}`

#### 5.4 Submit RFQ Response

**Method**: POST
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/rfqs/{rfqId}/responses`

#### 5.5 Close RFQ

**Method**: PATCH
**URL**: `/api/projects/{projectId}/change-events/{changeEventId}/rfqs/{rfqId}/close`

## Authentication Requirements

### Bearer Token Format

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Permission Levels

- **Read**: Can view change events and related data
- **Standard**: Can create, edit own records, view all
- **Admin**: Full CRUD access to all records

### Project Access Control

All endpoints require user to have appropriate project permissions:

- User must be a member of the project
- User role determines available operations
- RLS policies enforce database-level security

## Error Codes and Handling

### Standard HTTP Status Codes

- **200**: Success
- **201**: Created successfully
- **204**: Deleted successfully (no content)
- **400**: Bad request (validation errors)
- **401**: Unauthorized (invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not found
- **409**: Conflict (business rule violation)
- **422**: Unprocessable entity (validation errors)
- **500**: Internal server error

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Specific field that caused error",
    "code": "FIELD_SPECIFIC_ERROR_CODE",
    "value": "Invalid value that was provided"
  },
  "timestamp": "2026-01-15T15:45:00Z",
  "requestId": "req-12345"
}
```

### Validation Error Example

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title is required and cannot be empty"
    },
    {
      "field": "quantity",
      "message": "Quantity must be greater than 0"
    }
  ]
}
```

## Rate Limiting

### Limits by Operation

- **Read operations**: 1000 requests per hour
- **Write operations**: 200 requests per hour
- **File uploads**: 50 requests per hour
- **Bulk operations**: 20 requests per hour

### Rate Limit Headers

```yaml
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642262400
```

## Example Request/Response Workflows

### Complete Change Event Creation Flow

```typescript
// 1. Create change event
const changeEvent = await fetch('/api/projects/proj-456/change-events', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Foundation Changes',
    type: 'Design Change',
    reason: 'Site Conditions',
    scope: 'Out of Scope'
  })
});

// 2. Add line items
const lineItem = await fetch(`/api/projects/proj-456/change-events/${changeEvent.id}/line-items`, {
  method: 'POST',
  body: JSON.stringify({
    budgetCodeId: 'budget-123',
    description: 'Additional excavation',
    quantity: 100,
    unitCost: 150,
    unitOfMeasure: 'CY'
  })
});

// 3. Upload attachments
const formData = new FormData();
formData.append('file', file);
formData.append('description', 'Site photos');

const attachment = await fetch(`/api/projects/proj-456/change-events/${changeEvent.id}/attachments`, {
  method: 'POST',
  body: formData
});

// 4. Submit for approval
const approval = await fetch(`/api/projects/proj-456/change-events/${changeEvent.id}`, {
  method: 'PUT',
  body: JSON.stringify({
    status: 'Pending Approval'
  })
});
```

This API specification provides comprehensive documentation for all Change Events endpoints with complete request/response examples and proper error handling patterns.
