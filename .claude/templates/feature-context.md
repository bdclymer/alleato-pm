# Feature: {Feature Name}

> Minimal context file for the {feature} feature. This replaces the bloated per-feature CLAUDE.md.
> The shared workflow is at `.agents/workflows/feature-implementation.md`

## Quick Reference

| Item | Value |
|------|-------|
| Feature | {feature} |
| Feature Directory | `docs-ai/contents/docs/PRPs/{feature}/` |
| Crawl Data | `docs-ai/contents/docs/PRPs/{feature}/crawl/` |
| Frontend Pages | `frontend/src/app/[projectId]/{feature}/` |
| Components | `frontend/src/components/{feature}/` |
| Tests | `frontend/tests/e2e/{feature}*.spec.ts` |

---

## Database Tables

<!-- List the Supabase tables used by this feature -->
<!-- This can be auto-populated from crawl metadata or manually specified -->

| Table | Columns | Purpose |
|-------|---------|---------|
| `{table_name}` | id, project_id, ... | Main records |
| `{table_name}_line_items` | id, parent_id, ... | Line items |

---

## Procore Reference Pages

<!-- Key pages from the crawl data that define the UI requirements -->

| Page | Screenshot | Description |
|------|------------|-------------|
| Main list | `crawl-{feature}/pages/{page}/screenshot.png` | List view with table |
| Detail view | `crawl-{feature}/pages/{page}/screenshot.png` | Individual item detail |
| Create form | `crawl-{feature}/pages/{page}/screenshot.png` | New item creation |
| Configure | `crawl-{feature}/pages/{page}/screenshot.png` | Settings/config |

---

## Key Procore Features to Match

<!-- Features observed in the Procore crawl that need to be implemented -->

1. **List View**
   - Sortable columns
   - Pagination
   - Bulk actions

2. **Filters**
   - Status filter
   - Date range
   - Search

3. **Export**
   - CSV export
   - PDF export

4. **Detail View**
   - Line items
   - Attachments
   - History/audit

---

## Existing Code

<!-- Auto-detected or manually specified existing implementations -->

### Pages

- [ ] `frontend/src/app/[projectId]/{feature}/page.tsx` - List page
- [ ] `frontend/src/app/[projectId]/{feature}/new/page.tsx` - Create page
- [ ] `frontend/src/app/[projectId]/{feature}/[id]/page.tsx` - Detail page

### Components

- [ ] `frontend/src/components/{feature}/{Feature}Table.tsx`
- [ ] `frontend/src/components/{feature}/{Feature}Form.tsx`
- [ ] `frontend/src/components/{feature}/FiltersPanel.tsx`

### Hooks

- [ ] `frontend/src/hooks/use-{feature}.ts`

### API Routes

- [ ] `frontend/src/app/api/projects/[id]/{feature}/route.ts`
- [ ] `frontend/src/app/api/projects/[id]/{feature}/[id]/route.ts`

---

## Supabase Configuration

```bash
Project ID: lgveqfnpkxvzbnnwuled
```
### Type Generation

```bash
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public > frontend/src/types/database.types.ts
```
---

## Test Credentials

```yaml
Email: <test1@mail.com>
Password: test12026!!!
Auth file: frontend/tests/.auth/user.json

```

---

## Custom Notes

<!-- Any feature-specific notes, quirks, or special requirements -->
<!-- Add notes here as you discover them during implementation -->
