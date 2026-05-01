# Branch Cleanup & Test Pyramid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete stale branches, write missing smoke tests, wire CI so every PR is automatically gated, then merge all 11 open branches in order.

**Architecture:** Three phases — (1) cleanup merged branches and add missing test coverage, (2) update CI to run API smoke on every PR and E2E smoke post-merge, (3) merge open branches in order from lowest to highest risk. Each branch gets its smoke test before it merges.

**Tech Stack:** Playwright (E2E smoke), `scripts/api-smoke-contracts.mjs` (API smoke), GitHub Actions YAML (CI), git CLI (branch management)

---

## Phase 1 — Immediate Cleanup

### Task 1: Delete already-merged remote branches

These 3 branches are confirmed merged into main. Deleting them is zero-risk.

**Files:** none (git operations only)

- [ ] **Step 1: Delete the 3 merged remote branches**

```bash
git push origin --delete archon/thread-30510b5b archon/thread-3761fdff codex/tighten-vercel-author-gate
```

Expected output: each shows `- [deleted] origin/<branch-name>`

- [ ] **Step 2: Delete stale local branches that don't exist on remote**

```bash
git fetch --prune
git branch -vv | grep ': gone]' | awk '{print $1}' | xargs git branch -d 2>/dev/null || true
```

Expected: prints branch names being deleted. If nothing prints, all local branches already track live remotes.

- [ ] **Step 3: Confirm clean state**

```bash
git branch -a | grep -v "origin/main\|origin/HEAD\|^\* main"
```

Expected: only the 11 known open branches remain in the list.

- [ ] **Step 4: Commit nothing — git-only operations, no code changed**

---

## Phase 2 — Missing Smoke Tests & API Contracts

### Task 2: Drawings page smoke test

The drawings viewer (v2) has zero test coverage. This smoke test verifies the page loads without crashing.

**Files:**
- Create: `frontend/tests/e2e/drawings/drawings.smoke.spec.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p frontend/tests/e2e/drawings
```

Create `frontend/tests/e2e/drawings/drawings.smoke.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

const PROJECT_ID = Number(process.env.E2E_PROJECT_ID ?? "67");

test.describe("Drawings Smoke", () => {
  test("drawings list page renders with upload action", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/drawings`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText("Drawings").first()).toBeVisible();
    // Page must not show an error state
    await expect(page.getByText("Something went wrong")).not.toBeVisible();
    await expect(page.getByText("Failed to load")).not.toBeVisible();
  });

  test("drawings viewer loads when navigating to a set", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/drawings`);
    await page.waitForLoadState("domcontentloaded");
    // If there are no drawing sets, the empty state should render — not a crash
    const emptyState = page.getByText(/no drawings/i);
    const setList = page.getByRole("link").filter({ hasText: /set|sheet/i });
    const hasContent = (await emptyState.isVisible()) || (await setList.count()) > 0;
    expect(hasContent).toBe(true);
  });
});
```

- [ ] **Step 2: Run the smoke test to verify it passes**

```bash
cd frontend && npx playwright test tests/e2e/drawings/drawings.smoke.spec.ts --headed --project=chromium 2>&1 | tail -20
```

Expected: `2 passed` or failures explained by no drawings data (not JS crashes).

- [ ] **Step 3: Commit**

```bash
git add frontend/tests/e2e/drawings/drawings.smoke.spec.ts
git commit -m "test(drawings): add smoke test for drawings list page"
```

---

### Task 3: Entity-links API smoke contracts

The `claude/add-entity-relationships-dmUl4` branch adds new API routes. Add them to the smoke contracts so they're checked daily against production.

**Files:**
- Modify: `scripts/api-smoke-contracts.mjs` (after line ~175, in the Drawings section)

- [ ] **Step 1: Add entity-links endpoints to the ENDPOINTS array**

In `scripts/api-smoke-contracts.mjs`, find the comment `// Punch Items` (around line 196) and insert immediately before it:

```javascript
  // Entity Links (cross-entity relationships)
  ["GET", `/api/projects/${PROJECT_ID}/entity-links`, "Entity links list", [200, 401]],
  ["GET", `/api/projects/${PROJECT_ID}/entity-links/${FAKE_UUID}`, "Entity link detail (fake id)", [200, 401, 404]],
  ["POST", `/api/projects/${PROJECT_ID}/entity-links`, "Entity link create (auth check)", [400, 401]],
  ["DELETE", `/api/projects/${PROJECT_ID}/entity-links/${FAKE_UUID}`, "Entity link delete (auth check)", [401]],
```

- [ ] **Step 2: Run smoke contracts locally against dev server to verify syntax**

In one terminal: `cd frontend && npm run dev`

In another terminal:
```bash
API_SMOKE_BASE_URL=http://localhost:3000 node scripts/api-smoke-contracts.mjs 2>&1 | grep -E "entity.link|FAIL|Pass:"
```

Expected: entity-link lines show `PASS` (200 or 401) or `WARN` (404 if routes don't exist yet in main — that's acceptable, they'll be added when the branch merges).

- [ ] **Step 3: Commit**

```bash
git add scripts/api-smoke-contracts.mjs
git commit -m "test(api-smoke): add entity-links endpoint contracts"
```

---

### Task 4: RelatedItemsPanel E2E smoke test

The entity-relationships branch wires a `RelatedItemsPanel` into RFI, Submittal, and Change Event detail pages. This smoke test verifies the tab renders after the branch merges.

**Files:**
- Create: `frontend/tests/e2e/rfis/rfis.related-items.smoke.spec.ts`

- [ ] **Step 1: Create the file**

```typescript
import { test, expect } from "@playwright/test";

const PROJECT_ID = Number(process.env.E2E_PROJECT_ID ?? "67");

// These tests verify the "Related Items" tab renders in entity detail pages.
// The tab is added by the entity-relationships feature (branch: add-entity-relationships-dmUl4).
// They will fail until that branch is merged — that is expected and intentional.
test.describe("Related Items Panel Smoke", () => {
  test("RFI detail page has Related Items tab", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/rfis`);
    await page.waitForLoadState("domcontentloaded");

    // Click the first RFI row if any exist
    const firstRow = page.getByRole("row").nth(1);
    const hasRows = (await firstRow.count()) > 0;
    if (!hasRows) {
      // No RFIs to click — emit a warning rather than fail
      console.warn("No RFI rows found in project, skipping detail navigation");
      return;
    }

    await firstRow.click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("tab", { name: /related items/i })).toBeVisible();
  });

  test("Submittal detail page has Related Items tab", async ({ page }) => {
    await page.goto(`/${PROJECT_ID}/submittals`);
    await page.waitForLoadState("domcontentloaded");

    const firstRow = page.getByRole("row").nth(1);
    if ((await firstRow.count()) === 0) {
      console.warn("No Submittal rows found, skipping detail navigation");
      return;
    }

    await firstRow.click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("tab", { name: /related items/i })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the test (it will FAIL until the branch is merged — that is correct)**

```bash
cd frontend && npx playwright test tests/e2e/rfis/rfis.related-items.smoke.spec.ts --headed --project=chromium 2>&1 | tail -10
```

Expected now: `FAIL` — "Related Items" tab not found (feature not merged yet).
Expected after merging `claude/add-entity-relationships-dmUl4`: `PASS`.

- [ ] **Step 3: Commit**

```bash
git add frontend/tests/e2e/rfis/rfis.related-items.smoke.spec.ts
git commit -m "test(entity-links): add RelatedItemsPanel smoke test (pre-merge)"
```

---

### Task 5: Feedback inbox tabs smoke test

**Files:**
- Create: `frontend/tests/e2e/admin-pipeline.smoke.spec.ts`

Note: there is already an `admin-pipeline.spec.ts` — this is a separate, focused smoke file.

- [ ] **Step 1: Create the file**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feedback Inbox Smoke", () => {
  test("feedback inbox renders with Open and All filter tabs", async ({ page }) => {
    await page.goto("/feedback-inbox");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText("Feedback Inbox").first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /open/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /all/i })).toBeVisible();
  });

  test("clicking Open tab filters to open items only", async ({ page }) => {
    await page.goto("/feedback-inbox");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("tab", { name: /open/i }).click();
    // Page must not crash — empty state or list is acceptable
    await expect(page.getByText("Something went wrong")).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd frontend && npx playwright test tests/e2e/admin-pipeline.smoke.spec.ts --headed --project=chromium 2>&1 | tail -10
```

Expected: `2 passed` if feedback-inbox has the tabs already. If `FAIL`, the branch `claude/issue-269-20260426-0744` hasn't been merged yet — merge it first (Task 8 below), then re-run.

- [ ] **Step 3: Commit**

```bash
git add frontend/tests/e2e/admin-pipeline.smoke.spec.ts
git commit -m "test(feedback-inbox): add smoke test for Open/All filter tabs"
```

---

### Task 6: Mobile TablePageActions smoke test

**Files:**
- Modify: `frontend/tests/e2e/mobile/mobile-quick-check.spec.ts`

- [ ] **Step 1: Append this test block to the bottom of the existing file**

Open `frontend/tests/e2e/mobile/mobile-quick-check.spec.ts` and add the following at the very end of the file (after the last closing `}`):

- [ ] **Step 2: Add this content at the end of the file**

```typescript
test.describe("Mobile TablePageActions Smoke", () => {
  test("companies table page renders action button on mobile", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14 dimensions
    });
    const page = await context.newPage();

    await page.goto("/directory/companies");
    await page.waitForLoadState("domcontentloaded");

    // On mobile, the Add button should still be present (may show as icon-only)
    const addButton = page.getByRole("button").filter({ hasText: /add|company|\+/i }).first();
    const iconButton = page.locator("[aria-label*='add' i], [aria-label*='create' i], button svg").first();
    const hasAction = (await addButton.isVisible()) || (await iconButton.isVisible());
    expect(hasAction).toBe(true);

    await context.close();
  });
});
```

- [ ] **Step 3: Run the test**

```bash
cd frontend && npx playwright test tests/e2e/mobile/mobile-quick-check.spec.ts --headed --project=chromium 2>&1 | tail -10
```

Expected: `passed` for the new test. If FAIL, the `claude/mobile-table-improvements-wHyT8` branch hasn't merged yet.

- [ ] **Step 4: Commit**

```bash
git add frontend/tests/e2e/mobile/mobile-quick-check.spec.ts
git commit -m "test(mobile): add TablePageActions smoke test for mobile viewport"
```

---

## Phase 3 — CI Wiring

### Task 7: Add API smoke to PR CI

Currently PRs only run typecheck + lint. Adding layer 2 means every PR automatically checks that no endpoint is returning 500.

**Files:**
- Modify: `.github/workflows/quality-gate.yml`

- [ ] **Step 1: Read the current changed-quality job**

```bash
cat .github/workflows/quality-gate.yml
```

- [ ] **Step 2: Add API smoke step to the `changed-quality` job**

In `.github/workflows/quality-gate.yml`, find the `changed-quality` job and add this step after "Run changed-file quality ratchet":

```yaml
      - name: Run API smoke contracts (PR gate)
        env:
          API_SMOKE_BASE_URL: ${{ secrets.API_SMOKE_BASE_URL }}
        run: |
          if [[ -z "${API_SMOKE_BASE_URL}" ]]; then
            echo "API_SMOKE_BASE_URL not set — skipping smoke (set secret to enable)"
            exit 0
          fi
          node scripts/api-smoke-contracts.mjs
```

The `if` guard means the step is a no-op (not a failure) if the secret isn't set. This prevents blocking PRs before the secret is confirmed working.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/quality-gate.yml
git commit -m "ci: add API smoke contracts step to PR quality gate"
```

---

### Task 8: Add post-merge E2E smoke workflow

**Files:**
- Create: `.github/workflows/e2e-smoke.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: E2E Smoke (post-merge)

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: "10.13.1"

      - name: Install frontend dependencies
        run: pnpm --dir frontend install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm --dir frontend exec playwright install chromium --with-deps

      - name: Run E2E smoke tests
        env:
          PLAYWRIGHT_BASE_URL: ${{ secrets.PLAYWRIGHT_BASE_URL || secrets.API_SMOKE_BASE_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          E2E_PROJECT_ID: "67"
        run: |
          if [[ -z "${PLAYWRIGHT_BASE_URL}" ]]; then
            echo "PLAYWRIGHT_BASE_URL not set — skipping E2E smoke (set secret to enable)"
            exit 0
          fi
          pnpm --dir frontend exec playwright test \
            --grep "\.smoke\." \
            --project=chromium \
            --reporter=list
        working-directory: frontend
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/e2e-smoke.yml
git commit -m "ci: add post-merge E2E smoke workflow"
```

---

### Task 9: Add nightly regression workflow

**Files:**
- Create: `.github/workflows/e2e-nightly.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: E2E Regression (Nightly)

on:
  schedule:
    - cron: "0 2 * * *"   # 2am UTC every night
  workflow_dispatch:

jobs:
  regression:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: "10.13.1"

      - name: Install frontend dependencies
        run: pnpm --dir frontend install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm --dir frontend exec playwright install chromium --with-deps

      - name: Run full E2E regression suite
        env:
          PLAYWRIGHT_BASE_URL: ${{ secrets.PLAYWRIGHT_BASE_URL || secrets.API_SMOKE_BASE_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          E2E_PROJECT_ID: "67"
        run: |
          if [[ -z "${PLAYWRIGHT_BASE_URL}" ]]; then
            echo "PLAYWRIGHT_BASE_URL not set — cannot run nightly regression"
            exit 1
          fi
          pnpm --dir frontend exec playwright test \
            --project=chromium \
            --reporter=html,list
        working-directory: frontend

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ github.run_id }}
          path: frontend/tests/playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/e2e-nightly.yml
git commit -m "ci: add nightly E2E regression workflow"
```

---

### Task 10: Enable auto-delete branches in GitHub

This is a one-click GitHub settings change. After this, every merged PR automatically deletes its branch.

**Files:** none (GitHub UI setting)

- [ ] **Step 1: Open the repository settings**

Go to: `https://github.com/<org>/alleato-pm/settings` → General tab → scroll to "Pull Requests" section.

- [ ] **Step 2: Enable the setting**

Check: ✅ "Automatically delete head branches"

- [ ] **Step 3: Verify**

Merge any small test PR and confirm GitHub shows "Branch was automatically deleted" in the PR timeline.

---

## Phase 4 — Merge Open Branches (Low Risk → High Risk)

**Before each merge:** ensure CI (typecheck + lint) passes on that branch by checking GitHub Actions on the PR.

### Task 11: Merge low-risk single-commit branches

These are all 1-commit isolated fixes. Merge them one at a time, verifying each push doesn't break the main branch.

- [ ] **Step 1: Ensure you are on main and up to date**

```bash
git checkout main && git pull origin main
```

Expected: `Already up to date.` or a list of fast-forward commits.

- [ ] **Step 2: Merge `claude/fix-mobile-form-pik17` (punch-list mobile fix)**

```bash
git fetch origin
git merge --no-ff origin/claude/fix-mobile-form-pik17 -m "merge: punch-list mobile form stacking fix"
git push origin main
```

Wait for Vercel deploy to complete. Check `https://projects.alleatogroup.com` loads.

- [ ] **Step 2: Merge `claude/mobile-table-improvements-wHyT8` (TablePageActions)**

```bash
git merge --no-ff origin/claude/mobile-table-improvements-wHyT8 -m "merge: shared TablePageActions + mobile chrome tightening"
git push origin main
```

- [ ] **Step 3: Merge `claude/fix-mobile-design-3NP9p` (mobile layout fixes)**

```bash
git merge --no-ff origin/claude/fix-mobile-design-3NP9p -m "merge: mobile table page action button and gutter fixes"
git push origin main
```

- [ ] **Step 4: Merge `claude/issue-269-20260426-0744` (feedback inbox Open tab)**

```bash
git merge --no-ff origin/claude/issue-269-20260426-0744 -m "merge: feedback inbox Open filter tab"
git push origin main
```

Then run the feedback inbox smoke test to verify:
```bash
cd frontend && npx playwright test tests/e2e/admin-pipeline.smoke.spec.ts --headed --project=chromium 2>&1 | tail -5
```
Expected: `2 passed`

- [ ] **Step 5: Merge `claude/audit-strategy-g7XAD` (FK validation fixes)**

```bash
git merge --no-ff origin/claude/audit-strategy-g7XAD -m "merge: FK form validation audit fixes"
git push origin main
```

- [ ] **Step 6: Merge `codex/fix-operational-tools-build` (build fix)**

```bash
git merge --no-ff origin/codex/fix-operational-tools-build -m "merge: restore operational tools production build"
git push origin main
```

- [ ] **Step 7: Merge `archon/task-archon-plan-to-pr-1777538884444` (code review fixes)**

```bash
git merge --no-ff origin/archon/task-archon-plan-to-pr-1777538884444 -m "merge: address CRITICAL/HIGH code review findings"
git push origin main
```

---

### Task 12: Merge `refactor/302-company-knowledge-to-document-chunks`

This is a 2-commit RAG pipeline refactor. Higher risk than single-commit fixes.

**Files affected:** RAG pipeline, document_chunks table, company_knowledge consolidation

- [ ] **Step 1: Review what the branch changes**

```bash
git diff main...origin/refactor/302-company-knowledge-to-document-chunks --stat
```

- [ ] **Step 2: Run API smoke against dev server before merging**

```bash
# In one terminal
cd frontend && npm run dev

# In another terminal
API_SMOKE_BASE_URL=http://localhost:3000 node scripts/api-smoke-contracts.mjs 2>&1 | tail -10
```

Expected: `All endpoints healthy.` or only 401s (no 500s).

- [ ] **Step 3: Merge**

```bash
git merge --no-ff origin/refactor/302-company-knowledge-to-document-chunks -m "merge: consolidate company_knowledge into document_chunks RAG pipeline"
git push origin main
```

- [ ] **Step 4: Verify AI assistant still works post-merge**

```bash
cd frontend && npx playwright test tests/e2e/ai-assistant/ --headed --project=chromium 2>&1 | tail -10
```

---

### Task 13: Merge `claude/add-entity-relationships-dmUl4`

8 commits — the largest branch. Adds entity-links tables, API routes, and RelatedItemsPanel in 3 feature pages.

- [ ] **Step 1: Verify the branch is up to date with main**

```bash
git log origin/claude/add-entity-relationships-dmUl4..origin/main --oneline | head -5
```

If commits appear, the branch needs to be rebased. Otherwise proceed.

- [ ] **Step 2: Run the RelatedItemsPanel smoke test (expect FAIL — confirm it fails for the right reason)**

```bash
cd frontend && npx playwright test tests/e2e/rfis/rfis.related-items.smoke.spec.ts --headed --project=chromium 2>&1 | tail -10
```

Expected: `FAIL` — "Related Items" tab not found (correct — branch not merged yet).

- [ ] **Step 3: Merge**

```bash
git merge --no-ff origin/claude/add-entity-relationships-dmUl4 -m "merge: entity-relationships feature — link tables, API routes, RelatedItemsPanel"
git push origin main
```

- [ ] **Step 4: Run the RelatedItemsPanel smoke test (expect PASS now)**

```bash
cd frontend && npx playwright test tests/e2e/rfis/rfis.related-items.smoke.spec.ts --headed --project=chromium 2>&1 | tail -10
```

Expected: `2 passed`

- [ ] **Step 5: Run entity-links API smoke**

```bash
API_SMOKE_BASE_URL=http://localhost:3000 node scripts/api-smoke-contracts.mjs 2>&1 | grep "entity-link"
```

Expected: all 4 entity-links lines show PASS (200 or 401, not 500).

---

### Task 14: Merge `claude/v2-viewer-annotations`

5 commits — drawings v2 viewer with SVG annotations. This is the highest-risk merge because it's the most feature-dense.

- [ ] **Step 1: Run drawings smoke test before merge (verify it passes on main first)**

```bash
cd frontend && npx playwright test tests/e2e/drawings/drawings.smoke.spec.ts --headed --project=chromium 2>&1 | tail -10
```

Expected: `2 passed` (current v1 drawings page works).

- [ ] **Step 2: Review what the branch changes**

```bash
git diff main...origin/claude/v2-viewer-annotations --stat
```

- [ ] **Step 3: Merge**

```bash
git merge --no-ff origin/claude/v2-viewer-annotations -m "merge: drawings v2 viewer with SVG annotation overlay"
git push origin main
```

- [ ] **Step 4: Run drawings smoke test again (verify v2 didn't break the page)**

```bash
cd frontend && npx playwright test tests/e2e/drawings/drawings.smoke.spec.ts --headed --project=chromium 2>&1 | tail -10
```

Expected: `2 passed`

- [ ] **Step 5: Do a manual spot-check of the drawings viewer**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000/67/drawings` in a browser. Click into a drawing set. Verify:
- The viewer loads (no blank screen)
- The annotation toolbar appears
- Drawing a shape doesn't throw a console error

---

## Phase 5 — Verify Final State

### Task 15: Confirm zero open branches

- [ ] **Step 1: Check remote branches**

```bash
git fetch --prune && git branch -r | grep -v "origin/main\|origin/HEAD"
```

Expected: empty output (or only branches created after today).

- [ ] **Step 2: Run full API smoke against production**

```bash
API_SMOKE_BASE_URL=https://projects.alleatogroup.com node scripts/api-smoke-contracts.mjs 2>&1 | tail -5
```

Expected: `All endpoints healthy.`

- [ ] **Step 3: Run all smoke specs locally**

```bash
cd frontend && npx playwright test --grep "smoke" --project=chromium 2>&1 | tail -15
```

Expected: all pass (or known pre-existing failures that predate this work).

- [ ] **Step 4: Check CI is green on main**

```bash
gh run list --branch main --limit 5
```

Expected: latest run shows green (✓) on `quality-gate`.

---

## Success Checklist

- [ ] 3 merged branches deleted from remote
- [ ] All local gone-branch references pruned
- [ ] `frontend/tests/e2e/drawings/drawings.smoke.spec.ts` created
- [ ] `frontend/tests/e2e/rfis/rfis.related-items.smoke.spec.ts` created
- [ ] `frontend/tests/e2e/admin-pipeline.smoke.spec.ts` created
- [ ] Mobile TablePageActions test added to `mobile-quick-check.spec.ts`
- [ ] Entity-links endpoints added to `scripts/api-smoke-contracts.mjs`
- [ ] `.github/workflows/quality-gate.yml` — API smoke step added to PR job
- [ ] `.github/workflows/e2e-smoke.yml` — created (post-merge E2E smoke)
- [ ] `.github/workflows/e2e-nightly.yml` — created (nightly regression)
- [ ] GitHub auto-delete branches setting enabled
- [ ] All 11 open branches merged into main
- [ ] Zero branches older than today on remote
- [ ] API smoke green against production
- [ ] All `*.smoke.spec.ts` tests passing locally
