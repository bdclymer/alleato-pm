# Success Criteria: GitHub Issue #544

**Route:** `http://localhost:3001/876/rfis/fe13bf4e-dbb6-494a-bb50-b8fc821b694e`
**Issue:** There should b a section I can drag and drop a attachement.

## Flow 1: Open the exact RFI detail page
- **Action:** Open the exact route above after authenticating.
- **Expected outcome:** The RFI detail page renders without redirecting away from the record and shows an `Attachments` section in the record canvas.
- **DB check:** No write required. If the record is missing, verify the page load query returns the target RFI id and project id.
- **Quality bar:** PASS only if the exact record page is visible and the attachments section is present on the page.

## Flow 2: Drag and drop a file into the attachment section
- **Action:** Drag a small test file into the `Attachments` dropzone, then wait for upload completion.
- **Expected outcome:** The dropzone accepts the file, shows upload progress/success, and the new attachment appears in the attachment list.
- **DB check:**
  ```sql
  select
    rd.rfi_id,
    rd.document_metadata_id,
    rd.document_type,
    rd.attached_at,
    rd.attached_by,
    dm.file_name,
    dm.file_path,
    dm.mime_type,
    dm.source_size,
    dm.created_at
  from public.rfi_documents rd
  join public.document_metadata dm
    on dm.id = rd.document_metadata_id
  where rd.rfi_id = 'fe13bf4e-dbb6-494a-bb50-b8fc821b694e'
  order by rd.attached_at desc;
  ```
- **Quality bar:** PASS only if the uploaded file is visible in the UI and the database row exists with a matching `document_metadata_id` and non-null attachment timestamps.

## Flow 3: Attachment field classification
- **Action:** Inspect the attachment area and its controls.
- **Expected outcome:** The attachment section is treated as a user-actionable upload surface, not a read-only placeholder.
- **DB check:** The upload path must create a new `document_metadata` record and a matching `rfi_documents` link row.
- **Quality bar:** PASS only if the section supports actual upload input and persists the attachment link.

## Field Inventory

### Attachment dropzone
- **Type:** User input
- **Source of truth:** `EntityAttachments` dropzone
- **Editable in UI?:** Yes
- **Expected DB value:** A new linked `rfi_documents` row tied to the uploaded `document_metadata.id`

### Uploaded file row
- **Type:** Read-only display
- **Source of truth:** `rfi_documents` + `document_metadata`
- **Editable in UI?:** No
- **Expected DB value:** `file_name`, `file_path`, `mime_type`, and `source_size` match the uploaded file metadata

### Document type selector, if shown
- **Type:** User input
- **Source of truth:** `rfi_documents.document_type`
- **Editable in UI?:** Yes
- **Expected DB value:** Optional taxonomy key, or null if left uncategorized

