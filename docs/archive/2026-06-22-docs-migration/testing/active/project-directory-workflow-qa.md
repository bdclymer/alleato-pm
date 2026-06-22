# Project Directory Workflow QA

This file is the running ledger for frontend QA of the project lifecycle workflow. Each entry should include the user-visible action, created record links, screenshots, issues found, and the Linear issue created when a defect is found.

## Run Context

- Workflow: Project lifecycle frontend QA
- QA project: [QA Workflow Project 2026-04-28 2329](http://localhost:3000/1010/home)
- Project ID: `1010`
- Created through: `agent-browser`
- Evidence folder: `tests/agent-browser-runs/20260428-create-project-qa/`
- Linear project for issues: `Directory`

## 2026-04-28 23:28 EDT - Create Project

### What Was Done

Created a new project through the visible frontend flow at `/create-project`.

- Project name: `QA Workflow Project 2026-04-28 2329`
- Job number: `QA-20260428-2329`
- Created project URL: [http://localhost:3000/1010/home](http://localhost:3000/1010/home)
- Description entered: `Frontend QA project created through agent-browser to start the end-to-end workflow.`
- Square footage: `12,500`
- Total value: `$2,500,000`
- Location: `123 QA Way`, `Indianapolis`, `46204`

### Evidence

- Filled form screenshot: `tests/agent-browser-runs/20260428-create-project-qa/create-project-filled.png`
- Success modal screenshot: `tests/agent-browser-runs/20260428-create-project-qa/project-created-modal.png`
- Project home screenshot: `tests/agent-browser-runs/20260428-create-project-qa/project-home-1010.png`

![Project home screenshot](../../../tests/agent-browser-runs/20260428-create-project-qa/project-home-1010.png)

### Result

Passed with issue. The project was created successfully and the project home page loaded at `/1010/home`.

### Issues Found

1. Create-project success modal did not navigate from `View Dashboard`.
   - Expected: Clicking `View Dashboard` opens the created project home page.
   - Actual: Clicking `View Dashboard` returned to the blank `/create-project` form.
   - Detection: `agent-browser` showed the project-created modal, clicked `View Dashboard`, then URL remained `http://localhost:3000/create-project`.
   - Workaround used for QA: Queried `/api/projects?search=QA Workflow Project 2026-04-28 2329` to confirm project ID `1010`, then opened `http://localhost:3000/1010/home` directly.
   - Linear: [AAI-191 - Create-project success modal View Dashboard does not navigate](https://linear.app/megankharrison/issue/AAI-191/create-project-success-modal-view-dashboard-does-not-navigate)

### What Remains

- Fix the success modal dashboard navigation.
- Continue workflow QA from project `1010` by creating the project budget.

### Recommended Next Steps

1. Use this QA project as the shared workflow record for the next steps.
2. Add the Budget step as the next entry in this file.
3. Record every user-visible defect in Linear and link the issue back here.

## 2026-04-29 00:11 EDT - Add Budget

### What Was Done

Created the first budget line item for the QA project through the visible frontend flow at `/1010/budget`.

- Budget page URL: [http://localhost:3000/1010/budget](http://localhost:3000/1010/budget)
- Action path: `Create` -> `Budget Line Item`
- Budget code created through the embedded `Create New Budget Code` flow.
- Cost code selected: `03-3000 - Cast-in-Place Concrete`
- Cost type selected: `S - Subcontract`
- Budget code created: `03-3000.S - Cast-in-Place Concrete - Subcontract`
- Quantity: `1`
- UOM: `LS`
- Unit cost: `$250,000`
- Resulting budget total shown on project home: `$250K`

### Evidence

- Initial budget page: `tests/agent-browser-runs/20260429-budget-qa/budget-initial.png`
- Budget line modal: `tests/agent-browser-runs/20260429-budget-qa/budget-line-modal-open.png`
- Budget code creation panel: `tests/agent-browser-runs/20260429-budget-qa/create-budget-code-open.png`
- Filled budget line: `tests/agent-browser-runs/20260429-budget-qa/budget-line-filled.png`
- Budget after line creation: `tests/agent-browser-runs/20260429-budget-qa/budget-after-line-create.png`
- Project home after budget settled: `tests/agent-browser-runs/20260429-budget-qa/home-after-budget-settled.png`

![Budget after line creation](../../../tests/agent-browser-runs/20260429-budget-qa/budget-after-line-create.png)

### Result

Passed with issue. The budget line item was created successfully, the budget page showed the Concrete group with `$250,000.00`, and the project home page updated to `Setup readiness 1/4` with `Budget $250K 0% spent`.

### Issues Found

1. Cost code picker has typo in Structural Concrete label.
   - Expected: `03-3100 - Structural Concrete`
   - Actual: `03-3100 - Structrual Concrete`
   - Detection: Visible in the `Create New Budget Code` picker after expanding `03 Concrete`.
   - Linear: [AAI-200 - Budget cost code picker has typo in Structural Concrete label](https://linear.app/megankharrison/issue/AAI-200/budget-cost-code-picker-has-typo-in-structural-concrete-label)

### Observations

- The embedded budget-code creation flow initially appeared to stay on the create-code panel after submit, but the line-item modal did receive the new code after the UI settled.
- Project home briefly showed `Budget Loading Refreshing totals`, then settled correctly to `$250K`.

### What Remains

- Fix the cost-code typo.
- Continue workflow QA from project `1010` by creating the prime contract and schedule of values.

### Recommended Next Steps

1. Continue on [http://localhost:3000/1010/prime-contracts](http://localhost:3000/1010/prime-contracts).
2. Verify the prime contract can be created against the new project budget context.
3. Add the Prime Contract step to this same ledger with screenshots and Linear links for any issues.
