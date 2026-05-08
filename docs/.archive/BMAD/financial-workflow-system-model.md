# Financial Workflow – Complete System Model

> **Source:** Megan's braindump (2026-03-02), cleaned and structured for agent context.
> **Status:** Canonical reference for all financial tools work.

---

## Core Flow: Lead → Estimate → Budget → Prime Contract

### Stage 1: Lead / Opportunity

- A new potential project enters the pipeline.
- Internal scoping begins.

### Stage 2: Estimate (Pre-Contract Phase)

- First financial projection.
- Used to assess viability, determine projected costs, shape pricing strategy.
- **Not client-facing.** Strategic planning only.

### Stage 3: Budget (Internal Financial Model)

- The Estimate becomes a Budget.
- **Internal use only.** Tracks projected cost to complete.
- Includes: Markups, Contingencies, Buffers, Risk inflation.
- **May intentionally differ from client-facing values.**
- The budget does NOT need to equal the Prime Contract Schedule of Values.
- The budget is the **internal source of operational truth**.

### Stage 4: Prime Contract (Client-Facing Legal Agreement)

- Budget informs the Prime Contract Schedule of Values (SOV).
- **Client-facing, legally binding** — what the client is contractually obligated to pay.
- The Prime Contract is the **legal financial source of truth** and the billing baseline.
- Once signed and executed: Budget is locked internally, Prime Contract is locked legally.

---

## Change Management Flow (Post-Execution)

After the Prime Contract is executed, changes trigger this workflow:

### Change Event (Beginning of Change Flow)

- The origin point for any change.
- Represents: field issues, scope changes, unexpected conditions, client requests, cost impacts.
- Can be tied to budget line items.
- **Informational and exploratory — NOT financial commitments yet.**

### Potential Change Order (PCCO)

- Change Events roll up into Potential Change Orders.
- **Not every PCCO becomes a final Change Order.**
- Has unique number, status (Pending / Approved / Rejected).
- Linked back to one or more Change Events.
- This is where financial negotiation begins.

### Final Change Order (Prime Contract Change Order)

- Multiple PCCOs may be consolidated into one Final Change Order.
- **Hierarchy:**

  ```
  Prime Contract
  └── Final Change Order(s)
      └── PCCO(s)
          └── Change Event(s)
  ```

- Approved Change Orders update the Prime Contract value.
- Change Events are the foundation. Everything builds upward from there.

---

## Commitments Workflow (Cost-Side Execution)

Parallel to the contract flow. Commitments represent **money going OUT**.

### Two Types:

1. **Subcontractor Commitments** — Contracts with subs performing work.
2. **Purchase Commitments** — Purchase Orders, material purchases, equipment rentals, vendor agreements.

Commitments link to: Budget codes, Cost codes, Line items.
They represent **planned cost obligations**.

---

## Direct Costs (Actual Cost Tracking)

Direct Costs represent **real costs incurred**: labor, materials, equipment, vendor invoices.

- Most will sync from ERP/accounting software automatically.
- System must allow manual entry.
- Every Direct Cost links back to a **Budget Code**.
- Affects internal budget tracking and profitability analysis.
- This is **actual vs projected** tracking.

---

## Invoicing (Revenue Collection)

Final financial stage. Bills the client based on Prime Contract + Approved Change Orders.

### Structure:

- **Billing Periods** — Defined time windows, progress-based billing.
- **Owner Invoicing** — Client-facing (revenue).
- **Contractor / Sub Invoicing** — Payables side (cost).

Invoices reflect: Scheduled values, percent complete, change order additions.
Invoicing pulls from: Prime Contract, Final Change Orders, Billing Period rules.

---

## Complete System Flow

```
Lead → Estimate → Budget (internal) → Prime Contract (legal)

After Execution:
  Change Event → PCCO → Final Change Order → Updates Prime Contract

Parallel Cost Tracking:
  Budget → Commitments (subs + purchases) → Direct Costs (actuals from ERP)

Revenue Flow:
  Prime Contract + Approved COs → Billing Period → Invoice → Payment
```

---

## Critical Structural Insight: Two Parallel Financial Systems

### Revenue Side (Client-Facing)

| Tool | Purpose |
|------|---------|
| Prime Contract | Legal agreement, billing baseline |
| Change Orders | Modifications to contract value |
| Invoicing | Billing the client |

### Cost Side (Internal Execution)

| Tool | Purpose |
|------|---------|
| Budget | Internal projected costs, operational truth |
| Commitments | Planned cost obligations (subs + purchases) |
| Direct Costs | Actual costs incurred |

**Profit = Revenue Side - Cost Side**

**This separation must be preserved architecturally.**

---

## Tool Dependency Graph

```
Change Events ──→ PCCOs ──→ Final Change Orders ──→ Prime Contract
                                    │                       │
                                    ↓                       ↓
                              Commitments              Invoicing
                                    │
                                    ↓
Direct Costs ──────────────→  BUDGET PAGE (rollup of everything)
```

---

## Procore Reference Documentation

- Change Events: <https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-change-events>
- Change Event fields: Number (10 char max, sequential), Title, Status, Origin, Type, Change Reason, Scope, Expecting Revenue, Line Item Revenue Source, Prime Contract for Markup Estimates, Description, Attachments
- Line items require: budget codes, descriptions, vendors, contracts, quantities, UOM, unit costs, ROM values
- Budget code references outside original budget create "partial budget line items"
- Production quantities link contracts and budgets through sub-job and cost-code combinations
- After CE creation, users can generate RFQs to subcontractors → informs PCO creation
