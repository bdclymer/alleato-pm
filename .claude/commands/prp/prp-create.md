---
description: "Research and create a comprehensive TypeScript PRP (Product Requirement Prompt) for one-pass implementation success"
argument-hint: "<feature-name>"
---

# Create TypeScript PRP

## Feature: $ARGUMENTS

## PRP Creation Mission

Create a comprehensive TypeScript PRP that enables **one-pass implementation success** through systematic research and context curation.

**Critical Understanding**: The executing AI agent only receives:

- Start by reading and understanding the prp concepts PRPs/prp-readme.md
- The PRP content you create
- Its training data knowledge
- Access to codebase files (but needs guidance on which ones)

**Therefore**: Your research and context curation directly determines implementation success. Incomplete context = implementation failure.

## Research Process

> During the research process, create clear tasks and spawn as many agents and subagents as needed using the batch tools. The deeper research we do here the better the PRP will be. we optminize for chance of success and not for speed.

### 0. MANDATORY: Supabase Schema Review (CRITICAL - DO THIS FIRST)

#### Purpose

**BEFORE ANY CODE ANALYSIS OR WRITING**, you MUST review the current database schema for tables relevant to this feature. Use the Supabase MCP or CLI to query only the schemas you need — do NOT generate the full types file upfront (it's too large and wastes tokens).

#### Step 1: Identify Feature-Relevant Tables

Determine which tables are relevant to this feature. Think about:

- Tables the feature will read from or write to
- Tables with foreign key relationships to those tables
- Any new tables that need to be created

#### Step 2: Query Schema for Relevant Tables Only

Use **one** of these approaches (Supabase MCP preferred):

**Option A: Supabase MCP (preferred — lowest token cost)**

```sql
-- Query column details for specific tables
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('table1', 'table2', 'table3')
ORDER BY table_name, ordinal_position;

-- Query foreign key relationships for those tables
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (tc.table_name IN ('table1', 'table2') OR ccu.table_name IN ('table1', 'table2'));
```

**Option B: Supabase CLI (if MCP is unavailable)**

```bash
# List all tables (lightweight — just names)
npx supabase db dump --schema public --data-only=false 2>/dev/null | grep "CREATE TABLE"

# Or query specific tables via psql
npx supabase db execute "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'your_table' ORDER BY ordinal_position;"
```

**Option C: Read existing types file (if recently generated)**

If `frontend/src/types/database.types.ts` exists and was recently updated, search it for only the relevant table definitions instead of reading the entire file:

```bash
grep -A 30 "your_table_name:" frontend/src/types/database.types.ts
```

#### Step 3: Complete Required Analysis

- [ ] Identify ALL tables relevant to this feature
- [ ] For each relevant table, document:
  - Column names and their types
  - Which columns are nullable
  - Primary key type (INTEGER vs UUID)
  - Foreign key relationships and their types
- [ ] **CRITICAL**: Verify FK column types match PK types:
  - `projects.id` is `number` → any `project_id` FK must be `INTEGER`
  - `users.id` is `string` → any `user_id` FK must be `UUID`
  - `people.id` is `string` → any `person_id` FK must be `UUID`

#### Step 4: Add to PRP Context

Include a "Database Schema" section in the PRP with:

- Current table structures for all relevant tables (from MCP/CLI query results)
- FK type requirements (INTEGER vs UUID)
- Any schema changes needed for this feature

**Why This Matters:**

- Prevents UUID/INTEGER type mismatches (caused 3+ bugs)
- Ensures code matches actual database schema
- Catches missing tables/columns before coding starts
- Queries only relevant tables instead of generating all types (saves significant tokens)

---

### 1. Pattern Review & Historical Error Prevention (MANDATORY)

**BEFORE writing any PRP content**, review historical errors and patterns to avoid repeating mistakes:

#### Step 1: Read Incident Log**

docs-ai/contents/docs/patterns/INCIDENT-LOG.md

- Identify all 🔴 CRITICAL and 🟡 WARNING incidents
- Note any incidents related to this feature domain
- Document prevention systems that must be followed

#### Step 2: Review Relevant Pattern Files

Based on the feature type, read relevant pattern documentation:

| Feature Type | Required Pattern Files |
|-------------|----------------------|
| Database/API changes | `database-issues.md`, `api-routing-errors.md` |
| Authentication/Auth | `authentication-errors.md` |
| Testing/E2E | `testing-errors.md`, `PLAYWRIGHT-PATTERNS.mdx` |
| UI Components | `ui-errors.md` |
| TypeScript changes | `typescript-errors.md` |

**Pattern File Locations:**

```bash
docs-ai/contents/docs/patterns/
├── INCIDENT-LOG.md                    # Comprehensive incident history
├── database-issues.md                 # Schema and query problems
├── api-routing-errors.md              # Route and endpoint failures
├── authentication-errors.md           # Permission and login issues
├── testing-errors.md                  # Test failures and patterns
├── typescript-errors.md               # Type errors and solutions
├── ui-errors.md                       # UI/UX issues
└── PLAYWRIGHT-PATTERNS.mdx            # E2E testing best practices

```

#### Step 3: Extract Applicable Patterns

For each pattern file reviewed, extract:

- **Common Mistakes**: What errors happened repeatedly?
- **Root Causes**: Why did they happen?
- **Prevention Rules**: What must be done to avoid them?
- **Validation Commands**: How to verify the fix?

#### Step 4: Add to PRP

Create a "Known Pitfalls & Prevention" section in the PRP that includes:

- All relevant historical errors that apply to this feature
- Specific prevention rules from pattern files
- Validation commands to avoid these errors
- Links to pattern documentation for reference

**Example Format:**

```markdown
## Known Pitfalls & Prevention

### From Pattern Analysis (Mandatory Review)

#### Database Type Mismatches (INCIDENT-LOG.md - CRITICAL)
**Historical Error:** Used UUID for project_id when projects.id is INTEGER
**Prevention:** Always verify FK types match PK types in database.types.ts before creating migrations
**Validation:** `grep "project_id" migration.sql` and verify type is INTEGER

#### Next.js Route Caching (INCIDENT-LOG.md - CRITICAL)
**Historical Error:** New page.tsx files showing 404 due to .next cache
**Prevention:** Clear .next cache after creating new route files
**Validation:** `rm -rf .next && npm run dev`

[Additional patterns specific to this feature...]
```

**Why This Matters:**

- Prevents repeating the same mistakes (saved hours of debugging)
- Ensures PRP includes prevention rules from past incidents
- Makes executing agent aware of common pitfalls upfront
- Reduces implementation failures from known issues

---

### 2. Procore Crawl Data & Spec Artifacts (CRITICAL for Procore features)

Before starting codebase analysis, check for existing Procore crawl data and spec artifacts:

```bash
# Crawl data location (inside the PRP tool folder):
docs-ai/contents/docs/PRPs/{feature}/crawl/

# Key files to load:
docs-ai/contents/docs/PRPs/{feature}/crawl/crawl-summary.json  # Structured summary
docs-ai/contents/docs/PRPs/{feature}/crawl/spec/COMMANDS.md    # Domain commands
docs-ai/contents/docs/PRPs/{feature}/crawl/spec/MUTATIONS.md   # Behavior specs
docs-ai/contents/docs/PRPs/{feature}/crawl/spec/schema.sql     # Database schema
docs-ai/contents/docs/PRPs/{feature}/crawl/spec/FORMS.md       # UI form specs
```

**If crawl-summary.json exists**, read it first - it contains:

- Stats (pages captured, commands promoted, etc.)
- List of domain commands with descriptions
- UI components (tables, forms, dropdowns, buttons, modals)
- Screenshot paths for all captured pages
- Paths to all spec artifacts

**If crawl data exists but no crawl-summary.json**, run:

```typescript
cd scripts/screenshot-capture && PROCORE_MODULE={feature} node scripts/generate-crawl-summary.js
```

**Raw crawl data includes**:

- **Screenshots** (`pages/*/screenshot.png`) - Visual reference for UI implementation
- **DOM snapshots** (`pages/*/dom.html`) - Actual HTML structure to replicate
- **Metadata** (`pages/*/metadata.json`) - Links, dropdowns, table structures, form fields
- **Reports** (`reports/`) - Sitemap, link graph, detailed analysis

**Spec artifacts include**:

- **COMMANDS.md** - Canonical domain commands (what operations the feature supports)
- **MUTATIONS.md** - Detailed behavior specifications for each command
- **schema.sql** - Database schema derived from Procore analysis
- **FORMS.md** - UI form requirements (may be intentionally incomplete)

**MUST integrate into PRP**:

- Use COMMANDS.md to populate Implementation Tasks
- Use MUTATIONS.md for behavior specifications in context
- Use schema.sql as starting point for data model section
- Include screenshot paths for UI components to build
- Extract form fields and validation rules from metadata
- Document table columns and data structures from DOM analysis
- Add "Procore Crawl Data Reference" section (see format below)

## Procore Crawl Data Reference

This section contains all crawl data files, sitemap, and screenshots from the Procore feature analysis. Add this section to the PRP with a consolidated table of all crawl files:

### Sitemap

| Page | URL | Screenshot |
|------|-----|------------|
| {PageName} | [Procore {Feature} Tool]({url}) | [View](#main-{feature}-view) |

### Crawl Data Files

| Category | File | Path | Description |
|----------|------|------|-------------|
| Summary | Crawl Summary | `crawl-summary.json` | Structured JSON with all crawl data |
| Summary | README | `README.md` | Module overview |
| Reports | Sitemap | `reports/sitemap-table.md` | Page URLs and structure |
| Reports | Detailed Report | `reports/detailed-report.json` | Full crawl analysis |
| Spec | Commands | `spec/COMMANDS.md` | Domain commands |
| Spec | Mutations | `spec/MUTATIONS.md` | Behavior specifications |
| Spec | Schema | `spec/schema.sql` | Database tables |
| Spec | Forms | `spec/FORMS.md` | UI form field definitions |
| Pages | Screenshot | `pages/{page}/screenshot.png` | Main view screenshot |
| Pages | DOM | `pages/{page}/dom.html` | Full DOM snapshot |
| Pages | Metadata | `pages/{page}/metadata.json` | Links, dropdowns, system actions |

**Base Path**: `docs-ai/contents/docs/PRPs/{feature}/crawl/`

### Screenshots

#### Main {Feature} View

![Procore {Feature} Screenshot](crawl/pages/{page}/screenshot.png)

**Key UI Elements to Replicate:**

- List key UI elements observed in screenshot
- Include layout structure, toolbars, panels
- Note any context menus or modals

### UI Components Detected

| Label | Command Key |
|-------|-------------|
| {Label from metadata} | `{command_key}` |

If no crawl data exists, run `/feature-crawl {feature} <procore-url>` first.

### TypeScript/React Codebase Analysis in depth

- Create clear todos and spawn subagents to search the codebase for similar features/patterns Think hard and plan your approach
- Identify all the necessary TypeScript files to reference in the PRP
- Note all existing TypeScript/React conventions to follow
- Check existing component patterns, hook patterns, and API route patterns
- Analyze TypeScript interface definitions and type usage patterns
- Check existing test patterns for React components and TypeScript code validation approach
- Use the batch tools to spawn subagents to search the codebase for similar features/patterns

### TypeScript/React External Research at scale

- Create clear todos and spawn with instructions subagents to do deep research for similar features/patterns online and include urls to documentation and examples
- TypeScript documentation (include specific URLs with version compatibility)
- React/Next.js documentation (include specific URLs for App Router, Server Components, etc.)
- For critical pieces of documentation add a .md file to PRPs/docs and reference it in the PRP with clear reasoning and instructions
- Implementation examples (GitHub/StackOverflow/blogs) specific to TypeScript/React/Next.js
- Best practices and common pitfalls found during research (TypeScript compilation issues, React hydration, Next.js gotchas)
- Use the batch tools to spawn subagents to search for similar features/patterns online and include urls to documentation and examples

### User Clarification

- Ask for clarification if you need it

## PRP Generation Process

### Step 1: Choose Template

Use `.claude/templates/prp_template.md` as your template structure - it contains all necessary sections and formatting specific to TypeScript/React development.

### Step 2: Context Completeness Validation

Before writing, apply the **"No Prior Knowledge" test** from the template:

_"If someone knew nothing about this TypeScript/React codebase, would they have everything needed to implement this successfully?"_

### Step 3: Research Integration

Transform your research findings into the template sections:

**Goal Section**: Use research to define specific, measurable Feature Goal and concrete Deliverable (component, API route, integration, etc.)

**Context Section**: Populate YAML structure with your research findings - specific TypeScript/React URLs, file patterns, gotchas

**Implementation Tasks**: Create dependency-ordered tasks using information-dense keywords from TypeScript/React codebase analysis

**Validation Gates**: Use TypeScript/React-specific validation commands that you've verified work in this codebase

### Step 4: TypeScript/React Information Density Standards

Ensure every reference is **specific and actionable** for TypeScript development:

- URLs include section anchors, not just domain names (React docs, TypeScript handbook, Next.js docs)
- File references include specific TypeScript patterns to follow (interfaces, component props, hook patterns)
- Task specifications include exact TypeScript naming conventions and placement (PascalCase components, camelCase props, etc.)
- Validation commands are TypeScript/React-specific and executable (tsc, eslint with TypeScript rules, React Testing Library)

### Step 5: ULTRATHINK Before Writing

After research completion, create comprehensive PRP writing plan using TodoWrite tool:

- Plan how to structure each template section with your TypeScript/React research findings
- Identify gaps that need additional TypeScript/React research
- Create systematic approach to filling template with actionable TypeScript context
- Consider TypeScript compilation dependencies and React component hierarchies

#### Create the following files with this File Structure:

```text
PRPs/{feature-name}/
├── prp-{feature-name}.md      # Main PRP document (static reference)
├── TASKS.md                    # Implementation checklist (live progress tracker)
└── prp-{feature-name}.html    # Browser-viewable PRP (auto-generated)
```

### Step 6: Generate TASKS.md

After completing the PRP markdown, generate `TASKS.md` from the Implementation Tasks section:

1. Use template from `.claude/templates/tasks_template.md`
2. Extract all tasks from PRP's Implementation Tasks section
3. Organize into phases (Data Layer → API Layer → UI Layer → Integration → Testing)
4. Include progress summary at top
5. Add Session Log section for AI progress tracking

### Step 7: Generate HTML Output

Generate `prp-{feature-name}.html` for browser viewing:

1. Run the HTML converter: `node .claude/scripts/prp-to-html.js PRPs/{feature-name}/prp-{feature-name}.md`
2. Or manually create HTML with:
   - Clean modern styling (system fonts, responsive layout)
   - Table of contents with anchor links
   - Syntax highlighting for code blocks
   - Collapsible sections for long code
   - Screenshot references from crawl data
   - Print-friendly styles

### Output Files

- **prp-{feature-name}.md** - Main PRP (static reference for requirements/context)
- **TASKS.md** - Live checklist (AI updates this during implementation)
- **prp-{feature-name}.html** - Browser-viewable version (auto-generated)

## PRP Quality Gates

### Mandatory Prerequisites (MUST BE COMPLETED FIRST)

- [ ] **Supabase schema reviewed via MCP/CLI** (Step 0 completed)
  - [ ] Relevant table schemas queried and analyzed
  - [ ] All feature-related table structures documented in PRP
  - [ ] FK type requirements identified (INTEGER vs UUID)
  - [ ] "Database Schema" section added to PRP context
- [ ] **Pattern review completed** (Step 1 completed)
  - [ ] INCIDENT-LOG.md reviewed for critical/warning incidents
  - [ ] Relevant pattern files read based on feature type
  - [ ] Common mistakes and prevention rules extracted
  - [ ] "Known Pitfalls & Prevention" section added to PRP
  - [ ] Historical errors specific to this feature domain documented

### Context Completeness Check

- [ ] Passes "No Prior Knowledge" test from TypeScript template
- [ ] All YAML references are specific and accessible (TypeScript/React docs, component examples)
- [ ] Implementation tasks include exact TypeScript naming and placement guidance
- [ ] Validation commands are TypeScript/React-specific and verified working
- [ ] TypeScript interface definitions and component prop types are specified
- [ ] Database schema section includes FK type requirements from schema queries
- [ ] Known pitfalls section includes prevention rules from pattern analysis

### Template Structure Compliance

- [ ] All required TypeScript template sections completed
- [ ] Goal section has specific Feature Goal, Deliverable, Success Definition
- [ ] Implementation Tasks follow TypeScript dependency ordering (types → components → pages → tests)
- [ ] Final Validation Checklist includes TypeScript/React-specific validation

### TypeScript/React Information Density Standards

- [ ] No generic references - all are specific to TypeScript/React patterns
- [ ] File patterns include specific TypeScript examples to follow (interfaces, components, hooks)
- [ ] URLs include section anchors for exact TypeScript/React guidance
- [ ] Task specifications use information-dense keywords from TypeScript/React codebase
- [ ] Component patterns specify Server vs Client component usage
- [ ] Type definitions are comprehensive and follow existing patterns

## Success Metrics

**Confidence Score**: Rate 1-10 for one-pass TypeScript implementation success likelihood

**Quality Standard**: Minimum 8/10 required before PRP approval

**Validation**: The completed PRP should enable an AI agent unfamiliar with the TypeScript/React codebase to implement the feature successfully using only the PRP content and codebase access, with full type safety and React best practices.

## Output Checklist

Before marking PRP creation complete, verify:

### Mandatory Prerequisites Completed

- [ ] **Step 0: Supabase schema reviewed via MCP/CLI**
  - [ ] Relevant table schemas queried (via MCP, CLI, or existing types file)
  - [ ] Feature-related tables analyzed for columns, types, and relationships
  - [ ] Database Schema section added to PRP
  - [ ] FK type requirements (INTEGER vs UUID) documented

- [ ] **Step 1: Pattern review completed**
  - [ ] INCIDENT-LOG.md reviewed
  - [ ] Relevant pattern files (database-issues.md, api-routing-errors.md, etc.) reviewed
  - [ ] Known Pitfalls & Prevention section added to PRP
  - [ ] Historical errors documented with prevention rules

### PRP Content Completeness

- [ ] `prp-{feature-name}.md` created with all template sections
- [ ] `TASKS.md` generated with all implementation tasks as checkboxes
- [ ] `prp-{feature-name}.html` generated for browser viewing
- [ ] Crawl data integrated (if available): commands, screenshots, schema
- [ ] Database Schema section includes current table structures and FK requirements
- [ ] Known Pitfalls & Prevention section includes applicable historical errors
- [ ] Confidence score documented (minimum 8/10)
- [ ] Ready for `/prp-quality` validation
