# SUBMITTALS — Mutations

Write operations for the submittals module, derived from Procore UI actions
and network request analysis.

## CREATE

| Command | Input | Tables Affected | Side Effects |
|---------|-------|----------------|--------------|
| `create_submittal` | title*, number*, revision*, submittal_type, specification_section, submittal_package_id, responsible_contractor_id, received_from_id, submittal_manager_id*, status, cost_code_id, location_id, distribution_list[], lead_time, required_on_site_date, is_private, description*, attachments[] | submittals, submittal_distributions, submittal_workflow_steps | Sends distribution emails if recipients specified |
| `create_submittal_package` | *fields TBD — not captured in crawl* | submittal_packages | Groups submittals |
| `create_revision` | source_submittal_id | submittals (new row), submittal_revisions | Creates new submittal with incremented revision number, copies fields from source |
| `duplicate_submittal` | source_submittal_id | submittals (new row) | Full copy of submittal including workflow |
| `create_new_submittal` | (opens blank create form) | submittals | Same as create_submittal |
| `create_new_report` | report_type, filters | reports | Opens report builder |
| `add_workflow_step` | step_type, assignees[] | submittal_workflow_steps | Adds step to submittal's workflow chain |

## UPDATE

| Command | Input | Tables Affected | Side Effects |
|---------|-------|----------------|--------------|
| `update_submittal` | submittal_id, (any editable field) | submittals, submittal_distributions | Saves silently |
| `update_and_send_emails` | submittal_id, (any editable field) | submittals, submittal_distributions | Saves AND sends email notifications to distribution list |
| `redistribute` | submittal_id, distribution_list[] | submittal_distributions | Re-sends submittal to updated distribution list |
| `attach_files` | submittal_id, files[] | submittal_attachments | Uploads files to submittal |

## DELETE

| Command | Input | Tables Affected | Side Effects |
|---------|-------|----------------|--------------|
| `delete_submittal` | submittal_id | submittals (soft delete → recycle bin) | Moves to Recycle Bin tab, does not permanently delete |

## READ (Export)

| Command | Input | Output | Notes |
|---------|-------|--------|-------|
| `export_pdf` | filter_params | PDF file | Exports current view as PDF |
| `export_csv` | filter_params | CSV file | Exports current view as CSV |
| `export_excel` | filter_params | XLSX file | Exports current view as Excel |
| `report_approvers_response_time` | filter_params | Report view | Canned report: response times per approver |

## ACTION (Communication)

| Command | Input | Output | Notes |
|---------|-------|--------|-------|
| `email_submittal` | submittal_id, recipients[], message | Email sent | Sends submittal via email from actions menu |

---

## State Machine: Submittal Status

Observed status values from crawl data:

```text
                    ┌──────────┐
                    │  Draft   │  (initial)
                    └────┬─────┘
                         │ submit
                         v
                    ┌──────────┐
                    │   Open   │
                    └────┬─────┘
                         │ distribute
                         v
              ┌──────────────────────┐
              │    Distributed       │  (waiting for responses)
              └──────────┬───────────┘
                         │ all responses received
                         v
                    ┌──────────┐
                    │  Closed  │  (terminal)
                    └──────────┘
```

Observed response values per approver:

- `Submitted` — approver has received the submittal
- `Pending` — awaiting response
- `Approved` — approved without notes
- `Approved as Noted` — approved with conditions

## Workflow Responses

The detail view shows a "Workflow Responses" section with:

- Person name and company
- Response status (Approved as Noted, etc.)
- Comments (free text)
- Attachments (file uploads, marked as CURRENT)

This suggests a `submittal_responses` table:

| Field | Type | Notes |
|-------|------|-------|
| submittal_id | FK | Parent submittal |
| responder_id | FK | User who responded |
| response_status | enum | Submitted, Pending, Approved, Approved as Noted |
| comments | text | Free text response |
| attachments | file[] | Response attachments |
| responded_at | timestamp | When response was given |

## Distribution Summary

The detail view shows:

- **From:** Submittal Manager (person + company)
- **To:** List of recipients (person + company)
- **Message:** Optional message text
- **Attachments:** Files included in distribution

This implies a `submittal_distributions` table tracking distribution events.
