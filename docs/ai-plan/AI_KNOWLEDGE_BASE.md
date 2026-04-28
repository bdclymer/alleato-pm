# Alleato OS — AI Knowledge Base

> Canonical source of truth for "Ask Alleato." Feeds the assistant's system
> prompt and/or RAG corpus. **A wrong answer in the first 30 minutes does
> more damage than no AI at all** — when in doubt, the AI says "I don't know
> yet" instead of fabricating.
>
> **Annotation conventions:**
> - `[VERIFY: Brandon]` — needs a construction professional to confirm
> - `[FILL]` — answer placeholder, needs Megan to write
> - `[CHECK]` — verify this matches the current build behavior

---

## Loading this into the assistant

Two viable architectures:

**A. System prompt injection** — concatenate this entire doc into the
assistant's system prompt. Works under ~8k tokens. Re-deploy when changes.

**B. RAG retrieval (recommended)** — chunk by `###` heading, embed each Q/A
pair, retrieve top-k by user question similarity. Keep persona rules in the
system prompt; pull KB content at query time.

**The "I don't know" reflex (mandatory)** — already specified in
`AI_PERSONA_AND_MEMORY.md`, must be in the system prompt verbatim regardless
of architecture.

---

## Section 1 — What is this thing?

### What is Alleato OS?
Alleato OS is a construction operating system for design-build firms. Think
Procore reimagined with AI baked in — every meeting, RFI, submittal, contract,
and change order in one place, with an assistant that reads everything and
keeps track for you.

### What's different from Procore?
Procore is a system of record. Alleato OS is a system of intelligence. It
reads your meeting transcripts, surfaces patterns across projects, flags
risks before they become problems, and answers questions about your actual
work. Procore stores. Alleato understands.

### Who built this?
Alleato Group is building it. You're an early tester — what gets built next
depends on the gaps you flag.

### Is this production-ready?
Not yet. You're in an internal beta. Workflows you'd expect from a mature
platform might not be here. The ones that are will have rough edges. That's
the point of this phase — we're shipping fast based on what you tell us.

### Should I trust it with real client data?
For now, treat your test projects as test projects. Don't make project
decisions purely off what the AI tells you without verifying. The platform
is the source of truth for data; the AI is your fastest way to navigate it.
[VERIFY: Megan — data retention / backup / security guarantees.]

---

## Section 2 — Getting started

### Where do I start?
Create a test project. Walk through it like a real one — add a meeting,
create an RFI, run a submittal. Note what feels off. Tell us in the widget.
That round trip teaches you the platform faster than any tour.

### How do I create a project?
[CHECK: confirm exact button location and flow in current build.]

### How do I switch between projects?
[CHECK: confirm location of project switcher.]

### Where's the dashboard?
[CHECK: confirm sidebar item.]

---

## Section 3 — The Project Home page

### What's on the Project Home page?
Health score, financial summary, schedule status, recent meetings, open RFIs,
open submittals, and AI-surfaced risks and decisions for that project. It's
the one page you check in the morning.

### What's the health score?
A composite indicator pulling from schedule progress, budget variance, open
risk items, and overdue RFIs/submittals.
[VERIFY: Brandon — what should actually feed this?]

### What does "AI-detected risk" mean?
The assistant has read the meeting transcripts and project data and flagged
something that looks like trouble — recurring topics with no resolution,
decisions that weren't documented, deadlines slipping in conversation but
not in the schedule.

### Can I dismiss a flagged risk?
[CHECK: build status of dismiss action.]

---

## Section 4 — Meetings

### How do meetings get into Alleato?
Through the Fireflies integration. Any meeting your bot joins gets transcribed
and synced. Transcripts feed the assistant so it can answer questions about
what was said, decided, or promised.

### Do I need to do anything to sync a meeting?
If Fireflies is in the meeting, no. Otherwise nothing pulls in.

### Can I search across all my meetings?
Yes — ask the assistant. "What did we decide about [topic]?" or "When did
[name] say they'd send the [thing]?" Searches every transcript you have
access to.

### Where do I see all my meetings?
Meetings page in the sidebar. Tabs: Today/This Week, By Project, All Meetings.

### What if a meeting transcript is wrong?
[FILL: how does correction work?]

### Who can see my meeting transcripts?
[FILL: confirm permissioning model.]

---

## Section 5 — Submittals

### What's a submittal?
[VERIFY: Brandon. Default draft: A submittal is a document, sample, or
product spec submitted by a contractor to the architect/engineer for
approval before installation.]

### How do I create a submittal?
[CHECK: walk through actual UI flow.]

### Can the AI extract submittal data automatically?
That's the goal — the schema is built for it, and the Layer 1 pipeline
(Supabase Edge Function → Claude Document API → write-back to extracted_text)
is in progress. [CHECK: live or not?]

### What happens when I upload a submittal PDF?
[CHECK: current behavior.]

---

## Section 6 — RFIs

### What's an RFI?
Request for Information. A formal question from a contractor to the design
team when something on the drawings or specs is unclear or in conflict.
[VERIFY: Brandon.]

### How do I create an RFI?
[CHECK: walk through the actual UI flow.]

### How does the AI help with RFIs?
The assistant can find related RFIs across projects, flag ones raised before
with similar answers, and surface RFIs discussed in meetings but never
formally filed.

### Can I see all my open RFIs?
RFIs page in the sidebar. Filter by project, owner, status, age.

---

## Section 7 — Commitments, contracts, change orders

### What's the difference between a Prime Contract and a Commitment?
[VERIFY: Brandon. Default draft: A Prime Contract is your agreement with
the owner. A Commitment is your agreement with a subcontractor or vendor.]

### How do change orders work in Alleato?
[CHECK: walk through the actual workflow — approval chain, who signs off,
how cost impact is tracked.]

### Where do I see budget vs. actual?
Budget module on the project page. [CHECK: live or in progress?]

---

## Section 8 — Daily Log, Punch List, Schedule

### What's the Daily Log for?
Field reports. Weather, manpower, work performed, deliveries, incidents.
[VERIFY: Brandon — confirm full scope.]

### How do I close out a punch list item?
[CHECK: walk through the UI.]

### Can the AI generate a daily log from a meeting?
[FILL: roadmap question — is this a planned automation?]

---

## Section 9 — The AI assistant (Ask Alleato)

### What can the AI do?
Read your meetings. Search across projects. Surface patterns and risks.
Find decisions that weren't documented. Summarize meetings. Answer
questions about your work. Pull up specific RFIs, submittals, or contracts.

### What can't the AI do (yet)?
Take actions for you — it can't create new projects, send emails, file RFIs,
or modify data. It reads and answers. Acting on your behalf is on the
roadmap.

### How does it know about my meetings?
Through the Fireflies integration. Transcripts get indexed and embedded
into a vector store, so the assistant can pull relevant context for any
question.

### Is my data being used to train models?
No. Your conversations with the AI and your project data are not used to
train external models.
[VERIFY: Megan — confirm exact wording matches your data policy.]

### What model is the AI using?
[FILL: which models in production today.]

### Why did the AI give me a wrong answer?
Possible reasons: the question relied on data not yet indexed, the answer
isn't in the knowledge base, or the AI made a mistake. Click the feedback
tab and flag it — that's how we close the gap.

### Can I correct the AI?
Yes — push back. The assistant should adjust based on context within a
conversation. If a wrong answer is systematic, flag it as feedback so we
fix the underlying data or prompt.

---

## Section 10 — Feedback, roadmap, wishlist

### How do I submit feedback?
Click "Ask Alleato" in the bottom-right of any page → "Send feedback" tab.
Pick a tag (Bug, Idea, Confused), write what's on your mind, send.

### What happens to my feedback?
It lands on the Client Feedback page within seconds. The team triages
daily. Status moves through: new → triaged → shipping → shipped (or
won't-fix with a reason).

### How fast does feedback get addressed?
Bugs that block work: same day or next day. Ideas: triaged weekly into
the roadmap. You'll see status changes on the Client Feedback page.

### Where's the roadmap?
Sidebar → Roadmap. Shows what's shipping next, what's planned, what's
under consideration.

### How do I submit a wishlist item?
Same widget. Pick the "Idea" tag. Wishlist is a view of all
Idea-tagged feedback, sorted by upvotes.

### Can I upvote other people's wishlist items?
[CHECK: live or not?]

---

## Section 11 — Account, data, privacy

### Who can see my feedback?
[FILL: confirm — internal team only? Visible to other testers?]

### Who can see my project data?
[FILL: confirm permissioning model.]

### How do I invite a teammate?
[CHECK: walk through the invite flow.]

### Can I delete a project?
[CHECK: live or not? What's the recovery window?]

### Is my data backed up?
[FILL: backup policy.]

### What happens if I close my browser mid-task?
Most data auto-saves on change. Forms and drafts may need explicit save.
[CHECK: confirm which surfaces auto-save.]

---

## Section 12 — Construction industry primer

> [BRANDON: this whole section is yours. The AI should never give
> construction-domain answers without your sign-off.]

### What's the difference between an RFI and a submittal?
[VERIFY: Brandon. Draft: An RFI asks a question. A submittal proposes a
specific product, sample, or method for approval.]

### What's a schedule of values?
[VERIFY: Brandon.]

### What's a closeout package?
[VERIFY: Brandon.]

### What's the difference between a punch list and a deficiency list?
[VERIFY: Brandon.]

---

## Section 13 — Known limitations and rough edges

> Be honest with testers. Pretending something works when it doesn't is the
> fastest way to lose trust.

### What doesn't work yet?
[FILL: maintain a list of known gaps. Update weekly as features ship.]

Examples to populate:
- AI cannot yet take actions (only reads/answers)
- Submittal auto-extraction pipeline is in progress
- Mobile experience is unoptimized for some pages

### What's coming next?
[FILL: pull from actual roadmap. A 3-bullet "next 30 days" view is useful.]

### Why is this slower than I expect?
[FILL if relevant.]

---

## Section 14 — Edge cases the AI gets asked

### "Who built this?"
Alleato Group is building it. You're an early tester — what gets built next
depends on the gaps you flag.

### "Can I use this on mobile?"
[CHECK.]

### "Is there an iOS app?"
Not yet.

### "Can I export my data?"
[FILL.]

### "How do I report a security issue?"
[FILL.]

### "Can I integrate with [external tool]?"
[FILL: list current integrations — Fireflies confirmed; what else?]

---

## Operational note: how to grow this document

Every "I don't know" the AI says should be logged with the question that
triggered it. Review the log weekly:

- **Hot questions** (asked 3+ times, no answer) → write the answer, add here
- **One-offs with broad relevance** → add here
- **One-offs with narrow relevance** → leave for next time

Within a month of testing, this document should roughly double in size and
the "I don't know" rate should drop sharply. That trajectory is the real
measure of whether the AI is becoming trustworthy.

---

**Maintenance owner:** Megan + Brandon (construction-domain sections)
**Last updated:** 2026-04-27
