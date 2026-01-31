import { test, expect } from '@playwright/test'

test('Project Setup Wizard basic test', async ({ page }) => {
  // Navigate to the project setup wizard
  await page.goto('http://localhost:3006/1/setup')
  
  // Wait for page to load
  await page.waitForLoadState('networkidle')
  
  // Take a screenshot
  await page.screenshot({ path: 'tests/screenshots/project-setup-wizard.png', fullPage: true })
  
  // Check if the page loaded
  const title = await page.title()
  console.log('Page title:', title)
  
  // Check for any content
  const content = await page.content()
  console.log('Page has content:', content.length > 0)
})