# PageTitleComplianceSubagent Charter

## Mission

Ensure every project-scoped route uses the `useProjectTitle` hook so browser tabs always display `Project Name – Page Title – Alleato OS`, as defined in `docs/pages/PAGE_TITLE_UPDATE.md`. This subagent owns the rollout, automated verification, and documentation for page-title correctness.

## Primary Inputs

- `docs/pages/PAGE_TITLE_UPDATE.md` – functional spec and backlog of pages still missing the hook.
- `frontend/src/hooks/useProjectTitle.ts` – hook implementation to keep stable.
- All project routes under `frontend/src/app/(project-mgmt)/[projectId]/**` and `(financial)` routes that derive project context via query params.
- Playwright specs under `frontend/tests/e2e/`.

## Scope of Work

1. **Audit coverage** – Enumerate every page that should call `useProjectTitle`. Prioritize the unchecked items listed in the “Next Steps” section of the documentation.
2. **Implement hook calls** – Import and invoke the hook at the top of each client component (or dedicated child component when the page is a server component).
3. **Dynamic titles** – Where page titles vary (e.g., create vs edit forms), ensure the hook receives the correct string after data loads.
4. **Shared layouts** – Add the hook to shared layout components when several sub-pages share a single client wrapper.
5. **Testing** – Expand Playwright coverage to assert page titles for representative routes across each module.
6. **Documentation updates** – Move items from the “Next Steps” checklist to “Completed”, citing PR/file references.

## Implementation Checklist

1. **Discovery**
   - Run `rg -l \"useProjectTitle\" frontend/src/app` to find existing usage.
   - Build a checklist mapping routes → file paths → hook status.
2. **Hook Injection Patterns**
   - Client pages: `useProjectTitle('<Page Name>')` directly in component body.
   - Server pages: wrap the client portion in a child component that calls the hook.
   - Dynamic titles: compute labels (e.g., `'Edit Contract'`) once data resolves, guard with loading states.
3. **Edge Cases**
   - Non-project routes should pass `includeProject = false`.
   - Query-param–based routes must still read the project name from context before invoking the hook.
4. **Testing Strategy**
   - Create `frontend/tests/e2e/page-titles.spec.ts`:
     - Navigate to representative routes (`/123/budget`, `/123/change-orders`, `/change-orders?project=123`, etc.).
     - Assert `await expect(page).toHaveTitle(/Project Name - Budget - Alleato OS/)`.
   - Ensure tests cover both path-based and query-param routes.
5. **Documentation**
   - Update `docs/pages/PAGE_TITLE_UPDATE.md` with the completed checklist, new examples, and test references.

## Acceptance Criteria

- Every route listed under “Next Steps” in the source doc now uses `useProjectTitle`.
- Dynamic titles (e.g., detail pages with entity names) display the correct text once data loads.
- Playwright tests prove both path and query-param routes set titles with project names (no IDs).
- Documentation reflects the new coverage (checked boxes + links to files/tests).
- Lint/typecheck continue to pass (`cd frontend && npm run lint && npm run typecheck`).

## Dependencies & Coordination

- Coordinate with ProjectContextResilienceSubagent to ensure project data is available before `useProjectTitle` runs, especially on query-param routes.
- When breadcrumbs influence titles, align with BreadcrumbExperienceSubagent so naming conventions match.
- Log progress and decisions inside `PLANS_DOC.md` after each milestone.
