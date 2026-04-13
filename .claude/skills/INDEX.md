# Claude Skills Index

All skills in `.claude/skills/`. Invoked via `/skill-name` in Claude Code.

---

## UI & Pages

| Skill | Invoke | Description |
|-------|--------|-------------|
| [alleato-table-page](alleato-table-page/SKILL.md) | `/alleato-table-page` | Build or modify any list/table page using `UnifiedTablePage` + `useUnifiedTableState` |
| [building-components](building-components/SKILL.md) | `/building-components` | Build modern, accessible, composable UI components with design tokens, registry, and docs |
| [create-page](design/create-page/SKILL.md) | `/create-page` | Scaffold any new page with full design system enforcement |
| [design-md](design/design-md.md/SKILL.md) | `/design-md` | Analyze Stitch projects and synthesize a semantic design system into `DESIGN.md` files |
| [excalidraw-diagram](excalidraw-diagram-skill-main/SKILL.md) | `/excalidraw-diagram` | Create Excalidraw diagram JSON files for workflows, architectures, and concepts |

---

## Database & Forms

| Skill | Invoke | Description |
|-------|--------|-------------|
| [fk-audit](fk-audit/SKILL.md) | `/fk-audit` | Audit form dropdowns against database FK targets to catch ID mismatches before they reach prod |

---

## Procore & Feature Parity

| Skill | Invoke | Description |
|-------|--------|-------------|
| [procore-audit](procore-audit/SKILL.md) | `/procore-audit` | Audit a Procore tool against the Alleato PM implementation for feature parity |
| [procore-docs-rag](procore-docs-rag/SKILL.md) | `/procore-docs-rag` | Query Procore support article embeddings in Supabase before planning or implementing any feature |
| [procore-test-matrix](procore-test-matrix/SKILL.md) | `/procore-test-matrix` | Generate a comprehensive testing checklist for any Procore tool from indexed documentation |
| [procore-verify](procore-verify/SKILL.md) | `/procore-verify` | Full verification pipeline — crawl live Procore, generate specs, cross-compare with implementation |

---

## Testing & Verification

| Skill | Invoke | Description |
|-------|--------|-------------|
| [smoke-test](smoke-test/SKILL.md) | `/smoke-test` | Fast smoke test — hits every API endpoint, loads every page, runs HIGH-priority test matrix items |
| [verify-feature](verify-feature/SKILL.md) | `/verify-feature` | Deep user-perspective verification of any feature after implementation; produces annotated screenshots and repro videos |
| [e2e-test](testing/e2e-test/SKILL.md) | `/e2e-test` | Full end-to-end test suite — parallel sub-agents research codebase then test every user journey |
| [feature-audit](testing/feature-audit/SKILL.md) | `/feature-audit` | Comprehensive audit combining functional testing, Procore compliance, and usability recommendations |
| [agent-browser](testing/agent-browser/SKILL.md) | `/agent-browser` | Browser automation CLI — navigate, fill forms, click, screenshot, scrape, or test any web UI |
| [test-scenario-writer](testing/test-scenario-writer/skill.md) | `/test-scenario-writer` | Write exhaustive plain-English test scenarios for every feature, seeded into Supabase |
| [test-scenario-writer-broad](testing/test-scenario-writer-broad/skill.md) | `/test-scenario-writer-broad` | Write concise workflow-coverage test scenarios seeded into Supabase |

---

## Agent Workflows

| Skill | Invoke | Description |
|-------|--------|-------------|
| [build-with-agent-team](build-with-agent-team/SKILL.md) | `/build-with-agent-team` | Build a project using Claude Code Agent Teams with tmux split panes; takes a plan doc and team size |

---

## Workspace / Evals

| Path | Description |
|------|-------------|
| [procore-audit-workspace/](procore-audit-workspace/) | Eval runs comparing procore-audit skill output with and without the skill across budget, submittals, and transmittals tools |
