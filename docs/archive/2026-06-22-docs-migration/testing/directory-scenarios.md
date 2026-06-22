# Directory — Guided Test Scenarios

- **Generated:** 2026-04-08
- **Tool:** directory
- **Audience:** Non-technical testers — no construction knowledge required
- **Test Runner UI:** http://localhost:3000/testing (select "Directory")
- **Test Project:** Project 767 — Alleato AI
- **Login:** test1@mail.com / test12026!!!

The **Directory** is a contact book for the project. It lists every person and company involved — subcontractors, architects, engineers, the owner's team, and anyone else on the project. Each person has a name, email, phone number, job title, and company. You can add people, edit their details, search for them, and remove them when they are no longer on the project.

---

## Scenario Summary

| # | Category | Name | Priority |
|---|----------|------|----------|
| 1.1 | Navigation | Open the Directory page | HIGH |
| 1.2 | Navigation | Open a person detail page | HIGH |
| 2.1 | Add Person | Add a new person to the directory | HIGH |
| 2.2 | Add Person | Try to add a person without a first name | HIGH |
| 2.3 | Add Person | Add a person and assign them to a company | MEDIUM |
| 3.1 | Add Company | Add a new company to the directory | HIGH |
| 3.2 | Add Company | Try to add a company without a name | HIGH |
| 4.1 | Edit | Edit a person's phone number | HIGH |
| 4.2 | Edit | Edited changes persist after page refresh | HIGH |
| 4.3 | Edit | Cancel discards unsaved changes | MEDIUM |
| 5.1 | Delete | Delete a person from the directory | HIGH |
| 6.1 | Search | Search for a person by name | HIGH |
| 6.2 | Search | Search for contacts by company name | MEDIUM |
| 7.1 | Filter | Filter directory by role or permission level | MEDIUM |

---

## 1. Navigation

### 1.1 — Open the Directory page
**What this checks:** The Directory list page loads without errors and shows existing contacts.

**Steps:**
1. Make sure you are logged in as test1@mail.com
2. Go to http://localhost:3000/767/directory
3. Wait for the page to finish loading

**Expected result:** The Directory page loads without errors. A list of people (names, companies, roles) is visible. No blank screen or error message appears.

---

### 1.2 — Open a person detail page
**What this checks:** Clicking a person's name opens their full detail view.

**Setup:** The Directory list must have at least one person.

**Steps:**
1. Open the Directory page
2. Click on any person's name in the list
3. Wait for the page to finish loading

**Expected result:** A detail view opens for that person. Their name, email, phone, company, and role are visible. No error messages appear.

---

## 2. Add Person

### 2.1 — Add a new person to the directory
**What this checks:** A user can create a new person and they appear in the list.

**Steps:**
1. Open the Directory page
2. Click the **Add Person** button (top right)
3. In the **First Name** field, type: **John**
4. In the **Last Name** field, type: **Smith**
5. In the **Email** field, type: **jsmith@testco.com**
6. In the **Job Title** field, type: **Project Manager**
7. Click **Save** (or Create)
8. Wait for the page to stop loading

**Expected result:** John Smith appears in the directory list. His email and job title are visible. A success message (toast) briefly appears.

---

### 2.2 — Try to add a person without a first name
**What this checks:** The form prevents saving when the required First Name field is empty.

**Steps:**
1. Open the Directory page
2. Click the **Add Person** button
3. Leave the **First Name** field empty
4. Fill in Last Name: **Smith**
5. Fill in Email: **noname@test.com**
6. Click **Save**

**Expected result:** An error message appears near the First Name field (e.g. "First name is required"). The record is NOT created. The form stays open.

---

### 2.3 — Add a person and assign them to a company
**What this checks:** A new person can be linked to an existing company and the association saves correctly.

**Setup:** ABC Concrete Co must already exist in the companies list.

**Steps:**
1. Open the Directory page
2. Click the **Add Person** button
3. Type **First Name**: **Maria**
4. Type **Last Name**: **Torres**
5. In the **Company** field, select or type **ABC Concrete Co**
6. In the **Job Title** field, type: **Site Supervisor**
7. Click **Save**
8. Find "Maria Torres" in the list and click her name

**Expected result:** Maria Torres appears in the directory. Her company shows "ABC Concrete Co" and job title shows "Site Supervisor". No error appears.

---

## 3. Add Company

### 3.1 — Add a new company to the directory
**What this checks:** A new company record can be created and appears in the companies list.

**Steps:**
1. Open the Directory page
2. Click the **Companies** tab (or navigate to the Companies section)
3. Click the **Add Company** button
4. In the **Company Name** field, type: **Steel Frame Solutions**
5. In the **Trade** (or Type) field, select **Structural Steel** (or the closest option)
6. Click **Save**
7. Wait for the page to stop loading

**Expected result:** Steel Frame Solutions appears in the companies list. No error messages appear.

---

### 3.2 — Try to add a company without a name
**What this checks:** The form prevents saving when the required Company Name field is empty.

**Steps:**
1. Open the Companies section of the Directory
2. Click **Add Company**
3. Leave the **Company Name** field empty
4. Click **Save**

**Expected result:** An error message appears near the Company Name field. The record is NOT created. The form stays open.

---

## 4. Edit

### 4.1 — Edit a person's phone number
**What this checks:** Users can edit a contact's details and the updated value is saved.

**Setup:** At least one person must exist in the directory.

**Steps:**
1. Open the Directory page
2. Click on any person's name to open their detail view
3. Click the **Edit** button
4. In the **Phone** field, clear any existing value and type: **555-867-5309**
5. Click **Save**
6. Wait for the page to stop loading

**Expected result:** The detail view now shows the phone number 555-867-5309. A success toast briefly appears.

---

### 4.2 — Edited changes persist after page refresh
**What this checks:** Saved changes are stored in the database, not just shown temporarily in the browser.

**Setup:** Complete scenario 4.1 first (edit a phone number and save).

**Steps:**
1. After saving the edit in scenario 4.1, stay on the detail page
2. Press **Ctrl+R** (or Cmd+R on Mac) to refresh the page
3. Wait for the page to reload

**Expected result:** The phone number 555-867-5309 is still shown after the refresh. No data reverted to the old value.

---

### 4.3 — Cancel discards unsaved changes
**What this checks:** Unsaved edits are discarded when the user cancels the form.

**Setup:** At least one person must exist in the directory.

**Steps:**
1. Open any person's detail view
2. Click the **Edit** button
3. Change the Job Title field to: **DO NOT SAVE THIS**
4. Click **Cancel** (instead of Save)

**Expected result:** The form closes. The original job title is still shown. "DO NOT SAVE THIS" does not appear anywhere on the page.

---

## 5. Delete

### 5.1 — Delete a person from the directory
**What this checks:** A person can be deleted and they disappear from the list afterwards.

**Setup:** Create a person named "John Smith" first (see scenario 2.1).

**Steps:**
1. Open the Directory page
2. Find the person named **John Smith** (created in scenario 2.1)
3. Click the three-dot menu (⋯) on that row, or open the detail view
4. Click **Delete** (or Remove)
5. Confirm the deletion in the dialog that appears
6. Wait for the page to stop loading

**Expected result:** John Smith is no longer visible in the directory list. A success toast briefly appears.

---

## 6. Search

### 6.1 — Search for a person by name
**What this checks:** The search box filters the directory to matching contacts.

**Setup:** At least two people with different names must exist in the directory.

**Steps:**
1. Open the Directory page
2. Click the search box (usually shows a magnifying glass icon or says "Search...")
3. Type: **Maria Torres**
4. Wait for the list to filter

**Expected result:** The list narrows to show only contacts whose name contains "Maria Torres". Other people are hidden. Clearing the search box brings all records back.

---

### 6.2 — Search for contacts by company name
**What this checks:** The search box can find contacts by company name, not just by person name.

**Setup:** At least one person linked to "ABC Concrete Co" must exist.

**Steps:**
1. Open the Directory page
2. Click the search box
3. Type: **ABC Concrete Co**
4. Wait for the list to filter

**Expected result:** Only contacts associated with "ABC Concrete Co" are shown. Contacts from other companies are hidden. Clearing the search brings all records back.

---

## 7. Filter

### 7.1 — Filter directory by role or permission level
**What this checks:** The role filter narrows the list to only people with a specific role on the project.

**Setup:** Multiple people with at least two different roles must exist.

**Steps:**
1. Open the Directory page
2. Click the **Filters** button (or the filter icon in the toolbar)
3. Find the **Role** (or Permission) filter
4. Select a role such as **Project Manager** or **Standard**
5. Click **Apply** (if required)

**Expected result:** The directory list updates to show only people who have the selected role. People with other roles are hidden. Removing the filter restores the full list.

---

## Known Gaps (not yet tested)

| Feature | Reason |
|---------|--------|
| Send invite email | Requires email delivery to be configured |
| Bulk import (CSV) | Multi-step flow, complex to test manually |
| Export directory to CSV | List-level only, needs UI verification |
| Groups / distribution lists | Groups tab exists but flow not fully mapped |
| Deactivate vs. Delete | Two separate actions — behavior difference needs verification |
