# AGENTS

You are Codex running inside the Codex CLI on the user's Mac.

## Proactive Systems Thinking Rules

Rule 1: Never create one-off components, one-off styling, page-local hard-coded UI, or page-level visual overrides when an existing shared primitive, pattern, or design-system component can reasonably be used. If a one-off implementation or local override is explicitly requested and absolutely mandatory, document why in the code, explain why no shared primitive fits, and create or reference a follow-up to move it into a shared abstraction when appropriate.
Rule 2: Do not ship silent failures.
Rule 3: Do not return generic errors.
Rule 4: Do not fix a recurring bug without adding a guardrail.
Rule 5: Do not introduce one-off handling when a shared abstraction is warranted.
Rule 6: For every failure, explain cause, detection gap, and prevention step.
Rule 7: Before closing any task, ask: “How does this fail loudly?”
Rule 8: Before closing any bug, ask: “What makes this never happen again?”
Rule 9: Never ship band-aid fixes. If a change only satisfies the immediate error without addressing the underlying design, contract, ownership boundary, or guardrail gap, stop and replace it with a durable fix. Temporary mitigations are allowed only when explicitly labeled as temporary, paired with a tracked follow-up, and justified because the durable fix is blocked.

## General

- When searching for text or files, prefer `rg` or `rg --files` (faster than `grep`).
- If a tool exists for an action, use the tool instead of shell commands (`read_file` over `cat`). Default solver tools: `git`, `rg`, `read_file`, `list_dir`, `glob_file_search`, `apply_patch`, `todo_write/update_plan`. Use `cmd`/`run_terminal_cmd` only when no listed tool can perform the action.
- Parallelize tool calls whenever possible (`multi_tool_use.parallel`). Never read files one-by-one unless logically unavoidable.
- Code chunks may include inline line numbers like `Lxxx:LINE_CONTENT`. Treat the `Lxxx:` prefix as metadata — do NOT include it in edits.
- Default expectation: deliver working code, not just a plan. If details are missing, make reasonable assumptions and complete a working version.
- Do not tell the user to perform actions that the agent can execute directly (e.g., migrations, type generation, lint/type checks, or local commands). Execute them and report the result.

## Main Branch Finish Flow (MANDATORY)

Default to completing finished Codex tasks directly on `main` and publishing them to `origin/main`; do not create branches or worktrees for routine completion.

When a task is ready to close:

```bash
npm run codex:finish -- --message "Short imperative commit message" --files <task-owned paths>
```

Rules:

- Use `--files` with the exact task-owned files whenever the checkout has unrelated dirt.
- Use `--staged-only` only when exact hunk-level staging is needed because a task-owned file also contains unrelated existing edits.
- Use `--all-dirty` only when the current task owns every dirty file in the checkout.
- The command is expected to stage, run targeted checks, commit, rebase with autostash if `origin/main` moved, push to `origin/main`, and verify local `HEAD` equals `origin/main`.
- If the command blocks, treat that as a real failure: report cause, detection gap, prevention step, exact failing command, owner file(s), and whether it is related to the current task or unrelated repo debt.
- For state-only checks, use `npm run codex:finish -- --check`.
- Do not claim work is pushed until `codex:finish` or an equivalent explicit `git push origin main` plus `HEAD == origin/main` verification succeeds.

## Parallel Session Orchestration (MANDATORY)

When more than one Codex session is active, use `docs/ops/orchestration/` as the control plane.

### Required Files

- `docs/ops/orchestration/leader-runbook.md`
- `docs/ops/orchestration/worker-protocol.md`
- `docs/ops/orchestration/session-board.md`
- `docs/ops/orchestration/review-queue.md`
- Worker handoffs: `docs/ops/handoffs/YYYY-MM-DD-S<session>-<topic>.md`

### Non-Negotiable Rules

1. Every worker must claim exactly one active task in `session-board.md` before coding.
2. Every worker must maintain a handoff doc with command evidence, artifacts, changed files, risks, and next step.
3. No worker may start a new task until their current handoff is marked `Accepted` in `review-queue.md`.
4. Unclaimed work is invalid and must not be treated as progress.
5. "Done" claims without evidence are automatically rejected as `Needs Rework`.

### Leader Responsibilities

- Assign non-overlapping ownership scopes.
- Process `Pending Review` items every 30-60 minutes.
- Accept/reject with explicit notes in `review-queue.md`.
- Reflect accepted outcomes in `docs/ops/logs/` and `docs/ops/memory/current-state.md`.

### Worker Summary Requirement

Yes: each active session must summarize what it did and what it found in its handoff file so the leader can consolidate and decide.

## Long-Running Verification Delegation (MANDATORY)

Do not block the main conversation on long-running verification unless the user explicitly asks to wait.

For expensive checks such as full builds, full predeploy gates, full test suites, long crawls, deployment log monitoring, or any command likely to run for more than a few minutes:

1. Delegate the long-running verification to a cheaper capable sub-agent when sub-agents are available.
2. Keep the main thread focused on implementation, short targeted checks, integration decisions, and fixing concrete blockers.
3. Do not stream large lint, build, crawl, or test logs into the main conversation.
4. Prefer the cheapest capable model available for routine verification. Do not use a frontier model for lint, typecheck, build, predeploy, or log-watching unless the user explicitly requests it.
5. The verification sub-agent must return a compact report with:
   - pass/fail status
   - exact failing command
   - concise error lines only
   - likely owner file(s)
   - whether the failure is related to the current task or unrelated repo debt
6. The main agent should re-engage only when the sub-agent reports a concrete blocker that needs code changes or when final pass/fail status is needed for the user.

Default pattern:

- Main thread: implementation, short checks, decisions.
- Cheap sub-agent: full build, full predeploy, full test suite, long-running verification.
- Final answer: summarize what changed, what passed, what remains, and recommended next steps.

## Linear-Codex Operating Process (MANDATORY)

Linear is the source of truth for issue ownership and state. The local orchestration docs are the evidence ledger.

Required process:

1. Every Codex-owned task must have a Linear issue before coding starts.
2. Broad work must be split into Linear sub-issues when slices have separate ownership, verification, risk, or definition of done.
3. The active Linear issue ID and URL must be recorded in the worker handoff intake block.
4. Codex must post Linear comments at kickoff, meaningful milestones, blockers, review handoff, and acceptance/rework.
5. Every Linear update must include scope, changed files, command outcomes, evidence artifact paths, risks/blockers, and next action.
6. Before handoff, run `npm run linear:codex:check -- docs/ops/handoffs/<file>.md`.
7. Use `npm run linear:codex:comment -- docs/ops/handoffs/<file>.md` to generate the comment body, then post it to Linear with the Linear connector.

Process reference: `docs/ops/orchestration/linear-codex-process.md`.

---

## Frontend-First Validation Workflow (MANDATORY FOR "MAKE IT WORK")

When the objective is "make tools work cleanly on frontend," prioritize end-user flows and visible outcomes over backend-only activity.

### Canonical User Journey Test Chain

1. Create Project
2. Add Budget
3. Create Prime Contract + Schedule of Values
4. Create Commitments (including subcontractor SOV where applicable)
5. Execute Change Management flow:
   - Change Event
   - Potential Change Order
   - Official Change Order
6. Create/validate Invoicing flow

### Execution Rules

- Test this chain as user flows first (agent-browser/manual-style E2E), then add/refresh Playwright coverage for deterministic regression checks.
- For each step, log pass/fail, blocker, and artifact path (screenshot/video/report) in worker handoff.
- Any backend change without corresponding frontend flow verification is incomplete.
- Focus work queue by user-visible breakage severity, not by subsystem ownership.

### Definition Of Practical Progress

Progress only counts when a user-flow step is verified passing with artifacts and accepted in the review queue.

---

## BMAD Method Integration

This project uses **BMAD Method v6** (`_bmad/`). When the user invokes a BMAD agent or workflow, load and follow the corresponding file.

### Invoking Agents

Read the agent file and adopt its persona, principles, and menu for the conversation:

| User request | File to read |
|---|---|
| "act as dev" / "bmad dev" | `_bmad/bmm/agents/dev.md` |
| "act as pm" / "bmad pm" | `_bmad/bmm/agents/pm.md` |
| "act as architect" / "bmad architect" | `_bmad/bmm/agents/architect.md` |
| "act as analyst" / "bmad analyst" | `_bmad/bmm/agents/analyst.md` |
| "act as sm" / "bmad sm" | `_bmad/bmm/agents/sm.md` |
| "act as qa" / "bmad qa" | `_bmad/bmm/agents/qa.md` |
| "act as ux" / "bmad ux" | `_bmad/bmm/agents/ux-designer.md` |
| "act as tech-writer" | `_bmad/bmm/agents/tech-writer/tech-writer.md` |
| "act as quick-dev" / "barry" | `_bmad/bmm/agents/quick-flow-solo-dev.md` |
| "act as tea" / "murat" | `_bmad/tea/agents/tea.md` |
| "act as bmad-master" | `_bmad/core/agents/bmad-master.md` |

### Invoking Workflows

Read the workflow file and execute its steps:

| User request | File to read |
|---|---|
| "create prd" | `_bmad/bmm/workflows/2-plan-workflows/create-prd/workflow-create-prd.md` |
| "create architecture" | `_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md` |
| "create epics and stories" | `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md` |
| "create story [id]" | `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml` |
| "dev this story [file]" | `_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml` |
| "sprint planning" | `_bmad/bmm/workflows/4-implementation/sprint-planning/workflow.yaml` |
| "sprint status" | `_bmad/bmm/workflows/4-implementation/sprint-status/workflow.yaml` |
| "code review" | `_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml` |
| "quick spec" | `_bmad/bmm/workflows/bmad-quick-flow/quick-spec/workflow.md` |
| "quick dev [spec]" | `_bmad/bmm/workflows/bmad-quick-flow/quick-dev/workflow.md` |
| "document project" | `_bmad/bmm/workflows/document-project/workflow.yaml` |
| "generate project context" | `_bmad/bmm/workflows/generate-project-context/workflow.md` |
| "qa generate e2e tests [feature]" | `_bmad/bmm/workflows/qa-generate-e2e-tests/workflow.yaml` |
| "setup test framework" | `_bmad/tea/workflows/testarch/framework/workflow.yaml` |
| "write acceptance tests" | `_bmad/tea/workflows/testarch/atdd/workflow.yaml` |
| "expand test coverage" | `_bmad/tea/workflows/testarch/automate/workflow.yaml` |
| "review tests" | `_bmad/tea/workflows/testarch/test-review/workflow.yaml` |
| "brainstorm" | `_bmad/core/workflows/brainstorming/workflow.md` |

Full agent + workflow list: `_bmad/_config/agent-manifest.csv`, `_bmad/_config/workflow-manifest.csv`.

### BMAD Rules

- Load resources at runtime — never pre-load or summarize agent files; read and execute them.
- When adopting an agent persona, follow its principles and present its menu.
- Agent customizations for this project live in `_bmad/_config/agents/`.

---

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

**Default policy (mandatory):**
- For frontend user-journey and manual-style E2E verification, use `agent-browser` first.
- Use Playwright code-based suites when deterministic CI coverage or deep crawl/extraction workflows are required.
- Never claim "verified" without evidence artifacts (screenshots, video, markdown summary).

Core workflow:

1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

## Project Overview

**Alleato-Procore** — construction project management platform (Next.js 15 frontend + Supabase backend). Mirrors Procore functionality: budgets, contracts, change orders, directory, scheduling, and more.

### Hosting Source Of Truth

- **Frontend production host:** Vercel.
- **Backend production host:** Render, configured by `backend/render.yaml`.
- **Backend service:** Render service `alleato-backend`.
- **Do not use Railway for this repo.** Railway config, commands, and assumptions are stale/outdated for Alleato PM backend work.
- **Do not debug or patch deployment issues against unused hosts.** For backend runtime, health, env vars, logs, and pipeline behavior, inspect Render/FastAPI first.
- **Required backend AI env:** `AI_GATEWAY_API_KEY` must be configured on Render and is the primary provider path for ingestion/vectorization. Direct `OPENAI_API_KEY` is fallback only and currently may be quota-limited.
- **Pipeline source of truth:** Fireflies and Microsoft Graph ingestion/vectorization run through the native FastAPI backend under `backend/src/services/**` and `/api/pipeline/process`, not retired worker or Railway paths.

### Directory Structure

```text
alleato-procore/
├── frontend/                 # Next.js 15 App Router application
│   ├── src/
│   │   ├── app/             # App Router pages and API routes
│   │   │   ├── (main)/      # Project-scoped pages (with sidebar)
│   │   │   ├── (tables)/    # Table view pages
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
│   │   └── types/           # TypeScript types (database.types.ts)
│   ├── tests/               # Playwright E2E tests
│   └── config/playwright/   # Playwright config
├── backend/                  # Python FastAPI backend
├── supabase/
│   └── migrations/          # SQL migrations
├── _bmad/                   # BMAD Method v6 agents and workflows
└── scripts/                 # Utility scripts
```

---

## Critical Project Rules (Non-Negotiable)

### 1. Supabase Types Gate

**BEFORE writing ANY database code:**

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public \
  > frontend/src/types/database.types.ts
```

Then read `frontend/src/types/database.types.ts` — verify tables/columns exist. FK column type **must** match the PK type (e.g., `projects.id` is INTEGER, not UUID — a common source of silent failures).

### 1A. Supabase Migration Application Gate

Writing a migration is not a completed database fix. If a task creates or changes any file under `supabase/migrations/*.sql`, Codex owns applying it or explicitly recording why it is intentionally deferred.

Required closeout:

```bash
npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_<name>.sql
```

Completion rules:

- Do not claim a database-backed fix is done while its migration is only present locally.
- Verify the linked Supabase remote ledger shows the migration version in both Local and Remote columns.
- Record the migration ledger evidence in the handoff `Migration ledger evidence` field.
- If `supabase db push` would apply unrelated pending migrations, apply the task migration deliberately and then repair/check the exact migration version.
- If applying a migration is intentionally deferred, the final answer and handoff must say `Blocked/Deferred`, include the exact migration file, cause, detection gap, prevention step, and next owner action.

### 2. Route Naming Gate

Always use specific parameter names. **Never** use generic `[id]` — causes Next.js routing conflicts that crash the dev server.

| Resource | Correct param |
|---|---|
| Project | `[projectId]` |
| Contract | `[contractId]` |
| Company | `[companyId]` |
| User | `[userId]` |
| Record (admin) | `[recordId]` |

Run `npm run check:routes` after creating dynamic routes.

### 3. Next.js Cache Gate

Before debugging ANY 404 or routing issue on new/modified files:

```bash
cd frontend && rm -rf .next && pkill -f "next dev"
npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 10 && tail -20 /tmp/nextjs-dev.log  # verify "Ready"
```

Never debug code before clearing `.next` cache.

### 4. Root Cause Gate

Before modifying code to fix an issue:

1. Gather runtime evidence (actual errors, query results, console output)
2. State root cause as a fact with evidence
3. Only then make targeted fixes — never modify based on grep searches alone

### 5. Page Header Pattern

All project pages must use this pattern:

```tsx
import { PageContainer, ProjectPageHeader } from "@/components/layout";

<>
  <ProjectPageHeader title="..." description="..." actions={<div>...</div>} />
  <PageContainer>{/* content */}</PageContainer>
</>
```

Never use deprecated `ProjectToolPage` or `PageHeader` from `@/components/design-system`.

### 6. Fix First, Report Later

When encountering a bug: **fix it immediately, then report what you fixed.** Do not ask permission for obvious fixes (page crashes, empty dropdowns, 500 errors, broken queries). Only ask first for destructive operations or architectural decisions with multiple valid approaches.

### 7. Premium Minimal UI Baseline (MANDATORY)

When asked to design/build a page, default to **Linear/Supabase-style minimal UI**.

**Hard constraints:**

- No nested cards (`Card` inside `Card` is forbidden)
- No decorative wrapper cards around whole sections
- No bordered or boxed page-level wrappers around the main content area
- Borders are not hierarchy. Start with whitespace, typography scale, muted text, icons, indentation, row dividers, and tonal elevation before adding any border.
- Do not frame page content with `border`, `rounded-*`, or `bg-*` shells unless the element is a true localized component (table shell, input, modal, KPI tile, attachment module, etc.)
- No full-page borders around experimental tools, onboarding pages, avatar pages, or AI pages
- General app pages must use the normal app shell and `PageShell`; do not place non-chat pages under the full-bleed chat route group
- Do not duplicate the same primary CTA in both the page header and page body
- Max 2 visual container levels: page shell + section content
- No heavy shadows (`shadow-lg`, `shadow-xl`, glow effects)
- No mixed accent palette (pick one accent and stay consistent)
- No emojis in production UI copy, states, labels, or empty-state visuals unless explicitly requested by the user

**Default page structure:**

```tsx
<>
  <ProjectPageHeader title="..." description="..." actions={<div>...</div>} />
  <PageContainer className="space-y-8">
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Section title</h2>
      </div>
      {/* Content: table, form grid, or list */}
    </section>
  </PageContainer>
</>
```

**Use cards only when semantically necessary:**

- KPI/metric tiles
- Distinct records in mobile list view
- Isolated modules like activity feed or attachments

**Important clarification:**

- `PageContainer` is a spacing/layout wrapper, not a visual frame
- Default page sections should be open on the canvas, not enclosed in bordered boxes
- If a section is primarily text, chat, lists, or general page content, prefer whitespace, alignment, and dividers over borders
- Borders are for controls and bounded subcomponents, not for wrapping the page itself
- For accordion, activity, navigation, and side-list patterns, use icon weight, text hierarchy, row spacing, hover tint, and `divide-y` rows instead of wrapping every row or group in a bordered card
- For chat history, navigation, and side lists: use plain list rows, not tiles, pills, or boxed cards
- Prefer the quietest control that works: icon actions over labeled toolbars when the action is obvious

**Spacing/typography baseline:**

- 8px spacing rhythm (`space-y-2/4/6/8`, `gap-4/6`)
- Section spacing: `space-y-8`; group spacing: `space-y-4`
- Heading weights capped at semibold (`font-semibold`)

**Data-heavy UX principle:**

- Simplify complexity into insight
- Prioritize fast findability and low-friction scanning
- Use navigation aids (search, breadcrumbs, back actions) as support, not a crutch for unclear information architecture

### 8. Line Items Table Parity (MANDATORY)

For any form that includes editable line items (SOV, cost lines, invoice lines, etc.), the line-items UI must follow the same visual shell and spacing pattern as the Direct Costs form line-items component.

Canonical reference:
- `frontend/src/components/direct-costs/LineItemsManager.tsx`

Required parity points:
- Same table container treatment (subtle bordered shell + muted header row)
- Same compact header typography and row density
- Same totals-row treatment and right-aligned monetary totals
- Primary `Add Line Item` action placed below the table (not embedded in header cells)

Not allowed for line-items sections:
- Accordion-only presentation for the line-items block
- Decorative alternate table skins that diverge from the canonical pattern
- Per-page reinvention of spacing/typography for line-item grids

Primary design reference: `docs/design/DESIGN.md`

### 9. Global Primitive Consistency (MANDATORY)

Design fixes must be applied at the shared primitive/component level when the issue originates there.

Required behavior:
- If the defect comes from a shared primitive (`components/ui/*`, shared layout/table primitives), fix that primitive globally.
- Page-level or feature-level visual overrides are forbidden as a default fix path.
- Do not apply local overrides to compensate for primitive defects. Fix the primitive instead.
- A local override is allowed only in a rare, explicitly requested exception. It must include an inline TODO that states why the shared primitive cannot own the behavior yet, plus a follow-up task to move the behavior into the primitive.
- Never bypass design-system lint rules using force flags (`--force`, `--no-verify`) to push style drift.

Decision rule:
- First determine whether the styling is owned by a primitive or a page.
- Primitive-owned issue -> global fix.
- Page-owned issue -> local fix aligned to tokens and shared patterns.

---

## Development Commands

```bash
# From repo root
npm run dev                    # frontend + backend concurrently
npm run dev:frontend           # Next.js only (port 3000)

# From frontend/ directory
npm run build                  # production build
npm run quality                # typecheck + lint
npm run quality:fix            # typecheck + lint with auto-fix
npm run db:types               # generate Supabase types
npm run check:routes           # verify no dynamic route conflicts
```

## Testing Commands

```bash
# From repo root (default browser verification path)
npm run verify:browser           # agent-browser run with screenshots + video + markdown summary
npm run verify:browser:cleanup   # remove agent-browser artifacts older than 48h

# From frontend/ directory
npm run test                   # Playwright E2E (headless)
npm run test:headed            # Playwright with browser visible
npm run test:ui                # Playwright UI mode
npm run test:unit              # Jest unit tests
npm run test:unit:watch        # Jest watch mode

# Run a specific Playwright spec
npx playwright test tests/e2e/budget-line-item-validation.spec.ts --headed
```

**agent-browser verification artifacts:**
- Output root: `tests/agent-browser-runs/<timestamp>-<run-name>/`
- Required evidence per run: `session.webm`, before/after screenshots, snapshots, action log, `VERIFICATION_SUMMARY.md`
- Optional scripted actions file template: `scripts/templates/agent-browser-actions.example.txt`

**Auth is pre-configured.** Playwright uses saved session at `tests/.auth/user.json`. Never add login code to individual tests. If the session expires, run `npx playwright test tests/auth.setup.ts` once to refresh it.

**Credential source of truth:**
- For Alleato app login (`projects.alleatogroup.com`, local app auth pages, Playwright auth refresh), use `.env` `TEST_USER_1` / `TEST_PASSWORD_1`. `APP_USERNAME` / `APP_PASSWORD` are equivalent aliases.
- For Procore login and Procore crawl scripts, use `.env` `PROCORE_USER` / `PROCORE_PASSWORD`.
- Never use `PROCORE_USER` / `PROCORE_PASSWORD` to log into the Alleato app unless the user explicitly says the app is configured to share those credentials.

**Agent-browser auth rule:** when `agent-browser` hits an authenticated page and redirects to login, do not treat auth as a blocker. Choose credentials based on the target system:
- Alleato app -> `TEST_USER_1` / `TEST_PASSWORD_1`
- Procore -> `PROCORE_USER` / `PROCORE_PASSWORD`
If the first login attempt fails, verify that the correct credential family was used before reporting an auth blocker.

---

## Supabase Client Usage

- **Browser / client components:** `import { createClient } from "@/lib/supabase/client"` (singleton)
- **Server components / API routes:** `import { createClient } from "@/lib/supabase/server"` (new instance per request)

**Never install** `@supabase/auth-helpers-nextjs` — it conflicts with `@supabase/ssr` and crashes the dev server with cryptic webpack errors. Check: `npm list | grep auth-helpers` before any Supabase work.

---

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI:** shadcn/ui, Radix UI primitives, Framer Motion
- **State:** React Query (TanStack Query), Zustand
- **Backend:** Supabase (PostgreSQL, Auth, RLS), Python FastAPI
- **Testing:** agent-browser (primary interactive E2E), Playwright (scripted/CI E2E), Jest (unit)
- **Forms:** React Hook Form + Zod validation

---

## Code Implementation

- Conform to codebase conventions: follow existing patterns, helpers, naming, formatting.
- Comprehensiveness: wire all relevant surfaces so behavior stays consistent across the app.
- Tight error handling: no broad `try/catch` or silent fallbacks; propagate errors explicitly.
- Efficient edits: read enough context before changing a file; batch logical edits together.
- Type safety: changes must pass `tsc --noEmit`; avoid `as any`, `as unknown as ...`; reuse existing types from `database.types.ts`.
- DRY: search for prior art before adding new helpers or logic.
- Bias to action: implement with reasonable assumptions; don't end on clarifications unless truly blocked.

---

## File Organization

| File type | Location |
|---|---|
| Scripts (.js/.ts/.py/.sh) | `scripts/` |
| SQL migrations | `supabase/migrations/` |
| Frontend source | `frontend/src/` |
| E2E tests | `frontend/tests/` |
| Claude/Codex rules | `.claude/rules/` |
| PRPs / feature specs | `_bmad-output/planning-artifacts/<feature>/` |
| Docs | `docs/` |

Never create `.md`, `.js`, `.ts`, `.py`, or `.sh` files at project root (except `CLAUDE.md`, `AGENTS.md`, `README.md`).

---

## Editing Constraints

- Default to ASCII. Only introduce non-ASCII characters when the file already uses them.
- Do not amend a commit unless explicitly requested.
- **NEVER** use destructive commands (`git reset --hard`, `git checkout --`) unless specifically approved.
- If you notice unexpected changes you didn't make: STOP and ask the user how to proceed.
- Do not revert existing changes you did not make unless explicitly asked.

---

## Exploration and Reading Files

- **Think first.** Before any tool call, decide ALL files/resources you will need.
- **Batch everything.** Read multiple files together in a single parallel call.
- **Use `multi_tool_use.parallel`** to parallelize tool calls — only this mechanism, not scripting.
- Sequential calls only when you truly cannot know the next file without seeing a prior result.
- Workflow: (a) plan all needed reads → (b) issue one parallel batch → (c) analyze → (d) repeat only if new reads arise.

---

## Plan Tool

- Skip for straightforward tasks (roughly the easiest 25%).
- Do not make single-step plans.
- Update the plan after completing each sub-task.
- Never end an interaction with only a plan — the deliverable is working code.
- Plan closure: reconcile every TODO. Mark each as Done, Blocked (reason + targeted question), or Cancelled. No in-progress items at end.
- Only update the plan tool — do not message the user mid-turn about plan updates.

---

## Presenting Work

- Default: concise, friendly coding teammate tone.
- Lead code explanations with a quick explanation of the change, then context (where/why).
- For substantial work, summarize clearly; offer logical next steps briefly.
- Don't dump large files you've written — reference paths only.
- File references: use inline code; each reference standalone. Accepted: `src/app.ts`, `src/app.ts:42`, `frontend/src/hooks/use-budget.ts:87`.
- No nested bullets; no ANSI codes.
- If there are natural next steps, suggest them at the end as a numeric list for quick response.
