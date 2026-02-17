import { test, expect } from '@playwright/test'

test.describe('Project Home - Collapsible Summary', () => {
  test('should have collapsible summary section', async ({ page }) => {
    // Navigate to project home page (using project ID 14 as example)
    await page.goto('/14/home')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check that the SUMMARY section is visible
    const summaryTitle = page.locator('text=SUMMARY').first()
    await expect(summaryTitle).toBeVisible()

    // Find the toggle button by looking for buttons in the card header
    const summaryCard = page.locator('text=SUMMARY').locator('..').locator('..')
    const toggleButton = summaryCard.locator('button').first()

    // Verify the toggle button exists
    await expect(toggleButton).toBeVisible()

    // The summary content should be visible initially (isOpen = true)
    const summaryContent = page.locator('.text-sm.text-gray-700.leading-relaxed').first()
    await expect(summaryContent).toBeVisible()

    // Take screenshot of expanded state
    await page.screenshot({
      path: 'frontend/tests/screenshots/project-home-summary-expanded.png',
      fullPage: false
    })

    // Click to collapse
    await toggleButton.click()
    await page.waitForTimeout(500) // Wait for animation

    // Summary content should now be hidden
    await expect(summaryContent).toBeHidden()

    // Take screenshot of collapsed state
    await page.screenshot({
      path: 'frontend/tests/screenshots/project-home-summary-collapsed.png',
      fullPage: false
    })

    // Click to expand again
    await toggleButton.click()
    await page.waitForTimeout(500) // Wait for animation

    // Summary content should be visible again
    await expect(summaryContent).toBeVisible()
  })
})
