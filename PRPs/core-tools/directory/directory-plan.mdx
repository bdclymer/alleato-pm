# Project Directory Settings Implementation Plan

## Overview
Implement the "Project Directory Settings" page with two tabs:
1. **Project Roles** - Assign people to roles (Architect, Project Manager, Superintendent)
2. **Permissions Table** - View/manage user permissions for the directory tool

## Screenshots Reference
- Screenshot 1: Project Roles tab showing role/type/members table with multi-select dropdowns
- Screenshot 2: Permissions Table showing users with None/Read Only/Standard/Admin columns
- Screenshot 3: Project Home showing PROJECT TEAM section with Edit link

## Database Schema (Already Exists)
- `user_project_roles` table: membership_id, role_name, assigned_at
- `project_directory_memberships` table: project_id, person_id, permission_template_id
- `permission_templates` table: rules_json containing permission levels
- `user_permissions` table: granular permission overrides

## Implementation Plan

### 1. Create API Routes

#### `/api/projects/[id]/directory/roles/route.ts`
- `GET`: Fetch all project roles with assigned members
- `PUT`: Update role members (bulk update for a role)

#### `/api/projects/[id]/directory/settings/permissions/route.ts`
- `GET`: Fetch all users with their permission levels for this project

### 2. Create Settings Page

**Path**: `/[projectId]/directory/settings/page.tsx`

This page will have:
- "Back" button linking to directory
- Two sidebar tabs: "Project Roles" and "Permissions Table"
- Search sidebar for permissions tab

### 3. Create Components

#### `frontend/src/components/directory/settings/ProjectRolesTab.tsx`
- Table with Role, Type, Members columns
- Pre-defined roles: Architect, Project Manager, Superintendent
- Type is always "Person"
- Members column uses Combobox/MultiSelect to search and add people
- Save button to update role assignments

#### `frontend/src/components/directory/settings/PermissionsTableTab.tsx`
- Table showing Name (link), Company, None, Read Only, Standard, Admin
- Radio button selection for each user's permission level
- Shows checkmarks (green) and X marks (red) for current assignments
- Search sidebar for filtering

### 4. Update Directory Service

Add methods to `directoryService.ts`:
- `getProjectRoles(projectId)` - Get roles with assigned members
- `updateProjectRoleMembership(projectId, roleName, memberIds)` - Update role assignments
- `getDirectoryPermissions(projectId)` - Get all users with permission levels
- `updateUserDirectoryPermission(projectId, personId, level)` - Update permission level

### 5. Update Project Team Edit Link

Change link in `project-team.tsx` from:
`/projects/${projectId}/directory/configure`
to:
`/${projectId}/directory/settings`

### 6. Create Hooks

- `useProjectRoles(projectId)` - Fetch project roles
- `useUpdateProjectRole()` - Mutation to update role members
- `useDirectoryPermissions(projectId)` - Fetch user permissions

## File Structure

```
frontend/src/
├── app/[projectId]/directory/settings/
│   └── page.tsx
├── components/directory/settings/
│   ├── ProjectRolesTab.tsx
│   ├── PermissionsTableTab.tsx
│   └── PersonMultiSelect.tsx
├── hooks/
│   ├── use-project-roles.ts
│   └── use-directory-permissions.ts
└── app/api/projects/[id]/directory/
    ├── roles/route.ts
    └── settings/permissions/route.ts
```

## Pre-defined Project Roles
Based on Procore screenshots:
1. Architect
2. Project Manager
3. Superintendent

## Permission Levels
Based on Procore screenshots:
- None (no access)
- Read Only (view only)
- Standard (read + write)
- Admin (full access)

## Implementation Order
1. Create API routes for roles and permissions
2. Create hooks for data fetching
3. Create the settings page with tab navigation
4. Implement ProjectRolesTab component
5. Implement PermissionsTableTab component
6. Update Project Team edit link
7. Test end-to-end flow

## Critical Files to Modify
- `frontend/src/components/project-home/project-team.tsx` (update edit link)
- `frontend/src/services/directoryService.ts` (add new methods)
- `frontend/src/config/directory-tabs.ts` (optional: add settings tab)

## New Files to Create
- `frontend/src/app/[projectId]/directory/settings/page.tsx`
- `frontend/src/app/api/projects/[id]/directory/roles/route.ts`
- `frontend/src/app/api/projects/[id]/directory/settings/permissions/route.ts`
- `frontend/src/components/directory/settings/ProjectRolesTab.tsx`
- `frontend/src/components/directory/settings/PermissionsTableTab.tsx`
- `frontend/src/components/directory/settings/PersonMultiSelect.tsx`
- `frontend/src/hooks/use-project-roles.ts`
- `frontend/src/hooks/use-directory-permissions.ts`
