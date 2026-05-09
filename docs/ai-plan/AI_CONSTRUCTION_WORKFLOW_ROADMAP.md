# Alleato AI Construction Workflow Roadmap

## Roadmap Thesis

Alleato should prioritize AI where it protects revenue, reduces rework, improves data quality, and removes high-friction administrative work. The first pilots should avoid broad automation and instead focus on evidence-linked drafts, alerts, and guided approvals.

## Priority 1: Change Event and Change Order AI

### Why It Matters

Change management is one of the clearest profit levers. Missed, late, poorly documented, or underpriced change events directly affect margin.

### AI Capabilities

- Monitor emails, Teams messages, meeting transcripts, RFIs, submittals, drawings, specs, and field notes for change signals.
- Detect owner direction, design changes, scope gaps, conflicts, and cost/schedule impacts.
- Draft change events with title, narrative, source evidence, likely responsible party, cost/schedule impact, and linked records.
- Flag unpriced or aging change events.
- Detect approved changes not reflected in forecast, billing, or budget.

### Guardrails

- Draft-only at first.
- Require guided verification before creating official records.
- Require source evidence for every AI-created change event.
- Require approval before owner-facing communication.

### Expected Impact

- Higher change capture.
- Faster documentation.
- Better owner backup.
- Less margin leakage.

## Priority 2: Estimating Intelligence

### Why It Matters

Estimating combines drawings, specs, historical pricing, price lists, materials, vendor quotes, bid boards, risk assumptions, and market conditions. AI can improve speed and accuracy without replacing estimator judgment.

### AI Capabilities

- Extract scope from drawings and specifications.
- Compare estimate lines to historical project costs.
- Match materials to current price lists.
- Highlight missing scope.
- Flag high/low line items versus similar projects.
- Assist with bid leveling.
- Generate estimate assumptions and exclusions.
- Learn from win/loss outcomes and final job cost.

### Guardrails

- AI produces estimate recommendations, not final bids.
- Require estimator approval for bid values.
- Show confidence and source evidence for extracted quantities/scope.

### Expected Impact

- Fewer missed scope items.
- Faster estimates.
- Better bid consistency.
- Improved margin discipline.

## Priority 3: Drawing Review Assistant

### Why It Matters

Experienced reviewers like Jesse catch issues because they recognize patterns across drawings, specs, trades, and prior projects. AI can create a first-pass review queue and learn from Jesse's corrections.

### AI Capabilities

- Process PDF drawing sets and CAD/Revit exports where available.
- Use OCR/vector extraction depending on document quality.
- Compare drawings against specs.
- Identify likely missing details, inconsistent schedules, conflicting dimensions, and coordination issues.
- Compare revisions and detect cost/schedule implications.
- Link findings to sheets, callouts, details, and spec sections.
- Draft RFIs for unclear or conflicting information.

### Guardrails

- Use AI as a first-pass reviewer.
- Route low-confidence or high-impact findings to Jesse.
- Require citations to sheet/spec locations.
- Track accept/reject/correction feedback to train Alleato-specific review patterns.

### Expected Impact

- Earlier conflict detection.
- Fewer field surprises.
- Better RFI quality.
- Improved estimating and change-event detection.

## Priority 4: Budget Setup and Budget Hygiene

### Why It Matters

Bad budget data affects forecasting, change events, commitments, cost-to-complete, billing, and executive reporting.

### AI Capabilities

- Create draft budgets from estimates.
- Suggest budget codes based on project type and historical jobs.
- Provide budget templates.
- Detect zero-dollar budget codes.
- Detect duplicate, blank, or misclassified budget lines.
- Detect commitments with no matching budget or budget with no commitment.
- Explain budget/forecast changes.

### Guardrails

- Human approval before budget lock.
- Guided review for structural budget changes.
- Keep bulk edit fast but require validation for risky changes.

### Expected Impact

- Cleaner financial data.
- Faster setup.
- Better forecasting.
- Less avoidance of budget maintenance.

## Priority 5: ASRS, Code, FM Global, and Compliance Analysis

### Why It Matters

Specialized code and compliance requirements create expensive late-stage risk if missed.

### AI Capabilities

- Read project specs, drawings, FM Global PDFs, ASRS requirements, fire protection criteria, storage classification, rack layout data, occupancy, ceiling heights, and related standards.
- Produce compliance checklists.
- Identify missing project information.
- Flag pass/fail/needs-review items.
- Draft code clarification RFIs.

### Guardrails

- Never output unsupported "compliant" claims.
- Require citations for every requirement.
- Mark uncertain items as needs review.
- Require expert/human approval for final compliance decisions.

### Expected Impact

- Fewer late compliance surprises.
- Better documentation.
- Faster expert review.

## Priority 6: Specifications, Submittals, and RFIs

### Why It Matters

Specs define requirements. Submittals prove selected products/materials before installation. RFIs clarify conflicts, missing information, or unbuildable conditions.

### Gold Standard Flow

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
-> Cost/schedule impacts become change events
```

### AI Capabilities

- Extract required submittals from specifications.
- Build draft submittal register.
- Assign likely responsible subcontractor/vendor.
- Detect missing required submittals.
- Detect duplicate RFIs.
- Draft RFIs from drawing/spec conflicts.
- Flag RFIs likely to create cost or schedule impact.

### Guardrails

- Human review before publishing submittal register.
- Human approval before sending RFIs externally.
- Require source links to spec sections and drawing sheets.

### Expected Impact

- Faster submittal setup.
- Fewer missed requirements.
- Better RFI quality.
- Better linkage between documentation and cost risk.

## Priority 7: Procurement Schedule

### Why It Matters

Procurement is directly connected to submittals, commitments, lead times, delivery dates, and installation dates.

### AI Capabilities

- Create draft procurement schedule from submittals, commitments, specs, lead times, and project schedule.
- Flag late submittals that threaten procurement.
- Detect long-lead items missing from procurement plan.
- Recommend follow-ups to vendors/subcontractors.
- Connect procurement risks to schedule and cash movement.

### Guardrails

- Human approval for official schedule updates.
- Require source evidence for lead-time assumptions.

### Expected Impact

- Fewer late materials.
- Better schedule visibility.
- Stronger vendor follow-up.

## Priority 8: Permit Paperwork Automation

### Why It Matters

Permit paperwork is administrative, repetitive, and high-friction, but errors can cause delays.

### AI Capabilities

- Prefill permit forms from project data.
- Identify missing jurisdiction-specific information.
- Generate required document checklists.
- Track permit status and follow-up dates.
- Draft permit-related correspondence.

### Guardrails

- Human review before submission.
- Jurisdiction-specific requirement citations where available.
- Track submitted version and approval status.

### Expected Impact

- Reduced admin burden.
- Fewer incomplete submissions.
- Better schedule control.

## Priority 9: Cash Flow Intelligence

### Why It Matters

Cash movement depends on owner billings, subcontractor payments, retainage, approved changes, pending changes, billing readiness, and schedule progress.

### AI Capabilities

- Forecast expected 30/60/90 day cash movement.
- Explain expected owner billings and vendor payments.
- Flag billing blockers.
- Track retainage movement.
- Identify approved changes not billed.
- Identify pending changes that may affect cash.
- Summarize project-level and company-level cash risk.

### Guardrails

- Use known financial data and mark assumptions.
- Require finance review before official reporting.

### Expected Impact

- Better working capital visibility.
- Earlier cash risk detection.
- Stronger executive planning.

## Priority 10: Client and Subcontractor Communication

### Why It Matters

Communication quality affects trust, documentation, response time, and risk control.

### AI Capabilities

- Draft owner updates.
- Draft subcontractor follow-ups.
- Convert meeting notes into action items.
- Detect unanswered commitments.
- Summarize communication history by issue.

### Guardrails

- Human approval before external send.
- Source evidence for claims.
- Tone and audience controls.

### Expected Impact

- Time savings.
- Better documentation.
- Fewer dropped commitments.

## Implementation Phases

### Phase 1: Foundation

- Feature flags for AI pilots.
- Project evidence model.
- Source citation requirements.
- Approval workflow framework.
- AI chat UI capable of showing tool calls, evidence, drafts, and approval states.

### Phase 2: Read-Only Intelligence

- Budget hygiene alerts.
- Change-risk alerts.
- Missing submittal alerts.
- Drawing/spec conflict candidates.
- Daily project risk summary.

### Phase 3: Draft Work Packets

- Draft change event.
- Draft RFI.
- Draft submittal register.
- Draft estimate review comments.
- Draft owner/subcontractor communication.

### Phase 4: Guided Approval

- Approval checklist by workflow.
- Named approver and audit trail.
- Reject/correct feedback loop.
- Sensitive action restrictions.

### Phase 5: Alleato-Specific Learning

- Jesse Mode for drawing review.
- Estimator feedback on estimate recommendations.
- PM feedback on change-event suggestions.
- Confidence scoring and recurring pattern detection.

### Phase 6: Controlled Automation

- Low-risk housekeeping automation.
- Scheduled notifications.
- Routine task creation.
- Automated reminders.
- No high-risk external or financial actions without approval.
