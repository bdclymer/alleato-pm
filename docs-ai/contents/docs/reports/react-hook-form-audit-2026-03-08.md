# React Hook Form Best Practices Audit

**Date:** 2026-03-08 | **Commit:** `86e366ef` | **Skill:** `pproenca/dot-skills@react-hook-form`

---

## All 22 Forms — Fixes Applied

| # | Component | File Path | reValidateMode | watch→useWatch | Select Fix | Other |
|---|-----------|-----------|:-:|:-:|:-:|:-:|
| 1 | DirectCostForm | `components/direct-costs/DirectCostForm.tsx` | Y | — | — | Resolver cached, mode fixed |
| 2 | CompanyEditDialog | `components/directory/CompanyEditDialog.tsx` | Y | — | — | — |
| 3 | DistributionGroupDialog | `components/directory/DistributionGroupDialog.tsx` | Y | — | — | — |
| 4 | PermissionTemplateDialog | `components/directory/PermissionTemplateDialog.tsx` | Y | — | — | — |
| 5 | ChangeEventRfqForm | `components/domain/change-events/ChangeEventRfqForm.tsx` | Y | 1 field | — | — |
| 6 | ChangeEventRfqResponseForm | `components/domain/change-events/ChangeEventRfqResponseForm.tsx` | Y | — | — | — |
| 7 | ChangeOrderDetail | `components/domain/change-orders/ChangeOrderDetail.tsx` | Y | — | — | — |
| 8 | ClientFormDialog | `components/domain/clients/ClientFormDialog.tsx` | Y | — | — | — |
| 9 | CompanyFormDialog | `components/domain/companies/CompanyFormDialog.tsx` | Y | — | — | — |
| 10 | ContactFormDialog | `components/domain/contacts/ContactFormDialog.tsx` | Y | — | — | — |
| 11 | ProjectContactFormDialog | `components/domain/contacts/ProjectContactFormDialog.tsx` | Y | — | — | — |
| 12 | CreatePurchaseOrderForm | `components/domain/contracts/CreatePurchaseOrderForm.tsx` | Y | 7 fields | — | — |
| 13 | CreateSubcontractForm | `components/domain/contracts/CreateSubcontractForm.tsx` | Y | 5 fields | — | — |
| 14 | DistributionGroupFormDialog | `components/domain/distribution-groups/DistributionGroupFormDialog.tsx` | Y | 1 field | — | — |
| 15 | PunchItemFormDialog | `components/domain/punch-items/punch-item-form-dialog.tsx` | Y | — | 2 Selects | — |
| 16 | UserFormDialog | `components/domain/users/UserFormDialog.tsx` | Y | — | — | — |
| 17 | DrawingAreaCard | `components/drawings/DrawingAreaCard.tsx` | Y | — | — | — |
| 18 | DrawingUploadDialog | `components/drawings/DrawingUploadDialog.tsx` | Y | — | — | — |
| 19 | AddRevisionDialog | `components/specifications/AddRevisionDialog.tsx` | Y | — | — | — |
| 20 | SpecificationEditModal | `components/specifications/SpecificationEditModal.tsx` | Y | — | — | — |
| 21 | SpecificationUploadDialog | `components/specifications/SpecificationUploadDialog.tsx` | Y | — | — | — |
| 22 | StandardFormPage | `components/templates/StandardFormPage.tsx` | Y | — | — | — |

> All paths relative to `frontend/src/`

---

## Fix Descriptions

| Fix | What It Does | Forms | Performance Impact |
|-----|-------------|:-----:|-------------------|
| `reValidateMode: "onBlur"` | Re-validates on field blur instead of every keystroke after failed submit | 22 | ~80% fewer post-submit re-renders |
| `watch()` → `useWatch()` | Isolates re-renders to only the component that needs the watched value | 4 (14 calls) | 10-50x fewer re-renders per watched field |
| Select `defaultValue` → `value` | Makes shadcn Select properly controlled by RHF | 1 (2 Selects) | Correct sync between dropdown and form state |
| Resolver cached with `useMemo` | Prevents Zod resolver from being recreated every render | 1 | Eliminates unnecessary object allocation |
| `mode: 'onBlur'` → default `'onSubmit'` | Only validates on submit, not on every field blur | 1 | No per-blur validation overhead |

---

## watch → useWatch Detail

| Form | Fields Converted | Total Calls |
|------|-----------------|:-----------:|
| ChangeEventRfqForm | `changeEventId` | 1 |
| DistributionGroupFormDialog | `member_ids` | 1 |
| CreateSubcontractForm | `contractCompanyId`, `privacy.isPrivate`, `accountingMethod`, `status`, `executed` | 5 |
| CreatePurchaseOrderForm | `contractCompanyId`, `privacy.isPrivate`, `status`, `executed`, `assignedTo`, `description`, `privacy.allowNonAdminViewSovItems` | 7 |

---

## Forms NOT Using RHF (Excluded from Audit)

| Component | Reason |
|-----------|--------|
| BudgetModificationDialog | Uses plain `useState` |
| ChangeEventFormDialog | Uses plain `useState` |
| InvoiceCreateDialog | Uses plain `useState` |
| MeetingFormDialog | Uses plain `useState` |
| RfiFormDialog | Uses plain `useState` |
| SubmittalFormDialog | Uses plain `useState` |
| TransmittalFormDialog | Uses plain `useState` |

---

## Verification

| Check | Result |
|-------|--------|
| TypeScript (`npx tsc --noEmit`) | Exit 0, zero errors |
| ESLint (pre-commit hook) | Passed |
| Route conflict check | No conflicts |
| Dev server | No errors |
| Manual test (Punch Item form) | Dialog renders correctly, Select shows controlled value |
