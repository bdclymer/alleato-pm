# Change Events - Codebase Inventory

Generated: 2026-03-22T15:36:40Z

## Routes
- frontend/src/app/(main)/[projectId]/change-events/page.tsx
- frontend/src/app/(main)/[projectId]/change-events/new/page.tsx
- frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx

## Hooks
- frontend/src/hooks/use-change-events.ts
- frontend/src/hooks/use-change-event-rfqs.ts

## Schemas
- frontend/src/app/api/projects/[projectId]/change-events/validation.ts

## DB Types
- frontend/src/types/database.types.ts (change_events, change_event_line_items, change_event_attachments, change_event_history)

## API Surfaces
- frontend/src/app/api/projects/[projectId]/change-events/
- frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/
- frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/
- frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/
- frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/convert-to-change-order/
