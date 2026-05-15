# PRP: Estimate → Prime Contract → Budget → Commitments Flow

**Status:** Draft  
**Created:** 2026-05-15  
**Domain:** Financial  
**Research basis:** Deep agent crawl (2026-05-15) — see `memory/architecture_financial_domain.md`

---

### Goal

Connect the four currently-isolated financial domains so that an approved estimate can seed a prime contract's Schedule of Values, the project budget, and ultimately be traceable through to commitments — in a single coherent workflow rather than four disconnected manual processes.

**Deliverable:** End-to-end workflow from estimate approval → prime contract creation → budget seeding → commitment attribution, with DB traceability, resync support, and business-rule guardrails.

**Success Definition:** A PM can go from an approved estimate to a fully seeded prime contract SOV + budget in under 2 minutes, without touching an Excel file. Every SOV line and budget line can be traced back to the source estimate. The Commitments tab on a prime contract shows only commitments for that contract.

---

### Why

- **Current pain:** Estimates, prime contracts, commitments, and budget are entirely disconnected at the DB level. Seeding a prime contract from an estimate requires downloading an Excel template, filling it, re-uploading it — a workflow that doesn't scale and loses traceability.
- **User impact:** PMs spend significant time manually re-entering estimate data into contracts and budgets. Errors during transcription are common.
- **System integrity:** The Commitments tab on a prime contract detail page currently shows every commitment in the project, not just those tied to that contract. This is misleading.
- **Tech debt being fixed alongside:** V1 estimate data model is still being written on creation but never displayed. Three redundant SOV tables exist for prime contracts.

---

### What — List of Deliverables

**Database Migrations**

- Add `estimate_id` (nullable FK → `estimates.estimate_id`) to `prime_contracts`
- Add `estimate_id` (nullable FK → `estimates.estimate_id`) to `budget_lines`
- Add `prime_contract_id` (nullable FK → `prime_contracts.id`) to `subcontracts`
- Add `prime_contract_id` (nullable FK → `prime_contracts.id`) to `purchase_orders`
- Add `estimate_version` (integer, nullable) to `prime_contracts` — records `estimates.revision` at time of import
- Add `last_synced_from_estimate_at` (timestamptz, nullable) to `prime_contracts`

**API Endpoints**

- `POST /api/projects/[projectId]/contracts/from-estimate` — create prime contract + SOV from approved estimate
- `POST /api/projects/[projectId]/contracts/[contractId]/sync-from-estimate` — resync SOV from updated estimate (guardrailed)
- `POST /api/projects/[projectId]/budget/seed-from-estimate` — seed `budget_lines` from an approved estimate
- Update `GET /api/commitments` — accept optional `prime_contract_id` filter
- Update `GET /api/projects/[projectId]/contracts/[contractId]` — include `estimate_id`, `estimate_version`, `last_synced_from_estimate_at` in response

**Frontend Components / Pages**

- `CreatePrimeContractModal` — split create button into "Blank Contract" vs "From Estimate" paths
- `EstimateImportPreviewStep` — existing preview step, reused inside the new modal
- `SyncFromEstimateButton` — action on prime contract detail, shows estimate version badge, disabled when executed
- `SeedBudgetFromEstimateModal` — on estimates list / detail, "Seed Budget" action with merge/replace choice
- `EstimateVersionBadge` — small chip on prime contract header: "Built from Estimate #14 v2"
- Update `PrimeContractCommitmentsTab` — filter commitments by `prime_contract_id` instead of showing all project commitments

**Cleanup Tasks (scoped separately but included in this PRP)**

- Stop writing `estimate_line_items` on estimate creation (remove from `EstimateService.create`)
- Stop fetching `estimate_line_items` in `[estimateId]/page.tsx` server component
- Delete orphaned `estimate-detail-client.tsx` (V1 client — confirmed no imports)
- Migrate `populate-sov` route off `prime_contract_sovs` → `contract_line_items`
- Update AI tools (`financial.ts`, `operational.ts`) off `schedule_of_values` → `contract_line_items` + commitment SOV tables
- Update `project-setup-wizard/contract-setup.tsx` off `schedule_of_values`

---

### Success Criteria

- [ ] PM can create a prime contract from an approved estimate in one action (no Excel download)
- [ ] All SOV lines on the new contract are populated from `estimate_detail_items` + `estimate_gc_items`
- [ ] `prime_contracts.estimate_id` and `estimate_version` are set on creation
- [ ] PM can seed `budget_lines` from an approved estimate (one action, merge/replace choice)
- [ ] All seeded `budget_lines` have `estimate_id` set for traceability
- [ ] If estimate is updated (new revision), "Sync from Estimate" action is available on prime contract
- [ ] Sync is disabled (button grayed, tooltip shown) when `prime_contracts.executed = true`
- [ ] Sync changes are recorded in the contract's change history
- [ ] Commitments tab on prime contract detail shows only commitments with `prime_contract_id = contractId` (not all project commitments)
- [ ] All estimate alternates and allowances are included as SOV line options during import
- [ ] `estimate_line_items` (V1) is no longer written on estimate creation
- [ ] `estimate-detail-client.tsx` (V1) is deleted

---

## All Needed Context

### Research Foundation

All schema, API routes, and FK relationships were verified by deep agent crawl on 2026-05-15.
Snapshot: `~/.claude/projects/-Users-meganharrison-Documents-alleato-pm/memory/architecture_financial_domain.md`

**Do the light-refresh before implementing:**
```bash
git log --oneline --since="2026-05-15" -- frontend/src/types/database.types.ts \
  frontend/src/app/api/projects/\*/contracts\* \
  frontend/src/app/api/projects/\*/budget\* \
  frontend/src/app/api/projects/\*/commitments\*
```

### Key Reference Files

```yaml
- file: frontend/src/lib/services/estimate-service.ts
  why: Contains create() and bulkAddLineItems() — V1 write path to remove
  gotcha: buildInitialEstimateTemplateLineItems() is called here — must be removed, not just the call

- file: frontend/src/lib/prime-contracts/estimate-workbook-sov.ts
  why: Existing Excel parse/generate logic — reuse parseAlleatoEstimateWorkbook() and createAlleatoEstimateWorkbookTemplate() for the non-Excel code path
  pattern: parseAlleatoEstimateWorkbook() returns EstimateWorkbookImportRow[] — same shape needed for programmatic import

- file: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/estimate-import/activate-budget-codes/route.ts
  why: Logic to create/activate budget codes for new cost codes — reuse this exact flow
  pattern: Reads projectId + rows, creates cost_codes + project_budget_codes entries, returns activated rows

- file: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/route.ts
  why: POST handler for SOV line creation — target for programmatic line insertion
  pattern: Accepts { description, quantity, unit_cost, total_cost, budget_code_id, cost_code_id, line_number }

- file: frontend/src/app/api/projects/[projectId]/budget/import/route.ts
  why: Excel budget import — reuse the insert logic for programmatic seeding
  pattern: Creates cost_codes, project_budget_codes, then inserts budget_lines

- file: frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx
  why: Detail page — add SyncFromEstimateButton to header; update commit history call; add EstimateVersionBadge
  gotcha: ~1170 lines — find the header section and commitments tab section carefully

- file: frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractCommitmentsTab.tsx
  why: Currently passes projectId filter only — must add prime_contract_id filter
  gotcha: useCommitmentsList hook call at line 184 — add contractId to params

- file: frontend/src/hooks/use-commitments-query.ts
  why: Builds commitments API URL — add prime_contract_id query param support

- file: frontend/src/app/api/commitments/route.ts
  why: Add prime_contract_id as accepted filter param; apply to commitments_unified query

- file: frontend/src/app/(main)/[projectId]/estimates/[estimateId]/page.tsx
  why: Remove V1 data fetching (estimate_line_items, v_estimate_division_totals); add "Seed Budget" action
  gotcha: Lines 37-47 fetch V1 data — remove these; update EstimateDetailClientV2 props accordingly

- file: frontend/src/app/(main)/[projectId]/estimates/[estimateId]/estimate-detail-client-v2.tsx
  why: Remove lineItems/divisionTotals/alternates/allowances from props interface; add "Create Contract" and "Seed Budget" actions to toolbar
  gotcha: V2 component has its own inline GC_TEMPLATE (lines 77-156) different from template.ts — use V2 component's template for data mapping

- file: frontend/src/lib/ai/tools/financial.ts
  why: Queries schedule_of_values — must be updated to contract_line_items + commitment SOV tables
  pattern: Lines 241, 287, 1207 reference schedule_of_values — replace with proper tables

- file: frontend/src/components/project-setup-wizard/contract-setup.tsx
  why: Queries schedule_of_values at line 108 — must be updated
```

### Existing Patterns to Follow

```yaml
- file: frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/components/PrimeContractEstimateImportModal.tsx
  why: Existing Excel import modal — this is the UX pattern to extend/replace with the programmatic version
  pattern: Multi-step modal: preview → activate budget codes → confirm import → merge into SOV state

- file: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/estimate-import/activate-budget-codes/route.ts
  why: Budget code activation logic — reuse exactly

- file: frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx
  why: Existing "new contract" page — the "Create from Estimate" flow should share this or extend it
```

### Current State vs Target State

| Domain | Current state | Target state |
|--------|--------------|--------------|
| Estimate → Prime Contract | Excel workbook download/upload | In-app "Create from Estimate" action; programmatic SOV population |
| Estimate → Budget | Completely manual | "Seed Budget from Estimate" action on approved estimate |
| Prime Contract → Budget traceability | None | `budget_lines.estimate_id` FK |
| Prime Contract ↔ Commitment | No link (commitments tab shows all project commitments) | `prime_contract_id` FK on subcontracts/POs; tab filters by contract |
| Estimate revision tracking | None | `estimate_version` + `last_synced_from_estimate_at` on prime_contracts |
| Resync from updated estimate | Not possible | "Sync from Estimate" action (disabled when executed) |
| V1 estimate data | Written on create, fetched on view, silently discarded | Removed from create + fetch path; client file deleted |

---

## Implementation Blueprint

### Data Models

```typescript
// New columns on prime_contracts
interface PrimeContractEstimateLink {
  estimate_id: number | null;          // FK → estimates.estimate_id
  estimate_version: number | null;     // estimates.revision at time of import
  last_synced_from_estimate_at: string | null;  // ISO timestamp
}

// New columns on budget_lines
interface BudgetLineEstimateLink {
  estimate_id: number | null;          // FK → estimates.estimate_id
}

// New columns on subcontracts and purchase_orders
interface CommitmentContractLink {
  prime_contract_id: string | null;    // FK → prime_contracts.id (UUID)
}

// API: Create contract from estimate
interface CreateContractFromEstimateRequest {
  estimateId: number;
  title: string;
  // optional overrides:
  startDate?: string;
  endDate?: string;
  clientId?: string;
  retentionPercentage?: number;
  includedLineItemIds?: number[];  // subset of detail items; if empty, include all
  includeAlternates?: number[];    // alternate IDs to include
  includeAllowances?: number[];    // allowance IDs to include
}

// API: Sync from estimate
interface SyncFromEstimateRequest {
  estimateId: number;
  mergeStrategy: 'replace_amounts' | 'add_new_lines_only';
}

// API: Seed budget from estimate
interface SeedBudgetFromEstimateRequest {
  estimateId: number;
  mergeStrategy: 'replace' | 'merge_add' | 'merge_max';
  // replace: overwrite existing budget_lines amounts
  // merge_add: add estimate amounts to existing
  // merge_max: take higher of existing vs estimate
}
```

### Implementation Tasks (in dependency order)

```yaml
Task 1: Database migrations
  FILE: supabase/migrations/YYYYMMDDXXXXXX_estimate_contract_budget_links.sql
  - ALTER TABLE prime_contracts ADD COLUMN estimate_id integer REFERENCES estimates(estimate_id)
  - ALTER TABLE prime_contracts ADD COLUMN estimate_version integer
  - ALTER TABLE prime_contracts ADD COLUMN last_synced_from_estimate_at timestamptz
  - ALTER TABLE budget_lines ADD COLUMN estimate_id integer REFERENCES estimates(estimate_id)
  - ALTER TABLE subcontracts ADD COLUMN prime_contract_id uuid REFERENCES prime_contracts(id)
  - ALTER TABLE purchase_orders ADD COLUMN prime_contract_id uuid REFERENCES prime_contracts(id)
  - CREATE INDEX on each new FK column
  - RLS: new columns inherit table-level policies (no new policies needed)
  - Run: npm run db:types (required before any TS work)

Task 2: Update commitments API to accept prime_contract_id filter
  FILE: frontend/src/app/api/commitments/route.ts
  - Add prime_contract_id to accepted query params (line ~193)
  - When prime_contract_id provided: join commitments_unified → subcontracts/purchase_orders, filter by prime_contract_id column
  NOTE: Column doesn't exist yet until Task 1 runs — do after migration

Task 3: Update useCommitmentsList hook + PrimeContractCommitmentsTab
  FILE: frontend/src/hooks/use-commitments-query.ts
  - Add optional prime_contract_id param to hook input
  - Include in URL query string when provided
  FILE: frontend/src/components/domain/contracts/prime-contract-detail/PrimeContractCommitmentsTab.tsx
  - Pass contractId as prime_contract_id to useCommitmentsList (line ~184)
  NOTE: Until commitments have prime_contract_id set (Task 8), tab will show empty — that's correct

Task 4: New API route — Create prime contract from estimate
  FILE: frontend/src/app/api/projects/[projectId]/contracts/from-estimate/route.ts
  Steps inside POST handler:
  1. Validate estimateId belongs to projectId; check estimate.status === 'approved'
  2. Fetch estimate_detail_items + estimate_gc_items + estimate_alternates + estimate_allowances
  3. Call activate-budget-codes logic (extract shared fn from existing route) for any new cost codes
  4. INSERT prime_contracts row with estimate_id, estimate_version = estimate.revision, last_synced_from_estimate_at = now()
  5. Map estimate data → contract_line_items rows:
     - estimate_detail_items → line items (cost_code, description, estimated_amount as total_cost)
     - estimate_gc_items → line items (gc cost codes, qty × rate as total_cost)
     - included alternates → additional SOV lines (with description prefix "Alternate: ")
     - included allowances → additional SOV lines (with description prefix "Allowance: ")
  6. Bulk INSERT contract_line_items
  7. Return { contractId, lineItemCount }
  FOLLOW pattern: contracts/route.ts POST handler + activate-budget-codes route
  VALIDATION: Zod schema for request body

Task 5: New API route — Sync prime contract SOV from estimate
  FILE: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/sync-from-estimate/route.ts
  POST handler:
  1. Fetch prime_contract (verify estimate_id is set, verify not executed)
  2. GUARD: if prime_contracts.executed === true → return 422 "Cannot sync executed contract"
  3. GUARD: if prime_contracts.status not in ['draft', 'out_for_signature'] → return 422 with status name
  4. Fetch updated estimate data
  5. Based on mergeStrategy:
     - replace_amounts: UPDATE existing contract_line_items amounts where cost_code_id matches; INSERT new lines; do NOT delete existing lines
     - add_new_lines_only: only INSERT lines for cost codes not already in SOV
  6. UPDATE prime_contracts SET estimate_version = estimate.revision, last_synced_from_estimate_at = now()
  7. INSERT change history record (follow existing pattern for contract change log)
  8. Return { updatedCount, addedCount, skippedCount }

Task 6: New API route — Seed budget from estimate
  FILE: frontend/src/app/api/projects/[projectId]/budget/seed-from-estimate/route.ts
  POST handler:
  1. Validate estimateId + mergeStrategy
  2. GUARD: estimate.status must be 'approved'
  3. Fetch estimate_detail_items + estimate_gc_items (V2 tables only)
  4. Group by (cost_code_id, cost_type_id) → sum estimated_amount per group
  5. For each group:
     - Ensure cost_code exists in cost_codes table (create if not)
     - Ensure project_budget_code exists in project_budget_codes (activate if not)
     - Apply mergeStrategy to existing budget_lines:
       - replace: upsert with estimate amount
       - merge_add: increment original_amount
       - merge_max: update only if estimate amount > existing
     - Set estimate_id on all inserted/updated rows
  6. UPDATE projects.budget to new sum
  7. Return { upsertedCount, skippedCount, totalBudget }
  FOLLOW pattern: budget/import/route.ts (same upsert logic, reuse cost code activation)

Task 7: Frontend — "Create from Estimate" modal + split Create button
  FILE: frontend/src/components/domain/contracts/CreatePrimeContractFromEstimateModal.tsx (new)
  - Multi-step modal:
    Step 1: Select estimate (dropdown of approved estimates for project)
    Step 2: Preview SOV lines (table showing what will be imported; checkboxes to include/exclude alternates + allowances)
    Step 3: Confirm contract details (title, dates, client — pre-filled from estimate)
    Step 4: Success with link to new contract
  - Calls POST /contracts/from-estimate
  FILE: frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx
  - Change "Create" button → DropdownMenu with two items:
    "Blank Contract" (existing flow)
    "From Estimate" (opens CreatePrimeContractFromEstimateModal)
  FOLLOW pattern: PrimeContractEstimateImportModal.tsx (existing multi-step import modal)

Task 8: Frontend — SyncFromEstimateButton on prime contract detail
  FILE: frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx
  - In contract header area: add EstimateVersionBadge (shows "Built from Est. #X v2") when estimate_id is set
  - Add "Sync from Estimate" button in header actions dropdown
  - Button is disabled + tooltip "Contract is executed — SOV cannot be changed" when executed = true
  - Button opens SyncFromEstimateModal (confirm dialog with mergeStrategy choice + preview of changes)
  - On success: invalidate contract query, show toast with counts

Task 9: Frontend — Seed Budget from Estimate
  FILE: frontend/src/app/(main)/[projectId]/estimates/[estimateId]/estimate-detail-client-v2.tsx
  - Add "Seed Budget" action to the estimate toolbar (only visible when status === 'approved')
  - Opens SeedBudgetFromEstimateModal: shows total amount, merge strategy choice (replace / merge_add / merge_max), preview table of cost codes + amounts
  - Calls POST /budget/seed-from-estimate
  FILE: frontend/src/app/(main)/[projectId]/estimates/page.tsx (list)
  - Add "Seed Budget" row action on approved estimates (in the ⋯ menu)

Task 10: V1 estimate data cleanup
  FILE: frontend/src/lib/services/estimate-service.ts
  - Remove buildInitialEstimateTemplateLineItems() call from create() (line ~326)
  - Remove bulkAddLineItems() call from create()
  - Keep bulkAddLineItems() method (still used for manual V1 additions if any; deprecate later)
  FILE: frontend/src/app/(main)/[projectId]/estimates/[estimateId]/page.tsx
  - Remove estimate_line_items fetch (lines 37-41)
  - Remove v_estimate_division_totals fetch (lines 44-47)
  - Remove lineItems + divisionTotals from EstimateDetailClientV2 props
  FILE: frontend/src/app/(main)/[projectId]/estimates/[estimateId]/estimate-detail-client-v2.tsx
  - Remove lineItems, divisionTotals, alternates, allowances from props interface
  - Remove the "legacy props" comment block
  DELETE: frontend/src/app/(main)/[projectId]/estimates/[estimateId]/estimate-detail-client.tsx
  NOTE: Confirmed no imports exist anywhere in codebase

Task 11: SOV legacy table cleanup
  ORDER: Do this LAST — after verifying Tasks 4-9 don't introduce any new references
  STEP A: Migrate populate-sov route off prime_contract_sovs → contract_line_items
    FILE: frontend/src/app/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/populate-sov/route.ts
    - Change .from("prime_contract_sovs") → .from("contract_line_items")
    - Update column mapping (line_amount → total_cost, uom → unit_of_measure)
    - Update payment_application_line_items.sov_item_id to point at contract_line_items instead (or null it)
  STEP B: Update AI tools off schedule_of_values
    FILE: frontend/src/lib/ai/tools/financial.ts (lines 241, 287, 1207)
    FILE: frontend/src/lib/ai/tools/operational.ts (line 510)
    - Replace schedule_of_values queries with: for prime contracts → contract_line_items; for commitments → subcontract_sov_items / purchase_order_sov_items
  STEP C: Update project setup wizard
    FILE: frontend/src/components/project-setup-wizard/contract-setup.tsx (line 108)
    - Replace schedule_of_values query with contract_line_items
  STEP D: Verify zero remaining references to schedule_of_values and prime_contract_sovs
    COMMAND: grep -r "schedule_of_values\|prime_contract_sovs" frontend/src/ --include="*.ts" --include="*.tsx" | grep -v ".generated.ts" | grep -v "db-inventory"
    Expected: zero results outside migration files
  STEP E: Create migration to drop tables (WITH CASCADE guards)
    - First run in dev to confirm no FK violations
    - Drop: sov_line_items, schedule_of_values, prime_contract_sovs (after nulling sov_item_id FK)
    - Drop: contract_financial_summary, contract_financial_summary_mv (legacy views)
```

### Business Rules (Guardrails)

```typescript
// Sync guard — check before any SOV modification from estimate
const RESYNC_ALLOWED_STATUSES = ['draft', 'out_for_signature'] as const;

function canResyncFromEstimate(contract: PrimeContract): { allowed: boolean; reason?: string } {
  if (contract.executed) {
    return { allowed: false, reason: 'Contract is executed. SOV cannot be changed.' };
  }
  if (!RESYNC_ALLOWED_STATUSES.includes(contract.status)) {
    return { allowed: false, reason: `Contract is ${contract.status}. Only Draft and Out for Signature contracts can be resynced.` };
  }
  return { allowed: true };
}

// Estimate eligibility guard
function canPromoteEstimate(estimate: Estimate): { allowed: boolean; reason?: string } {
  if (estimate.status !== 'approved') {
    return { allowed: false, reason: 'Only approved estimates can be used to create contracts or seed budgets.' };
  }
  return { allowed: true };
}

// Budget merge strategy descriptions (show to user)
const MERGE_STRATEGY_LABELS = {
  replace: 'Replace existing amounts with estimate amounts',
  merge_add: 'Add estimate amounts to existing budget (increases totals)',
  merge_max: 'Use the higher of existing vs estimate (conservative)',
};
```

### Data Mapping: Estimate → SOV Lines

```typescript
// estimate_detail_items → contract_line_items
function mapDetailItemToSovLine(item: EstimateDetailItem, lineNumber: number): ContractLineItemInsert {
  return {
    description: `${item.division_name}: ${item.work_description ?? item.cost_code_name}`,
    total_cost: item.estimated_amount,
    cost_code_id: item.cost_code,  // already a cost_code_id
    // budget_code_id: resolved via activate-budget-codes logic
    line_number: lineNumber,
  };
}

// estimate_gc_items → contract_line_items
function mapGcItemToSovLine(item: EstimateGcItem, lineNumber: number): ContractLineItemInsert {
  return {
    description: item.description,
    quantity: item.qty,
    unit_cost: item.rate,
    total_cost: item.qty * item.rate * (item.allocation / 100),
    cost_code_id: item.cost_code,
    line_number: lineNumber,
  };
}

// estimate_alternates → contract_line_items (when included)
function mapAlternateToSovLine(alt: EstimateAlternate, lineNumber: number): ContractLineItemInsert {
  return {
    description: `Alternate ${alt.alternate_number}: ${alt.description}`,
    total_cost: alt.amount,  // positive for add, negative for deduct
    line_number: lineNumber,
  };
}

// estimate_allowances → contract_line_items (when included)
function mapAllowanceToSovLine(al: EstimateAllowance, lineNumber: number): ContractLineItemInsert {
  return {
    description: `Allowance ${al.allowance_number}: ${al.description}`,
    total_cost: al.amount,
    line_number: lineNumber,
  };
}
```

### Data Mapping: Estimate → Budget Lines

```typescript
// Group estimate_detail_items by (cost_code, cost_type) before inserting
function groupEstimateItemsForBudget(
  detailItems: EstimateDetailItem[],
  gcItems: EstimateGcItem[]
): Map<string, { costCodeId: string; costTypeId: string; amount: number }> {
  const map = new Map<string, { costCodeId: string; costTypeId: string; amount: number }>();

  for (const item of detailItems) {
    const key = `${item.cost_code}__${item.cost_type}`;
    const existing = map.get(key);
    if (existing) {
      existing.amount += item.estimated_amount;
    } else {
      map.set(key, { costCodeId: item.cost_code, costTypeId: item.cost_type, amount: item.estimated_amount });
    }
  }

  for (const item of gcItems) {
    const key = `${item.cost_code}__${item.cost_type}`;
    const gcAmount = item.qty * item.rate * ((item.allocation ?? 100) / 100);
    const existing = map.get(key);
    if (existing) {
      existing.amount += gcAmount;
    } else {
      map.set(key, { costCodeId: item.cost_code, costTypeId: item.cost_type, amount: gcAmount });
    }
  }

  return map;
}
```

---

## Validation Loop

### Pre-implementation
```bash
# Regenerate types after running migration
cd frontend && npm run db:types

# Verify new columns appear in database.types.ts
grep "estimate_id" frontend/src/types/database.types.ts | grep "prime_contracts\|budget_lines"
grep "prime_contract_id" frontend/src/types/database.types.ts | grep "subcontracts\|purchase_orders"
```

### Per-task
```bash
cd frontend && npm run quality
# Expected: zero errors after each task
```

### Integration smoke tests (after each major task)
```bash
# Task 4 — Create contract from estimate
curl -X POST http://localhost:3000/api/projects/67/contracts/from-estimate \
  -H "Content-Type: application/json" \
  -d '{"estimateId": <ESTIMATE_ID>, "title": "Test Contract"}' | jq .

# Task 6 — Seed budget from estimate
curl -X POST http://localhost:3000/api/projects/67/budget/seed-from-estimate \
  -H "Content-Type: application/json" \
  -d '{"estimateId": <ESTIMATE_ID>, "mergeStrategy": "replace"}' | jq .

# Task 11 — Verify no legacy SOV references remain
grep -r "schedule_of_values\|prime_contract_sovs" frontend/src/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v ".generated.ts" | grep -v "db-inventory"
# Expected: 0 results
```

### Browser verification (use agent-browser)
```
1. Create an approved estimate for project 67
2. Go to Prime Contracts → Create → "From Estimate" → select estimate → confirm
3. Verify: new contract has SOV lines matching estimate divisions
4. Verify: EstimateVersionBadge shows in contract header
5. Go to Estimates → detail → "Seed Budget" → replace strategy → confirm
6. Verify: Budget page shows lines matching estimate cost codes with estimate amounts
7. Edit estimate (increment revision)
8. Go back to prime contract → "Sync from Estimate" → confirm
9. Verify: SOV amounts updated; change history entry added
10. Execute the contract → verify "Sync from Estimate" button is disabled
11. Create a commitment → link to prime contract
12. Verify: Prime Contract → Commitments tab shows only linked commitment
```

---

## Anti-Patterns to Avoid

- ❌ Don't source SOV from `estimate_line_items` (V1) — use `estimate_detail_items` + `estimate_gc_items`
- ❌ Don't allow resync on executed contracts — check `executed` flag, not just `status`
- ❌ Don't silently overwrite budget lines without merge strategy choice from user
- ❌ Don't delete existing SOV lines during resync (amounts change; lines don't disappear)
- ❌ Don't add new references to `prime_contract_sovs` or `schedule_of_values`
- ❌ Don't skip the `activate-budget-codes` step — missing cost codes in `project_budget_codes` silently break budget rollups
- ❌ Don't use the Excel workbook parse path for the programmatic flow — they share shape but not the file I/O

---

## Open Questions

1. **Estimate alternates: opt-in or opt-out?** During "Create from Estimate" — should alternates be excluded by default (user manually includes) or included by default (user unchecks unwanted ones)? Recommendation: excluded by default (alternates are by nature optional scope).

2. **Budget seed on non-approved estimates?** Current rule is approved-only. Should this be relaxed to allow seeding from "pending_review" estimates? Decision needed from Megan.

3. **Parallel estimate → multiple contracts?** Can one estimate be used to create multiple prime contracts (e.g., by phase)? Current design allows it (FK is nullable on contract, not unique). Is this intended?

4. **V1 `estimate_line_items` data for existing estimates?** Older estimates have V1 data but no V2 data. Should we backfill V2 tables from V1 data, or just leave old estimates without V2 data? If left alone, "Create from Estimate" will produce empty SOVs for old estimates.

5. **Change history table for prime contracts** — confirm which table the existing change log writes to (not found in initial research). Task 5 needs to write there.
