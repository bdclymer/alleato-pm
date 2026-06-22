# Directory — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions — People | 18 | HIGH |
| Core Actions — Companies | 12 | HIGH |
| Core Actions — Vendors | 5 | MEDIUM |
| Views & Navigation | 11 | HIGH |
| Fields & Data — Person | 10 | HIGH |
| Fields & Data — Company | 8 | HIGH |
| Permissions & Access Levels | 8 | HIGH |
| Search & Filter | 10 | HIGH |
| Import / Export | 7 | MEDIUM |
| Integrations | 5 | MEDIUM |
| Advanced Features — Roles & Groups | 14 | MEDIUM |
| **TOTAL** | **108** | |

---

## 1. Core Actions — People

> Source: Codebase — `POST /api/projects/[projectId]/directory/people`, `PATCH /api/projects/[projectId]/directory/people/[personId]`, `DELETE /api/projects/[projectId]/directory/people/[personId]`, `POST /api/projects/[projectId]/directory/people/bulk-invite`

### 1.1 Add Person (New)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Add a new person with required fields only | 1. Navigate to /767/directory<br>2. Click "Add Members"<br>3. Fill First Name, Last Name, person_type<br>4. Submit | Person appears in "All Project Members" table; success toast shown | HIGH | 🔲 | |
| 1.1.2 | Add a person with all optional fields | Fill First Name, Last Name, Email, Job Title, Phone Mobile, Phone Business, Company | All fields persisted; detail view shows every entered value | MEDIUM | 🔲 | |
| 1.1.3 | Add fails when first name is missing | Leave First Name blank, fill Last Name, submit | Validation error "Missing required fields: first_name"; form not submitted | HIGH | 🔲 | |
| 1.1.4 | Add fails when last name is missing | Leave Last Name blank, fill First Name, submit | Validation error "Missing required fields: last_name"; form not submitted | HIGH | 🔲 | |
| 1.1.5 | Add fails when person_type is missing | Omit person_type, fill First Name and Last Name | Validation error "Missing required fields: person_type"; form not submitted | HIGH | 🔲 | |
| 1.1.6 | Add a person and assign them to a company | Fill required fields + select Company from dropdown | Person saved with company association; company name shown in member row | HIGH | 🔲 | |
| 1.1.7 | Add an existing person to the project | Submit with person_id of an already-existing person (not a new record) | Person added to project via membership; no duplicate person record created | HIGH | 🔲 | |

### 1.2 Edit Person

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit a person's phone number | Find person in list → row action menu → Edit → change phone → Save | Updated phone persists after page refresh | HIGH | 🔲 | |
| 1.2.2 | Edit a person's job title | Edit person → change Job Title → Save | New job title displayed in member table and after refresh | HIGH | 🔲 | |
| 1.2.3 | Edit a person's email address | Edit person → change Email → Save | New email displayed; no duplicate record created | HIGH | 🔲 | |
| 1.2.4 | Cancel edit discards changes | Edit person → change Job Title to "DO NOT SAVE" → Cancel | Original job title shown; "DO NOT SAVE" not persisted | HIGH | 🔲 | |
| 1.2.5 | Edit pre-populates saved values | Open Edit for a person with all fields filled | All fields show previously saved values; no blank "Select..." placeholders | HIGH | 🔲 | |

### 1.3 Remove / Deactivate Person

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Remove a person from the project | Row action menu → Remove → Confirm | Person disappears from "All Project Members" table; success toast shown | HIGH | 🔲 | |
| 1.3.2 | Cancel removal leaves person intact | Row action menu → Remove → Cancel | Person remains in the list unchanged | HIGH | 🔲 | |
| 1.3.3 | Removed person is deactivated (soft delete) | Remove a person | Person's membership status set to inactive; underlying people record not deleted | HIGH | 🔲 | |

### 1.4 Invite Person

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.4.1 | Bulk invite selected people | Select ≥1 people with invite_status = not_invited → Bulk Invite | API POST to /bulk-invite succeeds; invite_status updates | HIGH | 🔲 | |
| 1.4.2 | Bulk invite requires personIds | Submit bulk invite with empty personIds | 400 error "personIds are required" | MEDIUM | 🔲 | |
| 1.4.3 | Invite status shows in member row | Invite a person → check row | Row shows "Invite Sent" status badge | MEDIUM | 🔲 | |

---

## 2. Core Actions — Companies

> Source: Codebase — `POST /api/projects/[projectId]/directory/companies`, `PATCH /api/projects/[projectId]/directory/companies/[companyId]`, `DELETE /api/projects/[projectId]/directory/companies/[companyId]`

### 2.1 Add Company

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | Add a company with required name only | Companies API → POST with name only | Company created; appears in Companies section | HIGH | 🔲 | |
| 2.1.2 | Add a company with all fields | Fill name, address, city, state, zip, business_phone, email_address, company_type, erp_vendor_id | All fields persisted; company detail shows every field | MEDIUM | 🔲 | |
| 2.1.3 | Add fails when name is missing | POST with no name field | 422 error "Name is required"; company not created | HIGH | 🔲 | |
| 2.1.4 | Duplicate ERP Vendor ID rejected | Create two companies with the same erp_vendor_id | 422 error "ERP Vendor ID must be unique" on second attempt | MEDIUM | 🔲 | |

### 2.2 Edit Company

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Edit company name | PATCH company → change name → refresh | Updated name shown in Companies section | HIGH | 🔲 | |
| 2.2.2 | Edit company address | PATCH company → change city, state, zip | Updated address persists | MEDIUM | 🔲 | |
| 2.2.3 | Edit company type | PATCH company → change company_type to SUBCONTRACTOR | Updated type shown | MEDIUM | 🔲 | |
| 2.2.4 | Edit non-existent company returns 404 | PATCH /companies/[badId] | 404 "Company not found" | MEDIUM | 🔲 | |

### 2.3 Delete Company

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | Delete a company with no assigned users | Admin deletes a company that has no members | 204 response; company removed from project | HIGH | 🔲 | |
| 2.3.2 | Delete company with users blocked | Attempt to delete a company that has assigned members | 403 "business_rule_violation" — cannot delete company with users | HIGH | 🔲 | |
| 2.3.3 | Delete requires admin permission | Non-admin user attempts DELETE /companies/[id] | 403 "insufficient_permissions" | HIGH | 🔲 | |
| 2.3.4 | Companies section member count is correct | View Companies section after adding/removing members | Member count badge reflects current number of active project members per company | MEDIUM | 🔲 | |

---

## 3. Core Actions — Vendors

> Source: Codebase — Vendors section + `/api/projects/[projectId]/directory/vendors`

### 3.1 Add & Remove Vendor

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.1.1 | Add a vendor to the project | Click "+ Add" in Vendors section → search → select vendor → Add Vendor | Vendor appears in Vendors table with Name, Class, Location columns | MEDIUM | 🔲 | |
| 3.1.2 | Duplicate vendor not added twice | Attempt to add a vendor already in existingVendorIds list | Vendor not shown in picker (filtered out from available options) | MEDIUM | 🔲 | |
| 3.1.3 | Remove a vendor from the project | Row action → Remove → Confirm | Vendor disappears from Vendors table; success toast shown | MEDIUM | 🔲 | |
| 3.1.4 | Cancel removal leaves vendor intact | Row action → Remove → Cancel | Vendor remains in Vendors table | LOW | 🔲 | |
| 3.1.5 | Vendor table shows Name, Class, Location columns | Navigate to /767/directory | Vendors table renders all three columns | MEDIUM | 🔲 | |

---

## 4. Views & Navigation

> Source: Codebase — `frontend/src/app/(main)/[projectId]/directory/page.tsx` page structure

### 4.1 Page Load & Sections

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | Directory page loads all four sections | Navigate to /767/directory | Page renders: Project Team, Companies, Vendors, All Project Members sections — no blank screen | HIGH | 🔲 | |
| 4.1.2 | Project Team section shows assigned roles | Navigate to /767/directory with roles configured | Project Team table shows: avatar, Name, Role, Email, Phone columns for each assigned member | HIGH | 🔲 | |
| 4.1.3 | Companies section shows company list | Navigate to /767/directory with members who have companies | Companies section renders company rows with Name and Members count | HIGH | 🔲 | |
| 4.1.4 | Vendors section shows vendor list | Navigate to /767/directory with vendors added | Vendors section renders vendor rows with Name, Class, Location | HIGH | 🔲 | |
| 4.1.5 | All Project Members section shows filtered list | Navigate to /767/directory | All Project Members section shows searchable, filterable table of active members | HIGH | 🔲 | |

### 4.2 Empty States

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.2.1 | Empty Project Team shows prompt to add role | View Project Team section with no roles defined | "No roles defined yet. Add a role" message appears with clickable link | MEDIUM | 🔲 | |
| 4.2.2 | Empty All Project Members shows prompt to add | View All Project Members section with no members | "No members yet. Add one" message appears with clickable link | MEDIUM | 🔲 | |
| 4.2.3 | Empty Vendors section shows prompt to add | View Vendors section with no vendors | "No vendors yet. Add one" message appears with clickable link | MEDIUM | 🔲 | |
| 4.2.4 | Search with no matches shows empty state | Enter a search query that matches nothing | "No members match your search." message shown in table body | HIGH | 🔲 | |

### 4.3 Header Actions

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.3.1 | Export button visible in page header | Navigate to /767/directory | "Export" button (with Download icon) visible in top-right header | MEDIUM | 🔲 | |
| 4.3.2 | Add Members button opens dialog | Click "Add Members" button in header | Add Member dialog opens with searchable people picker | HIGH | 🔲 | |

---

## 5. Fields & Data — Person

> Source: Codebase — DirectoryService, `people` table, Procore manifest columns: Name, Email Address, Cell Phone, Job Title, Address, Company, ERP, Connected Status, Permissions Template, Type

### 5.1 Person Field Validation

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 5.1.1 | first_name | Text | Yes | "Jane" accepted and saved | Blank → validation error | HIGH | 🔲 |
| 5.1.2 | last_name | Text | Yes | "Doe" accepted and saved | Blank → validation error | HIGH | 🔲 |
| 5.1.3 | email | Email text | No | "jane@example.com" accepted | — (optional field) | HIGH | 🔲 |
| 5.1.4 | job_title | Text | No | "Superintendent" accepted | — (optional field) | MEDIUM | 🔲 |
| 5.1.5 | phone_mobile | Text | No | "555-123-4567" accepted | — (optional field) | MEDIUM | 🔲 |
| 5.1.6 | phone_business | Text | No | "555-987-6543" accepted | — (optional field) | LOW | 🔲 |
| 5.1.7 | person_type | Enum | Yes | "employee" or "contact" accepted | Blank → validation error | HIGH | 🔲 |

### 5.2 Invite & Status Fields

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.2.1 | Invite status reflects not_invited for new contact | Add a new person | Row shows "Not Invited" status | HIGH | 🔲 | |
| 5.2.2 | Invite status shows Invite Sent after invite | Send invite → check row | Status changes to "Invite Sent" | HIGH | 🔲 | |
| 5.2.3 | Member status shows Active for active membership | Add a member with status=active | Row shows "Active" badge | HIGH | 🔲 | |

---

## 6. Fields & Data — Company

> Source: Codebase — CompanyService, `companies` table, company_type enum

### 6.1 Company Field Validation

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 6.1.1 | name | Text | Yes | "Apex Concrete" accepted | Blank → 422 "Name is required" | HIGH | 🔲 |
| 6.1.2 | address | Text | No | "123 Main St" accepted | — (optional) | MEDIUM | 🔲 |
| 6.1.3 | city / state / zip | Text | No | "Phoenix", "AZ", "85001" accepted | — (optional) | MEDIUM | 🔲 |
| 6.1.4 | business_phone | Text | No | "602-555-0100" accepted | — (optional) | LOW | 🔲 |
| 6.1.5 | company_type | Enum | No | YOUR_COMPANY, VENDOR, SUBCONTRACTOR, SUPPLIER all selectable | — | MEDIUM | 🔲 |
| 6.1.6 | erp_vendor_id | Text | No | Unique string accepted | Duplicate → 422 "ERP Vendor ID must be unique" | MEDIUM | 🔲 |
| 6.1.7 | status | Enum | No | ACTIVE, INACTIVE selectable | — | MEDIUM | 🔲 |
| 6.1.8 | primary_contact_id | FK | No | Selecting a valid person from project saved | — | LOW | 🔲 |

---

## 7. Permissions & Access Levels

> Source: Codebase — `GET /api/projects/[projectId]/directory/permissions`, `PUT /api/projects/[projectId]/directory/permissions`, `DELETE /api/projects/[projectId]/directory/permissions`, PermissionService

### 7.1 Permission Levels

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 7.1.1 | Read-only user can view directory list | read_only | Navigate to /767/directory | Page loads; no access denied | HIGH | 🔲 | |
| 7.1.2 | Read-only user cannot add members | read_only | POST to /directory/people | 403 "Forbidden" returned | HIGH | 🔲 | |
| 7.1.3 | Standard (write) user can add members | standard | POST to /directory/people with required fields | 201 created | HIGH | 🔲 | |
| 7.1.4 | Standard user cannot create distribution groups | standard | POST to /directory/groups | 403 "Forbidden" returned | HIGH | 🔲 | |
| 7.1.5 | Admin user can create groups | admin | POST to /directory/groups with name | 201 created | HIGH | 🔲 | |
| 7.1.6 | Admin user can delete companies | admin | DELETE /directory/companies/[id] | 204 success | HIGH | 🔲 | |
| 7.1.7 | Non-admin cannot delete companies | standard | DELETE /directory/companies/[id] | 403 "insufficient_permissions" | HIGH | 🔲 | |
| 7.1.8 | Permission override updates correctly | Admin sets person permission to read_only | PUT /directory/permissions with read_only → 200; subsequent GET reflects new level | MEDIUM | 🔲 | |

---

## 8. Search & Filter

> Source: Codebase — `ExternalMembersSection` search + company filter; `GET /api/projects/[projectId]/directory/people` search param; `GET /api/projects/[projectId]/directory/companies` search param

### 8.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Search members by first name | Type partial first name in search box | List filters to matching members in real time | HIGH | 🔲 | |
| 8.1.2 | Search members by last name | Type partial last name | List filters to matching members | HIGH | 🔲 | |
| 8.1.3 | Search members by email | Type partial email address | Matching member rows shown; others hidden | HIGH | 🔲 | |
| 8.1.4 | Search members by company name | Type a company name in search box | Only members belonging to that company shown | HIGH | 🔲 | |
| 8.1.5 | Search members by job title | Type a job title | Members with matching job title shown | MEDIUM | 🔲 | |
| 8.1.6 | Clear search restores full list | Type a search term then clear the input | All members shown again | HIGH | 🔲 | |

### 8.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.2.1 | Filter by company dropdown | Select a specific company from the company filter dropdown | Only members of that company shown in All Project Members table | HIGH | 🔲 | |
| 8.2.2 | Company filter shows only companies in project | Open company filter dropdown | Only companies that have at least one project member are listed | MEDIUM | 🔲 | |
| 8.2.3 | Filter by member type (user vs. contact) | Apply type=user filter to /directory/people API | Only users (employees) returned; contacts excluded | MEDIUM | 🔲 | |
| 8.2.4 | Filter by status (active / inactive) | Apply status=inactive filter to /directory/people API | Only inactive members returned | MEDIUM | 🔲 | |

---

## 9. Import / Export

> Source: Codebase — `POST /api/projects/[projectId]/directory/import`, `GET /api/projects/[projectId]/directory/export`, `DirectoryAdminService`

### 9.1 Export

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Export directory list as CSV | Click "Export" button on /767/directory | CSV file downloads with default columns: Name, Email, Phone, Job Title, Company, Permission, Invite Status, Status | MEDIUM | 🔲 | |
| 9.1.2 | Export applies current filters | Apply a search/company filter, then export | CSV contains only the filtered rows | MEDIUM | 🔲 | |
| 9.1.3 | Export without read permission blocked | Read-only with no directory read access → GET /export | 403 response; no file downloaded | HIGH | 🔲 | |

### 9.2 Import

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.2.1 | Import CSV of people | POST /import with a valid CSV file and type=users | 200 success; people from CSV appear in directory | MEDIUM | 🔲 | |
| 9.2.2 | Import without file returns 400 | POST /import with no file attached | 400 "CSV file is required" | HIGH | 🔲 | |
| 9.2.3 | Import with skipDuplicates=true skips existing | Import CSV containing a person already in directory | Existing person not duplicated; import result shows skipped count | MEDIUM | 🔲 | |
| 9.2.4 | Import with updateExisting=true updates fields | Import CSV with updated email for existing person | Existing person's email updated; no duplicate created | MEDIUM | 🔲 | |

---

## 10. Integrations

> Source: Codebase — directory membership drives RFI assignees, submittal ball-in-court, punch list assignees

### 10.1 Cross-Tool Integration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.1.1 | RFI assignee dropdown shows directory members | Navigate to any RFI → Assignee field | Dropdown lists people from project directory only | MEDIUM | 🔲 | |
| 10.1.2 | Submittal ball-in-court shows directory members | Navigate to Submittals → create/edit submittal → Ball-in-Court field | Dropdown lists people from project directory | MEDIUM | 🔲 | |
| 10.1.3 | Punch list assignee shows directory members | Navigate to Punch List → create item → Assignee field | Dropdown lists people from project directory | MEDIUM | 🔲 | |
| 10.1.4 | Removing a member from directory does not break existing assignments | Remove a person who is assigned to an RFI | RFI retains the person's name as a historical reference; no broken foreign key | MEDIUM | 🔲 | |
| 10.1.5 | Company filter in People API scopes correctly | GET /directory/people?company_id=X | Only people linked to company X returned | MEDIUM | 🔲 | |

---

## 11. Advanced Features — Roles & Groups

> Source: Codebase — `GET/POST/PUT/DELETE /api/projects/[projectId]/directory/roles`, `GET/POST/PATCH/DELETE /api/projects/[projectId]/directory/groups`, `ProjectTeamSection`, `DistributionGroupService`

### 11.1 Project Roles

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 11.1.1 | Create a new role | Click "Manage Roles" → Create Role dialog → enter name → Create | Role appears in Project Team section as an empty dashed card | MEDIUM | 🔲 | |
| 11.1.2 | Create role requires name | Submit Create Role with blank name | Button disabled; no submission occurs | MEDIUM | 🔲 | |
| 11.1.3 | Duplicate role name rejected | POST /directory/roles with an existing role_name | 409 "A role with this name already exists" | MEDIUM | 🔲 | |
| 11.1.4 | Assign members to a role | Click role card → Assign Members dialog → select people → Save | Members appear in Project Team table under that role | HIGH | 🔲 | |
| 11.1.5 | Role assignment validates project membership | Assign a person not in project to a role | 400 "Selected person must be an active member of this project" | HIGH | 🔲 | |
| 11.1.6 | Remove all members from a role | Assign Members dialog → deselect all → Save | Role returns to empty dashed card state | MEDIUM | 🔲 | |
| 11.1.7 | Delete a role | Role card → action menu → Delete role → Confirm | Role and all its member assignments deleted; role card gone | MEDIUM | 🔲 | |
| 11.1.8 | Project Team table shows Name, Role, Email, Phone | View Project Team with assigned members | Table columns all present and populated | HIGH | 🔲 | |

### 11.2 Distribution Groups

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 11.2.1 | Create a distribution group | POST /directory/groups with name | 201 created; group appears in list | MEDIUM | 🔲 | |
| 11.2.2 | Create group requires name | POST /directory/groups with no name | 400 "Group name is required" | MEDIUM | 🔲 | |
| 11.2.3 | Create group requires admin permission | Standard user POST /directory/groups | 403 "Forbidden" | HIGH | 🔲 | |
| 11.2.4 | Get groups with members | GET /directory/groups?include_members=true | Groups returned with their member arrays populated | MEDIUM | 🔲 | |
| 11.2.5 | Edit a distribution group name | PATCH /directory/groups/[groupId] with new name | Updated name reflected in group list | MEDIUM | 🔲 | |
| 11.2.6 | Delete a distribution group | DELETE /directory/groups/[groupId] (as admin) | 200 `{ success: true }`; group gone from list | MEDIUM | 🔲 | |

---

## Sources

| # | Title | URL / File | Category |
|---|-------|-----------|---------|
| 1 | People list API route | `frontend/src/app/api/projects/[projectId]/directory/people/route.ts` | People |
| 2 | People detail/edit/delete API route | `frontend/src/app/api/projects/[projectId]/directory/people/[personId]/route.ts` | People |
| 3 | Bulk invite API route | `frontend/src/app/api/projects/[projectId]/directory/people/bulk-invite/route.ts` | People |
| 4 | Companies list API route | `frontend/src/app/api/projects/[projectId]/directory/companies/route.ts` | Companies |
| 5 | Company detail/edit/delete API route | `frontend/src/app/api/projects/[projectId]/directory/companies/[companyId]/route.ts` | Companies |
| 6 | Groups list API route | `frontend/src/app/api/projects/[projectId]/directory/groups/route.ts` | Groups |
| 7 | Group detail/edit/delete API route | `frontend/src/app/api/projects/[projectId]/directory/groups/[groupId]/route.ts` | Groups |
| 8 | Roles API route | `frontend/src/app/api/projects/[projectId]/directory/roles/route.ts` | Roles |
| 9 | Permissions API route | `frontend/src/app/api/projects/[projectId]/directory/permissions/route.ts` | Permissions |
| 10 | Import API route | `frontend/src/app/api/projects/[projectId]/directory/import/route.ts` | Import |
| 11 | Export API route | `frontend/src/app/api/projects/[projectId]/directory/export/route.ts` | Export |
| 12 | Directory page (main UI) | `frontend/src/app/(main)/[projectId]/directory/page.tsx` | Frontend |
| 13 | Procore Directory manifest | `.claude/procore-manifests/directory/manifest.json` | Procore Reference |
| 14 | Directory guided scenarios | `docs/testing/directory-scenarios.md` | Testing Reference |
| 15 | Procore Directory — People list | https://v2.support.procore.com/product-manuals/directory-project/tutorials/add-a-person-to-the-project-directory | People |
| 16 | Procore Directory — Companies | https://v2.support.procore.com/product-manuals/directory-project/tutorials/add-a-company-to-the-project-directory | Companies |
| 17 | Procore Directory — Permissions Matrix | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-directory-permissions | Permissions |
| 18 | Procore Directory — Import people | https://v2.support.procore.com/product-manuals/directory-project/tutorials/import-users-into-the-project-directory | Import |
| 19 | Procore Directory — Export | https://v2.support.procore.com/product-manuals/directory-project/tutorials/export-the-project-directory | Export |
| 20 | Procore Directory — Distribution Groups | https://v2.support.procore.com/product-manuals/directory-project/tutorials/add-a-distribution-group-to-the-project-directory | Groups |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
