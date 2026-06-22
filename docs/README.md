# Alleato PM Docs

The current frontend documentation source of truth is
[`docs/alleato-os-docs`](./alleato-os-docs), which is mounted from the Alleato OS
docs app. Start there for product, architecture, operations, API, and
Project Intelligence guidance.

The rest of this `docs/**` tree is the working evidence/control-plane layer:
task ledgers, handoffs, reports, generated inventories, audits, retained
templates, and archived historical notes. Those files are useful, but they are
not automatically current product documentation unless the docs site links to
them.

## Start Here

- **[Alleato OS Docs](./alleato-os-docs/introduction.mdx)** - canonical current docs site.
- **[Docs Source Of Truth](./alleato-os-docs/operations/docs-source-of-truth.mdx)** - how to decide what is current vs evidence/reference.
- **[Repo Control](./alleato-os-docs/operations/repo-control.md)** - live roots, retired paths, and cleanup guardrails.
- **[Operational Tasks](./ops/tasks/README.md)** - Codex task ledgers and done gates.
- **[Repo-Control Inventory](./ops/repo-control-live-vs-outdated-inventory.md)** - live vs outdated path inventory.

## Build And Design

- **[Architecture Overview](./alleato-os-docs/architecture/overview.mdx)** - current architecture entry point.
- **[Frontend Stack](./alleato-os-docs/architecture/frontend-stack.mdx)** - current frontend stack.
- **[Design System](./alleato-os-docs/architecture/design-system.mdx)** - current design-system guidance.
- **[Data Layer](./alleato-os-docs/architecture/data-layer.mdx)** - current database/data ownership.
- **[Generated Project Map](./architecture/PROJECT-MAP.md)** - generated evidence snapshot, not hand-authored guidance.
- **[Generated Table List](./architecture/TABLE-LIST.md)** - generated database evidence snapshot.

## AI And Operations

- **[AI/RAG Architecture](./alleato-os-docs/architecture/ai-rag.mdx)** - current AI/RAG architecture.
- **[Project Intelligence](./alleato-os-docs/project-intelligence/index.mdx)** - current Project Intelligence documentation.
- **[Project Intelligence Verification](./alleato-os-docs/project-intelligence/verification.mdx)** - checks for packet/source health.
- **[Deploy Runbook](./alleato-os-docs/operate/deploy.mdx)** - current deployment guidance.
- **[Cron Runbook](./alleato-os-docs/operate/crons.mdx)** - current scheduled job guidance.

## Verification

- **[Development And Build](./alleato-os-docs/operate/dev-build.mdx)** - current development/build checks.
- **[Troubleshooting](./alleato-os-docs/operate/troubleshooting.mdx)** - current operational troubleshooting.
- **[Archive](./archive/2026-06-22-docs-migration/)** - preserved old docs roots that are no longer active source-of-truth folders.
- **[Error Prevention System](./ERROR-PREVENTION-SYSTEM.md)** - working-reference failure prevention process.

## Active Top-Level Structure

| Path | Classification | Use |
| --- | --- | --- |
| `docs/alleato-os-docs` | Active source of truth | Current published frontend docs site. |
| `docs/ops` | Operational evidence | Task ledgers, orchestration, repo-control, and handoff evidence. |
| `docs/architecture` | Generated/current evidence | Generated maps and inventories. Do not treat as hand-authored product guidance. |
| `docs/reference` | Active reference evidence | Current repo reference material that remains intentionally outside the docs site. |
| `docs/reports` | Generated/current evidence | Audit/report history only. |
| `docs/handoffs` | Operational evidence | Legacy top-level handoff evidence retained to avoid breaking handoff history. |
| `docs/procore-templates` | Generated/current evidence | Procore import/export/template evidence, not product docs. |
| `docs/archive` | Historical/archive | Preserved old docs roots. Do not use as current guidance unless a current docs-site page explicitly links to a file. |

## How To Use This Folder

1. Start with `docs/alleato-os-docs` for current documentation.
2. Use `docs/ops/**` for task evidence, handoffs, orchestration, and repo-control ledgers.
3. Use generated files like `docs/architecture/PROJECT-MAP.md` as evidence snapshots.
4. Treat `docs/reports`, `docs/procore-templates`, and `docs/archive` as evidence/history unless linked from the docs site.
5. Run `npm run repo:control` if a folder looks active but its ownership is unclear.
