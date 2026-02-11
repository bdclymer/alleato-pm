import { createTestProject } from '../helpers/bootstrap';
test.skip(true, "Legacy budget spec - migrated to budget-core");



let projectId: number;
import { expect, test } from '../fixtures/index'

test.describe.skip('Budget Save - Direct Test', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    projectId = project.project.id;
  });

  test('should save budget items successfully in project setup wizard', async ({ page }) => {
    // Login
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Use a known project ID (project 67)
    const projectId = '67'
    console.log(`Using project ID: ${projectId}`)

    // Navigate directly to project setup wizard for this project
    await page.goto(`http://localhost:3000/project-setup-wizard?projectId=${projectId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'tests/screenshots/budget-direct-01-wizard-start.png', fullPage: true })

    // Skip through steps until we get to budget
    // Step 1: Cost Codes - Import or Continue
    const importStandardButton = page.locator('button:has-text("Import Standard")')
    if (await importStandardButton.isVisible()) {
      await importStandardButton.click()
      await page.waitForTimeout(1000)
    }

    let continueButton = page.locator('button:has-text("Continue")').first()
    if (await continueButton.isVisible()) {
      await continueButton.click()
      await page.waitForTimeout(1000)
    }

    await page.screenshot({ path: 'tests/screenshots/budget-direct-02-after-cost-codes.png', fullPage: true })

    // Step 2: Directory - Skip
    const skipButton1 = page.locator('button:has-text("Skip for now")').first()
    if (await skipButton1.isVisible()) {
      await skipButton1.click()
      await page.waitForTimeout(1000)
    }

    await page.screenshot({ path: 'tests/screenshots/budget-direct-03-after-directory.png', fullPage: true })

    // Step 3: Documents - Skip
    const skipButton2 = page.locator('button:has-text("Skip for now")').first()
    if (await skipButton2.isVisible()) {
      await skipButton2.click()
      await page.waitForTimeout(1000)
    }

    await page.screenshot({ path: 'tests/screenshots/budget-direct-04-budget-page.png', fullPage: true })

    // Now we should be on Budget Setup step
    // Verify we're on the budget page
    const budgetHeading = page.locator('text=/Budget Setup|Budget Summary/i').first()
    await expect(budgetHeading).toBeVisible()

    console.log('✓ On Budget Setup page')

    // Verify "Add Line Item" button is NOT present
    const addLineItemButton = page.locator('button:has-text("Add Line Item")')
    await expect(addLineItemButton).not.toBeVisible()
    console.log('✓ Confirmed: Add Line Item button is not present (correct)')

    // Enter amounts in first 3 budget line items
    const amountInputs = page.locator('input[placeholder="0.00"]')
    const inputCount = await amountInputs.count()
    console.log(`Found ${inputCount} amount input fields`)

    if (inputCount >= 1) {
      await amountInputs.nth(0).fill('50000')
      await page.waitForTimeout(300)
      console.log('✓ Entered $50,000 in first line item')
    }

    if (inputCount >= 2) {
      await amountInputs.nth(1).fill('75000')
      await page.waitForTimeout(300)
      console.log('✓ Entered $75,000 in second line item')
    }

    if (inputCount >= 3) {
      await amountInputs.nth(2).fill('100000')
      await page.waitForTimeout(300)
      console.log('✓ Entered $100,000 in third line item')
    }

    await page.screenshot({ path: 'tests/screenshots/budget-direct-05-amounts-entered.png', fullPage: true })

    // Verify budget summary updated
    const budgetSummary = page.locator('text=/\\$[0-9,]+/').first()
    const summaryText = await budgetSummary.textContent()
    console.log(`Budget summary shows: ${summaryText}`)

    // Click Continue to save budget
    continueButton = page.locator('button:has-text("Continue")').first()
    await expect(continueButton).toBeEnabled()
    await continueButton.click()

    console.log('✓ Clicked Continue button to save budget')

    // Wait for save operation
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'tests/screenshots/budget-direct-06-after-save-attempt.png', fullPage: true })

    // Check for ANY error alerts
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: /error|failed/i })
    const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasError) {
      const errorText = await errorAlert.textContent()
      console.log(`❌ ERROR FOUND: ${errorText}`)
      await page.screenshot({ path: 'tests/screenshots/budget-direct-ERROR.png', fullPage: true })
      throw new Error(`Budget save failed: ${errorText}`)
    }

    console.log('✓ No error alerts detected')

    // Verify we moved to next step (should be on Contract or completion page)
    const stillOnBudget = await budgetHeading.isVisible({ timeout: 2000 }).catch(() => false)

    if (stillOnBudget) {
      console.log('⚠ Still on budget page after save - checking for errors...')
      await page.screenshot({ path: 'tests/screenshots/budget-direct-STUCK.png', fullPage: true })
      throw new Error('Still on budget page after clicking Continue - save may have failed silently')
    }

    console.log('✓ Successfully advanced past budget step')

    // Take final screenshot
    await page.screenshot({ path: 'tests/screenshots/budget-direct-07-final.png', fullPage: true })

    // Verify we're on a different page (Contract step or Complete step)
    const currentUrl = page.url()
    console.log(`Current URL after budget save: ${currentUrl}`)

    console.log('✅ TEST PASSED: Budget save completed successfully!')
  })
})
