import { test, expect } from '@playwright/test'

test.describe('Tables Directory Page', () => {
  test('should display all table categories and cards', async ({ page }) => {
    // Navigate to tables directory
    await page.goto('/tables-directory')
    
    // Check page title
    await expect(page.getByRole('heading', { name: 'Data Tables Directory' })).toBeVisible()
    
    // Check for category sections
    await expect(page.getByText('Core Data')).toBeVisible()
    await expect(page.getByText('Project Management')).toBeVisible()
    await expect(page.getByText('Financial')).toBeVisible()
    await expect(page.getByText('Directory')).toBeVisible()
    await expect(page.getByText('AI Insights')).toBeVisible()
    
    // Check for some table cards
    await expect(page.getByText('Daily Logs')).toBeVisible()
    await expect(page.getByText('Tasks')).toBeVisible()
    await expect(page.getByText('Clients')).toBeVisible()
    await expect(page.getByText('Decisions')).toBeVisible()
    
    // Check statistics are displayed
    await expect(page.getByText('4 tables').first()).toBeVisible() // Core Data has 4 tables
    
    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/tables-directory.png',
      fullPage: true
    })
  })
  
  test('should navigate to a table when card is clicked', async ({ page }) => {
    await page.goto('/tables-directory')
    
    // Click on Daily Logs card
    await page.getByText('Daily Logs').click()
    
    // Should navigate to daily logs page
    await expect(page).toHaveURL('/daily-logs')
  })
  
  test('should show category badges with counts', async ({ page }) => {
    await page.goto('/tables-directory')
    
    // Check Quick Navigation section
    await expect(page.getByText('Quick Navigation')).toBeVisible()
    
    // Check category badges exist with counts
    const coreDataBadge = page.getByText('Core Data (4)')
    await expect(coreDataBadge).toBeVisible()
    
    const aiInsightsBadge = page.getByText('AI Insights (4)')
    await expect(aiInsightsBadge).toBeVisible()
  })
})