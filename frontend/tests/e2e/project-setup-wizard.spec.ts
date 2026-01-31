import { test, expect } from '@playwright/test'

test.describe('Project Setup Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the project setup wizard
    // Using project ID 1 for testing
    await page.goto('/1/setup')
  })

  test('should display the wizard with all steps', async ({ page }) => {
    // Check that the wizard is displayed
    await expect(page.locator('h1')).toContainText('Project Setup')
    
    // Check that all steps are visible
    await expect(page.getByText('Cost Code Configuration')).toBeVisible()
    await expect(page.getByText('Project Directory')).toBeVisible()
    await expect(page.getByText('Document Upload')).toBeVisible()
    await expect(page.getByText('Budget Setup')).toBeVisible()
    await expect(page.getByText('Prime Contract')).toBeVisible()
    
    // Check that the first step is active
    await expect(page.getByText('Cost Code Configuration')).toHaveClass(/bg-primary/)
  })

  test('should navigate through wizard steps', async ({ page }) => {
    // Step 1: Cost Code Configuration
    await expect(page.locator('h2')).toContainText('Cost Code Configuration')
    
    // Import standard codes
    await page.getByRole('button', { name: /Import Standard Codes/i }).click()
    
    // Wait for codes to load
    await page.waitForTimeout(2000)
    
    // Select some cost codes
    const switches = page.locator('input[type="checkbox"][role="switch"]')
    await switches.first().click()
    await switches.nth(1).click()
    await switches.nth(2).click()
    
    // Continue to next step
    await page.getByRole('button', { name: 'Continue' }).click()
    
    // Step 2: Project Directory
    await expect(page.locator('h2')).toContainText('Project Directory')
    
    // Skip this step for now
    await page.getByRole('button', { name: 'Skip for now' }).click()
    
    // Step 3: Document Upload
    await expect(page.locator('h2')).toContainText('Document Upload')
    
    // Skip this step for now
    await page.getByRole('button', { name: 'Skip for now' }).click()
    
    // Step 4: Budget Setup
    await expect(page.locator('h2')).toContainText('Budget Setup')
    
    // Enter some budget values
    const amountInputs = page.locator('input[placeholder="0.00"]')
    await amountInputs.first().fill('10000')
    await amountInputs.nth(1).fill('20000')
    
    // Continue
    await page.getByRole('button', { name: 'Continue' }).click()
    
    // Step 5: Prime Contract
    await expect(page.locator('h2')).toContainText('Prime Contract')
    
    // Fill in contract details
    await page.locator('#title').fill('Test Prime Contract')
    await page.locator('#amount').fill('30000')
    
    // Complete setup
    await page.getByRole('button', { name: 'Complete Setup' }).click()
    
    // Should redirect to project home
    await expect(page).toHaveURL(/\/1\/home/)
  })

  test('should allow skipping optional steps', async ({ page }) => {
    // Cost codes - required, can't skip
    const skipButton = page.getByRole('button', { name: 'Skip for now' })
    await expect(skipButton).toBeDisabled()
    
    // Select at least one cost code to continue
    await page.locator('input[type="checkbox"][role="switch"]').first().click()
    await page.getByRole('button', { name: 'Continue' }).click()
    
    // Project Directory - required
    await expect(page.locator('h2')).toContainText('Project Directory')
    await expect(skipButton).toBeDisabled()
    
    // Add a company to continue
    await page.getByRole('button', { name: /Add Company/i }).click()
    
    // Select a role and skip company selection for now
    await page.getByRole('button', { name: 'Cancel' }).click()
    
    // Skip for now (since it's not actually required in our implementation)
    await skipButton.click()
    
    // Document Upload - optional
    await expect(page.locator('h2')).toContainText('Document Upload')
    await skipButton.click()
    
    // Budget Setup - required
    await expect(page.locator('h2')).toContainText('Budget Setup')
    
    // Enter at least one budget item
    await page.locator('input[placeholder="0.00"]').first().fill('5000')
    await page.getByRole('button', { name: 'Continue' }).click()
    
    // Prime Contract - optional
    await expect(page.locator('h2')).toContainText('Prime Contract')
    await skipButton.click()
    
    // Should redirect to project home
    await expect(page).toHaveURL(/\/1\/home/)
  })

  test('should show progress through the wizard', async ({ page }) => {
    // Check initial progress
    const progressBar = page.locator('[role="progressbar"]')
    await expect(progressBar).toHaveAttribute('aria-valuenow', '20')
    
    // Move to step 2
    await page.locator('input[type="checkbox"][role="switch"]').first().click()
    await page.getByRole('button', { name: 'Continue' }).click()
    
    // Check progress updated
    await expect(progressBar).toHaveAttribute('aria-valuenow', '40')
    
    // Continue through remaining steps
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await expect(progressBar).toHaveAttribute('aria-valuenow', '60')
    
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await expect(progressBar).toHaveAttribute('aria-valuenow', '80')
    
    await page.locator('input[placeholder="0.00"]').first().fill('5000')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100')
  })
})