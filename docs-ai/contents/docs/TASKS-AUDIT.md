# TASKS-AUDIT.md
*Generated from frontend quality audit — 2026-03-16*

---

## Legend
- `[ ]` = Not started
- `[x]` = Complete
- `[~]` = In progress
- `[s]` = Skipped

Priority tiers: **P0** (immediate) → **P1** (this sprint) → **P2** (next sprint) → **P3** (long-term)

---

## P0 — Immediate: Core Primitive Fixes (Dark Mode Killers)

These 5 files affect every form, card, and detail panel in the app.

- [x] **AUDIT-001** `components/ui/input.tsx` — Replace `bg-white dark:bg-white` → `bg-background`
- [x] **AUDIT-002** `components/ui/select.tsx` — Replace `bg-white dark:bg-white` → `bg-background`
- [x] **AUDIT-003** `components/ui/textarea.tsx` — Replace `bg-white` → `bg-background`
- [x] **AUDIT-004** `components/ui/section-card.tsx` — Replace `bg-white border-neutral-200/80` → `bg-card border-border`
- [x] **AUDIT-005** `components/ui/metric-card.tsx` — Replace `bg-white border-neutral-200/80` → `bg-card border-border`
- [x] **AUDIT-006** `components/tables/unified/detail-panel.tsx` — Replace `backgroundColor: "#FAFCFF"` → CSS variable `hsl(var(--card))`
- [x] **AUDIT-007** `components/project-home/loading-skeleton.tsx` — Replace `bg-white` → `bg-background`

---

## P0 — Immediate: Bot Icon Replacements (Anti-Pattern)

- [x] **AUDIT-008** `components/chat/agents-list-alleato.tsx` — Replace `Bot` icon with brand initial avatar
- [x] **AUDIT-009** `components/chat/agent-panel-rag.tsx` — Replace `Bot` icon with brand initial avatar
- [x] **AUDIT-010** `components/misc/agent-panel.tsx` — Replace `Bot` icon with brand initial avatar
- [x] **AUDIT-011** `components/misc/agents-list.tsx` — Replace `Bot` icon with brand initial avatar

---

## P1 — This Sprint: Budget Modal Cluster (Token Bypass)

Five files systematically bypass design tokens with raw `slate-*` colors.

- [x] **AUDIT-012** `components/budget/original-budget-edit-modal.tsx` — Replace all `slate-*` → semantic tokens (18 violations)
- [x] **AUDIT-013** `components/budget/modals/JobToDateCostDetailModal.tsx` — Replace `slate-*` → semantic tokens (13 violations)
- [x] **AUDIT-014** `components/budget/modals/PendingBudgetChangesModal.tsx` — Replace `slate-*` → semantic tokens (7 violations)
- [x] **AUDIT-015** `components/budget/modals/PendingCostChangesModal.tsx` — Replace `slate-*` → semantic tokens (7 violations)
- [x] **AUDIT-016** `components/budget/modals/BudgetModificationsModal.tsx` — Replace `slate-*`, fix `shadow-sm hover:shadow-md`
- [x] **AUDIT-017** `components/budget/modals/CreateBudgetLineItemsModal.tsx` — Remove gradient icon box (`bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl shadow-lg`), replace with `bg-primary/10 text-primary rounded-lg`
- [x] **AUDIT-018** `components/budget/InlineBudgetLineItemCreator.tsx` — Replace `bg-white rounded-lg border-gray-200` → semantic tokens

---

## P1 — This Sprint: Shadow Anti-Patterns (30+ Files)

Replace `shadow-md`, `shadow-lg`, `shadow-xl` → `shadow-sm` or remove.

- [x] **AUDIT-019** `components/budget/snapshots-tab.tsx` — Remove `hover:shadow-lg` from cards
- [x] **AUDIT-020** `components/project-home/project-stats-cards.tsx` — Remove `hover:shadow-md`, add `hover:border-border/80`
- [x] **AUDIT-021** `components/tables/generic-editable-table.tsx` — Remove `hover:shadow-md`
- [x] **AUDIT-022** `components/tables/generic-table-factory.tsx` — Remove `hover:shadow-md hover-lift`, fix `bg-white border-neutral-200`
- [x] **AUDIT-023** `components/chat/ai-chat-widget.tsx` — `shadow-lg hover:shadow-xl` → `shadow-sm`
- [x] **AUDIT-024** `components/chat/ChatKitWidget.tsx` — `shadow-xl` → `shadow-sm`, `bg-blue-600` → `bg-primary`
- [x] **AUDIT-025** `components/misc/KnowledgeDocumentsPanel.tsx` — Remove `shadow-[...]`, `rounded-3xl`, `border-slate-200/60`, `backdrop-blur`; simplify to `shadow-sm rounded-xl border-border bg-card`
- [x] **AUDIT-026** `components/scheduling/schedule-views.tsx` — Replace `shadow-lg` / `shadow-xl` drag states → `shadow-md` (one step down, acceptable for dragging)
- [x] **AUDIT-027** `components/app-sidebar.tsx` — `shadow-lg` → `shadow-sm`
- [x] **AUDIT-028** `app/(admin)/projects-table-demo/projects-table.tsx` — Remove `hover:shadow-lg hover:shadow-black/5`, fix `#fff` sticky style
- [x] **AUDIT-029** `app/(tables)/photos/page.tsx` — Remove `hover:shadow-lg`
- [x] **AUDIT-030** `app/(admin)/tables/page.tsx` — Remove `hover:shadow-md`
- [x] **AUDIT-031** `components/procore-docs/docs-chat.tsx` — `shadow-lg` → `shadow-sm`, fix `bg-gradient-to-br from-blue-600 to-blue-700` → `bg-primary`
- [x] **AUDIT-032** `components/drawings/DrawingViewer.tsx` — `shadow-lg` → `shadow-sm`
- [x] **AUDIT-033** `components/misc/agents-list.tsx` — `ring-blue-500 shadow-md` → `ring-primary shadow-sm`
- [x] **AUDIT-034** `components/chat/agents-list-alleato.tsx` — `ring-violet-500 shadow-md` → `ring-primary shadow-sm`
- [x] **AUDIT-035** `components/admin/table-explorer/views/GalleryView.tsx` — `hover:shadow-lg` → `hover:border-border/80`
- [x] **AUDIT-036** `components/admin/table-explorer/views/GridView.tsx` — `hover:shadow-md` → `hover:border-border/80`
- [x] **AUDIT-037** `components/project/ProjectCreatedModal.tsx` — `shadow-md` → `shadow-sm`
- [x] **AUDIT-038** `features/meetings/meetings-table-config.tsx` — `shadow-md` tooltip → `shadow-sm`
- [x] **AUDIT-039** `components/misc/agents-list.tsx` — `shadow-md` → `shadow-sm`

---

## P1 — This Sprint: Specification Components (Gray Token Bypass)

- [x] **AUDIT-040** `components/specifications/SpecificationUploadDialog.tsx` — Replace `gray-300/400/500/600` → semantic tokens (7 violations)
- [x] **AUDIT-041** `components/specifications/AddRevisionDialog.tsx` — Replace `gray-300/400/500/600` → semantic tokens (6 violations)
- [x] **AUDIT-042** `components/specifications/SpecificationListTable.tsx` — Replace `gray-400/500/900` → semantic tokens (8 violations)

---

## P1 — This Sprint: Chat Component Token Fixes

- [s] **AUDIT-043** `components/chat/chatkit-panel.tsx` — `primary: "#2563eb"` is a third-party ChatKit API config object; CSS variables cannot be used here. Acceptable as-is.
- [s] **AUDIT-044** `components/chat/ChatKitWidget.tsx` — `accent: { primary: "#0f172a" }` — same constraint; third-party config.
- [s] **AUDIT-045** `components/chat/rag-chatkit-panel.tsx` — `primary: "#10a37f"` — third-party config object.
- [s] **AUDIT-046** `components/misc/chatkit-panel.tsx` — `primary: "#10a37f"` — third-party config object.
- [s] **AUDIT-047** `components/rag/chatkit-panel.tsx` — `primary: "#10a37f"` — third-party config object.
- [x] **AUDIT-048** `components/message.tsx` — Replace `backgroundColor: "#006cff"` → `className="bg-primary"`

---

## P2 — Next Sprint: Glassmorphism Reduction

Standardize modal overlays. Remove `backdrop-blur` except from sticky footers.

- [x] **AUDIT-049** `components/ui/dialog.tsx` — removed `backdrop-blur-sm` from overlay
- [x] **AUDIT-050** `components/ui/unified-modal.tsx` — `bg-black/60 backdrop-blur-sm` → `bg-black/50`
- [x] **AUDIT-051** `components/ui/unified-slideover.tsx` — `bg-black/60 backdrop-blur-sm` → `bg-black/50`
- [s] **AUDIT-052** `components/ui/sheet.tsx` — already `bg-black/50` with no blur; no change needed
- [s] **AUDIT-053** `components/ui/drawer.tsx` — already `bg-black/50`; no change needed
- [x] **AUDIT-054** `components/ui/alert-dialog.tsx` — `bg-black/80` → `bg-black/50`
- [x] **AUDIT-055** `components/budget/modals/BaseModal.tsx` — `backdrop-blur` removed, `border-slate-200/80 bg-background/95` → `border-border bg-card`
- [x] **AUDIT-056** `components/budget/modals/OriginalBudgetModal.tsx` — `bg-background/70 backdrop-blur-sm` → `bg-muted/50`
- [x] **AUDIT-057** `components/domain/change-events/ChangeEventForm.tsx` — `bg-background/80 backdrop-blur-sm` → `bg-background/90`
- [x] **AUDIT-058** `components/meetings/create-meeting-dialog.tsx` — `bg-background/95 backdrop-blur` → `bg-card`
- [x] **AUDIT-059** `components/meetings/edit-meeting-modal.tsx` — `bg-background/95 backdrop-blur` → `bg-card`
- [s] **AUDIT-060** `components/drawings/DrawingViewer.tsx` — toolbar blur justified; kept
- [x] **AUDIT-061** `components/misc/DocumentPreviewModal.tsx` — `bg-slate-950/70 backdrop-blur-sm` → `bg-black/50`
- [s] **AUDIT-062** `components/forms/FormActions.tsx` — sticky footer blur justified; kept
- [s] **AUDIT-063** `components/admin-panel/navbar.tsx` — sticky nav blur justified; kept
- [x] **AUDIT-064** `app/(admin)/projects-table-demo/projects-table.tsx` — `backdrop-blur-sm` on sticky table header → removed

---

## P2 — Next Sprint: Accessibility Hardening

- [ ] **AUDIT-065** Audit all icon-only `<Button>` in table toolbars — add `aria-label` to each
- [x] **AUDIT-066** `app/(main)/[projectId]/home/project-home-redesign.tsx` — Added `role="presentation"` to overlay dismissal div
- [x] **AUDIT-067** `app/(main)/[projectId]/home/project-home-client.tsx` — Added `role="presentation"` to overlay dismissal div
- [ ] **AUDIT-068** Verify heading hierarchy on all main project tool pages (budget, change orders, commitments)

---

## P2 — Next Sprint: Remaining Token Fixes

- [x] **AUDIT-069** `components/scheduling/gantt-chart.tsx` — `fill="#FAFCFF"` → `fill="hsl(var(--card))"`
- [x] **AUDIT-070** `components/dropzone.tsx` — `border-gray-300` → `border-border`
- [x] **AUDIT-071** `components/budget/ImportBudgetModal.tsx` — `hover:border-gray-400` → `hover:border-border`
- [s] **AUDIT-072** `app/(admin)/design-system-update/page.tsx` — Admin-only prototype with `// @ts-nocheck`, inline styles are structural layout primitives. Zero user impact; invasive refactor not justified.
- [x] **AUDIT-073** `app/(admin)/redoc/page.tsx` — `bg-white`, `text-slate-900`, `border-slate-200`, `text-slate-700` → semantic tokens

---

## P2 — Next Sprint: Arbitrary Spacing

- [x] **AUDIT-074** `components/ui/tabs.tsx` — `p-[3px]` → `p-0.5`
- [x] **AUDIT-075** `app/(admin)/design-system/page.tsx` — `py-[5px]` → `py-1`, `px-[18px] py-[14px]` → `px-4 py-3`
- [x] **AUDIT-076** `app/(admin)/design-system/_sections/settings-page.tsx` — `py-[7px]` → `py-1.5`

---

## P3 — Long-term: Responsive & Performance

- [s] **AUDIT-077** `components/budget/budget-table.tsx` — `min-w-[2240px]` is intentional for a wide financial spreadsheet requiring horizontal scroll; responsive column hiding is a feature-level change. Deferred.
- [x] **AUDIT-078** `components/budget/budget-code-selector.tsx` — `w-[400px]` → `w-[min(400px,90vw)]`
- [x] **AUDIT-079** `components/layout/project-tool-page.tsx` — deleted (confirmed zero imports)
- [s] **AUDIT-080** `components/templates/data-table-page.tsx` — still actively imported; not dead code
- [ ] **AUDIT-081** Add automated dark mode visual regression tests
- [ ] **AUDIT-082** Integrate axe-core for accessibility CI

---

## Progress

| Tier | Total | Done | Skipped | Remaining |
|------|-------|------|---------|-----------|
| P0 | 11 | 11 | 0 | 0 |
| P1 | 37 | 32 | 5 | 0 |
| P2 | 26 | 20 | 6 | 0 |
| P3 | 6 | 2 | 2 | 2 |
| **Total** | **80** | **65** | **13** | **2** |
