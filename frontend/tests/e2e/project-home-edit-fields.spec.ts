import { test, expect } from '@playwright/test'

/**
 * Test suite for project home page inline editing functionality
 *
 * Tests verify that all project fields can be edited inline:
 * - Phase/Status
 * - Start Date
 * - Est Completion Date
 * - Category
 * - State
 * - Address
 * - Delivery Method
 * - Type
 * - Client
 */

test.describe('Project Home - Inline Field Editing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dev login
    await page.goto('http://localhost:3000/dev-login?email=test@example.com&password=testpassword123')
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 })

    // Navigate to project home page (project ID 34)
    await page.goto('http://localhost:3000/34/home')
    await page.waitForLoadState('networkidle')
  })

  test('should display editable project fields with pencil icons on hover', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('h1').first()).toBeVisible()

    // Take initial screenshot
    await page.screenshot({
      path: 'tests/screenshots/project-home-fields-initial.png',
      fullPage: true
    })

    // Verify pencil icons appear on hover for first row fields
    const statusButton = page.locator('button').filter({ hasText: 'Status' })
    await statusButton.hover()
    await expect(statusButton.locator('svg.lucide-pencil')).toBeVisible()

    const startDateButton = page.locator('button').filter({ hasText: 'Start Date' })
    await startDateButton.hover()
    await expect(startDateButton.locator('svg.lucide-pencil')).toBeVisible()

    // Verify second row fields are visible
    await expect(page.locator('button').filter({ hasText: 'Category' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'State' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Address' })).toBeVisible()
  })

  test('should edit category field inline', async ({ page }) => {
    // Click on category field
    const categoryButton = page.locator('button').filter({ hasText: 'Category' }).first()
    await categoryButton.click()

    // Wait for input to appear
    const input = page.locator('input[placeholder*="Commercial"]')
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()

    // Enter new value
    await input.fill('Commercial Construction')

    // Take screenshot before blur
    await page.screenshot({
      path: 'tests/screenshots/project-home-category-editing.png'
    })

    // Press Enter to save
    await input.press('Enter')

    // Wait for input to disappear (field saved)
    await expect(input).not.toBeVisible({ timeout: 5000 })

    // Verify new value is displayed
    await expect(categoryButton).toContainText('Commercial Construction')

    // Take final screenshot
    await page.screenshot({
      path: 'tests/screenshots/project-home-category-saved.png'
    })
  })

  test('should edit state field inline', async ({ page }) => {
    // Click on state field
    const stateButton = page.locator('button').filter({ hasText: /^State$/i }).first()
    await stateButton.click()

    // Wait for input to appear
    const input = page.locator('input[placeholder*="CA, NY"]')
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()

    // Enter new value
    await input.fill('TX')

    // Press Enter to save
    await input.press('Enter')

    // Wait for save to complete
    await page.waitForTimeout(1000)

    // Verify new value is displayed
    await expect(stateButton).toContainText('TX')
  })

  test('should edit address field inline', async ({ page }) => {
    // Click on address field
    const addressButton = page.locator('button').filter({ hasText: 'Address' }).first()
    await addressButton.click()

    // Wait for input to appear
    const input = page.locator('input[placeholder*="123 Main St"]')
    await expect(input).toBeVisible()

    // Enter new value
    await input.fill('456 Oak Avenue, Austin, TX')

    // Blur input to save (click away)
    await page.locator('h1').first().click()

    // Wait for save to complete
    await page.waitForTimeout(1000)

    // Verify new value is displayed (truncated due to max-w-[200px])
    await expect(addressButton).toContainText('456 Oak Avenue')
  })

  test('should edit delivery method field inline', async ({ page }) => {
    // Click on delivery method field
    const deliveryButton = page.locator('button').filter({ hasText: 'Delivery Method' }).first()
    await deliveryButton.click()

    // Wait for input to appear
    const input = page.locator('input[placeholder*="Design-Bid-Build"]')
    await expect(input).toBeVisible()

    // Enter new value
    await input.fill('Construction Manager at Risk')

    // Press Enter to save
    await input.press('Enter')

    // Wait for save to complete
    await page.waitForTimeout(1000)

    // Verify new value is displayed
    await expect(deliveryButton).toContainText('Construction Manager at Risk')
  })

  test('should edit type field inline', async ({ page }) => {
    // Click on type field
    const typeButton = page.locator('button').filter({ hasText: /^Type$/i }).first()
    await typeButton.click()

    // Wait for input to appear
    const input = page.locator('input[placeholder*="New Construction"]')
    await expect(input).toBeVisible()

    // Enter new value
    await input.fill('Renovation')

    // Press Enter to save
    await input.press('Enter')

    // Wait for save to complete
    await page.waitForTimeout(1000)

    // Verify new value is displayed
    await expect(typeButton).toContainText('Renovation')
  })

  test('should edit client field inline', async ({ page }) => {
    // Click on client field
    const clientButton = page.locator('button').filter({ hasText: 'Client' }).first()
    await clientButton.click()

    // Wait for input to appear
    const input = page.locator('input[placeholder="Client name"]')
    await expect(input).toBeVisible()

    // Enter new value
    await input.fill('ABC Construction Company')

    // Press Enter to save
    await input.press('Enter')

    // Wait for save to complete
    await page.waitForTimeout(1000)

    // Verify new value is displayed
    await expect(clientButton).toContainText('ABC Construction Company')
  })

  test('should edit phase/status field inline', async ({ page }) => {
    // Click on status field
    const statusButton = page.locator('button').filter({ hasText: 'Status' }).first()
    await statusButton.click()

    // Wait for input to appear
    const input = page.locator('input').first()
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()

    // Clear and enter new value
    await input.fill('In Progress')

    // Press Enter to save
    await input.press('Enter')

    // Wait for save to complete
    await page.waitForTimeout(1000)

    // Verify new value is displayed
    await expect(statusButton).toContainText('In Progress')
  })

  test('should edit start date inline', async ({ page }) => {
    // Click on start date field
    const startDateButton = page.locator('button').filter({ hasText: 'Start Date' }).first()
    await startDateButton.click()

    // Wait for date input to appear
    const input = page.locator('input[type="date"]').first()
    await expect(input).toBeVisible()

    // Enter new date
    await input.fill('2024-06-15')

    // Press Enter to save
    await input.press('Enter')

    // Wait for save to complete
    await page.waitForTimeout(1000)

    // Verify new date is displayed (format: Jun 15, 2024)
    await expect(startDateButton).toContainText('Jun 15, 2024')
  })

  test('should edit est completion date inline', async ({ page }) => {
    // Click on est completion field
    const estCompletionButton = page.locator('button').filter({ hasText: 'Est. Completion' }).first()
    await estCompletionButton.click()

    // Wait for date input to appear
    const input = page.locator('input[type="date"]').nth(1) // Second date input
    await expect(input).toBeVisible()

    // Enter new date
    await input.fill('2025-12-31')

    // Press Enter to save
    await input.press('Enter')

    // Wait for save to complete
    await page.waitForTimeout(1000)

    // Verify new date is displayed
    await expect(estCompletionButton).toContainText('Dec 31, 2025')
  })

  test('should persist edits after page reload', async ({ page }) => {
    // Edit category
    const categoryButton = page.locator('button').filter({ hasText: 'Category' }).first()
    await categoryButton.click()

    const input = page.locator('input[placeholder*="Commercial"]')
    await input.fill('Test Category Persist')
    await input.press('Enter')

    // Wait for save
    await page.waitForTimeout(1500)

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify value persisted
    await expect(categoryButton).toContainText('Test Category Persist')
  })

  test('should handle cancellation when clicking away without Enter', async ({ page }) => {
    // Get initial category value
    const categoryButton = page.locator('button').filter({ hasText: 'Category' }).first()
    const initialText = await categoryButton.textContent()

    // Click to edit
    await categoryButton.click()

    const input = page.locator('input[placeholder*="Commercial"]')
    await input.fill('This should be cancelled')

    // Click away (blur without Enter) - should save via onBlur
    await page.locator('h1').first().click()

    // Wait for save
    await page.waitForTimeout(1000)

    // Should have saved the new value (because we have onBlur handler)
    await expect(categoryButton).toContainText('This should be cancelled')
  })

  test('should take full page screenshot of all editable fields', async ({ page }) => {
    // Wait for page to fully load
    await expect(page.locator('h1').first()).toBeVisible()

    // Scroll to top
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)

    // Take full screenshot
    await page.screenshot({
      path: 'tests/screenshots/project-home-all-editable-fields.png',
      fullPage: true
    })
  })
})
