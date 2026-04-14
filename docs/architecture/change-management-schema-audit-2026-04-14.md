# Change Management Schema Audit

Date: 2026-04-14

## Scope

This audit reviewed the data model and query paths that connect:

- `prime_contracts`
- `commitments_unified` and its base tables `subcontracts` + `purchase_orders`
- `change_events`
- `prime_contract_change_orders`
- `contract_change_orders`

The goal was to identify where the schema, migrations, generated types, and app code disagree, and to define a safer development direction.

## Executive Summary

The change-management model is currently split across multiple generations of schema design.

The largest risk is `contract_change_orders`. Different parts of the repo treat it as:

- prime contract change orders
- commitment change orders
- the source of truth for `prime_contracts.revised_contract_value`

Those meanings are mutually incompatible. Development has drifted into a state where one route can look correct while another route quietly relies on a different table contract.

## Findings

### 1. `contract_change_orders` has conflicting ownership semantics

Evidence:

- `supabase/migrations/schema_dump.sql` defines `contract_change_orders.contract_id` with an FK to `prime_contracts(id)`.
- `supabase/migrations/schema_dump.sql` comments describe `contract_change_orders` as "Change orders for prime contracts with approval workflow".
- `frontend/src/app/api/commitments/[commitmentId]/change-orders/route.ts` treats `contract_change_orders.contract_id` as a commitment id.
- `frontend/src/app/api/projects/[projectId]/commitment-change-orders/route.ts` treats `contract_change_orders` as the commitment-side change order table.
- `supabase/migrations/20260409000001_change_orders_missing_procore_fields.sql` explicitly labels `contract_change_orders` as "commitment COs".
- `supabase/migrations/20260413000003_prime_contracts_perf_and_security.sql` uses `contract_change_orders` to recalculate `prime_contracts.revised_contract_value`.

Impact:

- High risk of invalid writes, orphaned records, or incorrect joins.
- Engineers cannot infer the correct source of truth from the schema alone.

### 2. `prime_contract_change_orders` and `contract_change_orders` overlap in responsibility

Evidence:

- The app has dedicated revenue-side APIs under `frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/*`.
- The app also has contract-level APIs under `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/*` that write to `contract_change_orders`.

Impact:

- Two tables appear to model official change orders against contracts.
- Reporting and downstream sync code can drift depending on which table a feature reads.

### 3. `change_events` references have also drifted across schema generations

Evidence:

- `supabase/migrations/20260404000001_fix_change_events_prime_contract_fk.sql` sets `change_events.prime_contract_id` to reference `prime_contracts(id)`.
- `supabase/migrations/schema_dump.sql` still shows `change_events_prime_contract_id_fkey` pointing at `contracts(id)`.
- `frontend/src/types/database.types.ts` shows `change_events.prime_contract_id` as a string FK to `prime_contracts(id)`.

Impact:

- The schema dump is not a reliable source of truth for this area.
- Developers can make the wrong join or write code against stale metadata.

### 4. `change_events_summary` is a fragile read model

Evidence:

- `supabase/migrations/schema_dump.sql` defines `change_events_summary` as a materialized view.
- It is refreshed by statement-level triggers on `change_events`, `change_event_line_items`, `change_event_rfqs`, and `change_event_rfq_responses`.

Impact:

- Writes pay the cost of refreshing a materialized view.
- This is operationally fragile at scale and can amplify lock contention during bulk imports or workflow-heavy usage.

### 5. `commitments_unified` is the right read abstraction, but it is not treated as canonical everywhere

Evidence:

- Many commitment-facing routes correctly use `commitments_unified` to resolve the commitment type first.
- Some shared helpers and client hooks still bypass that read model and assume direct table columns that are not stable across the schema history.

Impact:

- Duplicated query logic.
- New features can easily reintroduce the wrong assumptions.

## Safe Direction For Development

Until a dedicated schema cleanup lands, development should follow these rules:

1. Revenue side:
Use `prime_contracts` + `prime_contract_change_orders`.

2. Commitment side:
Use `commitments_unified` as the project-scoped read model and treat `contract_change_orders` as commitment-facing only in application code.

3. Change event linking:
Use `change_events` as the intent layer and explicit link tables for promotions and lineage.

4. Project-scoped commitment CO queries:
Resolve commitment ids through `commitments_unified`, then fetch `contract_change_orders` by `contract_id`.

5. Do not add new features that make `contract_change_orders` responsible for both prime-contract and commitment workflows.

## Immediate Repo Improvements Made

### Shared frontend query path corrected

- `frontend/src/hooks/use-change-management.ts`
- `frontend/src/lib/supabase/queries.ts`

These were updated to stop assuming `contract_change_orders.project_id` is the canonical project filter. The code now resolves commitment-side change orders through the project API or through `commitments_unified` first.

## Recommended Next Migration

This should be done as a deliberate schema cleanup, not a casual feature PR.

### Target state

Option A, preferred:

- `prime_contract_change_orders` is the only official revenue-side change order table.
- `commitment_change_orders` becomes the explicit commitment-side table.
- `contract_change_orders` is deprecated and migrated out.

Option B, acceptable:

- Keep `contract_change_orders`, but formally redefine it as commitment-side only.
- Remove all prime-contract semantics, comments, triggers, and dependent logic from it.
- Move prime-contract revised-value syncing to `prime_contract_change_orders`.

### Required cleanup steps

1. Decide canonical ownership for each change-order table.
2. Backfill or migrate rows if the same table currently stores mixed meanings.
3. Replace stale comments and stale generated schema artifacts.
4. Add a single authoritative reporting view for change-management rollups.
5. Replace the trigger-based full materialized view refresh on `change_events_summary` with either:
   - a normal view over indexed base tables, or
   - an async refresh strategy outside write transactions.

## Risks If Left As-Is

- New features will continue to encode contradictory assumptions.
- Financial summaries can diverge from the workflow UI.
- Schema dumps and generated types will remain hard to trust during debugging.
- Bulk change-management activity can become slower or more failure-prone because of trigger-driven summary refreshes.
