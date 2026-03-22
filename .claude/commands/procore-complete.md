---
name: procore-complete
description: Full pipeline orchestrator — crawl Procore, generate gap analysis, implement all missing items, verify. Runs all 4 commands in sequence with human review pauses.
---

# /procore-complete <feature>

Run the complete pipeline for a feature: crawl → gap audit → fix all items → verify.

## Phase 1: Deep Crawl

Run:
```
/procore-deep-crawl $ARGUMENTS
```

**PAUSE:** Show the user the crawl summary and ask:
- "Does the manifest look complete? Are there any states with ⚠️ notes that need manual review?"
- "Should I proceed to gap analysis, or do you want to review the screenshots first?"

Wait for user confirmation before proceeding.

## Phase 2: Gap Audit

Run:
```
/procore-gap-audit $ARGUMENTS
```

**PAUSE:** Show the user the gap analysis report and ask:
- "Here's what's missing. The HIGH priority items are: [list them]. Should I proceed to fix them in order?"
- If the feature is >80% complete: "This looks mostly done. Should I focus only on HIGH impact items?"

Wait for user confirmation before proceeding.

## Phase 3: Fix All Items (HIGH → MEDIUM → LOW)

For each unchecked item in the gap report, run:
```
/procore-fix $ARGUMENTS
```

**After each fix:** Show the user what was done and ask if they want to continue to the next item.

If a fix is complex (requires schema migration + multiple file changes), warn the user before starting:
"This fix requires a database migration. That will affect all existing data. Confirm?"

## Phase 4: Final Verification

After all HIGH/MEDIUM items are fixed:

1. Run a final browser check:
```bash
agent-browser open http://localhost:3000
```
Navigate to the feature and compare visually against screenshots in `.claude/procore-manifests/$ARGUMENTS/screenshots/list.png`

2. Update the gap report: change all fixed `- [ ]` to `- [x]`

3. Report final status:
```
## Pipeline Complete: <feature>

**Before:** X% complete
**After:** Y% complete

**Fixed:**
- [x] Item 1
- [x] Item 2

**Remaining (LOW priority):**
- [ ] Item 3

**Screenshots:** Verified against Procore reference
```

## Notes for running this command

- This command can take 30-60 minutes for a complex feature
- Never skip the PAUSE points — they exist so you don't waste time fixing things in the wrong order
- If a crawl state fails (empty list), you may need to create test data in Procore first
- Database migrations cannot be undone easily — always confirm before running them
