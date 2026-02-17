import { test, expect } from '@playwright/test';

test.describe('AI Chat Widget', () => {
  test('should display Intercom-style chat widget button', async ({ page }) => {
    // Navigate to the home page
    await page.goto('http://localhost:3001');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if the chat widget button is visible in the bottom right
    const chatButton = page.locator('button[aria-label="Open chat"]');
    await expect(chatButton).toBeVisible();

    // Verify button styling (should be orange/gradient)
    const buttonBgColor = await chatButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });
    expect(buttonBgColor).toContain('gradient');

    // Take a screenshot showing the widget button
    await page.screenshot({
      path: 'frontend/tests/screenshots/chat-widget-button.png',
      fullPage: false
    });

    console.log('✓ Chat widget button displayed correctly');
  });

  test('should open chat panel when button is clicked', async ({ page }) => {
    // Navigate to the home page
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Click the chat widget button
    const chatButton = page.locator('button[aria-label="Open chat"]');
    await chatButton.click();

    // Wait for the chat panel to appear
    await page.waitForTimeout(500); // Allow for animation

    // Verify the chat panel is visible
    const chatPanel = page.locator('text=Alleato AI Assistant');
    await expect(chatPanel).toBeVisible();

    // Verify the header has the gradient background
    const header = page.locator('div:has-text("Alleato AI Assistant")').first();
    await expect(header).toBeVisible();

    // Check for the green online indicator
    const onlineIndicator = page.locator('div.bg-green-400.rounded-full');
    await expect(onlineIndicator).toBeVisible();

    // Take a screenshot showing the open chat widget
    await page.screenshot({
      path: 'frontend/tests/screenshots/chat-widget-open.png',
      fullPage: false
    });

    console.log('✓ Chat widget opens correctly');
  });

  test('should minimize and restore chat panel', async ({ page }) => {
    // Navigate and open the chat
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    const chatButton = page.locator('button[aria-label="Open chat"]');
    await chatButton.click();
    await page.waitForTimeout(500);

    // Click the minimize button
    const minimizeButton = page.locator('button[aria-label="Minimize chat"]');
    await minimizeButton.click();
    await page.waitForTimeout(300);

    // Verify the chat panel is minimized (should be smaller)
    const chatPanel = page.locator('text=Alleato AI Assistant').locator('..');
    const isMinimized = await chatPanel.evaluate((el) => {
      const height = window.getComputedStyle(el.parentElement!).height;
      return parseInt(height) < 100; // Minimized should be ~64px
    });
    expect(isMinimized).toBeTruthy();

    // Take a screenshot showing minimized state
    await page.screenshot({
      path: 'frontend/tests/screenshots/chat-widget-minimized.png',
      fullPage: false
    });

    console.log('✓ Chat widget minimizes correctly');
  });

  test('should close chat panel when close button is clicked', async ({ page }) => {
    // Navigate and open the chat
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    const chatButton = page.locator('button[aria-label="Open chat"]');
    await chatButton.click();
    await page.waitForTimeout(500);

    // Click the close button
    const closeButton = page.locator('button[aria-label="Close chat"]');
    await closeButton.click();
    await page.waitForTimeout(300);

    // Verify the chat panel is no longer visible
    const chatPanel = page.locator('text=Alleato AI Assistant');
    await expect(chatPanel).not.toBeVisible();

    // Verify the chat button is visible again
    await expect(chatButton).toBeVisible();

    console.log('✓ Chat widget closes correctly');
  });

  test('should display chat interface or offline message', async ({ page }) => {
    // Navigate and open the chat
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    const chatButton = page.locator('button[aria-label="Open chat"]');
    await chatButton.click();
    await page.waitForTimeout(2000); // Wait for bootstrap

    // Check if either the chat interface or offline message is displayed
    const chatInterface = page.locator('[data-testid="rag-chatkit-panel"]');
    const offlineMessage = page.locator('text=/offline|demo mode/i');
    const connectingMessage = page.locator('text=Connecting to Alleato AI');

    // At least one of these should be visible
    const hasChatInterface = await chatInterface.isVisible().catch(() => false);
    const hasOfflineMessage = await offlineMessage.isVisible().catch(() => false);
    const hasConnectingMessage = await connectingMessage.isVisible().catch(() => false);

    expect(hasChatInterface || hasOfflineMessage || hasConnectingMessage).toBeTruthy();

    // Take a screenshot showing the chat content
    await page.screenshot({
      path: 'frontend/tests/screenshots/chat-widget-content.png',
      fullPage: false
    });

    console.log('✓ Chat widget displays content correctly');
  });
});
