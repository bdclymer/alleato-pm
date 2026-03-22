---
name: procore-gap-audit
description: Read the manifest.json from procore-deep-crawl and cross-reference against actual Alleato implementation code (NOT old spec docs) to produce a binary PRESENT/MISSING/WRONG checklist.
---

# /procore-gap-audit <feature>

Cross-reference the Procore manifest against the actual Alleato implementation code.
**Read the code, not old spec docs.** Old docs may be wrong — the manifest is the source of truth.

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

## Step 2: Map the Alleato implementation

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

## Step 3: Generate the gap report

Produce the report in this exact format. **Do NOT fill in statuses from memory or guessing — only from reading the files.**

```markdown
# <Feature Name> — Procore vs. Alleato Gap Analysis

**Generated:** <date>
**Manifest:** `.claude/procore-manifests/<feature>/manifest.json`
**Alleato path:** `frontend/src/app/(main)/[projectId]/<feature>/`

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
| # | — | ✅ | ... | |
| Title | — | ✅ | ... | |
| Amount | Financial Impact | ❌ | — | Not in DataTable columns def |

## Create Form Fields

| Procore Field | Type | Required | Alleato Status | Notes |
|--------------|------|----------|----------------|-------|
| Title | text | Yes | ✅ | |
| Status | select | No | ⚠️ | Wrong options list |

## Detail Tabs

| Procore Tab | Alleato Equivalent | Status |
|------------|-------------------|--------|
| Overview | /detail page header | ✅ |
| Line Items | — | ❌ |

## Toolbar Actions

| Procore Action | Type | Alleato Status | Notes |
|---------------|------|----------------|-------|
| Create Change Event | primary button | ✅ | |
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

## Step 4: Save the report

```bash
mkdir -p docs-ai/contents/docs/PRPs/$ARGUMENTS
```

Save to: `docs-ai/contents/docs/PRPs/$ARGUMENTS/gap-analysis-report.md`

Then tell the user: "Gap analysis complete. Run `/procore-fix $ARGUMENTS` to start implementing missing items."
