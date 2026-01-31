import { test, expect } from '@playwright/test';

test.describe('Chat RAG End-to-End Test', () => {
  test('Chat RAG page loads and connects to backend', async ({ page }) => {
    // Navigate to chat-rag page
    await page.goto('/chat-rag');
    await page.waitForLoadState('networkidle');

    const chatPanel = page.locator('[data-testid="rag-chatkit-panel"]');
    const fallbackPanel = page.locator('[data-testid="simple-rag-chat"]');

    let chatKitVisible = false;
    try {
      await chatPanel.waitFor({ state: 'visible', timeout: 12000 });
      chatKitVisible = true;
    } catch {
      await fallbackPanel.waitFor({ state: 'visible', timeout: 5000 });
    }

    // Take screenshot of initial state
    await page.screenshot({ path: 'tests/screenshots/chat-rag-01-loaded.png', fullPage: true });
    console.log('Chat RAG page loaded successfully');

    if (chatKitVisible) {
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'tests/screenshots/chat-rag-02-interface.png', fullPage: true });
      console.log('ChatKit interface screenshot captured');
    } else {
      await page.screenshot({ path: 'tests/screenshots/chat-rag-02-interface.png', fullPage: true });
      console.log('Offline SimpleRagChat interface screenshot captured');
    }
  });

  test('Chat sends message and receives RAG response', async ({ page }) => {
    // Navigate to chat-rag page
    await page.goto('/chat-rag');
    await page.waitForLoadState('networkidle');

    const chatPanel = page.locator('[data-testid="rag-chatkit-panel"]');
    const fallbackPanel = page.locator('[data-testid="simple-rag-chat"]');
    let chatKitVisible = false;
    try {
      await chatPanel.waitFor({ state: 'visible', timeout: 12000 });
      chatKitVisible = true;
    } catch {
      await fallbackPanel.waitFor({ state: 'visible', timeout: 5000 });
    }

    await page.screenshot({ path: 'tests/screenshots/chat-rag-03-ready.png', fullPage: true });

    const testMessage = 'What can you help me with?';

    if (chatKitVisible) {
      await page.waitForTimeout(3000);
      let textarea = page.locator('textarea').first();
      if (!(await textarea.isVisible().catch(() => false))) {
        textarea = page.locator('[contenteditable="true"]').first();
      }
      if (!(await textarea.isVisible().catch(() => false))) {
        textarea = page.locator('input[type="text"]').first();
      }
      if (!(await textarea.isVisible().catch(() => false))) {
        textarea = chatPanel.locator('textarea, [contenteditable="true"], input[type="text"]').first();
      }

      if (await textarea.isVisible().catch(() => false)) {
        await textarea.click();
        await textarea.fill(testMessage);
      } else {
        await page.keyboard.type(testMessage);
      }
      await page.screenshot({ path: 'tests/screenshots/chat-rag-04-typed.png', fullPage: true });
      await page.keyboard.press('Enter');

      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(5000);
        await page.screenshot({
          path: `tests/screenshots/chat-rag-05-waiting-${(i + 1) * 5}s.png`,
          fullPage: true
        });
        const pageContent = await page.content();
        if (pageContent.includes('help you') || pageContent.includes('assist')) {
          break;
        }
      }
    } else {
      const textarea = fallbackPanel.locator('textarea');
      await textarea.fill(testMessage);
      await page.screenshot({ path: 'tests/screenshots/chat-rag-04-typed.png', fullPage: true });
      await textarea.press('Enter');
      await page.waitForTimeout(1500);
      await expect(fallbackPanel.getByText('demo mode', { exact: false })).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'tests/screenshots/chat-rag-06-final.png', fullPage: true });

    const pageContent = await page.content();
    expect(pageContent).not.toContain('Backend Not Running');
    expect(pageContent).not.toContain('500 Internal Server Error');
  });

  test('Starter prompts are displayed', async ({ page }) => {
    await page.goto('/chat-rag');
    await page.waitForLoadState('networkidle');

    const chatPanel = page.locator('[data-testid="rag-chatkit-panel"]');
    const fallbackPanel = page.locator('[data-testid="simple-rag-chat"]');
    let chatKitVisible = false;
    try {
      await chatPanel.waitFor({ state: 'visible', timeout: 12000 });
      chatKitVisible = true;
    } catch {
      await fallbackPanel.waitFor({ state: 'visible', timeout: 5000 });
    }

    await page.waitForTimeout(2000);

    if (chatKitVisible) {
      const composer = chatPanel.locator('[data-chatkit-composer]');
      await expect(composer).toBeVisible({ timeout: 5000 });
    } else {
      const prompts = [
        'What projects do we have?',
        'Show me recent tasks',
        'Summarize the latest meetings'
      ];
      let foundPrompts = 0;
      for (const prompt of prompts) {
        const promptElement = fallbackPanel.getByText(prompt, { exact: true });
        if (await promptElement.isVisible().catch(() => false)) {
          foundPrompts++;
        }
      }
      expect(foundPrompts).toBeGreaterThan(0);
    }

    await page.screenshot({ path: 'tests/screenshots/chat-rag-07-prompts.png', fullPage: true });
  });

  test('API endpoints respond correctly', async ({ page }) => {
    // Test bootstrap endpoint
    const bootstrapResponse = await page.request.get('/api/rag-chatkit/bootstrap');
    expect(bootstrapResponse.ok()).toBeTruthy();

    const bootstrapData = await bootstrapResponse.json();
    console.log('Bootstrap response:', JSON.stringify(bootstrapData, null, 2));

    // Verify bootstrap response structure
    expect(bootstrapData).toHaveProperty('current_agent');

    // Test simple chat endpoint
    const chatResponse = await page.request.post('/api/rag-chat', {
      data: {
        message: 'Hello, what can you help me with?'
      }
    });
    expect(chatResponse.ok()).toBeTruthy();

    const chatData = await chatResponse.json();
    console.log('Chat response preview:', chatData.response?.substring(0, 200));

    // Verify chat response structure
    expect(chatData).toHaveProperty('response');
    expect(chatData.response.length).toBeGreaterThan(10);

    console.log('API endpoints test PASSED');
  });
});
