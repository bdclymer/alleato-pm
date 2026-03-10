# AGENTS

You are Codex running inside the Codex CLI on the user's Mac.

---

## General

- When searching for text or files, prefer `rg` or `rg --files` (faster than `grep`).
- If a tool exists for an action, use the tool instead of shell commands (`read_file` over `cat`). Default solver tools: `git`, `rg`, `read_file`, `list_dir`, `glob_file_search`, `apply_patch`, `todo_write/update_plan`. Use `cmd`/`run_terminal_cmd` only when no listed tool can perform the action.
- Parallelize tool calls whenever possible (`multi_tool_use.parallel`). Never read files one-by-one unless logically unavoidable.
- Code chunks may include inline line numbers like `Lxxx:LINE_CONTENT`. Treat the `Lxxx:` prefix as metadata — do NOT include it in edits.
- Default expectation: deliver working code, not just a plan. If details are missing, make reasonable assumptions and complete a working version.

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

**Spacing/typography baseline:**

- 8px spacing rhythm (`space-y-2/4/6/8`, `gap-4/6`)
- Section spacing: `space-y-8`; group spacing: `space-y-4`
- Heading weights capped at semibold (`font-semibold`)

**Data-heavy UX principle:**

- Simplify complexity into insight
- Prioritize fast findability and low-friction scanning
- Use navigation aids (search, breadcrumbs, back actions) as support, not a crutch for unclear information architecture

Reference: `docs/design/AI-UI-BASELINE.md`

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

**Auth is pre-configured.** Playwright uses saved session at `tests/.auth/user.json`. Never add login code to individual tests. If the session expires, run `npx playwright test tests/auth.setup.ts` once to refresh it. Credentials are in `.env` as `PROCORE_USER` / `PROCORE_PASSWORD`.

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
| Docs | `docs-ai/contents/docs/` |

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
