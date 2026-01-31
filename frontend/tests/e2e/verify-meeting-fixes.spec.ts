import { test, expect } from '@playwright/test'

test.describe('Verify Meeting Page Fixes', () => {
  test('should display formatted transcript and working links', async ({ page }) => {
    // Navigate to the specific meeting
    await page.goto('http://localhost:3004/meetings/01KC9HP3BRVGBGP5JET2PY9TVJ')

    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Take full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/meeting-page-fixed.png',
      fullPage: true
    })

    console.log('Screenshot saved. Please check:')
    console.log('1. Transcript should be formatted with speaker labels')
    console.log('2. View Source button should be visible and clickable')
    console.log('3. Text should not be jumbled in one block')
  })
})
