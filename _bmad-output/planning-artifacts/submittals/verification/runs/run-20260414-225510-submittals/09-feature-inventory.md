# Submittals - Feature Inventory

**Run ID:** run-20260414-225510-submittals  
**Generated At:** 2026-04-15T03:03:37Z  
**Project ID:** 562949954728542  
**Git SHA:** f8293a7238a0d803bee4667fc93c89f59367948d

## Coverage Summary

| Metric | Value |
|---|---|
| total_features | 36 |
| implemented_features | 30 |
| missing_features | 6 |
| completion_percent | 83 |

## List Surface

| feature_name | status | source | evidence | notes |
|---|---|---|---|---|
| List route renders submittals table | implemented | codebase | frontend/src/app/(main)/[projectId]/submittals/page.tsx | UnifiedTablePage integration |
| Configurable columns (12 canonical columns) | implemented | codebase | frontend/src/features/submittals/submittals-table-config.tsx | Includes Spec, #, Rev, Title, Type, Status, etc. |
| Status filter | implemented | codebase | frontend/src/features/submittals/submittals-table-config.tsx | Draft/Open/Distributed/Closed |
| Response filter | implemented | codebase | frontend/src/features/submittals/submittals-table-config.tsx | Pending/Approved/etc. |
| Division text filter | implemented | codebase | frontend/src/features/submittals/submittals-table-config.tsx | Text filter |
| Recycle bin tab behavior | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/route.ts | tab=recycle-bin uses deleted_at not null |
| Grouped views (Packages/Spec Sections/BIC) | partial | RAG | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/switch-between-submittals-views | Procore supports; partial parity |
| Bulk actions in grouped views | missing | RAG | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/use-bulk-actions-edit-in-the-submittals-tool | Identified in gap analysis |

## Create Surface

| feature_name | status | source | evidence | notes |
|---|---|---|---|---|
| Create submittal page | implemented | codebase | frontend/src/app/(main)/[projectId]/submittals/new/page.tsx | Uses SubmittalFormPage |
| Create API endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/route.ts | POST with Zod validation |
| Package picker defaults from query params | implemented | codebase | frontend/src/app/(main)/[projectId]/submittals/new/page.tsx | package_id support |
| Spec picker defaults from query params | implemented | codebase | frontend/src/app/(main)/[projectId]/submittals/new/page.tsx | specification_section support |
| Required fields aligned to create form | partial | manifest | .claude/procore-manifests/submittals/manifest.json | Manifest marks many optional; needs deeper validation parity |
| Create and send emails action | missing | RAG | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/create-a-submittal | Present in Procore workflow expectations |

## Detail Surface

| feature_name | status | source | evidence | notes |
|---|---|---|---|---|
| Detail route with relational fetch | implemented | codebase | frontend/src/app/(main)/[projectId]/submittals/[submittalId]/page.tsx | Includes workflow, responses, attachments, history |
| Edit route | implemented | codebase | frontend/src/app/(main)/[projectId]/submittals/[submittalId]/edit/page.tsx | Reads current submittal |
| Detail API endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts | GET by project + submittal |
| Soft delete endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts | DELETE sets deleted_at |
| Restore endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/restore/route.ts | restore from recycle bin |
| Emails tab parity | missing | RAG | https://v2.support.procore.com/product-manuals/submittals-project | Called out by parity analysis |

## Edit Surface

| feature_name | status | source | evidence | notes |
|---|---|---|---|---|
| Update submittal endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts | PUT with Zod validation |
| Revision endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/revisions/route.ts | Revision support present |
| Duplicate endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/duplicate/route.ts | Duplicate action support |
| Distribution endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/distribute/route.ts | Distribute flow |
| Inline package create from edit/create UI | missing | RAG | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/create-a-submittal | Gap item in prior run |

## Workflow Surface

| feature_name | status | source | evidence | notes |
|---|---|---|---|---|
| Workflow steps list endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/route.ts | GET step list |
| Workflow step add endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/route.ts | POST add step |
| Workflow response endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]/respond/route.ts | Upsert response |
| Ball in court advancement logic | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]/respond/route.ts | Advances or closes |
| Workflow reorder support | missing | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/route.ts | No reorder endpoint |
| Custom status behavior (company-level) | partial | RAG | https://v2.support.procore.com/product-manuals/admin-company/tutorials/create-custom-submittal-log-statuses | App supports core statuses; custom parity partial |

## Line Items Surface

Use N/A if this surface does not apply to the tool.

| feature_name | status | source | evidence | notes |
|---|---|---|---|---|
| Submittals line items module | N/A | RAG | https://v2.support.procore.com/product-manuals/submittals-project | Not a primary submittals surface |

## Attachments Surface

Use N/A if this surface does not apply to the tool.

| feature_name | status | source | evidence | notes |
|---|---|---|---|---|
| Attachments relation loaded on detail | implemented | codebase | frontend/src/app/(main)/[projectId]/submittals/[submittalId]/page.tsx | submittal_attachments select |
| Attachment management endpoint parity | partial | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts | relational read present; dedicated upload mgmt gap remains |

## Reports Surface

Use N/A if this surface does not apply to the tool.

| feature_name | status | source | evidence | notes |
|---|---|---|---|---|
| Export endpoint exists | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/export/route.ts | route present |
| PDF/Excel parity with Procore export options | partial | RAG | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/export-the-submittals-log | Prior gap indicates PDF/Excel parity not complete |

## Integrations Surface

Use N/A if this surface does not apply to the tool.

| feature_name | status | source | evidence | notes |
|---|---|---|---|---|
| Specifications lookup endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/specs/route.ts | Supports specification linking |
| Packages endpoint | implemented | codebase | frontend/src/app/api/projects/[projectId]/submittals/packages/route.ts | Package lookup |
| Related items integration management | missing | codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/* | No dedicated related-items CRUD route |

## Source Index

List every unique source referenced above.

| source_type | reference | description |
|---|---|---|
| RAG | https://v2.support.procore.com/product-manuals/submittals-project | Tool overview and expected capabilities |
| RAG | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/create-a-submittal | Create flow expectations |
| RAG | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/switch-between-submittals-views | List/grouped-view behavior |
| RAG | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/use-bulk-actions-edit-in-the-submittals-tool | Bulk action expectations |
| RAG | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/export-the-submittals-log | Export behavior expectations |
| RAG | https://v2.support.procore.com/product-manuals/admin-company/tutorials/create-custom-submittal-log-statuses | Custom status behavior |
| manifest | .claude/procore-manifests/submittals/manifest.json | Field-level captured structure |
| codebase | frontend/src/app/(main)/[projectId]/submittals/page.tsx | List page implementation |
| codebase | frontend/src/features/submittals/submittals-table-config.tsx | Table schema and UI behaviors |
| codebase | frontend/src/hooks/use-submittals.ts | Data hooks and mutations |
| codebase | frontend/src/app/api/projects/[projectId]/submittals/route.ts | Create/list API behavior |
| codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts | Detail/update/delete behavior |
| codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/route.ts | Workflow step APIs |
| codebase | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]/respond/route.ts | Workflow response + BIC logic |
