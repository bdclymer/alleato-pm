# BMAD-PRP Integration Contract

**Created:** 2026-02-23
**Status:** Active

## Overview

BMAD and PRP are **separate systems** with a **light integration** through three touchpoints. They solve different problems and evolve independently.

| System | Purpose | Owns |
|--------|---------|------|
| **BMAD** | Product planning, architecture, sprint management, testing | PRD, UX, Architecture, Epics/Stories, Code Review, QA (Quinn/Murat) |
| **PRP** | Implementation specifications for AI-executable one-pass success | Codebase patterns, error prevention, Procore crawl integration, implementation task ordering |

## Separation of Concerns

### BMAD Owns

- **Product vision** (PRD, market research, user journeys)
- **UX design** (interaction patterns, design system decisions)
- **Architecture decisions** (technology choices, patterns, constraints)
- **Sprint management** (epics, stories, sprint planning, retrospectives)
- **Test authoring** (Quinn for basic coverage, Murat/TEA for advanced test architecture)
- **Code review** (adversarial review workflow)

### PRP Owns

- **Codebase-specific implementation guidance** (file paths, TypeScript patterns, import conventions)
- **Mandatory error prevention** (Supabase types validation, incident log review, FK type checks)
- **Procore crawl data integration** (screenshots, DOM snapshots, behavior specs, schema)
- **Implementation task ordering** (dependency-ordered tasks with FOLLOW/NAMING/PLACEMENT guidance)
- **Build verification** (tsc, lint, existing test regression checks, production build)

### PRP Does NOT Own

- Test authoring (unit, integration, E2E) — this is BMAD's responsibility
- Test strategy or test architecture — this is Murat/TEA's responsibility
- Product requirements — this is BMAD PRD's responsibility
- Architecture decisions — this is BMAD Architecture's responsibility

## Three Touchpoints

### Touchpoint 1: planning-context.yaml

**Where:** End of `create-architecture` workflow (step-08-complete.md)

**What:** After the architecture document is finalized, a structured `planning-context.yaml` is exported alongside it containing machine-readable architecture decisions (database choice, auth approach, state management, entities with FK types, constraints, patterns).

**Consumed by:** PRP create skill — reads `planning-context.yaml` from `{output_folder}/` to avoid re-researching architecture decisions that were already made.

**File:** `_bmad/bmm/workflows/3-solutioning/create-architecture/steps/step-08-complete.md`

### Touchpoint 2: PRP Recommendation

**Where:** End of `create-epics-and-stories` workflow (step-04-final-validation.md)

**What:** After epics are finalized, a recommendation is shown suggesting `/prp-create <feature>` for complex epics (those with database changes, 5+ stories, or Procore-mirroring requirements). This is a suggestion, not a gate.

**When to skip:** Simple bug fixes, single-file changes, UI tweaks — go straight to `dev-story`.

**File:** `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/steps/step-04-final-validation.md`

### Touchpoint 3: TASKS.md Loading in dev-story

**Where:** Step 2 of `dev-story` workflow (instructions.xml)

**What:** When loading project context, dev-story checks if a PRP `TASKS.md` exists at `docs/PRPs/{feature}/TASKS.md`. If found:
- Loads TASKS.md for implementation task ordering
- Loads the PRP document for Known Pitfalls, Database Schema, and Implementation Patterns
- Uses PRP task ordering as implementation guidance
- Uses story acceptance criteria as validation criteria

If no PRP exists, dev-story proceeds normally using story tasks directly.

**File:** `_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`

## Data Flow

```
BMAD Phase 2: PRD → capabilities, user journeys, requirements
BMAD Phase 2: UX  → interaction patterns, design system
BMAD Phase 3: Architecture → technology decisions, patterns
                  ↓
          planning-context.yaml (structured export)
                  ↓
BMAD Phase 3: Epics/Stories → user-value decomposition
                  ↓
          "Consider /prp-create for complex epics" (suggestion)
                  ↓
PRP Create: Consumes planning-context.yaml + codebase analysis + Procore crawl
          → Outputs: prp-{feature}.md + TASKS.md
                  ↓
BMAD Phase 4: dev-story → Loads TASKS.md (if exists) alongside story
          → Implementation sequence from PRP, validation from story AC
                  ↓
BMAD Phase 4: QA → Quinn/Murat author tests (unit, integration, E2E)
          → Test strategy is BMAD's responsibility, not PRP's
```

## Testing Ownership

Testing is fully owned by BMAD:

| Test Type | Owner | When |
|-----------|-------|------|
| Unit tests | Quinn (BMM QA) | After dev-story implementation |
| Integration tests | Quinn (BMM QA) | After dev-story implementation |
| E2E tests | Quinn (BMM QA) | After dev-story implementation |
| Advanced test architecture | Murat (TEA) | When risk-based strategy needed |
| Build verification only | PRP | During implementation (tsc, lint, regression) |

PRP templates include **build verification commands** (type check, lint, existing test regression checks, production build) but do NOT include test authoring tasks.

## Files Modified

| File | Change |
|------|--------|
| `_bmad/bmm/workflows/3-solutioning/create-architecture/steps/step-08-complete.md` | Added planning-context.yaml export (new Step 3) |
| `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/steps/step-04-final-validation.md` | Added PRP recommendation after completion |
| `_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml` | Added conditional TASKS.md loading in Step 2 |
| `.claude/templates/prp_template.md` | Removed test authoring task, updated validation levels |
| `.claude/templates/tasks_template.md` | Renamed Phase 5 to "Build Verification" |
| `.agents/skills/prp-skills/prp-create/SKILL.md` | Updated phase naming |
| `.agents/skills/prp-skills/prp-create/references/prp_template.md` | Same changes as main template |

## Evolution

These systems evolve independently:

- **BMAD** updates via module versioning (`_bmad/_config/manifest.yaml`)
- **PRP** updates via skill modifications (`.agents/skills/prp-skills/`)
- **Contract** is maintained through this document and the three touchpoints above
- If `planning-context.yaml` format changes, update both the architecture export and PRP consumption logic
