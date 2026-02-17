import { test, expect } from '@playwright/test'

test.describe('Project Home Page - Prime Contracts and Commitments Sections', () => {
  test('should display Prime Contracts and Commitments sections', async ({ page }) => {
    // Navigate to the project home page
    await page.goto('/67/home')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check for Prime Contracts section
    const primeContractsHeading = page.getByRole('heading', { name: /prime contracts/i })
    await expect(primeContractsHeading).toBeVisible()

    // Check for Commitments section
    const commitmentsHeading = page.getByRole('heading', { name: /commitments/i })
    await expect(commitmentsHeading).toBeVisible()

    // Verify Prime Contracts "Add" button - use exact href match
    const primeContractsAddButton = page.getByRole('link', { name: /add/i }).filter({ hasText: 'Add' }).and(page.locator('[href="/67/contracts/new"]'))
    await expect(primeContractsAddButton).toBeVisible()

    // Verify Commitments "Add" button - use exact href match
    const commitmentsAddButton = page.getByRole('link', { name: /add/i }).filter({ hasText: 'Add' }).and(page.locator('[href="/67/commitments/new"]'))
    await expect(commitmentsAddButton).toBeVisible()

    // Take a screenshot for visual verification
    await page.screenshot({
      path: 'tests/screenshots/project-home-with-contracts-and-commitments.png',
      fullPage: true
    })
  })

  test('Prime Contracts "Add" button links to correct page', async ({ page }) => {
    await page.goto('/67/home')
    await page.waitForLoadState('networkidle')

    // Find and click the Prime Contracts "Add" button using exact href
    const primeContractsAddButton = page.locator('a[href="/67/contracts/new"]').filter({ hasText: 'Add' }).first()
    await primeContractsAddButton.click()

    // Verify we're on the contracts new page
    await expect(page).toHaveURL(/\/67\/contracts\/new/)
  })

  test('Commitments "Add" button links to correct page', async ({ page }) => {
    await page.goto('/67/home')
    await page.waitForLoadState('networkidle')

    // Find and click the Commitments "Add" button using exact href
    const commitmentsAddButton = page.locator('a[href="/67/commitments/new"]').filter({ hasText: 'Add' }).first()
    await commitmentsAddButton.click()

    // Verify we're on the commitments new page
    await expect(page).toHaveURL(/\/67\/commitments\/new/)
  })
})
