# Playwright Smoke Test Template (Per Tool)

Purpose: a stable, deterministic smoke spec that guards core user journeys for each tool (e.g., Submittals). Copy this into `frontend/tests/e2e/<tool>.smoke.spec.ts` and tailor selectors/fixtures. Keep it short and additive: every regression fix adds or sharpens a test here.

Key practices
- Keep runs deterministic: seed data once per suite, clean up in `afterAll` if needed. Prefer API seeding/fixtures over UI creation inside the test body.
- Use role/text-based selectors or test IDs; avoid brittle CSS selectors.
- Always wait for navigation to settle: `await page.waitForLoadState('networkidle')`.
- Scope to 2–4 scenarios covering navigation, critical actions, and settings; don’t make this a long end-to-end marathon.
- Save the HTML report (`--reporter=html`) and attach it to the plan/PR.
- Authentication/data: if a shared auth state exists (e.g., `tests/.auth/user.json`), reuse it. Provide a seed script to create deterministic records (e.g., `node scripts/seed-submittals-smoke.js`) and document it in the plan. Avoid relying on production data.

Example skeleton (adjust selectors/urls to the tool)

```ts
import { test, expect } from '@playwright/test';

// Optional: shared auth fixture if available in the repo
// test.use({ storageState: 'tests/.auth/user.json' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Submittals smoke', () => {
  test.beforeAll(async () => {
    // Optional: call seed script via child_process if desired
    // await execa('node', ['scripts/seed-submittals-smoke.js'], { env: { SUPABASE_URL: '...', SUPABASE_SERVICE_ROLE_KEY: '...' } });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/submittals`);
    await page.waitForLoadState('networkidle');
  });

  test('navigates tabs and respects filters', async ({ page }) => {
    await page.getByRole('tab', { name: 'Items' }).click();
    await expect(page.getByRole('heading', { name: /Submittals/i })).toBeVisible();

    await page.getByRole('tab', { name: 'Ball In Court' }).click();
    await expect(page.locator('[data-testid="submittals-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-filter-chip"]')).toContainText(/Ball In Court/i);
  });

  test('dropdown actions are present and enabled appropriately', async ({ page }) => {
    await page.getByRole('button', { name: /Create/i }).click();
    await expect(page.getByRole('menuitem', { name: /Submittal/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Submittal Package/i })).toBeVisible();

    await page.getByRole('button', { name: /Export/i }).click();
    await expect(page.getByRole('menuitem', { name: /CSV/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /PDF/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Excel/i })).toBeVisible();
  });

  test('settings save and persist (General)', async ({ page }) => {
    await page.goto(`${BASE_URL}/submittals/settings/general`);
    await page.waitForLoadState('networkidle');

    const numbering = page.getByLabel('Numbering Prefix');
    await numbering.fill('SUB');
    await page.getByRole('button', { name: /Save/i }).click();
    await expect(page.getByText(/Settings saved/i)).toBeVisible();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Numbering Prefix')).toHaveValue('SUB');
  });
});
```

How to run
- From repo root:
    cd frontend && npx playwright test tests/e2e/submittals.smoke.spec.ts --reporter=html
- Capture the HTML report and link it in the ActionPlan/PR.

When adding a regression fix
- Extend or tighten an existing test in this smoke spec; avoid creating separate ad-hoc specs.
- Log the issue and guard in `documentation/*project-mgmt/active/<tool>/patterns.md` and reference the test name/path.
