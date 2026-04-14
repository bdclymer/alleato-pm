# ORCH-010 Frontend Flow Audit (Phase 2)

## Scope

`Commitments -> Change Event -> PCO -> Official CO -> Invoicing`

Environment:
- Base URL: `http://localhost:3000`
- Project: `67`
- Auth mode: `agent-browser --state frontend/tests/.auth/user.json`

## Step-by-step Pass/Fail

1. PASS - Open commitments list  
   Route: `/67/commitments`  
   Evidence: `01-commitments.png`, `01-commitments-snapshot.txt`

2. PASS - Open change events list  
   Route: `/67/change-events`  
   Evidence: `02-change-events.png`, `02-change-events-snapshot.txt`

3. PASS - Open change events create affordance  
   Action: click `Create` on change events list  
   Evidence: `03-change-events-create-menu.png`, `03-change-events-create-menu-snapshot.txt`

4. PASS - Open new change event page  
   Route: `/67/change-events/new`  
   Evidence: `04-change-events-new.png`, `04-change-events-new-snapshot.txt`

5. PASS - Open PCO list  
   Route: `/67/prime-contract-pcos`  
   Evidence: `05-pco-list.png`, `05-pco-list-snapshot.txt`

6. PASS - Open new PCO page  
   Route: `/67/prime-contract-pcos/new`  
   Evidence: `06-pco-new.png`, `06-pco-new-snapshot.txt`

7. PASS - Open official change orders list  
   Route: `/67/change-orders`  
   Evidence: `07-official-co-list.png`, `07-official-co-list-snapshot.txt`

8. FAIL - Generic `/new` path for official CO is invalid  
   Attempted route: `/67/change-orders/new`  
   Result: 404  
   Evidence: `08-official-co-new.png`, `08-official-co-new-snapshot.txt`

9. PASS - Official prime CO creation path works from list action  
   Action: click `New Prime Contract CO`  
   Result route: `/67/change-orders/prime/new`  
   Evidence: `07c-official-co-new-prime-flow.png`, `07c-official-co-new-prime-flow-snapshot.txt`

10. PASS - Open invoicing list  
    Route: `/67/invoices`  
    Evidence: `09-invoicing-list.png`, `09-invoicing-list-snapshot.txt`

11. FAIL - Invoicing create action does not advance to create page  
    Action: click `New Invoice` then `Owner`  
    Result route remains: `/67/invoices`  
    Evidence: `10-invoicing-new-menu.png`, `11-invoicing-owner-new.png`, `11-invoicing-owner-new-snapshot.txt`

12. FAIL - Guessable owner-specific create path is invalid  
    Attempted route: `/67/invoices/owner/new`  
    Result: 404  
    Evidence: `12-invoicing-owner-new-direct.png`, `12-invoicing-owner-new-direct-snapshot.txt`

13. PASS - Canonical invoice create route works  
    Route: `/67/invoices/new`  
    Evidence: `13-invoicing-new-direct-canonical.png`, `13-invoicing-new-direct-canonical-snapshot.txt`

Summary counts:
- Pass: 10
- Fail: 3

## Top 3 Frontend Gaps + Root Cause Hypothesis

1. Invoicing create UX appears broken at list-level interaction.  
   Hypothesis: The `New Invoice` control is not wiring navigation state correctly for owner/subcontractor flows and relies on tab toggles (`Owner`/`Subcontractor`) instead of deterministic route transitions.

2. Official CO and Invoicing route shapes are inconsistent with user-guessable patterns (`/new`).  
   Hypothesis: Route naming diverged between modules (`/change-orders/prime/new` and `/invoices/new`) without compatibility redirects, so deep links and muscle-memory paths produce hard 404s.

3. Runtime errors are present during flow traversal without surfaced in-UI diagnostics.  
   Hypothesis: API/resource failures are occurring in background fetches during navigation (`console.log` includes 404/500 entries), but list pages do not provide explicit failure banners at the point of action.

## Evidence Artifacts

- Video: `session.webm`
- Screenshots/snapshots: `01-*` through `13-*`
- Console log: `console.log`
- Browser errors log: `errors.log`
- Network capture attempt: `14-invoicing-network.log` (`No requests captured` from tool output)
