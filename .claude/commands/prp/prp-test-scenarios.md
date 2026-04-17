---
description: "Generate human-readable frontend user testing scenarios from a PRP. Produces Given/When/Then test cases covering all Procore-equivalent functionality. Run after prp-create, before or alongside prp-execute."
argument-hint: "<feature-name>"
---

# PRP Test Scenarios — Frontend User Testing

## Feature: $ARGUMENTS

## Mission

Generate a comprehensive set of human-readable test scenarios that a tester (or QA agent)
can use to verify the feature works correctly from the user's perspective.

These are **not** Playwright scripts. They are structured natural-language scenarios
that describe user behavior and expected outcomes — the acceptance criteria for the feature.

**Input:** `PRPs/$ARGUMENTS/prp-$ARGUMENTS.md` (must exist)
**Input:** `PRPs/$ARGUMENTS/AUDIT.md` (if exists — to know what's implemented)
**Output:** `PRPs/$ARGUMENTS/TEST-SCENARIOS.md`

---

## Generation Process

### Step 1: Read the PRP

```bash
Read PRPs/$ARGUMENTS/prp-$ARGUMENTS.md
```

Extract every user-facing behavior:
- Every workflow step and status transition
- Every form field and its validation rules
- Every list view column, filter, and action
- Every toolbar and row action
- Every business rule (financial calculations, required conditions, etc.)
- Every integration point with other tools

### Step 2: Read the Audit (if available)

```bash
Read PRPs/$ARGUMENTS/AUDIT.md 2>/dev/null
```

If the audit exists, note which items are ✅ implemented — generate scenarios for
those first (can be tested now), then generate scenarios for 🔴 not-yet-implemented
items (future testing, marked clearly).

### Step 3: Generate Scenarios

Organize scenarios into groups. For each group, write scenarios in this format:

```
### Scenario: {descriptive name}
**Status:** Ready to test | Blocked (requires: {missing item})

**Given** {initial state / preconditions}
**When** {user action}
**Then** {expected result}

**Edge cases:**
- {edge case}: {expected behavior}
```

---

## Scenario Groups to Cover

Generate at least one scenario per group. Add more for complex workflows.

### Group 1: Navigation & Access
- Can navigate to the feature from the project sidebar
- Page loads with correct title and layout
- Correct empty state shown when no records exist
- Correct columns visible in list view
- Correct tabs visible on list page

### Group 2: Create
- Happy path: fill all required fields, submit, record appears in list
- Validation: submit with missing required fields → inline errors shown
- Validation: submit with invalid values → correct error messages
- Dropdown fields: options load correctly
- Date fields: date picker works, format correct
- Cancel: closes form without saving
- After create: record appears in list with correct data

### Group 3: Edit
- Open existing record → all fields pre-populated correctly
- Edit a field → save → changes reflected in list and detail view
- FK/relation fields pre-populate correctly (not blank)
- Read-only fields cannot be edited (if applicable)
- Cancel edit → no changes saved

### Group 4: Detail View
- Click record → detail view opens
- All header fields show correct data
- All tabs present and load content
- Each tab shows correct related records/data

### Group 5: Status Workflows
For each status transition defined in the PRP:
- User can trigger transition when allowed
- User cannot trigger transition when not allowed (button hidden or disabled)
- After transition: status badge shows new status
- After transition: correct downstream effects occur (budget impact, notifications, etc.)

### Group 6: List View Features
- Sort by each sortable column
- Filter by each available filter
- Search (if present)
- Pagination (if present)
- Each tab shows correct scoped records
- Bulk select + bulk action (if present)
- Export (PDF/CSV) generates correct file (if present)

### Group 7: Row Actions
For each row action in the PRP:
- Action is visible on the correct rows
- Action executes correctly
- Action is hidden/disabled when not applicable

### Group 8: Business Rules & Calculations
For each business rule in the PRP:
- Rule fires under the correct conditions
- Calculated values are correct
- Budget/financial impact applies correctly
- Related records update as expected

### Group 9: Integration with Other Tools
For each integration point defined in the PRP:
- Data flows correctly from/to the related tool
- Related records appear in correct places
- Financial totals roll up correctly

### Group 10: Error States
- Network error during load → appropriate error shown
- Server error during save → appropriate error shown, data not lost
- Attempting unauthorized action → appropriate message

---

## Output Format

Write `PRPs/$ARGUMENTS/TEST-SCENARIOS.md`:

```markdown
# $ARGUMENTS — Frontend Test Scenarios

**Generated from:** PRPs/$ARGUMENTS/prp-$ARGUMENTS.md
**Date:** {today}
**Total scenarios:** {N}
**Ready to test:** {X} | **Blocked (not yet implemented):** {Y}

---

## Quick Reference

| Group | Scenarios | Status |
|-------|-----------|--------|
| Navigation & Access | N | ✅/🔴 |
| Create | N | ✅/🔴 |
| Edit | N | ✅/🔴 |
| Detail View | N | ✅/🔴 |
| Status Workflows | N | ✅/🔴 |
| List View Features | N | ✅/🔴 |
| Row Actions | N | ✅/🔴 |
| Business Rules | N | ✅/🔴 |
| Integrations | N | ✅/🔴 |
| Error States | N | ✅/🔴 |

---

## Scenarios

{all scenarios organized by group}
```

---

## Quality Gates

Before marking complete:

- [ ] Every PRP workflow has at least one scenario
- [ ] Every form field has at least one validation scenario
- [ ] Every status transition has a scenario
- [ ] Every business rule has a scenario
- [ ] Happy path AND unhappy path covered for create/edit
- [ ] Scenarios marked with implementation status (ready vs blocked)
- [ ] `TEST-SCENARIOS.md` written to `PRPs/$ARGUMENTS/TEST-SCENARIOS.md`
- [ ] Total count reported to user
