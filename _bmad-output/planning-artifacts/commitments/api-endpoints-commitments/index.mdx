---
title: API_ENDPOINTS Commitments
description: API_ENDPOINTS Commitments documentation
---

# Commitments API Endpoints Specification

## Endpoint Overview

Complete REST API for Commitments module with full CRUD operations, file management, and integration endpoints.

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/api/commitments` | List commitments with filters | ✅ Complete |
| POST | `/api/commitments` | Create new commitment (deprecated) | ⛔ Deprecated (410) |
| GET | `/api/commitments/[id]` | Get commitment details | ✅ Complete |
| PUT | `/api/commitments/[id]` | Update commitment | ✅ Complete |
| DELETE | `/api/commitments/[id]` | Delete commitment (soft) | ✅ Complete |
| POST | `/api/commitments/[id]/restore` | Restore deleted commitment | ✅ Complete |
| DELETE | `/api/commitments/[id]/permanent-delete` | Permanently delete commitment | ✅ Complete |
| GET | `/api/commitments/[id]/change-orders` | List change orders | ✅ Complete |
| POST | `/api/commitments/[id]/change-orders` | Create change order | ✅ Complete |
| GET | `/api/commitments/[id]/change-orders/[changeOrderId]` | Get single change order | ✅ Complete |
| PUT | `/api/commitments/[id]/change-orders/[changeOrderId]` | Update change order | ✅ Complete |
| DELETE | `/api/commitments/[id]/change-orders/[changeOrderId]` | Delete change order (draft only) | ✅ Complete |
| POST | `/api/commitments/[id]/change-orders/[changeOrderId]/approve` | Approve change order | ✅ Complete |
| GET | `/api/commitments/[id]/invoices` | Get invoice/billing data | ✅ Complete |
| POST | `/api/commitments/[id]/invoices` | Create invoice | ✅ Complete |
| GET | `/api/commitments/[id]/attachments` | List attachments | ✅ Complete |
| POST | `/api/commitments/[id]/attachments` | Upload attachment | ✅ Complete |
| DELETE | `/api/commitments/[id]/attachments` | Bulk delete attachments | ✅ Complete |
| GET | `/api/commitments/[id]/attachments/[attachmentId]` | Get single attachment | ✅ Complete |
| DELETE | `/api/commitments/[id]/attachments/[attachmentId]` | Delete single attachment | ✅ Complete |
| POST | `/api/commitments/[id]/export` | Export commitment (CSV/Excel/PDF) | ✅ Complete |
| POST | `/api/commitments/[id]/email` | Email commitment details | ✅ Complete |
| GET | `/api/commitments/[id]/advanced-settings` | Get advanced settings | ✅ Complete |
| PUT | `/api/commitments/[id]/advanced-settings` | Update advanced settings | ✅ Complete |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/line-items` | Get SOV line items | ✅ Complete |
| PUT | `/api/projects/[projectId]/commitments/[commitmentId]/line-items` | Update SOV line items (upsert) | ✅ Complete |
| POST | `/api/projects/[projectId]/commitments/[commitmentId]/line-items/import` | Import budget lines to SOV | ✅ Complete |
| POST | `/api/projects/[projectId]/commitments/export` | Export project commitments | ✅ Complete |

## Detailed Specifications

### 1. List Commitments

**Method**: GET
**URL**: `/api/commitments`
**Purpose**: Retrieve paginated list of commitments with filtering and search

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| projectId | UUID | Yes | - | Project identifier |
| page | number | No | 1 | Page number (1-based) |
| limit | number | No | 20 | Items per page (max 100) |
| search | string | No | - | Search in title, contract_number |
| status | string | No | - | Filter by status |
| type | string | No | - | Filter by subcontract/purchase_order |
| companyId | UUID | No | - | Filter by contract company |
| executed | boolean | No | - | Filter by execution status |
| isPrivate | boolean | No | - | Filter by privacy flag |
| sortBy | string | No | created_at | Sort field |
| sortOrder | string | No | desc | Sort direction (asc/desc) |
| includeDeleted | boolean | No | false | Include soft-deleted records |

#### Request Example

```http
GET /api/commitments?projectId=123e4567-e89b-12d3-a456-426614174000&page=1&limit=20&search=foundation&status=approved&type=subcontract
Authorization: Bearer <token>
```typescript
#### Response

```typescript
interface CommitmentsListResponse {
  data: CommitmentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  aggregations: {
    totalOriginalAmount: number;
    totalRevisedAmount: number;
    totalInvoicedAmount: number;
    totalPaidAmount: number;
    totalRemainingBalance: number;
    averagePercentPaid: number;
  };
}

interface CommitmentListItem {
  id: string;
  commitmentType: 'subcontract' | 'purchase_order';
  title: string;
  contractNumber: string;
  status: string;
  companyName: string;
  originalContractAmount: number;
  revisedContractAmount: number;
  approvedChangeOrders: number;
  pendingChangeOrders: number;
  draftChangeOrders: number;
  invoicedAmount: number;
  paymentsIssued: number;
  percentPaid: number;
  remainingBalance: number;
  executed: boolean;
  isPrivate: boolean;
  erpStatus: string | null;
  ssovStatus: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```typescript
#### Error Responses

```typescript
// 400 Bad Request
{
  error: 'INVALID_PARAMETERS',
  message: 'Invalid query parameters',
  details: {
    page: 'Must be a positive integer',
    limit: 'Must be between 1 and 100'
  }
}

// 403 Forbidden
{
  error: 'INSUFFICIENT_PERMISSIONS',
  message: 'You do not have permission to view commitments for this project'
}
```typescript
### 2. Create Commitment

**Method**: POST
**URL**: `/api/commitments`
**Purpose**: Create new subcontract or purchase order

#### Request Body

```typescript
interface CreateCommitmentRequest {
  projectId: string;
  commitmentType: 'subcontract' | 'purchase_order';

  // Basic Information
  title: string;
  status?: string; // defaults to 'draft'
  contractCompanyId: string;
  contractNumber?: string; // auto-generated if not provided
  description?: string;

  // Financial
  originalContractAmount?: number;
  defaultRetainagePercent?: number;
  accountingMethod?: 'amount_based' | 'unit_quantity';

  // Dates
  startDate?: string; // ISO date
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  contractDate?: string;
  signedContractReceivedDate?: string;
  issuedOnDate?: string;

  // Subcontract specific
  inclusions?: string; // rich text HTML
  exclusions?: string; // rich text HTML

  // Purchase order specific
  shipTo?: string;
  shipVia?: string;
  billTo?: string;
  deliveryDate?: string;
  paymentTerms?: string;
  assignedTo?: string; // user ID

  // Access control
  executed?: boolean;
  isPrivate?: boolean;
  nonAdminUserIds?: string[];
  allowNonAdminViewSovItems?: boolean;
  invoiceContactIds?: string[];

  // SOV line items
  sovItems?: Array<{
    lineNumber: number;
    budgetCodeId: string;
    description: string;
    amount: number;
    changeEventLineItemId?: string;
    quantity?: number; // PO only
    unitCost?: number; // PO only
    unitOfMeasure?: string; // PO only
  }>;

  // Attachments (file IDs from separate upload)
  attachmentIds?: string[];
}
```

#### Request Example

```http
POST /api/commitments
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "commitmentType": "subcontract",
  "title": "Foundation and Concrete Work",
  "contractCompanyId": "456e7890-e89b-12d3-a456-426614174000",
  "originalContractAmount": 150000,
  "defaultRetainagePercent": 10,
  "startDate": "2024-02-01",
  "estimatedCompletionDate": "2024-04-30",
  "executed": false,
  "isPrivate": true,
  "sovItems": [
    {
      "lineNumber": 1,
      "budgetCodeId": "789e0123-e89b-12d3-a456-426614174000",
      "description": "Site preparation and excavation",
      "amount": 75000
    },
    {
      "lineNumber": 2,
      "budgetCodeId": "789e0124-e89b-12d3-a456-426614174000",
      "description": "Concrete foundation pour",
      "amount": 75000
    }
  ]
}
```typescript
#### Response

```typescript
interface CreateCommitmentResponse {
  success: true;
  data: {
    id: string;
    contractNumber: string; // auto-generated
    createdAt: string;
    // ... full commitment object
  };
}
```sql
### 3. Get Commitment Details

**Method**: GET
**URL**: `/api/commitments/[id]`
**Purpose**: Retrieve complete commitment details with related data

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| include | string[] | No | basic | Data to include: basic, sov, change_orders, invoices, attachments, all |

#### Response

```typescript
interface CommitmentDetailsResponse {
  data: {
    // Core commitment data
    id: string;
    commitmentType: 'subcontract' | 'purchase_order';
    title: string;
    contractNumber: string;
    status: string;
    description: string | null;

    // Company information
    contractCompany: {
      id: string;
      name: string;
      type: string;
    };

    // Financial data
    originalContractAmount: number;
    revisedContractAmount: number;
    defaultRetainagePercent: number;
    accountingMethod: string;

    // Calculated totals
    totalSovAmount: number;
    approvedChangeOrders: number;
    pendingChangeOrders: number;
    draftChangeOrders: number;
    invoicedAmount: number;
    paymentsIssued: number;
    percentPaid: number;
    remainingBalance: number;

    // Dates
    startDate: string | null;
    estimatedCompletionDate: string | null;
    actualCompletionDate: string | null;
    contractDate: string | null;
    signedContractReceivedDate: string | null;
    issuedOnDate: string | null;

    // Subcontract specific
    inclusions?: string;
    exclusions?: string;

    // Purchase order specific
    shipTo?: string;
    shipVia?: string;
    billTo?: string;
    deliveryDate?: string;
    paymentTerms?: string;
    assignedTo?: {
      id: string;
      name: string;
      email: string;
    };

    // Flags and access
    executed: boolean;
    isPrivate: boolean;
    allowNonAdminViewSovItems: boolean;
    erpStatus: string | null;
    ssovStatus: string | null;

    // Access control
    nonAdminUsers: Array<{
      id: string;
      name: string;
      email: string;
    }>;
    invoiceContacts: Array<{
      id: string;
      name: string;
      email: string;
    }>;

    // Related data (if included)
    sovItems?: Array<{
      id: string;
      lineNumber: number;
      budgetCode: {
        id: string;
        code: string;
        description: string;
      };
      description: string;
      amount: number;
      billedToDate: number;
      amountRemaining: number;
      changeEventLineItemId: string | null;
      // PO specific
      quantity?: number;
      unitCost?: number;
      unitOfMeasure?: string;
    }>;

    changeOrders?: Array<{
      id: string;
      number: string;
      title: string;
      status: string;
      amount: number;
      createdAt: string;
    }>;

    invoices?: Array<{
      id: string;
      number: string;
      date: string;
      amount: number;
      paidAmount: number;
      status: string;
    }>;

    attachments?: Array<{
      id: string;
      filename: string;
      fileSize: number;
      fileType: string;
      uploadedAt: string;
      uploadedBy: {
        id: string;
        name: string;
      };
      downloadUrl: string;
    }>;

    // Audit data
    createdAt: string;
    updatedAt: string;
    createdBy: {
      id: string;
      name: string;
    };
    updatedBy: {
      id: string;
      name: string;
    } | null;
  };
}
```sql
### 4. Update Commitment

**Method**: PUT
**URL**: `/api/commitments/[id]`
**Purpose**: Update existing commitment (partial updates supported)

#### Request Body

```typescript
// Same as CreateCommitmentRequest but all fields optional except projectId
interface UpdateCommitmentRequest {
  projectId: string; // for authorization

  // Any subset of fields from CreateCommitmentRequest
  title?: string;
  status?: string;
  description?: string;
  // ... etc

  // SOV items with CRUD operations
  sovItems?: Array<{
    id?: string; // existing item ID
    action: 'create' | 'update' | 'delete';
    lineNumber: number;
    budgetCodeId?: string;
    description?: string;
    amount?: number;
    // ... other SOV fields
  }>;
}
```

#### Response

```typescript
interface UpdateCommitmentResponse {
  success: true;
  data: {
    id: string;
    updatedAt: string;
    changedFields: string[]; // list of modified fields
    // ... full updated commitment object
  };
}
```typescript
### 5. Delete Commitment

**Method**: DELETE
**URL**: `/api/commitments/[id]`
**Purpose**: Soft delete commitment (move to recycle bin)

#### Request

```http
DELETE /api/commitments/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <token>
```typescript
#### Response

```typescript
interface DeleteCommitmentResponse {
  success: true;
  message: string;
  data: {
    id: string;
    deletedAt: string;
    canRestore: boolean;
  };
}
```typescript
### 6. Restore Commitment

**Method**: POST
**URL**: `/api/commitments/[id]/restore`
**Purpose**: Restore soft-deleted commitment from recycle bin

#### Response

```typescript
interface RestoreCommitmentResponse {
  success: true;
  message: string;
  data: {
    id: string;
    restoredAt: string;
    status: string; // restored to previous status
  };
}
```

### 7. Get Related Change Orders

**Method**: GET
**URL**: `/api/commitments/[id]/change-orders`
**Purpose**: Get change orders linked to this commitment

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | all | Filter by CO status |
| includeLineItems | boolean | false | Include CO line item details |

#### Response

```typescript
interface CommitmentChangeOrdersResponse {
  data: Array<{
    id: string;
    number: string;
    title: string;
    status: 'draft' | 'pending' | 'approved' | 'rejected';
    type: 'cco' | 'pco' | 'cor';
    amount: number;
    description: string;
    createdAt: string;
    approvedAt: string | null;
    lineItems?: Array<{
      id: string;
      description: string;
      quantity: number;
      unitCost: number;
      amount: number;
      budgetCodeId: string;
    }>;
  }>;
  totals: {
    approved: number;
    pending: number;
    draft: number;
    rejected: number;
  };
}
```typescript
### 8. Get Related Invoices

**Method**: GET
**URL**: `/api/commitments/[id]/invoices`
**Purpose**: Get invoices linked to this commitment

#### Response

```typescript
interface CommitmentInvoicesResponse {
  data: Array<{
    id: string;
    number: string;
    date: string;
    amount: number;
    paidAmount: number;
    status: 'draft' | 'submitted' | 'approved' | 'paid';
    dueDate: string | null;
    description: string;
    lineItems?: Array<{
      id: string;
      description: string;
      amount: number;
      sovLineItemId: string | null;
    }>;
  }>;
  totals: {
    totalInvoiced: number;
    totalPaid: number;
    totalRemaining: number;
    averageDaysToPay: number;
  };
}
```typescript
### 9. Get Attachments

**Method**: GET
**URL**: `/api/commitments/[id]/attachments`
**Purpose**: List all file attachments for commitment

#### Response

```typescript
interface CommitmentAttachmentsResponse {
  data: Array<{
    id: string;
    filename: string;
    fileSize: number;
    fileType: string;
    description: string | null;
    uploadedAt: string;
    uploadedBy: {
      id: string;
      name: string;
    };
    downloadUrl: string;
    thumbnailUrl: string | null; // for images
  }>;
  totals: {
    totalFiles: number;
    totalSize: number;
  };
}
```yaml
### 10. Upload Attachments

**Method**: POST
**URL**: `/api/commitments/[id]/attachments`
**Purpose**: Upload one or more files as attachments

#### Request

```http
POST /api/commitments/123e4567-e89b-12d3-a456-426614174000/attachments
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: [File objects]
descriptions: ["Contract document", "Specifications"]
```

#### Request Body (FormData)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| files | File[] | Yes | One or more files to upload |
| descriptions | string[] | No | Optional descriptions for each file |

#### Response

```typescript
interface UploadAttachmentsResponse {
  success: true;
  data: {
    uploadedFiles: Array<{
      id: string;
      filename: string;
      fileSize: number;
      fileType: string;
      storagePath: string;
      downloadUrl: string;
    }>;
    failedFiles: Array<{
      filename: string;
      error: string;
      reason: string;
    }>;
  };
  message: string; // summary of upload results
}
```sql
### 11. Delete Attachment

**Method**: DELETE
**URL**: `/api/commitments/[id]/attachments/[attachmentId]`
**Purpose**: Delete a specific attachment file

#### Response

```typescript
interface DeleteAttachmentResponse {
  success: true;
  message: string;
  data: {
    deletedFileId: string;
    deletedFileName: string;
    deletedAt: string;
  };
}
```

### 12. Permanent Delete Commitment

**Method**: DELETE
**URL**: `/api/commitments/[id]/permanent-delete`
**Purpose**: Hard delete a commitment from the database (irreversible)

#### Business Rules

- Commitment must be soft-deleted first (`deleted_at` must be set)
- Cascades to related records (SOV items, change orders via foreign keys)
- Determines correct table (subcontracts vs purchase_orders) from unified view

#### Response

```typescript
// 204 No Content on success (empty body)

// 400 Bad Request - not soft-deleted yet
{
  error: "Commitment must be soft-deleted first",
  message: "Only soft-deleted commitments can be permanently deleted"
}
```

### 13. Approve Change Order

**Method**: POST
**URL**: `/api/commitments/[id]/change-orders/[changeOrderId]/approve`
**Purpose**: Approve a pending/draft change order and recalculate commitment totals

#### Business Rules

- Only change orders with status "pending" or "draft" can be approved
- Already approved/executed change orders return 400
- Void change orders cannot be approved
- Sets approved_date and approved_by automatically

#### Response

```typescript
interface ApproveChangeOrderResponse {
  success: true;
  message: string;
  data: {
    changeOrder: ChangeOrderRecord;
    totals: {
      approved: number;
      pending: number;
      draft: number;
      total: number;
    };
  };
}
```

### 14. Export Commitment

**Method**: POST
**URL**: `/api/commitments/[id]/export`
**Purpose**: Export a single commitment to CSV, Excel, or PDF format

#### Request Body

```typescript
interface ExportRequest {
  format: 'csv' | 'excel' | 'pdf'; // default: 'pdf'
  template: 'standard' | 'financial' | 'summary'; // default: 'standard'
  include_sov_items: boolean; // default: true
  include_change_orders: boolean; // default: true
  include_invoices: boolean; // default: false
}
```

#### Response

Returns a file download with appropriate Content-Type header:
- CSV: `text/csv; charset=utf-8`
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- PDF: `text/html; charset=utf-8` (HTML with auto-print dialog)

Content-Disposition header provides the suggested filename.

### 15. Email Commitment

**Method**: POST
**URL**: `/api/commitments/[id]/email`
**Purpose**: Send commitment details via email to specified recipients

#### Request Body

```typescript
interface EmailRequest {
  recipients: Array<{
    email: string;
    name: string;
  }>; // At least one required
  subject: string; // Required, non-empty
  message?: string; // Optional custom message
  attach_pdf: boolean; // default: true
  include_sov_items: boolean; // default: true
}
```

#### Validation

- At least one recipient required
- Subject must be non-empty string
- All recipient emails validated against regex pattern

#### Response

```typescript
interface EmailResponse {
  success: true;
  message: string; // "Email sent to N recipient(s)"
  recipients: string[]; // List of recipient emails
}
```

### 16. Get Advanced Settings

**Method**: GET
**URL**: `/api/commitments/[id]/advanced-settings`
**Purpose**: Retrieve advanced configuration settings for a commitment

#### Response

```typescript
interface AdvancedSettingsResponse {
  data: {
    enable_invoices: boolean;
    enable_comments: boolean;
    enable_payments: boolean;
    enable_completed_work_retainage: boolean;
    enable_stored_materials_retainage: boolean;
    show_cost_codes_on_pdf: boolean;
    allow_overbilling: boolean;
    enable_subcontractor_sov: boolean;
    enable_always_editable_sov: boolean;
    enable_financial_markup: boolean;
    show_markup_criteria_on_pdf: boolean;
    send_invoice_approval_notifications: boolean;
    send_payment_notifications: boolean;
    default_retainage_percent: number;
    billing_period: string;
  };
}
```

Settings are stored in the `advanced_settings` JSONB column. If no custom settings exist, defaults are returned. Always returns 200 to ensure UI stability.

### 17. Update Advanced Settings

**Method**: PUT
**URL**: `/api/commitments/[id]/advanced-settings`
**Purpose**: Update advanced configuration settings for a commitment

#### Request Body

Any subset of the settings fields listed in section 16. Provided values are merged with defaults to ensure all required keys are present.

#### Response

```typescript
interface UpdateSettingsResponse {
  data: AdvancedSettings; // Merged settings object
  message: string; // "Settings saved successfully"
  warning?: string; // Present if database column doesn't exist yet
}
```

### 18. Get SOV Line Items (Project-scoped)

**Method**: GET
**URL**: `/api/projects/[projectId]/commitments/[commitmentId]/line-items`
**Purpose**: Fetch all SOV line items for a commitment with project access verification

#### Response

```typescript
interface LineItemsResponse {
  success: true;
  data: Array<{
    id: string;
    line_number: number;
    budget_code: string | null;
    description: string;
    amount: number;
    billed_to_date: number;
    // Additional fields from SOV table
  }>;
  commitmentType: 'subcontract' | 'purchase_order';
}
```

### 19. Update SOV Line Items (Project-scoped)

**Method**: PUT
**URL**: `/api/projects/[projectId]/commitments/[commitmentId]/line-items`
**Purpose**: Batch update SOV line items using upsert strategy (create, update, delete)

#### Request Body

```typescript
interface UpdateLineItemsRequest {
  lineItems: Array<{
    id?: string; // Existing item ID (omit for new items)
    line_number: number | null;
    budget_code: string | null;
    description: string | null;
    amount: number | null;
    billed_to_date: number | null;
  }>;
  commitmentType?: 'subcontract' | 'purchase_order'; // Auto-detected if omitted
}
```

#### Strategy

1. Fetches existing line item IDs
2. Deletes items no longer present in the submitted list
3. Updates existing items (matched by ID)
4. Inserts new items (no ID or ID not in existing set)

#### Response

```typescript
interface UpdateLineItemsResponse {
  success: true;
  savedCount: number;
  deletedCount: number;
  totalAmount: number;
  errors?: string[];
  message: string;
}
```

### 20. Import Budget Lines to SOV

**Method**: POST
**URL**: `/api/projects/[projectId]/commitments/[commitmentId]/line-items/import`
**Purpose**: Import budget line items into a commitment's SOV

#### Request Body

```typescript
interface ImportRequest {
  source: 'budget'; // Currently only "budget" supported
  lineItemIds?: string[]; // Specific budget line IDs (all if omitted)
}
```

#### Business Rules

- Maximum 500 line items per import operation
- Line numbers auto-assigned starting after highest existing line number
- Duplicate line numbers are skipped (not treated as errors)
- Budget code derived from cost_code_id and cost_type code

#### Response

```typescript
interface ImportResponse {
  success: true;
  importedCount: number;
  totalRows: number;
  skipped?: string[];
  errors?: string[];
  message: string;
}
```

### 21. Export Project Commitments

**Method**: POST
**URL**: `/api/projects/[projectId]/commitments/export`
**Purpose**: Export all commitments for a project with filtering options

#### Request Body

Validated by `CommitmentExportSchema` (Zod):

```typescript
interface ProjectExportRequest {
  format: 'csv' | 'excel' | 'pdf';
  template: 'standard' | 'financial' | 'summary';
  commitmentId?: string; // For individual PDF export
  filters?: {
    type?: string;
    status?: string;
    companyId?: string;
    search?: string;
  };
}
```

#### Templates

| Template | Columns |
|----------|---------|
| standard | Number, Title, Type, Company, Status, Executed, Start Date, Executed Date, Original Amount, Approved COs, Revised Amount, Billed to Date, Balance to Finish, ERP Status, SSOV Status, Private, Created |
| financial | Number, Title, Type, Company, Status, Original Amount, Approved COs, Revised Amount, Billed to Date, Balance to Finish, Invoiced Amount, Payments Issued, % Paid, Remaining Balance |
| summary | Number, Title, Type, Company, Status, Revised Amount, Balance to Finish |

#### Response

Returns file download with appropriate Content-Type and Content-Disposition headers. For individual PDF export (when `commitmentId` is provided), generates a detailed single-commitment report with SOV items table.

## Authentication Requirements

All endpoints require valid JWT authentication via `Authorization: Bearer <token>` header.

### Permission Levels

| Operation | Required Permission | Notes |
|-----------|-------------------|-------|
| List | `commitments:read` | Filtered by project access |
| Create | `commitments:write` | Must have project access |
| Read Detail | `commitments:read` | Respects privacy settings |
| Update | `commitments:write` | Owner or admin required |
| Delete (soft) | `commitments:delete` | Admin or owner required |
| Delete (permanent) | `commitments:delete` | Admin required, must be soft-deleted first |
| Restore | `commitments:delete` | Admin required |
| Attachments | `commitments:attachments` | Separate permission for files |
| Change Orders | `commitments:write` | CRUD on commitment change orders |
| Approve CO | `commitments:approve` | Approve change orders |
| Export | `commitments:read` | Export to CSV/Excel/PDF |
| Email | `commitments:read` | Send commitment via email |
| Advanced Settings | `commitments:write` | Read/write advanced configuration |
| Line Items | `commitments:write` | CRUD on SOV line items |
| Import Line Items | `commitments:write` | Import from budget |

### Privacy Filtering

Private commitments (`is_private: true`) are only visible to:

- Commitment creator
- Project administrators
- Users explicitly granted access via `non_admin_user_ids`
- Users in the commitment's company (if applicable)

## Error Codes and Handling

### Standard HTTP Status Codes

| Code | Meaning | Common Scenarios |
|------|---------|------------------|
| 200 | OK | Successful GET/PUT operations |
| 201 | Created | Successful POST operations |
| 400 | Bad Request | Invalid request data, validation errors |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Commitment doesn't exist |
| 409 | Conflict | Duplicate contract number, concurrent edit |
| 413 | Payload Too Large | Attachment file size exceeded |
| 422 | Unprocessable Entity | Business rule violations |
| 500 | Internal Server Error | Server-side errors |

### Error Response Format

```typescript
interface ErrorResponse {
  error: string; // Error code (SNAKE_CASE)
  message: string; // Human-readable message
  details?: Record<string, any>; // Additional error context
  timestamp: string;
  path: string;
  method: string;
}
```markdown
### Common Error Codes

```typescript
const ErrorCodes = {
  // Validation errors
  'INVALID_PARAMETERS': 'Request parameters are invalid',
  'REQUIRED_FIELD_MISSING': 'Required field is missing',
  'INVALID_FORMAT': 'Field format is invalid',
  'VALUE_OUT_OF_RANGE': 'Field value is outside allowed range',

  // Business logic errors
  'DUPLICATE_CONTRACT_NUMBER': 'Contract number already exists',
  'INVALID_STATUS_TRANSITION': 'Cannot change status from X to Y',
  'INSUFFICIENT_BUDGET': 'Commitment amount exceeds available budget',
  'COMPANY_NOT_ACTIVE': 'Selected company is not active',

  // Permission errors
  'INSUFFICIENT_PERMISSIONS': 'User lacks required permissions',
  'PRIVATE_COMMITMENT': 'Commitment is private and user has no access',
  'PROJECT_ACCESS_DENIED': 'User does not have access to this project',

  // Resource errors
  'COMMITMENT_NOT_FOUND': 'Commitment does not exist',
  'ATTACHMENT_NOT_FOUND': 'Attachment file does not exist',
  'BUDGET_CODE_NOT_FOUND': 'Budget code does not exist',
  'COMPANY_NOT_FOUND': 'Company does not exist',

  // File upload errors
  'FILE_TOO_LARGE': 'File size exceeds maximum allowed',
  'INVALID_FILE_TYPE': 'File type is not supported',
  'UPLOAD_FAILED': 'File upload failed',
  'STORAGE_QUOTA_EXCEEDED': 'Storage quota exceeded',

  // Concurrency errors
  'CONCURRENT_MODIFICATION': 'Commitment was modified by another user',
  'OPTIMISTIC_LOCK_FAILED': 'Version conflict detected',

  // Integration errors
  'BUDGET_SYNC_FAILED': 'Failed to sync with budget module',
  'ERP_INTEGRATION_ERROR': 'ERP system integration error'
};
```

## Rate Limiting

| Endpoint Pattern | Limit | Window | Notes |
|------------------|-------|--------|-------|
| `GET /api/commitments*` | 1000 requests | 1 hour | Read operations |
| `POST /api/commitments` | 100 requests | 1 hour | Create operations |
| `PUT /api/commitments/*` | 500 requests | 1 hour | Update operations |
| `DELETE /api/commitments/*` | 50 requests | 1 hour | Delete operations |
| `POST /api/commitments/*/attachments` | 200 requests | 1 hour | File uploads |
| `POST /api/commitments/*/export` | 50 requests | 1 hour | Export operations |
| `POST /api/commitments/*/email` | 20 requests | 1 hour | Email operations |
| `POST /api/commitments/*/approve` | 100 requests | 1 hour | Approval operations |
| `POST /api/projects/*/commitments/export` | 50 requests | 1 hour | Project export |
| `PUT /api/projects/*/line-items` | 200 requests | 1 hour | Line item updates |
| `POST /api/projects/*/line-items/import` | 50 requests | 1 hour | Budget import |

Rate limit headers included in responses:

- `X-RateLimit-Limit`: Request limit for time window
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Time when window resets (Unix timestamp)

## Example Requests/Responses

### Create Subcontract Example

```bash
curl -X POST https://api.alleato.com/api/commitments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "commitmentType": "subcontract",
    "title": "Foundation Work",
    "contractCompanyId": "456e7890-e89b-12d3-a456-426614174000",
    "originalContractAmount": 100000,
    "defaultRetainagePercent": 10,
    "startDate": "2024-02-01",
    "sovItems": [
      {
        "lineNumber": 1,
        "budgetCodeId": "789e0123-e89b-12d3-a456-426614174000",
        "description": "Excavation",
        "amount": 50000
      }
    ]
  }'
```markdown
### Upload Attachment Example

```bash
curl -X POST https://api.alleato.com/api/commitments/123/attachments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "files=@contract.pdf" \
  -F "files=@specifications.docx" \
  -F "descriptions=Contract document" \
  -F "descriptions=Technical specifications"
```

This comprehensive API specification provides all the information needed to implement and integrate with the Commitments API endpoints.
