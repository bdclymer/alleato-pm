# Issue #550 Success Criteria

**Route:** `http://localhost:3001/876/change-events`
**Issue:** Change Events should expose a settings function so changes can be made, similar to Procore.
**Classification target:** Decide whether the current route truth is `Verified fixed`, `Not fixed`, `Deferred`, or `Unproven`.

## Procore-aligned expectation

The Change Events list route should expose a genuine settings surface for tool configuration or project-level change-management settings. A generic table-settings popover is not sufficient unless it actually persists product settings that affect the Change Events workflow.

## Flow 1: Open the exact route and inspect for a settings affordance

- **Action:** Open `/876/change-events` and inspect the toolbar, header, and overflow menus for a settings entry point.
- **Expected outcome:** A clearly labeled Change Events settings control is visible and reachable on the exact route.
- **DB check:** N/A. This is a read-only route inspection. If a settings surface exists, follow-up verification should identify its write target and persistence behavior before classifying it as fixed.
- **Quality bar:** Pass only if the route exposes a settings affordance that is specific to Change Events or project change-management settings, not just table layout/column controls.

## Flow 2: Open the settings surface and confirm it is functional

- **Action:** Click the settings affordance from the route and attempt to make a change.
- **Expected outcome:** The settings UI opens, allows an actual configuration change, and saves or applies that change without redirecting to an unrelated surface.
- **DB check:** If a settings save exists, verify the target record/table and confirm the saved values match the interaction exactly. If no save exists, document the gap as product ambiguity/deferred scope.
- **Quality bar:** Pass only if the change persists or clearly applies to Change Events behavior in a way that matches Procore-like settings ownership.

## Field inventory

Current route truth suggests this page is a list view rather than a settings form.

| Field / control | Type | Editable in UI? | Source of truth | Expected persisted value |
| --- | --- | --- | --- | --- |
| Change Events toolbar controls | Read-only display / navigation | No | Page-level list toolbar | None |
| Generic table settings popover, if present | UI preferences only | Conditionally | Table layout state | Not a Change Events settings save |
| Dedicated Change Events settings surface | Missing in current app truth | No | N/A | N/A |

## Classification rule

- **Verified fixed:** A real Change Events settings function exists on the exact route and can persist or apply a settings change.
- **Not fixed:** The route still lacks a real settings function and only exposes list/table controls.
- **Deferred:** The product intentionally does not expose a settings surface on this route.
- **Unproven:** A settings surface is present but not yet exercised end to end.
