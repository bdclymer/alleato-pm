# Change Events Test Consolidation Recommendations

**Current count:** 121 cases (51 scenario + 70 feature)
**Recommended count:** ~45 cases
**Reduction:** ~63%

---

## Summary of Problems

1. **Scenario ↔ Feature duplication** — Nearly every scenario has a matching feature test covering the same behavior. Both sets exist independently with no cross-referencing.
2. **Intra-scenario duplicates** — Several scenario tests cover the same action from a slightly different angle (e.g., 7.2 and 9.1 are both "search by title keyword").
3. **Intra-feature duplicates** — Feature tests are over-specified, with individual tests for each dropdown field option, each view type, and each export format.
4. **Split categories** — The scenario set has both `Status` (5.1, 5.2) and `Status & Workflow` (5.3–5.6) as separate categories for the same workflow.

---

## Section-by-Section Recommendations

### Navigation (currently 4 scenario + 4 feature = 8)

| Keep | Remove | Reason |
|------|--------|--------|
| 1.1 — Open the Change Events page | | Core smoke test |
| 1.2 — Open a change event detail page | 1.3 — Open a change event record | **Identical behavior.** 1.2 and 1.3 both test "click a row → detail page opens." Keep one. |
| 1.4 — Switch between table, card, and list views | 2.2.2 (Card view), 2.2.3 (List view) feature tests | Views can be verified in a single test |
| | 2.1.1 — List view loads with correct columns (feature) | Covered by 1.1 |
| | 2.1.4 — RFQs tab (feature) | Covered under Integrations |

**Target: 3 tests** (down from 8)

---

### Create (currently 8 scenario + 7 feature = 15)

| Keep | Remove | Reason |
|------|--------|--------|
| 2.1 — Create with required fields | 1.1.1 (feature duplicate) | |
| 2.2 — Create fails without title | 1.1.3 (feature duplicate) | |
| 2.5 — Change events are numbered sequentially | 1.1.4 (feature duplicate) | |
| 2.6 — Create with a cost line item | 1.1.6 (feature duplicate) | |
| 2.4 — Canceling create saves nothing | | Important negative path |
| | 2.3 — Create with all optional fields | Covered by Edit tests; optional fields don't need their own Create path |
| | 2.7 — Attach a file when creating | Covered by the Attachments section |
| | 2.8 — Create with Expecting Revenue off | Merge as a note into 2.1 or the Calculations section |
| | 1.1.2 — Create with all optional fields (feature) | Duplicate of 2.3 which is being removed |
| | 1.1.5 — Create with Expecting Revenue = false (feature) | Covered in Calculations |
| | 1.1.7 — Create with attachments (feature) | Covered in Attachments |

**Target: 5 tests** (down from 15)

---

### Edit (currently 4 scenario + 4 feature = 8)

| Keep | Remove | Reason |
|------|--------|--------|
| 3.1 — Edit title, verify it persists after refresh | 1.2.1 (feature duplicate); merge 3.2 into this | Combine "edit and save" + "refresh to confirm" into one test |
| 3.3 — Cancel does not save changes | 1.2.2 (feature duplicate) | |
| | 3.4 — Edit from row action menu | Minor UX variation; not worth a dedicated test |
| | 1.2.3 — Edit from list row action menu (feature) | Same as 3.4 being removed |
| | 1.2.4 — Edit opens pre-filled (feature) | Fold into 3.1 as a step: "verify form is pre-populated" |

**Target: 2 tests** (down from 8)

---

### Delete (currently 4 scenario + 4 feature = 8)

| Keep | Remove | Reason |
|------|--------|--------|
| 4.1 — Delete and verify removed from list | 1.3.1 (feature duplicate) | |
| 4.2 — Cancel delete leaves record intact | 1.3.3 (feature duplicate) | |
| 4.3 — Bulk delete multiple records | 1.3.4 (feature duplicate) | |
| | 4.4 — Delete from detail page action menu | Minor variation of 4.1; not worth a dedicated test |
| | 1.3.2 — Delete from detail page (feature) | Same as 4.4 being removed |

**Target: 3 tests** (down from 8)

---

### Status & Workflow (currently 6 scenario + 8 feature = 14)

The scenarios split `Status` (5.1–5.2) and `Status & Workflow` (5.3–5.6) into two categories. These should be one category.

| Keep | Remove | Reason |
|------|--------|--------|
| **Merge 5.1 + 5.2** → "Walk a change event through Open → Pending → Approved" | 4.1.1, 4.1.2, 4.1.3 (feature duplicates) | The full approval path in one test is more useful than testing each transition in isolation |
| 5.3 — Reject a pending change event | 4.1.4 (feature duplicate) | |
| 5.4 — Close a change event | 4.1.5 (feature duplicate) | |
| **Merge 5.5 + 5.6** → "Convert approved event to change order; verify option is hidden until Approved" | 4.2.1, 4.2.2 (feature duplicates) | These two tests are describing the same workflow |
| | 4.1.6 — Void via edit (feature) | Low priority edge case; can be a note on the Edit test |

**Target: 4 tests** (down from 14)

---

### Line Items & Calculations (currently 3 scenario + 8 feature = 11)

| Keep | Remove | Reason |
|------|--------|--------|
| 6.1 — Add a line item | 3.2.1 (feature duplicate) | |
| 6.2 — Markup applied to cost ROM | 3.3.1 (feature duplicate) | |
| 6.3 — Totals update when filter applied | 10.4.1 (feature duplicate) | |
| | 3.2.2 — Edit a line item (feature) | Add as a step in 6.1: "edit the amount and verify total updates" |
| | 3.2.3 — Delete a line item (feature) | Same — add as a step in 6.1 |
| | 3.2.4 — Line item links to vendor (feature) | Low-value detail; covered by the form field tests |
| | 3.2.5 — Line item links to commitment (feature) | Same |
| | 3.3.2 — Markup not applied when Revenue=false (feature) | Note in 6.2 |

**Target: 3 tests** (down from 11)

---

### Filters & Search (currently 5 scenario + 3 feature = 8)

| Keep | Remove | Reason |
|------|--------|--------|
| **Merge 7.2 + 9.1** → "Search by title keyword" | Both are identical. 7.2 says "part of title," 9.1 says "keyword." Same test. | |
| 7.3 — Filter by Open status | 10.2.1 (feature duplicate) | |
| 7.5 — Clearing a filter restores full list | | Important reset behavior |
| | 7.4 — Filter by Out of Scope | Covered sufficiently by 7.3 (same filter mechanism, different value) |
| | 10.1.1 — Search by number (feature) | Merge into the search test as an additional step |
| | 10.1.2 — Search by title (feature) | Duplicate of 7.2/9.1 |
| | 10.2.2 — Filter by scope (feature) | Covered by 7.4 being removed; same filter UI |

**Target: 3 tests** (down from 8)

---

### Attachments (currently 3 scenario + 3 feature = 6)

| Keep | Remove | Reason |
|------|--------|--------|
| **Merge 7.1 + 10.1 + 10.2** → "Upload and remove an attachment" | 1.1.7, 10.6.1, 10.6.2 (feature duplicates) | Upload + remove is one natural test flow |

**Target: 1 test** (down from 6)

---

### History (currently 3 scenario + 2 feature = 5)

| Keep | Remove | Reason |
|------|--------|--------|
| **Merge 8.1 + 12.1 + 12.2** → "History tab records creation and status changes" | 10.5.1, 10.5.2 (feature duplicates) | These all test the same tab. One test that checks creation + status change is sufficient. |

**Target: 1 test** (down from 5)

---

### Export & Reports (currently 2 scenario + 3 feature = 5)

As you noted — the CSV and PDF exports can be one test.

| Keep | Remove | Reason |
|------|--------|--------|
| **Merge 8.2 + 8.3** → "Export a change event — verify CSV downloads and PDF generates" | 9.1.2, 9.1.3 (feature duplicates of same behavior) | |
| 9.1.1 — Export the list as CSV | | Different from single-event export; worth keeping |

**Target: 2 tests** (down from 5)

---

### Integrations (currently 5 scenario + 7 feature = 12)

| Keep | Remove | Reason |
|------|--------|--------|
| **Merge 11.1 + 11.2** → "Send an RFQ; verify error when no record selected" | 7.1.1, 7.1.2 (feature duplicates) | Positive + negative path in one test |
| **Merge 11.3 + 11.4** → "Link and unlink a related item" | 7.2.1, 7.2.2 (feature duplicates) | Natural paired flow |
| 11.5 — Prime Contract Change Orders tab shows linked COs | 7.3.1 (feature duplicate) | |
| | 7.4.1 — Add line items to an unapproved PCO (feature) | Advanced; low tester availability |
| | 7.5.1 — Change event columns visible in Budget view (feature) | Cross-tool; better tested in Budget tests |

**Target: 3 tests** (down from 12)

---

### Form Fields (currently 0 scenario + 6 feature = 6)

The feature tests 3.1.1–3.1.6 each verify that a single dropdown is populated (status, type, scope, origin, change reason, revenue source). These can be one test.

| Keep | Remove | Reason |
|------|--------|--------|
| **Merge 3.1.1–3.1.6** → "Create form: all dropdowns are populated with correct options" | | Six tests for the same UI behavior (dropdown has options) |

**Target: 1 test** (down from 6)

---

### Views (currently 1 scenario + 1 feature = 2)

| Keep | Remove | Reason |
|------|--------|--------|
| 1.4 — Switch between table, card, and list views | 2.1.2, 2.1.3, 2.2.2, 2.2.3 (feature) | Fold the tab-switching checks (Line Items, No Line Items tabs) into 1.4 as steps |

Already counted under Navigation above.

---

### Collaboration (currently 1 scenario + 2 feature = 3)

| Keep | Remove | Reason |
|------|--------|--------|
| 9.2 — Send a change event by email | 5.2.1 (feature duplicate) | |
| | 5.1.1 — Add a comment (feature) | LOW value test; comments UI is not change-event-specific |

**Target: 1 test** (down from 3)

---

### Edge Cases (currently 3 scenario + 0 feature = 3)

| Keep | Remove | Reason |
|------|--------|--------|
| 13.3 — Expand a row to see line items | | Unique row-expand behavior worth testing |
| 13.1 — Empty state | | Quick smoke test |
| | 13.2 — Hide and show columns | LOW; column visibility is a shared table feature not specific to change events |

**Target: 2 tests** (down from 3)

---

### Remove Entirely (no scenario equivalent, low value)

| Test | Reason |
|------|--------|
| 6.1.1 — Read permission: user can view list | Permissions testing requires a separate user setup that isn't part of standard test runs |
| 8.1.1 — Configure change event settings | LOW priority; no clear expected result defined |

---

## Proposed Final List (~45 tests)

| # | Category | Test Name | Priority |
|---|----------|-----------|----------|
| 1.1 | Navigation | Open the Change Events page | HIGH |
| 1.2 | Navigation | Open a change event detail page | HIGH |
| 1.3 | Navigation | Switch between table, card, and list views (and sub-tabs) | MEDIUM |
| 2.1 | Create | Create a change event with required fields | HIGH |
| 2.2 | Create | Create fails without a title | HIGH |
| 2.3 | Create | Change events are numbered sequentially | HIGH |
| 2.4 | Create | Create with a cost line item | HIGH |
| 2.5 | Create | Canceling create saves nothing | HIGH |
| 3.1 | Edit | Edit title; verify pre-filled form and persistence after refresh | HIGH |
| 3.2 | Edit | Cancel does not save changes | MEDIUM |
| 4.1 | Delete | Delete and verify removed from list | HIGH |
| 4.2 | Delete | Cancel delete leaves record intact | HIGH |
| 4.3 | Delete | Bulk delete multiple records | HIGH |
| 5.1 | Status & Workflow | Walk a change event Open → Pending → Approved | HIGH |
| 5.2 | Status & Workflow | Reject a pending change event | HIGH |
| 5.3 | Status & Workflow | Close a change event | HIGH |
| 5.4 | Status & Workflow | Convert approved event to change order; verify option hidden until Approved | HIGH |
| 6.1 | Line Items | Add, edit, and delete a line item | HIGH |
| 6.2 | Calculations | Markup applied to cost ROM | HIGH |
| 6.3 | Calculations | Totals update when a filter is applied | HIGH |
| 7.1 | Form Fields | Create form: all dropdowns are populated | HIGH |
| 8.1 | Filters & Search | Search by title keyword | HIGH |
| 8.2 | Filters & Search | Filter by status; clear filter restores list | HIGH |
| 9.1 | Attachments | Upload and remove an attachment | MEDIUM |
| 10.1 | History | History tab records creation and status changes | MEDIUM |
| 11.1 | Export | Export list as CSV | MEDIUM |
| 11.2 | Export | Export a single change event as CSV and PDF | MEDIUM |
| 12.1 | Collaboration | Send a change event by email | MEDIUM |
| 13.1 | Integrations | Send an RFQ; verify error when no record selected | HIGH |
| 13.2 | Integrations | Link and unlink a related item | MEDIUM |
| 13.3 | Integrations | Prime Contract Change Orders tab shows linked COs | HIGH |
| 14.1 | Edge Cases | Empty state appears when no events exist | MEDIUM |
| 14.2 | Edge Cases | Expand a row to see its line items | HIGH |

---

## Implementation Notes

- **Do not delete the old cases immediately.** Mark them `status = 'inactive'` in the DB so they're hidden but recoverable.
- **Rewrite merged tests** to have clear multi-step flows rather than just bolting two old tests together.
- The proposed list above removes the `scenario` vs `feature` distinction entirely — all tests become one unified set following the guided scenario format.
