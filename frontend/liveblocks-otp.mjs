import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const context = await browser.newContext();
const page = await context.newPage();

// Step 1: Navigate to Liveblocks dashboard - should redirect to Google login
console.log('Opening Liveblocks dashboard...');
await page.goto('https://liveblocks.io/dashboard');
await page.waitForTimeout(4000);
console.log('URL after load:', page.url());
await page.screenshot({ path: '/tmp/lb-start.png' });

// Handle Google sign-in flow
// First check if we need to enter email
const emailInput = page.locator('input[type="email"]').first();
if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  console.log('Email input found, filling...');
  await emailInput.fill('megan@megankharrison.com');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
}

// Now enter password
const passwordInput = page.locator('input[type="password"]').first();
if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
  console.log('Password input found, entering password...');
  await passwordInput.fill('Mandypup2024!!!');
  await page.screenshot({ path: '/tmp/lb-pw-filled.png' });
  await page.keyboard.press('Enter');
  console.log('Password submitted');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: '/tmp/lb-after-pw.png' });
  console.log('After password - URL:', page.url());
} else {
  console.log('No password input found');
  await page.screenshot({ path: '/tmp/lb-no-pw.png' });
  console.log('URL:', page.url());
}

// Wait for Liveblocks dashboard to load
await page.waitForTimeout(4000);
console.log('Dashboard URL:', page.url());
await page.screenshot({ path: '/tmp/lb-dashboard.png' });

// Now navigate to webhooks
// Try sidebar navigation
console.log('Looking for Webhooks in sidebar...');
await page.screenshot({ path: '/tmp/lb-before-webhooks.png' });

// Try clicking on a project first if needed
const projectLinks = page.locator('a[href*="/dashboard/"]').first();
console.log('Page content snapshot coming...');

// Look for webhooks link
const webhooksLink = page.locator('a:has-text("Webhook"), a[href*="webhook"], button:has-text("Webhook")').first();
if (await webhooksLink.isVisible({ timeout: 3000 }).catch(() => false)) {
  console.log('Found webhooks link, clicking...');
  await webhooksLink.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/lb-webhooks-page.png' });
} else {
  console.log('Webhooks link not immediately visible, trying navigation...');
  // Try going directly to webhooks URL
  await page.goto('https://liveblocks.io/dashboard/webhooks');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/lb-webhooks-direct.png' });
  console.log('Webhooks direct URL:', page.url());
}

// Check page content
const pageText = await page.innerText('body').catch(() => 'could not get text');
console.log('Page text (first 500):', pageText.substring(0, 500));

await context.storageState({ path: '/tmp/liveblocks-session.json' });
console.log('Session saved');
await browser.close();
