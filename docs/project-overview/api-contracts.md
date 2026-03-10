# Alleato-Procore API Contracts Documentation

## Overview

The Alleato-Procore platform exposes a comprehensive REST API surface built on Next.js 15 App Router API routes with Supabase as the backend database and authentication provider.

**Key Statistics:**
- 196 API route files
- 326+ HTTP method handlers
- All project-scoped routes follow the pattern: `/api/projects/[projectId]/<resource>/route.ts`

**Authentication:**
- Primary: Supabase server client (`createClient()` from `@/lib/supabase/server`)
- Token-based: Bearer token from `Authorization` header for external integrations
- Service client: Bypasses RLS for admin operations

**Shared Utilities:**
- `apiErrorResponse()` for consistent error formatting
- Zod schema validation on request bodies
- Auth guards on all protected endpoints

**Pagination (standard query params):**
- `page` — page number (1-indexed)
- `limit` or `per_page` — items per page
- `sort` — column to sort by
- `order` — `asc` or `desc`
- `search` — full-text search term

**Multi-View Support:**
- `view=hierarchy` — tree/nested structure
- `view=gantt` — Gantt chart data format
- `view=summary` — aggregated summary
- `view=summary-by-cost-code` — grouped by cost code

**Bulk Operations:**
- `/bulk` — batch create/update/delete
- `/import` — import from Excel/CSV
- `/export` — export to Excel/CSV

**Workflow Actions:**
- `/approve` — approve a pending item
- `/reject` — reject a pending item
- `/submit` — submit for review
- `/restore` — restore a soft-deleted item
- `/deactivate` — soft-deactivate
- `/reactivate` — reactivate a deactivated item

---

## Endpoints by Domain

---

### Auth & Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register a new user account |
| GET | `/api/auth/admin-check` | Check if current user has admin privileges |
| POST | `/api/auth/post-login-redirect` | Determine redirect URL after successful login |
| POST | `/api/admin/set-admin-status` | Set or revoke admin status for a user |
| POST | `/api/dev/make-admin` | Dev tool: promote user to admin |
| GET | `/api/dev/schema` | Dev tool: retrieve database schema information |
| POST | `/api/dev/schema` | Dev tool: execute schema operations |

---

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects accessible to the current user |
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects/bootstrap` | Bootstrap data for project initialization |
| GET | `/api/projects/[projectId]` | Get project details by ID |
| PATCH | `/api/projects/[projectId]` | Update project details |
| GET | `/api/projects/[projectId]/checklist` | Get project setup checklist status |
| GET | `/api/projects/[projectId]/employees` | List employees assigned to project |

---

### Budget

**Core Budget Operations (50+ endpoints)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/budget` | Get budget overview with line items |
| POST | `/api/projects/[projectId]/budget` | Create budget line items |
| GET | `/api/projects/[projectId]/budget/details` | Get detailed budget breakdown |
| GET | `/api/projects/[projectId]/budget/history` | Get budget change history |
| GET | `/api/projects/[projectId]/budget/forecast` | Get budget forecast data |
| GET | `/api/projects/[projectId]/budget/export` | Export budget to Excel/CSV |
| POST | `/api/projects/[projectId]/budget/import` | Import budget from Excel/CSV |
| GET | `/api/projects/[projectId]/budget/lock` | Get budget lock status |
| POST | `/api/projects/[projectId]/budget/lock` | Lock the budget |
| PATCH | `/api/projects/[projectId]/budget/lock` | Update budget lock settings |
| GET | `/api/projects/[projectId]/budget/direct-costs` | Get direct costs linked to budget |

**Budget Line Items**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/budget/lines/[lineId]` | Get a specific budget line item |
| PATCH | `/api/projects/[projectId]/budget/lines/[lineId]` | Update a budget line item |
| DELETE | `/api/projects/[projectId]/budget/lines/[lineId]` | Delete a budget line item |
| GET | `/api/projects/[projectId]/budget/lines/[lineId]/history` | Get change history for a line item |

**Budget Views**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/budget/views` | List saved budget views |
| POST | `/api/projects/[projectId]/budget/views` | Create a new budget view |
| GET | `/api/projects/[projectId]/budget/views/[viewId]` | Get a specific budget view |
| PUT | `/api/projects/[projectId]/budget/views/[viewId]` | Update a budget view |
| DELETE | `/api/projects/[projectId]/budget/views/[viewId]` | Delete a budget view |
| POST | `/api/projects/[projectId]/budget/views/[viewId]/clone` | Clone a budget view |

**Budget Codes**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/budget-codes` | List budget codes for the project |
| POST | `/api/projects/[projectId]/budget-codes` | Create a new budget code |

**Budget Modifications**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/budget/modifications` | List budget modifications |
| POST | `/api/projects/[projectId]/budget/modifications` | Create a budget modification |
| GET | `/api/projects/[projectId]/budget/modifications/[modificationId]` | Get a specific modification |
| PUT | `/api/projects/[projectId]/budget/modifications/[modificationId]` | Update a modification |
| DELETE | `/api/projects/[projectId]/budget/modifications/[modificationId]` | Delete a modification |

**Budget Snapshots**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/budget/snapshots` | List budget snapshots |
| POST | `/api/projects/[projectId]/budget/snapshots` | Create a budget snapshot |

---

### Contracts & Commitments

**Contracts (55+ endpoints)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/contracts` | List contracts for the project |
| POST | `/api/projects/[projectId]/contracts` | Create a new contract |
| GET | `/api/projects/[projectId]/contracts/[contractId]` | Get contract details |
| PUT | `/api/projects/[projectId]/contracts/[contractId]` | Update a contract |
| DELETE | `/api/projects/[projectId]/contracts/[contractId]` | Delete a contract |

**Contract Line Items**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/contracts/[contractId]/line-items` | List contract line items |
| POST | `/api/projects/[projectId]/contracts/[contractId]/line-items` | Create a line item |
| GET | `/api/projects/[projectId]/contracts/[contractId]/line-items/[lineItemId]` | Get a specific line item |
| PUT | `/api/projects/[projectId]/contracts/[contractId]/line-items/[lineItemId]` | Update a line item |
| DELETE | `/api/projects/[projectId]/contracts/[contractId]/line-items/[lineItemId]` | Delete a line item |
| POST | `/api/projects/[projectId]/contracts/[contractId]/line-items/import` | Import line items from file |

**Contract Change Orders**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/contracts/[contractId]/change-orders` | List change orders for a contract |
| POST | `/api/projects/[projectId]/contracts/[contractId]/change-orders` | Create a change order |
| GET | `/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]` | Get change order details |
| PUT | `/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]` | Update a change order |
| DELETE | `/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]` | Delete a change order |
| POST | `/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve` | Approve a change order |
| POST | `/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/reject` | Reject a change order |

**Commitments (Legacy & Current)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/commitments` | List commitments (legacy endpoint) |
| POST | `/api/projects/[projectId]/commitments` | Create a commitment |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]` | Get commitment details |
| PUT | `/api/projects/[projectId]/commitments/[commitmentId]` | Update a commitment |
| DELETE | `/api/projects/[projectId]/commitments/[commitmentId]` | Delete a commitment |
| POST | `/api/projects/[projectId]/commitments/[commitmentId]/restore` | Restore a deleted commitment |
| DELETE | `/api/projects/[projectId]/commitments/[commitmentId]/permanent-delete` | Permanently delete a commitment |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/attachments` | List commitment attachments |
| POST | `/api/projects/[projectId]/commitments/[commitmentId]/attachments` | Upload attachment |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/email` | Get email trail for commitment |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/export` | Export commitment to file |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/invoices` | List invoices for commitment |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/advanced-settings` | Get advanced settings |
| PUT | `/api/projects/[projectId]/commitments/[commitmentId]/advanced-settings` | Update advanced settings |

**Commitment Change Orders**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/change-orders` | List commitment change orders |
| POST | `/api/projects/[projectId]/commitments/[commitmentId]/change-orders` | Create a commitment change order |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/change-orders/[changeOrderId]` | Get change order details |
| PUT | `/api/projects/[projectId]/commitments/[commitmentId]/change-orders/[changeOrderId]` | Update a change order |
| DELETE | `/api/projects/[projectId]/commitments/[commitmentId]/change-orders/[changeOrderId]` | Delete a change order |

**Commitment Line Items**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/line-items` | List commitment line items |
| POST | `/api/projects/[projectId]/commitments/[commitmentId]/line-items` | Create a line item |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/line-items/[lineItemId]` | Get a specific line item |
| PUT | `/api/projects/[projectId]/commitments/[commitmentId]/line-items/[lineItemId]` | Update a line item |
| DELETE | `/api/projects/[projectId]/commitments/[commitmentId]/line-items/[lineItemId]` | Delete a line item |

**Subcontracts & Purchase Orders**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/subcontracts` | List subcontracts |
| POST | `/api/projects/[projectId]/subcontracts` | Create a subcontract |
| GET | `/api/projects/[projectId]/purchase-orders` | List purchase orders |
| POST | `/api/projects/[projectId]/purchase-orders` | Create a purchase order |

---

### Change Events

**Core Change Events (30+ endpoints)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/change-events` | List change events (paginated) |
| POST | `/api/projects/[projectId]/change-events` | Create a change event |
| GET | `/api/projects/[projectId]/change-events/[changeEventId]` | Get change event details |
| PUT | `/api/projects/[projectId]/change-events/[changeEventId]` | Update a change event |
| DELETE | `/api/projects/[projectId]/change-events/[changeEventId]` | Delete a change event |
| GET | `/api/projects/[projectId]/change-events/[changeEventId]/history` | Get change event history |
| POST | `/api/projects/[projectId]/change-events/[changeEventId]/convert-to-change-order` | Convert event to a change order |

**Change Event Line Items**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/change-events/[changeEventId]/line-items` | List line items |
| POST | `/api/projects/[projectId]/change-events/[changeEventId]/line-items` | Create a line item |
| GET | `/api/projects/[projectId]/change-events/[changeEventId]/line-items/[lineItemId]` | Get a line item |
| PUT | `/api/projects/[projectId]/change-events/[changeEventId]/line-items/[lineItemId]` | Update a line item |
| DELETE | `/api/projects/[projectId]/change-events/[changeEventId]/line-items/[lineItemId]` | Delete a line item |

**Change Event Attachments**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/change-events/[changeEventId]/attachments` | List attachments |
| POST | `/api/projects/[projectId]/change-events/[changeEventId]/attachments` | Upload attachment |
| GET | `/api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId]/download` | Download attachment |
| DELETE | `/api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId]` | Delete attachment |

**Change Event Approvals**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/change-events/[changeEventId]/approvals` | List approvals |
| POST | `/api/projects/[projectId]/change-events/[changeEventId]/approvals` | Create/submit approval |

**Change Event RFQs**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/change-events/[changeEventId]/rfqs` | List RFQs |
| POST | `/api/projects/[projectId]/change-events/[changeEventId]/rfqs` | Create an RFQ |
| GET | `/api/projects/[projectId]/change-events/[changeEventId]/rfqs/[rfqId]` | Get RFQ details |
| PUT | `/api/projects/[projectId]/change-events/[changeEventId]/rfqs/[rfqId]` | Update an RFQ |
| DELETE | `/api/projects/[projectId]/change-events/[changeEventId]/rfqs/[rfqId]` | Delete an RFQ |

**Change Event RFQ Responses**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/change-events/[changeEventId]/rfqs/[rfqId]/responses` | List RFQ responses |
| POST | `/api/projects/[projectId]/change-events/[changeEventId]/rfqs/[rfqId]/responses` | Submit an RFQ response |

---

### Change Orders

**Core Change Orders (25+ endpoints)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/change-orders` | List change orders |
| POST | `/api/projects/[projectId]/change-orders` | Create a change order |
| GET | `/api/projects/[projectId]/change-orders/[changeOrderId]` | Get change order details |
| PUT | `/api/projects/[projectId]/change-orders/[changeOrderId]` | Update a change order |
| PATCH | `/api/projects/[projectId]/change-orders/[changeOrderId]` | Partial update a change order |
| DELETE | `/api/projects/[projectId]/change-orders/[changeOrderId]` | Delete a change order |
| POST | `/api/projects/[projectId]/change-orders/[changeOrderId]/approve` | Approve a change order |
| POST | `/api/projects/[projectId]/change-orders/[changeOrderId]/reject` | Reject a change order |
| GET | `/api/projects/[projectId]/change-orders/export/csv` | Export change orders to CSV |

**Change Order Line Items**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/change-orders/[changeOrderId]/line-items` | List line items |
| POST | `/api/projects/[projectId]/change-orders/[changeOrderId]/line-items` | Create a line item |
| GET | `/api/projects/[projectId]/change-orders/[changeOrderId]/line-items/[lineItemId]` | Get a line item |
| PUT | `/api/projects/[projectId]/change-orders/[changeOrderId]/line-items/[lineItemId]` | Update a line item |
| DELETE | `/api/projects/[projectId]/change-orders/[changeOrderId]/line-items/[lineItemId]` | Delete a line item |

**Change Order Attachments**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/change-orders/[changeOrderId]/attachments` | List attachments |
| POST | `/api/projects/[projectId]/change-orders/[changeOrderId]/attachments` | Upload attachment |
| GET | `/api/projects/[projectId]/change-orders/[changeOrderId]/attachments/[attachmentId]/download` | Download attachment |
| DELETE | `/api/projects/[projectId]/change-orders/[changeOrderId]/attachments/[attachmentId]` | Delete attachment |

---

### Direct Costs

**Project-Scoped Direct Costs (15+ endpoints)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/direct-costs` | List direct costs (supports filtering, summary views) |
| POST | `/api/projects/[projectId]/direct-costs` | Create a direct cost |
| GET | `/api/projects/[projectId]/direct-costs/[costId]` | Get direct cost details |
| PUT | `/api/projects/[projectId]/direct-costs/[costId]` | Update a direct cost |
| DELETE | `/api/projects/[projectId]/direct-costs/[costId]` | Delete a direct cost |
| POST | `/api/projects/[projectId]/direct-costs/bulk` | Bulk create/update direct costs |
| GET | `/api/projects/[projectId]/direct-costs/export` | Export direct costs to file |

**Legacy Direct Costs (global scope)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/direct-costs` | List all direct costs (legacy) |
| POST | `/api/direct-costs` | Create a direct cost (legacy) |
| GET | `/api/direct-costs/[id]` | Get direct cost details (legacy) |
| PUT | `/api/direct-costs/[id]` | Update a direct cost (legacy) |
| DELETE | `/api/direct-costs/[id]` | Delete a direct cost (legacy) |

---

### Directory & People

**People (45+ endpoints)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/directory/people` | List people (filtering, grouping) |
| POST | `/api/projects/[projectId]/directory/people` | Add a person to the directory |
| GET | `/api/projects/[projectId]/directory/people/[personId]` | Get person details |
| PUT | `/api/projects/[projectId]/directory/people/[personId]` | Update person details |
| DELETE | `/api/projects/[projectId]/directory/people/[personId]` | Remove person from directory |
| POST | `/api/projects/[projectId]/directory/people/[personId]/invite` | Send invitation to person |
| POST | `/api/projects/[projectId]/directory/people/[personId]/reinvite` | Re-send invitation |
| POST | `/api/projects/[projectId]/directory/people/[personId]/resend-invite` | Resend invitation email |
| POST | `/api/projects/[projectId]/directory/people/[personId]/deactivate` | Deactivate a person |
| POST | `/api/projects/[projectId]/directory/people/[personId]/reactivate` | Reactivate a person |
| POST | `/api/projects/[projectId]/directory/people/bulk-invite` | Bulk invite people |
| POST | `/api/projects/[projectId]/directory/people/bulk-update` | Bulk update people |

**Person Settings**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/directory/people/[personId]/permissions` | Get person permissions |
| PUT | `/api/projects/[projectId]/directory/people/[personId]/permissions` | Update person permissions |
| GET | `/api/projects/[projectId]/directory/people/[personId]/email-notifications` | Get email notification settings |
| PUT | `/api/projects/[projectId]/directory/people/[personId]/email-notifications` | Update email notification settings |
| GET | `/api/projects/[projectId]/directory/people/[personId]/schedule-notifications` | Get schedule notification settings |
| PUT | `/api/projects/[projectId]/directory/people/[personId]/schedule-notifications` | Update schedule notification settings |
| GET | `/api/projects/[projectId]/directory/people/[personId]/profile-photo` | Get profile photo |
| POST | `/api/projects/[projectId]/directory/people/[personId]/profile-photo` | Upload profile photo |

**Companies**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/directory/companies` | List companies (project-scoped) |
| POST | `/api/projects/[projectId]/directory/companies` | Add a company |
| GET | `/api/projects/[projectId]/directory/companies/[companyId]` | Get company details |
| PUT | `/api/projects/[projectId]/directory/companies/[companyId]` | Update company details |
| DELETE | `/api/projects/[projectId]/directory/companies/[companyId]` | Remove company |
| GET | `/api/companies` | List companies (global scope) |
| POST | `/api/companies` | Create a company (global) |
| GET | `/api/companies/[companyId]` | Get company (global) |
| PUT | `/api/companies/[companyId]` | Update company (global) |
| DELETE | `/api/companies/[companyId]` | Delete company (global) |

**Groups**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/directory/groups` | List groups |
| POST | `/api/projects/[projectId]/directory/groups` | Create a group |
| GET | `/api/projects/[projectId]/directory/groups/[groupId]` | Get group details |
| PUT | `/api/projects/[projectId]/directory/groups/[groupId]` | Update a group |
| DELETE | `/api/projects/[projectId]/directory/groups/[groupId]` | Delete a group |
| GET | `/api/projects/[projectId]/directory/groups/[groupId]/members` | List group members |
| POST | `/api/projects/[projectId]/directory/groups/[groupId]/members` | Add members to group |
| DELETE | `/api/projects/[projectId]/directory/groups/[groupId]/members/[memberId]` | Remove member from group |
| POST | `/api/projects/[projectId]/directory/groups/[groupId]/bulk-add` | Bulk add users to group |

**Directory Utilities**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/directory/filters` | Get saved directory filters |
| POST | `/api/projects/[projectId]/directory/filters` | Save a directory filter |
| GET | `/api/projects/[projectId]/directory/preferences` | Get directory preferences |
| PUT | `/api/projects/[projectId]/directory/preferences` | Update directory preferences |
| GET | `/api/projects/[projectId]/directory/roles` | List available roles |
| GET | `/api/projects/[projectId]/directory/permissions` | Get directory permissions |
| GET | `/api/projects/[projectId]/directory/templates` | List directory templates |
| GET | `/api/projects/[projectId]/directory/activity` | Get directory activity log |
| POST | `/api/projects/[projectId]/directory/import` | Import directory entries |
| GET | `/api/projects/[projectId]/directory/export` | Export directory to file |

---

### Drawings

**Core Drawings (15+ endpoints)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/drawings` | List drawings |
| POST | `/api/projects/[projectId]/drawings` | Upload/create a drawing |
| GET | `/api/projects/[projectId]/drawings/[drawingId]` | Get drawing details |
| PUT | `/api/projects/[projectId]/drawings/[drawingId]` | Update a drawing |
| DELETE | `/api/projects/[projectId]/drawings/[drawingId]` | Delete a drawing |

**Drawing Revisions**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/drawings/[drawingId]/revisions` | List revisions |
| POST | `/api/projects/[projectId]/drawings/[drawingId]/revisions` | Upload new revision |
| GET | `/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]` | Get revision details |
| GET | `/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/download` | Download revision file |

**Drawing Areas**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/drawings/areas` | List drawing areas |
| POST | `/api/projects/[projectId]/drawings/areas` | Create a drawing area |
| GET | `/api/projects/[projectId]/drawings/areas/[areaId]` | Get area details |
| PUT | `/api/projects/[projectId]/drawings/areas/[areaId]` | Update an area |
| DELETE | `/api/projects/[projectId]/drawings/areas/[areaId]` | Delete an area |

**Drawing Sets**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/drawings/sets` | List drawing sets |
| POST | `/api/projects/[projectId]/drawings/sets` | Create a drawing set |
| GET | `/api/projects/[projectId]/drawings/sets/[setId]` | Get set details |
| PUT | `/api/projects/[projectId]/drawings/sets/[setId]` | Update a set |
| DELETE | `/api/projects/[projectId]/drawings/sets/[setId]` | Delete a set |

---

### Specifications

**Core Specifications (15+ endpoints)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/specifications` | List specification sections |
| POST | `/api/projects/[projectId]/specifications` | Create a specification section |
| GET | `/api/projects/[projectId]/specifications/[sectionId]` | Get section details |
| PUT | `/api/projects/[projectId]/specifications/[sectionId]` | Update a section |
| DELETE | `/api/projects/[projectId]/specifications/[sectionId]` | Delete a section |

**Specification Revisions**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/specifications/[sectionId]/revisions` | List revisions |
| POST | `/api/projects/[projectId]/specifications/[sectionId]/revisions` | Upload new revision |
| GET | `/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]` | Get revision details |
| GET | `/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]/download` | Download revision file |

**Specification Areas**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/specifications/areas` | List specification areas |
| POST | `/api/projects/[projectId]/specifications/areas` | Create an area |
| GET | `/api/projects/[projectId]/specifications/areas/[areaId]` | Get area details |
| PUT | `/api/projects/[projectId]/specifications/areas/[areaId]` | Update an area |
| DELETE | `/api/projects/[projectId]/specifications/areas/[areaId]` | Delete an area |

---

### Scheduling

**Schedule Tasks (10+ endpoints)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/scheduling/tasks` | List tasks (supports `view=hierarchy\|gantt\|summary`) |
| POST | `/api/projects/[projectId]/scheduling/tasks` | Create a schedule task |
| GET | `/api/projects/[projectId]/scheduling/tasks/[taskId]` | Get task details |
| PUT | `/api/projects/[projectId]/scheduling/tasks/[taskId]` | Update a task |
| DELETE | `/api/projects/[projectId]/scheduling/tasks/[taskId]` | Delete a task |
| POST | `/api/projects/[projectId]/scheduling/tasks/bulk` | Bulk create/update tasks |
| POST | `/api/projects/[projectId]/scheduling/tasks/import` | Import tasks from file |

---

### Punch Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/punch-items` | List punch items |
| POST | `/api/projects/[projectId]/punch-items` | Create a punch item |
| GET | `/api/projects/[projectId]/punch-items/[punchItemId]` | Get punch item details |
| PUT | `/api/projects/[projectId]/punch-items/[punchItemId]` | Update a punch item |
| DELETE | `/api/projects/[projectId]/punch-items/[punchItemId]` | Delete a punch item |

---

### Meetings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/meetings` | List meetings |
| POST | `/api/projects/[projectId]/meetings` | Create a meeting |
| GET | `/api/projects/[projectId]/meetings/[meetingId]` | Get meeting details |
| PUT | `/api/projects/[projectId]/meetings/[meetingId]` | Update a meeting |
| DELETE | `/api/projects/[projectId]/meetings/[meetingId]` | Delete a meeting |

---

### Permissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/permissions` | Get project permissions matrix |
| POST | `/api/projects/[projectId]/permissions/assign` | Assign permissions to a user |
| POST | `/api/projects/[projectId]/permissions/override` | Create a permission override |
| DELETE | `/api/projects/[projectId]/permissions/override` | Remove a permission override |
| GET | `/api/permissions/templates` | List permission templates |

---

### Invoicing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/invoicing/owner` | Get owner invoicing data |
| GET | `/api/projects/[projectId]/invoicing/[invoiceId]` | Get invoice details |
| PUT | `/api/projects/[projectId]/invoicing/[invoiceId]` | Update an invoice |
| POST | `/api/projects/[projectId]/invoicing/[invoiceId]/submit` | Submit invoice for approval |
| POST | `/api/projects/[projectId]/invoicing/[invoiceId]/approve` | Approve an invoice |

**Legacy Invoices**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices (legacy) |
| POST | `/api/invoices` | Create an invoice (legacy) |

---

### Vertical Markup

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/vertical-markup` | List vertical markup entries |
| POST | `/api/projects/[projectId]/vertical-markup` | Create a vertical markup entry |
| GET | `/api/projects/[projectId]/vertical-markup/[markupId]` | Get markup details |
| PUT | `/api/projects/[projectId]/vertical-markup/[markupId]` | Update a markup entry |
| DELETE | `/api/projects/[projectId]/vertical-markup/[markupId]` | Delete a markup entry |
| POST | `/api/projects/[projectId]/vertical-markup/calculate` | Calculate vertical markup |

---

### RFIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rfis` | List RFIs |
| POST | `/api/rfis` | Create an RFI |
| GET | `/api/rfis/[rfiId]` | Get RFI details |
| PUT | `/api/rfis/[rfiId]` | Update an RFI |
| DELETE | `/api/rfis/[rfiId]` | Delete an RFI |

---

### Utilities

**Dev Tools**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/dev/check-routes` | Check for route conflicts |
| POST | `/api/dev/clear-cache` | Clear Next.js cache |
| POST | `/api/dev/regenerate-types` | Regenerate Supabase types |

**Health & Monitoring**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check endpoint |
| GET | `/api/monitoring` | Application monitoring data |
| GET | `/api/websocket` | WebSocket connection endpoint |

**Search & AI**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/docs-search` | Search documentation |
| POST | `/api/rag-chat` | RAG-powered chat endpoint |
| POST | `/api/rag-chatkit` | RAG ChatKit endpoint |

**Table Operations (Admin)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/table-metadata` | Get metadata for a table |
| POST | `/api/table-insert` | Insert a row into a table |
| POST | `/api/table-update` | Update a row in a table |
| POST | `/api/table-delete` | Delete a row from a table |

**File & Document Operations**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/file-read` | Read a file from storage |
| GET | `/api/document/status` | Get document processing status |
| POST | `/api/document/trigger-pipeline` | Trigger document processing pipeline |

**Integration & Todo**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/todo-integration` | Get todo integration status |
| POST | `/api/todo-integration` | Create/update todo integration |

**OG & Proxy**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/og/fetch` | Fetch Open Graph metadata |
| GET | `/api/og/proxy` | Proxy Open Graph images |
| ALL | `/api/supabase-proxy/[...path]` | Proxy requests to Supabase (catch-all) |

**Tool Calling**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/primitives/tool-calling` | Execute a tool call (primitives) |
| POST | `/api/tool-calling` | Execute a tool call |

---

## Authentication Patterns

### 1. Primary: Supabase Server Client (Most Common)

```typescript
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user) {
    return apiErrorResponse("Unauthorized", 401);
  }

  // Proceed with authenticated request...
}
```

### 2. Token-Based: Bearer Token from Authorization Header

```typescript
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return apiErrorResponse("Missing authorization token", 401);
  }

  // Validate token and proceed...
}
```

### 3. Service Client: Bypasses RLS for Admin Operations

```typescript
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  // Verify admin first via regular client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Use service client for admin-level operations
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("users")
    .update({ is_admin: true })
    .eq("id", targetUserId);
}
```

---

## Common Patterns

### Pagination

All list endpoints accept standard pagination query parameters:

```
GET /api/projects/[projectId]/resource?page=1&limit=25&sort=created_at&order=desc&search=query
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` / `per_page` | number | 25 | Items per page |
| `sort` | string | `created_at` | Column to sort by |
| `order` | string | `desc` | Sort direction (`asc` or `desc`) |
| `search` | string | — | Full-text search query |

Response format:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 150,
    "totalPages": 6
  }
}
```

### Multi-View Support

Certain endpoints support different data views via the `view` query parameter:

```
GET /api/projects/[projectId]/scheduling/tasks?view=hierarchy
GET /api/projects/[projectId]/scheduling/tasks?view=gantt
GET /api/projects/[projectId]/budget?view=summary
GET /api/projects/[projectId]/budget?view=summary-by-cost-code
```

### Bulk Operations

```
POST /api/projects/[projectId]/resource/bulk
POST /api/projects/[projectId]/resource/import
GET  /api/projects/[projectId]/resource/export
```

- **Bulk:** JSON array of items to create/update/delete in a single request
- **Import:** Accepts `multipart/form-data` with Excel (.xlsx) or CSV file
- **Export:** Returns downloadable file with naming pattern `{ProjectName}-{Resource}-{Date}.xlsx`

### Workflow Actions

```
POST /api/projects/[projectId]/resource/[resourceId]/approve
POST /api/projects/[projectId]/resource/[resourceId]/reject
POST /api/projects/[projectId]/resource/[resourceId]/submit
POST /api/projects/[projectId]/resource/[resourceId]/restore
POST /api/projects/[projectId]/resource/[resourceId]/deactivate
POST /api/projects/[projectId]/resource/[resourceId]/reactivate
```

### File Uploads

File uploads use `multipart/form-data` and are stored in Supabase Storage:

```typescript
// Client-side
const formData = new FormData();
formData.append("file", file);
formData.append("description", "Attachment description");

const response = await fetch(
  `/api/projects/${projectId}/resource/${resourceId}/attachments`,
  { method: "POST", body: formData }
);
```

### Error Response Format

All API errors use the `apiErrorResponse()` utility for consistent formatting:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

Common HTTP status codes:
- `400` — Bad Request (validation failure)
- `401` — Unauthorized (not authenticated)
- `403` — Forbidden (insufficient permissions)
- `404` — Not Found (resource does not exist)
- `409` — Conflict (duplicate or constraint violation)
- `422` — Unprocessable Entity (business logic violation)
- `500` — Internal Server Error

### Zod Validation

Request bodies are validated using Zod schemas before processing:

```typescript
import { z } from "zod";

const createResourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createResourceSchema.safeParse(body);

  if (!parsed.success) {
    return apiErrorResponse(parsed.error.flatten(), 400);
  }

  // Use parsed.data for type-safe access...
}
```

---

_Generated using BMAD Method document-project workflow_
