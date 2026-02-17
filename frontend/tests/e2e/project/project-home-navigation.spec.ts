import { test, expect } from '@playwright/test'

test.describe('Project Home Navigation Dropdown', () => {
  test('should display Project Tools dropdown button and show three-column navigation when clicked', async ({ page }) => {
    // Navigate to a project home page
    await page.goto('/1/home')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check for the Project Tools dropdown button
    const projectToolsButton = page.getByRole('button', { name: /project tools/i })
    await expect(projectToolsButton).toBeVisible()

    // Click the dropdown to open it
    await projectToolsButton.click()

    // Wait a moment for the dropdown to open
    await page.waitForTimeout(300)

    // Check for the Finance column
    const financeHeading = page.getByRole('heading', { name: /finance/i })
    await expect(financeHeading).toBeVisible()

    // Verify Finance tools are present in dropdown
    await expect(page.getByRole('link', { name: 'Prime Contracts' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Budget' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Commitments' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Change Orders' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Invoicing' })).toBeVisible()

    // Check for the Project Management column
    const projectMgmtHeading = page.getByRole('heading', { name: /project management/i })
    await expect(projectMgmtHeading).toBeVisible()

    // Verify Project Management tools are present in dropdown
    await expect(page.getByRole('link', { name: 'RFIs' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Submittals' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Meetings' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Schedule' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Photos' })).toBeVisible()

    // Check for the Core Tools column
    const coreToolsHeading = page.getByRole('heading', { name: /core tools/i })
    await expect(coreToolsHeading).toBeVisible()

    // Verify Core Tools are present in dropdown
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('link', { name: '360 Reporting' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Documents' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Directory' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tasks' })).toBeVisible()
  })

  test('should navigate to correct pages when clicking links in dropdown', async ({ page }) => {
    await page.goto('/1/home')
    await page.waitForLoadState('networkidle')

    // Open dropdown and test Finance link navigation
    await page.getByRole('button', { name: /project tools/i }).click()
    await page.waitForTimeout(300)

    const budgetLink = page.getByRole('link', { name: 'Budget' })
    await budgetLink.click()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/1/budget')

    // Go back, open dropdown and test Project Management link
    await page.goto('/1/home')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /project tools/i }).click()
    await page.waitForTimeout(300)

    const rfisLink = page.getByRole('link', { name: 'RFIs' })
    await rfisLink.click()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/1/rfis')

    // Go back, open dropdown and test Core Tools link
    await page.goto('/1/home')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /project tools/i }).click()
    await page.waitForTimeout(300)

    const documentsLink = page.getByRole('link', { name: 'Documents' })
    await documentsLink.click()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/1/documents')
  })

  test('should have proper styling and layout in dropdown', async ({ page }) => {
    await page.goto('/1/home')
    await page.waitForLoadState('networkidle')

    // Click to open the dropdown
    await page.getByRole('button', { name: /project tools/i }).click()
    await page.waitForTimeout(300)

    // Check that the dropdown content has the correct background
    const dropdownContent = page.locator('div.bg-gradient-to-br.from-white.to-gray-50')
    await expect(dropdownContent).toBeVisible()

    // Verify the three-column grid layout inside dropdown
    const gridContainer = page.locator('div.grid.grid-cols-1.md\\:grid-cols-3')
    await expect(gridContainer).toBeVisible()
  })
})
