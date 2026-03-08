# Sprint Runner: Parallel Sprint Execution for BMAD

**Created:** 2026-02-23
**Status:** Design complete, ready for implementation
**Context:** Continuation from BMAD-PRP integration session

---

## What We Want

Automated overnight sprint execution — spawn 5 dev-story agents in parallel, each working on a different story, then hand off to code review and QA. Like OpenClaw's `sessions_spawn` but using Claude Code's Task tool.

## Prerequisites Already Completed

The BMAD-PRP integration was implemented in this same session. These changes are a prerequisite for safe parallel execution (PRPs front-load error prevention so parallel agents don't repeat the same mistakes independently):

| File | Change |
|------|--------|
| `_bmad/bmm/workflows/3-solutioning/create-architecture/steps/step-08-complete.md` | Exports `planning-context.yaml` (new Step 3) |
| `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/steps/step-04-final-validation.md` | PRP recommendation after completion |
| `_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml` | Conditional TASKS.md loading in Step 2 |
| `.claude/templates/prp_template.md` | Removed test authoring, BMAD owns testing |
| `.claude/templates/tasks_template.md` | Phase 5 renamed to "Build Verification" |
| `.agents/skills/prp-skills/prp-create/SKILL.md` | Updated phase naming |
| `.agents/skills/prp-skills/prp-create/references/prp_template.md` | Same template changes |
| `docs/bmad-prp-integration.md` | Full integration contract documentation |

## The Core Problem: Race Conditions

If you naively spawn 5 dev-story agents in parallel, they all try to:

1. **Read sprint-status.yaml** to find the next story — all 5 pick the same story
2. **Write sprint-status.yaml** to mark it "in-progress" — last writer wins, 4 updates lost
3. **Modify shared files** — corrupted outputs

## The Architecture That Solves This

```
Sprint Runner (orchestrator) — a new command/workflow
  │
  ├── Phase 1: Read sprint-status.yaml ONCE
  │   └── Identify all "ready-for-dev" stories: [1-1, 1-2, 1-3, 1-4, 1-5]
  │   └── Mark all as "in-progress" in one atomic write
  │
  ├── Phase 2: Spawn dev-story agents in PARALLEL (Task tool, run_in_background)
  │   ├── Task(story="1-1-user-auth.md", no_sprint_sync=true)
  │   ├── Task(story="1-2-account-mgmt.md", no_sprint_sync=true)
  │   ├── Task(story="1-3-data-import.md", no_sprint_sync=true)
  │   ├── Task(story="1-4-dashboard.md", no_sprint_sync=true)
  │   └── Task(story="1-5-notifications.md", no_sprint_sync=true)
  │
  │   Each agent: updates ONLY its own story file, no sprint-status writes
  │
  ├── Phase 3: Collect results, update sprint-status ONCE
  │   └── Orchestrator reads each story file's Status section
  │   └── Writes all status changes atomically to sprint-status.yaml
  │
  ├── Phase 4: Spawn code-review agents in PARALLEL
  │   ├── Task(review story 1-1, model=different_llm)
  │   ├── Task(review story 1-2, model=different_llm)
  │   └── ... (reviewers only READ implementation, WRITE to story file)
  │
  ├── Phase 5: Collect review results, update sprint-status
  │
  └── Phase 6: Summary report
```

## What Needs to Be Built

### 1. Sprint Runner Command

A new `/bmad-sprint-run` command that acts as the orchestrator. It:
- Reads sprint-status.yaml to find all "ready-for-dev" stories
- Assigns each to a Task tool subagent with explicit story path
- Manages the parallel execution phases
- Collects results and updates shared state atomically

### 2. `--no-sprint-sync` Flag on dev-story

Modify `instructions.xml` so that when a `no_sprint_sync` variable is set:
- Step 4 (mark in-progress) is SKIPPED — orchestrator already did this
- Step 9 (mark review) only updates the story file, NOT sprint-status.yaml
- All sprint-status.yaml writes are deferred to the orchestrator

### 3. Explicit Story Assignment

Currently Step 1 of dev-story auto-discovers the next "ready-for-dev" story by reading sprint-status.yaml. For parallel mode, the orchestrator passes `{{story_path}}` directly, bypassing auto-discovery entirely. This path already exists in the workflow (the `<check if="{{story_path}} is provided">` block at the top of Step 1).

### 4. Result Collection

After all agents complete, the orchestrator:
- Reads each story file to check its Status section
- Determines success/failure per story
- Writes all status changes to sprint-status.yaml in one pass

### 5. Code Review Phase

After dev phase completes, spawn code-review agents for each completed story. Key insight: use a **different model** for review (e.g., `model: "sonnet"` if dev used opus, or vice versa) so the reviewer gives genuinely independent feedback.

## Key Constraints Discovered

- **Max parallelism:** Probably 3-5 agents (Claude Code Task tool + context costs)
- **Sprint-status.yaml is the bottleneck:** Only the orchestrator writes to it, never the agents
- **Story files are safe for parallel writes:** Each agent only touches its own story file
- **Code review needs isolation:** Reviewer should NOT see developer's reasoning — Task tool provides this naturally since subagents get fresh context
- **PRP is a prerequisite:** Without PRPs front-loading error prevention, parallel agents would independently hit the same bugs (e.g., FK type mismatches). PRPs ensure each agent has the pitfall prevention baked into its context.

## Quality Risk and Mitigation

The biggest risk: BMAD's sequential design exists so each story incorporates learnings from the previous one. In parallel mode, story 1-2 can't benefit from what story 1-1 discovered.

**Mitigations:**
- PRPs front-load error prevention (historical patterns, FK types, known pitfalls)
- Code review catches issues that implementation missed
- Retrospective after the sprint captures learnings for next sprint
- Stories within the same epic should still be sequential if they have dependencies (orchestrator checks story dependency chains before parallelizing)

## How sessions_spawn Differs (For Context)

OpenClaw's `sessions_spawn` creates a **fully isolated LLM session** — fresh context, separate instance, communicates only through files on disk. Claude Code's Task tool is similar but not identical:

| Feature | sessions_spawn (OpenClaw) | Task tool (Claude Code) |
|---------|--------------------------|------------------------|
| Fresh context | Yes — completely clean | Yes — subagent gets own context |
| Can see parent conversation | No | Partial — has access to parent context |
| Parallel execution | Yes | Yes — with `run_in_background: true` |
| Different LLM per agent | Yes | Yes — `model: "sonnet"` etc. |
| Crash recovery / respawn | Yes — orchestrator respawns | No — if task fails, it's done |
| File system access | Yes — shared disk | Yes — same filesystem |

The BMAD_Openclaw repo (github.com/ErwanLorteau/BMAD_Openclaw) was reviewed and determined to be unnecessary — it's a simplified, flattened version of BMAD v6 designed for OpenClaw's runtime. Our BMAD v6 installation is more capable. The only valuable concept was the parallel execution model, which we're adapting here.

## Files That Will Need Changes

| File | Change |
|------|--------|
| `.claude/commands/bmad-sprint-run.md` | **NEW** — Sprint Runner command |
| `_bmad/bmm/workflows/4-implementation/sprint-run/` | **NEW** — Sprint Runner workflow (orchestrator logic) |
| `_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml` | Add `no_sprint_sync` conditional to skip sprint-status writes |
| `_bmad/bmm/workflows/4-implementation/code-review/instructions.xml` | Same `no_sprint_sync` treatment |

## Party Mode Discussion Summary

The design was discussed in a BMAD Party Mode session with these agents:

- **Winston (Architect):** Identified the race condition problem and proposed the orchestrator-owns-state pattern
- **John (PM):** Pushed for light integration — 3 touchpoints, no module coupling
- **Wendy (Workflow Builder):** Mapped the exact states and transitions
- **Amelia (Dev):** Wants PRP TASKS.md + story AC as dual inputs in dev-story
- **Bob (Scrum Master):** PRP path should be available, not required — quick fixes skip it
- **Mary (Analyst):** PRP-worthy = database changes or 5+ stories
- **Murat (TEA):** Testing ownership stays with BMAD QA, not PRP

Testing ownership was explicitly assigned: **BMAD owns all test authoring (Quinn/Murat). PRP provides build verification only.** This was implemented across all PRP templates.

## Next Steps

1. Design the Sprint Runner workflow (orchestrator phases, error handling, retry logic)
2. Add `no_sprint_sync` flag to dev-story and code-review instructions.xml
3. Build the `/bmad-sprint-run` command
4. Test with 2 stories in parallel first, then scale to 5
5. Document the Sprint Runner in `docs/bmad-prp-integration.md` or a new file
