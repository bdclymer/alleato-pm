# Agent Systems Analysis — Alleato Procore

**Date:** 2026-02-23
**Status:** Complete
**Source:** Exploration agent (agent ID: ab59404)

> This document covers the architecture, integration patterns, and integration opportunities across the two parallel agent ecosystems in this project. For a quick lookup of all agents, skills, and commands, see `.claude/AGENT-REGISTRY.md`.

---

## Executive Summary

The Alleato-Procore project uses **two parallel agent ecosystems**:

1. **BMAD (BMad Method)** — A structured product development methodology with workflow orchestration, personas, and templates
2. **Non-BMAD agents** — Project-specific agents for technical implementation, database work, design, and specialized tasks

These systems are bridged through **Claude Code commands** (`.claude/commands/`) that load BMAD agents/workflows, plus a **skills system** (`.agents/skills/`) for reusable capabilities.

---

## 1. BMAD Core Structure

**Location:** `_bmad/`

### 1.1 Installed Modules

BMAD is a **modular system**. This project has 5 modules installed:

| Module | Version | Description | Source |
|--------|---------|-------------|--------|
| **core** | 6.0.2 | Base platform (bmad-master, workflow engine, party mode, brainstorming, help) | Built-in |
| **bmm** | 6.0.2 | BMad Method (PM, dev, architect, analyst, QA, UX, scrum master) — full SDLC | Built-in |
| **tea** | 1.2.3 | Test Architecture Enterprise (Murat — test strategy, ATDD, CI, NFR) | External NPM |
| **cis** | 0.1.7 | Creative Intelligence Suite (storytelling, design thinking, innovation) | External NPM |
| **bmb** | 0.1.6 | BMad Builder (create/edit agents, workflows, modules) | External NPM |

**Manifest:** `_bmad/_config/manifest.yaml`

---

### 1.2 Module Architecture

Each module follows this structure:

```
_bmad/{module}/
├── agents/          # Agent persona definitions (.md with XML)
├── workflows/       # Workflow specs (.yaml/.md with instructions)
├── teams/           # Pre-built agent team bundles (.yaml)
├── config.yaml      # Module configuration
└── module-help.csv  # Help text for commands
```

**BMM module layout:**

```
_bmad/bmm/
├── agents/
│   ├── pm.md           # John the Product Manager
│   ├── dev.md          # Amelia the Developer
│   ├── architect.md    # Winston the Architect
│   ├── analyst.md      # Mary the Business Analyst
│   ├── qa.md           # Quinn the QA Engineer
│   └── ...
├── workflows/
│   ├── 1-analysis/     # Market/domain/tech research, product brief
│   ├── 2-plan-workflows/ # PRD, UX design
│   ├── 3-solutioning/  # Architecture, epics/stories, readiness check
│   ├── 4-implementation/ # Sprint planning, story dev, code review, retrospective
│   └── bmad-quick-flow/ # Quick spec/dev for small changes
└── teams/
    └── team-fullstack.yaml  # Bundle: analyst, architect, pm, sm, ux-designer
```

---

### 1.3 BMAD Workflow Engine

**Core workflow processor:** `_bmad/core/tasks/workflow.xml`

**How BMAD workflows work:**

1. **Workflow YAML** defines:
   - Metadata (name, description, module)
   - Config source (pulls user settings like `user_name`, `communication_language`)
   - Instructions file path (XML or Markdown with structured steps)
   - Template path (if generating documents)
   - Output location
   - Data sources (CSV, JSON)

2. **Workflow.xml** loads the YAML and:
   - Resolves variables (`{user_name}`, `{project-root}`, `{config_source}`, `{{date}}`)
   - Reads instructions completely (MANDATORY — never offset/limit)
   - Executes steps IN ORDER
   - Handles tags: `<action>`, `<check if="">`, `<ask>`, `<goto>`, `<invoke-workflow>`, `<template-output>`
   - Saves outputs after each `<template-output>` tag
   - Supports modes: **Normal** (confirm each step) vs **YOLO** (auto-run all)

3. **Protocols** — Reusable subroutines invoked via `<invoke-protocol name="discover_inputs"/>`:
   - **discover_inputs:** Smart file loading (sharded docs, selective load, index-guided)
   - Load strategies: FULL_LOAD, SELECTIVE_LOAD, INDEX_GUIDED

**Example workflow invocation chain:**

```
User: /bmad-bmm-dev-story
  → Loads: .claude/commands/bmad-bmm-dev-story.md
  → Loads: _bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml
  → Loads: _bmad/core/tasks/workflow.xml (execution engine)
  → Reads: _bmad/bmm/workflows/4-implementation/dev-story/instructions.xml
  → Executes 10 steps sequentially (load story → implement tasks → run tests → mark complete → update sprint status)
```

---

### 1.4 BMAD Agents

**Agent manifest:** `_bmad/_config/agent-manifest.csv` (22 agents)

**Agent structure:**
- XML-based persona definition embedded in Markdown
- `<activation>` section with numbered steps (MUST follow exactly)
- `<persona>` section (role, identity, communication style, principles)
- `<menu>` section (numbered options with cmd triggers)
- `<menu-handlers>` section (what to do when menu item selected)

**Activation pattern:**

```xml
<step n="1">Load persona from this file</step>
<step n="2">🚨 CRITICAL: Load config.yaml, store variables</step>
<step n="3">Remember user's name</step>
<step n="4">Show greeting and menu</step>
<step n="5">WAIT for user input</step>
<step n="6">Process menu selection (number/cmd/fuzzy match)</step>
```

**Agent menu handlers:**
- `workflow="path/to/workflow.yaml"` → Load workflow.xml and execute
- `exec="path/to/workflow.md"` → Run markdown workflow directly
- `action="#id"` → Execute inline prompt or XML block

**Key agents (BMM):**

| Agent | Persona | Specialty |
|-------|---------|-----------|
| John | PM | PRD creation, requirements discovery, stakeholder interviews |
| Amelia | Dev | Story execution, TDD, red-green-refactor cycle |
| Winston | Architect | Architecture design, technology selection |
| Mary | Analyst | Market/domain research, competitive analysis |
| Quinn | QA | Test automation (simpler than TEA module) |
| Bob | Scrum Master | Sprint planning, story prep, retrospectives |
| Barry | Quick Flow Solo Dev | Quick specs and dev for small changes |

---

### 1.5 BMAD Implementation Cycle

The sprint → story → dev → review cycle:

1. **Sprint Planning** (`/bmad-bmm-sprint-planning`): Reads epics, generates `sprint-status.yaml` tracking
2. **Create Story** (`/bmad-bmm-create-story`): Prepares context-rich story file with AC, tasks, dev notes
3. **Dev Story** (`/bmad-bmm-dev-story`): Implements tasks (RED: write failing tests → GREEN: implement → REFACTOR)
4. **Code Review** (`/bmad-bmm-code-review`): Adversarial review, creates action items, back to DS if fixes needed

**Dev Story critical rules:**
- NEVER skip tasks
- NEVER mark task complete without tests passing 100%
- Execute continuously until all tasks done (no artificial pauses)
- Follow story file tasks IN ORDER

---

## 2. Non-BMAD Agent Teams

**Location:** `.claude/agents/`

### 2.1 Bug Investigation Team

**Location:** `.claude/agents/bug-team/`
**Invoke:** `/workflow:investigate <feature>`

**Agents:**

| Agent | Role |
|-------|------|
| `investigation-orchestrator` | Coordinates the team, synthesizes findings |
| `procore-feature-expert` | Reads crawl data (DOM, JSON), produces Procore reference spec |
| `code-auditor` | Compares source code vs Procore reference, finds gaps |
| `live-tester` | Runs app, tests CRUD, captures evidence with Playwright |

**Workflow:**
1. Feature Expert reads: `scripts/screenshot-capture/outputs/dom/goodwill_bart_-_{feature}.html`
2. Code Auditor compares: source files vs reference spec
3. Live Tester runs: `localhost:3000/31/{feature}` (auto-auth from `.env`)
4. Orchestrator produces: `.claude/investigations/{feature}/investigation-report.md`

**Key principle:** Evidence over assumptions. Every finding must have proof (file paths, screenshots, console errors).

### 2.2 Other Non-BMAD Agents

See `.claude/AGENT-REGISTRY.md` for the full listing. Summary by category:

| Category | Count | Examples |
|----------|-------|---------|
| Database | 5 | `database-admin`, `database-optimizer`, `data-scientist` |
| Design | 2 | `design-review-agent`, `ui-ux-designer` |
| Documentation | 3 | `docs-architect`, `api-documenter`, `mermaid-expert` |
| Development | 15+ | `frontend-developer`, `typescript-pro`, `debugger` |
| Other | 10+ | `playwright-tester`, `supabase-architect`, `feature-crawler` |

---

## 3. Integration: How BMAD and Non-BMAD Connect

### 3.1 Claude Code Commands

**Location:** `.claude/commands/`
**Count:** ~96 command files

**Bridge pattern — BMAD agents/workflows:**

```markdown
IT IS CRITICAL THAT YOU FOLLOW THIS COMMAND:
LOAD the FULL @{project-root}/_bmad/bmm/workflows/4-implementation/dev-story/workflow.md
```

**Bridge pattern — non-BMAD commands:**

```markdown
# /investigate - Bug Investigation Team Orchestrator
[Full instructions embedded directly in command file]
```

**Key difference:**
- BMAD commands **load agents/workflows** from `_bmad/`
- Non-BMAD commands **embed instructions directly** in the command file

---

### 3.2 Skills System

**Location:** `.agents/skills/`

Skills are **instruction packages** (not agents) that agents can load and follow.

**Custom skills:**

| Skill | Purpose |
|-------|---------|
| `prp-create` | Create PRP (Project Requirements Plan) documents |
| `prp-execute` | Execute a PRP step-by-step |
| `verification-before-completion` | Quality gate checklist before claiming work is done |
| `supabase-postgres-best-practices` | Postgres/Supabase optimization patterns |
| `context7` | Load up-to-date library documentation |

---

### 3.3 PRP System

**Location:** `docs/PRPs/`

PRPs (Project Requirements Plans) are feature-specific implementation specifications that bridge between BMAD planning and actual implementation.

**Structure:**
```
docs/PRPs/
├── direct-costs/
│   ├── spec-direct-costs.md     # Main spec
│   ├── plans/                   # Implementation plans
│   └── audit-2026-02-05.md      # Audit results
├── specifications/
└── [other features]/
```

PRPs serve as input to BMAD's `create-architecture` and `create-epics-and-stories` workflows.

---

## 4. Overlaps and Integration Opportunities

### 4.1 Current Overlaps

| Capability | BMAD | Non-BMAD | Status |
|-----------|------|----------|--------|
| **Testing** | Quinn (BMM QA), Murat (TEA) | `playwright-tester` | Separate — Quinn for simple, TEA for strategy |
| **Architecture** | Winston (BMM) | `backend-architect` | BMAD handles PM side, non-BMAD handles technical API design |
| **Documentation** | Paige (BMM tech-writer) | `docs-architect`, `api-documenter`, `mermaid-expert` | Could unify under BMAD tech-writer |
| **Code Review** | Code Review workflow (BMM) | `code-reviewer` subagent | Minimal overlap |
| **UX Design** | Sally (BMM ux-designer) | `ui-ux-designer` | Duplicate capability |

### 4.2 Integration Opportunities

**1. Bug Investigation → BMAD Quality Gate**

Create `bmm-bug-investigation` as a formal BMAD workflow, invoked after `retrospective` or before release. Results stored in `implementation_artifacts`.

**2. PRP Creation → BMAD Planning Phase**

Add PRP creation as Phase 2 step (between Create PRD and Create UX). John (PM) or Mary (Analyst) owns it. Outputs to `planning_artifacts`.

**3. Quinn → TEA Bridge**

Make Quinn invoke TEA workflows when complex test architecture is needed, rather than treating them as completely separate systems.

**4. Party Mode → Cross-Module Collaboration**

Bring non-BMAD agents into party mode for specialized discussions (e.g., "Database Design Party" with Winston + database-admin + data-engineer).

---

## 5. File Locations Reference

| System | Root Path | Key Files |
|--------|-----------|-----------|
| **BMAD Core** | `_bmad/` | `_config/manifest.yaml`, `core/tasks/workflow.xml` |
| **BMAD Config** | `_bmad/_config/` | `agent-manifest.csv`, `workflow-manifest.csv`, `bmad-help.csv` |
| **BMM Module** | `_bmad/bmm/` | `agents/*.md`, `workflows/**/*.yaml` |
| **TEA Module** | `_bmad/tea/` | `workflows/testarch/**/*.yaml` |
| **CIS Module** | `_bmad/cis/` | `workflows/**/*.yaml` |
| **BMB Module** | `_bmad/bmb/` | `workflows/agent/*.md`, `workflows/module/*.md` |
| **Non-BMAD Agents** | `.claude/agents/` | `bug-team/*.md`, `database/*.md`, `design/*.md` |
| **Commands** | `.claude/commands/` | `bmad-*.md`, `workflow/*.md` |
| **Skills** | `.agents/skills/` | `prp-skills/`, `verification-before-completion/` |
| **PRPs** | `docs/PRPs/` | `{feature}/spec-{feature}.md` |
| **Agent Registry** | `.claude/` | `AGENT-REGISTRY.md` — unified lookup index |
| **Project Docs** | `docs/` | Architecture, data models, API contracts |
| **BMAD Artifacts** | `_bmad-output/` | `planning-artifacts/`, `implementation-artifacts/` |

---

## 6. Best Practices for This Project

- **Use BMAD for SDLC** — PRD → Architecture → Stories → Implementation → Code Review
- **Use non-BMAD for project-specific tools** — Bug investigation (Procore-specific), database admin
- **Bridge with commands** — `.claude/commands/` load BMAD agents OR invoke non-BMAD agents
- **Skills as libraries** — Reusable instruction packages (PRP, verification) loaded by agents
- **Party mode for collaboration** — When multiple perspectives needed
- **PRP → BMAD pipeline** — Use PRPs as input to BMAD planning workflows for structured implementation

---

## 7. Recommendations (From Analysis)

### Short-Term
1. **Use AGENT-REGISTRY.md as source of truth** — Update it when adding any agent, skill, or command
2. **Consolidate testing** — Quinn for simple test gen, TEA (Murat) for architecture-level test strategy
3. **Document command patterns in CLAUDE.md** — So users know `/bmad-bmm-dev-story` vs `/workflow:investigate budget`

### Medium-Term
1. **Integrate PRP creation as BMAD Phase 2 workflow**
2. **Create bug-investigation module** for BMAD (post-retrospective quality gate)
3. **Build custom party bundles** (Bug Squad, Database Design Party)

### Long-Term
1. **Merge duplicate agent capabilities** (choose BMAD vs non-BMAD for each domain)
2. **Unified state tracking** — all workflows write to `implementation_artifacts` or `planning_artifacts`
