# Procore-Style Project Directory Implementation Plan

## Executive Summary

This document outlines a comprehensive implementation plan for building Procore-style Project Directory functionality in the Alleato-Procore system. Based on analysis of Procore's directory documentation and the current codebase, this plan provides a phased approach to implementing user management, company management, permissions, and collaboration features.

## Current State Analysis

### Existing Infrastructure
- ✅ Basic user management UI (`/frontend/src/app/(tables)/users/page.tsx`)
- ✅ Project setup wizard with directory components
- ✅ Database tables: `users`, `companies`, `project_directory`, `project_users`, `project_members`
- ✅ Supabase authentication integrated
- ✅ Basic role system (Admin, Project Manager, Superintendent, Foreman, Viewer)
- ✅ Active/inactive status management

### Gaps to Address
- ❌ No contacts management (non-user people)
- ❌ No distribution groups implementation
- ❌ Limited permission templates
- ❌ No invite/reinvite workflow
- ❌ No import/export functionality
- ❌ Limited search/filter/grouping capabilities
- ❌ No company-based grouping in UI

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

#### 1.1 Database Schema Enhancement

**New Tables:**
```sql
-- Unified people table for users and contacts
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone_mobile TEXT,
  phone_business TEXT,
  job_title TEXT,
  company_id UUID REFERENCES companies(id),
  person_type TEXT CHECK (person_type IN ('user', 'contact')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email) WHERE person_type = 'user' AND email IS NOT NULL
);

-- Link users to auth system
CREATE TABLE users_auth (
  person_id UUID PRIMARY KEY REFERENCES people(id),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id),
  last_login_at TIMESTAMPTZ,
  UNIQUE(auth_user_id)
);

-- Enhanced project directory memberships
CREATE TABLE project_directory_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  person_id UUID NOT NULL REFERENCES people(id),
  permission_template_id UUID REFERENCES permission_templates(id),
  role TEXT,
  invited_at TIMESTAMPTZ,
  last_invited_at TIMESTAMPTZ,
  invite_status TEXT CHECK (invite_status IN ('not_invited', 'invited', 'accepted', 'expired')) DEFAULT 'not_invited',
  invite_token TEXT,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, person_id)
);

-- Permission templates
CREATE TABLE permission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT CHECK (scope IN ('project', 'company', 'global')) DEFAULT 'project',
  rules_json JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Distribution groups
CREATE TABLE distribution_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- Distribution group members
CREATE TABLE distribution_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES distribution_groups(id),
  person_id UUID NOT NULL REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, person_id)
);

-- User preferences for UI state
CREATE TABLE user_project_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);
```

#### 1.2 Data Migration Strategy
```sql
-- Migrate existing users to people table
INSERT INTO people (id, first_name, last_name, email, job_title, company_id, person_type, status, created_at, updated_at)
SELECT 
  id,
  SPLIT_PART(name, ' ', 1) as first_name,
  SPLIT_PART(name, ' ', 2) as last_name,
  email,
  role as job_title,
  company_id,
  'user' as person_type,
  CASE WHEN status = 'active' THEN 'active' ELSE 'inactive' END,
  created_at,
  updated_at
FROM users;

-- Create users_auth links
INSERT INTO users_auth (person_id, auth_user_id)
SELECT id, id FROM users WHERE EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = users.id);
```

#### 1.3 Core API Development

**Directory Service (`/frontend/src/services/directoryService.ts`):**
```typescript
interface DirectoryFilters {
  search?: string;
  type?: 'user' | 'contact' | 'all';
  status?: 'active' | 'inactive' | 'all';
  companyId?: string;
  permissionTemplateId?: string;
  groupBy?: 'company' | 'none';
  sortBy?: string[];
  page?: number;
  perPage?: number;
}

class DirectoryService {
  async getPeople(projectId: string, filters: DirectoryFilters) {
    // Implementation with Supabase query builder
  }

  async createPerson(projectId: string, data: PersonCreateDTO) {
    // Create person and membership
  }

  async updatePerson(projectId: string, personId: string, data: PersonUpdateDTO) {
    // Update person and/or membership
  }

  async inviteUser(projectId: string, personId: string) {
    // Generate token, send email, update status
  }

  async deactivatePerson(projectId: string, personId: string) {
    // Soft delete by setting status = 'inactive'
  }
}
```

### Phase 2: Core Features (Week 3-4)

#### 2.1 UI Components

**Directory Table Component (`/frontend/src/components/directory/DirectoryTable.tsx`):**
```typescript
interface DirectoryTableProps {
  projectId: string;
  type: 'users' | 'contacts' | 'companies' | 'groups';
  defaultGroupBy?: 'company' | 'none';
}

export function DirectoryTable({ projectId, type, defaultGroupBy = 'company' }: DirectoryTableProps) {
  // Implementation with:
  // - Search box
  // - Filter drawer
  // - Group by toggle
  // - Column visibility controls
  // - Bulk actions
  // - Row actions (Edit, Invite, Deactivate)
}
```

**Column Manager (`/frontend/src/components/directory/ColumnManager.tsx`):**
```typescript
interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  width?: string;
}

export function ColumnManager({ 
  columns, 
  onColumnsChange 
}: { 
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}) {
  // Drag and drop interface for column management
  // Show/hide checkboxes
  // Reset to default button
}
```

#### 2.2 Page Implementations

**Directory Main Page (`/frontend/src/app/[projectId]/directory/page.tsx`):**
```typescript
export default function ProjectDirectoryPage({ params }: { params: { projectId: string } }) {
  return (
    <Tabs defaultValue="users">
      <TabsList>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="contacts">Contacts</TabsTrigger>
        <TabsTrigger value="companies">Companies</TabsTrigger>
        <TabsTrigger value="groups">Distribution Groups</TabsTrigger>
        <TabsTrigger value="inactive-users">Inactive Users</TabsTrigger>
        <TabsTrigger value="inactive-contacts">Inactive Contacts</TabsTrigger>
        <TabsTrigger value="inactive-companies">Inactive Companies</TabsTrigger>
      </TabsList>
      
      <TabsContent value="users">
        <DirectoryTable projectId={params.projectId} type="users" />
      </TabsContent>
      {/* Other tabs... */}
    </Tabs>
  );
}
```

### Phase 3: Advanced Features (Week 5-6)

#### 3.1 Invite System Implementation

**Invite Service (`/frontend/src/services/inviteService.ts`):**
```typescript
class InviteService {
  async sendInvite(projectId: string, personId: string) {
    // 1. Generate secure token
    // 2. Create/update invite record
    // 3. Send email via email service
    // 4. Update UI state
  }

  async resendInvite(projectId: string, personId: string) {
    // Check for existing valid token
    // Either reuse or regenerate
    // Send email
  }

  async acceptInvite(token: string) {
    // Validate token
    // Create auth user if needed
    // Update membership status
    // Redirect to login/dashboard
  }
}
```

#### 3.2 Permission Templates

**Default Templates:**
```typescript
const defaultTemplates = [
  {
    name: 'Admin',
    rules: {
      directory: ['read', 'write', 'admin'],
      budget: ['read', 'write', 'admin'],
      contracts: ['read', 'write', 'admin'],
      // ... all modules
    }
  },
  {
    name: 'Project Manager',
    rules: {
      directory: ['read', 'write'],
      budget: ['read', 'write'],
      contracts: ['read', 'write'],
      // ... limited admin
    }
  },
  {
    name: 'Subcontractor',
    rules: {
      directory: ['read'],
      budget: ['read'],
      contracts: ['read'],
      // ... read-only access
    }
  },
  {
    name: 'View Only',
    rules: {
      directory: ['read'],
      // ... minimal access
    }
  }
];
```

#### 3.3 Import/Export Implementation

**CSV Import (`/frontend/src/services/importService.ts`):**
```typescript
interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
}

class ImportService {
  async importUsers(projectId: string, file: File): Promise<ImportResult> {
    // 1. Parse CSV
    // 2. Validate data
    // 3. Check for duplicates
    // 4. Batch create
    // 5. Return detailed results
  }

  async downloadTemplate(type: 'users' | 'contacts' | 'companies') {
    // Generate and download CSV template
  }
}
```

### Phase 4: Testing & Polish (Week 7-8)

#### 4.1 Unit Tests

```typescript
// Example test for directory service
describe('DirectoryService', () => {
  it('should filter users by company', async () => {
    const result = await directoryService.getPeople(projectId, {
      type: 'user',
      companyId: 'company-123',
      groupBy: 'company'
    });
    
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].key).toBe('company-123');
  });

  it('should handle invite flow correctly', async () => {
    const inviteResult = await inviteService.sendInvite(projectId, personId);
    
    expect(inviteResult.token).toBeTruthy();
    expect(mockEmailService.send).toHaveBeenCalledWith({
      to: person.email,
      template: 'project-invite',
      data: expect.objectContaining({
        inviteUrl: expect.stringContaining(inviteResult.token)
      })
    });
  });
});
```

#### 4.2 E2E Tests

```typescript
// Playwright test example
test.describe('Project Directory', () => {
  test('should search and filter users', async ({ page }) => {
    await page.goto(`/projects/${projectId}/directory`);
    
    // Search
    await page.fill('[data-testid="directory-search"]', 'John');
    await expect(page.locator('[data-testid="user-row"]')).toHaveCount(1);
    
    // Filter by company
    await page.click('[data-testid="filter-button"]');
    await page.selectOption('[data-testid="company-filter"]', 'company-123');
    await page.click('[data-testid="apply-filters"]');
    
    // Verify results
    const rows = await page.locator('[data-testid="user-row"]').all();
    for (const row of rows) {
      await expect(row.locator('[data-testid="company-name"]')).toContainText('Acme Corp');
    }
  });

  test('should invite new user', async ({ page }) => {
    await page.goto(`/projects/${projectId}/directory`);
    
    // Click invite on user row
    await page.click('[data-testid="user-row-1"] [data-testid="invite-button"]');
    
    // Verify success
    await expect(page.locator('[data-testid="toast"]')).toContainText('Invitation sent');
    await expect(page.locator('[data-testid="user-row-1"] [data-testid="invite-status"]')).toContainText('Invited');
  });
});
```

## Task Breakdown & Timeline

### Week 1-2: Foundation
- [ ] Create and run database migrations
- [ ] Implement data migration for existing users
- [ ] Create base directory service
- [ ] Set up API routes structure
- [ ] Create permission middleware

### Week 3-4: Core Features  
- [ ] Build DirectoryTable component
- [ ] Implement search/filter/sort/grouping
- [ ] Create column manager
- [ ] Build user/contact/company pages
- [ ] Implement basic CRUD operations

### Week 5-6: Advanced Features
- [ ] Implement invite/reinvite system
- [ ] Create permission templates
- [ ] Build distribution groups
- [ ] Add import/export functionality
- [ ] Implement bulk operations

### Week 7-8: Testing & Polish
- [ ] Write comprehensive unit tests
- [ ] Create integration tests
- [ ] Build E2E test suite
- [ ] Performance optimization
- [ ] Documentation

## Success Criteria

1. **Functional Requirements**
   - All specified routes and pages working
   - Search/filter/sort/group functionality operational
   - Invite system sending emails and updating status
   - Permission templates controlling access
   - Import/export working with CSV files

2. **Non-Functional Requirements**
   - Page load time < 2 seconds
   - Search results return < 500ms
   - Supports 10,000+ directory entries
   - Mobile responsive design
   - Accessibility compliant (WCAG 2.1 AA)

3. **Quality Metrics**
   - 80%+ test coverage
   - Zero critical bugs
   - All E2E tests passing
   - Performance benchmarks met

## Risk Mitigation

1. **Data Migration Risks**
   - Create comprehensive backup before migration
   - Test migration on staging environment
   - Implement rollback procedures

2. **Performance Risks**
   - Implement pagination early
   - Use database indexes on search fields
   - Consider caching for company/permission data

3. **Integration Risks**
   - Mock external services (email) for testing
   - Use feature flags for gradual rollout
   - Maintain backwards compatibility

## Conclusion

This implementation plan provides a structured approach to building Procore-style directory functionality. The phased approach allows for incremental delivery while maintaining system stability. Regular testing and quality checks ensure a robust, production-ready solution.

## Appendix: Key Procore Features Reference

Based on Procore documentation analysis, these are the critical features to replicate:

1. **Unified Directory Management**
   - Single source of truth for project participants
   - Automatic sync between company and project directories
   - Role-based access control

2. **Advanced Search & Filtering**
   - Multi-field search
   - Saved filter sets
   - Quick filters for common queries

3. **Bulk Operations**
   - Import from CSV/Excel
   - Bulk permission updates
   - Mass invite sending

4. **Audit & Compliance**
   - Activity tracking
   - Permission change history
   - Data export for compliance

5. **Mobile Support**
   - Responsive design
   - Touch-friendly interfaces
   - Offline capability (future enhancement)