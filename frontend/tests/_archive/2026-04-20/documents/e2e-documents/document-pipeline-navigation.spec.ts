import { test, expect } from '@playwright/test'

test.describe('Document Pipeline Navigation', () => {
  test('should navigate to document pipeline from header menu', async ({ page }) => {
    // Go to home page
    await page.goto('/')
    
    // Click on Project Tools dropdown in header
    await page.getByRole('button', { name: /Project Tools/ }).click()
    
    // Look for Admin Tools section
    await expect(page.getByText('Admin Tools')).toBeVisible()
    
    // Click on Document Pipeline link
    await page.getByText('Document Pipeline').click()
    
    // Verify we're on the document pipeline page
    await expect(page).toHaveURL('/admin/documents/pipeline')
    await expect(page.getByRole('heading', { name: 'Document Pipeline Management' })).toBeVisible()
    
    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/document-pipeline-via-navigation.png',
      fullPage: true
    })
  })
})