# Invoice line-item detail from Acumatica AP bills (2026-07-09)

Follow-up to PR #723 (which set `subcontract_sov_items.billed_to_date` from Acumatica AP
bills). PR #723 gave commitments a rolled-up billed total; this run populates the
**per-invoice line detail** so each commitment's Invoices tab shows real line items.

## What ran

`scripts/jobplanner/import-invoice-line-items.mjs --apply`

For every Acumatica-linked `subcontractor_invoices` row (`acumatica_ap_bill_id IS NOT NULL`)
that had **no** rows in `subcontractor_invoice_line_items`, it created one line item per
`acumatica_ap_bill_lines` row of the linked bill:

| field | source |
|-------|--------|
| `budget_code` | dashed cost code (`507000` → `50-7000`); **null** when the AP line's cost code is garbage (`{}`, retainage lines) |
| `description` | `transaction_description` \|\| `description` |
| `scheduled_value` = `work_completed_period` | `amount` (fallback `extended_cost`) |
| `work_completed_pct` | 100 (scheduled == completed this period) |
| retainage / materials fields | 0 |
| `sort_order` | line index + 1 |
| `net_amount_this_period`, `total_completed_stored`, `balance_to_finish` | **not inserted** — GENERATED columns |

Scope: Acumatica-linked invoices only (JobPlanner-only invoices are not trusted).
Idempotent — invoices that already have line items are skipped, so re-running never
duplicates.

## Result (`line-items-plan.json`)

- 2,416 Acumatica-linked invoices; 1 already had line items.
- **2,369 invoices populated → 2,985 line items created** (172 commitment-linked).
- 528 lines had garbage cost codes → `budget_code` set null (retainage lines still created so totals reconcile).
- 46 invoices skipped: their AP bill has zero `acumatica_ap_bill_lines` (retainage-only bills with no lines).
- 0 reconciliation flags — every invoice's Σ line-item amount equals its AP bill total.

## Verify (`verify.json`) — `--verify`

For every Acumatica-linked **subcontract**, compared
`subcontracts_with_invoice_stats.total_billed_from_line_items` (now sourced from the new
line items) to Σ `subcontract_sov_items.billed_to_date` (written by PR #723).

- **23 / 24 match exactly.**
- 1 mismatch: **SC-000316 (Goodwill Bloomington)** — line items total **$1,126,241.49**
  (correct, matches its 142 Acumatica bills across 33 cost codes), but its SOV
  `billed_to_date` is **$0**. This is a **pre-existing PR #723 gap**, not a defect here:
  SC-000316's SOV has a single $6,500 stub line (`31-5000.L`) that matches none of the
  billed cost codes, so #723 could not sensibly allocate $1.13M onto it — the memory
  already flagged this commitment as needing human review. The invoice line items created
  here are the more-accurate figure. **Open item: reconcile SC-000316's SOV.**

## Visual proof

- `invoice-SC-8509-0002-inv003160.pdf` — McLane pilot invoice (single line). Continuation
  sheet renders the invoice line item: **Fire Sprinkler Design / 50-7000.S / $5,000**.
- `invoice-SC-000185-inv002644.pdf` — Westfield invoice. NOTE: the PDF "Contract Lines"
  section renders the **commitment SOV** (14 lines / $1.16M contract), not the invoice's
  7 line items; the invoice's line items ($181,550.99 billed) drive the page-1 summary.
  The authoritative view of the created line items is the invoice detail API
  (`GET /api/projects/43/invoicing/subcontractor/invoices/971`), which returns the 7
  line items (budget code `26-1000.S`, "Subcontract", amounts summing to $181,550.99).

The live in-app Invoices-tab screenshot could not be captured in this session: the shared
local dev server was stuck in a continuous recompile/remount loop (Next dev overlays plus
concurrent edits to the main checkout), which prevented the client React Query hook from
ever settling even though the underlying API returns the line items in ~1.6s. This is an
environment issue, independent of the data change.
