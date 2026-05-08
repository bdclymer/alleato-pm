# Design System, Layout & Form Audit — 2026-04-14

Automated audit of five project rules across `frontend/src/**`:

- **Rule 2** — no generic `[id]` route parameters
- **Rule 6** — new pages must use `PageShell` (no `<PageContainer>` + manual `<h1>` double headers)
- **Rule 7** — design system hygiene (color tokens, no hardcoded scales, use `<Button>`, `<StatusBadge>`, no oversized shadows)
- **Rule 11** — form dropdowns must load from the FK target table, not a sibling lookup table

Scripts live in `scripts/audits/` and print parseable TSV output. Re-run them any time from a clean checkout — no install required.

## Summary

| Check | Violations |
|-------|-----------:|
| PageShell — deprecated layouts (`ProjectToolPage` / `PageLayout`) | 0 |
| PageShell — double header (`<PageContainer>` + manual `<h1>`) | 1 |
| `bg-white` classes | 108 |
| `text-white` classes | 374 |
| Hardcoded Tailwind color scales (`bg-gray-100`, `text-blue-500`, …) | 2,109 |
| Hex codes in `className` / `style` | 182 |
| Lowercase `<button>` element instead of `<Button>` | 237 |
| Oversized shadows (`shadow-md` / `lg` / `xl` / `2xl`) | 7 |
| Arbitrary spacing values (`p-[…]`, `gap-[…]`, …) | 460 |
| Hardcoded status → color mappings (should use `<StatusBadge>`) | 78 |
| Generic `[id]` route segments | 2 |
| Form FK mismatches — KNOWN seeds (`budget_code_id`, `vendor_id`) | 1 |
| Form FK mismatches — SUSPECTED (heuristic, some false positives) | 3 |

**Noisiest violation class:** `HARDCODED_COLOR` — 2,109 hits. The single biggest cluster is `frontend/src/components/components-widgets.tsx` (270 violations in one file), followed by `components/layouts/header.tsx` (128) and `components/apps/mailbox/components-apps-mailbox.tsx` (94). These are almost all vestigial "dashboard demo" components that shipped with the template — strong candidates for wholesale deletion rather than remediation.

**Deprecated layouts:** None. No page uses `ProjectToolPage` or the old `PageLayout` import.

## Per-rule details

### Rule 6 — PageShell violations

Scanned 216 `page.tsx` files under `frontend/src/app/**`.

- **1 double-header violation:**
  - `frontend/src/app/(admin)/(procore)/support-articles/[articleId]/page.tsx` — uses `<PageContainer>` and renders its own `<h1>`
- **0 deprecated-layout violations.**

### Rule 7 — Design system

Top-20 offenders (summed across all categories):

| Violations | File |
|-----------:|------|
| 270 | `components/components-widgets.tsx` |
| 128 | `components/layouts/header.tsx` |
| 94  | `components/apps/mailbox/components-apps-mailbox.tsx` |
| 81  | `components/layouts/sidebar.tsx` |
| 79  | `components/apps/todolist/components-apps-todolist.tsx` |
| 77  | `app/(admin)/testing/page.tsx` |
| 66  | `components/dev/DevDebugPanel.tsx` |
| 64  | `components/apps/notes/components-apps-notes.tsx` |
| 50  | `components/apps/chat/components-apps-chat.tsx` |
| 49  | `app/(admin)/design-system-update/page.tsx` |
| 45  | `components/dev-panel/GapsTab.tsx` |
| 44  | `app/(admin)/database/database-tables-catalog-client.tsx` |
| 42  | `components/dev-panel/SchemaTab.tsx` |
| 40  | `components/apps/contacts/components-apps-contacts.tsx` |
| 38  | `components/procore-docs/docs-chat.tsx` |
| 36  | `components/dev-panel/DebugTab.tsx` |
| 34  | `components/ai-elements/schema-display.tsx` |
| 34  | `components/ai-elements/test-results.tsx` |
| 34  | `components/apps/scrumboard/components-apps-scrumboard.tsx` |
| 34  | `components/monitoring/MonitoringCharts.tsx` |

Everything under `components/apps/**` and `components/layouts/**` appears to be unused demo code from the original template. Confirming they're unreachable and deleting them would wipe out hundreds of violations in one commit.

Full line-level output: run `node scripts/audits/audit-design-system.mjs`.

### Rule 7 — Hardcoded status colors

78 suspicious `bg-(red|green|yellow|blue|orange)-<shade>` lines flagged near `status`/`state`/`approved`/`pending` keywords. Top offenders:

| Hits | File |
|-----:|------|
| 9 | `components/dev-panel/DebugTab.tsx` |
| 4 | `app/(admin)/admin/company-info/page.tsx` |
| 4 | `app/(admin)/projects-table-demo/projects-table.tsx` |
| 4 | `app/(admin)/testing/page.tsx` |
| 3 | `app/(admin)/tools/page.tsx` |
| 3 | `app/(main)/[projectId]/direct-costs/direct-cost-preview-pane.tsx` |
| 3 | `app/(main)/[projectId]/direct-costs/direct-costs-client.tsx` |
| 3 | `app/(main)/[projectId]/estimates/estimates-table-utils.ts` |
| 3 | `components/dev-panel/AnnotationsTab.tsx` |
| 3 | `components/dev-panel/GapsTab.tsx` |
| 3 | `components/monitoring/MonitoringCharts.tsx` |

These should all route through `<StatusBadge status="..." />` per Rule 7.

### Rule 2 — Route param conflicts

Two generic `[id]` segments remain:

| Directory | Current | Suggested |
|-----------|---------|-----------|
| `frontend/src/app/(tables)/daily-logs/[id]` | `[id]` | `[dailyLogId]` |
| `frontend/src/app/api/ai-assistant/memories/[id]` | `[id]` | `[memoryId]` |

### Rule 11 — Form ↔ DB FK mismatches

85 form files scanned. **1 known-seed match** confirmed:

- `components/direct-costs/DirectCostForm.tsx` — writes `vendor_id` (FK → `companies`) but loads its vendor dropdown from `/api/projects/${projectId}/vendors`. This is the canonical vendor/company ID mismatch called out in `.claude/rules/FORM-FK-VALIDATION-GATE.md`.

3 heuristic-only suspects (likely mostly false positives, documented here only because Rule 11 is easy to violate silently):

| File | Column | FK target (per `database.types.ts`) | Endpoints seen |
|------|--------|-------------------------------------|----------------|
| `components/direct-costs/DirectCostForm.tsx` | `employee_id` | `people` | `vendors,employees,budget-codes,direct-costs` |
| `components/domain/users/UserFormDialog.tsx` | `company_id` | `companies` | `directory,people,invite` |
| `components/domain/users/UserFormDialog.tsx` | `permission_template_id` | `permission_templates` | `directory,people,invite` |

The heuristic's limitations:

- Endpoint resource names are inferred from `/api/...` path segments — if a form loads options through a React Query hook rather than a string URL, the audit can't see it.
- Table names that match the column prefix may be aliased behind `/api/directory` or `/api/people`, yielding false positives.
- Sub-directory-split form files (`change-event-form/GeneralInfoSection.tsx`, etc.) are captured by the `/-form/` path heuristic, but their parent `ChangeEventForm.tsx` wrapper is not checked independently.

Treat the SUSPECTED list as a prompt for manual review, not a defect list. The KNOWN list is the actionable output.

## How to run

```bash
cd /Users/meganharrison/Documents/github/alleato-pm

node scripts/audits/audit-pageshell-violations.mjs
node scripts/audits/audit-design-system.mjs
node scripts/audits/audit-status-color-hardcoding.mjs
node scripts/audits/audit-route-param-conflicts.mjs
node scripts/audits/audit-form-fk-mismatches.mjs
```

Each script:

- Pure ESM, Node built-ins only, no `npm install`.
- Always exits `0` regardless of violation count — wire into CI behind `| tee` + your own threshold check, not an exit-code gate, until counts come down.
- Output is TSV-ish; `awk -F'\t'` or `cut -f1` works for extracting file lists.

## Recommended prioritisation

1. **Delete unused template code.** `components/apps/**`, `components/layouts/{header,sidebar}.tsx`, `components/components-widgets.tsx`, most `app/(admin)/testing`/`design-system-update`/`projects-table-demo` routes. This alone removes ~1,000 design-system violations.
2. **Fix the single FK mismatch** in `DirectCostForm.tsx` — this is Rule 11, known pattern, known fix (resolve `vendor_id` against `companies`).
3. **Rename the 2 `[id]` route segments** — cheap, prevents Rule 2 regressions.
4. **Fix the one double-header page** — `support-articles/[articleId]/page.tsx`.
5. **Sweep hardcoded status colors** into `<StatusBadge>` — 78 sites, mechanical conversion.
6. **Hardcoded color scales in real (non-template) code** — address file by file, prioritising the dev-panel + monitoring components (they're visible internally and set the tone for new contributors).
