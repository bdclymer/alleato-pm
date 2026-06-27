# Disable Brandon Microsoft Email Assistant Draft Writes

Status: Complete
Owner: Codex
Linear: AAI-759 - https://linear.app/megankharrison/issue/AAI-759/deactivate-brandon-microsoft-email-assistant-drafts-until-further
Date: 2026-06-27

## Request

Keep the Microsoft email assistant active for Brandon's mailbox reads, questions, triage, and urgent notifications, but disable Outlook draft writing until further notice.

## Scope

- Brandon mailbox: `bclymer@alleatogroup.com`
- Render cron: `alleato-microsoft-executive-assistant-check`
- Backend Microsoft Executive Assistant webhook / auto-draft / Teams alert runtime flags

## Checklist

- [x] Create Linear issue and record tracking link.
- [x] Confirm pre-change state showed active assistant runs.
- [x] Correct over-deactivation: keep scheduled cron active.
- [x] Correct over-deactivation: keep backend webhook-triggered assistant runs active.
- [x] Keep urgent Teams notifications active.
- [x] Disable backend Microsoft Executive Assistant auto-draft behavior.
- [x] Disable scheduled Microsoft Executive Assistant auto-draft behavior.
- [x] Verify provider read-back without exposing secrets.
- [x] Run the Microsoft assistant verifier and confirm read/triage access remains healthy.
- [x] Record cause, detection gap, and prevention step.

## Evidence

| Check | Command / Source | Result | Notes |
| --- | --- | --- | --- |
| Pre-change health | `npm run verify:microsoft-assistant-health -- --json` | Pass | At 2026-06-27T15:33:11Z, the cron had run successfully 2 minutes earlier, proving the assistant was active. |
| Corrected Render read-back | Render API `GET /v1/services` and `GET /v1/services/<id>/env-vars?limit=100` | Pass | Cron is `not_suspended`, scheduled enabled `true`, webhook enabled `true`, Teams alert `true`, auto-draft `false` on cron and backend. |
| Post-change health | `npm run verify:microsoft-assistant-health -- --json` | Pass | At 2026-06-27T15:40:04Z, Render cron, live Graph inbox, cached intake, and sync ledger all passed. Last successful cron run was 2026-06-27T15:39:50Z. |

## Failure-Loudly Behavior

The assistant should fail closed for Outlook draft writes only: scheduled and webhook-triggered reads/triage may run, urgent Teams notifications may send, but any call to `draft_outlook_email_for_review` must return preview-only because `MICROSOFT_EXECUTIVE_ASSISTANT_AUTO_DRAFT=false`.

## Cause / Detection Gap / Prevention

- Cause: Auto-draft was enabled while the user wanted the assistant to keep reading/notifying but stop creating Outlook drafts.
- Detection gap: The health verifier proves mailbox access and cron freshness, but does not explicitly assert the draft-write gate state.
- Prevention: Provider read-back now records `MICROSOFT_EXECUTIVE_ASSISTANT_AUTO_DRAFT=false` on both the scheduled cron and backend service; a follow-up should add this as a first-class verifier check.
