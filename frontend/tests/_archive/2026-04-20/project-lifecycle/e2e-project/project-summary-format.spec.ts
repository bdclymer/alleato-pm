import { test, expect } from '@playwright/test'

// Skip authentication for this test
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Project Summary Formatting', () => {
  test('should display project summary with proper paragraph formatting', async ({ page }) => {
    // Navigate to homepage first
    await page.goto('http://localhost:3001')
    
    // Wait for portfolio page to load
    await page.waitForSelector('text=project', { timeout: 15000 })
    
    // Find and click on the first project link
    const firstProjectLink = page.locator('button.text-\\[hsl\\(var\\(--procore-orange\\)\\)\\]').first()
    await firstProjectLink.waitFor({ state: 'visible', timeout: 10000 })
    await firstProjectLink.click()
    
    // Wait for project home page to load
    await page.waitForSelector('text=SUMMARY', { timeout: 10000 })
    
    // Check the summary content structure
    const summaryCard = page.locator('div.shadow-sm:has(h3:text("SUMMARY"))')
    const summaryContent = summaryCard.locator('div.text-sm.text-gray-700.leading-relaxed')
    
    // Verify the content has the proper structure with space-y-3 for paragraph spacing
    await expect(summaryContent).toHaveClass(/space-y-3/)
    
    // Check if there are paragraph elements
    const paragraphs = summaryContent.locator('p')
    const paragraphCount = await paragraphs.count()
    
    console.log(`Found ${paragraphCount} paragraph(s) in the summary`)
    
    // Take a screenshot for visual verification
    await summaryCard.screenshot({ 
      path: 'tests/screenshots/project-summary-formatted.png'
    })
    
    // Also take a full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/project-home-full.png',
      fullPage: true
    })
    
    console.log('✓ Project summary formatting test completed successfully')
    console.log('✓ Screenshots saved to tests/screenshots/')
  })
})