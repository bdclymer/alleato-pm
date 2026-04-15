---
name: procore-complete
description: Canonical autonomous orchestrator for finalizing a Procore tool implementation using one normalized workflow with parallel subagents and strict release gates. Use when the user asks to complete, finalize, retest, or certify a Procore tool implementation for release-readiness.
---

# Procore Complete

Run the canonical Procore implementation finalization workflow end to end.

## Command Contract

Accept invocation in this shape:

`/procore-complete <feature> [--mode full|fast|retest] [--auto] [--project-id <id>] [--max-fix-loops <n>] [--allow-stale-artifacts] [--strict-retest]`

## Workflow Source of Truth

Resolve project root at runtime:

```bash
PROJECT_ROOT="${PROJECT_ROOT:-$(git rev-parse --show-toplevel)}"
```

Always execute:

`$PROJECT_ROOT/.claude/commands/workflow/procore-finalization-orchestrator.md`

If any command or skill text conflicts with that file, the orchestrator file wins.

## Supabase RAG Requirement (Non-Negotiable)

This workflow requires the Procore RAG pipeline backed by Supabase.

- Tier 1 behavior source is `procore-docs-rag` using `scripts/procore-docs-query.js`.
- Do not skip RAG and rely on assumptions or model memory.
- RAG usage and evidence requirements are enforced by the orchestrator in discovery, gap analysis, and remediation.

## Drift Control

This skill is intentionally thin to avoid duplicate rules drifting from the orchestrator.

- Linked orchestrator: `.claude/commands/workflow/procore-finalization-orchestrator.md`
- Last reviewed against orchestrator: `2026-04-15`

## Required Final Output

Produce and report:
- `release-readiness.json`
- `08-final-summary.md`
- `09-feature-inventory.md` (complete list of every feature for the target tool)

Include:
- before/after completion percentages
- resolved vs remaining items by severity
- blockers or waivers with owner/date/approver/rationale
- complete feature inventory grouped by area (list/detail/create/edit/workflow/line-items/attachments/reports/integrations as applicable)
- use template: `scripts/templates/procore-feature-inventory-template.md`
