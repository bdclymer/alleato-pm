# Directory User Guide

The project directory consolidates every user, contact, company, and distribution group participating in a project. This guide covers the common workflows available from `/[projectId]/directory`.

## Viewing and Filtering People

- Use the search bar to look up people by name, email, phone, company, or job title.
- Open the **Filters** panel to filter by type (user/contact), status, company, or permission template. Filters can be grouped by company or shown as a flat list.
- Save frequently used filter combinations by expanding the **Saved Filters** section, clicking **Save current**, and naming the preset. Saved filters persist per user/project and can also capture the current search text.

## Bulk Actions

1. Select rows via the checkbox column or expand a company group and select everyone in that company.
2. Click **Open Bulk Actions** to:
   - Apply a new permission template to all selected users
   - Change their active/inactive status
   - Add/remove them from distribution groups
   - Send or resend invitations

## Importing People or Companies

1. Click the upload icon in the toolbar and choose **Import CSV**.
2. Select the import type (Users, Contacts, or Companies).
3. Optionally provide default company/permission template for rows that omit those fields.
4. Upload the CSV and review the import summary. Errors are reported per row.
5. Download ready-to-use templates for each import type from the same dialog.

## Exporting People

1. Click the download icon to open the export dialog.
2. Choose which columns to include; the dialog automatically selects the columns currently visible in the table.
3. Start the export to download a CSV that honors the active filters and search text.

## Profile Photos

- Edit any person and use the **Profile Photo** field to upload PNG/JPG/WEBP images up to 2MB. Photos are stored securely and cached per project.

## Offline and Live Updates

- When offline, a banner indicates cached results are shown. Data automatically refreshes once connectivity returns.
- Real-time toast notifications surface when project members add, update, or remove directory entries.
