# Form Pages Quick Reference

Quick links to all form pages for consistency review. Using project ID `60`.

---

## Create Forms (New Entities)

| Entity | Link | Notes |
|--------|------|-------|
| **Project** | [Create Project](http://localhost:3000/create-project) | Multi-section form with logo uploads |
| **Change Order** | [New Change Order](http://localhost:3000/60/change-orders/new) | Card-based sections: basic info, financial, line items, scope, workflow |
| **Change Event** | [New Change Event](http://localhost:3000/60/change-events/new) | Title, type, scope, reason, description |
| **Prime Contract** | [New Prime Contract](http://localhost:3000/60/prime-contracts/new) | Contract details, SOV items, attachments |
| **Commitment** | [New Commitment](http://localhost:3000/60/commitments/new) | Type selector (subcontract vs purchase order) |
| **Budget Line Item** | [New Budget Line Items](http://localhost:3000/60/budget/line-item/new) | Multi-row table form with budget code selector |
| **Invoice** | [New Invoice](http://localhost:3000/60/invoices/new) | Tabbed form: general info, line items, summary |
| **Direct Cost** | [New Direct Cost](http://localhost:3000/60/direct-costs/new) | Direct expense entry form |
| **RFI** | [New RFI](http://localhost:3000/60/rfis/new) | RFI details, assignment, additional details |

---

## Edit Forms (Update Entities)

These require an existing entity ID. Replace `[id]` with actual entity ID.

| Entity | URL Pattern | Example Link |
|--------|-------------|--------------|
| **Change Order** | `/60/change-orders/[changeOrderId]/edit` | [Edit Change Order 1](http://localhost:3000/60/change-orders/1/edit) |
| **Change Event** | `/60/change-events/[id]/edit` | [Edit Change Event](http://localhost:3000/60/change-events/1/edit) |
| **Prime Contract** | `/60/prime-contracts/[contractId]/edit` | [Edit Prime Contract 1](http://localhost:3000/60/prime-contracts/1/edit) |
| **Commitment** | `/60/commitments/[commitmentId]/edit` | [Edit Commitment 1](http://localhost:3000/60/commitments/1/edit) |

---

## Other Projects

Replace `60` with any of these project IDs:

| Project | Change Order New | Prime Contract New | Commitment New |
|---------|-----------------|-------------------|----------------|
| **31** | [Link](http://localhost:3000/31/change-orders/new) | [Link](http://localhost:3000/31/prime-contracts/new) | [Link](http://localhost:3000/31/commitments/new) |
| **67** | [Link](http://localhost:3000/67/change-orders/new) | [Link](http://localhost:3000/67/prime-contracts/new) | [Link](http://localhost:3000/67/commitments/new) |
| **60** | [Link](http://localhost:3000/60/change-orders/new) | [Link](http://localhost:3000/60/prime-contracts/new) | [Link](http://localhost:3000/60/commitments/new) |

---

## Consistency Checklist

When reviewing forms, check for:

- [ ] **Header**: Uses `PageHeader` with title, description, cancel/back button
- [ ] **Layout**: Card-based sections with consistent spacing
- [ ] **Labels**: Consistent text style and required field indicators
- [ ] **Inputs**: Same input heights, border styles, focus states
- [ ] **Buttons**: Primary action on right, Cancel on left
- [ ] **Validation**: Error messages styled consistently
- [ ] **Loading**: Spinner in submit button during submission
- [ ] **Success**: Toast notification and redirect after save

---

## Admin Table Forms (Dynamic)

Auto-generated forms for any database table:

- [Companies Table New](http://localhost:3000/tables/companies/new)
- [Contacts Table New](http://localhost:3000/tables/contacts/new)
- [People Table New](http://localhost:3000/tables/people/new)

---

*Generated for quick form consistency review*
