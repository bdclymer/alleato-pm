import { test, expect } from '@playwright/test';

test.describe('Meeting Transcript Formatting FIX', () => {
  test('check current transcript formatting and identify the issue', async ({ page }) => {
    // Navigate to the meeting detail page
    await page.goto('http://localhost:3004/60/meetings/01KCF4KC2B5DD8BP8STFVTZ3TS');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take a screenshot of the current state
    await page.screenshot({
      path: 'config/playwright/tests/screenshots/transcript-CURRENT-STATE.png',
      fullPage: true
    });

    // Try to find the transcript section
    const pageContent = await page.content();
    console.log('=== CHECKING FOR TRANSCRIPT ===');

    // Look for "Transcript" heading
    const hasTranscriptHeading = pageContent.includes('Transcript');
    console.log('Has "Transcript" heading:', hasTranscriptHeading);

    // Check for formatted-transcript component
    const hasFormattedTranscript = pageContent.includes('formatted-transcript');
    console.log('Has formatted-transcript component:', hasFormattedTranscript);

    // Get all text content
    const bodyText = await page.locator('body').textContent();
    console.log('Page text length:', bodyText?.length);
    console.log('First 1000 chars of page:', bodyText?.substring(0, 1000));

    // Try to find transcript-specific elements
    const transcriptElements = await page.locator('[class*="transcript"], [data-transcript], [id*="transcript"]').count();
    console.log('Transcript-related elements found:', transcriptElements);

    // Check for paragraph breaks
    const paragraphs = await page.locator('p').count();
    console.log('Total <p> tags on page:', paragraphs);

    const divs = await page.locator('div').count();
    console.log('Total <div> tags on page:', divs);
  });
});
