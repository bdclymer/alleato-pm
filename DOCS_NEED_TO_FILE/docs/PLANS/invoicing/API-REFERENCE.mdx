# Invoicing API Reference

## Base URL Pattern
All routes follow: `/api/projects/[projectId]/invoicing/...`

---

## Owner Invoices

### List Owner Invoices
```
GET /api/projects/[projectId]/invoicing/owner
```

**Query Parameters:**
- `status` (optional): Filter by status (draft, submitted, approved)
- `contract_id` (optional): Filter by specific contract

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "contract_id": 123,
      "invoice_number": "INV-001",
      "period_start": "2024-01-01",
      "period_end": "2024-01-31",
      "status": "draft",
      "submitted_at": null,
      "approved_at": null,
      "billing_period_id": "uuid",
      "created_at": "2024-01-15T10:00:00Z",
      "owner_invoice_line_items": [
        {
          "id": 1,
          "description": "Labor",
          "category": "Work",
          "approved_amount": 5000.00
        }
      ],
      "total_amount": 5000.00
    }
  ]
}
```

### Create Owner Invoice
```
POST /api/projects/[projectId]/invoicing/owner
```

**Request Body:**
```json
{
  "contract_id": 123,
  "invoice_number": "INV-001",
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "status": "draft",
  "billing_period_id": "uuid",
  "line_items": [
    {
      "description": "Labor",
      "category": "Work",
      "approved_amount": 5000.00
    }
  ]
}
```

**Response:** 201 Created
```json
{
  "data": { /* complete invoice with line items */ }
}
```

### Get Invoice Details
```
GET /api/projects/[projectId]/invoicing/owner/[invoiceId]
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "contract_id": 123,
    "invoice_number": "INV-001",
    "period_start": "2024-01-01",
    "period_end": "2024-01-31",
    "status": "draft",
    "owner_invoice_line_items": [ /* line items */ ],
    "total_amount": 5000.00
  }
}
```

### Update Invoice
```
PUT /api/projects/[projectId]/invoicing/owner/[invoiceId]
```

**Request Body:**
```json
{
  "invoice_number": "INV-001-UPDATED",
  "status": "draft",
  "line_items": [ /* updated line items */ ]
}
```

**Response:**
```json
{
  "data": { /* updated invoice */ }
}
```

### Delete Invoice
```
DELETE /api/projects/[projectId]/invoicing/owner/[invoiceId]
```

**Response:**
```json
{
  "message": "Invoice deleted successfully"
}
```

**Restrictions:**
- Cannot delete invoices with status "approved"

### Submit Invoice
```
POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/submit
```

**Response:**
```json
{
  "data": { /* updated invoice with status=submitted */ },
  "message": "Invoice submitted successfully"
}
```

**Requirements:**
- Invoice must have status "draft"

### Approve Invoice
```
POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/approve
```

**Response:**
```json
{
  "data": { /* updated invoice with status=approved */ },
  "message": "Invoice approved successfully"
}
```

**Requirements:**
- Invoice must have status "submitted"

---

## Billing Periods

### List Billing Periods
```
GET /api/projects/[projectId]/invoicing/billing-periods
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "project_id": 123,
      "period_number": 1,
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "is_closed": false,
      "closed_date": null,
      "closed_by": null,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Billing Period
```
POST /api/projects/[projectId]/invoicing/billing-periods
```

**Request Body:**
```json
{
  "period_number": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "is_closed": false
}
```

**Response:** 201 Created
```json
{
  "data": { /* created billing period */ }
}
```

**Validations:**
- Start date must be before end date
- Cannot overlap with existing periods

### Get Billing Period
```
GET /api/projects/[projectId]/invoicing/billing-periods/[periodId]
```

**Response:**
```json
{
  "data": { /* billing period details */ }
}
```

### Update Billing Period
```
PUT /api/projects/[projectId]/invoicing/billing-periods/[periodId]
```

**Request Body:**
```json
{
  "period_number": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-02-01",
  "is_closed": true,
  "closed_date": "2024-02-01",
  "closed_by": "user-uuid"
}
```

**Response:**
```json
{
  "data": { /* updated billing period */ }
}
```

### Delete Billing Period
```
DELETE /api/projects/[projectId]/invoicing/billing-periods/[periodId]
```

**Response:**
```json
{
  "message": "Billing period deleted successfully"
}
```

**Restrictions:**
- Cannot delete closed periods
- Cannot delete periods with associated invoices

---

## Invoicing Summary

### Get Invoicing Summary
```
GET /api/projects/[projectId]/invoicing
```

**Response:**
```json
{
  "data": {
    "owner_invoices": [ /* all owner invoices with totals */ ],
    "subcontractor_invoices": [],
    "billing_periods": [ /* all billing periods */ ],
    "summary": {
      "owner": {
        "total": 5,
        "draft": 2,
        "submitted": 1,
        "approved": 2,
        "total_amount": 50000.00
      },
      "subcontractor": {
        "total": 0,
        "pending": 0,
        "approved": 0,
        "paid": 0,
        "total_amount": 0
      }
    }
  }
}
```

---

## Subcontractor Invoices (Not Implemented)

All subcontractor endpoints return `501 Not Implemented`:

- `GET /api/projects/[projectId]/invoicing/subcontractor`
- `POST /api/projects/[projectId]/invoicing/subcontractor`
- `GET /api/projects/[projectId]/invoicing/subcontractor/[invoiceId]`
- `PUT /api/projects/[projectId]/invoicing/subcontractor/[invoiceId]`
- `DELETE /api/projects/[projectId]/invoicing/subcontractor/[invoiceId]`
- `POST /api/projects/[projectId]/invoicing/subcontractor/[invoiceId]/approve`
- `POST /api/projects/[projectId]/invoicing/subcontractor/[invoiceId]/pay`

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

### 501 Not Implemented
```json
{
  "error": "Subcontractor invoices feature not yet implemented"
}
```

---

## Status Workflow

### Owner Invoice Status
```
draft → submitted → approved
```

- **draft**: Initial state, editable
- **submitted**: Submitted for approval, cannot edit
- **approved**: Approved, cannot edit or delete

### Billing Period Status
```
open → closed
```

- **open**: Active period (is_closed = false)
- **closed**: Locked period (is_closed = true, has closed_date and closed_by)

---

## Notes

1. All invoice amounts are calculated from line items, not stored
2. Project ownership is validated on all routes
3. Line items are created/updated atomically with invoices
4. Billing period overlap validation prevents conflicts
5. Status transitions are enforced by business logic
