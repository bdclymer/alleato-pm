# Codex Handoff Summary: AI Construction Workflows for Alleato

## Context

This conversation explored how Alleato could use AI inside commercial construction workflows, especially now that the AI chat UI is being updated from a v0 design and the AI SDK supports stronger agent/tool-loop patterns.

The user wants to move beyond a generic chatbot and build AI deeply into business workflows while keeping human control, visibility, feature flags, and approval gates.

## Key Framing

The primary operating model is:

> AI prepares the work packet. Humans make the business decision. The system records the evidence.

The AI should not be positioned as replacing PMs, estimators, Jesse, Brandon, or field judgment. It should reduce clerical work, detect risk earlier, draft records/messages, and enforce a stronger review process than the current manual workflow.

## AI SDK / Agent Tool Loop Explanation

The user asked what "agents with tool loop" means.

Explanation given:

- Old chat is basically `User -> Model -> Answer`.
- Basic tool calling may be `User -> Model -> Tool -> Model -> Answer`.
- Agent with tool loop means the model can decide to call a tool, inspect the result, decide to call another tool, and continue until it has enough information or hits a stop/approval condition.

Construction example:

```text
User asks about project risk
-> Agent searches emails
-> Agent searches meeting transcripts
-> Agent checks RFIs
-> Agent checks change events
-> Agent checks budget/commitments
-> Agent produces evidence-linked answer
```

Human-in-the-loop approval was identified as essential for sensitive actions. The AI can observe, recommend, and draft freely, but actions like sending emails, updating budgets, creating official records, or submitting RFIs/change events should require approval.

## Strategic Product Concept

The highest-level product idea is a Project Requirements Graph.

It should connect:

- Drawings
- Specifications
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

The insight is that these should not be treated as isolated tools. They are different views of the same project truth.

Example:

```text
Spec Section 08 71 00 Door Hardware
-> requires product data, samples, warranty
-> maps to door schedule on A-601
-> maps to estimate line and budget code
-> maps to hardware vendor commitment
-> creates submittal due before procurement
-> late submittal creates schedule risk
-> rejected submittal may create RFI/change risk
```

## Gold Standard Construction Workflow Explained

The user wanted to understand the relationship between specifications, drawings, submittals, RFIs, and changes.

Summary:

```text
Owner / Architect / Engineer issue drawings + specs
-> GC reviews documents for scope, conflicts, risk, estimate, schedule
-> GC creates submittal register from specs
-> GC assigns submittals to subcontractors/vendors
-> Subs/vendors submit product data, shop drawings, samples
-> GC reviews for completeness and coordination
-> Architect/engineer reviews for design compliance
-> Approved submittals guide procurement and installation
-> Conflicts become RFIs
-> Cost/schedule impacts become change events/change orders
```

Important nuance:

- The GC does not usually approve submittals in the final design sense.
- The GC reviews for completeness, coordination, scope, and compliance before forwarding to architect/engineer.
- Architect/engineer typically performs formal design review/approval/rejection.

## Recommended Navigation / Product Grouping

The current module names can stay familiar, but the UI should visually group related workflows.

Possible umbrella:

- Project Documents
- Project Requirements

Potential grouped tools:

- Drawings
- Specifications
- Submittals
- RFIs
- Permits
- Procurement
- Compliance

The key is to show the relationship between items, not make them feel like disconnected modules.

## Jesse Mode

The user proposed Jesse overseeing/training the AI. This was identified as a strong adoption strategy.

Suggested design:

- AI performs first-pass drawing/spec review.
- Jesse reviews AI findings.
- Jesse accepts, rejects, edits, or adds findings.
- Jesse records short voice notes explaining his reasoning.
- The system stores the source evidence, decision, correction, and reasoning.
- Over time, AI learns Alleato-specific drawing review patterns.

Positioning:

> AI gives Jesse a review team. It does not replace Jesse.

## Top Roadmap Priorities

1. Change Event and Change Order AI
2. Estimating Intelligence
3. Drawing Review Assistant
4. Budget Setup and Budget Hygiene
5. ASRS / Code / FM Global / Compliance Analysis
6. Specifications / Submittals / RFIs
7. Procurement Schedule
8. Permit Paperwork Automation
9. Cash Flow Intelligence
10. Client and Subcontractor Communication

## Change Event / Change Order AI

Highest direct profit lever.

AI should:

- Monitor emails, Teams, meeting transcripts, RFIs, submittals, drawings, specs, and field notes.
- Detect change signals.
- Draft change events.
- Link source evidence.
- Suggest cost/schedule impact.
- Require guided human verification before official creation/submission.

Guided verification should include:

- Confirm scope changed.
- Confirm source evidence.
- Confirm responsible party.
- Confirm contract basis.
- Confirm cost impact.
- Confirm schedule impact.
- Confirm backup attached.
- Confirm owner notice requirement.

## Estimating Intelligence

Added by user as a major roadmap item.

AI should help with:

- Historical pricing.
- Price lists.
- Materials.
- Bid boards.
- Specs.
- Drawings.
- Vendor quote comparisons.
- Missing scope detection.
- High/low line-item review.

AI should support estimator judgment, not final-submit bids automatically.

## Drawing Review Assistant

Added by user as a major roadmap item.

Key points:

- Brandon said AI cannot read CAD files.
- Response: native CAD support may still be a blocker in some cases, but useful drawing review can start from PDF drawing sets, OCR, vector PDFs, CAD/Revit exports, sheet metadata, and revision comparisons.
- The product should handle vectorization/OCR automatically. Users should not need to know what a vector PDF is.

AI should flag:

- Drawing/spec conflicts.
- Missing details.
- Inconsistent schedules.
- Mismatched dimensions.
- Revision changes.
- Possible RFI candidates.
- Possible cost/schedule impacts.

## ASRS / Code / FM Global Analysis

Added as a no-brainer compliance workflow.

AI should:

- Read FM Global PDFs and project-specific compliance documents.
- Analyze ASRS-related requirements.
- Produce requirement checklists.
- Cite sources.
- Mark items as pass/fail/needs review.
- Draft RFIs when information is missing or unclear.

Never allow unsupported "compliant" conclusions without citations.

## Budget Workflow

The user described current budget setup as antiquated and high-friction.

Key insight:

The risk is not that faster workflows make PMs careless. The risk is that painful workflows already cause people to avoid fixing inaccurate data.

AI should:

- Create budget drafts from estimates.
- Suggest budget templates.
- Detect blank/zero-dollar budget codes.
- Detect duplicate or misclassified budget lines.
- Allow bulk edit with validations.
- Require approval for budget lock or high-risk changes.

## Cash Flow

The user specifically wants:

> Expected next 30/60/90 day cash movement.

AI should forecast:

- Expected owner billings.
- Expected subcontractor/vendor payments.
- Retainage movement.
- Approved/unapproved change exposure.
- Billing readiness blockers.
- Cash risk by project.

## Procurement Schedule

The user added this to the roadmap.

AI should connect:

- Submittals
- Lead times
- Commitments
- Vendor delivery dates
- Install dates
- Project schedule

AI should flag late/missing procurement items and draft follow-ups.

## Permit Paperwork Automation

The user added this to the roadmap.

AI should:

- Prefill permit forms from project data.
- Generate jurisdiction-specific checklists.
- Flag missing information.
- Track status and follow-up dates.
- Draft permit correspondence.

Human review required before submission.

## Static Cartoon Workflow Image

The user wanted a simple visual to understand and explain the document workflow.

An image was generated with:

- Owner, Architect, Engineer issuing Drawings and Specifications.
- GC / Alleato reviewing documents for scope, conflicts, risk, estimate, schedule.
- Specifications flowing into Submittal Register.
- Submittals flowing to Subcontractors and Vendors.
- Product Data, Shop Drawings, and Samples returning.
- GC completeness/coordination review.
- Architect/Engineer design review and approval.
- Procurement and Installation.
- Branches for RFI and Change Event.
- AI assistant watching the workflow and linking evidence/drafting actions.

## Implementation Guidance for Future Codex Work

When implementing in Alleato:

- Use AI SDK agent/tool-loop patterns for reusable agents.
- Use tool approval for sensitive actions.
- Start with feature flags.
- Start read-only/draft-only.
- Show evidence links and confidence.
- Require guided approvals for official actions.
- Keep familiar construction terms in nav, but group related workflows visually.
- Build source-first data architecture: every AI-generated work item should link back to drawings/specs/emails/meetings/etc.
- Avoid claiming AI is always correct. The safer promise is evidence-linked, reviewable, and reversible output.

## Suggested First Pilot

Start with three pilot agents:

1. Change Detection Agent
   - Watches emails, meetings, RFIs, submittals, drawings/specs for change signals.
   - Drafts change events.
   - Requires guided approval.

2. Budget Hygiene Agent
   - Detects zero-dollar codes, missing budget mapping, mismatched commitments, and unclear cost codes.
   - Recommends cleanup.
   - Requires approval for changes.

3. Spec/Submittal/RFI Agent
   - Extracts submittal requirements.
   - Drafts submittal register.
   - Detects drawing/spec conflicts.
   - Drafts RFIs.

Then add:

- Drawing Review / Jesse Mode
- Estimating Intelligence
- ASRS / Code Analysis
- Procurement Schedule
- Permit Paperwork
- Cash Flow Intelligence
