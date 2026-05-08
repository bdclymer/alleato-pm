# PageShell Audit - 2026-05-08

Command:

```bash
node scripts/audits/audit-pageshell-violations.mjs
```

## Summary

- Scanned: 252 `page.tsx` files under `frontend/src/app/**`
- Pages with violations: 107
- Deprecated layouts: 0
- Double-header pages: 1
- Legacy primitive layouts: 10
- Missing `PageShell`: 90
- Auth pages missing `PageShell`: 7

## Detection Gap Fixed

The existing audit script claimed it checked for pages missing `PageShell`, but it only reported deprecated layouts and `PageContainer` plus manual `h1` double-header cases. The script now reports:

- `LEGACY_PRIMITIVE_LAYOUT` when a page uses `PageContainer`, `ProjectPageHeader`, or `PageHeader` without `PageShell`.
- `MISSING_PAGE_SHELL` when a route entrypoint does not use `PageShell`.
- `MISSING_PAGE_SHELL_AUTH` for auth routes without `PageShell`.

Redirect-only aliases are skipped.

## Highest Priority Pages

These are admin, intelligence, database, and core shell surfaces that should be cleaned up before lower-level project detail pages.

```text
frontend/src/app/(main)/intelligence-planning/page.tsx
frontend/src/app/(admin)/site-map/page.tsx
frontend/src/app/(admin)/user-management/page.tsx
frontend/src/app/(admin)/errors/page.tsx
frontend/src/app/(admin)/annotation-inbox/page.tsx
frontend/src/app/(admin)/admin-check/page.tsx
frontend/src/app/(admin)/api-docs/page.tsx
frontend/src/app/(admin)/rag-eval/page.tsx
frontend/src/app/(admin)/dev/table-generator/page.tsx
frontend/src/app/(admin)/table-pages/page.tsx
frontend/src/app/(admin)/table-pages/[table]/page.tsx
frontend/src/app/(admin)/table-pages/[table]/new/page.tsx
frontend/src/app/(admin)/table-pages/[table]/[recordId]/page.tsx
frontend/src/app/(main)/pipeline/page.tsx
frontend/src/app/(main)/knowledge/page.tsx
frontend/src/app/(main)/knowledge/manage/page.tsx
frontend/src/app/(main)/financial-insights/page.tsx
frontend/src/app/(main)/page.tsx
```

## Double Header

```text
frontend/src/app/(admin)/(procore)/support-articles/[articleId]/page.tsx
```

## Legacy Primitive Layouts

These use `PageContainer`, `ProjectPageHeader`, or `PageHeader`, but not `PageShell`.

```text
frontend/src/app/(admin)/(procore)/crawled-pages/page.tsx
frontend/src/app/(admin)/(procore)/support-articles/[articleId]/page.tsx
frontend/src/app/(admin)/admin/company-info/page.tsx
frontend/src/app/(admin)/api-docs/page.tsx
frontend/src/app/(admin)/dev/table-generator/page.tsx
frontend/src/app/(admin)/rag-eval/page.tsx
frontend/src/app/(admin)/spreadsheet-demo/page.tsx
frontend/src/app/(admin)/table-pages/[table]/[recordId]/page.tsx
frontend/src/app/(main)/intelligence-planning/page.tsx
frontend/src/app/(main)/pipeline/page.tsx
```

## Missing PageShell

These route entrypoints do not use `PageShell`.

```text
frontend/src/app/(admin)/(procore)/procore-tools/page.tsx
frontend/src/app/(admin)/(procore)/procore-tracker/[featureId]/page.tsx
frontend/src/app/(admin)/(procore)/procore-tracker/page.tsx
frontend/src/app/(admin)/(procore)/support-articles/page.tsx
frontend/src/app/(admin)/accounting/ap-invoices/page.tsx
frontend/src/app/(admin)/accounting/ap-payments/page.tsx
frontend/src/app/(admin)/accounting/bills/page.tsx
frontend/src/app/(admin)/accounting/checks/page.tsx
frontend/src/app/(admin)/accounting/invoices/page.tsx
frontend/src/app/(admin)/accounting/payments/page.tsx
frontend/src/app/(admin)/accounting/projects/page.tsx
frontend/src/app/(admin)/admin-check/page.tsx
frontend/src/app/(admin)/annotation-inbox/page.tsx
frontend/src/app/(admin)/design-ideas/page.tsx
frontend/src/app/(admin)/design-system-update/page.tsx
frontend/src/app/(admin)/errors/page.tsx
frontend/src/app/(admin)/motion/page.tsx
frontend/src/app/(admin)/projects-table-demo/page.tsx
frontend/src/app/(admin)/site-map/page.tsx
frontend/src/app/(admin)/table-pages/[table]/new/page.tsx
frontend/src/app/(admin)/table-pages/[table]/page.tsx
frontend/src/app/(admin)/table-pages/page.tsx
frontend/src/app/(admin)/user-management/page.tsx
frontend/src/app/(dashboard)/invoice/add/page.tsx
frontend/src/app/(dashboard)/invoice/edit/page.tsx
frontend/src/app/(dashboard)/invoice/list/page.tsx
frontend/src/app/(dashboard)/invoice/preview/page.tsx
frontend/src/app/(main)/[projectId]/billing-periods/page.tsx
frontend/src/app/(main)/[projectId]/budget/page.tsx
frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/edit/page.tsx
frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/edit/page.tsx
frontend/src/app/(main)/[projectId]/change-orders/page.tsx
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx
frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/invoices/[invoiceId]/page.tsx
frontend/src/app/(main)/[projectId]/commitments/page.tsx
frontend/src/app/(main)/[projectId]/direct-costs/page.tsx
frontend/src/app/(main)/[projectId]/documents/page.tsx
frontend/src/app/(main)/[projectId]/drawings/page.tsx
frontend/src/app/(main)/[projectId]/emails/page.tsx
frontend/src/app/(main)/[projectId]/estimates/[estimateId]/page.tsx
frontend/src/app/(main)/[projectId]/estimates/page.tsx
frontend/src/app/(main)/[projectId]/invoices/page.tsx
frontend/src/app/(main)/[projectId]/invoicing/subcontractor/[invoiceId]/page.tsx
frontend/src/app/(main)/[projectId]/invoicing/subcontractor/page.tsx
frontend/src/app/(main)/[projectId]/meetings/[meetingId]/page.tsx
frontend/src/app/(main)/[projectId]/meetings/page.tsx
frontend/src/app/(main)/[projectId]/pcos/page.tsx
frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/change-orders/pcos/[pcoId]/edit/page.tsx
frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/change-orders/pcos/[pcoId]/page.tsx
frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/change-orders/pcos/new/page.tsx
frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/edit/page.tsx
frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx
frontend/src/app/(main)/[projectId]/progress-reports/page.tsx
frontend/src/app/(main)/[projectId]/specifications/page.tsx
frontend/src/app/(main)/[projectId]/submittals/[submittalId]/edit/page.tsx
frontend/src/app/(main)/[projectId]/submittals/[submittalId]/page.tsx
frontend/src/app/(main)/[projectId]/submittals/new/page.tsx
frontend/src/app/(main)/[projectId]/submittals/page.tsx
frontend/src/app/(main)/[projectId]/transmittals/page.tsx
frontend/src/app/(main)/access-denied/page.tsx
frontend/src/app/(main)/ai-assistant/page.tsx
frontend/src/app/(main)/billing-periods/page.tsx
frontend/src/app/(main)/calendar/page.tsx
frontend/src/app/(main)/directory/clients/page.tsx
frontend/src/app/(main)/directory/companies/page.tsx
frontend/src/app/(main)/directory/contacts/page.tsx
frontend/src/app/(main)/directory/employees/page.tsx
frontend/src/app/(main)/directory/groups/page.tsx
frontend/src/app/(main)/directory/prospects/page.tsx
frontend/src/app/(main)/directory/vendors/page.tsx
frontend/src/app/(main)/estimates/[type]/page.tsx
frontend/src/app/(main)/estimates/page.tsx
frontend/src/app/(main)/financial-insights/page.tsx
frontend/src/app/(main)/fm-global/fm_global_tables/page.tsx
frontend/src/app/(main)/knowledge/manage/page.tsx
frontend/src/app/(main)/knowledge/page.tsx
frontend/src/app/(main)/page.tsx
frontend/src/app/(main)/stats/page.tsx
frontend/src/app/(main)/team-chat/page.tsx
frontend/src/app/(tables)/daily-logs/[id]/page.tsx
frontend/src/app/(tables)/daily-logs/page.tsx
frontend/src/app/(tables)/daily-reports/page.tsx
frontend/src/app/(tables)/documents/page.tsx
frontend/src/app/(tables)/drawings/page.tsx
frontend/src/app/(tables)/insights/page.tsx
frontend/src/app/(tables)/meeting-segments/page.tsx
frontend/src/app/(tables)/meetings/[meetingId]/page.tsx
frontend/src/app/(tables)/meetings/page.tsx
frontend/src/app/(tables)/progress-reports/page.tsx
frontend/src/app/(tables)/project-documents/page.tsx
```

## Auth Pages Missing PageShell

These may be intentionally outside the normal app shell, but they are still route entrypoints without `PageShell`.

```text
frontend/src/app/auth/error/page.tsx
frontend/src/app/auth/forgot-password/page.tsx
frontend/src/app/auth/login-v2/page.tsx
frontend/src/app/auth/login/page.tsx
frontend/src/app/auth/sign-up-success/page.tsx
frontend/src/app/auth/sign-up/page.tsx
frontend/src/app/auth/update-password/page.tsx
```

## Recommended Migration Order

1. Admin/intelligence/database index pages and pages linked from `/admin`.
2. High-traffic project table/list pages.
3. Detail/edit pages where shell mismatch causes spacing or header drift.
4. Auth and legacy dashboard route groups only after deciding whether they should share app shell behavior.
