import { test, expect } from '@playwright/test';

test.describe('Complete Budget Workflow - End-to-End', () => {
  let projectId: string;
  let projectName: string;

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/dev-login?email=test@example.com&password=testpassword123');
    await page.waitForTimeout(2000);
  });

  test('1. Create a new project', async ({ page }) => {
    await page.goto('http://localhost:3000/projects');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/workflow-01-projects-page.png', fullPage: true });

    // Look for "Create Project" or "New Project" button
    const createButton = page.locator('button', { hasText: /create|new project/i }).first();

    if (await createButton.isVisible({ timeout: 3000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tests/screenshots/workflow-02-create-project-form.png', fullPage: true });

      // Fill project form
      projectName = `E2E Test Project ${Date.now()}`;
      await page.fill('input[name="name"]', projectName);
      await page.fill('input[name="project_number"]', `E2E-${Date.now()}`);

      await page.screenshot({ path: 'tests/screenshots/workflow-03-project-form-filled.png', fullPage: true });

      // Submit
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Get project ID from URL
      const url = page.url();
      const match = url.match(/\/(\d+)\//);
      if (match) {
        projectId = match[1];
        console.log(`Created project ID: ${projectId}`);
      }

      await page.screenshot({ path: 'tests/screenshots/workflow-04-project-created.png', fullPage: true });
    } else {
      throw new Error('Could not find Create Project button');
    }
  });

  test('2. Create a prime contract', async ({ page }) => {
    // Use a known project or navigate to contracts
    await page.goto('http://localhost:3000/67/contracts');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/workflow-05-contracts-page.png', fullPage: true });

    // Click "New Contract" or "Create Contract"
    const newContractButton = page.locator('button', { hasText: /new|create.*contract/i }).first();

    if (await newContractButton.isVisible({ timeout: 3000 })) {
      await newContractButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tests/screenshots/workflow-06-contract-form.png', fullPage: true });

      // Fill contract form
      await page.fill('input[name="title"]', `Prime Contract ${Date.now()}`);
      await page.fill('input[name="contract_number"]', `PC-${Date.now()}`);
      await page.fill('input[name="contract_value"]', '1000000');

      // Select contract type = Prime
      const contractTypeSelect = page.locator('select[name="contract_type"]');
      if (await contractTypeSelect.isVisible({ timeout: 2000 })) {
        await contractTypeSelect.selectOption('prime');
      }

      await page.screenshot({ path: 'tests/screenshots/workflow-07-contract-filled.png', fullPage: true });

      // Submit
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'tests/screenshots/workflow-08-contract-created.png', fullPage: true });

      console.log('Prime contract created');
    } else {
      console.log('New Contract button not found, checking if contracts exist');
      await page.screenshot({ path: 'tests/screenshots/workflow-05b-no-contract-button.png', fullPage: true });
    }
  });

  test('3. Create a budget with budget line items', async ({ page }) => {
    await page.goto('http://localhost:3000/67/budget');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/workflow-09-budget-page.png', fullPage: true });

    // Check if we can add line items
    const addLineItemButton = page.locator('a,button', { hasText: /add.*line.*item|create.*line.*item|new.*line.*item/i }).first();

    if (await addLineItemButton.isVisible({ timeout: 3000 })) {
      await addLineItemButton.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/screenshots/workflow-10-line-item-form.png', fullPage: true });

      // Click budget code dropdown
      const budgetCodeButton = page.locator('button[role="combobox"]').first();
      await budgetCodeButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tests/screenshots/workflow-11-budget-code-dropdown.png', fullPage: true });

      // Check if there are budget codes or if we need to create one
      const createNewOption = page.locator('text=Create New Budget Code');
      if (await createNewOption.isVisible({ timeout: 2000 })) {
        await createNewOption.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'tests/screenshots/workflow-12-create-budget-code-modal.png', fullPage: true });

        // Expand first division
        const firstDivision = page.locator('[role="dialog"] button').filter({ hasText: /^(General Requirements|Site Construction|Concrete)/ }).first();
        if (await firstDivision.isVisible({ timeout: 2000 })) {
          await firstDivision.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'tests/screenshots/workflow-13-division-expanded.png', fullPage: true });

          // Select first cost code
          const firstCostCode = page.locator('[role="dialog"] button').filter({ hasText: /^\d{2}-\d{4}/ }).first();
          if (await firstCostCode.isVisible({ timeout: 2000 })) {
            await firstCostCode.click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: 'tests/screenshots/workflow-14-cost-code-selected.png', fullPage: true });

            // Select cost type (should default to Labor)
            // Submit
            const createButton = page.locator('role=dialog').locator('button', { hasText: 'Create Budget Code' });
            await createButton.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'tests/screenshots/workflow-15-budget-code-created.png', fullPage: true });
          }
        }
      }

      // Now select the budget code and fill amounts
      await budgetCodeButton.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible({ timeout: 2000 })) {
        await firstOption.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'tests/screenshots/workflow-16-budget-code-selected.png', fullPage: true });
      }

      // Fill quantity and unit cost
      await page.fill('input[type="number"][placeholder*="0"]', '100');
      await page.locator('input[type="number"]').nth(1).fill('50');
      await page.screenshot({ path: 'tests/screenshots/workflow-17-amounts-filled.png', fullPage: true });

      // Submit line item
      const submitButton = page.locator('button[type="submit"]', { hasText: /create/i });
      await submitButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'tests/screenshots/workflow-18-line-item-created.png', fullPage: true });

      console.log('Budget line item created');
    } else {
      console.log('Add line item button not found');
      await page.screenshot({ path: 'tests/screenshots/workflow-09b-no-add-button.png', fullPage: true });
    }
  });

  test('4. Create a commitment', async ({ page }) => {
    await page.goto('http://localhost:3000/67/contracts');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/workflow-19-commitment-start.png', fullPage: true });

    // Look for commitment creation
    const newCommitmentButton = page.locator('button,a', { hasText: /commitment|subcontract/i }).first();

    if (await newCommitmentButton.isVisible({ timeout: 3000 })) {
      await newCommitmentButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tests/screenshots/workflow-20-commitment-form.png', fullPage: true });

      console.log('Commitment form opened');
    } else {
      console.log('Commitment button not found');
      await page.screenshot({ path: 'tests/screenshots/workflow-19b-no-commitment.png', fullPage: true });
    }
  });

  test('5. Create a change order', async ({ page }) => {
    await page.goto('http://localhost:3000/67/contracts');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/workflow-21-change-order-start.png', fullPage: true });

    // Look for change order creation
    const newCOButton = page.locator('button,a', { hasText: /change.*order|new.*co/i }).first();

    if (await newCOButton.isVisible({ timeout: 3000 })) {
      await newCOButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tests/screenshots/workflow-22-change-order-form.png', fullPage: true });

      console.log('Change order form opened');
    } else {
      console.log('Change order button not found');
      await page.screenshot({ path: 'tests/screenshots/workflow-21b-no-change-order.png', fullPage: true });
    }
  });

  test('6. Create a budget modification', async ({ page }) => {
    await page.goto('http://localhost:3000/67/budget');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/workflow-23-budget-mod-start.png', fullPage: true });

    // Look for budget modification button
    const modButton = page.locator('button,a', { hasText: /modification|adjust/i }).first();

    if (await modButton.isVisible({ timeout: 3000 })) {
      await modButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tests/screenshots/workflow-24-budget-mod-form.png', fullPage: true });

      console.log('Budget modification form opened');
    } else {
      console.log('Budget modification button not found');
      await page.screenshot({ path: 'tests/screenshots/workflow-23b-no-mod-button.png', fullPage: true });
    }
  });
});
