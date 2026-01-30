# Directory API Endpoints Specification

## Overview (Last Verified: 2026-01-19)

The Directory API provides comprehensive REST endpoints for managing people, companies, distribution groups, and permissions within projects. All endpoints follow consistent patterns and include proper authentication, authorization, and error handling.

**Implementation Status:** Partially Complete - Export functionality implemented, import endpoints return 501 Not Implemented.

## Base URL Structure

```
/api/projects/[projectId]/directory/...
```

All endpoints are scoped to a specific project and require appropriate project-level permissions.

## Authentication & Authorization

### Request Headers

```
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

### Permission Levels

- **Read**: Can view directory data
- **Write**: Can create and modify directory data
- **Admin**: Can manage permissions and perform administrative tasks

## People Management Endpoints

### 1. List People

**Endpoint**: `GET /api/projects/[projectId]/directory/people`

**Purpose**: Retrieve paginated list of people with filtering and search

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number (1-based) |
| `limit` | number | No | 50 | Items per page (max 100) |
| `search` | string | No | - | Search across name, email, company |
| `type` | string | No | all | Filter by person type: `user`, `contact`, `all` |
| `status` | string | No | active | Filter by status: `active`, `inactive`, `all` |
| `company_id` | string | No | - | Filter by company UUID |
| `permission_template_id` | string | No | - | Filter by permission template |
| `group_by` | string | No | none | Group results: `company`, `none` |
| `sort` | string | No | name | Sort field: `name`, `email`, `company`, `role`, `created_at` |
| `order` | string | No | asc | Sort direction: `asc`, `desc` |

#### Response

```typescript
{
  success: boolean;
  data: {
    people: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      phoneMobile?: string;
      phoneBusiness?: string;
      jobTitle?: string;
      personType: 'user' | 'contact';
      status: 'active' | 'inactive';
      company?: {
        id: string;
        name: string;
        type?: string;
      };
      membership?: {
        id: string;
        role?: string;
        inviteStatus: 'not_invited' | 'invited' | 'accepted' | 'expired';
        permissionTemplate?: {
          id: string;
          name: string;
        };
        status: 'active' | 'inactive';
        createdAt: string;
      };
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    groups?: Array<{
      key: string;
      label: string;
      count: number;
      people: Array<PersonData>;
    }>;
  };
  meta: {
    filters: QueryFilters;
    executionTime: number;
  };
}
```

#### Example Request

```bash
GET /api/projects/123/directory/people?search=john&company_id=456&group_by=company&sort=name&order=asc
```

### 2. Create Person

**Endpoint**: `POST /api/projects/[projectId]/directory/people`

**Purpose**: Create a new user or contact in the project directory

#### Request Body

```typescript
{
  firstName: string;
  lastName: string;
  email?: string; // Required for users
  phoneMobile?: string;
  phoneBusiness?: string;
  jobTitle?: string;
  personType: 'user' | 'contact';
  companyId?: string;
  permissionTemplateId?: string; // Required for users
  role?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  notes?: string;
}
```

#### Response

```typescript
{
  success: boolean;
  data: {
    person: PersonData;
    membership: MembershipData;
  };
  message: string;
}
```

#### Example Request

```bash
POST /api/projects/123/directory/people
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "personType": "user",
  "companyId": "company-uuid",
  "permissionTemplateId": "template-uuid",
  "role": "Project Manager"
}
```

### 3. Get Person

**Endpoint**: `GET /api/projects/[projectId]/directory/people/[personId]`

**Purpose**: Retrieve detailed information about a specific person

#### Response

```typescript
{
  success: boolean;
  data: {
    person: PersonData;
    membership: MembershipData;
    distributionGroups: Array<{
      id: string;
      name: string;
      description?: string;
    }>;
    auditLog?: Array<AuditLogEntry>;
  };
}
```

### 4. Update Person

**Endpoint**: `PATCH /api/projects/[projectId]/directory/people/[personId]`

**Purpose**: Update person information and/or project membership

#### Request Body

```typescript
{
  // Person fields (optional)
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneMobile?: string;
  phoneBusiness?: string;
  jobTitle?: string;
  companyId?: string;
  notes?: string;

  // Membership fields (optional)
  permissionTemplateId?: string;
  role?: string;
  status?: 'active' | 'inactive';
}
```

#### Response

```typescript
{
  success: boolean;
  data: {
    person: PersonData;
    membership: MembershipData;
  };
  message: string;
}
```

### 5. Delete Person

**Endpoint**: `DELETE /api/projects/[projectId]/directory/people/[personId]`

**Purpose**: Soft delete person from project directory

#### Response

```typescript
{
  success: boolean;
  message: string;
}
```

## Person Actions Endpoints

### 6. Deactivate Person

**Endpoint**: `POST /api/projects/[projectId]/directory/people/[personId]/deactivate`

**Purpose**: Deactivate person's access to the project

#### Response

```typescript
{
  success: boolean;
  data: {
    person: PersonData;
    membership: MembershipData;
  };
  message: string;
}
```

### 7. Reactivate Person

**Endpoint**: `POST /api/projects/[projectId]/directory/people/[personId]/reactivate`

**Purpose**: Restore person's access to the project

#### Response

```typescript
{
  success: boolean;
  data: {
    person: PersonData;
    membership: MembershipData;
  };
  message: string;
}
```

### 8. Send Invitation

**Endpoint**: `POST /api/projects/[projectId]/directory/people/[personId]/invite`

**Purpose**: Send or resend invitation to a user

#### Request Body

```typescript
{
  message?: string;
  expiresInDays?: number; // Default: 7, Max: 30
  sendEmail?: boolean; // Default: true
}
```

#### Response

```typescript
{
  success: boolean;
  data: {
    inviteToken: string;
    inviteUrl: string;
    expiresAt: string;
    emailSent: boolean;
  };
  message: string;
}
```

### 9. Resend Invitation

**Endpoint**: `POST /api/projects/[projectId]/directory/people/[personId]/reinvite`

**Purpose**: Resend existing invitation or generate new one

#### Request Body

```typescript
{
  message?: string;
  generateNewToken?: boolean; // Default: false
}
```

## Companies Management Endpoints

### 10. List Companies

**Endpoint**: `GET /api/projects/[projectId]/directory/companies`

**Purpose**: Get companies associated with the project directory

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search` | string | No | - | Search company names |
| `type` | string | No | - | Filter by company type |
| `status` | string | No | active | Filter by status |

#### Response

```typescript
{
  success: boolean;
  data: {
    companies: Array<{
      id: string;
      name: string;
      type?: string;
      website?: string;
      phone?: string;
      email?: string;
      status: 'active' | 'inactive';
      peopleCount: number;
      createdAt: string;
    }>;
  };
}
```

### 11. Create Company

**Endpoint**: `POST /api/projects/[projectId]/directory/companies`

**Purpose**: Create a new company and associate with project

#### Request Body

```typescript
{
  name: string;
  type?: string;
  website?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  taxId?: string;
  licenseNumber?: string;
  insuranceExpiry?: string;
  notes?: string;
}
```

## Distribution Groups Endpoints

### 12. List Distribution Groups

**Endpoint**: `GET /api/projects/[projectId]/directory/groups`

**Purpose**: Get all distribution groups for the project

#### Response

```typescript
{
  success: boolean;
  data: {
    groups: Array<{
      id: string;
      name: string;
      description?: string;
      groupType: 'manual' | 'automatic' | 'role_based';
      memberCount: number;
      status: 'active' | 'inactive';
      createdAt: string;
    }>;
  };
}
```

### 13. Create Distribution Group

**Endpoint**: `POST /api/projects/[projectId]/directory/groups`

**Purpose**: Create a new distribution group

#### Request Body

```typescript
{
  name: string;
  description?: string;
  groupType: 'manual' | 'automatic' | 'role_based';
  autoRules?: {
    includeRoles?: string[];
    includeCompanies?: string[];
    includePermissions?: string[];
    excludeInactive?: boolean;
  };
  initialMembers?: string[]; // Array of person IDs
}
```

### 14. Get Distribution Group

**Endpoint**: `GET /api/projects/[projectId]/directory/groups/[groupId]`

**Purpose**: Get detailed group information including members

#### Response

```typescript
{
  success: boolean;
  data: {
    group: DistributionGroupData;
    members: Array<{
      id: string;
      person: PersonData;
      addedAt: string;
      addedBy?: string;
    }>;
  };
}
```

### 15. Update Distribution Group

**Endpoint**: `PATCH /api/projects/[projectId]/directory/groups/[groupId]`

**Purpose**: Update group information and rules

### 16. Add Group Members

**Endpoint**: `POST /api/projects/[projectId]/directory/groups/[groupId]/members`

**Purpose**: Add people to distribution group

#### Request Body

```typescript
{
  personIds: string[];
  skipNotification?: boolean; // Default: false
}
```

### 17. Remove Group Member

**Endpoint**: `DELETE /api/projects/[projectId]/directory/groups/[groupId]/members/[personId]`

**Purpose**: Remove person from distribution group

## Permission Templates Endpoints

### 18. List Permission Templates

**Endpoint**: `GET /api/projects/[projectId]/directory/permissions/templates`

**Purpose**: Get available permission templates

#### Response

```typescript
{
  success: boolean;
  data: {
    templates: Array<{
      id: string;
      name: string;
      description?: string;
      scope: 'project' | 'company' | 'global';
      rulesJson: object;
      isSystem: boolean;
      isActive: boolean;
    }>;
  };
}
```

### 19. Create Permission Template

**Endpoint**: `POST /api/projects/[projectId]/directory/permissions/templates`

**Purpose**: Create custom permission template

### 20. Get User Permissions

**Endpoint**: `GET /api/projects/[projectId]/directory/permissions/user/[userId]`

**Purpose**: Get effective permissions for a specific user

#### Response

```typescript
{
  success: boolean;
  data: {
    permissions: {
      directory: string[];
      budget: string[];
      contracts: string[];
      // ... other modules
    };
    template: PermissionTemplateData;
    overrides: Array<PermissionOverride>;
  };
}
```

## Bulk Operations Endpoints

### 21. Bulk Update People

**Endpoint**: `POST /api/projects/[projectId]/directory/people/bulk-update`

**Purpose**: Perform bulk operations on multiple people

#### Request Body

```typescript
{
  personIds: string[];
  action: 'change_permission' | 'change_status' | 'add_to_groups' | 'remove_from_groups';
  data: {
    permissionTemplateId?: string;
    status?: 'active' | 'inactive';
    groupIds?: string[];
  };
}
```

### 22. Bulk Send Invitations

**Endpoint**: `POST /api/projects/[projectId]/directory/people/bulk-invite`

**Purpose**: Send invitations to multiple users

#### Request Body

```typescript
{
  personIds: string[];
  message?: string;
  expiresInDays?: number;
}
```

## Import/Export Endpoints ⚠️ PARTIALLY IMPLEMENTED

### 23. Import People ❌ NOT IMPLEMENTED

**Endpoint**: `POST /api/projects/[projectId]/directory/import`
**Status**: Returns 501 Not Implemented
**Purpose**: Import people from CSV file

#### Request Body (multipart/form-data)

```typescript
{
  file: File; // CSV file
  type: 'users' | 'contacts' | 'companies';
  options: {
    hasHeaders: boolean;
    defaultCompanyId?: string;
    defaultPermissionTemplateId?: string;
    skipDuplicates: boolean;
    updateExisting: boolean;
  };
}
```

#### Response

```typescript
{
  success: boolean;
  data: {
    imported: number;
    skipped: number;
    errors: Array<{
      row: number;
      field?: string;
      message: string;
    }>;
  };
}
```

### 24. Export People ✅ IMPLEMENTED

**Endpoint**: `GET /api/projects/[projectId]/directory/export`
**Status**: Functional
**Purpose**: Export directory data to CSV

#### Query Parameters

Same as List People endpoint to apply filters to export

#### Response

```
Content-Type: text/csv
Content-Disposition: attachment; filename="directory-export.csv"

[CSV Data]
```

## Validation Endpoints

### 25. Validate Email

**Endpoint**: `POST /api/projects/[projectId]/directory/validate-email`

**Purpose**: Check if email is unique for users

#### Request Body

```typescript
{
  email: string;
  excludePersonId?: string;
}
```

#### Response

```typescript
{
  success: boolean;
  data: {
    isUnique: boolean;
    existingPerson?: {
      id: string;
      name: string;
      company?: string;
    };
  };
}
```

## Error Responses

### Standard Error Format

```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: object;
  };
  timestamp: string;
  requestId: string;
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `DUPLICATE_EMAIL` | 409 | Email already exists for users |
| `INVALID_COMPANY` | 400 | Company not found or inactive |
| `INVALID_PERMISSION_TEMPLATE` | 400 | Permission template not found |
| `INVITE_FAILED` | 500 | Email sending failed |
| `RATE_LIMITED` | 429 | Too many requests |

## Rate Limiting

### Limits

- **Read endpoints**: 100 requests per minute per user
- **Write endpoints**: 30 requests per minute per user
- **Bulk operations**: 10 requests per minute per user
- **Import/Export**: 3 requests per minute per user

### Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Webhook Events

### Available Events

- `directory.person.created`
- `directory.person.updated`
- `directory.person.deleted`
- `directory.person.invited`
- `directory.person.activated`
- `directory.person.deactivated`
- `directory.group.created`
- `directory.group.updated`
- `directory.group.member_added`
- `directory.group.member_removed`

### Webhook Payload

```typescript
{
  event: string;
  projectId: string;
  data: {
    person?: PersonData;
    group?: GroupData;
    changes?: object;
  };
  timestamp: string;
}
```