# Alleato AI: The User Experience Vision

> **What this document is:** A human-readable picture of what AI does for real people at a commercial design-build company. No code. No architecture diagrams. Just: what problems does this solve, what does it feel like to use, and what gets built first.
>
> **Who this is for:** Brandon (owner), the Alleato team, and anyone who needs to understand the "why" before the "how."
>
> **Last updated:** 2026-03-04

---

## Part 1: The Owner's Perspective

### What Brandon Wants to Know (And When)

Brandon runs a commercial design-build company. He has multiple active projects, dozens of subcontractors, millions of dollars moving through the business at any given time, and a team executing across all of it. Here's what keeps him up at night — and how AI changes his day.

---

#### Morning: "What do I need to know today?"

**Today (without AI):**
Brandon checks email, calls his PMs, opens spreadsheets, reviews QuickBooks, scans Procore, and tries to piece together the state of the business from 6 different sources. By 10am he's spent 2 hours just getting oriented. He still doesn't have the full picture because some information is trapped in someone's head, a text thread, or a meeting that happened yesterday that he wasn't in.

**With AI:**
Brandon opens Alleato. The AI briefing is waiting:

> **Good morning, Brandon. Here's what needs your attention today:**
>
> **1. Vermillion Rise — Budget Warning**
> The electrical package is tracking 12% over budget ($38K). This started accelerating 2 weeks ago after CO-012 was approved but the corresponding commitment adjustment wasn't made. If we don't issue the revised commitment to Apex Electric this week, we'll lose the negotiating window.
>
> **2. Cedar Park Office — Cash Flow Alert**
> Invoice #2847 from Hartfield Concrete ($142K) is due Friday. Current receivables won't cover it — there's a $67K gap. The owner payment for Pay App #4 ($210K) was submitted 18 days ago but hasn't been approved. Recommend following up with the client today.
>
> **3. Team Bandwidth**
> Jake is currently assigned to 3 active projects and has 14 open action items across them. His response times have increased 40% over the last 2 weeks. Consider redistributing the Cedar Park punch list to Mike, who has capacity.
>
> **4. Positive Note**
> Summit Ridge is ahead of schedule by 6 days and under budget by 3.2%. The drywall package closed out $12K under the original commitment. Good vendor performance from Allied Interiors — worth noting for future bids.

**What changed:** Brandon didn't hunt for information. The AI already knows every project, every dollar, every person, and every deadline. It tells him what matters, why it matters, and what to do about it. He spends 5 minutes reading instead of 2 hours searching.

---

#### Mid-Day: "Something doesn't look right with this project"

**Today (without AI):**
Brandon gets a gut feeling that a project is going sideways. He pulls up the budget spreadsheet, cross-references change orders, checks the schedule, calls the PM, looks at the original estimate, and tries to figure out if the margin is holding. This takes an afternoon. By the time he has the answer, the problem has been brewing for weeks.

**With AI — a conversation:**

> **Brandon:** "How's the margin looking on Vermillion Rise? I feel like we're bleeding money on the MEP scope."
>
> **AI:** "Your instinct is right. The original MEP budget was $420K across mechanical, electrical, and plumbing. Here's where it stands:
>
> - **Mechanical:** $148K committed, $132K billed. Tracking at 96% of budget. Healthy.
> - **Electrical:** $185K committed, but with CO-012 ($28K) and CO-015 ($14K), effective commitment is $227K against a $160K budget. **42% over budget.** This is the problem.
> - **Plumbing:** $98K committed, $74K billed. On track.
>
> The electrical overrun started with the panel upgrade change event in January. The GC approved the change order but we committed to the sub at a higher rate than what was recovered from the owner. There's a $14K gap between what we're paying Apex Electric and what the owner approved.
>
> **Recommendation:** Before processing Apex's next pay app, negotiate the remaining electrical scope to recover margin. You have leverage — they still have $58K of unbilled work remaining. Alternatively, submit a backcharge for the panel rework that was caused by their original coordination error (documented in RFI-034, response received Feb 3)."

**What changed:** Instead of an afternoon of forensic accounting, Brandon had a 30-second conversation. The AI didn't just give him numbers — it traced the root cause, identified the specific change order that broke the margin, found the gap between owner recovery and sub commitment, and suggested two concrete actions with supporting evidence (the RFI).

---

#### End of Day: "Are we going to finish this project on time?"

**Today (without AI):**
Brandon looks at the schedule in Procore or MS Project. He sees task bars. He doesn't know which delays actually matter (critical path) vs. which have float. He doesn't know that the cabinet delivery delay is going to cascade into 3 other trades unless someone reshuffles next week. He finds out when the PM tells him it's already a problem.

**With AI:**

> **Brandon:** "What's the schedule risk on Cedar Park?"
>
> **AI:** "Overall the project is 4 days behind schedule, but only 1 day of that is on the critical path. Here's what matters:
>
> **Critical:** The millwork package (Allied Custom) is 6 days behind. Their shop drawings were rejected on first submittal and resubmitted last week. If the re-review takes the standard 5 business days, the millwork won't arrive until March 28, which pushes final inspections to April 8 — past your April 4 substantial completion date.
>
> **Action:** Call Allied Custom today to get the revised submittal status. If it's approved, ask them to expedite fabrication (they've done 2-week rush orders before — see Bid Package #7 notes). If it's not approved yet, flag this with the architect and request a same-day review.
>
> **Not critical (but watch):** The painting subcontractor (Pro Finish) hasn't confirmed their start date. They're scheduled to start March 18 but haven't returned the schedule confirmation sent March 1. This has float until March 24 before it becomes critical."

**What changed:** Brandon didn't just see a Gantt chart — the AI told him which delays are real risks, why they happened, what the cascade effect is, and exactly what to do today to prevent a missed deadline.

---

### The Financial Transparency Brandon Needs

This is the biggest pain point. Commercial construction has enormous financial complexity: prime contracts with owners, commitments to subcontractors, change orders flowing in both directions, retention held and released, pay applications processed monthly, direct costs charged against budgets, and cash flowing in and out on different timelines.

**The problems today:**

1. **Money moves faster than tracking.** A change order gets approved verbally on site, the sub does the work, but it doesn't get entered into the system for weeks. By then, the budget report is wrong.

2. **The owner-side and sub-side don't match.** A change order to the owner might be approved for $50K, but the corresponding commitment increase to the sub might be $55K because of markup errors or scope gaps. Nobody catches the $5K leak until the project closes out.

3. **Cash flow is a surprise.** Large sub invoices come due, but the owner payment hasn't arrived yet. Nobody forecasted this gap. Brandon finds out when the bank account is short.

4. **Retention math is invisible.** 10% retention across 30 line items, some partially released, some fully held — nobody has a clear picture of how much retention is outstanding or when it's due back.

5. **Margin erosion is silent.** A project that was estimated at 18% margin slowly erodes to 11% through a series of small change orders, scope additions, and commitments that were slightly higher than budget. No single event is alarming. The cumulative effect is devastating. Nobody sees it until final accounting.

**How AI fixes each one:**

| Problem | AI Solution |
|---------|-------------|
| Tracking lag | AI flags when change events exist without matching change orders or commitments. "CE-008 was created 14 days ago but no CO has been submitted to the owner." |
| Owner/sub mismatch | AI continuously compares owner-approved amounts to sub-committed amounts per cost code. Alerts when they diverge. "Electrical: owner approved $28K, sub committed $34K. $6K negative margin gap." |
| Cash flow surprises | AI projects cash needs 30/60/90 days out based on commitment schedules, billing periods, and historical owner payment timing. "Next 30 days: $340K outgoing, $210K expected incoming. $130K gap — accelerate Pay App #5 submission." |
| Retention complexity | AI tracks retention by line item, calculates total outstanding, and alerts when retention release milestones are approaching. "Cedar Park: $87K retention held. Substantial completion triggers $52K release — target date April 4." |
| Silent margin erosion | AI compares current projected margin to original estimate every day. Trend alerts when margin drops more than 2% in any 30-day period. "Vermillion Rise margin has declined from 16.2% to 13.8% over the last 45 days. Primary driver: electrical scope changes (+$42K cost, +$28K recovery = $14K net loss)." |

---

## Part 2: Every Business Process & How AI Transforms It

Below is every major business process in a commercial design-build company, what it involves today, and specifically how AI either automates it completely or dramatically streamlines it.

### Pre-Construction

| Process | Today | With AI | Automation Level |
|---------|-------|---------|-----------------|
| **Estimating** | Manual quantity takeoffs from drawings, calling subs for pricing, building spreadsheets | AI reads drawings (OCR), extracts quantities, compares to historical cost data from past projects, flags scope gaps | Streamlined (70%) |
| **Bid Analysis** | Compare sub bids manually, check for scope exclusions by reading each bid | AI compares bid scopes side-by-side, highlights exclusions/inclusions, flags outlier pricing, recommends selections based on past performance | Streamlined (80%) |
| **Budget Creation** | Build line-by-line budget from estimate, manually enter into system | AI generates initial budget from estimate data, maps to standard cost codes, flags items that are historically under-budgeted | Streamlined (60%) |
| **Contract Negotiation** | Review contract terms manually, redline changes, track versions | AI reviews contract language, flags unfavorable terms vs. company standards, tracks changes between versions, suggests counter-language | Streamlined (50%) |
| **Permit & Compliance** | Track permit requirements manually, check code compliance, manage submittal deadlines | AI extracts permit requirements from project specs, creates compliance checklist, tracks deadlines, alerts before expiration | Streamlined (70%) |

### Project Execution

| Process | Today | With AI | Automation Level |
|---------|-------|---------|-----------------|
| **Daily Reporting** | PMs write daily logs manually describing weather, workforce, activities | AI generates draft daily log from schedule status, weather API, and photo uploads. PM reviews and approves in 2 minutes. | Streamlined (80%) |
| **RFI Management** | PM writes RFI, sends to architect, waits for response, tracks manually | AI drafts RFI based on field issue description, suggests similar past RFIs and their resolutions, auto-tracks response deadlines, alerts when overdue | Streamlined (60%) |
| **Submittal Processing** | Review submittals, route to architect, track approvals, manage resubmittals | AI checks submittals against spec requirements, flags non-conforming items before architect review, auto-routes by discipline, tracks review timelines | Streamlined (50%) |
| **Change Order Management** | Identify change, price it, submit to owner, negotiate, get approval, update budget, update commitment | AI detects potential changes from RFIs and meeting notes, auto-generates cost estimates from historical data, drafts CO for review, ensures budget and commitment stay in sync | Streamlined (70%) |
| **Schedule Management** | Update tasks manually, identify delays by eye, send look-aheads | AI identifies schedule risks from actual vs. planned progress, predicts delays before they happen, generates 3-week look-aheads automatically, alerts on critical path threats | Streamlined (60%) |
| **Quality Control** | Manual punch lists, physical inspections, paper tracking | AI generates inspection checklists from specs, tracks deficiency resolution rates by trade, identifies repeat quality issues, prioritizes punch items by impact | Streamlined (50%) |
| **Safety Management** | Manual safety plans, toolbox talks, incident reporting | AI generates site-specific safety plans from project scope, auto-creates toolbox talk topics based on current work activities, tracks leading indicators | Streamlined (40%) |
| **Meeting Management** | Take notes, distribute minutes, track action items manually | AI transcribes meetings, extracts action items with owners and due dates, tracks completion across meetings, flags recurring unresolved items | Automated (90%) |
| **Photo Documentation** | Take photos, manually tag with location and trade, file in project folder | AI auto-tags photos by trade and location using image recognition, links to relevant tasks and punch items, creates visual progress timeline | Streamlined (70%) |

### Financial Management

| Process | Today | With AI | Automation Level |
|---------|-------|---------|-----------------|
| **Pay Application Processing** | Collect sub pay apps, verify quantities, check against commitments, compile owner pay app | AI validates sub pay app line items against commitment values and schedule progress, flags discrepancies, drafts owner pay app from approved sub pay apps | Streamlined (70%) |
| **Invoice Review** | Manually check invoices against POs and commitments, approve for payment | AI matches invoices to commitments, flags discrepancies in amount/quantity/description, auto-routes for approval, tracks payment status | Streamlined (80%) |
| **Budget Tracking** | Compare actuals to budget in spreadsheets, look for variances | AI monitors budget continuously, alerts on variances by threshold, explains root causes, projects final cost at completion | Automated (85%) |
| **Cash Flow Forecasting** | Manual spreadsheet projections based on billing schedule and payment terms | AI projects cash needs from commitment schedules, billing periods, and historical payment patterns. Updates daily. | Automated (90%) |
| **Cost Coding** | Manually assign cost codes to invoices and expenses | AI auto-assigns cost codes based on vendor, description, and historical patterns. PM verifies. | Streamlined (80%) |
| **Retention Tracking** | Track retention by line item in spreadsheets, calculate releases manually | AI tracks retention automatically, calculates release triggers, alerts before milestone dates | Automated (95%) |
| **Month-End Close** | Compile all project financials, reconcile, prepare reports | AI generates month-end financial package with variance explanations, WIP schedule, and margin analysis | Streamlined (70%) |
| **Lien Waiver Management** | Collect lien waivers from subs before releasing payment, track conditional vs. unconditional | AI tracks waiver status by sub by pay period, alerts before payment release if waivers are missing, generates waiver request emails | Streamlined (75%) |

### Business Operations

| Process | Today | With AI | Automation Level |
|---------|-------|---------|-----------------|
| **Resource Planning** | PM asks around about availability, checks calendars, guesses capacity | AI knows every person's project assignments, current workload, and upcoming commitments. Recommends optimal staffing. | Streamlined (70%) |
| **Vendor Management** | Track vendor performance by memory, informal reputation | AI scores vendors on delivery time, quality (rework rate), responsiveness, price competitiveness based on all historical data | Automated (80%) |
| **Client Communication** | PMs send updates via email, client calls to ask status questions | AI generates client-ready progress reports, proactively sends updates at defined milestones, prepares PM for client calls with talking points | Streamlined (60%) |
| **Business Development** | Track opportunities in CRM or spreadsheets, estimate win probability by gut feel | AI analyzes historical win/loss patterns, scores opportunities, identifies what project types and sizes are most profitable | Streamlined (50%) |
| **Knowledge Management** | Lessons learned live in people's heads or buried in shared drives | AI captures lessons learned from every project, makes them searchable, proactively surfaces relevant past experience when similar situations arise | Automated (85%) |

---

## Part 3: Implementation Priority

### Tier 1 — Do First (Highest Pain, Highest Impact)

These address Brandon's biggest pain points and deliver visible value fastest.

**1. Financial Guardian**
*The AI that watches every dollar so Brandon doesn't have to.*

- Continuous budget vs. actual monitoring with threshold alerts
- Owner-approved vs. sub-committed comparison (catches margin leaks)
- Cash flow projection (30/60/90 day)
- Change order lifecycle tracking (CE → CO → Commitment sync)
- Retention tracking with milestone alerts

**Why first:** This is the #1 pain point. Financial surprises in construction are catastrophic. This single feature could save tens of thousands per project by catching leaks early.

**Backend needed:**
- Expand financial RAG tools (granular budget lines, cost trends, margin analysis)
- Build daily financial scan job (runs overnight, generates alerts)
- Cash flow projection engine (commitment schedules + billing periods + payment history)
- Notification system for financial alerts

---

**2. Morning Briefing**
*Brandon's daily 5-minute download on the entire business.*

- Top 3-5 items that need attention today across all projects
- Financial health summary per project (one-line: on track / watch / at risk)
- Overdue items (action items, RFIs, submittals, approvals)
- Team workload snapshot
- Upcoming milestones and deadlines

**Why second:** This is the "wow" feature that demonstrates the AI actually knows the business. It replaces 2+ hours of information gathering with a 5-minute read.

**Backend needed:**
- Aggregate data across all RAG tools into a daily briefing
- Prioritization logic (what matters most today)
- Briefing generation prompt (already partially exists in daily digest)
- Dashboard UI for the briefing card

---

**3. Conversational Financial Advisor**
*"Ask me anything about the money."*

- Natural language queries about any financial dimension
- Drill-down capability (portfolio → project → cost code → line item → invoice)
- Comparison queries ("How does this project compare to Summit Ridge at the same stage?")
- Root cause analysis ("Why is the margin dropping on Vermillion Rise?")
- What-if scenarios ("If we approve this change order, what happens to the margin?")

**Why third:** This is where the AI becomes Brandon's most trusted advisor. He can have a conversation about the business the same way he'd talk to a seasoned CFO who knows every project inside and out.

**Backend needed:**
- All financial RAG tools from Phase 1
- Historical comparison queries
- What-if calculation tools
- System prompt tuned for financial advisory conversations

---

### Tier 2 — Build Next (High Value, Moderate Effort)

**4. Schedule Intelligence**
- Critical path monitoring with delay prediction
- Cascade impact analysis (if X slips, what else is affected)
- 3-week look-ahead auto-generation
- Submittal and procurement deadline tracking

**5. Meeting Intelligence**
- Auto-extract action items from meeting transcripts
- Track action item completion across meetings
- Flag recurring unresolved issues
- Auto-generate meeting agendas from open items

**6. Document Intelligence**
- Auto-classify uploaded documents
- Extract key metadata (dates, amounts, parties, requirements)
- Full-text search across all project documents
- Auto-link documents to relevant projects and cost codes

---

### Tier 3 — Build Later (Strategic, Builds on Foundation)

**7. Vendor Scorecard**
- Performance scoring based on historical data
- Delivery reliability, quality metrics, price competitiveness
- Recommendations for future bid invitations

**8. Report Generation**
- Weekly project status reports
- Monthly financial packages
- Client-ready executive summaries

**9. Predictive Analytics**
- Project completion probability
- Budget overrun prediction
- Margin forecasting
- Resource demand prediction

**10. Cross-Project Learning**
- Pattern recognition across all projects
- "Projects like this typically..." recommendations
- Lessons learned database (auto-captured, searchable)
- Portfolio optimization suggestions

---

## Part 4: What the Experience Feels Like

### The Chat Experience

The AI assistant is always available in the sidebar. Brandon (or any team member) can ask questions in plain English:

- "What's the status of Vermillion Rise?"
- "Show me all change orders pending approval across all projects"
- "How much do we owe Apex Electric across all projects?"
- "What's our total exposure on uncommitted change events?"
- "Which projects have the best margin right now?"
- "What did we discuss about the window specification in last Tuesday's meeting?"
- "Generate a financial summary for the board meeting"

The AI answers with **specifics, not generalities**. It gives dollar amounts, dates, names, and document references. It's like talking to the most knowledgeable person in the company.

### The Dashboard Experience

When Brandon logs in, the dashboard shows:

1. **AI Briefing Card** — Today's top priorities (expandable)
2. **Financial Health Bar** — Each project color-coded (green/yellow/red) based on AI assessment
3. **Attention Queue** — Items ranked by urgency and impact
4. **Cash Flow Chart** — 90-day projection with confidence bands
5. **Milestone Timeline** — Upcoming deadlines across all projects

### The Notification Experience

Brandon doesn't have to check the app constantly. The AI reaches out when something matters:

- **Immediate (push/text):** Budget threshold breach, critical schedule impact, payment issue
- **Daily (email digest):** Morning briefing, action item summary, overdue items
- **Weekly (email report):** Portfolio financial summary, margin trends, team utilization

### The "It Just Works" Moments

These are the moments where Brandon thinks "this is worth every penny":

- He's about to approve a change order and the AI says "Note: this will push the electrical budget 8% over. The sub has $42K of unbilled work remaining — you may want to negotiate before approving."

- He's preparing for a client meeting and the AI generates a project status summary with the exact metrics the client always asks about, because it learned the pattern from past meeting notes.

- A sub submits a pay app with a line item that doesn't match the commitment. The AI catches it before anyone reviews it. Previously, this would have been paid and never recovered.

- It's the 28th of the month. The AI says "3 sub pay apps haven't been received yet for this billing period: Apex Electric, Hartfield Concrete, and Pro Finish. Emails sent to each requesting submission by EOD tomorrow." (After Brandon approves the auto-send.)

- A new project starts and the AI says "Based on your last 5 projects of similar size and type, here are the top 3 risks to watch for and when they typically emerge."

---

## Part 5: What Success Looks Like

### 90 Days After Full Implementation

| Metric | Before AI | After AI |
|--------|-----------|----------|
| Time to understand project status | 1-2 hours | 5 minutes |
| Financial surprises per project | 3-5 per project | 0-1 per project |
| Change order processing time | 2-3 weeks | 3-5 days |
| Margin leakage per project | $15K-40K undetected | Caught within 48 hours |
| Action items that fall through cracks | 30-40% | Under 10% |
| Month-end close time | 3-5 days | 1 day |
| Cash flow prediction accuracy | Gut feel | 90%+ accuracy |

### The One-Sentence Test

If Brandon can say this and mean it, we've succeeded:

> "I know exactly where every dollar is on every project, and I found out about problems before they became crises."

---

## Appendix: Mapping to Technical Implementation

| User Feature | Technical Phase | Key Components |
|-------------|----------------|----------------|
| Financial Guardian | Phase 1 (data) + Phase 2 (insights) | Financial RAG tools + daily scan job + alert system |
| Morning Briefing | Phase 1 (data) + Phase 2 (dashboard) | All RAG tools + briefing generation + dashboard UI |
| Conversational Advisor | Phase 1 (data) | Expanded RAG tools + tuned system prompt |
| Schedule Intelligence | Phase 1 (data) + Phase 2 (insights) | Schedule RAG tools + prediction logic |
| Meeting Intelligence | Phase 3 (automation) | Transcript processing + action item extraction |
| Document Intelligence | Phase 1 (pipeline) + Phase 3 (automation) | Document ingestion + classification + metadata extraction |
| Vendor Scorecard | Phase 2 (insights) | Historical performance aggregation |
| Report Generation | Phase 3 (automation) | Template system + AI commentary generation |
| Predictive Analytics | Phase 4 (strategic) | Historical pattern analysis + prediction models |
| Cross-Project Learning | Phase 4 (strategic) | Pattern recognition across project data |

**Technical plan:** See `docs/AI-MASTER-PLAN.md` for the full implementation task list.
