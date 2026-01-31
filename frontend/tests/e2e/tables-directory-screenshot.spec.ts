import { test, expect } from '@playwright/test'

test('capture tables directory page', async ({ page }) => {
  // Navigate to tables directory
  await page.goto('/tables-directory')
  
  // Wait for page to load
  await page.waitForLoadState('networkidle')
  
  // Wait a bit for any animations
  await page.waitForTimeout(1000)
  
  // Take screenshot
  await page.screenshot({
    path: 'tests/screenshots/tables-directory-page.png',
    fullPage: true
  })
  
  console.log('Tables directory screenshot captured!')
})