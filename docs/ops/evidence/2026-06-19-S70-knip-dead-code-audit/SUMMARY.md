# S70 Knip Dead-Code Audit Summary

Generated: 2026-07-09T04:15:45.651Z

## Purpose

This is a deletion-planning report, not a delete list. It exists because the
older orphan-audit scripts can over-flag barrel exports, dynamic imports,
framework entrypoints, and design-system inventory.

## Issue Counts

| Issue type | Count |
| --- | ---: |
| binaries | 4 |
| dependencies | 58 |
| devDependencies | 21 |
| duplicates | 4 |
| exports | 1110 |
| types | 732 |
| unlisted | 11 |
| unresolved | 1 |

## Higher-Confidence Unused File Candidates

These files are outside the highest-risk dynamic/framework/design-system surfaces.
They still require owner verification before deletion.

- None in this bucket.

## Needs Verification Before Any Deletion

These files are in areas where Knip can still be right, but false positives are
more likely because of dynamic routing, public exports, tests, or broad app surfaces.

- None in this bucket.

## Known False-Positive Risk Buckets

These are not deletion candidates without manual proof. They often include
barrel exports, generated types, app-router files, tests, Storybook, or
design-system inventory.

- `src/app/(admin)/admin/admin-dashboard-data.ts` - AdminMenuGroup (types)
- `src/app/(admin)/docs/ai-overview/_components/section-nav.tsx` - SECTION_NAV_ITEMS (exports)
- `src/app/(admin)/docs/ai-overview/_components/section-nav.tsx` - SectionNavItem (types)
- `src/app/(admin)/docs/ai-overview/_lib/ai-stats.ts` - AgentStatus (types)
- `src/app/(admin)/feedback-inbox/constants.ts` - LIST_SECTION_ORDER (exports)
- `src/app/(admin)/feedback-inbox/helpers.ts` - agentLabel (exports)
- `src/app/(admin)/feedback-inbox/helpers.ts` - getDispatchHistory (exports)
- `src/app/(admin)/feedback-inbox/helpers.ts` - getDispatchTrigger (exports)
- `src/app/(admin)/feedback-inbox/helpers.ts` - getMetadata (exports)
- `src/app/(admin)/feedback-inbox/types.ts` - FeedbackListSection (types)
- `src/app/(admin)/feedback-inbox/types.ts` - FeedbackResourceKind (types)
- `src/app/(admin)/site-map/site-map-client.tsx` - InventoryCategory (types)
- `src/app/(admin)/site-map/site-map-client.tsx` - InventoryLayout (types)
- `src/app/(admin)/site-map/site-map-client.tsx` - InventoryStatus (types)
- `src/app/(admin)/site-map/site-map-client.tsx` - InventoryType (types)
- `src/app/(admin)/user-management/_lib/user-access-data.ts` - fetchAllTemplates (exports)
- `src/app/(admin)/user-management/permission-template-config.ts` - PermissionTemplateCapabilityTool (types)
- `src/app/(main)/[projectId]/budget/setup/components/BudgetLineItemRow.tsx` - BudgetLineItemRow (exports)
- `src/app/(main)/[projectId]/budget/setup/components/index.ts` - BudgetLineItemRow (exports)
- `src/app/(main)/[projectId]/budget/setup/components/index.ts` - DivisionItem (types)
- `src/app/(main)/[projectId]/budget/setup/components/index.ts` - DivisionTree (exports)
- `src/app/(main)/[projectId]/budget/setup/components/index.ts` - DivisionTreeProps (types)
- `src/app/(main)/[projectId]/budget/setup/components/index.ts` - toggleDivisionInSet (exports)
- `src/app/(main)/[projectId]/direct-costs/direct-costs-table-utils.ts` - csvCell (exports)
- `src/app/(main)/[projectId]/email-attachments/email-attachments-client.tsx` - ATTACHMENT_CATEGORIES (exports)
- `src/app/(main)/[projectId]/email-attachments/email-attachments-client.tsx` - ATTACHMENT_TYPES (exports)
- `src/app/(main)/[projectId]/emails/emails-client.helpers.ts` - MAILBOX_REVIEW_REFETCH_INTERVAL_MS (exports)
- `src/app/(main)/[projectId]/estimates/estimates-table-utils.ts` - formatCurrency (exports)
- `src/app/(main)/[projectId]/home/project-command-center.tsx` - ProjectCommandCenter (exports)
- `src/app/(main)/[projectId]/prime-contracts/[contractId]/types.ts` - ContractAttachment (types)
- `src/app/(main)/[projectId]/prime-contracts/[contractId]/types.ts` - InvoiceFormState (types)
- `src/app/(main)/[projectId]/prime-contracts/[contractId]/types.ts` - MarkupCalculationResponse (types)
- `src/app/(main)/[projectId]/prime-contracts/[contractId]/types.ts` - MarkupCalculationResult (types)
- `src/app/(main)/[projectId]/prime-contracts/[contractId]/types.ts` - PaymentFormState (types)
- `src/app/(main)/actions/daily-log-actions.ts` - createDailyLog (exports)
- `src/app/(main)/actions/daily-log-actions.ts` - createDailyLogEquipment (exports)
- `src/app/(main)/actions/daily-log-actions.ts` - createDailyLogManpower (exports)
- `src/app/(main)/actions/daily-log-actions.ts` - createDailyLogNote (exports)
- `src/app/(main)/actions/executive-briefing-actions.ts` - approveExecutiveBriefingAction (exports)
- `src/app/(main)/actions/executive-briefing-actions.ts` - createOperationalImprovementAction (exports)
- `src/app/(main)/actions/executive-briefing-actions.ts` - reopenExecutiveFollowUpAction (exports)
- `src/app/(main)/actions/project-directory-actions.ts` - getProjectDirectory (exports)
- `src/app/(main)/actions/table-actions.ts` - createClient (exports)
- `src/app/(main)/actions/table-actions.ts` - createCompany (exports)
- `src/app/(main)/actions/table-actions.ts` - deleteClient (exports)
- `src/app/(main)/actions/table-actions.ts` - deleteCompany (exports)
- `src/app/(main)/actions/table-actions.ts` - deleteContact (exports)
- `src/app/(main)/actions/table-actions.ts` - deleteMeeting (exports)
- `src/app/(main)/actions/table-actions.ts` - deleteProject (exports)
- `src/app/(main)/actions/table-actions.ts` - deleteTableRow (exports)
- `src/app/(main)/actions/table-actions.ts` - updateClient (exports)
- `src/app/(main)/actions/table-actions.ts` - updateCompany (exports)
- `src/app/(main)/actions/table-actions.ts` - updateMeeting (exports)
- `src/app/(main)/actions/table-actions.ts` - updateProject (exports)
- `src/app/(main)/actions/table-actions.ts` - updateTableRow (exports)
- `src/app/(main)/actions/table-actions.types.ts` - ActionResponse (types)
- `src/app/(main)/actions/table-actions.types.ts` - TableInsert (types)
- `src/app/(main)/actions/table-actions.types.ts` - TableRow (types)
- `src/app/(main)/comments/comments-page-utils.ts` - matchesSearch (exports)
- `src/app/(public)/fm-global/form/actions.ts` - selectFmGlobalConfiguration (exports)
- `src/app/(public)/fm-global/form/fm-global-form.tsx` - kFactorOptions (exports)
- `src/app/(tables)/prime-contracts/prime-contracts-client.tsx` - PrimeContractWithProject (types)
- `src/app/api/admin/source-sync/_contracts.ts` - LifecycleDocumentSchema (exports)
- `src/app/api/admin/source-sync/_contracts.ts` - RagLifecycleNotificationSchema (exports)
- `src/app/api/admin/source-sync/_contracts.ts` - RagLifecycleSourceSchema (exports)
- `src/app/api/admin/source-sync/_contracts.ts` - RagLifecycleStageSchema (exports)
- `src/app/api/admin/source-sync/_contracts.ts` - RagLifecycleStatusSchema (exports)
- `src/app/api/admin/source-sync/_contracts.ts` - SourceHealthSchema (exports)
- `src/app/api/admin/source-sync/_contracts.ts` - SourceSyncAlertSchema (exports)
- `src/app/api/admin/source-sync/_contracts.ts` - SourceSyncRunSchema (exports)
- `src/app/api/admin/source-sync/_contracts.ts` - SourceSyncStuckItemSchema (exports)
- `src/app/api/admin/source-sync/_lifecycle.ts` - coverageStatus (exports)
- `src/app/api/admin/source-sync/_lifecycle.ts` - INTENTIONAL_SKIP_ERROR_CODES (exports)
- `src/app/api/admin/source-sync/_lifecycle.ts` - isTransientSupabaseReadError (exports)
- `src/app/api/admin/source-sync/_lifecycle.ts` - STAGE_LABELS (exports)
- `src/app/api/admin/source-sync/_shared.ts` - getBackendSourceSyncUrl (exports)
- `src/app/api/ai-assistant/chat/chat-history-writer.ts` - ChatRole (types)
- `src/app/api/projects/[projectId]/change-events/validation.ts` - ApprovalStatus (exports)
- `src/app/api/projects/[projectId]/change-events/validation.ts` - changeEventApprovalSchema (exports)
- `src/app/api/projects/[projectId]/change-events/validation.ts` - ChangeEventOrigin (exports)
- `src/app/api/projects/[projectId]/change-events/validation.ts` - ChangeEventReason (exports)
- `src/app/api/projects/[projectId]/change-events/validation.ts` - ChangeEventScope (exports)
- `src/app/api/projects/[projectId]/change-events/validation.ts` - ChangeEventStatus (exports)
- `src/app/api/projects/[projectId]/change-events/validation.ts` - ChangeEventType (exports)
- `src/app/api/projects/[projectId]/change-events/validation.ts` - createAttachmentSchema (exports)
- `src/app/api/projects/[projectId]/change-events/validation.ts` - LineItemRevenueSource (exports)
- `src/app/api/projects/[projectId]/change-events/validation.ts` - LineItemRevenueSourceUpdate (exports)
- `src/app/api/projects/[projectId]/change-events/validation.ts` - updateApprovalSchema (exports)
- `src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/validation.ts` - ApproveChangeOrderInput (types)
- `src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/validation.ts` - approveChangeOrderSchema (exports)
- `src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/validation.ts` - CreateChangeOrderInput (types)
- `src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/validation.ts` - CreateLineItemInput (types)
- `src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/validation.ts` - createLineItemSchema (exports)
- `src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/validation.ts` - RejectChangeOrderInput (types)
- `src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/validation.ts` - UpdateChangeOrderInput (types)
- `src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/validation.ts` - UpdateLineItemInput (types)
- `src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/validation.ts` - updateLineItemSchema (exports)
- `src/app/api/projects/[projectId]/contracts/[contractId]/line-items/validation.ts` - CreateLineItemInput (types)
- `src/app/api/projects/[projectId]/contracts/[contractId]/line-items/validation.ts` - UpdateLineItemInput (types)
- `src/app/api/projects/[projectId]/contracts/validation.ts` - contractStatusSchema (exports)
- `src/app/api/types.ts` - APIError (types)
- `src/app/api/types.ts` - ChangeOrder (types)
- `src/app/api/types.ts` - CommitmentLineItem (types)
- `src/app/api/types.ts` - DatabaseColumn (types)
- `src/app/api/types.ts` - DatabaseQueryResponse (types)
- `src/app/api/types.ts` - DatabaseTable (types)
- `src/app/api/types.ts` - ErrorResponse (types)
- `src/app/api/types.ts` - Invoice (types)
- `src/app/api/types.ts` - User (types)
- `src/app/daily-brief/build-brief.ts` - BriefCalendarEvent (types)
- `src/components/ds/attachment-upload-panel.tsx` - AttachmentListItem (exports)
- `src/components/ds/context-menu-pattern.tsx` - ContextAction (types)
- `src/components/ds/context-menu-pattern.tsx` - Copy (exports)
- `src/components/ds/context-menu-pattern.tsx` - ExternalLink (exports)
- `src/components/ds/context-menu-pattern.tsx` - Pencil (exports)
- `src/components/ds/context-menu-pattern.tsx` - Share2 (exports)
- `src/components/ds/context-menu-pattern.tsx` - Trash2 (exports)
- `src/components/ds/ExportPdfButton.tsx` - ExportPdfButton (exports)
- `src/components/ds/ExportPdfButton.tsx` - ExportPdfButtonProps (types)
- `src/components/ds/icon-badge.tsx` - IconBadgeSize (types)

## Deletion Rule

Do not delete anything from this report in bulk. Create separate task slices by
domain, verify imports/dynamic references/runtime ownership, then delete in small
batches with typecheck/build evidence.

## Artifacts

- Raw JSON: docs/ops/evidence/2026-06-19-S70-knip-dead-code-audit/knip-report.json
- Summary: docs/ops/evidence/2026-06-19-S70-knip-dead-code-audit/SUMMARY.md
