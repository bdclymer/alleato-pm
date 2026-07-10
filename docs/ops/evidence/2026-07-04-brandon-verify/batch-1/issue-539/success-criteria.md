# Issue #539 Success Criteria

Issue: I should be able to sort these and roll it up by company.
Route: http://localhost:3001/876/directory

## Scope
- Verify the project directory page at `/876/directory`.
- Verify the Subcontractors table supports row sorting.
- Verify the Subcontractors table can switch between flat contact rows and a company roll-up view.
- Verify the roll-up view groups by company and keeps contacts expandable under each company.

## Flow 1: Sort the Subcontractors table
- Action: Open `/876/directory` and sort the Subcontractors table by clicking a sortable column header such as Company or Name.
- Expected outcome: The table reorders visibly without a page error or stale state.
- Quality bar: The visible order must change in the direction selected and remain stable after the table rerenders.

## Flow 2: Roll up by company
- Action: Open `/876/directory` and change the Subcontractors view to `By company`.
- Expected outcome: The table collapses to one row per company, with company rows sorted alphabetically and a visible way to expand multiple-contact companies.
- Quality bar: The roll-up must reduce row duplication across contacts and keep company-level rows actionable.

## Flow 3: Expand company rows in roll-up view
- Action: In `By company` view, expand a company with multiple contacts.
- Expected outcome: The nested contact list appears under that company and shows the linked contact names/details.
- Quality bar: The expanded content must belong to the selected company and not bleed into neighboring rows.

## Field / control inventory
| Control | Type | Editable in UI? | Source of truth | Expected value for verification |
| --- | --- | --- | --- | --- |
| Sortable column headers | User input | Yes | Table sort state in the directory page / service query | Clicking should change row order and, for company sorting, show alphabetical ordering by company name |
| Group-by selector | User input | Yes | `groupBy` state in the directory page / `group_by` query behavior | `none` and `company`; `company` should render the roll-up view |
| Expand chevron in grouped rows | User input | Yes, conditionally | Grouped row expansion state | Expands only when a company has multiple contacts |

## Evidence requirements
- Capture a screenshot of the default Subcontractors table.
- Capture a screenshot of the table after sorting.
- Capture a screenshot of the `By company` roll-up view.
- Capture a screenshot of an expanded grouped company row if a multi-contact company is available.
- Record a video if the browser session supports it.
