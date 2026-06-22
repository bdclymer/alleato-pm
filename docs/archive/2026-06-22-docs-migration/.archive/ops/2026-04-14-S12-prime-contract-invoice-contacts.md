# Handoff: 2026-04-14 — S12 prime-contract invoice contacts

## 1) Session ID

S12

## 2) Task ID

DOC-PRIME-CONTACTS-001

## 3) Current status: In Progress | Pending Review | Blocked

Pending Review

## 4) Files changed (absolute paths)

- /Users/meganharrison/Documents/github/alleato-pm/frontend/src/components/domain/contracts/ContractForm.tsx
- /Users/meganharrison/Documents/github/alleato-pm/docs/ops/memory/current-state.md
- /Users/meganharrison/Documents/github/alleato-pm/docs/ops/handoffs/2026-04-14-S12-prime-contract-invoice-contacts.md

## 5) Commands run and outcome (pass/fail counts)

1. `cd /Users/meganharrison/Documents/github/alleato-pm/frontend && npx eslint src/components/domain/contracts/ContractForm.tsx`  
Outcome: 0 errors, 6 warnings.
2. `nl -ba /Users/meganharrison/Documents/github/alleato-pm/frontend/src/components/domain/contracts/ContractForm.tsx` for line references  
Outcome: pass.

## 6) Evidence artifacts (screenshot/video/report/log paths)

- None. This was a code and documentation fix only.

## 7) Top 3 findings (frontend-visible issues first)

1. Prime contract owner/client selection was not guaranteed to keep `contractCompanyId` in sync, so invoice-contact lookups could resolve against the wrong company state.
2. The bug was visible as an empty invoice-contact dropdown even when the selected company had contacts on its directory page.
3. The detection gap is a missing regression test for company selection and invoice-contact population on the prime contract create flow.

## 8) Recommended next action (one line)

Add a targeted Playwright regression that selects a company with contacts on `/[projectId]/prime-contracts/new` and verifies the invoice-contact dropdown renders those contacts.

## 9) Handoff file path

/Users/meganharrison/Documents/github/alleato-pm/docs/ops/handoffs/2026-04-14-S12-prime-contract-invoice-contacts.md

## Current Status

The prime contract form now keeps owner/client and contract company state aligned, and the memory log records the failure mode plus the prevention step.

## Exact Next Step

Write a regression test for prime contract invoice-contact population after company selection.

## Known Pitfalls

- If the test only checks the owner/client field and not the invoice-contact dropdown, the bug can regress again.
- If future form changes split owner/client and contract-company behavior again, the contact hook will silently lose the selected company context.

## Resume Commands

```bash
cd /Users/meganharrison/Documents/github/alleato-pm/frontend && npx eslint src/components/domain/contracts/ContractForm.tsx
```

## Evidence

- /Users/meganharrison/Documents/github/alleato-pm/docs/ops/memory/current-state.md
- /Users/meganharrison/Documents/github/alleato-pm/frontend/src/components/domain/contracts/ContractForm.tsx
