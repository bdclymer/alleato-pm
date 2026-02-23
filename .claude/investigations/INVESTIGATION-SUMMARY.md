# Bug Investigation Summary
**Last Updated:** 2026-02-23

## How to Use This File

| Command | What it does |
|---------|-------------|
| `/workflow:investigate <feature>` | Full deep dive — Feature Expert + Code Auditor + Live Tester |
| `/workflow:investigate <feature> --retest` | Live test only (skip Expert + Auditor, just verify fixes) |
| `/workflow:investigate --all` | Triage all implemented features |

---

## Features Investigated

| Feature | Score | Status | Critical | Report |
|---------|-------|--------|----------|--------|
| Prime Contracts | 6/10 | ⚠️ PARTIAL | 2 | [investigation-report.md](prime-contracts/investigation-report.md) |

---

## Prime Contracts — Quick Reference

**Files:**
- [procore-reference.md](prime-contracts/procore-reference.md) — What Procore looks like
- [code-audit.md](prime-contracts/code-audit.md) — Code gaps vs reference
- [live-test.md](prime-contracts/live-test.md) — Browser evidence (4 bugs found)
- [investigation-report.md](prime-contracts/investigation-report.md) — Prioritized fix list

**Top fixes:**
1. Replace `alert()` with `toast.error()` — 5 occurrences across 3 files
2. Re-enable/unify permission check (POST has it disabled, DELETE has it active)
3. Fix status enum mismatch in `types/prime-contracts.ts`
4. Add `.default(0)` to `original_contract_value` in validation schema

---

## Features Not Yet Investigated

Run `/workflow:investigate <feature>` for any of these:

### Financial (Priority 1)
- [ ] budget
- [ ] commitments
- [ ] change-orders
- [ ] change-events
- [ ] direct-costs
- [ ] invoicing

### Project Management (Priority 2)
- [ ] rfis
- [ ] submittals
- [ ] schedule
- [ ] daily-log
- [ ] punch-list
- [ ] meetings
- [ ] transmittals
- [ ] drawings
- [ ] specifications

### Core (Priority 3)
- [ ] directory
- [ ] photos
- [ ] emails
- [ ] documents

