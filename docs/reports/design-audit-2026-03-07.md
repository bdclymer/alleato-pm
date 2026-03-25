# Design Audit Report — 2026-03-07

**Scope:** Full codebase — all pages under `frontend/src/app/(main)/`
**Auditor:** Claude Code (`/design-audit` skill)
**Violations found:** 25
**Violations fixed:** 22
**Deferred:** 3

---

## Audit Philosophy

This audit applied a single governing question to every element on every page:

> **Does this element earn its space?** Every pixel on a page competes for user attention. An element must answer at least one of: "What does the user need to know?" or "What might they want to do?" — or it gets removed.

The goal is a **premium minimalist feel**: information-dense where it matters, silent where it doesn't.

---

## Violations Fixed

### Critical — Layout Pattern

| ID | File | Problem | Fix Applied |
|----|------|---------|-------------|
| V003 | `daily-log/page.tsx` | Used deprecated `TableLayout + GenericDataTable` — no header, no search, no filters | Migrated to `UnifiedTablePage`. Created `daily-log-client.tsx`. |
| V004 | `pipeline/page.tsx` | `PageContainer` wrapped `ProjectPageHeader` — wrong DOM order | Corrected to `<><ProjectPageHeader/><PageContainer>` |

### High — Visual Noise

| ID | File | Problem | Fix Applied |
|----|------|---------|-------------|
| V007 | `drawings/board/page.tsx` | 3 stat Cards duplicated board column counts already visible | Removed stats grid entirely |
| V006 | `drawings/areas/page.tsx` | 3 individual stat Cards added border noise | Replaced with `<KpiRow>` from ds/ |
| V019 | `drawings/areas/page.tsx` | "Selected Area Details" panel duplicated area selector content | Removed |
| V008 | `pipeline/page.tsx` | "Status Guide" card explained badge colors — developer docs in the UI | Removed |
| V009 | `photos/page.tsx` | Storage metadata card exposed Supabase bucket name and folder path to users | Removed; count/size surfaced in header description |

### High — Header Action Violations

| ID | File | Problem | Fix Applied |
|----|------|---------|-------------|
| V011 | `rfis/rfis-client.tsx` | Export button in header alongside Create | Removed from header |
| V023 | `rfis/rfis-client.tsx` | Export dropdown items had no handlers | Removed |
| V012 | `commitments/page.tsx` | Export button in header alongside Create | Removed from header |
| V013 | `submittals/page.tsx` | Export button in header alongside Add | Removed from header |
| V024 | `submittals/page.tsx` | Export dropdown items had no handlers | Removed |

### High — Hardcoded Colors (Design Token Violations)

| ID | File | Problem | Fix Applied |
|----|------|---------|-------------|
| V014 | `hero-metrics.tsx` | `text-neutral-*`, `border-neutral-200`, `text-brand`, `shadow-md` | → `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`, `shadow-sm` |
| V015 | `drawings/board/page.tsx` | `bg-emerald-50 border-emerald-200`, `bg-amber-50`, `bg-white` | → `bg-success/5 border-success/20`, `bg-warning/5`, `bg-background` |
| V016 | `pipeline/page.tsx` | Dynamic `text-${color}-600` (production bug), `bg-blue-500`, `bg-purple-100` | Static `phaseIconClass` map, → `bg-primary`, `bg-muted` |

### High — Non-Standard Pattern

| ID | File | Problem | Fix Applied |
|----|------|---------|-------------|
| V010 | `specifications/page.tsx` | `Card` wrapper around filter toolbar — visual noise | Removed Card; inline flex toolbar. `any` type fixed. |
| V018 | `specifications/page.tsx` | `area: any` TypeScript violation | → `SpecArea` interface |

### Medium

| ID | File | Problem | Fix Applied |
|----|------|---------|-------------|
| V017 | `documents/page.tsx` | `Card` wrapping "Coming soon" placeholder text | → `EmptyState` from ds/ |
| V021 | `global-header.tsx` | "Favorites" and "Apps" buttons had no functionality | Removed |
| V022 | `global-header.tsx` | Brand label read "PROCORE" (competitor's name) | Changed to "ALLEATO" |

---

## Violations Deferred

These require broader design decisions — not pure code fixes.

| ID | File | Problem | Why Deferred |
|----|------|---------|-------------|
| V001 | `home/page-tools-grid.tsx` | Home page uses `AppShell` — wrong navigation chrome | Requires full home page redesign |
| V002 | `home/page-test.tsx` | Dev test file using `AppShell` | Blocker on V001; candidate for deletion |
| V005 | `budget/setup/page.tsx` | Bespoke `Container+Stack` header instead of `ProjectPageHeader` | Requires UX decision on back navigation pattern for form pages |

---

## Pattern Reference — What Good Looks Like

### List Page (reference: `change-events/page.tsx`)
```
ProjectPageHeader
  title + single primary action button
UnifiedTablePage
  tabs (status tabs)
  toolbar (search + filters + column visibility + export)
  table (rows)
  footer totals (if financial)
  pagination
```

### Detail Page (reference: `commitments/[commitmentId]/page.tsx`)
```
ProjectPageHeader
  title + status badge + edit/back actions
PageContainer
  KpiRow (key metrics)
  SectionHeader + content blocks
```

### Form Page (reference: `rfis/new/page.tsx`)
```
ProjectPageHeader
  title + Cancel/Save actions
PageContainer (or FormContainer)
  form fields
```

---

## Open Issues Post-Audit

1. **Home page architecture** — `AppShell` must be removed. Home page needs to be rebuilt using the standard layout. The current home page at `page-tools-grid.tsx` shows a tools grid with hardcoded project data — this needs to integrate with `useProject()` context.

2. **Budget Setup back navigation** — The bespoke header at `budget/setup/page.tsx` includes a back button. `ProjectPageHeader` doesn't natively support back buttons. Either add a `backHref` prop to `ProjectPageHeader`, or use a secondary action button pattern.

3. **RFIs export** — Export was removed from header because it wasn't functional. When export is implemented, it should use `toolbar.onExport` with `features.enableExport = true` on `UnifiedTablePage`.

4. **Submittals export** — Same as RFIs.

5. **Specifications** — The filter toolbar is now inline and clean, but the page still uses `SpecificationListTable` rather than `UnifiedTablePage`. A full migration would make it consistent with all other list pages. Deferred because `SpecificationListTable` has custom rendering that would need to be ported.

---

## Design System Source of Truth

Rules doc: `.claude/design-audit/design-system-rules.md`
Violations log: `.claude/design-audit/violations.json`

The design system rules document is the authoritative reference for:
- Page layout patterns
- Component import rules
- Color token substitution table
- Visual noise standards
- Header action rules
- Non-functional UI policy
