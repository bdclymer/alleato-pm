---
title: UI PrimeContracts
description: UI PrimeContracts documentation
---

# Prime Contracts UI Components Specification

## Component Specifications

### 1. ContractsListPage (Main Contracts View)

**File**: `/frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx`
**Purpose**: Main contract listing with summary cards and table view
**Screenshot**: `crawl-prime-contracts/screenshots/prime-contract-table-view.png`

#### Props Interface

```typescript
// No external props - uses URL params
interface PageParams {
  params: { projectId: string }
}
```markdown
#### Layout Structure
```sql
┌─────────────────────────────────────────────────────────────────┐
│                      Prime Contracts                           │
├─────────────────────────────────────────────────────────────────┤
│ [Create Contract] [Import] [Export] [Filters] [Search_______]   │
├─────────────────────────────────────────────────────────────────┤
│ Contract Summary Cards (Responsive Grid)                       │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│ │ Total Contracts │ │ Active Value    │ │ Pending COs     │  │
│ │      25         │ │   $2.5M        │ │    $150K        │  │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Data Table                                 │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ # │ Title         │ Client    │ Original │ Revised │ Status ┃ │
│ ┃───┼───────────────┼───────────┼──────────┼─────────┼────────┃ │
│ ┃001│ Main Contract │ ABC Corp  │ $1.0M    │ $1.1M   │ Active ┃ │
│ ┃002│ Electrical    │ XYZ Inc   │ $250K    │ $275K   │ Draft  ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
├─────────────────────────────────────────────────────────────────┤
│                    [Pagination Controls]                       │
└─────────────────────────────────────────────────────────────────┘

```sql
#### State Management
- **Contracts Data**: Fetched from API with pagination
- **Filters**: Status, date range, client filtering
- **Search**: Real-time search across contract fields
- **Selection**: Multi-select for bulk operations
- **Sort**: Column-based sorting with persistence

#### Key Features
- **Summary Cards**: Total contracts, active value, pending change orders
- **Data Table**: Sortable, filterable, paginated contract list
- **Bulk Operations**: Multi-select with export/delete actions
- **Quick Actions**: Create, import, export buttons
- **Real-time Search**: Debounced search across multiple fields

### 2. ContractDetailPage (Individual Contract View)

**File**: `/frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx`
**Purpose**: Detailed contract view with tabbed interface
**Screenshot**: `crawl-prime-contracts/screenshots/prime-contract-detail.png`

#### Props Interface
```typescript
interface PageParams {
  params: {
    projectId: string;
    contractId: string;
  }
}
```

#### Layout Structure

```bash
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Contracts                               [Edit] [⋮]     │
├─────────────────────────────────────────────────────────────────┤
│                     Contract Header                            │
│ PC-001: Main Construction Contract                   🟢 Active  │
│ ABC Construction Company                                        │
│ Original: $1,000,000 | Revised: $1,050,000 | Paid: $750,000   │
├─────────────────────────────────────────────────────────────────┤
│ [General] [Line Items] [Change Orders] [Billing] [History]     │
├─────────────────────────────────────────────────────────────────┤
│                    Tab Content Area                            │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                   (Dynamic tab content)                    │ │
│ │                                                             │ │
│ │ - General: Contract details, dates, terms                  │ │
│ │ - Line Items: SOV management, line item editing           │ │
│ │ - Change Orders: CO list, create new, approval status     │ │
│ │ - Billing: Billing periods, payment applications          │ │
│ │ - History: Audit trail, changes, approvals                │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```typescript
#### Tab Components

1. **General Tab**: Contract information, dates, terms, description
2. **Line Items Tab**: Schedule of Values grid with editing capabilities
3. **Change Orders Tab**: Change order list and management
4. **Billing Tab**: Billing periods and payment tracking
5. **History Tab**: Audit trail and change history

### 3. ContractForm (Create/Edit Form)

**File**: `/frontend/src/components/domain/contracts/ContractForm.tsx`
**Purpose**: Comprehensive contract creation and editing form
**Screenshot**: `crawl-prime-contracts/screenshots/form-contract.png`

#### Props Interface

```typescript
interface ContractFormProps {
  initialData?: Partial<ContractFormData>;
  onSubmit: (data: ContractFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
  projectId?: string;
}

interface ContractFormData {
  number: string;
  title: string;
  ownerClientId?: string;
  contractorId?: string;
  status: string;
  executed: boolean;
  originalAmount?: number;
  revisedAmount?: number;
  startDate?: Date;
  estimatedCompletionDate?: Date;
  sovItems?: SOVLineItem[];
  isPrivate: boolean;
  // ... full interface defined in FORMS-PrimeContracts.md
}
```typescript
#### Layout Structure
- **Multi-section form** with accordion-style organization
- **General Information**: Basic contract details
- **Financial Information**: Amounts, retention, terms
- **Schedule of Values**: Embedded SOV grid
- **Privacy Settings**: Access control configuration
- **Attachments**: File upload interface

#### Validation & Error Handling
- **Real-time validation** with field-level feedback
- **Form-level validation** on submit
- **Server-side validation** with error mapping
- **Accessibility compliance** with proper ARIA labels

### 4. ScheduleOfValuesGrid (SOV Management)

**File**: `/frontend/src/components/domain/contracts/ScheduleOfValuesGrid.tsx`
**Purpose**: Interactive grid for managing Schedule of Values line items
**Screenshot**: `crawl-prime-contracts/screenshots/pc-sov.png`

#### Props Interface
```typescript
interface ScheduleOfValuesGridProps {
  contractId: string;
  items: SOVLineItem[];
  onUpdate: (items: SOVLineItem[]) => void;
  readonly?: boolean;
  showFinancials?: boolean;
}

interface SOVLineItem {
  id?: string;
  lineNumber: number;
  description: string;
  costCodeId?: string;
  scheduledValue: number;
  workCompletedPrevious?: number;
  workCompletedThisPeriod?: number;
  materialsStored?: number;
  totalCompleted?: number;
  percentComplete?: number;
  balanceToFinish?: number;
  retainageRate?: number;
  retainageAmount?: number;
}
```

#### Layout Structure

```bash
┌─────────────────────────────────────────────────────────────────┐
│ Schedule of Values                    [Import] [Export] [Add]   │
├─────────────────────────────────────────────────────────────────┤
│ Line | Description      | Cost Code | Scheduled | % Complete │%  │
│ ─────┼──────────────────┼───────────┼───────────┼────────────┼── │
│  1   │ Site Prep        │ 01.100   │ $50,000   │ 75%        │▲  │
│  2   │ Foundation       │ 02.200   │ $125,000  │ 50%        │▼  │
│  3   │ Framing         │ 05.100   │ $200,000  │ 25%        │✎  │
│ ─────┼──────────────────┼───────────┼───────────┼────────────┼── │
│ Total:                              │ $375,000  │ 50%        │   │
└─────────────────────────────────────────────────────────────────┘
```bash
#### Key Features

- **Inline editing**: Click to edit cells directly
- **Cost code integration**: Dropdown with budget cost codes
- **Financial calculations**: Auto-calculate percentages and totals
- **Import/Export**: CSV and Excel support
- **Drag & drop reordering**: Change line item sequence
- **Validation**: Real-time validation of financial data

### 5. ChangeOrdersTab (Change Order Management)

**File**: `/frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/change-orders/page.tsx` *(Not yet created)*
**Purpose**: Change order list and management within contract detail view
**Screenshot**: `crawl-prime-contracts/screenshots/prime-contract-expanded-cos.png`

#### Layout Structure

```bash
┌─────────────────────────────────────────────────────────────────┐
│ Change Orders                                    [Create New]   │
├─────────────────────────────────────────────────────────────────┤
│ [All] [Draft] [Pending] [Approved] [Rejected]                  │
├─────────────────────────────────────────────────────────────────┤
│ CO# │ Title           │ Amount    │ Status   │ Date      │ Actions│
│ ────┼─────────────────┼───────────┼──────────┼───────────┼────────│
│ 001 │ Additional Work │ $25,000   │ Approved │ 01/15/24  │ [View] │
│ 002 │ Design Change   │ $15,000   │ Pending  │ 01/20/24  │ [Edit] │
│ 003 │ Extra Materials │ $5,000    │ Draft    │ 01/22/24  │ [Edit] │
├─────────────────────────────────────────────────────────────────┤
│ Summary: 3 COs | $45,000 Total | $25,000 Approved              │
└─────────────────────────────────────────────────────────────────┘
```

#### Features

- **Status filtering**: Filter by change order status
- **Approval workflow**: In-line approve/reject actions
- **Create new**: Modal form for new change orders
- **Financial impact**: Show effect on contract totals

### 6. ContractActionToolbar (Actions & Exports) *(Missing - High Priority)*

**File**: `/frontend/src/components/domain/contracts/ContractActionToolbar.tsx` *(Not yet created)*
**Purpose**: Action buttons for contract operations
**Screenshot**: `crawl-prime-contracts/screenshots/prime-contracts-settings.png`

#### Layout Structure

```text
┌─────────────────────────────────────────────────────────────────┐
│ [✓ 3 selected] [Export ▼] [Bulk Delete] [Settings] [Refresh]   │
├─────────────────────────────────────────────────────────────────┤
│ Export Menu:                                                    │
│ • PDF Summary                                                   │
│ • Excel Spreadsheet                                             │
│ • CSV Data                                                      │
│ • Financial Report                                              │
└─────────────────────────────────────────────────────────────────┘
```bash
#### Features

- **Selection indicator**: Show number of selected contracts
- **Export options**: Multiple format support
- **Bulk operations**: Delete, status change
- **Settings**: Table configuration

### 7. ContractFilters (Advanced Filtering) *(Missing - High Priority)*

**File**: `/frontend/src/components/domain/contracts/ContractFilters.tsx` *(Not yet created)*
**Purpose**: Advanced filtering sidebar or panel
**Reference**: Based on similar filtering in other modules

#### Layout Structure

```bash
┌─────────────────────────────────────────────────────────────────┐
│ Filters                                           [Clear All]   │
├─────────────────────────────────────────────────────────────────┤
│ Status                                                          │
│ ☑ Active    ☑ Draft      ☐ Complete   ☐ Terminated           │
├─────────────────────────────────────────────────────────────────┤
│ Client                                                          │
│ [Select Client____________▼]                                    │
├─────────────────────────────────────────────────────────────────┤
│ Contract Value                                                  │
│ Min: [$_______] Max: [$_______]                               │
├─────────────────────────────────────────────────────────────────┤
│ Date Range                                                      │
│ Start: [MM/DD/YYYY] End: [MM/DD/YYYY]                         │
├─────────────────────────────────────────────────────────────────┤
│ Other                                                           │
│ ☐ Has Change Orders                                            │
│ ☐ Executed Contracts                                           │
│ ☐ Outstanding Payments                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 8. LineItemsSubPage (Dedicated Line Items Management) *(Missing - High Priority)*

**File**: `/frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/line-items/page.tsx` *(Not yet created)*
**Purpose**: Dedicated page for contract line items management
**Reference**: Similar to commitments SOV management

#### Layout Structure

```bash
┌─────────────────────────────────────────────────────────────────┐
│ Contract Line Items                [Import] [Export] [Add New]  │
├─────────────────────────────────────────────────────────────────┤
│ Line # │ Description        │ Cost Code │ Quantity │ Total      │
│ ───────┼────────────────────┼───────────┼──────────┼────────────│
│   1    │ Site Preparation   │ 01.100   │ 1,000 SF │ $50,000   │
│   2    │ Foundation Work    │ 02.200   │ 500 CY   │ $125,000  │
│   3    │ Framing           │ 05.100   │ 2,000 SF │ $200,000  │
├─────────────────────────────────────────────────────────────────┤
│ Total: 3 items                                    $375,000      │
└─────────────────────────────────────────────────────────────────┘
```bash
### 9. BillingPaymentsTab (Financial Tracking) *(Missing - Medium Priority)*

**File**: `/frontend/src/components/domain/contracts/BillingPaymentsTab.tsx` *(Not yet created)*
**Purpose**: Financial tracking within contract detail view

#### Layout Structure

```bash
┌─────────────────────────────────────────────────────────────────┐
│ Billing & Payments                             [New Payment]    │
├─────────────────────────────────────────────────────────────────┤
│ Payment Applications                                            │
│ Period │ Billed     │ Retention │ Net Amount │ Status    │ Date  │
│ ───────┼────────────┼───────────┼────────────┼───────────┼───────│
│   1    │ $100,000   │ $5,000   │ $95,000   │ Paid     │ 01/31 │
│   2    │ $125,000   │ $6,250   │ $118,750  │ Submitted│ 02/28 │
├─────────────────────────────────────────────────────────────────┤
│ Payment Summary                                                 │
│ Total Billed: $225,000 | Retention: $11,250 | Paid: $95,000   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy & Relationships

### Page-Level Components

```text
ContractsListPage
├── ProjectPageHeader
├── ContractActionToolbar (Missing)
├── ContractFilters (Missing)
├── GenericDataTable
│   └── contractsTableConfig
└── ContractPagination

ContractDetailPage
├── ContractHeader
├── ContractTabs
│   ├── GeneralTab
│   ├── LineItemsTab (ScheduleOfValuesGrid)
│   ├── ChangeOrdersTab (Missing)
│   ├── BillingTab (Missing)
│   └── HistoryTab
└── ContractActions

ContractCreatePage
└── ContractForm

ContractEditPage
└── ContractForm (with initialData)
```markdown
### Shared Components

```text
ContractForm (Comprehensive form component)
├── GeneralInfoSection
├── FinancialSection
├── ScheduleOfValuesGrid
├── PrivacySection
└── AttachmentsSection

ScheduleOfValuesGrid (Reusable SOV grid)
├── SOVLineItem[]
├── SOVLineEditor
├── ImportSOVModal
└── ExportSOVButton
```

## State Management Patterns

### Data Fetching

- **React Server Components**: For initial page data
- **SWR/TanStack Query**: For client-side data fetching
- **Optimistic Updates**: For immediate UI feedback
- **Background Refresh**: Keep data current

### Form State

- **React Hook Form**: Primary form state management
- **Zod Validation**: Schema-based validation
- **Controlled Components**: For complex widgets
- **Local Storage**: For draft saving

### UI State

- **useState**: Component-level UI state
- **useReducer**: Complex state logic
- **Context**: Shared state across component trees
- **URL State**: For filters, pagination, tabs

## Responsive Design Details

### Mobile Layout (< 768px)

- **Stacked Forms**: Single column form layout
- **Collapsed Tables**: Hide non-essential columns
- **Card View**: Switch from table to card layout
- **Bottom Navigation**: Move primary actions to bottom
- **Touch Targets**: Ensure 44px minimum touch areas

### Tablet Layout (768px - 1024px)

- **Two-column Forms**: Split form sections
- **Condensed Tables**: Reduce padding, smaller fonts
- **Side Navigation**: Collapsible sidebar
- **Optimized Spacing**: Adjust margins and padding

### Desktop Layout (> 1024px)

- **Multi-column**: Full desktop layout
- **Full Tables**: Show all columns
- **Fixed Navigation**: Persistent sidebar/header
- **Keyboard Shortcuts**: Full keyboard support

## Accessibility Features

### WCAG 2.1 AA Compliance

- **Semantic HTML**: Proper heading hierarchy
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: 4.5:1 minimum ratio
- **Focus Management**: Clear focus indicators
- **Error Announcements**: Accessible validation feedback

### Specific Implementations

- **Table Navigation**: Arrow key navigation in data tables
- **Form Labels**: Explicit labels for all inputs
- **Modal Focus**: Trap focus in modal dialogs
- **Status Announcements**: Live region updates
- **Alternative Text**: Meaningful alt text for images

## Performance Considerations

### Optimization Strategies

- **Code Splitting**: Lazy load route components
- **Virtualization**: For large data tables
- **Memoization**: React.memo for expensive renders
- **Debouncing**: Search and filter inputs
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Monitor and optimize bundle size

### Loading States

- **Skeleton Loading**: For data tables and forms
- **Progressive Loading**: Load critical content first
- **Optimistic Updates**: Immediate UI feedback
- **Error Boundaries**: Graceful error handling
- **Retry Mechanisms**: Auto-retry failed requests

This UI specification provides comprehensive coverage of all prime contract interface components with detailed layouts, state management patterns, and implementation guidelines for a production-ready contract management system.
