# Alleato-PM API Contracts Documentation

> Generated: 2026-03-22 (merged) | Source: `frontend/src/app/api/`

## Overview

The Alleato-PM platform exposes a comprehensive REST API surface built on Next.js 15 App Router API routes with Supabase as the backend database and authentication provider.

**Key Statistics:**
- 150+ API route files
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
- `page` -- page number (1-indexed)
- `limit` or `per_page` -- items per page
- `sort` -- column to sort by
- `order` -- `asc` or `desc`
- `search` -- full-text search term

**Multi-View Support:**
- `view=hierarchy` -- tree/nested structure
- `view=gantt` -- Gantt chart data format
- `view=summary` -- aggregated summary
- `view=summary-by-cost-code` -- grouped by cost code

**Bulk Operations:**
- `/bulk` -- batch create/update/delete
- `/import` -- import from Excel/CSV
- `/export` -- export to Excel/CSV

**Workflow Actions:**
- `/approve` -- approve a pending item
- `/reject` -- reject a pending item
- `/submit` -- submit for review
- `/restore` -- restore a soft-deleted item
- `/deactivate` -- soft-deactivate
- `/reactivate` -- reactivate a deactivated item

---

## Endpoints by Domain

---

### Auth & Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register a new user account |
| GET | `/api/auth/admin-check` | Check if current user has admin privileges |
| POST | `/api/auth/admin-check` | Check admin status (POST variant) |
| POST | `/api/auth/post-login-redirect` | Determine redirect URL after successful login |
| POST | `/api/admin/set-admin-status` | Set or revoke admin status for a user |
| GET/POST | `/api/admin/company-context` | Get/set company-wide context for AI |
| GET | `/api/knowledge` | List knowledge documents (reads from document_metadata WHERE category='knowledge') |
| DELETE | `/api/knowledge` | Delete a knowledge document by id |
| POST | `/api/knowledge/upload` | Upload a file to the knowledge base (writes to document_metadata + triggers ingestion) |
| POST | `/api/dev/make-admin` | Dev tool: promote user to admin |
| GET | `/api/dev/schema` | Dev tool: retrieve database schema information |
| POST | `/api/dev/schema` | Dev tool: execute schema operations |

Auth pattern: Supabase SSR session via `proxy.ts` -> `updateSession()`. All requests checked for valid Supabase JWT.

---

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects accessible to the current user |
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects/bootstrap` | Bootstrap data for project initialization |
| GET | `/api/projects/[projectId]` | Get project details by ID |
| PATCH | `/api/projects/[projectId]` | Update project details |
| DELETE | `/api/projects/[projectId]` | Delete a project |
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
| POST | `/api/projects/[projectId]/budget/export` | Export budget (POST variant) |
| POST | `/api/projects/[projectId]/budget/import` | Import budget from Excel/CSV |
| GET | `/api/projects/[projectId]/budget/lock` | Get budget lock status |
| POST | `/api/projects/[projectId]/budget/lock` | Lock the budget |
| PATCH | `/api/projects/[projectId]/budget/lock` | Update budget lock settings |
| GET | `/api/projects/[projectId]/budget/direct-costs` | Get direct costs linked to budget |

**Budget Line Items**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/budget/line-items` | List budget line items |
| POST | `/api/projects/[projectId]/budget/line-items` | Create a budget line item |
| GET | `/api/projects/[projectId]/budget/lines/[lineId]` | Get a specific budget line item |
| PATCH | `/api/projects/[projectId]/budget/line-items/[lineItemId]` | Update a budget line item |
| DELETE | `/api/projects/[projectId]/budget/line-items/[lineItemId]` | Delete a budget line item |
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

### Prime Contracts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/prime-contracts` | List prime contracts |
| POST | `/api/projects/[projectId]/prime-contracts` | Create a prime contract |
| GET | `/api/projects/[projectId]/prime-contracts/[contractId]` | Get prime contract details |
| PATCH | `/api/projects/[projectId]/prime-contracts/[contractId]` | Update a prime contract |
| DELETE | `/api/projects/[projectId]/prime-contracts/[contractId]` | Delete a prime contract |

**Prime Contract Change Orders (PCCOs)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/prime-contract-change-orders` | List PCCOs |
| POST | `/api/projects/[projectId]/prime-contract-change-orders` | Create a PCCO |
| GET | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]` | Get PCCO details |
| PATCH | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]` | Update a PCCO |
| DELETE | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]` | Delete a PCCO |
| POST | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/approve` | Approve PCCO |
| POST | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/reject` | Reject PCCO |
| GET | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments` | List attachments |
| POST | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments` | Upload attachment |
| DELETE | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments/[attachmentId]` | Delete attachment |
| GET | `/api/projects/[projectId]/prime-contract-change-orders/export` | Export PCCOs |

**Vertical Markup**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/vertical-markup` | List vertical markup entries |
| POST | `/api/projects/[projectId]/vertical-markup` | Create a vertical markup entry |
| GET | `/api/projects/[projectId]/vertical-markup/[markupId]` | Get markup details |
| PUT | `/api/projects/[projectId]/vertical-markup/[markupId]` | Update a markup entry |
| DELETE | `/api/projects/[projectId]/vertical-markup/[markupId]` | Delete a markup entry |
| POST | `/api/projects/[projectId]/vertical-markup/calculate` | Calculate vertical markup |

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

**Commitments**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/commitments` | List commitments (global) |
| POST | `/api/commitments` | Create a commitment |
| GET | `/api/commitments/[id]` | Get commitment details |
| PATCH | `/api/commitments/[id]` | Update a commitment |
| DELETE | `/api/commitments/[id]` | Delete a commitment |
| GET | `/api/projects/[projectId]/commitments` | List commitments (project-scoped) |
| POST | `/api/projects/[projectId]/commitments` | Create a commitment (project-scoped) |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]` | Get commitment details |
| PUT | `/api/projects/[projectId]/commitments/[commitmentId]` | Update a commitment |
| DELETE | `/api/projects/[projectId]/commitments/[commitmentId]` | Delete a commitment |
| POST | `/api/projects/[projectId]/commitments/[commitmentId]/restore` | Restore a deleted commitment |
| DELETE | `/api/projects/[projectId]/commitments/[commitmentId]/permanent-delete` | Permanently delete |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/attachments` | List attachments |
| POST | `/api/projects/[projectId]/commitments/[commitmentId]/attachments` | Upload attachment |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/email` | Get email trail |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/export` | Export commitment |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/invoices` | List invoices |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/advanced-settings` | Get advanced settings |
| PUT | `/api/projects/[projectId]/commitments/[commitmentId]/advanced-settings` | Update advanced settings |

**Commitment Change Orders**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/commitments/[id]/change-orders` | List commitment change orders (global) |
| POST | `/api/commitments/[id]/change-orders` | Create a CCO (global) |
| GET | `/api/commitments/[id]/change-orders/[changeOrderId]` | Get CCO details (global) |
| PATCH | `/api/commitments/[id]/change-orders/[changeOrderId]` | Update a CCO (global) |
| DELETE | `/api/commitments/[id]/change-orders/[changeOrderId]` | Delete a CCO (global) |
| POST | `/api/commitments/[id]/change-orders/[changeOrderId]/approve` | Approve CCO |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/change-orders` | List CCOs (project-scoped) |
| POST | `/api/projects/[projectId]/commitments/[commitmentId]/change-orders` | Create a CCO (project-scoped) |
| GET | `/api/projects/[projectId]/commitments/[commitmentId]/change-orders/[changeOrderId]` | Get CCO details |
| PUT | `/api/projects/[projectId]/commitments/[commitmentId]/change-orders/[changeOrderId]` | Update a CCO |
| DELETE | `/api/projects/[projectId]/commitments/[commitmentId]/change-orders/[changeOrderId]` | Delete a CCO |

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
| POST | `/api/projects/[projectId]/change-events/[changeEventId]/convert-to-change-order` | Convert to change order |

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
| POST | `/api/projects/[projectId]/change-events/[changeEventId]/approve` | Approve change event |

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

### Invoicing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices (global) |
| POST | `/api/invoices` | Create an invoice (global) |
| GET | `/api/projects/[projectId]/invoicing/owner` | Owner invoicing data (SOV-based) |
| POST | `/api/projects/[projectId]/invoicing/owner` | Create owner invoice |
| GET | `/api/projects/[projectId]/invoicing/owner/[invoiceId]` | Get invoice details |
| PATCH | `/api/projects/[projectId]/invoicing/owner/[invoiceId]` | Update an invoice |
| DELETE | `/api/projects/[projectId]/invoicing/owner/[invoiceId]` | Delete an invoice |
| POST | `/api/projects/[projectId]/invoicing/owner/[invoiceId]/submit` | Submit invoice for approval |
| POST | `/api/projects/[projectId]/invoicing/[invoiceId]/approve` | Approve an invoice |
| GET/POST | `/api/projects/[projectId]/billing-periods` | Billing periods |

**Commitment Invoices**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/commitments/[id]/invoices` | List commitment invoices |
| POST | `/api/commitments/[id]/invoices` | Create commitment invoice |

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
| POST | `/api/projects/[projectId]/directory/people/[personId]/invite` | Send invitation |
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
| GET | `/api/companies` | List companies (global) |
| POST | `/api/companies` | Create a company (global) |
| GET | `/api/companies/[companyId]` | Get company (global) |
| PUT | `/api/companies/[companyId]` | Update company (global) |
| DELETE | `/api/companies/[companyId]` | Delete company (global) |
| GET | `/api/directory/companies` | List directory companies |
| POST | `/api/directory/companies` | Create directory company |
| GET | `/api/directory/companies/[companyId]` | Get directory company details |
| PATCH | `/api/directory/companies/[companyId]` | Update directory company |
| DELETE | `/api/directory/companies/[companyId]` | Delete directory company |
| GET | `/api/directory/companies/[companyId]/details` | Detailed company info |
| POST | `/api/directory/companies/[companyId]/add-to-project` | Add company to project |
| GET/POST | `/api/directory/project-companies` | Project-company associations |
| GET/POST | `/api/contacts` | Contacts |
| GET/POST | `/api/people` | People directory |
| GET/POST | `/api/clients` | Client companies |

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
| DELETE | `/api/projects/[projectId]/directory/groups/[groupId]/members/[memberId]` | Remove member |
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
| POST | `/api/projects/[projectId]/drawings/upload` | Upload drawing file |

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
| GET | `/api/projects/[projectId]/drawing-areas` | List drawing areas |
| POST | `/api/projects/[projectId]/drawing-areas` | Create a drawing area |
| GET | `/api/projects/[projectId]/drawings/areas/[areaId]` | Get area details |
| PUT | `/api/projects/[projectId]/drawings/areas/[areaId]` | Update an area |
| DELETE | `/api/projects/[projectId]/drawings/areas/[areaId]` | Delete an area |

**Drawing Sets**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/drawing-sets` | List drawing sets |
| POST | `/api/projects/[projectId]/drawing-sets` | Create a drawing set |
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

### Submittals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/submittals` | List submittals |
| POST | `/api/projects/[projectId]/submittals` | Create a submittal |
| GET | `/api/projects/[projectId]/submittals/[submittalId]` | Get submittal details |
| PATCH | `/api/projects/[projectId]/submittals/[submittalId]` | Update a submittal |
| DELETE | `/api/projects/[projectId]/submittals/[submittalId]` | Delete a submittal |

---

### RFIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/rfis` | List RFIs (project-scoped) |
| POST | `/api/projects/[projectId]/rfis` | Create an RFI |
| GET | `/api/projects/[projectId]/rfis/[rfiId]` | Get RFI details |
| PATCH | `/api/projects/[projectId]/rfis/[rfiId]` | Update an RFI |
| DELETE | `/api/projects/[projectId]/rfis/[rfiId]` | Delete an RFI |
| GET | `/api/rfis` | List RFIs (global) |
| POST | `/api/rfis` | Create an RFI (global) |
| GET | `/api/rfis/[rfiId]` | Get RFI details (global) |
| PUT | `/api/rfis/[rfiId]` | Update an RFI (global) |
| DELETE | `/api/rfis/[rfiId]` | Delete an RFI (global) |

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
| GET | `/api/projects/[projectId]/meetings/[meetingId]/digest` | AI-generated meeting digest |
| GET/POST | `/api/projects/[projectId]/meetings/[meetingId]/prep` | Meeting prep document |
| POST | `/api/projects/[projectId]/meetings/[meetingId]/prep/generate` | Generate AI meeting prep |
| GET | `/api/meetings/[meetingId]` | Global meeting endpoint |

---

### Permissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/[projectId]/permissions` | Get project permissions matrix |
| POST | `/api/projects/[projectId]/permissions` | Create project permission |
| POST | `/api/projects/[projectId]/permissions/assign` | Assign permissions to a user |
| POST | `/api/projects/[projectId]/permissions/override` | Create a permission override |
| DELETE | `/api/projects/[projectId]/permissions/override` | Remove a permission override |
| GET | `/api/permissions/templates` | List permission templates |
| POST | `/api/permissions/templates` | Create permission template |
| GET/POST | `/api/projects/[projectId]/vendors` | Project vendors |

---

### AI Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai-assistant/chat` | Stream AI chat response (Vercel AI SDK) |
| GET | `/api/ai-assistant/conversations` | List conversations |
| POST | `/api/ai-assistant/conversations` | Create a conversation |
| GET | `/api/ai-assistant/conversations/[sessionId]` | Get conversation |
| DELETE | `/api/ai-assistant/conversations/[sessionId]` | Delete conversation |
| GET | `/api/ai-assistant/messages/[sessionId]` | Get conversation messages |
| POST | `/api/ai-assistant/feedback` | Submit response feedback |
| GET | `/api/ai-assistant/memories` | List AI memories |
| POST | `/api/ai-assistant/memories` | Create AI memory |
| DELETE | `/api/ai-assistant/memories/[id]` | Delete memory |
| GET | `/api/ai-assistant/usage-stats` | Usage statistics |

---

### RAG Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rag-chat` | RAG-enhanced chat (Next.js route handler) |
| POST/GET | `/api/rag-chatkit` | OpenAI ChatKit-compatible endpoint |
| POST | `/api/rag-chatkit/bootstrap` | Bootstrap RAG chat session |
| GET/POST | `/api/rag-chatkit/state` | Chat session state |
| POST | `/api/tool-calling` | Generic tool-calling endpoint |
| POST | `/api/primitives/tool-calling` | Primitive tool test endpoint |

---

### Documents & Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload` | Upload document |
| POST | `/api/documents/trigger-pipeline` | Trigger RAG ingestion pipeline |
| POST | `/api/documents/status` | Check document processing status |
| POST | `/api/documents/[docId]/assign-project` | Assign doc to project |
| POST | `/api/document-center/[recordType]/[recordId]/pdf` | Generate PDF |
| POST | `/api/document-center/[recordType]/[recordId]/email` | Email document |
| GET/POST | `/api/document-center/[recordType]/[recordId]/recipients` | Manage email recipients |
| GET | `/api/files/read` | Read file contents |

---

### Procore Docs / Knowledge

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/procore-docs/ask` | Ask question against Procore docs RAG |
| GET | `/api/docs-search` | Search documentation |
| GET | `/api/docs/check` | Check doc availability |
| GET | `/api/knowledge` | List knowledge documents (see Knowledge section above) |

---

### Liveblocks (Real-time Collaboration)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/liveblocks-auth` | Authenticate Liveblocks session |
| GET/POST | `/api/liveblocks/rooms` | Manage collaboration rooms |
| GET/POST | `/api/liveblocks/users` | User presence |
| GET | `/api/liveblocks/users/search` | Search users |
| POST | `/api/liveblocks/webhook` | Liveblocks webhook handler |

---

### ERP Sync (Acumatica)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync/acumatica/ar-invoices` | Sync AR invoices from Acumatica |
| POST | `/api/sync/acumatica/ar-payments` | Sync AR payments |
| POST | `/api/sync/acumatica/commitments` | Sync commitments/POs |
| POST | `/api/sync/acumatica/direct-costs` | Sync direct costs |
| POST | `/api/sync/acumatica/vendors` | Sync vendor list |

---

### Financial Insights

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/financial-insights/alerts` | Get financial alerts |
| POST | `/api/financial-insights/scan` | Run financial scan |
| POST | `/api/financial-insights/cross-reference` | Cross-reference financial data |

---

### Monitoring & Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check endpoint |
| GET | `/api/monitoring/dashboard` | Monitoring metrics |
| POST | `/api/monitoring/notify` | Send monitoring notification |
| GET | `/api/monitoring/todo-integration` | TODO integration status |
| WebSocket | `/api/monitoring/websocket` | Real-time monitoring feed |
| POST | `/api/notifications/trigger` | Trigger user notification |

---

### Utilities & Dev Tools

**Dev Tools**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/dev/check-routes` | Check for route conflicts |
| POST | `/api/dev/clear-cache` | Clear Next.js cache |
| POST | `/api/dev/regenerate-types` | Regenerate Supabase types |
| GET | `/api/dev-tools/check-routes` | Check for route conflicts |
| POST | `/api/dev-tools/clear-cache` | Clear Next.js cache |
| POST | `/api/dev-tools/regenerate-types` | Regenerate Supabase types |

**Table Operations (Admin)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/table-metadata` | Get metadata for a table |
| POST | `/api/table-insert` | Insert a row into a table |
| POST | `/api/table-update` | Update a row in a table |
| POST | `/api/table-delete` | Delete a row from a table |
| GET | `/api/database-tables-catalog/[schemaName]/[tableName]` | Browse table schema |

**File & Document Operations**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/file-read` | Read a file from storage |
| GET | `/api/document/status` | Get document processing status |
| POST | `/api/document/trigger-pipeline` | Trigger document processing pipeline |

**Tasks (Global)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/tasks` | Global task management |
| GET/PATCH/DELETE | `/api/tasks/[taskId]` | Single task |
| POST | `/api/tasks/bulk` | Bulk task operations |

**Estimates**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/estimates` | List estimates |
| GET | `/api/estimates/stats` | Estimate statistics |

**Misc**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/avatar/[personId]` | Generate/fetch avatar |
| POST | `/api/company/logo` | Upload company logo |
| GET | `/api/og/fetch` | Fetch Open Graph metadata |
| GET | `/api/og/proxy` | Proxy Open Graph images |
| ALL | `/api/supabase-proxy/[...path]` | Proxy requests to Supabase (catch-all) |
| GET | `/api/cron/decay-memories` | Cron: decay old AI memories |

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
| `search` | string | -- | Full-text search query |

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
- `400` -- Bad Request (validation failure)
- `401` -- Unauthorized (not authenticated)
- `403` -- Forbidden (insufficient permissions)
- `404` -- Not Found (resource does not exist)
- `409` -- Conflict (duplicate or constraint violation)
- `422` -- Unprocessable Entity (business logic violation)
- `500` -- Internal Server Error

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

## Summary

| Metric | Count |
|--------|-------|
| Total route files | 150+ |
| Total endpoint handlers | 326+ |
| API domains | 30+ |
| Project-scoped routes | ~80 |
| Global routes | ~70 |
| AI/RAG routes | 15+ |
| ERP sync routes | 5 |
