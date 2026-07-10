---
name: repeatable-training-docs
description: >
  Capture an Alleato workflow step by step, save a walkthrough video plus per-step
  screenshots, and generate an Alleato-only markdown documentation draft from the
  stored support-article corpus. Use when the goal is a repeatable SOP or help
  article for any in-app workflow.
argument-hint: "<workflow file or feature name>"
---

# Repeatable Training Docs

Use this skill when you need documentation for a real Alleato workflow and you
want the same process every time:

1. Record the workflow in the app.
2. Save one session video and one screenshot per step.
3. Pull source context from the stored support-article corpus.
4. Generate an Alleato-only draft with no external-brand mentions and no
   external documentation links.
5. Publish or attach the generated artifacts to the training-doc workflow.

## Inputs You Need

- A workflow definition under `scripts/tutorials/workflows/*.workflow.ts`
  or a new one you create for the target feature.
- An authenticated Playwright storage state for the same base URL.
- A precise source route or user journey inside Alleato.
- A query string that describes the workflow for support-article retrieval.

## Output Contract

Every run must leave these artifacts in the chosen output directory:

- `manifest.json`
- `<slug>.md`
- the walkthrough video file (`.webm`)
- `screenshots/*.png`
- `source-brief.md`
- `documentation-draft.md`
- `documentation-input.json`

If any of these are missing, the run is incomplete.

## Hard Rules

- Final documentation must never mention `Procore`.
- Final documentation must never link to external support articles.
- Remove source-only steps, permissions, statuses, or UI that do not exist in
  Alleato.
- Treat the captured Alleato workflow as the source of truth for step order.
- Fail loudly on login redirects, access denied pages, wrong routes, empty
  support matches, or forbidden source leakage.

## Workflow

### 1. Capture the Alleato workflow

Run the recorder:

```bash
npm run tutorial:capture -- scripts/tutorials/workflows/<workflow>.workflow.ts \
  --base-url http://localhost:3001 \
  --storage-state frontend/tests/.auth/user.json \
  --output-dir docs/tutorials/<module>/<slug>
```

The capture is not valid unless:

- `manifest.json` exists
- the walkthrough video file exists
- each documented step has a screenshot
- no step source URL points to `/auth/login` or `/access-denied`

### 2. Generate the doc draft from stored source material

Run the composer:

```bash
node scripts/tutorials/compose-training-doc.mjs \
  docs/tutorials/<module>/<slug>/manifest.json \
  --query "<workflow query>" \
  --title "<final document title>"
```

Optional:

- `--output-dir <dir>` to write drafts elsewhere
- `--doc-type tutorial|how-to`
- `--audience internal|client|subcontractor|admin`
- `--top-k 8` to widen support retrieval
- `--no-ai` to use the deterministic fallback

### 3. Review the generated draft

Check `documentation-draft.md` against this list:

- Does it only describe Alleato behavior?
- Are the steps in the same order as `manifest.json`?
- Are external-brand mentions absent?
- Are external support links absent?
- Did the draft drop source-only content that does not appear in Alleato?

If not, fix the workflow or regenerate. Do not hand-edit around a broken source
contract without noting the cause.

### 4. Publish back into training docs when needed

```bash
npx tsx scripts/tutorials/publish-tutorial.ts \
  docs/tutorials/<module>/<slug>/manifest.json \
  --app-tool-category <Category> \
  --source-route <route> \
  --title "<final document title>"
```

This should register:

- ordered step screenshots
- ordered step records
- one walkthrough video asset

### 5. Use this template for the final doc shape

Start from:

`/.codex/skills/repeatable-training-docs/templates/training-doc-template.md`

## Failure-Loudly Checklist

- Missing auth state: refresh the storage-state file and rerun.
- Wrong page captured: add or tighten route assertions in the workflow.
- Empty support retrieval: rephrase the query with the tool and action name.
- Forbidden source leakage in the draft: fix the composer input or sanitizer,
  then rerun; do not publish the contaminated draft.
- Video missing but screenshots exist: treat capture as failed and rerun after
  checking the recorder output.
