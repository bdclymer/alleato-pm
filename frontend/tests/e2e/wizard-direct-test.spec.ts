import { test, expect, chromium } from '@playwright/test'

test('Direct browser test of Project Setup Wizard', async () => {
  // Launch browser directly
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  console.log('Navigating to wizard page...')
  
  try {
    // Go to the wizard page
    await page.goto('http://localhost:3000/1/setup', { waitUntil: 'domcontentloaded', timeout: 30000 })
    
    // Wait for any redirects
    await page.waitForTimeout(3000)
    
    console.log('Current URL:', page.url())
    console.log('Page title:', await page.title())
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'frontend/tests/screenshots/wizard-direct-initial.png', 
      fullPage: true 
    })
    
    // Check if login is required
    const loginForm = await page.locator('form').filter({ hasText: 'sign in' }).count()
    if (loginForm > 0) {
      console.log('Login page detected - authentication required')
      await page.screenshot({ 
        path: 'frontend/tests/screenshots/wizard-login-required.png', 
        fullPage: true 
      })
    } else {
      console.log('Checking for wizard elements...')
      
      // Look for wizard content
      const h1Text = await page.locator('h1').textContent().catch(() => 'No h1 found')
      console.log('H1 content:', h1Text)
      
      const h2Text = await page.locator('h2').textContent().catch(() => 'No h2 found')
      console.log('H2 content:', h2Text)
      
      // Check for specific wizard elements
      const setupText = await page.locator('text=Project Setup').count()
      console.log('Found "Project Setup":', setupText, 'times')
      
      const costCodeText = await page.locator('text=Cost Code Configuration').count()
      console.log('Found "Cost Code Configuration":', costCodeText, 'times')
      
      // Take screenshot of what we found
      await page.screenshot({ 
        path: 'frontend/tests/screenshots/wizard-actual-content.png', 
        fullPage: true 
      })
    }
    
  } catch (error) {
    console.error('Error during test:', error)
    await page.screenshot({ 
      path: 'frontend/tests/screenshots/wizard-error-state.png', 
      fullPage: true 
    })
  } finally {
    await browser.close()
  }
})