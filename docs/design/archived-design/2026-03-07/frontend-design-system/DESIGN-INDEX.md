# Design System Index

Complete accounting of all design-related files in this project.

**Last updated:** 2026-03-02

---

## The Design System (SOURCE OF TRUTH)

All design decisions live here. Nowhere else.

| File | Purpose | Status |
|------|---------|--------|
| `frontend/src/design-system/README.md` | Entry point, quick start, decision tree | ACTIVE |
| `frontend/src/design-system/principles.md` | Design philosophy, hard constraints, card policy, spacing rhythm | ACTIVE |
| `frontend/src/design-system/page-archetypes.md` | 4 page types (Table, Form, Form Wide, Content) with copy-paste templates | ACTIVE |
| `frontend/src/design-system/tokens.md` | Colors, spacing, typography, shadows, borders, interactive states | ACTIVE |
| `frontend/src/design-system/components.md` | Component decision trees, layout components, modals, banned patterns | ACTIVE |
| `frontend/src/design-system/patterns.md` | Loading, errors, empty states, forms, modals, responsive patterns | ACTIVE |
| `frontend/src/design-system/DESIGN-INDEX.md` | This file — complete file accounting | ACTIVE |
| `frontend/src/design-system/form-page-archetype.md` | **Form tier system (Tier 1/2/3), sticky action bars, sidebar TOC, field grid rules, 13 anti-patterns** — Read before writing ANY form | ACTIVE |
| `frontend/src/design-system/premium-patterns.md` | Premium hierarchy techniques: surface elevation, KPI components, bento grids, the card trap, anti-patterns checklist | ACTIVE |
| `frontend/src/design-system/premium-examples.html` | Visual wrong-vs-right reference: live HTML examples of KPI cells, tables, navigation, inverted pyramid layout (dark mode) | ACTIVE |
| `frontend/src/design-system/premium-examples-light.html` | Same wrong-vs-right reference in light mode — matches Alleato's actual theme | ACTIVE |

---

## Layout Components (implementation)

These are the actual React components that implement the design system.

| File | Purpose | Status |
|------|---------|--------|
| `frontend/src/components/layout/PageContainer.tsx` | Page content wrapper with responsive padding and max-width | ACTIVE |
| `frontend/src/components/layout/FormContainer.tsx` | Centered form wrapper with max-width options | ACTIVE |
| `frontend/src/components/layout/page-header-unified.tsx` | Unified page header (exported as both `PageHeader` and `ProjectPageHeader`) | ACTIVE |
| `frontend/src/components/layout/PageToolbar.tsx` | Toolbar row for filters and page-level actions | ACTIVE |
| `frontend/src/components/layout/PageTabs.tsx` | Tab navigation for page sections | ACTIVE |
| `frontend/src/components/layout/PageTabsV2.tsx` | Updated tab navigation variant | ACTIVE |
| `frontend/src/components/layout/index.ts` | Barrel exports for all layout components | ACTIVE |

---

## Page Templates (implementation)

Actual code templates for scaffolding new pages.

| File | Purpose | Status |
|------|---------|--------|
| `frontend/src/components/templates/StandardFormPage.tsx` | Form page template component | ACTIVE |
| `frontend/src/components/templates/data-table-page.tsx` | Data table page template component | ACTIVE |
| `frontend/src/components/templates/index.ts` | Barrel exports | ACTIVE |

---

## Design Commands (tooling)

Slash commands for auditing and enforcing the design system.

| File | Purpose | Status |
|------|---------|--------|
| `.claude/commands/design/design-audit.md` | `/design:design-audit` — Full codebase design audit | ACTIVE |
| `.claude/commands/design/design-check.md` | `/design:design-check` — Quick single-file check | ACTIVE |
| `.claude/commands/design/design-fix.md` | `/design:design-fix` — Fix violations with verification | ACTIVE |
| `.claude/commands/design/design-fix-loop.md` | `/design:design-fix-loop` — Autonomous fix loop | ACTIVE |
| `.claude/commands/design/design-verify.md` | `/design:design-verify` — Verify fixes still hold | ACTIVE |
| `.claude/commands/design/design-report.md` | `/design:design-report` — Generate compliance report | ACTIVE |
| `.claude/commands/design/designer.md` | `/design:designer` — Creative frontend design skill | ACTIVE |
| `.claude/commands/design/design-alleato.md` | `/design:design-alleato` — Alleato-specific design skill | ACTIVE |

---

## CLAUDE.md Reference

The project `CLAUDE.md` contains a pointer to this design system under the `## UI/UX Design Standards` section. It does NOT contain inline design rules — those all live in the design system files above.

---

## Files DELETED (consolidated into design system)

These files were removed on 2026-03-02 because their content was consolidated into the design system:

| Deleted File | Reason | Content Moved To |
|-------------|--------|------------------|
| `frontend/src/components/ui/UNIFIED-COMPONENTS-USAGE.md` | Modal/slideover docs scattered in component dir | `components.md` + `patterns.md` |
| `frontend/src/components/templates/FORM-PAGE-PATTERN.md` | Form pattern doc duplicated in template dir | `page-archetypes.md` (Form Page archetype) |
| `frontend/src/components/project/IMPLEMENTATION-GUIDE.md` | Component-specific guide, not system-level | N/A (component-specific, JSDoc in component) |
| `frontend/src/components/project/ProjectCreatedModal.README.md` | Component-specific README, not system-level | N/A (component-specific) |
| `.claude/agents/design-system-auditor.md` | Replaced by design system + design commands | `tokens.md` (consistency matrix) + design commands |

---

## BMAD Design Workflows (kept, separate purpose)

These BMAD files exist for strategic UX planning workflows, NOT for implementation-level design rules. They are separate from the design system.

| File | Purpose |
|------|---------|
| `_bmad/bmm/agents/ux-designer.md` | Sally the UX Designer agent (strategic UX work) |
| `_bmad/cis/agents/design-thinking-coach.md` | Design thinking facilitation |
| `_bmad/bmm/workflows/2-plan-workflows/create-ux-design/` | UX design workflow steps |

**These do NOT define the design system. They're planning tools.**

---

## Rules for Adding New Design Docs

1. **If it's about how the UI should look/behave** → Add to the existing design system files
2. **If it's a new page archetype** → Add to `page-archetypes.md`
3. **If it's a new component pattern** → Add to `components.md` or `patterns.md`
4. **If it's a new design token** → Add to `tokens.md`
5. **NEVER** create a new standalone .md file for design guidance outside this folder
6. **NEVER** put design rules inline in CLAUDE.md — the pointer is sufficient
