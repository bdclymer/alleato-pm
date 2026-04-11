## Guardrail Checklist (Required)

- [ ] I did not ship silent failures.
- [ ] I did not introduce generic error responses.
- [ ] For each bug fixed, I added at least one guardrail:
  - [ ] test
  - [ ] validation
  - [ ] monitor/alert
  - [ ] shared wrapper improvement
  - [ ] failure-mode documentation
- [ ] For each failure path I touched, I documented:
  - [ ] root cause
  - [ ] detection gap
  - [ ] prevention step
- [ ] I verified this change fails loudly with useful context.
- [ ] I verified this change makes recurrence less likely.

## What would have caught this earlier?

- Prevention:
- Earlier detection:
- New guardrail added in this PR:

