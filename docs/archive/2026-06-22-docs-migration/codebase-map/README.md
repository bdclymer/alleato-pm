# Codebase Map

A bird's-eye view of every major surface in this app: what it controls, where it lives, what data it touches, and what shape it's in. Use this as the starting point before exploring or refactoring any area.

**How to read the Status column:**

| Status | Meaning |
|--------|---------|
| 🟢 healthy | Follows current patterns, no known structural debt. Safe to extend. |
| 🟡 messy but working | Functions correctly but has accumulated tech debt, drift, or duplication. Refactor opportunistically. |
| 🔴 danger zone | Known fragile or under active rework. Touch only with a plan. |
| ⚫ deprecated | Slated for removal. Don't extend. |
| ⬜ not yet mapped | Detail file not written yet. |

**How to add a new surface:** copy [`_template.md`](./_template.md) (see structure in any existing surface file), fill it in, then add a row below.

---

## Product Surfaces (project-scoped tools)

| Surface | Status | Detail | What it controls |
|---------|--------|--------|------------------|
| [AI Assistant](./ai-assistant.md) | 🟡 messy but working | ✅ | Chat UI, agent orchestrator, tools, RAG retrieval |
| [Commitments](./commitments.md) | 🟢 healthy | ✅ | Subcontracts, POs, commitment line items + change orders |
| Budget | 🟡 messy but working | ⬜ | Budget lines, forecasts, snapshots, imports |
| Change Events | 🟡 messy but working | ⬜ | CE creation, conversion to PCO, line items |
| Change Orders / PCOs | ⬜ | ⬜ | Commitment PCOs, Prime Contract PCOs, change-orders |
| Prime Contracts | ⬜ | ⬜ | Owner contracts (shares `/api/.../contracts` routes) |
| Direct Costs | ⬜ | ⬜ | Non-commitment costs |
| Estimates | ⬜ | ⬜ | Pre-construction estimates → budget seed |
| Invoicing | ⬜ | ⬜ | AIA G703 pay apps, billing periods, retainage |
| RFIs | ⬜ | ⬜ | Request for Information workflow |
| Submittals | ⬜ | ⬜ | Submittal workflow + ball-in-court |
| Drawings / Specs / Transmittals | ⬜ | ⬜ | Document mgmt for design artifacts |
| Daily Log | ⬜ | ⬜ | Daily reports + weather + manpower |
| Schedule / Tasks | ⬜ | ⬜ | Tasks, my-work, schedule view |
| Directory | ⬜ | ⬜ | People, companies, vendors |
| Photos | ⬜ | ⬜ | Photo capture + tagging |
| Punch List | ⬜ | ⬜ | Punch items |
| Meetings | ⬜ | ⬜ | Meeting notes, segments, AI extraction |
| Documents | ⬜ | ⬜ | File storage, email attachments |
| Home / Hub / Client Dashboard | ⬜ | ⬜ | Project landing + KPIs |
| Reporting | ⬜ | ⬜ | Progress reports, project status reports |

## Cross-Cutting Systems

| Surface | Status | Detail | What it controls |
|---------|--------|--------|------------------|
| [Sync Pipeline](./sync-pipeline.md) | 🟡 messy but working | ✅ | Outlook/Teams/OneDrive → embed → compile insights |
| [AI Agent Runtime Maps](./hermes-vs-openclaw-comparison.md) | 🟡 planning reference | ✅ | Hermes/OpenClaw review docs for AI operations gateway, runtime, tools, skills, and extension patterns |
| [AI Operations Gateway](../ai-plan/alleato-ai-operations-gateway-architecture.md) | 🟡 planned | ✅ | Event/run ledger, AI workflow control plane, toolsets, source adapters, Daily Brief proof slice |
| RAG / Embeddings | ⬜ | ⬜ | document_chunks, search RPCs, reranking. See [AI-RAG-ARCHITECTURE.md](../architecture/AI-RAG-ARCHITECTURE.md) |
| Auth / RLS | ⬜ | ⬜ | Supabase auth, middleware, RLS policies |
| Admin / Dev Tools | ⬜ | ⬜ | `/database-inventory`, `/site-map`, `/design-system`, `/feedback-inbox` |
| Acumatica Integration | ⬜ | ⬜ | ERP sync — cookie auth, no `$filter`. See `docs/patterns/integration-errors.md` |
| Procore Crawlers | ⬜ | ⬜ | Playwright crawls + PRPs |
| Quality / CI Gates | ⬜ | ⬜ | ESLint custom rules, pre-commit hooks |

## How this map stays accurate

- **When you add a major new feature:** add or update its row here AND its detail file.
- **When you delete or rename a surface:** update this index in the same commit.
- **When status changes:** update the badge. A surface that just got a major refactor moves from 🔴 → 🟡 → 🟢 as it stabilizes.
- **Last verified date** on each detail file says when someone last cross-checked it against the code.

This is intentionally lightweight. It's an index, not full documentation — link out to the existing `docs/architecture/`, `docs/patterns/`, and PRPs for deep references.

---

## Visual dependency graphs

Auto-generated import maps live in [`graphs/`](./graphs/README.md). They show what depends on what (boxes = files/folders, arrows = imports). Useful for:

- **Where do I start reading?** The box with the most incoming arrows.
- **What will break if I touch this?** Trace outgoing arrows.
- **Where are the messes?** Dense or tangled clusters.

Regenerate any time with `cd frontend && npm run map:all`.
