# Submittals Gap Analysis Report

**Run ID:** run-20260410-124614
**Generated:** 2026-04-10T12:55:00Z
**Feature:** Submittals
**Total Gaps:** 32 (3 Critical, 13 High, 12 Medium, 4 Low)

---

## CRITICAL (3)

### DB-001: `submittal_workflow_steps` missing `required` boolean column

The API accepts a `required` field when creating workflow steps, but the database table `submittal_workflow_steps` has no such column. Inserts silently drop the value, meaning the "required" semantics are never persisted or enforced.

**Fix:** Add a migration to add `required boolean NOT NULL DEFAULT false` to `submittal_workflow_steps`.

---

### DB-002: `submittal_responses` INSERT missing `submittal_id`

The `submittal_responses` Insert type requires `submittal_id: string` (non-nullable). However, the workflow-steps POST handler only passes `workflow_step_id` and `responder_id` when inserting a response, omitting `submittal_id` entirely. This causes the insert to fail at the database level.

**Fix:** Pass `submittal_id` in the insert payload in the workflow-steps POST route handler.

---

### DB-004: `responsible_contractor_id` type mismatch with `companies.id`

The `submittals` table stores `responsible_contractor_id` as an integer, but `companies.id` is a UUID. No foreign key constraint exists between the two columns, so referential integrity is not enforced and joins will fail silently.

**Fix:** Change `responsible_contractor_id` to UUID type via migration, or add a proper FK constraint after resolving the type mismatch.

---

## HIGH (13)

### DB-003: `ball_in_court` semantic conflict

The form stores `ball_in_court` as free text (user-typed name), the detail view resolves it as a user UUID, and the respond route writes a user UUID. The field has no consistent type or source, making queries and display unpredictable.

**Fix:** Standardize `ball_in_court` on UUID. Replace the free-text Input with a user select dropdown in the form.

---

### DB-005: Status CHECK constraint conflicts with API values

The schema dump shows a CHECK constraint allowing lowercase statuses (`draft`, `submitted`, `under_review`, etc.), but the API uses title-case values (`Draft`, `Open`, `Distributed`, `Closed`). If the CHECK constraint is active, API writes with title-case values will be rejected.

**Fix:** Verify the live database constraint. If the old CHECK exists, drop it and replace with one matching the API values, or normalize all status values to a single casing.

---

### DB-006: `submittal_responses` upsert relies on missing unique constraint

The upsert operation uses `onConflict: "workflow_step_id,responder_id"`, but no unique constraint on that column pair may exist in the database. Without the constraint, upsert falls back to insert-only behavior, creating duplicate responses.

**Fix:** Add a migration creating a unique constraint on `(workflow_step_id, responder_id)` in `submittal_responses`.

---

### API-001: Missing POST distribute endpoint

There is no `[submittalId]/distribute/route.ts` endpoint. Distribution is a core Procore workflow step (changing status to "Distributed" and notifying the distribution list) with no API support.

**Fix:** Create `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/distribute/route.ts` with POST handler.

---

### API-002: Missing POST revisions endpoint

There is no `[submittalId]/revisions/route.ts` endpoint. Revisions (creating a new revision of a submittal, distinct from duplicating) have no API support.

**Fix:** Create `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/revisions/route.ts` with POST handler.

---

### API-008: Response status vocabulary mismatch

The API uses response statuses like `Received` which do not exist in Procore's vocabulary. Conversely, `Reviewed - No Exception` (a standard Procore response) is missing from the API enum.

**Fix:** Update the response status enum to match Procore's vocabulary: remove `Received`, add `Reviewed - No Exception`.

---

### API-009: BIC advancement skips group completion check

The ball-in-court advancement logic advances to the next workflow step after the first response in a step, rather than waiting for all required responders in the group to complete. This breaks parallel review workflows.

**Fix:** Check that all responses for the current step are submitted before advancing BIC to the next step.

---

### UI-001: 4 table columns always display null

The columns `responsible_contractor`, `received_from`, `approvers`, and `latest_response` are always null in the table because the API query does not join the related tables needed to resolve these values.

**Fix:** Add appropriate joins in the submittals list API to resolve these columns from related tables (companies, workflow_steps, responses).

---

### UI-002: `ball_in_court` form field is free-text Input

The `ball_in_court` field renders as a plain text Input instead of a user select dropdown. Users must type a name manually, which is error-prone and inconsistent with the UUID storage expectation.

**Fix:** Replace the Input with a user select dropdown that stores the selected user's UUID.

---

### UI-004: Package/Spec pickers do not pass selection into form

The submittal package and spec section picker components only `console.log` the selection instead of updating the form state. Selections are lost on form submission.

**Fix:** Wire picker components to the form state via React Hook Form's `setValue` or `Controller`, and pass selected values as props.

---

### UI-005: Missing form fields

The create/edit form is missing several fields that exist in the database schema and Procore: `submittal_package_id`, `cost_code_id`, `location_id`, `linked_drawings`, `distribution_list`, and `attachments`.

**Fix:** Add these fields to the Zod schema and render corresponding form controls.

---

### UI-010: No attachment upload UI

There is no file upload interface anywhere in the submittals feature -- neither on the create/edit form nor on the detail view. Attachments cannot be added to submittals.

**Fix:** Add a file input component to the form and an attachment section to the detail view, wired to a storage upload endpoint.

---

### UI-011: No distribution creation UI

There is no UI to create or manage a distribution list, or to trigger the distribute action. The distribute workflow is completely absent from the frontend.

**Fix:** Add a distribute dialog accessible from the detail view toolbar, with a user/company multi-select for the distribution list.

---

## MEDIUM (12)

### DB-007: History trigger only captures status changes

The `submittal_history` trigger only fires on status column changes. Field-level edits (title, description, dates, etc.) are not recorded in the audit trail.

**Fix:** Expand the trigger to capture changes to all significant columns, or add a separate audit mechanism for field edits.

---

### DB-008: "Reviewer" step type missing from UI constant

The `STEP_TYPES` constant in the frontend does not include `Reviewer` as a valid workflow step type, even though the database and Procore support it.

**Fix:** Add `Reviewer` to the `STEP_TYPES` constant.

---

### DB-009: "Reviewed - No Exception" response status not in API enum

The response status `Reviewed - No Exception` is a standard Procore value but is not present in the API's response status enum, preventing it from being used.

**Fix:** Add `Reviewed - No Exception` to the response status enum.

---

### DB-011: `submittal_type_id` NOT NULL ambiguity

The column `submittal_type_id` is marked NOT NULL in the schema, but the form does not enforce selection and the API does not validate its presence. This can cause insert failures.

**Fix:** Either add Zod validation requiring the field, or make the column nullable with a default.

---

### API-003: Missing DELETE workflow-steps endpoint

There is no endpoint to delete individual workflow steps. Users cannot remove steps from a submittal's workflow.

**Fix:** Create a DELETE handler in the workflow-steps route.

---

### API-004: Missing PUT reorder workflow-steps endpoint

There is no endpoint to reorder workflow steps. The step order cannot be changed after creation.

**Fix:** Create a PUT handler for reordering (accepting an ordered array of step IDs).

---

### API-005: Missing POST create package endpoint

There is no endpoint to create submittal packages. Packages must be created directly in the database.

**Fix:** Create `frontend/src/app/api/projects/[projectId]/submittal-packages/route.ts` with POST handler.

---

### API-006: Missing POST attachments upload endpoint

There is no endpoint for uploading attachments to submittals.

**Fix:** Create `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/attachments/route.ts` with POST handler using Supabase Storage.

---

### API-010: No auto-close when final workflow step completes

When the last workflow step in a submittal is completed, the submittal status is not automatically updated to `Closed`. Users must manually close it.

**Fix:** Add logic in the response handler to check if all steps are complete and auto-transition status to `Closed`.

---

### UI-003: Create dropdown missing "Submittal Package" option

The create/new dropdown on the submittals list page does not include an option to create a submittal package, only individual submittals.

**Fix:** Add a "Submittal Package" option to the create dropdown menu.

---

### UI-006: Missing "Create & Send" submit button

The form only has a "Create" button. Procore offers "Create & Send" which creates and immediately distributes. This workflow shortcut is absent.

**Fix:** Add a secondary submit button "Create & Send" that triggers creation followed by distribution.

---

### UI-007: Detail tabs mismatch

The detail view has a Workflow tab but is missing an Emails tab that Procore provides. Tab structure does not match the expected layout.

**Fix:** Add an Emails tab to the detail view (can be a placeholder initially).

---

### UI-008: Detail sidebar missing 7 fields

The detail sidebar is missing fields present in Procore: `received_from`, `responsible_contractor`, `cost_code`, `location`, `linked_drawings`, `distribution_list`, and `revision_number`.

**Fix:** Add these fields to the detail sidebar component, wiring them to the API response data.

---

### UI-012: Grouped views lack selection and bulk actions

When submittals are displayed in grouped mode (by package, status, etc.), row selection checkboxes and bulk action toolbars are not rendered.

**Fix:** Enable selection and bulk actions in grouped view mode.

---

### UI-013: Only 3 of 13 expected filters implemented

The submittals list only has 3 filters (status, type, spec section). Procore provides 13 filters including responsible contractor, received from, ball in court, package, cost code, location, etc.

**Fix:** Add the missing filter definitions to the table configuration.

---

## LOW (4)

### DB-010: Four tables with zero integration

The tables `submittal_packages`, `submittal_types`, `submittal_spec_sections`, and `submittal_linked_drawings` exist in the schema but have no API endpoints or UI integration. They are unused.

**Fix:** Build API endpoints and wire them into the UI as the related features are implemented.

---

### API-007: Missing related-items management endpoint

There is no endpoint to manage related items (linking submittals to RFIs, change events, etc.). The `submittal_related_items` table exists but is inaccessible via API.

**Fix:** Create a related-items sub-route with GET/POST/DELETE handlers.

---

### UI-009: Missing Redistribute toolbar action

The detail view toolbar does not include a "Redistribute" action, which Procore provides to re-send a previously distributed submittal.

**Fix:** Add a Redistribute button to the detail toolbar, calling the distribute endpoint with updated parameters.

---

### UI-014: Export is client-side CSV only

Export functionality is limited to client-side CSV generation. PDF export uses a print-page hack. There is no Excel export option.

**Fix:** Add server-side export endpoints for PDF and Excel formats, or use a library like `xlsx` for client-side Excel generation.
