# Design Audit Summary

## Scope
- Pages/areas reviewed:
  - `/command-center`
  - `/[projectId]/home`
- Files sampled:
  - `frontend/src/app/(admin)/command-center/page.tsx`
  - `frontend/src/app/(main)/[projectId]/home/page.tsx`
  - `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx`
  - `frontend/src/app/(main)/[projectId]/home/project-home-client.tsx`

## Coverage Checklist
- Button, Link: sampled on both pages.
- Input, Select, Textarea: sampled on `/command-center`.
- Checkbox: sampled on `/command-center`.
- Badge/Tag, Avatar: sampled on both pages.
- Card/List: sampled on both pages.
- Modal/Drawer: sampled on `/command-center` dialog and `/[projectId]/home` sheet.
- Tooltip/Popover: sampled on `/command-center`.
- Empty state: sampled on `/[projectId]/home`.
- Page shell/section shell: sampled on both pages.

## Strengths
- Both pages use some shared primitives instead of being fully raw: `Button`, `StatusBadge`, `EmptyState`, `PageShell`, `ContentSectionStack`, `Sheet`, `Dialog`, `Popover`, `Tooltip`, `Checkbox`, `Input`, `Select`, `Textarea`, and `Avatar`.
- `/[projectId]/home` already has a meaningful local abstraction boundary around command-center content sections, so it is a good candidate for extracting project-dashboard primitives instead of rewriting every section independently.
- `/command-center` already centralizes some repeated board choices in constants such as `COLUMNS`, `PRIORITY_CONFIG`, and `DENSITY_CONFIG`; this makes it straightforward to move those choices into shared Kanban primitives.

## Inconsistencies
- `/command-center` hard-codes workflow column colors in page-local data (`bg-amber-500/5`, `bg-blue-500/5`, `bg-violet-500/5`, `bg-emerald-500/5`) instead of a shared board/status token. Evidence: `frontend/src/app/(admin)/command-center/page.tsx:113`.
- `/command-center` hard-codes priority dot colors (`bg-red-600`, `bg-red-400`, `bg-amber-400`, `bg-blue-400`) instead of using semantic status tokens. Evidence: `frontend/src/app/(admin)/command-center/page.tsx:144`.
- `/command-center` has page-local density styling for cards (`p-2`, `space-y-1`, `text-xs`, etc.) rather than a reusable `DensityControl` plus `KanbanCard` variant API. Evidence: `frontend/src/app/(admin)/command-center/page.tsx:175`.
- `/command-center` uses raw headings and typography in the page header (`h1`, `text-xl`, `text-sm`, `mt-0.5`) instead of a shared admin/page header primitive. Evidence: `frontend/src/app/(admin)/command-center/page.tsx:524`.
- `/command-center` manually builds filter rows with `label`, raw spacing, and hover styling around `Checkbox`, instead of a shared `CheckboxListItem` or filter-menu primitive. Evidence: `frontend/src/app/(admin)/command-center/page.tsx:573`.
- `/command-center` manually overrides selected segmented button states with `bg-foreground text-background` inside each `Button`. This bypasses the component variant system. Evidence: `frontend/src/app/(admin)/command-center/page.tsx:633`.
- `/command-center` implements Kanban columns, empty column actions, sortable cards, status chips, source chips, assignee avatars, and card actions all in the page file. These are reusable product primitives, not route-owned styling. Evidence: `frontend/src/app/(admin)/command-center/page.tsx:779` and `frontend/src/app/(admin)/command-center/page.tsx:941`.
- `/command-center` uses native `title` attributes for priority and assignee hints, which bypasses the app tooltip system and creates browser-native black tooltips. Evidence: `frontend/src/app/(admin)/command-center/page.tsx:977` and `frontend/src/app/(admin)/command-center/page.tsx:1007`.
- `/[projectId]/home` defines `SectionHeading` locally with raw typography (`text-[11px]`, `uppercase`, `tracking-wider`) instead of using existing semantic heading classes or a shared section heading primitive. Evidence: `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:168`.
- `/[projectId]/home` uses oversized page-title typography (`text-4xl`, `sm:text-5xl`) directly in the page component instead of the project page header pattern. Evidence: `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:266`.
- `/[projectId]/home` uses a decorative visual effect in the command surface (`rotate-12`, `bg-primary/10`, `blur-xl`), which conflicts with the premium minimal baseline and design-system instruction against decorative orbs/blobs. Evidence: `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:323`.
- `/[projectId]/home` has an inline `style={{ borderStyle: "dashed", borderWidth: 1 }}` for the prime-contract empty link, which is direct raw styling and should be represented by a shared dashed action/empty-link variant. Evidence: `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:659`.
- `/[projectId]/home` manually styles data cards with `rounded-xl bg-primary/5 p-4` and custom stat-label typography instead of using a shared `SummaryPanel`, `MetricTile`, or `RecordPreview` component. Evidence: `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:676`.
- `/[projectId]/home` has a stale alternate home implementation file that is not imported by the route entry. It contains additional drift and should not be included in future audit counts until either deleted or confirmed reachable. Evidence: `frontend/src/app/(main)/[projectId]/home/page.tsx` imports `ProjectCommandCenter` from `project-command-center`, while `project-home-client.tsx` remains separate.

## Gaps
- Missing shared `SectionHeading` / `SectionHeader` usage contract for dashboard/detail sections.
- Missing shared `KanbanBoard`, `KanbanColumn`, `KanbanCard`, `BoardEmptyAction`, and `DensityControl` primitives for `/command-center`.
- Missing shared `FilterPopover` / `CheckboxFilterGroup` primitive for repeated filter menus.
- Missing shared `RecordPreview` or `SummaryPanel` primitive for project-home cards such as prime contract, invoices, and health cells.
- Missing shared `DashedActionLink` or empty-state inline action primitive.
- Missing guardrail for inline `style=` in app/page code.
- Missing guardrail for native `title=` tooltips when a visible UI element should use the app `Tooltip`.
- Missing guardrail against page-local status color maps that use raw Tailwind hues instead of semantic tokens.

## Risks
- Page-local color maps will keep producing one-off status and workflow colors that do not match `StatusBadge` or semantic status tokens.
- Raw typography will continue to drift because section headings, micro-labels, and page titles are being recreated per page.
- Custom Kanban/card/list implementations will make future audit/fix work expensive because visual fixes have to be repeated in each page file.
- Native `title` tooltips will keep producing inconsistent browser-owned tooltip styling.
- Stale route-adjacent files can create false audit positives unless the audit maps route imports before sampling.

## Recommended Next Steps
- Treat this sample as a valid signal: the skill is picking up real issues, including raw styling, local primitives, native tooltips, and stale render paths.
- Run the next scoped pass against one table page and one form page so the audit covers data grids and line-item forms, not just dashboard/board surfaces.
- Use `building-components` after the next audit pass to create the missing shared primitives before migrating pages.
- Add design-system ratchets for `style=`, native `title=`, raw hue status maps, and page-local reusable component definitions.
- Start remediation with `/command-center` because it has the clearest extraction boundary: `KanbanBoard`, `KanbanColumn`, `KanbanCard`, `DensityControl`, and `FilterPopover`.

## Appendix: Key Evidence
- `frontend/src/app/(admin)/command-center/page.tsx:113` page-local workflow color map.
- `frontend/src/app/(admin)/command-center/page.tsx:144` page-local priority color map.
- `frontend/src/app/(admin)/command-center/page.tsx:175` page-local density styles.
- `frontend/src/app/(admin)/command-center/page.tsx:524` raw page header.
- `frontend/src/app/(admin)/command-center/page.tsx:573` custom checkbox filter rows.
- `frontend/src/app/(admin)/command-center/page.tsx:633` component variant bypass for selected density buttons.
- `frontend/src/app/(admin)/command-center/page.tsx:779` page-local Kanban column primitive.
- `frontend/src/app/(admin)/command-center/page.tsx:941` page-local Kanban card primitive.
- `frontend/src/app/(admin)/command-center/page.tsx:977` native tooltip via `title`.
- `frontend/src/app/(main)/[projectId]/home/page.tsx:5` live home render path points to `project-command-center`.
- `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:168` local section heading primitive.
- `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:266` page-local identity/header primitive.
- `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:323` decorative blurred surface styling.
- `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:659` inline style usage.
- `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:676` page-local record preview/card styling.
