import { test, expect } from '@playwright/test';

test.describe('Meeting Transcript Formatting', () => {
  test('transcript should have proper paragraph breaks and not be one jumbled block', async ({ page }) => {
    // Navigate to the meeting detail page
    await page.goto('http://localhost:3004/60/meetings/01KCF4KC2B5DD8BP8STFVTZ3TS');

    // Wait for the transcript section to load
    await page.waitForSelector('text=Transcript', { timeout: 10000 });

    // Take a screenshot of the current state
    await page.screenshot({
      path: 'frontend/tests/screenshots/transcript-before-fix.png',
      fullPage: true
    });

    // Find the transcript content area
    const transcriptSection = page.locator('text=Transcript').locator('..').locator('..');

    // Check if transcript text exists
    const transcriptText = await transcriptSection.textContent();
    console.log('Transcript text length:', transcriptText?.length);
    console.log('First 500 chars:', transcriptText?.substring(0, 500));

    // Count paragraphs or line breaks - there should be multiple
    const paragraphs = await transcriptSection.locator('p, div[class*="paragraph"], br, [style*="margin"], [style*="padding"]').count();
    console.log('Number of paragraph elements found:', paragraphs);

    // The transcript should NOT be a single continuous block
    // It should have multiple paragraphs or sections
    expect(paragraphs).toBeGreaterThan(5);

    // Take a final screenshot
    await page.screenshot({
      path: 'frontend/tests/screenshots/transcript-formatted.png',
      fullPage: true
    });
  });
});
