# API Routing Error Patterns

## Pattern: Generic [id] Parameter Conflicts

### Symptom
Next.js dev server fails to start with error:
```
[Error: You cannot use different slug names for the same dynamic path ('id' !== 'projectId').]
```

### Root Cause
Multiple routes at the same path level using different parameter names.

### Example Failure
```
❌ app/api/projects/[id]/route.ts          (uses [id])
❌ app/[projectId]/page.tsx                (uses [projectId])
```
**Result:** Next.js cannot determine which route to match.

### Correct Pattern

**Use specific, consistent parameter names:**

```
✅ app/api/projects/[projectId]/route.ts   (uses [projectId])
✅ app/[projectId]/page.tsx                (uses [projectId])
```

### Standardized Parameter Names

| Resource | Standard Name | NEVER Use |
|----------|--------------|-----------|
| Project | `[projectId]` | ~~`[id]`~~ |
| Company | `[companyId]` | ~~`[id]`~~ |
| Contract | `[contractId]` | ~~`[id]`~~ |
| User | `[userId]` | ~~`[id]`~~ |
| Person | `[personId]` | ~~`[id]`~~ |
| Record | `[recordId]` | ~~`[id]`~~ |

### Prevention Steps

**Before creating any dynamic route:**

1. **Check existing routes:**
   ```bash
   find app -type d -name "[*]*" | grep <resource>
   ```

2. **Use standard name:**
   - Look up resource in table above
   - Use the standard name consistently
   - NEVER use generic `[id]`

3. **Verify no conflicts:**
   ```bash
   npm run check:routes  # Automated check script
   ```

### Historical Incidents
- **2026-01-10** (3rd occurrence): API route used `[id]` instead of `[projectId]`
- **Files affected**:
  - `app/api/projects/[id]/` → renamed to `[projectId]/`
  - `app/admin/tables/[table]/[id]/` → deleted (duplicate)
- **Prevention added**: Check script, documentation, CLAUDE.md warning

## Pattern: Missing Async Params in Next.js 15

### Symptom
TypeScript error in route handlers:
```
Type 'Promise<{ projectId: string }>' is not assignable to type '{ projectId: string }'
```

### Root Cause
Next.js 15 App Router uses async params. Must await before accessing.

### Wrong Pattern
```typescript
// ❌ WRONG - Next.js 15 params are async
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;  // ❌ Can't destructure Promise
}
```

### Correct Pattern
```typescript
// ✅ CORRECT - await params first
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;  // ✅ Await the Promise
}
```

### Template for API Routes
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Permission check
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Your logic here
  const { data, error } = await supabase
    .from('your_table')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
```

## Pattern: Missing Permission Checks

### Symptom
Users can access data from projects they're not members of.

### Root Cause
API route doesn't verify user has permission to access the project.

### Wrong Pattern
```typescript
// ❌ WRONG - no permission check
export async function GET(request: Request, { params }: Context) {
  const { projectId } = await params;

  // Directly query data - anyone can access!
  const { data } = await supabase
    .from('budget_line_items')
    .eq('project_id', projectId);

  return NextResponse.json({ data });
}
```

### Correct Pattern
```typescript
// ✅ CORRECT - verify project membership
export async function GET(request: Request, { params }: Context) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is project member
  const { data: membership } = await supabase
    .from('project_directory_memberships')
    .select('id')
    .eq('project_id', projectId)
    .eq('person_id', (
      SELECT person_id FROM users_auth WHERE auth_user_id = '${user.id}'
    ))
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Now safe to query data
  const { data } = await supabase
    .from('budget_line_items')
    .eq('project_id', projectId);

  return NextResponse.json({ data });
}
```

### Permission Check Template
```typescript
async function verifyProjectAccess(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('project_directory_memberships')
    .select('id')
    .eq('project_id', projectId)
    .eq('person_id', (
      SELECT person_id FROM users_auth WHERE auth_user_id = '${userId}'
    ))
    .maybeSingle();

  return !!data;
}
```

### Related Patterns
- See: `authentication-errors.md` for users_auth pattern
- See: `database-issues.md` for type safety
- See: `.claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md` for full route standards
