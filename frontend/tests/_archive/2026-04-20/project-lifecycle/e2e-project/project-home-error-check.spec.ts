import { test, expect } from '@playwright/test'

test.describe('Project Home Page Error Check', () => {
  test('should load project home page without errors', async ({ page }) => {
    // Monitor console errors
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // Monitor page errors
    page.on('pageerror', (err) => {
      errors.push(err.message)
    })

    // Navigate to a project home page (using project ID 14)
    await page.goto('/14/home')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check for project title
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 30000 })
    
    // Check if main sections are loaded
    await expect(page.getByText('OVERVIEW')).toBeVisible()
    await expect(page.getByText('PROJECT TEAM')).toBeVisible()
    await expect(page.getByText('FINANCIALS')).toBeVisible()
    
    // Check for Summary section
    await expect(page.getByText('Summary')).toBeVisible()
    
    // Check for Project Insights section
    await expect(page.getByText('Project Insights:')).toBeVisible()
    
    // Check for RFIs section
    await expect(page.getByText('RFIs')).toBeVisible()
    
    // Check for Tasks section
    await expect(page.getByText('Tasks')).toBeVisible()
    
    // Check for tabs
    await expect(page.getByRole('tab', { name: 'Meetings' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Reports' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Change Orders' })).toBeVisible()
    
    // Take a screenshot
    await page.screenshot({ path: 'tests/screenshots/project-home-fixed.png', fullPage: true })
    
    // Assert no console errors
    if (errors.length > 0) {
      console.error('Console errors found:', errors)
    }
    expect(errors).toHaveLength(0)
  })

  test('should show data in tabs', async ({ page }) => {
    // Navigate to a project home page
    await page.goto('/14/home')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Click on Reports tab
    await page.getByRole('tab', { name: 'Reports' }).click()
    await page.waitForTimeout(1000)
    
    // Check for daily logs content
    const reportsContent = await page.locator('[role="tabpanel"]').textContent()
    expect(reportsContent).toBeTruthy()
    
    // Click on Change Orders tab
    await page.getByRole('tab', { name: 'Change Orders' }).click()
    await page.waitForTimeout(1000)
    
    // Check for change orders content
    const changeOrdersContent = await page.locator('[role="tabpanel"]').textContent()
    expect(changeOrdersContent).toBeTruthy()
  })
})