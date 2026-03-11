# Form Pages Audit

Audit date: 2026-03-11  
Standard: `/docs/FORM-SYSTEM.md`

| Name | URL | Notes | Audit Status | Screenshot |
| --- | --- | --- | --- | --- |
| New Commitment | `/:projectId/commitments/new` | Uses `CreateSubcontractForm` / `CreatePurchaseOrderForm`; form logic is centralized but still mixes legacy field composition and direct UI primitives. | Partial | Pending capture |
| Commitment Detail (Inline Edit) | `/:projectId/commitments/:commitmentId?edit=1` | Edit is inline on detail page (meets no-separate-edit-page requirement). Uses shared commitment form components. | Partial | Pending capture |
| Commitment Edit Redirect | `/:projectId/commitments/:commitmentId/edit` | Redirect-only route to inline edit query state. | Pass | N/A (redirect route) |
| New Change Order | `/:projectId/change-orders/new` | Updated to use `FormSection` + `FormActions`. Still uses `@/components/ui/form` fields directly for many controls; next step is RHF wrapper migration. | Partial | Pending capture |
| Change Order Detail (Inline Edit) | `/:projectId/change-orders/:changeOrderId?edit=1` | Inline edit on detail page (meets no-separate-edit-page requirement). Edit UI still mostly manual `ui/form` composition. | Partial | Pending capture |
| Change Order Edit Redirect | `/:projectId/change-orders/:changeOrderId/edit` | Redirect-only route to inline edit query state. | Pass | N/A (redirect route) |
| New Direct Cost | `/:projectId/direct-costs/new` | Uses `CreateDirectCostForm`/`DirectCostForm` with form-system layout components and RHF field wrappers. | Pass | Pending capture |
| Direct Cost Detail (Inline Edit Slideover) | `/:projectId/direct-costs/:costId` | Edit happens inline in detail view via `DirectCostForm` slideover. No separate edit page. | Pass | Pending capture |
| New Prime Contract | `/:projectId/prime-contracts/new` | Uses `ContractForm`; good reuse, but not fully migrated to RHF field wrappers from form system. | Partial | Pending capture |
| Prime Contract Detail (Inline Edit) | `/:projectId/prime-contracts/:contractId?edit=1` | Inline-edit query-state pattern used. | Partial | Pending capture |
| Prime Contract Edit Redirect | `/:projectId/prime-contracts/:contractId/edit` | Redirect-only route to inline edit query state. | Pass | N/A (redirect route) |
| New Change Event | `/:projectId/change-events/new` | Uses `ChangeEventForm`; wide form (`maxWidth=3xl`) is justified by line-item and attachment complexity. | Partial | Pending capture |
| Change Event Detail (Inline Edit) | `/:projectId/change-events/:changeEventId?edit=1` | Inline-edit query-state pattern used. | Partial | Pending capture |
| Change Event Edit Redirect | `/:projectId/change-events/:changeEventId/edit` | Redirect-only route to inline edit query state. | Pass | N/A (redirect route) |
| New RFI | `/:projectId/rfis/new` | Uses form-system components including RHF wrappers for key fields. | Pass | Pending capture |
| New Invoice (Invoices) | `/:projectId/invoices/new` | Uses form-system sectioning and actions; field-level migration to RHF wrappers is mixed. | Partial | Pending capture |
| New Invoice (Invoicing) | `/:projectId/invoicing/new` | Uses `FormGrid`/`FormSection`/`FormActions`; has mixed manual field wiring. | Partial | Pending capture |
| Invoice Detail (Invoicing Inline Edit) | `/:projectId/invoicing/:invoiceId` | Uses RHF wrappers for several fields and inline editing. | Pass | Pending capture |
| Budget Line Item (New) | `/:projectId/budget/line-item/new` | Uses form-system sections/actions; some manual field composition remains due advanced logic. | Partial | Pending capture |
| Meetings Schedule | `/:projectId/meetings/schedule` | Uses `FormGrid`, `FormSection`, and `FormActions`; consistent structure. | Pass | Pending capture |
| Commitments Configure | `/:projectId/commitments/configure` | Configuration form page uses project form layout but not fully standardized field wrappers. | Partial | Pending capture |
| Prime Contracts Configure | `/:projectId/prime-contracts/configure` | Uses form-system sections; toggle and controls are mixed with manual wiring. | Partial | Pending capture |
| Create Project | `/create-project` | Uses legacy `ui/form` composition heavily; should be migrated into form-system wrappers for consistency. | Needs migration | Pending capture |

## Summary

- Direct requirement met for detail-page editing: commitments, change orders, and direct costs all support inline edit flow from their detail pages.
- Separate edit routes for commitments/change-orders/prime-contracts/change-events are redirect-only and no longer host standalone forms.
- Remaining consistency work is wrapper migration: standardize pages still relying on direct `@/components/ui/form` field composition.
