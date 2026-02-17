import { test, expect } from '@playwright/test'

test.describe('Employees Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/employees')
    await page.waitForLoadState('networkidle')
  })

  test('should display the employees page with correct heading', async ({ page }) => {
    // Check for the main heading
    const heading = page.locator('h1:has-text("Employees")')
    await expect(heading).toBeVisible()

    // Check for the description
    const description = page.locator('text=View and manage all your employees')
    await expect(description).toBeVisible()
  })

  test('should display the employees table', async ({ page }) => {
    // Check that the table is present
    const table = page.locator('table')
    await expect(table).toBeVisible()

    // Check for table headers (visible by default)
    await expect(page.locator('th:has-text("Name")')).toBeVisible()
    await expect(page.locator('th:has-text("Email")')).toBeVisible()
    await expect(page.locator('th:has-text("Phone")')).toBeVisible()
    await expect(page.locator('th:has-text("Job Title")')).toBeVisible()
    await expect(page.locator('th:has-text("Department")')).toBeVisible()
  })

  test('should have search functionality', async ({ page }) => {
    // Check for search input
    const searchInput = page.locator('input[placeholder*="Search employees"]')
    await expect(searchInput).toBeVisible()

    // Type in search box
    await searchInput.fill('test')
    await expect(searchInput).toHaveValue('test')
  })

  test('should have filter controls', async ({ page }) => {
    // Check for columns dropdown
    const columnsButton = page.locator('button:has-text("Columns")')
    await expect(columnsButton).toBeVisible()

    // Check for export button
    const exportButton = page.locator('button:has-text("Export")')
    await expect(exportButton).toBeVisible()
  })

  test('should display employees data or empty state', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(1000)

    // Check if there are employees or empty state
    const rowCount = await page.locator('tbody tr').count()

    // The table should show either data rows or a single empty state row
    expect(rowCount).toBeGreaterThan(0)

    if (rowCount === 1) {
      // Check if it's the empty state
      const emptyMessage = page.locator('text=No employees found')
      const hasEmptyMessage = await emptyMessage.isVisible()

      if (!hasEmptyMessage) {
        // It's a data row
        const firstRow = page.locator('tbody tr').first()
        await expect(firstRow).toBeVisible()
      }
    } else {
      // Multiple rows means we have data
      const firstRow = page.locator('tbody tr').first()
      await expect(firstRow).toBeVisible()
    }
  })

  test('should be able to toggle column visibility', async ({ page }) => {
    // Click the columns button
    const columnsButton = page.locator('button:has-text("Columns")')
    await columnsButton.click()

    // Wait for dropdown to appear
    await page.waitForTimeout(300)

    // Check that column options are visible
    const nameCheckbox = page.locator('text=Name').last()
    await expect(nameCheckbox).toBeVisible()
  })

  test('should be able to sort columns', async ({ page }) => {
    // Wait for table to load
    await page.waitForTimeout(1000)

    // Check if there's data to sort
    const rowCount = await page.locator('tbody tr').count()

    if (rowCount > 0) {
      // Click on the Name column header to sort
      const nameHeader = page.locator('th:has-text("Name")')
      await nameHeader.click()

      // Verify sort icon appears
      const sortIcon = nameHeader.locator('svg')
      await expect(sortIcon).toBeVisible()
    }
  })

  test('should display total employees count', async ({ page }) => {
    // Check for employee count display
    const employeeCount = page.locator('text=/Total employees:/')
    await expect(employeeCount).toBeVisible()
  })

  test('should display employee avatars when data is present', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(1000)

    // Check if there's data (more than 1 row or 1 row without empty message)
    const rowCount = await page.locator('tbody tr').count()
    const emptyMessage = page.locator('text=No employees found')
    const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false)

    if (rowCount > 0 && !hasEmptyMessage) {
      // Check that the first row has a name cell with avatar structure
      const firstRowNameCell = page.locator('tbody tr').first().locator('td').first()
      await expect(firstRowNameCell).toBeVisible()

      // The avatar fallback or image should be present
      const hasAvatar = await firstRowNameCell.locator('div').first().isVisible()
      expect(hasAvatar).toBeTruthy()
    }
  })

  test('should take a screenshot', async ({ page }) => {
    await page.screenshot({
      path: 'frontend/tests/screenshots/employees-page.png',
      fullPage: true
    })
  })
})
