# Scaffolding System

This directory contains **validated, production-ready templates** that Claude MUST use as starting points for new features.

## Why Scaffolds Exist

Every time Claude writes new code "from scratch," it makes the same mistakes:

- Wrong FK types (UUID vs INTEGER)
- Missing RLS policies
- Incorrect hook patterns
- Inconsistent pagination

**Scaffolds eliminate this by providing copy-paste starting points that already work.**

## How to Use

When implementing a new feature, Claude should:

1. **Identify the feature type** (CRUD resource, read-only list, etc.)
2. **Copy the appropriate scaffold**
3. **Search and replace** the placeholder names
4. **Verify against database.types.ts** before running

## Available Scaffolds

| Feature Type | Scaffold | What You Get |
|-------------|----------|--------------|
| Full CRUD resource | `crud-resource/` | Migration, Service, Hook, API routes, Form component |
| Read-only list | `readonly-list/` | Hook, Page component, Table |
| Project-scoped table | `migration-project-scoped.sql` | Table with RLS, FK to projects |
| Global table | `migration-global.sql` | Table with RLS, no project FK |

## Placeholder Convention

All scaffolds use these placeholders:

| Placeholder | Replace With | Example |
|------------|--------------|---------|
| `__ENTITY__` | PascalCase entity name | `ScheduleTask` |
| `__entity__` | camelCase entity name | `scheduleTask` |
| `__entities__` | camelCase plural | `scheduleTasks` |
| `__ENTITY_TABLE__` | snake_case table name | `schedule_tasks` |
| `__ENTITY_ID__` | Route param name | `taskId` |

## Verification Checklist

After scaffolding, verify:

- [ ] `npm run db:types` regenerated types
- [ ] Read `database.types.ts` to confirm table exists
- [ ] FK types match PK types (INTEGER vs UUID)
- [ ] Route params match project standards (`[projectId]`, not `[id]`)
- [ ] Dev server starts without errors
