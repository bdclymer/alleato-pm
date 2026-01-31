import { test, expect } from '@playwright/test'

test('Debug transcript display on meeting detail page', async ({ page }) => {
  // Listen for console messages
  const consoleMessages: string[] = []
  page.on('console', (msg) => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`)
  })

  // Navigate to the meeting detail page
  await page.goto('http://localhost:3000/60/meetings/01KC9HP3BRVGBGP5JET2PY9TVJ')

  // Wait for page to load
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Log all console messages
  console.log('=== BROWSER CONSOLE LOGS ===')
  consoleMessages.forEach(msg => console.log(msg))
  console.log('============================')

  // Check if Summary section exists
  const summarySection = page.locator('text=Summary').first()
  const hasSummary = await summarySection.isVisible()
  console.log('Summary section visible:', hasSummary)

  // Check if Gist section exists
  const gistSection = page.locator('text=Meeting Overview').first()
  const hasGist = await gistSection.isVisible()
  console.log('Gist section visible:', hasGist)

  // Check if Keywords/Topics section exists
  const topicsSection = page.locator('text=Topics').first()
  const hasTopics = await topicsSection.isVisible()
  console.log('Topics section visible:', hasTopics)

  // Check if Full Transcript section exists
  const transcriptSection = page.locator('text=Full Transcript').first()
  const hasTranscript = await transcriptSection.isVisible()
  console.log('Full Transcript section visible:', hasTranscript)

  // Take screenshot
  await page.screenshot({ path: 'frontend/tests/screenshots/transcript-debug.png', fullPage: true })

  // Print page HTML for transcript section
  if (hasTranscript) {
    const transcriptContent = await page.locator('text=Full Transcript').locator('..').locator('..').innerHTML()
    console.log('Transcript section HTML length:', transcriptContent.length)
  }
})
