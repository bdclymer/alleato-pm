# Directory Developer Guide

This document summarizes the implementation details for the directory feature set.

## Data Model

- `people`: Stores user/contact fields plus `avatar_updated_at`.
- `project_directory_memberships`: Associates people to projects and permission templates.
- `person_profile_photos`: Stores base64-encoded profile photos with service-role-only policies.
- `user_project_preferences`: Persists saved filters, column layouts, and last-used filters for each user/project combination.
- Supporting tables: `permission_templates`, `distribution_groups`, `distribution_group_members`, `user_activity_log`.

## Services

- `DirectoryService`: Core CRUD/search logic for people, permissions, and membership states.
- `DirectoryAdminService`: Handles CSV import/export, saved filter templates, activity log retrieval, profile uploads, and bulk actions. Requires a service-role Supabase client.
- `DirectoryPreferencesService`: Wraps `user_project_preferences` and exposes helpers for saved filters, last filters, and column layouts.

## API Surface

- `/api/projects/[projectId]/directory/import` – multipart CSV import.
- `/api/projects/[projectId]/directory/export` – streaming CSV export honoring filters/columns.
- `/api/projects/[projectId]/directory/templates/[type]` – download blank templates.
- `/api/projects/[projectId]/directory/filters` – CRUD saved filters.
- `/api/projects/[projectId]/directory/preferences` – persist last filters/column layouts.
- `/api/projects/[projectId]/directory/activity` – audit log feed.
- `/api/projects/[projectId]/directory/people/bulk-update` and `/bulk-invite` – bulk actions.
- `/api/projects/[projectId]/directory/people/[personId]/profile-photo` – avatar uploads.
- `/api/avatar/[personId]` – verified avatar fetch used by the UI.

## Frontend Architecture

- `DirectoryTable` handles search, filter state, column management, realtime updates, and offline caching. It coordinates the `ImportDialog`, `ExportDialog`, and `BulkActionDialog`.
- `DirectoryFilters` now supports saved filters and integrates with the preferences API.
- `PersonEditDialog` uploads profile photos after successful create/update operations.
- `DirectoryActivityPanel` surfaces the audit log in the settings area.

## Testing

- Unit tests for `DirectoryPreferencesService` validate JSON persistence without hitting Supabase.
- New features rely on existing Playwright suites for regression coverage; add/extend specs under `frontend/tests/directory/` when expanding functionality.

## Deployment Notes

- Apply the migration `20260120103000_directory_profile_photos.sql`.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is configured for Next.js so admin routes can use the service client.
- The realtime toast channel subscribes to `project_directory_memberships`; confirm replication is enabled in Supabase Realtime.
