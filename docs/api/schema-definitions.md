# API Schema Definitions

This document provides comprehensive schema definitions for all request and response objects used in the Alleato PM API.

## Core Data Types

### Common Fields

Many entities share these common timestamp fields:

```typescript
interface TimestampFields {
  created_at: string;    // ISO 8601 timestamp
  updated_at: string;    // ISO 8601 timestamp
  deleted_at?: string;   // ISO 8601 timestamp (soft delete)
}
```
### Pagination Response

All paginated endpoints return this structure:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;        // Current page (1-indexed)
    limit: number;       // Items per page
    total: number;       // Total items available
    totalPages: number;  // Total pages available
  };
}
```
## Project Schemas

### Project Entity

```typescript
interface Project extends TimestampFields {
  id: number;
  name: string;
  job_number: string;
  description?: string;
  address?: string;
  state: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  budget?: number;
  budget_locked?: boolean;
  budget_locked_at?: string;
  budget_locked_by?: string;
  original_budget?: number;
  current_budget?: number;
  start_date?: string;              // YYYY-MM-DD format
  estimated_completion_date?: string;
  actual_completion_date?: string;
  archived: boolean;
  archived_at?: string;
  archived_by?: string;
  aliases?: string[];
  team_members?: TeamMember[];
  access?: string;
  city?: string;
  state_province?: string;
  zip_code?: string;
  country?: string;
  project_type?: string;
  owner_company_id?: number;
  general_contractor_id?: number;
  project_manager_id?: string;
}
```
### Team Member

```typescript
interface TeamMember {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  company?: string;
}
```

### Create Project Request

```typescript
interface CreateProjectRequest {
  name: string;                     // Required, 1-255 characters
  job_number: string;               // Required, 1-100 characters
  description?: string;             // Optional, max 1000 characters
  address?: string;                 // Optional, max 500 characters
  state?: 'planning' | 'active';    // Optional, default: 'planning'
  budget?: number;                  // Optional, min 0
  start_date?: string;              // Optional, YYYY-MM-DD format
  estimated_completion_date?: string;
  city?: string;
  state_province?: string;
  zip_code?: string;
  country?: string;
  project_type?: string;
  owner_company_id?: number;
  general_contractor_id?: number;
}
```
### Update Project Request

```typescript
interface UpdateProjectRequest {
  name?: string;
  job_number?: string;
  description?: string;
  address?: string;
  state?: 'active' | 'planning' | 'on_hold' | 'completed' | 'cancelled';
  budget?: number;
  start_date?: string;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  team_members?: TeamMember[];
  archived?: boolean;
  city?: string;
  state_province?: string;
  zip_code?: string;
  country?: string;
  project_type?: string;
}
```
## Directory Schemas

### Directory Person

```typescript
interface DirectoryPerson extends TimestampFields {
  id: string;                       // UUID
  project_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  person_type: 'user' | 'contact';
  title?: string;
  company_id?: string;
  company_name?: string;            // Computed field from join
  status: 'active' | 'inactive' | 'pending';
  profile_photo_url?: string;
  bio?: string;
  department?: string;
  reports_to?: string;
  employee_id?: string;
  hire_date?: string;
  emergency_contact?: EmergencyContact;
}
```
### Emergency Contact

```typescript
interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}
```

### Create Directory Person Request

```typescript
interface CreateDirectoryPersonRequest {
  first_name: string;               // Required, 1-100 characters
  last_name: string;                // Required, 1-100 characters
  email?: string;                   // Optional, valid email format
  phone?: string;                   // Optional, max 20 characters
  person_type: 'user' | 'contact';  // Required
  title?: string;                   // Optional, max 100 characters
  company_id?: string;              // Optional, valid UUID
  bio?: string;
  department?: string;
  reports_to?: string;
  employee_id?: string;
  hire_date?: string;               // YYYY-MM-DD format
  emergency_contact?: EmergencyContact;
}
```
### Update Directory Person Request

```typescript
interface UpdateDirectoryPersonRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  company_id?: string;
  status?: 'active' | 'inactive';
  bio?: string;
  department?: string;
  reports_to?: string;
  employee_id?: string;
  hire_date?: string;
  emergency_contact?: EmergencyContact;
}
```
## Budget Schemas

### Budget Line

```typescript
interface BudgetLine extends TimestampFields {
  id: string;                       // UUID
  project_id: string;
  cost_code_id: string;
  cost_type_id?: string;
  sub_job_id?: string;
  description?: string;

  // Quantities and units
  quantity?: number;
  unit_of_measure?: string;
  unit_cost?: number;

  // Budget amounts
  original_amount: number;
  budget_modifications?: number;
  revised_amount?: number;

  // Cost tracking
  committed_costs?: number;
  direct_costs?: number;
  job_to_date_cost?: number;
  pending_cost_changes?: number;
  projected_costs?: number;
  forecast_to_complete?: number;
  projected_over_under?: number;

  // Metadata
  created_by?: string;
  updated_by?: string;
  notes?: string;
}
```
### Budget Line Item (API Response Format)

```typescript
interface BudgetLineItem {
  id: string;
  description: string;
  costCode: string;
  costCodeDescription: string;
  costType: string;
  division: string;
  divisionTitle: string;
  subJob: string;

  // Core budget values
  originalBudgetAmount: number;
  budgetModifications: number;
  approvedCOs: number;
  revisedBudget: number;

  // Cost tracking
  jobToDateCostDetail: number;
  directCosts: number;
  pendingChanges: number;
  projectedBudget: number;
  committedCosts: number;
  pendingCostChanges: number;
  projectedCosts: number;
  forecastToComplete: number;
  estimatedCostAtCompletion: number;
  projectedOverUnder: number;
}
```

### Budget Grand Totals

```typescript
interface BudgetGrandTotals {
  originalBudgetAmount: number;
  budgetModifications: number;
  approvedCOs: number;
  revisedBudget: number;
  jobToDateCostDetail: number;
  directCosts: number;
  pendingChanges: number;
  projectedBudget: number;
  committedCosts: number;
  pendingCostChanges: number;
  projectedCosts: number;
  forecastToComplete: number;
  estimatedCostAtCompletion: number;
  projectedOverUnder: number;
}
```
### Create Budget Line Request

```typescript
interface CreateBudgetLineRequest {
  costCodeId: string;               // Required
  costType?: string;                // Optional
  amount: number;                   // Required, min 0
  description?: string;             // Optional
  qty?: number;                     // Optional
  uom?: string;                     // Unit of measure
  unitCost?: number;                // Optional
}
```
### Budget View

```typescript
interface BudgetView extends TimestampFields {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  columns: BudgetViewColumn[];
  created_by?: string;
}
```
### Budget View Column

```typescript
interface BudgetViewColumn {
  id: string;
  field_name: string;               // Database field name
  display_name: string;             // Human-readable name
  width?: number;                   // Column width in pixels
  visible: boolean;
  sort_order: number;
  format?: 'currency' | 'number' | 'percentage' | 'text';
  alignment?: 'left' | 'center' | 'right';
}
```

## Change Events Schemas

### Change Event

```typescript
interface ChangeEvent extends TimestampFields {
  id: string;                       // UUID
  project_id: number;
  number: string;                   // Auto-generated: "001", "002", etc.
  title: string;
  type: string;                     // "Owner Change", "Design Change", etc.
  status: 'open' | 'closed' | 'void';
  scope: 'TBD' | 'In Scope' | 'Out of Scope' | 'Allowance';
  origin: 'Internal' | 'RFI' | 'Field';
  reason?: string;
  description?: string;
  expecting_revenue: boolean;
  line_item_revenue_source?: string;
  prime_contract_id?: number;

  // Computed fields
  rom?: string;                     // Rough Order of Magnitude
  total?: string;                   // Total cost
  lineItemsCount?: number;

  // Audit fields
  created_by?: string;
  updated_by?: string;
}
```
### Create Change Event Request

```typescript
interface CreateChangeEventRequest {
  title: string;                    // Required, max 255 characters
  type: string;                     // Required
  scope?: 'TBD' | 'In Scope' | 'Out of Scope' | 'Allowance';
  origin?: 'Internal' | 'RFI' | 'Field';
  reason?: string;
  description?: string;
  expecting_revenue?: boolean;
  line_item_revenue_source?: string;
  prime_contract_id?: number;
}
```
### Change Event Line Item

```typescript
interface ChangeEventLineItem extends TimestampFields {
  id: string;
  change_event_id: string;
  cost_code_id: string;
  description: string;
  quantity: number;
  unit_of_measure?: string;
  unit_cost: number;
  total_cost: number;
  markup_percentage?: number;
  markup_amount?: number;
  final_amount: number;
  notes?: string;
}
```
### Change Event Attachment

```typescript
interface ChangeEventAttachment extends TimestampFields {
  id: string;
  change_event_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  description?: string;
  category?: string;
  uploaded_by: string;
}
```

## Contract Schemas

### Contract

```typescript
interface Contract extends TimestampFields {
  id: string;
  project_id: number;
  contract_number: string;
  title: string;
  description?: string;
  contract_type: 'Prime' | 'Subcontract' | 'Purchase Order';
  status: 'Draft' | 'Pending' | 'Active' | 'Completed' | 'Cancelled';
  company_id: string;

  // Financial fields
  contract_amount: number;
  approved_change_orders?: number;
  pending_change_orders?: number;
  revised_contract_amount?: number;

  // Dates
  start_date?: string;
  completion_date?: string;
  actual_completion_date?: string;

  // Terms
  payment_terms?: string;
  retention_percentage?: number;
  performance_bond_required?: boolean;
  insurance_required?: boolean;

  // Metadata
  contract_manager_id?: string;
  project_manager_id?: string;
  notes?: string;
}
```
### Contract Change Order

```typescript
interface ContractChangeOrder extends TimestampFields {
  id: string;
  contract_id: string;
  number: string;
  title: string;
  description?: string;
  type: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Void';

  // Financial
  amount: number;
  time_impact_days?: number;

  // Approval workflow
  requested_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;

  // Related entities
  change_event_id?: string;
  commitment_id?: string;
}
```
## Direct Cost Schemas

### Direct Cost

```typescript
interface DirectCost extends TimestampFields {
  id: string;
  project_id: number;
  cost_code_id: string;
  cost_type_id?: string;

  // Cost details
  amount: number;
  description: string;
  invoice_number?: string;
  invoice_date?: string;
  payment_date?: string;

  // Vendor information
  vendor_id?: string;
  vendor_name?: string;

  // Status and approval
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected';
  approved_by?: string;
  approved_at?: string;

  // Categories
  category?: string;
  subcategory?: string;

  // Metadata
  receipt_number?: string;
  notes?: string;
  created_by?: string;
}
```
### Create Direct Cost Request

```typescript
interface CreateDirectCostRequest {
  cost_code_id: string;             // Required
  cost_type_id?: string;
  amount: number;                   // Required, min 0
  description: string;              // Required
  invoice_number?: string;
  invoice_date?: string;            // YYYY-MM-DD
  vendor_id?: string;
  vendor_name?: string;
  category?: string;
  subcategory?: string;
  notes?: string;
}
```

## Company Schemas

### Company

```typescript
interface Company extends TimestampFields {
  id: string;                       // UUID
  name: string;
  business_type: 'General Contractor' | 'Subcontractor' | 'Supplier' | 'Owner' | 'Consultant';

  // Contact information
  address?: string;
  city?: string;
  state_province?: string;
  zip_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;

  // Business details
  license_number?: string;
  tax_id?: string;
  duns_number?: string;

  // Status
  is_active: boolean;
  is_verified: boolean;

  // Trade specialties
  trade_specialties?: string[];

  // Financial
  bonding_capacity?: number;
  insurance_limits?: InsuranceLimits;

  // Relationships
  parent_company_id?: string;
  subsidiaries?: string[];
}
```
### Insurance Limits

```typescript
interface InsuranceLimits {
  general_liability?: number;
  professional_liability?: number;
  workers_compensation?: number;
  umbrella?: number;
  auto_liability?: number;
}
```
## Commitment Schemas

### Commitment

```typescript
interface Commitment extends TimestampFields {
  id: string;
  project_id: number;
  commitment_number: string;
  title: string;
  description?: string;
  type: 'Subcontract' | 'Purchase Order' | 'Service Agreement';
  status: 'Draft' | 'Pending' | 'Awarded' | 'Executed' | 'Completed' | 'Cancelled';

  // Parties
  vendor_company_id: string;
  vendor_contact_id?: string;

  // Financial
  committed_amount: number;
  approved_change_orders?: number;
  pending_change_orders?: number;
  revised_amount?: number;
  paid_to_date?: number;
  retention_amount?: number;

  // Schedule
  start_date?: string;
  completion_date?: string;
  actual_start_date?: string;
  actual_completion_date?: string;

  // Terms
  payment_terms?: string;
  retention_percentage?: number;
  warranty_period?: number;

  // Status tracking
  executed: boolean;
  executed_date?: string;
  fully_executed: boolean;

  // Soft delete
  deleted_at?: string;
}
```
## Error Schemas

### API Error Response

```typescript
interface APIErrorResponse {
  error: string;                    // Human-readable error message
  code?: string;                    // Machine-readable error code
  details?: string | object;       // Additional error context
  timestamp?: string;               // When the error occurred
  request_id?: string;              // Unique request identifier
  path?: string;                    // API endpoint that generated the error
}
```

### Validation Error Details

```typescript
interface ValidationErrorDetails {
  [fieldName: string]: string[];   // Array of validation messages per field
}

// Example:
// {
//   "name": ["Name is required"],
//   "email": ["Email must be valid"],
//   "budget": ["Budget must be greater than 0"]
// }
```
## File Upload Schemas

### File Upload Response

```typescript
interface FileUploadResponse {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  url: string;
  thumbnail_url?: string;
  upload_completed_at: string;
}
```
### Attachment

```typescript
interface Attachment extends TimestampFields {
  id: string;
  entity_type: string;              // "change_event", "contract", etc.
  entity_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  description?: string;
  category?: string;
  tags?: string[];
  uploaded_by: string;

  // Access control
  is_public: boolean;
  access_level: 'public' | 'project' | 'company' | 'private';
}
```
## Query Parameter Schemas

### Common Query Parameters

```typescript
interface PaginationParams {
  page?: number;                    // Page number (1-indexed)
  limit?: number;                   // Items per page (max 100)
  per_page?: number;                // Alternative to limit
}

interface SortParams {
  sort?: string;                    // Sort field
  sortBy?: string;                  // Alternative sort field
  sortOrder?: 'asc' | 'desc';      // Sort direction
  order?: 'asc' | 'desc';          // Alternative sort direction
}

interface SearchParams {
  search?: string;                  // Search term
  q?: string;                       // Alternative search term
  query?: string;                   // Alternative search term
}

interface DateRangeParams {
  date_from?: string;               // Start date (YYYY-MM-DD)
  date_to?: string;                 // End date (YYYY-MM-DD)
  start_date?: string;              // Alternative start date
  end_date?: string;                // Alternative end date
}
```

### Directory Query Parameters

```typescript
interface DirectoryQueryParams extends PaginationParams, SortParams, SearchParams {
  type?: 'user' | 'contact' | 'all';
  status?: 'active' | 'inactive' | 'all';
  company_id?: string;
  permission_template_id?: string;
  group_by?: 'company' | 'none';
}
```
### Project Query Parameters

```typescript
interface ProjectQueryParams extends PaginationParams, SortParams, SearchParams {
  state?: 'active' | 'planning' | 'on_hold' | 'completed' | 'cancelled';
  excludeState?: string;
  archived?: boolean;
  project_type?: string;
  owner_company_id?: number;
}
```
---

## Type Definitions

For TypeScript users, these interfaces can be imported and used for type safety:

```typescript
import type { Database } from '@/types/database.types'

// Direct database types
type Project = Database['public']['Tables']['projects']['Row']
type CreateProject = Database['public']['Tables']['projects']['Insert']
type UpdateProject = Database['public']['Tables']['projects']['Update']

// API response types
type ProjectListResponse = PaginatedResponse<Project>
type CreateProjectResponse = Project
```

---

**Note**: All date fields use ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`) unless otherwise specified. Date-only fields use `YYYY-MM-DD` format.

**Last Updated**: January 31, 2024
