# Project Homepage UX Analysis — User-Empathy-Driven Redesign

**Date:** 2026-03-06
**Purpose:** Think through every section of the project homepage from the user's perspective — what they need to know, what they'd want to do, and how the design should proactively surface the right information at the right moment.

**Design Philosophy:** Superhuman's core insight is that the best interface anticipates what you need next. Every pixel must answer the question: *"What does the user need RIGHT NOW to make their next decision?"*

---

## The User: Construction Project Manager

Before analyzing sections, we need to understand who's opening this page and why.

### Who They Are
- **Role:** Project Manager, Project Engineer, or Superintendent on a construction project
- **Context:** They manage $2M–$200M construction projects with 20–200 people involved
- **Tools:** They bounce between Alleato, email, phone calls, and site visits all day
- **Stress:** They're accountable for budget, schedule, quality, and safety — all at once
- **Time pressure:** They check the dashboard in 30-second windows between meetings and calls

### When They Open This Page
1. **Morning check-in** (7:00 AM) — "What happened overnight? What's on fire today?"
2. **Pre-meeting prep** (before OAC meeting) — "What's the budget status? What open items do I need to discuss?"
3. **Quick status check** (throughout the day) — "Am I forgetting something? What needs my attention?"
4. **End-of-day wrap** (5:00 PM) — "What didn't get done today? What do I need to follow up on tomorrow?"
5. **Executive reporting** (weekly) — "Give me the numbers to put in my status report."

### The 3-Second Test
When they land on this page, they should be able to answer in 3 seconds:
1. Is my project healthy or in trouble?
2. What needs my attention right now?
3. Where do I go to handle it?

---

## Current Layout Analysis

The homepage uses an "Inverted Pyramid" — a single card with 5 horizontal layers:

| Layer | Content | Width Split |
|-------|---------|-------------|
| 1 | Header (job #, name, meta) | Full width |
| 2 | KPI Strip (4 metrics) | 4 equal columns |
| 3 | Budget Allocation + Signals & Activity | 3/5 + 2/5 |
| 4 | Budget Variances + Financial Exposure | 3/5 + 2/5 |
| 5 | Meetings + Project Team | 3/5 + 2/5 |

---

## Section-by-Section UX Analysis

---

### 1. PROJECT TEAM SECTION (Layer 5, Right)

#### Current State
Shows up to 6 team members as avatar + name + role, with a "View all" link to `/directory/users`. Only renders if `teamMembers.length > 0`.

#### What the User Actually Needs to Know

**"Who do I call about ___?"**
The #1 reason someone looks at the team section is to find the right person for a specific issue. A PM thinking "the HVAC sub hasn't submitted their shop drawings" needs to:
- See the subcontractor's project manager
- Get their phone number in one tap
- Maybe shoot them a quick email

**"Is everyone assigned?"**
Missing roles are a red flag. If there's no Superintendent assigned, no Architect of Record, no Safety Officer — that's a signal. The team section should proactively surface gaps.

**"Who's active? Who's MIA?"**
In construction, "presence" matters. If the electrical sub's PM hasn't logged into the platform in 2 weeks, that's a concern. If the architect filed 3 RFI responses today, that's great context.

**"Who's new? Who changed?"**
Team members rotate on construction projects. A new sub PM replacing someone mid-project is important context for the whole team to see.

#### What the User Wants to Do

| Action | Priority | Current Support |
|--------|----------|-----------------|
| **Call someone** | 🔴 Critical | ❌ No phone numbers shown |
| **Email someone** | 🔴 Critical | ❌ No email shown |
| **See who handles what role** | 🟡 Important | ⚠️ Role shown but no company |
| **Know if roles are missing** | 🟡 Important | ❌ Not surfaced |
| **Add a team member** | 🟢 Useful | ❌ Must navigate to directory |
| **See recent activity per person** | 🟢 Useful | ❌ Not available |
| **See their company** | 🟡 Important | ❌ Not shown |

#### Recommended Improvements

1. **Show company name** under each member — "John Smith · Turner Construction" tells you instantly whether they're your sub, your architect, or your owner's rep.

2. **Quick contact icons** — Small phone and email icons that trigger `tel:` and `mailto:` links. One tap to call from mobile. No navigating to another page.

3. **"Missing Roles" signal** — If the project has no one with "Superintendent" or "Architect" role, show a subtle amber chip: "⚠ No Architect assigned." This is proactive — it surfaces a gap before it becomes a problem.

4. **Last-active indicator** — A green dot for members active in the last 24h, gray for 7+ days. This gives a pulse on engagement without being invasive.

5. **Grouped by responsibility** — Instead of a flat list, consider grouping: "Your Team" (internal) vs "External Partners" (subs, architects, owner). The PM cares about different things for each group.

6. **"Key Contacts" variant** — Show only the 4-5 most critical roles (PM, Super, Architect, Owner Rep, Safety) with full contact info, not all 20 team members. The rest are in the directory.

#### Proposed Layout

```
┌─ Project Team ──────────────────── View all →
│
│  KEY CONTACTS
│  ┌──────────────────────────────────────────┐
│  │ 👤 John Smith        📞 📧              │
│  │    Project Manager · Turner Construction  │
│  ├──────────────────────────────────────────┤
│  │ 👤 Sarah Chen        📞 📧              │
│  │    Superintendent · Alleato Group         │
│  ├──────────────────────────────────────────┤
│  │ 👤 Mike Torres       📞 📧              │
│  │    Architect · HKS Architects             │
│  ├──────────────────────────────────────────┤
│  │ 👤 Lisa Park         📞 📧              │
│  │    Owner Rep · Vermillion LLC             │
│  └──────────────────────────────────────────┘
│
│  ⚠ No Safety Officer assigned  [Assign →]
│
│  +12 more in directory
└──────────────────────────────────────────────
```

---

### 2. HEADER SECTION (Layer 1)

#### Current State
Job number, project name, project meta (type · sector · phase), settings gear, checklist sidebar trigger.

#### What the User Actually Needs to Know

**"Is this project healthy?"**
The header is the first thing they see. Right now it shows static metadata. It should answer: *Is this project on track?* A single status indicator — green/yellow/red dot or ring — next to the project name gives an instant pulse check.

**"What project am I looking at?"**
For PMs managing multiple projects, context matters. The client name, location, and estimated completion date are the 3 pieces of context that instantly orient them: "Oh right, this is the Vermillion warehouse in Denver, finishing in August."

**"How far along are we?"**
The phase label ("Construction") is static. A progress indicator — even just "Month 8 of 14" or a subtle progress bar — tells the story of where you are in the project lifecycle.

#### What the User Wants to Do

| Action | Priority | Current Support |
|--------|----------|-----------------|
| **See project health at a glance** | 🔴 Critical | ❌ No health indicator |
| **Know the client** | 🟡 Important | ❌ Not in header |
| **Know the location** | 🟡 Important | ❌ Not in header |
| **Know the completion date** | 🟡 Important | ❌ Not in header |
| **Edit project details** | 🟢 Useful | ✅ Settings gear works |
| **Access setup checklist** | 🟢 Useful | ✅ Checklist sidebar works |

#### Recommended Improvements

1. **Health dot** — A 6px colored dot (green/yellow/red) before the project name that's computed from budget utilization + open items + schedule status. This is the single most impactful addition.

2. **Client name in meta line** — Add `project.client` to the meta string: "Commercial · Hospitality · Construction · **Vermillion LLC**"

3. **Completion countdown** — If `est completion` exists, show: "Est. completion: Aug 2026 (5 mo)" — this is what people ask about constantly.

4. **Project photo/color** — A small 32x32 thumbnail or colored icon to give visual identity. PMs managing 8 projects need visual differentiation, not just text.

---

### 3. KPI STRIP (Layer 2)

#### Current State
4 metrics: Total Budget, Committed, Projected Over/Under, Open Items. Each links to its respective tool page.

#### What the User Actually Needs to Know

**"Am I on budget?"** → Total Budget + Committed answers this. ✅ Already covered.

**"Am I on schedule?"** → 🔴 **NOT covered.** This is the #1 gap. Construction PMs care equally about budget and schedule. The KPI strip is 100% financial. A schedule KPI is critical.

**"What needs my attention right now?"** → Open Items partially covers this, but it's passive ("5 RFIs + 3 events"). It should be active: "8 items need action."

**"Is the trend getting better or worse?"** → No trend indicators. "Committed: $1.2M" doesn't tell you if that increased by $200K this week or has been stable for a month.

#### What the User Wants to Do

| Action | Priority | Current Support |
|--------|----------|-----------------|
| **Check budget health** | 🔴 Critical | ✅ Good |
| **Check schedule health** | 🔴 Critical | ❌ Missing entirely |
| **See what needs attention** | 🔴 Critical | ⚠️ Passive count |
| **See trends** | 🟡 Important | ❌ No sparklines/arrows |
| **Drill into details** | 🟢 Useful | ✅ KPIs link to pages |

#### Recommended Improvements

1. **Replace "Open Items" with "Schedule Health"** — Show % complete, tasks on track vs overdue, or days ahead/behind. Move open items to the Signals section where they fit better.

2. **Or add a 5th KPI** — If screen width allows, add Schedule as a 5th cell. On mobile, wrap to 2 rows of 2-3.

3. **Trend micro-indicators** — A tiny ↑ or ↓ arrow with "vs last week" context on each KPI. Not a full sparkline — just a direction indicator.

4. **Action-oriented language** — Instead of "Open Items: 8", say "8 need action" or "8 awaiting response."

---

### 4. BUDGET ALLOCATION (Layer 3, Left)

#### Current State
Horizontal bar chart showing Committed, Remaining, and Pending COs as proportions of total budget.

#### What the User Actually Needs to Know

**"Where is the money going?"** — The current chart answers this at a very high level (committed vs remaining). But a PM wants to know: *Which trades are eating the budget? Which cost codes are over?*

**"How much runway do I have?"** — "Remaining" in isolation isn't useful. "Remaining: $400K (enough for 3 more change orders at current pace)" is actionable.

#### Recommended Improvements

1. **Add "Direct Costs" as a bar segment** — Currently only shows Committed (contracts). Direct costs are a significant budget category that's invisible here.

2. **Contextual annotation** — On the "Remaining" bar, add a subtle label: "~X% contingency" if they have a contingency line in their budget.

3. **Click to drill** — Each bar segment should link to its respective page (Committed → Commitments, Pending → Change Orders).

---

### 5. SIGNALS SECTION (Layer 3, Right Top)

#### Current State
Pill-shaped chips showing computed alerts: budget warnings, RFI counts, pending COs, completion countdown. Dismissible.

#### What the User Actually Needs to Know

Signals are GREAT conceptually — they're the proactive intelligence layer. But they're currently limited to 5 rules:
1. Budget > 75% or > 90% committed
2. Open RFIs > 3 or > 8
3. Pending change orders exist
4. Open change events exist
5. Completion within 60 days

#### Missing Signals That Users Would Want

| Signal | Why It Matters |
|--------|---------------|
| **Overdue schedule tasks** | "3 tasks past due date" — schedule slippage is invisible today |
| **No daily log in X days** | "No daily log filed in 5 days" — compliance risk |
| **Insurance/document expiration** | "2 subcontractor COIs expire this month" |
| **Unexecuted commitments** | "4 contracts still unsigned" — legal risk |
| **Budget variance spikes** | "Electrical cost code 150% consumed" — specific, not general |
| **Upcoming milestone** | "Foundation pour in 3 days" — preparation signal |
| **Stale RFIs** | "2 RFIs unanswered for 14+ days" — not just count, but aging |

#### Recommended Improvements

1. **Add schedule signals** — Parse `schedule_tasks` for overdue items and upcoming milestones.
2. **Add compliance signals** — Daily log freshness, document expirations.
3. **Age-based RFI signals** — "2 RFIs aging 14+ days" is more actionable than "5 open RFIs."
4. **Don't dismiss permanently** — Currently `signalsDismissed` hides ALL signals for the session. Better: dismiss individual signals, and re-show if conditions worsen.

---

### 6. RECENT ACTIVITY (Layer 3, Right Bottom)

#### Current State
5 derived activity items from data counts: pending COs, open RFIs, last daily log, commitment execution, open change events.

#### What the User Actually Needs to Know

**"What happened today?"** — The current activity section doesn't show TIME. "3 RFIs open" is a status, not an activity. Real activity is: "Sarah responded to RFI #14 (2h ago)" or "Budget updated by John (yesterday)."

#### Recommended Improvements

1. **Timestamped events** — Pull from `created_at` and `updated_at` fields to show a real timeline.
2. **Person attribution** — "By [name]" adds accountability and context.
3. **Today/yesterday grouping** — Group by recency, not by type.
4. **Filter: "My activity" vs "All"** — PMs want to see what THEY need to react to, not everything.

---

### 7. BUDGET VARIANCES (Layer 4, Left)

#### Current State
Top 6 cost codes with biggest variance, showing cost code, description, dollar variance, and a consumption bar.

#### Assessment
This section is actually quite good. It answers a clear question: "Which cost codes are furthest off track?" The visual is clean — bar charts with color coding (green/amber/red based on consumption %).

#### Minor Improvements

1. **Show direction arrow** — Is this variance getting worse or improving over time?
2. **Click to drill** — Each row should link to that cost code's detail in the budget.
3. **Show top gainers too** — Not just problems. "Concrete: +$50K under budget" is good news worth surfacing.

---

### 8. FINANCIAL EXPOSURE (Layer 4, Right)

#### Current State
Three metrics: Committed %, Pending Decisions (dollar value), Forecast Gap.

#### Assessment
Solid section. The commitment % progress bar with color coding is effective. Pending Decisions surfaces unresolved financial items.

#### Minor Improvements

1. **Add "Days to Resolve" estimate** — "Pending: $85K · avg 12 days to resolve" gives pace context.
2. **Link pending to action** — "3 items pending" should link to the change orders awaiting approval.

---

### 9. MEETINGS SECTION (Layer 5, Left)

#### Current State
Meeting cards with date badge, title, duration, attendee count, and participant avatars.

#### What the User Actually Needs to Know

**"What meetings do I have today/this week?"** — The current section shows recent meetings chronologically. But the #1 question is about UPCOMING meetings, not past ones.

**"What action items came out of the last meeting?"** — Meeting minutes without action items are noise. The PM wants to see: "OAC Meeting (Mar 4): 3 action items — 1 assigned to you."

#### Recommended Improvements

1. **Split: Today's Meetings (top) + Recent (below)** — Time-sensitive info first.
2. **Surface action items** — If meetings have action items tracked, show count + assignee.
3. **"No meetings today"** — When there are no upcoming meetings, say so explicitly. Don't just show nothing.
4. **Quick prep link** — "Prep for tomorrow's OAC" that opens meeting details with agenda.

---

## SECTIONS THAT ARE ENTIRELY MISSING

These are things users would expect on a project dashboard that don't exist today:

### A. Schedule Snapshot 🔴 Critical Gap

**Why it's missing is a problem:** Construction PMs split their attention 50/50 between budget and schedule. The homepage is 80% financial and 0% schedule.

**What to show:**
- % complete (overall project)
- Tasks on track vs overdue count
- Next 3-5 upcoming milestones with dates
- Critical path status (on track / X days behind)
- Link to schedule page

**Proposed location:** Replace or supplement Budget Allocation in Layer 3 — or create a new Layer 3.5.

### B. "My Tasks" / Personal Action List 🔴 Critical Gap

**Why it matters:** The PM opens this page asking "what do I need to do today?" The current page shows PROJECT status but not PERSONAL todos.

**What to show:**
- RFIs assigned to me
- Change orders awaiting my approval
- Tasks I own that are due soon
- Action items from meetings assigned to me
- Documents awaiting my review

**Proposed location:** Top of the page, before or alongside the KPI strip. "3 items need your attention today" with expandable list.

### C. Documents & Submittals Overview 🟡 Important Gap

**Why it matters:** Document management is a core workflow. Pending submittals, expiring insurance certificates, and unsigned contracts are daily concerns.

**What to show:**
- Pending submittal approvals
- Documents uploaded this week
- Expiring compliance documents (COIs, licenses)
- Unsigned contracts

### D. Weather Widget 🟢 Nice-to-Have

**Why it matters:** Outdoor construction is weather-dependent. Rain delays cost money. A 3-day forecast for the project location helps planning.

### E. Latest Site Photos 🟢 Nice-to-Have

**Why it matters:** Daily log photos give visual progress context. A 3-4 photo strip from the latest daily log humanizes the dashboard and provides at-a-glance progress.

---

## Priority Matrix

| Improvement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| Schedule snapshot section | 🔴 High | Medium | **P1** |
| Team: phone/email contact icons | 🔴 High | Low | **P1** |
| Team: show company name | 🔴 High | Low | **P1** |
| Header: health dot indicator | 🔴 High | Low | **P1** |
| KPI: add schedule metric | 🔴 High | Medium | **P1** |
| "My Tasks" personal action list | 🔴 High | High | **P2** |
| Signals: schedule/compliance signals | 🟡 Medium | Medium | **P2** |
| Activity: real timestamps + attribution | 🟡 Medium | Medium | **P2** |
| Team: missing role warnings | 🟡 Medium | Low | **P2** |
| Header: completion countdown | 🟡 Medium | Low | **P2** |
| Header: client name in meta | 🟡 Medium | Low | **P2** |
| Meetings: today/upcoming split | 🟡 Medium | Medium | **P3** |
| KPI: trend indicators | 🟡 Medium | Medium | **P3** |
| Documents overview section | 🟡 Medium | High | **P3** |
| Budget: direct costs bar | 🟢 Low | Low | **P3** |
| Weather widget | 🟢 Low | Medium | **P4** |
| Latest site photos | 🟢 Low | Medium | **P4** |

---

## Design Principles Applied

Every recommendation above follows the Superhuman-inspired design principles:

1. **Next action obvious** — Contact icons on team members, drill-down links on every metric, "My Tasks" at the top
2. **Immediate feedback** — Health dot changes in real-time, signals update as data changes
3. **Minimize distraction** — No decorative wrappers, no redundant information, no "dashboard for dashboard's sake"
4. **Information density** — More data per pixel without clutter
5. **Progressive disclosure** — Summary on homepage → drill into detail pages
6. **Tonal elevation** — Team and activity sections on `bg-muted/30`, financial sections on `bg-card`

---

## Next Steps

1. **Implement P1 items** — Team contact info, health dot, schedule KPI, schedule snapshot
2. **User testing** — Watch a real PM use the homepage and note where they hesitate
3. **Iterate on Signals** — Add schedule and compliance signals
4. **Design "My Tasks"** — This is the highest-impact missing feature but requires cross-tool data aggregation
