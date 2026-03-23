import { test, expect } from '@playwright/test';

test('Form Gauntlet Final: Create and verify subcontract', async ({ page }) => {
  // Part 1: Navigate to create subcontract form
  await page.goto('/760/commitments/new?type=subcontract');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Screenshot the initial form
  await page.screenshot({ path: '/tmp/fg-final-form-loaded.png', fullPage: true });

  // Fill Title
  const titleInput = page.locator('input[name="title"]');
  await titleInput.waitFor({ state: 'visible', timeout: 10000 });
  await titleInput.fill('Test Subcontract - Final FG5');

  // Fill Contract #
  const contractInput = page.locator('input[name="contract_number"], input[name="contractNumber"], input[name="number"]');
  if (await contractInput.count() > 0) {
    await contractInput.first().fill('SC-FG-005');
  } else {
    // Try finding by label
    const contractLabel = page.locator('label:has-text("Contract"), label:has-text("Number"), label:has-text("#")');
    if (await contractLabel.count() > 0) {
      const labelFor = await contractLabel.first().getAttribute('for');
      if (labelFor) {
        await page.locator(`#${labelFor}`).fill('SC-FG-005');
      }
    }
  }

  // Take snapshot of all inputs to understand the form structure
  const allInputs = await page.locator('input, select, textarea').all();
  const inputInfo: string[] = [];
  for (const input of allInputs) {
    const name = await input.getAttribute('name');
    const type = await input.getAttribute('type');
    const placeholder = await input.getAttribute('placeholder');
    const id = await input.getAttribute('id');
    const value = await input.inputValue().catch(() => '');
    inputInfo.push(`name=${name} type=${type} id=${id} placeholder=${placeholder} value=${value}`);
  }
  console.log('FORM INPUTS:', JSON.stringify(inputInfo, null, 2));

  // Screenshot after filling initial fields
  await page.screenshot({ path: '/tmp/fg-final-fields-1.png', fullPage: true });
});
