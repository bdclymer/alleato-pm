# Review Checklists

Use these checklists before approving design work.

## Universal UI Gate

Fail the design if any answer is no:

- Is there one primary purpose?
- Is the primary action obvious in five seconds?
- Is the next useful action visible or naturally focused?
- Is the surface using an existing pattern or primitive?
- Is secondary information hidden or demoted?
- Does every visible element support the current job?
- Is there no duplicated action or duplicated information?
- Is the empty/error state clear and recoverable?
- Can the user correct mistakes without starting over?
- Does the page preserve momentum after save/submit?

## Workflow Gate

Fail if any answer is no:

- Can the user complete the workflow's actual job from this surface?
- Can the user edit or correct the thing being reviewed?
- Can the user submit feedback, rejection reason, or correction details when the workflow is about quality/training?
- Is there a clear saved/submitted state?
- Is there a next-item or next-step path?
- Are entered comments or edits preserved if save fails?
- Does the keyboard path support the common workflow?
- Is the empty state actionable instead of merely descriptive?

## Keyboard Ergonomics Gate

Fail if any answer is no for repetitive input:

- Enter adds the next row/item when that is the natural action.
- Shift+Enter creates a newline when multiline text is supported.
- Tab moves to the next logical input.
- Shift+Tab moves backward.
- Arrow keys move across rows/cells where the surface is grid-like.
- Escape exits transient edit/popup state.
- Focus lands in the next useful place after save/add.

## Dropdown Gate

Fail if any answer is yes:

- More than five interactive rows?
- More than one heading?
- More than one divider?
- More than two visual sections?
- Tabs or segmented controls?
- Search or filters?
- Recent activity or feed content?
- Comment previews or record previews?
- Internal scrolling?
- Long description copy?
- Multiple primary actions?
- Footer link plus feed plus actions?
- Large switch control in a command menu?
- `text-lg` or larger menu rows?
- `py-4`, `py-5`, `h-12`, or larger row density?
- Width larger than the established menu pattern without a content reason?
- Does the result feel like a mobile settings panel instead of a compact desktop menu?
- Did the agent invent spacing or row treatment instead of matching an existing site menu?

## Popover Gate

Fail if any answer is yes:

- More than one primary job?
- More than two sections?
- Nested cards?
- Search/filter controls mixed with record previews?
- More than eight preview rows?
- Multiple footer links?
- Repeated actions from the page body?

## Sidebar Gate

Fail if any answer is yes:

- Multiple unrelated lists?
- Header actions duplicated from the trigger menu without reason?
- Metric cards before the workflow content?
- Global filters that belong on a full page?
- No link to the canonical full page when one exists?

## Implementation Gate

Before final response:

- Name the blessed pattern used.
- Name the existing reference surface copied.
- Name the user's next action and correction path.
- Name the keyboard behavior for repetitive workflows.
- Name anything removed or moved to another surface.
- Name any budget that still fails.
- Run `node .agents/skills/alleato-design-doctrine/scripts/audit-surface-complexity.mjs <changed-ui-file...>` for changed UI files.
- Browser-test the actual interacted surface.
- Capture a screenshot or browser artifact for visual changes.
- Report the exact audit command and result.
- Report what interaction was tested, not only which code changed.
- If browser testing cannot run, state the blocker and do not claim visual verification.
