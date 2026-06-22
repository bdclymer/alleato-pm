---
title: Submittals Audit Report
description: Gap analysis between PRP spec and current implementation — schema, API, UI, and workflows
date: 2026-04-17
prp: docs/PRPs/submittals/prp-submittals.md
---

# Submittals Audit Report

**Date:** 2026-04-17
**PRP:** `docs/PRPs/submittals/prp-submittals.md`

## Summary

- ✅ Fully implemented: 28 items
- 🟡 Partially implemented: 4 items
- 🔴 Not implemented: 8 items
- ⚠️ Schema gaps: 5 items
- 🔒 Security gaps: 2 items (missing RLS on `submittals` and `submittal_history`)

---

## Database Schema

### Tables Found

| Table | Exists | RLS | Notes |
|-------|--------|-----|-------|
| `submittals` | ✅ | ❌ NO RLS | 37 columns — all PRP columns present |
| `submittal_packages` | ✅ | ✅ | id, project_id (INT), name, description, created_by, created_at, updated_at |
| `submittal_workflow_steps` | ✅ | ✅ | Only 5 columns — severely under-specified (see gaps) |
| `submittal_responses` | ✅ | ✅ | Stores per-responder responses with workflow_step_id FK |
| `submittal_distributions` | ✅ | ✅ | id, submittal_id, from_id, message, distributed_at |
| `submittal_distribution_recipients` | ✅ | ✅ | id, distribution_id, recipient_id |
| `submittal_attachments` | ✅ | ✅ | 11 columns including response_id and distribution_id FKs |
| `submittal_linked_drawings` | ✅ | ✅ | id, submittal_id, drawing_id |
| `submittal_history` | ✅ | ❌ NO RLS | 11 columns — audit log unprotected |
| `submittal_types` | ✅ | ❌ NO RLS | lookup table, low risk |
| `submittal_workflow_templates` | ❌ MISSING | — | Required for Phase 4 — migration needed |

**Extra tables not in PRP** (likely added by AI tooling migration):
- `submittal_analytics_events` — no RLS
- `submittal_documents` — no RLS; may duplicate `submittal_attachments`
- `submittal_notifications` — no RLS
- `submittal_performance_metrics` — no RLS

### Schema Gaps

| Missing | Type | Required By |
|---------|------|-------------|
| `submittal_workflow_templates` table | New table | Phase 4 workflow templates |
| `submittal_workflow_steps.step_name` | text | Workflow UI labeling |
| `submittal_workflow_steps.assignee_id` | uuid | Direct step assignment (currently indirect via submittal_responses) |
| `submittal_workflow_steps.required` | boolean | PRP references required flag per step |
| `submittal_workflow_steps.status` | text | Per-step status tracking |
| `submittals` RLS policies | Security | Protect cross-project data access |
| `submittal_history` RLS policies | Security | Protect audit log cross-project |

**Note on workflow_steps schema:** The `submittal_responses` table stores `responder_id` as a FK-less UUID, and the workflow respond API validates against it. This means "assignee" for a step is currently stored in `submittal_responses` rather than `submittal_workflow_steps`. This indirect pattern works for Phase 1 but will need clarification before Phase 4 template work.

---

## List View

| Requirement | Status | Notes |
|-------------|--------|-------|
| 5-tab list (Items/Packages/Spec/BIC/Recycle Bin) | ✅ | All 5 tabs implemented |
| Column: Spec Section | ✅ | `defaultVisible: true` |
| Column: # (submittal_number) | ✅ | Always visible |
| Column: Rev. | ✅ | `defaultVisible: true` |
| Column: Title | ✅ | `defaultVisible: true` |
| Column: Type | ✅ | `defaultVisible: true` |
| Column: Status | ✅ | StatusBadge |
| Column: Responsible Contractor | ✅ | Batch-resolved via `companies` table |
| Column: Received From | 🔴 | Always shows `"-"` — TODO at `page.tsx:283` |
| Column: Ball In Court | ✅ | `defaultVisible: true` |
| Column: Approvers | ✅ | `defaultVisible: false` |
| Column: Response | ✅ | `defaultVisible: true` |
| Column: Sent Date | ✅ | `defaultVisible: true` |
| Search | ✅ | TableToolbar with search |
| Filter by status/response/division | ✅ | FilterConfig in table config |
| Sort | ✅ | All columns sortable |
| Column visibility toggle | ✅ | Via UnifiedTablePage |
| CSV export | ✅ | `/export` API route |
| PDF export | ✅ | Browser print |
| Row selection | ✅ | Items tab only |
| Bulk delete | ✅ | Items tab only |
| Bulk status change | 🔴 | Not implemented |
| Toolbar: New Submittal | ✅ | Header action |

### Packages Tab

| Requirement | Status | Notes |
|-------------|--------|-------|
| Read-only grouped view by package | ✅ | GroupedSubmittalView renders correctly |
| Create package button | 🔴 | No button — PackagePickerDialog only pre-fills form, not standalone create |
| Edit package name/description | 🔴 | No UI |
| Delete package | 🔴 | No UI |
| Assign submittals to package | 🟡 | Only via submittal form's package dropdown |

### Recycle Bin Tab

| Requirement | Status | Notes |
|-------------|--------|-------|
| List soft-deleted submittals | ✅ | |
| Restore from recycle bin | ✅ | `useRestoreSubmittal` hook + `/restore` API route |

---

## Create / Edit Form

| Requirement | Status | Notes |
|-------------|--------|-------|
| Field: Submittal Number (text, required) | ✅ | |
| Field: Title (text, required) | ✅ | |
| Field: Revision (number) | ✅ | |
| Field: Status (select) | ✅ | Draft/Open/Distributed/Closed |
| Field: Specification Section (text) | ✅ | |
| Field: Type (select → submittal_types) | ✅ | Auto-seeded types catalog |
| Field: Package (select → submittal_packages) | ✅ | |
| Field: Division (text) | ✅ | |
| Field: Responsible Contractor (select → companies) | ✅ | INTEGER FK correctly resolved |
| Field: Received From (select → people/users) | 🟡 | Field exists in form but list display is broken |
| Field: Submittal Manager (select → users) | ✅ | |
| Field: Submitter Company (text) | ✅ | |
| Field: Is Private (toggle) | ✅ | |
| Field: Description (textarea) | ✅ | |
| Field: Priority (select) | ✅ | |
| Field: Final Due Date (date) | ✅ | |
| Field: Lead Time (number) | ✅ | |
| Field: Required On Site Date (date) | ✅ | |
| Field: Required Approval Date (date) | ✅ | |
| Field: Submission Date (date) | ✅ | |
| Field: Sent Date (date) | ✅ | |
| Field: Cost Code (select) | ✅ | |
| Field: Location (select) | ✅ | |
| Zod validation | ✅ | |
| React Hook Form | ✅ | |

---

## Detail View

| Requirement | Status | Notes |
|-------------|--------|-------|
| Tab: General (metadata + attachments) | ✅ | |
| Tab: Workflow (steps + respond form + builder) | ✅ | |
| Tab: Related Items (linked drawings) | ✅ | |
| Tab: History (change log) | ✅ | |
| Header: Status badge | ✅ | |
| Header: Edit button | ✅ | |
| Header: Duplicate action | ✅ | |
| Header: Delete action | ✅ | |
| Header: Distribute button | 🔴 | API ready; no UI button |
| Distribution history panel | 🟡 | Renders when distributions exist; no way to create |
| Attachment upload panel | ✅ | |
| PageShell variant="detail" | ✅ | Correct design system usage |
| Edit action: uses Pencil icon | 🔴 | Design violation — `submittal-detail-client.tsx:291` |

---

## Workflows & Business Rules

| Requirement | Status | Notes |
|-------------|--------|-------|
| Status: Draft | ✅ | |
| Status: Open | ✅ | |
| Status: Distributed | ✅ | Set by distribute API |
| Status: Closed | ✅ | Set by workflow respond auto-close |
| Workflow step add | ✅ | WorkflowBuilder in detail view |
| Workflow step respond | ✅ | Response form with approve/reject |
| Ball-in-court auto-advance | ✅ | Respond API advances BIC |
| Auto-close on all approvals | ✅ | Respond API closes submittal |
| Only assigned responders can respond | ✅ | Guard in respond route |
| Duplicate submittal | ✅ | `/duplicate` route |
| Soft delete / restore | ✅ | `deleted_at` + restore route |
| Transition: any → Distributed (via Distribute action) | 🔴 | No UI trigger |
| Workflow templates (save/apply) | 🔴 | Not started — DB table missing |
| Bulk status change | 🔴 | Not implemented |

---

## Integrations

| Requirement | Status | Notes |
|-------------|--------|-------|
| Specifications FK | ✅ | `specification_id` FK in schema |
| Companies (contractor) | ✅ | Batch resolved in GET handler |
| People / Auth users (received_from, manager) | 🟡 | Form works; list display broken for received_from |
| Cost Codes | ✅ | FK in schema |
| Locations | ✅ | FK in schema |
| Drawings (linked drawings) | ✅ | `submittal_linked_drawings` table + Related tab |
| Distribution recipients | ✅ | Data model complete; no UI |

---

## API Coverage

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /submittals` | 🟡 | Missing `received_from` name resolution |
| `POST /submittals` | ✅ | |
| `GET /submittals/[id]` | ✅ | |
| `PUT /submittals/[id]` | ✅ | |
| `DELETE /submittals/[id]` | ✅ | Soft delete |
| `PATCH /submittals/[id]/restore` | ✅ | |
| `POST /submittals/[id]/duplicate` | ✅ | |
| `POST /submittals/[id]/distribute` | ✅ | Server complete; no UI |
| `GET/POST /submittals/[id]/workflow-steps` | ✅ | |
| `GET/PUT/DELETE /submittals/[id]/workflow-steps/[stepId]` | ✅ | |
| `POST /submittals/[id]/workflow-steps/[stepId]/respond` | ✅ | |
| `POST /submittals/[id]/attachments` | ✅ | |
| `GET /submittals/[id]/related-items` | ✅ | |
| `GET /submittals/[id]/revisions` | ✅ | |
| `GET /submittals/export` | ✅ | |
| `GET /submittals/packages` | ✅ | |
| `POST /submittals/packages` | ✅ | |
| `PATCH /submittals/packages/[packageId]` | 🔴 | File does not exist |
| `DELETE /submittals/packages/[packageId]` | 🔴 | File does not exist |
| `GET /submittals/specs` | ✅ | |
| `GET/POST /submittals/workflow-templates` | 🔴 | File does not exist |
| `PUT/DELETE /submittals/workflow-templates/[id]` | 🔴 | File does not exist |

---

## Known Guardrails (from Incident Log)

| Incident | Relevance | Guardrail |
|----------|-----------|-----------|
| 2026-02-03: Submittals design violation (h1/Tabs/TableLayout) | **Resolved** — page now uses `UnifiedTablePage` + `PageShell` | Check any new pages added |
| UUID vs INTEGER FK mismatch | `project_id` and `responsible_contractor_id` must be INTEGER | CLAUDE.md Gate #11 |
| `[id]` route param causes Next.js conflict | All existing routes use `[submittalId]`, `[packageId]`, `[stepId]` | CLAUDE.md Gate #2 |
| Raw `fetch()` in API routes | All routes use `withApiGuardrails` | CLAUDE.md Gate #16 |
| Pencil icon design violation | **Active** — `submittal-detail-client.tsx:291` | feedback_no_pencil_edit_icons.md |

---

## Implementation Priority

Ordered by impact and dependency:

1. **Fix `received_from` null** — Quick fix, active data display bug (3 tasks)
2. **Fix Pencil icon design violation** — 2 line change, active violation
3. **Packages CRUD API** — `[packageId]/route.ts` PATCH + DELETE needed before UI
4. **Packages CRUD UI** — New Package button + kebab menu per group
5. **Distribution dialog UI** — `SubmittalDistributeDialog` + Distribute button in detail
6. **Schema: Enable RLS on `submittals`** — Security gap, production risk
7. **Schema: Enable RLS on `submittal_history`** — Security gap
8. **Schema: `submittal_workflow_templates` migration** — Phase 4 prereq
9. **Workflow templates API + UI** — Lower priority, Phase 4
10. **Bulk status change** — Nice to have
