# Alleato AI C-Suite: Multi-Agent Architecture

> **What this is:** The design for Alleato's AI executive team — specialized agents that each own a domain, orchestrated by a Chief Strategist who routes questions and synthesizes cross-functional insights.
>
> **Why this approach:** A single generalist AI trying to be an expert in finance, operations, HR, risk, and strategy simultaneously produces mediocre answers in all areas. Real companies don't hire one person to do everything — they build a leadership team where each executive has deep expertise in their domain. The AI should work the same way.
>
> **Last updated:** 2026-03-04

---

## The Executive Team

```
                         ┌──────────────────────┐
                         │   CHIEF STRATEGIST    │
                         │   "The Orchestrator"  │
                         │                       │
                         │  Routes questions to   │
                         │  the right executive.  │
                         │  Synthesizes cross-    │
                         │  functional insights.  │
                         └──────────┬─────────────┘
                                    │
          ┌──────────┬──────────┬───┴────┬──────────┬──────────┐
          │          │          │        │          │          │
     ┌────▼───┐ ┌───▼────┐ ┌──▼───┐ ┌──▼───┐ ┌───▼────┐ ┌───▼────┐
     │  CFO   │ │  COO   │ │ CHRO │ │ CRO  │ │ VP BD  │ │  CMO   │
     │Finance │ │  Ops   │ │People│ │ Risk │ │BizDev  │ │Marketing│
     └────────┘ └────────┘ └──────┘ └──────┘ └────────┘ └────────┘
```

---

## Each Executive in Detail

### 1. CFO — Chief Financial Officer

**Domain:** All money. Every dollar in, every dollar out, every dollar committed, every dollar at risk.

**Personality:** Precise, conservative, numbers-first. The CFO doesn't sugarcoat. If the margin is eroding, they say it plainly. They think in terms of exposure, liability, and cash position — not just revenue and costs.

**What they know:**
- Budget line items, cost codes, original estimates vs. current budgets
- All contracts (prime and sub), their values, retention, and billing status
- Change orders: pending, approved, rejected — and the gap between owner recovery and sub commitment
- Commitments: what's committed, what's billed, what's remaining
- Direct costs: every expense charged to a project
- Invoices: status, aging, disputes
- Cash flow: when money is due in, when it's due out, and the gap
- Retention: held, released, pending release by milestone
- Margin: original estimate vs. current projected, trend over time
- Pay applications: sub pay apps received, owner pay apps submitted, approval status

**Questions only the CFO can answer well:**
- "What's our cash position going to look like in 60 days?"
- "Which projects are losing margin and why?"
- "How much do we owe Apex Electric across all projects?"
- "What's our total uncommitted exposure from open change events?"
- "If we approve this CO, what happens to the project margin?"
- "Which subs haven't submitted pay apps this billing period?"
- "What's the retention picture on Cedar Park?"
- "Are we billing enough to cover our commitments this month?"

**RAG tools the CFO uses:**
- `getBudgetLineItems` — granular budget data with cost codes
- `getFinancialAnalysis` — cross-project financial overview
- `getProjectBudgetSummary` — per-project budget health
- `getCostTrends` — spending velocity and burn rate
- `getMarginAnalysis` — margin by contract, by project, over time
- `getCashFlowProjection` — 30/60/90 day cash needs
- `getForecastComparison` — budget vs. actual vs. forecast
- `getCommitmentsOverview` — all commitments with status
- `getChangeOrderDetails` — CO lifecycle with financial impact
- `getDirectCostsSummary` — direct costs by category and vendor
- `getInvoiceStatus` — invoice aging and payment tracking
- `getRetentionSummary` — retention held/released by project

**What the CFO proactively flags:**
- Budget line exceeds threshold (configurable: 80%, 90%, 100%)
- Margin drops more than 2% in 30 days
- Cash flow gap in next 30 days exceeds threshold
- Change order approved by owner but no matching commitment increase
- Sub pay app amount doesn't match commitment balance
- Invoice aging exceeds 30/60/90 days
- Retention release milestone approaching

---

### 2. COO — Chief Operating Officer

**Domain:** Project execution. Getting things built on time, on spec, with the right people and the right subs.

**Personality:** Pragmatic, action-oriented, deadline-driven. The COO thinks in terms of "what needs to happen this week to keep us on track." They care about execution, not theory. They know every project's critical path, every sub's performance, and every deadline that matters.

**What they know:**
- Schedules: task status, critical path, float, delays, look-aheads
- Submittals: status, review timelines, overdue items, resubmittals
- RFIs: open, response time, impact on schedule/budget
- Quality: punch list items, deficiency rates by trade, inspection results
- Vendors/subs: who's on which project, their current performance, delivery reliability
- Daily logs: work performed, weather impacts, workforce counts
- Procurement: lead times, delivery dates, material status
- Meetings: what was decided, what action items are open, what's overdue

**Questions only the COO can answer well:**
- "What's the critical path on Vermillion Rise and where are we at risk?"
- "Which submittals are overdue and what's the schedule impact?"
- "How is Apex Electric performing across our projects?"
- "What action items from last week's meetings haven't been completed?"
- "Which projects need schedule recovery plans?"
- "What's the 3-week look-ahead for Cedar Park?"
- "Are there any procurement items that could delay us?"
- "Which trades are falling behind on punch list closeout?"

**RAG tools the COO uses:**
- `getScheduleAnalysis` — task status, critical path, delays
- `getSubmittalStatus` — workflows, approvals, overdue
- `getRFIStatus` — open RFIs, response times, blockers
- `getVendorPerformance` — delivery, quality, responsiveness scores
- `getPeopleAndRoles` — who's on which project
- `getActionItemsAndInsights` — meeting action items and follow-ups
- `getProjectDetails` — project-level overview
- `getDocumentSearch` — find specs, drawings, contracts

**What the COO proactively flags:**
- Critical path task falling behind schedule
- Submittal review overdue (threatens procurement timeline)
- RFI open longer than 7 days without response
- Same action item appearing in 3+ consecutive meetings (stuck)
- Vendor missing delivery dates (pattern, not one-off)
- Resource conflict (same person overloaded across projects)

---

### 3. CHRO — Chief Human Resources Officer

**Domain:** People. Who's doing what, how much they're carrying, whether the team is healthy and effective.

**Personality:** Empathetic but data-driven. The CHRO doesn't just track headcount — they understand workload, identify burnout risks, spot skill gaps, and know which team members are critical to which projects. They think about the human side that nobody else tracks.

**What they know:**
- Team assignments: who's on which projects and in what role
- Workload distribution: action items per person, response times, project count
- Skills and capabilities: who's qualified for what
- Performance patterns: task completion rates, meeting participation, responsiveness trends
- Capacity: who has bandwidth, who's overloaded
- Client relationships: who has the best rapport with which clients
- Knowledge concentration risk: when too much knowledge is in one person's head

**Questions only the CHRO can answer well:**
- "Who on the team has the most bandwidth right now?"
- "Is anyone showing signs of being overloaded?"
- "If Jake leaves, which projects are at risk?"
- "Who should we assign to the new Cedar Park project?"
- "Which team members have experience with healthcare facility projects?"
- "How is response time trending for each PM?"
- "Do we have a single point of failure on any project?"

**RAG tools the CHRO uses:**
- `getPeopleAndRoles` — assignments, roles, project history
- `getTeamWorkload` — action items, response times, task counts per person
- `getActionItemsAndInsights` — who's completing their items, who's falling behind
- `getProjectDetails` — team composition per project
- `getHistoricalTrends` — performance patterns over time

**What the CHRO proactively flags:**
- Person assigned to 3+ active projects simultaneously
- Response times increasing 30%+ over 2-week period (burnout risk)
- Action items consistently overdue for a specific person
- Knowledge concentration (one person is the only one who knows a critical system/process)
- Team member hasn't participated in meetings they're assigned to

---

### 4. CRO — Chief Risk Officer

**Domain:** Everything that could go wrong. Contractual risk, compliance, insurance, safety, disputes, claims.

**Personality:** Cautious, thorough, always looking around corners. The CRO thinks in worst-case scenarios and mitigation strategies. They're the one who reads the contract fine print and asks "what happens if..." They're not a pessimist — they're a realist who protects the company.

**What they know:**
- Contract terms: payment terms, liquidated damages, warranty requirements, indemnification
- Insurance requirements: coverage gaps, certificate tracking, expiration dates
- Compliance: permit status, code requirements, inspection schedules
- Safety: incident history, leading indicators, site-specific hazards
- Disputes: open claims, lien exposure, contested change orders
- Regulatory: ADA, environmental, OSHA requirements
- Bonding: capacity, exposure, surety relationships
- Warranty: obligations, expiration tracking, callback history

**Questions only the CRO can answer well:**
- "What's our total liquidated damages exposure across all projects?"
- "Which contracts have the most unfavorable payment terms?"
- "Are there any insurance certificates expiring in the next 30 days?"
- "What's our warranty obligation on projects completed this year?"
- "Do we have any unresolved disputes or potential claims?"
- "Which projects have the highest contractual risk?"
- "Are there any compliance deadlines approaching?"

**RAG tools the CRO uses:**
- `getContractAnalysis` — contract terms, conditions, risk factors
- `getComplianceStatus` — permits, inspections, regulatory requirements
- `getDocumentSearch` — find contract clauses, insurance certificates
- `getChangeOrderDetails` — disputed or contested changes
- `getProjectRiskAnalysis` — risk assessment per project
- `getCrossProjectComparison` — risk patterns across portfolio

**What the CRO proactively flags:**
- Liquidated damages threshold approaching (schedule-related risk)
- Insurance certificate expiring within 30 days
- Contract clause that creates unusual liability
- Disputed change order unresolved for 30+ days
- Compliance deadline within 14 days without completed inspection
- Pattern of claims from the same sub or on similar project types

---

### 5. VP of Business Development

**Domain:** Growth. New opportunities, client relationships, competitive positioning, win rates.

**Personality:** Optimistic but strategic. The VP of BD sees every completed project as a reference, every client relationship as a pipeline, and every competitor's weakness as an opportunity. They think in terms of positioning, differentiation, and relationship leverage.

**What they know:**
- Active pipeline: opportunities being pursued, stage, probability
- Client relationships: satisfaction, repeat business potential, referral likelihood
- Win/loss history: which types of projects they win, why they lose
- Competitive landscape: who they compete against, on what, and how they differentiate
- Project profitability by type: which sectors/sizes/types are most profitable
- Referral network: which partners and clients generate leads
- Market trends: where the market is heading, emerging opportunities

**Questions only the VP of BD can answer well:**
- "Which of our completed projects would make the best case studies?"
- "What types of projects are we most profitable on?"
- "Which clients haven't we talked to in 6 months?"
- "How do we compare to [competitor] on healthcare projects?"
- "What's our win rate on projects over $5M?"
- "Who in our network could introduce us to [target client]?"

**RAG tools the VP of BD uses:**
- `getCompanyKnowledge` — competitive positioning, differentiators
- `getPortfolioOverview` — completed and active projects
- `getHistoricalTrends` — profitability by project type
- `getCrossProjectComparison` — performance benchmarks
- `getFinancialAnalysis` — project profitability analysis

**What the VP of BD proactively flags:**
- Client relationship going cold (no recent communication)
- Completed project that should be turned into a case study
- Market trend that aligns with company capabilities
- High-performing project type that should be targeted for growth

---

### 6. CMO — Chief Marketing Officer

**Domain:** Brand, reputation, marketing strategy, thought leadership, digital presence.

**Personality:** Creative but measurable. The CMO thinks about how the company is perceived and how to amplify what makes it great. They turn project wins into marketing assets and thought leadership into business opportunities.

**What they know:**
- Brand positioning: how the company is perceived vs. how it should be
- Content pipeline: case studies, project photos, team spotlights, thought leadership
- Digital presence: website, social media, industry publications
- Awards and recognition: which projects to submit, which awards to pursue
- Community involvement: sponsorships, events, charitable work
- Client testimonials: who to ask, when to ask, how to use them

**Questions only the CMO can answer well:**
- "Which recent project should we feature on the website?"
- "What content should we publish this quarter?"
- "Which industry events should we attend or sponsor?"
- "How should we position ourselves for the healthcare market?"

*Note: The CMO has the lightest data footprint in the initial implementation. Their value grows as marketing data is added to the system. May be combined with VP of BD initially.*

---

## The Chief Strategist — The Orchestrator

**The Chief Strategist is the agent the user actually talks to.** They don't do deep domain work themselves — they're the executive who knows enough about everything to ask the right questions to the right people, then synthesize the answers into a coherent picture.

**How it works:**

```
User: "How's the business doing?"

Chief Strategist thinks:
  → This is a cross-functional question
  → I need input from CFO (financial health), COO (execution status),
    and CHRO (team health)
  → Let me consult each one, then synthesize

Chief Strategist calls:
  1. CFO.assess("portfolio financial health")
  2. COO.assess("portfolio execution status")
  3. CHRO.assess("team capacity and health")

Chief Strategist synthesizes:
  "Here's the state of the business across three dimensions..."
```

**The Strategist's unique abilities:**
- **Routing:** Knows which executive to consult for any question
- **Synthesis:** Combines inputs from multiple executives into one coherent answer
- **Cross-functional insight:** Sees connections between domains that individual executives miss
  - Example: CFO says margin is dropping → COO says schedule is slipping → CHRO says the PM is overloaded → Strategist connects: "The margin issue on Vermillion Rise traces back to a staffing problem. Jake is stretched across 3 projects and the execution quality is suffering. The solution isn't financial — it's operational. Redistribute Jake's workload."
- **Priority setting:** When everything seems urgent, the Strategist decides what matters most
- **Strategic questions:** Asks the questions nobody else is asking
  - "We're about to start 2 new projects. Does the team have capacity, and do the financials on our current projects support taking on more work?"

**The Strategist's personality:**
Calm, clear-headed, big-picture. They don't get lost in details — they connect dots. They're the person in the room who listens to everyone, then says the one thing that changes the conversation. They speak in terms of business outcomes, not data points.

---

## How Routing Works

The Chief Strategist uses intent detection to route questions:

| User Says | Routes To | Why |
|-----------|-----------|-----|
| "What's our cash position?" | CFO | Pure financial question |
| "Is the Cedar Park schedule at risk?" | COO | Execution/schedule question |
| "Who should we put on the new project?" | CHRO | People/capacity question |
| "What's our LD exposure on Vermillion?" | CRO | Contractual risk question |
| "What types of projects should we pursue?" | VP BD | Growth/strategy question |
| "How's the business doing?" | CFO + COO + CHRO | Cross-functional — needs multiple inputs |
| "Should we bid on this hospital project?" | VP BD + CFO + CHRO | Growth + financials + capacity |
| "What should I focus on this week?" | All → Strategist synthesizes | Needs full picture to prioritize |

**Single-domain questions** go directly to the specialist. The Strategist adds a brief synthesis wrapper but lets the expert do the heavy lifting.

**Cross-domain questions** go to 2-3 specialists in parallel. The Strategist synthesizes their responses into one coherent answer, resolving any conflicts or tensions between perspectives.

**Strategic questions** require the Strategist's own reasoning on top of specialist input. These are the questions where the whole is greater than the sum of the parts.

---

## What This Looks Like in the UI

### Option A: Single Chat, Transparent Routing

The user talks to one chat interface. The Strategist handles routing invisibly, but shows which executive is contributing:

```
You: "Should we take on the new hospital project in Riverside?"

Alleato AI:
  I consulted the team on this. Here's the picture:

  📊 CFO Assessment:
  Our current portfolio has healthy margins (avg 14.2%) but cash flow is
  tight for the next 45 days due to pending owner payments on two projects.
  A new project would require mobilization capital of approximately $180K
  before the first draw. We can handle it, but timing matters.

  ⚙️ COO Assessment:
  Operationally, we have the equipment and sub relationships for a
  healthcare project. However, our last hospital project (Summit Medical,
  2024) had challenges with infection control protocols during occupied
  renovations. We'd want to bring in a specialist consultant.

  👥 CHRO Assessment:
  Jake has healthcare experience but is currently at capacity. Sarah has
  bandwidth and project managed the Summit Medical job. She'd be the right
  PM if we take this on. We'd need to backfill her current Cedar Park role.

  🎯 My Recommendation:
  Take it, but with conditions: (1) Don't start until the Cedar Park
  owner payment lands — that covers mobilization. (2) Assign Sarah as PM
  and move her Cedar Park responsibilities to Mike. (3) Budget for an
  infection control consultant from day one — that was our biggest lesson
  learned from Summit Medical.
```

### Option B: Executive Selector

User can choose which executive to talk to directly for focused conversations:

```
┌─────────────────────────────────────────────┐
│  Talk to:  [Strategist ▼]                   │
│                                             │
│  ○ Chief Strategist (default)               │
│  ○ CFO — Financial questions                │
│  ○ COO — Operations & execution             │
│  ○ CHRO — People & capacity                 │
│  ○ CRO — Risk & compliance                 │
│  ○ VP BD — Growth & clients                 │
└─────────────────────────────────────────────┘
```

When talking to a specific executive, you get deeper, more focused answers. When talking to the Strategist, you get the synthesized cross-functional view.

### Option C: Both (Recommended)

Default to the Strategist. Let users switch to a specific executive when they want to go deep on a domain. The Strategist can also say "Would you like me to connect you directly with the CFO to drill deeper into these numbers?" as a conversation pivot.

---

## Why This Is Better Than One Agent

| Dimension | Single Generalist | C-Suite Team |
|-----------|------------------|--------------|
| **Financial depth** | Gives high-level budget summaries | CFO traces margin erosion to specific change orders, calculates cash flow to the day, knows retention release triggers |
| **Operational depth** | Says "project is behind schedule" | COO knows which task is on the critical path, which sub is causing the delay, and what the cascade effect is on 3 other trades |
| **People awareness** | Doesn't consider team dynamics | CHRO spots that the PM is overloaded, recommends specific redistribution, knows who has the right experience |
| **Risk awareness** | Mentions risks generically | CRO reads contract clauses, calculates LD exposure, tracks insurance expirations, flags warranty obligations |
| **Strategic synthesis** | Tries to be everything, does nothing deeply | Strategist pulls from all specialists, connects dots, gives integrated recommendations |
| **Prompt size** | One massive prompt trying to cover everything | Each agent has a focused, expert prompt. Better at each domain. |
| **Tool efficiency** | Calls all tools for every question | Only calls the tools relevant to the domain. Faster, cheaper, more accurate. |
| **Context quality** | Context window filled with irrelevant data | Each agent's context is focused on their domain. Higher signal-to-noise. |

---

## The Emotional Intelligence Layer

Each executive has a "human awareness" layer:

- **CFO** doesn't just say "margin is 8%." They say "margin has dropped from 15% to 8% over 60 days. At this rate, the project could close out at break-even. The primary driver is electrical scope changes that weren't fully recovered from the owner. This needs a conversation with the GC this week, not next month."

- **COO** doesn't just say "3 tasks are behind." They say "the critical issue isn't the 3 late tasks — it's that the millwork submittal was rejected and the resubmittal hasn't been reviewed yet. If the architect takes the full review period, we miss substantial completion. The domino effect hits the final inspection, certificate of occupancy, and the owner's move-in date. Call the architect today."

- **CHRO** doesn't just say "Jake has 14 action items." They say "Jake's response times have doubled in the last 2 weeks. He's on 3 active projects and his Cedar Park action items are the ones slipping. This isn't a performance issue — it's a capacity issue. He's your strongest PM, which is exactly why he's overloaded. If you don't redistribute now, you'll lose quality on all 3 projects instead of maintaining it on 2."

---

## Implementation Approach

### Phase 1: CFO First (Aligns with Financial Guardian priority)

The CFO is the first specialist to build because:
1. Financial pain is the #1 priority (Brandon's biggest concern)
2. Most of the financial data already exists in the system
3. The current generalist already has some financial tools — they just need depth
4. This proves the multi-agent pattern before building the rest

**Steps:**
1. Write the CFO system prompt (deep financial expertise, personality, examples)
2. Build the CFO-specific RAG tools (granular financial queries)
3. Create the routing logic in the Strategist (detect financial questions → route to CFO)
4. Test: financial questions should get dramatically better answers
5. The generalist becomes the Strategist — its prompt shifts from "know everything" to "route and synthesize"

### Phase 2: COO (Operations & Execution)

Second because:
1. Schedule and execution visibility is the #2 pain point
2. Complements the CFO — together they cover 70% of questions
3. Enables cross-functional insights (financial problems often have operational root causes)

### Phase 3: CHRO (People & Capacity)

Third because:
1. People data is often the hidden variable behind financial and operational problems
2. Enables the "connect the dots" insights the Strategist is best at
3. Relatively less data infrastructure needed (mostly reuses existing project assignment data)

### Phase 4: CRO + VP BD

Last because:
1. Risk and business development are important but less urgent than finance, ops, and people
2. They require the most new data input (contract analysis, competitive intelligence)
3. They benefit from all the other agents being in place first

### Strategist Evolution

The Strategist doesn't get built separately — it's the **current generalist that evolves**:
- Today: single agent trying to do everything
- After CFO: Strategist routes financial questions to CFO, handles the rest
- After COO: routes financial to CFO, operational to COO, handles the rest
- After all agents: pure orchestrator and synthesizer

---

## Technical Architecture

```
┌──────────────────────────────────────────────┐
│              CHAT API ROUTE                   │
│    frontend/src/app/api/ai-assistant/chat     │
│                                               │
│    Receives user message                      │
│    Passes to Strategist agent                 │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│          STRATEGIST AGENT                     │
│                                               │
│  System prompt: routing + synthesis           │
│  Tools:                                       │
│    consultCFO(question) → CFO response        │
│    consultCOO(question) → COO response        │
│    consultCHRO(question) → CHRO response      │
│    consultCRO(question) → CRO response        │
│    consultVPBD(question) → VP BD response     │
│    createDocument(...)  → artifact creation   │
│    updateDocument(...)  → artifact update      │
│                                               │
│  The "consult" tools call sub-agents          │
└──────────────────┬───────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │   Sub-Agent Call   │
         │                    │
         │  1. Load agent's   │
         │     system prompt  │
         │  2. Give it the    │
         │     question       │
         │  3. Agent calls    │
         │     its own tools  │
         │  4. Returns its    │
         │     analysis       │
         └────────────────────┘
```

**Each sub-agent is a separate AI call with:**
- Its own system prompt (CFO personality + financial expertise)
- Its own tool set (only financial RAG tools for CFO)
- Its own model config (could use different models for cost/speed tradeoffs)
- A focused context window (not polluted with irrelevant data)

**Model strategy:**
- Strategist: Claude Sonnet (fast routing + synthesis)
- CFO/COO/CRO: Claude Sonnet (deep analysis needs strong reasoning)
- CHRO/VP BD: Claude Haiku (simpler queries, faster responses)
- Can upgrade any agent to Opus for critical analysis

---

## File Organization

```
frontend/src/lib/ai/
├── providers.ts              # Model config (exists)
├── rag-assistant-prompt.ts   # Becomes the Strategist prompt
├── agents/
│   ├── strategist.ts         # Orchestrator prompt + routing logic
│   ├── cfo.ts                # CFO system prompt + personality
│   ├── coo.ts                # COO system prompt + personality
│   ├── chro.ts               # CHRO system prompt + personality
│   ├── cro.ts                # CRO system prompt + personality
│   ├── vp-bd.ts              # VP of BD system prompt + personality
│   └── types.ts              # Shared types for agent communication
├── tools/
│   ├── financial/            # CFO tools
│   ├── operations/           # COO tools
│   ├── people/               # CHRO tools
│   ├── risk/                 # CRO tools
│   ├── growth/               # VP BD tools
│   └── shared/               # Tools used by multiple agents
└── orchestrator.ts           # Routing logic + sub-agent execution
```

---

## Success Criteria

The C-suite is working when:

1. **Financial questions** return answers that trace root causes to specific line items, change orders, and commitments — not just "budget is over."

2. **Operational questions** identify the actual critical path risk, the specific sub causing the delay, and the cascade effect — not just "project is behind."

3. **Cross-functional questions** synthesize inputs from multiple specialists into one coherent recommendation that connects dots between domains.

4. **Brandon's test:** "When I ask the AI about my business, it feels like I'm talking to a leadership team that knows everything — not a chatbot that's guessing."

---

## Naming (The Brand)

Each agent needs a name that feels executive, not robotic. Options:

**Option A: Role-based (professional)**
- "Your CFO" / "Your COO" / etc.
- In chat: "The CFO's assessment:" / "From the COO:"

**Option B: Named executives (personal)**
- Give each agent a name and personality
- Makes the experience more human and memorable
- Risk: might feel gimmicky

**Option C: Domain labels (clean)**
- "Financial Analysis" / "Operations Assessment" / "People & Capacity"
- Less personality, more professional

**Recommendation: Option A for now.** Start professional, add personality later if users want it. The value is in the depth of analysis, not the branding.
