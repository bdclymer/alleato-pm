# Guardrail Operating Rules

## Severity model
- `critical`: Service broken, immediate alert, release blocker.
- `high`: Major feature degraded, alert.
- `medium`: User-visible issue, log + backlog.
- `low`: Minor issue, log only.

## Escaped bug completion rule
A bug is not complete unless at least one guardrail is added:
- unit/integration/contract/smoke test
- validation rule
- monitor/alert
- shared wrapper improvement
- failure-mode documentation

## Mandatory retrospective prompt
For each production issue, answer:
1. What should have prevented this?
2. What should have detected this sooner?
3. What guardrail was added now?

## API failure standard (minimum)
All server-side failures must return:
- `success: false`
- `error_code`
- `error_message`
- `where_it_failed`
- `request_id`
- `timestamp`
- optional `details`

## Agent rules
1. Do not ship silent failures.
2. Do not return generic errors.
3. Do not fix recurring bugs without adding guardrails.
4. Do not add one-off handling when shared abstraction is warranted.
5. Every failure write-up includes cause, detection gap, and prevention step.
6. Before closing a task, answer: "How does this fail loudly?"
7. Before closing a bug, answer: "What makes this never happen again?"

