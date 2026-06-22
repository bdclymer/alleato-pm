# Commitments

**Status:** 🟢 healthy
**Owner:** financial domain
**Last verified:** 2026-05-19

Subcontracts and purchase orders. The canonical example of the "financial tool" pattern in this app: `UnifiedTablePage` + extracted config + React Query hook + REST API + Supabase. New tools should look like this one.

## What it controls

**User-facing:**
- `/[projectId]/commitments` — list view (table)
- `/[projectId]/commitments/[commitmentId]` — detail view with tabs (general, line items, change orders, invoices)
- Commitment creation / edit flows

**API routes:** `frontend/src/app/api/projects/[projectId]/`
- `commitments/` — list + create
- `commitments/[commitmentId]/` — detail CRUD, line items, change orders
- `contracts/` — **shared base**: prime contracts and commitments both use this routing tree (commitments are `contract_type = 'commitment'`)
- `commitment-pcos/[pcoId]/` — potential change orders against commitments

**Background:** none directly. Procore sync (when wired) writes here.

## Main files

**Pages:**
- `frontend/src/app/(main)/[projectId]/commitments/page.tsx` — list (canonical `UnifiedTablePage` reference)
- `frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/` — detail
- `frontend/src/app/(main)/[projectId]/commitment-pcos/` — PCO list/detail

**Feature module:** `frontend/src/features/commitments/`
- `commitments-table-config.tsx` — columns, filters, formatters

**Hooks:**
- `frontend/src/hooks/use-commitments-query.ts` — React Query wrapper for list + detail
- `frontend/src/hooks/use-commitment-change-orders.ts` — CO subset

**Schemas:** `frontend/src/lib/schemas/` (commitment Zod schemas live with the form components)

## Data

**Tables:**
- `commitments` — header row (vendor, contract amount, status, dates)
- `commitment_line_items` — schedule of values
- `commitment_change_orders` — CCOs against a commitment
- `commitment_pcos` — potential change orders (pre-execution)
- `commitment_pco_line_items`

**FK gotchas:**
- `vendor_id` → `companies` table, BUT dropdown UIs source from `vendors` table. ID resolution required in both read and write paths. See [`.claude/rules/FORM-FK-VALIDATION-GATE.md`](../../.claude/rules/FORM-FK-VALIDATION-GATE.md).
- `budget_code_id` → `budget_lines`, dropdown sources from `project_cost_codes`. Same mismatch pattern.
- `projects.id` is INTEGER, not UUID.

**Related views/RPCs:** see `docs/architecture/FINANCIAL-TOOLS-DATA-MAP.md`.

## Depends on

- [Budget](./README.md) — line items reference budget codes
- Prime Contracts — shares `/api/.../contracts` route tree
- Change Events — convert into PCOs which become CCOs against commitments
- Directory (companies, vendors) — vendor selection
- Invoicing — invoices roll up against commitments

## Known risks

- **Vendor FK mismatch** (see above) — caused an entire night of debugging when edit dropdowns blanked out
- **Shared contracts route tree** — code that "fixes commitments" can silently break prime contracts. Always grep `contract_type` filters before touching `/api/projects/[projectId]/contracts/`.
- **Line item recalc** — totals are computed in multiple places (DB trigger + API + client). Drift possible.

## Cleanup targets

1. PRP validation report not yet generated — run `/prp-validate` to confirm parity
2. Centralize line-item total calculation (DB trigger should be source of truth; remove client-side math)
3. Document the `contract_type` discriminator pattern in a shared README under `/api/projects/[projectId]/contracts/`

## Source-of-truth docs

- [`FINANCIAL-TOOLS-DATA-MAP.md`](../architecture/FINANCIAL-TOOLS-DATA-MAP.md) — full financial domain FK map
- [`.claude/rules/FORM-FK-VALIDATION-GATE.md`](../../.claude/rules/FORM-FK-VALIDATION-GATE.md) — mandatory checklist for any form work
- [`.claude/rules/TABLE-PAGE-GATE.md`](../../.claude/rules/TABLE-PAGE-GATE.md) — table page pattern (this page is the reference impl)
- `docs/architecture/architecture_financial_domain.md` (in memory snapshot)
- [`docs/design/tables/table-system.md`](../design/tables/table-system.md) — `UnifiedTablePage` API

## Diagram

```mermaid
flowchart TD
    Page[/projectId/commitments page] --> Hook[use-commitments-query]
    Page --> Config[commitments-table-config.tsx]
    Hook --> API[/api/projects/:projectId/contracts<br/>?contract_type=commitment]
    API --> DB[(commitments<br/>commitment_line_items<br/>commitment_change_orders)]
    DB -.FK.-> Companies[(companies)]
    DB -.FK.-> BudgetLines[(budget_lines)]
    Detail[/commitments/:commitmentId] --> Hook
    Detail --> PCOs[commitment_pcos]
    Detail --> Invoices[invoices roll-up]
```
