# Change Events — Gap Analysis Report

Generated: 2026-03-22T15:31:27Z
Source evidence: _bmad-output/planning-artifacts/change-events/verification/03-corrected-manifest.json

## Summary
- Critical: 0
- High: 2
- Medium: 2
- Low: 1

## Open Findings
- CE-001 (high, ui): Procore list includes Revenue/Cost parity columns (Prime PCO, RFQ, Commitment) while Alleato list view currently renders a reduced column set.
- CE-002 (high, workflow): Process requires explicit phase-level quality check command set, but orchestrator docs don’t define concrete verification command defaults by layer.
- CE-003 (medium, tests): VERIFY_IMPLEMENTATION requires video + screenshots + DB verification, but command set does not define canonical script or fixture command to execute this deterministically.
- CE-004 (medium, workflow): Waiver policy is underspecified (who can waive, expiry, approval metadata), which risks inconsistent release-readiness outputs.
- CE-005 (low, api): Route-level contract references include  in comments but endpoint path is ; docs should align naming.
