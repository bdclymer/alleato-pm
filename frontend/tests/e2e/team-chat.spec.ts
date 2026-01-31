import { test, expect } from '@playwright/test'

test.describe('Team Chat Functionality', () => {
  test('should load team chat page and allow messaging', async ({ page }) => {
    // Navigate to team chat
    await page.goto('/team-chat')
    
    // Wait for the page to load
    await expect(page.getByRole('heading', { name: 'Team Chat' })).toBeVisible()
    
    // Check that all channel tabs are present
    await expect(page.getByRole('tab', { name: '#general' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '#project-updates' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '#support' })).toBeVisible()
    
    // Verify the general channel is active by default
    const generalTab = page.getByRole('tab', { name: '#general' })
    await expect(generalTab).toHaveAttribute('data-state', 'active')
    
    // Check that the chat input is present
    const chatInput = page.getByPlaceholder('Type a message...')
    await expect(chatInput).toBeVisible()
    
    // Type and send a message
    await chatInput.fill('Hello from Playwright test!')
    await chatInput.press('Enter')
    
    // Verify the message appears in the chat
    await expect(page.getByText('Hello from Playwright test!')).toBeVisible()
    
    // Switch to project channel
    await page.getByRole('tab', { name: '#project-updates' }).click()
    
    // Send a message in the project channel
    await chatInput.fill('Project update: Tests are passing!')
    await chatInput.press('Enter')
    
    // Verify the message appears
    await expect(page.getByText('Project update: Tests are passing!')).toBeVisible()
    
    // Take a screenshot for visual verification
    await page.screenshot({ 
      path: 'tests/screenshots/team-chat-test.png',
      fullPage: true 
    })
  })

  test('should maintain separate messages per channel', async ({ page }) => {
    await page.goto('/team-chat')
    
    // Send message in general channel
    const chatInput = page.getByPlaceholder('Type a message...')
    await chatInput.fill('General channel message')
    await chatInput.press('Enter')
    
    // Switch to support channel
    await page.getByRole('tab', { name: '#support' }).click()
    
    // Verify the general message is not visible
    await expect(page.getByText('General channel message')).not.toBeVisible()
    
    // Send message in support channel
    await chatInput.fill('Support channel message')
    await chatInput.press('Enter')
    
    // Switch back to general
    await page.getByRole('tab', { name: '#general' }).click()
    
    // Verify only general message is visible
    await expect(page.getByText('General channel message')).toBeVisible()
    await expect(page.getByText('Support channel message')).not.toBeVisible()
  })
})