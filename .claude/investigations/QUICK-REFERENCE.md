# Financial Tools Quick Reference

## Scores at a Glance
```
Budget         ████████░░ 8/10 ✅ Complete
Prime Contracts ██████░░░░ 6/10 🚨 CRITICAL: No API
Commitments    ███████░░░ 7/10 ⚠️  Needs header fix
Change Events  ███████░░░ 7/10 ⚠️  Needs workflows
Change Orders  ███████░░░ 7/10 ⚠️  Needs workflows
Direct Costs   ██████░░░░ 6/10 🚨 CRITICAL: Form hangs
Invoicing      █████░░░░░ 5/10 🚨 CRITICAL: Wrong pattern
```

## Critical Issues Checklist
- [ ] **Prime Contracts** — Create API routes (DELETE/UPDATE/CREATE/READ routes)
- [ ] **Direct Costs** — Debug form hang bug in DirectCostForm.tsx
- [ ] **Invoicing** — Migrate from DataTablePage to UnifiedTablePage

## Header Pattern Fix (All 7 Tools)
- [ ] Budget
- [ ] Prime Contracts
- [ ] Commitments
- [ ] Change Events
- [ ] Change Orders
- [ ] Direct Costs
- [ ] Invoicing

## CRUD Gap Fixes

### Delete Operations Missing
- [ ] Prime Contracts — Add DELETE endpoint
- [ ] Direct Costs — Add DELETE endpoint
- [ ] Invoicing — Add DELETE endpoint

### Update Operations Missing
- [ ] Direct Costs — Verify PUT endpoint works
- [ ] Invoicing — Add PUT endpoint

### Create Operations Missing
- [ ] Prime Contracts — Add POST endpoint

## Feature Gaps

### Approval Workflows
- [ ] Change Events — Add approve/reject UI and state machine
- [ ] Change Orders — Add approval workflow UI

### Tax & Payment Tracking
- [ ] Invoicing — Add tax calculation
- [ ] Invoicing — Add payment tracking
- [ ] Invoicing — Add payment recording UI

### Document Generation
- [ ] Change Orders — Add CO PDF generation
- [ ] Invoicing — Add invoice PDF generation

### Budget Impact
- [ ] Change Orders — Ensure COs update budget calculations
- [ ] Direct Costs — Verify costs appear in budget "Job To Date Cost"

## Report Locations
```
.claude/investigations/
├── INVESTIGATION-SUMMARY.md      (start here)
├── QUICK-REFERENCE.md            (this file)
├── budget/investigation-report.md
├── prime-contracts/investigation-report.md
├── commitments/investigation-report.md
├── change-events/investigation-report.md
├── change-orders/investigation-report.md
├── direct-costs/investigation-report.md
└── invoicing/investigation-report.md
```

## API Route Counts
```
Change Orders:     18 routes ⭐ Most comprehensive
Budget:            16 routes
Commitments:       16 routes
Change Events:     12 routes
Direct Costs:       5 routes
Invoicing:          4 routes
Prime Contracts:    0 routes 🚨 CRITICAL
```

## File Counts
```
Budget:         50 components, 3 pages, 16 API routes
Change Orders:   8 components, 4 pages, 18 API routes
Change Events:  10 components, 4 pages, 12 API routes
Commitments:     8 components, 7 pages, 16 API routes
Direct Costs:   10 components, 3 pages,  5 API routes
Invoicing:       2 components, 3 pages,  4 API routes
Prime Contracts: 0 components, 5 pages,  0 API routes 🚨
```

## Pattern Analysis
- ✅ 5 of 7 use UnifiedTablePage (Budget, Commitments, Change Events, Change Orders, Direct Costs)
- ❌ 1 uses deprecated DataTablePage (Invoicing) — should migrate
- ❌ 0 of 7 use ProjectPageHeader + PageContainer (all need fix)

## Implementation Order Recommendation

### Week 1 (Unblock)
1. Prime Contracts — Create API routes
2. Direct Costs — Fix form hang
3. Invoicing — Migrate to UnifiedTablePage

### Week 2 (Pattern Fixes)
1. All 7 tools — ProjectPageHeader refactor
2. Add missing delete operations (3 tools)
3. Form validation across all tools

### Week 3+ (Features)
1. Approval workflows
2. PDF generation
3. Payment tracking
4. Budget impact verification

---

**See individual reports for detailed analysis and recommendations.**
