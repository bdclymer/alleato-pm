import { test, expect } from '@playwright/test'

test.describe('Simple Chat Screenshots', () => {
  test('capture simple chat interface', async ({ page }) => {
    await page.goto('/simple-chat')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Alleato AI Assistant')).toBeVisible()
    
    // Take screenshot of empty state
    await page.screenshot({
      path: 'tests/screenshots/simple-chat-empty-state.png',
      fullPage: true
    })
    
    // Fill in a message
    const textarea = page.getByPlaceholder('Message Alleato AI...')
    await textarea.fill('Show me a markdown formatted response with code examples')
    
    // Take screenshot with message typed
    await page.screenshot({
      path: 'tests/screenshots/simple-chat-with-message.png',
      fullPage: true
    })
    
    // Mock response and send message
    await page.route('**/api/rag-chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: `## Project Overview

Here's a summary of your active projects:

### 1. Project Alpha
- **Status**: In Progress
- **Progress**: 75%
- **Team Size**: 5 members

### 2. Project Beta  
- **Status**: Planning Phase
- **Progress**: 20%
- **Team Size**: 3 members

### Code Example

Here's how you can fetch project data:

\`\`\`javascript
async function fetchProjects() {
  const response = await fetch('/api/projects');
  const data = await response.json();
  
  return data.projects.filter(p => p.status === 'active');
}

// Usage
const activeProjects = await fetchProjects();
console.log(\`Found \${activeProjects.length} active projects\`);
\`\`\`

> **Note**: Make sure you have proper authentication before making API calls.

### Next Steps
1. Review project timelines
2. Schedule team meetings
3. Update project milestones

Feel free to ask me for more details about any specific project!`
        })
      })
    })
    
    await textarea.press('Enter')
    
    // Wait for response
    await expect(page.getByText('Project Overview')).toBeVisible({ timeout: 10000 })
    
    // Wait a bit for animations to complete
    await page.waitForTimeout(1000)
    
    // Take screenshot with formatted response
    await page.screenshot({
      path: 'tests/screenshots/simple-chat-with-response.png',
      fullPage: true
    })
    
    console.log('Screenshots captured successfully!')
  })
})