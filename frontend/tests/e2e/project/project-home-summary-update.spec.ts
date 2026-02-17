import { test, expect } from '@playwright/test'

test.describe('Project Home Summary Update', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForURL(/\/\d+\/home/, { timeout: 10000 })
  })

  test('should update project summary successfully', async ({ page }) => {
    // Wait for the page to load
    await page.waitForSelector('text=Summary', { timeout: 10000 })

    // Click the Edit button for the summary
    const editButton = page.locator('button', { hasText: 'Edit' }).filter({ has: page.locator('svg') })
    await editButton.click()

    // Wait for the textarea to appear
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()

    // Clear and enter new summary
    const newSummary = `Test summary update at ${new Date().toISOString()}`
    await textarea.clear()
    await textarea.fill(newSummary)

    // Click Save button
    const saveButton = page.locator('button', { hasText: 'Save' })
    await saveButton.click()

    // Wait for the save to complete and edit mode to close
    await expect(textarea).not.toBeVisible({ timeout: 5000 })

    // Verify the new summary is displayed
    await expect(page.locator('text=' + newSummary.substring(0, 20))).toBeVisible()

    // Check browser console for errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Verify no console errors about failed project update
    await page.waitForTimeout(1000)
    const hasUpdateError = consoleErrors.some(err => err.includes('Failed to update project'))
    expect(hasUpdateError).toBe(false)
  })

  test('should show error in console on API failure', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Wait for the page to load
    await page.waitForSelector('text=Summary', { timeout: 10000 })

    // Click the Edit button
    const editButton = page.locator('button', { hasText: 'Edit' }).filter({ has: page.locator('svg') })
    await editButton.click()

    // Wait for textarea
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()

    // Enter new summary
    await textarea.clear()
    await textarea.fill('Test summary for error detection')

    // Intercept the API call and make it fail
    await page.route('**/api/projects/*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Simulated error' })
      })
    })

    // Click Save
    const saveButton = page.locator('button', { hasText: 'Save' })
    await saveButton.click()

    // Wait for error
    await page.waitForTimeout(2000)

    // Verify error was logged
    const hasError = consoleErrors.some(err =>
      err.includes('Failed to update project') || err.includes('Error updating project')
    )
    expect(hasError).toBe(true)

    // Verify textarea is still visible (stays in edit mode on error)
    await expect(textarea).toBeVisible()
  })
})
