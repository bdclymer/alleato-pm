# Alleato AI Platform: What We're Building and Why It Changes Everything

> **For:** Brandon Clymer, CEO
> **From:** Alleato Development Team
> **Date:** March 5, 2026

---

## The Big Picture

We're not building another project management tool with a chatbot bolted on. We're building an AI-powered business intelligence platform that knows every project, every dollar, every contract, every person, every meeting, and every decision in your company — and uses that knowledge to give you the kind of insight that used to require a full-time analyst, a CFO, and a COO working together.

Think of it as your executive team that never sleeps, never forgets, and gets smarter every day.

Here's what's live, what's coming, and what it means for the business.

---

## What's Live Right Now

### 1. AI Chat Assistant with C-Suite Intelligence

This isn't a generic chatbot. We've built a **multi-agent architecture** modeled after a real executive team:

- **Chief Strategist** — The front desk. Every question goes here first. It figures out what kind of question you're asking and routes it to the right specialist. Cross-functional questions? It consults multiple specialists and synthesizes a unified answer.

- **CFO Agent** — Your 24/7 financial advisor. It has access to every budget, every commitment, every change order, every direct cost, every invoice across every project. Ask it anything:
  - "What's the margin looking like on Vermillion Rise?"
  - "How much do we owe Apex Electric across all projects?"
  - "What's our cash position going to look like in 60 days?"
  - "Which projects are losing margin and why?"

The CFO doesn't just pull numbers — it traces root causes, identifies which specific change order broke a margin, and recommends concrete actions.

**28 AI tools** are connected behind the scenes, giving the assistant access to:

| Category | What It Knows | Tools |
|----------|--------------|-------|
| **Project Intelligence** | Portfolio overview, risk analysis, budget summaries, document search | 6 tools |
| **Financial Deep-Dive** | Commitments, change orders, direct costs, budget line items, cost trends, margin analysis | 6 tools |
| **ERP Integration** | AP/AR aging, cash position, vendor spend, bills, invoices, purchase orders — live from Acumatica | 7 tools |
| **Operations** | Schedule analysis, people & roles, vendor performance, RFIs, submittals, cross-project comparison, historical trends | 9 tools |

### 2. Acumatica ERP Integration — Live Bidirectional Connection

This is a big one. We have a **direct API connection to Acumatica** using the Contract-Based REST API. Right now, the AI can pull real-time data from your accounting system:

- **Accounts Payable aging** — who you owe and when it's due
- **Accounts Receivable aging** — who owes you and how long it's been outstanding
- **Cash position** — current balances across all bank accounts
- **Vendor spend analysis** — total spend by vendor across all projects
- **Recent bills, invoices, and purchase orders** — the latest financial activity

This means when you ask the AI about cash flow, it's not guessing — it's reading your actual bank balances and payment schedules from Acumatica in real time.

**What's coming next on the Acumatica side:**

The integration architecture already supports full bidirectional sync — we just need to build the write operations. This will enable:

- **Credit card transactions automatically imported as direct costs** — Your team's credit card charges in Acumatica get mapped to projects, cost codes, and vendors in Alleato. No manual data entry.
- **Bills and invoices synced back to Acumatica** — Create a commitment in Alleato, and the corresponding PO or bill flows into Acumatica automatically.
- **Payment status flowing both directions** — When a payment clears in Acumatica, the commitment status updates in Alleato. No more checking two systems.
- **Vendor records kept in sync** — Add a vendor in either system, it appears in both.

The foundation is already built. Adding these write operations is purely incremental — no architectural changes needed.

### 3. Meeting Intelligence

Every meeting transcript from Fireflies.ai gets automatically processed through our AI pipeline:

- **Decisions extracted** — what was decided, by whom, and when
- **Action items identified** — assigned to owners with due dates
- **Risks flagged** — problems discussed that haven't been resolved
- **Opportunities captured** — ideas and next steps that might otherwise get lost
- **Follow-ups tracked** — commitments made in one meeting, checked in the next

The AI chat assistant can search across all your meeting history. Ask it "What did we decide about the electrical scope on Vermillion Rise?" and it finds the answer from the actual meeting where it was discussed.

### 4. Company Knowledge Base

We built a knowledge base where you can store your company's strategic information — mission, goals, competitive advantages, organizational structure, standard operating procedures. The AI uses this context to make its recommendations smarter. Instead of generic advice, it gives recommendations that align with how your company actually operates.

You can also upload documents (strategy decks, business plans, contracts) and the AI will automatically:
1. Extract the text
2. Break it into searchable chunks
3. Embed it for semantic search
4. Make it available to the AI assistant

### 5. Full AI Observability (Langfuse)

Every AI interaction is traced and monitored:
- Which model was used and how many tokens it consumed
- Which tools it called, what data it retrieved, how long each step took
- Total cost per conversation
- Response quality tracking over time

This isn't just for developers — it means we can continuously improve the AI's accuracy, catch problems before users notice them, and demonstrate exactly how the AI arrives at its answers. Full transparency.

---

## What's Coming Next

### Phase 2: Proactive Intelligence (Next Quarter)

The AI stops waiting for you to ask questions and starts telling you what you need to know.

**Morning Briefing**
Open Alleato and the AI has already analyzed everything overnight:
- Top 3-5 items across all projects that need your attention today
- Financial health summary per project (on track / watch / at risk)
- Overdue action items, RFIs, submittals, and approvals
- Team workload — who's overloaded, who has capacity
- Upcoming milestones and deadlines

**Automated Alerts**
- Budget line exceeds threshold (80%, 90%, 100%)
- Margin drops more than 2% in any 30-day period
- Cash flow gap detected in the next 30/60/90 days
- Change event exists for 14+ days without a corresponding change order
- Owner-approved amount doesn't match sub commitment (margin leak)
- Sub pay app discrepancy vs. committed value
- Schedule task on critical path falls behind

**Smart Notifications**
Priority-routed alerts: critical issues push immediately, warnings roll into a daily digest email.

### Phase 3: Workflow Automation

**Document Intelligence**
- Upload a document, AI classifies it automatically (spec, submittal, contract, drawing)
- Key metadata extracted (dates, amounts, parties) and linked to the right project and budget line
- Summary generated on upload — no more reading 40-page specs to find the relevant sections

**Report Generation**
- Weekly project status reports with AI commentary — not just numbers, but explanations of what changed and why
- Financial variance reports that explain root causes, not just show red numbers
- Client-ready executive summaries generated in one click

**Smart Templates**
- Pre-filled RFIs based on similar past RFIs and their resolutions
- Change order descriptions auto-drafted from change events
- Submittal review responses templated from historical patterns

### Phase 4: Strategic Advisory

**Predictive Analytics**
- Project completion probability models
- Budget overrun prediction before it happens
- Schedule delay prediction from early warning signals
- Vendor risk scoring based on historical performance data

**Cross-Project Intelligence**
- Compare current projects against historical baselines
- Identify systemic issues vs. one-off problems
- Resource allocation optimization
- Project type profitability analysis — which kinds of projects make you the most money

**Competitive Intelligence**
- Performance benchmarking against industry standards
- Differentiator tracking — what makes you win bids
- Market opportunity identification based on your strengths

---

## Why This Is Different

Most construction tech adds another place you have to check. Another login, another dashboard, another system to keep updated.

Alleato AI is the opposite. It's a single place that already knows everything because it's connected to everything:

| Data Source | Connection |
|-------------|-----------|
| Project financials | Supabase (our database) — budgets, commitments, change orders, direct costs, invoices |
| Accounting system | Acumatica REST API — AP/AR, cash, vendors, bills, POs |
| Meeting history | Fireflies.ai transcripts — decisions, action items, risks |
| Company knowledge | Uploaded documents, strategy docs, SOPs — chunked and searchable |
| Project operations | Schedule, RFIs, submittals, people, vendors — all queryable |

**No manual data entry. No switching between systems. No hunting for information.**

You open the app, ask a question in plain English, and get an answer that draws from every system simultaneously. The AI cross-references your accounting data with your project data with your meeting history to give you insights that no single system could provide alone.

---

## The Bottom Line

What we're building is the difference between running a business by looking in the rearview mirror and running it with a full-time analyst who has perfect memory, instant access to every system, and the ability to work 24 hours a day.

Phase 1 is live. The AI already knows your projects, your money, your contracts, your meetings, and your accounting system. You can talk to it right now.

The next three phases turn it from a tool you ask questions to into an advisor that proactively runs the business intelligence side of your operation — so you can focus on building.
