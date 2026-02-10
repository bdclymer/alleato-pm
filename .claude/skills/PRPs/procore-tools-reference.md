# Procore Tools Reference

This file maps Procore tool names to their expected file locations and PRP folders.

## Tool Name Mapping

| Tool Name | Table Name | URL Slug | PRP Folder |
|-----------|------------|----------|------------|
| budget | budgets | budget | budget |
| budget-forecasting | budget_forecasts | budget-forecasting | budget-forecasting |
| change-events | change_events | change-events | change-events |
| change-orders | change_orders | change-orders | change-orders |
| commitments | commitments | commitments | commitments |
| daily-logs | daily_logs | daily-logs | daily-logs |
| direct-costs | direct_costs | direct-costs | direct-costs |
| directory | people, companies | directory | directory |
| drawings | drawings | drawings | drawings |
| emails | emails | emails | emails |
| invoicing | invoices | invoicing | invoicing |
| meetings | meetings | meetings | meetings |
| photos | photos | photos | photos |
| prime-contracts | prime_contracts | prime-contracts | prime-contracts |
| punch-list | punch_items | punch-list | punch-list |
| rfis | rfis | rfis | rfis |
| scheduling | schedule_tasks | scheduling | scheduling |
| specifications | specifications | specifications | specifications |
| submittals | submittals | submittals | submittals |
| transmittals | transmittals | transmittals | transmittals |

## Expected File Locations Pattern

For a tool named `{tool}` with table `{table}`:

### Database
- Types: `frontend/src/types/database.types.ts` → search for `{table}:`
- Migration: `supabase/migrations/*{table}*.sql`

### API Routes
- CRUD: `frontend/src/app/api/projects/[projectId]/{tool-slug}/route.ts`
- Detail: `frontend/src/app/api/projects/[projectId]/{tool-slug}/[{tool}Id]/route.ts`

### Service
- File: `frontend/src/services/{tool}Service.ts` or `frontend/src/services/{toolCamelCase}Service.ts`

### Hook
- File: `frontend/src/hooks/use-{tool}.ts` or `frontend/src/hooks/use-{tools}.ts`

### Pages
- List: `frontend/src/app/(main)/[projectId]/{tool-slug}/page.tsx`
- New: `frontend/src/app/(main)/[projectId]/{tool-slug}/new/page.tsx`
- Detail: `frontend/src/app/(main)/[projectId]/{tool-slug}/[{tool}Id]/page.tsx`

### Components
- Primary: `frontend/src/components/{tool}/` or inline in pages
- Patterns:
  - `{Tool}Table.tsx`
  - `{Tool}Form.tsx`
  - `{Tool}Dialog.tsx`
  - `{Tool}Card.tsx`

### Tests
- E2E: `frontend/tests/e2e/{tool-slug}*.spec.ts`
- Unit: `frontend/src/**/__tests__/*{tool}*.test.ts`

## PRP Folder Structure

Each PRP folder at `docs-ai/contents/docs/PRPs/{tool}/` should contain:

| File | Purpose | Required |
|------|---------|----------|
| status.md | Current completion status | ✅ Yes |
| spec-{tool}.md | Full specification | ✅ Yes |
| forms.md | Form fields reference | If has forms |
| TASKS.md | Task checklist | Legacy |
| plans/ | Implementation plans | Optional |
| crawl/ | Procore screenshots | For reference |
| verification-*.md | Verification reports | After audit |
| audit-*.md | Audit reports | After /prp-audit |

## Quick Lookup Commands

```bash
# Find all files for a tool
find frontend/src -iname "*{tool}*" | head -30

# Check if table exists in types
grep -n "^    {table}:" frontend/src/types/database.types.ts

# Find PRP folder
ls -la docs-ai/contents/docs/PRPs/{tool}/

# Find tests
find frontend/tests -iname "*{tool}*"
```
