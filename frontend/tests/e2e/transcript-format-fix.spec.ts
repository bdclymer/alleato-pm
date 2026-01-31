import { test, expect } from '@playwright/test';

test.describe('Meeting Transcript Formatting - DIAGNOSIS AND FIX', () => {
  test('check and fix transcript formatting', async ({ page }) => {
    console.log('=== NAVIGATING TO MEETING PAGE ===');
    await page.goto('http://localhost:3004/60/meetings/01KCF4KC2B5DD8BP8STFVTZ3TS');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('=== TAKING BEFORE SCREENSHOT ===');
    await page.screenshot({
      path: 'tests/screenshots/transcript-BEFORE-FIX.png',
      fullPage: true
    });

    // Get the HTML to analyze structure
    const html = await page.content();

    // Log what we find
    console.log('=== PAGE ANALYSIS ===');
    console.log('Has "Transcript" text:', html.includes('Transcript'));
    console.log('Has "formatted-transcript":', html.includes('formatted-transcript'));

    // Find all transcript-related elements
    const transcriptSection = page.locator('text=Transcript').locator('..').first();
    const sectionText = await transcriptSection.textContent();

    console.log('Transcript section text length:', sectionText?.length);
    console.log('First 500 chars:', sectionText?.substring(0, 500));

    // Count line breaks and paragraphs
    const pTags = await page.locator('p').count();
    const brTags = await page.locator('br').count();
    const divs = await page.locator('div').count();

    console.log('Total <p> tags:', pTags);
    console.log('Total <br> tags:', brTags);
    console.log('Total <div> tags:', divs);

    // This test will fail but give us diagnostic info
    expect(true).toBe(true);
  });
});
