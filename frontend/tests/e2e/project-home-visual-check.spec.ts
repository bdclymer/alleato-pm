import { test, expect } from '@playwright/test'

/**
 * Visual verification test for project home page editable fields
 *
 * This test simply verifies that all editable fields are visible
 * and takes screenshots for manual verification.
 */

test.describe('Project Home - Visual Verification', () => {
  test('should display all editable project fields', async ({ page }) => {
    // Navigate to dev login
    await page.goto('http://localhost:3000/dev-login?email=test@example.com&password=testpassword123')
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 })

    // Navigate to project home page (project ID 34)
    await page.goto('http://localhost:3000/34/home')
    await page.waitForLoadState('networkidle')

    // Wait for page header to load
    await expect(page.locator('h1').first()).toBeVisible()

    // Take screenshot of header section with all editable fields
    await page.screenshot({
      path: 'tests/screenshots/project-home-editable-header.png',
      clip: {
        x: 0,
        y: 0,
        width: 1280,
        height: 600
      }
    })

    // Verify first row fields exist
    await expect(page.locator('text=Status')).toBeVisible()
    await expect(page.locator('text=Start Date')).toBeVisible()
    await expect(page.locator('text=Est. Completion')).toBeVisible()

    // Verify second row fields exist (newly added)
    await expect(page.locator('text=Category')).toBeVisible()
    await expect(page.locator('text=State')).toBeVisible()
    await expect(page.locator('text=Address')).toBeVisible()
    await expect(page.locator('text=Delivery Method')).toBeVisible()
    await expect(page.locator('text=Type')).toBeVisible()
    await expect(page.locator('text=Client')).toBeVisible()

    // Hover over one field to show pencil icon
    await page.locator('button').filter({ hasText: /^Category$/i }).first().hover()
    await page.waitForTimeout(500) // Wait for hover animation

    // Take screenshot showing hover state with pencil icon
    await page.screenshot({
      path: 'tests/screenshots/project-home-category-hover.png',
      clip: {
        x: 0,
        y: 300,
        width: 600,
        height: 200
      }
    })

    // Full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/project-home-complete-view.png',
      fullPage: true
    })

    console.log('✅ All editable fields are visible on the page')
    console.log('✅ Screenshots saved to tests/screenshots/')
  })

  test('should show edit mode when clicking a field', async ({ page }) => {
    // Navigate to dev login
    await page.goto('http://localhost:3000/dev-login?email=test@example.com&password=testpassword123')
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 })

    // Navigate to project home page
    await page.goto('http://localhost:3000/34/home')
    await page.waitForLoadState('networkidle')

    // Click on category field to enter edit mode
    const categoryButton = page.locator('button').filter({ hasText: /Category/i }).first()
    await categoryButton.click()

    // Wait for input to appear
    await page.waitForTimeout(500)

    // Take screenshot of edit mode
    await page.screenshot({
      path: 'tests/screenshots/project-home-category-edit-mode.png',
      clip: {
        x: 0,
        y: 300,
        width: 800,
        height: 200
      }
    })

    // Verify input is focused
    const input = page.locator('input[placeholder*="Commercial"]')
    await expect(input).toBeVisible()

    console.log('✅ Edit mode activates when clicking a field')
  })
})
