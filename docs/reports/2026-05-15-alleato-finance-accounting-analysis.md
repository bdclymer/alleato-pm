# Alleato Finance — Accounting Intelligence Report
*Generated: 2026-05-15 | Source: Alleato Finance project (ID: 60) — meeting transcripts, Teams DMs, emails, task extractions (March–May 2026)*

---

## Executive Summary

The accounting function is actively being rebuilt at a moment when the business has outgrown its original infrastructure. Revenue is at $24M+ annualized with a $29M+ backlog (possibly $60M actual), but the accounting team, systems, and processes haven't scaled with it. Every major problem below is known to leadership — the gap is formalization and execution velocity.

---

## Recurring Issues

### 1. Accounts Payable Is Structurally Broken

Every weekly accounting meeting surfaces an AP problem.

- **April 21:** $11.1M in payables with no clarity on what's actually past due vs on hold. Basic vocabulary ("hold" = awaiting review, "open" = ready to pay) had to be defined in the meeting.
- **May 5:** Misty processed ~$470K in overdue payments in a single push just to clear backlog. That's a cleanup event, not normal operations.
- **Ongoing:** Duplicate invoices. Missing $25K invoice from iBeach creating lien risk. $7,850 underpayment from Goodwill Bloomington unresolved. Retainage check for S&M Painting ($957.50) only processed after a PM emailed accounting directly.

**Root cause:** No systematic invoice intake, no aging review cadence, no separation between who approves and who processes.

---

### 2. The Accounting Software Has Been a Source of Errors, Not Truth

- **May 5 meeting:** Acumatica update caused AR to spike ~$1M due to misclassified invoices (Craven Crepes example). Manual audit and support ticket required. Billing reports had to be rebuilt from scratch.
- **April 21:** Acumatica ↔ Job Planner integration breaks regularly. Manual reconciliation required every month.
- **May 11 (decision meeting):** Team voted to migrate fully to QuickBooks. Stated reasons: too complex, poor support, error-prone. Complete cutover required — no parallel integration. Test account being set up for 2-3 pilot projects before full rollout.

**Root cause:** Acumatica was likely misconfigured at implementation and never had enough in-house expertise to maintain. This is a tool/team mismatch, and the company is now paying the migration cost.

---

### 3. WIP Reporting Is Off by Potentially $31 Million

From the **May 1 Q1 & March 2026 Financial Statement Review** (with LLUM):

> *"Current WIP data underrepresents contract values; actual backlog may be closer to $60 million, not $29 million."*

Reported backlog: $29M. Estimated actual: $60M. That's a 2x error in the single most important forward-looking financial metric for a GC.

Cash flow planning, bonding capacity, credit lines, and staffing decisions are all downstream of WIP accuracy.

**Root cause:** WIP schedules require owner billing status, contract values, and job cost data in sync. None of these are currently maintained in a single system.

---

### 4. The Accounting Team Has Been Understaffed and Underqualified for the Volume

Timeline:
- **Jose (temp):** Assigned bookkeeping, described as "limited workload and slow productivity." Being terminated via temp agency.
- **Bob:** Started April 21 (literally one week into the job). Still being onboarded across AP, AR, and billing. First paycheck was manually adjusted by Brandon because setup wasn't complete.
- **Lauren Rohlfs (candidate — May 11):** 15-16 years experience, QuickBooks proficient, accepted $19/hr 1099 contractor role pending CEO approval and reference checks.
- **Nicholas Hartzell (candidate — May 11):** Disqualified for missing interview without notice.

**Proposed structure (Misty's plan):** Bob books, new hire assists, Misty performs monthly audits and reconciliations. This is the right model — but it isn't live yet.

**Root cause:** The company grew revenue faster than it built accounting headcount. Temp staffing was used for core functions that need permanent ownership.

---

### 5. Physical Mail Backlog — The Most Visible Process Breakdown

From the **"Questions Accounting Indy" meeting (March 2026)**:

> *"Shania scanned and sorted months of mail, helping to find overlooked items for Brandon's review."*

Months of physical mail backlog required manual scanning to surface missed documents, overlooked tax items, and outstanding invoices. A weekly check processing schedule (Thursdays regular, Fridays overflow) was established in this meeting — meaning before March 2026, no structured schedule existed.

**Root cause:** No digital invoice intake process. Paper-first workflow is a $24M company running on a $2M company's infrastructure.

---

### 6. The CEO Is Directly Approving Individual Checks

From Teams DMs (May 6):

> *Brandon: "Go ahead and release payment on Westfield Collective as long as the invoices are correct."*
> *Brandon: "We will pay retainage as well, as long as we have all the close out information."*
> *Misty: "Brandon, if you set up Bob for recurring payments, please remember to adjust his payment to 1760.00."*

The CEO is personally approving individual subcontractor payment releases, coordinating retainage release decisions, and adjusting payroll amounts — all via Teams DMs.

**Why this is a structural problem:** Every AP decision is bottlenecked to one person. This is why there's backlog. It also means accounting can't operate when Brandon is unavailable. The CEO should be setting payment policy, not approving $650 checks.

---

### 7. Client Concentration Risk Is Real and Acknowledged

From the **May 1 Q1 Financial Review:**
- Top 5 projects = **79% of March revenue** (down from 93% in January)
- Improving, but still dangerously concentrated
- One lost project materially impacts cash position
- Backlog growth of 22.5% YoY is a strong signal; concentration is the counterbalance risk

---

## Things That Shouldn't Be Issues at This Stage

| Issue | Why It's a Red Flag |
|-------|---------------------|
| CEO approving individual checks | At $24M revenue, this is a delegation failure and a single point of failure |
| Months of physical mail backlog | Invoice digitization is solved. This is a 2010 problem. |
| "Hold" vs "open" undefined | Basic vocabulary for any accounting team — signals ad-hoc team assembly |
| Monthly close taking weeks | Industry standard is 5 business days. Late close = late decisions. |
| $11M AP with no clarity on what's due | Reporting problem masquerading as a software problem |
| WIP off by potentially $31M | The most important forward-looking metric is unreliable. Bonding and credit risk. |
| Acumatica update creates $1M AR error | Integration was never hardened; no change management process |
| Lien risk from a missing $25K invoice | An invoice this size shouldn't fall through the cracks at any stage |
| Temp workers for core bookkeeping | Temps work for surge capacity. Core AP/AR needs permanent owners. |

---

## Immediate High-Impact Actions (Do These Now)

### 1. Finalize Hiring — This Week
Lauren Rohlfs is the right hire. Get CEO approval done immediately. Every week without a third team member is a week of compounding backlog and Misty carrying unsustainable load.

Formalize Misty's two-check accounting model as written operating procedure, not just a meeting discussion point.

### 2. Delegate Payment Authority — Remove CEO from AP Decisions
Define a written payment authorization matrix:
- Bob / new hire: process invoices (enter, code, queue)
- Misty: approve payments up to a defined threshold
- CEO approval: above threshold only, or for strategic/unusual situations

Stop approving $650 checks in Teams DMs. Every message like that is a bottleneck that becomes AP backlog when Brandon is busy with something else.

### 3. Digital Invoice Intake — Eliminate Paper
Designate `accounting@alleatogroup.com` (already exists) as the single intake point for all invoices. Require all subs and vendors to email invoices — no more physical mail as primary channel.

Short term: route inbox to whoever processes AP. Medium term: AP automation (Bill.com, Ramp, or similar) that captures, codes, and routes without manual sorting.

### 4. QuickBooks Migration — Project-Manage It Properly
Already decided. The risk is a messy cutover that imports bad data.

- **Data accuracy gate:** Reconcile AP, AR, and WIP before migrating. Don't import garbage into the new system.
- **Test account first:** Already planned. Run 2-3 pilot projects through it before full cutover.
- **Sequencing:** Bob and Lauren are being onboarded during the migration. Don't onboard someone to a system you're actively replacing. Get QB set up, then do formal onboarding in QB.

### 5. Fix WIP Reporting — This Week
Reconcile the current WIP schedule against actual contract values in Job Planner. The $31M discrepancy is not a software glitch — it's data that was never entered or updated. Assign Robert Anderson or Misty to reconcile each open project's contract value and billing status. This directly affects bonding capacity and any lender conversations.

### 6. Define and Lock Standard Report Definitions
Before the next weekly accounting meeting, produce a one-page written reference covering:
- What "open" means (ready to pay)
- What "hold" means (pending review)
- What goes into AP aging vs total bills outstanding
- How retainage is tracked separately from operating payables
- How WIP is calculated and who owns each input field

Stops the same vocabulary confusion from recurring every meeting.

---

## Staged Game Plan

### Phase 1 — Stabilize (Now through June 15, 2026)
- [ ] Hire Lauren Rohlfs (this week, pending CEO approval)
- [ ] Define and publish payment authorization matrix
- [ ] Designate `accounting@alleatogroup.com` as digital invoice intake; communicate to all subs/vendors
- [ ] QuickBooks test account live on 2 pilot projects
- [ ] Reconcile WIP schedule against actual contracts
- [ ] Establish and document check processing schedule (Thursdays + Fridays — formalize what's already happening)
- [ ] Complete AP aging cleanup (Misty's active initiative)
- [ ] Publish one-page accounting terminology reference

### Phase 2 — Process Discipline (June–August 2026)
- [ ] QuickBooks full cutover (target: July 1, before mid-year)
- [ ] Two-check accounting model operating with written SOP
- [ ] Monthly close target: complete by 5th business day of following month
- [ ] AP aging reviewed in writing every week at the weekly meeting
- [ ] WIP schedule updated weekly by PMs, reviewed by Misty monthly
- [ ] Client concentration report added to monthly financial review package
- [ ] Brandon fully out of individual AP decisions

### Phase 3 — Visibility and Automation (August–December 2026)
- [ ] AP automation live (Bill.com or similar) — invoices routed without manual sorting
- [ ] CEO completely out of payment approvals below defined threshold
- [ ] Rolling 13-week cash flow forecast model in QuickBooks
- [ ] Monthly financial package distributed to leadership by the 8th of each month
- [ ] WIP accuracy target: actual vs reported within 10%
- [ ] Client concentration target: top 5 projects below 60% of revenue

---

## The Underlying Pattern

These issues aren't isolated. They all connect to the same root:

**Alleato grew revenue faster than it built accounting infrastructure.**

The team went from a smaller operation to $24M+ annualized without commensurate investment in:
- Accounting headcount (temps instead of permanent staff for core functions)
- Process documentation (verbal agreements, no written SOPs)
- System configuration (Acumatica implemented but never hardened)
- Delegation structure (CEO still in the weeds on individual payments)

The good news: leadership is aware of every one of these problems. The weekly accounting meetings show active engagement, not denial. The QuickBooks decision is correct. The two-check model is the right structure. The hiring direction is right.

The gap is formalization speed. Problems are discussed but resolved slowly, and most "resolutions" are verbal commitments in meetings rather than written processes with owners and deadlines. The same topics recur week to week because nothing is written down with accountability attached.

**The highest-leverage single action:** The next weekly accounting meeting should produce one shared document — every open item with an owner and a deadline. Right now those items live only in Fireflies transcripts and Teams DMs. That's why they keep coming back.

---

## Real-Time Red Flags (From Live Database — May 15, 2026)

*Sourced by directly querying the platform's financial tables (subcontracts, subcontractor_invoices, prime_contracts, owner_invoices). These are not from meeting notes — they are the state of the data right now.*

---

### 🔴 Critical: CEO Bridged the Operating Account with Personal Funds

From a May 5 email thread (Chase Bank Outstanding Transactions):

> *"The 50k is something I moved over from my personal account as a bridge loan because we were overdrawn, that will need to be coming back to me so it zeros out the transaction."*

The operating account went negative and the CEO personally wired $50K to cover it. At a company doing $24M+ annualized revenue. This is not a one-off — it means there is no minimum balance alert, no 13-week cash flow forecast, and no proactive treasury position. If it happened once without being caught in advance, it can happen again at a larger scale.

---

### 🔴 $87,962.95 Withdrawal to AutoNation Chevrolet — No Documentation in System

Same May 5 email thread. The accounting team flagged an ~$88K payment to a car dealership as "pending documentation" before it could be entered into Acumatica. A transaction this size without attached documentation is a tax and audit exposure. Unknown whether this was resolved.

---

### 🔴 140 out of 147 Approved Subcontracts Are Unsigned in the System

The database shows 147 subcontracts in "Approved" status. **140 of them have no executed/signed contract on file.** That's 95%.

This means subcontractors are performing work and being paid under contracts that — from a documentation standpoint — don't legally exist in the system. If a sub disputes scope, payment terms, or retainage, there is no signed document to point to. This is a significant lien and legal exposure across the entire portfolio.

Note: signed contracts may exist on paper or in Procore and simply haven't been uploaded/marked here. But that means the system of record is unreliable — which is its own problem.

---

### 🔴 64 Approved Subcontracts with 0% Retainage

Of the 147 approved subcontracts, 64 (44%) have retainage set to zero. Industry standard for construction GCs is 10%, sometimes reducing to 5% at substantial completion. Zero retainage means:
- No financial leverage if a sub's work has defects
- No incentive for subs to complete punch list items and closeout
- Full exposure if a sub abandons work mid-project

Some of these may be intentional (e.g., professional services like engineers, suppliers). But 44% across a general portfolio is unusually high and warrants a review.

---

### 🟡 200 Pending Subcontractor Invoices Across 15+ Projects

The subcontractor invoice table shows 200 invoices in "pending" status, not yet approved or paid. Project 43 alone has 90 pending. Project 31 has 28. These represent money owed to subcontractors that is sitting unprocessed in the queue.

Unpaid sub invoices that age past contract terms create late payment penalties in most subcontract agreements, and in some states trigger statutory interest. Unknown how long these have been pending.

---

### 🟡 Negative Change Orders: Revised Contract Value is $3.3M Below Original

Across 18 prime contracts in the system, the revised contract value ($17.5M) is **$3.3M less than the original** ($20.8M). Downward change orders are legitimate (scope reductions, owner-directed deductions) but at this magnitude they warrant a review to confirm:
- These are genuine scope reductions, not billing errors or contract concessions
- The revenue impact has been properly recognized
- No change orders were left as credits without corresponding scope documentation

---

## AI Build Roadmap

The accounting problems above aren't primarily people problems — they're information architecture problems. The data exists (in Acumatica, Job Planner, email, and this platform) but it isn't surfaced, connected, or acted on automatically. Here is what can be built, in order of impact.

---

### What Needs No AI — Just Scripts (Build in Weeks)

**Cash Flow Alert**
Monitor the operating account balance daily. Below a defined threshold → immediate alert to Brandon and Misty. The bridge loan situation should have been caught 2-3 weeks before it became a problem, not discovered during bank reconciliation.

**AP Aging Live Dashboard**
Pull from QB (post-migration) or Acumatica (now): every open bill, vendor, invoice date, due date, age bucket (0-30, 31-60, 61-90, 90+). Auto-refresh. Replaces the weekly meeting report with something that's always current. Misty shouldn't have to generate a report to see what's overdue.

**Retainage Release Tracker**
Every subcontract has a retainage percentage. When a project hits closeout status, the system automatically surfaces: "Project X is closed. Unreleased retainage with 3 subs totaling $X. Generate checks?" Right now this only happens when a PM emails accounting — like the S&M Painting situation.

**Unsigned Contract Alert**
Any subcontract in "Approved" status with no signed document on file after 14 days → automatic weekly alert to the PM and Misty. The 140-unsigned-contract situation should not be discovered in a data audit. It should never accumulate.

**Check Run Automation**
Every Thursday, a script generates the proposed check run: all bills in "open" status, due within 7 days. Misty reviews and approves. No one manually builds the list.

---

### The WIP Report — The Human-in-the-Loop Is One Field

The WIP schedule is delayed because of a false assumption: that it requires accounting to do heavy lifting. It doesn't.

**What's already in systems:**
- Contract value → Job Planner / Procore
- Billed to date → Acumatica / QB
- Costs incurred → job cost system
- Change orders → PM platform
- Subcontractor commitments → this platform

**The only thing that requires human input:**
**PM's estimated % complete** — one number, one field, updated once a week. Only the person standing on the job knows if the ASRS install at CEVA is actually 40% done or 60% done.

If every PM updates that single number weekly (2 minutes per project), the system generates the WIP schedule instantly: over/under-billings by project, revenue to recognize, projected cash receipts, margin at completion. Updated in real time, not mid-next-month.

Build a weekly PM prompt: every Monday morning, each PM gets a notification for each of their active projects: "Update % complete for [Project Name]." One field. One click. WIP is current.

---

### The PSR — Almost Entirely Automatable

A Project Status Report needs:

| Field | Source | Human Required? |
|-------|--------|----------------|
| Contract value | System | No |
| Change orders to date | System | No |
| Revised contract | Calculated | No |
| Billed to date | Accounting | No |
| Remaining to bill | Calculated | No |
| Costs incurred | Job cost | No |
| Estimated cost at completion | % complete input | PM provides % complete |
| Projected margin | Calculated | No |
| Schedule status | PM judgment | Yes — one sentence |
| Open RFIs / submittals | System | No |
| Pending change orders | System | No |

Two fields require human input. Everything else is a query. Generate the PSR pre-filled every week; the PM writes one sentence and confirms % complete. Done.

---

### What Needs AI (Build After Systems Are Stable)

**Invoice Coding**
When an invoice arrives from a known vendor for a known project, AI codes it to the correct cost code based on historical patterns — 90%+ accuracy for recurring vendors. Exceptions only go to humans.

**Anomaly Detection — Daily Digest**
- Invoice from vendor X is 25% higher than their historical average → flag
- Project Y costs are running 8% over budget → flag
- AR item from owner Z is 47 days outstanding (terms are net 30) → escalate
- A sub has 3 pending invoices with no approvals in 21 days → flag

One daily email. Misty reviews exceptions, not everything.

**Cash Flow Forecasting**
AI model trained on historical billing patterns + current AR + open subcontractor commitments: "Expected cash receipts over the next 13 weeks: $X by week, with the following risks." Updated weekly. Flags when actuals deviate from forecast.

**Lien Waiver Tracking**
Match every payment to a subcontractor against a required lien waiver. Flag any payment where no corresponding waiver was received before the check was cut. This is how the iBeach invoice situation gets caught before it becomes a lien, not after.

**Owner Billing Automation**
When a project hits a billing milestone (PM marks % complete, job costs hit threshold, billing period opens), draft the owner invoice automatically from the contract's schedule of values. PM reviews and approves. Billing goes out the same week work is completed, not three weeks later.

---

### Sequencing

| Timeline | Build |
|----------|-------|
| Now (weeks) | Cash flow alert, AP aging dashboard, retainage tracker, unsigned contract alert |
| After QB migration | Check run automation, WIP % complete weekly prompt, auto PSR generation |
| Q3 2026 | Invoice coding AI, anomaly detection daily digest |
| Q4 2026 | Cash flow forecasting model, lien waiver tracking, owner billing automation |

The first four can be built before QuickBooks is live. They don't depend on which accounting system is in use — they depend on data that's already in this platform.

---

*Sources: Fireflies meeting transcripts, Teams DM conversations, Outlook emails, and live database queries (subcontracts, subcontractor_invoices, prime_contracts, owner_invoices tables). Covers March–May 2026.*
