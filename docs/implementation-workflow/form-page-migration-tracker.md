# Form Page Migration Tracker

_Last updated: 2026-03-10_

## Status legend

- `Migrated (form system)`: Uses shared form-system components (`FormSection`, `FormGrid`, RHF field wrappers) directly or via a dedicated form component.
- `Layout only`: Uses `ProjectFormPageLayout` for consistent page spacing/alignment, but field migration to the shared form system is still pending.
- `Not migrated`: Still on a bespoke layout and/or bespoke field system.

## Form pages

| Route | Page file | `ProjectFormPageLayout` | Shared form system in page file | Migration status | Notes |
|---|---|---|---|---|---|
| `/[projectId]/budget/line-item/new` | `frontend/src/app/(main)/[projectId]/budget/line-item/new/page.tsx` | No | No | Not migrated | |
| `change-events - edit` | `frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/edit/page.tsx` | Yes | No | Layout only | |
| `change-events - new` | `frontend/src/app/(main)/[projectId]/change-events/new/page.tsx` | Yes | No | Layout only | |
| `change-orders - edit` | `frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/edit/page.tsx` | Yes | No | Layout only | |
| `change-orders - new` | `frontend/src/app/(main)/[projectId]/change-orders/new/page.tsx` | Yes | No | Layout only | |
| `/[projectId]/commitments/[commitmentId]/edit` | `frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/edit/page.tsx` | Yes | No | Layout only | |
| `/[projectId]/commitments/configure` | `frontend/src/app/(main)/[projectId]/commitments/configure/page.tsx` | No | No | Not migrated | |
| `/[projectId]/commitments/new` | `frontend/src/app/(main)/[projectId]/commitments/new/page.tsx` | Yes | No | Layout only | |
| `/[projectId]/direct-costs/new` | `frontend/src/app/(main)/[projectId]/direct-costs/new/page.tsx` | Yes | No | Migrated (form system) | Uses `CreateDirectCostForm` -> `DirectCostForm` (shared form system) |
| `/[projectId]/invoices/new` | `frontend/src/app/(main)/[projectId]/invoices/new/page.tsx` | Yes | No | Layout only | |
| `/[projectId]/invoicing/[invoiceId]` | `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx` | No | No | Not migrated | |
| `/[projectId]/invoicing/new` | `frontend/src/app/(main)/[projectId]/invoicing/new/page.tsx` | Yes | No | Layout only | |
| `/[projectId]/meetings/schedule` | `frontend/src/app/(main)/[projectId]/meetings/schedule/page.tsx` | Yes | No | Layout only | |
| `/[projectId]/prime-contracts/[contractId]/edit` | `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/edit/page.tsx` | Yes | No | Layout only | |
| `/[projectId]/prime-contracts/configure` | `frontend/src/app/(main)/[projectId]/prime-contracts/configure/page.tsx` | Yes | Yes | Migrated (form system) | |
| `/[projectId]/prime-contracts/new` | `frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx` | Yes | No | Layout only | |
| `/[projectId]/rfis/new` | `frontend/src/app/(main)/[projectId]/rfis/new/page.tsx` | Yes | No | Layout only | |
| `/admin/company-knowledge` | `frontend/src/app/(main)/admin/company-knowledge/page.tsx` | No | No | Not migrated | |
| `/create-project` | `frontend/src/app/(main)/create-project/page.tsx` | No | Yes | Migrated (form system) | |
| `/form-template` | `frontend/src/app/(main)/form-template/page.tsx` | No | Yes | Migrated (form system) | Reference template |

## Suggested workflow

1. Migrate `Not migrated` pages to `ProjectFormPageLayout` first.
2. Migrate fields/sections to shared form-system components next.
3. Update this table row-by-row as each page is completed.
