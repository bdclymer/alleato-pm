# Claude Code Handoff: Subcontractor blocker visibility dashboard

## Intake
Requester: Brandon
Source: ais_chat_validation
AIS request id: 639e49cc-f0cb-438d-9f45-574523ee012a
Linear issue: Draft required

## Stakeholder Goal
Brandon wants a way to see which subcontractors are holding up a project, with enough detail to know whether the blocker is RFIs, submittals, invoices, commitments, change orders, or all of them.

## Current Understanding
Brandon wants a project blocker view that identifies subcontractors delaying progress and names the workflow source of each blocker.

## Acceptance Criteria
- [ ] Shows subcontractors with active blockers and the blocker source workflow.
- [ ] Separates RFIs, submittals, invoices, commitments, and change orders.
- [ ] Provides enough detail to identify the next owner action for each blocker.

## Implementation Plan
1. Confirm blocker workflow scope.
2. Map data sources for RFIs, submittals, invoices, commitments, and change orders.
3. Design the dashboard and verification flow.

## Likely Files
- frontend route: /ai-assistant/feature-requests
- frontend route: /ai-assistant/feature-requests/[requestId]
- FeatureRequestList
- FeatureRequestDetail
- feature_request_packet widget
- database table: feature_requests
- database table: implementation_plans
- database table: execution_handoffs

## Data Requirements
- Workflow-specific blocker data must be available or explicitly marked as missing.

## Verification Plan
- Open /ai-assistant/feature-requests and confirm the request appears.
- Open the detail page and confirm raw wording, summary, acceptance criteria, and open questions render.
- Confirm readiness remains blocked until workflow scope is confirmed or explicitly assumed.

## Open Questions / Assumptions
- Should blocker coverage include RFIs, submittals, invoices, commitments, change orders, or every open workflow blocker?

## Readiness Gate
This is not ready for build yet.

Missing:
- open implementation-critical questions resolved or converted to assumptions
- Claude Code handoff
- Linear issue or Linear draft body

Recommended next action:
Should blocker coverage include RFIs, submittals, invoices, commitments, change orders, or every open workflow blocker?

## Guardrails
- No silent failures.
- No generic errors.
- Use shared primitives.
- Run route checks if routes change.
- Verify migration ledger if schema changes.
- Attach browser evidence for frontend flows.
