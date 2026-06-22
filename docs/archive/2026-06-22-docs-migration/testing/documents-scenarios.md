# Documents — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** documents
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Documents")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

The **Documents** tool is a file storage system for the project. It lets the team upload, organise, and access any project file — PDFs, Word documents, spreadsheets, drawings, photos, and more. Files can be grouped into folders so they are easy to find later.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Documents page | HIGH |
| 1.2 | Navigation | Switch between table, card, and list views | MEDIUM |
| 1.3 | Navigation | Click a document row to open the file | HIGH |
| 2.1 | Upload | Upload a small PDF file to the project | HIGH |
| 2.2 | Upload | Try to upload without entering a title | HIGH |
| 2.3 | Upload | Try to save without selecting a file | HIGH |
| 3.1 | Folder Organisation | Upload a document and assign it to Test Folder | HIGH |
| 3.2 | Folder Organisation | Use the folder filter to narrow the list | MEDIUM |
| 4.1 | Search | Search for a document by part of its title | HIGH |
| 4.2 | Search | Filter the list to show only Draft documents | MEDIUM |
| 5.1 | Delete | Delete a single document | HIGH |
| 5.2 | Delete | Select multiple documents and delete them all at once | HIGH |
| 6.1 | Export | Export the document list as a spreadsheet file | MEDIUM |
| 7.1 | Column Visibility | Use the column selector to hide the Category column | LOW |
| 8.1 | Empty State | Verify the page shows a helpful message when search returns nothing | MEDIUM |

---

## 1. Navigation

### 1.1 — Open the Documents page
**What this checks:** The Documents page loads without errors and shows the file list.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. In the left sidebar, click **"Documents"** under project "Alleato AI"
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of documents is visible (or an empty state message if none exist yet). The page title says "Documents". No error messages appear.

---

### 1.2 — Switch between table, card, and list views
**What this checks:** The three different display styles all work for browsing documents.

**Steps:**
1. Go to the Documents page
2. Click the view toggle button in the toolbar (looks like a grid or list icon)
3. Select **"Card"** view and look at the result
4. Select **"List"** view and look at the result
5. Switch back to **"Table"** view

**Expected result:** Each view loads without errors. In Card view, files appear as cards with their names. In List view, files appear as rows. Table view shows a full data grid with columns.

---

### 1.3 — Click a document row to open the file
**What this checks:** Clicking on a file in the list opens it in a new browser tab.

**Setup:** There must be at least one document already uploaded to the project.

**Steps:**
1. Go to the Documents page
2. Click on any document row in the table
3. Watch what happens

**Expected result:** The file opens in a new browser tab. If it is a PDF, it displays in the browser. No error message appears.

---

## 2. Upload

### 2.1 — Upload a small PDF file to the project
**What this checks:** A new file can be added to the project and appears in the list.

**Setup:** Have a small PDF ready on your computer (any PDF under 5 MB).

**Steps:**
1. Go to the Documents page
2. Click the **"Upload"** button (top right)
3. In the **Title** field, type: **Test Document Upload**
4. In the **Folder** field, type: **Test Folder**
5. Select any Category from the dropdown
6. Click the file upload area and select your small PDF
7. Click the **Save** or **Upload** button
8. Wait for the upload to finish

**Expected result:** The dialog closes. The new file "Test Document Upload" appears in the documents list. No error message appears. The Folder column shows "Test Folder".

---

### 2.2 — Try to upload without entering a title
**What this checks:** The form prevents saving when the required Title field is blank.

**Steps:**
1. Click the **"Upload"** button
2. Leave the **Title** field completely empty
3. Select a file to upload
4. Click the **Save** or **Upload** button

**Expected result:** A red error message appears near the Title field saying it is required. The file is NOT uploaded. The dialog stays open.

---

### 2.3 — Try to save without selecting a file
**What this checks:** The form prevents saving when no file has been chosen.

**Steps:**
1. Click the **"Upload"** button
2. Fill in the Title: **Missing File Test**
3. Do NOT select any file
4. Click the **Save** or **Upload** button

**Expected result:** An error message appears saying a file is required. The record is NOT created. The dialog stays open.

---

## 3. Folder Organisation

### 3.1 — Upload a document and assign it to Test Folder
**What this checks:** Files can be organised into named folders — like putting papers into a labeled binder.

**Steps:**
1. Click the **"Upload"** button
2. Fill in Title: **Folder Test Doc**
3. In the **Folder** field, type: **Test Folder**
4. Select a small PDF
5. Click **Save**
6. On the Documents list, click the **Filters** button
7. Filter by Folder: **Test Folder**

**Expected result:** The document "Folder Test Doc" appears in the filtered results. The Folder column shows "Test Folder". Documents in other folders are hidden.

---

### 3.2 — Use the folder filter to narrow the list
**What this checks:** The folder filter correctly limits the list to only files in the chosen folder.

**Setup:** Upload at least two documents in different folders first.

**Steps:**
1. Go to the Documents page
2. Click the **Filters** button in the toolbar
3. Select a folder name from the **Folder** filter dropdown
4. Apply the filter

**Expected result:** Only documents assigned to that folder are shown. Documents in other folders disappear. Clearing the filter restores the full list.

---

## 4. Search

### 4.1 — Search for a document by part of its title
**What this checks:** Typing in the search box filters the list to matching documents.

**Setup:** The list must have at least two documents with different titles.

**Steps:**
1. Go to the Documents page
2. Click the search box (shows "Search documents...")
3. Type: **Test Document**
4. Wait a moment for the list to update

**Expected result:** Only documents whose title or filename contains "Test Document" are shown. Other documents disappear. Clearing the search box brings all documents back.

---

### 4.2 — Filter the list to show only Draft documents
**What this checks:** The status filter works. A "Draft" document has been uploaded but not yet published for the whole team.

**Steps:**
1. Click the **Filters** button in the toolbar
2. Select **Status: Draft**
3. Apply the filter

**Expected result:** Only documents with status "Draft" are shown. Documents with other statuses disappear. The filter label is visible in the toolbar.

---

## 5. Delete

### 5.1 — Delete a single document
**What this checks:** A document can be removed from the project and disappears from the list.

**Setup:** Upload a document titled "Delete Me Test" before running this scenario.

**Steps:**
1. Go to the Documents page
2. Find the row titled **Delete Me Test**
3. Click the **three-dot action menu** on that row
4. Click **"Delete"**
5. In the confirmation dialog, click **Delete**
6. Wait for the page to update

**Expected result:** The document "Delete Me Test" is no longer visible in the list. A success message (toast) briefly appears. No error message is shown.

---

### 5.2 — Select multiple documents and delete them all at once
**What this checks:** You can remove several files in a single action.

**Setup:** Upload at least two documents to use as test data.

**Steps:**
1. On the Documents page, check the checkbox on **2 or more** document rows
2. Click the **"Delete"** bulk action button that appears in the toolbar
3. In the confirmation dialog, confirm the deletion
4. Wait for the page to update

**Expected result:** All selected documents are removed from the list. A success message says how many were deleted (e.g. "2 documents deleted"). No error message appears.

---

## 6. Export

### 6.1 — Export the document list as a spreadsheet file
**What this checks:** The export button downloads a CSV file that can be opened in Excel or Google Sheets.

**Setup:** There must be at least one document in the list.

**Steps:**
1. Go to the Documents page
2. Click the **export (download) icon** in the toolbar
3. Wait for the download to start

**Expected result:** A CSV file downloads to your computer. Opening it in a spreadsheet app shows columns for Title, File Name, Folder, Category, Status, Uploaded By, and Created date.

---

## 7. Column Visibility

### 7.1 — Use the column selector to hide the Category column
**What this checks:** The column visibility control lets you customise which columns appear.

**Steps:**
1. Go to the Documents page in **Table** view
2. Click the **columns selector** button in the toolbar (looks like columns or an eye icon)
3. Uncheck **"Category"** to hide it
4. Close the column selector

**Expected result:** The Category column disappears from the table. All other columns still display correctly. The rest of the data is unchanged.

---

## 8. Empty State

### 8.1 — Verify the page shows a helpful message when search returns nothing
**What this checks:** The page shows a friendly message instead of a blank screen when no documents match the current search or filter.

**Steps:**
1. Apply a search that returns no results (e.g. type **xyzzy999notafile** in the search box)
2. Look at the main content area

**Expected result:** A message appears saying "No documents yet" or similar. An "Upload your first document" button is visible. No blank white space, stuck spinner, or error message appears.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Move file to a different folder | Edit functionality marked "coming soon" in the UI |
| Rename a document | Edit form not yet fully implemented |
| Preview document in-app | Row click opens external URL; in-app preview not built |
| Private documents (`is_private` flag) | Upload form has toggle but access control not verified |
| Download file directly | No dedicated download button — opens in new tab only |
