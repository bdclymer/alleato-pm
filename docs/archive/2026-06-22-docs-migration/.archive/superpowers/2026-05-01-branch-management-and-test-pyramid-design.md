# Branch Management & Test Pyramid Design

**Date:** 2026-05-01  
**Status:** Approved  
**Scope:** CI/CD test pyramid, branch lifecycle policy, one-time branch cleanup

---

## Problem

Agent-created branches (Claude Code, Archon, Codex) accumulate without a clear merge path. There is no automated gate that ensures a branch is safe before it merges into main. Tests exist but layers 2 and 3 of the pyramid do not run on PRs. Several features (drawings viewer, entity-relationships) have no E2E smoke tests at all.

---

## The Test Pyramid

Five layers. Each layer has one job. Layers run from fastest to slowest.

### Layer 1 — Typecheck + Lint
- **Job:** Catch TypeScript errors and ESLint violations
- **When:** Every push to any branch
- **Time:** <2 min
- **Status:** ✅ Already running in `quality-gate.yml`

### Layer 2 — API Smoke Contracts
- **Job:** Every API endpoint returns a valid HTTP status (never 500, never timeout)
- **When:** Every PR — currently missing from PR CI
- **Time:** <3 min
- **Script:** `scripts/api-smoke-contracts.mjs`
- **Status:** ⚠️ Script exists, not wired into PR CI

### Layer 3 — E2E Smoke Tests
- **Job:** Key pages load, critical UI elements render, no JS crashes
- **When:** Every PR (smoke specs only — fast subset)
- **Time:** <8 min
- **Convention:** `*.smoke.spec.ts` files in `frontend/tests/e2e/<feature>/`
- **Status:** ⚠️ Exists for some features, missing for drawings and entity-relationships; not wired into PR CI

### Layer 4 — E2E Regression Tests
- **Job:** Full CRUD flows, edge cases, known bug regressions
- **When:** Nightly at 2am
- **Time:** <30 min
- **Convention:** `*.regression.spec.ts` files
- **Status:** ⚠️ Exists for some features, not scheduled in CI

### Layer 5 — Post-Deploy Health Check
- **Job:** Production is up after a deployment
- **When:** After every deploy to production
- **Time:** <1 min
- **Script:** `scripts/postdeploy-verify.sh`
- **Status:** ✅ Already running (4 health checks)

---

## Branch Lifecycle Policy

### Rule: Short-lived branches, PRs as the gate

```
main branch = always deployable, always green
feature branch = one purpose, merged within 2 days
PR = the only path into main; CI must pass
```

### Branch naming (already followed by agents)
- `claude/<slug>` — Claude Code agent branches
- `archon/<slug>` — Archon agent branches  
- `codex/<slug>` — Codex agent branches
- `fix/<description>` — hotfixes
- `refactor/<description>` — refactors

### Branch lifecycle
1. Agent or developer creates branch
2. PR opened → CI runs layers 1–3
3. All layers green → merge to main
4. Branch auto-deleted by GitHub (repository setting)
5. Layer 4 (nightly) catches anything that slipped through

### Staleness rule
Any branch older than 7 days with no new commits is stale. Options:
- Merge it (if work is complete)
- Delete it (if superseded or abandoned)
- Rebase it (if blocked by conflicts)

---

## Missing Smoke Tests (One-Time Gap Fill)

These features exist in open branches and have no smoke test:

| Feature | Branch | What to test |
|---------|--------|-------------|
| Drawings viewer (v2) | `claude/v2-viewer-annotations` | Page loads, viewer mounts, no JS crash |
| Drawings annotations | `claude/v2-viewer-annotations` | Annotation toolbar renders |
| Entity-links API | `claude/add-entity-relationships-dmUl4` | New endpoints in smoke contracts (200/401/404) |
| RelatedItemsPanel | `claude/add-entity-relationships-dmUl4` | Panel renders in RFI, Submittal, Change Event detail |
| FK form regression | `claude/audit-strategy-g7XAD` | Edit a record → all dropdowns pre-fill correctly |
| Mobile table actions | `claude/mobile-table-improvements-wHyT8` | TablePageActions renders on mobile viewport |
| Feedback inbox tabs | `claude/issue-269-20260426-0744` | Open/All filter tabs render and switch |

---

## Missing API Smoke Entries (One-Time Gap Fill)

New API routes from `claude/add-entity-relationships-dmUl4` not yet in `scripts/api-smoke-contracts.mjs`:

```
GET  /api/projects/:projectId/entity-links          → [200, 401]
GET  /api/projects/:projectId/entity-links/:id      → [200, 401, 404]
POST /api/projects/:projectId/entity-links          → [400, 401]  (auth check)
DELETE /api/projects/:projectId/entity-links/:id    → [401]       (auth check)
```

---

## CI Changes Required

### `quality-gate.yml` — add layer 2 to PR job
The existing `changed-quality` job runs only typecheck + lint. Add an API smoke step:

```yaml
- name: Run API smoke contracts
  env:
    API_SMOKE_BASE_URL: ${{ secrets.API_SMOKE_BASE_URL }}
  run: node scripts/api-smoke-contracts.mjs
```

### New `e2e-smoke.yml` — layer 3 on PRs
New workflow that runs only `*.smoke.spec.ts` files on every PR.

**Constraint:** E2E tests require a live Supabase instance and an authenticated session. Two options:
- **Option A (simpler):** Run E2E smoke against the Vercel preview deployment URL after it's built. Vercel already deploys a preview on every PR — the smoke step waits for that URL and tests it. Requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and a pre-seeded test user in CI secrets.
- **Option B (safer):** Run smoke tests only on push to main (post-merge), not on PRs. Layers 1+2 gate the PR; layer 3 verifies after merge before Vercel promotes to production.

**Decision: Option B for now.** Layer 2 (API smoke) catches endpoint crashes on PRs. Layer 3 runs post-merge on main, before production promotion. This avoids the complexity of seeding CI auth. Revisit when a dedicated staging Supabase instance is available.

```yaml
name: E2E Smoke (post-merge)
on:
  push:
    branches: [main]
jobs:
  smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - checkout + node + pnpm install
      - npx playwright test --grep "smoke" --project=chromium
        (runs against staging/preview URL with CI secrets for auth)
```

### New `e2e-nightly.yml` — layer 4 nightly
Runs the full E2E suite nightly at 2am UTC:

```yaml
name: E2E Regression (Nightly)
on:
  schedule:
    - cron: "0 2 * * *"
```

### GitHub repository setting
Enable "Automatically delete head branches" in Settings → General.

---

## One-Time Branch Cleanup Plan

### Step 1 — Delete already-merged branches (immediate, no risk)
```
origin/archon/thread-30510b5b  → delete
origin/archon/thread-3761fdff  → delete
origin/codex/tighten-vercel-author-gate → delete
```
Plus all local `archon/thread-*` and `codex/*` branches that are merged.

### Step 2 — Write missing smoke tests (before merging)
Write `*.smoke.spec.ts` for drawings, entity-links, RelatedItemsPanel, mobile table actions, feedback inbox tabs.

### Step 3 — Add entity-links to smoke contracts
Update `scripts/api-smoke-contracts.mjs` with the 4 new endpoints.

### Step 4 — Merge branches in order (low risk → high risk)
1. `claude/fix-mobile-form-pik17` — 1 commit, isolated punch-list fix
2. `claude/mobile-table-improvements-wHyT8` — 1 commit, new shared component
3. `claude/fix-mobile-design-3NP9p` — 2 commits, mobile layout fixes
4. `claude/issue-269-20260426-0744` — 1 commit, feedback inbox tab
5. `claude/audit-strategy-g7XAD` — 2 commits, FK validation fixes + docs
6. `codex/fix-operational-tools-build` — 1 commit, build fix
7. `archon/task-archon-plan-to-pr-1777538884444` — 1 commit, code review fixes
8. `refactor/302-company-knowledge-to-document-chunks` — 2 commits, RAG refactor
9. `claude/add-entity-relationships-dmUl4` — 8 commits, new feature (needs smoke tests first)
10. `claude/v2-viewer-annotations` — 5 commits, drawings v2 (needs smoke tests first)

### Step 5 — Enable auto-delete in GitHub
Settings → General → "Automatically delete head branches" ✅

---

## Success Criteria

- [ ] All 3 merged branches deleted
- [ ] All 11 unmerged branches either merged or explicitly abandoned
- [ ] `*.smoke.spec.ts` exists for every feature area with a page
- [ ] Entity-links endpoints in `api-smoke-contracts.mjs`
- [ ] API smoke runs on every PR in CI
- [ ] E2E smoke runs on every PR in CI
- [ ] Nightly regression workflow scheduled
- [ ] GitHub auto-delete enabled
- [ ] Zero branches older than 7 days (except main)
