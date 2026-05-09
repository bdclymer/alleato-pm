# Accounting And Acumatica Implementation Bridge

## Purpose

This document translates the accounting and Acumatica implementation into owner-friendly language for NotebookLM. It fills gaps between technical source docs, help articles, and live code.

## What Is Already Built Or Documented

Alleato already has a significant accounting and financial intelligence foundation. The important point is that this is not just a future idea. The app already has live accounting-connected surfaces and AI financial tools.

Current accounting/finance capabilities include:

- Acumatica ERP integration for live accounting data.
- AI CFO advisor that can answer finance questions using Alleato and Acumatica data.
- Acumatica tools for AP aging, AR aging, cash position, vendor spend, recent bills, recent invoices, project budgets, project list, and purchase order summary.
- Financial AI tools for commitments, change orders, direct costs, budget lines, cost trends, and margin analysis.
- Direct costs synced from Acumatica AP bills.
- Accounting dashboard with AR/AP aging, cash position, recent payments/checks, and payment guardrail alerts.
- WIP report route and page at `/accounting/wip`.
- Project Status Report (PSR) feature for live project reporting and PDF export.

## Why This Matters

Historically, accounting and project reporting are often delayed because someone has to export, reconcile, copy, format, and explain the numbers manually.

The direction here is different:

- Acumatica remains the accounting source of truth.
- Alleato mirrors and connects the accounting data to project operations.
- The AI assistant explains the numbers in plain English.
- Project and owner reports can become live instead of monthly/manual.

This means Brandon can ask questions like:

- What is our current cash position?
- Which owners owe us money?
- Which vendors have the largest open AP?
- Which jobs are underbilled?
- Which projects are losing margin?
- Are there Acumatica bills that are not reflected as direct costs?
- What is our PSR status for this project this month?

## Acumatica Data Available To The AI

The Acumatica tool layer exposes live accounting data to the CFO advisor:

| AI Tool | Business Question It Answers |
|---|---|
| AP aging | Who do we owe, how much, and how old are the bills? |
| AR aging | Who owes us, how much, and how old are the receivables? |
| Cash position | What is the net cash movement and current cash picture? |
| Vendor spend | Which vendors are driving cost and outstanding balances? |
| Recent bills | What AP bills recently came in? |
| Recent invoices | What AR invoices were recently issued? |
| Project budget | What budget does Acumatica have for a project? |
| Project list | What projects exist in Acumatica? |
| Purchase order summary | What purchase orders are open or active? |

## Direct Costs

Direct costs are tied to Acumatica AP bills.

The product rule is important:

> Direct costs and payment records that come from accounting should be read-only in Alleato and updated from Acumatica sync.

That protects accounting control while still making cost data visible to project teams and the AI assistant.

## WIP Report

The WIP report already exists as an accounting surface at `/accounting/wip`.

It uses:

- `acumatica_project_budgets`
- `acumatica_ar_invoices`
- `acumatica_projects`

The API aggregates project-level WIP rows and calculates:

- Contract value.
- Revised cost budget.
- Costs to date.
- Committed costs.
- Open commitments.
- Cost to complete.
- Estimated final cost / EAC.
- Cost variance.
- Percent complete.
- Earned revenue.
- Billed to date.
- Over/under billing.
- Forecast gross profit.
- Forecast gross margin percent.
- WIP position: overbilled, underbilled, or balanced.
- Latest sync timestamp.

The WIP calculation is percentage-of-completion based:

```text
percent complete = costs to date / estimated final cost
earned revenue = contract value x percent complete
over/under billing = billed to date - earned revenue
```

Owner-friendly explanation:

> The WIP page is designed to show whether each project is financially ahead, behind, overbilled, underbilled, or trending away from expected profit, using Acumatica-backed numbers.

## PSR Report

The Project Status Report (PSR) is meant to replace manual monthly accounting report assembly.

The PSR plan is to generate a live, always-current project report from app data, including:

- Project information.
- Budget detail.
- Submittals.
- RFIs.
- Change requests.
- Change orders.
- Schedule.
- Monthly billing.
- PM/accounting comments.
- PDF export matching the familiar accounting report format.

Business value:

- Reduces manual accounting/admin work.
- Keeps the report current.
- Gives PMs and Brandon faster visibility into job health.
- Supports owner conversations with source-backed project data.

## Accounting Dashboard

The accounting dashboard brings together:

- AR aging.
- AP aging.
- Cash position.
- Revenue by project.
- Recent payments.
- Recent checks.
- Guardrail alerts for payment anomalies.

This is the owner-facing idea:

> Accounting data should not only live in accounting software. It should surface where project and leadership decisions are being made.

## What Is Still Remaining

The remaining work is mostly about maturity, freshness, and tighter workflows:

- Keep Acumatica sync health visible and reliable.
- Continue connecting raw Acumatica staging tables to user-facing reports.
- Mature PSR parity so the live report fully matches the accounting team's current monthly format.
- Expand WIP from read-only analysis into a stronger forecast review workflow.
- Add clearer owner/PM explanations for variance, overbilling, underbilling, and cash risk.
- Strengthen AI responses so they always cite whether the number came from Alleato project data, Acumatica live data, or a synced Acumatica mirror table.

## Strategic Point For The Podcast

The biggest message for Brandon:

> Accounting automation is one of the strongest parts of the current AI build because the system is already connecting live financial records, ERP data, project budgets, invoices, direct costs, and AI explanations. The vision is to reduce the accounting team's manual reporting burden while giving leadership real-time visibility into cash, margin, billing, and project health.
