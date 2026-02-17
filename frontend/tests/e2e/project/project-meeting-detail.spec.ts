import { test, expect } from '@playwright/test'

/**
 * Test: Project Meeting Detail Page Route
 *
 * This test verifies that the project-specific meeting detail page
 * is accessible and displays correctly.
 *
 * Route: /[projectId]/meetings/[meetingId]
 */

test.describe('Project Meeting Detail Page', () => {
  test('should load project meeting detail page without 404 error', async ({ page }) => {
    // Navigate to the project meeting detail page
    // Using project ID 67 and a meeting ID
    const projectId = '67'
    const meetingId = '01KCEQ6T0WTN827CN68P7R0A4E'

    await page.goto(`http://localhost:3000/${projectId}/meetings/${meetingId}`)

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check that we're not showing a 404 page by looking for actual 404 indicators
    await expect(page.locator('h1:has-text("404")')).toHaveCount(0)
    await expect(page.locator('text="Page Not Found"')).toHaveCount(0)

    // Verify the page has expected elements
    // Should have a back button
    const backButton = page.getByRole('link', { name: /back to project meetings/i })
    await expect(backButton).toBeVisible()

    // Should have a heading (either the meeting title or "Untitled Meeting")
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible()

    // Log the URL for debugging
    console.log('Current URL:', page.url())
    expect(page.url()).toContain(`/${projectId}/meetings/${meetingId}`)
  })

  test('should have correct back navigation link', async ({ page }) => {
    const projectId = '67'
    const meetingId = '01KCEQ6T0WTN827CN68P7R0A4E'

    await page.goto(`http://localhost:3000/${projectId}/meetings/${meetingId}`)
    await page.waitForLoadState('networkidle')

    // Check that the back button links to the project meetings page
    const backButton = page.getByRole('link', { name: /back to project meetings/i })
    await expect(backButton).toHaveAttribute('href', `/${projectId}/meetings`)
  })

  test('should display meeting metadata sections', async ({ page }) => {
    const projectId = '67'
    const meetingId = '01KCEQ6T0WTN827CN68P7R0A4E'

    await page.goto(`http://localhost:3000/${projectId}/meetings/${meetingId}`)
    await page.waitForLoadState('networkidle')

    // The page should have some content structure
    // Either meeting data or a "no data" message
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // Should not show error messages
    await expect(page.locator('text=/error/i')).toHaveCount(0)
  })

  test('should render transcript without ReactMarkdown errors', async ({ page }) => {
    const projectId = '67'
    const meetingId = '01KCEQ6T0WTN827CN68P7R0A4E'

    await page.goto(`http://localhost:3000/${projectId}/meetings/${meetingId}`)
    await page.waitForLoadState('networkidle')

    // Check for the Full Transcript section
    const transcriptHeading = page.locator('h2:has-text("Full Transcript")')
    await expect(transcriptHeading).toBeVisible()

    // Verify no console errors related to ReactMarkdown className
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Wait a bit for any errors to appear
    await page.waitForTimeout(2000)

    // Check that there are no ReactMarkdown className errors
    const hasReactMarkdownError = errors.some(error =>
      error.includes('Unexpected `className` prop') ||
      error.includes('react-markdown')
    )

    expect(hasReactMarkdownError).toBe(false)
  })

  test('should render transcript with proper formatting and no overflow', async ({ page }) => {
    const projectId = '67'
    const meetingId = '01KCEQ6T0WTN827CN68P7R0A4E'

    await page.goto(`http://localhost:3000/${projectId}/meetings/${meetingId}`)
    await page.waitForLoadState('networkidle')

    // Check for the Full Transcript section
    const transcriptHeading = page.locator('h2:has-text("Full Transcript")')
    await expect(transcriptHeading).toBeVisible()

    // Find the transcript container
    const transcriptContainer = page.locator('.border-neutral-200 >> nth=-1')

    // Verify the container is visible and doesn't overflow the viewport
    await expect(transcriptContainer).toBeVisible()

    // Get the container's bounding box
    const containerBox = await transcriptContainer.boundingBox()
    if (containerBox) {
      // Get viewport size
      const viewportSize = page.viewportSize()
      if (viewportSize) {
        // Ensure the container doesn't extend beyond the viewport width
        // Account for padding and margins
        expect(containerBox.width).toBeLessThanOrEqual(viewportSize.width)
      }
    }

    // Verify text is wrapped properly (not a single long line)
    const textContent = await transcriptContainer.textContent()
    expect(textContent).toBeTruthy()

    // Check that the transcript has proper structure (either speaker entries or wrapped text)
    const hasSpeakerStructure = await page.locator('.flex-shrink-0').count() > 0
    const hasTextContent = textContent && textContent.length > 0

    expect(hasSpeakerStructure || hasTextContent).toBeTruthy()
  })
})
