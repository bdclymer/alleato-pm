---
title: FORMS PrimeContracts
description: FORMS PrimeContracts documentation
---

# Prime Contracts Forms Specification

## Form List

1. **ContractForm** - Main contract creation and editing form
2. **ChangeOrderForm** - Change order creation and modification
3. **SOVItemForm** - Schedule of Values line item management
4. **BillingPeriodForm** - Billing period configuration
5. **PaymentForm** - Payment recording and tracking
6. **ContractFilters** - Advanced filtering interface

## Form Specifications

### 1. ContractForm (Create/Edit Prime Contract)

**File**: `/frontend/src/components/domain/contracts/ContractForm.tsx`
**Purpose**: Create new prime contracts or edit existing ones
**Validation**: Comprehensive validation with real-time feedback

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| number | string | Yes | Unique within project | Auto-generated or manual contract number |
| title | string | Yes | Min 1, Max 255 chars | Descriptive contract title |
| ownerClientId | string | Yes | Valid UUID | Client/Owner who pays contractor |
| contractorId | string | No | Valid UUID | Contractor company (usually current company) |
| architectEngineerId | string | No | Valid UUID | Architect or engineer on project |
| contractCompanyId | string | No | Valid UUID | Contract company identifier |
| status | enum | Yes | See CONTRACT_STATUSES | Current workflow status |
| executed | boolean | Yes | N/A | Whether contract has been signed |
| defaultRetainage | number | No | 0-100% | Default retention percentage |
| retentionPercent | number | No | 0-100% | Specific retention for this contract |
| description | string | No | Max 2000 chars | Contract description/notes |
| originalAmount | number | No | ≥ 0 | Initial contract value |
| revisedAmount | number | No | ≥ 0 | ⚠️ Should be calculated, not manual |
| startDate | Date | No | Valid date | Contract start date |
| estimatedCompletionDate | Date | No | Valid date, ≥ start date | Planned completion |
| substantialCompletionDate | Date | No | Valid date | Substantial completion milestone |
| actualCompletionDate | Date | No | Valid date | Actual completion date |
| signedContractReceivedDate | Date | No | Valid date | When signed contract received |
| contractTerminationDate | Date | No | Valid date | Termination date if applicable |
| sovItems | array | No | Valid SOV items | Schedule of Values line items |
| accountingMethod | enum | No | 'amount' or 'unit_quantity' | SOV calculation method |
| inclusions | string | No | Max 5000 chars | What's included in contract |
| exclusions | string | No | Max 5000 chars | What's excluded from contract |
| isPrivate | boolean | Yes | N/A | Privacy flag for access control |
| allowedUsers | array | No | Valid user IDs | Users with access to private contract |
| allowedUsersCanSeeSov | boolean | No | N/A | SOV visibility for allowed users |
| attachments | array | No | Valid file objects | Attached documents |
| attachmentFiles | File[] | No | File type restrictions | New files to upload |

#### Contract Status Options

```typescript
const CONTRACT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "out_for_bid", label: "Out for Bid" },
  { value: "out_for_signature", label: "Out for Signature" },
  { value: "approved", label: "Approved" },
  { value: "complete", label: "Complete" },
  { value: "terminated", label: "Terminated" },
];
```markdown
#### Form Layout

```bash
┌─────────────────────────────────────────────────────────────────┐
│                    Prime Contract Form                          │
├─────────────────────────────────────────────────────────────────┤
│ General Information                                             │
│ ┌─────────────────┐  ┌─────────────────────────────────────────┐│
│ │ Contract Number │  │ Contract Title                          ││
│ │ [AUTO-GEN/EDIT] │  │ [____________________________****]     ││
│ └─────────────────┘  └─────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│ │ Owner/Client        │  │ Status          │  │ [x] Executed │ │
│ │ [DROPDOWN WITH NEW] │  │ [DROPDOWN]      │  │              │ │
│ └─────────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Financial Information                                           │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│ │ Original Amount │  │ Retention %     │  │ Revised Amount  │  │
│ │ [$ _________]   │  │ [____%]        │  │ [$ _********]   │  │
│ │                 │  │                 │  │ (Calculated)    │  │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ Contract Dates                                                  │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│ │ Start Date  │  │ Est. Compl  │  │ Signed Date │              │
│ │ [MM/DD/YYYY]│  │ [MM/DD/YYYY]│  │ [MM/DD/YYYY]│              │
│ └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│ Schedule of Values                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Import SOV] [Add Line Item]                                │ │
│ │                                                             │ │
│ │ Line | Description        | Cost Code | Amount             │ │
│ │ ──────────────────────────────────────────────────────────  │ │
│ │  1   | Site Preparation   | 01.100   | $50,000      [Edit] │ │
│ │  2   | Foundation Work    | 02.200   | $125,000     [Edit] │ │
│ │ ──────────────────────────────────────────────────────────  │ │
│ │ Total: $175,000                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Description & Notes                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Contract Description:                                       │ │
│ │ [********_****_______________________________****]         │ │
│ │ [****________________________________________****]         │ │
│ │ [****____________________________________________]         │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Privacy & Access                                                │
│ │ ┌───────────────┐  ┌─────────────────────────────────────────┐│
│ │ │ [x] Private   │  │ Allowed Users: [MULTI-SELECT]          ││
│ │ │               │  │ ┌─────────────────────────────────────┐  ││
│ │ └───────────────┘  │ │ [x] Can view Schedule of Values     │  ││
│ │                    │ └─────────────────────────────────────┘  ││
│ │                    └─────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ Attachments                                                     │
│ │ ┌─────────────────────────────────────────────────────────────┐│
│ │ │ [Drop files here or click to browse]                       ││
│ │ │                                                             ││
│ │ │ • Contract.pdf (2.3 MB)                       [x]          ││
│ │ │ • Schedule_of_Values.xlsx (156 KB)            [x]          ││
│ │ └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                    [Cancel]  [Save as Draft]  [Save & Activate] │
└─────────────────────────────────────────────────────────────────┘

```markdown
#### Validation Rules

- **Contract Number**: Must be unique within project, auto-generated if not provided
- **Title**: Required, minimum 1 character
- **Owner/Client**: Required, must select valid client or create new
- **Status**: Must be valid status from enum
- **Financial**: Amounts must be ≥ 0, retention percentage 0-100%
- **Dates**: Logical date validation (end ≥ start, etc.)
- **SOV**: Line items must have valid cost codes if specified
- **Attachments**: File type restrictions (PDF, Excel, Word, images)

#### Conditional Logic

- **Private Contract**: If checked, show "Allowed Users" multi-select
- **SOV Visibility**: Only show if private and users are selected
- **Revised Amount**: Should be read-only and calculated from original + approved COs
- **Executed**: Controls whether contract can be modified (business logic)

### 2. ChangeOrderForm (Change Order Management)

**File**: `/frontend/src/components/domain/contracts/ChangeOrderForm.tsx` *(Not yet created)*
**Purpose**: Create and modify change orders for prime contracts

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| changeOrderNumber | string | Yes | Unique within contract | Auto-generated or manual CO number |
| title | string | Yes | Min 1, Max 255 chars | Change order title |
| description | string | No | Max 2000 chars | Detailed description of changes |
| amount | number | Yes | Can be negative | Change order amount (+ or -) |
| status | enum | Yes | draft/pending/approved/rejected | Current approval status |
| requestedBy | string | Yes | Valid user ID | User requesting the change order |
| requestedDate | Date | Yes | Valid date | When CO was requested |
| justification | string | No | Max 1000 chars | Business justification |
| impactDescription | string | No | Max 1000 chars | Impact on schedule/budget |
| attachments | array | No | Valid file objects | Supporting documentation |

#### Form Layout

```

┌─────────────────────────────────────────────────────────────────┐
│                     Change Order Form                          │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────────────────────────────┐│
│ │ CO Number       │  │ Title                                   ││
│ │ [AUTO-GEN]      │  │ [____________________________****]     ││
│ └─────────────────┘  └─────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│ │ Amount          │  │ Status          │  │ Requested By    │  │
│ │ [$ _********]   │  │ [DROPDOWN]      │  │ [USER DROPDOWN] │  │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ Description                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [********_****_______________________________****]         │ │
│ │ [****________________________________________****]         │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Justification & Impact                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Business Justification:                                     │ │
│ │ [****________________________________________****]         │ │
│ │                                                             │ │
│ │ Schedule/Budget Impact:                                     │ │
│ │ [****____________________________________________]         │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                           [Cancel]  [Save Draft]  [Submit for Approval] │
└─────────────────────────────────────────────────────────────────┘

```typescript
### 3. SOVItemForm (Schedule of Values Line Item)

**Purpose**: Add or edit individual SOV line items within a contract

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| lineNumber | number | Yes | Positive integer | Line item sequence number |
| description | string | Yes | Min 1, Max 255 chars | Work item description |
| costCodeId | string | No | Valid cost code | Associated budget cost code |
| scheduledValue | number | Yes | ≥ 0 | Total value for this line item |
| quantity | number | No | ≥ 0 | Quantity if unit-based |
| unitOfMeasure | string | No | Max 50 chars | Unit (SF, LF, EA, etc.) |
| unitCost | number | No | ≥ 0 | Cost per unit |

### 4. BillingPeriodForm (Billing Period Setup)

**Purpose**: Create billing periods and payment applications

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| periodNumber | number | Yes | Positive integer | Sequential period number |
| periodStartDate | Date | Yes | Valid date | Billing period start |
| periodEndDate | Date | Yes | ≥ start date | Billing period end |
| billedAmount | number | Yes | ≥ 0 | Amount billed this period |
| retentionWithheld | number | No | ≥ 0 | Retention held |
| invoiceNumber | string | No | Max 100 chars | Invoice reference number |
| invoiceDate | Date | No | Valid date | Invoice date |
| dueDate | Date | No | ≥ invoice date | Payment due date |
| notes | string | No | Max 1000 chars | Period notes |

### 5. PaymentForm (Payment Recording)

**Purpose**: Record payments received against contracts

#### Form Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| paymentDate | Date | Yes | Valid date | Date payment received |
| amount | number | Yes | > 0 | Payment amount |
| retentionReleased | number | No | ≥ 0 | Retention released with payment |
| checkNumber | string | No | Max 100 chars | Check or reference number |
| referenceNumber | string | No | Max 100 chars | Additional reference |
| paymentMethod | enum | No | check/wire/ach/other | How payment was received |
| notes | string | No | Max 1000 chars | Payment notes |
| billingPeriodId | string | No | Valid billing period | Associated billing period |

### 6. ContractFilters (Advanced Filtering)

**File**: `/frontend/src/components/domain/contracts/ContractFilters.tsx` *(Not yet created)*
**Purpose**: Advanced filtering interface for contract list

#### Filter Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| status | multi-select | All contract statuses | Filter by contract status |
| ownerClient | select | All clients | Filter by owner/client |
| dateRange | date-picker | Start/end dates | Filter by date range |
| amountRange | number-range | Min/max values | Filter by contract value |
| executed | checkbox | true/false/both | Filter by execution status |
| hasChangeOrders | checkbox | true/false/both | Contracts with change orders |
| hasPendingPayments | checkbox | true/false/both | Outstanding payment balance |
| searchText | text | Free text | Search in title, description, number |

#### Filter Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Contract Filters                          │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│ │ Status          │  │ Client          │  │ Date Range      │  │
│ │ [MULTI-SELECT]  │  │ [DROPDOWN]      │  │ [DATE PICKER]   │  │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│ │ Amount Range    │  │ [x] Executed    │  │ [x] Has COs     │  │
│ │ $[____] to $[**]│  │                 │  │                 │  │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Search: [**______________________________] [Clear Filters] │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

```

## Form Validation Rules

### Real-Time Validation

- **Field-level validation**: Immediate feedback on field changes
- **Form-level validation**: Cross-field validation on submit
- **Server-side validation**: API validation with error handling
- **Optimistic updates**: UI updates before server confirmation

### Error Handling Patterns

- **Inline errors**: Display validation errors below fields
- **Summary errors**: Show form-wide issues at top
- **Toast notifications**: Success/failure feedback
- **Retry mechanisms**: Handle network failures gracefully

### Data Consistency Rules

- **Unique constraints**: Contract numbers, CO numbers within contract
- **Financial validation**: Amounts ≥ 0, percentages 0-100%
- **Date logic**: End dates ≥ start dates, logical sequences
- **Reference integrity**: Valid foreign keys, existing entities

## Accessibility Requirements

### WCAG 2.1 AA Compliance

- **Keyboard navigation**: All form controls accessible via keyboard
- **Screen reader support**: Proper labels, aria-describedby for errors
- **Color contrast**: 4.5:1 minimum contrast ratio
- **Focus management**: Clear focus indicators, logical tab order
- **Error announcements**: Screen reader alerts for validation errors

### Form Accessibility Features

- **Label association**: All inputs have explicit labels
- **Required field indicators**: Clear marking of required fields
- **Error identification**: Errors clearly associated with fields
- **Instructions**: Clear guidance for complex fields
- **Timeout warnings**: Alerts before form sessions expire

## Performance Considerations

### Form Optimization

- **Lazy loading**: Load dropdowns and options on demand
- **Debounced validation**: Reduce validation API calls
- **Progressive enhancement**: Work without JavaScript for basic functionality
- **Chunked uploads**: Handle large file attachments efficiently

### User Experience

- **Auto-save**: Save form progress automatically
- **Field dependencies**: Update related fields automatically
- **Smart defaults**: Pre-populate based on context
- **Contextual help**: Inline help text for complex fields
- **Progress indicators**: Show completion status for long forms

This forms specification provides comprehensive guidance for implementing all prime contract-related forms with proper validation, accessibility, and user experience considerations.
