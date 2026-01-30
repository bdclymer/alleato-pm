# Directory Database Schema

## Database Tables Overview

The Directory system uses 6 main tables to manage users, contacts, companies, permissions, and groups:

1. `people` - Unified table for users and contacts
2. `users_auth` - Links people to Supabase authentication
3. `project_directory_memberships` - Project-specific access and permissions
4. `permission_templates` - Reusable permission rule sets
5. `distribution_groups` - Communication/notification groups
6. `distribution_group_members` - Group membership mapping

## Table Definitions

### 1. people

**Purpose**: Unified storage for both users and contacts in the system

```sql
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
  notes TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique emails for users only
  CONSTRAINT unique_user_email UNIQUE(email)
    WHERE person_type = 'user' AND email IS NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_people_company_id ON people(company_id);
CREATE INDEX idx_people_type_status ON people(person_type, status);
CREATE INDEX idx_people_name ON people(first_name, last_name);
CREATE INDEX idx_people_email ON people(email) WHERE email IS NOT NULL;

-- RLS Policies
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view people in their projects" ON people
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      JOIN project_members pm ON pm.project_id = pdm.project_id
      WHERE pdm.person_id = people.id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert people in their projects" ON people
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'project_manager')
    )
  );
```

### 2. users_auth

**Purpose**: Links people records to Supabase authentication system

```sql
CREATE TABLE users_auth (
  person_id UUID PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_auth_user UNIQUE(auth_user_id)
);

-- Indexes
CREATE INDEX idx_users_auth_person_id ON users_auth(person_id);
CREATE INDEX idx_users_auth_auth_user_id ON users_auth(auth_user_id);

-- RLS Policies
ALTER TABLE users_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own auth record" ON users_auth
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "System can manage auth records" ON users_auth
  FOR ALL USING (auth.role() = 'service_role');
```

### 3. project_directory_memberships

**Purpose**: Manages project-specific access, roles, and invitation status

```sql
CREATE TABLE project_directory_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  permission_template_id UUID REFERENCES permission_templates(id),
  role TEXT,
  invited_at TIMESTAMPTZ,
  last_invited_at TIMESTAMPTZ,
  invite_status TEXT CHECK (invite_status IN ('not_invited', 'invited', 'accepted', 'expired')) DEFAULT 'not_invited',
  invite_token TEXT,
  invite_expires_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_project_person UNIQUE(project_id, person_id)
);

-- Indexes
CREATE INDEX idx_pdm_project_id ON project_directory_memberships(project_id);
CREATE INDEX idx_pdm_person_id ON project_directory_memberships(person_id);
CREATE INDEX idx_pdm_invite_token ON project_directory_memberships(invite_token)
  WHERE invite_token IS NOT NULL;
CREATE INDEX idx_pdm_status ON project_directory_memberships(status);

-- RLS Policies
ALTER TABLE project_directory_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view memberships in their projects" ON project_directory_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_directory_memberships.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin users can manage memberships" ON project_directory_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_directory_memberships.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'project_manager')
    )
  );
```

### 4. permission_templates

**Purpose**: Defines reusable permission rule sets for different user types

```sql
CREATE TABLE permission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT CHECK (scope IN ('project', 'company', 'global')) DEFAULT 'project',
  rules_json JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_permission_templates_scope ON permission_templates(scope);
CREATE INDEX idx_permission_templates_active ON permission_templates(is_active);

-- RLS Policies
ALTER TABLE permission_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view templates" ON permission_templates
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = TRUE);

CREATE POLICY "Only admins can manage templates" ON permission_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );

-- Insert default permission templates
INSERT INTO permission_templates (name, description, rules_json, is_system) VALUES
('Admin', 'Full administrative access', '{
  "directory": ["read", "write", "admin"],
  "budget": ["read", "write", "admin"],
  "contracts": ["read", "write", "admin"],
  "change_orders": ["read", "write", "admin"],
  "documents": ["read", "write", "admin"],
  "meetings": ["read", "write", "admin"]
}', TRUE),
('Project Manager', 'Standard project management access', '{
  "directory": ["read", "write"],
  "budget": ["read", "write"],
  "contracts": ["read", "write"],
  "change_orders": ["read", "write"],
  "documents": ["read", "write"],
  "meetings": ["read", "write"]
}', TRUE),
('Subcontractor', 'Limited contractor access', '{
  "directory": ["read"],
  "budget": ["read"],
  "contracts": ["read"],
  "change_orders": ["read"],
  "documents": ["read"],
  "meetings": ["read"]
}', TRUE),
('View Only', 'Read-only access', '{
  "directory": ["read"],
  "budget": ["read"],
  "contracts": ["read"],
  "change_orders": ["read"],
  "documents": ["read"],
  "meetings": ["read"]
}', TRUE);
```

### 5. distribution_groups

**Purpose**: Manages communication groups for notifications and document distribution

```sql
CREATE TABLE distribution_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT CHECK (group_type IN ('manual', 'automatic', 'role_based')) DEFAULT 'manual',
  auto_rules JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_project_group_name UNIQUE(project_id, name)
);

-- Indexes
CREATE INDEX idx_distribution_groups_project_id ON distribution_groups(project_id);
CREATE INDEX idx_distribution_groups_status ON distribution_groups(status);

-- RLS Policies
ALTER TABLE distribution_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups in their projects" ON distribution_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = distribution_groups.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage groups in their projects" ON distribution_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = distribution_groups.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'project_manager')
    )
  );
```

### 6. distribution_group_members

**Purpose**: Maps people to distribution groups

```sql
CREATE TABLE distribution_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES distribution_groups(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_group_person UNIQUE(group_id, person_id)
);

-- Indexes
CREATE INDEX idx_dgm_group_id ON distribution_group_members(group_id);
CREATE INDEX idx_dgm_person_id ON distribution_group_members(person_id);

-- RLS Policies
ALTER TABLE distribution_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group members in their projects" ON distribution_group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM distribution_groups dg
      JOIN project_members pm ON pm.project_id = dg.project_id
      WHERE dg.id = distribution_group_members.group_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage group members in their projects" ON distribution_group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM distribution_groups dg
      JOIN project_members pm ON pm.project_id = dg.project_id
      WHERE dg.id = distribution_group_members.group_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'project_manager')
    )
  );
```

## Data Migration Scripts

### Migration from existing users table

```sql
-- Step 1: Create new tables (already done above)

-- Step 2: Migrate existing users to people table
INSERT INTO people (
  id, first_name, last_name, email, job_title, company_id,
  person_type, status, created_at, updated_at
)
SELECT
  id,
  SPLIT_PART(name, ' ', 1) as first_name,
  CASE
    WHEN name LIKE '% %' THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE ''
  END as last_name,
  email,
  role as job_title,
  company_id,
  'user' as person_type,
  CASE WHEN status = 'active' THEN 'active' ELSE 'inactive' END as status,
  created_at,
  updated_at
FROM users
WHERE email IS NOT NULL;

-- Step 3: Create auth links for existing users
INSERT INTO users_auth (person_id, auth_user_id)
SELECT
  p.id,
  au.id
FROM people p
JOIN auth.users au ON au.email = p.email
WHERE p.person_type = 'user';

-- Step 4: Migrate project memberships
INSERT INTO project_directory_memberships (
  project_id, person_id, role, status, created_at, updated_at
)
SELECT
  pu.project_id,
  p.id as person_id,
  pu.role,
  'active' as status,
  pu.created_at,
  pu.updated_at
FROM project_users pu
JOIN people p ON p.email = pu.user_email
WHERE p.person_type = 'user';

-- Step 5: Assign default permission templates based on role
UPDATE project_directory_memberships
SET permission_template_id = pt.id
FROM permission_templates pt
WHERE
  project_directory_memberships.permission_template_id IS NULL
  AND pt.name = CASE
    WHEN project_directory_memberships.role = 'admin' THEN 'Admin'
    WHEN project_directory_memberships.role IN ('project_manager', 'superintendent') THEN 'Project Manager'
    WHEN project_directory_memberships.role IN ('subcontractor', 'vendor') THEN 'Subcontractor'
    ELSE 'View Only'
  END;
```

## Views and Helper Functions

### Useful views for common queries

```sql
-- View: Active project directory with company info
CREATE VIEW project_directory_view AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone_mobile,
  p.job_title,
  p.person_type,
  c.name as company_name,
  pdm.project_id,
  pdm.role,
  pdm.invite_status,
  pt.name as permission_template_name,
  pdm.status as membership_status
FROM people p
LEFT JOIN companies c ON c.id = p.company_id
JOIN project_directory_memberships pdm ON pdm.person_id = p.id
LEFT JOIN permission_templates pt ON pt.id = pdm.permission_template_id
WHERE p.status = 'active' AND pdm.status = 'active';

-- Function: Get user permissions for a project
CREATE OR REPLACE FUNCTION get_user_permissions(
  user_id UUID,
  project_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  permissions JSONB;
BEGIN
  SELECT pt.rules_json INTO permissions
  FROM project_directory_memberships pdm
  JOIN permission_templates pt ON pt.id = pdm.permission_template_id
  JOIN people p ON p.id = pdm.person_id
  JOIN users_auth ua ON ua.person_id = p.id
  WHERE ua.auth_user_id = user_id
  AND pdm.project_id = project_id
  AND pdm.status = 'active';

  RETURN COALESCE(permissions, '{}'::JSONB);
END;
$$;
```

## Performance Considerations

### Recommended Indexes

```sql
-- Additional indexes for performance
CREATE INDEX CONCURRENTLY idx_people_search
ON people USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(email, '')));

CREATE INDEX CONCURRENTLY idx_companies_name
ON companies(name);

CREATE INDEX CONCURRENTLY idx_pdm_project_status
ON project_directory_memberships(project_id, status);
```

### Query Optimization Tips

1. Always filter by `project_id` first in queries
2. Use `status = 'active'` filters to exclude soft-deleted records
3. Leverage the `project_directory_view` for common queries
4. Use pagination for large result sets (LIMIT/OFFSET)
5. Consider materialized views for complex aggregations

## Backup and Maintenance

### Regular Maintenance Tasks

```sql
-- Clean up expired invitations (run monthly)
UPDATE project_directory_memberships
SET invite_status = 'expired'
WHERE invite_status = 'invited'
AND invite_expires_at < NOW();

-- Update statistics
ANALYZE people;
ANALYZE project_directory_memberships;
ANALYZE distribution_groups;
ANALYZE distribution_group_members;
```

### Backup Strategy

- Full database backups daily
- Transaction log backups every 15 minutes
- Point-in-time recovery capability
- Test restore procedures monthly