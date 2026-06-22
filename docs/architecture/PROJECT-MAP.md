# Project Map

> **AUTO-GENERATED — do not edit by hand.** Regenerate with `npm run map:project`.
> A pre-commit gate fails if this file is stale relative to the code.
>
> This is the surface inventory every AI session should read first: what pages
> exist, what API endpoints exist, and what the AI assistant can do. Search it
> by *purpose* (e.g. grep "run workflows"), not by URL. For *how* the system
> fits together (data flow, architecture), see
> `docs/architecture/AI-RAG-ARCHITECTURE.md`. For the database, see
> `docs/architecture/TABLE-LIST.md`. The in-app assistant searches the same
> data via the `findAppPage` tool (`frontend/src/lib/app-surface/`).

## UI Routes (308)

_307/308 have a description (from the page's `PageShell` or the curated `frontend/src/lib/app-surface/page-descriptions.json` sidecar). Pages without one are invisible to find-a-page search — add an entry to the sidecar (index-only) or a `PageShell` description (also renders in the UI)._

| URL | What it does | File |
|-----|--------------|------|
| `/` | List all projects across the organization with filtering, search, and client/estimating/internal scope tabs | frontend/src/app/(main)/page.tsx |
| `/[projectId]/admin` | Manage member permissions for this project. | frontend/src/app/(main)/[projectId]/admin/page.tsx |
| `/[projectId]/billing-periods` | Create and manage invoice billing periods with manual or automatic frequency setup | frontend/src/app/(main)/[projectId]/billing-periods/page.tsx |
| `/[projectId]/budget` | View and manage project budget with line items, modifications, forecasting, and cost tracking | frontend/src/app/(main)/[projectId]/budget/page.tsx |
| `/[projectId]/budget/line-item/new` | Add one or more line items to the project budget. | frontend/src/app/(main)/[projectId]/budget/line-item/new/page.tsx |
| `/[projectId]/budget/setup` | Create initial budget line items by selecting cost codes and entering amounts | frontend/src/app/(main)/[projectId]/budget/setup/page.tsx |
| `/[projectId]/change-events` | Provide a valid project identifier to access change events. | frontend/src/app/(main)/[projectId]/change-events/page.tsx |
| `/[projectId]/change-events/[changeEventId]` | Loading... | frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx |
| `/[projectId]/change-events/[changeEventId]/edit` | Update change event details and line items. | frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/edit/page.tsx |
| `/[projectId]/change-events/new` | Document a potential change to project scope, schedule, or budget. | frontend/src/app/(main)/[projectId]/change-events/new/page.tsx |
| `/[projectId]/change-management` | Change Events identify the issue, PCOs price the impact, and Change Orders modify the contract. | frontend/src/app/(main)/[projectId]/change-management/page.tsx |
| `/[projectId]/change-orders` | List prime contract and commitment change orders with status and financial details | frontend/src/app/(main)/[projectId]/change-orders/page.tsx |
| `/[projectId]/change-orders/[changeOrderId]/edit` | Redirect to change order detail page with edit mode enabled | frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/edit/page.tsx |
| `/[projectId]/change-orders/commitment/[commitmentCoId]` | Loading change order details | frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx |
| `/[projectId]/change-orders/commitment/new` | Opening the canonical Commitment PCO workflow. | frontend/src/app/(main)/[projectId]/change-orders/commitment/new/page.tsx |
| `/[projectId]/change-orders/new` | Redirect legacy change order create URLs to canonical prime or commitment PCO routes | frontend/src/app/(main)/[projectId]/change-orders/new/page.tsx |
| `/[projectId]/change-orders/prime/[primeCoId]` | A log of changes to this record will appear here | frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx |
| `/[projectId]/change-orders/prime/new` | Opening the canonical Prime Contract PCO workflow. | frontend/src/app/(main)/[projectId]/change-orders/prime/new/page.tsx |
| `/[projectId]/client-dashboard` | Client-facing project overview with contract, milestones, RFIs, and recent documents | frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx |
| `/[projectId]/commitment-pcos` | Provide a valid project identifier to access commitment PCOs. | frontend/src/app/(main)/[projectId]/commitment-pcos/page.tsx |
| `/[projectId]/commitment-pcos/[pcoId]` | Line items for this PCO will appear here once added. | frontend/src/app/(main)/[projectId]/commitment-pcos/[pcoId]/page.tsx |
| `/[projectId]/commitment-pcos/new` | Commitment PCOs must start from a linked change event. | frontend/src/app/(main)/[projectId]/commitment-pcos/new/page.tsx |
| `/[projectId]/commitments` | List subcontracts and purchase orders with financial totals and change order details | frontend/src/app/(main)/[projectId]/commitments/page.tsx |
| `/[projectId]/commitments/[commitmentId]` | View commitment details including SOV, change orders, invoices, and related documents | frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx |
| `/[projectId]/commitments/[commitmentId]/edit` | Edit subcontract or purchase order details including attachments and schedule of values | frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/edit/page.tsx |
| `/[projectId]/commitments/[commitmentId]/invoices/[invoiceId]` | View subcontractor invoice details and payment information | frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/invoices/[invoiceId]/page.tsx |
| `/[projectId]/commitments/[commitmentId]/pcos/new` | Create a new pending change order (PCO) for a subcontract or purchase order | frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/pcos/new/page.tsx |
| `/[projectId]/commitments/configure` | Configure commitment defaults, workflows, billing, and permissions. | frontend/src/app/(main)/[projectId]/commitments/configure/page.tsx |
| `/[projectId]/commitments/new` | Create new subcontract or purchase order with details and schedule of values | frontend/src/app/(main)/[projectId]/commitments/new/page.tsx |
| `/[projectId]/commitments/recycle-bin` | Redirect to commitments list filtered to recycle bin with soft-deleted records | frontend/src/app/(main)/[projectId]/commitments/recycle-bin/page.tsx |
| `/[projectId]/commitments/settings` | Configure commitment settings for auto-numbering, defaults, and approval thresholds | frontend/src/app/(main)/[projectId]/commitments/settings/page.tsx |
| `/[projectId]/daily-log` | List daily logs with weather, manpower, equipment, and site management notes | frontend/src/app/(main)/[projectId]/daily-log/page.tsx |
| `/[projectId]/daily-log/[dailyLogId]/edit` | Edit daily log entry with weather conditions, manpower, equipment, and general notes | frontend/src/app/(main)/[projectId]/daily-log/[dailyLogId]/edit/page.tsx |
| `/[projectId]/daily-log/new` | Create new daily log entry with site observations and project activities | frontend/src/app/(main)/[projectId]/daily-log/new/page.tsx |
| `/[projectId]/daily-log/site-scribe` | Realtime AI daily-log capture for field crews. | frontend/src/app/(main)/[projectId]/daily-log/site-scribe/page.tsx |
| `/[projectId]/direct-costs` | List direct costs with vendor, amounts, and status tracked separately from commitments | frontend/src/app/(main)/[projectId]/direct-costs/page.tsx |
| `/[projectId]/direct-costs/[costId]` | Direct cost not found | frontend/src/app/(main)/[projectId]/direct-costs/[costId]/page.tsx |
| `/[projectId]/direct-costs/new` | Direct costs are synced from Acumatica and cannot be created in Alleato. | frontend/src/app/(main)/[projectId]/direct-costs/new/page.tsx |
| `/[projectId]/directory` | Manage project team members and companies with roles, contact info, and access control | frontend/src/app/(main)/[projectId]/directory/page.tsx |
| `/[projectId]/documents` | Store and organize project documents with versioning, search, and metadata tracking | frontend/src/app/(main)/[projectId]/documents/page.tsx |
| `/[projectId]/documents/[documentId]` | View and preview an individual document with details and content display | frontend/src/app/(main)/[projectId]/documents/[documentId]/page.tsx |
| `/[projectId]/drawings` | Upload and manage project drawings and design documents with versioning | frontend/src/app/(main)/[projectId]/drawings/page.tsx |
| `/[projectId]/drawings/[drawingId]` | The file could not be loaded from storage. | frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx |
| `/[projectId]/drawings/areas` | Create your first drawing area to start organizing your project drawings. | frontend/src/app/(main)/[projectId]/drawings/areas/page.tsx |
| `/[projectId]/drawings/board` | Drag-and-drop drawing packages by status | frontend/src/app/(main)/[projectId]/drawings/board/page.tsx |
| `/[projectId]/drawings/recycle-bin` | View, manage, and upload all of your drawings from the Drawings log. | frontend/src/app/(main)/[projectId]/drawings/recycle-bin/page.tsx |
| `/[projectId]/drawings/revisions-report` | Complete drawing log including all revisions, unpublished, and obsolete drawings. | frontend/src/app/(main)/[projectId]/drawings/revisions-report/page.tsx |
| `/[projectId]/drawings/sets` | Create a set to group drawings issued together. | frontend/src/app/(main)/[projectId]/drawings/sets/page.tsx |
| `/[projectId]/drawings/viewer-v2/[drawingId]` | Try a different search term. | frontend/src/app/(main)/[projectId]/drawings/viewer-v2/[drawingId]/page.tsx |
| `/[projectId]/drawings/viewer/[drawingId]` | Try a different search term. | frontend/src/app/(main)/[projectId]/drawings/viewer/[drawingId]/page.tsx |
| `/[projectId]/emails` | View project-related emails integrated from Outlook or other email systems | frontend/src/app/(main)/[projectId]/emails/page.tsx |
| `/[projectId]/estimates` | List project estimates with dates and status for tracking bidding activities | frontend/src/app/(main)/[projectId]/estimates/page.tsx |
| `/[projectId]/estimates/[estimateId]` | This estimate could not be loaded for the current project. | frontend/src/app/(main)/[projectId]/estimates/[estimateId]/page.tsx |
| `/[projectId]/estimates/[estimateId]/edit` | Update estimate details | frontend/src/app/(main)/[projectId]/estimates/[estimateId]/edit/page.tsx |
| `/[projectId]/estimates/new` | Redirect to estimates list page for creating new estimates | frontend/src/app/(main)/[projectId]/estimates/new/page.tsx |
| `/[projectId]/home` | Project command center dashboard with budget, team, alerts, and key performance metrics | frontend/src/app/(main)/[projectId]/home/page.tsx |
| `/[projectId]/hub` | Tabbed project hub for quick access to documents, emails, meetings, and modules | frontend/src/app/(main)/[projectId]/hub/page.tsx |
| `/[projectId]/intelligence` | AI-powered project intelligence with insights, timeline, and source document references | frontend/src/app/(main)/[projectId]/intelligence/page.tsx |
| `/[projectId]/intelligence/sources/[sourceDocumentId]` | View source document used by a project intelligence packet with full content context | frontend/src/app/(main)/[projectId]/intelligence/sources/[sourceDocumentId]/page.tsx |
| `/[projectId]/invoices` | View owner and subcontractor invoices with billing periods organized by status | frontend/src/app/(main)/[projectId]/invoices/page.tsx |
| `/[projectId]/invoices/new` | Create a new owner or commitment invoice. | frontend/src/app/(main)/[projectId]/invoices/new/page.tsx |
| `/[projectId]/invoices/owner/new` | Redirect to canonical owner invoice creation page with contract context | frontend/src/app/(main)/[projectId]/invoices/owner/new/page.tsx |
| `/[projectId]/invoicing` | Legacy redirect to canonical invoices workspace | frontend/src/app/(main)/[projectId]/invoicing/page.tsx |
| `/[projectId]/invoicing/[invoiceId]` | No schedule of values line items have been added to this invoice. | frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx |
| `/[projectId]/invoicing/new` | Legacy redirect to canonical owner invoice creation with optional billing period | frontend/src/app/(main)/[projectId]/invoicing/new/page.tsx |
| `/[projectId]/invoicing/subcontractor` | Legacy redirect to subcontractor invoices tab | frontend/src/app/(main)/[projectId]/invoicing/subcontractor/page.tsx |
| `/[projectId]/invoicing/subcontractor/[invoiceId]` | View detailed subcontractor invoice with schedule of values and change orders | frontend/src/app/(main)/[projectId]/invoicing/subcontractor/[invoiceId]/page.tsx |
| `/[projectId]/invoicing/subcontractor/new` | Create new subcontractor invoice with SOV and approved change orders | frontend/src/app/(main)/[projectId]/invoicing/subcontractor/new/page.tsx |
| `/[projectId]/meetings` | List project meetings with transcripts and extracted key information | frontend/src/app/(main)/[projectId]/meetings/page.tsx |
| `/[projectId]/meetings/[meetingId]` | View meeting transcript with segments, tasks, risks, decisions, and opportunities | frontend/src/app/(main)/[projectId]/meetings/[meetingId]/page.tsx |
| `/[projectId]/meetings/[meetingId]/prep` | Generate an AI-powered meeting prep that analyzes your project data, last meeting insights, and current status — or start writing from scratch. | frontend/src/app/(main)/[projectId]/meetings/[meetingId]/prep/page.tsx |
| `/[projectId]/meetings/schedule` | Schedule a future meeting and generate AI-powered meeting prep. | frontend/src/app/(main)/[projectId]/meetings/schedule/page.tsx |
| `/[projectId]/my-work` | No schedule of values has been assigned to your company on this project. | frontend/src/app/(main)/[projectId]/my-work/page.tsx |
| `/[projectId]/pcos` | List potential change orders by status with version, value, and schedule impact | frontend/src/app/(main)/[projectId]/pcos/page.tsx |
| `/[projectId]/pcos/[pcoId]` | Attachments related to this potential change order will appear here. | frontend/src/app/(main)/[projectId]/pcos/[pcoId]/page.tsx |
| `/[projectId]/pcos/[pcoId]/edit` | Edit potential change order with change events, line items, and markup | frontend/src/app/(main)/[projectId]/pcos/[pcoId]/edit/page.tsx |
| `/[projectId]/pcos/new` | Create new potential change order linked to change events with line items | frontend/src/app/(main)/[projectId]/pcos/new/page.tsx |
| `/[projectId]/permissions` | Legacy redirect to user management page | frontend/src/app/(main)/[projectId]/permissions/page.tsx |
| `/[projectId]/photos` | View geotagged photos on a project map. Photos with location data will appear as pins. | frontend/src/app/(main)/[projectId]/photos/page.tsx |
| `/[projectId]/prime-contract-pcos` | Provide a valid project identifier to access PCOs. | frontend/src/app/(main)/[projectId]/prime-contract-pcos/page.tsx |
| `/[projectId]/prime-contract-pcos/[pcoId]` | This potential change order does not have any line items yet. | frontend/src/app/(main)/[projectId]/prime-contract-pcos/[pcoId]/page.tsx |
| `/[projectId]/prime-contract-pcos/[pcoId]/edit` | Edit prime contract potential change order metadata and status | frontend/src/app/(main)/[projectId]/prime-contract-pcos/[pcoId]/edit/page.tsx |
| `/[projectId]/prime-contract-pcos/new` | Create prime contract PCO from change events or standalone for conversion to CO | frontend/src/app/(main)/[projectId]/prime-contract-pcos/new/page.tsx |
| `/[projectId]/prime-contracts` | List prime contracts with financial totals, expandable change orders, and PCOs | frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx |
| `/[projectId]/prime-contracts/[contractId]` | Loading contract details... | frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx |
| `/[projectId]/prime-contracts/[contractId]/change-orders/pcos/[pcoId]` | View prime contract PCO within the contract's change orders context | frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/change-orders/pcos/[pcoId]/page.tsx |
| `/[projectId]/prime-contracts/[contractId]/change-orders/pcos/[pcoId]/edit` | Edit prime contract PCO within change order context | frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/change-orders/pcos/[pcoId]/edit/page.tsx |
| `/[projectId]/prime-contracts/[contractId]/change-orders/pcos/new` | Create new prime contract PCO linked to a specific prime contract | frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/change-orders/pcos/new/page.tsx |
| `/[projectId]/prime-contracts/[contractId]/edit` | Redirect to contract detail page with edit mode enabled | frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/edit/page.tsx |
| `/[projectId]/prime-contracts/[contractId]/invoices/[invoiceId]` | The requested invoice could not be found. | frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/invoices/[invoiceId]/page.tsx |
| `/[projectId]/prime-contracts/[contractId]/invoices/new` | Redirect to invoice creation with the prime contract pre-selected as context | frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/invoices/new/page.tsx |
| `/[projectId]/prime-contracts/change-orders` | Redirect to prime change orders tab in the canonical change orders page | frontend/src/app/(main)/[projectId]/prime-contracts/change-orders/page.tsx |
| `/[projectId]/prime-contracts/configure` | Project-level settings for how prime contracts behave | frontend/src/app/(main)/[projectId]/prime-contracts/configure/page.tsx |
| `/[projectId]/prime-contracts/new` | Create new prime contract with standard fields or from a project estimate | frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx |
| `/[projectId]/progress-reports` | List weekly progress reports with photos, recipients, and publication status | frontend/src/app/(main)/[projectId]/progress-reports/page.tsx |
| `/[projectId]/progress-reports/[reportId]` | Edit and publish a weekly progress report from meetings, emails, and photos | frontend/src/app/(main)/[projectId]/progress-reports/[reportId]/page.tsx |
| `/[projectId]/project-status-report` | Monthly project budget, invoice, schedule, and open items summary for stakeholders | frontend/src/app/(main)/[projectId]/project-status-report/page.tsx |
| `/[projectId]/punch-list` | Track deficiencies and final closeout items for project completion | frontend/src/app/(main)/[projectId]/punch-list/page.tsx |
| `/[projectId]/punch-list/[punchItemId]` | View and manage an individual punch list item with status and notes | frontend/src/app/(main)/[projectId]/punch-list/[punchItemId]/page.tsx |
| `/[projectId]/reporting` | Comprehensive project reporting and analytics | frontend/src/app/(main)/[projectId]/reporting/page.tsx |
| `/[projectId]/rfis` | List requests for information with status tracking and response workflow | frontend/src/app/(main)/[projectId]/rfis/page.tsx |
| `/[projectId]/rfis/[rfiId]` | View RFI details with responses, notes, and reply capability | frontend/src/app/(main)/[projectId]/rfis/[rfiId]/page.tsx |
| `/[projectId]/rfis/new` | Create a new Request for Information | frontend/src/app/(main)/[projectId]/rfis/new/page.tsx |
| `/[projectId]/schedule` | Create tasks, set milestones, and track dependencies with Gantt charts and multiple view modes. | frontend/src/app/(main)/[projectId]/schedule/page.tsx |
| `/[projectId]/schedule/import` | Import schedule tasks from Microsoft Project, Excel, CSV, or a review-required PDF extraction. | frontend/src/app/(main)/[projectId]/schedule/import/page.tsx |
| `/[projectId]/setup` | Configure your project settings and details | frontend/src/app/(main)/[projectId]/setup/page.tsx |
| `/[projectId]/sov` | View and manage schedule of values across all contracts | frontend/src/app/(main)/[projectId]/sov/page.tsx |
| `/[projectId]/specifications` | Browse, upload, and manage project specifications by section with revision tracking | frontend/src/app/(main)/[projectId]/specifications/page.tsx |
| `/[projectId]/specifications/[sectionId]` | Upload a revision to start tracking changes to this specification section. | frontend/src/app/(main)/[projectId]/specifications/[sectionId]/page.tsx |
| `/[projectId]/submittals` | Organize construction submittals by packages, specs, and review workflows with approval tracking | frontend/src/app/(main)/[projectId]/submittals/page.tsx |
| `/[projectId]/submittals/[submittalId]` | View submittal detail, workflow responses, and linked attachments | frontend/src/app/(main)/[projectId]/submittals/[submittalId]/page.tsx |
| `/[projectId]/submittals/[submittalId]/edit` | Edit submittal metadata, type, package, and specification associations | frontend/src/app/(main)/[projectId]/submittals/[submittalId]/edit/page.tsx |
| `/[projectId]/submittals/new` | Create new submittal with optional package or spec section prefill | frontend/src/app/(main)/[projectId]/submittals/new/page.tsx |
| `/[projectId]/tasks` | Project task inbox and workflow management interface | frontend/src/app/(main)/[projectId]/tasks/page.tsx |
| `/[projectId]/tasks/kanban` | Drag cards between statuses. Moves save immediately. | frontend/src/app/(main)/[projectId]/tasks/kanban/page.tsx |
| `/[projectId]/timeline` | Chronological feed of project events and activity history | frontend/src/app/(main)/[projectId]/timeline/page.tsx |
| `/[projectId]/transmittals` | Manage transmittals and project correspondence | frontend/src/app/(main)/[projectId]/transmittals/page.tsx |
| `/[projectId]/user-management` | Assign project roles and module-level access for every member of this project. | frontend/src/app/(main)/[projectId]/user-management/page.tsx |
| `/access-denied` | Error page shown when a user lacks permission to access a project or resource | frontend/src/app/(main)/access-denied/page.tsx |
| `/accounting` | Financial dashboard with AR aging, AP aging, cash position, and alerts | frontend/src/app/(admin)/accounting/page.tsx |
| `/accounting/ap-invoices` | Table of accounts payable invoices from Acumatica with status and amount | frontend/src/app/(admin)/accounting/ap-invoices/page.tsx |
| `/accounting/ap-payments` | Table of AP checks and payments issued with status and amount | frontend/src/app/(admin)/accounting/ap-payments/page.tsx |
| `/accounting/bills` | Accounts payable bills synced from Acumatica with balance and hold status | frontend/src/app/(admin)/accounting/bills/page.tsx |
| `/accounting/checks` | AP check register with payment method, vendor, and project allocation | frontend/src/app/(admin)/accounting/checks/page.tsx |
| `/accounting/finance-spend` | Trailing 12-month accounting and finance overhead from classified Acumatica AP bills. | frontend/src/app/(admin)/accounting/finance-spend/page.tsx |
| `/accounting/invoices` | Accounts receivable invoices with customer, due date, balance, and payments | frontend/src/app/(admin)/accounting/invoices/page.tsx |
| `/accounting/payments` | AR payment receipts with status, customer, linked invoices, and balance | frontend/src/app/(admin)/accounting/payments/page.tsx |
| `/accounting/projects` | Acumatica project financials table with income, expenses, and profit margin | frontend/src/app/(admin)/accounting/projects/page.tsx |
| `/accounting/reconciliation` | Sync discrepancy findings between Job Planner and Acumatica with resolution workflow | frontend/src/app/(admin)/accounting/reconciliation/page.tsx |
| `/accounting/sop-backlog` | Track accounting and finance SOP items that still need a linked process or file. | frontend/src/app/(admin)/accounting/sop-backlog/page.tsx |
| `/accounting/wip` | Work-in-progress report with contract value, cost variance, and billing position | frontend/src/app/(admin)/accounting/wip/page.tsx |
| `/actions` | Manually run internal workflows, syncs, AI refreshes, and outbound notifications without exposing those controls on client-facing pages. | frontend/src/app/(admin)/actions/page.tsx |
| `/acumatica-sync-logs` | Outbound app-to-Acumatica create/update/skip/error audit trail. | frontend/src/app/(admin)/acumatica-sync-logs/page.tsx |
| `/admin` | Directory of admin, intelligence, database, testing, and internal documentation pages | frontend/src/app/(admin)/admin/page.tsx |
| `/admin-check` | Verify the current user's authentication status and super admin privileges | frontend/src/app/(admin)/admin-check/page.tsx |
| `/admin/company-info` | Manage company profile and knowledge articles for the AI assistant | frontend/src/app/(admin)/admin/company-info/page.tsx |
| `/admin/errors` | Redirect to /errors; grouped application errors and issue review | frontend/src/app/admin/errors/page.tsx |
| `/ai` | AI chat interface for conversing with Alleato AI and running workflows | frontend/src/app/(main)/ai/page.tsx |
| `/ai-agents` | Redirect to /ai/admin/agents; AI agent registry with pipeline, chat, and write tools | frontend/src/app/(admin)/ai-agents/page.tsx |
| `/ai-assistant` | Redirect to /ai; AI assistant and chat interface for projects | frontend/src/app/(main)/ai-assistant/page.tsx |
| `/ai-assistant/feature-requests` | Durable AIS request packets, readiness state, and implementation handoffs. | frontend/src/app/(main)/ai-assistant/feature-requests/page.tsx |
| `/ai-assistant/feature-requests/[requestId]` | Feature request workspace and details for AI assistant improvements | frontend/src/app/(main)/ai-assistant/feature-requests/[requestId]/page.tsx |
| `/ai-assistant/marketing` | Review source-backed CMO content plans, draft assets, citations, and approval states. | frontend/src/app/(main)/ai-assistant/marketing/page.tsx |
| `/ai-assistant/skills` | Redirect to /ai/skills; approved AI skills available to the assistant | frontend/src/app/(main)/ai-assistant/skills/page.tsx |
| `/ai-assistant/teach` | Redirect to /ai/teach; submit reviewed workflow knowledge to the AI system | frontend/src/app/(main)/ai-assistant/teach/page.tsx |
| `/ai-avatar` | A separate live Tavus avatar experience for onboarding and internal experiments. | frontend/src/app/(main)/ai-avatar/page.tsx |
| `/ai-learning-promotions` | Redirect to /ai/learning-promotions; approve retrieval-learning candidates | frontend/src/app/(admin)/ai-learning-promotions/page.tsx |
| `/ai-prompt-diagnostics` | Inspect the assembled AI assistant system prompt for a representative request. | frontend/src/app/(admin)/ai-prompt-diagnostics/page.tsx |
| `/ai-skills` | Redirect to /ai/admin/skills; admin review surface for Skill Library records | frontend/src/app/(admin)/ai-skills/page.tsx |
| `/ai-system-health` | Conversations, tokens, spend, satisfaction, model mix, the self-learning loop, and ingestion-pipeline status — one screen for stakeholder visibility into the AI. | frontend/src/app/(admin)/ai-system-health/page.tsx |
| `/ai-vision` | One screen for the whole AI build — the vision, the agent team, the tools in priority order, and what's already live. | frontend/src/app/(admin)/ai-vision/page.tsx |
| `/ai-work-runs` | Recent Executive Daily Brief runs, delivery state, source policy, and evidence rows from the AI operations ledger. | frontend/src/app/(admin)/ai-work-runs/page.tsx |
| `/ai/admin/agents` | AI agent registry with table and dependency graph views, status and impact filters | frontend/src/app/(admin)/ai/admin/agents/page.tsx |
| `/ai/admin/skills` | Review Skill Library records by status, scope, owner, reviewer, and usage. | frontend/src/app/(admin)/ai/admin/skills/page.tsx |
| `/ai/learning-promotions` | Review candidate learnings before they can become durable assistant behavior, memory, attribution, or retrieval rules. | frontend/src/app/(admin)/ai/learning-promotions/page.tsx |
| `/ai/skills` | Approved assistant skills by category, scope, owner, reviewer, and usage. | frontend/src/app/(main)/ai/skills/page.tsx |
| `/ai/teach` | Submissions become review candidates before they change assistant behavior. | frontend/src/app/(main)/ai/teach/page.tsx |
| `/analytics` | User logins, activity, app error trends, AI engagement, and sync health — live platform visibility for administrators. | frontend/src/app/(admin)/analytics/page.tsx |
| `/annotation-inbox` | Manage issue annotations and feedback with priority scoring, dispatch to agents, and duplicate clustering | frontend/src/app/(admin)/annotation-inbox/page.tsx |
| `/api-docs` | Interactive Swagger UI for the Alleato Procore frontend + backend endpoints. | frontend/src/app/(admin)/api-docs/page.tsx |
| `/assignment-inbox` | View and manage assigned tasks and action items across projects | frontend/src/app/(tables)/assignment-inbox/page.tsx |
| `/auth/ai-widget-gallery` | Gallery of AI-powered interactive widgets and components | frontend/src/app/auth/ai-widget-gallery/page.tsx |
| `/auth/error` | Authentication error page displaying error codes and messages | frontend/src/app/auth/error/page.tsx |
| `/auth/forgot-password` | Password recovery form for users who have forgotten their login credentials | frontend/src/app/auth/forgot-password/page.tsx |
| `/auth/login` | User login form for signing in to the Alleato PM application | frontend/src/app/auth/login/page.tsx |
| `/auth/login-legacy` | Legacy login page variant with branded header and background imagery | frontend/src/app/auth/login-legacy/page.tsx |
| `/auth/login-v2` | Login page design version 2 with modern UI | frontend/src/app/auth/login-v2/page.tsx |
| `/auth/login-v3` | Login page design version 3 with enhanced user experience | frontend/src/app/auth/login-v3/page.tsx |
| `/auth/sign-up` | New user registration form for creating an account | frontend/src/app/auth/sign-up/page.tsx |
| `/auth/sign-up-success` | Confirmation page displayed after successful account creation | frontend/src/app/auth/sign-up-success/page.tsx |
| `/auth/update-password` | Form for users to set or reset their password | frontend/src/app/auth/update-password/page.tsx |
| `/billing-periods` | Redirect to project-scoped billing periods under the invoices tab | frontend/src/app/(main)/billing-periods/page.tsx |
| `/calendar` | Project calendar view for scheduling and tracking events | frontend/src/app/(main)/calendar/page.tsx |
| `/change-events` | Global table of change events and modifications across all projects | frontend/src/app/(tables)/change-events/page.tsx |
| `/command-center` | Kanban-style task board for tracking initiatives across idea, planned, in progress, and done statuses | frontend/src/app/(admin)/command-center/page.tsx |
| `/comments` | Use the annotation button on any page to leave a comment. | frontend/src/app/(main)/comments/page.tsx |
| `/crawled-pages` | Explore crawled Procore support documentation organized by tools and resource types | frontend/src/app/(admin)/(procore)/crawled-pages/page.tsx |
| `/create-project` | Set up core project details, location, and delivery defaults. | frontend/src/app/(main)/create-project/page.tsx |
| `/daily-briefs` | Historical record of executive Daily Brief packets and delivery status | frontend/src/app/(tables)/daily-briefs/page.tsx |
| `/daily-briefs/[briefId]` | Daily Brief history is limited to users with executive briefing access. | frontend/src/app/(tables)/daily-briefs/[briefId]/page.tsx |
| `/daily-logs` | Table of daily construction logs with weather, manpower, and work completed entries | frontend/src/app/(tables)/daily-logs/page.tsx |
| `/daily-logs/[dailyLogId]` | Detailed view of a specific daily log entry | frontend/src/app/(tables)/daily-logs/[dailyLogId]/page.tsx |
| `/daily-reports` | AI-generated daily recap summaries of meetings and project decisions | frontend/src/app/(tables)/daily-reports/page.tsx |
| `/database` | — | frontend/src/app/(admin)/database/page.tsx |
| `/database-inventory` | Schema inventory of database tables with row counts, size, and gotchas | frontend/src/app/(admin)/database-inventory/page.tsx |
| `/deep-research` | Browse prior Deep Agents LLM wiki research projects, saved source files, durable answers, and change logs. | frontend/src/app/(admin)/deep-research/page.tsx |
| `/design` | Living inventory of every token and component. Import from @/components/ds. | frontend/src/app/(admin)/design/page.tsx |
| `/design-ideas` | Design system showcase and reference page for UI components and patterns | frontend/src/app/(admin)/design-ideas/page.tsx |
| `/design-system` | Single source of truth for UI standards, tokens, and components. | frontend/src/app/(admin)/design-system/page.tsx |
| `/design-system-update` | Premium light mode UI examples and design hierarchy documentation | frontend/src/app/(admin)/design-system-update/page.tsx |
| `/design-violations` | Flagged design system violations — right-click any element in dev mode to flag | frontend/src/app/(admin)/design-violations/page.tsx |
| `/dev/table-generator` | Generate UnifiedTablePage + feature config from your Supabase schema | frontend/src/app/(admin)/dev/table-generator/page.tsx |
| `/directory` | Redirect to companies directory listing | frontend/src/app/(main)/directory/page.tsx |
| `/directory/clients` | Table of client companies with contact info and project relationships | frontend/src/app/(main)/directory/clients/page.tsx |
| `/directory/companies` | Directory of all companies with type, status, contacts, and ERP sync integration | frontend/src/app/(main)/directory/companies/page.tsx |
| `/directory/companies/[companyId]` | Loading company information... | frontend/src/app/(main)/directory/companies/[companyId]/page.tsx |
| `/directory/contacts` | Searchable list of individual contacts with email, type, and company assignment | frontend/src/app/(main)/directory/contacts/page.tsx |
| `/directory/contacts/[contactId]` | This contact has not been assigned to any projects yet. | frontend/src/app/(main)/directory/contacts/[contactId]/page.tsx |
| `/directory/employees` | Directory of Alleato Group employees with job titles, departments, and contact info | frontend/src/app/(main)/directory/employees/page.tsx |
| `/directory/groups` | Distribution groups for mass communication and team organization | frontend/src/app/(main)/directory/groups/page.tsx |
| `/directory/prospects` | Sales pipeline tracking prospects, leads, and business development opportunities | frontend/src/app/(main)/directory/prospects/page.tsx |
| `/directory/vendors` | Vendor directory with payment terms, Acumatica sync, and 1099 classification | frontend/src/app/(main)/directory/vendors/page.tsx |
| `/directory/vendors/[vendorId]` | Loading vendor information... | frontend/src/app/(main)/directory/vendors/[vendorId]/page.tsx |
| `/docs/[[...slug]]` | Try a broader search phrase. | frontend/src/app/(admin)/docs/[[...slug]]/page.tsx |
| `/docs/ai-overview` | Pulled live from the codebase, not hand-edited. | frontend/src/app/(admin)/docs/ai-overview/page.tsx |
| `/docs/ai-overview/data-sources` | Every source funnels through the same three stages. The pipeline runs end-to-end every 30 minutes on Render. | frontend/src/app/(admin)/docs/ai-overview/data-sources/page.tsx |
| `/docs/ai-overview/learning` | Each loop is operational today. They run continuously in the background: no manual trigger required. | frontend/src/app/(admin)/docs/ai-overview/learning/page.tsx |
| `/docs/ai-overview/memory` | Documentation explaining how AI memory is organized across conversation history, typed memories, and the vector knowledge base | frontend/src/app/(admin)/docs/ai-overview/memory/page.tsx |
| `/docs/ai-overview/models-and-cost` | Each role in the system has a default model assigned in `frontend/src/lib/ai/providers.ts`. The model registry below shows what's wired today. | frontend/src/app/(admin)/docs/ai-overview/models-and-cost/page.tsx |
| `/docs/ai-overview/team` | These agents have system prompts deployed and are wired into the orchestrator. Every live conversation goes through at least one of them. | frontend/src/app/(admin)/docs/ai-overview/team/page.tsx |
| `/docs/ai-overview/tools` | Each domain corresponds to a tool file in `frontend/src/lib/ai/tools/`. The model picks tools based on what your question needs. | frontend/src/app/(admin)/docs/ai-overview/tools/page.tsx |
| `/document-metadata` | Admin dashboard listing all document and meeting metadata with search, filtering, and bulk management | frontend/src/app/(admin)/document-metadata/page.tsx |
| `/documents` | RAG document library and ingestion status | frontend/src/app/(tables)/documents/page.tsx |
| `/drawings` | Searchable table of construction drawings and blueprints with upload, download, and publish capabilities | frontend/src/app/(tables)/drawings/page.tsx |
| `/email-inbox` | Synchronized email inbox showing unread messages from Outlook | frontend/src/app/(tables)/email-inbox/page.tsx |
| `/emails` | Global view of all synced emails with search and filtering | frontend/src/app/(tables)/emails/page.tsx |
| `/errors` | Admin dashboard tracking grouped application errors with severity, status, and Linear issue links | frontend/src/app/(admin)/errors/page.tsx |
| `/estimates` | Global table of all project estimates across types | frontend/src/app/(tables)/estimates/page.tsx |
| `/estimates/[type]` | Filtered view of estimates grouped by type (labor, material, subcontractor, etc.) | frontend/src/app/(main)/estimates/[type]/page.tsx |
| `/eval-runs` | Runs are written to docs/ai-plan/evals/runs/ (gitignored, local-only). Run the suite from the CLI, then refresh: node scripts/verify/verify_ai_assistant_eval_suite.mjs --bundle tool-coverage-read-regression | frontend/src/app/(admin)/eval-runs/page.tsx |
| `/executive` | No meeting records matched today's Eastern-time date. | frontend/src/app/(main)/executive/page.tsx |
| `/executive/capabilities` | Authentication required. | frontend/src/app/(main)/executive/capabilities/page.tsx |
| `/executive/intelligence-brief` | This executive briefing is limited to users with executive briefing access. | frontend/src/app/(main)/executive/intelligence-brief/page.tsx |
| `/feedback-inbox` | Review feedback, assign tools, and sync issues to GitHub. | frontend/src/app/(admin)/feedback-inbox/page.tsx |
| `/files` | Global file browser and manager | frontend/src/app/(tables)/files/page.tsx |
| `/financial-insights` | Run a portfolio scan to detect budget discrepancies and financial red flags across your projects. | frontend/src/app/(main)/financial-insights/page.tsx |
| `/fm-global` | Browse FM Global tables and figures, filter by system type, and jump to the matching form. | frontend/src/app/(main)/fm-global/page.tsx |
| `/fm-global/fm_global_tables` | Reference tables for FM Global sprinkler protection data | frontend/src/app/(main)/fm-global/fm_global_tables/page.tsx |
| `/fm-global/form` | Share your storage and racking details below and we'll estimate the FM Global 8-34 sprinkler configuration for your ASRS — including applicable tables, figures, and protection scheme. | frontend/src/app/(public)/fm-global/form/page.tsx |
| `/fm-global/form/submitted/[submissionId]` | Public confirmation page displaying submitted FM Global sprinkler design request details | frontend/src/app/(public)/fm-global/form/submitted/[submissionId]/page.tsx |
| `/fm-global/submissions` | Admin list of FM Global ASRS sprinkler design form submissions with contact and system specs | frontend/src/app/(main)/fm-global/submissions/page.tsx |
| `/fm-global/submissions/[submissionId]` | Admin detail view of an FM Global form submission with matched tables and lead scoring | frontend/src/app/(main)/fm-global/submissions/[submissionId]/page.tsx |
| `/insights` | Table of AI-generated insights from meetings and documents with type, severity, and status filters | frontend/src/app/(tables)/insights/page.tsx |
| `/intelligence-packets` | Admin dashboard of AI-generated intelligence briefing packets with freshness and review queue tracking | frontend/src/app/(admin)/intelligence-packets/page.tsx |
| `/invoice/add` | Create a new invoice | frontend/src/app/(dashboard)/invoice/add/page.tsx |
| `/invoice/edit` | Edit an existing invoice | frontend/src/app/(dashboard)/invoice/edit/page.tsx |
| `/invoice/list` | List all invoices | frontend/src/app/(dashboard)/invoice/list/page.tsx |
| `/invoice/preview` | Preview an invoice before finalizing | frontend/src/app/(dashboard)/invoice/preview/page.tsx |
| `/knowledge` | Search and browse the knowledge base of project documents and information | frontend/src/app/(main)/knowledge/page.tsx |
| `/knowledge/manage` | Admin table to manage knowledge base entries, documents, and content | frontend/src/app/(main)/knowledge/manage/page.tsx |
| `/manpower` | Cross-project staffing plan persisted from Microsoft Project CSV imports. | frontend/src/app/(main)/manpower/page.tsx |
| `/meeting-segments` | Table of chunked meeting content segments with decisions, tasks, and risks extracted by AI | frontend/src/app/(tables)/meeting-segments/page.tsx |
| `/meetings` | Table of all meetings with summaries, participants, and action items | frontend/src/app/(tables)/meetings/page.tsx |
| `/meetings/[meetingId]` | Meeting detail page with transcript, segments, extracted items, and related meetings | frontend/src/app/(tables)/meetings/[meetingId]/page.tsx |
| `/motion` | Animated text with various presets | frontend/src/app/(admin)/motion/page.tsx |
| `/motion/project-created-preview` | Design preview/sandbox for the project creation success modal | frontend/src/app/(admin)/motion/project-created-preview/page.tsx |
| `/notifications` | You'll be notified about comments, mentions, and project activity. | frontend/src/app/(main)/notifications/page.tsx |
| `/operations-readiness` | Four operating answers: source data, generated tasks, project intelligence packets, and the daily brief. | frontend/src/app/(admin)/operations-readiness/page.tsx |
| `/outlook-draft-feedback` | Review Brandon draft feedback captured from assistant Outlook draft widgets. | frontend/src/app/(admin)/outlook-draft-feedback/page.tsx |
| `/outlook-intake` | Outlook email intake queue for processing new incoming messages | frontend/src/app/(tables)/outlook-intake/page.tsx |
| `/permissions` | Redirect to /user-management for managing user roles and permissions | frontend/src/app/(admin)/permissions/page.tsx |
| `/permissions/users/[personId]` | Redirect to /user-management for individual user permission management | frontend/src/app/(admin)/permissions/users/[personId]/page.tsx |
| `/pipeline` | Monitor and manage document processing pipeline | frontend/src/app/(main)/pipeline/page.tsx |
| `/prime-contracts` | Global table of prime contracts with financial summaries, change orders, and payment status | frontend/src/app/(tables)/prime-contracts/page.tsx |
| `/procore-docs` | Guides and reference for using Procore to manage projects, track costs, and collaborate with your construction teams. | frontend/src/app/(admin)/procore-docs/page.tsx |
| `/procore-docs/[...slug]` | Article page displaying cached Procore help documentation with breadcrumb navigation | frontend/src/app/(admin)/procore-docs/[...slug]/page.tsx |
| `/procore-tools` | Admin table of Procore tools with categories, status, and tutorial/test result tracking | frontend/src/app/(admin)/(procore)/procore-tools/page.tsx |
| `/procore-tools/[slug]` | View detailed Procore tool information including status, implementation, test scenarios, and resources | frontend/src/app/(admin)/(procore)/procore-tools/[slug]/page.tsx |
| `/procore-tracker` | Track Procore features by implementation status, priority, complexity, and estimated hours | frontend/src/app/(admin)/(procore)/procore-tracker/page.tsx |
| `/procore-tracker/[featureId]` | View detailed Procore feature mapped to implementation routes, status, and test coverage | frontend/src/app/(admin)/(procore)/procore-tracker/[featureId]/page.tsx |
| `/product-board` | Dashboard for product planning and feature tracking across the development roadmap | frontend/src/app/(admin)/product-board/page.tsx |
| `/progress-reports` | This will permanently delete the report and its photo selections. This action cannot be undone. | frontend/src/app/(tables)/progress-reports/page.tsx |
| `/project-attribution` | Review communication records that have candidate project matches but were not safe enough to assign automatically. | frontend/src/app/(admin)/project-attribution/page.tsx |
| `/project-documents` | Browse and search all project documents across projects by type, status, folder, and category | frontend/src/app/(tables)/project-documents/page.tsx |
| `/projects` | Portfolio view of all projects with filtering by phase, category, and client, plus export | frontend/src/app/(tables)/projects/page.tsx |
| `/projects-table-demo` | Demo page for the projects table component showcasing table functionality and configurations | frontend/src/app/(admin)/projects-table-demo/page.tsx |
| `/prp-status` | Track Product Readiness Pipeline (PRP) status for tools across specification, audit, and validation stages | frontend/src/app/(admin)/prp-status/page.tsx |
| `/rag` | Items successfully synced and items that failed, per source, per day. Sourced live from source_sync_runs. | frontend/src/app/(admin)/rag/page.tsx |
| `/rag-eval` | Retrieval quality metrics, answer quality scores, and eval runners | frontend/src/app/(admin)/rag-eval/page.tsx |
| `/redoc` | Explore auth flows, schema details, and every frontend/backend endpoint in one place. | frontend/src/app/(admin)/redoc/page.tsx |
| `/settings` | Redirect to user profile settings for account and preference management | frontend/src/app/(main)/settings/page.tsx |
| `/settings/account` | Manage company account profile, logo, address, billing plan, seats, and renewal information | frontend/src/app/(main)/settings/account/page.tsx |
| `/settings/audit` | Audit events will appear here as actions are taken in the system. | frontend/src/app/(main)/settings/audit/page.tsx |
| `/settings/memory` | Review what Alleato AI remembers and flag anything that should change future behavior. | frontend/src/app/(main)/settings/memory/page.tsx |
| `/settings/preferences` | Redirect to user profile settings for account and preference management | frontend/src/app/(main)/settings/preferences/page.tsx |
| `/settings/profile` | View and edit user profile, avatar, account details, role, and integration connections | frontend/src/app/(main)/settings/profile/page.tsx |
| `/settings/security` | Require a second verification step when members sign in. Applies to all workspace members. | frontend/src/app/(main)/settings/security/page.tsx |
| `/site-map` | Admin inventory of all application pages with access levels and permission module mapping | frontend/src/app/(admin)/site-map/page.tsx |
| `/source-sync` | Operational health for Microsoft Graph, Fireflies, vectorization, task extraction, compiler work, and intelligence packet readiness. | frontend/src/app/(admin)/source-sync/page.tsx |
| `/stats` | Daily activity summary including meetings, tasks, emails, documents, and project activity breakdown | frontend/src/app/(main)/stats/page.tsx |
| `/support-articles` | Browse Procore support articles with chunking stats and embedding coverage for the knowledge base | frontend/src/app/(admin)/(procore)/support-articles/page.tsx |
| `/support-articles/[articleId]` | This article has not been crawled yet. | frontend/src/app/(admin)/(procore)/support-articles/[articleId]/page.tsx |
| `/table-pages` | Admin table explorer dashboard listing all registered database tables for browsing and management | frontend/src/app/(admin)/table-pages/page.tsx |
| `/table-pages/[table]` | View, search, sort, and filter records from any database table with multiple view options | frontend/src/app/(admin)/table-pages/[table]/page.tsx |
| `/table-pages/[table]/[recordId]` | View and edit a single database record with inline form and field visibility controls | frontend/src/app/(admin)/table-pages/[table]/[recordId]/page.tsx |
| `/table-pages/[table]/new` | Create a new record in a database table with auto-generated form fields and validation | frontend/src/app/(admin)/table-pages/[table]/new/page.tsx |
| `/table-v2` | Manage companies, clients, contacts, users, and employees across your organization | frontend/src/app/(admin)/table-v2/page.tsx |
| `/tables-directory` | Browse and access all data tables in the system. | frontend/src/app/(admin)/tables-directory/page.tsx |
| `/task-training` | Admin page to review and manage good vs bad task generation feedback for AI model training | frontend/src/app/(admin)/task-training/page.tsx |
| `/tasks` | Task inbox for viewing and managing all generated and assigned tasks with filtering | frontend/src/app/(tables)/tasks/page.tsx |
| `/team-chat` | Team communication and chat interface for project collaboration and messaging | frontend/src/app/(main)/team-chat/page.tsx |
| `/teams-conversations` | Review compiled Microsoft Teams conversation threads, attribution, and project-linked source detail. | frontend/src/app/(tables)/teams-conversations/page.tsx |
| `/teams-conversations/[sourceDocumentId]` | Compiled Microsoft Teams conversation thread detail for review, attribution, and downstream intelligence workflows. | frontend/src/app/(tables)/teams-conversations/[sourceDocumentId]/page.tsx |
| `/template/form-standard` | Fill out the form below to create a new item | frontend/src/app/(admin)/template/form-standard/page.tsx |
| `/template/form-template` | Example template showing every standard form field pattern | frontend/src/app/(admin)/template/form-template/page.tsx |
| `/test-cases` | Supabase test_cases records | frontend/src/app/(admin)/test-cases/page.tsx |
| `/test-matrix` | Manual test runner with pass/fail marking, notes, screenshots, and keyboard shortcuts | frontend/src/app/(admin)/test-matrix/page.tsx |
| `/testing` | Smoke and feature test suites for every tool. | frontend/src/app/(admin)/testing/page.tsx |
| `/testing/[tool]` | Browse test cases or start a new run for this tool. | frontend/src/app/(admin)/testing/[tool]/page.tsx |
| `/testing/[tool]/cases/[caseId]` | Read-only view of a test case with context, setup, steps, and expected result details | frontend/src/app/(admin)/testing/[tool]/cases/[caseId]/page.tsx |
| `/testing/parity` | Procore feature parity report showing working, broken, and missing features by tool priority | frontend/src/app/(admin)/testing/parity/page.tsx |
| `/testing/runs` | All in-progress and completed test runs across every tool. | frontend/src/app/(admin)/testing/runs/page.tsx |
| `/testing/runs/[runId]` | Test run dashboard with split-pane case list, result details, videos, and GitHub issue filing | frontend/src/app/(admin)/testing/runs/[runId]/page.tsx |
| `/testing/runs/[runId]/case/[caseNumber]` | Redirect to parent test run page for consistent case navigation | frontend/src/app/(admin)/testing/runs/[runId]/case/[caseNumber]/page.tsx |
| `/tools` | Catalog of all Procore tools grouped by category with status badges and external links | frontend/src/app/(admin)/tools/page.tsx |
| `/updates` | A running log of features added, improved, and fixed across all areas of the platform. | frontend/src/app/(admin)/updates/page.tsx |
| `/user-management` | Manage app users, project access, and permission templates with granular capability controls | frontend/src/app/(admin)/user-management/page.tsx |
| `/user-management/users/[personId]` | User Management rejected this request. Admin permission is required before this profile can load. | frontend/src/app/(admin)/user-management/users/[personId]/page.tsx |

## API Endpoints (661)

| Endpoint | Methods | File |
|----------|---------|------|
| `/api/accounting/ap-invoices` | GET | frontend/src/app/api/accounting/ap-invoices/route.ts |
| `/api/accounting/ap-payments` | GET | frontend/src/app/api/accounting/ap-payments/route.ts |
| `/api/accounting/bills` | GET | frontend/src/app/api/accounting/bills/route.ts |
| `/api/accounting/checks` | GET | frontend/src/app/api/accounting/checks/route.ts |
| `/api/accounting/dashboard` | GET | frontend/src/app/api/accounting/dashboard/route.ts |
| `/api/accounting/finance-spend` | GET | frontend/src/app/api/accounting/finance-spend/route.ts |
| `/api/accounting/finance-spend/rules` | GET | frontend/src/app/api/accounting/finance-spend/rules/route.ts |
| `/api/accounting/finance-spend/rules/[ruleId]` | PATCH | frontend/src/app/api/accounting/finance-spend/rules/[ruleId]/route.ts |
| `/api/accounting/invoices` | GET | frontend/src/app/api/accounting/invoices/route.ts |
| `/api/accounting/payments` | GET | frontend/src/app/api/accounting/payments/route.ts |
| `/api/accounting/projects` | GET | frontend/src/app/api/accounting/projects/route.ts |
| `/api/accounting/sop-backlog` | GET, POST | frontend/src/app/api/accounting/sop-backlog/route.ts |
| `/api/accounting/sop-backlog/[sopId]` | PATCH | frontend/src/app/api/accounting/sop-backlog/[sopId]/route.ts |
| `/api/accounting/sync` | POST | frontend/src/app/api/accounting/sync/route.ts |
| `/api/accounting/wip` | GET | frontend/src/app/api/accounting/wip/route.ts |
| `/api/admin/acumatica-outbound-logs` | GET | frontend/src/app/api/admin/acumatica-outbound-logs/route.ts |
| `/api/admin/ai-agents` | GET, PATCH | frontend/src/app/api/admin/ai-agents/route.ts |
| `/api/admin/ai-assistant/prompt-diagnostics` | POST | frontend/src/app/api/admin/ai-assistant/prompt-diagnostics/route.ts |
| `/api/admin/ai-learning-promotions` | GET, POST | frontend/src/app/api/admin/ai-learning-promotions/route.ts |
| `/api/admin/ai-learning-promotions/activity` | GET | frontend/src/app/api/admin/ai-learning-promotions/activity/route.ts |
| `/api/admin/ai-learning-promotions/preview` | POST | frontend/src/app/api/admin/ai-learning-promotions/preview/route.ts |
| `/api/admin/ai-learning-promotions/run` | POST | frontend/src/app/api/admin/ai-learning-promotions/run/route.ts |
| `/api/admin/ai-learning-promotions/stats` | GET | frontend/src/app/api/admin/ai-learning-promotions/stats/route.ts |
| `/api/admin/ai-skills` | GET, PATCH | frontend/src/app/api/admin/ai-skills/route.ts |
| `/api/admin/ai-system-health` | GET | frontend/src/app/api/admin/ai-system-health/route.ts |
| `/api/admin/ai-work-runs` | GET | frontend/src/app/api/admin/ai-work-runs/route.ts |
| `/api/admin/analytics` | GET | frontend/src/app/api/admin/analytics/route.ts |
| `/api/admin/app-errors/[groupId]` | GET, POST, PATCH | frontend/src/app/api/admin/app-errors/[groupId]/route.ts |
| `/api/admin/company-context` | GET, PUT | frontend/src/app/api/admin/company-context/route.ts |
| `/api/admin/cron/daily-flags` | POST | frontend/src/app/api/admin/cron/daily-flags/route.ts |
| `/api/admin/cron/progress-reports` | POST | frontend/src/app/api/admin/cron/progress-reports/route.ts |
| `/api/admin/db-inventory/refresh` | POST | frontend/src/app/api/admin/db-inventory/refresh/route.ts |
| `/api/admin/deep-research/archive` | GET | frontend/src/app/api/admin/deep-research/archive/route.ts |
| `/api/admin/eval-runs` | GET | frontend/src/app/api/admin/eval-runs/route.ts |
| `/api/admin/feedback` | GET, POST, PUT, PATCH, DELETE | frontend/src/app/api/admin/feedback/route.ts |
| `/api/admin/feedback/board` | GET | frontend/src/app/api/admin/feedback/board/route.ts |
| `/api/admin/feedback/board/[itemId]` | PATCH, DELETE | frontend/src/app/api/admin/feedback/board/[itemId]/route.ts |
| `/api/admin/feedback/board/[itemId]/comments` | GET, POST | frontend/src/app/api/admin/feedback/board/[itemId]/comments/route.ts |
| `/api/admin/feedback/board/create` | POST | frontend/src/app/api/admin/feedback/board/create/route.ts |
| `/api/admin/feedback/board/upload` | POST | frontend/src/app/api/admin/feedback/board/upload/route.ts |
| `/api/admin/feedback/comments` | GET, POST | frontend/src/app/api/admin/feedback/comments/route.ts |
| `/api/admin/feedback/crawl` | POST | frontend/src/app/api/admin/feedback/crawl/route.ts |
| `/api/admin/feedback/dispatch` | POST | frontend/src/app/api/admin/feedback/dispatch/route.ts |
| `/api/admin/feedback/github-comments` | GET | frontend/src/app/api/admin/feedback/github-comments/route.ts |
| `/api/admin/feedback/recording` | POST, DELETE | frontend/src/app/api/admin/feedback/recording/route.ts |
| `/api/admin/feedback/tools` | GET, POST | frontend/src/app/api/admin/feedback/tools/route.ts |
| `/api/admin/intelligence-packets` | GET | frontend/src/app/api/admin/intelligence-packets/route.ts |
| `/api/admin/operations-readiness/status` | GET | frontend/src/app/api/admin/operations-readiness/status/route.ts |
| `/api/admin/owner-briefing/send-test` | POST | frontend/src/app/api/admin/owner-briefing/send-test/route.ts |
| `/api/admin/portfolio-brief/preview` | POST | frontend/src/app/api/admin/portfolio-brief/preview/route.ts |
| `/api/admin/project-attribution-candidates` | GET, POST | frontend/src/app/api/admin/project-attribution-candidates/route.ts |
| `/api/admin/project-attribution-rules` | GET, POST, PATCH | frontend/src/app/api/admin/project-attribution-rules/route.ts |
| `/api/admin/prp-status` | GET | frontend/src/app/api/admin/prp-status/route.ts |
| `/api/admin/rag-eval/results` | GET | frontend/src/app/api/admin/rag-eval/results/route.ts |
| `/api/admin/rag-eval/run` | POST | frontend/src/app/api/admin/rag-eval/run/route.ts |
| `/api/admin/rag-snapshots` | GET | frontend/src/app/api/admin/rag-snapshots/route.ts |
| `/api/admin/set-admin-status` | POST | frontend/src/app/api/admin/set-admin-status/route.ts |
| `/api/admin/source-sync/graph-embed` | POST | frontend/src/app/api/admin/source-sync/graph-embed/route.ts |
| `/api/admin/source-sync/graph-sync` | POST | frontend/src/app/api/admin/source-sync/graph-sync/route.ts |
| `/api/admin/source-sync/onedrive-project-backfill` | POST | frontend/src/app/api/admin/source-sync/onedrive-project-backfill/route.ts |
| `/api/admin/source-sync/recompute` | POST | frontend/src/app/api/admin/source-sync/recompute/route.ts |
| `/api/admin/source-sync/status` | GET | frontend/src/app/api/admin/source-sync/status/route.ts |
| `/api/admin/source-sync/summary` | GET, POST | frontend/src/app/api/admin/source-sync/summary/route.ts |
| `/api/admin/teams/seed-conversation` | POST | frontend/src/app/api/admin/teams/seed-conversation/route.ts |
| `/api/agentation` | POST, PATCH | frontend/src/app/api/agentation/route.ts |
| `/api/agentation/inbox` | GET, POST, PATCH | frontend/src/app/api/agentation/inbox/route.ts |
| `/api/ai-assistant/avatar/conversation` | POST | frontend/src/app/api/ai-assistant/avatar/conversation/route.ts |
| `/api/ai-assistant/chat` | POST | frontend/src/app/api/ai-assistant/chat/route.ts |
| `/api/ai-assistant/conversations` | GET, POST | frontend/src/app/api/ai-assistant/conversations/route.ts |
| `/api/ai-assistant/conversations/[sessionId]` | PATCH, DELETE | frontend/src/app/api/ai-assistant/conversations/[sessionId]/route.ts |
| `/api/ai-assistant/email-draft-feedback` | POST | frontend/src/app/api/ai-assistant/email-draft-feedback/route.ts |
| `/api/ai-assistant/email-importance-feedback` | GET, POST | frontend/src/app/api/ai-assistant/email-importance-feedback/route.ts |
| `/api/ai-assistant/feedback` | POST | frontend/src/app/api/ai-assistant/feedback/route.ts |
| `/api/ai-assistant/marketing/assets` | POST | frontend/src/app/api/ai-assistant/marketing/assets/route.ts |
| `/api/ai-assistant/marketing/assets/[assetId]` | PATCH | frontend/src/app/api/ai-assistant/marketing/assets/[assetId]/route.ts |
| `/api/ai-assistant/marketing/calendar` | GET, POST | frontend/src/app/api/ai-assistant/marketing/calendar/route.ts |
| `/api/ai-assistant/marketing/calendar/[calendarItemId]` | PATCH | frontend/src/app/api/ai-assistant/marketing/calendar/[calendarItemId]/route.ts |
| `/api/ai-assistant/memories` | GET, POST, DELETE | frontend/src/app/api/ai-assistant/memories/route.ts |
| `/api/ai-assistant/memories/[memoryId]` | PATCH, DELETE | frontend/src/app/api/ai-assistant/memories/[memoryId]/route.ts |
| `/api/ai-assistant/memories/[memoryId]/feedback` | POST | frontend/src/app/api/ai-assistant/memories/[memoryId]/feedback/route.ts |
| `/api/ai-assistant/messages/[sessionId]` | GET | frontend/src/app/api/ai-assistant/messages/[sessionId]/route.ts |
| `/api/ai-assistant/packet-card-feedback` | POST | frontend/src/app/api/ai-assistant/packet-card-feedback/route.ts |
| `/api/ai-assistant/skills` | GET | frontend/src/app/api/ai-assistant/skills/route.ts |
| `/api/ai-assistant/skills/[skillId]/feedback` | POST | frontend/src/app/api/ai-assistant/skills/[skillId]/feedback/route.ts |
| `/api/ai-assistant/speech` | POST | frontend/src/app/api/ai-assistant/speech/route.ts |
| `/api/ai-assistant/task-feedback` | POST, PATCH | frontend/src/app/api/ai-assistant/task-feedback/route.ts |
| `/api/ai-assistant/teach` | POST | frontend/src/app/api/ai-assistant/teach/route.ts |
| `/api/ai-assistant/timeline` | GET | frontend/src/app/api/ai-assistant/timeline/route.ts |
| `/api/ai-assistant/usage-stats` | GET | frontend/src/app/api/ai-assistant/usage-stats/route.ts |
| `/api/ai-assistant/workspace` | GET, POST | frontend/src/app/api/ai-assistant/workspace/route.ts |
| `/api/ai-assistant/workspace/[artifactId]` | GET, PATCH, DELETE | frontend/src/app/api/ai-assistant/workspace/[artifactId]/route.ts |
| `/api/ai-operator/presentation-preview` | POST | frontend/src/app/api/ai-operator/presentation-preview/route.ts |
| `/api/app-error-events` | POST | frontend/src/app/api/app-error-events/route.ts |
| `/api/assignment-inbox` | GET | frontend/src/app/api/assignment-inbox/route.ts |
| `/api/assignment-inbox/assign` | POST | frontend/src/app/api/assignment-inbox/assign/route.ts |
| `/api/auth/admin-check` | GET | frontend/src/app/api/auth/admin-check/route.ts |
| `/api/auth/forgot-password` | POST | frontend/src/app/api/auth/forgot-password/route.ts |
| `/api/auth/post-login-redirect` | GET | frontend/src/app/api/auth/post-login-redirect/route.ts |
| `/api/auth/signup` | POST | frontend/src/app/api/auth/signup/route.ts |
| `/api/avatar/[personId]` | GET | frontend/src/app/api/avatar/[personId]/route.ts |
| `/api/bot/[platform]` | POST | frontend/src/app/api/bot/[platform]/route.ts |
| `/api/bot/proactive/teams` | POST | frontend/src/app/api/bot/proactive/teams/route.ts |
| `/api/bot/teams` | POST | frontend/src/app/api/bot/teams/route.ts |
| `/api/bot/teams/notify` | POST | frontend/src/app/api/bot/teams/notify/route.ts |
| `/api/clients` | GET, POST | frontend/src/app/api/clients/route.ts |
| `/api/collaboration/comments` | GET, POST | frontend/src/app/api/collaboration/comments/route.ts |
| `/api/collaboration/notifications` | GET, PATCH | frontend/src/app/api/collaboration/notifications/route.ts |
| `/api/commitments` | GET, POST | frontend/src/app/api/commitments/route.ts |
| `/api/commitments/[commitmentId]` | GET, PUT, PATCH, DELETE | frontend/src/app/api/commitments/[commitmentId]/route.ts |
| `/api/commitments/[commitmentId]/advanced-settings` | GET, PUT | frontend/src/app/api/commitments/[commitmentId]/advanced-settings/route.ts |
| `/api/commitments/[commitmentId]/change-orders` | GET, POST | frontend/src/app/api/commitments/[commitmentId]/change-orders/route.ts |
| `/api/commitments/[commitmentId]/change-orders/[changeOrderId]` | GET, PUT, DELETE | frontend/src/app/api/commitments/[commitmentId]/change-orders/[changeOrderId]/route.ts |
| `/api/commitments/[commitmentId]/change-orders/[changeOrderId]/approve` | POST | frontend/src/app/api/commitments/[commitmentId]/change-orders/[changeOrderId]/approve/route.ts |
| `/api/commitments/[commitmentId]/email` | POST | frontend/src/app/api/commitments/[commitmentId]/email/route.ts |
| `/api/commitments/[commitmentId]/emails` | GET | frontend/src/app/api/commitments/[commitmentId]/emails/route.ts |
| `/api/commitments/[commitmentId]/export` | POST | frontend/src/app/api/commitments/[commitmentId]/export/route.ts |
| `/api/commitments/[commitmentId]/history` | GET | frontend/src/app/api/commitments/[commitmentId]/history/route.ts |
| `/api/commitments/[commitmentId]/invoices` | GET, POST | frontend/src/app/api/commitments/[commitmentId]/invoices/route.ts |
| `/api/commitments/[commitmentId]/permanent-delete` | DELETE | frontend/src/app/api/commitments/[commitmentId]/permanent-delete/route.ts |
| `/api/commitments/[commitmentId]/related-items` | GET, POST, DELETE | frontend/src/app/api/commitments/[commitmentId]/related-items/route.ts |
| `/api/commitments/[commitmentId]/restore` | POST | frontend/src/app/api/commitments/[commitmentId]/restore/route.ts |
| `/api/commitments/[commitmentId]/rfqs` | GET | frontend/src/app/api/commitments/[commitmentId]/rfqs/route.ts |
| `/api/companies` | GET, POST | frontend/src/app/api/companies/route.ts |
| `/api/companies/[companyId]/bid-history` | GET | frontend/src/app/api/companies/[companyId]/bid-history/route.ts |
| `/api/company/logo` | POST | frontend/src/app/api/company/logo/route.ts |
| `/api/contacts` | GET, POST | frontend/src/app/api/contacts/route.ts |
| `/api/cron/acumatica-sync` | POST | frontend/src/app/api/cron/acumatica-sync/route.ts |
| `/api/cron/attribution-rules` | POST | frontend/src/app/api/cron/attribution-rules/route.ts |
| `/api/cron/daily-flags` | POST | frontend/src/app/api/cron/daily-flags/route.ts |
| `/api/cron/decay-memories` | POST | frontend/src/app/api/cron/decay-memories/route.ts |
| `/api/cron/executive-daily-brief` | GET, POST | frontend/src/app/api/cron/executive-daily-brief/route.ts |
| `/api/cron/graph-embed` | POST | frontend/src/app/api/cron/graph-embed/route.ts |
| `/api/cron/graph-sync` | POST | frontend/src/app/api/cron/graph-sync/route.ts |
| `/api/cron/progress-reports` | POST | frontend/src/app/api/cron/progress-reports/route.ts |
| `/api/database-tables-catalog/[schemaName]/[tableName]` | PATCH | frontend/src/app/api/database-tables-catalog/[schemaName]/[tableName]/route.ts |
| `/api/dev-panel/annotations` | GET | frontend/src/app/api/dev-panel/annotations/route.ts |
| `/api/dev-panel/comments/[feature]` | GET, POST | frontend/src/app/api/dev-panel/comments/[feature]/route.ts |
| `/api/dev-panel/feedback/[feature]` | GET | frontend/src/app/api/dev-panel/feedback/[feature]/route.ts |
| `/api/dev-panel/gaps/[feature]` | GET | frontend/src/app/api/dev-panel/gaps/[feature]/route.ts |
| `/api/dev-panel/spec/[feature]` | GET | frontend/src/app/api/dev-panel/spec/[feature]/route.ts |
| `/api/dev-tools/check-routes` | GET | frontend/src/app/api/dev-tools/check-routes/route.ts |
| `/api/dev-tools/clear-cache` | POST | frontend/src/app/api/dev-tools/clear-cache/route.ts |
| `/api/dev-tools/regenerate-types` | POST | frontend/src/app/api/dev-tools/regenerate-types/route.ts |
| `/api/dev/annotate` | GET, POST, PATCH | frontend/src/app/api/dev/annotate/route.ts |
| `/api/dev/make-admin` | GET, POST | frontend/src/app/api/dev/make-admin/route.ts |
| `/api/dev/schema` | GET, POST | frontend/src/app/api/dev/schema/route.ts |
| `/api/dev/test-email` | GET, POST | frontend/src/app/api/dev/test-email/route.ts |
| `/api/dev/test-results/[resultId]` | PATCH | frontend/src/app/api/dev/test-results/[resultId]/route.ts |
| `/api/dev/test-runs` | POST | frontend/src/app/api/dev/test-runs/route.ts |
| `/api/dev/test-runs/[runId]` | GET | frontend/src/app/api/dev/test-runs/[runId]/route.ts |
| `/api/dev/test-suites/[tool]` | GET | frontend/src/app/api/dev/test-suites/[tool]/route.ts |
| `/api/dev/violations` | GET, POST, PATCH | frontend/src/app/api/dev/violations/route.ts |
| `/api/directory/companies` | GET, POST | frontend/src/app/api/directory/companies/route.ts |
| `/api/directory/companies/[companyId]` | GET, PATCH, DELETE | frontend/src/app/api/directory/companies/[companyId]/route.ts |
| `/api/directory/companies/[companyId]/add-to-project` | POST | frontend/src/app/api/directory/companies/[companyId]/add-to-project/route.ts |
| `/api/directory/companies/[companyId]/details` | GET | frontend/src/app/api/directory/companies/[companyId]/details/route.ts |
| `/api/directory/contacts/[contactId]` | PATCH | frontend/src/app/api/directory/contacts/[contactId]/route.ts |
| `/api/directory/contacts/table` | GET | frontend/src/app/api/directory/contacts/table/route.ts |
| `/api/directory/employees/[employeeId]` | PATCH | frontend/src/app/api/directory/employees/[employeeId]/route.ts |
| `/api/directory/employees/table` | GET | frontend/src/app/api/directory/employees/table/route.ts |
| `/api/directory/project-companies` | GET | frontend/src/app/api/directory/project-companies/route.ts |
| `/api/directory/prospects` | GET | frontend/src/app/api/directory/prospects/route.ts |
| `/api/directory/prospects/[prospectId]` | DELETE | frontend/src/app/api/directory/prospects/[prospectId]/route.ts |
| `/api/directory/vendors` | GET | frontend/src/app/api/directory/vendors/route.ts |
| `/api/directory/vendors/[vendorId]` | GET, PATCH, DELETE | frontend/src/app/api/directory/vendors/[vendorId]/route.ts |
| `/api/docs-search` | POST | frontend/src/app/api/docs-search/route.ts |
| `/api/docs/check` | GET | frontend/src/app/api/docs/check/route.ts |
| `/api/document-center/[recordType]/[recordId]/email` | POST | frontend/src/app/api/document-center/[recordType]/[recordId]/email/route.ts |
| `/api/document-center/[recordType]/[recordId]/pdf` | GET | frontend/src/app/api/document-center/[recordType]/[recordId]/pdf/route.ts |
| `/api/document-center/[recordType]/[recordId]/recipients` | GET | frontend/src/app/api/document-center/[recordType]/[recordId]/recipients/route.ts |
| `/api/document-metadata/[docId]/content` | GET | frontend/src/app/api/document-metadata/[docId]/content/route.ts |
| `/api/document-picker/attach` | POST | frontend/src/app/api/document-picker/attach/route.ts |
| `/api/document-picker/linked` | GET, PATCH, DELETE | frontend/src/app/api/document-picker/linked/route.ts |
| `/api/document-picker/register` | POST | frontend/src/app/api/document-picker/register/route.ts |
| `/api/document-picker/types` | GET | frontend/src/app/api/document-picker/types/route.ts |
| `/api/document-picker/upload` | POST | frontend/src/app/api/document-picker/upload/route.ts |
| `/api/document-picker/upload-url` | POST | frontend/src/app/api/document-picker/upload-url/route.ts |
| `/api/documents/[docId]/assign-project` | PATCH | frontend/src/app/api/documents/[docId]/assign-project/route.ts |
| `/api/documents/[docId]/tasks` | POST | frontend/src/app/api/documents/[docId]/tasks/route.ts |
| `/api/documents/bulk-update` | PATCH | frontend/src/app/api/documents/bulk-update/route.ts |
| `/api/documents/status` | GET | frontend/src/app/api/documents/status/route.ts |
| `/api/documents/trigger-pipeline` | GET, POST | frontend/src/app/api/documents/trigger-pipeline/route.ts |
| `/api/documents/upload` | POST | frontend/src/app/api/documents/upload/route.ts |
| `/api/email-attachments` | GET | frontend/src/app/api/email-attachments/route.ts |
| `/api/email-attachments/[attachmentId]` | PATCH, DELETE | frontend/src/app/api/email-attachments/[attachmentId]/route.ts |
| `/api/email-attachments/[attachmentId]/download` | GET | frontend/src/app/api/email-attachments/[attachmentId]/download/route.ts |
| `/api/email-filter-rules` | GET, POST | frontend/src/app/api/email-filter-rules/route.ts |
| `/api/email-filter-rules/[ruleId]` | PATCH, DELETE | frontend/src/app/api/email-filter-rules/[ruleId]/route.ts |
| `/api/email-inbox` | GET | frontend/src/app/api/email-inbox/route.ts |
| `/api/email-inbox/[emailId]` | PATCH | frontend/src/app/api/email-inbox/[emailId]/route.ts |
| `/api/email-inbox/[emailId]/assistant-review` | POST | frontend/src/app/api/email-inbox/[emailId]/assistant-review/route.ts |
| `/api/email-inbox/[emailId]/draft-reply` | POST | frontend/src/app/api/email-inbox/[emailId]/draft-reply/route.ts |
| `/api/email-inbox/attachments/[attachmentId]` | PATCH | frontend/src/app/api/email-inbox/attachments/[attachmentId]/route.ts |
| `/api/emails` | GET | frontend/src/app/api/emails/route.ts |
| `/api/employees` | GET | frontend/src/app/api/employees/route.ts |
| `/api/entity-links` | GET, POST | frontend/src/app/api/entity-links/route.ts |
| `/api/entity-links/[linkId]` | DELETE | frontend/src/app/api/entity-links/[linkId]/route.ts |
| `/api/entity-links/search` | GET | frontend/src/app/api/entity-links/search/route.ts |
| `/api/estimates` | GET | frontend/src/app/api/estimates/route.ts |
| `/api/estimates/benchmark` | GET | frontend/src/app/api/estimates/benchmark/route.ts |
| `/api/estimates/gc-templates` | GET, POST | frontend/src/app/api/estimates/gc-templates/route.ts |
| `/api/estimates/stats` | GET | frontend/src/app/api/estimates/stats/route.ts |
| `/api/estimates/suggest-subs` | GET | frontend/src/app/api/estimates/suggest-subs/route.ts |
| `/api/executive/brandon-daily-update` | GET | frontend/src/app/api/executive/brandon-daily-update/route.ts |
| `/api/executive/brandon-daily-update/widget` | — | frontend/src/app/api/executive/brandon-daily-update/widget/route.ts |
| `/api/executive/daily-brief` | GET | frontend/src/app/api/executive/daily-brief/route.ts |
| `/api/executive/daily-brief/history` | GET | frontend/src/app/api/executive/daily-brief/history/route.ts |
| `/api/executive/daily-brief/preview-teams` | POST | frontend/src/app/api/executive/daily-brief/preview-teams/route.ts |
| `/api/executive/daily-brief/send-teams` | POST | frontend/src/app/api/executive/daily-brief/send-teams/route.ts |
| `/api/executive/daily-brief/widget` | GET | frontend/src/app/api/executive/daily-brief/widget/route.ts |
| `/api/executive/intelligence-brief` | GET | frontend/src/app/api/executive/intelligence-brief/route.ts |
| `/api/executive/intelligence-stats` | GET | frontend/src/app/api/executive/intelligence-stats/route.ts |
| `/api/files/[docId]/download` | GET | frontend/src/app/api/files/[docId]/download/route.ts |
| `/api/files/read` | GET | frontend/src/app/api/files/read/route.ts |
| `/api/files/table` | GET | frontend/src/app/api/files/table/route.ts |
| `/api/financial-insights/alerts` | GET | frontend/src/app/api/financial-insights/alerts/route.ts |
| `/api/financial-insights/cross-reference` | POST | frontend/src/app/api/financial-insights/cross-reference/route.ts |
| `/api/financial-insights/scan` | POST | frontend/src/app/api/financial-insights/scan/route.ts |
| `/api/fm-global/submissions` | GET | frontend/src/app/api/fm-global/submissions/route.ts |
| `/api/fm-global/submissions/[submissionId]` | DELETE | frontend/src/app/api/fm-global/submissions/[submissionId]/route.ts |
| `/api/health` | GET | frontend/src/app/api/health/route.ts |
| `/api/initiative-cards` | GET, POST, PATCH | frontend/src/app/api/initiative-cards/route.ts |
| `/api/initiative-cards/[cardId]` | GET, PATCH, DELETE | frontend/src/app/api/initiative-cards/[cardId]/route.ts |
| `/api/initiative-cards/[cardId]/dispatch` | POST | frontend/src/app/api/initiative-cards/[cardId]/dispatch/route.ts |
| `/api/insight-cards/[cardId]/acknowledge` | GET | frontend/src/app/api/insight-cards/[cardId]/acknowledge/route.ts |
| `/api/insight-cards/[cardId]/snooze` | GET | frontend/src/app/api/insight-cards/[cardId]/snooze/route.ts |
| `/api/invoices` | GET, POST | frontend/src/app/api/invoices/route.ts |
| `/api/knowledge` | GET, DELETE | frontend/src/app/api/knowledge/route.ts |
| `/api/knowledge/categories` | GET | frontend/src/app/api/knowledge/categories/route.ts |
| `/api/knowledge/signed-url` | GET | frontend/src/app/api/knowledge/signed-url/route.ts |
| `/api/knowledge/sync-sharepoint` | POST | frontend/src/app/api/knowledge/sync-sharepoint/route.ts |
| `/api/knowledge/upload` | POST | frontend/src/app/api/knowledge/upload/route.ts |
| `/api/manpower` | GET | frontend/src/app/api/manpower/route.ts |
| `/api/manpower/assignments/[assignmentId]` | PATCH | frontend/src/app/api/manpower/assignments/[assignmentId]/route.ts |
| `/api/manpower/import` | POST | frontend/src/app/api/manpower/import/route.ts |
| `/api/meetings/[meetingId]` | GET | frontend/src/app/api/meetings/[meetingId]/route.ts |
| `/api/monitoring/dashboard` | GET | frontend/src/app/api/monitoring/dashboard/route.ts |
| `/api/monitoring/notify` | GET, POST | frontend/src/app/api/monitoring/notify/route.ts |
| `/api/monitoring/todo-integration` | GET, POST | frontend/src/app/api/monitoring/todo-integration/route.ts |
| `/api/monitoring/websocket` | GET, POST, OPTIONS | frontend/src/app/api/monitoring/websocket/route.ts |
| `/api/notes/highlight` | POST | frontend/src/app/api/notes/highlight/route.ts |
| `/api/notifications/trigger` | POST | frontend/src/app/api/notifications/trigger/route.ts |
| `/api/og/fetch` | GET | frontend/src/app/api/og/fetch/route.ts |
| `/api/og/proxy` | GET | frontend/src/app/api/og/proxy/route.ts |
| `/api/outlook-intake` | GET | frontend/src/app/api/outlook-intake/route.ts |
| `/api/outlook-intake/[intakeId]` | PATCH | frontend/src/app/api/outlook-intake/[intakeId]/route.ts |
| `/api/outlook-intake/attachments/[attachmentId]/download` | GET | frontend/src/app/api/outlook-intake/attachments/[attachmentId]/download/route.ts |
| `/api/outlook-intake/reclassify` | POST | frontend/src/app/api/outlook-intake/reclassify/route.ts |
| `/api/outlook-skip-audit` | GET | frontend/src/app/api/outlook-skip-audit/route.ts |
| `/api/people` | GET, POST | frontend/src/app/api/people/route.ts |
| `/api/permissions/page-access` | GET, PUT | frontend/src/app/api/permissions/page-access/route.ts |
| `/api/permissions/templates` | GET, POST | frontend/src/app/api/permissions/templates/route.ts |
| `/api/permissions/templates/[templateId]` | PUT, DELETE | frontend/src/app/api/permissions/templates/[templateId]/route.ts |
| `/api/permissions/users` | GET, POST | frontend/src/app/api/permissions/users/route.ts |
| `/api/permissions/users/[personId]` | DELETE | frontend/src/app/api/permissions/users/[personId]/route.ts |
| `/api/permissions/users/[personId]/company-template` | PUT, DELETE | frontend/src/app/api/permissions/users/[personId]/company-template/route.ts |
| `/api/permissions/users/[personId]/granular-overrides` | PUT, DELETE | frontend/src/app/api/permissions/users/[personId]/granular-overrides/route.ts |
| `/api/permissions/users/reconcile-links` | POST | frontend/src/app/api/permissions/users/reconcile-links/route.ts |
| `/api/procore-docs/ask` | POST | frontend/src/app/api/procore-docs/ask/route.ts |
| `/api/procore-docs/chat` | POST | frontend/src/app/api/procore-docs/chat/route.ts |
| `/api/procore-screenshots/[feature]` | GET | frontend/src/app/api/procore-screenshots/[feature]/route.ts |
| `/api/procore-screenshots/[feature]/[filename]` | GET | frontend/src/app/api/procore-screenshots/[feature]/[filename]/route.ts |
| `/api/profile/avatar` | POST, DELETE | frontend/src/app/api/profile/avatar/route.ts |
| `/api/progress-reports` | GET | frontend/src/app/api/progress-reports/route.ts |
| `/api/project-documents` | GET | frontend/src/app/api/project-documents/route.ts |
| `/api/projects` | GET, POST | frontend/src/app/api/projects/route.ts |
| `/api/projects/[projectId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/route.ts |
| `/api/projects/[projectId]/billing-periods` | GET, POST | frontend/src/app/api/projects/[projectId]/billing-periods/route.ts |
| `/api/projects/[projectId]/budget` | GET, POST | frontend/src/app/api/projects/[projectId]/budget/route.ts |
| `/api/projects/[projectId]/budget-changes` | GET, POST | frontend/src/app/api/projects/[projectId]/budget-changes/route.ts |
| `/api/projects/[projectId]/budget-codes` | GET, POST | frontend/src/app/api/projects/[projectId]/budget-codes/route.ts |
| `/api/projects/[projectId]/budget-codes/activate` | POST | frontend/src/app/api/projects/[projectId]/budget-codes/activate/route.ts |
| `/api/projects/[projectId]/budget-codes/bulk` | PUT | frontend/src/app/api/projects/[projectId]/budget-codes/bulk/route.ts |
| `/api/projects/[projectId]/budget/change-orders` | GET | frontend/src/app/api/projects/[projectId]/budget/change-orders/route.ts |
| `/api/projects/[projectId]/budget/commitments` | GET | frontend/src/app/api/projects/[projectId]/budget/commitments/route.ts |
| `/api/projects/[projectId]/budget/details` | GET | frontend/src/app/api/projects/[projectId]/budget/details/route.ts |
| `/api/projects/[projectId]/budget/direct-costs` | GET | frontend/src/app/api/projects/[projectId]/budget/direct-costs/route.ts |
| `/api/projects/[projectId]/budget/export` | GET | frontend/src/app/api/projects/[projectId]/budget/export/route.ts |
| `/api/projects/[projectId]/budget/forecast` | GET, POST | frontend/src/app/api/projects/[projectId]/budget/forecast/route.ts |
| `/api/projects/[projectId]/budget/history` | GET | frontend/src/app/api/projects/[projectId]/budget/history/route.ts |
| `/api/projects/[projectId]/budget/import` | POST | frontend/src/app/api/projects/[projectId]/budget/import/route.ts |
| `/api/projects/[projectId]/budget/import-from-contract` | POST | frontend/src/app/api/projects/[projectId]/budget/import-from-contract/route.ts |
| `/api/projects/[projectId]/budget/lines/[lineId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/budget/lines/[lineId]/route.ts |
| `/api/projects/[projectId]/budget/lines/[lineId]/history` | GET | frontend/src/app/api/projects/[projectId]/budget/lines/[lineId]/history/route.ts |
| `/api/projects/[projectId]/budget/lock` | GET, POST, DELETE | frontend/src/app/api/projects/[projectId]/budget/lock/route.ts |
| `/api/projects/[projectId]/budget/modifications` | GET, POST, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/budget/modifications/route.ts |
| `/api/projects/[projectId]/budget/new-line-policy` | GET | frontend/src/app/api/projects/[projectId]/budget/new-line-policy/route.ts |
| `/api/projects/[projectId]/budget/pending-cost-changes` | GET | frontend/src/app/api/projects/[projectId]/budget/pending-cost-changes/route.ts |
| `/api/projects/[projectId]/budget/seed-from-estimate` | POST | frontend/src/app/api/projects/[projectId]/budget/seed-from-estimate/route.ts |
| `/api/projects/[projectId]/budget/settings` | GET, PUT | frontend/src/app/api/projects/[projectId]/budget/settings/route.ts |
| `/api/projects/[projectId]/budget/snapshots` | GET, POST | frontend/src/app/api/projects/[projectId]/budget/snapshots/route.ts |
| `/api/projects/[projectId]/budget/views` | GET, POST | frontend/src/app/api/projects/[projectId]/budget/views/route.ts |
| `/api/projects/[projectId]/budget/views/[viewId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/budget/views/[viewId]/route.ts |
| `/api/projects/[projectId]/budget/views/[viewId]/clone` | POST | frontend/src/app/api/projects/[projectId]/budget/views/[viewId]/clone/route.ts |
| `/api/projects/[projectId]/change-events` | GET, POST | frontend/src/app/api/projects/[projectId]/change-events/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/approvals` | GET, POST, PATCH | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/approvals/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/attachments` | GET, POST, DELETE | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId]` | GET, DELETE | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId]/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId]/download` | GET | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId]/download/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/commitment-pcos` | GET | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/commitment-pcos/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/convert-to-change-order` | POST | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/convert-to-change-order/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/email` | POST | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/email/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/history` | GET | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/history/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/line-items` | GET, POST, PUT | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/line-items/[lineItemId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/[lineItemId]/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/lineage` | GET | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/lineage/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/pdf` | GET | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/pdf/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/prime-contract-change-orders` | GET | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/prime-contract-change-orders/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/prime-pcos` | GET | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/prime-pcos/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/related-items` | GET, POST | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/related-items/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/related-items/[relatedItemId]` | DELETE | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/related-items/[relatedItemId]/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/related-items/options` | GET | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/related-items/options/route.ts |
| `/api/projects/[projectId]/change-events/[changeEventId]/restore` | POST | frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/restore/route.ts |
| `/api/projects/[projectId]/change-events/add-to-pco` | POST | frontend/src/app/api/projects/[projectId]/change-events/add-to-pco/route.ts |
| `/api/projects/[projectId]/change-events/commitment-options` | POST | frontend/src/app/api/projects/[projectId]/change-events/commitment-options/route.ts |
| `/api/projects/[projectId]/change-events/next-number` | GET | frontend/src/app/api/projects/[projectId]/change-events/next-number/route.ts |
| `/api/projects/[projectId]/change-events/origin-options` | GET | frontend/src/app/api/projects/[projectId]/change-events/origin-options/route.ts |
| `/api/projects/[projectId]/change-events/rfqs` | GET, POST | frontend/src/app/api/projects/[projectId]/change-events/rfqs/route.ts |
| `/api/projects/[projectId]/change-events/rfqs/[rfqId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/change-events/rfqs/[rfqId]/route.ts |
| `/api/projects/[projectId]/change-events/rfqs/[rfqId]/responses` | GET, POST | frontend/src/app/api/projects/[projectId]/change-events/rfqs/[rfqId]/responses/route.ts |
| `/api/projects/[projectId]/checklist` | GET | frontend/src/app/api/projects/[projectId]/checklist/route.ts |
| `/api/projects/[projectId]/commitment-change-orders` | GET, POST | frontend/src/app/api/projects/[projectId]/commitment-change-orders/route.ts |
| `/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/route.ts |
| `/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/approve` | POST | frontend/src/app/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/approve/route.ts |
| `/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments` | GET, POST | frontend/src/app/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments/route.ts |
| `/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments/[attachmentId]` | DELETE | frontend/src/app/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments/[attachmentId]/route.ts |
| `/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items` | GET, POST | frontend/src/app/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items/route.ts |
| `/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items/[lineItemId]` | PUT, DELETE | frontend/src/app/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items/[lineItemId]/route.ts |
| `/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/reject` | POST | frontend/src/app/api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/reject/route.ts |
| `/api/projects/[projectId]/commitment-change-orders/export` | GET | frontend/src/app/api/projects/[projectId]/commitment-change-orders/export/route.ts |
| `/api/projects/[projectId]/commitment-options` | GET | frontend/src/app/api/projects/[projectId]/commitment-options/route.ts |
| `/api/projects/[projectId]/commitment-pcos` | GET, POST | frontend/src/app/api/projects/[projectId]/commitment-pcos/route.ts |
| `/api/projects/[projectId]/commitment-pcos/[pcoId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/commitment-pcos/[pcoId]/route.ts |
| `/api/projects/[projectId]/commitment-pcos/[pcoId]/promote` | POST | frontend/src/app/api/projects/[projectId]/commitment-pcos/[pcoId]/promote/route.ts |
| `/api/projects/[projectId]/commitment-pcos/bulk-create` | POST | frontend/src/app/api/projects/[projectId]/commitment-pcos/bulk-create/route.ts |
| `/api/projects/[projectId]/commitment-pcos/promote-bulk` | POST | frontend/src/app/api/projects/[projectId]/commitment-pcos/promote-bulk/route.ts |
| `/api/projects/[projectId]/commitments/[commitmentId]/change-events` | GET | frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/change-events/route.ts |
| `/api/projects/[projectId]/commitments/[commitmentId]/line-items` | GET, PUT | frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts |
| `/api/projects/[projectId]/commitments/[commitmentId]/line-items/import` | POST | frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/import/route.ts |
| `/api/projects/[projectId]/commitments/[commitmentId]/payments` | GET | frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/payments/route.ts |
| `/api/projects/[projectId]/commitments/[commitmentId]/pcos` | GET, POST | frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/pcos/route.ts |
| `/api/projects/[projectId]/commitments/[commitmentId]/pcos/[pcoId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/pcos/[pcoId]/route.ts |
| `/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov` | GET, POST, PUT | frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov/route.ts |
| `/api/projects/[projectId]/commitments/export` | POST | frontend/src/app/api/projects/[projectId]/commitments/export/route.ts |
| `/api/projects/[projectId]/commitments/import` | POST | frontend/src/app/api/projects/[projectId]/commitments/import/route.ts |
| `/api/projects/[projectId]/commitments/scope-lookup` | GET | frontend/src/app/api/projects/[projectId]/commitments/scope-lookup/route.ts |
| `/api/projects/[projectId]/contacts` | GET | frontend/src/app/api/projects/[projectId]/contacts/route.ts |
| `/api/projects/[projectId]/contracts` | GET, POST | frontend/src/app/api/projects/[projectId]/contracts/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/advanced-settings` | PUT | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/advanced-settings/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/attachments` | GET, POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/attachments/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/attachments/[attachmentId]` | DELETE | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/attachments/[attachmentId]/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/attachments/[attachmentId]/download` | GET | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/attachments/[attachmentId]/download/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/change-orders` | GET, POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve` | POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/reject` | POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/reject/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/line-items` | GET, POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/line-items/[lineItemId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/[lineItemId]/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/line-items/estimate-import/activate-budget-codes` | POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/estimate-import/activate-budget-codes/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/line-items/estimate-import/preview` | POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/estimate-import/preview/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/line-items/import` | POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/import/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/payment-applications` | GET, POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items` | GET, PATCH | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/pdf` | GET | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/pdf/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/populate-sov` | POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/populate-sov/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/payments` | GET, POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payments/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/payments/[paymentId]` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payments/[paymentId]/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/related-items` | GET, POST, DELETE | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/related-items/route.ts |
| `/api/projects/[projectId]/contracts/[contractId]/sync-from-estimate` | POST | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/sync-from-estimate/route.ts |
| `/api/projects/[projectId]/contracts/estimate-import/preview` | POST | frontend/src/app/api/projects/[projectId]/contracts/estimate-import/preview/route.ts |
| `/api/projects/[projectId]/contracts/estimate-sov-template` | GET | frontend/src/app/api/projects/[projectId]/contracts/estimate-sov-template/route.ts |
| `/api/projects/[projectId]/contracts/from-estimate` | POST | frontend/src/app/api/projects/[projectId]/contracts/from-estimate/route.ts |
| `/api/projects/[projectId]/contracts/settings` | GET, PUT | frontend/src/app/api/projects/[projectId]/contracts/settings/route.ts |
| `/api/projects/[projectId]/daily-log/site-scribe` | POST | frontend/src/app/api/projects/[projectId]/daily-log/site-scribe/route.ts |
| `/api/projects/[projectId]/direct-costs` | GET, POST | frontend/src/app/api/projects/[projectId]/direct-costs/route.ts |
| `/api/projects/[projectId]/direct-costs/[costId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/direct-costs/[costId]/route.ts |
| `/api/projects/[projectId]/direct-costs/bulk` | POST | frontend/src/app/api/projects/[projectId]/direct-costs/bulk/route.ts |
| `/api/projects/[projectId]/direct-costs/export` | POST | frontend/src/app/api/projects/[projectId]/direct-costs/export/route.ts |
| `/api/projects/[projectId]/directory/activity` | GET | frontend/src/app/api/projects/[projectId]/directory/activity/route.ts |
| `/api/projects/[projectId]/directory/companies` | GET, POST | frontend/src/app/api/projects/[projectId]/directory/companies/route.ts |
| `/api/projects/[projectId]/directory/companies/[companyId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/directory/companies/[companyId]/route.ts |
| `/api/projects/[projectId]/directory/companies/sync` | POST | frontend/src/app/api/projects/[projectId]/directory/companies/sync/route.ts |
| `/api/projects/[projectId]/directory/export` | GET | frontend/src/app/api/projects/[projectId]/directory/export/route.ts |
| `/api/projects/[projectId]/directory/filters` | GET, POST, DELETE | frontend/src/app/api/projects/[projectId]/directory/filters/route.ts |
| `/api/projects/[projectId]/directory/groups` | GET, POST | frontend/src/app/api/projects/[projectId]/directory/groups/route.ts |
| `/api/projects/[projectId]/directory/groups/[groupId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/directory/groups/[groupId]/route.ts |
| `/api/projects/[projectId]/directory/groups/[groupId]/members` | POST | frontend/src/app/api/projects/[projectId]/directory/groups/[groupId]/members/route.ts |
| `/api/projects/[projectId]/directory/import` | POST | frontend/src/app/api/projects/[projectId]/directory/import/route.ts |
| `/api/projects/[projectId]/directory/people` | GET, POST | frontend/src/app/api/projects/[projectId]/directory/people/route.ts |
| `/api/projects/[projectId]/directory/people/[personId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/route.ts |
| `/api/projects/[projectId]/directory/people/[personId]/deactivate` | POST | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/deactivate/route.ts |
| `/api/projects/[projectId]/directory/people/[personId]/email-notifications` | GET, PATCH | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/email-notifications/route.ts |
| `/api/projects/[projectId]/directory/people/[personId]/invite` | POST | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/invite/route.ts |
| `/api/projects/[projectId]/directory/people/[personId]/permissions` | GET, PATCH | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/permissions/route.ts |
| `/api/projects/[projectId]/directory/people/[personId]/profile-photo` | POST | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/profile-photo/route.ts |
| `/api/projects/[projectId]/directory/people/[personId]/reactivate` | POST | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/reactivate/route.ts |
| `/api/projects/[projectId]/directory/people/[personId]/reinvite` | POST | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/reinvite/route.ts |
| `/api/projects/[projectId]/directory/people/[personId]/resend-invite` | POST | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/resend-invite/route.ts |
| `/api/projects/[projectId]/directory/people/[personId]/schedule-notifications` | GET, PATCH | frontend/src/app/api/projects/[projectId]/directory/people/[personId]/schedule-notifications/route.ts |
| `/api/projects/[projectId]/directory/people/bulk-invite` | POST | frontend/src/app/api/projects/[projectId]/directory/people/bulk-invite/route.ts |
| `/api/projects/[projectId]/directory/people/bulk-update` | POST | frontend/src/app/api/projects/[projectId]/directory/people/bulk-update/route.ts |
| `/api/projects/[projectId]/directory/permissions` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/directory/permissions/route.ts |
| `/api/projects/[projectId]/directory/preferences` | GET, POST | frontend/src/app/api/projects/[projectId]/directory/preferences/route.ts |
| `/api/projects/[projectId]/directory/roles` | GET, POST, PUT, DELETE | frontend/src/app/api/projects/[projectId]/directory/roles/route.ts |
| `/api/projects/[projectId]/directory/templates/[templateType]` | GET | frontend/src/app/api/projects/[projectId]/directory/templates/[templateType]/route.ts |
| `/api/projects/[projectId]/directory/users/bulk-add` | POST | frontend/src/app/api/projects/[projectId]/directory/users/bulk-add/route.ts |
| `/api/projects/[projectId]/directory/vendors` | GET, POST, DELETE | frontend/src/app/api/projects/[projectId]/directory/vendors/route.ts |
| `/api/projects/[projectId]/documents` | GET, POST | frontend/src/app/api/projects/[projectId]/documents/route.ts |
| `/api/projects/[projectId]/documents/[documentId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/documents/[documentId]/route.ts |
| `/api/projects/[projectId]/documents/[documentId]/download` | GET | frontend/src/app/api/projects/[projectId]/documents/[documentId]/download/route.ts |
| `/api/projects/[projectId]/drawings` | GET, POST | frontend/src/app/api/projects/[projectId]/drawings/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/change-history` | GET | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/change-history/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/download` | GET | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/download/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/obsolete` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/obsolete/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/pdf-proxy` | GET | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/pdf-proxy/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/pins` | GET, POST | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/pins/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/pins/[pinId]` | DELETE | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/pins/[pinId]/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/publish` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/publish/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/qr-code` | GET | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/qr-code/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/related-items` | GET, POST | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/related-items/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/related-items/[itemId]` | DELETE | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/related-items/[itemId]/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/restore` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/restore/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/revisions` | GET, POST | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]` | PATCH | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/download` | GET | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/download/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/sketches` | GET, POST | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/sketches/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/sketches/[sketchId]` | DELETE | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/sketches/[sketchId]/route.ts |
| `/api/projects/[projectId]/drawings/[drawingId]/revisions/upload-url` | POST | frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/upload-url/route.ts |
| `/api/projects/[projectId]/drawings/areas` | GET, POST | frontend/src/app/api/projects/[projectId]/drawings/areas/route.ts |
| `/api/projects/[projectId]/drawings/areas/[areaId]` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/drawings/areas/[areaId]/route.ts |
| `/api/projects/[projectId]/drawings/bulk-download` | POST | frontend/src/app/api/projects/[projectId]/drawings/bulk-download/route.ts |
| `/api/projects/[projectId]/drawings/bulk-status` | PATCH | frontend/src/app/api/projects/[projectId]/drawings/bulk-status/route.ts |
| `/api/projects/[projectId]/drawings/recycle-bin` | GET | frontend/src/app/api/projects/[projectId]/drawings/recycle-bin/route.ts |
| `/api/projects/[projectId]/drawings/sets` | GET, POST | frontend/src/app/api/projects/[projectId]/drawings/sets/route.ts |
| `/api/projects/[projectId]/drawings/sets/[setId]` | POST, PATCH | frontend/src/app/api/projects/[projectId]/drawings/sets/[setId]/route.ts |
| `/api/projects/[projectId]/drawings/subscribe` | GET, POST, DELETE | frontend/src/app/api/projects/[projectId]/drawings/subscribe/route.ts |
| `/api/projects/[projectId]/drawings/upload-url` | POST | frontend/src/app/api/projects/[projectId]/drawings/upload-url/route.ts |
| `/api/projects/[projectId]/email-attachments` | GET | frontend/src/app/api/projects/[projectId]/email-attachments/route.ts |
| `/api/projects/[projectId]/email-attachments/[attachmentId]` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/email-attachments/[attachmentId]/route.ts |
| `/api/projects/[projectId]/email-attachments/[attachmentId]/download` | GET | frontend/src/app/api/projects/[projectId]/email-attachments/[attachmentId]/download/route.ts |
| `/api/projects/[projectId]/emails` | GET, POST | frontend/src/app/api/projects/[projectId]/emails/route.ts |
| `/api/projects/[projectId]/emails/[emailId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/emails/[emailId]/route.ts |
| `/api/projects/[projectId]/emails/[emailId]/summarize` | POST | frontend/src/app/api/projects/[projectId]/emails/[emailId]/summarize/route.ts |
| `/api/projects/[projectId]/emails/[emailId]/tasks` | POST | frontend/src/app/api/projects/[projectId]/emails/[emailId]/tasks/route.ts |
| `/api/projects/[projectId]/employees` | GET | frontend/src/app/api/projects/[projectId]/employees/route.ts |
| `/api/projects/[projectId]/estimates` | GET, POST | frontend/src/app/api/projects/[projectId]/estimates/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/detail-items` | GET, POST | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/detail-items/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/detail-items/[itemId]` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/detail-items/[itemId]/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/gc-items` | GET, POST, PUT, DELETE | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/gc-items/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/gc-items/[itemId]` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/gc-items/[itemId]/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/line-items` | POST | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/line-items/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/line-items/[lineItemId]` | PUT, DELETE | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/line-items/[lineItemId]/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/pdf` | GET | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/pdf/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/scope-items` | GET, POST | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/scope-items/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/scope-items/[scopeItemId]` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/scope-items/[scopeItemId]/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/scope-items/seed` | POST | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/scope-items/seed/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/sublist` | GET, POST | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/sublist/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/award` | POST | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/award/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/bid-invitation` | POST | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/bid-invitation/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/bid-items` | GET, POST | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/bid-items/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/bid-items/[bidItemId]` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/bid-items/[bidItemId]/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/call-logs` | GET, POST | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/call-logs/route.ts |
| `/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/use-bid` | POST | frontend/src/app/api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/use-bid/route.ts |
| `/api/projects/[projectId]/home/tab-data` | GET | frontend/src/app/api/projects/[projectId]/home/tab-data/route.ts |
| `/api/projects/[projectId]/invoicing/billing-periods` | GET, POST | frontend/src/app/api/projects/[projectId]/invoicing/billing-periods/route.ts |
| `/api/projects/[projectId]/invoicing/billing-periods/[periodId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/invoicing/billing-periods/[periodId]/route.ts |
| `/api/projects/[projectId]/invoicing/owner` | GET, POST | frontend/src/app/api/projects/[projectId]/invoicing/owner/route.ts |
| `/api/projects/[projectId]/invoicing/owner/[invoiceId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/route.ts |
| `/api/projects/[projectId]/invoicing/owner/[invoiceId]/approve` | POST | frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/approve/route.ts |
| `/api/projects/[projectId]/invoicing/owner/[invoiceId]/approve-as-noted` | POST | frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/approve-as-noted/route.ts |
| `/api/projects/[projectId]/invoicing/owner/[invoiceId]/attachments` | GET, POST | frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/attachments/route.ts |
| `/api/projects/[projectId]/invoicing/owner/[invoiceId]/attachments/[attachmentId]` | GET, DELETE | frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/attachments/[attachmentId]/route.ts |
| `/api/projects/[projectId]/invoicing/owner/[invoiceId]/email` | POST | frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/email/route.ts |
| `/api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items` | GET, POST, PATCH | frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items/route.ts |
| `/api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items/[lineItemId]` | DELETE | frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/line-items/[lineItemId]/route.ts |
| `/api/projects/[projectId]/invoicing/owner/[invoiceId]/pdf` | GET | frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/pdf/route.ts |
| `/api/projects/[projectId]/invoicing/owner/[invoiceId]/revise` | POST | frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/revise/route.ts |
| `/api/projects/[projectId]/invoicing/owner/[invoiceId]/submit` | POST | frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/submit/route.ts |
| `/api/projects/[projectId]/invoicing/owner/[invoiceId]/void` | POST | frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/void/route.ts |
| `/api/projects/[projectId]/invoicing/owner/atomic` | POST | frontend/src/app/api/projects/[projectId]/invoicing/owner/atomic/route.ts |
| `/api/projects/[projectId]/invoicing/payments` | GET, POST | frontend/src/app/api/projects/[projectId]/invoicing/payments/route.ts |
| `/api/projects/[projectId]/invoicing/payments/[paymentId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/invoicing/payments/[paymentId]/route.ts |
| `/api/projects/[projectId]/invoicing/settings` | GET, PATCH | frontend/src/app/api/projects/[projectId]/invoicing/settings/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor` | GET | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices` | GET, POST | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/approve` | POST | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/approve/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/approve-as-noted` | POST | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/approve-as-noted/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/change-history` | GET | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/change-history/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/emails` | GET, POST | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/emails/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/erp-resend` | POST | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/erp-resend/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/invite` | POST | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/invite/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/line-items` | PATCH | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/line-items/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid` | POST | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/mark-paid/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/pdf` | GET | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/pdf/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/pending-owner-approval` | POST | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/pending-owner-approval/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items` | GET, POST, DELETE | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items/options` | GET | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/related-items/options/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/revise` | POST | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/revise/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/submit` | POST | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/submit/route.ts |
| `/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/void` | POST | frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/void/route.ts |
| `/api/projects/[projectId]/meetings` | GET, POST | frontend/src/app/api/projects/[projectId]/meetings/route.ts |
| `/api/projects/[projectId]/meetings/[meetingId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/route.ts |
| `/api/projects/[projectId]/meetings/[meetingId]/digest` | GET | frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/digest/route.ts |
| `/api/projects/[projectId]/meetings/[meetingId]/prep` | GET, PUT | frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/prep/route.ts |
| `/api/projects/[projectId]/meetings/[meetingId]/prep/generate` | POST | frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/prep/generate/route.ts |
| `/api/projects/[projectId]/pcos` | GET, POST | frontend/src/app/api/projects/[projectId]/pcos/route.ts |
| `/api/projects/[projectId]/pcos/[pcoId]` | GET, PATCH | frontend/src/app/api/projects/[projectId]/pcos/[pcoId]/route.ts |
| `/api/projects/[projectId]/pcos/[pcoId]/atomic` | PUT | frontend/src/app/api/projects/[projectId]/pcos/[pcoId]/atomic/route.ts |
| `/api/projects/[projectId]/pcos/[pcoId]/change-events` | GET, POST, DELETE | frontend/src/app/api/projects/[projectId]/pcos/[pcoId]/change-events/route.ts |
| `/api/projects/[projectId]/pcos/[pcoId]/client-decision` | POST | frontend/src/app/api/projects/[projectId]/pcos/[pcoId]/client-decision/route.ts |
| `/api/projects/[projectId]/pcos/[pcoId]/convert-to-co` | POST | frontend/src/app/api/projects/[projectId]/pcos/[pcoId]/convert-to-co/route.ts |
| `/api/projects/[projectId]/pcos/[pcoId]/line-items` | GET, POST, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/pcos/[pcoId]/line-items/route.ts |
| `/api/projects/[projectId]/pcos/[pcoId]/submit` | POST | frontend/src/app/api/projects/[projectId]/pcos/[pcoId]/submit/route.ts |
| `/api/projects/[projectId]/permissions` | GET | frontend/src/app/api/projects/[projectId]/permissions/route.ts |
| `/api/projects/[projectId]/permissions/assign` | POST | frontend/src/app/api/projects/[projectId]/permissions/assign/route.ts |
| `/api/projects/[projectId]/permissions/audit` | GET | frontend/src/app/api/projects/[projectId]/permissions/audit/route.ts |
| `/api/projects/[projectId]/permissions/override` | POST, DELETE | frontend/src/app/api/projects/[projectId]/permissions/override/route.ts |
| `/api/projects/[projectId]/photo-albums` | GET, POST | frontend/src/app/api/projects/[projectId]/photo-albums/route.ts |
| `/api/projects/[projectId]/photo-albums/[albumId]` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/photo-albums/[albumId]/route.ts |
| `/api/projects/[projectId]/photos` | GET, POST | frontend/src/app/api/projects/[projectId]/photos/route.ts |
| `/api/projects/[projectId]/photos/[photoId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/photos/[photoId]/route.ts |
| `/api/projects/[projectId]/photos/[photoId]/restore` | PATCH | frontend/src/app/api/projects/[projectId]/photos/[photoId]/restore/route.ts |
| `/api/projects/[projectId]/photos/upload` | POST | frontend/src/app/api/projects/[projectId]/photos/upload/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders` | GET, POST | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/approve` | POST | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/approve/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments` | GET, POST | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments/[attachmentId]` | DELETE | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments/[attachmentId]/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/emails` | GET | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/emails/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/line-items` | GET, POST | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/line-items/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/line-items/[lineItemId]` | PUT, DELETE | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/line-items/[lineItemId]/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/pdf` | GET | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/pdf/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/reject` | POST | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/reject/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items` | GET, POST | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items/[relatedItemId]` | DELETE | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items/[relatedItemId]/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items/options` | GET | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items/options/route.ts |
| `/api/projects/[projectId]/prime-contract-change-orders/export` | GET | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/export/route.ts |
| `/api/projects/[projectId]/prime-contract-pcos` | GET, POST | frontend/src/app/api/projects/[projectId]/prime-contract-pcos/route.ts |
| `/api/projects/[projectId]/prime-contract-pcos/[pcoId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/prime-contract-pcos/[pcoId]/route.ts |
| `/api/projects/[projectId]/prime-contract-pcos/[pcoId]/attachments` | POST | frontend/src/app/api/projects/[projectId]/prime-contract-pcos/[pcoId]/attachments/route.ts |
| `/api/projects/[projectId]/prime-contract-pcos/[pcoId]/promote` | POST | frontend/src/app/api/projects/[projectId]/prime-contract-pcos/[pcoId]/promote/route.ts |
| `/api/projects/[projectId]/prime-contract-pcos/promote-bulk` | POST | frontend/src/app/api/projects/[projectId]/prime-contract-pcos/promote-bulk/route.ts |
| `/api/projects/[projectId]/progress-reports` | GET, POST | frontend/src/app/api/projects/[projectId]/progress-reports/route.ts |
| `/api/projects/[projectId]/progress-reports/[reportId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/progress-reports/[reportId]/route.ts |
| `/api/projects/[projectId]/progress-reports/[reportId]/ai-generate` | POST | frontend/src/app/api/projects/[projectId]/progress-reports/[reportId]/ai-generate/route.ts |
| `/api/projects/[projectId]/progress-reports/[reportId]/email` | POST | frontend/src/app/api/projects/[projectId]/progress-reports/[reportId]/email/route.ts |
| `/api/projects/[projectId]/progress-reports/[reportId]/pdf` | GET | frontend/src/app/api/projects/[projectId]/progress-reports/[reportId]/pdf/route.ts |
| `/api/projects/[projectId]/psr` | GET | frontend/src/app/api/projects/[projectId]/psr/route.ts |
| `/api/projects/[projectId]/psr/comments` | GET, POST | frontend/src/app/api/projects/[projectId]/psr/comments/route.ts |
| `/api/projects/[projectId]/psr/export` | GET | frontend/src/app/api/projects/[projectId]/psr/export/route.ts |
| `/api/projects/[projectId]/punch-items` | GET, POST | frontend/src/app/api/projects/[projectId]/punch-items/route.ts |
| `/api/projects/[projectId]/punch-items/[punchItemId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/punch-items/[punchItemId]/route.ts |
| `/api/projects/[projectId]/purchase-orders` | GET, POST | frontend/src/app/api/projects/[projectId]/purchase-orders/route.ts |
| `/api/projects/[projectId]/rfis` | GET, POST | frontend/src/app/api/projects/[projectId]/rfis/route.ts |
| `/api/projects/[projectId]/rfis/[rfiId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/rfis/[rfiId]/route.ts |
| `/api/projects/[projectId]/scheduling/related-action-items` | GET | frontend/src/app/api/projects/[projectId]/scheduling/related-action-items/route.ts |
| `/api/projects/[projectId]/scheduling/tasks` | GET, POST | frontend/src/app/api/projects/[projectId]/scheduling/tasks/route.ts |
| `/api/projects/[projectId]/scheduling/tasks/[taskId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/scheduling/tasks/[taskId]/route.ts |
| `/api/projects/[projectId]/scheduling/tasks/bulk` | POST, DELETE | frontend/src/app/api/projects/[projectId]/scheduling/tasks/bulk/route.ts |
| `/api/projects/[projectId]/scheduling/tasks/convert` | POST | frontend/src/app/api/projects/[projectId]/scheduling/tasks/convert/route.ts |
| `/api/projects/[projectId]/scheduling/tasks/convert-token` | POST | frontend/src/app/api/projects/[projectId]/scheduling/tasks/convert-token/route.ts |
| `/api/projects/[projectId]/scheduling/tasks/import` | POST | frontend/src/app/api/projects/[projectId]/scheduling/tasks/import/route.ts |
| `/api/projects/[projectId]/scheduling/tasks/preview` | POST | frontend/src/app/api/projects/[projectId]/scheduling/tasks/preview/route.ts |
| `/api/projects/[projectId]/shell` | GET | frontend/src/app/api/projects/[projectId]/shell/route.ts |
| `/api/projects/[projectId]/specifications` | GET, POST | frontend/src/app/api/projects/[projectId]/specifications/route.ts |
| `/api/projects/[projectId]/specifications/[sectionId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/route.ts |
| `/api/projects/[projectId]/specifications/[sectionId]/revisions` | GET, POST | frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/revisions/route.ts |
| `/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]/route.ts |
| `/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]/download` | GET | frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]/download/route.ts |
| `/api/projects/[projectId]/specifications/[sectionId]/subscribe` | POST, DELETE | frontend/src/app/api/projects/[projectId]/specifications/[sectionId]/subscribe/route.ts |
| `/api/projects/[projectId]/specifications/areas` | GET, POST | frontend/src/app/api/projects/[projectId]/specifications/areas/route.ts |
| `/api/projects/[projectId]/specifications/areas/[areaId]` | GET, PATCH, DELETE | frontend/src/app/api/projects/[projectId]/specifications/areas/[areaId]/route.ts |
| `/api/projects/[projectId]/specifications/revisions` | GET | frontend/src/app/api/projects/[projectId]/specifications/revisions/route.ts |
| `/api/projects/[projectId]/subcontracts` | GET, POST | frontend/src/app/api/projects/[projectId]/subcontracts/route.ts |
| `/api/projects/[projectId]/submittal-packages` | GET, POST | frontend/src/app/api/projects/[projectId]/submittal-packages/route.ts |
| `/api/projects/[projectId]/submittal-spec-sections` | GET | frontend/src/app/api/projects/[projectId]/submittal-spec-sections/route.ts |
| `/api/projects/[projectId]/submittal-types` | GET | frontend/src/app/api/projects/[projectId]/submittal-types/route.ts |
| `/api/projects/[projectId]/submittals` | GET, POST | frontend/src/app/api/projects/[projectId]/submittals/route.ts |
| `/api/projects/[projectId]/submittals/[submittalId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts |
| `/api/projects/[projectId]/submittals/[submittalId]/attachments` | POST | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/attachments/route.ts |
| `/api/projects/[projectId]/submittals/[submittalId]/distribute` | POST | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/distribute/route.ts |
| `/api/projects/[projectId]/submittals/[submittalId]/duplicate` | POST | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/duplicate/route.ts |
| `/api/projects/[projectId]/submittals/[submittalId]/related-items` | GET, POST, DELETE | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/related-items/route.ts |
| `/api/projects/[projectId]/submittals/[submittalId]/restore` | PATCH | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/restore/route.ts |
| `/api/projects/[projectId]/submittals/[submittalId]/revisions` | GET, POST | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/revisions/route.ts |
| `/api/projects/[projectId]/submittals/[submittalId]/workflow-steps` | GET, POST, PUT | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/route.ts |
| `/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]` | DELETE | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]/route.ts |
| `/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]/respond` | POST | frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]/respond/route.ts |
| `/api/projects/[projectId]/submittals/export` | GET | frontend/src/app/api/projects/[projectId]/submittals/export/route.ts |
| `/api/projects/[projectId]/submittals/packages` | GET, POST | frontend/src/app/api/projects/[projectId]/submittals/packages/route.ts |
| `/api/projects/[projectId]/submittals/packages/[packageId]` | PATCH, DELETE | frontend/src/app/api/projects/[projectId]/submittals/packages/[packageId]/route.ts |
| `/api/projects/[projectId]/submittals/specs` | GET | frontend/src/app/api/projects/[projectId]/submittals/specs/route.ts |
| `/api/projects/[projectId]/submittals/workflow-templates` | GET, POST | frontend/src/app/api/projects/[projectId]/submittals/workflow-templates/route.ts |
| `/api/projects/[projectId]/submittals/workflow-templates/[templateId]` | PUT, DELETE | frontend/src/app/api/projects/[projectId]/submittals/workflow-templates/[templateId]/route.ts |
| `/api/projects/[projectId]/transmittals` | GET, POST | frontend/src/app/api/projects/[projectId]/transmittals/route.ts |
| `/api/projects/[projectId]/transmittals/[transmittalId]` | GET, PUT, DELETE | frontend/src/app/api/projects/[projectId]/transmittals/[transmittalId]/route.ts |
| `/api/projects/[projectId]/vendors` | GET, POST | frontend/src/app/api/projects/[projectId]/vendors/route.ts |
| `/api/projects/[projectId]/vertical-markup` | GET, POST, PUT, DELETE | frontend/src/app/api/projects/[projectId]/vertical-markup/route.ts |
| `/api/projects/[projectId]/vertical-markup/calculate` | POST | frontend/src/app/api/projects/[projectId]/vertical-markup/calculate/route.ts |
| `/api/projects/bootstrap` | POST | frontend/src/app/api/projects/bootstrap/route.ts |
| `/api/reconciliation/findings` | GET, POST | frontend/src/app/api/reconciliation/findings/route.ts |
| `/api/reconciliation/findings/[fingerprint]` | PATCH | frontend/src/app/api/reconciliation/findings/[fingerprint]/route.ts |
| `/api/settings/teams/link` | GET, POST, DELETE | frontend/src/app/api/settings/teams/link/route.ts |
| `/api/settings/teams/register-webhook` | GET, POST | frontend/src/app/api/settings/teams/register-webhook/route.ts |
| `/api/settings/telegram/link` | GET, POST | frontend/src/app/api/settings/telegram/link/route.ts |
| `/api/settings/telegram/register-webhook` | GET, POST | frontend/src/app/api/settings/telegram/register-webhook/route.ts |
| `/api/settings/telegram/unlink` | DELETE | frontend/src/app/api/settings/telegram/unlink/route.ts |
| `/api/site-scribe/realtime-session` | POST | frontend/src/app/api/site-scribe/realtime-session/route.ts |
| `/api/site-scribe/refine-log` | POST | frontend/src/app/api/site-scribe/refine-log/route.ts |
| `/api/supabase-proxy/[...path]` | GET, POST, PUT, PATCH, DELETE, HEAD | frontend/src/app/api/supabase-proxy/[...path]/route.ts |
| `/api/sync/acumatica/ap-bills` | POST | frontend/src/app/api/sync/acumatica/ap-bills/route.ts |
| `/api/sync/acumatica/ap-checks` | POST | frontend/src/app/api/sync/acumatica/ap-checks/route.ts |
| `/api/sync/acumatica/ar-invoices` | POST | frontend/src/app/api/sync/acumatica/ar-invoices/route.ts |
| `/api/sync/acumatica/ar-payments` | POST | frontend/src/app/api/sync/acumatica/ar-payments/route.ts |
| `/api/sync/acumatica/commitments` | POST | frontend/src/app/api/sync/acumatica/commitments/route.ts |
| `/api/sync/acumatica/direct-costs` | POST | frontend/src/app/api/sync/acumatica/direct-costs/route.ts |
| `/api/sync/acumatica/export` | POST | frontend/src/app/api/sync/acumatica/export/route.ts |
| `/api/sync/acumatica/mirror` | POST | frontend/src/app/api/sync/acumatica/mirror/route.ts |
| `/api/sync/acumatica/vendors` | POST | frontend/src/app/api/sync/acumatica/vendors/route.ts |
| `/api/table-delete` | POST | frontend/src/app/api/table-delete/route.ts |
| `/api/table-insert` | POST | frontend/src/app/api/table-insert/route.ts |
| `/api/table-metadata` | GET | frontend/src/app/api/table-metadata/route.ts |
| `/api/table-update` | POST | frontend/src/app/api/table-update/route.ts |
| `/api/table-views` | GET, POST | frontend/src/app/api/table-views/route.ts |
| `/api/table-views/[viewId]` | PATCH, DELETE | frontend/src/app/api/table-views/[viewId]/route.ts |
| `/api/tasks` | GET | frontend/src/app/api/tasks/route.ts |
| `/api/tasks/[taskId]` | GET, PATCH, DELETE | frontend/src/app/api/tasks/[taskId]/route.ts |
| `/api/tasks/[taskId]/comments` | GET, POST | frontend/src/app/api/tasks/[taskId]/comments/route.ts |
| `/api/tasks/[taskId]/comments/[commentId]` | PATCH, DELETE | frontend/src/app/api/tasks/[taskId]/comments/[commentId]/route.ts |
| `/api/tasks/bulk` | PATCH, DELETE | frontend/src/app/api/tasks/bulk/route.ts |
| `/api/team-chat/channels` | GET, POST | frontend/src/app/api/team-chat/channels/route.ts |
| `/api/team-chat/channels/[channelId]` | DELETE | frontend/src/app/api/team-chat/channels/[channelId]/route.ts |
| `/api/team-chat/direct-messages` | GET, POST | frontend/src/app/api/team-chat/direct-messages/route.ts |
| `/api/team-chat/messages` | GET, POST | frontend/src/app/api/team-chat/messages/route.ts |
| `/api/team-chat/previews` | GET | frontend/src/app/api/team-chat/previews/route.ts |
| `/api/team-chat/users` | GET | frontend/src/app/api/team-chat/users/route.ts |
| `/api/testing/cases` | POST | frontend/src/app/api/testing/cases/route.ts |
| `/api/testing/cases/[caseId]` | PATCH, DELETE | frontend/src/app/api/testing/cases/[caseId]/route.ts |
| `/api/testing/parity` | GET | frontend/src/app/api/testing/parity/route.ts |
| `/api/testing/runs` | GET, POST | frontend/src/app/api/testing/runs/route.ts |
| `/api/testing/runs/[runId]` | GET, DELETE | frontend/src/app/api/testing/runs/[runId]/route.ts |
| `/api/testing/runs/[runId]/results` | GET | frontend/src/app/api/testing/runs/[runId]/results/route.ts |
| `/api/testing/runs/[runId]/results/[resultId]` | PATCH | frontend/src/app/api/testing/runs/[runId]/results/[resultId]/route.ts |
| `/api/testing/runs/[runId]/results/[resultId]/github-issue` | POST | frontend/src/app/api/testing/runs/[runId]/results/[resultId]/github-issue/route.ts |
| `/api/testing/runs/[runId]/results/[resultId]/screenshots` | POST | frontend/src/app/api/testing/runs/[runId]/results/[resultId]/screenshots/route.ts |
| `/api/testing/suites` | GET | frontend/src/app/api/testing/suites/route.ts |
| `/api/testing/suites/[slug]/cases` | GET | frontend/src/app/api/testing/suites/[slug]/cases/route.ts |
| `/api/testing/tester-activity` | GET | frontend/src/app/api/testing/tester-activity/route.ts |
| `/api/testing/tools/[toolName]` | GET | frontend/src/app/api/testing/tools/[toolName]/route.ts |
| `/api/users` | GET | frontend/src/app/api/users/route.ts |
| `/api/users/me/onboarding` | POST | frontend/src/app/api/users/me/onboarding/route.ts |
| `/api/users/me/profile` | GET | frontend/src/app/api/users/me/profile/route.ts |
| `/api/velt/token` | POST | frontend/src/app/api/velt/token/route.ts |
| `/api/webhooks/resend` | POST | frontend/src/app/api/webhooks/resend/route.ts |

## AI Tools (106)

These are the tools the AI assistant can call. Each lives in `frontend/src/lib/ai/tools/`.

### `action-tools.ts` (24)

| Tool | Description |
|------|-------------|
| `addBoardItem` | Add a feature idea, initiative, or product improvement directly to the Product Board kanban. Use when the user says 'add this to the board', 'put this on the product board', 'log this as a feature idea', 'add to planned', 'add to in progress', or wants to track a product idea with a specific status column. Always show a preview and ask for confirmation before writing. |
| `createChangeEvent` | Log a new change event — a potential scope change that may or may not become a change order. Use when the user says 'log a change event', 'something came up on [project]', or describes an unexpected field condition. Always preview before writing. |
| `createChangeOrder` | Create a new prime contract change order (PCCO). Use when the user says 'create a change order', 'add a CO', or describes a scope change that needs to be documented as a change order. Always show a preview and ask for confirmation before writing. If projectId is unknown, call getPortfolioOverview first. |
| `createCommitment` | Create a new commitment — either a subcontract (for labor/trade work) or a purchase order (for materials or equipment). Use when the user says 'create a subcontract', 'add a PO', 'set up a commitment with [vendor]', or describes awarding work to a subcontractor or supplier. Always show a preview and ask for confirmation before writing. If projectId is unknown, call getPortfolioOverview first. |
| `createContact` | Create a contact in the global directory (public.people). Use when the user wants to 'add a contact', 'create a new contact', or 'add [person] to the directory' WITHOUT tying them to a specific project (use createProjectContact when a project is involved). This renders an interactive, prefilled contact form widget: fill in every field you already know (first/last name, email, phone, job title, company, department, notes) so the user only completes what's missing, then submits. Reuses an existing person by email and links the company by id or exact name. Always previews the form before writing. |
| `createGeneratedTask` | Create an action item in the main Tasks page task register (public.tasks). Use this for AI-generated follow-ups, reminders, accountability items, or user-created action items that should appear on /tasks or /[projectId]/tasks. If the action item supports a known schedule/Gantt task, pass scheduleTaskId to link it. Preview before writing. |
| `createInitiativeCard` | Create an initiative card on the Command Center board. Use when the user says 'add this to the board', 'create an initiative for [idea]', 'track this idea', 'remember this feature request', 'add a card for [thing]', or discusses any idea, feature, bug, or task that should be tracked on the kanban board. Does NOT require confirmation — cards are easy to edit/delete. |
| `createMeetingNote` | Log notes from a meeting into the project record. Use when the user says 'log notes from today's meeting', 'record what we discussed', or 'save meeting notes for [project]'. Can pre-fill from Fireflies context if available. Always preview before writing. |
| `createOutlookCalendarInvite` | Create an Outlook calendar invite through Microsoft Graph. Use when the user asks to schedule a meeting, send a calendar invite, add something to Outlook, or create a Teams meeting invite. Always return a preview first with the adaptive-card calendar widget, then write only after confirmation. |
| `createProjectCompany` | Add a company to a project's directory. Use when the user says 'add [company] to this project', 'add a vendor/subcontractor/supplier', or provides company directory details. Reuses an existing global company by exact name when possible, assigns it to the project, and previews before writing. |
| `createProjectContact` | Add a contact to a project's directory. Use when the user says 'add [person] as a contact', 'add this vendor contact to the project', or provides contact details. Reuses an existing person by email, links them to the project directory, optionally links their company, and previews before writing. |
| `createRFI` | Create a new Request for Information (RFI). Use when the user says 'create an RFI', 'log an RFI about [topic]', or describes a field question that needs a formal answer from the design team. Preview before writing. |
| `createSubmittal` | Create a new submittal. Use when the user says 'create a submittal for [spec section]', 'log a submittal', or 'we need to submit [material/equipment]'. Always preview before writing. |
| `createTask` | Create a schedule/Gantt task backed by schedule_tasks. Use only when the user is creating a project schedule activity, milestone, or Gantt item. For action items, follow-ups, reminders, or Tasks page records, use createGeneratedTask instead. Always show a preview and ask for confirmation before writing. |
| `deleteGeneratedTask` | Delete an existing task from the main Tasks page task register (public.tasks). Preview before writing. |
| `draftOutlookEmail` | Create a draft email in Outlook through Microsoft Graph. Use when the user asks to draft an email, draft a reply, prepare an Outlook response, or write a message for later review. Always preview first and never send. For reply drafts, ground the response through the Microsoft Executive Assistant specialist or a live Graph message/thread lookup before calling this tool. When drafting from Brandon's mailbox, apply the Brandon communication resources: docs/ai-plan/brandon-email-voice-profile.md for voice, docs/ai-plan/brandon-operating-profile.md for owner/operator judgment, and docs/ai-plan/brandon-email-drafting-playbook.md for reply patterns. Drafts must be short, direct, action-oriented, grounded in the current thread, and must ask for confirmation when cost, scope, schedule, owner, or attachment evidence is missing. |
| `flagProjectRisk` | Flag a project risk or insight. Use when the user says 'flag a risk', 'log an issue', or 'mark this as a concern'. Creates an AI insight record that shows up in the risk dashboard. Preview before writing. |
| `generateProjectSummary` | Generate a comprehensive project status summary by pulling budget, schedule, RFI, change order, and meeting data — then synthesizing it into a stored document. Use when the user says 'give me a status summary', 'project report', or 'what's the status of [project]'. This creates a reusable document, not just a chat response. |
| `logDailyReport` | Create a daily log entry for a project. Use when the user says 'log today's daily report', 'record site activity for [date]', or 'add a daily log entry'. Weather conditions and notes are stored as JSON. Always preview before writing. |
| `sendTeamsMessage` | Send a direct Teams message to a person via the Archon bot. Use when the user says 'send [person] a Teams message', 'message [person] on Teams', 'follow up with [person] about [topic]', 'ping [person]', or describes wanting to communicate with a team member via Teams. Look up the person by name first, then preview the message before sending. The recipient must have linked their Alleato account to Teams (messaged the Archon bot before). |
| `submitFeedback` | Submit a bug report or feature request on behalf of the user — identical to submitting the feedback form in the app. Use when the user says 'report a bug', 'something is broken', 'submit a feature request', 'I have a suggestion', 'can you log this issue', or describes a problem or improvement idea they want tracked. Always show a preview and ask for confirmation before submitting. |
| `updateGeneratedTask` | Update an existing task in the main Tasks page task register (public.tasks). Use when the user asks to modify, reassign, reprioritize, close, or change a due date for a Tasks page item. Preview before writing. |
| `updateProjectStatus` | Update a project's health status or phase. Use when the user says 'mark [project] as at-risk', 'update status to [value]', or '[project] is now in [phase]'. Always confirm before writing. |
| `updateRFIStatus` | Update the status of an existing RFI. Use when the user says 'close RFI #[n]', 'mark RFI [n] as answered', or 'RFI [n] is resolved'. Always preview before writing. |

### `acumatica.ts` (9)

| Tool | Description |
|------|-------------|
| `getAcumaticaProjectBudget` | Get a comprehensive project budget from the Acumatica ERP system. Returns budget line items with original budget, revised budget, actual costs, committed costs, cost to complete, cost at completion, variance, and change order amounts. This is LIVE accounting data from the official financial system of record. Use when asked about: ERP budget, Acumatica budget, official project budget, accounting budget, project financials from ERP, cost codes from Acumatica, or when the user wants the 'real' budget numbers from the accounting system. The projectId is the Acumatica project code (e.g., '25108'), NOT the Supabase project ID (which is a number like 67). |
| `getAcumaticaProjectList` | Get a list of all projects from the Acumatica ERP system with high-level financial totals (income, expenses, net position). This is LIVE accounting data. Use when asked about: all projects in Acumatica, project portfolio from ERP, which projects are active in the accounting system, or for a financial overview across all projects from the official books. |
| `getAPAgingReport` | Get Accounts Payable (AP) aging report from the Acumatica ERP system. Shows outstanding bills grouped by how many days past due they are (Current, 1-30, 31-60, 61-90, 90+ days). This is LIVE accounting data. Use when asked about: AP aging, outstanding bills, what we owe vendors, overdue payables, accounts payable status, or vendor payment obligations. |
| `getARAgingReport` | Get Accounts Receivable (AR) aging report from Acumatica ERP. Shows outstanding invoices grouped by how many days past due they are. This is LIVE accounting data. Use when asked about: AR aging, outstanding invoices, what clients owe us, overdue receivables, collections, or accounts receivable status. |
| `getCashPositionReport` | Get cash position summary from Acumatica ERP. Shows net cash flow over a rolling window: total AR payments received (inflows) vs AP checks issued (outflows). This is LIVE accounting data. Use when asked about: cash position, cash flow, liquidity, how much cash we have, net inflows/outflows, or working capital. |
| `getPurchaseOrderSummary` | Get purchase order summary from Acumatica ERP. Shows POs by vendor with totals, billed amounts, and status. This is LIVE accounting data. Use when asked about: purchase orders, POs, what we've ordered, procurement status, or vendor commitments. |
| `getRecentBills` | Get recent AP bills (vendor invoices) from Acumatica ERP. Shows the latest bills with vendor, amount, balance, and status. This is LIVE accounting data. Use when asked about: recent bills, vendor invoices, AP transactions, or what bills came in recently. |
| `getRecentInvoices` | Get recent AR invoices (customer billings) from Acumatica ERP. Shows customer invoices with amounts, balances, and status. This is LIVE accounting data. Use when asked about: invoices, customer billings, AR transactions, pay applications, or what we've billed recently. |
| `getVendorSpendReport` | Get vendor spend analysis from Acumatica ERP. Shows how much has been invoiced by vendors, how much is still outstanding, and how much has been paid. Can filter to a specific vendor or show top vendors by total spend. This is LIVE accounting data. Use when asked about: vendor spend, vendor payments, top vendors, how much we've paid a vendor, or vendor cost analysis. |

### `app-help-tools.ts` (2)

| Tool | Description |
|------|-------------|
| `findAppPage` | Find which page, screen, or AI tool in this application does something, by purpose. Use for 'where do I…', 'what page shows…', 'does the app have a…', 'which screen lets me…'. Searches the generated inventory of EVERY route and tool (not just curated help articles), matching on what each page does — so it finds pages even when the user doesn't know the name. Returns route URLs you can link the user to. Prefer searchAppHelp for step-by-step instructions; use this to locate a page or capability. |
| `searchAppHelp` | Search the controlled Alleato OS help center for instructions on how to use this application. Use this first for questions like 'how do I', 'where do I', 'show me how to', app setup, user management, profile settings, permissions, and feature walkthroughs. Only published AI-visible help articles are returned. |

### `document-intelligence.ts` (5)

| Tool | Description |
|------|-------------|
| `detectMissingSubmittals` | Cross-reference the submittal register against what the project scope and spec documents suggest is needed. Returns submittals that appear to be missing or incomplete. Use when asked 'what submittals are we missing?' or 'is our submittal log complete?' |
| `getSpecRequirements` | Search project specification documents for requirements related to a trade, product, or spec section. Returns structured requirements (material, manufacturer, performance, documentation, code reference). Use when asked what the spec requires for a given system or product, or before reviewing a submittal. |
| `getSubmittalLog` | Fetch the submittal register for a project — what submittals are required, submitted, approved, rejected, or missing. Use when asked about submittal status, pipeline, or progress. Also use as the first step before detectMissingSubmittals. |
| `logFeedback` | Record a human correction or validation of an AI document review finding. Use when the user says 'that finding was wrong', 'that's correct', or wants to annotate an AI review result. This feeds the learning loop. |
| `reviewDocument` | Request a structured pre-review of a submittal document against project spec requirements. Returns a requirements matrix comparing what the spec requires against what the submittal provides. Use when asked to 'review this submittal', 'check this against the spec', or 'pre-review this document'. |

### `executive-brief-tools.ts` (1)

| Tool | Description |
|------|-------------|
| `generateExecutiveDailyBrief` | Generate the executive daily brief — a curated intelligence digest for Brandon covering the top risks, financial exposures, schedule impacts, and recommended actions across all active projects. The brief synthesizes emails, Teams messages, meetings, and documents from the past 3 days to surface what needs Brandon's immediate attention. |

### `financial.ts` (6)

| Tool | Description |
|------|-------------|
| `getBudgetLineItems` | Get granular budget line items for a project with original budget, budget modifications, approved CO impacts, revised budget, and forecasting data including projected final cost and variance at completion. Use when asked about specific budget lines, cost codes, budget detail, or cost-at-completion projections. |
| `getChangeOrderDetails` | Get change order details for a project, including CO number, title, status, amount, associated change events, approval information, and submission dates. Also includes commitment change order lines if relevant. Use when asked about change orders, COs, contract modifications, or scope changes. |
| `getCommitmentsOverview` | Get all commitments (subcontracts and purchase orders) for a project. Returns commitment number, vendor/company, status, original value, change order value, current value, billed to date, and remaining balance. Use when asked about subcontractors, subcontracts, purchase orders, committed costs, or vendor contracts. |
| `getCostTrends` | Analyze spending patterns and cost trends for a project over time. Uses budget snapshots, direct cost dates, and invoice data to show how costs have changed. Returns monthly spend by category, acceleration/deceleration of spending, and burn rate analysis. Use when asked about spending trends, cost velocity, burn rate, or financial trajectory. |
| `getDirectCostsSummary` | Get direct costs for a project with categorization by cost type, vendor, and time period. Includes line item details with cost codes. Use when asked about direct costs, project expenses, vendor payments, or non-commitment costs. |
| `getMarginAnalysis` | Compare revenue (prime contracts and owner change orders) against costs (commitments, direct costs) to analyze project profitability. Returns original estimated margin, current projected margin, margin trend, and breakdown showing where margin is being gained or lost. Use when asked about profitability, margin, revenue vs cost, project financial health, or over/under budget analysis. |

### `forecast-tools.ts` (1)

| Tool | Description |
|------|-------------|
| `getForecastComparison` | Compare original budget vs. revised budget vs. actual costs for a project. Shows budget line-by-line variance, cost code analysis, and over/under budget items. Use when asked about forecast, budget vs actual, variance analysis, or which cost codes are over budget. |

### `marketing.ts` (6)

| Tool | Description |
|------|-------------|
| `createContentCalendarDraft` | Persist a reviewable weekly content calendar draft. Every item must include source item IDs and rationale. Use this after source-backed intelligence items exist. |
| `createMarketingContentAsset` | Persist a draft marketing asset tied to a calendar item. Drafts are not publishable until reviewed and approved. |
| `createMarketingIntelligenceFromCandidate` | Persist one of the source candidates returned by findMarketingSourceCandidates as a marketing intelligence item. |
| `createMarketingIntelligenceItem` | Persist a source-backed marketing opportunity or signal for reuse. Use this when a source candidate should become part of marketing memory. |
| `findMarketingSourceCandidates` | Find source-backed marketing inputs from documents, project summaries, AI insights, and recent operational records. Use before making claims about project wins, owner praise, leadership notes, recent events, or content opportunities. |
| `getMarketingCalendar` | Retrieve persisted marketing calendar items, draft assets, source citations, and review states for the marketing review page. |

### `operational.ts` (20)

| Tool | Description |
|------|-------------|
| `findProject` | Look up a project by name (partial match) or list all active projects. Use this when the user mentions a project by name and you need to resolve it to an ID, or when you're unsure which project they mean. Returns project ID, name, phase, and key stats. |
| `getCompanyKnowledge` | Retrieve company-level context: mission, vision, goals, strategy, OKRs, org structure, competitive landscape, policies, key clients, certifications, and free-form knowledge articles. Use this when the user asks about the company itself, its strategy, values, differentiators, history, or competitive positioning. Also use this to retrieve policy info or best practices. |
| `getCrossProjectComparison` | Compare key metrics across multiple projects side-by-side: budget, schedule, RFI/submittal counts, change order exposure, and health status. Use when asked to compare projects or see which project has the most risk, biggest budget, etc. |
| `getHistoricalTrends` | Analyze how a project's metrics have changed over time: RFI creation trends, submittal pipeline velocity, change order trends, and schedule progress. Use when asked about trends, velocity, trajectory, or how things have changed. |
| `getMeetingDetails` | Get the FULL details of a specific meeting including its digest, segments with speaker discussion topics, decisions, risks, and action items. Provide EITHER meetingId (exact DB id from a prior search) OR meetingTitle (the meeting name — will be looked up automatically). NEVER guess or construct a meetingId from a date or title string. If you only know the title, pass meetingTitle and the ID will be resolved. |
| `getPeopleAndRoles` | Get the project directory: who is on a project, their roles, companies, and contact information. Use when asked about team members, contacts, who works on a project, or project personnel. |
| `getRecentEmails` | Get a list of Outlook emails received within a specific date range. Use this when the user asks a time-based question about emails: 'what emails did I receive today?', 'show me emails from this week', 'any emails received yesterday?', 'how many emails came in today?'. This queries the backend Microsoft Graph live inbox first. Synced Outlook intake rows are fallback only — never treat them as live inbox truth. By default, queries the signed-in user's synced mailbox so 'my emails today' does not spill into other mailboxes. Returns consolidated conversation/thread groups first, with message counts, senders, recipients, dates, and previews. Use participantEmail plus direction='to' or direction='from' only when the user explicitly asks for emails to/from a person. Always summarize results by thread, not as a raw individual-message dump. |
| `getRFIStatus` | Analyze RFI (Request for Information) status for a project. Shows overdue RFIs, response times, ball-in-court distribution, cost/schedule impacts, and status breakdown. Use when asked about RFIs, questions pending, or information requests. |
| `getSubmittalStatus` | Analyze submittal status for a project. Shows overdue submittals, approval pipeline, ball-in-court distribution, lead times, and status breakdown. Use when asked about submittals, approvals, material submissions, or shop drawings. |
| `getVendorPerformance` | Analyze vendor/subcontractor performance across a project or portfolio. Shows active vendors, their contract values, change order exposure, and billing status. Use when asked about vendor performance, subcontractor status, or trade partner metrics. |
| `recallPastConversations` | Search past conversation memories to recall prior discussions with this user. Use when the user references previous conversations ("like we talked about", "remember when", "last time"), or when context from prior sessions would improve the response (recurring topics, established preferences, prior decisions). |
| `saveInsight` | Save a structured insight extracted from meetings or conversations. Use when the user highlights something important from a meeting or discussion that should be tracked — risks, decisions, cost impacts, design considerations, etc. Links to the source meeting when available. |
| `saveToKnowledgeBase` | Save knowledge, lessons learned, best practices, or institutional memory to the company knowledge base. Use this when the user says 'save this', 'remember this', 'I want to capture this', or 'add this to the knowledge base'. Admin saves are approved and searchable immediately; non-admin saves are captured as drafts for admin review before they become available through the AI assistant. Categories: lessons_learned, best_practice, process, policy, market_intel, general, strategy, org_update. |
| `searchEmails` | Semantic search across Outlook email content synced from Microsoft 365. Use this when the user asks about a TOPIC in emails — not a date range. Examples: 'any emails about the permit delay?', 'what did we send to the GC about change orders?', 'find emails mentioning the subcontractor dispute'. For date-based questions ('what emails today?', 'show me this week's emails'), use getRecentEmails instead. Returns email subject, sender/recipients, date, and relevant content. Always cite results as 'email from [participants] on [date]'. |
| `searchExternalDocuments` | Search OneDrive files and uploaded project documents (PDFs, Word docs, spreadsheets, etc.). Use this when the user asks about specific documents, reports, specs, or files (e.g. 'find the geotechnical report', 'what does the contract say about liquidated damages?', 'search the RFP document for insurance requirements'). Distinct from meeting transcripts — this searches files and documents. Always cite results as 'document: [title] ([date if available])'. |
| `searchMeetingsByTopic` | Search for meetings about a specific topic across ALL projects. Returns enriched results with speaker quotes, decisions, risks, and action items from meeting digests and segments. Use this when the user asks 'find meetings about X' or 'what have we discussed about Y'. Works cross-project by default. Combines keyword search AND semantic search for best coverage. |
| `searchMemories` | Search your memory of this user — their preferences, facts about projects, lessons learned, open commitments, and recent context from past sessions. Use this when the user references something from a previous conversation, or when you want to personalize a response based on what you know about them. Memory types: fact (project/people facts), preference (how they like info), lesson (patterns you've observed), commitment (tracked commitments), context (situational context from recent sessions). |
| `searchTeamsMessages` | Search Microsoft Teams channel message threads. Use this when the user asks about Teams conversations, channel discussions, or anything communicated in Teams (e.g. 'what did the team say about the schedule in Teams?', 'find Teams messages about the subcontractor issue'). Returns channel name, participants, date, and message content. Always cite results as 'Teams message in [channel] on [date]'. |
| `semanticSearch` | Search across ALL project knowledge using semantic similarity: meeting transcripts (full chunked transcripts, segment summaries, meeting summaries), emails, Teams messages, OneDrive documents, insights (decisions/risks/opportunities), company knowledge base entries (lessons learned, pricing intel, vendor intel), and other indexed content. Uses unified document_chunks table (24K+ chunks) + insights + knowledge base. Works CROSS-PROJECT by default — no project filter needed. Optionally filter by project name or ID, or by source type. Use when the user asks a broad question that could span multiple data types, or when keyword search isn't finding results. |
| `writeMemory` | Store a durable memory about this user for future sessions. Use this when you learn something worth remembering: a preference, a fact about their projects or team, a pattern you've noticed, a commitment that needs tracking, or important context. Do NOT use this for transient operational data — only things that improve future conversations. Memory types: fact (objective facts), preference (how they like things), lesson (patterns/insights), commitment (tracked commitment with owner + deadline), context (situational context, expires in 30 days). |

### `outlook-operations.ts` (2)

| Tool | Description |
|------|-------------|
| `getOutlookCalendarEvents` | Read calendar events from Outlook for a date window. Use this when the user asks 'what meetings do I have today / tomorrow / this week', 'is my calendar free Tuesday afternoon', 'who am I meeting with', 'what's next on my schedule'. Use createOutlookCalendarInvite for WRITES (scheduling); this tool only READS. Returns event subject, start/end (in America/New_York timezone), location, attendees, organizer, online meeting join URL, and importance. Recurring meetings are expanded into individual instances within the window. Cancelled and all-day events are included; the caller can filter as needed. |
| `getOutlookOperationsStatus` | Check Outlook/Microsoft Graph operational status for real-time email capability: Graph subscriptions, webhook notifications, sync freshness, and errors. Use when the user asks whether Outlook monitoring, notifications, or real-time email querying is working. |

### `progress-report-tools.ts` (5)

| Tool | Description |
|------|-------------|
| `createWeeklyProgressReportDraft` | Create a weekly project progress report draft in the application. Use when the user asks to create, start, draft, or generate a weekly report/progress report. Preview first and ask for confirmation before writing. The draft can later be edited, have photos selected, previewed as PDF, and emailed. |
| `generateProgressReportPdf` | Generate view/download links for an existing weekly progress report PDF. Use when the user asks to export, preview, view, download, or open the PDF for a weekly progress report. |
| `listProgressReportPhotos` | List available and selected project photos for a progress report. Use before selecting photos or when the user asks which photos can be added. |
| `selectProgressReportPhotos` | Add, remove, or replace selected photos on an existing weekly progress report. Use when the user says to add specific photos, remove photos, or choose photos for the weekly report PDF. Preview before writing. |
| `updateProgressReportSections` | Update editable text/status fields on an existing weekly progress report. Use when the user asks to change highlights, upcoming activities, open items, weather days, title, or readiness status. Preview before writing and ask for approval. |

### `project-tools.ts` (12)

| Tool | Description |
|------|-------------|
| `findProjectDocuments` | **USE THIS to FIND specific documents/files for a project** — permits, contracts, drawings, specs, certificates, daily reports, RFIs, submittals, change orders, financial docs. This is a STRUCTURED lookup against document_metadata by project and document category/type/title keyword. NOT a content search — use searchDocuments for content-inside-the-document queries (e.g. 'what does the spec say about fire ratings'). Returns: file_name, title, type, category, date, OneDrive link, summary, and a content preview. Examples: 'find the permit for Westfield Collective' → category='permit' or titleKeyword='permit'; 'show me drawings for Goodwill' → category='drawing' or titleKeyword='drawing'; 'pull the latest contract' → category='contract' ordered by date desc. |
| `getActionItemsAndInsights` | Get open tasks, priority action items from recent meetings, unresolved AI-surfaced insights, and overdue RFIs. This is the PRIMARY tool for understanding what needs attention NOW and what action items are outstanding. Use when asked: 'what are my tasks', 'what do I need to do', 'what should I be working on', 'show me my action items', 'what's on my plate', 'what's open', 'what's urgent', 'what needs attention', or any question about to-do items, open items, or follow-ups. Also use for person-specific task questions: 'what are Brandon's tasks', 'show tasks assigned to Brandon', 'what does Brandon need to do', 'tasks for [person name]', 'what is [person] working on'. Pass the person's first or last name as assigneeName. |
| `getFinancialAnalysis` | Detailed financial analysis across current projects or a specific project. Computes contract values, change order trends, and flags financial concerns. Use when asked about money, budgets, contracts, costs, or profitability. |
| `getMeetingIntelligence` | Return structured meeting intelligence for completed meetings, risks, decisions, action items, and meeting insights. Use this for prompts like 'tell me about the meetings completed today', 'what insights did you gain from meetings', 'were any critical risks identified in meetings', or 'what decisions/action items came out of meetings'. The output is designed for generative UI rendering as meeting intelligence cards. |
| `getMeetingsByDate` | Get meetings for a specific date or date range. Use this for temporal queries like 'today meetings', 'yesterday', or 'meetings this week'. Returns only meeting records. |
| `getPortfolioOverview` | Get a strategic overview of the project portfolio. By default shows only CURRENT-phase projects (the active ones). Pulls contracts, change events, recent meeting activity, and action items. Use this FIRST when the user asks about projects or portfolio status. The richest data is in meeting transcripts and action items — lead with those insights. |
| `getProjectBriefingSnapshot` | Canonical broad project update snapshot for elite PM/CEO/owner briefings. Use this FIRST for questions like 'latest on project', 'project status', 'what should I worry about', 'owner update', 'CEO briefing', or broad project health. Returns hard facts first: budget, forecast/over-under, commitments, change orders, RFIs, submittals, schedule, open notifications/actions, recent movement, risk signals, data gaps, and recommended operator questions. |
| `getProjectBudgetSummary` | Get a true project budget summary from budget line data (NOT contract value). Use this FIRST for questions like 'total budget', 'budget amount', or 'budget status' for a specific project. |
| `getProjectDetails` | **USE THIS FIRST for any STRUCTURED FACT about a specific project**: address, city, state, project_number, stage, project_manager, OneDrive folder link, budget, completion %, health_score, work_scope, delivery_method, team_members, stakeholders, ERP / Acumatica project id, dates. Do NOT use searchDocuments or semanticSearch for these — they are structured columns on the projects table and this tool returns them directly. ALSO returns recent contracts, schedule, RFIs, and meeting activity for deeper context. Accepts either projectId (preferred when known) or projectName (partial match — for example 'Goodwill Allisonville' resolves to the project named 'Goodwill Allisonville Road'). |
| `getProjectRiskAnalysis` | Deep risk analysis for a specific project. Pulls AI-identified risks, change order exposure, overdue RFIs, schedule slippage, budget data, and recent meeting insights. Use when assessing a project's risk profile. |
| `getProjectsWithRisks` | Portfolio-wide risk radar. Returns which projects currently have risks using structured risk records, unresolved AI insights, issue summaries, and critical health flags. Use this FIRST for questions like 'what projects have risks?' or 'which jobs are most at risk?'. |
| `searchDocuments` | Vector SEARCH inside document CONTENT — meeting transcripts, email bodies, doc text — by topic or keyword. Use ONLY when you need to find the specific TEXT inside documents (e.g. 'what does the spec say about fire ratings'). For finding a specific FILE (the permit, the contract, the drawings) use findProjectDocuments instead. For project FACTS (address, phase, manager) use getProjectDetails. Works across ALL projects by default; optionally filter by projectId/Name. |

### `schedule-tools.ts` (1)

| Tool | Description |
|------|-------------|
| `getScheduleAnalysis` | Analyze the project schedule: overdue tasks, milestones at risk, critical path items, completion percentage, and task dependencies. Use when asked about schedule, timeline, delays, milestones, or task progress for a project. |

### `search-past-conversations.ts` (1)

| Tool | Description |
|------|-------------|
| `searchPastConversations` | Search this user's prior assistant chat messages using live chat_history full-text search. Use for continuity questions such as what was discussed before, previous decisions, or when the user references an earlier chat. Returns anchored message windows and session bookends. This is not document search and must not be used for project files, meeting transcripts, or emails. |

### `structured-output.ts` (1)

| Tool | Description |
|------|-------------|
| `extractStructuredActionBrief` | Convert conversation text, meeting notes, emails, or project context into typed action items, risks, decisions, and data gaps. Use when the user asks for action items, decisions, a checklist, a structured summary, or a handoff-ready output. |

### `structured-queries.ts` (7)

| Tool | Description |
|------|-------------|
| `queryBudgetData` | Query budget line items for a project. Returns cost codes, original budget, changes, revised budget, committed costs, and projected costs. Use for ANY budget or cost question. |
| `queryChangeOrders` | Query change orders for a project. Returns CO number, title, status, amount, and related details. Searches both commitment change orders (subcontractor) and prime contract change orders (owner). Use when asked about change orders, COs, PCCOs, or cost changes. |
| `queryCommitments` | Query commitments (subcontracts, purchase orders) for a project. Returns commitment type, title, status, contract number, and financial details. Use when asked about subcontracts, POs, commitments, or vendor contracts. |
| `queryDirectCosts` | Query direct costs for a project. Returns cost type, amount, invoice number, vendor, date, and status. Use when asked about direct costs, expenses, invoices, or project spend. |
| `queryDocumentRows` | Query structured tabular data extracted from uploaded spreadsheets and financial documents. Each row contains column-value pairs from the original Excel/CSV. Use when asked about data from uploaded spreadsheets or when you need to analyze structured document data. |
| `queryScheduleTasks` | Query schedule tasks for a project. Returns task name, start/end dates, percent complete, status, and WBS code. Use when asked about schedule, tasks, timelines, or project progress. |
| `searchStructuredFinancialRows` | Search structured spreadsheet/financial rows extracted into document_rows for a project. Use this when the user asks about numbers inside uploaded spreadsheets (budgets, estimates, invoices, tabular exports). This is structured-first retrieval (token match on row_data) — better than semantic chunking for numeric questions. |

### `web-search.ts` (3)

| Tool | Description |
|------|-------------|
| `researchCompany` | Research a specific company — competitor, client, subcontractor, or prospect. Returns current info: what they do, recent news, project portfolio, market positioning, and any notable developments. Use for: 'Tell me about [competitor]', 'What is [client] known for?', 'What recent projects has [GC] won?', 'How big is [company]?' |
| `searchConstructionMarket` | Search for construction industry market intelligence: labor costs, material prices (steel, concrete, lumber), regional market conditions, permit activity, construction technology trends, union rates, ENR data, or regulatory changes. Pre-scoped to construction so results are more relevant than a general search. Use for: 'What are current steel prices?', 'How is the Indianapolis construction market doing?', 'What AI tools are GCs using?', 'What's the labor market like?' |
| `searchWeb` | Search the web for real-time information. Use this for competitive analysis, industry trends, market intelligence, company research, construction cost data, technology news, regulatory updates, or ANY question requiring current external knowledge that isn't in our internal systems. Examples: 'What are competitors doing?', 'What's the current state of the construction market?', 'What is [company] known for?', 'What are the latest trends in construction technology?' |


