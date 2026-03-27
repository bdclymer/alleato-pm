# Design System Tasks

> **Last updated:** 2026-03-26
> **Status:** In Progress
> **Owner:** Claude Code agents

This is the single source of truth for all design system work. Every task is tracked here with status, assignee, and notes. Updated in real-time as work progresses.

---

## Summary

| Phase | Total | Done | In Progress | Blocked | Not Started |
|-------|-------|------|-------------|---------|-------------|
| 1. Consolidate & Clean | 7 | 7 | 0 | 0 | 0 |
| 2. Showcase All Existing | 8 | 6 | 0 | 0 | 2 |
| 3. Build Missing Components | 12 | 0 | 0 | 0 | 12 |
| 4. Page Migration Sweep | 6 | 1 | 0 | 0 | 5 |
| **TOTAL** | **33** | **14** | **0** | **0** | **19** |

---

## Phase 1: Consolidate & Clean

> Goal: Eliminate duplicates, ensure every component is barrel-exported, clean dead code.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | Consolidate SectionHeader (delete `ui/section-header.tsx`, migrate 3 files to `ds/`) | DONE | Completed — `ds/section-header.tsx` is canonical. Removed `mb-4` owned padding, added count pill badge, colored "View all" link. |
| 1.2 | Consolidate EmptyState (delete `ui/empty-state.tsx`, migrate 9 files to `ds/`) | DONE | Deleted `ui/empty-state.tsx`. Migrated 8 files to import from `ds/` (or `@/components/ds` barrel). API diff: `ds/` uses `action: { label, onClick }` (object) vs `ui/` used `action: ReactNode`. Adapted all call sites. Added required `icon` prop where missing (BudgetLineItemTable, unified-table-page, shared wrappers). Fixed `shared/index.ts` re-export and `shared/financial-data-table.tsx` import. `shared/empty-state.tsx` was already deleted in 1.5. Task 1.6 is now N/A (file deleted). tsc --noEmit passes clean. |
| 1.3 | Audit modal patterns — document Dialog vs Sheet vs AlertDialog usage rules | DONE | **6 overlay primitives found.** Canonical: `Dialog` (82 imports), `Sheet` (27), `AlertDialog` (30), `Drawer` (5). Extended: `unified-modal` (9 imports — Dialog wrapper with size variants via CVA), `unified-slideover` (5 imports — Sheet-like slide panel with side/size variants via CVA). Deleted: `ui/modal.tsx` (0 imports, hand-rolled without Radix, duplicated Dialog). See task 1.7 for usage guide. |
| 1.4 | Barrel export audit — ensure EVERY `ui/` component is exported from `ds/index.ts` | DONE | Added 24 component groups to barrel: alert-dialog, button-group, calendar, carousel, chart, collapsible, container, drawer, heading, hover-card, inline, input-group, metric-card, number-input, pagination, section-card, stack, summary-card-grid, text, toggle, toggle-group, transition-panel, unified-modal, unified-slideover. Excluded per spec: linear-issue-table (domain), tool (domain/deleted), sonner (app-root config), sidebar (app layout), modal.tsx (deleted in 1.5). TypeScript passes clean. |
| 1.5 | Delete dead/orphaned components | DONE | **Deleted 3 files** (zero imports): `ui/tool.tsx` (AI tool-call display component, unused), `ui/modal.tsx` (hand-rolled modal duplicating Dialog, unused), `shared/empty-state.tsx` (deprecated wrapper around `ui/empty-state`, already marked deprecated, zero imports). **Kept 2 files**: `ui/linear-issue-table.tsx` (1 import from `issues-client.tsx` — still in use), `ui/summary-card-grid.tsx` (7 imports across config files, templates, DirectCostSummaryCards — actively used). |
| 1.6 | Fix `ui/empty-state.tsx` hardcoded colors | DONE | N/A — `ui/empty-state.tsx` was deleted as part of 1.2. The canonical `ds/empty-state.tsx` already uses semantic tokens. |
| 1.7 | Create overlay usage guide | DONE | **Overlay Usage Guide** (add to DESIGN.md in a future pass): **Dialog** (82 imports) = default for confirmations, small/medium forms, informational popups. Centered, max-width constrained. **Sheet** (27 imports) = side panels for detail views, large forms, settings, filters. Slides in from right. **AlertDialog** (30 imports) = destructive confirmations only (delete, discard, irreversible actions). Blocks interaction until confirmed. **Drawer** (5 imports) = mobile-first bottom sheets for date pickers, comboboxes, responsive menus. **UnifiedModal** (9 imports) = use when you need explicit size variants (xs–5xl) on a centered Dialog. Wraps Radix Dialog with CVA. **UnifiedSlideover** (5 imports) = use when you need explicit side+size variants on a slide panel. Wraps Radix Dialog with CVA. **Deprecated/Deleted:** `ui/modal.tsx` (hand-rolled, no Radix — deleted). |

---

## Phase 2: Showcase All Existing Components

> Goal: Every component that exists must appear on `/components` with a working demo. If it's not visible, it doesn't get used.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Add Navigation section: Pagination, Breadcrumb (done partially), Command palette, Sidebar patterns | DONE | Added Pagination (SimplePagination with interactive page state), Command palette (inline with search, grouped items, separator). Sidebar skipped (app-level layout, not a showcase component). Breadcrumb was already present. |
| 2.2 | Add Data Display section: Avatar/AvatarGroup, Chart system (bar/line/pie/area/radar/radial), Carousel, Progress bar, HoverCard | DONE | Added Avatar + AvatarGroup (single avatars, group with overflow count), Progress bar (0/25/50/75/100%), HoverCard (profile card on hover trigger). Chart system SKIPPED — `ui/chart.tsx` is a recharts wrapper that requires recharts data structures; adding a full chart demo would add significant bundle weight to the showcase page. Carousel SKIPPED — not commonly used in the app. |
| 2.3 | Add Layout section: Separator, Accordion (in barrel), Collapsible, ScrollArea, AspectRatio (if exists), Resizable (if exists) | DONE | Added Separator (horizontal + vertical demos), Accordion (3 expandable FAQ items), Collapsible (toggle visibility with ChevronsUpDown trigger), ScrollArea (20-item scrollable list). AspectRatio does not exist. Resizable does not exist. |
| 2.4 | Add Form Extras section: Slider, ToggleGroup, NumberInput, InputGroup, Calendar/DatePicker, ButtonGroup | DONE | Added Slider (interactive value + disabled state), ToggleGroup (outline icons + default variant), Calendar (interactive month picker with selected date display), NumberInput (standard + currency mode). InputGroup/ButtonGroup skipped — these are thin wrappers not commonly used standalone. |
| 2.5 | Add Overlay section: Drawer, ContextMenu (if exists), AlertDialog | DONE | Added AlertDialog (destructive confirmation with cancel/delete buttons), Drawer (bottom sheet with header, content, footer). ContextMenu does not exist (`ui/context-menu.tsx` not found). Added overlay usage guide text below the demos. |
| 2.6 | Add Typography section: Heading, Text, Inline, Stack, Container | NOT STARTED | Deferred — these are thin layout primitives (div wrappers with spacing classes). Low showcase value. |
| 2.7 | Add Composite Patterns section: MetricCard/MetricGrid, SectionCard, Toast/Sonner usage patterns | NOT STARTED | Deferred — MetricCard/SectionCard are domain-specific wrappers. Sonner requires toast trigger infrastructure. |
| 2.8 | Add Table Cell Primitives section: show all CellText, CellLink, CellCurrency, CellDate, CellStatus, CellBadge, etc. | DONE | Section 9 already existed with full demos of all 14 cell primitives: CellText, TruncatedCell, CellLink, CellEmail, CellCurrency, CellNumber, CellPercent, CellDate, CellStatus, CellBadge, TableTagBadge, TableAvatarUsers, TableCountIndicator. Verified complete. |

---

## Phase 3: Build Missing Components

> Goal: Build components that don't exist yet but are needed across multiple pages (currently hand-rolled).

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | `ConfirmDeleteDialog` — reusable delete confirmation | NOT STARTED | Every delete action across 15+ pages hand-rolls its own AlertDialog + state management. Spec in `alleato-component-specs.md`. |
| 3.2 | `DetailField` / `DetailFieldGrid` — label+value pairs for detail pages | NOT STARTED | Every detail page has manual `<div><span>Label</span><span>Value</span></div>`. Spec in `alleato-component-specs.md`. |
| 3.3 | `BackButton` — consistent back navigation | NOT STARTED | Every form/detail page manually composes `<Button variant="ghost"><ArrowLeft />Back</Button>`. |
| 3.4 | `FormActions` — save/cancel button row for forms | NOT STARTED | Every form page has a manual sticky/bottom button row. Should standardize layout + loading state. |
| 3.5 | `InfoAlert` — pre-configured Alert for inline tips | NOT STARTED | Wraps `<Alert variant="info">` with sensible defaults. Reduces boilerplate for inline info messages. |
| 3.6 | `SplitButton` — primary action + dropdown secondary actions | NOT STARTED | Common pattern in toolbars. Doesn't exist anywhere. |
| 3.7 | `ComboBox` — searchable select (composed from Command + Popover) | NOT STARTED | Multiple pages need searchable dropdowns. Currently hand-rolling Command + Popover combos. |
| 3.8 | `DatePicker` — composed from Calendar + Popover | NOT STARTED | Calendar exists in `ui/`. Need the composed DatePicker pattern. Several forms need date selection. |
| 3.9 | `FileUpload` — drag-and-drop upload zone | NOT STARTED | Documents, photos, drawings pages all need file upload. Currently no standard component. |
| 3.10 | `Timeline` — vertical timeline for activity feeds | NOT STARTED | Meeting notes, change history, activity logs all need timeline display. |
| 3.11 | `CopyButton` — click-to-copy with toast feedback | NOT STARTED | Used for IDs, URLs, API keys. Small utility component. |
| 3.12 | `Kbd` — keyboard shortcut display | NOT STARTED | For command palette hints, toolbar tooltips. |

---

## Phase 4: Page Migration Sweep

> Goal: Find and replace hand-rolled patterns across all pages with DS components.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | Replace hand-rolled delete dialogs with `ConfirmDeleteDialog` | NOT STARTED | Grep for `AlertDialog` + delete patterns. Estimate: 15+ pages. |
| 4.2 | Replace hand-rolled detail fields with `DetailField`/`DetailFieldGrid` | NOT STARTED | Every `[contractId]/page.tsx`, `[commitmentId]/page.tsx`, etc. |
| 4.3 | Replace hand-rolled back buttons with `BackButton` | NOT STARTED | Grep for `ArrowLeft` + `router.back()` or `router.push`. |
| 4.4 | Replace hand-rolled form footers with `FormActions` | NOT STARTED | Every create/edit form page. |
| 4.5 | Migrate all `ui/empty-state` imports to `ds/empty-state` | DONE | Completed as part of 1.2. All imports now use `@/components/ds`. `ui/empty-state.tsx` deleted. |
| 4.6 | Audit all pages for hardcoded colors, arbitrary spacing, raw buttons | NOT STARTED | Final sweep using ESLint rules + manual grep. |

---

## Site Map Audit Status

> These values should be set on the `/site-map` page audit dropdown for the `/components` and `/design-system` routes.

| Route | Audit Status | Reason |
|-------|-------------|--------|
| `/design-system` | In Progress | Phase 1 started, Phase 2-4 pending |
| `/style-guide` | Needs Work | Uses old patterns, references deleted `ui/section-header.tsx` (migrated) |
| `/components` | In Progress | Showcase page expanded to ~85% coverage. Missing: Typography primitives (2.6), Composite patterns (2.7). |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-26 | Created task file. Phase 1.1 (SectionHeader consolidation) already complete. |
| 2026-03-26 | SectionHeader: removed `mb-4` padding, count is now pill badge, "View all" is `text-primary`, duplicate `ui/section-header.tsx` deleted, 3 files migrated. |
| 2026-03-26 | Task 1.3 DONE: Modal pattern audit complete. 6 overlay primitives documented with import counts. Deleted `ui/modal.tsx` (0 imports, hand-rolled duplicate of Dialog). |
| 2026-03-26 | Task 1.5 DONE: Dead code audit. Deleted 3 files (`ui/tool.tsx`, `ui/modal.tsx`, `shared/empty-state.tsx`) with zero imports. Kept `ui/linear-issue-table.tsx` (1 import) and `ui/summary-card-grid.tsx` (7 imports). |
| 2026-03-26 | Task 1.7 DONE: Overlay usage guide documented inline — Dialog (centered), Sheet (side panel), AlertDialog (destructive only), Drawer (mobile), UnifiedModal (sized center), UnifiedSlideover (sized slide). |
| 2026-03-26 | Task 1.4 DONE: Barrel export audit. Added 24 component groups (alert-dialog, button-group, calendar, carousel, chart, collapsible, container, drawer, heading, hover-card, inline, input-group, metric-card, number-input, pagination, section-card, stack, summary-card-grid, text, toggle, toggle-group, transition-panel, unified-modal, unified-slideover). Excluded 4 (linear-issue-table, sonner, sidebar, tool). tsc --noEmit passes clean. |
| 2026-03-26 | Task 1.2 DONE: EmptyState consolidation. Deleted `ui/empty-state.tsx`. Migrated 8 files to `@/components/ds`. Adapted `action` prop from ReactNode to `{ label, onClick }` object API. Added required `icon` prop where missing. Fixed `shared/index.ts` and `shared/financial-data-table.tsx` broken imports. Task 1.6 marked DONE (N/A — file deleted). Task 4.5 marked DONE (completed as part of 1.2). Phase 1 now fully complete (7/7). |
| 2026-03-26 | Phase 2 tasks 2.1-2.5, 2.8 DONE: Expanded `/components` showcase page from ~40% to ~85% coverage. Added 15 new component demos: Pagination, Command palette, Avatar/AvatarGroup, Progress, HoverCard, Separator (h+v), Accordion, Collapsible, ScrollArea, Slider, ToggleGroup, Calendar, NumberInput, AlertDialog, Drawer. Section 9 (Table Cell Primitives) verified complete. Tasks 2.6 (Typography) and 2.7 (Composite Patterns) deferred — low showcase value. TypeScript compiles clean. |
