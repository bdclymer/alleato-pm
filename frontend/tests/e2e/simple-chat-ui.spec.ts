import { test, expect } from '@playwright/test'

test.describe('Simple Chat UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/simple-chat')
  })

  test('should display the chat interface correctly', async ({ page }) => {
    // Check header
    await expect(page.getByText('Alleato AI Assistant')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Clear Chat' })).toBeVisible()
    
    // Check empty state
    await expect(page.getByText('How can I help you today?')).toBeVisible()
    
    // Check suggested prompts
    await expect(page.getByRole('button', { name: 'Show me active projects' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'What are my recent tasks?' })).toBeVisible()
    
    // Check input area
    const textarea = page.getByPlaceholder('Message Alleato AI...')
    await expect(textarea).toBeVisible()
    
    // Check send button is disabled when input is empty
    const sendButton = page.getByRole('button').filter({ has: page.locator('svg') }).last()
    await expect(sendButton).toBeDisabled()
  })
  
  test('should enable send button when text is entered', async ({ page }) => {
    const textarea = page.getByPlaceholder('Message Alleato AI...')
    await textarea.fill('Hello')
    
    const sendButton = page.getByRole('button').filter({ has: page.locator('svg') }).last()
    await expect(sendButton).toBeEnabled()
  })
  
  test('should use suggested prompt when clicked', async ({ page }) => {
    const suggestedPrompt = page.getByRole('button', { name: 'Show me active projects' })
    await suggestedPrompt.click()
    
    const textarea = page.getByPlaceholder('Message Alleato AI...')
    await expect(textarea).toHaveValue('Show me active projects')
  })
  
  test('should send message on Enter key', async ({ page }) => {
    const textarea = page.getByPlaceholder('Message Alleato AI...')
    await textarea.fill('Test message')
    
    // Mock the API response
    await page.route('**/api/rag-chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: '## Here are your active projects:\n\n1. **Project Alpha** - In progress\n2. **Project Beta** - Planning phase\n\n```javascript\nconst projects = ["Alpha", "Beta"];\nconsole.log(projects);\n```'
        })
      })
    })
    
    await textarea.press('Enter')
    
    // Wait for the message to appear
    await expect(page.getByText('You')).toBeVisible()
    await expect(page.getByText('Test message')).toBeVisible()
    
    // Wait for response
    await expect(page.getByText('Alleato AI')).toBeVisible()
    await expect(page.getByText('Here are your active projects:')).toBeVisible()
  })
})