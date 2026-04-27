# Roadmap Page — Design Spec
**Date:** 2026-04-26
**Status:** Approved
**Route:** `/admin/roadmap`

---

## Overview

A team-facing roadmap page that displays upcoming features grouped by priority phase. Modeled after a two-column timeline layout: phase selector cards on the left, vertical timeline with feature details on the right. Fully editable via the UI — team members can add, edit, reorder, and delete items without touching code or files. Seeded from the existing `docs/roadmap/ROADMAP.md` content.

---

## Layout

`PageShell variant="content"` with title "Roadmap".

Two-column split (light theme):

| Column | Width | Content |
|--------|-------|---------|
| Left | 30% | Stacked phase cards — one per tier. Active phase highlighted. Each has a `+` button. |
| Right | 70% | Vertical timeline — a vertical line with colored dots. Each dot = one feature item. |

Clicking a phase card on the left scrolls the right panel to that phase's section (smooth scroll to anchor).

---

## Phases

Four phases mapped directly from `ROADMAP.md`:

| # | Phase Key | Display Label | Dot Color |
|---|-----------|---------------|-----------|
| 1 | `in_progress` | In Progress | Blue |
| 2 | `immediate` | Immediate | Orange |
| 3 | `high_priority` | High Priority | Yellow |
| 4 | `future` | Future | Muted green |

---

## Data Model

New Supabase table:

```sql
create table roadmap_items (
  id uuid primary key default gen_random_uuid(),
  phase text not null check (phase in ('in_progress','immediate','high_priority','future')),
  title text not null,
  description text,
  bullet_points text[] default '{}',
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Seeded from `docs/roadmap/ROADMAP.md` — 8 existing items mapped to the 4 phases.

---

## API Routes

All under `/api/admin/roadmap`:

| Method | Path | Action |
|--------|------|--------|
| `GET` | `/api/admin/roadmap` | List all items, ordered by phase sort then `sort_order` |
| `POST` | `/api/admin/roadmap` | Create a new item |
| `PATCH` | `/api/admin/roadmap/[id]` | Update title, description, bullets, or sort_order |
| `DELETE` | `/api/admin/roadmap/[id]` | Delete item |

All routes use `createServiceClient()` with `export const dynamic = "force-dynamic"` per Build Crash Prevention Gate (Rule 17).

---

## CRUD

### Create
- Click `+` on any phase card
- Opens a slide-in `Sheet` (shadcn) with fields: Title (required), Description, Bullet Points (add/remove dynamically)
- React Hook Form + Zod validation
- On submit: `POST /api/admin/roadmap`, invalidate React Query cache, close sheet

### Edit
- `...` menu (MoreVertical icon) on each timeline item
- Opens same sheet pre-filled
- On submit: `PATCH /api/admin/roadmap/[id]`

### Delete
- `ConfirmDeleteDialog` (design system component)
- On confirm: `DELETE /api/admin/roadmap/[id]`

### Reorder
- Items within a phase are drag-sortable using `@dnd-kit/sortable` (already installed)
- Drag handle shown on hover (GripVertical icon)
- On drag end: `PATCH /api/admin/roadmap/[id]` for each affected item's new `sort_order`
- Reordering is within-phase only — changing phase is done via Edit

---

## Component Structure

```
frontend/src/app/(admin)/roadmap/
  page.tsx                        # Server component, force-dynamic
  
frontend/src/components/domain/roadmap/
  roadmap-phase-card.tsx          # Left column phase card
  roadmap-timeline.tsx            # Right column full timeline
  roadmap-timeline-item.tsx       # Individual feature dot + content
  roadmap-item-form.tsx           # Create/edit sheet form
  roadmap-item-actions.tsx        # ... dropdown menu (edit/delete)
  roadmap-sortable-list.tsx       # dnd-kit wrapper for a phase's items

frontend/src/hooks/
  use-roadmap-items.ts            # React Query hooks (list, create, update, delete)
```

---

## Data Fetching

- `useRoadmapItems()` — fetches all items, returns grouped by phase
- Mutations via `useMutation` with `invalidateQueries` on success
- Optimistic updates for reorder to avoid flicker

---

## Seed Data

On migration, insert the 8 features from `ROADMAP.md`:

| Phase | Title |
|-------|-------|
| `in_progress` | Integrated dev environment (AI coding bridge) |
| `immediate` | Client feedback system (triage inbox) |
| `immediate` | Subcontractor invoice & billing submission |
| `immediate` | Nightly proactive intelligence scan |
| `immediate` | RFI, RFQ, and submittal workflow |
| `high_priority` | Meeting → project update automation |
| `high_priority` | Voice-in → action-out (mobile) |
| `high_priority` | Predictive budget variance model |
| `future` | Client-facing dashboard (scoped read-only + AI) |
| `future` | Agent-to-agent autonomous workflows |

---

## Error Handling

- All API calls via `apiFetch` from `@/lib/api-client` (Rule 13)
- Failed loads show `<ErrorState>` component
- Empty phase shows `<EmptyState>` with prompt to add first item
- Toast notifications on create/update/delete success and failure

---

## Out of Scope (v1)

- Moving an item between phases via drag (edit dialog handles this)
- Public-facing or client-visible roadmap
- Status tracking per item beyond the phase tier
- Estimated dates or timelines
