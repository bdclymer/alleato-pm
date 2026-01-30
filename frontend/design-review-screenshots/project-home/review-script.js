const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function conductDesignReview() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  // Load auth state if exists
  const authPath = path.join(__dirname, '../../tests/.auth/user.json');
  if (fs.existsSync(authPath)) {
    await context.addCookies(JSON.parse(fs.readFileSync(authPath, 'utf-8')).cookies);
  }

  const page = await context.newPage();
  const screenshotDir = __dirname;

  console.log('Phase 0: Navigation to project homepage...');

  // Navigate to localhost:3000
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Take screenshot of landing page
  await page.screenshot({
    path: path.join(screenshotDir, '00-landing-page.png'),
    fullPage: true
  });

  // Find and click on a project to get to project homepage
  console.log('Looking for project links...');

  // Try to find project cards or links
  const projectLinks = await page.locator('a[href*="/"]').all();
  let projectUrl = null;

  for (const link of projectLinks) {
    const href = await link.getAttribute('href');
    if (href && href.match(/^\/\d+\/(home)?$/)) {
      projectUrl = href;
      console.log(`Found project link: ${href}`);
      await link.click();
      break;
    }
  }

  // If no specific project found, try clicking first visible project
  if (!projectUrl) {
    const firstProject = page.locator('a[href^="/"]').first();
    const href = await firstProject.getAttribute('href');
    console.log(`Clicking first project: ${href}`);
    await firstProject.click();
  }

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);

  // Save page HTML for DOM analysis
  const html = await page.content();
  fs.writeFileSync(path.join(screenshotDir, 'page-dom.html'), html);

  console.log('\nPhase 1: Desktop viewport (1440x900)');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(screenshotDir, '01-desktop-1440x900.png'),
    fullPage: true
  });

  console.log('Phase 2: Tablet viewport (768x1024)');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(screenshotDir, '02-tablet-768x1024.png'),
    fullPage: true
  });

  console.log('Phase 3: Mobile viewport (375x667)');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(screenshotDir, '03-mobile-375x667.png'),
    fullPage: true
  });

  // Reset to desktop for interaction testing
  console.log('\nPhase 4: Interaction testing');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(1000);

  // Test hover states on interactive elements
  const interactiveElements = await page.locator('button, a, [role="button"]').all();
  console.log(`Found ${interactiveElements.length} interactive elements`);

  if (interactiveElements.length > 0) {
    await interactiveElements[0].hover();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotDir, '04-hover-state.png'),
      fullPage: false
    });
  }

  // Check keyboard navigation
  console.log('\nPhase 5: Keyboard navigation');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(screenshotDir, '05-keyboard-focus-1.png'),
    fullPage: false
  });

  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(screenshotDir, '06-keyboard-focus-2.png'),
    fullPage: false
  });

  // Console messages
  console.log('\nPhase 6: Browser console check');
  const messages = [];
  page.on('console', msg => messages.push({ type: msg.type(), text: msg.text() }));

  await page.waitForTimeout(2000);

  fs.writeFileSync(
    path.join(screenshotDir, 'console-messages.json'),
    JSON.stringify(messages, null, 2)
  );

  console.log(`Captured ${messages.length} console messages`);
  console.log(`Screenshots saved to: ${screenshotDir}`);

  await browser.close();

  return {
    url: currentUrl,
    screenshotCount: 6,
    interactiveElements: interactiveElements.length,
    consoleMessages: messages.length
  };
}

conductDesignReview()
  .then(result => {
    console.log('\n✅ Design review complete!');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error during review:', error);
    process.exit(1);
  });
