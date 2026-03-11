# Unified Table Component Catalog

This catalog defines the shared primitives every table page should use for consistent visuals and behavior.

## Why this exists

Table pages currently mix page-local render logic and shared components, which leads to mismatched:

- status dots and labels
- date formatting
- badge/chip styling
- avatar circles for users
- icon link groups
- filter/notification counters
- row action menus

Use this catalog as the default for all new table pages and while migrating existing ones.

## Shared primitives

Import from `@/components/tables/unified`.

### `TableCountIndicator`

Use for compact count bubbles in controls (filter counts, notification counts, selected count indicators).

```tsx
<TableCountIndicator count={activeFilterCount} className="absolute -right-1 -top-1" />
```

### `TableDateValue`

Use for all date cells/cards/lists. This guarantees consistent locale/date rendering and empty-state output.

```tsx
<TableDateValue value={item.created_at} />
<TableDateValue value={item.meeting_date} showTime />
```

### `TableStatusDot`

Use for small status indicators in title columns and dense tables.

```tsx
<TableStatusDot status={item.status} />
```

### `TableTagBadge`

Use for table badges/chips (`type`, `category`, `project`, labels).

```tsx
<TableTagBadge label={item.type} variant="secondary" />
```

### `TableAvatarUsers`

Use for user/participant avatar circles with overflow and tooltip list.

```tsx
<TableAvatarUsers users={participants} maxVisible={4} />
```

### `TableIconLinks`

Use for icon-only external links in cells.

```tsx
<TableIconLinks
  items={[
    { href: item.source, icon: FileText, label: "Open source" },
    { href: item.recording_url, icon: Flame, label: "Open recording" },
  ]}
/>
```

### `TableRowActionsMenu`

Use for all row action three-dot menus.

```tsx
<TableRowActionsMenu
  items={[
    { key: "open", label: "Open", icon: ArrowUpRight, onSelect: () => onOpen(item) },
    { key: "delete", label: "Delete", icon: Trash2, onSelect: () => onDelete(item), destructive: true },
  ]}
/>
```

### `formatParticipantDisplayName`

Use when rendering person names from usernames/emails in tooltips and detail panes.

```ts
const label = formatParticipantDisplayName("jane_doe@example.com"); // Jane Doe
```

## Usage rules for AI coding

1. Do not create table-page-local date, badge, status, avatar, count indicator, or row action primitives.
2. Prefer these primitives before using raw `Badge`, custom dots, custom avatar stacks, or custom three-dot menus.
3. Keep column config files focused on mapping data to primitives, not recreating styles.
4. For missing behavior, extend these primitives in `frontend/src/components/tables/unified/table-primitives.tsx` first, then reuse.
5. Keep action labels sentence-case and icons semantically consistent (`open`, `edit`, `delete`, `view file`).
6. Table rows must remain single-line per cell in table view. Do not stack multiple lines/blocks inside a table cell.
7. If secondary metadata (for example, project name) is needed, place it in its own dedicated column rather than under primary cell text.
8. Table pages must provide row selection checkboxes and a functional bulk-delete action (`toolbar.onBulkDelete`) whenever delete is supported.

## `/meetings` reference implementation

`frontend/src/features/meetings/meetings-table-config.tsx` is now the reference for:

- title + `TableStatusDot`
- date/time + `TableDateValue`
- type/category/project + `TableTagBadge`
- participants + `TableAvatarUsers`
- links + `TableIconLinks`
- row menu + `TableRowActionsMenu`

`frontend/src/components/tables/unified/table-toolbar.tsx` now uses `TableCountIndicator` for desktop and mobile filter counters.

## Migration plan for remaining table pages

Apply in this order:

1. Migrate every row action menu to `TableRowActionsMenu`.
2. Replace inline date formatters with `TableDateValue`.
3. Replace local badge variants for table chips with `TableTagBadge` (or `StatusBadge` when domain-specific).
4. Replace local user/avatar stacks with `TableAvatarUsers` where lists of people are shown.
5. Replace local icon link clusters with `TableIconLinks`.
6. Replace custom control counters with `TableCountIndicator`.

## Files

- Primitives: `frontend/src/components/tables/unified/table-primitives.tsx`
- Exports: `frontend/src/components/tables/unified/index.ts`
- Meetings reference: `frontend/src/features/meetings/meetings-table-config.tsx`
- Toolbar counters: `frontend/src/components/tables/unified/table-toolbar.tsx`
