const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Opening Document Pipeline Management page...');
  
  // Go to the page
  await page.goto('http://localhost:3000/admin/documents/pipeline');
  
  // Wait a bit to see what happens
  await page.waitForTimeout(2000);
  
  // Get the current URL
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  // Take a screenshot
  await page.screenshot({ path: 'pipeline-page-screenshot.png' });
  console.log('Screenshot saved as pipeline-page-screenshot.png');
  
  // Check for error messages
  const errorText = await page.textContent('body');
  if (errorText.includes('error')) {
    console.log('Error found on page:', errorText.substring(0, 200));
  }
  
  // Check if redirected to login
  if (currentUrl.includes('/auth/login')) {
    console.log('Page redirected to login - this is expected for admin routes');
    
    // Try to log in using dev login
    console.log('Attempting to use dev login...');
    await page.goto('http://localhost:3000/dev-login?email=test@example.com&password=testpassword123');
    await page.waitForTimeout(2000);
    
    // Now try the pipeline page again
    console.log('Navigating back to pipeline page...');
    await page.goto('http://localhost:3000/admin/documents/pipeline');
    await page.waitForTimeout(3000);
    
    // Take another screenshot
    await page.screenshot({ path: 'pipeline-page-after-login.png' });
    console.log('Post-login screenshot saved');
    
    // Check page content
    const hasTitle = await page.locator('h1:has-text("Document Pipeline Management")').count() > 0;
    console.log('Has Document Pipeline Management title:', hasTitle);
    
    const hasParseButton = await page.locator('button:has-text("Trigger Parse")').count() > 0;
    console.log('Has Parse trigger button:', hasParseButton);
    
    const hasTable = await page.locator('table').count() > 0;
    console.log('Has documents table:', hasTable);
  }
  
  console.log('\nTest complete! Browser will stay open for manual inspection.');
  console.log('Press Ctrl+C to close.');
})();