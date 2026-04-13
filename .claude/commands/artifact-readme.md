---
description: Generate a README.md for a planning artifacts directory. Discovers all files, manifests, and testing docs automatically.
argument-hint: "<tool-slug>"
---

# /artifact-readme — Planning Artifact README Generator

Generates a `README.md` for `_bmad-output/planning-artifacts/<tool-slug>/` by auto-discovering all relevant files.

## Usage

```
/artifact-readme <tool-slug>
```

Examples:
```
/artifact-readme prime-contracts
/artifact-readme budget
/artifact-readme rfis
```

## Instructions

Given `<tool-slug>`, do the following:

### 1. Resolve paths

```
ARTIFACTS_DIR = _bmad-output/planning-artifacts/<tool-slug>/
MANIFEST_PATH = .claude/procore-manifests/<tool-slug>/manifest.json
TESTING_DIR   = docs/testing/
```

### 2. Discover files in ARTIFACTS_DIR

List the directory. For each file/folder found, classify it:

| Pattern | Role |
|---------|------|
| `prp-*.md` or `*-fix.md` | PRP (product requirements plan) |
| `execution-plan*.md` | Execution plan |
| `TASKS.md` or `tasks*.md` | Task checklist |
| `crawl/` (folder) or `crawl.md` | Procore crawl data |
| `index.md` or `summary.md` | Summary / index |
| `status.md` | Implementation status |
| `*.md` not matched above | Other planning doc |
| `research/` (folder) | Research notes |
| `specs/` (folder) | Specs |

### 3. Discover external files

Check whether these exist (use Bash `ls` or `test -f`):

- **Procore manifest:** `.claude/procore-manifests/<tool-slug>/manifest.json`
- **Testing scenarios:** `docs/testing/<tool-slug>-scenarios.md`
- **Testing matrix:** `docs/testing/<tool-slug>-test-matrix.md`

Note which ones exist — only link to files that are confirmed present.

### 4. Find app URL and Procore URL

Check these sources in order, stop when found:

1. Any `.md` file in ARTIFACTS_DIR for lines matching `localhost:3000` or `us02.procore.com`
2. The PRP file (look for **URL:** or **Procore URL:** fields)
3. The execution plan file

### 5. Find implementation files

Check whether these standard paths exist (adapt slug to PascalCase/camelCase as needed):

| Layer | Path pattern |
|-------|-------------|
| Main page | `frontend/src/app/(main)/[projectId]/<tool-slug>/page.tsx` |
| Tables page | `frontend/src/app/(tables)/<tool-slug>/page.tsx` |
| API routes | `frontend/src/app/api/projects/[projectId]/<tool-slug>/` |
| Service | `frontend/src/services/<PascalSlug>Service.ts` |
| Hook | `frontend/src/hooks/use-<tool-slug>.ts` |

Only include rows for paths that actually exist.

### 6. Check for crawl details

If `crawl/` folder exists, check for:
- `crawl/punch-list-crawl-status.md` or `crawl/*-crawl-status.md` — extract page count and date
- `crawl/pages/` — list subfolders for the captured pages table

If only `crawl.md` exists, extract the page count and date from its header.

### 7. Write README.md

Write to `_bmad-output/planning-artifacts/<tool-slug>/README.md`.

Use this structure:

```markdown
# <Tool Name> — Planning Artifacts

**File Path:** `frontend/src/app/(main)/[projectId]/<tool-slug>/`

**URL:** <app-url-if-found>

**Procore URL:** <procore-url-if-found>

This directory contains all planning, specification, and Procore crawl data used to implement the Alleato <tool name> feature.

## Files

| File | Purpose |
|------|---------|
| [<prp-file>](<prp-file>) | Product requirements plan — full feature spec aligned to Procore |
| [<execution-plan>](<execution-plan>) | Step-by-step dev instructions for the AI coding agent |
| [<tasks-file>](<tasks-file>) | Task checklist with completion status and session log |
| [crawl/](crawl/) OR [crawl.md](crawl.md) | Procore crawl data |
| [Procore Manifest](../../../../.claude/procore-manifests/<tool-slug>/manifest.json) | Field-level data captured from live Procore instance |
| [Testing Scenarios](../../../../docs/testing/<tool-slug>-scenarios.md) | Manual test scenarios |
| [Testing Matrix](../../../../docs/testing/<tool-slug>-test-matrix.md) | Full test coverage matrix |
<!-- Only include rows for files confirmed to exist -->

## Procore Crawl Data

<N> pages captured from the live Procore <tool name> tool on <date>. See [crawl/](crawl/) for screenshots, DOM, metadata, and reports. Each page folder contains `screenshot.png`, `dom.html`, and `metadata.json`.
<!-- If crawl.md instead of crawl/ folder, adjust accordingly -->

## Implementation Location

| Layer | File |
|-------|------|
| Main page | [frontend/src/app/(main)/[projectId]/<tool-slug>/page.tsx](../../../../frontend/src/app/(main)/[projectId]/<tool-slug>/page.tsx) |
<!-- Only include rows for paths confirmed to exist -->

## Re-running the Crawl

```bash
cd scripts/screenshot-capture
node scripts/crawl-<tool-slug>-comprehensive.js
```
<!-- Omit this section if no crawl script is found -->
```

### Rules

- **Only link to files confirmed to exist.** Never add a row for a file you haven't verified.
- Use relative links from the README's location (4 levels up: `../../../../`).
- Omit any section that has no content (e.g. no implementation files found → omit that table).
- Tool name in the heading should be title-cased (e.g. `prime-contracts` → "Prime Contracts").
- Do not invent metadata. If page count or date can't be found, omit those details.
