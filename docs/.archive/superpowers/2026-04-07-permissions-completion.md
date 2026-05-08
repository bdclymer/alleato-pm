# Permissions System Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the permissions system so all modules support overrides, default templates are seeded, template management has a UI, the project admin panel works, and audit logging records all changes.

**Architecture:** Build in DB-first order: (1) schema migration adds `user_module_permissions` + `permission_audit_log` tables and seeds 5 default templates; (2) `lib/permissions.ts` is updated to read/write all-module overrides and log changes; (3) API routes for template CRUD + audit log are added; (4) admin UI for template management; (5) project admin panel with members, overrides, and audit log tabs.

**Tech Stack:** Next.js 15 App Router, Supabase PostgreSQL + RLS, React Query, shadcn/ui, `@/components/ds`, Tailwind CSS semantic tokens only.

---

## Task 1: DB Migration — `user_module_permissions`, `permission_audit_log`, seed templates, fix RLS

**Files:**
- Create: `supabase/migrations/20260407200000_permissions_completion.sql`

### Steps

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260407200000_permissions_completion.sql`:

```sql
-- ============================================================================
-- PERMISSIONS COMPLETION
-- 1. user_module_permissions  — per-user per-module overrides for all modules
-- 2. permission_audit_log     — immutable audit trail for permission changes
-- 3. Fix RLS on permission_templates  — restrict writes to app admins only
-- 4. Seed 5 default system permission templates
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. user_module_permissions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  person_id    UUID    NOT NULL REFERENCES public.people(id)   ON DELETE CASCADE,
  module       TEXT    NOT NULL,
  level        TEXT    NOT NULL CHECK (level IN ('none','read','write','admin')),
  updated_by   UUID    REFERENCES auth.users(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, person_id, module)
);

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ump_select" ON public.user_module_permissions
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT pdm.project_id
      FROM public.project_directory_memberships pdm
      JOIN public.users_auth ua ON ua.person_id = pdm.person_id
      WHERE ua.auth_user_id = auth.uid() AND pdm.status = 'active'
    )
  );

CREATE POLICY "ump_write" ON public.user_module_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ----------------------------------------------------------------------------
-- 2. permission_audit_log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permission_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  person_id    UUID    NOT NULL REFERENCES public.people(id)   ON DELETE CASCADE,
  changed_by   UUID    REFERENCES auth.users(id),
  action       TEXT    NOT NULL, -- 'set_override' | 'remove_override' | 'assign_template'
  module       TEXT,             -- null for template assignments
  old_level    TEXT,
  new_level    TEXT,
  template_id  UUID    REFERENCES public.permission_templates(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;

-- Anyone in the project can read audit logs; only admins write
CREATE POLICY "pal_select" ON public.permission_audit_log
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT pdm.project_id
      FROM public.project_directory_memberships pdm
      JOIN public.users_auth ua ON ua.person_id = pdm.person_id
      WHERE ua.auth_user_id = auth.uid() AND pdm.status = 'active'
    )
  );

CREATE POLICY "pal_insert" ON public.permission_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true); -- app-level code controls who can call the write functions

-- ----------------------------------------------------------------------------
-- 3. Fix RLS on permission_templates — restrict mutations to app admins
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "permission_templates_insert" ON public.permission_templates;
DROP POLICY IF EXISTS "permission_templates_update" ON public.permission_templates;
DROP POLICY IF EXISTS "permission_templates_delete" ON public.permission_templates;

-- Keep the existing broad SELECT policy; replace write policies
CREATE POLICY "pt_insert" ON public.permission_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "pt_update" ON public.permission_templates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "pt_delete" ON public.permission_templates
  FOR DELETE TO authenticated
  USING (
    is_system = false AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Seed default system permission templates
-- ----------------------------------------------------------------------------
INSERT INTO public.permission_templates (name, description, scope, is_system, rules_json)
VALUES
  (
    'Owner / Client',
    'Read-only access to all modules. Suitable for project owners and clients.',
    'project',
    true,
    '{
      "directory":    ["read"],
      "budget":       ["read"],
      "contracts":    ["read"],
      "documents":    ["read"],
      "schedule":     ["read"],
      "submittals":   ["read"],
      "rfis":         ["read"],
      "change_orders":["read"]
    }'::jsonb
  ),
  (
    'Project Manager',
    'Full write access to all modules except cannot administer directory or permissions.',
    'project',
    true,
    '{
      "directory":    ["read","write"],
      "budget":       ["read","write","admin"],
      "contracts":    ["read","write","admin"],
      "documents":    ["read","write"],
      "schedule":     ["read","write","admin"],
      "submittals":   ["read","write","admin"],
      "rfis":         ["read","write","admin"],
      "change_orders":["read","write","admin"]
    }'::jsonb
  ),
  (
    'Field Engineer',
    'Write access for field modules (RFIs, submittals, schedule, documents). Read-only for financials.',
    'project',
    true,
    '{
      "directory":    ["read"],
      "budget":       ["read"],
      "contracts":    ["read"],
      "documents":    ["read","write"],
      "schedule":     ["read","write"],
      "submittals":   ["read","write"],
      "rfis":         ["read","write"],
      "change_orders":["read"]
    }'::jsonb
  ),
  (
    'Subcontractor',
    'Read-only for most modules. Can create and respond to RFIs and submittals.',
    'project',
    true,
    '{
      "directory":    ["read"],
      "budget":       ["none"],
      "contracts":    ["read"],
      "documents":    ["read"],
      "schedule":     ["read"],
      "submittals":   ["read","write"],
      "rfis":         ["read","write"],
      "change_orders":["read"]
    }'::jsonb
  ),
  (
    'Read Only',
    'View-only access to all modules. No write permissions.',
    'project',
    true,
    '{
      "directory":    ["read"],
      "budget":       ["read"],
      "contracts":    ["read"],
      "documents":    ["read"],
      "schedule":     ["read"],
      "submittals":   ["read"],
      "rfis":         ["read"],
      "change_orders":["read"]
    }'::jsonb
  )
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Apply the migration**

```bash
cd /Users/meganharrison/Documents/alleato-pm
npx supabase db push
```

Expected: `Applying migration 20260407200000_permissions_completion.sql` with no errors.

- [ ] **Step 3: Regenerate Supabase types**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run db:types
```

Expected: `frontend/src/types/database.types.ts` updated with `user_module_permissions` and `permission_audit_log`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260407200000_permissions_completion.sql frontend/src/types/database.types.ts
git commit -m "feat(permissions): add user_module_permissions + audit_log tables, seed default templates, fix RLS"
```

---

## Task 2: Fix `lib/permissions.ts` — all-module overrides + audit logging

**Files:**
- Modify: `frontend/src/lib/permissions.ts`

### Steps

- [ ] **Step 1: Replace `setPermissionOverride`, `removePermissionOverride`, and `loadUserPermissions`**

Open `frontend/src/lib/permissions.ts` and replace the entire file content with:

```typescript
/**
 * Permissions System
 *
 * Utilities for working with the permission system.
 * Permissions flow: app admin > explicit module override > permission template > none
 */

import { createClient } from "@/lib/supabase/server";

export type PermissionLevel = "none" | "read" | "write" | "admin";
export type PermissionModule =
  | "directory"
  | "budget"
  | "contracts"
  | "documents"
  | "schedule"
  | "submittals"
  | "rfis"
  | "change_orders";

export const ALL_MODULES: PermissionModule[] = [
  "directory",
  "budget",
  "contracts",
  "documents",
  "schedule",
  "submittals",
  "rfis",
  "change_orders",
];

export interface UserPermissions {
  userId: string;
  personId: string;
  projectId: number;
  template?: {
    id: string;
    name: string;
    rules: Record<PermissionModule, PermissionLevel[]>;
  };
  overrides: Record<PermissionModule, PermissionLevel>;
  isAdmin: boolean;
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  rules_json: Record<PermissionModule, PermissionLevel[]>;
  is_system: boolean;
  scope?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a user has a specific permission level for a module.
 * Hierarchy: admin > write > read > none
 */
export function hasPermission(
  permissions: UserPermissions,
  module: PermissionModule,
  level: PermissionLevel
): boolean {
  if (permissions.isAdmin) return true;

  if (permissions.overrides[module] && permissions.overrides[module] !== "none") {
    return checkPermissionLevel(permissions.overrides[module], level);
  }

  if (permissions.template?.rules[module]) {
    const templateLevels = permissions.template.rules[module];
    return templateLevels.some((tl) => checkPermissionLevel(tl, level));
  }

  return false;
}

/**
 * Get the highest permission level a user has for a module.
 */
export function getPermissionLevel(
  permissions: UserPermissions,
  module: PermissionModule
): PermissionLevel {
  if (permissions.isAdmin) return "admin";

  if (permissions.overrides[module] && permissions.overrides[module] !== "none") {
    return permissions.overrides[module];
  }

  if (permissions.template?.rules[module]) {
    const levels = permissions.template.rules[module];
    if (levels.includes("admin")) return "admin";
    if (levels.includes("write")) return "write";
    if (levels.includes("read")) return "read";
  }

  return "none";
}

function checkPermissionLevel(
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel
): boolean {
  const order: PermissionLevel[] = ["none", "read", "write", "admin"];
  return order.indexOf(userLevel) >= order.indexOf(requiredLevel);
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/**
 * Load all permission data for the current (or specified) user on a project.
 */
export async function loadUserPermissions(
  projectId: number,
  userId?: string
): Promise<UserPermissions | null> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  const [profileResult, userAuthResult] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("users_auth")
      .select("person_id")
      .eq("auth_user_id", userId)
      .maybeSingle(),
  ]);

  if (!userAuthResult.data) return null;
  const personId = userAuthResult.data.person_id;
  const isAdmin = profileResult.data?.is_admin === true;

  const [membershipResult, overridesResult] = await Promise.all([
    supabase
      .from("project_directory_memberships")
      .select(
        `permission_template_id,
         permission_template:permission_templates (id, name, rules_json)`
      )
      .eq("project_id", projectId)
      .eq("person_id", personId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("user_module_permissions")
      .select("module, level")
      .eq("project_id", projectId)
      .eq("person_id", personId),
  ]);

  const rawTemplate = Array.isArray(membershipResult.data?.permission_template)
    ? membershipResult.data.permission_template[0]
    : membershipResult.data?.permission_template;

  const template = rawTemplate
    ? {
        id: rawTemplate.id,
        name: rawTemplate.name,
        rules: rawTemplate.rules_json as Record<PermissionModule, PermissionLevel[]>,
      }
    : undefined;

  // Build overrides map from user_module_permissions rows
  const emptyOverrides = Object.fromEntries(
    ALL_MODULES.map((m) => [m, "none" as PermissionLevel])
  ) as Record<PermissionModule, PermissionLevel>;

  const overrides = (overridesResult.data ?? []).reduce((acc, row) => {
    if (ALL_MODULES.includes(row.module as PermissionModule)) {
      acc[row.module as PermissionModule] = row.level as PermissionLevel;
    }
    return acc;
  }, emptyOverrides);

  return { userId: userId!, personId, projectId, template, overrides, isAdmin };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function getPermissionTemplates(): Promise<PermissionTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("permission_templates")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name");

  if (error) {
    console.error("Error loading permission templates:", error);
    return [];
  }

  return data ?? [];
}

export async function createPermissionTemplate(
  template: Omit<PermissionTemplate, "id">
): Promise<{ data?: PermissionTemplate; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("permission_templates")
    .insert({
      name: template.name,
      description: template.description,
      scope: template.scope ?? "project",
      is_system: false,
      rules_json: template.rules_json,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as PermissionTemplate };
}

export async function updatePermissionTemplate(
  templateId: string,
  updates: Partial<Omit<PermissionTemplate, "id" | "is_system">>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("permission_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", templateId)
    .eq("is_system", false); // never allow updating system templates

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deletePermissionTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("permission_templates")
    .delete()
    .eq("id", templateId)
    .eq("is_system", false);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Template assignment
// ---------------------------------------------------------------------------

export async function assignPermissionTemplate(
  projectId: number,
  personId: string,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("project_directory_memberships")
    .update({
      permission_template_id: templateId,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("person_id", personId);

  if (error) return { success: false, error: error.message };

  // Log the change
  await logPermissionChange(supabase, {
    project_id: projectId,
    person_id: personId,
    changed_by: user?.id,
    action: "assign_template",
    template_id: templateId,
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Module overrides
// ---------------------------------------------------------------------------

/**
 * Set an explicit per-module permission override for a user.
 * Works for ALL modules via user_module_permissions table.
 */
export async function setPermissionOverride(
  projectId: number,
  personId: string,
  module: PermissionModule,
  level: PermissionLevel
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get current level for audit log
  const { data: existing } = await supabase
    .from("user_module_permissions")
    .select("level")
    .eq("project_id", projectId)
    .eq("person_id", personId)
    .eq("module", module)
    .maybeSingle();

  const { error } = await supabase
    .from("user_module_permissions")
    .upsert(
      {
        project_id: projectId,
        person_id: personId,
        module,
        level,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,person_id,module" }
    );

  if (error) return { success: false, error: error.message };

  await logPermissionChange(supabase, {
    project_id: projectId,
    person_id: personId,
    changed_by: user?.id,
    action: "set_override",
    module,
    old_level: existing?.level,
    new_level: level,
  });

  return { success: true };
}

/**
 * Remove an explicit per-module permission override (falls back to template).
 */
export async function removePermissionOverride(
  projectId: number,
  personId: string,
  module: PermissionModule
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("user_module_permissions")
    .select("level")
    .eq("project_id", projectId)
    .eq("person_id", personId)
    .eq("module", module)
    .maybeSingle();

  const { error } = await supabase
    .from("user_module_permissions")
    .delete()
    .eq("project_id", projectId)
    .eq("person_id", personId)
    .eq("module", module);

  if (error) return { success: false, error: error.message };

  if (existing) {
    await logPermissionChange(supabase, {
      project_id: projectId,
      person_id: personId,
      changed_by: user?.id,
      action: "remove_override",
      module,
      old_level: existing.level,
    });
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

async function logPermissionChange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  entry: {
    project_id: number;
    person_id: string;
    changed_by?: string;
    action: string;
    module?: string;
    old_level?: string;
    new_level?: string;
    template_id?: string;
  }
): Promise<void> {
  await supabase.from("permission_audit_log").insert(entry);
}

export async function getPermissionAuditLog(
  projectId: number,
  limit = 50
): Promise<
  Array<{
    id: string;
    action: string;
    module: string | null;
    old_level: string | null;
    new_level: string | null;
    created_at: string;
    person: { first_name: string; last_name: string; email: string } | null;
    changed_by_profile: { email: string } | null;
    template: { name: string } | null;
  }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("permission_audit_log")
    .select(
      `id, action, module, old_level, new_level, created_at,
       person:people (first_name, last_name, email),
       template:permission_templates (name)`
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error loading audit log:", error);
    return [];
  }

  return (data ?? []) as any;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/permissions.ts
git commit -m "feat(permissions): fix all-module overrides and add audit logging to permissions lib"
```

---

## Task 3: API Routes — template CRUD + audit log + fix override route

**Files:**
- Create: `frontend/src/app/api/permissions/templates/[templateId]/route.ts`
- Modify: `frontend/src/app/api/permissions/templates/route.ts`
- Create: `frontend/src/app/api/projects/[projectId]/permissions/assign/route.ts`
- Create: `frontend/src/app/api/projects/[projectId]/permissions/override/route.ts`
- Create: `frontend/src/app/api/projects/[projectId]/permissions/audit/route.ts`

### Steps

- [ ] **Step 1: Add POST to templates route (create template)**

Replace `frontend/src/app/api/permissions/templates/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPermissionTemplates,
  createPermissionTemplate,
} from "@/lib/permissions";

export async function GET() {
  try {
    const templates = await getPermissionTemplates();
    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Error loading permission templates:", error);
    return NextResponse.json(
      { error: "Failed to load permission templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, rules_json } = body;

    if (!name || !rules_json) {
      return NextResponse.json(
        { error: "name and rules_json are required" },
        { status: 400 }
      );
    }

    const result = await createPermissionTemplate({
      name,
      description,
      rules_json,
      is_system: false,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error("Error creating permission template:", error);
    return NextResponse.json(
      { error: "Failed to create permission template" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create PUT + DELETE for a specific template**

Create `frontend/src/app/api/permissions/templates/[templateId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  updatePermissionTemplate,
  deletePermissionTemplate,
} from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return { error: "Forbidden", status: 403 };
  return { ok: true };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { templateId } = await params;
  const body = await request.json();
  const { name, description, rules_json } = body;

  const result = await updatePermissionTemplate(templateId, {
    name,
    description,
    rules_json,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { templateId } = await params;
  const result = await deletePermissionTemplate(templateId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create assign route**

Create `frontend/src/app/api/projects/[projectId]/permissions/assign/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { assignPermissionTemplate } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const { person_id, template_id } = body;

    if (!person_id || !template_id) {
      return NextResponse.json(
        { error: "person_id and template_id are required" },
        { status: 400 }
      );
    }

    const result = await assignPermissionTemplate(
      projectIdNum,
      person_id,
      template_id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error assigning permission template:", error);
    return NextResponse.json(
      { error: "Failed to assign template" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Create override route**

Create `frontend/src/app/api/projects/[projectId]/permissions/override/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import {
  setPermissionOverride,
  removePermissionOverride,
  type PermissionModule,
  type PermissionLevel,
  ALL_MODULES,
} from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const VALID_LEVELS: PermissionLevel[] = ["none", "read", "write", "admin"];

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const { person_id, module, level } = body;

    if (!person_id || !module || !level) {
      return NextResponse.json(
        { error: "person_id, module, and level are required" },
        { status: 400 }
      );
    }
    if (!ALL_MODULES.includes(module as PermissionModule)) {
      return NextResponse.json(
        { error: `module must be one of: ${ALL_MODULES.join(", ")}` },
        { status: 400 }
      );
    }
    if (!VALID_LEVELS.includes(level as PermissionLevel)) {
      return NextResponse.json(
        { error: `level must be one of: ${VALID_LEVELS.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await setPermissionOverride(
      projectIdNum,
      person_id,
      module as PermissionModule,
      level as PermissionLevel
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting permission override:", error);
    return NextResponse.json(
      { error: "Failed to set override" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;

    const { searchParams } = new URL(request.url);
    const personId = searchParams.get("person_id");
    const module = searchParams.get("module");

    if (!personId || !module) {
      return NextResponse.json(
        { error: "person_id and module query params are required" },
        { status: 400 }
      );
    }
    if (!ALL_MODULES.includes(module as PermissionModule)) {
      return NextResponse.json(
        { error: `module must be one of: ${ALL_MODULES.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await removePermissionOverride(
      projectIdNum,
      personId,
      module as PermissionModule
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing permission override:", error);
    return NextResponse.json(
      { error: "Failed to remove override" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Create audit log route**

Create `frontend/src/app/api/projects/[projectId]/permissions/audit/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { getPermissionAuditLog } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const log = await getPermissionAuditLog(projectIdNum, limit);
    return NextResponse.json({ data: log });
  } catch (error) {
    console.error("Error loading audit log:", error);
    return NextResponse.json(
      { error: "Failed to load audit log" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 6: Typecheck**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npx tsc --noEmit 2>&1 | head -40
```

Expected: zero new errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/api/permissions/ frontend/src/app/api/projects/
git commit -m "feat(permissions): add template CRUD routes, override route, and audit log route"
```

---

## Task 4: Admin — Permission Template Management UI

**Files:**
- Create: `frontend/src/app/(admin)/admin/permissions/page.tsx`
- Create: `frontend/src/app/(admin)/admin/permissions/permission-template-form.tsx`

The admin area at `(admin)/admin/` is the right place (see `(admin)/admin/company-info/page.tsx`).

### Steps

- [ ] **Step 1: Create the template form component**

Create `frontend/src/app/(admin)/admin/permissions/permission-template-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PermissionModule, PermissionLevel, PermissionTemplate } from "@/lib/permissions";

const MODULES: { key: PermissionModule; label: string }[] = [
  { key: "directory",    label: "Directory" },
  { key: "budget",       label: "Budget" },
  { key: "contracts",    label: "Contracts" },
  { key: "documents",    label: "Documents" },
  { key: "schedule",     label: "Schedule" },
  { key: "submittals",   label: "Submittals" },
  { key: "rfis",         label: "RFIs" },
  { key: "change_orders",label: "Change Orders" },
];

const LEVELS: PermissionLevel[] = ["none", "read", "write", "admin"];

type RulesState = Record<PermissionModule, PermissionLevel[]>;

function defaultRules(): RulesState {
  return Object.fromEntries(
    MODULES.map(({ key }) => [key, ["read"]])
  ) as RulesState;
}

function templateToRulesState(rules_json: Record<PermissionModule, PermissionLevel[]>): RulesState {
  return Object.fromEntries(
    MODULES.map(({ key }) => [key, rules_json[key] ?? ["read"]])
  ) as RulesState;
}

interface Props {
  template?: PermissionTemplate;
  onSave: (data: { name: string; description: string; rules_json: RulesState }) => Promise<void>;
  onCancel: () => void;
}

export function PermissionTemplateForm({ template, onSave, onCancel }: Props) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [rules, setRules] = useState<RulesState>(
    template ? templateToRulesState(template.rules_json) : defaultRules()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For each module, we represent the permission as the highest single level
  // (none/read/write/admin). Internally we expand to an array of levels.
  function getHighestLevel(module: PermissionModule): PermissionLevel {
    const levels = rules[module];
    if (levels.includes("admin")) return "admin";
    if (levels.includes("write")) return "write";
    if (levels.includes("read")) return "read";
    return "none";
  }

  function setHighestLevel(module: PermissionModule, level: PermissionLevel) {
    const expansion: Record<PermissionLevel, PermissionLevel[]> = {
      none:  ["none"],
      read:  ["read"],
      write: ["read", "write"],
      admin: ["read", "write", "admin"],
    };
    setRules((prev) => ({ ...prev, [module]: expansion[level] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), description: description.trim(), rules_json: rules });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="tpl-name">Name</Label>
          <Input
            id="tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Site Superintendent"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tpl-desc">Description</Label>
          <Textarea
            id="tpl-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe who this template is for..."
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Module Permissions</p>
        <div className="rounded-md border border-border divide-y divide-border">
          {MODULES.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm text-foreground">{label}</span>
              <Select
                value={getHighestLevel(key)}
                onValueChange={(v) => setHighestLevel(key, v as PermissionLevel)}
              >
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : template ? "Save Changes" : "Create Template"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create the templates management page**

Create `frontend/src/app/(admin)/admin/permissions/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ds";
import { PermissionTemplateForm } from "./permission-template-form";
import type { PermissionTemplate, PermissionModule, PermissionLevel } from "@/lib/permissions";

const MODULE_LABELS: Record<string, string> = {
  directory: "Directory", budget: "Budget", contracts: "Contracts",
  documents: "Documents", schedule: "Schedule", submittals: "Submittals",
  rfis: "RFIs", change_orders: "Change Orders",
};

const LEVEL_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  admin: "default", write: "secondary", read: "outline", none: "destructive",
};

async function fetchTemplates(): Promise<PermissionTemplate[]> {
  const res = await fetch("/api/permissions/templates");
  if (!res.ok) throw new Error("Failed to load templates");
  const { data } = await res.json();
  return data;
}

export default function PermissionsAdminPage() {
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["permission-templates"],
    queryFn: fetchTemplates,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<PermissionTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PermissionTemplate | null>(null);

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string; rules_json: Record<PermissionModule, PermissionLevel[]> }) => {
      const res = await fetch("/api/permissions/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to create template");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-templates"] });
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name: string; description: string; rules_json: Record<PermissionModule, PermissionLevel[]> }) => {
      const res = await fetch(`/api/permissions/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to update template");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-templates"] });
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/permissions/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to delete template");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-templates"] });
      setDeleteTarget(null);
    },
  });

  const systemTemplates = templates.filter((t) => t.is_system);
  const customTemplates = templates.filter((t) => !t.is_system);

  return (
    <PageShell
      variant="content"
      title="Permission Templates"
      description="Define reusable permission sets that can be assigned to project members."
      actions={
        <Button onClick={() => setShowCreate(true)}>
          New Template
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* System templates */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              System Templates
            </h2>
            {systemTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No system templates found.</p>
            ) : (
              <div className="space-y-3">
                {systemTemplates.map((tpl) => (
                  <TemplateCard key={tpl.id} template={tpl} readOnly />
                ))}
              </div>
            )}
          </section>

          {/* Custom templates */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Custom Templates
            </h2>
            {customTemplates.length === 0 ? (
              <EmptyState
                title="No custom templates"
                description="Create a template to define custom permission sets for your team."
              />
            ) : (
              <div className="space-y-3">
                {customTemplates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    onEdit={() => setEditTarget(tpl)}
                    onDelete={() => setDeleteTarget(tpl)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Permission Template</DialogTitle>
          </DialogHeader>
          <PermissionTemplateForm
            onSave={(data) => createMutation.mutateAsync(data)}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <PermissionTemplateForm
              template={editTarget}
              onSave={(data) => updateMutation.mutateAsync({ id: editTarget.id, ...data })}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. Members using this template will retain their existing access until reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function TemplateCard({
  template,
  readOnly = false,
  onEdit,
  onDelete,
}: {
  template: PermissionTemplate;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const modules = Object.entries(template.rules_json) as [string, string[]][];

  function highestLevel(levels: string[]): string {
    if (levels.includes("admin")) return "admin";
    if (levels.includes("write")) return "write";
    if (levels.includes("read")) return "read";
    return "none";
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{template.name}</p>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
          )}
        </div>
        {!readOnly && (
          <div className="flex gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">Delete</Button>
          </div>
        )}
        {readOnly && (
          <Badge variant="outline" className="shrink-0 text-xs">System</Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {modules.map(([module, levels]) => {
          const level = highestLevel(levels);
          return (
            <div key={module} className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">{MODULE_LABELS[module] ?? module}:</span>
              <Badge variant={LEVEL_VARIANT[level] ?? "outline"} className="text-xs py-0">
                {level}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npx tsc --noEmit 2>&1 | head -40
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/api/permissions/ frontend/src/app/(admin)/admin/permissions/
git commit -m "feat(permissions): add template management UI and CRUD API routes"
```

---

## Task 5: Project Admin Panel

**Files:**
- Modify: `frontend/src/app/(main)/[projectId]/admin/page.tsx`
- Create: `frontend/src/app/(main)/[projectId]/admin/_components/members-tab.tsx`
- Create: `frontend/src/app/(main)/[projectId]/admin/_components/audit-log-tab.tsx`

### Steps

- [ ] **Step 1: Create the Members tab component**

Create `frontend/src/app/(main)/[projectId]/admin/_components/members-tab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/ds";
import type { PermissionTemplate, PermissionModule, PermissionLevel } from "@/lib/permissions";

const MODULES: { key: PermissionModule; label: string }[] = [
  { key: "directory",    label: "Directory" },
  { key: "budget",       label: "Budget" },
  { key: "contracts",    label: "Contracts" },
  { key: "documents",    label: "Documents" },
  { key: "schedule",     label: "Schedule" },
  { key: "submittals",   label: "Submittals" },
  { key: "rfis",         label: "RFIs" },
  { key: "change_orders",label: "Change Orders" },
];

const LEVELS: PermissionLevel[] = ["none", "read", "write", "admin"];

interface Member {
  id: string;
  person_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  company_name: string | null;
  permission_level: string;
  template_name: string | null;
}

interface Props {
  projectId: string;
}

export function MembersTab({ projectId }: Props) {
  const qc = useQueryClient();

  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ["project-members-permissions", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/directory/permissions`);
      if (!res.ok) throw new Error("Failed to load members");
      const { data } = await res.json();
      return data;
    },
  });

  const { data: templates = [] } = useQuery<PermissionTemplate[]>({
    queryKey: ["permission-templates"],
    queryFn: async () => {
      const res = await fetch("/api/permissions/templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const { data } = await res.json();
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ personId, templateId }: { personId: string; templateId: string }) => {
      const res = await fetch(`/api/projects/${projectId}/permissions/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: personId, template_id: templateId }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to assign template");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-members-permissions", projectId] });
    },
  });

  const overrideMutation = useMutation({
    mutationFn: async ({
      personId, module, level,
    }: { personId: string; module: PermissionModule; level: PermissionLevel | "reset" }) => {
      if (level === "reset") {
        const res = await fetch(
          `/api/projects/${projectId}/permissions/override?person_id=${personId}&module=${module}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to reset override");
      } else {
        const res = await fetch(`/api/projects/${projectId}/permissions/override`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person_id: personId, module, level }),
        });
        if (!res.ok) throw new Error("Failed to set override");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-members-permissions", projectId] });
    },
  });

  if (membersLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <EmptyState
        title="No members"
        description="Add members to this project in the Directory to manage their permissions."
      />
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <MemberRow
          key={member.person_id}
          member={member}
          templates={templates}
          onAssignTemplate={(templateId) =>
            assignMutation.mutate({ personId: member.person_id, templateId })
          }
          onSetOverride={(module, level) =>
            overrideMutation.mutate({ personId: member.person_id, module, level })
          }
        />
      ))}
    </div>
  );
}

function MemberRow({
  member,
  templates,
  onAssignTemplate,
  onSetOverride,
}: {
  member: Member;
  templates: PermissionTemplate[];
  onAssignTemplate: (templateId: string) => void;
  onSetOverride: (module: PermissionModule, level: PermissionLevel | "reset") => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium shrink-0">
              {member.first_name?.[0]}{member.last_name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {member.first_name} {member.last_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {member.email}
                {member.company_name && ` · ${member.company_name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-xs hidden sm:flex">
              {member.template_name ?? "No template"}
            </Badge>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 py-4 border border-t-0 border-border rounded-b-lg bg-card space-y-4">
          {/* Template assignment */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-36 shrink-0">Permission template</span>
            <Select
              value={
                templates.find((t) => t.name === member.template_name)?.id ?? ""
              }
              onValueChange={onAssignTemplate}
            >
              <SelectTrigger className="w-56 h-8 text-sm">
                <SelectValue placeholder="Select template…" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Per-module overrides */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Module Overrides
            </p>
            <div className="rounded-md border border-border divide-y divide-border">
              {MODULES.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <span className="text-sm text-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(v) => onSetOverride(key, v as PermissionLevel | "reset")}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <SelectValue placeholder="Override…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reset">
                          <span className="text-muted-foreground">Reset to template</span>
                        </SelectItem>
                        {LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

- [ ] **Step 2: Create the Audit Log tab component**

Create `frontend/src/app/(main)/[projectId]/admin/_components/audit-log-tab.tsx`:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/ds";

interface AuditEntry {
  id: string;
  action: string;
  module: string | null;
  old_level: string | null;
  new_level: string | null;
  created_at: string;
  person: { first_name: string; last_name: string; email: string } | null;
  template: { name: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
  set_override: "Override set",
  remove_override: "Override removed",
  assign_template: "Template assigned",
};

interface Props {
  projectId: string;
}

export function AuditLogTab({ projectId }: Props) {
  const { data: entries = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ["permissions-audit-log", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/permissions/audit`);
      if (!res.ok) throw new Error("Failed to load audit log");
      const { data } = await res.json();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Permission changes will appear here as you assign templates and set overrides."
      />
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start justify-between gap-4 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm text-foreground">
              <span className="font-medium">
                {entry.person
                  ? `${entry.person.first_name} ${entry.person.last_name}`
                  : "Unknown user"}
              </span>
              {" — "}
              {ACTION_LABELS[entry.action] ?? entry.action}
              {entry.module && (
                <span className="text-muted-foreground">
                  {" "}on <span className="capitalize">{entry.module.replace("_", " ")}</span>
                </span>
              )}
              {entry.template && (
                <span className="text-muted-foreground"> to {entry.template.name}</span>
              )}
            </p>
            {entry.old_level && entry.new_level && (
              <p className="text-xs text-muted-foreground">
                {entry.old_level} → {entry.new_level}
              </p>
            )}
          </div>
          <time className="text-xs text-muted-foreground shrink-0 pt-0.5">
            {new Date(entry.created_at).toLocaleString()}
          </time>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Replace the project admin page**

Replace `frontend/src/app/(main)/[projectId]/admin/page.tsx` with:

```tsx
"use client";

import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MembersTab } from "./_components/members-tab";
import { AuditLogTab } from "./_components/audit-log-tab";

export default function ProjectAdminPage() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <PageShell
      variant="content"
      title="Project Admin"
      description="Manage member permissions for this project."
    >
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-6">
          <MembersTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <AuditLogTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npx tsc --noEmit 2>&1 | head -40
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(main)/[projectId]/admin/
git commit -m "feat(permissions): complete project admin panel with members, overrides, and audit log"
```

---

## Task 6: Verify Everything Works

### Steps

- [ ] **Step 1: Check dev server starts clean**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
rm -rf .next
npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 12 && tail -20 /tmp/nextjs-dev.log
```

Expected: `Ready` in output, no compile errors.

- [ ] **Step 2: Run typecheck + lint**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend
npm run quality 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Verify templates were seeded**

```bash
cd /Users/meganharrison/Documents/alleato-pm
npx supabase db execute --sql "SELECT name, is_system FROM permission_templates ORDER BY is_system DESC, name;"
```

Expected: 5 rows — Owner/Client, Project Manager, Field Engineer, Subcontractor, Read Only — all with `is_system = true`.

- [ ] **Step 4: Verify new tables exist**

```bash
npx supabase db execute --sql "SELECT table_name FROM information_schema.tables WHERE table_name IN ('user_module_permissions','permission_audit_log') AND table_schema = 'public';"
```

Expected: 2 rows.

- [ ] **Step 5: Open and screenshot the admin permissions page**

Using agent-browser:
1. `agent-browser open http://localhost:3000/admin/permissions`
2. `agent-browser screenshot /tmp/permissions-templates.png`
3. Read screenshot — verify templates list with 5 system templates, "New Template" button

- [ ] **Step 6: Open and screenshot the project admin page**

1. `agent-browser open http://localhost:3000/67/admin`
2. `agent-browser screenshot /tmp/project-admin.png`
3. Read screenshot — verify tabs (Members, Audit Log), member list with template dropdowns

- [ ] **Step 7: Final commit and push**

```bash
git add -A
git status  # review what's staged
git commit -m "feat(permissions): complete permissions system — module overrides, templates, admin UI, audit log"
```
