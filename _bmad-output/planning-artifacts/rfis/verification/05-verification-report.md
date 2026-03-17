# RFIs — Verification Report

**Generated:** 2026-03-17
**Based on:** Phases 1-4 cross-comparison

## Summary

| Category | Complete | Partial | Missing | Total | Score |
|----------|----------|---------|---------|-------|-------|
| DB Schema (columns) | 28 | 0 | 4 | 32 | 88% |
| DB Schema (tables) | 2 | 0 | 2 | 4 | 50% |
| API Routes | 5 | 0 | 3 | 8 | 63% |
| Form Fields | 16 | 4 | 3 | 23 | 70% |
| Table Columns | 8 | 0 | 11 | 19 | 42% |
| Statuses | 3 | 0 | 1 | 4 | 75% |
| Status Transitions | 2 | 1 | 2 | 5 | 40% |
| Pages | 3 | 2 | 1 | 6 | 50% |
| Core Actions | 4 | 1 | 8 | 13 | 31% |
| **Overall** | **71** | **8** | **35** | **114** | **62%** |

**Overall Verdict:** NEEDS SIGNIFICANT WORK — approximately 62% complete

The basic CRUD skeleton is solid. The major gap is the **response system** — Procore's RFI tool revolves around assignees submitting responses and the RFI Manager designating an official response. This entire workflow is missing. Secondary gaps include rich text editing, file attachments, person pickers, export, and the reopen flow.

---

## Database Schema

### Tables

| Table | Spec | Actual | Status | Notes |
|-------|------|--------|--------|-------|
| rfis | 30+ columns | 30 columns | COMPLETE | Core table exists |
| rfi_assignees | Junction table | Exists | COMPLETE | — |
| rfi_responses | Response storage | — | MISSING | **Critical** — no response data model |
| rfi_related_items | Cross-tool links | — | MISSING | Links to change events, drawings, etc. |

### Columns on `rfis`

| Column | Spec Type | Actual Type | Status | Notes |
|--------|----------|-------------|--------|-------|
| id | UUID | UUID | COMPLETE | — |
| number | integer | integer | COMPLETE | — |
| project_id | integer | integer | COMPLETE | — |
| subject | text | text | COMPLETE | — |
| question | text | text | COMPLETE | Should support rich text |
| status | text | text | COMPLETE | Missing "closed-draft" value |
| is_private | boolean | boolean | COMPLETE | — |
| assignees | text[] | text[] | COMPLETE | Denormalized |
| distribution_list | text[] | text[] | COMPLETE | Denormalized |
| ball_in_court | text | text | COMPLETE | — |
| ball_in_court_employee_id | integer | integer | COMPLETE | — |
| rfi_manager | text | text | COMPLETE | — |
| rfi_manager_employee_id | integer | integer | COMPLETE | — |
| created_by | text | text | COMPLETE | — |
| created_by_employee_id | integer | integer | COMPLETE | — |
| closed_date | text | text | COMPLETE | — |
| date_initiated | text | text | COMPLETE | — |
| due_date | text | text | COMPLETE | — |
| received_from | text | text | COMPLETE | — |
| responsible_contractor | text | text | COMPLETE | — |
| location | text | text | COMPLETE | — |
| specification | text | text | COMPLETE | — |
| cost_code | text | text | COMPLETE | — |
| cost_impact | text | text | COMPLETE | — |
| schedule_impact | text | text | COMPLETE | — |
| reference | text | text | COMPLETE | — |
| rfi_stage | text | text | COMPLETE | — |
| sub_job | text | text | COMPLETE | — |
| drawing_number | text | — | MISSING | Procore has this field |
| official_response_id | UUID | — | MISSING | FK to rfi_responses |
| custom_field_1 | text | — | MISSING | Configurable label |
| custom_field_2 | text | — | MISSING | Configurable label |

---

## API Routes

| Endpoint | Method | Spec | Status | Notes |
|----------|--------|------|--------|-------|
| `/api/projects/[projectId]/rfis` | GET | List with filters | COMPLETE | Has status, search, page, limit |
| `/api/projects/[projectId]/rfis` | POST | Create draft/open | COMPLETE | Schema-based validation |
| `/api/projects/[projectId]/rfis/[rfiId]` | GET | Single fetch | COMPLETE | — |
| `/api/projects/[projectId]/rfis/[rfiId]` | PATCH | Update | COMPLETE | Handles status transitions |
| `/api/projects/[projectId]/rfis/[rfiId]` | DELETE | Hard delete | COMPLETE | — |
| `/api/projects/[projectId]/rfis/[rfiId]/responses` | GET/POST | Response CRUD | MISSING | No response endpoints |
| `/api/projects/[projectId]/rfis/[rfiId]/responses/[responseId]/official` | PATCH | Mark official | MISSING | No official response endpoint |
| `/api/projects/[projectId]/rfis/export` | GET | Export CSV/PDF | MISSING | No export endpoint |

---

## Form Fields

| Field | Spec | Actual | Status | Notes |
|-------|------|--------|--------|-------|
| Subject | text, required (Open) | text input, required | COMPLETE | — |
| Question | rich text, required (Open) | plain textarea | PARTIAL | No rich text editor |
| Attachments | file upload | — | MISSING | No attachment support |
| Number | auto-integer | auto-integer | COMPLETE | — |
| Due Date | date picker | date input | COMPLETE | — |
| RFI Manager | person picker dropdown | text input | PARTIAL | Should be person selector |
| Received From | person picker dropdown | text input | PARTIAL | Should be person selector |
| Assignees | multi-person picker + chips | comma-separated text | PARTIAL | Should be multi-select with chips |
| Distribution List | multi-person picker + chips | comma-separated text | PARTIAL | Should be multi-select with chips |
| Responsible Contractor | auto from Received From | text input | COMPLETE | Manual but exists |
| Specification | spec section picker | text input | COMPLETE | Manual but exists |
| Location | location picker | text input | COMPLETE | Manual but exists |
| RFI Stage | dropdown | text input | COMPLETE | — |
| Drawing Number | text | — | MISSING | Column doesn't exist |
| Sub Job | dropdown | text input | COMPLETE | — |
| Cost Code | dropdown | text input | COMPLETE | — |
| Schedule Impact | dropdown (Yes/No/TBD/N/A) | text input | COMPLETE | Options exist in schema |
| Cost Impact | dropdown (Yes/No/TBD/N/A) | text input | COMPLETE | Options exist in schema |
| Reference | text | text input | COMPLETE | — |
| Private | checkbox | checkbox | COMPLETE | — |
| Custom Field 1 | configurable text | — | MISSING | — |
| Custom Field 2 | configurable text | — | MISSING | — |
| Create as Draft | button | "Save as Draft" button | COMPLETE | — |
| Create as Open | button | "Create Open" button | COMPLETE | — |

---

## Table Columns (List View)

| Procore Column | Alleato Column | Status | Notes |
|---------------|----------------|--------|-------|
| Number (#) | number | COMPLETE | Always visible |
| Subject | subject | COMPLETE | Default visible |
| Status | status | COMPLETE | Default visible, badge renderer |
| Assignees | assignees | COMPLETE | Default visible |
| Due Date | due_date | COMPLETE | Default visible |
| Ball In Court | ball_in_court | COMPLETE | Default visible |
| RFI Manager | rfi_manager | COMPLETE | Default visible |
| Responsible Contractor | responsible_contractor | COMPLETE | Hidden by default |
| Received From | received_from | MISSING | Not in column config |
| Date Initiated | date_initiated | MISSING | Not in column config |
| Distribution List | distribution_list | MISSING | Not in column config |
| Closed Date | closed_date | MISSING | Not in column config |
| Location | location | MISSING | Not in column config |
| Schedule Impact | schedule_impact | MISSING | Not in column config |
| Cost Impact | cost_impact | MISSING | Not in column config |
| Cost Code | cost_code | MISSING | Not in column config |
| Sub Job | sub_job | MISSING | Not in column config |
| RFI Stage | rfi_stage | MISSING | Not in column config |
| Private | is_private | MISSING | Not in column config |

**Note:** Procore shows 19 columns; Alleato shows 8 (with 2 hidden by default = 10 configured). 11 columns are missing from the table config.

---

## Statuses / Workflows

| Status | Spec | Actual | Status | Notes |
|--------|------|--------|--------|-------|
| Draft | draft | draft | COMPLETE | — |
| Open | open | open | COMPLETE | — |
| Closed | closed | closed | COMPLETE | — |
| Closed-Draft | closed-draft | — | MISSING | System status when closing a Draft |
| Pending | — | pending | EXTRA | Not in Procore — consider removing |
| Void | — | void | EXTRA | Not in Procore — consider removing |

### Transitions

| Transition | Spec | Actual | Status |
|-----------|------|--------|--------|
| Draft → Open | Button on detail | "Open RFI" button | COMPLETE |
| Open → Closed | Button on detail | "Close RFI" button | PARTIAL — no official response check |
| Closed → Open (Reopen) | Button on detail | — | MISSING |
| Draft → Closed-Draft | Close from Draft | — | MISSING |
| Closed-Draft → Draft | Reopen | — | MISSING |

---

## Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| List view | `/[projectId]/rfis` | COMPLETE | UnifiedTablePage, filters, search |
| Detail view | `/[projectId]/rfis/[rfiId]` | PARTIAL | Missing: responses section, reopen button, related items |
| Create form | `/[projectId]/rfis/new` | PARTIAL | Missing: rich text, attachments, person pickers |
| Edit (inline on detail) | `/[projectId]/rfis/[rfiId]` | PARTIAL | Same field gaps as create |
| Settings | — | MISSING | No settings page exists |
| Legacy mock page | `/rfis` (tables group) | EXTRA | Should be removed |

---

## Core Actions

| Action | Status | Notes |
|--------|--------|-------|
| Create Draft | COMPLETE | — |
| Create Open | COMPLETE | — |
| Edit RFI | COMPLETE | — |
| Delete RFI | COMPLETE | — |
| Close RFI | PARTIAL | No official response requirement |
| Reopen RFI | MISSING | — |
| Add Response | MISSING | No response system |
| Mark Official Response | MISSING | — |
| Forward for Review | MISSING | — |
| Shift Ball in Court | MISSING | — |
| Export PDF | MISSING | — |
| Export CSV | MISSING | — |
| Bulk Edit | MISSING | — |

---

## Filters (List View)

| Procore Filter | Alleato Filter | Status |
|---------------|----------------|--------|
| Status | status (client-side) | COMPLETE |
| Responsible Contractor | — | MISSING |
| Received From | — | MISSING |
| Assignees | — | MISSING |
| RFI Manager | — | MISSING |
| Ball In Court | — | MISSING |
| Overdue | — | MISSING |
| Locations | — | MISSING |
| Cost Code | — | MISSING |
| Sub Job | — | MISSING |
| RFI Stage | — | MISSING |
| Created By | — | MISSING |

**Note:** Procore has 12 filter categories; Alleato has 1 (status only).

---

## Evidence

- Screenshots captured in `_bmad-output/planning-artifacts/rfis/verification/screenshots/`
- 9 screenshots covering: list view, detail view, create form, edit form, responses, settings, actions, filters, export
- Column headers extracted from live DOM: 19 columns confirmed
- Form fields extracted from live DOM: 24 labels confirmed
- Settings page: 13+ configurable settings confirmed
