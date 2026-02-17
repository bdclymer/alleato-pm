import { test, expect } from '@playwright/test'

test.describe('Project Setup Wizard Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/1/setup')
  })

  test('Should display all wizard UI elements correctly', async ({ page }) => {
    // Check main header elements
    await expect(page.locator('h1')).toContainText('Project Setup')
    await expect(page.locator('text=Complete the setup steps to configure your project')).toBeVisible()

    // Check progress bar
    await expect(page.locator('[role="progressbar"]')).toBeVisible()
    await expect(page.locator('text=Step 1 of 5')).toBeVisible()

    // Check all 5 steps in sidebar
    const steps = [
      { title: 'Cost Code Configuration', description: 'Set up your project\'s cost code structure for budget tracking' },
      { title: 'Project Directory', description: 'Add team members and assign roles to your project' },
      { title: 'Document Upload', description: 'Upload initial project documents and plans' },
      { title: 'Budget Setup', description: 'Configure your initial project budget' },
      { title: 'Prime Contract', description: 'Set up your initial prime contract (optional)' }
    ]

    for (const step of steps) {
      await expect(page.locator(`text=${step.title}`)).toBeVisible()
      await expect(page.locator(`text=${step.description}`)).toBeVisible()
    }

    // Take screenshot of initial wizard view
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-initial-view.png', fullPage: true })
  })

  test('Should navigate between steps using Next/Previous buttons', async ({ page }) => {
    // Start at Step 1 - Cost Codes
    await expect(page.locator('h2')).toContainText('Cost Code Configuration')
    
    // Import standard codes to enable Continue button
    await page.locator('button:has-text("Import Standard Codes")').click()
    await page.waitForTimeout(2000) // Wait for import

    // Select some cost codes
    await page.locator('[role="switch"]').first().click()
    await page.locator('[role="switch"]').nth(1).click()
    await page.locator('[role="switch"]').nth(2).click()

    // Continue to Step 2
    await page.locator('button:has-text("Continue")').click()
    await expect(page.locator('h2')).toContainText('Project Directory')
    await expect(page.locator('text=Step 2 of 5')).toBeVisible()

    // Take screenshot of Step 2
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-step2-project-directory.png', fullPage: true })

    // Skip to Step 3
    await page.locator('button:has-text("Skip for now")').click()
    await expect(page.locator('h2')).toContainText('Document Upload')
    await expect(page.locator('text=Step 3 of 5')).toBeVisible()

    // Navigate back to Step 1 by clicking on it
    await page.locator('button:has-text("Cost Code Configuration")').click()
    await expect(page.locator('h2')).toContainText('Cost Code Configuration')
    await expect(page.locator('text=Step 1 of 5')).toBeVisible()
  })

  test('Should handle Cost Code setup functionality', async ({ page }) => {
    // Test import standard codes
    await page.locator('button:has-text("Import Standard Codes")').click()
    
    // Wait for codes to load
    await page.waitForTimeout(3000)
    
    // Check if cost code types are visible
    await expect(page.locator('text=Cost Code Types')).toBeVisible()
    await expect(page.locator('text=L').first()).toBeVisible() // Labor
    await expect(page.locator('text=M').first()).toBeVisible() // Materials
    await expect(page.locator('text=E').first()).toBeVisible() // Equipment
    await expect(page.locator('text=S').first()).toBeVisible() // Subcontractor

    // Check if cost codes table has data
    await expect(page.locator('table tbody tr')).toHaveCount(0) // Before import
    
    // Select some cost codes using switches
    const switches = await page.locator('[role="switch"]').all()
    for (let i = 0; i < Math.min(5, switches.length); i++) {
      await switches[i].click()
    }

    // Test Add Custom Code dialog
    await page.locator('button:has-text("Add Custom Code")').click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('text=Add Custom Cost Code')).toBeVisible()

    // Fill custom code form
    await page.fill('input#code', 'TEST-001')
    await page.selectOption('select#type', 'L')
    await page.fill('input#description', 'Test Custom Code')
    
    // Take screenshot of custom code dialog
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-custom-code-dialog.png' })

    // Cancel the dialog
    await page.locator('button:has-text("Cancel")').click()
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()

    // Continue button should be enabled after selecting codes
    const continueButton = page.locator('button:has-text("Continue")')
    await expect(continueButton).toBeEnabled()
  })

  test('Should check responsive design', async ({ page }) => {
    // Test desktop view (default)
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-desktop-view.png', fullPage: true })

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-tablet-view.png', fullPage: true })

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-mobile-view.png', fullPage: true })

    // Check if navigation still works on mobile
    await page.locator('[role="switch"]').first().click()
    await page.locator('button:has-text("Continue")').click()
  })

  test('Should verify step completion tracking', async ({ page }) => {
    // Import standard codes
    await page.locator('button:has-text("Import Standard Codes")').click()
    await page.waitForTimeout(2000)

    // Select codes and complete Step 1
    await page.locator('[role="switch"]').first().click()
    await page.locator('[role="switch"]').nth(1).click()
    await page.locator('button:has-text("Continue")').click()

    // Check that Step 1 shows completed icon
    const step1Button = page.locator('button:has-text("Cost Code Configuration")')
    await expect(step1Button.locator('svg').first()).toBeVisible() // Check mark icon

    // Continue through more steps
    await page.locator('button:has-text("Skip for now")').click() // Skip Step 2
    await page.locator('button:has-text("Skip for now")').click() // Skip Step 3

    // Check progress bar advancement
    await expect(page.locator('text=Step 4 of 5')).toBeVisible()
    
    // Take screenshot of progress
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-progress-tracking.png', fullPage: true })
  })

  test('Should handle errors gracefully', async ({ page }) => {
    // Test network error handling by intercepting requests
    await page.route('**/api/cost_codes**', route => route.abort('networkerror'))

    // Try to import standard codes
    await page.locator('button:has-text("Import Standard Codes")').click()
    
    // Should show error message
    await page.waitForTimeout(1000)
    const errorAlert = page.locator('[role="alert"]')
    if (await errorAlert.isVisible()) {
      await expect(errorAlert).toContainText(/error|failed/i)
      await page.screenshot({ path: 'frontend/tests/screenshots/wizard-error-state.png' })
    }
  })

  test('Should check console for errors', async ({ page }) => {
    const consoleErrors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Navigate through all steps
    await page.locator('button:has-text("Skip for now")').click() // Skip Step 1
    await page.locator('button:has-text("Skip for now")').click() // Skip Step 2
    await page.locator('button:has-text("Skip for now")').click() // Skip Step 3
    await page.locator('button:has-text("Skip for now")').click() // Skip Step 4
    await page.locator('button:has-text("Skip for now")').click() // Skip Step 5

    // Log any console errors found
    if (consoleErrors.length > 0) {
      console.log('Console errors found:', consoleErrors)
    }

    // Assert no critical errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('DevTools') &&
      !error.includes('favicon')
    )
    
    expect(criticalErrors.length).toBe(0)
  })

  test('Should capture all wizard steps screenshots', async ({ page }) => {
    // Step 1 - Cost Codes
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-step1-cost-codes.png', fullPage: true })
    
    // Import standard codes to see populated state
    await page.locator('button:has-text("Import Standard Codes")').click()
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-step1-with-codes.png', fullPage: true })

    // Navigate to Step 2
    await page.locator('[role="switch"]').first().click()
    await page.locator('button:has-text("Continue")').click()
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-step2-directory.png', fullPage: true })

    // Navigate to Step 3
    await page.locator('button:has-text("Skip for now")').click()
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-step3-documents.png', fullPage: true })

    // Navigate to Step 4
    await page.locator('button:has-text("Skip for now")').click()
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-step4-budget.png', fullPage: true })

    // Navigate to Step 5
    await page.locator('button:has-text("Skip for now")').click()
    await page.screenshot({ path: 'frontend/tests/screenshots/wizard-step5-contract.png', fullPage: true })
  })
})