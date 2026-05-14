# Automation & Skills Reference

Single source of truth for **what's automated**, **what's a manual skill**, and **when to use each**. Last updated 2026-04-20.

---

## 1. Automated Routines (run themselves)

### GitHub Actions — scheduled

| Workflow | File | When | What it does |
|---|---|---|---|
| API Smoke Contracts | `.github/workflows/api-smoke-scheduled.yml` | Daily **08:00 UTC** | Runs `scripts/api-smoke-contracts.mjs` against prod — hits ~50 API endpoints, flags 500s. |
| Post-Deploy Verify | `.github/workflows/postdeploy-verify.yml` | Daily **08:00 UTC** | Runs `scripts/postdeploy-verify.sh` — prod sanity (key pages load, auth works). |

### GitHub Actions — on PR / push

| Workflow | File | Trigger | What it does |
|---|---|---|---|
| Quality Gate | `.github/workflows/quality-gate.yml` | PR + push | Typecheck + lint + unit tests. |
| Design System Guardrails | `.github/workflows/design-system-guardrails.yml` | PR + push | ESLint design-system rules (no-hardcoded-colors, etc.). |
| Guardrail PR Check | `.github/workflows/guardrail-pr-check.yml` | PR | Blocks PRs missing regression tests / violating gates. |
| Chromatic Visual Regression | `.github/workflows/chromatic.yml` | PR + push | Visual diff on Storybook stories. |
| PR Review Comprehensive | `.github/workflows/pr-review-comprehensive.yml` | PR | Claude-powered PR review. |
| CI Failure Handler | `.github/workflows/ci-handler.yml` | CI failure | Auto-opens Linear issue. |
| Issue Handler | `.github/workflows/issue-handler.yml` | Issue event | Routes GH issues. |
| Codex Fix Issue | `.github/workflows/codex-fix-issue.yml` | Manual/issue label | Codex attempts auto-fix. |
| Claude Code Action | `.github/workflows/claude.yml` | `@claude` mention | Claude replies in PR/issue. |
| Manual Code Analysis | `.github/workflows/manual-code-analysis.yml` | Manual dispatch | Claude commit analysis. |

### Claude Scheduled Tasks (weekly routines)

Defined in `~/.claude/scheduled-tasks/`. These use judgment — they're not pure CI checks.

| Task | Why Claude (not CI) |
|---|---|
| [weekly-design-violation-audit](~/.claude/scheduled-tasks/weekly-design-violation-audit/SKILL.md) | Fetches `/api/dev/violations`, dedupes against Linear, creates tracked issues. Needs judgment about which to file. |
| [weekly-supabase-types-drift](~/.claude/scheduled-tasks/weekly-supabase-types-drift/SKILL.md) | Regenerates `database.types.ts`, commits if changed, reasons about affected call sites. |
| [weekly-dependency-audit](~/.claude/scheduled-tasks/weekly-dependency-audit/SKILL.md) | Runs `pnpm audit` + `pnpm outdated`, triages severity, files Linear issues for actionable ones. |

### Git / Claude Hooks (fire on events)

| Hook | File | Fires on | What it does |
|---|---|---|---|
| Duplicate issue guard | `.claude/hooks/check-duplicate-issue.py` | PreToolUse (Bash with `gh issue`) | Blocks action on issues labeled `duplicate`. |
| verify-feature gate | `.claude/hooks/verify-feature-gate.py` | PreToolUse (agent-browser, Write on report.md) | Blocks skill completion without success-criteria + video evidence. |
| Husky pre-commit | `.husky/pre-commit` | Before commit | Blocks root-dir junk files (`.md`/`.js`/`.sh` outside allowed list). |

---

## 2. Skills (invoked manually by Claude)

### Testing skills — `.claude/skills/testing/`

| Skill | Invocation | Purpose |
|---|---|---|
| **test-scenario-audit** | `/test-scenario-audit <tool> [smoke\|feature\|all]` | Generate + consolidate test cases for a tool. Writes to Supabase (`test_suites`/`test_cases`) + markdown at `docs/testing/scenarios/{tool}-{suite_type}.md`. |
| **test-scenario-run** | `/test-scenario-run <tool> [smoke\|feature\|all] [--case X]` | Execute cases in agent-browser like a human tester. Records `test_runs`/`test_results`/screenshots. **This is the one and only smoke test skill** (the old `smoke-test` skill was merged in and deleted). |
| **feature-audit** | `/feature-audit <tool>` | Audit a tool's feature coverage vs Procore parity. |
| **e2e-test** | `/e2e-test` | Comprehensive all-journeys E2E via agent-browser (parallel research + test). |
| **agent-browser** | reference | CLI reference for agent-browser commands. |
| **verification-before-completion** | reference | Required before claiming work "done". |
| ~~test-scenario-writer~~ | deprecated | Replaced by `test-scenario-audit`. |
| ~~test-scenario-writer-broad~~ | deprecated | Replaced by `test-scenario-audit`. |

### Build / design skills — `.claude/skills/`

| Skill | Purpose |
|---|---|
| **alleato-table-page** | Build a table page using `UnifiedTablePage` + `PageShell`. |
| **building-components** | Modern, accessible, composable component patterns. |
| **design** | General design system work. |
| **extract-design-system** | Pull tokens from a public site to bootstrap a system. |
| **framer-motion-animator** / **motion** | Add Framer Motion animations. |
| **parity-audit** | Compare our tool to Procore equivalent. |
| **procore-audit** / **procore-test-matrix** / **procore-verify** | Procore-specific audits. |
| **procore-docs-rag** | Query Procore docs via RAG. |
| **fk-audit** | Foreign-key / form-dropdown mismatch audit (Gate 11). |

### Integration skills

| Skill | Purpose |
|---|---|
| **ai-sdk** | AI SDK v6 questions + building AI features. |
| **api-design-principles** | REST/GraphQL design reference. |
| **postgresql-table-design** | Postgres schema design. |
| **react-email** / **resend** / **email-best-practices** | Email templates + delivery. |
| **slack** | Slack browser automation. |
| **electron** | Electron app automation via CDP. |
| **vercel-react-best-practices** | React/Next.js perf patterns. |

### Meta skills

| Skill | Purpose |
|---|---|
| **agent-md-refactor** | Refactor bloated CLAUDE.md/AGENTS.md files. |
| **build-with-agent-team** | Multi-agent tmux builds. |
| **find-skills** | Discover/install new skills. |
| **verify-feature** | Deeply verify a feature works from user perspective (hook-enforced). |
| **writing-plans** | Plan multi-step work before coding. |
| **excalidraw-diagram** | Excalidraw JSON for workflows/architectures. |

---

## 3. Division of Labor — which layer runs what

| Layer | Tool | Why |
|---|---|---|
| Prod API health | GH cron — `api-smoke-contracts.mjs` | Deterministic endpoint checks. Cheap. |
| Post-deploy prod sanity | GH cron — `postdeploy-verify.sh` | Deterministic page loads. |
| PR gates | GH Actions (quality, guardrails, chromatic) | Block merge on red. |
| Preview smoke (per tool) | **Planned**: GH Action on preview deploy → `scripts/test-scenario-run.mjs` (headless Node) | Reuses Supabase smoke suites; no Claude. |
| AI assistant prod guardrails | GH cron — `.github/workflows/ai-assistant-prod-evals.yml`; manual checks: `npm run rag:verify:inbox-evals:prod`, `npm run rag:verify:source-sync-evals:prod`, `npm run rag:verify:task-action-evals:prod` | Runs named eval bundles against `projects.alleatogroup.com`; catches Outlook inbox routing, Teams retrieval, task/action-item phrasing, and source/packet freshness regressions. |
| Weekly drift / violations / deps | Claude scheduled tasks | Needs judgment + Linear triage. |
| Interactive smoke/feature run | `/test-scenario-run <tool> …` | On-demand debugging, visual judgment. |
| Authoring / consolidating cases | `/test-scenario-audit <tool>` | When tool changes. |
| Feature audit / parity | `/feature-audit`, `/parity-audit`, `/procore-*` | One-off comparisons. |

**Rule:** Deterministic pass/fail → GitHub Actions. Needs judgment or applies fixes → Claude routine. One-off debug → manual skill.

---

## 4. Where things live

```
.github/workflows/              GitHub Actions (CI + daily crons)
.claude/hooks/                  Event-triggered Python hooks
.claude/skills/                 Manually invoked skills
.claude/skills/testing/         Testing-specific skills
~/.claude/scheduled-tasks/      Weekly Claude routines (user-level)
scripts/api-smoke-contracts.mjs Production API smoke (used by GH cron)
scripts/postdeploy-verify.sh    Post-deploy sanity (used by GH cron)
docs/testing/scenarios/         Generated scenario markdown (smoke/feature per tool)
docs/testing/results/           Generated run reports
```

---

## 5. Pending / planned

- **`scripts/test-scenario-run.mjs`** — headless Node driver that pulls smoke cases from Supabase and runs them via Playwright. Lets CI run preview-deploy smoke without invoking Claude. Not built yet.
- **`.github/workflows/smoke-on-preview.yml`** — triggers the above on successful Vercel preview deploys.
