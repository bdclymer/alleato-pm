---
name: procore-fix
description: Implement one missing item from the gap analysis report for a Procore feature, verify in agent-browser, and commit.
---

# /procore-fix <feature>

Read the gap analysis report, pick the next unresolved HIGH priority item, implement it, verify in the browser, and commit.

## Step 1: Read the gap report

```bash
cat docs-ai/contents/docs/PRPs/$ARGUMENTS/gap-analysis-report.md
```

Find the first unchecked `- [ ]` item under HIGH Impact. If all HIGH items are done, move to MEDIUM.

## Step 2: Implement the fix

Follow these rules depending on fix type:

### Database column missing
1. Write a migration in `supabase/migrations/YYYYMMDDHHMMSS_add_<column>_to_<table>.sql`
2. Run `npm run db:types` from `frontend/` to regenerate types
3. Verify the column appears in `frontend/src/types/database.types.ts`

### API route missing
Follow the pattern in `frontend/src/app/api/projects/[projectId]/`:
- `route.ts` with GET + POST handlers
- Use `createClient` from `@/lib/supabase/server`
- Return typed responses

### Form field missing
1. Read the existing form component
2. Add the field to the Zod schema in `frontend/src/lib/schemas/`
3. Add the field to the React Hook Form in the component
4. Match Procore's field type and required status exactly

### Table column missing
1. Read the existing DataTable / UnifiedTablePage columns definition
2. Add the column with correct `accessor` and `header` matching Procore's label

### Status/enum missing
1. Add to Supabase migration (ALTER TYPE ... ADD VALUE)
2. Add to Zod schema enum
3. Add to StatusBadge handling if needed
4. Run `npm run db:types`

### Tab missing
1. Create the tab content component
2. Add to the detail page tab list

## Step 3: Quality check

```bash
cd frontend && npm run quality
```

Fix any TypeScript or lint errors before proceeding.

## Step 4: Verify in agent-browser

```bash
agent-browser open http://localhost:3000
agent-browser snapshot -i
```

Navigate to the affected page and confirm:
- The fix is visible and working
- No broken UI, no console errors
- The fixed item matches Procore's behavior

## Step 5: Mark the item done and commit

In the gap report, change `- [ ]` to `- [x]` for the completed item.

Then commit:
```bash
git add -p
git commit -m "fix(<feature>): implement <description of fix>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

## Step 6: Report to user

```
## Fixed: <item description>

**Change:** <what was added/changed>
**Files modified:** <list of files>
**Verified:** Screenshot shows <description>

Next fix available: `/procore-fix $ARGUMENTS`
All HIGH items done? Run `/procore-fix $ARGUMENTS` for MEDIUM items.
```
