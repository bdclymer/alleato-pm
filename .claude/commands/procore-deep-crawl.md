---
name: procore-deep-crawl
description: Crawl a live Procore feature and produce a structured manifest.json capturing every column group, form field, tab, toolbar action, filter, and auto-calculated row. Run this before procore-gap-audit.
---

# /procore-deep-crawl <feature>

Crawl the live Procore app for the given feature, navigate every page state (list, create form, detail, detail tabs), extract structured DOM data, and write `manifest.json` + screenshots.

## Steps

1. Run the deep crawl script:

```bash
cd /Users/meganharrison/Documents/alleato-pm/scripts/playwright-crawl
node procore-deep-crawl.js $ARGUMENTS
```

2. Wait for the script to complete. It will print a SUMMARY table.

3. Review the summary for any states marked ⚠️ (capture note = something failed). For each ⚠️ state:
   - Read the `_capture_note` in the manifest
   - Check if the list was empty (no records to click for detail view)
   - Check if the selector needs updating in `lib/feature-registry.js`

4. Report to the user:

```
## Crawl Complete: <feature>

**States captured:** X / Y

| State | Columns | Fields | Actions | Notes |
|-------|---------|--------|---------|-------|
| list | N | — | N | |
| create-form | — | N | N | |
| detail | — | — | — | |
...

**⚠️ Issues requiring manual review:**
- <state-id>: <_capture_note>

**Manifest:** `.claude/procore-manifests/<feature>/manifest.json`
**Screenshots:** `.claude/procore-manifests/<feature>/screenshots/`

Run `/procore-gap-audit <feature>` to cross-reference against Alleato implementation.
```

5. If any critical states (list, create-form) have zero columns and zero fields, warn the user — the manifest may not be usable for gap analysis yet.
