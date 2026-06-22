# Documents — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 14 | HIGH |
| Views & Navigation | 10 | HIGH |
| Fields & Data | 14 | HIGH |
| Folder Organization | 6 | HIGH |
| Search & Filter | 8 | HIGH |
| Delete & Recycle Bin | 6 | HIGH |
| Permissions | 4 | MEDIUM |
| Export | 3 | MEDIUM |
| Column Visibility | 3 | LOW |
| Integrations | 5 | MEDIUM |
| **TOTAL** | **73** | |

---

## 1. Core Actions

> Source: Codebase — `document-upload-dialog.tsx`, `documents-client.tsx`, `[documentId]/route.ts` (GET, PUT, DELETE)

### 1.1 Upload (Create)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Upload a document with required fields only | 1. Navigate to `/767/documents`<br>2. Click "Upload"<br>3. Select a file<br>4. Enter a Title<br>5. Click "Upload Document" | Dialog closes; new document appears in the list with status "Draft" and folder "Root" | HIGH | 🔲 | |
| 1.1.2 | Upload a document with all optional fields | Fill Title, Description, Folder, Category, Status, toggle Private to on, select file, submit | All fields persisted; document appears with correct folder, category, status, and lock icon | HIGH | 🔲 | |
| 1.1.3 | Title auto-populates from selected filename | Open Upload dialog → select a file without typing a title first | Title field auto-fills with the filename minus the extension | MEDIUM | 🔲 | |
| 1.1.4 | Upload fails when title is blank | Open Upload dialog → select a file → leave Title empty → click Upload | Validation error "Title is required" shown near the field; dialog stays open; record not created | HIGH | 🔲 | |
| 1.1.5 | Upload without a file uses placeholder URL | Enter Title only → do not select a file → click Upload | Document record created with a synthesized file URL (no hard crash); appears in list | LOW | 🔲 | Known gap: no true file-required validation |
| 1.1.6 | Upload with status = Published | Set Status to "Published" in the dialog → submit | Document appears in list with status badge "Published" | HIGH | 🔲 | |
| 1.1.7 | Cancel upload discards form | Open Upload dialog → fill some fields → click Cancel | Dialog closes; no document created; list unchanged | HIGH | 🔲 | |

### 1.2 Edit (Update)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit action available from row action menu | Hover over a document row → click the three-dot action menu | "Edit" option appears in the menu | HIGH | 🔲 | |
| 1.2.2 | Edit currently shows "coming soon" toast | Click Edit on any document row | Toast notification "Edit functionality coming soon" appears; no error | MEDIUM | 🔲 | Edit not yet fully implemented |
| 1.2.3 | PUT API updates a document record | Send PUT `/api/projects/767/documents/{id}` with valid updated fields | 200 response; updated fields persisted in database | HIGH | 🔲 | API-level test |

### 1.3 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Delete a single document via row action | Hover row → action menu → Delete → confirm | Document disappears from the active list; success toast shown | HIGH | 🔲 | |
| 1.3.2 | Cancel delete leaves document intact | Row action menu → Delete → click Cancel in confirmation dialog | Document remains in the list unchanged | HIGH | 🔲 | |
| 1.3.3 | Soft delete sets deleted_at (API) | DELETE `/api/projects/767/documents/{id}` | 200 response `{success: true, id: N}`; `deleted_at` column populated; GET list no longer returns the record | HIGH | 🔲 | API-level test |
| 1.3.4 | Bulk delete multiple documents | Select 2+ document checkboxes → click bulk delete in toolbar → confirm | All selected documents removed from list; toast shows count (e.g. "2 documents deleted") | HIGH | 🔲 | |

---

## 2. Views & Navigation

> Source: Codebase — `documents-client.tsx` (table/card/list views, row click, empty state, pagination)

### 2.1 List Page Load

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | Documents page loads with correct columns | Navigate to `/767/documents` | Table renders with default columns: Title, File Name, Folder, Version, Status, Category, File Size, Uploaded By, Created | HIGH | 🔲 | |
| 2.1.2 | Page title is "Documents" | Navigate to `/767/documents` | Browser tab and page header both show "Documents" | HIGH | 🔲 | |
| 2.1.3 | Documents sorted by created_at descending by default | Load the page with multiple documents | Most recently uploaded document appears first | MEDIUM | 🔲 | |

### 2.2 View Toggle (Table / Card / List)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Table view renders correctly | Ensure Table view is active | Full data grid displayed with sortable column headers, checkboxes, and row action menus | HIGH | 🔲 | |
| 2.2.2 | Card view renders correctly | Click view toggle → select Card | Each document shown as a card with title, file name, folder icon, version, category, and file size | MEDIUM | 🔲 | |
| 2.2.3 | List view renders correctly | Click view toggle → select List | Each document shown as a compact row with title, metadata subtitle, lock icon for private docs, and status badge | MEDIUM | 🔲 | |
| 2.2.4 | View preference persists in URL | Switch to Card view → copy URL → open in new tab | New tab opens in Card view | LOW | 🔲 | URL param: `?view=card` |
| 2.2.5 | Mobile defaults to list view | Open page on a viewport < 768 px wide | View automatically switches to list; table view not forced | LOW | 🔲 | |

### 2.3 Row Click & Empty State

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | Clicking a document row opens the file URL | Click any row that has a file_url | File opens in a new browser tab | HIGH | 🔲 | |
| 2.3.2 | Empty state shown when no documents exist | View documents on a project with zero documents | Empty state panel shows title "No documents yet", description, and "Upload your first document" button | HIGH | 🔲 | |

---

## 3. Fields & Data

> Source: Codebase — `createDocumentSchema` (route.ts), `documentUploadSchema` (upload dialog), `projectDocumentColumns` (table config)

### 3.1 Upload Form Fields

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 3.1.1 | Title | Text | Yes | Any non-empty string accepted | Empty string blocked with "Title is required" | HIGH | 🔲 |
| 3.1.2 | Description | Textarea | No | Multi-line text accepted; blank accepted | — | MEDIUM | 🔲 |
| 3.1.3 | Folder | Text input | No | Any string; defaults to "Root" when blank | — | HIGH | 🔲 |
| 3.1.4 | Category | Dropdown | No | General, Financial, Legal, Technical, Administrative, Safety, Environmental, Design | — | HIGH | 🔲 |
| 3.1.5 | Status | Dropdown | No | Draft (default), Published, Superseded, Archived | — | HIGH | 🔲 |
| 3.1.6 | Private (is_private) | Toggle/Switch | No | Toggle on → saved as true; toggle off → saved as false | — | HIGH | 🔲 |
| 3.1.7 | File (file upload area) | File picker | No* | Any file type accepted (PDF, DOC, XLS, IMG, etc.) | — | HIGH | 🔲 | *No hard block without file |

### 3.2 Column Data Display

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.2.1 | Private icon shown in Title column | Upload a document with Private toggled on | Lock icon appears to the left of the title in Table and List views | HIGH | 🔲 | |
| 3.2.2 | Version column shows "v1" for new uploads | Upload a fresh document | Version column shows "v1" | MEDIUM | 🔲 | |
| 3.2.3 | File Size shown in human-readable format | Upload a file with a known size | File Size column shows e.g. "245.3 KB" not raw bytes | MEDIUM | 🔲 | |
| 3.2.4 | Folder column shows "Root" when blank | Upload a document leaving Folder blank | Folder column shows "Root" with a folder icon | MEDIUM | 🔲 | |
| 3.2.5 | Status badge uses semantic colors | Upload documents with all four status values | Draft, Published, Superseded, Archived all render with distinct `StatusBadge` colors | HIGH | 🔲 | |
| 3.2.6 | Created date formatted as locale date | Upload a document | Created column shows date in locale format (e.g. "4/8/2026"), not ISO string | MEDIUM | 🔲 | |
| 3.2.7 | Uploaded By shows user email | Upload a document while logged in as test1@mail.com | "Uploaded By" column shows "test1@mail.com" | HIGH | 🔲 | |

---

## 4. Folder Organization

> Source: Codebase — `folder` field in upload dialog and API; filter by folder in `documents-client.tsx`

### 4.1 Assign and Navigate Folders

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | Upload to a named folder | In Upload dialog, set Folder to "Drawings" → submit | Document appears in list with Folder = "Drawings" and a folder icon | HIGH | 🔲 | |
| 4.1.2 | Upload to Root (default) | Leave Folder field blank → submit | Document appears with Folder = "Root" | HIGH | 🔲 | |
| 4.1.3 | Filter by folder name shows only matching docs | Upload docs to two different folders → apply folder filter | Only docs in the selected folder shown; others hidden | HIGH | 🔲 | |
| 4.1.4 | Clear folder filter restores full list | After applying a folder filter → click Clear Filters | All documents across all folders visible again | HIGH | 🔲 | |
| 4.1.5 | Card view shows folder per card | Switch to Card view | Each card shows folder name with FolderOpen icon | MEDIUM | 🔲 | |
| 4.1.6 | Move document to different folder (edit) | Edit a document → change Folder field → save | Folder column updated; PUT `/api/projects/767/documents/{id}` with `{folder: "NewFolder"}` returns 200 | MEDIUM | 🔲 | Edit UI not yet complete; API-level test |

---

## 5. Search & Filter

> Source: Codebase — `filteredDocuments` logic in `documents-client.tsx`; `projectDocumentFilters` in table config

### 5.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Search by title substring | Type part of a known document title in the search box | List immediately filters to matching documents in real time | HIGH | 🔲 | |
| 5.1.2 | Search by file name | Type part of a known file name (e.g. "report.pdf") | Documents whose `file_name` contains the term are shown | HIGH | 🔲 | |
| 5.1.3 | Search by description | Type a word known to be in a document's description | Documents with matching description are shown | MEDIUM | 🔲 | |
| 5.1.4 | Search by uploader name/email | Type the email of the uploader | Documents uploaded by that person are shown | MEDIUM | 🔲 | |
| 5.1.5 | Clear search restores full list | Enter a search term → clear the input | All documents appear again | HIGH | 🔲 | |

### 5.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.2.1 | Filter by Status: Draft | Apply Status = Draft | Only Draft documents shown | HIGH | 🔲 | |
| 5.2.2 | Filter by Status: Published | Apply Status = Published | Only Published documents shown | HIGH | 🔲 | |
| 5.2.3 | Filter by Category | Apply Category = Financial | Only documents with category "Financial" shown | MEDIUM | 🔲 | |

---

## 6. Delete & Recycle Bin

> Source: Codebase — soft delete via `deleted_at` column; `[documentId]/route.ts` DELETE sets `deleted_at`

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 6.1.1 | Delete soft-deletes (sets deleted_at) | Delete a document via the row action → verify via API | GET `/api/projects/767/documents` no longer returns the deleted record; `deleted_at` is non-null in DB | HIGH | 🔲 | |
| 6.1.2 | Deleted documents not visible in main list | Delete a document → return to list | Deleted document does not appear in the active list | HIGH | 🔲 | |
| 6.1.3 | Cancel delete keeps document in list | Row action menu → Delete → click Cancel | Document remains in list; no change to data | HIGH | 🔲 | |
| 6.1.4 | Bulk delete: partial failure shows error count | Force one delete to fail (e.g. invalid ID) during a bulk delete | Toast shows "N deleted, M failed" instead of full success | MEDIUM | 🔲 | |
| 6.1.5 | Delete from dialog with isPending state | Trigger delete on a slow connection | Button shows "Deleting..." and is disabled while the request is in flight | LOW | 🔲 | |
| 6.1.6 | Bulk delete clears selection after completion | Bulk delete 2+ docs → wait for completion | Selected IDs cleared; no rows remain checked | HIGH | 🔲 | |

---

## 7. Permissions

> Source: Codebase — `is_private` field; upload form toggle; lock icon in table/list views; API auth check

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 7.1.1 | Unauthenticated request returns 401 | No session | GET `/api/projects/767/documents` | 401 Unauthorized response | HIGH | 🔲 | API-level test |
| 7.1.2 | Private document shows lock icon | Any authenticated user | View document list containing a private doc | Lock icon visible in Title column for the private document | HIGH | 🔲 | |
| 7.1.3 | Private toggle defaults to off | Any user | Open Upload dialog | "Private Document" switch is in the OFF position by default | MEDIUM | 🔲 | |
| 7.1.4 | Private document description shown in toggle | Any user | Inspect Private toggle in Upload dialog | Sub-label reads "Only visible to admins and the uploader" | LOW | 🔲 | |

---

## 8. Export

> Source: Codebase — `handleExport` in `documents-client.tsx`; exports visible columns as CSV

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Export full list as CSV | Navigate to `/767/documents` (no filters) → click export icon | CSV file downloads named `project-documents-YYYY-MM-DD.csv`; contains header row with column names | MEDIUM | 🔲 | |
| 8.1.2 | Export respects active filters | Apply a Status = Published filter → export | CSV contains only Published documents; other statuses excluded | MEDIUM | 🔲 | |
| 8.1.3 | Export with no documents shows info toast | Navigate to a project with zero documents → click export | Toast "No documents to export" appears; no file downloaded | MEDIUM | 🔲 | |

---

## 9. Column Visibility

> Source: Codebase — `projectDocumentColumns` (14 columns total, 9 visible by default); column toggle in toolbar

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Default visible columns match spec | Navigate to `/767/documents` → inspect table | Visible by default: Title, File Name, Folder, Version, Status, Category, File Size, Uploaded By, Created | HIGH | 🔲 | |
| 9.1.2 | Hide a column via column selector | Open column selector → uncheck "Category" | Category column disappears from the table; all other columns intact | LOW | 🔲 | |
| 9.1.3 | Show a hidden column | Open column selector → check "Private" | Private column appears in the table showing "Yes"/"No" | LOW | 🔲 | |

---

## 10. Integrations

> Source: Codebase — `DocumentDeliveryDialog.tsx`; Procore Documents integration with Submittals, RFIs, Drawings

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.1.1 | Document Delivery dialog opens with Download tab | Open `DocumentDeliveryDialog` (e.g. from a submittal or RFI) | Dialog shows two tabs: "Download" and "Email"; Download tab active by default | MEDIUM | 🔲 | Dialog used cross-tool |
| 10.1.2 | Download PDF from Document Delivery dialog | Open Download tab → click "Download PDF" | Request goes to `/api/document-center/{recordType}/{recordId}/pdf`; PDF file downloads on success | MEDIUM | 🔲 | |
| 10.1.3 | Email document from Document Delivery dialog | Open Email tab → add a recipient email → fill subject → click "Send Email" | POST to `/api/document-center/{recordType}/{recordId}/email`; success toast shown; dialog closes | MEDIUM | 🔲 | |
| 10.1.4 | Email tab: send without recipient shows error | Open Email tab → do NOT add any recipient → click "Send Email" | Toast error "Add at least one recipient"; email not sent | MEDIUM | 🔲 | |
| 10.1.5 | Email tab: invalid email address rejected | Open Email tab → type an invalid email (e.g. "notanemail") in the manual email field → click Add | Toast error "Enter a valid email address"; address not added to recipient list | MEDIUM | 🔲 | |

---

## Sources

| # | Title | URL | Category |
|---|-------|-----|---------|
| 1 | About Documents — Overview | https://v2.support.procore.com/process-guides/about-documents | Documents |
| 2 | Upload a File to the Documents Tool | https://v2.support.procore.com/product-manuals/documents-project/tutorials/upload-a-file-to-the-documents-tool | Documents |
| 3 | Create a Folder in the Documents Tool | https://v2.support.procore.com/product-manuals/documents-project/tutorials/create-a-folder-in-the-documents-tool | Documents |
| 4 | Move a Document to a Different Folder | https://v2.support.procore.com/product-manuals/documents-project/tutorials/move-a-document-to-a-different-folder | Documents |
| 5 | Edit a Document | https://v2.support.procore.com/product-manuals/documents-project/tutorials/edit-a-document | Documents |
| 6 | Delete a Document | https://v2.support.procore.com/product-manuals/documents-project/tutorials/delete-a-document | Documents |
| 7 | Retrieve a Deleted Document from the Recycle Bin | https://v2.support.procore.com/product-manuals/documents-project/tutorials/retrieve-a-deleted-file-from-the-recycle-bin | Documents |
| 8 | Download a File from the Documents Tool | https://v2.support.procore.com/product-manuals/documents-project/tutorials/download-a-file-from-the-documents-tool | Documents |
| 9 | Send a Document by Email | https://v2.support.procore.com/product-manuals/documents-project/tutorials/send-a-document-by-email | Documents |
| 10 | Search and Filter Documents | https://v2.support.procore.com/product-manuals/documents-project/tutorials/search-and-filter-documents | Documents |
| 11 | Set Document Permissions / Private Flag | https://v2.support.procore.com/product-manuals/documents-project/tutorials/set-documents-permissions | Documents |
| 12 | Permissions Matrix — Documents | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-documents-permissions | Documents |
| 13 | Attach a Document to an RFI | https://v2.support.procore.com/product-manuals/rfi-project/tutorials/attach-a-document-to-an-rfi | RFI |
| 14 | Attach a Document to a Submittal | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/attach-a-document-to-a-submittal | Submittals |
| 15 | Codebase — `documents-client.tsx` | frontend/src/app/(main)/[projectId]/documents/documents-client.tsx | Codebase |
| 16 | Codebase — `document-upload-dialog.tsx` | frontend/src/features/documents/document-upload-dialog.tsx | Codebase |
| 17 | Codebase — `project-documents-table-config.tsx` | frontend/src/features/documents/project-documents-table-config.tsx | Codebase |
| 18 | Codebase — API route (list + create) | frontend/src/app/api/projects/[projectId]/documents/route.ts | Codebase |
| 19 | Codebase — API route (get + update + delete) | frontend/src/app/api/projects/[projectId]/documents/[documentId]/route.ts | Codebase |
| 20 | Codebase — `DocumentDeliveryDialog.tsx` | frontend/src/components/documents/DocumentDeliveryDialog.tsx | Codebase |
| 21 | Procore Manifest — documents | .claude/procore-manifests/documents/manifest.json | Manifest |

---

## Known Gaps (not yet implemented)

| Feature | Status | Notes |
|---------|--------|-------|
| Edit document metadata via UI | Not implemented | `handleEdit` fires toast "coming soon"; PUT API exists and works |
| Recycle Bin tab for soft-deleted docs | Not implemented | Soft delete runs via API but no Recycle Bin UI to restore or permanently delete |
| Restore from Recycle Bin | Not implemented | No restore endpoint or UI |
| Permanent delete | Not implemented | Only soft delete via `deleted_at` |
| Nested / hierarchical folders | Not implemented | Folder is a plain text field; no tree navigation |
| In-app document preview | Not implemented | Row click opens raw file URL in a new tab |
| File versioning (v2, v3…) | Not implemented | Version stored as integer but no upload-new-version flow in UI |
| Content type filter | Not implemented | `content_type` column exists but no filter option |
| Reviewed By / Reviewed At fields | Not implemented | Columns exist in schema but no review workflow in UI |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
