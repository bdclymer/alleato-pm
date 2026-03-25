---
project_name: 'alleato-procore'
user_name: 'Megan'
date: '2026-02-23'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 85
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Core Framework
- **Next.js** 15.5.12 (App Router, NOT Pages Router)
- **React** 19.2.4
- **TypeScript** 5.9.3 (strict mode with ALL strict flags enabled)
- **Tailwind CSS** 3.4.19

### Backend & Database
- **Supabase** 2.94.0 (PostgreSQL, Auth, RLS, Storage)
- **@supabase/ssr** 0.8.0 (NEVER use deprecated `@supabase/auth-helpers-nextjs`)
- **Python FastAPI** (separate backend service on port 8051)

### UI & Components
- **shadcn/ui** + **Radix UI** primitives (full suite)
- **Framer Motion / Motion** 12.31.0
- **Lucide React** 0.511.0 + **Tabler Icons** 3.36.1
- **Sonner** 2.0.7 (toast notifications)
- **cmdk** 1.1.1 (command palette)

### Data & State
- **TanStack React Query** 5.90.20
- **TanStack React Table** 8.21.3
- **Zustand** 5.0.11
- **React Hook Form** 7.71.1 + **Zod** 4.3.6

### AI Integration
- **Vercel AI SDK** 6.0.69
- **OpenAI SDK** 6.17.0
- **@openai/chatkit** 1.5.0

### Testing
- **Playwright** 1.58.1 (E2E, visual regression, accessibility, performance)
- **Jest** 30.2.0 + **Testing Library** (unit tests)
- **axe-core/playwright** (accessibility testing)

### Build & Quality
- **ESLint** 9.39.2 (flat config format)
- **Husky** 9.1.7 + **lint-staged** 16.2.7
- **TypeScript** target: ES2017, module: esnext

### Critical Version Constraints
- `@supabase/ssr` 0.8.0 — NEVER install `@supabase/auth-helpers-nextjs` alongside it (causes webpack RSC crashes)
- Next.js 15 uses async `cookies()` and async `params` — all server components and API routes must `await` these
- React 19 — `use` hook available, but project primarily uses custom hooks pattern

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

**Strict Mode Configuration:**
- ALL strict flags enabled: `strict`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `noImplicitAny`
- `noFallthroughCasesInSwitch` and `forceConsistentCasingInFileNames` enabled
- Target: ES2017, Module: esnext, Module Resolution: node

**Import/Export Patterns:**
- Use `type` keyword for type-only imports: `import type { Database } from "@/types/database.types"`
- Use `@/*` path alias (maps to `./src/*`) — NEVER use relative paths like `../../`
- Named exports for components (NOT default exports) — exception: page.tsx files use `export default`
- Extract database types with bracket notation: `Database["public"]["Tables"]["table_name"]["Row"]`

**Error Handling:**
- Services use `Result<T, E>` pattern — return `{ data, error }`, NEVER throw exceptions
- Hooks use try/catch with `toast.error()` from sonner for user-facing errors
- API routes use `apiErrorResponse()` helper for consistent error formatting
- Always narrow error type: `err instanceof Error ? err.message : "Unknown error"`

**Type Conversion:**
- `projects.id` is INTEGER (number), NOT UUID — always `parseInt(projectId, 10)` when converting from route params
- Validate with `Number.isNaN()` after parsing
- Route params are always `string` — convert to number for database queries

**Supabase Type Usage:**
- Generate types before any database work: `npm run db:types`
- Read `frontend/src/types/database.types.ts` to verify schema
- FK column types MUST match PK types (INTEGER to INTEGER, UUID to UUID)
- NEVER assume schema from memory — always verify from generated types

### Framework-Specific Rules (Next.js 15 + Supabase + React)

**Next.js App Router:**
- ALL dynamic route params must use specific names: `[projectId]`, `[contractId]`, `[companyId]`, `[userId]`, `[recordId]` — NEVER use generic `[id]`
- API route handlers: `async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> })`
- `params` is a Promise in Next.js 15 — MUST `await params` before accessing properties
- Clear `.next` cache before debugging 404s on new/modified routes: `rm -rf .next`
- Route check: `npm run check:routes` after creating any dynamic route

**Supabase Client Patterns:**
- Browser components: `import { createClient } from "@/lib/supabase/client"` (singleton)
- Server components/API routes: `import { createClient } from "@/lib/supabase/server"` (new instance per request, `await` required)
- NEVER import server client in `"use client"` components

**Page Structure (MANDATORY):**
- ALL project pages MUST use `ProjectPageHeader` + `PageContainer` from `@/components/layout`
- Wrap page content in `<Suspense>` for `useSearchParams()` usage
- Page component is default export, inner content is named export
- NEVER use deprecated `ProjectToolPage` or `PageHeader` from `@/components/design-system`

**Hooks Pattern:**
- Custom hooks in `frontend/src/hooks/use-*.ts` (kebab-case)
- Return shape: `{ data, loading, error, refetch, ...mutations }`
- Use `useCallback` for all functions returned from hooks
- Fetch via API routes (`fetch`) or direct Supabase client calls
- Toast notifications via `sonner` for user feedback

**Service Pattern:**
- Class-based services in `frontend/src/services/`
- Constructor injection of typed Supabase client
- Return `Result<T, E>` pattern: `{ data: T; error: null } | { data: null; error: E }`
- All methods are `async` — never throw, always return result object

**Form Pattern:**
- Zod schemas in `frontend/src/lib/schemas/`
- React Hook Form with `@hookform/resolvers/zod`
- API routes validate with `.safeParse()` — return 400 with `error.flatten().fieldErrors`
- Custom refinements for numeric strings, optional-to-null transforms

**State Management:**
- URL search params for shareable/bookmarkable state (tabs, filters)
- React Query for server state caching
- Zustand for complex client-only state
- `useState` for component-local state

### Testing Rules

**Playwright E2E (Primary):**
- Config: `frontend/config/playwright/playwright.config.ts`
- Auth state pre-saved in `frontend/tests/.auth/user.json` — NEVER add login code to tests
- Custom fixtures from `frontend/tests/fixtures/index`
- Helper functions for DB setup/teardown in `frontend/tests/helpers/`
- Default port: 3002 (not 3000)
- Always `waitForLoadState("domcontentloaded")` after navigation
- Use `getByRole` with regex for selectors: `page.getByRole("button", { name: /create/i })`
- Generous timeouts for CI: `{ timeout: 15000 }`

**E2E Test Requirements (MANDATORY):**
- Tests MUST simulate real user actions — page-load-only checks are smoke tests, NOT E2E
- Every feature needs: Create, Read, Edit, Delete, and Validation tests
- Must fill forms, click buttons, submit data, and verify results in the UI
- Must verify persistence (reload page and check data still appears)
- Clean up test data in `test.afterAll()` — delete in reverse dependency order

**Jest Unit Tests:**
- Config: `frontend/jest.config.js`
- Run: `npm run test:unit` from frontend directory
- Use Testing Library for component tests
- Test files excluded from TypeScript compilation (`tsconfig.json` excludes `tests/**`)

**Test Organization:**
- E2E tests: `frontend/tests/e2e/`
- Fixtures: `frontend/tests/fixtures/`
- Helpers: `frontend/tests/helpers/`
- Auth setup: `frontend/tests/auth.setup.ts`
- Visual regression, performance, a11y tests have dedicated configs

**Authentication in Tests:**
- Auth is AUTOMATIC — session loaded from `tests/.auth/user.json`
- If auth expires: `npx playwright test tests/auth.setup.ts` (run ONCE, not before every test)
- Credentials in `.env`: `PROCORE_USER` / `PROCORE_PASSWORD`
- NEVER ask the user to log in manually

### Code Quality & Style Rules

**ESLint Configuration (Flat Config - ESLint 9):**
- Config file: `frontend/eslint.config.mjs`
- Extends: `next/core-web-vitals`
- Error-level rules: `react-hooks/rules-of-hooks`, `no-debugger`, `prefer-const`, `no-var`
- Turned off: `no-console`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `react-hooks/exhaustive-deps`
- Run: `npm run quality` (typecheck + lint), `npm run quality:fix` (with auto-fix)
- Husky + lint-staged runs ESLint --fix on staged `.{js,jsx,ts,tsx}` files on commit

**File Naming Conventions:**
- Hooks: `use-{feature-name}.ts` (kebab-case, e.g., `use-budget-data.ts`)
- Services: `{Feature}Service.ts` (PascalCase, e.g., `DrawingService.ts`)
- UI primitives (shadcn): `kebab-case.tsx` (e.g., `button.tsx`, `dialog.tsx`)
- Domain components: `PascalCase.tsx` (e.g., `BudgetTable.tsx`)
- Zod schemas: `kebab-case.ts` in `lib/schemas/` (e.g., `budget.ts`)
- Pages: always `page.tsx` per Next.js convention
- API routes: always `route.ts` per Next.js convention

**File Organization (MANDATORY):**

| File Type | Location |
|-----------|----------|
| Scripts | `scripts/` (with subdirs) |
| Documentation | `docs/` |
| Claude rules | `.claude/rules/` |
| SQL migrations | `supabase/migrations/` |
| Frontend code | `frontend/src/` |
| Playwright tests | `frontend/tests/` |

- NEVER create `.md`, `.js`, `.ts`, `.py`, or `.sh` files at project root
- Allowed root files: `CLAUDE.md`, `README.md`, `package.json`, `.gitignore`, `.env`, `docker-compose.yml`

**Component Export Pattern:**
- Named exports for components: `export function MyComponent() {}`
- Default exports ONLY for `page.tsx` and `layout.tsx` files
- `"use client"` directive at top of all client components

**No Prettier** — project relies on ESLint for formatting enforcement

### Development Workflow Rules

**Development Commands:**
- `npm run dev` — runs frontend + backend concurrently (from project root)
- `npm run dev:frontend` — Next.js on localhost:3000
- `npm run dev:backend` — Python FastAPI backend
- `npm run quality` — typecheck + lint (run before committing)
- `npm run quality:fix` — typecheck + lint with auto-fix

**Database Workflow:**
- ALWAYS run `npm run db:types` before any database work (from frontend dir)
- Migrations go in `supabase/migrations/`
- Use `/create-feature` command for new CRUD features — enforces all gates automatically
- Test queries with `node -e` script BEFORE claiming "fixed"

**New Feature Workflow:**
1. Use `/create-feature <EntityName>` to scaffold (preferred over writing from scratch)
2. Customize generated code for domain-specific needs
3. Run `npm run db:types` after any migration
4. Run `npm run check:routes` after creating dynamic routes
5. Clear `.next` cache and restart dev server after new routes
6. Run `npm run quality` to verify TypeScript + ESLint pass

**Git Workflow:**
- Husky pre-commit hook runs lint-staged (ESLint --fix on staged files)
- Main branch: `main`
- Use `gh pr create` for pull requests

**Proxy / Rewrites:**
- `/rag-chatkit` and `/chatkit` routes proxy to FastAPI backend on port 8051
- Configured in `next.config.ts` rewrites

**Security Headers:**
- OWASP headers configured in `next.config.ts`: X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS, etc.
- Supabase images allowed from `lgveqfnpkxvzbnnwuled.supabase.co`
- Gravatar images allowed from `www.gravatar.com`

### Critical Don't-Miss Rules

**Anti-Patterns (NEVER Do These):**
- NEVER install `@supabase/auth-helpers-nextjs` — it's deprecated and causes webpack RSC crashes alongside `@supabase/ssr`
- NEVER use generic `[id]` in dynamic routes — causes Next.js "different slug names" hard blocker
- NEVER write database code without running `npm run db:types` first
- NEVER create FK columns as UUID when the referenced PK is INTEGER (e.g., `projects.id` is INTEGER)
- NEVER debug 404s on new routes without clearing `.next` cache first
- NEVER ask the user to manually log in — credentials are in `.env`, Playwright uses saved auth state
- NEVER tell the user to run SQL manually — use available MCP tools or Bash
- NEVER modify code based on grep searches alone — gather runtime evidence first (Root Cause Gate)
- NEVER create files at the project root — use the correct subdirectory per File Organization Gate
- NEVER use `cd X && command` chains in bash (fails in zsh) — use absolute paths

**Edge Cases to Handle:**
- `parseInt(projectId, 10)` can return `NaN` — always validate with `Number.isNaN()` before queries
- Supabase `.select()` with joins can silently return null for FK mismatches — test queries before claiming fixed
- Next.js `.next` cache persists stale compiled routes — new/modified files may not be recognized until cache cleared
- `params` is async in Next.js 15 — forgetting `await` causes runtime errors that TypeScript won't catch
- Empty string vs null in form fields — use Zod `.transform()` to normalize (empty string → null)

**Security Rules:**
- OWASP security headers already configured in `next.config.ts` — do not override
- Supabase RLS policies required on all new tables — scaffolds include these automatically
- Never hardcode credentials — always load from `.env`
- API routes must check `supabase.auth.getUser()` for authentication
- Validate all user input with Zod `.safeParse()` before database operations

**Performance Gotchas:**
- Use `Promise.all()` for parallel Supabase queries in API routes
- Supabase `.select("*", { count: "exact" })` for paginated queries — avoids fetching all rows
- `useCallback` on functions returned from hooks to prevent unnecessary re-renders
- Wrap page content using `useSearchParams()` in `<Suspense>` — Next.js 15 requirement

**Debugging Protocol:**
1. New route 404? → Clear `.next` cache FIRST, test SECOND, debug code LAST
2. Query returning empty? → Test with `node -e` script, check FK types match
3. Auth failing in tests? → Run `npx playwright test tests/auth.setup.ts` once
4. Dev server won't start? → Check for route param conflicts: `npm run check:routes`
5. Webpack RSC crash? → Check for `@supabase/auth-helpers-nextjs` in package.json

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-02-23
