# AI Operating Model for Alleato

## Purpose

Alleato should not frame AI as a replacement for project managers, estimators, VPs, or field judgment. The better model is:

> AI prepares the work packet. Humans make the business decision. The system records the evidence.

The goal is to turn construction operations into a connected evidence system where drawings, specifications, submittals, RFIs, change events, estimates, budgets, commitments, emails, meeting transcripts, and team messages all inform each other.

## Core Principle

Every AI-generated recommendation or action must answer:

- What is required?
- Who is responsible?
- What source evidence supports this?
- Is it priced?
- Is it scheduled?
- Is it approved?
- Has it changed?
- Does it create risk?

The product rule should be:

> No source, no action.

AI may summarize, suggest, draft, and flag issues, but official actions should require evidence links and the correct level of human approval.

## Four Levels of AI Authority

### 1. Observe

AI reads project data and flags issues. No approval required because it does not modify anything.

Examples:

- Eight budget codes have zero dollars assigned.
- A submittal required by the specifications is missing from the register.
- A meeting transcript mentions a scope change that has no change event.
- A commitment exceeds the budget for its cost code.

### 2. Recommend

AI suggests next steps and explains why. Human decides whether to proceed.

Examples:

- Recommend creating a change event based on owner direction in a meeting.
- Recommend issuing an RFI because drawing A-601 conflicts with spec section 08 71 00.
- Recommend adding missing submittals from a specification section.

### 3. Draft

AI creates the first version of a record, document, message, or work packet. It remains a draft.

Examples:

- Draft RFI.
- Draft change event.
- Draft owner notice.
- Draft submittal register.
- Draft estimate assumptions.
- Draft permit paperwork.

### 4. Act With Approval

AI performs an official action only after a named human approves it.

Examples:

- Create a change event.
- Update a budget line.
- Send an external email.
- Create a task.
- Submit an RFI.
- Archive unused budget codes.

Sensitive actions should use guided verification, not a single-click approval.

## Guided Verification Model

For high-impact workflows, approval should require explicit confirmations.

Example: AI-created change event verification

- Confirm scope changed.
- Confirm source evidence is correct.
- Confirm responsible party.
- Confirm contract basis.
- Confirm cost impact.
- Confirm schedule impact.
- Confirm backup attached.
- Confirm owner notice is required or not required.

This directly addresses the concern that users may become click-happy. AI can make the work easier while the system makes the control stricter.

## The Strategic Product Concept

The long-term product is a Project Requirements Graph.

This graph connects:

- Specifications
- Drawings
- Submittals
- RFIs
- Change events
- Estimates
- Budgets
- Commitments
- Procurement schedule
- Permits
- Emails
- Meeting transcripts
- Team messages
- Invoices
- Cash flow

Example relationship:

```text
Spec Section 08 71 00 Door Hardware
-> requires product data, samples, warranty
-> maps to door schedule on A-601
-> maps to estimate line and budget code
-> maps to hardware vendor commitment
-> creates submittal due before procurement
-> late submittal creates schedule risk
-> rejected submittal may create RFI or change risk
```

This is different from a generic AI feature. It makes the project itself aware of requirements, evidence, risk, and revenue opportunities.

## Jesse Mode

Jesse should oversee and train the AI rather than being replaced by it.

The system should support a "Jesse Mode" for drawing and document review:

- AI flags likely issues in drawings/specs.
- Jesse accepts, rejects, edits, or adds findings.
- Jesse records quick voice notes explaining his thought process.
- The system stores the decision, source evidence, and reasoning.
- Future reviews use these patterns to improve Alleato-specific recommendations.

This captures the judgment of experienced people and turns it into company intelligence.

## AI as Risk and Revenue Watcher

The AI should continuously monitor each project for:

- Missed change-order opportunities.
- Unpriced scope.
- Drawing/spec conflicts.
- Late submittals.
- Missing procurement items.
- Budget codes with no pricing.
- Commitments that exceed budget.
- Owner decisions that affect cost or schedule.
- Approved changes not reflected in forecast or billing.
- Meeting or email commitments that were never turned into tasks.

The AI chat should become the interface to this operating intelligence.

Example questions:

- What could hurt margin on this job this month?
- What changed since last week?
- What should I chase today?
- Which open items may create cost or schedule impact?

## Adoption Strategy

Start with a small feature-flagged pilot:

- Megan
- Brandon
- Jesse
- One trusted PM

Roll out in this order:

1. Read-only alerts.
2. Recommendations.
3. Draft-only workflows.
4. Human-approved record creation.
5. Human-approved external communication.
6. Limited automation for low-risk housekeeping.

The internal message should be:

> AI does not make the business decision. AI assembles the evidence and prepares the draft so the human can decide faster and more accurately.
