# Drawings — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** drawings
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Drawings")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

**Drawings** are the construction blueprints (plans) for a project. They are uploaded as PDF files, organized by discipline (e.g. Architectural, Structural, Mechanical), and tracked through revisions whenever an updated version of the same plan is issued.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Upload | Upload 3 starter drawing files | HIGH |
| 1.2 | Navigation | Open a drawing in the viewer | HIGH |
| 1.3 | Navigation | Switch between tabs | MEDIUM |
| 2.1 | Upload | Try to upload without a file attached | HIGH |
| 2.2 | Upload | Try to upload without a Drawing Number | HIGH |
| 3.1 | Filter / Search | Filter drawings by discipline | HIGH |
| 3.2 | Filter / Search | Search for a drawing by number | HIGH |
| 3.3 | Filter / Search | Filter drawings by status | MEDIUM |
| 4.1 | Viewer | Zoom in and out on a drawing | MEDIUM |
| 4.2 | Viewer | Download a drawing from the viewer | MEDIUM |
| 5.1 | Revisions | View the revision history of a drawing | HIGH |
| 5.2 | Revisions | Upload a new revision of an existing drawing | HIGH |
| 6.1 | Delete | Delete a drawing | HIGH |

---

## 1. Upload + Navigation

### 1.1 — Upload 3 starter drawing files
**What this checks:** Core upload flow works with realistic inputs and creates a reliable baseline dataset for all remaining drawing scenarios.

**Setup:** Download these three files from the repo folder:
- `docs/testing/drawings/3.-2024.02.29-Architectural-Construction-Drawing_Part1.pdf`
- `docs/testing/drawings/3.-2024.02.29-Architectural-Construction-Drawing_Part2.pdf`
- `docs/testing/drawings/3.-2024.02.29-Architectural-Construction-Drawing_Part3.pdf`

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Go to http://localhost:3000/767/drawings
3. Click **Upload**
4. Upload file 1 with:
   - Drawing Number: **A-101**
   - Title: **Architectural Plan — Part 1**
   - Discipline: **Architectural**
   - Revision: **0**
5. Repeat upload for file 2 with:
   - Drawing Number: **A-102**
   - Title: **Architectural Plan — Part 2**
   - Discipline: **Architectural**
   - Revision: **0**
6. Repeat upload for file 3 with:
   - Drawing Number: **A-103**
   - Title: **Architectural Plan — Part 3**
   - Discipline: **Architectural**
   - Revision: **0**
7. Wait for all uploads to complete and return to the drawings list

**Expected result:** All three drawings appear in the list (A-101, A-102, A-103) with the correct titles and uploaded files. No error messages appear.

---

### 1.2 — Open a drawing in the viewer
**What this checks:** Clicking a drawing row opens the full-screen viewer.

**Setup:** The Drawings list must have at least one existing drawing.

**Steps:**
1. Open the Drawings page
2. Click on any drawing in the list
3. Wait for the viewer page to finish loading

**Expected result:** The drawing viewer page opens. The PDF or image of the drawing is displayed. The drawing number and title are shown at the top. No error messages appear.

---

### 1.3 — Switch between tabs (Current Drawings, Drawing Sets, Recycle Bin)
**What this checks:** The three tab views all render correctly.

**Steps:**
1. Open the Drawings page at `/767/drawings`
2. Click the **Drawing Sets** tab
3. Click the **Recycle Bin** tab
4. Click the **Current Drawings** tab to go back

**Expected result:** Each tab loads without errors. The URL changes to match the selected tab. No blank pages or error screens appear.

---

## 2. Upload

### 2.1 — Try to upload a drawing without a file attached
**What this checks:** The form prevents saving when no file has been selected.

**Steps:**
1. Open the Drawings page
2. Click the **Upload** button
3. Fill in Drawing Number: **A-999** and Title: **No File Test**
4. Do NOT select a file
5. Click **Upload** (or Submit)

**Expected result:** An error message appears (e.g. "File is required"). The drawing is NOT created. The upload dialog stays open.

---

### 2.2 — Try to upload a drawing without a Drawing Number
**What this checks:** Drawing Number is enforced as a required field.

**Steps:**
1. Open the Drawings page
2. Click the **Upload** button
3. Leave the Drawing Number field completely blank
4. Type **Missing Number Test** in the Title field
5. Select a PDF file
6. Click **Upload** (or Submit)

**Expected result:** An error message appears near the Drawing Number field (e.g. "Drawing number is required"). The record is NOT created. The dialog stays open.

---

## 3. Filter / Search

### 3.1 — Filter drawings by discipline
**What this checks:** The discipline filter correctly narrows the drawing list to only the selected discipline.

**Setup:** The list must have drawings from at least two different disciplines (e.g. Architectural and Structural).

**Steps:**
1. Open the Drawings page
2. Click the **Filters** button in the toolbar
3. In the Discipline filter, select **Architectural**
4. Wait for the list to update

**Expected result:** Only drawings with Discipline = "Architectural" are shown. Drawings from other disciplines (e.g. Structural, Mechanical) are hidden. Clearing the filter brings all drawings back.

---

### 3.2 — Search for a drawing by number
**What this checks:** The search box filters the list to matching drawing numbers or titles.

**Setup:** The list must have at least two drawings with different numbers.

**Steps:**
1. Open the Drawings page
2. Click the search box (shows "Search drawings..." placeholder)
3. Type **A-101**
4. Wait for the list to filter

**Expected result:** The list narrows to show only drawings whose number or title contains "A-101". Drawings with unrelated numbers disappear. Clearing the search box restores all drawings.

---

### 3.3 — Filter drawings by status
**What this checks:** The status filter correctly shows only drawings matching the selected status.

**Setup:** The list must contain drawings with at least two different statuses.

**Steps:**
1. Open the Drawings page
2. Click the **Filters** button
3. In the Status filter, select **Superseded**
4. Wait for the list to update

**Expected result:** Only drawings with Status = "Superseded" are shown. Active drawings are hidden. Clearing the filter restores all drawings.

---

## 4. Viewer

### 4.1 — Zoom in and out on a drawing
**What this checks:** The zoom controls in the drawing viewer work correctly.

**Setup:** At least one drawing must be uploaded.

**Steps:**
1. Open any drawing in the viewer
2. Click the **Zoom In** button (magnifying glass with + icon) in the toolbar
3. Click it two more times
4. Click the **Zoom Out** button three times

**Expected result:** The drawing zooms in when Zoom In is clicked — the content gets larger. The drawing zooms back out when Zoom Out is clicked. The drawing remains visible throughout and does not disappear or error.

---

### 4.2 — Download a drawing from the viewer
**What this checks:** The Download button triggers a file download of the current drawing.

**Setup:** At least one drawing with an uploaded file must exist.

**Steps:**
1. Open any drawing in the viewer
2. Click the **Download** button (down arrow icon) in the toolbar
3. Wait for the file download to start

**Expected result:** A file download begins in the browser. The downloaded file has the same name as the drawing file. No error message appears.

---

## 5. Revisions

### 5.1 — View the revision history of a drawing
**What this checks:** The Revisions panel is accessible and displays the list of revisions for a drawing.

**Setup:** At least one drawing must exist. Ideally it has more than one revision.

**Steps:**
1. Open any drawing in the viewer
2. Look for a **Revisions** panel or button in the viewer toolbar
3. Click it to open the revisions list

**Expected result:** A list of revisions is shown. Each revision entry shows a revision number (e.g. "0", "1", "2"), a received date, and a status. The current/active revision is highlighted or marked.

---

### 5.2 — Upload a new revision of an existing drawing
**What this checks:** A second (or later) revision can be uploaded for an existing drawing, and it becomes the current version while the old one is preserved.

**Setup:** A drawing must already exist with at least revision "0". Have a second PDF file ready to upload.

**Steps:**
1. Open any drawing in the viewer
2. Open the **Revisions** panel
3. Click **Add Revision** (or the + button)
4. In the form, type **1** in the Revision Number field
5. Set today's date in the Received Date field
6. Select a new PDF file from your computer
7. Click **Upload** (or Save)
8. Wait for the upload to complete

**Expected result:** The new revision appears in the revisions list with number "1". The viewer updates to show the new file. The previous revision (number "0") is still listed but marked as an older version. No error message appears.

---

## 6. Delete

### 6.1 — Delete a drawing
**What this checks:** A drawing can be deleted from the list and it disappears afterwards.

**Setup:** Create a drawing named "First Floor Plan" with number **A-101** before running this scenario.

**Steps:**
1. Open the Drawings page
2. Find the drawing titled **First Floor Plan** (number A-101) in the list
3. Click the three-dot menu (⋯) on that row
4. Click **Delete**
5. Confirm the deletion in the dialog that appears
6. Wait for the page to stop loading

**Expected result:** The drawing "A-101 — First Floor Plan" is no longer visible in the list. A success message (toast) briefly appears. The drawing is gone even after refreshing the page.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Drawing markup / annotations | Requires interactive canvas testing (pins, freehand, shapes, text) |
| Link pins between drawings | Multi-step flow linking two separate drawings |
| Drawing Sets creation | Sets page exists but creation flow not verified |
| Area management | Areas sub-page exists; CRUD not tested |
| Recycle Bin restore | Deleted drawings land in recycle bin; restore flow not tested |
| View switching (Table / Card / List) | Three view modes exist; visual parity not verified |
