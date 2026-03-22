---
name: procore-gap-audit
description: Read the manifest.json from procore-deep-crawl, verify it against the LIVE Procore page using agent-browser, then cross-reference against actual Alleato implementation code to produce a binary PRESENT/MISSING/WRONG checklist.
---

# /procore-gap-audit <feature>

Cross-reference the Procore manifest against the actual Alleato implementation code.
**Read the code, not old spec docs.** The manifest + live Procore page are the source of truth.

## Step 1: Read the manifest

```bash
cat /Users/meganharrison/Documents/alleato-pm/.claude/procore-manifests/$ARGUMENTS/manifest.json
```

Extract from the manifest:
- List columns (all `states.list.columns[].label`)
- Column groups (all `states.list.columnGroups[].label`)
- Create form fields (all `states.create-form.formSections[].fields[].{label, type, required}`)
- Detail tabs (all `states.detail.tabs`)
- Toolbar actions (all `states.list.toolbarActions[].label`)
- Auto-rows (all `states.*.autoRows[].label`)
- Statuses/options from select fields

## Step 2: Verify manifest against LIVE Procore page

**MANDATORY: Use agent-browser to open the actual Procore pages and verify the manifest is accurate.**

The manifest is automated extraction — it WILL miss things. Agent-browser is the verification layer.

### 2a. Verify the list page

```
agent-browser open <list-url-from-manifest>
agent-browser snapshot -i
```

Compare what you see to the manifest's `states.list.columns` and `states.list.columnGroups`:
- **Count** the visible columns in the table header. Does the count match the manifest?
- **Check column groups** — are they labeled correctly? Does each group contain the right columns?
- **Check toolbar actions** — what buttons/dropdowns are visible above the table?
- If anything is missing from the manifest, ADD it to your working notes. Note: "Manifest says X columns but live page shows Y"

### 2b. Verify the create form

Click the Create button (or navigate to the create form URL), then:

```
agent-browser snapshot -i
```

Compare what you see to the manifest's `states.create-form.formSections[].fields`:
- **Count** every visible field label on the form
- **Check field types** — is it a text input, dropdown, radio, checkbox, date picker, rich text editor?
- **Check required markers** — does the field have a * or (required) indicator?
- **Check section groupings** — are fields grouped under section headers?
- If the manifest says 11 fields but you count 12, identify the missing one

### 2c. Verify the detail page

Click into a record to open the detail view:

```
agent-browser snapshot -i
```

- **Check tabs** — what tabs are visible at the top? (Overview, Commitments, Line Items, etc.)
- **Check detail form fields** — what key-value pairs are shown?
- **Scroll down** to see the full page:

```
agent-browser scroll down
agent-browser snapshot -i
```

- **Check the line items table** — what columns does it have? Are there column groups?
- **Check for auto-calculated rows** — are there Insurance/Fee rows with special icons?

### 2d. Record corrections

After verifying all pages, create a corrected field list that combines:
- What the manifest extracted automatically
- What you observed on the live page that the manifest missed

**Use the corrected list (not just the manifest) for the rest of the gap audit.**

## Step 3: Map the Alleato implementation

Read ACTUAL CODE FILES — not spec docs, not memory, not assumptions.

### Frontend pages
```bash
ls frontend/src/app/(main)/[projectId]/$ARGUMENTS/ 2>/dev/null || echo "No pages directory"
```

### Components
```bash
ls frontend/src/components/domain/$ARGUMENTS/ 2>/dev/null || echo "No domain components"
```

### API routes
```bash
ls frontend/src/app/api/projects/\\[projectId\\]/$ARGUMENTS/ 2>/dev/null || echo "No API routes"
```

### Hooks
```bash
ls frontend/src/hooks/use-${ARGUMENTS}* 2>/dev/null || ls frontend/src/hooks/ | grep -i "$ARGUMENTS"
```

### Database schema — read the ACTUAL types file
```bash
grep -A 80 '"$ARGUMENTS"' frontend/src/types/database.types.ts | head -80
```

### Zod schemas
```bash
ls frontend/src/lib/schemas/ | grep -i "$ARGUMENTS"
```

**For each file found, READ it** to understand what fields/columns/routes/actions are actually implemented.

## Step 4: Generate the gap report

Produce the report in this exact format. **Do NOT fill in statuses from memory or guessing — only from reading files and live verification.**

```markdown
# <Feature Name> — Procore vs. Alleato Gap Analysis

**Generated:** <date>
**Manifest:** `.claude/procore-manifests/<feature>/manifest.json`
**Verified against live Procore:** Yes (agent-browser)
**Alleato path:** `frontend/src/app/(main)/[projectId]/<feature>/`

## Manifest Corrections

Fields/columns found on live Procore page but missing from manifest:
- <field name> (<type>) — found on <page>, not in manifest

## Executive Summary

| Category | Status | Details |
|----------|--------|---------|
| **List Table Columns** | ✅/⚠️/❌ | X/Y columns (Z%) |
| **Column Groups** | ✅/⚠️/❌ | X/Y groups |
| **Create Form Fields** | ✅/⚠️/❌ | X/Y fields (Z%) |
| **Detail Tabs** | ✅/⚠️/❌ | X/Y tabs |
| **Toolbar Actions** | ✅/⚠️/❌ | X/Y actions |
| **Statuses/Workflow** | ✅/⚠️/❌ | X/Y statuses |
| **Auto-Calculated Rows** | ✅/⚠️/❌ | X/Y auto-rows |
| **API Routes** | ✅/⚠️/❌ | GET/POST/PATCH/DELETE |
| **Database Schema** | ✅/⚠️/❌ | Missing columns |

**Overall: <COMPLETE / NEEDS MINOR WORK / NEEDS SIGNIFICANT WORK / NOT STARTED> (~X% complete)**

## List Table Columns

| Procore Column | Column Group | Alleato Status | File | Notes |
|---------------|-------------|----------------|------|-------|
| CE Number - Title | (spanning) | ✅ | ... | |
| Status | Change Event | ✅ | ... | |
| Amount | Cost | ❌ | — | Not in DataTable columns def |

## Create Form Fields

| Procore Field | Type | Required | Alleato Status | Notes |
|--------------|------|----------|----------------|-------|
| Title | text | Yes | ✅ | |
| Status | select | No | ⚠️ | Wrong options list |
| Expecting Revenue | radio | No | ❌ | Yes/No — controls revenue fields |

## Detail Tabs

| Procore Tab | Alleato Equivalent | Status |
|------------|-------------------|--------|
| Overview | /detail page | ✅ |
| Line Items | — | ❌ |

## Toolbar Actions

| Procore Action | Type | Alleato Status | Notes |
|---------------|------|----------------|-------|
| Create | primary button | ✅ | |
| Export | dropdown | ❌ | |

## Auto-Calculated Rows

| Procore Auto-Row | Logic | Alleato Status | Notes |
|-----------------|-------|----------------|-------|
| Insurance | From Prime Contract markup % | ❌ | |
| Fee | From Prime Contract markup % | ❌ | |

## Statuses / Workflow

| Procore Status | Alleato Status | In DB Enum | In UI |
|---------------|---------------|------------|-------|
| Draft | Draft | ✅ | ✅ |
| Open | — | ❌ | ❌ |

## API Routes

| Method | Route | Exists | Notes |
|--------|-------|--------|-------|
| GET | /api/projects/[projectId]/<feature> | ✅ | |
| POST | /api/projects/[projectId]/<feature> | ❌ | |

## Database Schema Gaps

| Required Column | Type | Exists | Notes |
|----------------|------|--------|-------|
| amount | decimal | ❌ | Need migration |

## Missing Functionality (Prioritized)

### HIGH Impact
- [ ] <description>

### MEDIUM Impact
- [ ] <description>

### LOW Impact
- [ ] <description>
```

**Status legend:**
- ✅ = Fully implemented, matches Procore
- ⚠️ = Partial (wrong type, incomplete options, different label)
- ❌ = Not implemented

## Step 5: Save the report

```bash
mkdir -p docs-ai/contents/docs/PRPs/$ARGUMENTS
```

Save to: `docs-ai/contents/docs/PRPs/$ARGUMENTS/gap-analysis-report.md`

Then tell the user: "Gap analysis complete. Run `/procore-fix $ARGUMENTS` to start implementing missing items."
