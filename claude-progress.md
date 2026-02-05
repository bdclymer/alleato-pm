## Session 0 Complete - Codebase Analysis & Planning

### Codebase Understanding
- **Framework**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI Library**: shadcn/ui, Radix UI primitives
- **State Management**: React Query (TanStack Query), Zustand
- **Backend**: Supabase (PostgreSQL, Auth, RLS), Python FastAPI
- **ORM**: Drizzle ORM
- **Testing**: Playwright (E2E), Jest (unit)
- **Forms**: React Hook Form + Zod validation
- **Database**: Supabase PostgreSQL with integer PKs for most tables, UUID PKs for contract_change_orders

### Key Conventions from CLAUDE.md
1. **ProjectPageHeader + PageContainer** pattern mandatory for all project pages
2. **Route naming**: Use `[projectId]`, `[changeOrderId]` - NEVER generic `[id]`
3. **Supabase Types Gate**: Run `npm run db:types` before any database work
4. **Next.js Cache Gate**: Clear `.next` before debugging 404s
5. **Root Cause Gate**: Gather runtime evidence before modifying code
6. **File Organization Gate**: No files at project root - scripts in `scripts/`, docs in `docs-ai/`
7. **No banned patterns**: `any`, `@ts-ignore`, `console.log` explicitly banned
8. **Auth**: Automatic from `.env` - NEVER ask user to log in manually
9. **Scaffolding Gate**: Use `/create-feature` for new CRUD features when applicable

### Existing Test Framework
- **Playwright** for E2E tests at `frontend/tests/e2e/`
- **Jest** for unit tests
- Auth state pre-saved in `tests/.auth/user.json`
- Config at `frontend/config/playwright/playwright.config.ts`

### Progress Summary
```
Total Epics: 10
Completed Epics: 0
Total Tasks: 40
Completed Tasks: 0
Total Tests: 19
Passing Tests: 0
Task Completion: 0%
Test Pass Rate: 0%
```

### Accomplished
- Analyzed existing codebase structure and conventions (CLAUDE.md, 11 mandatory gates)
- Read work specification (.yokeflow/app_spec.md - 134KB comprehensive spec)
- Explored all 26+ existing change order files (pages, API routes, hooks, types, tests, migrations)
- Created 10 epics covering all requested modifications
- Expanded ALL 10 epics into 40 total tasks
- Created 19 test cases across functional and style categories
- Created feature branch: `yokeflow/change-orders-completion`

### Epic Summary
1. **Audit & Align Data Access Layer** (5 tasks) - Reconcile change_orders vs contract_change_orders tables, create proper hooks and types
2. **Change Orders List Page Enhancement** (5 tasks) - ProjectPageHeader, summary cards, filtering, tabs, search
3. **Change Order Detail Page** (4 tasks) - Tabbed detail view, general info, summary cards, edit page
4. **Change Order Creation Form** (4 tasks) - API route submission, contract picker, reviewer picker, Procore fields
5. **Approval & Rejection Workflow** (4 tasks) - Reviewer response UI, approval timeline, status transitions
6. **Line Items Management** (4 tasks) - Editable grid, API routes, integration with detail/create pages
7. **Change Event Conversion & Integration** (3 tasks) - Fix convert dialog, CE reference, conversion API
8. **File Attachments System** (3 tasks) - Upload zone, attachment API, detail page integration
9. **Export & Reports** (3 tasks) - CSV export endpoint, export dropdown, basic reports
10. **Testing & Quality Assurance** (5 tasks) - API tests, UI tests, quality checks, regression tests, final review

### Key Files to Modify
**Pages:**
- `frontend/src/app/(main)/[projectId]/change-orders/page.tsx` - List page (update data source, use ProjectPageHeader)
- `frontend/src/app/(main)/[projectId]/change-orders/change-orders-client.tsx` - Client component (add columns, filters, tabs)
- `frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/page.tsx` - Detail page (complete rewrite with tabs)
- `frontend/src/app/(main)/[projectId]/change-orders/new/page.tsx` - Create form (replace Supabase insert with API)
- `frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/edit/page.tsx` - NEW: Edit page

**API Routes:**
- `frontend/src/app/api/projects/[projectId]/change-orders/route.ts` - Update list/create
- `frontend/src/app/api/projects/[projectId]/change-orders/[changeOrderId]/route.ts` - Update detail CRUD
- `frontend/src/app/api/projects/[projectId]/change-orders/[changeOrderId]/approve/route.ts` - NEW
- `frontend/src/app/api/projects/[projectId]/change-orders/[changeOrderId]/reject/route.ts` - NEW
- `frontend/src/app/api/projects/[projectId]/change-orders/[changeOrderId]/line-items/route.ts` - NEW
- `frontend/src/app/api/projects/[projectId]/change-orders/[changeOrderId]/attachments/route.ts` - NEW
- `frontend/src/app/api/projects/[projectId]/change-orders/export/csv/route.ts` - NEW

**Hooks & Types:**
- `frontend/src/hooks/use-contract-change-orders.ts` - NEW: React Query hook for contract COs
- `frontend/src/hooks/use-change-orders.ts` - Existing legacy hook (may need updates)
- `frontend/src/types/contract-change-orders.ts` - Update with missing fields

**Components:**
- `frontend/src/components/domain/change-orders/ChangeOrderDetail.tsx` - NEW
- `frontend/src/components/domain/change-orders/ChangeOrderSummaryCards.tsx` - NEW
- `frontend/src/components/domain/change-orders/ChangeOrderReviewerResponse.tsx` - NEW
- `frontend/src/components/domain/change-orders/ApprovalWorkflow.tsx` - NEW
- `frontend/src/components/domain/change-orders/LineItemsTable.tsx` - NEW
- `frontend/src/components/domain/change-orders/FileUploadZone.tsx` - NEW
- `frontend/src/components/domain/change-orders/ExportDropdown.tsx` - NEW
- `frontend/src/components/domain/change-orders/ReportsDropdown.tsx` - NEW
- `frontend/src/components/domain/change-events/ChangeEventConvertDialog.tsx` - Fix conversion

**Tests:**
- `frontend/tests/e2e/prime-contracts/api-change-orders.spec.ts` - Update existing
- `frontend/tests/e2e/change-orders/change-order-ui.spec.ts` - NEW: UI flow tests

### Existing Patterns to Follow
- **Data fetching**: Custom hooks in `frontend/src/hooks/use-*.ts` wrap Supabase queries with React Query
- **API routes**: Pattern `api/projects/[projectId]/resource/route.ts` with auth + Zod validation
- **Server components**: Use `getProjectInfo()` for server-side data fetching with auth
- **Client components**: `'use client'` required for forms, state, interactivity
- **Detail pages**: Follow `frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx` pattern
- **Forms**: React Hook Form + Zod schemas + toast notifications (sonner)
- **Page headers**: `ProjectPageHeader` from `@/components/layout` (NOT `PageHeader` from design-system)

### Next Session Should
1. Read CLAUDE.md for conventions (especially mandatory gates)
2. Run `npm run db:types` in frontend to get fresh Supabase types
3. Get next task with `mcp__task-manager__get_next_task`
4. Start with Epic 47 (Audit & Align Data Access Layer) - Task 393
5. Implement following existing patterns from CLAUDE.md
6. Run `npm run quality --prefix frontend` after changes
7. Mark tasks complete in database as they finish

### Notes
- **Two table issue**: The codebase has both `change_orders` (legacy, integer IDs, `co_number` field) and `contract_change_orders` (UUID IDs, `change_order_number` field). The list/create pages use the legacy table while the contract-level API routes use `contract_change_orders`. Task 393 must decide the alignment strategy.
- **Direct Supabase vs API**: The current create form inserts directly via Supabase client-side. This bypasses server-side validation and RLS. Must switch to API route calls.
- **PageHeader inconsistency**: Current list page uses `PageHeader` from `@/components/layout/page-header-unified` which may differ from the mandatory `ProjectPageHeader` pattern. Verify and fix.
- **Contract resolution**: Project-level change order routes (no contractId in URL) need to look up contractId from the change order record to delegate to existing contract-level routes or implement independent logic.
- **Integer vs UUID PKs**: The `change_orders` table uses integer IDs while `contract_change_orders` uses UUID strings. The detail page currently does `Number(changeOrderId)` which is correct for integers but would break for UUIDs. The alignment decision in Task 393 will determine the approach.
