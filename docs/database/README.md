# Supabase Schema Documentation

Complete documentation for all 178 tables in the Alleato-Procore database.

## 📚 Documentation Files

### Master Index

**[INDEX.md](INDEX.md)** — Browse all tables by category or alphabetically

### Relationships

**[RELATIONSHIPS.md](RELATIONSHIPS.md)** — Foreign keys, cascades, and entity relationships

### Individual Tables

**[tables/](tables/)** — 178 markdown files (one per table)

Each table file includes:

- Column names and types
- Constraints (NOT NULL, PRIMARY KEY, etc.)
- Default values
- Category classification

### Machine-Readable Formats

**[SUPABASE_SCHEMA_QUICK_REF.json](../../SUPABASE_SCHEMA_QUICK_REF.json)** — JSON format for programmatic access

**[SUPABASE_SCHEMA_DOCUMENTATION.md](../../SUPABASE_SCHEMA_DOCUMENTATION.md)** — Complete markdown export

---

## 🎯 Quick Start

### Find a Table

1. **By Name** → [INDEX.md](INDEX.md#all-tables-alphabetical)
2. **By Category** → [INDEX.md](INDEX.md#tables-by-category)
3. **Search Files** → `docs/schema/tables/{table-name}.md`

### Understand Relationships

See **[RELATIONSHIPS.md](RELATIONSHIPS.md)** for:

- Foreign key mappings
- Cascade delete behavior
- Common query patterns
- Index strategies

### Browse Categories

- **Financial Management** (14 tables) — Budget, contracts, change orders
- **Project Management** (7 tables) — Tasks, issues, RFIs, submittals
- **Documents & Files** (4 tables) — File storage and RAG pipeline
- **Communication** (3 tables) — Messages, chat, conversations
- **Directory & Contacts** (7 tables) — Clients, companies, users
- **AI & Analysis** (4 tables) — Insights, jobs, models
- **FM Global Compliance** (1 table) — Parts catalog
- **System & Internal** (1 table) — Migrations
- **Other** (137 tables) — Specialized and legacy tables

---

## 📊 Schema Statistics

| Metric | Value |
|--------|-------|
| **Total Tables** | 178 |
| **Total Columns** | 892 |
| **Project-Scoped Tables** | 50 (28%) |
| **Tables with Timestamps** | 139 (78%) |
| **Financial Tables** | 62 (35%) |
| **Largest Table** | `parts` (30 columns) |

---

## 🔄 Regenerating Documentation

If the schema changes, regenerate the docs:

```bash
# 1. Update TypeScript types from Supabase
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public \
  > frontend/src/types/database.types.ts

# 2. Regenerate documentation (extracts from types + generates docs)
npm run schema:docs
```sql
**What happens:**

- `npm run schema:extract` - Parses `database.types.ts` → creates JSON/MD source files
- `npm run schema:docs` - Runs extract + generates organized documentation

**Output files:**

- `scripts/SUPABASE_SCHEMA_QUICK_REF.json` - Machine-readable schema (source)
- `scripts/SUPABASE_SCHEMA_DOCUMENTATION.md` - Complete markdown export (source)
- `documentation/docs/database/INDEX.md` - Master index with all tables
- `documentation/docs/database/tables/*.md` - Individual table documentation (228 files)

---

## 💡 Common Use Cases

### Query Examples

**Get all project-related tables:**
```sql
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'project_id'
  AND table_schema = 'public'
GROUP BY table_name;
```sql
**Find tables with timestamps:**

```sql
SELECT table_name
FROM information_schema.columns
WHERE column_name IN ('created_at', 'updated_at')
  AND table_schema = 'public'
GROUP BY table_name;
```markdown
### Type Generation

Generate TypeScript types from schema:
```bash
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public \
  > frontend/src/types/database.types.ts
```

---

## 📝 Key Tables Reference

### Core Financial

- [`projects`](tables/projects.md) — Root entity (22 columns)
- [`contracts`](tables/contracts.md) — Prime contracts (18 columns)
- [`commitments`](tables/commitments.md) — Subcontracts (5 columns)
- [`budget_codes`](tables/budget_codes.md) — Budget groupings (4 columns)
- [`budget_line_items`](tables/budget_line_items.md) — Budget details (8 columns)
- [`change_orders`](tables/change_orders.md) — Contract changes (7 columns)

### Core Documents

- [`documents`](tables/documents.md) — File metadata (6 columns)
- [`document_chunks`](tables/document_chunks.md) — RAG chunks (3 columns)
- [`document_metadata`](tables/document_metadata.md) — Extended metadata (6 columns)

### Core Project Management

- [`tasks`](tables/tasks.md) — Project tasks (5 columns)
- [`issues`](tables/issues.md) — Project issues (6 columns)
- [`rfis`](tables/rfis.md) — Requests for Information (8 columns)
- [`submittals`](tables/submittals.md) — Submittal tracking (11 columns)

---

## 🔍 Search Tips

### Find Column Usage

```bash
# Find all tables with a specific column
grep -r "column_name" docs/schema/tables/*.md
```sql
### Find Foreign Keys

```bash
# Find all references to a table
grep -r "project_id" docs/schema/tables/*.md
```javascript
### Find Large Tables

```bash
# Sort tables by column count
ls -S docs/schema/tables/*.md | head -10
```javascript
---

## 🚀 Integration Examples

### Read Schema in Code

```javascript
import schemaData from '../../SUPABASE_SCHEMA_QUICK_REF.json';

// Get table info
const projectsTable = schemaData.tables.projects;
console.log(projectsTable.column_count); // 22
console.log(projectsTable.columns); // ['id', 'created_at', ...]
```

### Generate Forms Dynamically

```typescript
import { tables } from '@/schema/schema.json';

function generateForm(tableName: string) {
  const tableInfo = tables[tableName];
  return tableInfo.columns.map(col => ({
    name: col,
    type: inferInputType(col)
  }));
}
```diff
---

## 📌 Important Notes

1. **RLS Enabled** — Most tables have Row Level Security policies
2. **Materialized Views** — Budget calculations use `mv_budget_rollup`
3. **Cascade Deletes** — Deleting projects removes all child records
4. **Auto-Timestamps** — Most tables have `created_at` and `updated_at`
5. **UUID vs BIGINT** — Newer tables use UUID, older use BIGINT

---

## 🛠️ Maintenance

### When to Regenerate

- After running migrations
- After schema changes
- Before major releases
- Weekly (recommended)

### Validation

Check for schema drift:
```bash
npx supabase db diff
```

---

## 📖 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Project Bootstrap Guide](../PROJECT-BOOTSTRAP.md)

---

**Last Updated:** 2025-12-17
**Generated By:** `npm run schema:docs` (scripts/database/generate-schema-docs.js)
