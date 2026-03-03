# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:

1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

## 🚨 STOP REPEATING MISTAKES - READ THIS FIRST

**Before starting ANY task, check:** `.claude/PREVENTION-CHECKLIST.md`

**Quick Reference - Top 5 Time Wasters:**

1. **SUPABASE PACKAGE CONFLICTS** (CRITICAL - blocks dev server)
   - NEVER install both `@supabase/auth-helpers-nextjs` (deprecated) AND `@supabase/ssr` (current)
   - Check: `npm list | grep "auth-helpers"` before Supabase work
   - If found: Remove immediately, clean reinstall
   - See: `.claude/rules/SUPABASE-PACKAGE-CONFLICTS.md`

2. **NEXT.JS CACHE** (Wasted: 90+ min across 3 incidents)
   - Creating new route? → Clear `.next` cache FIRST, test SECOND, debug LAST
   - See 404? → `rm -rf .next` before debugging code
   - Protocol: `.claude/rules/NEXTJS-DEBUG-PROTOCOL.md`

3. **SUPABASE TYPES** (Wasted: 40+ min)
   - Database code? → Run `npm run db:types` FIRST
   - Read `database.types.ts` to verify tables/columns/FK types
   - NEVER assume schema from memory

4. **ROUTE NAMING** (3 incidents, blocks dev server)
   - Use `[projectId]`, `[companyId]`, `[contractId]`
   - NEVER use generic `[id]` (causes conflicts)
   - Run `npm run check:routes` after creating routes

5. **ROOT CAUSE ANALYSIS** (Wasted: 60+ min)
   - Gather runtime evidence FIRST (errors, console, query results)
   - State root cause with evidence
   - ONLY THEN modify code (not before)

**Full prevention system:** `.claude/PREVENTION-CHECKLIST.md`
**Incident tracking:** `docs-ai/contents/docs/patterns/INCIDENT-LOG.md`
**PRP Workflow:** `.claude/PRP-WORKFLOW.md` — step-by-step guide for new features and fix/complete workflows

---

## MANDATORY GATES (READ FIRST)

These rules are NON-NEGOTIABLE. Violating them wastes significant time.

**Full rules in:** `.claude/rules/`

### 🧠 CLAUDE CODE LEARNING SYSTEM (MANDATORY)

**BEFORE ANY ACTION:** Check documented error patterns to prevent repeating mistakes.

**Required Steps:**

1. Read `.claude/MANDATORY-ERROR-PREVENTION.md`
2. Check relevant patterns in `docs-ai/contents/docs/patterns/`
3. Apply documented solutions for known issues
4. Follow pre-action validation checklist

**Pattern Categories:**

- `authentication-errors.md` - Permission and login issues
- `database-issues.md` - Schema and query problems
- `api-routing-errors.md` - Route and endpoint failures

**Use `/check-patterns [category] [keywords]` to search for relevant patterns.**

**This system is MANDATORY. No exceptions. Every repeated error wastes hours.**

### 1. Supabase Types Gate

**BEFORE** writing ANY code that touches the database:

```bash
npm run db:types  # Generate fresh types
```

Then READ `frontend/src/types/database.types.ts` to verify tables/columns exist.

**CRITICAL:** When creating FKs, verify the FK column type matches the PK type (e.g., `projects.id` is INTEGER, not UUID).

**NEVER**: Write SQL, API routes, or hooks without reading the generated types first.

### 2. Route Naming Gate

**ALWAYS** use specific parameter names: `[projectId]`, `[companyId]`, `[contractId]`
**NEVER** use generic `[id]` - causes Next.js routing conflicts that block dev server.

### 3. Playwright Gate

**BEFORE** diagnosing test failures: Run the test and observe actual DOM output.
**NEVER** guess what's happening without browser evidence.

### 4. Root Cause Gate (NEW)

**BEFORE** modifying code to fix an issue:

1. Gather runtime evidence (actual errors, query results, console output)
2. State the root cause as a FACT with evidence
3. Only THEN make targeted fixes

**NEVER**: Modify code based on grep searches or assumptions. See `.claude/rules/ROOT-CAUSE-GATE.md`

### 5. Use Available Tools Gate (NEW)

**ALWAYS** use available tools (MCP, CLI, Bash) instead of telling user to do things manually.
**NEVER**: Dump SQL and tell user "run this in Supabase" when MCP tools exist.

### 6. Bash Execution Rules (NEW)

- Check `pwd` before running commands with relative paths
- Use ABSOLUTE paths for file redirects
- Don't use `cd X && command` chains (fails in zsh)
- Use single quotes for `node -e` with special chars

### 7. Scaffolding Gate (MANDATORY)

**BEFORE** writing new CRUD features from scratch:

1. Use **`/create-feature <EntityName>`** to generate validated code with all gates enforced
2. Customize the generated code for domain-specific needs
3. For custom fields: `/create-feature <EntityName> --fields 'field1:type,field2:type'`

**NEVER**: Write hooks, services, API routes, or migrations from scratch when `/create-feature` exists.
**FK types reference**: `.claude/FK-TYPES-REFERENCE.md`

### 8. Next.js Cache Gate (CRITICAL - PREVENTS WASTED TIME)

**BEFORE** debugging ANY 404 or routing issue with new/modified Next.js files:

```bash
cd frontend && rm -rf .next && pkill -f "next dev" && npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 10
tail -20 /tmp/nextjs-dev.log  # Verify server shows "Ready"
```

**THEN** test with Playwright. **NEVER** debug code before clearing cache.

**Why:** Next.js caches compiled routes in `.next/` directory. New files aren't recognized until cache is cleared.

See `.claude/rules/NEXTJS-DEBUG-PROTOCOL.md` for full protocol.

### 9. Authentication Gate (CRITICAL - READ THIS)

**NEVER** ask the user to manually log in for Playwright tests or web crawlers.

**Credentials are ALWAYS in `.env` file:**

```bash
PROCORE_USER=bclymer@alleatogroup.com
PROCORE_PASSWORD=Clymer926!
```

**How to use automatic authentication in Node.js scripts:**

```javascript
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '../../.env') }); // Adjust path to project root

const PROCORE_EMAIL = process.env.PROCORE_USER;
const PROCORE_PASSWORD = process.env.PROCORE_PASSWORD;

// Then use in Playwright:
await page.fill('input[name="session[email]"]', PROCORE_EMAIL);
await page.fill('input[name="session[password]"]', PROCORE_PASSWORD);
await page.click('button[type="submit"]');
```

**For Playwright tests in `frontend/tests/`:**

- Auth state is ALREADY saved in `tests/.auth/user.json`
- Tests automatically use this saved session
- NO manual login required

**NEVER:**

- Ask user to log in manually
- Create interactive auth prompts
- Wait for user input when credentials exist in .env
- Assume auth is unavailable

**ALWAYS:**

- Load credentials from .env automatically
- Use saved auth state for Playwright tests
- Provide automatic authentication in crawlers/scripts

### 10. Page Header Consistency Gate (MANDATORY)

**ALL project pages MUST use the standard `ProjectPageHeader` + `PageContainer` pattern.**

```tsx
import { PageContainer, ProjectPageHeader } from "@/components/layout";

// Standard pattern:
<>
  <ProjectPageHeader
    title="Feature Name"
    description="Feature description"
    actions={<div>...</div>}
  />
  <PageContainer>
    {/* page content */}
  </PageContainer>
</>
```

**NEVER:**

- Use `ProjectToolPage` (deprecated wrapper with wrong header variant)
- Use `PageHeader` from `@/components/design-system` directly (deprecated)
- Create custom/one-off headers for project pages
- Skip the header entirely on project tool pages

**ALWAYS:**

- Import `ProjectPageHeader` and `PageContainer` from `@/components/layout`
- Follow the same pattern used by Schedule, Commitments, and other standard pages
- Include `title`, `description`, and `actions` props

**Why:** Inconsistent headers make the app look broken. Every page must have the same header structure.

### 11. File Organization Gate (MANDATORY)

**BEFORE creating ANY file, verify the correct location.**

| File Type | Required Location |
|-----------|------------------|
| Scripts (.js, .ts, .py, .sh) | `scripts/` (with subdirs) |
| Documentation (.md, .mdx) | `docs-ai/` or `DOCS_NEED_TO_FILE/` |
| PRPs | `docs-ai/contents/docs/PRPs/<domain>/` |
| Claude rules | `.claude/rules/` |
| SQL migrations | `supabase/migrations/` |
| Frontend code | `frontend/src/` |

**NEVER** create .md, .js, .ts, .py, or .sh files at the project root.

See `.claude/rules/FILE-ORGANIZATION-GATE.md` for the full checklist.

### 12. Design System Gate (MANDATORY)

**BEFORE** building ANY UI component, page, or modifying styles:

1. Read `frontend/src/design-system/tokens.md` for allowed colors, spacing, shadows
2. Read `frontend/src/design-system/CLAUDE_CODE_UI_GUIDE.md` for copy-paste patterns
3. Import components from `@/components/ds` (the SINGLE import path)

**COMPONENT IMPORT RULES:**

| Need | Import From | Example |
|------|------------|---------|
| ANY UI component | `@/components/ds` | `import { Button, StatusBadge, KpiBlock } from "@/components/ds"` |
| Status display | `StatusBadge` from `@/components/ds` | `<StatusBadge status="Draft" />` — color is automatic |
| Status dot (tables) | `StatusDot` from `@/components/ds` | `<StatusDot status="Approved" />` — color is automatic |
| Plain status text | `StatusText` from `@/components/ds` | `<StatusText status="Not synced" />` — muted, no pill |
| KPI/metrics | `KpiBlock`, `KpiRow` from `@/components/ds` | `<KpiRow metrics={[...]} />` |
| Data tables | `DataTable` from `@/components/ds` | `<DataTable columns={[...]} rows={data} />` |
| Section titles | `SectionHeader` from `@/components/ds` | `<SectionHeader title="Details" count={5} />` |
| Avatar groups | `AvatarStack` from `@/components/ds` | `<AvatarStack avatars={["JD","MH"]} />` |
| Empty states | `EmptyState` from `@/components/ds` | Design-system-correct empty state |
| Eyebrow labels | `Eyebrow` from `@/components/ds` | 11px uppercase tracking-wider |

**NEVER:**

- Import directly from `@/components/ui/` in page files (use `@/components/ds` barrel instead)
- Use hardcoded colors (`bg-gray-200`, `text-gray-600`, `bg-white`, `border-gray-200`)
- Use arbitrary spacing (`p-[10px]`, `gap-[14px]`, `p-7`)
- Use `shadow-md`, `shadow-lg`, `shadow-xl` (only `shadow-xs` and `shadow-sm` allowed)
- Use `bg-orange-500` or `text-orange-600` (use `bg-primary`, `text-primary`)
- Write raw `<button className="...">` (use `<Button>` from `@/components/ds`)
- Use `rounded-sm` or bare `rounded` (use `rounded-md` default)
- Manually map status strings to colors (use `StatusBadge` — it handles this automatically)
- Add non-shadcn components to `@/components/ui/` (that folder is ONLY for base shadcn primitives)

**ALWAYS:**

- Import ALL components from `@/components/ds` (single barrel export)
- Use `StatusBadge` for status display — pass the status string, colors are baked in
- Use semantic tokens: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`
- Use `<Button>` component with variant props (not raw buttons)
- Use status colors only for status: `bg-green-50 text-green-600`, `bg-red-50 text-red-600`

**ESLint enforces this:** 3 rules active as **ERRORS** — `design-system/no-hardcoded-colors`, `design-system/no-arbitrary-spacing`, `design-system/require-semantic-colors`. Violations BLOCK the build.

**Component architecture:**
- `@/components/ui/` = Pure shadcn base primitives ONLY. Do not add custom components here.
- `@/components/ds/` = Custom design system components + barrel re-exports of ui/ primitives. This is THE import path.
- `@/components/layout/` = Page structure (also re-exported from ds/).
- `@/components/domain/` = Domain-specific components (forms, detail views).

---

## Scaffolding System

**Stop writing code from scratch. Use validated templates.**

| Need | Command |
|------|---------|
| **New CRUD feature** | **`/create-feature <EntityName>`** (preferred, enforces all gates) |
| New feature with custom fields | `/create-feature DrawingArea --fields 'name:text,area_number:text,status:text'` |
| Add endpoint to existing entity | `/api-endpoint GET contracts export-csv --hook` |
| Schema change only | `/supabase-migration add column due_date to schedule_tasks` |
| FK types lookup | `.claude/FK-TYPES-REFERENCE.md` |

**`/create-feature` enforces these gates automatically:**

1. FK type validation (prevents INTEGER/UUID mismatch -- the #1 recurring bug)
2. Route conflict check (prevents `[id]` vs `[projectId]` errors)
3. TypeScript compilation (catches type errors before you see them)
4. Import verification (ensures all files reference each other correctly)
5. Types regeneration (always reads real schema, never assumes)

**Why this exists:** Every new feature written from scratch makes the same mistakes (wrong FK types, missing RLS, inconsistent patterns, TypeScript errors). `/create-feature` eliminates this by generating validated code from templates AND verifying the result compiles.

---

## Project Overview

Alleato-Procore is a construction project management platform built as a Next.js 15 frontend with Supabase backend. It mirrors Procore's functionality with tools for budgets, contracts, change orders, directory management, scheduling, and more.

## Development Commands

```bash
# Start development (frontend + backend)
npm run dev                    # Runs both frontend and backend concurrently
npm run dev:frontend           # Frontend only (Next.js on localhost:3000)
npm run dev:backend            # Backend only (Python/FastAPI)

# Build and quality
npm run build                  # Build frontend for production
npm run quality                # Run typecheck + lint
npm run quality:fix            # Run typecheck + lint with auto-fix

# In frontend directory (cd frontend)
npm run lint                   # ESLint
npm run typecheck              # TypeScript type checking
```

## Testing Commands

**CRITICAL:** All Playwright tests use AUTOMATIC authentication. Auth state is saved in `tests/.auth/user.json`. You NEVER need to manually log in.

```bash
# From frontend directory
npm run test                   # Run Playwright tests (headless)
npm run test:headed            # Run tests with browser visible
npm run test:ui                # Open Playwright UI mode (best for debugging)
npm run test:report            # View test report

# Run specific test file (RECOMMENDED for debugging)
npx playwright test tests/e2e/budget-line-item-validation.spec.ts --headed

# Run with specific config
npx playwright test tests/e2e/schedule-page.spec.ts --config=config/playwright/playwright.config.ts

# Unit tests (Jest)
npm run test:unit
npm run test:unit:watch
npm run test:unit:coverage
```

### Playwright Authentication (READ THIS)

**How authentication works:**

1. Auth state is PRE-SAVED in `tests/.auth/user.json`
2. All tests automatically load this saved session
3. NO login required in individual tests
4. Session persists across test runs

**If tests fail with "not logged in":**

```bash
# Re-authenticate (run ONCE, not before every test)
cd frontend
npx playwright test tests/auth.setup.ts
```

**Config location:** `frontend/config/playwright/playwright.config.ts`
**Default port:** 3002 (dev server runs on 3000)
**Auth file:** `frontend/tests/.auth/user.json`

**Common mistakes to AVOID:**

- ❌ Adding login code to every test
- ❌ Asking user to log in manually
- ❌ Thinking auth is missing when it's already configured
- ❌ Running auth.setup.ts before every test run

## Web Crawlers & Screenshot Capture

**Location:** `scripts/screenshot-capture/`

**CRITICAL:** All crawlers use AUTOMATIC authentication from `.env`. NEVER ask user to log in manually.

### Running Feature Crawlers

```bash
cd scripts/screenshot-capture

# Run existing crawler (they ALL use automatic auth)
node scripts/crawl-specifications-comprehensive.js
node scripts/crawl-commitments-comprehensive.js
node scripts/crawl-direct-costs-comprehensive.js

# Crawlers automatically:
# 1. Load PROCORE_USER and PROCORE_PASSWORD from .env
# 2. Log in to Procore
# 3. Capture screenshots and metadata
# 4. Generate reports
```

### Creating New Crawlers

**Use the `/feature-crawl` command:**

```bash
/feature-crawl <feature-name> <app-url>
```

**Or copy an existing crawler and modify:**

1. Copy `scripts/crawl-specifications-comprehensive.js`
2. Update `START_URL` to your feature URL
3. Update `OUTPUT_DIR` to your feature name
4. Run it - authentication is already handled!

### Authentication Pattern (MANDATORY)

Every crawler MUST use this pattern at the top:

```javascript
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '../../.env') });

const PROCORE_EMAIL = process.env.PROCORE_USER;
const PROCORE_PASSWORD = process.env.PROCORE_PASSWORD;
```

Then in the authentication section:

```javascript
// Navigate to login if needed
if (currentUrl.includes('login.procore.com')) {
  await page.fill('input[name="session[email]"]', PROCORE_EMAIL);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  await page.fill('input[name="session[password]"]', PROCORE_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
}
```

**NEVER:**

- ❌ Ask user to log in manually
- ❌ Create interactive prompts waiting for Enter key
- ❌ Assume credentials are unavailable
- ❌ Hardcode passwords (use .env)

**ALWAYS:**

- ✅ Load from .env automatically
- ✅ Auto-login without user interaction
- ✅ Handle MFA gracefully (persistent session)

## Database Commands

```bash
# Generate Supabase types (REQUIRED before any database work)
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts

# Or use the script
npm run db:types               # From frontend directory

# Drizzle ORM commands (from frontend)
npm run db:generate            # Generate migrations
npm run db:migrate             # Run migrations
npm run db:push                # Push schema changes
npm run db:studio              # Open Drizzle Studio

# Seeding
npm run seed:db                # Seed database
npm run seed:db:dry            # Dry run seeding
npm run seed:financial         # Seed financial data
```

## Architecture

### Directory Structure

```
alleato-procore/
├── frontend/                 # Next.js 15 application
│   ├── src/
│   │   ├── app/             # App Router pages and API routes
│   │   │   ├── (main)/      # Main app routes with sidebar
│   │   │   ├── (tables)/    # Table view pages
│   │   │   ├── (other)/     # Misc pages
│   │   │   ├── api/         # API route handlers
│   │   │   └── auth/        # Auth pages
│   │   ├── components/      # React components
│   │   │   ├── ui/          # shadcn/ui primitives
│   │   │   ├── domain/      # Domain-specific components
│   │   │   └── layout/      # Layout components
│   │   ├── hooks/           # React Query hooks (use-*.ts)
│   │   ├── lib/
│   │   │   ├── supabase/    # Supabase client setup
│   │   │   └── schemas/     # Zod validation schemas
│   │   ├── services/        # Business logic services
│   │   └── types/           # TypeScript types
│   ├── tests/               # Playwright E2E tests
│   └── config/playwright/   # Playwright configuration
├── backend/                  # Python FastAPI backend
├── supabase/
│   └── migrations/          # SQL migrations
└── scripts/                 # Build and utility scripts
```

### Key Patterns

**Supabase Client Usage:**

- Browser: `import { createClient } from "@/lib/supabase/client"` (singleton)
- Server Components/API Routes: `import { createClient } from "@/lib/supabase/server"` (creates new instance per request)

**Data Fetching:**

- Custom hooks in `frontend/src/hooks/use-*.ts` wrap Supabase queries
- React Query for caching and state management
- Types from `@/types/database.types` for type safety

**API Routes:**

- Located at `frontend/src/app/api/`
- Use `[projectId]` parameter naming (NOT generic `[id]`)
- Pattern: `api/projects/[projectId]/resource/route.ts`

**Dynamic Routes:**

- Project routes: `/[projectId]/...` (e.g., `/[projectId]/budget`, `/[projectId]/commitments`)
- Use specific parameter names: `[projectId]`, `[companyId]`, `[contractId]`, `[userId]`
- NEVER use generic `[id]` - this causes Next.js routing conflicts

### Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI:** shadcn/ui components, Radix UI primitives, Framer Motion
- **State:** React Query (TanStack Query), Zustand
- **Backend:** Supabase (PostgreSQL, Auth, RLS), Python FastAPI
- **Testing:** Playwright (E2E), Jest (unit)
- **Forms:** React Hook Form + Zod validation

## Critical Rules

### Route Naming (MANDATORY)

Next.js will fail to start if dynamic route parameters conflict. Always use specific names:

| Resource | Parameter Name |
|----------|---------------|
| Project | `[projectId]` |
| Company | `[companyId]` |
| Contract | `[contractId]` |
| User | `[userId]` |
| Record | `[recordId]` |

Check for conflicts: `npm run check:routes`

### Supabase Types Gate

Before ANY Supabase/database work:

1. Generate types: `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts`
2. Read the generated types
3. Verify table names and columns exist
4. Only then write code

### Playwright Testing

Before claiming tests pass:

1. Actually run Playwright
2. Observe the browser DOM/output
3. Only then diagnose or fix issues

### Save all documentation in the docs-ai folder.

- file-path: /Users/meganharrison/Documents/github/alleato-pm/docs-ai/contents/docs

## UI/UX Design Standards

**Single import path: `import { ... } from "@/components/ds"`**

**Design system docs** (read before building UI): `frontend/src/design-system/`

| File | What |
|------|------|
| `CLAUDE_CODE_UI_GUIDE.md` | **READ FIRST** — Exact Tailwind classes, copy-paste patterns |
| `tokens.md` | Colors, spacing, typography, shadows, interactive states |
| `page-archetypes.md` | The 4 page types with copy-paste templates |
| `components.md` | Which component to use for what |
| `patterns.md` | Loading, errors, empty states, forms, modals |
| `principles.md` | Philosophy, hard constraints, card policy |

**Production components** (import these, don't recreate): `frontend/src/components/ds/`

| Component | What |
|-----------|------|
| `StatusBadge` | Pass status string → correct colors automatically |
| `StatusDot` | Minimal inline dot + label for tables |
| `StatusText` | Plain muted text for non-emphasized statuses |
| `KpiBlock` / `KpiRow` | Metric display with 3-tier text hierarchy |
| `DataTable` | Premium table with correct header/row/hover styling |
| `SectionHeader` | Title + count + action link |
| `AvatarStack` | Overlapping avatar initials |
| `EmptyState` | Icon + title + description + action |
| `Eyebrow` | 11px uppercase tracking-wider label |

**Every page must use a page archetype. No exceptions.**
**Every component must come from `@/components/ds`. No custom styling. No direct ui/ imports in pages.**
**Every color/spacing/font must use a design token. No hex codes or arbitrary values.**

### Code Quality Standards

**Component Organization:**

1. Import statements
2. Type definitions
3. Component function
4. Helper functions/constants
5. Exports

**TypeScript Requirements:**

- All props typed explicitly
- No `any` types (use `unknown` if necessary)
- Event handlers properly typed

**Performance:**

- Memoize expensive calculations
- Use proper key props in lists
- Lazy load heavy components
- Optimize images (Next.js Image component)

### Testing Requirements

**Before marking complete:**

1. Test on mobile viewport (375px)
2. Test keyboard navigation
3. Verify all interactive states (hover, focus, active, disabled)
4. Check loading and error states
5. Validate form submissions
6. Screenshot comparison if updating existing UI

**DO NOT claim completion without:**

- Running the dev server and visually verifying the changes
- Testing all interactive elements
- Confirming responsive behavior

---

## Project-Specific Notes

[Add project-specific requirements here]
