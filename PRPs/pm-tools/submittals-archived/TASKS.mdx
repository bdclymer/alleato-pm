# Submittals Implementation Tasks

**Generated:** 2026-01-12
**Source:** Crawl analysis of Procore Submittals tool

---

## Crawl Assets Reviewed

- `crawl-submittals/pages/submittals-list-view/` (screenshot, dom, metadata)
- `crawl-submittals/pages/submittals-list-view-filtered/` (screenshot, dom, metadata)
- `crawl-submittals/pages/submittals-list-view_dropdown_1-6/` (Create, Export, Reports menus)
- `crawl-submittals/pages/submittals-settings-general/` (screenshot, dom, metadata)
- `crawl-submittals/pages/submittals-settings-workflow/` (screenshot)
- `crawl-submittals/pages/submittals-settings-custom-fields/` (screenshot)
- `crawl-submittals/reports/detailed-report.json`
- `crawl-submittals/reports/link-graph.json`
- `crawl-submittals/SUBMITTALS-CRAWL-STATUS.md`

---

## 1. List View Page

**Route:** `[projectId]/submittals/page.tsx`

### Navigation Tabs

- [ ] **Items tab** (default, active state with underline)
- [ ] **Packages tab** - switches to package list view
- [ ] **Spec Sections tab** - groups by specification section
- [ ] **Ball In Court tab** - filters by responsibility assignment
- [ ] **Recycle Bin tab** - shows soft-deleted items

### Header Section

- [ ] Page title: "Submittals"
- [ ] Subtitle: "Easily create individual submittals or generate them from specifications..."
- [ ] Settings gear icon (links to `/submittals/settings?view=general`)

### Action Buttons (right side)

- [ ] **+ Create** dropdown (orange primary button)
  - "Submittal" menu item
  - "Submittal Package" menu item
- [ ] **Export** dropdown (secondary button)
  - "PDF" menu item
  - "CSV" menu item
  - "Excel" menu item
- [ ] **Reports** dropdown (secondary button)
  - "Create New Report" (links to custom_reports/new)
  - "Submittal Approvers' Response Time"

### Filter Controls

- [ ] Search input with magnifying glass icon
- [ ] "Add Filter" dropdown button
- [ ] Active filter chips showing filter name + count (e.g., "Ball In Court (1)")
- [ ] Filter chip close/remove functionality
- [ ] "Clear All" text button to reset filters

### Table/Data Display

- [ ] Empty state: illustration + "No Submittals Match Your Search" + helper text
- [ ] Data table with sortable columns (columns not visible in crawl - needs clarification)
- [ ] Pagination controls (URL shows `per_page=150&page=1`)

### URL Query Parameters

From `link-graph.json`:

- `view=list` - base list view
- `serializer_view=minimal_list` - response format
- `filters[ball_in_court_id][]=<userId>` - BIC filter
- `sort[attribute]=number` - sort field
- `sort[direction]=desc` - sort direction

---

## 2. Dropdowns Implementation

### Create Dropdown

- [ ] Dropdown trigger: "+ Create" with chevron
- [ ] Menu items: "Submittal", "Submittal Package"
- [ ] Both items trigger modal/page (no href, client-side action)

### Export Dropdown

- [ ] Dropdown trigger: "Export" with chevron
- [ ] Menu items: "PDF", "CSV", "Excel"
- [ ] Disabled state when no items selected (needs clarification)

### Reports Dropdown

- [ ] Dropdown trigger: "Reports" with chevron
- [ ] "Create New Report" - navigates to custom reports
- [ ] "Submittal Approvers' Response Time" - triggers report generation

---

## 3. Settings Pages

**Base Route:** `[projectId]/submittals/settings/page.tsx`
**Query param:** `?view=general|responses|workflow|replace_workflow_user|imports|custom_reports|permissions`

### Settings Navigation Tabs

- [ ] General (default)
- [ ] Responses
- [ ] Workflow Templates
- [ ] Replace Workflow User
- [ ] Imports
- [ ] Custom Reports
- [ ] Permissions

### General Settings Tab (`?view=general`)

*From `submittals-settings-general/screenshot.png`*

**Submittal Manager Assignment Section:**

- [ ] "Default Submittal Manager" label
- [ ] User dropdown selector ("Select Submittal Manager")
- [ ] Help link: "What is a submittal manager?"

**Submittals Numbering Section:**

- [ ] Checkbox: "Include Spec Section Number" (default: checked)
- [ ] Example text: "Ex. The first submittal in spec section 03-3000-Concrete will be numbered 03-3000-1."

**Workflows Section:**

- [ ] "Default Number of Days to Submit/Respond" label with description
- [ ] Number input with +/- increment buttons (default: 14)
- [ ] Checkbox: "Allow Approvers to add Reviewers to their step in the Workflow" (default: checked)
  - Helper text: "Reviewers can view and respond to a submittal, but they can't add additional reviewers."
- [ ] Checkbox: "Mark Approvers' responses as Required by default" (default: checked)
- [ ] Checkbox: "Enable Reject Workflow" (default: unchecked)
  - Helper text + "Learn more." link
- [ ] Checkbox: "Enable dynamic approver due dates" (default: unchecked)
  - Help link: "What are dynamic approver due dates?"

**Schedule Linking Section:**

- [ ] (Partially visible - content cut off in screenshot)

**Email Notifications Table:**

- [ ] Table headers: Email Event, Creator, Submittal Manager, Submitter, Approver, Reviewer, Distribution Group
- [ ] 7 email event rows with checkbox toggles per role
- [ ] "Reset Table to Default" secondary button

**Form Actions:**

- [ ] "Cancel" secondary button
- [ ] "Save Changes" primary button (disabled until changes made)

### Workflow Templates Tab (`?view=workflow`)

- [ ] (Screenshot shows same General content - actual Workflow Templates UI not captured)
- [ ] Likely: list of workflow templates with CRUD operations

### Custom Fields Tab (`?view=custom_fields`)

- [ ] (Screenshot shows same General content - actual Custom Fields UI not captured)
- [ ] Likely: custom field definitions with type, label, required flag

---

## 4. Permissions & Disabled States

- [ ] Settings gear icon visibility based on admin permission
- [ ] Create dropdown items enabled/disabled based on user permission
- [ ] Export dropdown enabled only when items exist or selected
- [ ] Save Changes button disabled until form is dirty

---

## 5. Routes to Implement

| Route | Description |
|-------|-------------|
| `[projectId]/submittals` | List view (Items tab default) |
| `[projectId]/submittals?view=packages` | Packages tab |
| `[projectId]/submittals?view=spec_sections` | Spec Sections tab |
| `[projectId]/submittals?view=ball_in_court` | Ball In Court tab |
| `[projectId]/submittals?view=recycle_bin` | Recycle Bin tab |
| `[projectId]/submittals/settings?view=general` | General settings |
| `[projectId]/submittals/settings?view=responses` | Responses settings |
| `[projectId]/submittals/settings?view=workflow` | Workflow templates |
| `[projectId]/submittals/settings?view=custom_fields` | Custom fields |
| `[projectId]/submittals/settings?view=permissions` | Permissions |

---

## Ambiguities & Gaps Requiring Decisions

### Critical Gaps (Blocking)

1. **Table columns not captured** - Project has no submittals, so table structure unknown. Need to determine: which columns to display, sortable columns, column order.

2. **Create Submittal form not captured** - Legacy URL `/submittals/new` returned 404. Need to capture via Create dropdown or infer from Procore docs.

3. **Submittal detail page not captured** - No individual submittal to view. Need detail page layout, workflow timeline, attachments section.

4. **Workflow Templates editor not captured** - Tab shows General content. Need template CRUD UI.

5. **Custom Fields configuration not captured** - Tab shows General content. Need field definition UI.

### Settings Tabs Not Captured

- **Responses** - What response options are configurable?
- **Replace Workflow User** - User substitution UI unknown
- **Imports** - CSV/Excel import interface unknown
- **Custom Reports** - Report builder interface unknown
- **Permissions** - Permission matrix UI unknown

### Behavioral Questions

1. Does "Ball In Court" filter support multiple user selection?
2. What happens when clicking a submittal row - inline expand or navigate to detail?
3. Can items be bulk-selected for export/delete?
4. Is there row-level action menu (edit, delete, duplicate)?
5. What statuses exist (draft, submitted, approved, rejected, revised)?

### Data Model Clarifications

1. Relationship between submittals and packages (many-to-one? optional?)
2. Spec section auto-numbering logic (per project? per section?)
3. Workflow step ordering and parallel vs sequential approval
4. Revision tracking - new record or version field?

---

## Recommended Next Steps

1. **Capture missing pages**: Re-run crawl after creating a test submittal to capture detail page and populated table
2. **Query Procore docs RAG** for field semantics and workflow rules
3. **Review existing patterns** in codebase (RFIs, Commitments) for reusable components
4. **Clarify table columns** with stakeholder or Procore support docs
