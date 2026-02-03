# ProjectContextResilienceSubagent Charter

## Mission

Guarantee that every surface relying on `projectId` behaves correctly whether the context comes from a URL segment or a `?project=` query parameter, aligning with `docs/pages/QUERY_PARAM_PROJECT_SUPPORT.md`. This subagent hardens the context provider, eliminates duplicate parsing logic, and enforces automated regression coverage.

## Primary Inputs

- `docs/pages/QUERY_PARAM_PROJECT_SUPPORT.md` – specification describing dual-source context rules.
- `frontend/src/contexts/project-context.tsx` – authoritative provider that other code must consume.
- `frontend/src/components/layout/site-header.tsx` – header selector and breadcrumb consumer.
- Any component, hook, or utility that manually parses `window.location`, `pathname`, or `searchParams` to derive `projectId`.

## Scope of Work

1. **Centralize project resolution** – Ensure every consumer pulls `projectId`, `selectedProject`, or project metadata from `ProjectContext` rather than parsing paths independently.
2. **Strengthen provider logic** – Add memoized helpers that resolve:
   - Priority order (path segment > query param).
   - Validation (numeric IDs only).
   - Fallback states when neither source exists.
3. **Expose helpers** – Create selector hooks (`useProjectId`, `useProjectName`) that other modules can import instead of reimplementing logic.
4. **Regression tests** – Add automated coverage that navigates to:
   - `/${projectId}/budget`
   - `/budget?project=${projectId}`
   - Mixed routes like `/123/home?project=456` verifying path precedence.
5. **Documentation** – Update `docs/pages/QUERY_PARAM_PROJECT_SUPPORT.md` with newly supported scenarios, edge cases, and test references.

## Implementation Checklist

1. **Inventory manual parsing**
   - `rg -n \"project=\" -g \"*.tsx\" frontend/src` to find components reading query params directly.
   - `rg -n \"split\\('\\/'\\)\" frontend/src` to find ad-hoc pathname parsing.
   - Log offenders and plan migrations to context selectors.
2. **Context Enhancements**
   - Add derived values (`projectSlug`, `hasProjectContext`, etc.) and expose them through the context.
   - Ensure memoization keys include both `pathname` and `searchParams`.
   - Provide explicit loading/invalid states so consumers can differentiate.
3. **Consumer Refactors**
   - Update SiteHeader, breadcrumbs, hooks, and forms to use the new selectors.
   - Remove duplicate parsing utilities.
4. **Testing**
   - Create/extend `frontend/tests/e2e/project-context.spec.ts` to cover:
     - Path route selection (dropdown shows correct project).
     - Query-param route selection.
     - Precedence when both sources exist.
   - Capture screenshots demonstrating header status indicators for each scenario.
5. **Documentation**
   - Expand the doc with a matrix showing expected behavior for path-only, query-only, and mixed routes.
   - Include troubleshooting guidance for missing context.

## Acceptance Criteria

- No component performs its own path/query parsing for project IDs; all rely on context selectors.
- Context provider handles path-first precedence with graceful fallbacks and type-safe outputs.
- Playwright tests prove both routing styles work and prevent regressions.
- Documentation reflects the reinforced logic and links to tests/screenshots.
- Updates recorded in `PLANS_DOC.md` Progress + Decision logs.

## Dependencies & Coordination

- BreadcrumbExperienceSubagent relies on accurate project names within breadcrumbs; notify them of new selectors or breaking changes.
- PageTitleComplianceSubagent depends on timely project-name availability before calling `useProjectTitle`.
- Coordinate with backend or routing changes that may influence project scoping rules.
