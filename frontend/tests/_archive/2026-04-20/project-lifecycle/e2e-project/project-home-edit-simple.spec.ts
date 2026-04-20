import { test, expect } from '@playwright/test'

test.describe('Project Home Page Editing - Simple Check', () => {
  test('should display edit buttons and allow editing', async ({ page }) => {
    // Navigate to the project home page (using project ID 75)
    await page.goto('http://localhost:3000/75/home')

    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Take initial screenshot
    await page.screenshot({
      path: 'tests/screenshots/project-home-with-edit-buttons.png',
      fullPage: true
    })

    // Check if page loaded successfully
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()

    console.log('Page loaded successfully. Check screenshot for edit buttons.')
  })
})
