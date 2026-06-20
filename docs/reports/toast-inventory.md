# Toast Surface Inventory

Generated: 2026-05-18T21:08:10.046Z
Mode: `all`
Scanned files: 3061

## Summary

- Toast calls found: 1543
- Files with toast calls: 291
- Direct `sonner` toast imports: 261
- Flagged toast calls: 1063

## Calls By Type

| Type | Count |
| --- | --- |
| error | 859 |
| success | 613 |
| info | 37 |
| warning | 18 |
| loading | 7 |
| promise | 5 |
| default | 3 |
| message | 1 |

## Risk Labels

| Risk | Count |
| --- | --- |
| duplicate-risk | 844 |
| generic-error | 537 |
| dynamic-message | 414 |
| load-error | 70 |
| placeholder | 8 |
| success-no-context | 2 |

## Top Toast Files

| File | Count |
| --- | --- |
| frontend/src/app/(main)/[projectId]/budget/page.tsx | 36 |
| frontend/src/hooks/use-submittals.ts | 30 |
| frontend/src/app/(main)/[projectId]/schedule/page.tsx | 25 |
| frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx | 24 |
| frontend/src/hooks/use-drawings.ts | 24 |
| frontend/src/components/ai-assistant/chat-area.tsx | 23 |
| frontend/src/app/(main)/directory/companies/[companyId]/page.tsx | 22 |
| frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx | 20 |
| frontend/src/components/invoicing/SubcontractorInvoiceDetail.tsx | 20 |
| frontend/src/app/(main)/[projectId]/directory/page.tsx | 19 |
| frontend/src/hooks/use-pcos.ts | 18 |
| frontend/src/components/direct-costs/DirectCostForm.tsx | 17 |
| frontend/src/app/(admin)/annotation-inbox/page.tsx | 16 |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx | 16 |
| frontend/src/app/(admin)/feedback-inbox/page.tsx | 14 |
| frontend/src/app/(admin)/user-management/page.tsx | 14 |
| frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx | 14 |
| frontend/src/app/(main)/[projectId]/estimates/[estimateId]/estimate-detail-client-v2.tsx | 14 |
| frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx | 13 |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx | 13 |

## Flagged Toast Calls

| Location | Type | Message | Area | Risk |
| --- | --- | --- | --- | --- |
| frontend/src/app/(admin)/(procore)/crawled-pages/page.tsx:186 | error | Failed to load crawled pages | app | generic-error, load-error, duplicate-risk |
| frontend/src/app/(admin)/(procore)/support-articles/support-articles-client.tsx:513 | error | Failed to delete article | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/(procore)/support-articles/support-articles-client.tsx:524 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/(procore)/support-articles/support-articles-client.tsx:547 | error | Failed to delete articles | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/(procore)/support-articles/support-articles-client.tsx:556 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/admin/company-info/page.tsx:188 | error | Failed to save company profile | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/admin/company-info/page.tsx:343 | error | Failed to archive article | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/admin/company-info/page.tsx:388 | error | Failed to update article | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/admin/company-info/page.tsx:397 | error | Failed to create article | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/admin/company-info/page.tsx:533 | error | Title and content are required | app | duplicate-risk |
| frontend/src/app/(admin)/ai-learning-promotions/promotions-client.tsx:267 | error | Failed to load learning promotions | app | generic-error, load-error, duplicate-risk |
| frontend/src/app/(admin)/ai-learning-promotions/promotions-client.tsx:288 | error | Failed to load learning activity | app | generic-error, load-error, duplicate-risk |
| frontend/src/app/(admin)/ai-learning-promotions/promotions-client.tsx:309 | error | Failed to load learning metrics | app | generic-error, load-error, duplicate-risk |
| frontend/src/app/(admin)/ai-learning-promotions/promotions-client.tsx:339 | error | Promotion scan failed | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/ai-learning-promotions/promotions-client.tsx:359 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/ai-learning-promotions/promotions-client.tsx:373 | error | Review action failed | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/ai-learning-promotions/promotions-client.tsx:397 | error | Impact preview failed | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/annotation-inbox/page.tsx:295 | error | Title is required | app | duplicate-risk |
| frontend/src/app/(admin)/annotation-inbox/page.tsx:316 | error | Failed to create task | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/annotation-inbox/page.tsx:354 | error | dynamic | app | dynamic-message, duplicate-risk |
| frontend/src/app/(admin)/annotation-inbox/page.tsx:480 | error | dynamic | app | dynamic-message, duplicate-risk |
| frontend/src/app/(admin)/annotation-inbox/page.tsx:497 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/annotation-inbox/page.tsx:500 | error | dynamic | app | dynamic-message, duplicate-risk |
| frontend/src/app/(admin)/annotation-inbox/page.tsx:520 | error | Failed to post reply | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/annotation-inbox/page.tsx:562 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/annotation-inbox/page.tsx:564 | error | Dispatch failed | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/annotation-inbox/page.tsx:586 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/annotation-inbox/page.tsx:588 | error | Failed to resolve duplicate cluster | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/annotation-inbox/page.tsx:605 | error | Failed to update verification checklist | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/database-inventory/page.tsx:160 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/database-inventory/page.tsx:162 | error | Failed to refresh row counts | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/design-ideas/_sections/feedback.tsx:174 | error | Failed to save changes | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/dev/table-generator/page.tsx:433 | error | dynamic | app | dynamic-message, duplicate-risk |
| frontend/src/app/(admin)/dev/table-generator/page.tsx:471 | info | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/dev/table-generator/page.tsx:600 | error | Failed to fetch tables | app | generic-error, load-error, duplicate-risk |
| frontend/src/app/(admin)/dev/table-generator/page.tsx:641 | warning | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/dev/table-generator/page.tsx:643 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/dev/table-generator/page.tsx:646 | error | Failed to fetch columns | app | generic-error, load-error, duplicate-risk |
| frontend/src/app/(admin)/dev/table-generator/page.tsx:728 | error | Please select a table first | app | duplicate-risk |
| frontend/src/app/(admin)/dev/table-generator/page.tsx:759 | error | Failed to copy | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx:765 | error | Failed to load document content | app | generic-error, load-error, duplicate-risk |
| frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx:955 | error | Failed to update project | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx:1081 | error | Failed to delete | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx:1089 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx:1105 | error | Failed to delete | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx:1112 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/errors/app-errors-client.tsx:263 | error | Failed to update error status | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/errors/app-errors-client.tsx:279 | error | Failed to load error details | app | generic-error, load-error |
| frontend/src/app/(admin)/errors/app-errors-client.tsx:296 | error | Unable to copy fix packet | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/errors/app-errors-client.tsx:314 | error | Failed to save Linear link | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/errors/app-errors-client.tsx:329 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/errors/app-errors-client.tsx:332 | error | Failed to create Linear issue | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/feedback-inbox/page.tsx:117 | error | dynamic | app | dynamic-message, duplicate-risk |
| frontend/src/app/(admin)/feedback-inbox/page.tsx:448 | error | Please select an image file. | app | duplicate-risk |
| frontend/src/app/(admin)/feedback-inbox/page.tsx:452 | error | Image must be under 10MB. | app | duplicate-risk |
| frontend/src/app/(admin)/feedback-inbox/page.tsx:757 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/feedback-inbox/page.tsx:2007 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/feedback-inbox/page.tsx:2033 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/project-attribution/project-attribution-review-client.tsx:137 | error | Failed to load attribution candidates | app | generic-error, load-error, duplicate-risk |
| frontend/src/app/(admin)/project-attribution/project-attribution-review-client.tsx:159 | error | Failed to load attribution rules | app | generic-error, load-error, duplicate-risk |
| frontend/src/app/(admin)/project-attribution/project-attribution-review-client.tsx:200 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/project-attribution/project-attribution-review-client.tsx:202 | error | Review action failed | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/project-attribution/project-attribution-review-client.tsx:218 | error | Project and pattern are required | app | duplicate-risk |
| frontend/src/app/(admin)/project-attribution/project-attribution-review-client.tsx:243 | error | Failed to save attribution rule | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/project-attribution/project-attribution-review-client.tsx:264 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/project-attribution/project-attribution-review-client.tsx:266 | error | Failed to update attribution rule | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/projects-table-demo/projects-table.tsx:132 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/projects-table-demo/projects-table.tsx:137 | error | dynamic | app | dynamic-message, generic-error, duplicate-risk |
| frontend/src/app/(admin)/task-training/TaskTrainingClient.tsx:81 | error | Failed to update promotion status | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/template/form-template/page.tsx:134 | error | dynamic | app | dynamic-message, duplicate-risk |
| frontend/src/app/(admin)/template/form-template/page.tsx:145 | error | dynamic | app | dynamic-message, duplicate-risk |
| frontend/src/app/(admin)/test-cases/test-cases-table-client.tsx:627 | error | dynamic | app | dynamic-message, duplicate-risk |
| frontend/src/app/(admin)/testing/[tool]/page.tsx:88 | error | Unable to start run. | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/testing/runs/[runId]/page.tsx:169 | error | Failed to update status. | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/testing/runs/[runId]/page.tsx:187 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/testing/runs/[runId]/page.tsx:190 | error | Failed to create GitHub issue. | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/testing/runs/[runId]/page.tsx:539 | error | dynamic | app | dynamic-message, duplicate-risk |
| frontend/src/app/(admin)/testing/runs/[runId]/page.tsx:568 | error | Screenshot upload failed. | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/user-management/page.tsx:449 | error | Failed to create template | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/user-management/page.tsx:476 | error | Failed to update template | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/user-management/page.tsx:502 | error | Failed to update permission | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/user-management/page.tsx:516 | error | Failed to delete template | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/user-management/page.tsx:541 | error | Failed to invite user | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/user-management/page.tsx:555 | error | Failed to delete user | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/user-management/page.tsx:572 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/user-management/page.tsx:577 | error | User auth links need manual review | app | duplicate-risk |
| frontend/src/app/(admin)/user-management/users/[personId]/page.tsx:71 | error | Failed to update project access | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/user-management/users/[personId]/page.tsx:88 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/user-management/users/[personId]/page.tsx:92 | error | Failed to update company access | app | generic-error, duplicate-risk |
| frontend/src/app/(admin)/user-management/users/[personId]/page.tsx:121 | success | dynamic | app | dynamic-message |
| frontend/src/app/(admin)/user-management/users/[personId]/page.tsx:125 | error | Failed to update permission exception | app | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/line-item/new/page.tsx:179 | error | Failed to load budget data | [projectId]/budget | generic-error, load-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/line-item/new/page.tsx:274 | error | dynamic | [projectId]/budget | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/line-item/new/page.tsx:394 | error | dynamic | [projectId]/budget | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:270 | error | Failed to load budget | [projectId]/budget | generic-error, load-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:306 | success | dynamic | [projectId]/budget | dynamic-message |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:322 | error | Budget is locked. Unlock to add new line items. | [projectId]/budget | duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:350 | error | Failed to lock budget | [projectId]/budget | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:382 | error | Failed to refresh data after unlock | [projectId]/budget | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:392 | error | Budget is locked. Unlock to import budget data. | [projectId]/budget | duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:400 | error | Budget is locked. Unlock to import budget data. | [projectId]/budget | duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:427 | error | dynamic | [projectId]/budget | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:440 | error | Invalid export format | [projectId]/budget | duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:445 | loading | dynamic | [projectId]/budget | dynamic-message |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:456 | loading | dynamic | [projectId]/budget | dynamic-message |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:492 | error | dynamic | [projectId]/budget | dynamic-message, generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:529 | error | Failed to load budget details | [projectId]/budget | generic-error, load-error |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:567 | error | Unable to toggle full page view | [projectId]/budget | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:636 | error | Failed to refresh budget | [projectId]/budget | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:691 | error | A budget code is required. Use the Budget Code field in the panel below to select one, or create a new budget code first. | [projectId]/budget | duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:747 | success | dynamic | [projectId]/budget | dynamic-message |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:793 | error | Budget is locked. Unlock to edit line items. | [projectId]/budget | duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:870 | error | Failed to save forecast | [projectId]/budget | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:884 | error | Budget is locked. Unlock to delete line items. | [projectId]/budget | duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:897 | error | Budget is locked. Unlock to delete line items. | [projectId]/budget | duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:902 | error | Cannot delete a line with an original budget | [projectId]/budget | duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:924 | error | Could not delete line item | [projectId]/budget | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:951 | success | dynamic | [projectId]/budget | dynamic-message |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:958 | error | dynamic | [projectId]/budget | dynamic-message, generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:964 | error | Failed to delete line items | [projectId]/budget | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:970 | error | Failed to delete line items | [projectId]/budget | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/page.tsx:998 | error | Failed to update budget | [projectId]/budget | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/setup/page.tsx:76 | error | Failed to load project cost codes | [projectId]/budget | generic-error, load-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/setup/page.tsx:128 | error | At least one line item is required | [projectId]/budget | duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/setup/page.tsx:195 | error | Please select a budget code for all line items | [projectId]/budget | duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/setup/page.tsx:207 | error | All selected budget codes must have a cost type | [projectId]/budget | duplicate-risk |
| frontend/src/app/(main)/[projectId]/budget/setup/page.tsx:235 | success | dynamic | [projectId]/budget | dynamic-message |
| frontend/src/app/(main)/[projectId]/budget/setup/page.tsx:238 | error | Failed to create budget lines | [projectId]/budget | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx:220 | error | Failed to create RFQ | [projectId]/change-events | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx:298 | error | Could not load existing PCOs | [projectId]/change-events | generic-error, load-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx:317 | success | dynamic | [projectId]/change-events | dynamic-message |
| frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx:320 | error | Failed to add to PCO | [projectId]/change-events | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx:420 | error | Failed to generate PDF | [projectId]/change-events | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx:656 | error | dynamic | [projectId]/change-events | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-events/new/page.tsx:174 | warning | dynamic | [projectId]/change-events | dynamic-message |
| frontend/src/app/(main)/[projectId]/change-events/new/page.tsx:198 | error | dynamic | [projectId]/change-events | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-events/page.tsx:239 | error | Failed to delete change event | [projectId]/change-events | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-events/page.tsx:256 | error | Failed to restore change event | [projectId]/change-events | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-events/page.tsx:290 | success | dynamic | [projectId]/change-events | dynamic-message |
| frontend/src/app/(main)/[projectId]/change-events/page.tsx:296 | error | dynamic | [projectId]/change-events | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-events/page.tsx:306 | error | Failed to bulk delete change events | [projectId]/change-events | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-events/page.tsx:349 | success | dynamic | [projectId]/change-events | dynamic-message |
| frontend/src/app/(main)/[projectId]/change-events/page.tsx:353 | error | Failed to send RFQ | [projectId]/change-events | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-events/page.tsx:496 | success | dynamic | [projectId]/change-events | dynamic-message |
| frontend/src/app/(main)/[projectId]/change-orders/change-orders-client.tsx:236 | error | Could not delete change order | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/change-orders-client.tsx:248 | error | Missing contract reference | [projectId]/change-orders | duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/change-orders-client.tsx:259 | error | Could not delete change order | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/change-orders-client.tsx:309 | success | dynamic | [projectId]/change-orders | dynamic-message |
| frontend/src/app/(main)/[projectId]/change-orders/change-orders-client.tsx:333 | success | dynamic | [projectId]/change-orders | dynamic-message |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx:326 | error | Failed to add line item | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx:351 | error | Failed to update line item | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx:372 | error | Failed to delete line item | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx:491 | error | Missing contract reference | [projectId]/change-orders | duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx:525 | error | Failed to update | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx:547 | error | Failed to delete | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx:561 | error | Failed to approve | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx:570 | error | Rejection reason is required | [projectId]/change-orders | duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx:586 | error | Failed to reject | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/new/page.tsx:403 | error | Could not load commitments. | [projectId]/change-orders | generic-error, load-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/new/page.tsx:445 | error | Could not load contacts | [projectId]/change-orders | generic-error, load-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/new/page.tsx:475 | error | Could not load change event details. | [projectId]/change-orders | generic-error, load-error |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/new/page.tsx:549 | error | Failed to create | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/page-actions.tsx:46 | error | Failed to export | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx:543 | error | Failed to save line item | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx:568 | error | Failed to delete line item | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx:742 | error | Failed to update | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx:765 | error | Failed to delete | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx:781 | error | Failed to approve | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx:790 | error | Rejection reason is required | [projectId]/change-orders | duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx:809 | error | Failed to reject | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/change-orders/prime/new/page.tsx:151 | error | Failed to create | [projectId]/change-orders | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitment-pcos/[pcoId]/page.tsx:105 | error | Failed to delete PCO | [projectId]/commitment-pcos | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitment-pcos/[pcoId]/page.tsx:119 | error | Failed to promote PCO | [projectId]/commitment-pcos | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitment-pcos/page.tsx:225 | error | Failed to delete PCO | [projectId]/commitment-pcos | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitment-pcos/page.tsx:243 | error | Failed to promote PCO | [projectId]/commitment-pcos | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitment-pcos/page.tsx:274 | success | dynamic | [projectId]/commitment-pcos | dynamic-message |
| frontend/src/app/(main)/[projectId]/commitment-pcos/page.tsx:280 | error | dynamic | [projectId]/commitment-pcos | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitment-pcos/page.tsx:290 | error | Failed to bulk delete PCOs | [projectId]/commitment-pcos | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitment-pcos/page.tsx:313 | success | dynamic | [projectId]/commitment-pcos | dynamic-message |
| frontend/src/app/(main)/[projectId]/commitment-pcos/page.tsx:317 | error | Failed to promote selected PCOs | [projectId]/commitment-pcos | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitment-pcos/page.tsx:377 | success | dynamic | [projectId]/commitment-pcos | dynamic-message |
| frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx:706 | error | Failed to delete commitment | [projectId]/commitments | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx:801 | info | Import coming soon | [projectId]/commitments | placeholder |
| frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/pcos/new/page.tsx:171 | error | Failed to load commitment details. | [projectId]/commitments | generic-error, load-error |
| frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/pcos/new/page.tsx:243 | error | Failed to create PCO | [projectId]/commitments | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitments/configure/page.tsx:225 | error | Failed to save configuration | [projectId]/commitments | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitments/page.tsx:406 | error | Failed to update status | [projectId]/commitments | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitments/page.tsx:422 | success | dynamic | [projectId]/commitments | dynamic-message |
| frontend/src/app/(main)/[projectId]/commitments/page.tsx:428 | error | Commitments sync failed | [projectId]/commitments | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitments/page.tsx:541 | success | dynamic | [projectId]/commitments | dynamic-message |
| frontend/src/app/(main)/[projectId]/commitments/page.tsx:545 | error | Could not restore commitment | [projectId]/commitments | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitments/page.tsx:563 | success | dynamic | [projectId]/commitments | dynamic-message |
| frontend/src/app/(main)/[projectId]/commitments/page.tsx:569 | error | Could not permanently delete commitment | [projectId]/commitments | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitments/page.tsx:631 | error | dynamic | [projectId]/commitments | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/commitments/page.tsx:635 | success | dynamic | [projectId]/commitments | dynamic-message |
| frontend/src/app/(main)/[projectId]/commitments/settings/page.tsx:111 | error | Failed to save settings | [projectId]/commitments | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/daily-log/daily-log-client.tsx:109 | error | Failed to delete daily log | [projectId]/daily-log | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/daily-log/new/page.tsx:48 | error | dynamic | [projectId]/daily-log | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/direct-costs/[costId]/page.tsx:127 | error | Failed to load direct cost details | [projectId]/direct-costs | generic-error, load-error |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:214 | success | dynamic | [projectId]/direct-costs | dynamic-message |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:220 | error | ERP sync failed | [projectId]/direct-costs | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:342 | error | Failed to delete direct cost | [projectId]/direct-costs | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:365 | error | dynamic | [projectId]/direct-costs | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:392 | success | dynamic | [projectId]/direct-costs | dynamic-message |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:396 | error | dynamic | [projectId]/direct-costs | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:425 | error | dynamic | [projectId]/direct-costs | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:430 | warning | dynamic | [projectId]/direct-costs | dynamic-message |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:434 | success | dynamic | [projectId]/direct-costs | dynamic-message |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:461 | error | dynamic | [projectId]/direct-costs | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:466 | warning | dynamic | [projectId]/direct-costs | dynamic-message |
| frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:468 | success | dynamic | [projectId]/direct-costs | dynamic-message |
| frontend/src/app/(main)/[projectId]/directory/page.tsx:411 | error | Failed to add member | [projectId]/directory | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/directory/page.tsx:633 | error | Failed to assign company | [projectId]/directory | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/directory/page.tsx:748 | error | Failed to delete role | [projectId]/directory | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/directory/page.tsx:823 | error | Failed to remove from role | [projectId]/directory | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/directory/page.tsx:1054 | error | Failed to assign template | [projectId]/directory | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/directory/page.tsx:1277 | error | Failed to remove member | [projectId]/directory | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/directory/page.tsx:1408 | success | dynamic | [projectId]/directory | dynamic-message |
| frontend/src/app/(main)/[projectId]/directory/page.tsx:1410 | error | Failed to remove vendor | [projectId]/directory | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/directory/page.tsx:1568 | error | Failed to update contact | [projectId]/directory | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/directory/page.tsx:1701 | error | dynamic | [projectId]/directory | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/documents/documents-client.tsx:211 | error | This document does not have a file attached | [projectId]/documents | duplicate-risk |
| frontend/src/app/(main)/[projectId]/documents/documents-client.tsx:269 | error | dynamic | [projectId]/documents | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/documents/documents-client.tsx:273 | success | dynamic | [projectId]/documents | dynamic-message |
| frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx:211 | error | Failed to update revision number | [projectId]/drawings | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx:420 | error | Failed to download drawing | [projectId]/drawings | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx:440 | error | Failed to download revision | [projectId]/drawings | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/drawings/areas/page.tsx:48 | error | Failed to create drawing area | [projectId]/drawings | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/drawings/areas/page.tsx:80 | error | Failed to delete drawing area | [projectId]/drawings | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/drawings/page.tsx:427 | info | dynamic | [projectId]/drawings | dynamic-message |
| frontend/src/app/(main)/[projectId]/drawings/page.tsx:444 | success | dynamic | [projectId]/drawings | dynamic-message |
| frontend/src/app/(main)/[projectId]/drawings/page.tsx:446 | error | Bulk download failed | [projectId]/drawings | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/drawings/page.tsx:486 | error | No downloadable file found for this drawing | [projectId]/drawings | duplicate-risk |
| frontend/src/app/(main)/[projectId]/drawings/page.tsx:499 | error | Failed to download drawing | [projectId]/drawings | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/drawings/page.tsx:516 | error | Drawing number and title are required | [projectId]/drawings | duplicate-risk |
| frontend/src/app/(main)/[projectId]/drawings/page.tsx:548 | error | Choose at least one field to update | [projectId]/drawings | duplicate-risk |
| frontend/src/app/(main)/[projectId]/drawings/page.tsx:560 | success | dynamic | [projectId]/drawings | dynamic-message |
| frontend/src/app/(main)/[projectId]/drawings/page.tsx:812 | info | Sketches report is not connected yet. | [projectId]/drawings | placeholder |
| frontend/src/app/(main)/[projectId]/drawings/page.tsx:822 | info | Measurements report is not connected yet. | [projectId]/drawings | placeholder |
| frontend/src/app/(main)/[projectId]/drawings/page.tsx:836 | info | Compare Set is not connected yet. | [projectId]/drawings | placeholder |
| frontend/src/app/(main)/[projectId]/drawings/sets/page.tsx:76 | error | Set name is required | [projectId]/drawings | duplicate-risk |
| frontend/src/app/(main)/[projectId]/drawings/viewer-v2/[drawingId]/page.tsx:300 | error | Failed to download drawing | [projectId]/drawings | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/drawings/viewer/[drawingId]/page.tsx:329 | error | Failed to download drawing | [projectId]/drawings | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/email-attachments/email-attachments-client.tsx:382 | error | Failed to update type | [projectId]/email-attachments | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/email-attachments/email-attachments-client.tsx:438 | error | Failed to update category | [projectId]/email-attachments | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/email-attachments/email-attachments-client.tsx:775 | error | dynamic | [projectId]/email-attachments | dynamic-message, generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/email-attachments/email-attachments-client.tsx:777 | success | dynamic | [projectId]/email-attachments | dynamic-message |
| frontend/src/app/(main)/[projectId]/emails/emails-client.tsx:318 | error | dynamic | [projectId]/emails | dynamic-message, generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/emails/emails-client.tsx:320 | success | dynamic | [projectId]/emails | dynamic-message |
| frontend/src/app/(main)/[projectId]/estimates/[estimateId]/edit/page.tsx:127 | error | Failed to update estimate | [projectId]/estimates | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/estimates/[estimateId]/estimate-detail-client-v2.tsx:112 | error | dynamic | [projectId]/estimates | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/estimates/[estimateId]/estimate-detail-client-v2.tsx:797 | success | dynamic | [projectId]/estimates | dynamic-message |
| frontend/src/app/(main)/[projectId]/estimates/[estimateId]/estimate-detail-client-v2.tsx:846 | success | dynamic | [projectId]/estimates | dynamic-message |
| frontend/src/app/(main)/[projectId]/estimates/[estimateId]/estimate-detail-client-v2.tsx:2933 | success | dynamic | [projectId]/estimates | dynamic-message |
| frontend/src/app/(main)/[projectId]/estimates/estimates-client.tsx:130 | error | Failed to create estimate | [projectId]/estimates | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/estimates/estimates-client.tsx:145 | error | Failed to delete estimate | [projectId]/estimates | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/estimates/estimates-client.tsx:163 | success | dynamic | [projectId]/estimates | dynamic-message |
| frontend/src/app/(main)/[projectId]/estimates/estimates-client.tsx:167 | error | Failed to delete selected estimates | [projectId]/estimates | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:824 | error | dynamic | [projectId]/home | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/home/project-home-client.tsx:356 | success | dynamic | [projectId]/home | dynamic-message |
| frontend/src/app/(main)/[projectId]/home/project-home-client.tsx:358 | error | Failed to add person | [projectId]/home | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/home/project-home-client.tsx:526 | error | Failed to assign role | [projectId]/home | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/home/project-home-client.tsx:544 | error | Failed to unassign role | [projectId]/home | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/home/project-home-client.tsx:855 | error | Failed to refresh project details | [projectId]/home | generic-error |
| frontend/src/app/(main)/[projectId]/invoices/new/page.tsx:266 | error | An invoice must have at least one line item. | [projectId]/invoices | duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoices/new/page.tsx:303 | error | dynamic | [projectId]/invoices | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoices/new/page.tsx:310 | error | Select a contract before creating the invoice. | [projectId]/invoices | duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoices/new/page.tsx:315 | error | Invoice number is required. | [projectId]/invoices | duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoices/new/page.tsx:320 | error | Billing period is required. | [projectId]/invoices | duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoices/new/page.tsx:424 | error | dynamic | [projectId]/invoices | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoices/page.tsx:850 | info | dynamic | [projectId]/invoices | dynamic-message |
| frontend/src/app/(main)/[projectId]/invoices/page.tsx:905 | info | dynamic | [projectId]/invoices | dynamic-message |
| frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx:495 | error | Failed to add line item | [projectId]/invoicing | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx:647 | error | Failed to update invoice | [projectId]/invoicing | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx:822 | error | Failed to save changes | [projectId]/invoicing | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx:872 | error | Failed to submit invoice | [projectId]/invoicing | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx:888 | error | Failed to request revision | [projectId]/invoicing | generic-error |
| frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx:906 | error | Failed to approve invoice | [projectId]/invoicing | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx:922 | error | Failed to approve invoice as noted | [projectId]/invoicing | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx:944 | error | Failed to void invoice | [projectId]/invoicing | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx:965 | error | Failed to delete invoice | [projectId]/invoicing | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx:1003 | error | At least one recipient is required | [projectId]/invoicing | duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx:168 | error | Failed to load commitments | [projectId]/invoicing | generic-error, load-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx:283 | error | Failed to load commitment data | [projectId]/invoicing | generic-error, load-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx:335 | error | No commitment selected | [projectId]/invoicing | duplicate-risk |
| frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx:416 | success | dynamic | [projectId]/invoicing | dynamic-message |
| frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx:423 | error | Failed to save invoice | [projectId]/invoicing | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/meetings/formatted-transcript.tsx:221 | error | Unable to save highlight note | [projectId]/meetings | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/meetings/formatted-transcript.tsx:228 | error | Unable to save highlight note | [projectId]/meetings | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/meetings/formatted-transcript.tsx:235 | error | No highlighted text selected. | [projectId]/meetings | duplicate-risk |
| frontend/src/app/(main)/[projectId]/meetings/formatted-transcript.tsx:262 | error | dynamic | [projectId]/meetings | dynamic-message, duplicate-risk |
| frontend/src/app/(main)/[projectId]/pcos/[pcoId]/edit/page.tsx:178 | error | Please enter a title for the PCO. | [projectId]/pcos | duplicate-risk |
| frontend/src/app/(main)/[projectId]/pcos/[pcoId]/page.tsx:83 | success | dynamic | [projectId]/pcos | dynamic-message |
| frontend/src/app/(main)/[projectId]/pcos/[pcoId]/page.tsx:91 | warning | dynamic | [projectId]/pcos | dynamic-message |
| frontend/src/app/(main)/[projectId]/pcos/[pcoId]/page.tsx:99 | error | Failed to convert PCO | [projectId]/pcos | generic-error, duplicate-risk |
| frontend/src/app/(main)/[projectId]/pcos/new/page.tsx:144 | error | Please enter a title for the PCO. | [projectId]/pcos | duplicate-risk |
| frontend/src/app/(main)/[projectId]/pcos/new/page.tsx:168 | error | Please enter a title for the PCO. | [projectId]/pcos | duplicate-risk |
| frontend/src/app/(main)/[projectId]/pcos/new/page.tsx:172 | error | Add at least one change event to the PCO. | [projectId]/pcos | duplicate-risk |
| frontend/src/app/(main)/[projectId]/pcos/new/page.tsx:176 | error | Add at least one line item to the PCO. | [projectId]/pcos | duplicate-risk |
| frontend/src/app/(main)/[projectId]/prime-contract-pcos/[pcoId]/edit/page.tsx:168 | error | Failed to load prime contract PCO | [projectId]/prime-contract-pcos | generic-error, load-error, duplicate-risk |

## Direct Sonner Imports

| File |
| --- |
| frontend/src/app/(admin)/(procore)/crawled-pages/page.tsx |
| frontend/src/app/(admin)/(procore)/support-articles/support-articles-client.tsx |
| frontend/src/app/(admin)/admin/company-info/page.tsx |
| frontend/src/app/(admin)/ai-learning-promotions/promotions-client.tsx |
| frontend/src/app/(admin)/database-inventory/page.tsx |
| frontend/src/app/(admin)/design-ideas/_sections/feedback.tsx |
| frontend/src/app/(admin)/dev/table-generator/page.tsx |
| frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx |
| frontend/src/app/(admin)/errors/app-errors-client.tsx |
| frontend/src/app/(admin)/project-attribution/project-attribution-review-client.tsx |
| frontend/src/app/(admin)/projects-table-demo/projects-table.tsx |
| frontend/src/app/(admin)/task-training/TaskTrainingClient.tsx |
| frontend/src/app/(admin)/template/form-template/page.tsx |
| frontend/src/app/(admin)/test-cases/test-cases-table-client.tsx |
| frontend/src/app/(admin)/testing/[tool]/page.tsx |
| frontend/src/app/(admin)/testing/runs/[runId]/page.tsx |
| frontend/src/app/(admin)/user-management/users/[personId]/page.tsx |
| frontend/src/app/(main)/[projectId]/budget/line-item/new/page.tsx |
| frontend/src/app/(main)/[projectId]/budget/setup/page.tsx |
| frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx |
| frontend/src/app/(main)/[projectId]/change-events/new/page.tsx |
| frontend/src/app/(main)/[projectId]/change-events/page.tsx |
| frontend/src/app/(main)/[projectId]/change-orders/change-orders-client.tsx |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx |
| frontend/src/app/(main)/[projectId]/change-orders/commitment/new/page.tsx |
| frontend/src/app/(main)/[projectId]/change-orders/page-actions.tsx |
| frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx |
| frontend/src/app/(main)/[projectId]/change-orders/prime/new/page.tsx |
| frontend/src/app/(main)/[projectId]/commitment-pcos/[pcoId]/page.tsx |
| frontend/src/app/(main)/[projectId]/commitment-pcos/page.tsx |
| frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/edit/page.tsx |
| frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx |
| frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/pcos/new/page.tsx |
| frontend/src/app/(main)/[projectId]/commitments/configure/page.tsx |
| frontend/src/app/(main)/[projectId]/commitments/page.tsx |
| frontend/src/app/(main)/[projectId]/commitments/settings/page.tsx |
| frontend/src/app/(main)/[projectId]/daily-log/daily-log-client.tsx |
| frontend/src/app/(main)/[projectId]/daily-log/new/page.tsx |
| frontend/src/app/(main)/[projectId]/direct-costs/[costId]/page.tsx |
| frontend/src/app/(main)/[projectId]/documents/documents-client.tsx |
| frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx |
| frontend/src/app/(main)/[projectId]/drawings/areas/page.tsx |
| frontend/src/app/(main)/[projectId]/drawings/page.tsx |
| frontend/src/app/(main)/[projectId]/drawings/sets/page.tsx |
| frontend/src/app/(main)/[projectId]/drawings/viewer-v2/[drawingId]/page.tsx |
| frontend/src/app/(main)/[projectId]/drawings/viewer/[drawingId]/page.tsx |
| frontend/src/app/(main)/[projectId]/email-attachments/email-attachments-client.tsx |
| frontend/src/app/(main)/[projectId]/emails/emails-client.tsx |
| frontend/src/app/(main)/[projectId]/estimates/[estimateId]/edit/page.tsx |
| frontend/src/app/(main)/[projectId]/estimates/estimates-client.tsx |
| frontend/src/app/(main)/[projectId]/home/project-command-center.tsx |
| frontend/src/app/(main)/[projectId]/home/project-home-client.tsx |
| frontend/src/app/(main)/[projectId]/invoices/new/page.tsx |
| frontend/src/app/(main)/[projectId]/invoices/page.tsx |
| frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx |
| frontend/src/app/(main)/[projectId]/meetings/formatted-transcript.tsx |
| frontend/src/app/(main)/[projectId]/pcos/[pcoId]/edit/page.tsx |
| frontend/src/app/(main)/[projectId]/pcos/[pcoId]/page.tsx |
| frontend/src/app/(main)/[projectId]/pcos/new/page.tsx |
| frontend/src/app/(main)/[projectId]/prime-contract-pcos/[pcoId]/edit/page.tsx |
| frontend/src/app/(main)/[projectId]/prime-contract-pcos/[pcoId]/page.tsx |
| frontend/src/app/(main)/[projectId]/prime-contract-pcos/new/page.tsx |
| frontend/src/app/(main)/[projectId]/prime-contract-pcos/page.tsx |
| frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/components/PrimeContractEstimateImportModal.tsx |
| frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/invoices/[invoiceId]/page.tsx |
| frontend/src/app/(main)/[projectId]/prime-contracts/configure/page.tsx |
| frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx |
| frontend/src/app/(main)/[projectId]/progress-reports/[reportId]/progress-report-editor.tsx |
| frontend/src/app/(main)/[projectId]/punch-list/punch-list-client.tsx |
| frontend/src/app/(main)/[projectId]/rfis/[rfiId]/rfi-header-actions.tsx |
| frontend/src/app/(main)/[projectId]/rfis/rfis-client.tsx |
| frontend/src/app/(main)/[projectId]/rfis/rfis-table.tsx |
| frontend/src/app/(main)/[projectId]/sov/page.tsx |
| frontend/src/app/(main)/[projectId]/specifications/[sectionId]/page.tsx |
| frontend/src/app/(main)/[projectId]/specifications/page.tsx |
| frontend/src/app/(main)/[projectId]/submittals/page.tsx |
| frontend/src/app/(main)/create-project/page.tsx |
| frontend/src/app/(main)/directory/companies/page.tsx |
| frontend/src/app/(main)/directory/contacts/page.tsx |
| frontend/src/app/(main)/directory/employees/page.tsx |
| frontend/src/app/(main)/directory/prospects/page.tsx |
| frontend/src/app/(main)/directory/vendors/page.tsx |
| frontend/src/app/(main)/estimates/[type]/estimates-type-client.tsx |
| frontend/src/app/(main)/financial-insights/page.tsx |
| frontend/src/app/(main)/page.tsx |
| frontend/src/app/(main)/pipeline/page.tsx |
| frontend/src/app/(tables)/documents/page.tsx |
| frontend/src/app/(tables)/estimates/estimates-client.tsx |
| frontend/src/app/(tables)/outlook-intake/outlook-intake-client.tsx |
| frontend/src/app/(tables)/prime-contracts/prime-contracts-client.tsx |
| frontend/src/app/(tables)/progress-reports/page.tsx |
| frontend/src/app/(tables)/project-documents/page.tsx |
| frontend/src/artifacts/code/client.tsx |
| frontend/src/artifacts/image/client.tsx |
| frontend/src/artifacts/sheet/client.tsx |
| frontend/src/artifacts/text/client.tsx |
| frontend/src/components/admin-feedback/AdminFeedbackWidget.tsx |
| frontend/src/components/admin/table-explorer/AutoForm.tsx |
| frontend/src/components/admin/table-explorer/DeleteConfirmation.tsx |
| frontend/src/components/admin/table-explorer/RowActions.tsx |
| frontend/src/components/ai-assistant/assistant-widget-renderer.tsx |
| frontend/src/components/ai-chat/artifact-actions.tsx |
| frontend/src/components/ai-chat/document.tsx |
| frontend/src/components/ai-chat/message-actions.tsx |
| frontend/src/components/ai-chat/multimodal-input.tsx |
| frontend/src/components/ai-chat/sidebar-history.tsx |
| frontend/src/components/ai-chat/toast.tsx |
| frontend/src/components/ai-elements/prompt-input.tsx |
| frontend/src/components/ai-intelligence/insight-card-showcase.tsx |
| frontend/src/components/ai-intelligence/project-intelligence-cross-reference.tsx |
| frontend/src/components/ai/TaskFeedbackButtons.tsx |
| frontend/src/components/ask-alleato/tabs/FeedbackTab.tsx |
| frontend/src/components/budget/BudgetViewsManager.tsx |
| frontend/src/components/budget/BudgetViewsModal.tsx |
| frontend/src/components/budget/ImportBudgetModal.tsx |
| frontend/src/components/budget/ImportFromContractModal.tsx |
| frontend/src/components/budget/InlineBudgetLineItemCreator.tsx |
| frontend/src/components/budget/budget-line-item-form.tsx |
| frontend/src/components/budget/budget-modification-modal.tsx |
| frontend/src/components/budget/budget-settings-panel.tsx |
| frontend/src/components/budget/budget-table.tsx |
| frontend/src/components/budget/change-history-tab.tsx |
| frontend/src/components/budget/cost-codes-tab.tsx |
| frontend/src/components/budget/forecasting-tab.tsx |
| frontend/src/components/budget/modals/BudgetModificationsModal.tsx |
| frontend/src/components/budget/snapshots-tab.tsx |
| frontend/src/components/budget/unlock-budget-dialog.tsx |
| frontend/src/components/commitments/EmailCommitmentDialog.tsx |
| frontend/src/components/commitments/ExportCommitmentDialog.tsx |
| frontend/src/components/commitments/ExportDialog.tsx |
| frontend/src/components/commitments/tabs/AdvancedSettingsTab.tsx |
| frontend/src/components/commitments/tabs/ChangeManagementTab.tsx |
| frontend/src/components/commitments/tabs/ChangeOrdersTab.tsx |
| frontend/src/components/commitments/tabs/InvoicesTab.tsx |
| frontend/src/components/commitments/tabs/PotentialChangeOrdersTab.tsx |
| frontend/src/components/commitments/tabs/RelatedItemsTab.tsx |
| frontend/src/components/commitments/tabs/ScheduleOfValuesTab.tsx |
| frontend/src/components/commitments/tabs/SubcontractorSovTab.tsx |
| frontend/src/components/dev-tools/enhanced-dev-panel.tsx |
| frontend/src/components/dev-tools/test-runs-tab.tsx |
| frontend/src/components/direct-costs/CreateDirectCostForm.tsx |
| frontend/src/components/direct-costs/DirectCostsImportDialog.tsx |
| frontend/src/components/direct-costs/ExportDialog.tsx |
| frontend/src/components/directory/CompanyEditDialog.tsx |
| frontend/src/components/directory/DistributionGroupDialog.tsx |
| frontend/src/components/directory/PermissionTemplateDialog.tsx |
| frontend/src/components/documents/DocumentDeliveryDialog.tsx |
| frontend/src/components/domain/change-events/AddToBudgetChangeDialog.tsx |
| frontend/src/components/domain/change-events/AddToCommitmentCODialog.tsx |
| frontend/src/components/domain/change-events/AddToPrimePCODialog.tsx |
| frontend/src/components/domain/change-events/ChangeEventApprovalWorkflow.tsx |
| frontend/src/components/domain/change-events/ChangeEventAttachmentsSection.tsx |
| frontend/src/components/domain/change-events/ChangeEventConvertDialog.tsx |
| frontend/src/components/domain/change-events/ChangeEventEmailDialog.tsx |
| frontend/src/components/domain/change-events/ChangeEventLineItemsTable.tsx |
| frontend/src/components/domain/change-events/ChangeEventRelatedItemsTab.tsx |
| frontend/src/components/domain/change-events/ChangeEventRfqsTab.tsx |
| frontend/src/components/domain/change-events/change-event-form/AddCompanyModal.tsx |
| frontend/src/components/domain/change-events/change-event-form/useChangeEventFormData.ts |
| frontend/src/components/domain/clients/ClientFormDialog.tsx |
| frontend/src/components/domain/companies/CompanyFormDialog.tsx |
| frontend/src/components/domain/contacts/ContactFormSheet.tsx |
| frontend/src/components/domain/contracts/CreatePrimeContractFromEstimateModal.tsx |
| frontend/src/components/domain/contracts/CreatePurchaseOrderForm.tsx |
| frontend/src/components/domain/contracts/ImportFromBudgetModal.tsx |
| frontend/src/components/domain/contracts/SyncFromEstimateModal.tsx |
| frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractAdvancedSettingsTab.tsx |
| frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractChangeOrdersTab.tsx |
| frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractCommitmentsTab.tsx |
| frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractFinancialMarkupTab.tsx |
| frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractPaymentsTab.tsx |
| frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractPcosSection.tsx |
| frontend/src/components/domain/contracts/prime-contract-detail/useSovEditing.ts |
| frontend/src/components/domain/contracts/prime-contract-form/financial-markup-form-section.tsx |
| frontend/src/components/domain/contracts/prime-contract-form/sov.tsx |
| frontend/src/components/domain/contracts/prime-contract-form/usePrimeContractFormState.ts |
| frontend/src/components/domain/contracts/subcontract-form/CreateBudgetCodeModal.tsx |
| frontend/src/components/domain/directory/AssignMemberDialog.tsx |
| frontend/src/components/domain/distribution-groups/DistributionGroupFormDialog.tsx |
| frontend/src/components/domain/estimates/SeedBudgetFromEstimateModal.tsx |
| frontend/src/components/domain/invoices/InvoiceAttachments.tsx |
| frontend/src/components/domain/related-items/RelatedItemsPanel.tsx |
| frontend/src/components/domain/users/UserFormDialog.tsx |
| frontend/src/components/drawings/DrawingAreaCard.tsx |
| frontend/src/components/drawings/DrawingDistributeDialog.tsx |
| frontend/src/components/drawings/DrawingLogTable.tsx |
| frontend/src/components/drawings/DrawingUploadDialog.tsx |
| frontend/src/components/ds/document-picker.tsx |
| frontend/src/components/executive/executive-briefing-refresh-button.tsx |
| frontend/src/components/header/header-user-menu.tsx |
| frontend/src/components/header/procore-reference-panel.tsx |
| frontend/src/components/invoicing/subcontractor-detail-tabs/DetailTab.tsx |
| frontend/src/components/invoicing/subcontractor-detail-tabs/GeneralTab.tsx |
| frontend/src/components/invoicing/subcontractor-detail-tabs/RelatedItemsTab.tsx |
| frontend/src/components/invoicing/subcontractor-detail-tabs/SummaryTab.tsx |
| frontend/src/components/issue-tracker/components/RoomErrors.tsx |
| frontend/src/components/meetings/edit-meeting-modal.tsx |
| frontend/src/components/meetings/meeting-detail-content.tsx |
| frontend/src/components/misc/data-table.tsx |
| frontend/src/components/misc/login-form.tsx |
| frontend/src/components/misc/login-page-v2.tsx |
| frontend/src/components/misc/login-page-v3.tsx |
| frontend/src/components/misc/profile-image-upload.tsx |
| frontend/src/components/misc/sign-up-form.tsx |
| frontend/src/components/portfolio/edit-project-dialog.tsx |
| frontend/src/components/project/edit-project-sidebar.tsx |
| frontend/src/components/scheduling/import-export-modal.tsx |
| frontend/src/components/specifications/SpecificationListTable.tsx |
| frontend/src/components/tables/employees-data-table.tsx |
| frontend/src/components/tables/generic-editable-table.tsx |
| frontend/src/components/tables/generic-table-factory.tsx |
| frontend/src/components/templates/StandardFormPage.tsx |
| frontend/src/features/database-inventory/db-inventory-detail-panel.tsx |
| frontend/src/features/documents/documents-table-config.tsx |
| frontend/src/features/knowledge/knowledge-base-page.tsx |
| frontend/src/features/knowledge/knowledge-upload-dialog.tsx |
| frontend/src/features/meetings/use-meetings-table.tsx |
| frontend/src/features/rfis/rfis-columns.tsx |
| frontend/src/hooks/use-all-companies.ts |
| frontend/src/hooks/use-billing-periods.ts |
| frontend/src/hooks/use-budget-data.ts |
| frontend/src/hooks/use-change-event-detail.ts |
| frontend/src/hooks/use-commitments-query.ts |
| frontend/src/hooks/use-company-knowledge.ts |
| frontend/src/hooks/use-create-prime-contract.ts |
| frontend/src/hooks/use-distribution-groups.ts |
| frontend/src/hooks/use-documents.ts |
| frontend/src/hooks/use-drawing-areas.ts |
| frontend/src/hooks/use-drawing-pins.ts |
| frontend/src/hooks/use-drawing-revisions.ts |
| frontend/src/hooks/use-drawing-sets.ts |
| frontend/src/hooks/use-emails.ts |
| frontend/src/hooks/use-estimates.ts |
| frontend/src/hooks/use-initiative-cards.ts |
| frontend/src/hooks/use-invoice-payments.ts |
| frontend/src/hooks/use-invoicing-settings.ts |
| frontend/src/hooks/use-invoicing.ts |
| frontend/src/hooks/use-knowledge-documents.ts |
| frontend/src/hooks/use-meeting-prep.ts |
| frontend/src/hooks/use-meetings.ts |
| frontend/src/hooks/use-payment-applications.ts |
| frontend/src/hooks/use-photo-albums.ts |
| frontend/src/hooks/use-photos.ts |
| frontend/src/hooks/use-prime-contracts.ts |
| frontend/src/hooks/use-progress-reports.ts |
| frontend/src/hooks/use-project-companies.ts |
| frontend/src/hooks/use-project-cost-codes.ts |
| frontend/src/hooks/use-punch-items.ts |
| frontend/src/hooks/use-rag-conversations.ts |
| frontend/src/hooks/use-rfis.ts |
| frontend/src/hooks/use-specification-areas.ts |
| frontend/src/hooks/use-specification-revisions.ts |
| frontend/src/hooks/use-specifications.ts |
| frontend/src/hooks/use-subcontractor-invoices.ts |
| frontend/src/hooks/use-toast.ts |
| frontend/src/hooks/use-transmittals.ts |
| frontend/src/hooks/use-user-mutations.ts |
| frontend/src/hooks/use-user-permissions.ts |
| frontend/src/lib/handle-form-error.ts |
