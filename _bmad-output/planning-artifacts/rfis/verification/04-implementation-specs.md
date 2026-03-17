# RFIs — Implementation Specs

**Generated:** 2026-03-17
**Based on:** Phases 1-3 (codebase inventory, Procore reference, live crawl)

## Database Schema Spec

### Required Tables

| Table | Exists | Status |
|-------|--------|--------|
| `rfis` | Yes | 30 columns — covers most fields |
| `rfi_assignees` | Yes | Junction table (rfi_id, employee_id, is_primary) |
| `rfi_responses` | **No** | **MISSING — critical for response/official response workflow** |
| `rfi_related_items` | **No** | **MISSING — for linking to change events, drawings, etc.** |
| `rfi_attachments` | **No** | **MISSING — or uses generic attachments system?** |

### Required Columns on `rfis` Table

| Column | Type | Nullable | Exists | Notes |
|--------|------|----------|--------|-------|
| id | UUID | No | Yes | PK |
| number | integer | No | Yes | Auto-increment in API |
| project_id | integer | No | Yes | FK to projects |
| subject | text | No | Yes | — |
| question | text | No | Yes | Should support rich text/HTML |
| status | text | No | Yes | Values: draft, open, closed. **Missing: closed-draft** |
| is_private | boolean | No | Yes | Default false |
| assignees | text[] | Yes | Yes | Denormalized |
| distribution_list | text[] | Yes | Yes | Denormalized |
| ball_in_court | text | Yes | Yes | — |
| ball_in_court_employee_id | integer | Yes | Yes | — |
| rfi_manager | text | Yes | Yes | — |
| rfi_manager_employee_id | integer | Yes | Yes | — |
| created_by | text | Yes | Yes | — |
| created_by_employee_id | integer | Yes | Yes | — |
| closed_date | text | Yes | Yes | Should be timestamp |
| date_initiated | text | Yes | Yes | Should be timestamp |
| due_date | text | Yes | Yes | Should be date |
| received_from | text | Yes | Yes | — |
| responsible_contractor | text | Yes | Yes | — |
| location | text | Yes | Yes | — |
| specification | text | Yes | Yes | — |
| cost_code | text | Yes | Yes | — |
| cost_impact | text | Yes | Yes | — |
| schedule_impact | text | Yes | Yes | — |
| reference | text | Yes | Yes | — |
| rfi_stage | text | Yes | Yes | — |
| sub_job | text | Yes | Yes | — |
| drawing_number | text | Yes | **No** | **MISSING** — Procore has this field |
| official_response | text | Yes | **No** | **MISSING** — or belongs in rfi_responses table |
| custom_field_1 | text | Yes | **No** | **MISSING** — configurable label |
| custom_field_2 | text | Yes | **No** | **MISSING** — configurable label |

### Missing Table: `rfi_responses`

This is the biggest functional gap. Procore's response system is a core feature.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | No | PK |
| rfi_id | UUID | No | FK to rfis |
| responder_id | integer | Yes | FK to employees/users |
| responder_name | text | No | Display name |
| response_text | text | No | Rich text |
| is_official | boolean | No | Default false; RFI Manager designates |
| is_required | boolean | No | Whether response was required |
| created_at | timestamp | No | — |
| attachments | jsonb | Yes | Response attachments |

## Form Field Spec

### Create Form Fields

| Field | DB Column | Type | Validation | Procore Has | We Have |
|-------|-----------|------|-----------|-------------|---------|
| Subject | subject | text | Required (Open) | Yes | Yes |
| Question | question | rich text | Required (Open) | Yes (rich text) | Yes (plain text) |
| Attachments | — | file upload | — | Yes | **No** |
| Number | number | auto-integer | Auto-generated | Yes | Yes (auto) |
| Due Date | due_date | date | Required (Open) | Yes (spinbuttons) | Yes |
| RFI Manager | rfi_manager | dropdown | Required | Yes (person picker) | Yes (text input) |
| Received From | received_from | dropdown | — | Yes (person picker) | Yes (text input) |
| Assignees | assignees | multi-select | Required (Open, min 1) | Yes (person picker + chips) | Yes (comma-separated text) |
| Distribution List | distribution_list | multi-select | — | Yes (person picker + chips) | Yes (comma-separated text) |
| Responsible Contractor | responsible_contractor | auto/dropdown | Auto from Received From | Yes | Yes (text input) |
| Specification | specification | dropdown | — | Yes (spec picker) | Yes (text input) |
| Location | location | dropdown | — | Yes (location picker) | Yes (text input) |
| RFI Stage | rfi_stage | dropdown | — | Yes | Yes (text input) |
| Drawing Number | drawing_number | text | — | Yes | **No (missing column)** |
| Sub Job | sub_job | dropdown | — | Yes | Yes (text input) |
| Cost Code | cost_code | dropdown | — | Yes | Yes (text input) |
| Schedule Impact | schedule_impact | dropdown | — | Yes (Yes/No/TBD/N/A) | Yes |
| Cost Impact | cost_impact | dropdown | — | Yes (Yes/No/TBD/N/A) | Yes |
| Reference | reference | text | — | Yes | Yes |
| Private | is_private | checkbox | — | Yes | Yes |
| Custom Field 1 | custom_field_1 | text | — | Yes | **No** |
| Custom Field 2 | custom_field_2 | text | — | Yes | **No** |

### Submit Actions

| Action | Procore | Alleato | Status |
|--------|---------|---------|--------|
| Create as Draft | Yes | Yes ("Save as Draft") | COMPLETE |
| Create as Open | Yes | Yes ("Create Open") | COMPLETE |

## Component Spec

### Pages Required

| Page | Route | Exists | Status |
|------|-------|--------|--------|
| List view | `/[projectId]/rfis` | Yes | COMPLETE |
| Detail view | `/[projectId]/rfis/[rfiId]` | Yes | PARTIAL — missing responses section |
| Create form | `/[projectId]/rfis/new` | Yes | PARTIAL — missing rich text, attachments, person pickers |
| Edit form | `/[projectId]/rfis/[rfiId]` (inline) | Yes (inline edit on detail) | PARTIAL — same gaps as create |
| Settings | — | **No** | **MISSING** |

### Components Required

| Component | Purpose | Exists | Status |
|-----------|---------|--------|--------|
| RfisClient (list) | Table with filters | Yes | COMPLETE |
| RfiDetail (view/edit) | Detail page with inline edit | Yes | PARTIAL |
| RFI Create Form | Full create form | Yes | PARTIAL |
| RfiResponseCard | Display a response | **No** | **MISSING** |
| RfiResponseForm | Submit a response | **No** | **MISSING** |
| OfficialResponseBadge | Mark official response | **No** | **MISSING** |
| PersonPicker | Select users from directory | **No** | **MISSING** (uses text inputs) |
| RichTextEditor | For Question field | **No** | **MISSING** (uses plain textarea) |
| AttachmentUpload | File attachments | **No** | **MISSING** |
| RfiSettingsPage | Admin settings | **No** | **MISSING** |

## Workflow Spec

### Statuses

| Status | DB Value | Procore | Alleato Schema | Alleato UI | Status |
|--------|----------|---------|----------------|------------|--------|
| Draft | draft | Yes | Yes | Yes | COMPLETE |
| Open | open | Yes | Yes | Yes | COMPLETE |
| Pending | pending | No (Procore doesn't have this) | Yes (in schema) | Yes | EXTRA |
| Closed | closed | Yes | Yes | Yes | COMPLETE |
| Closed-Draft | closed-draft | Yes | **No** | **No** | MISSING |
| Void | void | No | Yes (in schema) | No | EXTRA |

### Status Transitions

| Transition | Procore | Alleato | Status |
|-----------|---------|---------|--------|
| Draft → Open | Yes (RFI Manager opens) | Yes (status change button) | COMPLETE |
| Open → Closed | Yes (after official response) | Yes (Close RFI button) | PARTIAL — no official response required |
| Closed → Open | Yes (Reopen) | **No** | **MISSING** |
| Draft → Closed-Draft | Yes (close a draft directly) | **No** | **MISSING** |
| Closed-Draft → Draft | Yes (reopen closed-draft) | **No** | **MISSING** |

### Ball in Court Logic

| Rule | Procore | Alleato | Status |
|------|---------|---------|--------|
| Draft: BIC = RFI Manager | Yes | Partial (sets on create if open) | PARTIAL |
| Open: BIC = Assignees | Yes | Partial (sets joined assignees string) | PARTIAL |
| After responses: BIC = RFI Manager | Yes | **No** (no response system) | MISSING |
| Manual BIC shift buttons | Yes | **No** | MISSING |
| Forward for Review | Yes | **No** | MISSING |

### Actions

| Action | Trigger | Procore | Alleato | Status |
|--------|---------|---------|---------|--------|
| Create Draft | Form submit | Yes | Yes | COMPLETE |
| Create Open | Form submit | Yes | Yes | COMPLETE |
| Edit | Edit button | Yes | Yes | COMPLETE |
| Delete | Delete button | Yes | Yes | COMPLETE |
| Close RFI | Close button | Yes | Yes (on detail) | PARTIAL — no official response check |
| Reopen RFI | Reopen button | Yes | **No** | MISSING |
| Add Response | Response form | Yes | **No** | MISSING |
| Mark Official Response | Response action | Yes | **No** | MISSING |
| Forward for Review | Action button | Yes | **No** | MISSING |
| Shift Ball in Court | Manual buttons | Yes | **No** | MISSING |
| Export PDF | Export dropdown | Yes (3 PDF options) | **No** | MISSING |
| Export CSV | Export dropdown | Yes | **No** | MISSING |
| Bulk Edit | List action (Admin) | Yes | **No** | MISSING |
| Create Change Event from RFI | Related items | Yes | **No** | MISSING |
