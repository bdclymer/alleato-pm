# API Parity Gap Analysis — Change Workflow

**Source**: Background agent `api-gap-worker` (completed)
**Scope**: All 22+ API routes in the change workflow

## Summary

18 API-level gaps identified: 5 critical, 7 high, 3 medium, 3 low.
These are **deeper backend issues** beyond the UI gaps addressed in the main remediation pass.

---

## CRITICAL (5)

### API-001: CE list hard-codes `prime_pco: null`
- **Route**: `GET /api/projects/[projectId]/change-events`
- **Issue**: CE list always returns `prime_pco: null` instead of joining through `change_event_related_items`
- **Impact**: List view can't show which PCO a Change Event belongs to

### API-002: Commitment CO detail route is read-only + broken join
- **Route**: `GET /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]`
- **Issue**: No PUT/PATCH/DELETE. List route has no POST. Detail joins via `prime_contracts!inner` but contract_id FK points to commitments, not prime contracts
- **Impact**: CCOs can be listed but not created/updated/deleted through the change-orders path. Join returns no results.

### API-003: No approve/reject routes for commitment COs
- **Route**: Missing entirely
- **Impact**: Commitment CO approval only accessible via `/contracts/` sub-path, not surfaced in change workflow

### API-004: CE→CO conversion doesn't copy line items
- **Route**: `POST /api/projects/[projectId]/change-events/[changeEventId]/convert-to-change-order`
- **Issue**: Only creates header record. Line items from CE are not copied to the new CO.
- **Impact**: COs created from conversion have total_amount but zero SOV line items

### API-005: PCO→CO conversion queries wrong table for subcontractors
- **Route**: `POST /api/projects/[projectId]/pcos/[pcoId]/convert-to-co`
- **Issue**: Looks up subcontractor via `prime_contracts` instead of `subcontracts`/`purchase_orders`
- **Impact**: Commitment COs are never created from PCO conversion (silently skipped)

---

## HIGH (7)

### API-006: PCCO list has no joins, pagination, or filters
### API-007: PCCO create has no Zod validation, client-supplied number
### API-008: PCCO PUT accepts arbitrary fields, bypasses approve/reject
### API-009: Approve route missing status transition guard
### API-010: No PCCO line items write routes (NOW FIXED in this run)
### API-011: No CCO line items write routes (NOW FIXED in this run)
### API-012: `add-to-pco` creates PCCOs instead of linking to PCOs

---

## MEDIUM (3)

### API-013: PCCO hard delete with no status check
### API-014: PCO→CO conversion not transactional, number parsing breaks
### API-015: Client decision writes to wrong version (off-by-one)

---

## LOW (3)

### API-016: CCO export route uses broken prime_contracts join (empty CSV)
### API-017: CCO attachments missing project authorization check
### API-018: Inconsistent status casing across CCO routes

---

## Remediation Status

| Gap | Status |
|-----|--------|
| API-010 | **FIXED** — line-items routes created in this run |
| API-011 | **FIXED** — line-items routes created in this run |
| All others | **DEFERRED** — documented for next sprint |

## Prioritized Fix Order

1. **Fix immediately**: API-002, API-005, API-016 (broken joins returning no data)
2. **Fix immediately**: API-012 (two-table confusion)
3. **Fix before SOV work**: API-004 (line items not copied on conversion)
4. **Fix before workflow demo**: API-001, API-003, API-015
5. **Fix before production**: API-008, API-013, API-014
6. **Fix in hardening**: API-006, API-007, API-009, API-017, API-018
