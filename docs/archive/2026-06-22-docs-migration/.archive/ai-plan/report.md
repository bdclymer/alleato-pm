# Dogfood Run — 2026-05-02T16-13-17-228Z

- Endpoint: http://localhost:3000/api/ai-assistant/chat
- Total: 8
- Pass: 6
- Fail: 2

## Results

| # | Case | Status | Tools | Duration | Ground truth | Failures |
|---|---|---|---|---|---|---|
| 1 | 01-recent-meeting-issues | ✅ | 7 | 36.4s | 28 | — |
| 2 | 02-overdue-rfis | ✅ | 12 | 98.2s | 4 | — |
| 3 | 03-pending-change-orders | ✅ | 5 | 34.5s | 1 | — |
| 4 | 04-yesterday-meetings | ✅ | 5 | 26.3s | 7 | — |
| 5 | 05-recent-emails | ❌ | 0 | 11.5s | 22 | STREAM ERROR: stream: terminated |
| 6 | 06-active-projects | ❌ | 3 | 29.8s | 100 | Answer mentioned numbers 13,13,7,13,8, expected ~100 |
| 7 | 07-portfolio-risks | ✅ | 8 | 59.9s | n/a | — |
| 8 | 08-cash-position | ✅ | 5 | 38.8s | n/a | — |

## Per-case answer previews

### 01-recent-meeting-issues — ✅
**Prompt:** Were there any issues from the meetings in the last couple days?

**Tools fired (7):** intentPlanner, streamingToolPolicy, getMeetingsByDate, getMeetingDetails, getMeetingDetails, getMeetingDetails, getMeetingDetails

**Answer preview:**
```
Yes. A few issues showed up in meetings from the last couple days, mostly on the project/design and compliance side.

### What stands out

- **Ace Hardware Champaign IL**
  - The **greenhouse design is still not approved**.
  - It’s **missing irrigation** and still needs **client feedback**.
  - **Civil work is stalled** until a surveyor is hired.
  - Several **client decisions are unresolved** — 
```

### 02-overdue-rfis — ✅
**Prompt:** Which RFIs are overdue right now? Who owes us a response?

**Tools fired (12):** intentPlanner, streamingToolPolicy, getRFIStatus, getCrossProjectComparison, searchEmails, searchTeamsMessages, getRFIStatus, getRFIStatus, getRFIStatus, getRFIStatus, streamTextError, noToolRetry

**Answer preview:**
```
Vermillion Rise currently has 1 overdue RFI. The outstanding overdue RFI is for the fire rating on the north wall. The party that owes us a response is the design team—the architect is the primary responder on this RFI.

You also have 3 other open RFIs that are not overdue; those are still within their response window.

Action: You need to follow up directly with the architect to get the fire rati
```

### 03-pending-change-orders — ✅
**Prompt:** What change orders are pending approval right now? What's the total exposure?

**Tools fired (5):** intentPlanner, streamingToolPolicy, getChangeOrderDetails, queryChangeOrders, getPortfolioOverview

**Answer preview:**
```
I don’t have a trustworthy portfolio-wide pending CO dollar total yet.

What I can confirm right now:
- There are **19 open change events** across the current portfolio.
- Projects showing open change-event exposure:
  - **Vermillion Rise Warehouse** — 10 open change events
  - **Ulta Beauty Fresno** — 1
  - **Exol Wilmer** — 4
  - **QA Workflow Project** — 4

What that means:
- **Exposure exists*
```

### 04-yesterday-meetings — ✅
**Prompt:** Summarize yesterday's meetings.

**Tools fired (5):** intentPlanner, streamingToolPolicy, getMeetingsByDate, getMeetingDetails, getMeetingDetails

**Answer preview:**
```
Yesterday there were **2 meetings** on the calendar.

## 1) GA GC renewal steps
**What mattered:** This was the more substantive meeting.

- The team discussed building a **candidate database** to improve hiring speed and tracking.
- **Jazmin and Ashley** were referenced as inputs to that process.
- They identified **4 strong candidates from Indeed**, despite the platform filters not surfacing the
```

### 05-recent-emails — ❌
**Prompt:** What did we hear about in emails this past week? Any commitments or issues?

**Tools fired (0):** (none)

**Answer preview:**
```

```

### 06-active-projects — ❌
**Prompt:** How many active projects do we have right now? Quick summary.

**Tools fired (3):** intentPlanner, streamingToolPolicy, getPortfolioOverview

**Answer preview:**
```
You have **13 active projects** right now.

Quick read:
- **13 active projects total**
- **7 of 13** have contract value data attached
- Total active contract value showing is **$8.05M**
- Portfolio has **19 open change events**
- There are **74 recorded meetings** across active jobs

What that means:
- The portfolio looks **active and engaged**, not asleep.
- The main thing to watch is **change-e
```

### 07-portfolio-risks — ✅
**Prompt:** What should I worry about across all my active projects right now? Top 3 risks.

**Tools fired (8):** intentPlanner, streamingToolPolicy, getProjectsWithRisks, getCrossProjectComparison, getProjectsWithRisks, getProjectsWithRisks, getPortfolioOverview, getActionItemsAndInsights

**Answer preview:**
```
The point of view: **you do not have a broad portfolio fire right now. You have one confirmed hotspot and two near-term execution risks that could become problems if nobody le-centers them this week.**

## Top 3 risks across active projects

### 1) Vermillion Rise Warehouse
This is the one that needs attention first.

What’s behind it:
- **Risk score 7**
- **7 tracked issues**
- **9 overdue tasks*
```

### 08-cash-position — ✅
**Prompt:** How does our cash position look right now?

**Tools fired (5):** intentPlanner, streamingToolPolicy, getCashPositionReport, getARAgingReport, getAPAgingReport

**Answer preview:**
```
Right now, I can only give you a partial cash read — and the part I can see says there’s at least one real issue.

We have **$14,110 in AP sitting 90+ days past due across 2 bills**. That’s the clearest live signal in the accounting data. Everything else in AP aging is clean — no balances in current, 1–30, 31–60, or 61–90. So the visible problem is concentrated, not widespread.

What that means:
-
```
