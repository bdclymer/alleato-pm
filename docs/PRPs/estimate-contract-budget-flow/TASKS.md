# Tasks: Estimate → Prime Contract → Budget → Commitments Flow

Status: Not started  
PRP: `prp-estimate-contract-budget-flow.md`

## Pre-work
- [ ] Answer Open Questions 1-5 in PRP (requires Megan input)
- [ ] Run db:types after migration

## Implementation Order

### Phase 1 — Database (blocking everything else)
- [ ] Task 1: Migration — estimate_id + prime_contract_id FK columns

### Phase 2 — Backend APIs
- [ ] Task 2: Update commitments API — prime_contract_id filter
- [ ] Task 4: New route — Create prime contract from estimate
- [ ] Task 5: New route — Sync prime contract SOV from estimate
- [ ] Task 6: New route — Seed budget from estimate

### Phase 3 — Frontend
- [ ] Task 3: useCommitmentsList hook + PrimeContractCommitmentsTab filter
- [ ] Task 7: CreatePrimeContractFromEstimateModal + split Create button
- [ ] Task 8: SyncFromEstimateButton + EstimateVersionBadge on contract detail
- [ ] Task 9: Seed Budget action on estimate detail + list

### Phase 4 — Cleanup
- [ ] Task 10: V1 estimate data cleanup (remove write path, delete orphaned client)
- [ ] Task 11: SOV legacy table cleanup (do last — verify no new references introduced)
