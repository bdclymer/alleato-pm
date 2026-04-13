# Punch List — Post-Audit Task Checklist
**Generated:** 2026-04-13  
**Source:** feature-audit-output/punch-list/report.md

---

## Bugs

- [x] **B-5** Replace raw `fetch()` with `apiFetch` in `hooks/use-punch-items.ts`
- [x] **B-6** Create `supabase/migrations/20260413000000_create_punch_items.sql`

---

## Features

### P2 — High value, reasonable effort

- [x] **F-6** Add "My Items" tab — filter by current user's `assignee_id`
- [x] **F-10** Implement CSV export — download current filtered list as CSV
- [x] **F-5a** Add Assignee user picker to create/edit form (user search → `assignee_id` UUID)
- [ ] **F-5b** Add Ball in Court user picker (replace free-text with user dropdown)

### P3 — Larger scope

- [x] **F-7a** Create punch item detail page at `[projectId]/punch-list/[punchItemId]/page.tsx`
- [x] **F-7b** Link `#N` number column in table to the detail page
- [x] **F-7c** Detail page: all fields displayed + edit dialog + status transition buttons
- [x] **F-8a** Attachments: add `supabase/migrations/20260413000001_create_punch_item_attachments.sql`
- [ ] **F-8b** Attachments: upload UI in form dialog and detail page (requires Storage bucket setup)

---

## Verification

- [x] `pnpm typecheck` passes — zero punch-list errors
- [x] `pnpm lint` passes — zero errors in punch-list files
- [ ] Browser smoke test: create → edit → delete → restore → My Items → export → detail page
