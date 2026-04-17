# Procore-Related Skills Guide

This document explains the skills in this repo that are directly tied to Procore behavior, parity, verification, and implementation readiness.

## Core Procore Skills

### `procore-docs-rag`
- Skill files:
  - `.agents/skills/procore-docs-rag/SKILL.md`
  - `.claude/skills/procore-docs-rag/SKILL.md`
- Purpose:
  - Ground-truth lookup for Procore behavior before planning or coding.
  - Uses a 3-tier model: Supabase RAG -> deep crawl manifests -> official Procore support pages.
- Use it when:
  - You need exact Procore statuses, workflows, required fields, or terminology.
  - Expected behavior is ambiguous and guessing would be risky.
- Primary output:
  - Evidence-backed behavior notes and source URLs to drive implementation/verification decisions.

### `procore-test-matrix`
- Skill file:
  - `.claude/skills/procore-test-matrix/SKILL.md`
- Purpose:
  - Generates a comprehensive test checklist for a Procore tool from indexed Procore docs.
  - Seeds test suites/cases for execution tracking.
- Use it when:
  - You need to create or refresh the canonical feature test matrix for a specific Procore tool.
- Primary output:
  - `docs/testing/<tool-name>-test-matrix.md`
  - Seeded test data in `test_suites` and `test_cases`.

### `procore-audit`
- Skill files:
  - `.agents/skills/procore-audit/SKILL.md`
  - `.claude/skills/procore-audit/SKILL.md`
- Purpose:
  - Full parity audit for a tool by crawling live Procore, extracting structure, and comparing against Alleato implementation.
- Use it when:
  - You want a gap analysis of what is missing or mismatched versus Procore.
- Primary output:
  - Procore-vs-Alleato gap analysis with prioritized remediation tasks.

### `procore-verify`
- Skill file:
  - `.claude/skills/procore-verify/SKILL.md`
- Purpose:
  - Comprehensive verification pipeline (codebase research + Procore docs + live Procore crawl + cross-compare).
- Use it when:
  - You need to answer: "What is left for this tool to reach Procore parity?"
- Primary output:
  - Verified task list and evidence artifacts (including screenshots/spec references).

### `procore-complete`
- Skill file:
  - `.agents/skills/procore-complete/SKILL.md`
- Purpose:
  - Canonical finalization orchestrator for release-readiness of a Procore tool implementation.
  - Delegates to `.claude/commands/workflow/procore-finalization-orchestrator.md` as source of truth.
- Use it when:
  - You are finalizing, certifying, or retesting a tool for release.
- Primary output:
  - `release-readiness.json`
  - `08-final-summary.md`
  - `09-feature-inventory.md`

## Procore Parity / Compliance Skills

### `parity-audit`
- Skill files:
  - `.agents/skills/parity-audit/SKILL.md`
  - `.claude/skills/parity-audit/SKILL.md`
- Purpose:
  - Runs Procore parity checks across one or more tools by executing seeded feature tests and writing results to `test_results`.
- Use it when:
  - You need dashboard-level parity status across tools ("working", "broken", "missing").
- Primary output:
  - Roll-up at `/testing/parity`
  - Per-tool pass/fail/missing/blocked results.

### `feature-audit`
- Skill file:
  - `.claude/skills/testing/feature-audit/SKILL.md`
- Purpose:
  - Broader quality audit that combines functional checks, database validation, Procore compliance, and UX/architecture recommendations.
- Use it when:
  - You want full quality assessment (not only parity) for a tool.
- Primary output:
  - `feature-audit-output/<tool>/report.md`

### `verify-feature`
- Skill file:
  - `.claude/skills/verify-feature/SKILL.md`
- Purpose:
  - End-to-end feature verification with evidence, including explicit Procore baseline checks for Procore-mirroring features.
- Use it when:
  - You just implemented/changed a feature and need confirmation it works technically and behaviorally (Procore match).
- Primary output:
  - Structured verification artifacts under `verify-output/<feature-slug>/`.

## Recommended Order of Use

1. `procore-docs-rag` to define expected behavior from authoritative sources.
2. `procore-test-matrix` to define test coverage for the tool.
3. `parity-audit` for broad pass/fail/missing status.
4. `procore-audit` or `procore-verify` for deep gap analysis.
5. `feature-audit` / `verify-feature` for detailed quality + user-flow validation.
6. `procore-complete` for final release-readiness orchestration.

## Quick Decision Guide

- "What does Procore actually do here?" -> `procore-docs-rag`
- "Create testing checklist for this tool." -> `procore-test-matrix`
- "Show me what's missing vs Procore." -> `parity-audit` (fast) or `procore-audit` (deep)
- "Fully verify this tool end-to-end." -> `procore-verify`
- "Audit quality and recommend improvements." -> `feature-audit`
- "Verify this specific changed feature." -> `verify-feature`
- "Finalize this tool for release." -> `procore-complete`

## Generated Outputs by Skill

This section shows what each Procore skill generates and where to find it.

| Skill | Generated Output | Where It Appears | Example |
|---|---|---|---|
| `procore-docs-rag` | Procore behavior research notes (statuses, fields, workflow evidence) | `docs/reports/procore-<tool>-<topic>.md` (recommended pattern from skill) | `docs/reports/procore-change-orders-statuses.md` (pattern example) |
| `procore-test-matrix` | Full markdown feature/functionality matrix for one tool + seeded DB test cases | `docs/testing/<tool-name>-test-matrix.md` and DB tables `test_suites`, `test_cases` | `docs/testing/specifications-test-matrix.md` |
| `parity-audit` | Per-run parity results (pass/fail/missing/blocked) and roll-up report | DB tables `test_runs`, `test_results`; UI `/testing/parity` | `frontend/src/app/(admin)/testing/parity/page.tsx` (report UI) |
| `procore-audit` | Procore vs Alleato gap analysis report and remediation task list | Audit report in the working output location used by the run | `scripts/playwright-crawl/outputs/analysis/feature-analysis.md` (source analysis artifact) |
| `procore-verify` | Verified implementation status package (research, crawl evidence, and task list) | `_bmad-output/planning-artifacts/<tool-name>/verification/` | `_bmad-output/planning-artifacts/<tool-name>/verification/02-procore-reference.md` (pattern example) |
| `feature-audit` | Unified quality audit report (functional + Procore compliance + UX) | `feature-audit-output/<tool>/report.md` | `feature-audit-output/<tool>/report.md` (pattern) |
| `verify-feature` | Feature-level verification artifacts (screenshots/video/spec checks) | `verify-output/<feature-slug>/` | `verify-output/<feature-slug>/procore-spec.md` (pattern) |
| `procore-complete` | Release-readiness package | `release-readiness.json`, `08-final-summary.md`, `09-feature-inventory.md` | `scripts/templates/procore-feature-inventory-template.md` (inventory template) |

### Concrete Example: `procore-test-matrix specifications`

When run for Specifications, the generated matrix is:

- `docs/testing/specifications-test-matrix.md`

This file contains:
- A complete source-backed feature/functionality inventory for Procore Specifications
- Category grouping for implementation and verification
- Direct Procore source URLs for each feature row

## Coverage Enforcement (Fail-Loudly)

To enforce "everything in Procore is accounted for in app," use the migration:

- `supabase/migrations/20260417153000_procore_traceability_and_coverage_gates.sql`

What it adds:
- `test_cases` traceability fields (`procore_feature_id`, source refs, `gap_type`)
- `procore_feature_implementations` (1:1 feature -> implementation mapping)
- Gap views:
  - `public.procore_feature_mapping_gaps`
  - `public.procore_test_traceability_gaps`
  - `public.procore_coverage_summary`
- CI gate function:
  - `public.assert_procore_coverage_gate(min_high_traceability_percent, min_feature_mapping_percent, allowed_uncovered_features)`

Suggested CI gate call:

```sql
select public.assert_procore_coverage_gate(100, 100, 0);
```

If this fails, it fails loudly with:
- Cause (what is missing)
- Detection gap (why current process missed it)
- Prevention step (what fields/mappings must be added)
