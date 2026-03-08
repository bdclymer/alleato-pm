# Directory Admin Guide

The admin guide explains how project administrators manage permissions, audit activity, and configure templates for the directory.

## Configuring Roles and Permissions

1. Navigate to `/[projectId]/directory/settings`.
2. Use the **Project Roles** tab to review the built-in permission templates. Create additional templates where necessary using the backend API or Supabase studio.
3. Switch to **Permissions Table** to see a grid of tools vs. templates. This view mirrors the settings Procore exposes and helps validate template configuration.

## Saved Filters and Preferences

- Each user's filter preferences, column layouts, and saved filters are stored in `user_project_preferences`. These are enforced via the Directory Preferences API.
- Administrators can reset preferences by deleting the corresponding row in the table if needed.

## Activity Log

- The new **Activity Log** tab inside Directory Settings queries `user_activity_log` and shows who performed bulk actions, invitations, or profile updates.
- Use the refresh button to pull the latest 50 entries. Each entry shows the action, description, person affected, and timestamp.

## Bulk Operations

- Encourage coordinators to use the bulk action dialog for common mass updates (permission changes, status updates, group membership, or invites). This ensures every change is automatically logged with `bulk_*` audit entries.

## Troubleshooting

- **Import Errors**: Inspect the detailed error list in the import dialog. Rows with missing required data or duplicate emails are skipped; the CSV can be corrected and re-uploaded.
- **Profile Photos**: Files over 2MB or unsupported MIME types are rejected. Keep uploads under the limit and in PNG/JPG/WEBP formats.
- **Realtime Messages**: If toast notifications stop appearing, ensure the Supabase Realtime replication for `project_directory_memberships` is enabled and that the user's session is still valid.
