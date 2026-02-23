# SCAFFOLD-FIRST DEVELOPMENT (MANDATORY)

## The Rule

**When implementing a new feature that involves database tables, hooks, services, or API routes:**

1. **USE `/create-feature <EntityName>`** -- this is the preferred command (replaces `/scaffold`)
2. Add `--fields` for custom columns: `/create-feature Entity --fields 'amount:numeric,status:text'`
3. **THEN** customize the generated code for domain-specific needs

**DO NOT** write these from scratch. The same bugs occur every time.

**`/create-feature` enforces all gates:** FK type validation, route conflict checks, TypeScript compilation, import verification, and pattern compliance. `/scaffold` is deprecated.

---

## Available Scaffolds

### Full CRUD Resource (`.claude/scaffolds/crud-resource/`)

Use when creating a new project-scoped entity with:

- Database table
- Service class
- React hook
- API routes
- Form dialog
- List page

**Command:** `/scaffold <EntityName>`

**Example:** `/scaffold ScheduleTask` generates:

- `schedule_tasks` table with RLS
- `ScheduleTaskService` class
- `useScheduleTasks` hook
- `/api/projects/[projectId]/schedule-tasks/` routes
- `ScheduleTaskFormDialog` component
- `schedule-tasks/page.tsx` list page

---

## Scaffold Placeholders

All scaffolds use these placeholders:

| Placeholder | Derivation | Example (ScheduleTask) |
|------------|------------|------------------------|
| `__ENTITY__` | PascalCase | `ScheduleTask` |
| `__entity__` | camelCase | `scheduleTask` |
| `__entities__` | camelCase plural | `scheduleTasks` |
| `__ENTITY_TABLE__` | snake_case | `schedule_tasks` |
| `__ENTITY_ID__` | camelCase + Id | `taskId` |

---

## Process

### Step 1: Identify the Pattern

Ask: "What am I building?"

| Building | Scaffold |
|----------|----------|
| New table + full CRUD | `crud-resource/` |
| Read-only list | Hook + page only |
| Join table | Custom migration |

### Step 2: Generate from Scaffold

```bash
# Read the templates
cat .claude/scaffolds/crud-resource/migration.sql
cat .claude/scaffolds/crud-resource/service.ts
cat .claude/scaffolds/crud-resource/hook.ts
```
Replace placeholders with your entity names.

### Step 3: Verify Against Types

```bash
# After creating migration
npm run db:types

# Read generated types
cat frontend/src/types/database.types.ts | grep -A 20 "your_table"
```

### Step 4: Customize

Add domain-specific:

- Fields to migration
- Fields to DTOs
- Fields to form schema
- Business logic to service

---

## Why This Exists

### Incident History

| Date | Bug | Cause |
|------|-----|-------|
| 2026-01-28 | schedule_tasks queries broken | Used UUID for project_id (should be INTEGER) |
| 2026-01-10 | Dev server crashes | Used `[id]` instead of `[projectId]` |
| Multiple | Missing RLS | Forgot to add policies |
| Multiple | Type mismatches | Didn't read database.types.ts |

**Every one of these would have been prevented by using scaffolds.**

---

## Checklist Before Writing New Code

- [ ] Is there a scaffold for this pattern?
- [ ] Did I read the scaffold files?
- [ ] Did I replace all placeholders correctly?
- [ ] Did I run `npm run db:types` after migration?
- [ ] Did I verify FK types match PK types?
- [ ] Did I use `[entityId]` not `[id]` in routes?

---

## What Scaffolds Guarantee

When using scaffolds, you automatically get:

1. **Correct FK types** (INTEGER for project_id)
2. **RLS policies** that check project membership
3. **Indexes** on foreign keys
4. **updated_at triggers**
5. **Pagination pattern** in services
6. **Error handling** in hooks
7. **Form reset** on dialog open
8. **Toast notifications** for feedback

**Writing from scratch = missing 2-3 of these every time.**
