import { test, expect } from '@playwright/test'

test.describe('Project Setup Wizard Manual Test', () => {
  test('Manual navigation and screenshots', async ({ page }) => {
    // Navigate to the dev server on port 3000
    await page.goto('http://localhost:3000/1/setup')
    
    // Wait for page to load
    await page.waitForTimeout(3000)
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'frontend/tests/screenshots/wizard-manual-initial.png', 
      fullPage: true 
    })
    
    // Log page title for debugging
    const title = await page.title()
    console.log('Page title:', title)
    
    // Check if we need to login
    const loginButton = page.locator('button:has-text("Sign in")')
    if (await loginButton.isVisible()) {
      console.log('Login required - page shows sign in button')
      await page.screenshot({ 
        path: 'frontend/tests/screenshots/wizard-requires-login.png', 
        fullPage: true 
      })
    } else {
      console.log('Checking wizard elements...')
      // Try to find wizard elements
      const h1 = await page.locator('h1').textContent()
      console.log('H1 content:', h1)
      
      const costCodeText = await page.locator('text=Cost Code Configuration').count()
      console.log('Found "Cost Code Configuration" text:', costCodeText, 'times')
    }
  })
})