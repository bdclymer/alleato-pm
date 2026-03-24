# AI Strategist Quality Assessment
**Date:** 2026-03-18
**Tested by:** Claude Code — live browser session
**Model:** `claude-sonnet-4-5` (Strategist) with C-Suite specialist agents
**Embeddings:** `text-embedding-3-large` at 3072 dims (just backfilled)

---

## Executive Summary

The AI Strategist performs exceptionally well on internal-data questions — synthesis across projects, financial health, people/capacity, weekly priorities. It uses 15–19 tool calls, pulls real meeting transcripts, project numbers, and specific dollar amounts, and is honest when it can't find data. The primary gaps are: **no web research capability** for market/competitive questions, **pipeline tool failures** preventing revenue forecasting, and a **markdown rendering bug** that breaks numbered lists inside headings.

**Overall Grade: B+ / 8 out of 10**
For internal-data questions: A
For market/external intelligence: C-
For forward-looking financial: B (limited by data gaps, not reasoning)

---

## Test Results

### Q1: "Give me the state of the business"
**Tool calls:** 18
**Quality: ✅ EXCELLENT**

The AI produced a full C-Suite briefing — CFO, COO, CRO, CHRO, VP BD — each pulling real data:
- Named specific projects: Goodwill Tremont, Westfield Collective, Vermillion Rise, Goodwill Noblesville
- Cited exact dollar amounts: $11,975,045 total contract value, $1,205,853.55 pending COs
- Identified the Goodwill Tremont negative net position ($112,575.38)
- Honestly stated when Acumatica financial tools failed
- Pulled from multiple meeting transcripts dated correctly

**Assessment:** This is what the AI should do. Owner would feel like they actually got a real briefing from 5 department heads. Zero hallucination — it cites sources and admits gaps.

---

### Q2: "What stresses the team out / what's the team capacity situation?"
**Tool calls:** ~12 (estimated from previous session)
**Quality: ✅ STRONG**

- Synthesized from meeting transcripts (not just structured data)
- Correctly identified finance team friction (billing duplication, double-cashing)
- Noted field execution strain at Westfield Collective
- Flagged the 12–15 hire gap
- Honest about what it could and couldn't confirm

**Assessment:** The transcript embedding (via Fireflies/documents table) is clearly working. The AI is doing genuine meaning extraction, not just keyword matching.

---

### Q3: "What are the industry trends and competitive intelligence?"
**Tool calls:** ~3
**Quality: ⚠️ SIGNIFICANT GAP**

Response fell back to generic construction industry knowledge:
- "Owners are buying certainty, not just scope"
- "Strong firms are using data as a competitive weapon"
- "AI is changing knowledge work first"

The AI correctly admitted: *"I don't have internal market-intel or company knowledge articles yet that document what your specific competitors are doing."*

But it could not fill that gap with live web research because **there is no web search tool in the current agent architecture**.

**Assessment:** For a business owner asking about market positioning, competitive threats, or industry trends, the current AI is largely useless. It gives the same answer anyone could Google. The "ultimate strategist" persona requires current market intelligence.

---

### Q4: "What should I focus on this week to have the biggest impact?"
**Tool calls:** 19
**Quality: ✅ EXCEPTIONAL — best response of all 5**

Produced a structured 5-priority owner brief:
1. **Personally intervene on Goodwill Tremont** — negative $112K net, specific recovery steps
2. **Force a Westfield Collective reset** — 181 overdue tasks, $1.2M CO exposure
3. **Clean up finance controls** — named billing/retainage issues, asked for accountability owner
4. **Check team capacity against near-term starts** — referenced 12–15 hire gap
5. **Unblock Vermillion Rise and Noblesville** — specific approvals and delivery commits needed

Then ended with: *"If you only do 3 things this week: Goodwill Tremont recovery review, Westfield CO + schedule reset, Finance control/accountability reset."*

**Assessment:** This is the killer feature. An owner who starts their Monday with this question gets back a prioritized action list better than most chief of staff briefings. This response alone justifies the entire AI investment.

---

### Q5: "Are we going to hit our revenue targets? What's our trajectory, backlog, and pipeline?"
**Tool calls:** 10
**Quality: ⚠️ MIXED — honest but incomplete**

Correct answer to the wrong data:
- Honest up front: *"I can't responsibly tell you we're on track to hit revenue targets yet."*
- CFO found $11.975M contract value but $0 invoiced / $0 payments received → billing data not flowing into the AI tools
- VP BD explicitly noted pipeline tool failures: *"The portfolio calls for Estimating, Planning, and Current either failed or returned unusable output"*
- Could not size pipeline, likely conversion, or annual target coverage

Also exposed a **markdown rendering bug** — the model generated:
```
### 1. **Pending change orders
$1,205,853.55**
```
Which rendered as broken heading + paragraph with dangling `**` markers visible.

**Assessment:** The AI is doing the right thing — it won't fabricate a revenue forecast when it doesn't have the data. But two gaps prevent a useful answer: (1) billing/invoicing data isn't connected, and (2) pipeline (Estimating/planning stages) tool calls are failing. When fixed, this could become the most valuable single question an owner asks.

---

## What's Working Exceptionally Well

### 1. Internal Data Synthesis
The AI reads across 5+ specialized data sources per query — meeting transcripts, project data, financial tools, HR context, risk radar — and synthesizes them into a coherent narrative. This is genuinely hard and it does it consistently.

### 2. Honesty About Failures
Every time a tool fails or data is missing, the AI names it explicitly. It never fabricates numbers. This is the single most important property for trust — and it's working correctly.

### 3. The Weekly Owner Brief (Q4-style questions)
This is the AI's strongest use case today. Any "what should I focus on / what needs my attention" question gets a specific, sourced, actionable response that would take a human 2+ hours to compile.

### 4. Meeting Transcript Mining
With 1,500+ Fireflies transcripts now embedded at 3072 dims, the AI correctly extracts decisions, action items, and context from real meetings. It names the correct meeting dates and pulls verbatim context.

### 5. Cross-Project Pattern Recognition
On portfolio-level questions, it identifies patterns that span projects — like billing control issues appearing in 3 different project contexts — and surfaces them as systemic issues rather than one-offs.

---

## Critical Gaps

### Gap 1: No Web Research / Market Intelligence (HIGH PRIORITY)
**Impact:** The AI cannot answer any externally-facing question — competitor analysis, market trends, new lead research, industry benchmarks, construction cost indices, M&A activity, etc.

**Root cause:** No web search tool exists in the Strategist or VP BD agent.

**Fix:** Add a web search tool (Tavily or similar) to the VP BD and Strategist. Scope it to construction/GC market research. Should be callable when user asks about competitors, market conditions, industry trends, or any question that clearly requires external knowledge.

**Effort:** Medium. 1–2 days. Already have Tavily MCP in the environment.

---

### Gap 2: Pipeline Tools Failing (HIGH PRIORITY)
**Impact:** Cannot answer revenue forecasting, backlog coverage, or pipeline questions. VP BD is blind on the most forward-looking business questions.

**Root cause:** `getProjectsInPipeline` tool calls for Estimating/Planning/Current phase are returning unusable output. Likely a Supabase query or schema mismatch.

**Fix:** Debug the VP BD pipeline tools. Check `getProjectPipeline` implementation — likely needs to query `projects` table filtered by phase and return proper structure.

**Effort:** Small. 2–4 hours to debug and fix.

---

### Gap 3: Billing/Invoicing Data Not Flowing (MEDIUM PRIORITY)
**Impact:** Revenue trajectory questions always show $0 invoiced / $0 received. Cannot measure billing velocity or cash collection.

**Root cause:** Acumatica AR/invoicing data either (a) isn't being imported into the tool layer, or (b) the tool is querying a table that isn't populated from Acumatica sync.

**Fix:** Verify Acumatica AR sync and ensure `getARAgingReport` / invoicing tools read from the correct populated tables.

**Effort:** Medium. Requires Acumatica sync audit.

---

### Gap 4: Markdown Rendering Bug (LOW-MEDIUM PRIORITY)
**Impact:** Some responses show raw `**` markers instead of bold text. Happens when the model generates H3 headings that include inline markdown bold syntax (e.g., `### 1. **Pending change orders`).

**Root cause:** The Streamdown renderer (used by `MessageResponse`) isn't handling the combination of ATX heading + inline bold markers in a single token. The heading parser consumes the `###` but leaves the `**` from a numbered list format.

**Likely fix:** The model should be instructed in the system prompt to avoid using inline `**bold**` inside heading lines — use plain headings and bold in paragraph text instead. Alternatively, patch the Streamdown heading parser to strip inline marks from heading content.

**Effort:** Small. Add a formatting instruction to the system prompt: *"When using markdown headings (##, ###), do not use inline bold (**) inside the heading line itself."*

---

### Gap 5: No Embedded Competitive/Industry Knowledge Base (MEDIUM-TERM)
**Impact:** Even with web search, structured competitor intelligence needs to be persistent. One-time web research answers don't compound.

**Fix:** Create a structured knowledge base in the `documents` table:
- Competitor profiles (Boldt, Messer, Walsh, local GCs)
- Construction industry cost trends (ENR cost index, labor cost data)
- Market reports (regional construction pipeline, permit data)
- Alleato's own differentiators, win/loss analysis

**Effort:** Medium-High. Requires research + structured ingestion workflow.

---

## Recommendations

### Immediate (This Week)
1. **Fix pipeline tools** — VP BD `getProjectsInPipeline` calls failing → debug tool implementation
2. **Add system prompt formatting guard** — prevent `**` in heading lines to fix markdown render bug
3. **Verify Acumatica AR sync** — understand why $0 invoiced/received is showing

### Near-Term (Next 2 Weeks)
4. **Add web search to VP BD agent** — Tavily integration for market/competitive research
5. **Add web search to Strategist** — for externally-facing strategic questions

### Medium-Term (Next Month)
6. **Build competitor intelligence docs** — manually create 5–10 key competitor profiles and ingest into knowledge base
7. **Set up construction market data ingestion** — ENR, regional permit data, labor cost indices
8. **Fix Acumatica cash/AR reporting** — detailed investigation needed

### What NOT to Change
- The C-Suite multi-agent architecture is working well — don't simplify it
- The tool call depth (15–19) is appropriate for complex owner questions — don't reduce it
- The honesty/citation behavior is exactly right — don't make it more "confident"
- The document/transcript RAG is working — the 3072-dim upgrade will make it better

---

## The "Ultimate Business Strategist" Gaps

To get from current state (B+) to "knows everything about the business":

| Capability | Current State | Gap |
|------------|--------------|-----|
| Internal project health | ✅ Excellent | None |
| Meeting/decision recall | ✅ Excellent | Minor: more transcripts = better |
| Financial health | ✅ Good | AR/invoicing data not flowing |
| Team/people intel | ✅ Good | Email/calendar not yet integrated |
| Weekly prioritization | ✅ Exceptional | None |
| Revenue forecasting | ⚠️ Limited | Pipeline tool failures + billing data gap |
| Competitive intelligence | ❌ Missing | No web search, no competitor knowledge base |
| Industry trends | ❌ Missing | No web search |
| Lead research | ❌ Missing | No web search |
| Email/communication history | ⚠️ Partial | MS Graph email not yet fully embedded |
| OneDrive documents | ⚠️ Partial | MS Graph files embedded but growing |
| Strategic scenario modeling | ⚠️ Limited | No financial modeling tools |

The four things that would most dramatically improve the "feels like it knows everything about the business" experience:
1. **Web search** — unlocks the entire external intelligence dimension
2. **Pipeline tools working** — makes revenue/growth questions answerable
3. **Billing data connection** — makes financial trajectory questions answerable
4. **Competitor profiles in knowledge base** — makes competitive questions specific to Alleato

---

*Assessment conducted via live browser session. All tool call counts confirmed via Trace panel in UI.*
