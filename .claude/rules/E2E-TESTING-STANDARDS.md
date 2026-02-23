# E2E TESTING STANDARDS (MANDATORY)

## The Rule

**E2E tests MUST simulate real user actions.** A test that only checks "page loads without errors" is a smoke test, NOT an E2E test. Smoke tests are worthless when the goal is verifying user functionality.

---

## What "E2E Test" Means

An E2E test walks through a **complete user workflow**:

1. Navigate to the page
2. Interact with UI elements (click buttons, fill forms, select options)
3. **Submit forms / trigger mutations**
4. **Verify the result appears in the UI** (toast, table row, updated field)
5. **Verify the data persisted** (check database or reload page)
6. Clean up test data

### REQUIRED for Every Feature E2E Test

- [ ] At least one **Create** test (open form, fill fields, submit, verify new record appears)
- [ ] At least one **Read** test (navigate, verify seeded data renders with correct values)
- [ ] At least one **Edit** test (open existing record, change a field, save, verify update)
- [ ] At least one **Delete/Deactivate** test (remove record, verify it disappears)
- [ ] Form **validation** test (submit empty required fields, verify error messages appear)

---

## What is NOT an E2E Test

These are smoke tests. They have value but DO NOT satisfy "E2E testing" requirements:

```typescript
// WRONG - This is a smoke test, NOT an E2E test
test('page loads without errors', async ({ page }) => {
  await page.goto('/some-page');
  await expect(page.locator('h1')).toBeVisible();
  const errorDialog = page.locator('dialog:has-text("Runtime Error")');
  expect(await errorDialog.count()).toBe(0);
});

// WRONG - Checking database directly without UI interaction
test('data exists in database', async () => {
  const { data } = await supabase.from('people').select('id');
  expect(data.length).toBeGreaterThan(0);
});
```
---

## What IS an E2E Test

```typescript
// CORRECT - Full user workflow
test('user creates a new person via the directory form', async ({ page }) => {
  // 1. Navigate
  await page.goto('/31/directory/users');
  await page.waitForLoadState('domcontentloaded');

  // 2. Open the form
  await page.getByRole('button', { name: /add/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // 3. Fill the form (every required field)
  await page.locator('#first-name').fill('Jane');
  await page.locator('#last-name').fill('TestUser');
  await page.locator('#email').fill('jane.test@example.com');

  // 4. Submit
  await page.getByRole('button', { name: /create person/i }).click();

  // 5. Verify result in UI
  await expect(page.getByText('Jane TestUser')).toBeVisible();
  // OR verify toast
  await expect(page.getByText(/has been created/i)).toBeVisible();

  // 6. Verify persistence (reload and check)
  await page.reload();
  await expect(page.getByText('Jane TestUser')).toBeVisible();
});
```
---

## Cleanup Requirements

Every test that creates data MUST clean it up:

```typescript
test.afterAll(async () => {
  // Delete in reverse dependency order
  await supabase.from('project_directory_memberships').delete().eq('person_id', testPersonId);
  await supabase.from('people').delete().eq('id', testPersonId);
});
```

---

## Selector Priority

1. `page.getByRole('button', { name: 'Create Person' })` - Role-based (preferred)
2. `page.locator('#first-name')` - ID-based (for form inputs with htmlFor)
3. `page.getByPlaceholder('John')` - Placeholder-based
4. `page.getByText('Submit')` - Text-based
5. `page.locator('[data-testid="submit"]')` - Test ID (last resort)

---

## Violations

If any agent (including test-automator) produces tests that:

- Only check page load status
- Only verify headings are visible
- Only check for runtime errors without user interaction
- Only query the database without touching the UI
- Skip form submission

**Those tests MUST be rejected and rewritten.** They do not satisfy E2E testing requirements.

---

## Historical Incident (2026-01-28)

An agent produced 18 "E2E tests" that:

- Checked pages load without errors (smoke tests)
- Verified database has seeded data (integration tests)
- Never clicked a single form button
- Never filled a single form field
- Never submitted any data

This wasted time and was correctly flagged as worthless by the user. E2E means **end-to-end user experience**, not "page doesn't crash."
