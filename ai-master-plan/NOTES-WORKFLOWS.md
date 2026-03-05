## Workflows

### Braindump

I think it'll be valuable to map out the actual flow so there is a new lead with a potential project and it starts with cream estimate that estimate then turns into a budget which is mainly for internal use that budget eventually will be utilized to create the prime contract schedule of values and this is the client facing ver what becomes the source of truth or legal version. What the client actually legally bound to so although they usually marry each other, the budget doesn't actually need to match the schedule values so it's not for us at these equal one another the budget is more for internal use and it can include markups contingencies so some things might get inflated slightly because you know there may be issues they are or it's kind of a buffer for other areas where your ensure and then at the end of the day with the client sees is the prime contract schedule of value so the budget is what the internal team is utilizing to how close they are to, which actually was projected and then the contract is what is actually paid so after that's finalized on the budget locked once the prime contract is executed and signed final two and then of course there's always changes and then that's where the next flow happens so say there was something that happened that would be considered a change event and it can be tied to Lihn items these change events. There can be multiple of them that then roll up into a potential change order.

Just because there is a potential change order doesn't necessarily mean it's going to become the finalized change order so some of these are approved. Some of them are not and then multiple potential change orders can roll up into a finalize change order but they're all linked back to those potential chain orders, and potential change order is linked back to the change of events so they build on top of each other with a change event being beginning of the flow.

Then there's kind of a separate workflow or I guess this workflow kind of maps back to the budget and that's the commitments and there's two types of commitments. There is the commitments for subcontractors and then commitments for purchase agreements or purchase orders so purchasing material rentals things like that and then commitments for subcontractors that are doing the work..

Then we have direct costs for this is actually documenting what's real as direct costs are incurred and eventually, this will be synced with the ERP accounting platform and so most probably won't even be entered directly in the application will be synced over, but we need the option to add those direct costs natively within the application and every direct cost is not back to a budget code and then there is the final tool which is invoicing and so this is actually then billing the client based on the prime contract plus any of the change orders.

For invoicing there's billing periods and then there's owner invoicing and then there's some contractor invoicing

### Cleaned-up Output

Good. This is exactly the kind of thing that needs to be cleaned up into a system model.

Below is a structured, end-to-end financial flow you can hand directly to Claude Code.

⸻

Complete Financial Workflow – Structured System Model

1. Lead → Estimate → Budget → Prime Contract (Core Flow)

Stage 1: Lead / Opportunity
 • A new potential project enters the pipeline.
 • Internal scoping begins.

⸻

1. Estimate (Pre-Contract Phase)

The Estimate is the first financial projection.

Purpose:
 • Used to assess viability.
 • Helps determine projected costs.
 • Used to shape pricing strategy.

This is not client-facing.
This is strategic planning.

⸻

1. Budget (Internal Financial Model)

The Estimate becomes a Budget.

Budget Characteristics:
 • Internal use only.
 • Tracks projected cost to complete.
 • Includes:
 • Markups
 • Contingencies
 • Buffers
 • Risk inflation
 • May intentionally differ from client-facing values.

Important:
The budget does NOT need to equal the Prime Contract Schedule of Values.

The budget exists to:
 • Track internal performance.
 • Measure projected vs actual.
 • Monitor profit margin.

The budget is the internal source of operational truth.

⸻

1. Prime Contract (Client-Facing Legal Agreement)

Once the project is finalized:

The Budget informs the Prime Contract Schedule of Values (SOV).

This is:
 • Client-facing
 • Legally binding
 • What the client is contractually obligated to pay

The Prime Contract becomes:
 • The legal financial source of truth
 • The billing baseline

Once signed and executed:
 • Budget is locked internally
 • Prime Contract is locked legally

⸻

Change Management Flow (Post-Execution)

After the Prime Contract is executed:

Changes happen.

This triggers the Change Management workflow.

⸻

1. Change Event (Beginning of Change Flow)

A Change Event is the origin point.

It represents:
 • A field issue
 • Scope change
 • Unexpected condition
 • Client request
 • Cost impact

Characteristics:
 • Can be tied to budget line items
 • Multiple change events can exist simultaneously

Change Events are informational and exploratory.

They are NOT financial commitments yet.

⸻

1. Potential Change Order (PCCO)

Change Events can roll up into a Potential Change Order (PCCO).

Important:
Not every PCCO becomes a final Change Order.

PCCO characteristics:
 • Has unique number
 • Has status:
 • Pending
 • Approved
 • Rejected
 • Linked back to:
 • One or more Change Events

This is where financial negotiation begins.

⸻

1. Final Change Order (Prime Contract Change Order)

Multiple PCCOs may be consolidated into one Final Change Order.

Structure:

Change Event
→ PCCO
→ Final Change Order

Key rules:
 • A Final Change Order may include multiple PCCOs.
 • Every Final Change Order links back to its PCCOs.
 • Every PCCO links back to its originating Change Events.
 • Approved Change Orders update the Prime Contract value.

Hierarchy:

Prime Contract
→ Final Change Order(s)
 → PCCO(s)
  → Change Event(s)

Change Events are the foundation.
Everything builds upward from there.

⸻

1. Commitments Workflow (Cost-Side Execution)

Parallel to contract flow is the Commitments workflow.

Commitments represent money going OUT.

Two types:

1. Subcontractor Commitments
 • Contracts with subs performing work.

2. Purchase Commitments
 • Purchase Orders
 • Material purchases
 • Equipment rentals
 • Vendor agreements

Commitments link to:
 • Budget codes
 • Cost codes
 • Line items

They represent planned cost obligations.

⸻

1. Direct Costs (Actual Cost Tracking)

Direct Costs represent:

Real costs incurred.

Examples:
 • Labor
 • Materials
 • Equipment
 • Vendor invoices

Most direct costs will:
 • Sync from ERP/accounting software
 • Flow into the system automatically

However:
The system must allow manual entry.

Every Direct Cost:
 • Links back to a Budget Code
 • Affects internal budget tracking
 • Impacts profitability analysis

This is actual vs projected tracking.

⸻

1. Invoicing (Revenue Collection)

Invoicing is the final financial stage.

Purpose:
Bill the client based on:
 • Prime Contract
 • Approved Change Orders

Structure:

Billing Periods
 • Defined time windows
 • Progress-based billing

Invoice Types:

 1. Owner Invoicing (client-facing)
 2. Contractor / Sub Invoicing (payables side)

Invoices reflect:
 • Scheduled values
 • Percent complete
 • Change Order additions

Invoicing pulls from:
 • Prime Contract
 • Final Change Orders
 • Billing Period rules

⸻

Complete System Flow (High-Level Summary)

Lead
→ Estimate
→ Budget (internal)
→ Prime Contract (legal)

After Execution:

Change Event
→ PCCO
→ Final Change Order
→ Updates Prime Contract

Parallel Cost Tracking:

Budget
→ Commitments (subs + purchases)
→ Direct Costs (actuals synced from ERP)

Revenue Flow:

Prime Contract + Approved COs
→ Billing Period
→ Invoice
→ Payment

⸻

#### Critical Structural Insight

There are effectively have two parallel financial systems:

##### Revenue Side (Client-Facing)

- Prime Contract
- Change Orders
- Invoicing

##### Cost Side (Internal Execution)

- Budget
- Commitments
- Direct Costs

Profit is the delta between them.

**That separation must be preserved architecturally.**

## Notes

yes, the checklist seems good. Honestly will learn everything. We need to know after we pilot on this first tool as far as specifics I haven't even really been able to focus on that because the biggest time suck has been inconsistency with every tool as you guys mentioned, although they allare different purposes. There is also a lot of of commonality between them at the end of the day every single, one of them points back to a supabase table there is the display on the front end with calculations and roll ups as needed. If we got the table 100% accurate for the first tool then we can literally just utilize that for all the other ones as well with the ability to turn on and off features as needed. I should've stopped wait earlier because the biggest waste of time had been re-fixing the exact same thing across multiple tools when it should've just been done once and then duplicated for the rest.

 for example, every page should have a rollup at the bottom that has totals and for some reason, they just don't

  I'm trying to  decide which tool would be best to start with I was thinking prime contracts because that's actually like the first step in the pipeline and although the budget seems like the source of truth because that's where everything rolls up to prime contracts is the one that's actually the legal file that elito gets paid on, but I don't know if this one is too different than the rest of them so prime contracts obviously like you go to that page it's gonna have a table view. The columns are number, owner/client, title, ERP status, status, executed, original contract amount, approved, change, orders, revised contract am, pending change orders, and then there is a row with the prime contract. One thing that's different about this is that it has a collapsible subsection for each row that shows the change orders

   and so that's going to have a separate table that has these columns, which is potential change order, PCCO, status, executed, approved, change orders, pending, change, orders, draft change orders, so the prime contract is essentially not just the prime contracts. It is the change orders and prime contract so I don't think we should even do prime contracts first because this is showing that honestly, we need to have the change orders tool accurate to ensure this one's accurate and then each potential change order is a row and that's clickable and the PCCO column is clickable too. I think this might be the official PDF file. I'll double check and then going back up to the prime contracts parent row that contract is clickable, which will then take you to that prime contract page..

### Pages associated with prime contracts:

    1. Prime contracts table view, 
    2. Prime contracts detail page
    3. Change order detail page

 Although after going back through this user flow in Procore, I honestly don't think that user experience is very good. There is never gonna be a ton of prime contracts for a project like maximum for probably and usually it's just one so having that table view with the drop down of the prime contract all listed there I think that's pretty confusing and then if you click it it feels like you got lost and you're completely someplace different. Where maybe if we just had that there are a list for you on the left that could be collapsible and then the full prime contract page there that then list the prime contract overview tab, change, orders, invoices, payments received, emails, change history, financial markup, advanc.

Just for clarification, the workflow is like this you have a prime contract and then there may be change orders that are created, but that usually starts with a potential change order so you have the prime contract. Next step would be a potential change order those each have a unique number and then some of those get implemented and some of them don't and the prime contract change orders are the final decision and they include multiple potential change orders in one prime contract change order so it's like there's all these ideas. They decide what they want to actually move forward with and then those items are consolidated into the one prime contract chain orde so they all link back to those potential change orders and so the potential change orders. All have statuses and they could be pending, approved, or rejected.

 Now after all of this and doing this brain dump, I'm not sure what the best next step is we could go ahead and try to audit it the change events and start there since that's really the beginning of the entire flow, but my concern is that there is a bunch of stuff that's going to have been missedand maybe it would be better to start with auditing or scraping the live Procore application for the change events, or maybe just looking at it as a cohesive system rather than separating it by tools.

At the very least, I think this documentation needs to be read in detail and save in the context window:

<https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-change-events>