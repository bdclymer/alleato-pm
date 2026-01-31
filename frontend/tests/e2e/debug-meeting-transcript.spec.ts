import { test, expect } from '@playwright/test'

test.describe('Debug Meeting Transcript', () => {
  test('should inspect meeting page elements', async ({ page }) => {
    // Navigate to the specific meeting
    await page.goto('http://localhost:3004/meetings/01KC9HP3BRVGBGP5JET2PY9TVJ')

    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Take initial screenshot
    await page.screenshot({
      path: 'tests/screenshots/meeting-debug-initial.png',
      fullPage: true
    })

    // Check for View Source button
    const viewSourceButton = page.locator('button:has-text("View Source"), a:has-text("View Source")')
    if (await viewSourceButton.count() > 0) {
      const href = await viewSourceButton.first().getAttribute('href')
      console.log('View Source href:', href)
    }

    // Check for transcript content
    const transcriptHeading = page.locator('h2:has-text("Full Transcript")')
    const hasTranscript = await transcriptHeading.isVisible()
    console.log('Has transcript heading:', hasTranscript)

    // Get the transcript card content
    if (hasTranscript) {
      const transcriptCard = page.locator('h2:has-text("Full Transcript")').locator('..').locator('div[class*="Card"]')
      const transcriptText = await transcriptCard.textContent()
      console.log('Transcript text length:', transcriptText?.length || 0)
      console.log('First 200 chars:', transcriptText?.substring(0, 200))
    }

    // Check for speaker avatars
    const speakerIcons = page.locator('.lucide-user')
    const iconCount = await speakerIcons.count()
    console.log('Speaker icon count:', iconCount)

    // Take focused screenshot of transcript section
    if (hasTranscript) {
      await page.locator('h2:has-text("Full Transcript")').scrollIntoViewIfNeeded()
      await page.screenshot({
        path: 'tests/screenshots/meeting-transcript-section.png',
      })
    }
  })
})
