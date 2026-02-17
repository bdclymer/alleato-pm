import { test, expect } from '@playwright/test'

test.describe('Meetings2 Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/meetings2')
    await page.waitForLoadState('networkidle')
  })

  test('should display the meetings page with correct heading', async ({ page }) => {
    // Check for the main heading
    const heading = page.locator('h1:has-text("Meetings")')
    await expect(heading).toBeVisible()

    // Check for the description
    const description = page.locator('text=View and manage all your meetings')
    await expect(description).toBeVisible()
  })

  test('should display the meetings table', async ({ page }) => {
    // Check that the table is present
    const table = page.locator('table')
    await expect(table).toBeVisible()

    // Check for table headers
    await expect(page.locator('th:has-text("Title")')).toBeVisible()
    await expect(page.locator('th:has-text("Date")')).toBeVisible()
    await expect(page.locator('th:has-text("Type")')).toBeVisible()
  })

  test('should have search functionality', async ({ page }) => {
    // Check for search input
    const searchInput = page.locator('input[placeholder*="Search meetings"]')
    await expect(searchInput).toBeVisible()

    // Type in search box
    await searchInput.fill('test')
    await expect(searchInput).toHaveValue('test')
  })

  test('should have filter controls', async ({ page }) => {
    // Check for year filter tabs
    const allTab = page.locator('button[role="tab"]:has-text("All")')
    await expect(allTab).toBeVisible()

    // Check for columns dropdown
    const columnsButton = page.locator('button:has-text("Columns")')
    await expect(columnsButton).toBeVisible()

    // Check for export button
    const exportButton = page.locator('button:has-text("Export")')
    await expect(exportButton).toBeVisible()
  })

  test('should display meetings data or empty state', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(1000)

    // Check if there are meetings or empty state
    const hasData = await page.locator('tbody tr').count() > 0

    if (hasData) {
      // If there's data, check that rows are displayed
      const firstRow = page.locator('tbody tr').first()
      await expect(firstRow).toBeVisible()
    } else {
      // If no data, check for empty state message
      const emptyMessage = page.locator('text=No meetings found')
      await expect(emptyMessage).toBeVisible()
    }
  })

  test('should be able to toggle column visibility', async ({ page }) => {
    // Click the columns button
    const columnsButton = page.locator('button:has-text("Columns")')
    await columnsButton.click()

    // Wait for dropdown to appear
    await page.waitForTimeout(300)

    // Check that column options are visible
    const titleCheckbox = page.locator('text=Title').last()
    await expect(titleCheckbox).toBeVisible()
  })

  test('should be able to sort columns', async ({ page }) => {
    // Wait for table to load
    await page.waitForTimeout(1000)

    // Check if there's data to sort
    const rowCount = await page.locator('tbody tr').count()

    if (rowCount > 0) {
      // Click on the Date column header to sort
      const dateHeader = page.locator('th:has-text("Date")')
      await dateHeader.click()

      // Verify sort icon appears
      const sortIcon = dateHeader.locator('svg')
      await expect(sortIcon).toBeVisible()
    }
  })

  test('should display total rows count', async ({ page }) => {
    // Check for row count display
    const rowCount = page.locator('text=/Total rows:/')
    await expect(rowCount).toBeVisible()
  })

  test('should take a screenshot', async ({ page }) => {
    await page.screenshot({
      path: 'frontend/tests/screenshots/meetings2-page.png',
      fullPage: true
    })
  })
})
