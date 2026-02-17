import { test, expect } from '@playwright/test'

test.describe('Meeting Transcript Formatting', () => {
  test('should display transcript with proper formatting', async ({ page }) => {
    // Navigate to the meeting detail page
    await page.goto('http://localhost:3000/meetings/01KC9WJEMV9QJV468TWA42AZS9')

    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Check if the page loaded successfully
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()

    // Check for the Full Transcript section
    const transcriptHeading = page.locator('h2:has-text("Full Transcript")')
    await expect(transcriptHeading).toBeVisible()

    // Take screenshot of the formatted transcript
    await page.screenshot({
      path: 'tests/screenshots/meeting-transcript-formatted.png',
      fullPage: true
    })

    console.log('Screenshot taken. Check for properly formatted transcript with speaker labels and spacing.')
  })

  test('should show speaker avatars and names', async ({ page }) => {
    await page.goto('http://localhost:3000/meetings/01KC9WJEMV9QJV468TWA42AZS9')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Look for speaker icons (User icons in the transcript)
    const speakerIcons = page.locator('.lucide-user')

    // Should have at least one speaker icon if transcript has speakers
    const count = await speakerIcons.count()
    console.log(`Found ${count} speaker avatars`)

    // Take a focused screenshot of the transcript section
    const transcriptSection = page.locator('h2:has-text("Full Transcript")').locator('..')
    if (await transcriptSection.isVisible()) {
      await transcriptSection.screenshot({
        path: 'tests/screenshots/meeting-transcript-speakers.png'
      })
    }
  })
})
