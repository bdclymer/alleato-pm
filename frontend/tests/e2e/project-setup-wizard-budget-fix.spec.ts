import { createTestProject } from '../helpers/bootstrap';
import { test, expect } from '../fixtures/index'


test.describe.skip('Project Setup Wizard - Budget Save Fix', () => {
  test.beforeEach(async ({ page, authenticatedRequest }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
test.skip(true, "Legacy budget spec - migrated to budget-core");

    projectId = project.project.id;
  });

  test('should complete full project setup wizard including budget save', async ({ page }) => {
    // Login first using dev login
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Navigate to project creation form
    await page.goto('/form-project')
    await page.waitForLoadState('networkidle')

    // Step 1: Fill out project form using autofill
    await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-01-form.png', fullPage: true })

    const autofillButton = page.locator('button:has-text("Auto-fill")')
    if (await autofillButton.isVisible()) {
      await autofillButton.click()
      await page.waitForTimeout(500)
    }

    // Manually fill country field (required field not handled by autofill)
    const countryInput = page.locator('input[name="country"]')
    if (await countryInput.isVisible()) {
      await countryInput.fill('USA')
      await page.waitForTimeout(300)
    }

    // Submit project form
    await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-02-form-filled.png', fullPage: true })
    const submitButton = page.locator('button:has-text("Create Project")')
    await submitButton.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Should redirect to project setup wizard
    await expect(page).toHaveURL(/\/project-setup-wizard\?projectId=\d+/)
    await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-03-wizard-start.png', fullPage: true })

    // Step 2: Cost Codes Setup - Import default codes
    const importButton = page.locator('button:has-text("Import Standard")')
    if (await importButton.isVisible()) {
      await importButton.click()
      await page.waitForTimeout(1000)
    }

    await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-04-cost-codes.png', fullPage: true })

    // Continue to next step
    let continueButton = page.locator('button:has-text("Continue")')
    await continueButton.click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-05-after-cost-codes.png', fullPage: true })

    // Step 3: Directory Setup - Skip
    const skipButton = page.locator('button:has-text("Skip for now")')
    if (await skipButton.isVisible()) {
      await skipButton.click()
      await page.waitForTimeout(1000)
    }
    await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-06-after-directory.png', fullPage: true })

    // Step 4: Documents Setup - Skip
    const skipButton2 = page.locator('button:has-text("Skip for now")')
    if (await skipButton2.isVisible()) {
      await skipButton2.click()
      await page.waitForTimeout(1000)
    }
    await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-07-after-documents.png', fullPage: true })

    // Step 5: Budget Setup - Enter amounts for some cost codes
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-08-budget-page.png', fullPage: true })

    // Check that "Add Line Item" button is NOT present (we removed it)
    const addLineItemButton = page.locator('button:has-text("Add Line Item")')
    await expect(addLineItemButton).not.toBeVisible()
    console.log('✓ Confirmed: Add Line Item button is not present')

    // Find the first few amount input fields and enter values
    const amountInputs = page.locator('input[placeholder="0.00"]').filter({ hasText: '' })
    const count = await amountInputs.count()
    console.log(`Found ${count} amount input fields`)

    // Enter amounts in first 3 budget items
    if (count >= 1) {
      await amountInputs.nth(0).fill('50000')
      await page.waitForTimeout(300)
    }
    if (count >= 2) {
      await amountInputs.nth(1).fill('75000')
      await page.waitForTimeout(300)
    }
    if (count >= 3) {
      await amountInputs.nth(2).fill('100000')
      await page.waitForTimeout(300)
    }

    await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-09-budget-with-amounts.png', fullPage: true })

    // Verify budget summary shows total
    const budgetSummary = page.locator('text=/\\$[0-9,]+/').first()
    const summaryText = await budgetSummary.textContent()
    console.log(`Budget summary: ${summaryText}`)
    expect(summaryText).toMatch(/\$22[0-9],000/)

    // Click Continue to save budget
    continueButton = page.locator('button:has-text("Continue")')
    await continueButton.click()

    // Wait for save operation
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-10-after-budget-save.png', fullPage: true })

    // Check for error messages
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: /error|failed/i })
    const hasError = await errorAlert.isVisible()

    if (hasError) {
      const errorText = await errorAlert.textContent()
      console.log(`❌ ERROR FOUND: ${errorText}`)
      await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-ERROR.png', fullPage: true })
      throw new Error(`Budget save failed: ${errorText}`)
    }

    console.log('✓ No error alerts found - budget save successful')

    // Step 6: Contract Setup - Should be on this step now
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-11-contract-page.png', fullPage: true })

    // Verify we're on contract step (presence of contract form elements)
    const contractSection = page.locator('text=/Contract|Prime Contract|Subcontract/i')
    const onContractStep = await contractSection.isVisible()

    if (onContractStep) {
      console.log('✓ Successfully advanced to Contract step - budget save confirmed working!')
    } else {
      console.log('⚠ Not on contract step - checking current location')
      const currentUrl = page.url()
      console.log(`Current URL: ${currentUrl}`)
    }

    // Take final screenshot
    await page.screenshot({ path: 'tests/screenshots/wizard-budget-fix-12-final.png', fullPage: true })

    // Final assertion: we should NOT be stuck on budget step
    const budgetHeading = page.locator('h3:has-text("Budget Setup")')
    const stillOnBudget = await budgetHeading.isVisible()
    expect(stillOnBudget).toBe(false)

    console.log('✅ TEST PASSED: Full project setup wizard completed successfully including budget save')
  })
})
