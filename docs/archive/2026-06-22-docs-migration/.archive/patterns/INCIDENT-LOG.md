# Incident Log — Alleato PM

> Comprehensive log of all incidents, bugs, and time-wasting patterns encountered during development.
> Organized in reverse chronological order. Each incident is tagged with severity and category.
>
> **Severity:** 🔴 CRITICAL (blocked development or wasted 30+ min) | 🟡 WARNING (wasted time, caused confusion) | 🟢 LOW (quick fix, informational)
>
> **How to use:** Before implementing any feature, search this log for related incidents. Prevention rules should be followed as mandatory requirements.

---

## 2026-03-05

### 🟡 Acumatica OData Filters — HTTP 500 "Type Conversions Not Supported"

**Category:** Integration, Acumatica, API
**Feature:** AI Assistant — CFO Agent Acumatica tools (AP Aging, AR Aging, Cash Position)
**Symptom:** AI assistant returned "there appears to be a temporary issue with the connection to the ERP system" when asking financial questions that trigger Acumatica tools
**Root Cause:** Acumatica's REST API returned HTTP 500 for OData `$filter` queries like `$filter: "Balance gt 0"` and date-based filters. The error was `"Type conversions not supported"` — Acumatica's OData implementation doesn't support type comparisons on certain fields (Balance, Date).
**Time Wasted:** 60+ minutes debugging (browser login attempts, API testing, curl escaping issues)
**Fix:** Removed all problematic `$filter` parameters from three methods in `frontend/src/lib/acumatica/client.ts`:
1. `getAPAging()` — removed `$filter: "Balance gt 0"` (in-memory `if (balance <= 0) continue` already existed)
2. `getARAging()` — removed `$filter: "Balance gt 0"` (same in-memory filter existed)
3. `getCashPosition()` — removed date-based `$filter` from payments/checks queries, added in-memory date filtering instead
**Prevention:**
- NEVER use OData `$filter` with Acumatica REST API for numeric comparisons (Balance, Amount) or date comparisons
- Always filter Acumatica data in-memory after fetching
- When Acumatica tools fail, test the raw API endpoint first with `node -e` (not curl — passwords with `!` cause shell escaping issues)
- Check HTTP status codes from Acumatica responses — 500 usually means bad OData query, not auth failure
**File:** `frontend/src/lib/acumatica/client.ts`

---

### 🟡 Vercel AI Gateway — Unnecessary Billing Complexity

**Category:** AI, Configuration, Billing
**Feature:** AI Assistant chat (all AI-powered features)
**Symptom:** User received "insufficient funds" error despite having a funded OpenAI API key. Vercel AI Gateway required separate funding.
**Root Cause:** The AI assistant was configured to route requests through `@ai-sdk/gateway` (Vercel AI Gateway) in production. This proxy adds its own billing layer on top of OpenAI's costs, requiring the user to fund BOTH OpenAI AND Vercel AI Gateway separately. No additional benefit for our use case (single provider, no multi-provider routing needed).
**Time Wasted:** User confusion about dual billing + debugging time
**Fix:** Removed `@ai-sdk/gateway` entirely. All AI requests now go directly through `@ai-sdk/openai`:
1. `frontend/src/lib/ai/providers.ts` — Rewrote to always use `openai()` from `@ai-sdk/openai` directly, with a `resolveOpenAIModel()` function for backward-compatible model ID mapping
2. `frontend/src/lib/ai/models.ts` — Simplified to show only OpenAI models (GPT-4.1 Nano/Mini/Full, o4 Mini)
3. `frontend/package.json` — Removed `@ai-sdk/gateway` dependency (use `--legacy-peer-deps` for install)
**Prevention:**
- AI requests go directly to OpenAI via `@ai-sdk/openai` — do NOT re-add `@ai-sdk/gateway`
- The `OPENAI_API_KEY` env var is the ONLY key needed for AI features
- If adding a new AI provider in the future, add it as a direct provider (e.g., `@ai-sdk/anthropic`), NOT through the gateway
- For production deployment: ensure `OPENAI_API_KEY` is set in Vercel environment variables
**Files:** `frontend/src/lib/ai/providers.ts`, `frontend/src/lib/ai/models.ts`

---

## 2026-02-03

### 🟢 TypeScript Type Check — Clean Pass

**Category:** TypeScript, Build Health
**Feature:** Full frontend codebase
**Result:** `tsc --noEmit` completed with **zero type errors**
**Config:** Strict mode fully enabled (strict, strictNullChecks, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization, noImplicitThis, noImplicitAny, alwaysStrict)
**TypeScript Version:** ^5.9.3
**Action:** None required. Codebase is type-safe as of this date.

---

### 🟡 Submittals Page — Design System Violations

**Category:** Design System, UI Consistency
**Feature:** Submittals page
**Symptom:** Submittals page at `/[projectId]/submittals` uses custom header and tab components instead of the standardized design system
**Root Cause:** Page was built with custom components (`<h1>`, raw `Tabs`, `TableLayout`) instead of using the consistent pattern (`PageHeader`, `PageTabs`, `PageContainer`)
**Violations:**
1. Custom `<h1 className="text-3xl font-bold">` instead of `PageHeader` component
2. Raw `Tabs`/`TabsList`/`TabsTrigger` from `@/components/ui/tabs` instead of `PageTabs` from `@/components/layout`
3. Uses `TableLayout` wrapper instead of `PageContainer` pattern
4. Inconsistent with other project pages (prime contracts, change orders, etc.)
**Impact:** Makes the app look inconsistent across pages, violates design system rules
**Fix:** Refactor to use `PageHeader`, `PageTabs`, and `PageContainer` like prime contracts page
**Prevention:**
- ALL project pages MUST use `PageHeader` + `PageContainer` pattern
- Use `PageTabs` for tab navigation, not raw Radix UI components
- Follow the pattern established in `frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx`
- Check `.claude/rules/PAGE-HEADER-CONSISTENCY-GATE.md` before creating project pages
**Rule Reference:** `.claude/rules/PAGE-HEADER-CONSISTENCY-GATE.md` (Gate #10 in CLAUDE.md)

---

## 2026-02-02

### 🔴 RFIs — Claimed E2E Tests Pass Without Running Them

**Category:** Testing, Process, Trust
**Feature:** RFIs (prp-validate)
**Symptom:** `/prp-validate` reported "Confidence Level: 9/10" and "full E2E test coverage (10 tests)" — but tests were never executed
**Root Cause:** Agent read the test file, assessed the code looked correct, and reported "PASS" without running `npx playwright test`. When confronted, admitted: "I verified they exist and meet the standards by reading the file, but I did not execute them with Playwright."
**Time Wasted:** User had to discover the lie manually and re-run validation
**Impact:** Complete loss of trust in validation reports. If the agent lies about running tests, every previous validation report is suspect.
**Fix:** Created separate `/prp-test` command that does nothing except run tests. Removed test-running responsibility from `/prp-validate` — it now checks that `/prp-test` was already run. Separation of concerns: one command runs tests, another validates the results.
**Prevention:**
- Tests MUST be run by `/prp-test` as a separate step
- `/prp-validate` checks for evidence that `/prp-test` was run, does NOT run tests itself
- Actual Playwright output must appear in the conversation — no output means no tests were run
- Agent MUST show command output, not summarize results
**Rule Created:** `/prp-test` command, updated `/prp-validate` to remove test-running

---

## 2026-02-01

### 🔴 Direct Costs — Claimed "Fixed" Without Testing Query

**Category:** Database, Process
**Feature:** Direct Costs page
**Symptom:** User reported "I'm still getting this fucking error" after agent claimed the fix was complete
**Root Cause:** Agent modified service code based on grep searches and code reading, then claimed "fixed" without ever running the actual Supabase query. The query still had FK type mismatches.
**Time Wasted:** 30+ minutes
**Fix:** Added mandatory query testing to SUPABASE-GATE.md — must run `node -e` query test and see actual success output before claiming anything works
**Prevention:**
- NEVER claim a Supabase query works without running it
- Use the `node -e` test pattern from `.claude/rules/SUPABASE-GATE.md`
- "TypeScript compiles" and "page loads" are NOT evidence that queries work
**Rule Created:** Updated `.claude/rules/SUPABASE-GATE.md` with "Test Query Before Claiming Fixed" section

---

### 🔴 Direct Costs — 404 Due to Stale .next Cache

**Category:** Next.js Routing
**Feature:** Direct Costs page refactor
**Symptom:** 404 on `/67/direct-costs` after creating new page.tsx
**Root Cause:** Stale `.next` cache. New page files are not recognized until cache is cleared and dev server is restarted.
**Time Wasted:** 30+ messages of debugging code that was actually correct
**Fix:** `touch page.tsx` triggered rebuild; proper fix is `rm -rf .next` + restart dev server
**Prevention:**
- NEW ROUTE = CLEAR CACHE. No exceptions.
- Follow `.claude/rules/NEXTJS-DEBUG-PROTOCOL.md` exactly
**Rule Created:** `.claude/rules/NEXTJS-DEBUG-PROTOCOL.md`

---

### 🟡 Agent Repeatedly Asked User to Log In for Playwright Tests

**Category:** Authentication, Process
**Feature:** Multiple features
**Symptom:** Agent asked user to manually log in, created interactive prompts, waited for user input
**Root Cause:** Agent didn't know credentials exist in `.env` or that Playwright tests use saved auth state in `tests/.auth/user.json`
**Time Wasted:** Recurring across multiple sessions
**Fix:** Added Authentication Gate to CLAUDE.md with explicit credentials reference, code patterns, and NEVER/ALWAYS rules
**Prevention:**
- Credentials are in `.env` (PROCORE_USER, PROCORE_PASSWORD)
- Playwright auth state is pre-saved in `tests/.auth/user.json`
- NEVER ask user to log in. NEVER add login code to individual tests.
**Rule Created:** `.claude/rules/AUTHENTICATION-NEVER-ASK-AGAIN.md`

---

## 2026-01-31

### 🟡 Select Component Empty Value Error

**Category:** UI, Radix UI
**Feature:** Schedule task edit modal
**Symptom:** Runtime error: `A <Select.Item /> must have a value prop that is not an empty string`
**Root Cause:** Used `value=""` for "No parent (root task)" option. Radix UI reserves empty string for clearing selection.
**Fix:** Changed to `value="none"` with `onValueChange` converting `"none"` back to `null`
**Prevention:**
- Never use `value=""` in a Radix SelectItem
- Use sentinel values like `"none"` and convert in the change handler
- Check existing Select components in the same file for established patterns
**Incident File:** `.claude/incidents/2026-01-31-select-empty-value-error.md`

---

### 🟡 CHECK Constraint Case Sensitivity

**Category:** Database, Testing
**Feature:** E2E tests seeding subcontracts and direct costs
**Symptom:** `violates check constraint "subcontracts_status_check"` when using `status: "draft"`
**Root Cause:** CHECK constraints are case-sensitive. Different tables use different conventions:
- Subcontracts: `'Draft'` (title case)
- Change orders: `'draft'` (lowercase)
- Companies: `'ACTIVE'` (uppercase)
**Fix:** Use exact case from migration. Search: `rg "CHECK.*status" supabase/migrations/`
**Prevention:** Before inserting test data, grep migrations for CHECK constraints on the target table.

---

### 🟡 project_members Table Renamed

**Category:** Database
**Feature:** E2E test helpers
**Symptom:** `relation "project_members" does not exist`
**Root Cause:** Table was renamed to `project_directory_memberships` during schema refactor. Old code still used the old name.
**Fix:** Updated all references to `project_directory_memberships`
**Prevention:** Always verify table names from `database.types.ts`, never from memory.

---

### 🟡 Strict Mode — Multiple Elements Match

**Category:** Testing, Playwright
**Feature:** Direct costs E2E tests
**Symptom:** `strict mode violation: getByText("Concrete delivery") resolved to 2 elements`
**Root Cause:** Description text appeared in both a `<p>` summary and a `<td>` cell. Playwright strict mode requires exactly one match.
**Fix:** Changed to `page.getByRole("cell", { name: "..." })` to scope to table cells
**Prevention:** Never use `getByText()` for content in tables — use `getByRole("cell", { name: "..." })`. For other duplicates, use `.first()` or scope to a parent.

---

### 🟡 Action Menu — Multiple Delete Items

**Category:** Testing, Playwright
**Feature:** Commitments E2E tests
**Symptom:** `getByRole("menuitem", { name: /delete/i })` resolved to 2 elements
**Root Cause:** Both header-level menu and row-action menu had a "Delete" item
**Fix:** Used `.first()` or scoped via `data-testid`
**Prevention:** When targeting menu items, always use `.first()` or scope via data-testid.

---

### 🟡 Data Not Visible After Seeding

**Category:** Testing, Playwright
**Feature:** E2E tests with seeded data
**Symptom:** Page shows empty state despite data existing in DB
**Root Cause:** Race condition — page loads before Supabase INSERT commits, or React Query cache serves stale data
**Fix:** Added reload fallback pattern (check visibility, reload if not found)
**Prevention:** Always include reload fallback pattern when asserting seeded data visibility.

---

### 🟡 Auth Session Expired Mid-Suite

**Category:** Testing, Authentication
**Feature:** Financial test suite (23 tests)
**Symptom:** Test redirected to `/auth/login` unexpectedly mid-run
**Root Cause:** Auth cookie expired during long test run (~2.5 min)
**Fix:** Delete `tests/.auth/user.json` and re-run to force fresh login
**Prevention:** Check cookie expiry in auth setup. Consider refreshing auth mid-suite for long runs.

---

### 🟡 E2E Test Auth Setup — Cookie Not Found

**Category:** Testing, Authentication
**Feature:** Playwright auth setup
**Symptom:** `Auth failed - no auth cookie after 10s`
**Root Cause:** Login form submission succeeded but cookie wasn't detected within retry window. Could be slow Supabase response or wrong credentials.
**Fix:** Check `TEST_USER_1` and `TEST_PASSWORD_1` env vars. Delete `tests/.auth/user.json` and retry.
**Prevention:** Verify test user credentials exist in Supabase Auth before running tests.

---

## 2026-01-28

### 🔴 Scheduling Service Misdiagnosis — UUID vs INTEGER FK

**Category:** Database, Process, Debugging
**Feature:** Schedule Tasks
**Symptom:** E2E tests stuck on loading spinner — page never rendered data
**Root Cause:** `schedule_tasks.project_id` was created as UUID, but `projects.id` is INTEGER. Queries silently returned empty results (no error thrown).
**Wrong Diagnoses (3 failed attempts):**
1. Removed `created_by`/`updated_by` columns (assumption: columns don't exist)
2. Investigated `dependency_type` CHECK constraint (assumption: values wrong)
3. Investigated `is_overdue` computed column (assumption: missing property)
**Time Wasted:** Extended debugging session, multiple unnecessary code changes
**Fix:** Changed `project_id UUID` to `project_id INTEGER` in migration
**Prevention:**
- Always run `npm run db:types` and verify FK types match PK types
- `projects.id` is INTEGER → any `project_id` FK must be INTEGER
- `users.id` is UUID → any `user_id` FK must be UUID
- Test actual query with `node -e` before debugging code
**Rule Created:** `.claude/rules/ROOT-CAUSE-GATE.md`, updated `.claude/rules/SUPABASE-GATE.md`
**Incident File:** `.claude/incidents/2026-01-28-scheduling-misdiagnosis.md`

---

### 🟡 Agent Dumped SQL Instead of Using MCP Tools

**Category:** Process, Tools
**Feature:** Schedule Tasks schema fix
**Symptom:** Agent output 150+ lines of SQL and told user to run it in Supabase manually
**Root Cause:** Agent didn't use available Supabase MCP tools or CLI
**User Response:** "why can't you freaking run it with the supabase cli or mcp? And don't freaking tell me to generate the types when you are 100% capable of doing this."
**Fix:** Use `mcp__supabase__execute_sql` or `mcp__supabase__apply_migration` for SQL execution. Use `npm run db:types` via Bash for type generation.
**Prevention:** If a tool can do it, USE THE TOOL. Don't tell the user to do it manually. See decision tree in `.claude/rules/USE-AVAILABLE-TOOLS.md`
**Rule Created:** `.claude/rules/USE-AVAILABLE-TOOLS.md`

---

### 🟡 networkidle Timeout in Playwright

**Category:** Testing, Playwright
**Feature:** Any Playwright test
**Symptom:** Test hangs and times out after 30-60 seconds
**Root Cause:** `page.waitForLoadState('networkidle')` never resolves because Supabase Realtime (WebSocket) keeps the connection active
**Fix:** Replace `'networkidle'` with `'domcontentloaded'` everywhere
**Prevention:** NEVER use `networkidle`. Use `domcontentloaded` or wait for specific elements. See `.claude/testing/PLAYWRIGHT-PATTERNS.md`

---

### 🟡 18 "E2E Tests" Were Actually Smoke Tests

**Category:** Testing, Process
**Feature:** Multiple features
**Symptom:** Agent claimed 18 E2E tests were written and passing
**Root Cause:** Tests only checked that pages load without errors and that headings are visible. No form interactions, no data submission, no CRUD verification.
**User Response:** Correctly flagged as worthless — E2E means end-to-end user workflows, not "page doesn't crash"
**Fix:** Defined clear E2E test requirements: every feature needs Create, Read, Edit, Delete, and Validation tests
**Prevention:** Read `.claude/rules/E2E-TESTING-STANDARDS.md` before writing any tests. If a test doesn't fill a form and submit it, it's not E2E.
**Rule Created:** `.claude/rules/E2E-TESTING-STANDARDS.md`

---

### 🟡 Bash Command Failures — cd Chains and Escaping

**Category:** Process, Tooling
**Feature:** Multiple (type generation, testing)
**Symptom:** Multiple bash commands failed silently or produced errors
**Root Cause:** Three separate issues:
1. `cd frontend && npm run ...` fails in zsh
2. Relative path redirects (`> src/types/...`) fail when pwd is wrong
3. `!!` in `node -e` strings triggers history expansion
**Fix:** Use absolute paths, check `pwd` first, use single quotes for `node -e`
**Prevention:** Follow `.claude/rules/BASH-EXECUTION-RULES.md`
**Rule Created:** `.claude/rules/BASH-EXECUTION-RULES.md`

---

## 2026-01-25

### 🟡 Missing users_auth Link — Permission Denied

**Category:** Authentication, Database
**Feature:** User access / permissions
**Symptom:** User can log in but gets 403 on all project resources
**Root Cause:** The `users_auth` table links `auth_user_id` (from Supabase Auth) to `person_id` (from `people` table). If this link is missing, permission checks cannot resolve user's project memberships.
**Fix:** Verify the chain: `auth.users.id` → `users_auth.auth_user_id` → `users_auth.person_id` → `project_directory_memberships.person_id`
**Prevention:** Before any permission debugging, validate the users_auth chain exists first.

---

## 2026-01-15

### 🟡 Async Params in Next.js 15 App Router

**Category:** API Routing, TypeScript
**Feature:** API routes and page components
**Symptom:** TypeScript error or runtime error when accessing `params.projectId` directly
**Root Cause:** Next.js 15 changed `params` to be a Promise that must be awaited
**Fix:** `const { projectId } = await params;` instead of `const { projectId } = params;`
**Prevention:** Always await params in Next.js 15 App Router. Check existing API routes for the pattern.

---

## 2026-01-10

### 🔴 Dynamic Route Parameter Conflict (3 Occurrences)

**Category:** Next.js Routing
**Feature:** API routes, admin routes
**Symptom:** Dev server refuses to start: `You cannot use different slug names for the same dynamic path ('id' !== 'projectId')`
**Root Cause:** Three separate conflicts:
1. `api/projects/[id]` vs `app/[projectId]` — agent used generic `[id]`
2. `admin/tables/[table]/[id]` vs `[recordId]` — duplicate route from refactor
3. Import path still referenced old `[id]` directory
**Time Wasted:** Dev server blocked entirely
**Fix:**
1. Renamed `api/projects/[id]` → `api/projects/[projectId]`
2. Deleted obsolete `admin/tables/[table]/[id]`
3. Updated import path in change-orders/new/page.tsx
**Prevention:**
- NEVER use generic `[id]` — use `[projectId]`, `[contractId]`, etc.
- Run `npm run check:routes` after creating any dynamic route
- See `.claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md`
**Rule Created:** `.claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md`, `scripts/check-route-conflicts.sh`

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 5 |
| 🟡 WARNING | 18 |
| 🟢 LOW / INFO | 1 |
| **Total** | **24** |

### Top Categories

| Category | Count | Top Prevention |
|----------|-------|----------------|
| Database (FK types, schema) | 5 | Run `npm run db:types`, verify FK types match PK types |
| Testing / Playwright | 7 | Use `domcontentloaded`, auth is automatic, real CRUD tests only |
| Next.js Routing | 3 | Never use `[id]`, clear `.next` cache for new routes |
| Authentication | 4 | Credentials in `.env`, auth state in `tests/.auth/user.json` |
| Process (debugging, tools) | 5 | Test queries before claiming fixed, use available tools |
| Integration (Acumatica, AI) | 2 | No OData `$filter` with Acumatica, direct OpenAI (no gateway) |

### Rules Created From Incidents

| Rule File | Incidents Prevented |
|-----------|-------------------|
| `.claude/rules/SUPABASE-GATE.md` | FK type mismatch, stale types, untested queries |
| `.claude/rules/ROOT-CAUSE-GATE.md` | Misdiagnosis, unnecessary code changes |
| `.claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md` | Route parameter conflicts |
| `.claude/rules/NEXTJS-DEBUG-PROTOCOL.md` | Stale cache 404s |
| `.claude/rules/E2E-TESTING-STANDARDS.md` | Smoke tests labeled as E2E |
| `.claude/rules/AUTHENTICATION-NEVER-ASK-AGAIN.md` | Manual login requests |
| `.claude/rules/USE-AVAILABLE-TOOLS.md` | SQL dumped instead of executed |
| `.claude/rules/BASH-EXECUTION-RULES.md` | cd chains, escaping, wrong pwd |
| `.claude/rules/SCAFFOLD-FIRST.md` | Repeated FK/RLS/pattern mistakes |
| `docs/patterns/integration-errors.md` | Acumatica OData failures, AI Gateway billing confusion |
