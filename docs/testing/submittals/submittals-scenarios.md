# Submittals — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** submittals
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Submittals")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

A **submittal** is a document that a subcontractor sends to the architect or engineer for approval before starting work. Examples: shop drawings (detailed fabrication plans), product data sheets (spec sheets for materials), and samples (physical examples of materials). Until a submittal is approved, work on that part of the project cannot begin.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Submittals page | HIGH |
| 1.2 | Navigation | Open a submittal detail page | HIGH |
| 1.3 | Navigation | View the Ball In Court tab | MEDIUM |
| 2.1 | Create | Create a new submittal with required fields | HIGH |
| 2.2 | Create | Create fails when Title is empty | HIGH |
| 2.3 | Create | Create fails when Number is empty | HIGH |
| 2.4 | Create | Create fails when submittal number already exists | MEDIUM |
| 2.5 | Create | Create a submittal with all optional fields filled | MEDIUM |
| 3.1 | Edit | Edit the title of an existing submittal | HIGH |
| 3.2 | Edit | Edits persist after page refresh | HIGH |
| 3.3 | Edit | Cancel discards unsaved edits | MEDIUM |
| 4.1 | Status | Change status from Draft to Open | HIGH |
| 4.2 | Status | Change status to Distributed | MEDIUM |
| 4.3 | Status | Close a submittal | MEDIUM |
| 5.1 | Attachments | Upload a file attachment | MEDIUM |
| 6.1 | History | View submittal change history | MEDIUM |
| 7.1 | Filter / Search | Search for a submittal by title | MEDIUM |
| 7.2 | Filter / Search | Filter submittals by status | MEDIUM |
| 8.1 | Delete | Delete a submittal (moves to Recycle Bin) | HIGH |
| 8.2 | Delete | View deleted submittals in the Recycle Bin | LOW |
| 9.1 | Privacy | Mark a submittal as Private | LOW |

---

## 1. Navigation

### 1.1 — Open the Submittals page
**What this checks:** The Submittals list page loads without errors and shows existing records.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Navigate to http://localhost:3000/767/submittals
3. Wait for the page to stop loading

**Expected result:** The page loads fully. A table of submittals is visible with columns for Number, Title, Status, Type, Division, and Due Date. No error messages appear.

---

### 1.2 — Open a submittal detail page
**What this checks:** Clicking a record opens the detail view with all tabs visible.

**Setup:** The Submittals list must have at least one existing record.

**Steps:**
1. Open the Submittals page (`/767/submittals`)
2. Click on the title of any submittal in the list
3. Wait for the page to finish loading

**Expected result:** The detail page opens. Tabs are visible (General, Workflow, Distributions, Attachments, History). The submittal title, number, and status are shown at the top. No error messages appear.

---

### 1.3 — View the Ball In Court tab
**What this checks:** The "Ball In Court" tab filters the list to submittals currently awaiting action from a specific person or team. Think of "ball in court" like a tennis rally — whoever has the ball is the one who needs to act next.

**Setup:** At least one submittal must have a Ball In Court value filled in (e.g. "Architect").

**Steps:**
1. Open the Submittals page (`/767/submittals`)
2. Click the **Ball In Court** tab at the top of the table
3. Wait for the list to update

**Expected result:** Only submittals that have a Ball In Court value are displayed. Submittals with no Ball In Court value are hidden. No error message appears.

---

## 2. Create

### 2.1 — Create a new submittal with required fields
**What this checks:** A user can create a submittal and it appears in the list.

**Steps:**
1. Open the Submittals page (`/767/submittals`)
2. Click the **Add Submittal** button (top right)
3. In the **Number** field, type: **TEST-001**
4. In the **Title** field, type: **Concrete Mix Design**
5. Leave Status as **Draft**
6. Click **Create Submittal**
7. Wait for the dialog to close

**Expected result:** The new submittal "Concrete Mix Design" appears in the list with number TEST-001 and status Draft. No error messages are shown.

---

### 2.2 — Create fails when Title is empty
**What this checks:** The form prevents saving when the required Title field is blank.

**Steps:**
1. Open the Submittals page
2. Click **Add Submittal**
3. Fill in **Number**: **TEST-VAL-001**
4. Leave the **Title** field completely empty
5. Click **Create Submittal**

**Expected result:** An error message appears near the Title field saying "Title is required". The submittal is NOT created. The dialog stays open.

---

### 2.3 — Create fails when Number is empty
**What this checks:** The form prevents saving when the required Number field is blank.

**Steps:**
1. Open the Submittals page
2. Click **Add Submittal**
3. Leave the **Number** field completely empty
4. Type **Doors and Hardware** in the **Title** field
5. Click **Create Submittal**

**Expected result:** An error message appears near the Number field saying "Number is required". The submittal is NOT created. The dialog stays open.

---

### 2.4 — Create fails when submittal number already exists
**What this checks:** The system prevents two submittals from having the same number on the same project.

**Setup:** There must already be a submittal with number TEST-001 (created in scenario 2.1).

**Steps:**
1. Open the Submittals page
2. Click **Add Submittal**
3. In **Number**, type: **TEST-001** (same as the one created in scenario 2.1)
4. In **Title**, type: **Duplicate Number Test**
5. Click **Create Submittal**

**Expected result:** An error message appears saying the submittal number already exists for this project. The submittal is NOT created.

---

### 2.5 — Create a submittal with all optional fields filled
**What this checks:** All form fields (type, division, specification section, due date, lead time, ball in court, description) can be saved correctly.

**Steps:**
1. Open the Submittals page
2. Click **Add Submittal**
3. Enter **Number**: **TEST-FULL-001**
4. Enter **Title**: **Steel Reinforcing Shop Drawings**
5. Enter **Specification Section**: **03-2000 - Concrete Reinforcing**
6. Enter **Division**: **Division 3**
7. Enter **Submittal Type**: **Shop Drawing**
8. Set **Status**: **Open**
9. Set **Final Due Date**: **2026-06-01**
10. Enter **Lead Time (days)**: **14**
11. Enter **Ball In Court**: **Structural Engineer**
12. Enter **Description**: **Shop drawings for all reinforcing steel per structural drawings.**
13. Click **Create Submittal**
14. Find "Steel Reinforcing Shop Drawings" in the list and click to open

**Expected result:** The detail page shows all saved values: Spec Section = 03-2000 - Concrete Reinforcing, Division = Division 3, Type = Shop Drawing, Status = Open, Due Date = 6/1/2026, Lead Time = 14, Ball In Court = Structural Engineer. No fields are blank or reverted.

---

## 3. Edit

### 3.1 — Edit the title of an existing submittal
**What this checks:** Users can update a submittal and the new value is saved.

**Setup:** There must be at least one existing submittal.

**Steps:**
1. Open the Submittals page
2. Click any submittal to open its detail page
3. Click the **Edit** button (pencil icon, top right)
4. Clear the Title field and type: **Updated Submittal Title Test**
5. Click **Update Submittal**
6. Wait for the dialog to close

**Expected result:** The detail page now shows the title "Updated Submittal Title Test". A success message (toast) briefly appears. The old title is no longer visible.

---

### 3.2 — Edits persist after page refresh
**What this checks:** Saved changes are stored in the database, not just shown temporarily in the browser.

**Setup:** Complete scenario 3.1 first (edit a title and save it).

**Steps:**
1. After saving an edit, stay on the detail page
2. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page
3. Wait for the page to reload

**Expected result:** The updated title and any other changes are still shown after the refresh. No data reverted to the old values.

---

### 3.3 — Cancel discards unsaved edits
**What this checks:** Unsaved edits are discarded when the user clicks Cancel.

**Setup:** There must be at least one existing submittal.

**Steps:**
1. Open any submittal detail page
2. Click the **Edit** button
3. Change the Title to something random: **DO NOT SAVE THIS**
4. Click **Cancel** (instead of Update Submittal)

**Expected result:** The dialog closes and the original title is still shown. "DO NOT SAVE THIS" does not appear anywhere on the page.

---

## 4. Status Workflow

Submittals move through a defined review process. The four statuses are:
- **Draft** — just created, not yet sent out
- **Open** — being prepared for review
- **Distributed** — sent to the architect or engineer for their review and comments
- **Closed** — review is complete; the submittal is finalized

### 4.1 — Change status from Draft to Open
**What this checks:** The status workflow moves forward from Draft to Open.

**Setup:** There must be at least one submittal with status Draft.

**Steps:**
1. Open any submittal with status **Draft**
2. Click the **Edit** button
3. In the **Status** dropdown, select **Open**
4. Click **Update Submittal**
5. Wait for the dialog to close

**Expected result:** The status badge on the detail page now shows "Open". No error message appears.

---

### 4.2 — Change status to Distributed
**What this checks:** A submittal can be marked as Distributed, meaning it has been sent to the architect or engineer for review.

**Setup:** There must be at least one submittal with status Open.

**Steps:**
1. Open a submittal with status **Open**
2. Click the **Edit** button
3. In the **Status** dropdown, select **Distributed**
4. Click **Update Submittal**
5. Wait for the dialog to close

**Expected result:** The status badge now shows "Distributed". No error message appears.

---

### 4.3 — Close a submittal
**What this checks:** A submittal can be fully closed once the review process is complete.

**Setup:** There must be at least one submittal with status Distributed.

**Steps:**
1. Open a submittal with status **Distributed**
2. Click the **Edit** button
3. In the **Status** dropdown, select **Closed**
4. Click **Update Submittal**
5. Wait for the dialog to close

**Expected result:** The status badge now shows "Closed". No error message appears. The submittal still appears in the main list (it is not deleted).

---

## 5. Attachments

### 5.1 — Upload a file attachment
**What this checks:** A file can be attached to a submittal and is visible afterwards.

**Setup:**
- Have a small file ready to upload (any image or PDF, under 5 MB)
- There must be at least one existing submittal

**Steps:**
1. Open any submittal detail page
2. Click the **Attachments** tab
3. Click **Upload** or drag a file onto the upload area
4. Select a small file from your computer
5. Wait for the upload to complete

**Expected result:** The uploaded file appears in the attachments list with its filename. No error message appears.

---

## 6. History

### 6.1 — View submittal change history
**What this checks:** The History tab shows a log of edits made to the submittal.

**Setup:** Make at least one edit to a submittal before running this scenario.

**Steps:**
1. Open any submittal that has been edited at least once
2. Click the **History** tab
3. Scroll through the history entries

**Expected result:** At least one history entry is visible. Each entry shows what was changed and when. No error message appears.

---

## 7. Filter / Search

### 7.1 — Search for a submittal by title
**What this checks:** The search box filters the list to matching records.

**Setup:** The Submittals list must have at least two records with different titles.

**Steps:**
1. Open the Submittals page (`/767/submittals`)
2. Click the search box (shows "Search submittals...")
3. Type part of a known submittal title, e.g. **Concrete**
4. Wait for the list to filter

**Expected result:** The list narrows to show only records whose title contains "Concrete". Records with unrelated titles are no longer visible. Clearing the search box brings all records back.

---

### 7.2 — Filter submittals by status
**What this checks:** The status filter correctly narrows the list.

**Setup:** The list must have submittals in at least two different statuses.

**Steps:**
1. Open the Submittals page
2. Click the **Filters** button in the toolbar
3. Select **Status** and choose **Open**
4. Wait for the list to update

**Expected result:** Only submittals with status Open are shown. Submittals with other statuses (Draft, Distributed, Closed) are hidden. Removing the filter brings all records back.

---

## 8. Delete / Recycle Bin

### 8.1 — Delete a submittal (moves to Recycle Bin)
**What this checks:** Deleting a submittal removes it from the main list and places it in the Recycle Bin (it is not permanently deleted).

**Setup:** Create a submittal named "Delete Me Submittal" before running this scenario.

**Steps:**
1. Open the Submittals page
2. Find the row titled **Delete Me Submittal**
3. Click the three-dot menu (⋯) on that row
4. Click **Delete**
5. Confirm the deletion in the dialog that appears
6. Wait for the page to stop loading

**Expected result:** The record "Delete Me Submittal" is no longer visible in the main Items list. Clicking the Recycle Bin tab shows the deleted submittal. A success message (toast) briefly appears.

---

### 8.2 — View deleted submittals in the Recycle Bin
**What this checks:** The Recycle Bin tab shows previously deleted records.

**Setup:** Complete scenario 8.1 first.

**Steps:**
1. Open the Submittals page (`/767/submittals`)
2. Click the **Recycle Bin** tab at the top of the table
3. Wait for the list to load

**Expected result:** The Recycle Bin tab shows the submittal deleted in scenario 8.1. It is not visible on the main Items tab. No error messages appear.

---

## 9. Privacy

### 9.1 — Mark a submittal as Private
**What this checks:** The Private checkbox can be checked and saved. Private submittals are only visible to project admins and anyone on the distribution list — not the full project team.

**Steps:**
1. Open the Submittals page
2. Click **Add Submittal**
3. Enter **Number**: **PRIV-001** and **Title**: **Private Submittal Test**
4. Scroll down to the Content section
5. Check the box labelled **Private (visible only to admins and distribution list)**
6. Click **Create Submittal**
7. Find "Private Submittal Test" in the list and click to open

**Expected result:** The submittal detail page shows the private flag is enabled. No error messages appear.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Workflow steps (reviewer assignment) | Multi-step flow with user assignments — needs dedicated test |
| Distribution (send for review) | Requires configured recipients |
| Submittal Packages | Tab exists but marked "Coming Soon" |
| Spec Sections tab | Tab exists but marked "Coming Soon" |
| Restore from Recycle Bin | UI may not expose this yet |
| Export to PDF/CSV | Not yet implemented in this tool |
