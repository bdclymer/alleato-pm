#AI Plan

If we were to fast-forward into the future, whether it be three months, six months, a year, whatever, and a company had implemented AI into their commercial construction firm, and it was the absolute best in class, world-renowned, what would that look like? What would be involved? What systems, processes were in place? What would the AI agents be doing? How would the agents be structured?

---

If a commercial construction company actually did this right—not dabbling, not “we added ChatGPT to Slack,” but **fully committed, system-level AI integration**—it would look less like a company and more like an **intelligent operating system for construction**.

Right now, most firms are document-driven and human-coordinated.

The future version is:

→ **data-driven**
→ **agent-coordinated**
→ **continuously learning**

Let’s break this into something real and executable.

---

# **1. The Core Shift (This is the foundation)**

**Current reality:**

- Humans chase information
- Data is fragmented across tools (Procore, email, PDFs, etc.)
- Decisions are reactive

**Best-in-class AI firm:**

- Data flows automatically into a unified system
- Agents monitor, interpret, and act on that data
- Humans step in only for judgment calls

👉 The company becomes:

**An orchestration layer on top of real-time project intelligence**

---

# **2. The System Architecture (High-level)**

Think in 4 layers:

### **1. Data Layer (The “Memory”)**

This is everything:

- Procore data (budgets, RFIs, submittals, change orders)
- Drawings + specs (parsed + chunked)
- Meeting transcripts (Fireflies.ai or similar)
- Emails, photos, site reports
- Financials (ERP)

Stored in:

- Structured DB (Supabase / Postgres)
- Vector DB (embeddings for semantic retrieval)

👉 This is non-negotiable. Garbage data = useless AI.

---

### **2. Intelligence Layer (The “Brain”)**

- LLMs (GPT-4/5 class)
- Retrieval (RAG pipelines)
- Domain-specific logic (construction workflows)

This is where:

- Context gets assembled
- Decisions get suggested
- Patterns get learned

---

### **3. Agent Layer (The “Workforce”)**

This is where most companies screw it up.

You don’t want 50 random agents.

You want:

→ **structured, role-based agents with clear ownership**

---

### **4. Orchestration Layer (The “COO”)**

- Routes tasks
- Coordinates agents
- Maintains state across workflows

This is your:

→ “Commander Agent” (you already think this way—good instinct)

---

# **3. The Agent System (What actually exists)**

Here’s what a **world-class agent team** would look like:

---

## **A. Executive Layer (Decision Intelligence)**

### **1. Strategic Advisor (Commander Agent)**

- Sees everything across projects
- Surfaces risks, delays, cost overruns
- Answers: “What should we do next?”

This is NOT a chatbot.

It:

- pulls from all agents
- synthesizes insight
- escalates decisions

---

### **2. CFO Agent**

- Real-time financial modeling
- Predicts:
    - cash flow issues
    - margin erosion
    - cost overruns
- Simulates scenarios:
    - “If this change order is approved, what happens?”

---

### **3. Operations Intelligence Agent**

- Tracks project health across all jobs
- Flags:
    - delays
    - bottlenecks
    - underperforming subs

---

## **B. Project Execution Layer**

### **4. Project Manager Agent**

This is huge.

It:

- tracks RFIs, submittals, change events
- follows up automatically
- writes summaries
- identifies blockers before humans notice

---

### **5. Schedule Optimization Agent**

- Continuously re-optimizes schedules
- Uses historical + real-time data
- Suggests:
    - resequencing
    - resource reallocation

---

### **6. Change Event Intelligence Agent**

- Detects change conditions early (from RFIs, drawings, field reports)
- Suggests:
    - whether it should be owner-facing
    - pricing implications
- Auto-drafts change orders

---

## **C. Field + Reality Capture Layer**

### **7. Field Agent (Mobile + Voice Driven)**

- Superintendents speak → AI logs everything
- Converts:
    - voice → structured daily logs
    - photos → tagged issues
- Identifies:
    - safety risks
    - deviations from plan

---

### **8. Drawing & Spec Intelligence Agent**

- Parses plans/specs
- Answers:
    - “Where is this requirement defined?”
- Cross-references:
    - RFIs
    - submittals
    - change events

---

## **D. Communication Layer**

### **9. Client Communication Agent**

- Writes updates, reports, summaries
- Translates:
    - construction → executive language
- Keeps clients proactively informed

---

### **10. Subcontractor Coordination Agent**

- Tracks commitments
- Sends follow-ups
- Flags late responses
- Maintains accountability

---

## **E. Learning + Optimization Layer**

### **11. Post-Mortem / Learning Agent**

This is where companies win long-term.

After each project:

- analyzes what went wrong/right
- feeds insights back into system

Result:

→ Every project makes the next one smarter

---

# **4. What the AI Agency (Your opportunity) actually does**

## **1. Structuring the Data**

- Extracting from Procore, emails, drawings
- Cleaning + standardizing
- Designing schemas

## **2. Building the Knowledge Graph**

- Linking:
    - budgets ↔ contracts ↔ RFIs ↔ drawings
- So AI understands relationships

---

## **3. Designing the Agent System**

- Defining roles (like above)
- Creating:
    - prompts
    - tools
    - permissions
- Establishing handoffs

---

## **4. Building Automation Pipelines**

- Ingestion pipelines
- RAG pipelines
- Trigger-based workflows

---

## **5. Continuous Optimization**

- Monitoring agent performance
- Fixing hallucinations
- Improving accuracy over time

---

# **5. What makes it “best in class” (this is the real differentiator)**

Most companies will:

- implement tools
- maybe add a few agents

That’s not it.

The elite version does 3 things differently:

---

## **1. It’s PROACTIVE, not reactive**

Instead of:

- “What’s the status?”

You get:

- “Here are the 3 risks that will cost you $240k if not addressed this week.”

---

## **2. It’s CONTEXTUAL**

Not generic AI.

It knows:

- your contracts
- your cost structure
- your workflows

---

## **3. It COMPOUNDS intelligence**

Every:

- project
- RFI
- mistake

→ improves the system

---

# **7. The actual rollout strategy (what I would do)**

### **Phase 1 (0–60 days)**

- Data pipeline + vectorization
- One killer agent:
→ **Project Intelligence Agent**
- Focus: RFIs, change events, financial signals

---

### **Phase 2 (60–120 days)**

- CFO Agent
- Change Event Agent
- Basic orchestration layer

---

### **Phase 3 (120–180 days)**

- Field agent (voice → structured data)
- Drawing intelligence

---

### **Phase 4 (6–12 months)**

- Full agent ecosystem
- Learning loop
- Predictive insights

---

# **Final perspective (important)**

The companies that win here are not:

- the biggest
- or the most technical

They’re the ones that:

→ **systematize their knowledge first**
→ **then layer AI on top intelligently**

---

If you want to turn this into something real for Alleato, the next move isn’t “build everything.”

It’s this:

👉 What is the **single highest-value decision or workflow** that, if improved by AI, would immediately impact revenue or margin?

Start there.

---

Yes: **do not start with estimating** if Brandon is the bottleneck.

Estimating may be one of the biggest ROI opportunities, but it is also one of the highest-dependency workflows because it requires judgment, tribal knowledge, pricing nuance, assumptions, exclusions, vendor context, and Brandon’s trust.

For your first “holy shit, this works” proof, I’d choose:

# **Submittals + Drawings + Specs Intelligence**

This is the right wedge.

Why?

Because it is high-value, document-heavy, annoying, error-prone, and does **not** require Brandon to constantly explain his brain.

It can produce visible wins fast.

## **The strongest first AI use case**

Build an agent that answers:

“What does this project require, where is it documented, what is missing, and what is at risk?”

That agent should be able to:

1. Read drawings, specs, submittals, RFIs, meeting notes, and project docs.
2. Cross-reference requirements.
3. Identify missing submittals.
4. Flag contradictions between drawings/specs/submittals.
5. Surface unanswered questions.
6. Generate a “risk + action” report for the PM.

That is immediately useful.

And it positions the AI as an **extra set of expert eyes**, not as some abstract futuristic chatbot.

# **My recommended first flagship agent**

## **Project Document Intelligence Agent**

Purpose:

Turn project documents into searchable, cross-referenced, actionable intelligence.

Core outputs:

- Missing submittal list
- Spec requirement summary
- Drawing/spec conflict report
- RFI opportunity list
- Open risk register
- PM action summary
- “Ask this project anything” chat

This would feel magical to the team because it solves a real pain:

“I don’t have time to dig through 900 pages of docs to find the one requirement that screws us later.”

Exactly.

# **Why this beats estimating as the first showcase**

Estimating requires Brandon’s brain.

Document intelligence requires the data.

You already have the data infrastructure.

That means you can build without waiting on him.

Then, once Brandon sees it catch something meaningful, his resistance drops.

Not because you argued better.

Because the system proved value.

# **The killer demo**

Do not demo the whole platform.

Demo this:

Upload or select one real project → AI reviews drawings/specs/submittals/RFIs → produces a “Project Risk Intelligence Brief.”

The brief should say:

## **1. Critical Risks**

“Potential issue: sprinkler clearance requirement appears in Spec Section X but is not reflected in Drawing Sheet Y.”

## **2. Missing Information**

“Submittal needed for X. No matching submitted document found.”

## **3. Recommended Questions / RFIs**

“Recommend RFI: confirm whether X applies to Y condition.”

## **4. PM Actions**

“Assign to X, due by Y, priority high.”

That’s the moment people get it.

# **The second best wedge: Meeting Intelligence**

You are also dead right about Teams/Fireflies.

That is probably your richest “tribal knowledge capture” source.

But I would not make the first product “meeting search.”

I would make meetings feed the Project Document Intelligence Agent.

So the agent can say:

“This issue was discussed in the April 12 coordination meeting, but no formal RFI/change event appears to have been created.”

That’s world-class.

That is how you start converting chaos into institutional intelligence.

# **What I would build next**

## **Phase 1: Project Intelligence Brief**

One project. One workflow. One impressive output.

Inputs:

- Drawings
- Specs
- Submittals
- RFIs
- Meeting transcripts
- Project records

Output:

- Risk brief
- Missing items
- RFI suggestions
- PM action list

## **Phase 2: Submittal Tracker Agent**

This becomes more operational.

It answers:

- What submittals are required?
- What has been received?
- What is missing?
- What is late?
- What conflicts with specs?
- What needs review?

## **Phase 3: Change Event Detection Agent**

This is where the money starts showing up.

It watches:

- RFIs
- field notes
- meetings
- drawing revisions
- client requests

And flags:

“This may be a change event. Review for cost/schedule impact.”

## **Phase 4: Estimating Assistant**

Only after Brandon trusts the system.

Then you bring him in to teach:

- assumptions
- pricing logic
- exclusions
- vendor patterns
- historical estimate vs actuals

# **The real strategic answer**

Your first AI win should not be “the biggest eventual opportunity.”

It should be the one that:

- uses data you already have
- does not require Brandon to spoon-feed it
- creates a visible wow moment
- reduces risk or stress immediately
- naturally leads into bigger ROI workflows

That is **Project Document Intelligence**, with submittals/drawings/specs as the first domain.

Estimating is the prize.

Document intelligence is the door opener.

Here’s exactly how I’d start.

# **The goal**

Build a **Document Intelligence Review Loop** that asks:

“What does the project require, what proof has been submitted, does it match the drawings/specs, and what needs human attention?”

You do **not** need to fully understand construction. You need to structure the comparison.

---

# **1. Start with submittals because they are the cleanest wedge**

A **submittal** is basically proof from a subcontractor/vendor that says:

“Here is the product/material/system we plan to use. Please review and approve it.”

Examples:

- Sprinkler heads
- Pipe materials
- Pumps
- Valves
- Fire alarm devices
- Doors/hardware
- HVAC equipment
- Lighting fixtures
- Concrete mix

The question is:

“Does what they submitted match what the project documents require?”

---

# **2. What does a submittal get compared against?**

Usually:

## **A. Specs**

The specs say the rules.

Example:

- acceptable manufacturers
- required materials
- performance standards
- code requirements
- installation requirements
- warranty requirements

## **B. Drawings**

The drawings show where/how/how many.

Example:

- location
- size
- layout
- dimensions
- quantities
- system connections
- details

## **C. Submittal register / log**

The log says what submittals are expected, submitted, approved, rejected, missing, or late.

## **D. RFIs / meeting notes**

These explain changes, clarifications, conflicts, or decisions.

---

# **3. Your first agent should not “approve” submittals**

Important.

Do **not** position it as:

“AI approves/rejects submittals.”

Position it as:

“AI pre-reviews submittals and flags issues for human review.”

That protects trust and gives you room to learn.

---

# **4. The first workflow to build**

## **Submittal Pre-Review Agent**

Input:

- One submittal PDF
- Related spec section
- Related drawing sheets
- Prior RFIs
- Meeting notes
- Project metadata

Output:

## **1. Submittal Summary**

“What is being submitted?”

## **2. Required Criteria**

“What does the spec/drawing require?”

## **3. Comparison Table**

| **Requirement** | **Submitted Value** | **Match?** | **Evidence** | **Confidence** |
| --- | --- | --- | --- | --- |

## **4. Exceptions / Red Flags**

“What appears missing, inconsistent, or unclear?”

## **5. Suggested Reviewer Questions**

“What should the PM, engineer, or trade partner clarify?”

## **6. Recommended Action**

- Looks consistent
- Needs clarification
- Missing required info
- Possible conflict
- Human review required

That’s it. Keep it narrow.

---

# **5. The agent’s core prompt structure**

Use this logic:

```
You are a construction document intelligence assistant.

Your job is not to approve submittals. Your job is to compare a submitted document against project requirements and flag anything that needs human review.

For every conclusion:
1. Cite the exact source document.
2. Quote or summarize the requirement.
3. Identify the submitted value.
4. Mark match status as: Match, Potential Match, Missing, Conflict, or Unclear.
5. Assign confidence.
6. Recommend next action.

Never invent requirements.
If evidence is not found, say “not found in provided documents.”
```

---

# **6. The retrieval flow**

For each submittal, the agent should retrieve:

## **Step 1: Identify submittal type**

Example:

- fire sprinkler pipe
- valve
- pump
- storage rack system
- door hardware

## **Step 2: Find matching spec sections**

Search vector DB for:

- product name
- CSI section
- manufacturer
- material type
- keywords from the submittal title

## **Step 3: Find drawing references**

Search:

- drawing sheet titles
- system names
- equipment tags
- room/area names
- detail references

## **Step 4: Pull RFIs / meeting notes**

Search for:

- same product/system
- same location
- same spec section
- same issue language

## **Step 5: Generate comparison**

Agent creates structured review table.

## **Step 6: Human reviewer corrects it**

This is the learning loop.

---

# **7. Your learning loop**

Every review should create a feedback record.

Create a table like:

```
ai_review_feedback
- id
- project_id
- document_id
- review_type
- ai_finding
- human_feedback
- feedback_category
- corrected_status
- corrected_reason
- source_of_truth_reference
- created_by
- created_at
```

Feedback categories:

- Correct
- Missed requirement
- Wrong document match
- Bad interpretation
- Hallucinated issue
- Too vague
- Useful but low priority
- Needs construction expert review

This is gold.

Over time, the system learns:

- what matters
- what to ignore
- how Alleato thinks
- what Brandon/PMs care about

---

# **8. Your first test should be stupid simple**

Do not start with all project documents.

Pick:

## **One project**

## **One submittal**

## **One matching spec section**

## **One related drawing sheet**

Then ask the agent:

“Compare this submittal against the spec and drawing. Produce a pre-review report.”

That is the MVP.

---

# **9. What you personally need to learn**

You do **not** need to learn construction deeply.

You need to understand this mental model:

## **Specs = rules**

## **Drawings = visual design/locations**

## **Submittals = proposed proof/product**

## **RFIs = questions/clarifications**

## **Change events = money/schedule implications**

That’s the game.

The agent does the comparison.

The humans validate the judgment.

---

# **10. The best first demo**

Use a real project and show:

“Here are 7 requirements found in the specs. Here is what the submittal provided. 4 appear aligned. 2 are missing evidence. 1 conflicts with the drawing. Recommended reviewer questions below.”

That will land.

Not because it’s flashy.

Because it saves someone from digging through documents manually.

---

# **My blunt recommendation**

Start with **Submittal Pre-Review** before general “document intelligence.”

It gives you:

- a clear input
- a clear comparison
- a clear output
- a human validation loop
- immediate business value

Then expand into drawings, RFIs, change detection, and estimating.

Your first mission:

Build an agent that can compare one submittal against one spec section and one drawing sheet better than a distracted human doing it at 5:30 PM.

That’s the wedge.

It knows by turning the spec into a **checklist of testable requirements** first.

The agent should not “read and vibe.” It should run a comparison pipeline:

# **The logic**

## **1. Extract requirements from the spec**

From the spec, the agent creates requirements like:

| **Requirement** | **Type** |
| --- | --- |
| Must use Schedule 40 black steel pipe | Material |
| Manufacturer must be Victaulic or approved equal | Manufacturer |
| Must include product data sheets | Documentation |
| Working pressure must be 300 PSI minimum | Performance |
| Must comply with NFPA 13 | Code |
| Must include installation instructions | Documentation |

This becomes the **source-of-truth checklist**.

---

## **2. Extract claims from the submittal**

From the submittal, the agent pulls what was actually provided:

| **Submitted Claim** | **Evidence** |
| --- | --- |
| Pipe: Schedule 10 steel | Product data page 3 |
| Manufacturer: ABC Fire Products | Cover sheet |
| Pressure rating: 175 PSI | Data sheet page 6 |
| NFPA 13 listed | Certification page 9 |
| Installation instructions not found | Missing |

---

## **3. Compare requirement vs submitted claim**

Then each requirement gets marked:

| **Requirement** | **Submitted** | **Status** |
| --- | --- | --- |
| Schedule 40 black steel | Schedule 10 steel | **Conflict** |
| Victaulic or approved equal | ABC Fire Products | **Needs approval / unclear** |
| 300 PSI minimum | 175 PSI | **Conflict** |
| NFPA 13 compliance | NFPA 13 listed | **Match** |
| Installation instructions | Not found | **Missing** |

That’s how it “knows.”

Not from intuition.

From **requirement extraction → evidence extraction → comparison rules → confidence scoring**.

---

# **The five statuses I’d use**

## **Match**

The submittal clearly satisfies the requirement.

## **Missing**

The spec requires something, but the submittal does not provide evidence.

## **Conflict**

The submittal directly contradicts the spec.

## **Unclear**

The agent found related evidence but can’t confidently confirm.

## **Not Applicable**

The requirement does not apply to this submittal type.

---

# **The critical rule**

The agent must be forced to say:

“I can only mark Match if I have explicit evidence.”

That one rule prevents a ton of garbage.

No evidence = **Missing** or **Unclear**, not Match.

---

# **What makes this accurate**

You need two layers:

## **Layer 1: LLM extraction**

The LLM identifies requirements and claims from messy documents.

## **Layer 2: deterministic checks**

For things like:

- numbers
- dates
- PSI
- dimensions
- voltage
- material type
- manufacturer names
- model numbers
- code references
- required attachments

The system should compare values directly.

Example:

```
Spec requires: 300 PSI minimum
Submittal says: 175 PSI
Result: Conflict
Reason: submitted rating is below required minimum
```

This is where it becomes reliable.

---

# **Best prompt logic**

```
For each requirement from the spec:

1. Find matching evidence in the submittal.
2. If exact evidence is found, compare values.
3. If partial evidence is found, mark Unclear.
4. If contradictory evidence is found, mark Conflict.
5. If no evidence is found, mark Missing.
6. Cite every finding.
7. Do not infer compliance from silence.
```

---

# **The real answer**

The agent knows something is wrong or missing because you make it create a **requirements matrix**.

That matrix becomes the test suite.

Think of it like coding:

- Spec = expected behavior
- Submittal = implementation
- Agent = test runner
- Human reviewer = QA approval

That’s the whole system.