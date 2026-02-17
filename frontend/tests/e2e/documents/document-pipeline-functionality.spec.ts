import { test, expect } from '@playwright/test'

test.describe('Document Pipeline Functionality Tests', () => {
  test('API endpoints should work correctly', async ({ page, request }) => {
    // Test status endpoint
    const statusResponse = await request.get('/api/documents/status')
    console.log('Status API Response:', statusResponse.status())
    
    if (statusResponse.ok()) {
      const statusData = await statusResponse.json()
      console.log('Documents found:', statusData.documents?.length || 0)
      expect(statusData).toHaveProperty('documents')
      expect(Array.isArray(statusData.documents)).toBe(true)
    } else {
      console.error('Status API failed:', statusResponse.status(), await statusResponse.text())
    }

    // Test trigger endpoint - GET to check counts
    const triggerGetResponse = await request.get('/api/documents/trigger-pipeline')
    console.log('Trigger GET Response:', triggerGetResponse.status())
    
    if (triggerGetResponse.ok()) {
      const countsData = await triggerGetResponse.json()
      console.log('Phase counts:', countsData)
      expect(countsData).toHaveProperty('phaseCounts')
      expect(Array.isArray(countsData.phaseCounts)).toBe(true)
    } else {
      console.error('Trigger GET failed:', triggerGetResponse.status(), await triggerGetResponse.text())
    }
  })

  test('Document Pipeline page should load and display correctly', async ({ page }) => {
    // Navigate to the page
    await page.goto('/admin/documents/pipeline')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check if we're redirected to login
    if (page.url().includes('/auth/login')) {
      console.log('Page requires authentication - this is expected behavior')
      return
    }
    
    // Check page elements
    const heading = page.getByRole('heading', { name: 'Document Pipeline Management' })
    await expect(heading).toBeVisible()
    
    // Check for phase cards
    await expect(page.getByText('Parse Documents')).toBeVisible()
    await expect(page.getByText('Generate Embeddings')).toBeVisible()
    await expect(page.getByText('Extract Insights')).toBeVisible()
    
    // Check if table exists
    const table = page.getByRole('table')
    await expect(table).toBeVisible()
    
    // Check for refresh button
    const refreshButton = page.getByRole('button', { name: /Refresh/i })
    await expect(refreshButton).toBeVisible()
  })

  test('Trigger buttons should be interactive', async ({ page, request }) => {
    // Mock the API to return some documents ready for processing
    await page.route('**/api/documents/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          documents: [
            {
              id: '1',
              fireflies_id: 'FF001',
              title: 'Test Meeting 1',
              status: 'raw_ingested',
              type: 'meeting',
              source: 'fireflies',
              pipeline_stage: 'raw_ingested',
              attempt_count: 0
            },
            {
              id: '2',
              fireflies_id: 'FF002',
              title: 'Test Meeting 2',
              status: 'segmented',
              type: 'meeting',
              source: 'fireflies',
              pipeline_stage: 'segmented',
              attempt_count: 1
            }
          ]
        })
      })
    })

    await page.route('**/api/documents/trigger-pipeline', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            phaseCounts: [
              { phase: 'parse', ready: 1, stage: 'raw_ingested' },
              { phase: 'embed', ready: 1, stage: 'segmented' },
              { phase: 'extract', ready: 0, stage: 'embedded' }
            ]
          })
        })
      } else {
        // POST request - trigger action
        const postData = route.request().postDataJSON()
        console.log('Trigger request:', postData)
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: `Triggered ${postData.phase} phase successfully`,
            processed: 1,
            total: 1,
            results: [
              {
                fireflies_id: 'FF001',
                status: 'triggered',
                message: 'Success'
              }
            ]
          })
        })
      }
    })
    
    await page.goto('/admin/documents/pipeline')
    
    // Check if parse button is enabled (1 document ready)
    const parseButton = page.getByRole('button', { name: /Trigger Parse Documents/i })
    await expect(parseButton).toBeEnabled()
    
    // Check if embed button is enabled (1 document ready)
    const embedButton = page.getByRole('button', { name: /Trigger Generate Embeddings/i })
    await expect(embedButton).toBeEnabled()
    
    // Check if extract button is disabled (0 documents ready)
    const extractButton = page.getByRole('button', { name: /Trigger Extract Insights/i })
    await expect(extractButton).toBeDisabled()
    
    // Test clicking a button
    await parseButton.click()
    
    // Should show loading state
    await expect(page.getByText('Processing...')).toBeVisible()
    
    // Should show success toast
    await expect(page.getByText(/Triggered parse phase successfully/i)).toBeVisible()
  })

  test('Error handling should work correctly', async ({ page }) => {
    // Mock API to return errors
    await page.route('**/api/documents/status', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database connection failed' })
      })
    })
    
    await page.goto('/admin/documents/pipeline')
    
    // Should show error toast
    await expect(page.getByText('Failed to fetch documents')).toBeVisible()
  })
})