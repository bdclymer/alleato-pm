import { test, expect } from '../fixtures/index';
import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;

test.describe.skip('Budget Setup Wizard - Cost Code Type Display', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to dev login first to authenticate
    // Wait for redirect to complete
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
  });

  test('should display cost code type column and auto-populate description', async ({ page }) => {
    // Navigate to project setup wizard
    await page.goto('/118/setup');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to Budget step by clicking the Budget navigation item
    const budgetNavButton = page.getByRole('button', { name: /^Budget/ }).filter({ hasNotText: 'Cost Code' });
    await budgetNavButton.waitFor({ state: 'visible', timeout: 10000 });
    await budgetNavButton.click();

    // Wait for budget table to load
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Take screenshot of loaded budget page
    await page.screenshot({
      path: 'tests/screenshots/budget-cost-code-type-1-loaded.png',
      fullPage: true
    });

    // Verify Cost Code Type column header exists
    const costCodeTypeHeader = page.getByRole('columnheader', { name: 'Cost Code Type' });
    await expect(costCodeTypeHeader).toBeVisible();
    console.warn('✅ Cost Code Type column header is visible');

    // Verify table has rows
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
    console.warn(`✅ Found ${rowCount} budget items in table`);

    // Get first row and verify structure
    const firstRow = tableRows.first();

    // Column 0: Cost Code (e.g., "01-3120 Vice President")
    const costCodeCell = firstRow.locator('td').nth(0);
    const costCodeText = await costCodeCell.textContent();
    console.warn(`Cost Code: ${costCodeText?.trim()}`);

    // Column 1: Cost Code Type (should have badge with code + description)
    const costCodeTypeCell = firstRow.locator('td').nth(1);
    const typeBadge = costCodeTypeCell.locator('[class*="badge"]');
    await expect(typeBadge).toBeVisible();

    const badgeText = await typeBadge.textContent();
    console.warn(`✅ Cost Code Type Badge: ${badgeText?.trim()}`);

    // Verify description text is also visible (e.g., "Labor", "Material", etc.)
    const typeDescription = costCodeTypeCell.locator('span.text-xs');
    await expect(typeDescription).toBeVisible();
    const descriptionText = await typeDescription.textContent();
    console.warn(`✅ Cost Code Type Description: ${descriptionText?.trim()}`);

    // Column 2: Description (should be auto-populated with cost code title)
    const descriptionInput = firstRow.locator('td').nth(2).locator('input');
    const descriptionValue = await descriptionInput.inputValue();

    // Verify description is auto-filled (not empty)
    expect(descriptionValue.length).toBeGreaterThan(0);
    console.warn(`✅ Description auto-populated: "${descriptionValue}"`);

    // Verify placeholder text
    const placeholder = await descriptionInput.getAttribute('placeholder');
    expect(placeholder).toBe('Auto-filled from cost code');
    console.warn(`✅ Placeholder text: "${placeholder}"`);

    // Take final screenshot
    await page.screenshot({
      path: 'tests/screenshots/budget-cost-code-type-2-verified.png',
      fullPage: true
    });

    console.warn('✅ All verifications passed!');
  });
});
