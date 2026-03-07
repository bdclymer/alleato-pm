# Route Audit

Generated: 2026-03-07T01:53:51.715Z

## Summary

- Pages: 162
- API routes: 213
- Metadata routes: 2
- Disabled non-prod pages: 13
- Potentially orphaned static pages (heuristic): 20

## Notes

- `Potentially orphaned` means no inbound literal route reference found in source.
- Dynamic routes are excluded from orphan detection by default.
- This is static analysis only; it does not include real production traffic analytics.

## Potentially Orphaned Static Pages

| Route | File |
| --- | --- |
| /admin/ai-observability | frontend/src/app/(main)/admin/ai-observability/page.tsx |
| /auth/login-v2 | frontend/src/app/auth/login-v2/page.tsx |
| /billing-periods | frontend/src/app/(main)/billing-periods/page.tsx |
| /design-system-update | frontend/src/app/(other)/design-system-update/page.tsx |
| /directory/employees | frontend/src/app/(main)/directory/employees/page.tsx |
| /infinite-projects | frontend/src/app/(tables)/infinite-projects/page.tsx |
| /modal-demo | frontend/src/app/(other)/modal-demo/page.tsx |
| /procore-tools | frontend/src/app/(tables)/procore-tools/page.tsx |
| /qa-audit | frontend/src/app/(other)/qa-audit/page.tsx |
| /redoc | frontend/src/app/redoc/page.tsx |
| /settings/plugins | frontend/src/app/(other)/settings/plugins/page.tsx |
| /stats | frontend/src/app/(other)/stats/page.tsx |
| /style-guide | frontend/src/app/(other)/style-guide/page.tsx |
| /subcontractors | frontend/src/app/(tables)/subcontractors/page.tsx |
| /submittals/settings/custom-fields | frontend/src/app/(tables)/submittals/settings/custom-fields/page.tsx |
| /submittals/settings/general | frontend/src/app/(tables)/submittals/settings/general/page.tsx |
| /submittals/settings/workflow-templates | frontend/src/app/(tables)/submittals/settings/workflow-templates/page.tsx |
| /table-v2 | frontend/src/app/(other)/table-v2/page.tsx |
| /template/data-table | frontend/src/app/template/data-table/page.tsx |
| /templates/form-standard | frontend/src/app/templates/form-standard/page.tsx |

## Disabled Non-Prod Pages

| Route | File |
|---|---|
| /chat-admin-view | frontend/src/app/(chat)/chat-admin-view/page.nonprod.tsx |
| /chat-demo | frontend/src/app/(chat)/chat-demo/page.nonprod.tsx |
| /chat-rag | frontend/src/app/(chat)/chat-rag/page.nonprod.tsx |
| /chat-tool | frontend/src/app/(chat)/chat-tool/page.nonprod.tsx |
| /dashboard4 | frontend/src/app/dashboard4/page.nonprod.tsx |
| /dev | frontend/src/app/(other)/dev/page.nonprod.tsx |
| /dev/table-generator | frontend/src/app/(other)/dev/table-generator/page.nonprod.tsx |
| /simple-chat | frontend/src/app/(chat)/simple-chat/page.nonprod.tsx |
| /test-approval-workflow | frontend/src/app/(other)/test-approval-workflow/page.nonprod.tsx |
| /test-change-order-reviewer | frontend/src/app/(main)/test-change-order-reviewer/page.nonprod.tsx |
| /test-form | frontend/src/app/(other)/test-form/page.nonprod.tsx |
| /test-line-items | frontend/src/app/(main)/test-line-items/page.nonprod.tsx |
| /test-modals | frontend/src/app/(main)/test-modals/page.nonprod.tsx |