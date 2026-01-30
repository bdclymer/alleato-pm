# Directory Forms Specification

> **⚠️ CONSOLIDATION NOTICE:** Form status information in this file may conflict with other sources. Please refer to [PLANS-Directory.md](./PLANS-Directory.md) for official implementation status.

## Overview

The Directory system includes several forms for creating, editing, and managing users, contacts, companies, and groups. Each form includes comprehensive validation and user experience enhancements.

## Form Implementation Status (Last Verified: 2026-01-19)

**Implemented (4 of 7 forms - 57% complete):**
1. **PersonEditDialog** ✅ - Create/Edit Users and Contacts
2. **InviteDialog** ✅ - Send/Resend Invitations
3. **ImportDialog** ✅ - CSV Import Interface
4. **BulkActionDialog** ✅ - Bulk Operations Interface

**Not Implemented (3 of 7 forms):**
5. **CompanyEditDialog** ❌ - Create/Edit Companies
6. **DistributionGroupDialog** ❌ - Create/Edit Distribution Groups
7. **PermissionTemplateDialog** ❌ - Create/Edit Permission Templates

## Form Specifications

### 1. PersonEditDialog

**Purpose**: Create or edit user and contact information
**File**: `components/directory/PersonEditDialog.tsx`
**Trigger**: "Add Person" button, edit action in table row

#### Form Fields

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| personType | Select | Yes | user/contact | Determines if person can log in |
| firstName | Text | Yes | 1-50 chars | Person's first name |
| lastName | Text | Yes | 1-50 chars | Person's last name |
| email | Email | Conditional* | Valid email | Required for users, optional for contacts |
| phoneMobile | Tel | No | Valid phone | Mobile phone number |
| phoneBusiness | Tel | No | Valid phone | Business phone number |
| jobTitle | Text | No | 0-100 chars | Professional title/role |
| companyId | Select | No | Valid company ID | Associated company |
| permissionTemplateId | Select | Conditional** | Valid template ID | Required for users |
| role | Text | No | 0-50 chars | Project-specific role |
| addressLine1 | Text | No | 0-255 chars | Street address |
| addressLine2 | Text | No | 0-255 chars | Apartment/suite |
| city | Text | No | 0-100 chars | City name |
| state | Text | No | 2 chars | State/province code |
| zip | Text | No | 5-10 chars | Postal code |
| country | Select | No | Country code | Defaults to 'US' |
| notes | Textarea | No | 0-1000 chars | Internal notes about person |

**Conditional Requirements:**
- *Email required when personType = 'user'
- **Permission template required when personType = 'user'

#### Form Validation Rules

```typescript
const personFormSchema = z.object({
  personType: z.enum(['user', 'contact']),
  firstName: z.string().min(1, 'First name required').max(50),
  lastName: z.string().min(1, 'Last name required').max(50),
  email: z.string().email().optional().or(z.literal('')),
  phoneMobile: z.string().optional(),
  phoneBusiness: z.string().optional(),
  jobTitle: z.string().max(100).optional(),
  companyId: z.string().uuid().optional(),
  permissionTemplateId: z.string().uuid().optional(),
  role: z.string().max(50).optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  zip: z.string().max(10).optional(),
  country: z.string().default('US'),
  notes: z.string().max(1000).optional(),
}).refine((data) => {
  // Email required for users
  if (data.personType === 'user' && !data.email) {
    return false;
  }
  return true;
}, {
  message: "Email is required for users",
  path: ["email"],
}).refine((data) => {
  // Permission template required for users
  if (data.personType === 'user' && !data.permissionTemplateId) {
    return false;
  }
  return true;
}, {
  message: "Permission template is required for users",
  path: ["permissionTemplateId"],
});
```

#### Form Layout

```
┌─────────────────────────────────┐
│ Add/Edit Person                 │
├─────────────────────────────────┤
│ Type: [User ▼] [Contact]        │
│ Name: [First Name] [Last Name]  │
│ Email: [email@example.com]      │ (required for users)
│ Phone: [Mobile] [Business]      │
│ Title: [Job Title]              │
│ Company: [Select Company ▼]     │
│ Permission: [Select Template ▼] │ (users only)
│ Role: [Project Role]            │
│                                 │
│ ▼ Address (Optional)            │
│ Street: [Address Line 1]        │
│         [Address Line 2]        │
│ City: [City] State: [ST ▼]      │
│ ZIP: [12345] Country: [US ▼]    │
│                                 │
│ Notes: [Internal notes...]      │
│                                 │
│ [Cancel]         [Save Person]  │
└─────────────────────────────────┘
```

### 2. InviteDialog

**Purpose**: Send or resend invitations to users
**File**: `components/directory/InviteDialog.tsx`
**Trigger**: Invite button in table row

#### Form Fields

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| message | Textarea | No | 0-500 chars | Custom invitation message |
| sendEmail | Checkbox | No | Boolean | Whether to send email (default true) |
| expiresInDays | Number | No | 1-30 days | Invitation expiry (default 7) |

#### Form Layout

```
┌─────────────────────────────────┐
│ Invite John Doe                 │
├─────────────────────────────────┤
│ Email: john.doe@company.com     │ (read-only)
│ Permission: Project Manager     │ (read-only)
│                                 │
│ ☑ Send email invitation        │
│ Expires in: [7 ▼] days         │
│                                 │
│ Custom message (optional):      │
│ ┌─────────────────────────────┐ │
│ │ Welcome to the project! We  │ │
│ │ look forward to working     │ │
│ │ with you.                   │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Cancel]         [Send Invite]  │
└─────────────────────────────────┘
```

### 3. CompanyEditDialog ❌ NOT IMPLEMENTED

**Purpose**: Create or edit company information
**File**: `components/directory/CompanyEditDialog.tsx` (MISSING)
**Status**: Planned but not implemented
**Trigger**: Add company button, edit company action

#### Form Fields

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| name | Text | Yes | 1-100 chars | Company name |
| type | Select | No | Predefined types | Company classification |
| website | URL | No | Valid URL | Company website |
| phone | Tel | No | Valid phone | Main phone number |
| email | Email | No | Valid email | General contact email |
| addressLine1 | Text | No | 0-255 chars | Street address |
| addressLine2 | Text | No | 0-255 chars | Suite/floor |
| city | Text | No | 0-100 chars | City name |
| state | Text | No | 2 chars | State/province |
| zip | Text | No | 5-10 chars | Postal code |
| country | Select | No | Country code | Defaults to 'US' |
| taxId | Text | No | 0-50 chars | Tax identification number |
| licenseNumber | Text | No | 0-100 chars | Business license |
| insuranceExpiry | Date | No | Future date | Insurance expiration |
| notes | Textarea | No | 0-1000 chars | Internal notes |

#### Company Types

- General Contractor
- Subcontractor
- Architect/Engineer
- Owner/Client
- Vendor/Supplier
- Consultant
- Government Agency
- Other

### 4. DistributionGroupDialog ❌ NOT IMPLEMENTED

**Purpose**: Create or edit distribution groups for notifications
**File**: `components/directory/DistributionGroupDialog.tsx` (MISSING)
**Status**: Planned but not implemented
**Trigger**: Add group button, edit group action

#### Form Fields

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| name | Text | Yes | 1-100 chars | Group name (unique per project) |
| description | Textarea | No | 0-500 chars | Group purpose/description |
| groupType | Select | Yes | manual/automatic/role_based | How members are managed |
| autoRules | JSON Config | Conditional* | Valid rules | Rules for automatic groups |
| initialMembers | MultiSelect | No | Valid person IDs | Initial group members |

**Conditional Requirements:**
- *Auto rules required when groupType = 'automatic' or 'role_based'

#### Auto Rules Configuration

For automatic groups, additional fields appear:

| Field Name | Type | Description |
|------------|------|-------------|
| includeRoles | MultiSelect | Automatically include people with these roles |
| includeCompanies | MultiSelect | Include all people from these companies |
| includePermissions | MultiSelect | Include people with these permission levels |
| excludeInactive | Checkbox | Exclude inactive users |

### 5. PermissionTemplateDialog ❌ NOT IMPLEMENTED

**Purpose**: Create or edit permission templates
**File**: `components/directory/PermissionTemplateDialog.tsx` (MISSING)
**Status**: Planned but not implemented
**Trigger**: Admin permission management interface

#### Form Fields

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| name | Text | Yes | 1-50 chars | Template name |
| description | Textarea | No | 0-255 chars | Template description |
| scope | Select | Yes | project/company/global | Permission scope |
| directoryPermissions | CheckboxGroup | Yes | read/write/admin | Directory access level |
| budgetPermissions | CheckboxGroup | Yes | none/read/write/admin | Budget module access |
| contractsPermissions | CheckboxGroup | Yes | none/read/write/admin | Contracts access |
| changeOrdersPermissions | CheckboxGroup | Yes | none/read/write/admin | Change orders access |
| documentsPermissions | CheckboxGroup | Yes | none/read/write/admin | Documents access |
| meetingsPermissions | CheckboxGroup | Yes | none/read/write/admin | Meetings access |

#### Permission Levels

- **None**: No access to the module
- **Read**: View-only access
- **Write**: Read + create/edit/update
- **Admin**: Write + delete + manage permissions

### 6. ImportDialog

**Purpose**: Import users/contacts from CSV files
**File**: `components/directory/ImportDialog.tsx`
**Trigger**: Import button in directory header

#### Form Fields

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| importType | Select | Yes | users/contacts/companies | Type of data to import |
| file | File Upload | Yes | CSV format, <10MB | File containing import data |
| hasHeaders | Checkbox | No | Boolean | File includes header row |
| defaultCompany | Select | No | Valid company ID | Default company for records without one |
| defaultPermission | Select | Conditional* | Valid template ID | Default permission for users |
| skipDuplicates | Checkbox | No | Boolean | Skip records with duplicate emails |
| updateExisting | Checkbox | No | Boolean | Update existing records |

**Conditional Requirements:**
- *Default permission required when importType = 'users'

#### CSV Format Requirements

**Users CSV Format:**
```csv
first_name,last_name,email,job_title,company_name,phone_mobile,role
John,Doe,john@example.com,Project Manager,Acme Corp,555-0123,project_manager
```

**Contacts CSV Format:**
```csv
first_name,last_name,email,job_title,company_name,phone_mobile,phone_business
Jane,Smith,jane@vendor.com,Sales Rep,Vendor Inc,555-0124,555-0125
```

### 7. BulkActionDialog

**Purpose**: Perform bulk operations on selected people
**File**: `components/directory/BulkActionDialog.tsx`
**Trigger**: Select multiple rows, then bulk actions button

#### Form Fields

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| action | Select | Yes | Predefined actions | Bulk operation to perform |
| newPermissionTemplate | Select | Conditional* | Valid template ID | New permission template |
| newStatus | Select | Conditional* | active/inactive | New status |
| distributionGroups | MultiSelect | Conditional* | Valid group IDs | Groups to add people to |
| removeGroups | MultiSelect | Conditional* | Valid group IDs | Groups to remove people from |
| confirmAction | Checkbox | Yes | Must be checked | Confirmation checkbox |

**Conditional Requirements:**
- Fields appear based on selected action type

#### Bulk Action Types

- **Change Permission Template**: Update permission template for selected users
- **Activate/Deactivate**: Change status for selected people
- **Add to Groups**: Add selected people to distribution groups
- **Remove from Groups**: Remove selected people from distribution groups
- **Send Invitations**: Send invites to selected uninvited users
- **Export Selected**: Export selected people to CSV

## Form Validation Patterns

### Common Validation Rules

```typescript
// Email validation
email: z.string().email('Invalid email format').optional().or(z.literal(''))

// Phone validation
phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number').optional()

// Required string with length
name: z.string().min(1, 'Name is required').max(50, 'Name too long')

// Optional string with max length
description: z.string().max(500, 'Description too long').optional()

// UUID validation
id: z.string().uuid('Invalid ID format')

// URL validation
website: z.string().url('Invalid URL format').optional().or(z.literal(''))
```

### Async Validation

Some fields require server-side validation:

```typescript
// Check for duplicate email
const validateUniqueEmail = async (email: string, personId?: string) => {
  const response = await fetch(`/api/projects/${projectId}/directory/validate-email`, {
    method: 'POST',
    body: JSON.stringify({ email, excludePersonId: personId })
  });
  const { isUnique } = await response.json();
  return isUnique;
};

// Check company exists
const validateCompanyExists = async (companyId: string) => {
  const response = await fetch(`/api/companies/${companyId}`);
  return response.ok;
};
```

## Form State Management

### Loading States

All forms implement consistent loading states:

```typescript
interface FormState {
  isLoading: boolean;      // Form submission in progress
  isValidating: boolean;   // Async validation in progress
  errors: FieldErrors;     // Form validation errors
  isDirty: boolean;        // Form has unsaved changes
  isValid: boolean;        // All validations passed
}
```

### Error Handling

Forms display errors at multiple levels:

1. **Field-level errors**: Individual field validation messages
2. **Form-level errors**: General submission errors
3. **Server errors**: API response errors
4. **Network errors**: Connection/timeout errors

### Success Feedback

Upon successful form submission:

1. **Toast notification**: Confirmation message
2. **Modal closure**: Form dialog closes
3. **Data refresh**: Parent list updates
4. **Optimistic updates**: UI updates immediately

## Accessibility Features

All forms implement WCAG 2.1 AA compliance:

- **Keyboard navigation**: Tab order and shortcuts
- **Screen reader support**: ARIA labels and descriptions
- **Focus management**: Proper focus trapping in modals
- **Error announcements**: Screen reader error messages
- **High contrast**: Sufficient color contrast ratios
- **Text scaling**: Support for 200% zoom without horizontal scrolling

## Mobile Responsiveness

Forms adapt to different screen sizes:

- **Desktop**: Full two-column layouts
- **Tablet**: Single column with larger touch targets
- **Mobile**: Stacked fields with optimized spacing
- **Touch optimization**: Minimum 44px touch targets
- **Scroll behavior**: Smooth scrolling to validation errors