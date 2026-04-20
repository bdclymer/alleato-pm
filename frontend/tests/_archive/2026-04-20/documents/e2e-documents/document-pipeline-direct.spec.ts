import { test, expect } from '@playwright/test'

test.describe('Document Pipeline Direct Access', () => {
  test('should access document pipeline page directly', async ({ page }) => {
    // Navigate directly to the document pipeline page
    await page.goto('/admin/documents/pipeline')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check if we're on the right page
    const heading = page.getByRole('heading', { name: 'Document Pipeline Management' })
    await expect(heading).toBeVisible({ timeout: 30000 })
    
    // Check for main elements
    await expect(page.getByText('Monitor and manage document processing pipeline')).toBeVisible()
    
    // Check for phase cards
    await expect(page.getByText('Parse Documents')).toBeVisible()
    await expect(page.getByText('Generate Embeddings')).toBeVisible()
    await expect(page.getByText('Extract Insights')).toBeVisible()
    
    // Check for table
    await expect(page.getByRole('table')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/document-pipeline-direct-access.png',
      fullPage: true
    })
    
    console.log('Document Pipeline page loaded successfully!')
  })
  
  test('should show mock data in table', async ({ page }) => {
    // Mock the API response with sample data
    await page.route('**/api/documents/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          documents: [
            {
              id: '1',
              fireflies_id: 'FF123',
              title: 'Q4 Planning Meeting',
              status: 'embedded',
              type: 'meeting',
              source: 'fireflies',
              date: '2024-12-10',
              created_at: '2024-12-10T10:00:00Z',
              updated_at: '2024-12-10T11:00:00Z',
              pipeline_stage: 'embedded',
              attempt_count: 1,
              last_attempt_at: '2024-12-10T11:00:00Z',
              error_message: null
            },
            {
              id: '2',
              fireflies_id: 'FF124',
              title: 'Project Kickoff Meeting',
              status: 'segmented',
              type: 'meeting',
              source: 'fireflies',
              date: '2024-12-09',
              created_at: '2024-12-09T14:00:00Z',
              updated_at: '2024-12-09T14:30:00Z',
              pipeline_stage: 'segmented',
              attempt_count: 2,
              last_attempt_at: '2024-12-09T14:30:00Z',
              error_message: null
            },
            {
              id: '3',
              fireflies_id: 'FF125',
              title: 'Budget Review',
              status: 'complete',
              type: 'meeting',
              source: 'fireflies',
              date: '2024-12-08',
              created_at: '2024-12-08T09:00:00Z',
              updated_at: '2024-12-08T10:00:00Z',
              pipeline_stage: 'done',
              attempt_count: 1,
              last_attempt_at: '2024-12-08T10:00:00Z',
              error_message: null
            }
          ]
        })
      })
    })
    
    await page.goto('/admin/documents/pipeline')
    await page.waitForLoadState('networkidle')
    
    // Check for documents in table
    await expect(page.getByText('Q4 Planning Meeting')).toBeVisible()
    await expect(page.getByText('Project Kickoff Meeting')).toBeVisible()
    await expect(page.getByText('Budget Review')).toBeVisible()
    
    // Check status badges
    await expect(page.getByText('Embedded')).toBeVisible()
    await expect(page.getByText('Segmented')).toBeVisible()
    await expect(page.getByText('Complete')).toBeVisible()
    
    // Take screenshot with data
    await page.screenshot({
      path: 'tests/screenshots/document-pipeline-with-data.png',
      fullPage: true
    })
  })
})