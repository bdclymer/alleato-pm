import { test, expect } from '@playwright/test'

test.describe('Project Directory Setup', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForLoadState('networkidle')
  })

  test('can add company to project directory with valid role', async ({ page }) => {
    // Navigate to project setup wizard
    await page.goto('/67/setup')

    // Wait for the cost code step and continue
    await expect(page.locator('h2')).toContainText('Cost Code Configuration')
    await page.click('button:has-text("Continue")')

    // Now on Project Directory step
    await expect(page.locator('h2')).toContainText('Project Directory')

    // Click "Add Company" button
    await page.click('button:has-text("Add Company")')

    // Verify the dialog opened
    await expect(page.locator('text=Add Company to Project')).toBeVisible()

    // Select a company from dropdown
    await page.click('[id="company"]')
    await page.click('text=Alleato Group >> visible=true')

    // Select a valid role (one of: owner, architect, engineer, subcontractor, vendor)
    await page.click('[id="role"]')
    await page.click('text=Architect >> visible=true')

    // Click "Add to Project"
    await page.click('button:has-text("Add to Project")')

    // Wait for the dialog to close and verify success
    await page.waitForTimeout(2000)

    // Verify the company was added to the table
    await expect(page.locator('table')).toContainText('Alleato Group')
    await expect(page.locator('table')).toContainText('Architect')
  })

  test('displays only valid roles in dropdown', async ({ page }) => {
    await page.goto('/67/setup')

    // Navigate to Project Directory step
    await page.click('button:has-text("Continue")')
    await expect(page.locator('h2')).toContainText('Project Directory')

    // Open add company dialog
    await page.click('button:has-text("Add Company")')

    // Click role dropdown
    await page.click('[id="role"]')

    // Verify only the 5 valid roles are present
    await expect(page.locator('text=Owner >> visible=true')).toBeVisible()
    await expect(page.locator('text=Architect >> visible=true')).toBeVisible()
    await expect(page.locator('text=Engineer >> visible=true')).toBeVisible()
    await expect(page.locator('text=Subcontractor >> visible=true')).toBeVisible()
    await expect(page.locator('text=Vendor >> visible=true')).toBeVisible()

    // Verify invalid roles are NOT present
    await expect(page.locator('text=General Contractor >> visible=true')).not.toBeVisible()
    await expect(page.locator('text=Project Manager >> visible=true')).not.toBeVisible()
    await expect(page.locator('text=Superintendent >> visible=true')).not.toBeVisible()
  })
})
