import { test, expect } from '@playwright/test'

test.describe('Verify Project Home Page Works', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chrome only')
  
  test('should load project home page and display content', async ({ page }) => {
    // Skip auth for this test
    test.use({ storageState: { cookies: [], origins: [] } })
    
    // Monitor for critical errors
    const errors: string[] = []
    const criticalPatterns = [
      /column .* does not exist/i,
      /relation .* does not exist/i,
      /table .* not found/i,
      /cannot read properties of undefined/i,
      /TypeError/i
    ]
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (criticalPatterns.some(pattern => pattern.test(text))) {
          errors.push(text)
        }
      }
    })
    
    page.on('pageerror', (err) => {
      errors.push(err.message)
    })

    // Navigate to project home
    await page.goto('/14/home', { waitUntil: 'domcontentloaded' })
    
    // Check if page loaded (not showing error page)
    const hasErrorPage = await page.locator('text=/This page could not be found|404|500/i').isVisible()
    expect(hasErrorPage).toBe(false)
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'tests/screenshots/project-home-verification.png', fullPage: true })
    
    // Report any critical errors found
    if (errors.length > 0) {
      console.error('Critical errors found:', errors)
      throw new Error(`Page has critical errors: ${errors.join(', ')}`)
    }
    
    // Basic content check - at least page should render
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
  })
})