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

## 🔧 PROACTIVE ISSUE FIXING (MANDATORY)

**When you identify issues during any task — even if they weren't caused by your current session — do NOT just report them and move on.** Assign a sub-agent to fix each issue immediately.

- If you find a bug while working on something else → spawn a sub-agent to fix it
- If an eval reveals retrieval gaps → spawn a sub-agent to improve retrieval
- If you notice broken patterns, stale code, or incorrect behavior → fix it or delegate it
- The only exception is if fixing would be destructive or the user explicitly says to skip it

**Never write "improvement opportunities" or "next steps" lists without acting on them.** If you can identify the fix, do the fix.

---

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
**Incident tracking:** `docs/patterns/INCIDENT-LOG.md`
**PRP Workflow:** `.claude/PRP-WORKFLOW.md` — step-by-step guide for new features and fix/complete workflows

---

## MANDATORY GATES (READ FIRST)

These rules are NON-NEGOTIABLE. Violating them wastes significant time.

**Full rules in:** `.claude/rules/`

### 0. Design System Gate (MUST DO BEFORE ANY UI WORK)

**BEFORE writing any page or component:**

1. New page? → Use `PageShell`. See section below for variants.
2. Need a component? → Import from `@/components/ds` first. Do not build one-off custom components.
3. Colors? → Semantic tokens only (`bg-background`, `text-muted-foreground`, `border-border`). Zero hex codes. Zero `gray-*`/`blue-*` classes.
4. Full reference → `docs/design/DESIGN.md` ← **Single source of truth**

**The #1 failure mode:** Agent looks at existing pages, sees `PageContainer` + manual `h1`, copies the pattern. This is wrong — use `PageShell` instead.

### 🧠 CLAUDE CODE LEARNING SYSTEM (MANDATORY)

**BEFORE ANY ACTION:** Check documented error patterns to prevent repeating mistakes.

**Required Steps:**

1. Read `.claude/MANDATORY-ERROR-PREVENTION.md`
2. Check relevant patterns in `docs/patterns/`
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
| Documentation (.md, .mdx) | `docs/` or `DOCS_NEED_TO_FILE/` |
| PRPs | `docs/PRPs/<domain>/` |
| Claude rules | `.claude/rules/` |
| SQL migrations | `supabase/migrations/` |
| Frontend code | `frontend/src/` |

**NEVER** create .md, .js, .ts, .py, or .sh files at the project root.

See `.claude/rules/FILE-ORGANIZATION-GATE.md` for the full checklist.

### 13. Chat & UI Premium Feel Gate (MANDATORY)

**NEVER add borders, cards, or visual boxes around chat sections.** The only element that may have a border in a chat UI is the message input field itself.

**Specific rules:**
- **NO** `<Alert>` or `<Card>` wrappers around informational text in chat — just render the text directly
- **NO** `border` class on chat content area divs (e.g., `<div className="border">` wrapping chat)
- **NO** robot/bot icons (`Bot` from lucide-react) — they look cheap. Use brand initials ("A"), `BriefcaseIcon`, or no icon at all
- **NO** `<User>` icon for user messages — use initials or just a styled bubble
- **NO** `Minimize2` icon — use `Shrink2` for compress/minimize actions
- Loading states: use animated dots (`animate-bounce` spans) not spinner icons inside send buttons
- Assistant message avatar: small circle with brand initial "A" and `bg-primary/10 text-primary`
- User messages: `bg-primary text-primary-foreground` (never hardcoded `bg-blue-600`)
- Prompt suggestion chips: `rounded-full`, borderless or very subtle `border-border/50`, no card wrapper

**Philosophy:** Borders create visual noise. Every border must earn its place. In chat UI, only the input field needs one.

### 12. Design System Gate (MANDATORY)

**BEFORE** building ANY UI component, page, or modifying styles:

1. Read `docs/design/DESIGN.md` — single source of truth for all design system rules
2. Read `docs/design/tokens.md` for the full token tables (colors, spacing, shadows, animations)
3. Import components from `@/components/ds` or `@/components/ui` (both are valid)

**COMPONENT IMPORT RULES:**

Importing from `@/components/ui/` (base shadcn primitives) or `@/components/ds/` (design system components) are **both acceptable**. The key rule is: **use existing components, never create one-off custom components that duplicate or deviate from the system.**

| Need | Import From | Example |
|------|------------|---------|
| Base shadcn primitive | `@/components/ui/{component}` | `import { Button } from "@/components/ui/button"` |
| Design system component | `@/components/ds` | `import { StatusBadge, KpiBlock } from "@/components/ds"` |
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

- Create one-off custom components that duplicate existing `ui/` or `ds/` components (e.g., `budget-button.tsx`, `CustomInput`)
- Use hardcoded colors (`bg-gray-200`, `text-gray-600`, `bg-white`, `border-gray-200`)
- Use arbitrary spacing (`p-[10px]`, `gap-[14px]`, `p-7`)
- Use `shadow-md`, `shadow-lg`, `shadow-xl` (only `shadow-xs` and `shadow-sm` allowed)
- Use `bg-orange-500` or `text-orange-600` (use `bg-primary`, `text-primary`)
- Write raw `<button className="...">` (use `<Button>` from `ui/` or `ds/`)
- Use `rounded-sm` or bare `rounded` (use `rounded-md` default)
- Manually map status strings to colors (use `StatusBadge` — it handles this automatically)
- Add non-shadcn components to `@/components/ui/` (that folder is ONLY for base shadcn primitives)

**ALWAYS:**

- Use existing components from `@/components/ui/` or `@/components/ds/` — never build one-off replacements
- Use `StatusBadge` for status display — pass the status string, colors are baked in
- Use semantic tokens: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`
- Use `<Button>` component with variant props (not raw buttons)
- Use status colors only for status: `bg-green-50 text-green-600`, `bg-red-50 text-red-600`

**ESLint enforces this:** 3 rules active as **ERRORS** — `design-system/no-hardcoded-colors`, `design-system/no-arbitrary-spacing`, `design-system/require-semantic-colors`. Violations BLOCK the build.

**Component architecture:**
- `@/components/ui/` = Pure shadcn base primitives ONLY. Do not add custom components here. Importing from here is fine.
- `@/components/ds/` = Custom design system components + barrel re-exports of ui/ primitives.
- `@/components/layout/` = Page structure (also re-exported from ds/).
- `@/components/domain/` = Domain-specific components (forms, detail views).

### 14. Browser Verification Gate (MANDATORY)

**NEVER claim a UI task is complete without verifying in `agent-browser` first.**

After ANY change to a page, component, or layout:

1. Open the affected page with `agent-browser open <url>`
2. Take a screenshot with `agent-browser screenshot /tmp/<name>.png`
3. Read and visually inspect the screenshot
4. If the page requires scrolling, scroll and screenshot each section
5. Only THEN report completion to the user

**NEVER:**

- Say "all fixes confirmed" based on code changes alone
- Assume ReactMarkdown, Tailwind classes, or data formatting will render correctly without checking
- Skip verification because "the code looks right"
- Report success after only checking a snapshot (text DOM) — always take a visual screenshot

**ALWAYS:**

- Verify the actual rendered output in the browser
- Check that text content is properly formatted (not jumbled, not one big block)
- Confirm layout, spacing, and visual hierarchy look correct
- If login is required, use test credentials from `.env` (`test1@mail.com` / `test12026!!!`)

**Why:** Code changes do NOT equal visual correctness. Markdown rendering, CSS layout, and data formatting frequently produce unexpected results that are only visible in the browser.

### 15. Review Your Own Output Gate (MANDATORY — SAVES USER TIME)

**NEVER hand output back to the user without reviewing it yourself first.**

This applies to ALL generated outputs — not just UI changes:
- Scripts that produce screenshots → READ every screenshot with the Read tool before reporting findings
- Scripts that produce reports → OPEN and READ the report output
- Audit results, crawl results, analysis outputs → review them, summarize findings, identify issues
- Any tool that writes files → read the output files before saying "done"

**NEVER:**
- Run a script and say "the output is at X, go look at it"
- Generate 114 screenshots and tell the user to review them without reviewing yourself first
- Claim a task is complete because the tool exited with code 0

**ALWAYS:**
- Read the outputs with the Read tool (images, files, reports)
- Identify what's broken, wrong, or noteworthy
- Present a summary of findings with specific issues called out
- Only THEN ask the user what they want to do next

**Why:** The user's time is wasted when they have to review raw output that Claude could have reviewed itself. The whole point of running a visual audit is to get a diagnosis — not just a pile of screenshots.

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

### Save all documentation in the docs/ folder.

- file-path: /Users/meganharrison/Documents/alleato-pm/docs
- `docs-ai/` is DEPRECATED — all content has been merged into `docs/`. Never create files in `docs-ai/`.

## UI/UX Design Standards

### 🏗️ BUILDING A NEW PAGE? START HERE

```tsx
import { PageShell } from "@/components/layout";

<PageShell variant="dashboard" title="...">  // home/overview pages
<PageShell variant="table"     title="...">  // data table pages
<PageShell variant="form"      title="..." onBack={...}>  // create/edit forms
<PageShell variant="detail"    title="..." statusBadge={...}>  // record detail
<PageShell variant="content"   title="...">  // settings/docs pages
```

**Do NOT** write `<PageContainer>` + `<ProjectPageHeader>` manually on new pages. Use `PageShell`.
**Full reference:** `docs/design/DESIGN.md` ← **Single source of truth**

---

**Import from `@/components/ui/` (base primitives) or `@/components/ds/` (design system components) — both are valid.**

**Design system docs** (read before building UI): `docs/design/DESIGN.md`

| File | What |
|------|------|
| `docs/design/DESIGN.md` | **READ FIRST** — PageShell API, all tokens, patterns, anti-patterns |
| `docs/design/tokens.md` | Full token tables with light/dark hex values, CSS spacing variables |
| `docs/design/tables/table-system.md` | UnifiedTablePage API, cell types, toolbar, density, accessibility |
| `docs/design/forms/form-page-archetype.md` | Three-tier form system, page templates, 13 anti-patterns |
| `docs/design/forms/FORM-SYSTEM.md` | RHF + Zod 4-layer system, field components, barrel exports |

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
**Every component must come from `@/components/ui/` or `@/components/ds/`. No one-off custom components. No duplicating existing primitives.**
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

---

## 🧠 WORKING CONTEXT PROTOCOL (ANTI-AMNESIA SYSTEM)

### The problem this solves

Every new Claude Code session starts with zero memory of previous sessions. Without this protocol,
Claude re-explores the database, re-reads component files, and re-discovers root causes it already
found 10 minutes ago. This wastes your time and kills momentum.

### How it works

WORKING_CONTEXT.md is a living scratchpad that travels between sessions. Claude reads it first,
updates it last. You never have to re-explain where things are or what was already tried.

### Your rules

**START of every session:**
1. Read `WORKING_CONTEXT.md` immediately
2. Read any file paths listed in "Current focus" before touching code
3. If the context answers your question, use that answer — do not re-explore

**END of every session:**
Update `WORKING_CONTEXT.md` with:
- What you worked on
- What you found (exact table names, column names, component paths, root causes)
- What you changed and why
- What's still broken or incomplete
- Any dead ends (what you tried that didn't work)

This update is not optional. It is the entire point of the system.

---

## 🗄️ MEMORY SYSTEM: How context and memory actually work

*This section is for Megan — explains the "why" behind the system in plain terms.*

### The context window (short-term memory)

Claude Code has a context window — roughly, the amount of text it can "hold in mind" at once.
Think of it like working memory. Everything it reads during a session lives there.

When the session ends, that memory is gone. When a new session starts, the slate is clean.
This is not a bug — it's how LLMs work. The fix is externalizing memory into files.

### Why Claude "forgets" mid-session

Even within a long session, if Claude reads many large files, earlier content gets pushed toward the
"edge" of the context window and receives less attention. This is why it sometimes re-explores things
it already touched 30 minutes earlier in the same chat. WORKING_CONTEXT.md counteracts this by
keeping the most important facts in a compact, always-referenced file.

### RAG — how the AI "remembers" without remembering everything

RAG (Retrieval-Augmented Generation) is the answer to "how can it know everything without holding
everything in memory at once?"

The idea: instead of putting ALL knowledge into the context window (impossible — it would overflow),
you store knowledge as searchable embeddings in a database. When Claude needs to know something, it
searches for the relevant pieces and pulls only those into context.

Think of it like the difference between:
- Memorizing an entire library (impossible)
- Having a really good librarian who can find the right page in seconds

For Alleato, your Fireflies pipeline already does this for meeting notes. The same pattern could
extend to code changes, debugging sessions, and architectural decisions — giving Claude a queryable
history of the entire project.

### The two-layer memory system (what we're building toward)

| Layer | What it is | Scope |
|-------|-----------|-------|
| WORKING_CONTEXT.md | Session scratchpad — current focus, recent findings | Current sprint |
| Project memory DB | Supabase embeddings of decisions, fixes, patterns | All time |

WORKING_CONTEXT.md is the fast, immediate layer. The Supabase memory layer is the long-term layer
that prevents the same bugs from being re-investigated months later.

Right now, implement WORKING_CONTEXT.md. The database layer comes next.


---

## 🎨 DESIGN SYSTEM — MANDATORY BEFORE ANY UI WORK

### The problem this solves

AI coding agents pattern-match from the code they're reading. If 60% of existing
pages use wrong patterns (bg-white, raw buttons, card trap), the agent reproduces
those wrong patterns — no matter what the docs say.

This section gives you the right patterns to copy from. Use them. Every time.

### RULE: Read golden examples before writing any component

File: `frontend/src/components/ds/GOLDEN-EXAMPLES.tsx`

This file contains the ONLY correct implementations of:
- Page shell (dashboard, table, form, detail variants)
- Buttons (all variants, loading state)
- Text hierarchy (all 4 tiers)
- Surface/card patterns (bento, tonal, hover rows)
- Status badges (never hand-roll colors)
- Empty states, loading states, form fields, table rows

**Copy from GOLDEN-EXAMPLES.tsx. Do not look at existing pages for patterns.**
Existing pages may be wrong. Golden examples are always right.

### The 4 rules that catch 80% of violations

1. **Never `<button>`** — always `<Button>` from `@/components/ui/button`
2. **Never `bg-white`** — use `bg-card` (surface) or `bg-background` (page)
3. **Never card trap** — `bg-card + border border-border + rounded` on one element
4. **Never hand-roll status colors** — use `<StatusBadge status="..." />`

ESLint enforces rules 1-3 as ERRORS that block the build.

### Design violation tracker

When Megan flags something with the right-click overlay, it appears at:
`/design-violations` — a Linear-style inbox.

**At the start of every session:**
1. Check `/api/dev/violations?status=open` for flagged violations
2. Fix open violations BEFORE starting new feature work
3. Mark violations as fixed via `PATCH /api/dev/violations`

This is non-negotiable. Violations accumulate and degrade the codebase.
Fix them first, build new things second.

### Design system docs (read in this order)

1. `frontend/src/components/ds/GOLDEN-EXAMPLES.tsx` — copy-paste patterns
2. `docs/design/DESIGN.md` — full reference
3. `docs/design/UI_GUIDE.md` — exact Tailwind class combos
4. `docs/design/tokens.md` — color/spacing token tables
