import { test, expect } from '@playwright/test'

test.describe('Project Home Page Editing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the project home page (using project ID 75)
    await page.goto('http://localhost:3000/75/home')
    await page.waitForLoadState('networkidle')
  })

  test('should display edit buttons on cards', async ({ page }) => {
    // Check that edit buttons are present
    const editButtons = page.locator('button[aria-label*="Edit"]')
    await expect(editButtons.first()).toBeVisible()

    // Take a screenshot
    await page.screenshot({ path: 'frontend/tests/screenshots/project-home-edit-buttons.png', fullPage: true })
  })

  test('should allow editing the Overview card', async ({ page }) => {
    // Find and click the edit button for Overview card
    const overviewCard = page.locator('text=OVERVIEW').locator('..')
    const editButton = overviewCard.locator('button').first()
    await editButton.click()

    // Wait for edit mode
    await page.waitForTimeout(500)

    // Check that input fields are visible
    const inputs = overviewCard.locator('input')
    await expect(inputs.first()).toBeVisible()

    // Take screenshot in edit mode
    await page.screenshot({ path: 'frontend/tests/screenshots/overview-edit-mode.png', fullPage: true })

    // Try to edit the client field
    const clientInput = inputs.first()
    await clientInput.fill('Updated Client Name')

    // Click save button (check icon)
    const saveButton = overviewCard.locator('button').first()
    await saveButton.click()

    // Wait for save to complete
    await page.waitForTimeout(1000)
  })

  test('should allow editing the Summary section', async ({ page }) => {
    // Find the summary card
    const summaryCard = page.locator('text=SUMMARY').locator('..')

    // Click edit button
    const editButton = summaryCard.locator('button').first()
    await editButton.click()

    // Wait for edit mode
    await page.waitForTimeout(500)

    // Check that textarea is visible
    const textarea = summaryCard.locator('textarea')
    await expect(textarea).toBeVisible()

    // Take screenshot in edit mode
    await page.screenshot({ path: 'frontend/tests/screenshots/summary-edit-mode.png', fullPage: true })

    // Try to edit the summary
    await textarea.fill('This is an updated project summary.')

    // Click save button
    const saveButton = summaryCard.locator('button').first()
    await saveButton.click()

    // Wait for save to complete
    await page.waitForTimeout(1000)
  })

  test('should allow editing the Financials card', async ({ page }) => {
    // Find the financials card
    const financialsCard = page.locator('text=FINANCIALS').locator('..')

    // Click edit button
    const editButton = financialsCard.locator('button').first()
    await editButton.click()

    // Wait for edit mode
    await page.waitForTimeout(500)

    // Check that input fields are visible
    const inputs = financialsCard.locator('input')
    await expect(inputs.first()).toBeVisible()

    // Take screenshot in edit mode
    await page.screenshot({ path: 'frontend/tests/screenshots/financials-edit-mode.png', fullPage: true })

    // Cancel editing
    const cancelButton = financialsCard.locator('button').nth(1)
    await cancelButton.click()

    // Verify we're back in view mode
    await page.waitForTimeout(500)
    await expect(inputs.first()).not.toBeVisible()
  })

  test('should show save and cancel buttons in edit mode', async ({ page }) => {
    // Find the overview card
    const overviewCard = page.locator('text=OVERVIEW').locator('..')

    // Click edit button
    await overviewCard.locator('button').first().click()
    await page.waitForTimeout(500)

    // Verify save and cancel buttons are visible
    const buttons = overviewCard.locator('button')
    await expect(buttons).toHaveCount(2) // Save and Cancel buttons

    await page.screenshot({ path: 'frontend/tests/screenshots/edit-buttons-visible.png', fullPage: true })
  })
})
