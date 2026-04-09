# Invoicing — Procore Reference & Best Practices

**Generated:** 2026-04-09
**Sources:** Procore support docs (560 articles in Supabase embeddings) + web research

---

## Invoice Types

| Type | Origin Tool | Direction | Purpose |
|------|------------|-----------|---------|
| Owner Invoice | Prime Contracts | GC → Owner | Application for payment (accounts receivable) |
| Subcontractor Invoice | Commitments | Sub → GC | Progress billing (accounts payable) |
| Retainage Release Invoice | Commitments | Sub → GC | Final retainage release only |

---

## Subcontractor Invoice — Form Fields

### Header
| Field | Type | Required |
|-------|------|----------|
| Billing Period | Dropdown | Yes |
| Invoice # | Text | Yes |
| Invoice Start | Date | Yes (defaults from billing period) |
| Invoice End | Date | Yes (defaults from billing period) |
| Billing Date | Date | Yes (defaults from billing period) |
| Status | Dropdown | Yes (defaults Draft) |

### Schedule of Values Line Item Columns (15+)
| Column | Editable |
|--------|----------|
| Item # | No |
| Description | Yes |
| Scheduled Value | No (set on commitment) |
| Work Completed from Previous Applications | No (carried forward) |
| Work Completed This Period ($) | Yes |
| Work Completed This Period (%) | Yes (auto-calculates $) |
| Materials Presently Stored | Yes |
| Total Completed & Stored to Date ($) | No (calculated) |
| Total Completed & Stored to Date (%) | No (calculated) |
| Work Retainage This Period (%) | Yes (auto-calculates $) |
| Work Retainage This Period ($) | Yes (auto-calculates %) |
| Materials Retainage (%) | Yes |
| Total Retainage | No (calculated) |
| Total Retainage Released | Yes |
| Net Amount This Period | No (calculated) |
| Balance to Finish | No (calculated) |

---

## Owner Invoice — Form Fields

### Header
| Field | Type | Required |
|-------|------|----------|
| Commitment Billing Period | Dropdown | Yes |
| Invoice # | Text | Yes (auto-assigned) |
| Period Start | Date | Auto (from billing period) |
| Period End | Date | Auto (from billing period) |
| Billing Date | Date | Yes |
| Status | Dropdown | Yes (defaults Draft) |
| Attachments | File upload | No |

### SOV Detail Line Item (yellow editable fields)
| Field | Type |
|-------|------|
| Work Completed: This Period | Currency |
| Materials Presently Stored | Currency |
| Work Retainage Retained This Period (%) | % or $ |
| Materials Retainage Retained This Period (%) | % or $ |
| Work Retainage $ Released This Period | Currency |
| Percent Complete | Display only (calculated) |

---

## Statuses

### Subcontractor Invoice
| Status | DB Enum | Editable | Budget Impact |
|--------|---------|----------|---------------|
| Draft | `draft` | Yes (Admin + Contact) | No |
| Under Review | `under_review` | No | No |
| Revise & Resubmit | `revise_and_resubmit` | Yes | No |
| Approved | `approved` | No | Yes |
| Approved as Noted | — | No | Yes |
| Pending Owner Approval | — | No | No |

### Owner Invoice
| Status | DB Enum |
|--------|---------|
| Draft | `draft` |
| Under Review | `under_review` |
| Revise & Resubmit | `revise_and_resubmit` |
| Approved | `approved` |

### Status Transitions
```
Draft → Under Review (contact submits)
Under Review → Revise & Resubmit (admin rejects)
Under Review → Approved
Under Review → Approved as Noted
Under Review → Pending Owner Approval
Revise & Resubmit → Under Review (resubmitted)
```

---

## List View

### Tabs
- Owner (tab 1)
- Subcontractor (tab 2)

### Columns (both tabs)
Invoice #, Billing Period, Status, Payment Status, Gross Amount, Net Amount, Previous Changes, Current Changes, Contract Company

### Filters
Contract Company, Billing Period, Invoice Status, Payment Status, Contract Type

### Grouping
- Owner: by Prime Contract, Invoice Status, Payment Status
- Subcontractor: by Contract Company, Invoice Status, Payment Status, Billing Period

---

## Detail View — Tabs

### Subcontractor Invoice
1. Summary (header info, totals)
2. Schedule of Values (editable SOV grid — main billing interface)
3. Attachments
4. Change History / Audit trail
5. Lien Waivers (Procore Pay)
6. Signatures (DocuSign)

### Owner Invoice
1. Summary
2. Detail (SOV with editable yellow fields)
3. Change History
4. Attachments

---

## Actions

### Subcontractor
| Action | Who |
|--------|-----|
| Submit | Invoice Contact (from Draft) |
| Approve | Admin (from Under Review) |
| Approve as Noted | Admin (from Under Review) |
| Reject / Revise & Resubmit | Admin (from Under Review) |
| Approve/Reject individual line items | Admin |
| Forward by email | Admin |
| Delete | Admin or Contact (Draft/R&R only) |
| Export PDF | Any |
| Send to ERP | Admin (Approved+) |
| Generate Lien Waivers | Any (Procore Pay) |

### Owner
Create, Edit, Delete, Email, Export PDF, Export configurable PDF, Send to ERP

---

## Billing Periods

| Field | Default |
|-------|---------|
| Start Date | 1st of month |
| End Date | 31st of month |
| Due Date | 25th of month |

**Rules:** Only one period can be Open at a time. Admin-only creation/editing.

---

## Payments Issued Tracking

### Form Fields
| Field | Type |
|-------|------|
| Invoice | Dropdown (link to existing) |
| Payment # | Text |
| Payment Method | Dropdown: Check / Credit Card / Electronic |
| Amount | Currency |
| Date | Date |
| Invoice # | Text |
| Check # | Text |
| Notes | Text area |
| Attachments | File upload |

**Payment Statuses:** Unpaid → Partially Paid → Paid

---

## Configurable Settings

| Setting | Type |
|---------|------|
| Default billing period start/end/due dates | Day of month |
| Subcontractor default invoice type | Dropdown |
| Remind subcontractors to bill | Toggle + frequency |
| Send Under Review digest | Toggle (weekly Monday) |
| Notify subs on approval | Toggle |
| Invitation custom message | Text area |
| PDF footer text | Text area |
| Show amounts subs claim | Toggle |
| Allow over-billing | Toggle |

---

## Permissions

| Level | Capabilities |
|-------|-------------|
| None | No access |
| Read Only | View; accept/decline Invite to Bill |
| Standard | Create/edit billing periods; CRUD owner invoices; create payment records; configure settings |
| Admin (Invoice Administrator) | All + approve/reject; manage invoice contacts |

**Invoice Contact** = special role (external), can submit/revise invoices.

---

## Integration Points

| Tool | Relationship |
|------|-------------|
| Prime Contracts | Required prerequisite for owner invoices |
| Commitments | Required prerequisite for subcontractor invoices + SOV |
| Budget | Approved sub invoices update actuals |
| Change Orders/Events | Add to SOV as new line items |
| Acumatica ERP | Export approved invoices |
| DocuSign | E-signatures (after Approved) |
| Procore Pay | Lien waivers, digital payments (US only) |
