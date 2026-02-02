# Plan: Automate Supabase Table Page Generation

## Executive Summary

Create an automated CLI tool to generate standardized Supabase table pages, eliminating manual repetitive work. This will connect all existing Supabase tables to the frontend and provide a reusable system for future tables.

## Current State Analysis

### ✅ Working Pages (Connected to Supabase):
1. **meetings** - Uses new MeetingsDataTable pattern (document_metadata table)
2. **meetings2** - Server-side version
3. **employees** - Uses new EmployeesDataTable pattern
4. **tasks** - Uses older GenericEditableTable (ai_tasks table - **EMPTY**)

### ❌ Mock Data Pages (NOT Connected to Supabase):
1. **drawings** - Mock data, not using Supabase
2. **punch-list** - Unknown implementation
3. **photos** - Unknown implementation
4. **rfis** - Unknown implementation
5. **submittals** - Unknown implementation
6. **emails** - Unknown implementation
7. **daily-log** - Unknown implementation
8. **documents** - Likely mock or different implementation

### 📊 Supabase Tables with Data:
- **tasks** (75 rows) ✓
- **risks** (34 rows) ✓
- **decisions** (31 rows) ✓
- **opportunities** (27 rows) ✓
- **contacts** (299 rows) ✓
- **documents** (1,721 rows) ✓
- **employees** (17 rows) ✓ - **DONE**
- **document_metadata** (~100 rows for meetings) ✓ - **DONE**

### 🔄 Empty Tables:
- commitments (0 rows)
- ai_tasks (0 rows)

### 📋 Tables Needing Pages Created:
Priority order based on data availability:
1. **documents** (1,721 rows) - HIGH PRIORITY
2. **contacts** (299 rows) - HIGH PRIORITY
3. **risks** (34 rows)
4. **decisions** (31 rows)
5. **opportunities** (27 rows)

## Problem Statement

Creating each Supabase table page manually requires:
- 30-45 minutes per table
- 7 repetitive steps
- High risk of inconsistency
- Duplicated boilerplate code

With 5+ tables to connect, this represents 2.5-4 hours of repetitive work.

## Proposed Solution: CLI Code Generator

### Option A: Node.js CLI Tool (RECOMMENDED)
**Pros:**
- Already in the tech stack (TypeScript/JavaScript)
- Can import and validate against actual Supabase types
- Easy to integrate with existing frontend tooling
- Can run as npm script

**Cons:**
- Need to create new CLI tool

### Option B: Python Script
**Pros:**
- Direct Supabase access already configured
- Can introspect database schema

**Cons:**
- Another language in the workflow
- Can't validate against TypeScript types

**DECISION: Go with Option A (Node.js CLI)**

## Architecture Design

### Tool Structure
```
scripts/generators/
├── generate-table-page.ts          # Main CLI script
├── templates/
│   ├── data-table-component.ts.hbs # Handlebars template for component
│   ├── page-component.ts.hbs       # Template for page
│   └── test-spec.ts.hbs            # Template for E2E test
├── config/
│   └── table-configs.json          # Table-specific configurations
└── utils/
    ├── supabase-inspector.ts       # Introspect table schema
    ├── type-mapper.ts              # Map SQL types to TS/React components
    └── file-generator.ts           # Generate files from templates
```

### Configuration Schema

```json
{
  "tableName": "risks",
  "displayName": "Risks",
  "route": "/risks",
  "icon": "AlertTriangle",
  "columns": {
    "visible": ["title", "severity", "status", "mitigation", "owner"],
    "searchable": ["title", "description", "mitigation"],
    "sortable": ["title", "severity", "status", "created_at"],
    "editable": ["title", "description", "severity", "status", "mitigation", "owner"]
  },
  "defaultSort": { "column": "created_at", "direction": "desc" },
  "statusField": "status",
  "dateField": "created_at"
}
```

### Component Templates

All templates will follow the **new standardized pattern** seen in:
- `employees-data-table.tsx`
- `meetings-data-table.tsx`

NOT the older `GenericEditableTable` pattern.

### Key Features to Generate:

1. **Data Table Component** (`[entity]-data-table.tsx`):
   - Client component with state management
   - Search, filter, sort functionality
   - Column visibility toggle
   - CSV export
   - Inline editing with dialogs
   - Delete with confirmation
   - Icon-based visual design
   - Badge components for statuses

2. **Page Component** (`page.tsx`):
   - Server-side data fetching
   - Error handling
   - Consistent layout

3. **E2E Test** (`[entity]-page.spec.ts`):
   - 10 standard tests
   - Screenshot capture
   - Search/filter/sort validation

4. **Type Exports** (update `tables/index.ts`)

### CLI Usage

```bash
# Interactive mode
npm run generate:table

# Direct mode
npm run generate:table -- --table=risks --name="Risks" --route="/risks"

# Batch mode (generate multiple)
npm run generate:tables -- --config=scripts/generators/config/batch-config.json
```

### Automation Workflow

```
1. User runs: npm run generate:table
2. CLI prompts for:
   - Table name (from Supabase)
   - Display name
   - Route
   - Icon (from lucide-react)
   - Which columns to show
   - Editable fields
3. CLI introspects Supabase table schema
4. CLI generates:
   ✓ components/tables/[entity]-data-table.tsx
   ✓ app/(project-mgmt)/[route]/page.tsx
   ✓ tests/e2e/[entity]-page.spec.ts
   ✓ Updates tables/index.ts
   ✓ Updates playwright.config.ts
5. CLI asks: "Add to navigation?" (Y/n)
6. If yes, updates site-header.tsx
7. CLI runs: npm run test:[entity]-page
8. Reports results
```

## Implementation Plan

### Phase 1: Core Generator (Day 1 - 4 hours)
1. **Setup** (30 min)
   - Create `scripts/generators/` structure
   - Install handlebars, inquirer, chalk
   - Create package.json scripts

2. **Schema Introspection** (1 hour)
   - Build Supabase table inspector
   - Extract column names, types, constraints
   - Map SQL types → Component types (text, date, select, etc.)

3. **Template Creation** (1.5 hours)
   - Port employees-data-table.tsx to Handlebars template
   - Port employees/page.tsx to template
   - Port employees-page.spec.ts to template
   - Create dynamic column rendering logic

4. **CLI Interface** (1 hour)
   - Build interactive prompts
   - Add validation
   - Create file writers
   - Add dry-run mode

### Phase 2: Batch Generation (Day 1 - 2 hours)
5. **Generate Priority Tables** (2 hours)
   - Create configs for: documents, contacts, risks, decisions, opportunities
   - Run generator for each
   - Test each generated page
   - Fix template issues

### Phase 3: Integration & Documentation (Day 2 - 2 hours)
6. **Navigation Updates** (30 min)
   - Auto-update site-header.tsx
   - Handle both core tools and project management tools

7. **Testing Suite** (30 min)
   - Run all E2E tests
   - Fix failing tests
   - Update Playwright config

8. **Documentation** (1 hour)
   - Update CREATING_SUPABASE_TABLE_PAGES.md
   - Add generator usage guide
   - Document customization options

## Risk Mitigation

### Risk 1: Templates Don't Fit All Tables
**Mitigation:**
- Start with 80% use case (standard CRUD tables)
- Support template overrides
- Allow post-generation customization

### Risk 2: Type Generation Fails
**Mitigation:**
- Fallback to manual type definitions
- Validate types before generation
- Clear error messages

### Risk 3: Generated Code Breaks
**Mitigation:**
- Run E2E tests as part of generation
- Git diff before committing
- Dry-run mode to preview changes

## Success Criteria

✅ **Functional**:
- Generate working page in <2 minutes vs 30-45 minutes manual
- All generated pages pass E2E tests
- All 5 priority tables connected

✅ **Quality**:
- Generated code matches manual code quality
- Consistent UI/UX across all pages
- Type-safe throughout

✅ **Maintainable**:
- Easy to customize templates
- Clear documentation
- Reusable for future tables

## Future Enhancements

1. **Advanced Features**:
   - Relationship handling (foreign keys)
   - Nested tables
   - File upload fields
   - Rich text editors

2. **UI Customization**:
   - Custom color schemes per table
   - Icon selection from lucide-react
   - Layout variations (grid, kanban, etc.)

3. **Data Validation**:
   - Zod schema generation
   - Form validation
   - Required field enforcement

## Questions for User

Before proceeding with implementation, need clarification on:

1. **Priority Order**: Should we focus on:
   - A) Documents (1,721 rows) first?
   - B) All 5 tables at once?
   - C) Just create the generator tool first, then use it?

2. **Customization Level**: How much customization per table?
   - A) Minimal - use same layout for all
   - B) Moderate - custom columns/fields per table
   - C) High - custom features per table type

3. **Testing Strategy**: Should generated pages:
   - A) Use standard test suite (10 tests)
   - B) Custom tests per table type
   - C) Skip tests initially, add later

## Estimated Timeline

- **Option 1: Generator Only**: 4-6 hours
- **Option 2: Generator + 5 Tables**: 8-10 hours
- **Option 3: Full Automation + Docs**: 12-15 hours

## Recommendation

**Start with Generator + 2 Priority Tables** (6-8 hours):
1. Build the CLI generator (4 hours)
2. Generate documents table (1 hour)
3. Generate contacts table (1 hour)
4. Test and refine templates (1-2 hours)

This validates the approach before full rollout and provides immediate value.
