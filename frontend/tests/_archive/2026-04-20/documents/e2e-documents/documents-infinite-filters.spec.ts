import { test, expect } from '@playwright/test'

test.describe('Documents Infinite - Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/documents-infinite')
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
  })

  test('should load documents on page load', async ({ page }) => {
    // Check that the page title is visible
    await expect(page.getByRole('heading', { name: 'Documents Infinite Query Demo' })).toBeVisible()

    // Wait for initial data to load (should see cards or "no documents" message)
    await page.waitForTimeout(2000)

    // Take a screenshot of the initial state
    await page.screenshot({ path: 'frontend/tests/screenshots/documents-infinite-01-initial.png', fullPage: true })
  })

  test('should filter by document type', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(2000)

    // Get initial document count
    const initialCountText = await page.locator('text=/Showing \\d+ of \\d+ documents/').textContent()
    console.log('Initial count:', initialCountText)

    // Click on the type filter dropdown
    await page.getByRole('combobox').first().click()

    // Select "Meeting" type
    await page.getByRole('option', { name: 'Meeting' }).click()

    // Wait for the filter to apply and data to reload
    await page.waitForTimeout(2000)

    // Check that the count shows "(filtered)"
    await expect(page.locator('text=/Showing \\d+ of \\d+ documents \\(filtered\\)/')).toBeVisible()

    // Take a screenshot after filtering
    await page.screenshot({ path: 'frontend/tests/screenshots/documents-infinite-02-type-filter.png', fullPage: true })
  })

  test('should filter by category', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(2000)

    // Click on the category filter (second dropdown)
    const dropdowns = await page.getByRole('combobox').all()
    await dropdowns[1].click()

    // Select "Financial" category
    await page.getByRole('option', { name: 'Financial' }).click()

    // Wait for filter to apply
    await page.waitForTimeout(2000)

    // Take a screenshot
    await page.screenshot({ path: 'frontend/tests/screenshots/documents-infinite-03-category-filter.png', fullPage: true })
  })

  test('should filter by status', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(2000)

    // Click on the status filter (third dropdown)
    const dropdowns = await page.getByRole('combobox').all()
    await dropdowns[2].click()

    // Select "Active" status
    await page.getByRole('option', { name: 'Active' }).click()

    // Wait for filter to apply
    await page.waitForTimeout(2000)

    // Take a screenshot
    await page.screenshot({ path: 'frontend/tests/screenshots/documents-infinite-04-status-filter.png', fullPage: true })
  })

  test('should apply multiple filters simultaneously', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(2000)

    // Apply type filter
    const dropdowns = await page.getByRole('combobox').all()
    await dropdowns[0].click()
    await page.getByRole('option', { name: 'Meeting' }).click()
    await page.waitForTimeout(1000)

    // Apply category filter
    await dropdowns[1].click()
    await page.getByRole('option', { name: 'Technical' }).click()
    await page.waitForTimeout(1000)

    // Apply status filter
    await dropdowns[2].click()
    await page.getByRole('option', { name: 'Active' }).click()
    await page.waitForTimeout(2000)

    // Verify filtered indicator is shown
    await expect(page.locator('text=/Showing \\d+ of \\d+ documents \\(filtered\\)/')).toBeVisible()

    // Take final screenshot
    await page.screenshot({ path: 'frontend/tests/screenshots/documents-infinite-05-multiple-filters.png', fullPage: true })
  })

  test('should reset filters to show all documents', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(2000)

    // Apply a filter first
    const dropdowns = await page.getByRole('combobox').all()
    await dropdowns[0].click()
    await page.getByRole('option', { name: 'Meeting' }).click()
    await page.waitForTimeout(2000)

    // Reset the filter back to "All Types"
    await dropdowns[0].click()
    await page.getByRole('option', { name: 'All Types' }).click()
    await page.waitForTimeout(2000)

    // Verify the filtered indicator is gone (or shows all documents)
    const countText = await page.locator('text=/Showing \\d+ of \\d+ documents/').textContent()
    console.log('After reset:', countText)

    // Take screenshot
    await page.screenshot({ path: 'frontend/tests/screenshots/documents-infinite-06-reset-filter.png', fullPage: true })
  })
})
