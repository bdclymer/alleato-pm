# Issue 549 Success Criteria

**Issue:** Change Events `/876/change-events`
**Route:** `http://localhost:3001/876/change-events`
**Classification under test:** horizontal scroll bar / left-right scrolling affordance at narrow width

## Scope

This audit is a pure UI verification. There are no form fields, database writes, or API mutations in scope for this issue.

## Flow 1: Narrow viewport table scrolling

- **Action:** Open the exact Change Events route at a narrow desktop width where the table columns cannot fit in the viewport.
- **Expected outcome:** The Change Events table becomes horizontally scrollable, and the user can move the table left and right to see hidden columns.
- **DB check:** Not applicable. This issue does not create, update, or delete data.
- **Quality bar:** Pass only if the table is not clipped with no horizontal affordance. The page must expose a real horizontal scrolling container; `scrollWidth` must exceed `clientWidth`, and the table content must be reachable by horizontal scrolling.

## Verification criteria

- The route loads successfully at `/876/change-events`.
- At a narrow viewport, the table shows horizontal overflow rather than compressing all columns into one static view.
- A user can reveal off-screen columns by horizontal scrolling.
- The route should not require a login reroute or any alternate page to demonstrate the behavior.

## Field inventory

No editable fields are part of this audit.

## Notes

This issue is considered fixed only if the exact route shows the scrollable table behavior in the live browser session and the evidence captures the narrow-width state.
