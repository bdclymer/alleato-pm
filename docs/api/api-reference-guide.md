# Alleato PM API Reference Guide

## Overview

The Alleato PM API is a comprehensive REST API for construction project management built with Next.js 15 and Supabase. This guide provides complete documentation for all available endpoints.

## Base URL

- **Production**: `https://alleato-pm.vercel.app/api`
- **Development**: `http://localhost:3000/api`

## Authentication

All API endpoints require authentication via Supabase Auth. Include the bearer token in the Authorization header:

```http
Authorization: Bearer <supabase_access_token>
```
## Error Responses

All errors return a consistent JSON structure:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": "Additional error context (optional)"
}
```
Common HTTP status codes:

- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource does not exist)
- `500` - Internal Server Error

## Pagination

List endpoints support pagination with these query parameters:

- `page` - Page number (1-indexed, default: 1)
- `limit` - Items per page (default: 50, max: 100)

Pagination responses include metadata:

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```
## Core API Endpoints

### System & Health

#### Health Check
```http
GET /health
```

Returns system health status and information.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-31T10:00:00Z",
  "version": "1.0.0",
  "uptime": 3600
}
```
---

## Projects API

### List Projects
```http
GET /projects
```
Retrieve a paginated list of projects accessible to the authenticated user.

**Query Parameters:**

- `page` (integer) - Page number
- `limit` (integer) - Items per page (max 100)
- `search` (string) - Search project names or job numbers
- `state` (string) - Filter by state: `active`, `planning`, `on_hold`, `completed`, `cancelled`
- `excludeState` (string) - Exclude projects with this state
- `archived` (boolean) - Filter by archived status

**Example:**

```http
GET /projects?page=1&limit=20&state=active&search=warehouse
```
**Response:**
```json
{
  "data": [
    {
      "id": 123,
      "name": "Downtown Warehouse",
      "job_number": "DW-2024-001",
      "state": "active",
      "budget": 2500000,
      "start_date": "2024-02-01",
      "estimated_completion_date": "2024-12-31",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Create Project

```http
POST /projects
```
Create a new construction project.

**Request Body:**
```json
{
  "name": "New Project",
  "job_number": "NP-2024-001",
  "description": "Project description",
  "address": "123 Main St, City, State",
  "state": "planning",
  "budget": 1500000,
  "start_date": "2024-03-01",
  "estimated_completion_date": "2024-10-31"
}
```
**Response:** `201 Created`

```json
{
  "id": 124,
  "name": "New Project",
  "job_number": "NP-2024-001",
  "state": "planning",
  "created_at": "2024-01-31T10:00:00Z"
}
```
### Get Project Details
```http
GET /projects/{projectId}
```

Retrieve detailed information about a specific project.

**Response:**

```json
{
  "id": 123,
  "name": "Downtown Warehouse",
  "job_number": "DW-2024-001",
  "description": "Modern warehouse facility",
  "address": "456 Industrial Blvd",
  "state": "active",
  "budget": 2500000,
  "budget_locked": false,
  "start_date": "2024-02-01",
  "estimated_completion_date": "2024-12-31",
  "team_members": [
    {
      "name": "John Smith",
      "role": "Project Manager",
      "email": "john@example.com"
    }
  ],
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-30T15:30:00Z"
}
```
### Update Project
```http
PATCH /projects/{projectId}
```
Update project information and settings.

**Request Body:** (partial update)

```json
{
  "state": "active",
  "budget": 2750000,
  "actual_completion_date": "2024-11-15"
}
```
---

## Directory API

### List Directory People
```http
GET /projects/{projectId}/directory/people
```

Retrieve people in the project directory with filtering and search.

**Query Parameters:**

- `search` (string) - Search names or email addresses
- `type` (string) - Filter by type: `user`, `contact`, `all`
- `status` (string) - Filter by status: `active`, `inactive`, `all`
- `company_id` (string) - Filter by company ID
- `permission_template_id` (string) - Filter by permission template
- `group_by` (string) - Group by: `company`, `none`
- `sort` (string) - Comma-separated sort fields
- `page`, `per_page` - Pagination

**Example:**

```http
GET /projects/123/directory/people?type=user&status=active&sort=last_name,first_name
```
**Response:**
```json
{
  "data": [
    {
      "id": "person-uuid",
      "first_name": "John",
      "last_name": "Smith",
      "email": "john@example.com",
      "phone": "+1-555-0123",
      "person_type": "user",
      "title": "Project Manager",
      "company_id": "company-uuid",
      "company_name": "ABC Construction",
      "status": "active",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 25,
    "totalPages": 1
  }
}
```
### Create Directory Person

```http
POST /projects/{projectId}/directory/people
```
Add a new person to the project directory.

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "phone": "+1-555-0456",
  "person_type": "user",
  "title": "Site Supervisor",
  "company_id": "company-uuid"
}
```

**Response:** `201 Created`

```json
{
  "id": "new-person-uuid",
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "person_type": "user",
  "status": "active",
  "created_at": "2024-01-31T10:00:00Z"
}
```
### Directory Person Management

#### Get Person Details
```http
GET /projects/{projectId}/directory/people/{personId}
```
#### Update Person

```http
PATCH /projects/{projectId}/directory/people/{personId}
```
#### Delete Person
```http
DELETE /projects/{projectId}/directory/people/{personId}
```

#### Person Actions

**Deactivate Person:**

```http
POST /projects/{projectId}/directory/people/{personId}/deactivate
```
**Reactivate Person:**
```http
POST /projects/{projectId}/directory/people/{personId}/reactivate
```
**Invite Person:**

```http
POST /projects/{projectId}/directory/people/{personId}/invite
```
**Resend Invite:**
```http
POST /projects/{projectId}/directory/people/{personId}/resend-invite
```

---

## Budget API

### Get Budget Data

```http
GET /projects/{projectId}/budget
```
Retrieve comprehensive budget data for a project, including line items and grand totals.

**Response:**
```json
{
  "lineItems": [
    {
      "id": "budget-line-uuid",
      "description": "Site Preparation",
      "costCode": "02200",
      "costCodeDescription": "Site Preparation",
      "costType": "Labor",
      "division": "02",
      "originalBudgetAmount": 150000,
      "budgetModifications": 5000,
      "approvedCOs": 2000,
      "revisedBudget": 157000,
      "committedCosts": 75000,
      "directCosts": 45000,
      "jobToDateCostDetail": 120000,
      "forecastToComplete": 30000,
      "projectedCosts": 150000,
      "projectedOverUnder": -7000
    }
  ],
  "grandTotals": {
    "originalBudgetAmount": 2500000,
    "budgetModifications": 50000,
    "approvedCOs": 25000,
    "revisedBudget": 2575000,
    "committedCosts": 1200000,
    "directCosts": 800000,
    "jobToDateCostDetail": 2000000,
    "forecastToComplete": 400000,
    "projectedCosts": 2400000,
    "projectedOverUnder": 175000
  }
}
```
### Create Budget Line Items

```http
POST /projects/{projectId}/budget
```
Create new budget line items or update existing ones.

**Request Body:**
```json
{
  "lineItems": [
    {
      "costCodeId": "02200",
      "costType": "Labor",
      "amount": 150000,
      "description": "Site Preparation - Labor",
      "qty": 100,
      "uom": "hours",
      "unitCost": 1500
    }
  ]
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": [
    {
      "id": "new-budget-line-uuid",
      "description": "Site Preparation - Labor"
    }
  ],
  "totalBudget": 150000,
  "message": "Successfully created 1 budget line(s)"
}
```
### Budget Views

#### List Budget Views
```http
GET /projects/{projectId}/budget/views
```
Get available budget views for customizing budget display.

**Response:**

```json
[
  {
    "id": "view-uuid",
    "project_id": "123",
    "name": "Standard View",
    "description": "Default budget view with all columns",
    "is_default": true,
    "columns": [
      {
        "id": "col-1",
        "field_name": "cost_code",
        "display_name": "Cost Code",
        "width": 120,
        "visible": true,
        "sort_order": 1
      }
    ],
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```
#### Create Budget View
```http
POST /projects/{projectId}/budget/views
```

#### Clone Budget View

```http
POST /projects/{projectId}/budget/views/{viewId}/clone
```
### Budget Operations

#### Lock Budget
```http
POST /projects/{projectId}/budget/lock
```
Lock the budget to prevent further modifications.

#### Get Budget History

```http
GET /projects/{projectId}/budget/history
```
#### Export Budget
```http
GET /projects/{projectId}/budget/export
```

Export budget data in Excel format.

---

## Change Events API

### List Change Events

```http
GET /projects/{projectId}/change-events
```
Retrieve change events for a project with filtering and pagination.

**Query Parameters:**
- `page`, `limit` - Pagination
- `status` (string) - Filter by status: `open`, `closed`, `void`
- `type` (string) - Filter by type
- `search` (string) - Search titles and descriptions
- `sortBy` (string) - Sort field
- `sortOrder` (string) - Sort direction: `asc`, `desc`

**Response:**
```json
{
  "data": [
    {
      "id": "change-event-uuid",
      "project_id": 123,
      "number": "001",
      "title": "Foundation Design Change",
      "type": "Design Change",
      "status": "open",
      "scope": "In Scope",
      "origin": "Field",
      "reason": "Soil conditions",
      "description": "Modify foundation design due to unexpected soil conditions",
      "expecting_revenue": true,
      "rom": "25000",
      "total": "23500",
      "lineItemsCount": 3,
      "created_at": "2024-01-20T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "totalPages": 1
  }
}
```
### Create Change Event

```http
POST /projects/{projectId}/change-events
```
Create a new change event.

**Request Body:**
```json
{
  "title": "Electrical Upgrade",
  "type": "Owner Change",
  "scope": "Out of Scope",
  "origin": "Internal",
  "reason": "Code compliance",
  "description": "Upgrade electrical system to meet new code requirements",
  "expecting_revenue": true,
  "line_item_revenue_source": "Change Order",
  "prime_contract_id": 456
}
```

### Change Event Details

```http
GET /projects/{projectId}/change-events/{changeEventId}
```
### Update Change Event
```http
PATCH /projects/{projectId}/change-events/{changeEventId}
```
### Change Event Line Items

#### List Line Items

```http
GET /projects/{projectId}/change-events/{changeEventId}/line-items
```
#### Create Line Item
```http
POST /projects/{projectId}/change-events/{changeEventId}/line-items
```

#### Update Line Item

```http
PATCH /projects/{projectId}/change-events/{changeEventId}/line-items/{lineItemId}
```
### Change Event Attachments

#### List Attachments
```http
GET /projects/{projectId}/change-events/{changeEventId}/attachments
```
#### Upload Attachment

```http
POST /projects/{projectId}/change-events/{changeEventId}/attachments
```
#### Download Attachment
```http
GET /projects/{projectId}/change-events/{changeEventId}/attachments/{attachmentId}/download
```

---

## Commitments API

### List Commitments

```http
GET /projects/{projectId}/commitments
```
### Create Commitment
```http
POST /projects/{projectId}/commitments
```
### Commitment Details

```http
GET /projects/{projectId}/commitments/{commitmentId}
```
### Commitment Line Items

#### Import Line Items
```http
POST /projects/{projectId}/commitments/{commitmentId}/line-items/import
```

---

## Contracts API

### List Contracts

```http
GET /projects/{projectId}/contracts
```
### Create Contract
```http
POST /projects/{projectId}/contracts
```
### Contract Details

```http
GET /projects/{projectId}/contracts/{contractId}
```
### Contract Change Orders

#### List Change Orders
```http
GET /projects/{projectId}/contracts/{contractId}/change-orders
```

#### Create Change Order

```http
POST /projects/{projectId}/contracts/{contractId}/change-orders
```
#### Approve Change Order
```http
POST /projects/{projectId}/contracts/{contractId}/change-orders/{changeOrderId}/approve
```
#### Reject Change Order

```http
POST /projects/{projectId}/contracts/{contractId}/change-orders/{changeOrderId}/reject
```
### Contract Line Items

#### List Line Items
```http
GET /projects/{projectId}/contracts/{contractId}/line-items
```

#### Import Line Items

```http
POST /projects/{projectId}/contracts/{contractId}/line-items/import
```
---

## Direct Costs API

### List Direct Costs
```http
GET /projects/{projectId}/direct-costs
```
Get direct costs for a project with filtering and pagination.

**Query Parameters:**

- `page`, `limit` - Pagination
- `status` (string) - Filter by status
- `cost_code` (string) - Filter by cost code
- `date_from`, `date_to` - Date range filter
- `search` (string) - Search descriptions

### Create Direct Cost

```http
POST /projects/{projectId}/direct-costs
```
### Bulk Operations

#### Bulk Create
```http
POST /projects/{projectId}/direct-costs/bulk
```

#### Export Direct Costs

```http
GET /projects/{projectId}/direct-costs/export
```
---

## Scheduling API

### List Tasks
```http
GET /projects/{projectId}/scheduling/tasks
```
### Create Task

```http
POST /projects/{projectId}/scheduling/tasks
```
### Bulk Task Operations

#### Bulk Create Tasks
```http
POST /projects/{projectId}/scheduling/tasks/bulk
```

#### Import Tasks

```http
POST /projects/{projectId}/scheduling/tasks/import
```
---

## Drawings API

### List Drawings
```http
GET /projects/{projectId}/drawings
```
### Create Drawing

```http
POST /projects/{projectId}/drawings
```
### Drawing Revisions

#### List Revisions
```http
GET /projects/{projectId}/drawings/{drawingId}/revisions
```

#### Download Revision

```http
GET /projects/{projectId}/drawings/{drawingId}/revisions/{revisionId}/download
```
---

## Authentication & Authorization

### User Authentication
All endpoints require valid Supabase authentication. The API uses Row Level Security (RLS) policies to enforce data access control.

### Permission System
- Project-level permissions for read/write access
- Role-based access control through permission templates
- Company-based access restrictions

### Error Handling

#### Common Error Patterns

**Unauthorized Access:**
```json
{
  "error": "Unauthorized",
  "code": "AUTH_REQUIRED"
}
```
**Insufficient Permissions:**

```json
{
  "error": "Forbidden",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```
**Validation Errors:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "name": ["Name is required"],
    "email": ["Email must be valid"]
  }
}
```

---

## Rate Limiting

- **Authenticated users**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour
- **Bulk operations**: 10 requests per minute

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1643649600
```
---

## SDKs and Tools

### Postman Collection
A comprehensive Postman collection is available with pre-configured requests and environment variables.

### TypeScript SDK
Type definitions are available in the project for full type safety:

```typescript
import type { Database } from '@/types/database.types'

type Project = Database['public']['Tables']['projects']['Row']
type CreateProjectRequest = Database['public']['Tables']['projects']['Insert']
```

---

## Support

For API support and questions:

- Email: <api-support@alleato.com>
- Documentation: Visit the full API documentation
- Status Page: Check system status and uptime

---

**Last Updated**: January 31, 2024
**API Version**: 1.0.0
