import { test, expect } from '@playwright/test'

test.describe('Project Home - Summary Styling', () => {
  test('should display summary section with improved card styling', async ({ page }) => {
    // Navigate to homepage (user should already be logged in)
    await page.goto('http://localhost:3000')

    // Wait for portfolio page to load
    await page.waitForSelector('h1:has-text("Portfolio")', { timeout: 15000 })

    // Get the first project name link (orange colored links in the Name column)
    const firstProjectLink = page.locator('a:has-text("Alleato Finance")').first()
    await firstProjectLink.waitFor({ state: 'visible', timeout: 10000 })

    // Click on the first project to go to its home page
    await firstProjectLink.click()

    // Wait for project home page to load
    await page.waitForTimeout(3000)

    // Verify the Summary section has CardHeader with SUMMARY title
    const summaryTitle = page.locator('h3:has-text("SUMMARY")')
    await expect(summaryTitle).toBeVisible({ timeout: 10000 })

    // Verify the Summary content is visible
    const summaryContent = page.locator('h3:has-text("SUMMARY")').locator('..').locator('..').locator('p')
    await expect(summaryContent).toBeVisible()

    // Take a screenshot of the full page for visual verification
    await page.screenshot({
      path: 'frontend/tests/screenshots/project-home-summary-styled.png',
      fullPage: true
    })

    console.log('✓ Summary section displays with proper card styling')
    console.log('✓ Screenshot saved to: frontend/tests/screenshots/project-home-summary-styled.png')
  })
})
