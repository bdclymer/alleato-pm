# Client Project Intelligence PRP Scope

Date: 2026-04-30
Status: Primary PRP framing correction
Scope: Re-center the packet-first RAG strategy around client construction project management, financial insight, risk analysis, and early issue surfacing.

Related documents:

- [Current AI Assistant Diagnosis And Validation Gate](CURRENT-AI-ASSISTANT-DIAGNOSIS-AND-VALIDATION-GATE-2026-04-30.md)
- [RAG Strategy Working Decisions](RAG-STRATEGY-WORKING-DECISIONS-2026-04-30.md)
- [RAG Storage Model V1](RAG-STORAGE-MODEL-V1-2026-04-30.md)
- [RAG Compiler And Assistant Behavior V1](RAG-COMPILER-AND-ASSISTANT-BEHAVIOR-V1-2026-04-30.md)
- [Client Project Gold-Standard Chat Examples](CLIENT-PROJECT-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md)
- [JobPlanner Replacement Intelligence Packet V1](JOBPLANNER-REPLACEMENT-INTELLIGENCE-PACKET-V1-2026-04-30.md)

## Correction

The primary PRP should not be framed around internal initiatives.

Internal initiatives are important, and the JobPlanner Replacement example remains useful, but the main product value is for active client construction projects:

- project status
- financial exposure
- change management risk
- schedule impact
- project attribution
- meeting and communication intelligence
- issue surfacing before problems become crises
- recommended next actions for PMs and leadership

Internal initiatives should be treated as an extension of the same intelligence model, not the lead example for V1.

## Recommended PRP Name

Use this PRP title:

**Alleato AI Intelligence System: Tool Validation And Packet-First Client Project Intelligence**

## Recommended PRP Goal

First, diagnose and validate the current AI assistant tool-calling path so the team knows whether the issue is AI Gateway, AI SDK usage, OpenAI/provider configuration, or fragile local route code.

Then build the first packet-first client project intelligence layer by creating compiled intelligence storage, seeding a gold-standard client project packet, and updating the assistant to answer client-project questions from intelligence packets before falling back to raw RAG.

This PRP should preserve the existing valuable tool ecosystem. Packet-first project intelligence is the briefing layer for project-advisor questions, not a replacement for memory, Acumatica financial analysis, structured project tools, app help, company knowledge, or raw source lookup.

The PRP should prove that Alleato AI can answer:

- What is the latest on this project?
- What changed recently?
- What risks are emerging?
- What is the financial exposure?
- What change events or pending costs need attention?
- What project decisions were made in meetings or messages?
- What follow-up tasks are likely being missed?
- What source evidence supports the read?

## What This PRP Is Not

This PRP is not:

- an internal initiatives PRP
- a JobPlanner replacement PRP
- a full automated compiler implementation
- a generic RAG improvement
- a broad assistant prompt rewrite
- a complete portfolio intelligence system
- a rewrite that throws away the existing AI tools

JobPlanner/internal initiatives can be included as a compatible secondary target model, but the acceptance criteria should focus first on client project intelligence.

## Required First Workstream: Current Assistant Validation

Before implementing packet-first routing, the PRP should validate the current AI assistant infrastructure.

The current failure is that the AI chat responds but is not useful. The suspected root causes include:

- assistant modes are blurred
- model tools are globally disabled in the main route
- AI SDK may be incorrectly used with OpenAI/Gateway
- deterministic server-side retrieval is acting as a brittle workaround
- retrieval happens before intent is clearly understood
- the assistant lacks a clean advisor loop

Required validation:

1. Build a minimal isolated tool-calling test.
2. Test AI SDK + AI Gateway + OpenAI model.
3. Test AI SDK + direct OpenAI provider.
4. Test raw OpenAI API only if needed.
5. Record tool calls, final text, finish reason, warnings, and errors.
6. Decide whether to keep Gateway for tool-heavy calls, bypass Gateway, or fix local AI SDK usage.

This validation gate should happen before assuming the packet-first implementation can safely rely on model-directed tools.

## Primary Gold-Standard Target

Use one active client project as the primary example.

Recommended target:

**Westfield Collective**

Reason:

- It has more useful project data than Union Collective.
- It is better suited for testing real client-project intelligence.
- It should provide a stronger benchmark for financial exposure, change-management risk, meetings, communications, and early issue surfacing.

Union Collective can still be used as a secondary attribution example because it appears in internal JobPlanner/AI planning context, but it should not be the primary proof target.

Selection criteria:

- active project
- recent Teams/email/meeting records
- financial/change-management activity
- at least one risk/blocker/task/decision signal
- existing `projects.id`
- enough source evidence to create a credible packet

## Primary Packet Type

The first packet should be a **Client Project Intelligence Packet**, not an internal initiative packet.

It should contain:

- executive summary
- current project status
- recent changes
- financial exposure
- change management signals
- schedule or operational risks
- open blockers
- pending decisions
- likely missed follow-ups
- project team/owner signals
- source coverage
- confidence and review queue
- recommended next moves

## Client Project Packet Sections

### 1. Project status

What the assistant should know:

- current operating read
- project phase/status
- whether recent communications indicate progress, delay, confusion, or risk
- whether the packet is fresh, stale, or partial

### 2. Financial exposure

What the assistant should know:

- open or likely change events
- pending PCOs/change orders
- cost exposure signals from emails/meetings
- unpriced scope
- subcontractor quote gaps
- owner approval risk
- budget/commitment/prime-contract context when available

### 3. Change management

What the assistant should know:

- change events discussed in messy communication
- quotes requested or missing
- schedule impact mentioned or implied
- retrospective change-order creation risk
- owner/subcontractor responsibility uncertainty

### 4. Schedule and operational risk

What the assistant should know:

- delays mentioned in meetings or messages
- sequencing issues
- field blockers
- missing information
- daily report or meeting signals that contradict the official schedule

### 5. Decisions and commitments

What the assistant should know:

- decisions made in meetings
- approvals or direction from owner/GC/internal leadership
- commitments someone made in Teams/email
- decisions that need to be converted into project records

### 6. Tasks and follow-ups

What the assistant should know:

- who needs to do what
- due dates or implied urgency
- unanswered requests
- promised quotes, submittals, RFIs, or documents
- follow-ups that are likely to fall through the cracks

### 7. Attribution and confidence

What the assistant should know:

- source records confidently assigned to the project
- candidate records that may relate to the project
- conflicting or uncertain attribution
- source evidence used for the assignment

## How Internal Initiatives Fit

The same storage model should still support internal initiatives.

The difference is priority and PRP framing:

- V1 primary: client project intelligence
- V1 compatible extension: internal initiative targets
- Phase 2 or parallel seed: JobPlanner Replacement and AI Implementation packets

This means the generalized `intelligence_targets` model still makes sense.

Recommended interpretation:

- `client_project` is the primary target type.
- `internal_initiative` is supported by the same tables.
- JobPlanner Replacement remains a secondary/gold-standard extension example.

## Revised First Implementation Slice

The first PRP should implement:

1. Validate the AI SDK/Gateway/direct OpenAI tool-calling path.
2. Document the decision for model/provider/tool routing.
3. Preserve existing useful tools and identify how they fit into assistant modes.
4. Add storage tables for intelligence targets, insight cards, evidence, packets, and reviews.
5. Seed Westfield Collective as the primary client project intelligence target.
6. Seed one gold-standard Westfield Collective project packet.
7. Seed supporting insight cards for project status, financial exposure, risk, decisions, and tasks.
8. Update assistant behavior so project questions load the client project packet first.
9. Keep structured financial, Acumatica, memory, company knowledge, app-help, and raw-source tools available for the correct assistant modes.
10. Add missing/stale/thin packet behavior.
11. Add evals based on client project benchmark prompts.
12. Keep internal initiatives compatible, but not the primary acceptance path.

Optional if time allows:

- Seed JobPlanner Replacement as a secondary internal initiative packet using the existing packet draft.

## Revised PRP Acceptance Criteria

The implementation is successful when the assistant can answer a client project question like:

> What is the latest on Westfield Collective?

with:

- direct current status
- what changed recently
- financial/change-management risk
- project-specific blockers
- likely missed follow-ups
- recommended next action
- evidence basis and confidence
- clear caveat if source coverage is stale or incomplete

The assistant should not answer by dumping retrieved documents or generic summaries.

## PRP Handoff Statement

Use this as the official PRP framing:

> Diagnose and stabilize the current Alleato AI assistant tool-calling path, then implement packet-first client project intelligence as the project-advisor layer inside the broader Alleato intelligence system. The assistant should preserve existing tools for memory, Acumatica/financial analysis, structured project data, company knowledge, raw source lookup, and app help, while answering strategic project-management questions from compiled project intelligence packets before falling back to raw RAG. Westfield Collective is the primary V1 proof target; internal initiatives use the same architecture but are secondary to the initial client project proof.
