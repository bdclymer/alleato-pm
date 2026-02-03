# Codex PRP Create

description: “Research and create a comprehensive TypeScript PRP (Product Requirement Prompt) for one-pass implementation success (single-agent Codex version)”
argument-hint: “”

Create TypeScript PRP (Codex / Single-Agent)

Feature: $ARGUMENTS

PRP Creation Mission

Create a comprehensive TypeScript PRP that enables one-pass implementation success through systematic research and context curation.

Critical Understanding: The executing AI agent only receives:
 • PRP concept doc: docs-ai/contents/docs/PRPs/prp-readme.md
 • The PRP content you create
 • Its training data knowledge
 • Access to codebase files (but needs explicit guidance on which ones)

Therefore: Your research and context curation directly determines implementation success. Incomplete context = implementation failure.

Codex Constraint: No subagents. This workflow must be executed by a single agent using a strict, sequential research loop.

⸻

Single-Agent Research Operating System (Codex)

The Loop (use for every research track)

For each track below, follow this exact loop:

 1. Locate relevant artifacts (search + directory scan)
 2. Open + read the most relevant 3–10 files end-to-end (not snippets only)
 3. Extract: conventions, types, APIs, component patterns, validation commands
 4. Record into PRP sections immediately (don’t “hold it in memory”)
 5. Validate completeness using the “No Prior Knowledge” test
 6. Repeat until confidence score ≥ 8/10

Output discipline: every discovery must become either:
 • a PRP reference (file path + why), OR
 • a PRP instruction (what to do + where), OR
 • a PRP “gotcha” note (what breaks + how to avoid)

⸻

1) Procore Crawl Data & Spec Artifacts (CRITICAL for Procore features)

Before codebase analysis, check for existing Procore crawl data + spec artifacts:

# Crawl data location

docs-ai/contents/docs/PRPs/{feature}/

# Key files to load

docs-ai/contents/docs/PRPs/{feature}/crawl-summary.json
docs-ai/contents/docs/PRPs/{feature}/spec/COMMANDS.md
docs-ai/contents/docs/PRPs/{feature}/spec/MUTATIONS.md
docs-ai/contents/docs/PRPs/{feature}/spec/schema.sql
docs-ai/contents/docs/PRPs/{feature}/spec/FORMS.md

Procedure

 1. If crawl-summary.json exists: read it first.
 2. If crawl data exists but no crawl-summary.json, generate it:

cd scripts/screenshot-capture && PROCORE_MODULE={feature} node scripts/generate-crawl-summary.js

 1. If no crawl data exists: stop and run /feature-crawl {feature} <procore-url> first.

Mandatory PRP Integration

You MUST integrate:
 • COMMANDS.md → populate Implementation Tasks (domain commands)
 • MUTATIONS.md → behavior specs + edge cases
 • schema.sql → starting point for data model section
 • screenshots + DOM + metadata → UI structure, table columns, forms/validation rules

Required PRP Section: Procore Crawl Data Reference

Add this exact section format to the PRP:

## Procore Crawl Data Reference

Base Path: `docs-ai/contents/docs/PRPs/{feature}/`

### Sitemap

| Page | URL | Screenshot |
|------|-----|------------|
| {PageName} | {url} | `pages/{page}/screenshot.png` |

### Crawl Data Files

| Category | File | Path | Description |
|----------|------|------|-------------|
| Summary | Crawl Summary | `crawl-summary.json` | Structured JSON with all crawl data |
| Summary | README | `README.md` | Module overview |
| Reports | Sitemap | `reports/sitemap-table.md` | Page URLs and structure |
| Reports | Detailed Report | `reports/detailed-report.json` | Full crawl analysis |
| Spec | Commands | `spec/COMMANDS.md` | Domain commands |
| Spec | Mutations | `spec/MUTATIONS.md` | Behavior specifications |
| Spec | Schema | `spec/schema.sql` | Database tables |
| Spec | Forms | `spec/FORMS.md` | UI form field definitions |
| Pages | Screenshot | `pages/{page}/screenshot.png` | Main view screenshot |
| Pages | DOM | `pages/{page}/dom.html` | Full DOM snapshot |
| Pages | Metadata | `pages/{page}/metadata.json` | Links, dropdowns, system actions |

### Key UI Elements to Replicate

- {List observed toolbars/panels/tables/filters/modals}
- {Note context menus, bulk actions, empty states, error states}

### UI Components Detected

| Label | Command Key |
|-------|-------------|
| {Label} | `{command_key}` |

⸻

1) TypeScript/React Codebase Analysis (Deep)

Goal

Identify:
 • exact files to reference
 • exact patterns to follow
 • exact commands to validate
 • closest “existing feature” analogs

Single-Agent Search Plan (Codex)

Run these searches and capture results into PRP Context (paths + why they matter):

# Find feature-related files quickly

rg -n "{feature}|{Feature}|{domain_term}" .

# Find Next.js App Router patterns

rg -n "app/|route\.ts|page\.tsx|layout\.tsx|loading\.tsx|error\.tsx" .

# Find data access patterns

rg -n "supabase|db\.ts|database\.types|Repository|service role|RLS" .

# Find API route conventions (Next.js route handlers)

rg -n "export async function (GET|POST|PUT|PATCH|DELETE)" app .

# Find UI patterns

rg -n "use client|shadcn|@/components|DataTable|Dialog|DropdownMenu" src app .

# Find validation/test patterns

rg -n "vitest|jest|playwright|testing-library|msw|supertest|zod" .

What to Extract (must end up in PRP)
 • Component conventions: naming, folder placement, client/server boundaries
 • Hook conventions: where hooks live, how data fetching is handled
 • Types: where types are defined, how shared types are imported
 • API conventions: route handler patterns, error handling, status envelopes
 • State management patterns (if any)
 • Table/form components and patterns (especially if Procore-like)
 • Existing “similar” features and what to copy/extend
 • Validation commands that actually work in this repo

Deliverable (within PRP Context YAML)

A “Codebase References” block listing the top 10–25 files the implementer must read, each with:
 • path
 • what pattern it provides
 • what to copy/avoid

⸻

1) External Research (Single-Agent, Curated)

Goal

Provide high-leverage, version-relevant references with anchors (not generic links).

Procedure

 1. Identify what’s actually used in the repo:

 • Next.js version (package.json)
 • React version
 • TS version
 • any framework libraries (zod, react-hook-form, tanstack table, etc.)

 1. For each critical topic, add 2–5 anchored URLs:

 • TypeScript types/interfaces patterns relevant to this feature
 • Next.js App Router patterns (Route Handlers, Server Components, caching, forms)
 • React patterns relevant to UI state/hydration
 • Library docs for whatever the repo uses (zod, tanstack, shadcn, etc.)

 1. For any “load-bearing” doc:

 • create a local markdown snapshot in:
docs-ai/contents/docs/PRPs/docs/{topic}.md
 • summarize the exact parts needed
 • reference that file from the PRP

Required: Pitfalls Section

Add a “Common Pitfalls” section in PRP that includes:
 • TS compilation traps relevant to the repo
 • Next.js gotchas (client/server, caching, route handlers)
 • Hydration risks
 • Schema/type drift risks

⸻

1) User Clarification (Only if unavoidable)

If the feature goal or scope is ambiguous, ask targeted questions only after you’ve done:
 • crawl artifact check
 • codebase pattern scan
 • identification of closest analog feature

Ask questions in the form:
 • “Which of these behaviors is in-scope: A / B / C?”
 • “Should permissions/roles be enforced now or stubbed?”
 • “Should we implement UI parity with Procore screenshot X, or simplified v1?”

⸻

PRP Generation Process

Step 1: Read PRP Concepts

Start by reading:
 • docs-ai/contents/docs/PRPs/prp-readme.md

Step 2: Choose Template

Use:
 • .claude/templates/prp_template.md

Step 3: Context Completeness Validation

Apply the No Prior Knowledge test:

“If someone knew nothing about this TypeScript/React codebase, would they have everything needed to implement this successfully?”

Step 4: Transform Research into the Template
 • Goal: specific, measurable Feature Goal + concrete Deliverable(s)
 • Context (YAML): anchored URLs + file paths + patterns + gotchas
 • Implementation Tasks: dependency-ordered tasks with dense keywords + explicit file targets
 • Validation Gates: commands verified to work in this repo

Step 5: Information Density Standards

Everything must be specific/actionable:
 • URLs must include anchors
 • File refs must include “what to copy”
 • Tasks must include exact placements and naming conventions
 • Validation commands must be executable as-written

Step 6: ULTRATHINK Planning (Single-Agent)

Before writing PRP content, write a short internal plan:
 • which sections need what evidence
 • which files must be re-opened
 • what is still unknown

Then proceed to draft PRP.

⸻

Output

File Structure

Create:

docs-ai/contents/docs/PRPs/{feature-name}/
├── prp-{feature-name}.md       # Main PRP document (static reference)
├── TASKS.md                    # Implementation checklist (live progress tracker)
└── prp-{feature-name}.html     # Browser-viewable PRP (auto-generated)

Base output path: docs-ai/contents/docs/PRPs/{feature-name}/

⸻

TASKS.md Generation

After completing the PRP markdown:

 1. Use .claude/templates/tasks_template.md
 2. Extract tasks from “Implementation Tasks”
 3. Organize phases:
 • Data Layer → API Layer → UI Layer → Integration → Testing
 4. Include Progress Summary at top
 5. Add Session Log for progress tracking

⸻

HTML Output

Generate:

node .claude/scripts/prp-to-html.js docs-ai/contents/docs/PRPs/{feature-name}/prp-{feature-name}.md

If manual HTML is needed, require:
 • clean responsive styling
 • TOC with anchors
 • syntax highlighting
 • collapsible long sections
 • screenshot references (if crawl exists)
 • print-friendly styles

⸻

TypeScript PRP Quality Gates

Context Completeness
 • Passes “No Prior Knowledge” test
 • YAML references are specific + accessible
 • Tasks include exact naming + placement guidance
 • Validation commands verified to work in this repo
 • Type/interface strategy clearly defined

Template Compliance
 • All template sections completed
 • Goal includes Feature Goal, Deliverable, Success Definition
 • Tasks follow dependency ordering (types → data → API → UI → tests)
 • Final validation checklist is TS/React specific

TS/React Density Standards
 • No generic references
 • File patterns include explicit examples to follow
 • URLs include anchors
 • Component boundaries (Server vs Client) explicitly specified
 • Type definitions comprehensive + consistent with repo

⸻

Success Metrics

Confidence Score (1–10): one-pass implementation success likelihood
Minimum acceptable: 8/10

Definition of done: a new AI agent can implement the feature successfully using only:
 • this PRP
 • repo access
…and achieve full type safety + Next.js/React correctness.

⸻

If you want, I can also rewrite this into a Codex “two-command” setup:

 1. create-prp {feature} (does research + writes PRP)
 2. implement-prp {feature} (executes TASKS.md with strict gates)

That separation tends to make single-agent Codex workflows far more reliable.
