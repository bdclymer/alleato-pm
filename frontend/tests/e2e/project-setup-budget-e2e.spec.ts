import { expect, test } from '@playwright/test'

test.describe('Project Setup - Budget Creation E2E', () => {
test.use({ storageState: '../../../tests/.auth/user.json' })
  test('should complete full budget setup flow in project wizard', async ({ page }) => {
    // Navigate to project setup page
    await page.goto('/118/setup')
    await page.waitForLoadState('networkidle')

    // Take initial screenshot
    await page.screenshot({
      path: 'tests/screenshots/budget-e2e-1-initial.png',
      fullPage: true
    })

    // ============================================
    // STEP 1: Navigate through wizard to Budget Setup
    // ============================================

    // Cost Code Configuration - click Continue
    await expect(page.getByRole('heading', { name: 'Cost Code Configuration' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForTimeout(1000)

    // Project Directory - skip
    await expect(page.getByRole('heading', { name: 'Project Directory' })).toBeVisible()
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForTimeout(1000)

    // Drawings - skip
    await expect(page.getByRole('heading', { name: 'Drawings' })).toBeVisible()
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForTimeout(1000)

    // Specifications - skip
    await expect(page.getByRole('heading', { name: 'Specifications' })).toBeVisible()
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForTimeout(1000)

    // Schedule - skip
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible()
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForTimeout(1000)

    // ============================================
    // STEP 2: Verify Budget Setup page loaded
    // ============================================
    await expect(page.getByRole('heading', { name: 'Budget Setup' })).toBeVisible()

    // Wait for data to load
    await page.waitForTimeout(2000)

    // Take screenshot of budget setup page
    await page.screenshot({
      path: 'tests/screenshots/budget-e2e-2-budget-page.png',
      fullPage: true
    })

    // Verify budget summary is visible
    await expect(page.getByText('Budget Summary')).toBeVisible()

    // Initial budget should be $0
    const initialBudget = page.locator('text=/\\$0/')
    await expect(initialBudget.first()).toBeVisible()

    // ============================================
    // STEP 3: Verify Manual Entry tab is active
    // ============================================
    await expect(page.getByRole('tab', { name: 'Manual Entry' })).toHaveAttribute('data-state', 'active')

    // Verify table headers are present
    await expect(page.getByRole('columnheader', { name: 'Cost Code', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Description', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Quantity', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Unit', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Unit Price', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Total', exact: true })).toBeVisible()

    // ============================================
    // STEP 4: Fill in budget line items manually
    // ============================================

    // Get all table rows (excluding header)
    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()

    console.warn(`Found ${rowCount} budget line items to fill`)

    // Fill in first 3 line items with test data
    const testData = [
      { description: 'Site Preparation', quantity: '100', unit: 'SF', unitPrice: '50', expectedTotal: 5000 },
      { description: 'Foundation Work', quantity: '50', unit: 'CY', unitPrice: '200', expectedTotal: 10000 },
      { description: 'Framing Labor', quantity: '200', unit: 'HR', unitPrice: '75', expectedTotal: 15000 },
    ]

    for (let i = 0; i < Math.min(3, rowCount); i++) {
      const row = rows.nth(i)
      const data = testData[i]

      // Fill description
      const descInput = row.locator('input[placeholder="Enter description"]')
      await descInput.click()
      await descInput.fill(data.description)

      // Fill quantity
      const qtyInput = row.locator('input[placeholder="0"]').first()
      await qtyInput.click()
      await qtyInput.fill(data.quantity)

      // Fill unit
      const unitInput = row.locator('input[placeholder="EA"]')
      await unitInput.click()
      await unitInput.fill(data.unit)

      // Fill unit price
      const priceInput = row.locator('input[placeholder="0.00"]').first()
      await priceInput.click()
      await priceInput.fill(data.unitPrice)

      // Wait for calculation
      await page.waitForTimeout(500)

      // Verify total was calculated (quantity * unit price)
      const totalInput = row.locator('input[placeholder="0.00"]').nth(1)
      const totalValue = await totalInput.inputValue()
      const calculatedTotal = parseFloat(totalValue)

      expect(calculatedTotal).toBe(data.expectedTotal)
      console.warn(`Row ${i + 1}: Total calculated correctly: $${calculatedTotal}`)
    }

    // Take screenshot after filling data
    await page.screenshot({
      path: 'tests/screenshots/budget-e2e-3-filled-data.png',
      fullPage: true
    })

    // ============================================
    // STEP 5: Verify Budget Summary updated
    // ============================================
    const expectedTotalBudget = testData.reduce((sum, item) => sum + item.expectedTotal, 0)

    // Wait for summary to update
    await page.waitForTimeout(1000)

    // Verify total budget shows correct amount
    const budgetSummary = page.locator(`text=/\\$${expectedTotalBudget.toLocaleString()}/`)
    await expect(budgetSummary.first()).toBeVisible()

    console.warn(`Budget summary shows correct total: $${expectedTotalBudget.toLocaleString()}`)

    // Take screenshot of updated summary
    await page.screenshot({
      path: 'tests/screenshots/budget-e2e-4-summary-updated.png',
      fullPage: true
    })

    // ============================================
    // STEP 6: Verify Continue button is enabled
    // ============================================
    const continueButton = page.getByRole('button', { name: /continue/i }).last()
    await expect(continueButton).toBeEnabled()

    // ============================================
    // STEP 7: Save budget and continue
    // ============================================

    // Set up network request listener to verify API call
    const apiPromise = page.waitForResponse(
      response => response.url().includes('/api/projects/118/budget') && response.request().method() === 'POST'
    )

    // Click Continue to save budget
    await continueButton.click()

    // Wait for API call to complete
    const apiResponse = await apiPromise

    // Verify API call succeeded
    expect(apiResponse.status()).toBe(200)
    console.warn('✅ Budget saved successfully via API')

    // Wait for navigation to next step
    await page.waitForTimeout(2000)

    // Take final screenshot
    await page.screenshot({
      path: 'tests/screenshots/budget-e2e-5-saved.png',
      fullPage: true
    })

    // ============================================
    // STEP 8: Verify moved to next step (Contract)
    // ============================================
    await expect(page.getByRole('heading', { name: 'Prime Contract', exact: true })).toBeVisible()

    console.warn('Successfully moved to Prime Contract step after saving budget')

    // ============================================
    // VERIFICATION COMPLETE
    // ============================================
    console.warn('✅ Budget E2E test completed successfully')
    console.warn(`✅ Created ${testData.length} budget line items`)
    console.warn(`✅ Total budget: $${expectedTotalBudget.toLocaleString()}`)
    console.warn('✅ Budget saved via API')
    console.warn('✅ Progressed to next wizard step')
  })

  test('should show error when trying to save empty budget', async ({ page }) => {
    // Navigate to project setup page
    await page.goto('/118/setup')
    await page.waitForLoadState('networkidle')

    // Navigate to Budget Setup step
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForTimeout(1000)

    // Verify on Budget Setup page
    await expect(page.getByRole('heading', { name: 'Budget Setup' })).toBeVisible()
    await page.waitForTimeout(2000)

    // Continue button should be disabled when budget is $0
    const continueButton = page.getByRole('button', { name: /continue/i }).last()
    await expect(continueButton).toBeDisabled()

    console.warn('✅ Continue button correctly disabled when budget is $0')
  })

  test('should allow skipping budget setup', async ({ page }) => {
    // Navigate to project setup page
    await page.goto('/118/setup')
    await page.waitForLoadState('networkidle')

    // Navigate to Budget Setup step
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForTimeout(1000)

    // Verify on Budget Setup page
    await expect(page.getByRole('heading', { name: 'Budget Setup' })).toBeVisible()
    await page.waitForTimeout(2000)

    // Click Skip for now
    const skipButton = page.getByRole('button', { name: 'Skip for now' })
    await skipButton.click()
    await page.waitForTimeout(1000)

    // Should move to next step
    await expect(page.getByRole('heading', { name: 'Prime Contract', exact: true })).toBeVisible()

    console.warn('✅ Budget setup skipped successfully')
  })
})
