---
title: API_ENDPOINTS ChangeOrders
description: API_ENDPOINTS ChangeOrders documentation
---

# Change Orders API Endpoints Specification

## Endpoint Overview

### Core CRUD Operations

- `GET /api/projects/{projectId}/change-orders` - List/filter change orders
- `POST /api/projects/{projectId}/change-orders` - Create new change order
- `GET /api/projects/{projectId}/change-orders/{id}` - Get change order details
- `PUT /api/projects/{projectId}/change-orders/{id}` - Update change order
- `DELETE /api/projects/{projectId}/change-orders/{id}` - Delete change order

### Workflow Operations

- `POST /api/projects/{projectId}/change-orders/{id}/submit` - Submit for review
- `POST /api/projects/{projectId}/change-orders/{id}/approve` - Approve change order
- `POST /api/projects/{projectId}/change-orders/{id}/reject` - Reject change order
- `POST /api/projects/{projectId}/change-orders/{id}/delegate` - Delegate review
- `POST /api/projects/{projectId}/change-orders/{id}/execute` - Execute change order

### Package Management

- `GET /api/projects/{projectId}/change-order-packages` - List packages
- `POST /api/projects/{projectId}/change-order-packages` - Create package
- `GET /api/projects/{projectId}/change-order-packages/{id}` - Package details
- `PUT /api/projects/{projectId}/change-order-packages/{id}` - Update package

### Line Items & Attachments

- `GET /api/projects/{projectId}/change-orders/{id}/line-items` - List line items
- `POST /api/projects/{projectId}/change-orders/{id}/line-items` - Add line item
- `PUT /api/projects/{projectId}/change-orders/{id}/line-items/{itemId}` - Update line item
- `DELETE /api/projects/{projectId}/change-orders/{id}/line-items/{itemId}` - Delete line item
- `POST /api/projects/{projectId}/change-orders/{id}/attachments` - Upload attachment
- `DELETE /api/projects/{projectId}/change-orders/{id}/attachments/{attachmentId}` - Remove attachment

### Export & Reporting

- `GET /api/projects/{projectId}/change-orders/export/csv` - CSV export
- `GET /api/projects/{projectId}/change-orders/{id}/pdf` - PDF generation
- `GET /api/projects/{projectId}/change-order-packages/{id}/pdf` - Package PDF
- `GET /api/projects/{projectId}/reports/change-orders/unexecuted` - Unexecuted report
- `GET /api/projects/{projectId}/reports/change-orders/overdue` - Overdue report
- `GET /api/projects/{projectId}/reports/change-orders/by-reason` - Analytics by reason

### Bulk Operations

- `POST /api/projects/{projectId}/change-orders/bulk/approve` - Bulk approve
- `POST /api/projects/{projectId}/change-orders/bulk/reject` - Bulk reject
- `POST /api/projects/{projectId}/change-orders/bulk/submit` - Bulk submit

## Detailed Specifications

### 1. List Change Orders

**Method**: GET
**URL**: `/api/projects/{projectId}/change-orders`
**Purpose**: Retrieve paginated list of change orders with filtering

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | int | No | 1 | Page number |
| limit | int | No | 25 | Items per page (max 100) |
| status | string | No | null | Filter by status |
| contractType | string | No | null | 'prime' or 'commitment' |
| packageId | int | No | null | Filter by package |
| designatedReviewerId | int | No | null | Filter by reviewer |
| search | string | No | null | Search title/description |
| sort | string | No | 'createdAt' | Sort field |
| order | string | No | 'desc' | 'asc' or 'desc' |
| includeDeleted | boolean | No | false | Include soft-deleted records |
| dueDateFrom | date | No | null | Due date range start |
| dueDateTo | date | No | null | Due date range end |

#### Request

```http
GET /api/projects/123/change-orders?status=pending&contractType=prime&page=1&limit=25
Authorization: Bearer <token>
```markdown
#### Response (200 OK)
```json
{
  "data": [
    {
      "id": 562949956482890,
      "number": "CO-001",
      "revision": 1,
      "title": "Phase 1 & 2 Changes - Full Scope",
      "status": "pending",
      "contractType": "commitment",
      "scope": "out_of_scope",
      "amount": 5062.35,
      "dateInitiated": "2025-05-13",
      "dueDate": "2025-05-27",
      "reviewDate": null,
      "designatedReviewer": {
        "id": 456,
        "name": "Dawson, Jesse",
        "email": "jesse@example.com"
      },
      "contract": {
        "id": 123456,
        "title": "General Contractor Agreement",
        "company": "Goodwill Industries of Central Indiana, LLC"
      },
      "package": {
        "id": 1,
        "packageNumber": "PCO-001",
        "title": "Phase 1 Changes & Permit Requirements"
      },
      "lineItemsCount": 2,
      "attachmentsCount": 1,
      "createdAt": "2025-05-13T09:51:00Z",
      "createdBy": {
        "id": 123,
        "name": "Nick Jepson"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 25,
    "totalRecords": 15,
    "totalPages": 1
  },
  "summary": {
    "totalAmount": 125000.50,
    "pendingCount": 5,
    "pendingAmount": 45000.00,
    "approvedCount": 8,
    "approvedAmount": 65000.50,
    "rejectedCount": 2,
    "rejectedAmount": 15000.00
  },
  "_links": {
    "self": "/api/projects/123/change-orders?page=1",
    "first": "/api/projects/123/change-orders?page=1",
    "last": "/api/projects/123/change-orders?page=1"
  }
}
```markdown
### 2. Create Change Order

**Method**: POST
**URL**: `/api/projects/{projectId}/change-orders`
**Purpose**: Create new change order with line items and attachments

#### Request

```json
{
  "packageId": 1,
  "contractType": "commitment",
  "contractId": 123456,
  "number": "CO-002",
  "title": "Electrical Upgrades Phase 2",
  "description": "Additional electrical work for expanded scope",
  "changeReasonId": 5,
  "scope": "in_scope",
  "dateInitiated": "2025-05-15",
  "dueDate": "2025-06-01",
  "designatedReviewerId": 456,
  "private": false,
  "lineItems": [
    {
      "description": "Additional outlets installation",
      "costCodeId": 1001,
      "quantity": 12,
      "unitOfMeasure": "EA",
      "unitPrice": 125.00,
      "notes": "Ground floor outlets"
    },
    {
      "description": "Circuit breaker upgrade",
      "costCodeId": 1002,
      "quantity": 1,
      "unitOfMeasure": "LS",
      "unitPrice": 850.00
    }
  ],
  "attachmentIds": [101, 102]
}
```markdown
#### Response (201 Created)
```json
{
  "id": 562949956482891,
  "number": "CO-002",
  "revision": 0,
  "title": "Electrical Upgrades Phase 2",
  "description": "Additional electrical work for expanded scope",
  "status": "draft",
  "contractType": "commitment",
  "scope": "in_scope",
  "amount": 2350.00,
  "changeReason": {
    "id": 5,
    "name": "Scope Addition",
    "code": "SCOPE_ADD"
  },
  "dateInitiated": "2025-05-15",
  "dueDate": "2025-06-01",
  "designatedReviewer": {
    "id": 456,
    "name": "Dawson, Jesse",
    "email": "jesse@example.com"
  },
  "contract": {
    "id": 123456,
    "title": "Electrical Contractor Agreement",
    "company": "ABC Electrical Services"
  },
  "package": {
    "id": 1,
    "packageNumber": "PCO-001",
    "title": "Phase 1 Changes & Permit Requirements"
  },
  "lineItems": [
    {
      "id": 1,
      "description": "Additional outlets installation",
      "costCode": {
        "id": 1001,
        "code": "16-100",
        "name": "Electrical - Outlets"
      },
      "quantity": 12,
      "unitOfMeasure": "EA",
      "unitPrice": 125.00,
      "extendedAmount": 1500.00,
      "notes": "Ground floor outlets"
    },
    {
      "id": 2,
      "description": "Circuit breaker upgrade",
      "costCode": {
        "id": 1002,
        "code": "16-200",
        "name": "Electrical - Panels"
      },
      "quantity": 1,
      "unitOfMeasure": "LS",
      "unitPrice": 850.00,
      "extendedAmount": 850.00
    }
  ],
  "attachments": [
    {
      "id": 101,
      "fileName": "electrical_plan.pdf",
      "fileSize": 1024000,
      "attachmentType": "drawing"
    }
  ],
  "createdAt": "2025-05-15T14:30:00Z",
  "createdBy": {
    "id": 123,
    "name": "Nick Jepson"
  },
  "_links": {
    "self": "/api/projects/123/change-orders/562949956482891",
    "edit": "/api/projects/123/change-orders/562949956482891",
    "submit": "/api/projects/123/change-orders/562949956482891/submit"
  }
}
```

#### Error (400 Bad Request)

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid change order data",
  "details": [
    {
      "field": "contractId",
      "code": "INVALID_CONTRACT",
      "message": "Contract not found or not eligible for change orders"
    },
    {
      "field": "lineItems",
      "code": "REQUIRED_FIELD",
      "message": "At least one line item is required"
    },
    {
      "field": "lineItems[0].unitPrice",
      "code": "INVALID_AMOUNT",
      "message": "Unit price must be greater than 0"
    }
  ]
}
```typescript
### 3. Get Change Order Details
**Method**: GET
**URL**: `/api/projects/{projectId}/change-orders/{id}`
**Purpose**: Retrieve complete change order details with relationships

#### Request
```http
GET /api/projects/123/change-orders/562949956482890
Authorization: Bearer <token>
```markdown
#### Response (200 OK)

```json
{
  "id": 562949956482890,
  "number": "CO-001",
  "revision": 1,
  "title": "Phase 1 & 2 Changes - Full Scope",
  "description": "Additional work for carpet installation and plumbing modifications per owner request",
  "status": "approved",
  "contractType": "commitment",
  "scope": "out_of_scope",
  "amount": 5062.35,
  "changeReason": {
    "id": 5,
    "name": "Owner Request",
    "code": "OWNER_REQ"
  },
  "dateInitiated": "2025-05-13",
  "dueDate": "2025-05-27",
  "reviewDate": "2025-05-25",
  "executionDate": null,
  "signedOrderReceivedDate": null,
  "revisedCompletionDate": null,
  "scheduleImpact": "no",
  "private": false,
  "executed": false,
  "designatedReviewer": {
    "id": 456,
    "name": "Dawson, Jesse",
    "email": "jesse@example.com",
    "phone": "+1-555-0123"
  },
  "contract": {
    "id": 123456,
    "title": "General Contractor Agreement",
    "company": "Goodwill Industries of Central Indiana, LLC",
    "contractNumber": "GC-2025-001",
    "contractType": "commitment",
    "originalValue": 2500000.00,
    "currentValue": 2505062.35
  },
  "package": {
    "id": 1,
    "packageNumber": "PCO-001",
    "title": "Phase 1 Changes & Permit Requirements",
    "status": "approved",
    "totalAmount": 15062.35,
    "changeOrdersCount": 3
  },
  "changeEvent": {
    "id": 789012,
    "number": "CE-007",
    "title": "Phase 1 & 2 Carpet Selection"
  },
  "lineItems": [
    {
      "id": 1,
      "description": "Carpet Installation - Premium Grade",
      "costCode": {
        "id": 1001,
        "code": "09-680",
        "name": "Carpet & Rugs"
      },
      "budgetLine": {
        "id": 2001,
        "description": "Flooring - Common Areas",
        "budgetedAmount": 15000.00,
        "actualAmount": 12000.00
      },
      "quantity": 500,
      "unitOfMeasure": "SF",
      "unitPrice": 15.00,
      "extendedAmount": 7500.00,
      "notes": "Upgraded to premium material per owner selection",
      "lineOrder": 1
    },
    {
      "id": 2,
      "description": "Plumbing Materials and Labor",
      "costCode": {
        "id": 1002,
        "code": "22-100",
        "name": "Plumbing"
      },
      "quantity": 1,
      "unitOfMeasure": "LS",
      "unitPrice": 5047.35,
      "extendedAmount": 5047.35,
      "lineOrder": 2
    }
  ],
  "attachments": [
    {
      "id": 1,
      "fileName": "carpet_specifications.pdf",
      "filePath": "projects/123/change-orders/562949956482890/carpet_specifications.pdf",
      "fileSize": 2048000,
      "mimeType": "application/pdf",
      "attachmentType": "specification",
      "uploadedBy": {
        "id": 123,
        "name": "Nick Jepson"
      },
      "createdAt": "2025-05-13T09:00:00Z",
      "downloadUrl": "/api/files/download/1?token=abc123"
    }
  ],
  "reviews": [
    {
      "id": 1,
      "tier": 1,
      "approver": {
        "id": 456,
        "name": "Dawson, Jesse",
        "email": "jesse@example.com"
      },
      "approvalStatus": "approved",
      "approvalNotes": "Approved as submitted. Scope and pricing are reasonable for the upgrade requested.",
      "scheduleImpact": "no",
      "approvedAt": "2025-05-25T10:15:00Z",
      "signatureStatus": "not_required"
    }
  ],
  "relatedItems": [
    {
      "id": 1,
      "relatedItemType": "rfi",
      "relatedItemId": 45,
      "relatedItemNumber": "RFI-045",
      "relatedItemTitle": "Carpet Specifications Clarification",
      "relationshipType": "supports",
      "notes": "This RFI provided the specifications that led to this change order"
    }
  ],
  "auditLog": [
    {
      "id": 1,
      "action": "create",
      "user": {
        "id": 123,
        "name": "Nick Jepson"
      },
      "timestamp": "2025-05-13T09:51:00Z",
      "details": "Change order created"
    },
    {
      "id": 2,
      "action": "submit",
      "user": {
        "id": 123,
        "name": "Nick Jepson"
      },
      "timestamp": "2025-05-13T10:15:00Z",
      "details": "Submitted for review"
    },
    {
      "id": 3,
      "action": "approve",
      "user": {
        "id": 456,
        "name": "Dawson, Jesse"
      },
      "timestamp": "2025-05-25T10:15:00Z",
      "details": "Approved by designated reviewer"
    }
  ],
  "budgetImpact": {
    "affectedBudgetLines": [
      {
        "budgetLineId": 2001,
        "description": "Flooring - Common Areas",
        "originalAmount": 15000.00,
        "impactAmount": 7500.00,
        "newProjectedAmount": 22500.00,
        "variancePercent": 50.0
      }
    ],
    "totalBudgetImpact": 12547.35,
    "projectOriginalBudget": 2500000.00,
    "projectCurrentBudget": 2512547.35
  },
  "permissions": {
    "canEdit": true,
    "canDelete": false,
    "canApprove": true,
    "canExecute": true,
    "canViewPrivate": true
  },
  "createdAt": "2025-05-13T09:51:00Z",
  "createdBy": {
    "id": 123,
    "name": "Nick Jepson",
    "email": "nick@example.com"
  },
  "updatedAt": "2025-05-25T10:15:00Z",
  "updatedBy": {
    "id": 456,
    "name": "Dawson, Jesse",
    "email": "jesse@example.com"
  },
  "_links": {
    "self": "/api/projects/123/change-orders/562949956482890",
    "edit": "/api/projects/123/change-orders/562949956482890",
    "approve": "/api/projects/123/change-orders/562949956482890/approve",
    "execute": "/api/projects/123/change-orders/562949956482890/execute",
    "pdf": "/api/projects/123/change-orders/562949956482890/pdf",
    "package": "/api/projects/123/change-order-packages/1",
    "contract": "/api/projects/123/commitments/123456"
  }
}
```markdown
### 4. Update Change Order
**Method**: PUT
**URL**: `/api/projects/{projectId}/change-orders/{id}`
**Purpose**: Update change order fields based on current status

#### Request
```json
{
  "title": "Phase 1 & 2 Changes - REVISED SCOPE",
  "description": "Updated description with revised scope details",
  "dueDate": "2025-06-15",
  "designatedReviewerId": 789,
  "lineItems": [
    {
      "id": 1,
      "description": "Carpet Installation - Premium Grade Plus",
      "quantity": 550,
      "unitPrice": 16.00
    },
    {
      "id": 2,
      "description": "Plumbing Materials and Labor",
      "quantity": 1,
      "unitPrice": 5247.35
    }
  ]
}
```

#### Response (200 OK)

```json
{
  "id": 562949956482890,
  "number": "CO-001",
  "revision": 2,
  "title": "Phase 1 & 2 Changes - REVISED SCOPE",
  "description": "Updated description with revised scope details",
  "status": "draft",
  "amount": 14047.35,
  "dueDate": "2025-06-15",
  "designatedReviewer": {
    "id": 789,
    "name": "Project Manager",
    "email": "pm@example.com"
  },
  "updatedAt": "2025-05-26T14:30:00Z",
  "updatedBy": {
    "id": 123,
    "name": "Nick Jepson"
  },
  "_links": {
    "self": "/api/projects/123/change-orders/562949956482890"
  }
}
```markdown
### 5. Approve Change Order
**Method**: POST
**URL**: `/api/projects/{projectId}/change-orders/{id}/approve`
**Purpose**: Approve change order and advance workflow

#### Request
```json
{
  "approvalNotes": "Approved with conditions. Please update material specifications before proceeding.",
  "scheduleImpact": "no",
  "conditions": [
    "Update carpet specifications to include stain resistance",
    "Confirm plumbing work schedule with mechanical contractor"
  ],
  "requireSignature": false,
  "nextTierReviewerId": null
}
```yaml
#### Response (200 OK)

```json
{
  "id": 562949956482890,
  "status": "approved",
  "reviewDate": "2025-05-26T15:45:00Z",
  "currentTier": 1,
  "nextTier": null,
  "approvalComplete": true,
  "review": {
    "id": 1,
    "tier": 1,
    "approvalStatus": "approved",
    "approvalNotes": "Approved with conditions. Please update material specifications before proceeding.",
    "scheduleImpact": "no",
    "approvedAt": "2025-05-26T15:45:00Z",
    "approver": {
      "id": 456,
      "name": "Dawson, Jesse"
    }
  },
  "notifications": {
    "emailsSent": [
      {
        "recipient": "nick@example.com",
        "type": "approval_notification",
        "status": "sent"
      }
    ]
  },
  "_links": {
    "self": "/api/projects/123/change-orders/562949956482890",
    "execute": "/api/projects/123/change-orders/562949956482890/execute"
  }
}
```yaml
### 6. CSV Export
**Method**: GET
**URL**: `/api/projects/{projectId}/change-orders/export/csv`
**Purpose**: Export filtered change orders as CSV

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status |
| contractType | string | No | Filter by contract type |
| dateFrom | date | No | Created date range start |
| dateTo | date | No | Created date range end |
| includeLineItems | boolean | No | Include line item details |

#### Request
```http
GET /api/projects/123/change-orders/export/csv?status=approved&includeLineItems=true
Authorization: Bearer <token>
Accept: text/csv
```

#### Response (200 OK)

```csv
Number,Title,Status,Contract Type,Contract Company,Amount,Date Initiated,Due Date,Review Date,Designated Reviewer,Line Items Count,Created By,Created Date
CO-001,Phase 1 & 2 Changes - Full Scope,approved,commitment,Goodwill Industries,5062.35,2025-05-13,2025-05-27,2025-05-25,Dawson Jesse,2,Nick Jepson,2025-05-13 09:51:00
CO-002,Electrical Upgrades Phase 2,pending,commitment,ABC Electrical,2350.00,2025-05-15,2025-06-01,,Dawson Jesse,2,Nick Jepson,2025-05-15 14:30:00
```yaml
### 7. Generate PDF
**Method**: GET
**URL**: `/api/projects/{projectId}/change-orders/{id}/pdf`
**Purpose**: Generate formatted PDF for change order

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| template | string | No | PDF template ('standard', 'detailed') |
| includeAttachments | boolean | No | Append attachments to PDF |

#### Request
```http
GET /api/projects/123/change-orders/562949956482890/pdf?template=detailed&includeAttachments=true
Authorization: Bearer <token>
Accept: application/pdf
```markdown
#### Response (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="CO-001_Phase_1_2_Changes.pdf"
Content-Length: 524288

%PDF-1.4
[Binary PDF content]
```markdown
### 8. Bulk Operations
**Method**: POST
**URL**: `/api/projects/{projectId}/change-orders/bulk/approve`
**Purpose**: Approve multiple change orders in one operation

#### Request
```json
{
  "changeOrderIds": [562949956482890, 562949956482891, 562949956482892],
  "approvalNotes": "Batch approval for Phase 1 scope items. All items reviewed and approved as submitted.",
  "scheduleImpact": "no",
  "maintainDueDates": true,
  "sendNotifications": true,
  "effectiveDate": "2025-05-26"
}
```

#### Response (200 OK)

```json
{
  "processed": 3,
  "successful": 2,
  "failed": 1,
  "results": [
    {
      "changeOrderId": 562949956482890,
      "status": "success",
      "newStatus": "approved",
      "message": "Successfully approved"
    },
    {
      "changeOrderId": 562949956482891,
      "status": "success",
      "newStatus": "approved",
      "message": "Successfully approved"
    },
    {
      "changeOrderId": 562949956482892,
      "status": "error",
      "error": "INSUFFICIENT_PERMISSIONS",
      "message": "User not authorized to approve this change order"
    }
  ],
  "notifications": {
    "emailsSent": 4,
    "emailsFailed": 0
  },
  "summary": {
    "totalApproved": 2,
    "totalAmount": 7412.35
  }
}
```

## Authentication & Authorization

### Authentication Requirements

- All endpoints require valid Bearer token
- Token must be associated with user having project access
- Session validation on each request

### Authorization Matrix

| Role | Create | Edit Own | Edit Any | Approve | Execute | Delete | View Private |
|------|--------|----------|----------|---------|---------|--------|-------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Project Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Reviewer | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Standard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read Only | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Error Codes & Handling

### Standard HTTP Status Codes

- `200 OK` - Successful operation
- `201 Created` - Resource created successfully
- `400 Bad Request` - Validation errors or malformed request
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate number)
- `422 Unprocessable Entity` - Business logic validation failed
- `500 Internal Server Error` - Server error

### Custom Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| VALIDATION_ERROR | Form validation failed | 400 |
| INVALID_CONTRACT | Contract not eligible | 400 |
| DUPLICATE_NUMBER | Change order number exists | 409 |
| INSUFFICIENT_PERMISSIONS | User lacks required permissions | 403 |
| INVALID_STATUS_TRANSITION | Cannot change from current status | 422 |
| BUDGET_EXCEEDED | Amount exceeds budget limits | 422 |
| REVIEWER_NOT_FOUND | Designated reviewer not valid | 400 |
| PACKAGE_NOT_FOUND | Package does not exist | 404 |
| FILE_UPLOAD_FAILED | Attachment upload error | 422 |
| PDF_GENERATION_FAILED | PDF creation error | 500 |

### Rate Limiting

- 100 requests per minute per user for standard operations
- 10 requests per minute for PDF generation
- 5 requests per minute for bulk operations
- Rate limit headers included in all responses

This comprehensive API specification provides all necessary endpoints for a complete change orders management system with proper authentication, validation, and error handling.
