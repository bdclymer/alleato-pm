# Client Project Gold-Standard Chat Examples

Date: 2026-04-30
Status: Primary benchmark examples for PRP and eval design
Scope: Example conversations showing how Alleato AI should respond for active client construction projects after packet-first project intelligence is implemented.

Related documents:

- [Client Project Intelligence PRP Scope](CLIENT-PROJECT-INTELLIGENCE-PRP-SCOPE-2026-04-30.md)
- [Current AI Assistant Diagnosis And Validation Gate](CURRENT-AI-ASSISTANT-DIAGNOSIS-AND-VALIDATION-GATE-2026-04-30.md)
- [RAG Strategy Working Decisions](RAG-STRATEGY-WORKING-DECISIONS-2026-04-30.md)
- [RAG Compiler And Assistant Behavior V1](RAG-COMPILER-AND-ASSISTANT-BEHAVIOR-V1-2026-04-30.md)
- [RAG Storage Model V1](RAG-STORAGE-MODEL-V1-2026-04-30.md)
- [Internal Initiative Gold-Standard Chat Examples](RAG-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md)

## Purpose

These are the primary response benchmarks for the PRP.

The assistant should feel like a project executive briefing partner: it should know the project packet, connect communications to financial and operational risk, surface issues early, and recommend the next move.

The internal initiative examples remain useful, but these client project examples should drive V1 acceptance.

## Gold-Standard Traits For Client Project Answers

Strong client project answers should include:

1. Current project read.
2. What changed recently.
3. Financial or change-management exposure.
4. Schedule/operational risk.
5. Decisions, blockers, and missed follow-ups.
6. Recommended next action.
7. Evidence basis and confidence.
8. Clear caveat when source coverage is incomplete.

## Example 1: Latest Project Briefing

### User

What's the latest on Westfield Collective?

### Gold-standard assistant response

The current read is that Westfield Collective needs a focused project review, not just a status summary.

The project packet shows three things I would pay attention to first:

1. There are recent communication signals tied to project-data/testing activity, but some are candidate links rather than confirmed project updates.
2. Any change-management or cost exposure needs to be checked against the formal project records before it is treated as approved scope.
3. The project is being referenced in broader operational/AI workflow discussions, so we need to keep those references separate from actual project-specific risks.

My recommendation: review the latest project-specific meeting/email/Teams records, confirm which items belong to Westfield Collective, then update the project packet with only confirmed project status, risks, decisions, and follow-ups.

Confidence: medium until the packet has full source coverage and confirmed project attribution. I would not use unrelated internal initiative references alone to update the Westfield Collective project record.

### Why this is good

- Does not force weak evidence into the project.
- Separates project-specific status from related internal initiative references.
- Recommends a concrete review path.

## Example 2: Financial Exposure

### User

What should I be worried about financially on this project?

### Gold-standard assistant response

I would look at financial risk in three buckets.

First, **unpriced or informal scope**. If field or meeting communication is describing work before it is tied to a change event, PCO, subcontractor quote, or owner approval, that is the highest-risk category because cost exposure can build before the formal record catches up.

Second, **schedule-impact costs**. Any mention of delay, resequencing, missing information, or waiting on another party should be checked against change-management records. The important question is whether schedule impact is being captured while the issue is live or reconstructed later.

Third, **commitment exposure**. If subcontractor direction is happening in email/Teams before a commitment change order exists, the project may be absorbing cost or creating a dispute trail.

My recommended next move is to generate a financial exposure review from the project packet:

- open change events
- pending PCOs
- unpriced RFQs
- recent messages mentioning cost, quote, delay, or scope
- subcontractor follow-ups without formal records

Confidence depends on whether budget/change-management tables are included in the packet. If the packet is only based on communications, this should be treated as an early-warning read, not the final financial position.

### Why this is good

- Gives a finance-specific operating framework.
- Connects communication intelligence to formal cost controls.
- Avoids pretending communication-only evidence equals accounting truth.

## Example 3: Surface Issues Before They Become Problems

### User

What issues are starting to show up before they become real problems?

### Gold-standard assistant response

I would look for early warning signs in four areas.

The first is **scope moving faster than documentation**. If people are discussing work, quotes, schedule impacts, or responsibility before there is a matching change event or PCO, that is where future disputes usually start.

The second is **unanswered ownership**. Any message that says someone is waiting, needs information, or will follow up should become either a task or a reviewed open question in the packet.

The third is **project attribution uncertainty**. If a communication looks project-related but is not confidently tied to the right project, it should go to review instead of being ignored. Missing attribution is how useful signals disappear.

The fourth is **meeting decisions not becoming project records**. If an operations or executive meeting includes a decision, but that decision does not show up in the project system, the assistant should surface that gap.

My recommendation: treat these as packet-level watch items, not alarms. The project team should review them while they are still cheap to resolve.

### Why this is good

- Defines early warning patterns.
- Explains root cause categories.
- Gives a practical action without exaggerating risk.

## Example 4: Change Management Read

### User

Are there any change order issues I need to know about?

### Gold-standard assistant response

The first thing I would check is whether communications mention scope, quote, delay, schedule impact, or owner direction that is not yet connected to a formal change event or PCO.

A healthy project should have a clean chain:

`field signal -> change event -> RFQ/quote -> PCO -> owner decision -> contract/commitment change order`

The risk pattern we are trying to catch is the reverse:

`field issue -> crisis/work proceeds -> later reconstruction into a change order`

For this project, I would want the packet to show:

- open change events
- unpriced RFQs
- PCOs awaiting owner response
- subcontractor quotes requested but not received
- meeting or Teams messages mentioning schedule impact
- any work proceeding before approval

If the packet has those records, I can rank the exposure. If it only has communication evidence, I can flag likely change-management risks but should not call them official change-order issues yet.

### Why this is good

- Encodes the desired construction workflow.
- Distinguishes formal records from communication signals.
- Surfaces the retroactive-change-order risk the user described.

## Example 5: Meeting Decision Extraction

### User

What decisions were made about this project in meetings this week?

### Gold-standard assistant response

I would answer this from the packet's decision cards first, then verify against meeting transcripts if needed.

For each decision, I would want to show:

- decision made
- who made or accepted it
- meeting/source
- date
- project impact
- whether it created a task, cost issue, schedule issue, or project-record update
- confidence

If a meeting discussed multiple projects, I would not automatically assign every decision to this project. I would only attach decisions where the project name, project number, participants, agenda section, or surrounding context supports the match.

If the packet is missing meeting coverage, I would say that clearly and run a meeting-source lookup rather than pretending the decision log is complete.

### Why this is good

- Uses packet-first but verifies source if needed.
- Handles executive/operations meetings correctly.
- Prevents multi-project meeting contamination.

## Example 6: Missed Follow-Ups

### User

What follow-ups are likely being missed?

### Gold-standard assistant response

I would look for follow-ups that appear in communication but do not have a matching project-system task, RFI, submittal, change item, or owner/subcontractor response.

The most important missed-follow-up patterns are:

1. Someone said they would send, price, confirm, review, or call back, but there is no later closure.
2. A quote or document was requested, but no received item is attached.
3. A meeting decision implies an action, but no task exists.
4. A project issue was assigned verbally or in Teams but not captured in the formal workflow.
5. A candidate project communication has not been reviewed, so it is not visible in the project packet.

My recommendation is to turn these into reviewable task cards with confidence, not automatically assign them as facts. That way PMs can approve, dismiss, or reassign them quickly.

### Why this is good

- Converts messy communication into actionable workflow.
- Avoids over-automation.
- Matches the human-review model.

## Example 7: Root Cause Analysis

### User

Why does it feel like we're always finding project issues after they already became a problem?

### Gold-standard assistant response

The root cause is probably not that people do not know what is happening. The problem is that the signals live in too many places and do not become structured project records early enough.

The pattern looks like this:

1. The first warning shows up in a Teams message, email, field note, or meeting.
2. It is discussed informally because everyone is trying to keep work moving.
3. The formal workflow catches up later as a change event, PCO, RFI, task, or schedule update.
4. By then, cost, schedule, or relationship impact may already exist.

The project intelligence layer should close that gap. It should watch the messy communication layer, create candidate insight cards, link them to the right project, and ask for review before the issue turns into a crisis.

My recommendation is to measure success by lead time: how often the assistant surfaces a risk before it appears in the formal workflow.

### Why this is good

- Diagnoses the system problem.
- Connects directly to construction operations.
- Defines a success metric.

## Example 8: Packet Missing

### User

What's the latest on a project that does not have a packet yet?

### Gold-standard assistant response

I do not have a compiled project intelligence packet for this project yet, so I should not act like I am fully briefed.

I can still run a raw source read across project records, meetings, Teams, email, and documents, but I would label that as preliminary. The better path is to create the first packet with:

- current status
- financial exposure
- change-management signals
- risks/blockers
- decisions
- open tasks
- source coverage
- confidence and review items

Until that packet exists, any answer should be treated as a source search, not a prepared project briefing.

### Why this is good

- Fails honestly.
- Preserves trust.
- Explains how to get to a better answer.

## Example 9: Bad Client Project Response

### User

What's the latest on this project?

### Bad assistant response

I found several documents, meetings, and messages related to this project. There are some mentions of change orders, tasks, and schedule. You may want to review the project documents for more information.

### Why this is bad

- No project read.
- No financial/risk lens.
- No next action.
- No confidence.
- No distinction between formal facts and communication signals.
- Pushes the work back to the user.

## Benchmark Acceptance Prompts

Use these prompts for V1 evals:

1. "What's the latest on this project?"
2. "What should I be worried about financially on this project?"
3. "What issues are starting to show up before they become real problems?"
4. "Are there any change order issues I need to know about?"
5. "What decisions were made about this project in meetings this week?"
6. "What follow-ups are likely being missed?"
7. "Why does it feel like we're always finding project issues after they already became a problem?"
8. "What's the latest on a project that does not have a packet yet?"

The assistant passes only if it:

- uses the project packet first when available
- connects communications to formal project risk
- separates known facts from likely inferences
- identifies financial/change/schedule implications
- recommends the next action
- handles missing/stale/thin packet states honestly
- avoids raw retrieval dumps

## PRP Usage

The official PRP should treat this as the primary response-quality benchmark.

The internal initiative benchmark remains useful as a secondary compatibility test, but V1 success should be judged against client project intelligence behavior.
