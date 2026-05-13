---
project_name: 'alleato-procore'
user_name: 'Megan'
date: '2026-05-02'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 102
optimized_for_llm: true
---

# Project Context for AI Agents

> Snapshot notice: this file is a point-in-time rules snapshot.
> Canonical active memory and lessons live in `docs/ops/`.

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Core Framework
- **Next.js** 15.5.12 (App Router, NOT Pages Router)
- **React** 19.2.4
- **TypeScript** 5.9.3 (strict mode with ALL strict flags enabled)
- **Tailwind CSS** 4.2.2 — v3 compat mode via `tailwind.config.ts` + `@config` directive in `globals.css`

### Backend & Database
- **Supabase** 2.99.3 (PostgreSQL, Auth, RLS, Storage)
- **@supabase/ssr** 0.9.0 (NEVER use deprecated `@supabase/auth-helpers-nextjs`)
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
- **Vercel AI SDK** 6.0.105
- **OpenAI SDK** 6.17.0
- **@openai/chatkit** 1.5.0
- **AI Gateway** — all LLM + embedding calls route through `ai-gateway.vercel.sh` (BYOK mode; billing stays with OpenAI). Auth via `AI_GATEWAY_API_KEY`. Falls back to direct `OPENAI_API_KEY` if unset.

### Testing
- **Playwright** 1.58.1 (E2E, visual regression, accessibility, performance)
- **Jest** 30.2.0 + **Testing Library** (unit tests)
- **axe-core/playwright** (accessibility testing)

### Build & Quality
- **ESLint** 9.39.2 (flat config format — `eslint.config.mjs`)
- **Husky** 9.1.7 + **lint-staged** 16.2.7
- **pnpm** 10.13.1 (package manager — TWO lockfiles: root + `frontend/`, both must stay in sync)

### Critical Version Constraints
- `@supabase/ssr` 0.9.0 — NEVER install `@supabase/auth-helpers-nextjs` alongside it (causes webpack RSC crashes)
- Next.js 15 uses async `cookies()` and async `params` — all server components and API routes MUST `await` these
- React 19 — `use` hook available, but project primarily uses custom hooks pattern
- Tailwind v4 compat: `tailwind.config.ts` exists and is loaded via `@config "../../tailwind.config.ts"` in `globals.css`. Do NOT migrate to v4 CSS-native config — compat mode is intentional.

---

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

**Strict Mode Configuration:**
- ALL strict flags enabled: `strict`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `noImplicitAny`
- `noFallthroughCasesInSwitch` and `forceConsistentCasingInFileNames` enabled
- Target: ES2017, Module: esnext, Module Resolution: node

**Import/Export Patterns:**
- Use `type` keyword for type-only imports: `import type { Database } from "@/types/database.types"`
- Use `@/*` path alias (maps to `./src/*`) — NEVER use relative paths like `../../`
- Named exports for components (NOT default exports) — exception: `page.tsx` files use `export default`
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
- Generate types before any database work: `npm run db:types` (from `frontend/` directory)
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

**Build Crash Prevention (Gate 17 — MANDATORY):**

Two patterns that have caused 5+ production build failures:

*Pattern A — Module-level server client init:*
```ts
// ❌ CRASHES next build — reads env var at import time
const client = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });

// ✅ CORRECT — lazy singleton, only runs at request time
let _client: Liveblocks | null = null;
function getClient(): Liveblocks {
  if (!_client) {
    if (!process.env.LIVEBLOCKS_SECRET_KEY) throw new Error("LIVEBLOCKS_SECRET_KEY not set");
    _client = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });
  }
  return _client;
}
```
Any non-`"use client"` file that reads a non-`NEXT_PUBLIC_*` env var to construct a client MUST use the lazy singleton pattern.

*Pattern B — Server pages missing `force-dynamic`:*
```ts
// ✅ REQUIRED at top of any page.tsx that calls createServiceClient()
export const dynamic = "force-dynamic";
```
Without `force-dynamic`, Next.js statically prerenders the page at build time, reads missing env vars, and crashes.

**Page Structure (MANDATORY — PageShell):**
- ALL new pages MUST use `PageShell` from `@/components/layout`:
  ```tsx
  import { PageShell } from "@/components/layout";

  <PageShell variant="dashboard" title="...">   // home/overview + KPI cards
  <PageShell variant="table"     title="...">   // data tables
  <PageShell variant="form"      title="..." onBack={() => router.back()}>  // create/edit
  <PageShell variant="detail"    title="...">   // record detail with tabs
  <PageShell variant="content"   title="...">   // settings/docs/read-heavy
  ```
- NEVER write `<PageContainer>` + manual `<h1>` on new pages — creates double header
- NEVER use deprecated `ProjectToolPage`, `PageLayout`, or `ProjectPageHeader`
- Some older pages still use `ProjectPageHeader + PageContainer` — that is acceptable for existing pages only

**Table Pages (MANDATORY — UnifiedTablePage):**
- ALL table pages use `UnifiedTablePage` or follow its exact pattern
- Header actions = ONLY the primary action button (Create/Add). Nothing else in the header.
- Toolbar = `TableToolbar` from `@/components/tables/unified/table-toolbar` — provides search, filters, column visibility, export icon
- NEVER put filters, column toggles, import/export, or share buttons in the header
- Every table page MUST include: row selection, row actions menu (three-dots), delete, bulk delete
- Button gap is `gap-1.5` globally — do NOT modify `button.tsx`

**API Fetch Pattern (Gate 13 — MANDATORY):**
- NEVER use raw `fetch()` for API calls in pages, components, or hooks
- Use `apiFetch` from `@/lib/api-client`:
  ```tsx
  import { apiFetch, summarizeBulkResults } from "@/lib/api-client";

  // Single operation
  await apiFetch(`/api/projects/${id}`, { method: "DELETE" });

  // Bulk operation
  const results = await Promise.allSettled(ids.map(id => apiFetch(`/api/.../${id}`, { method: "DELETE" })));
  const { succeeded, failed, firstError } = summarizeBulkResults(results);
  ```
- ESLint rule `require-api-client` warns on raw `fetch("/api/...")` calls

**External Calls Pattern (Gate 16 — MANDATORY):**
- NEVER use raw `fetch()` in API routes for calls to external services (Render backend, OpenAI, Supabase admin, webhooks)
- Use `fetchWithGuardrails` from `@/lib/fetch-with-guardrails`:
  ```ts
  import { fetchWithGuardrails } from "@/lib/fetch-with-guardrails";

  const data = await fetchWithGuardrails("https://alleato-backend-rbnj.onrender.com/api/...", {
    method: "POST",
    body: JSON.stringify(payload),
    requestId,           // propagates x-request-id header
    timeoutMs: 10_000,   // default; 30_000 for AI calls
    retries: 2,          // default; 0 for non-idempotent writes
    where: "route/name", // for structured error logging
  });
  ```

**Hooks Pattern:**
- Custom hooks in `frontend/src/hooks/use-*.ts` (kebab-case)
- Return shape: `{ data, loading, error, refetch, ...mutations }`
- Use `useCallback` for all functions returned from hooks
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

### Design System Rules (MANDATORY)

**Before writing any JSX**, check `frontend/src/components/ds/` — if the component exists, use it. Do not hand-roll it.

**All `@/components/ds` components — use these instead of hand-rolling:**

| Pattern | Component | Import |
|---------|-----------|--------|
| Status-colored badge/pill | `StatusBadge` | `@/components/ds/status-badge` |
| Empty list state | `EmptyState` | `@/components/ds/empty-state` |
| Callout/info box | `InfoAlert` | `@/components/ds/InfoAlert` |
| Error/failed load | `ErrorState` | `@/components/ds/error-state` |
| KPI metric display | `KpiBlock` / `KpiRow` | `@/components/ds/kpi` |
| Section title + count + link | `SectionHeader` | `@/components/ds/section-header` |
| Premium data table | `DataTable` | `@/components/ds/data-table` |
| Label + value in detail view | `DetailField` | `@/components/ds/DetailField` |
| Delete confirmation modal | `ConfirmDeleteDialog` | `@/components/ds/ConfirmDeleteDialog` |
| Content section with header | `SectionCard` | `@/components/ds/section-card` |
| Colored icon container | `IconBadge` | `@/components/ds/icon-badge` |
| Status badge in page header | `PageBadge` | `@/components/ds/page-badge` |
| Primary action + dropdown | `SplitButton` | `@/components/ds/SplitButton` |
| Save/Cancel action bar | `EditModeActions` | `@/components/ds/EditModeActions` |
| Action buttons for detail | `DetailActions` | `@/components/ds/DetailActions` |
| Navigation back button | `BackButton` | `@/components/ds/BackButton` |
| Compact table inside panel | `InlineTable` | `@/components/ds/inline-table` |
| Overlapping user avatars | `AvatarStack` | `@/components/ds/avatar-stack` |
| Notification/announcement bar | `Banner` | `@/components/ds/banner` |
| Compact section title | `CompactSectionHeader` | `@/components/ds/compact-section-header` |
| Threaded comments | `CommentThread` | `@/components/ds/comment-thread` |
| Date with avatar | `DateAvatar` | `@/components/ds/date-avatar` |

**Color tokens only** — zero hex codes, zero `gray-*`/`blue-*` classes, zero `bg-white`:
```
bg-background  bg-card  bg-muted  bg-primary
text-foreground  text-muted-foreground  text-primary-foreground
border-border  ring  input
```

**The 4 rules that catch 80% of design violations:**
1. Never `<button>` — always `<Button>` from `@/components/ui/button`
2. Never `bg-white` — use `bg-card` (surface) or `bg-background` (page)
3. Never card trap — `bg-card + border border-border + rounded` wrapping content = NO borders
4. Never hand-roll status colors — use `<StatusBadge status="..." />`

**No decorative borders** — borders make the app feel cluttered. Use `bg` tints and spacing instead. Applies to inputs, headers, sidebars, panels, rows, and chat sections.

**No pencil/edit icons** — NEVER use `Pencil` icon for edit actions. Use vertical three-dots (`MoreVertical` / ellipsis) menu instead.

**Shadows:** Only `shadow-xs` (cards) or `shadow-sm` (dropdowns). Never `shadow-md` or larger.

**Spacing ownership:** spacing that is *always the same* belongs inside the shared component. Spacing that *varies by context* belongs at the callsite. Don't add `mt-*`/`mb-*` at every callsite for a component that always needs the same gap.

### Testing Rules

**Playwright E2E (Primary):**
- Config: `frontend/config/playwright/playwright.config.ts`
- Auth state pre-saved in `frontend/tests/.auth/user.json` — NEVER add login code to tests
- Default test port: 3002 (not 3000)
- Always `waitForLoadState("domcontentloaded")` after navigation
- Use `getByRole` with regex: `page.getByRole("button", { name: /create/i })`
- Generous timeouts for CI: `{ timeout: 15000 }`
- Test credentials: `test1@mail.com` / `test12026!!!` (from `.env` `TEST_USER_1`/`TEST_PASSWORD_1`)
- Project ID for testing: 67 (Vermillion Rise Warehouse)

**E2E Test Requirements (MANDATORY):**
- Tests MUST simulate real user actions — page-load-only checks are smoke tests, NOT E2E
- Every feature needs: Create, Read, Edit, Delete, and Validation tests
- Must verify persistence (reload page and check data still appears)
- Clean up test data in `test.afterAll()` — delete in reverse dependency order

**Jest Unit Tests:**
- Config: `frontend/jest.config.js` — run: `npm run test:unit` from `frontend/`
- Test files excluded from TypeScript compilation (`tsconfig.json` excludes `tests/**`)

**Bug Fix Completion (Gate 14):** A bug fix is NOT complete without at least one of:
- A test that would have caught the bug
- A validation rule preventing the bad input
- A smoke test entry covering the broken endpoint

### Code Quality & Style Rules

**ESLint (Flat Config — ESLint 9):**
- Config: `frontend/eslint.config.mjs`
- Custom error-level rules enforced as BUILD ERRORS: `no-hardcoded-colors`, `no-arbitrary-spacing`, `require-semantic-colors`, `require-info-alert`, `require-empty-state`, `no-raw-button`, `no-raw-form-controls`, `require-api-client`
- Run: `npm run quality` (typecheck + lint), `npm run quality:fix` (with auto-fix)
- Husky pre-commit hook runs lint-staged ESLint --fix on staged `.{js,jsx,ts,tsx}` files
- **MANDATORY:** Run `npm run quality` before every commit — no exceptions

**File Naming Conventions:**
- Hooks: `use-{feature-name}.ts` (kebab-case)
- Services: `{Feature}Service.ts` (PascalCase)
- UI primitives (shadcn): `kebab-case.tsx`
- Domain components: `PascalCase.tsx`
- Zod schemas: `kebab-case.ts` in `lib/schemas/`
- Pages: `page.tsx` / API routes: `route.ts`

**File Organization (MANDATORY):**

| File Type | Location |
|-----------|----------|
| Scripts (.js/.ts/.py/.sh) | `scripts/` |
| Documentation (.md) | `docs/` |
| Claude rules | `.claude/rules/` |
| SQL migrations | `supabase/migrations/` |
| Frontend code | `frontend/src/` |
| Playwright tests | `frontend/tests/` |

- NEVER create `.md`, `.js`, `.ts`, `.py`, or `.sh` files at project root
- Allowed root files: `CLAUDE.md`, `README.md`, `AGENTS.md`, `package.json`, `.gitignore`, `.env`

**Component Export Pattern:**
- Named exports for components: `export function MyComponent() {}`
- Default exports ONLY for `page.tsx` and `layout.tsx`
- `"use client"` directive at top of all client components

**No Prettier** — ESLint handles formatting enforcement.

### Development Workflow Rules

**Development Commands (run from project root):**
- `npm run dev` — frontend + backend concurrently
- `npm run dev:frontend` — Next.js on localhost:3000
- `npm run quality` — typecheck + lint (run before EVERY commit)
- `npm run quality:fix` — typecheck + lint with auto-fix

**Database Workflow:**
- ALWAYS run `npm run db:types` (from `frontend/`) before any database work
- Migrations go in `supabase/migrations/`
- Verify FK column types match PK types before writing any query

**New Feature Workflow:**
1. Run `npm run db:types` after any migration
2. Run `npm run check:routes` after creating dynamic routes
3. Clear `.next` cache and restart dev server after new routes
4. Run `npm run quality` to verify TypeScript + ESLint pass
5. Verify in browser before reporting complete

**Git Workflow:**
- **No feature branches, no PRs** — always commit directly to `main`
- **No Co-Authored-By in commits** — breaks Vercel deployments (contributor check on Hobby plan)
- Husky pre-commit hook runs lint-staged ESLint --fix on staged files
- After every push, verify Vercel deployment succeeded — fix failures automatically

**Security Headers:**
- OWASP headers configured in `next.config.ts` — do NOT override
- Supabase images: `lgveqfnpkxvzbnnwuled.supabase.co`

### Critical Don't-Miss Rules

**Anti-Patterns (NEVER Do These):**
- NEVER install `@supabase/auth-helpers-nextjs` — deprecated, causes webpack RSC crashes alongside `@supabase/ssr`
- NEVER use generic `[id]` in dynamic routes — causes Next.js "different slug names" hard blocker
- NEVER write database code without running `npm run db:types` first
- NEVER create FK columns as UUID when the referenced PK is INTEGER (`projects.id` is INTEGER)
- NEVER debug 404s on new routes without clearing `.next` cache first
- NEVER ask the user to manually log in — credentials in `.env`, Playwright uses saved auth state
- NEVER tell the user to run SQL manually — use MCP tools or Bash
- NEVER modify code based on grep searches alone — gather runtime evidence first (Root Cause Gate)
- NEVER create files at the project root — use the correct subdirectory
- NEVER use `cd X && command` chains in bash (fails in zsh) — use absolute paths
- NEVER use raw `fetch()` in components/hooks (use `apiFetch`) or in API routes for external calls (use `fetchWithGuardrails`)
- NEVER initialize a server client at module level (use lazy singleton)
- NEVER omit `export const dynamic = "force-dynamic"` on pages that call `createServiceClient()`
- NEVER use pencil/Pencil icon for edit actions — use three-dots menu (`MoreVertical`)
- NEVER hand-roll components that exist in `@/components/ds`
- NEVER use `bg-white` or hardcoded color classes — use semantic tokens only
- NEVER add Co-Authored-By to commits — breaks Vercel deployment

**Edge Cases to Handle:**
- `parseInt(projectId, 10)` can return `NaN` — always validate with `Number.isNaN()` before queries
- Supabase `.select()` with joins can silently return null for FK mismatches — test queries before claiming fixed
- Next.js `.next` cache persists stale compiled routes — new/modified files may not be recognized until cache cleared
- `params` is async in Next.js 15 — forgetting `await` causes runtime errors TypeScript won't catch
- Empty string vs null in form fields — use Zod `.transform()` to normalize (empty string → null)
- Form ↔ DB FK mismatches: known pairs are `budget_code_id` (FK→budget_lines, dropdown→project_cost_codes) and `vendor_id` (FK→companies, dropdown→vendors). Always verify FK target table = dropdown source table before building any form with selects.

**Security Rules:**
- OWASP security headers already configured in `next.config.ts` — do not override
- Supabase RLS policies required on all new tables
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
6. Vercel build crash? → Check for module-level server client init; add `force-dynamic` to affected pages

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes or new gates are added to CLAUDE.md
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-05-02
