# PLANS.md – Global Rules for PlansDoc Creation and Execution

This document defines the universal structure, rules, and execution standards for creating and maintaining **EXEC\_PLAN.md** files across all AI‑assisted development projects. All Agents must follow this specification **exactly**, without deviation.

Treat the reader as a complete beginner to this repository: they have only the current working tree and the single PlansDoc file you provide. There is no memory of prior plans and no external context.

## Purpose of PLANS.md

All AI agents must treat this document as **law**. The purpose of PLANS.md is to:
- Standardize the workflow from requirements → planning → execution → deployment.
- Ensure every project is built using a predictable, testable, auditable process.
- Provide an explicit structure for EXEC\_PLAN.md files.
- Define strict testing protocol and "Definition of Done" the AI must follow.
- Eliminate ambiguity, skipped steps, incomplete implementations, and false positives.

## How to use PlansDocs and PLANS.md

When authoring an executable specification (PlansDoc), follow PLANS.md *\*to the letter\**.

If it is not in your context, refresh your memory by reading the entire PLANS.md file. Be thorough in reading (and re-reading) source material to produce an accurate specification. When creating a spec, start from the skeleton and flesh it out as you do your research.

**When implementing an executable specification (PlansDoc), do not prompt the user for "next steps"; simply proceed to the next milestone.**

Keep all sections up to date, add or split entries in the list at every stopping point to affirmatively state the progress made and next steps. Resolve ambiguities autonomously, and commit frequently.

When discussing an executable specification (PlansDoc), record decisions in a log in the spec for posterity; it should be unambiguously clear why any change to the specification was made.

**PlansDocs are living documents, and it should always be possible to restart from only the PlansDoc and no other work.**

When researching a design with challenging requirements or significant unknowns, use milestones to implement proof of concepts, "toy implementations", etc., that allow validating whether the user's proposal is feasible.

Read the source code of libraries by finding or acquiring them, research deeply, and include prototypes to guide a fuller implementation. Use Context 7 MCP or research the web.

## Requirements

### NON-NEGOTIABLE REQUIREMENTS:

- Every PlansDoc must be fully self-contained. Self-contained means that in its current form it contains all knowledge and instructions needed for a novice to succeed.
- Every PlansDoc is a living document. Contributors are required to revise it as progress is made, as discoveries occur, and as design decisions are finalized. Each revision must remain fully self-contained.
- Every PlansDoc must enable a complete novice to implement the feature end-to-end without prior knowledge of this repo.
- Every PlansDoc must produce a demonstrably working behavior, not merely code changes to "meet a definition".
- Every PlansDoc must define every term of art in plain language or do not use it.

### Purpose and intent come first.

Begin by explaining, in a few sentences, why the work matters from a user's perspective: what someone can do after this change that they could not do before, and how to see it working. Then guide the reader through the exact steps to achieve that outcome, including what to edit, what to run, and what they should observe.

The agent executing your plan can list files, read files, search, run the project, and run tests. It does not know any prior context and cannot infer what you meant from earlier milestones. Repeat any assumption you rely on.

Do not point to external blogs or docs; if knowledge is required, embed it in the plan itself in your own words. If an PlansDoc builds upon a prior PlansDoc and that file is checked in, incorporate it by reference. If it is not, you must include all relevant context from that plan.

### Formatting

Use indentation for clarity rather than code fences inside an PlansDoc to avoid prematurely closing the PlansDoc's code fence. Use two newlines after every heading, use # and ## and so on, and correct syntax for ordered and unordered lists.

Write in plain prose. Prefer sentences over lists. Avoid checklists, tables, and long enumerations unless brevity would obscure meaning.

Checklists are permitted only in the **Master Checklist** section, where they are mandatory. Narrative sections must remain prose-first.

### Guidelines

Self-containment and plain language are paramount. If you introduce a phrase that is not ordinary English ("daemon", "middleware", "RPC gateway", "filter graph"), define it immediately and remind the reader how it manifests in this repository (for example, by naming the files or commands where it appears). Do not say "as defined previously" or "according to the architecture doc." Include the needed explanation here, even if you repeat yourself.

Avoid common failure modes. Do not rely on undefined jargon. Do not describe "the letter of a feature" so narrowly that the resulting code compiles but does nothing meaningful. Do not outsource key decisions to the reader. When ambiguity exists, resolve it in the plan itself and explain why you chose that path. Err on the side of over-explaining user-visible effects and under-specifying incidental implementation details.

Anchor the plan with observable outcomes. State what the user can do after implementation, the commands to run, and the outputs they should see. Acceptance should be phrased as behavior a human can verify ("after starting the server, navigating to http://localhost:8080/health returns HTTP 200 with body OK") rather than internal attributes ("added a HealthCheck struct"). 

If a change is internal, explain how its impact can still be demonstrated (for example, by running tests that fail before and pass after, and by showing a scenario that uses the new behavior).

Specify repository context explicitly.

Name files with full repository-relative paths, name functions and modules precisely

**Describe where new files should be created.**

If touching multiple areas, include a short orientation paragraph that explains how those parts fit together so a novice can navigate confidently. When running commands, show the working directory and exact command line. When outcomes depend on environment, state the assumptions and provide alternatives when reasonable.

Be idempotent and safe. Write the steps so they can be run multiple times without causing damage or drift. If a step can fail halfway, include how to retry or adapt. If a migration or destructive operation is necessary, spell out backups or safe fallbacks. Prefer additive, testable changes that can be validated as you go.

### Validation is not optional

Include instructions to run tests, to start the system if applicable, and to observe it doing something useful. Describe comprehensive testing for any new features or capabilities.

Include expected outputs and error messages so a novice can tell success from failure. Where possible, show how to prove that the change is effective beyond compilation (for example, through a small end-to-end scenario, a CLI invocation, or an HTTP request/response transcript). State the exact test commands appropriate to the project’s toolchain and how to interpret their results.

**Capture evidence.** When your steps produce terminal output, short diffs, or logs, include them inside the single fenced block as indented examples. Keep them concise and focused on what proves success. If you need to include a patch, prefer file-scoped diffs or small excerpts that a reader can recreate by following your instructions rather than pasting large blobs.

**Testing Is Mandatory for ANY NEW FEATURE, CHANGE, OR BUG FIX.** No task may be marked completed unless tests are in place. The agent must write tests, run tests, capture screenshots when UI or flow-related, and update PlansDoc accordingly.

### Required Test Types

Strict testing is required because it ensures reliability, prevents silent failures during autonomous execution, and guarantees that every implemented behavior is observable and verifiable.

**Playwright Tests (Mandatory for UI and Flows).** Mandatory for UI, E2E flows, DOM behavior, RAG behavior, navigation, and form submission. Must include END-TO-END TESTS and SCREENSHOTS showing the feature working.

**Component / Unit Tests.** required for pure logic functions, complex components, reusable utilities

**Visual Regression Tests.** required when the system defines a baseline screenshot or UI stability is important. Use `toHaveScreenshot()`.

**Screenshot Requirements.** Screenshots are required proof of functionality. Screenshots must show the **final working state**, not partial renders. Agents must:
- Capture screenshots for all significant UI behaviors
- Name them clearly (e.g., `new-contract-success.png`)
- Save them in an organized folder (e.g., `tests/screenshots/contracts/`)
- Reference them in Progress Log

### Splitting Tasks
If the agent discovers a task is too large:
- Break it into child tasks **immediately below the main task**.
- Document the split in Progress Log + Decision Log.

## Milestones

Milestones are narrative, not bureaucracy. If you break the work into milestones, introduce each with a brief paragraph that describes the scope, what will exist at the end of the milestone that did not exist before, the commands to run, and the acceptance you expect to observe. Keep it readable as a story: goal, work, result, proof.

Progress and milestones are distinct: milestones tell the story, progress tracks granular work. **Both must exist.**

Never abbreviate a milestone merely for the sake of brevity, do not leave out details that could be crucial to a future implementation.

Each milestone must be independently verifiable and incrementally implement the overall goal of the execution plan.

## Living plans and design decisions

PlansDocs are living documents. As you make key design decisions, update the plan to record both the decision and the thinking behind it. Record all decisions in the `Decision Log` section.

PlansDocs must contain and maintain a `Progress` section, a `Surprises & Discoveries` section, a `Decision Log`, and an `Outcomes & Retrospective` section. These are not optional.

When you discover optimizer behavior, performance tradeoffs, unexpected bugs, or inverse/unapply semantics that shaped your approach, capture those observations in the `Surprises & Discoveries` section with short evidence snippets (test output is ideal).

If you change course mid-implementation, document why in the `Decision Log` and reflect the implications in `Progress`. Plans are guides for the next contributor as much as checklists for you.

At completion of a major task or the full plan, write an `Outcomes & Retrospective` entry summarizing what was achieved, what remains, and lessons learned.

## Prototyping milestones and parallel implementations

It is acceptable—-and often encouraged—-to include explicit prototyping milestones when they de-risk a larger change. Examples: adding a low-level operator to a dependency to validate feasibility, or exploring two composition orders while measuring optimizer effects. Keep prototypes additive and testable. Clearly label the scope as “prototyping”; describe how to run and observe results; and state the criteria for promoting or discarding the prototype.

Prefer additive code changes followed by subtractions that keep tests passing. Parallel implementations (e.g., keeping an adapter alongside an older path during migration) are fine when they reduce risk or enable tests to continue passing during a large migration. Describe how to validate both paths and how to retire one safely with tests. When working with multiple new libraries or feature areas, consider creating spikes that evaluate the feasibility of these features *independently* of one another, proving that the external library performs as expected and implements the features we need in isolation.

## PLANS_DOC.md Structure

Every PLANS.md file must follow **this exact structure in this exact order**:
1. **Purpose / Big Picture**
   High-level purpose, goals, context.
2. **Master Checklist** (Phased, Ordered, Executable)
3. **Progress Log**
   AI or developer must update this continuously.
4. **Surprises & Discoveries**
   Anything unexpected found during implementation.
5. **Decision Log**
   Architectural decisions, rationale, timestamps.
6. **Testing Strategy & Definition of Done**
   Project-specific rules derived from the global protocol in this PLANS.md file.
7. **Details (Context, Phase Descriptions, Specs)**
   All deep explanations and reference material. Not allowed in the Master Checklist.

## Skeleton of a Good PlansDoc

```markdown

# Title (Short + action-oriented)
This PlansDoc is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. If PLANS.md file is checked into the repo, reference the path to that file here from the repository root and note that this document must be maintained in accordance with PLANS.md.

## Purpose / Big Picture
Explain in a few sentences what someone gains after this change and how they can see it working. State the user-visible behavior you will enable.

## Master Checklist
The Master Checklist is the **source of truth** for execution order.

**Checklist Requirements**
- Must be divided by **Phase** and **Subsections**.
- Tasks must be **directly executable**.
- Tasks must be **testable**.
- Tasks must be **unambiguous**.
- Tasks must be **ordered** as they should be executed.

**Updating the Checklist**
When a task is completed:
- Change `[ ]` → `[x]`.
- Add links to: source code files, Tests, Relevant routes or UI pages
- Add notes if anything unexpected occurred.

**Example:**
- [x] [Example completed step.](./PLANS_DOC_part_2.md) (2025-10-01 13:00Z)
- [ ] Example incomplete step.
- [ ] Example partially completed step (completed: X; remaining: Y).

## Progress
Every stopping point must be documented here, even if it requires splitting a partially completed task into two (“done” vs. “remaining”). This section must always reflect the actual current state of the work. Use timestamps to measure rates of progress.

## Surprises & Discoveries
Document unexpected behaviors, bugs, optimizations, or insights discovered during implementation. Include date and time next to observation title. Provide concise evidence.

## Decision Log
Record every decision made while working on the plan in the format:
- Decision: …
  Rationale: …
  Date/Author: …

## Outcomes & Retrospective
Summarize outcomes, gaps, and lessons learned at major milestones or at completion. Compare the result against the original purpose.

## Context and Orientation
Describe the current state relevant to this task as if the reader knows nothing. Name the key files and modules by full path. Define any non-obvious term you will use. Do not refer to prior plans.

## Plan of Work
Describe, in prose, the sequence of edits and additions. For each edit, name the file and location (function, module) and what to insert or change. Keep it concrete and minimal.

## Concrete Steps
State the exact commands to run and where to run them (working directory). When a command generates output, show a short expected transcript so the reader can compare. This section must be updated as work proceeds.

## Validation and Acceptance
Describe how to start or exercise the system and what to observe. Phrase acceptance as behavior, with specific inputs and outputs. If tests are involved, say "run <project’s test command> and expect <N> passed; the new test <name> fails before the change and passes after>".

## Idempotence and Recovery
If steps can be repeated safely, say so. If a step is risky, provide a safe retry or rollback path. Keep the environment clean after completion.

## Artifacts and Notes
Include the most important transcripts, diffs, or snippets as indented examples. Keep them concise and focused on what proves success.

## Interfaces and Dependencies
Be prescriptive. Name the libraries, modules, and services to use and why. Specify the types, traits/interfaces, and function signatures that must exist at the end of the milestone. Prefer stable names and paths such as `crate::module::function` or `package.submodule.Interface`. E.g.:

In crates/foo/planner.rs, define:

    pub trait Planner {
        fn plan(&self, observed: &Observed) -> Vec<Action>;
    }
```

## PLANS_DOC Folder Structure
Every project MUST conform to the following folder structure (adapt as needed for project type, but do not remove categories). This enforced structure provides predictable discovery paths for agents, reduces ambiguity during autonomous execution, and simplifies onboarding for maintainers by ensuring all components live in consistent, well-defined locations.

- Agents MUST create files in their correct directories.
- All components MUST live under `frontend/src/components`.
- All tests MUST be in `frontend/tests` or `backend/tests`.
- All screenshots MUST be in `tests/screenshots`.
- Domain‑specific UI MUST be in `components/domain/<module>`.
- API logic MUST be in `backend/src/api`.

```
project-root/
  PLANS_DOC.md
  REQUIREMENTS.md
  PLANS.md

  frontend/
    src/
      app/
      components/
        layout/
        forms/
        tables/
        domain/
      lib/
      hooks/
    tests/
      e2e/
      components/
      visual-regression/
      screenshots/
    public/

  backend/
    src/
      api/
      services/
      workers/
      database/
    tests/
      unit/
      integration/

  scripts/
    utilities/
    ingestion/
    dev-tools/

  .github/
    workflows/
```

# Glossary
A shared vocabulary ensuring all agents interpret terms consistently.

- **PlansDoc** – The master execution blueprint generated from REQUIREMENTS.md, dictating tasks, order, testing, and architecture.
- **Master Checklist** – The authoritative, ordered list of tasks that MUST be followed step‑by‑step without skipping.
- **Progress Log** – Mandatory chronological log updated after every work session documenting progress, tests, screenshots, and decisions.
- **Surprises & Discoveries** – Section documenting unexpected findings, discrepancies, or missing requirements uncovered during development.
- **Decision Log** – Section recording architectural, design, or strategic decisions with rationale and project impact.
- **Definition of Done** – The strict criteria that determine whether a task can be marked complete. Includes tests, screenshots, links, and documentation.
- **Requirements Document (REQUIREMENTS.md)** – The single input used to generate PlansDoc; a distilled and structured interpretation of the project’s needs.
- **Planning Agent** – AI agent that reads REQUIREMENTS.md + PLANS.md and generates EXEC\_PLAN.md following required structure.
- **Development Agent** – AI agent that executes the checklist sequentially, writes tests, updates logs, and ensures Definition of Done.
- **CI/CD** – Continuous Integration and Continuous Deployment pipeline; verifies builds and tests before merging and deploying.
- **Mandatory Folder Structure** – The enforced project directory layout required for consistency across projects.


# Conclusion
If you follow the guidance above, a single, stateless agent -- or a human novice -- can read your PlansDoc from top to bottom and produce a working, observable result.

**That is the bar: SELF-CONTAINED, SELF-SUFFICIENT, NOVICE-GUIDING, OUTCOME-FOCUSED.**

When you revise a plan, you must ensure your changes are comprehensively reflected across all sections, including the living document sections, and you must write a note at the bottom of the plan describing the change and the reason why. PlansDocs must describe not just the what but the why for almost everything.

**End of PLANS.md**