import { test, expect, Page } from '@playwright/test';
import { format } from 'date-fns';
import path from 'path';

// Simplified test that captures current state of forms

const SCREENSHOT_DIR = 'tests/screenshots/form-tests';

// Helper function to take and save screenshot
async function takeScreenshot(page: Page, name: string) {
  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
  const filename = `${timestamp}-${name}.png`;
  await page.screenshot({ 
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: true 
  });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filename;
}

test.describe('Form Testing - Current State Documentation', () => {
  test.use({ 
    // Bypass auth for documentation purposes
    storageState: { cookies: [], origins: [] } 
  });

  test('Document all accessible forms', async ({ page }) => {
    const forms = [
      { name: 'Login Form', url: '/auth/login', description: 'User authentication' },
      { name: 'Sign Up Form', url: '/auth/sign-up', description: 'New user registration' },
      { name: 'Forgot Password', url: '/auth/forgot-password', description: 'Password reset' },
      { name: 'Project Form', url: '/project-form', description: 'Create new project' },
      { name: 'Budget Line Item Form', url: '/1/budget/line-item/new', description: 'Add budget items' },
      { name: 'Commitments Form', url: '/1/commitments/new?type=subcontract', description: 'Create subcontract' },
      { name: 'Purchase Order Form', url: '/1/commitments/new?type=purchase_order', description: 'Create PO' },
      { name: 'Contracts Form', url: '/1/contracts/new', description: 'Create prime contract' },
      { name: 'Change Orders Form', url: '/1/change-orders/new', description: 'Create change order' },
      { name: 'Invoices Form', url: '/1/invoices/new', description: 'Create invoice' }
    ];

    console.log('🔍 Documenting all forms in the application...\n');

    for (const form of forms) {
      console.log(`\n📋 Testing: ${form.name}`);
      console.log(`   URL: ${form.url}`);
      console.log(`   Purpose: ${form.description}`);

      try {
        await page.goto(form.url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000); // Give page time to render

        // Check if form exists
        const hasForm = await page.locator('form').count() > 0;
        const hasInputs = await page.locator('input, select, textarea').count() > 0;
        
        if (hasForm || hasInputs) {
          console.log(`   ✅ Form found - capturing screenshot`);
          const screenshot = await takeScreenshot(page, form.name.toLowerCase().replace(/\s+/g, '-'));
          
          // Document form fields
          const inputs = await page.locator('input[name], select[name], textarea[name]').all();
          if (inputs.length > 0) {
            console.log(`   📝 Form fields found:`);
            for (const input of inputs) {
              const name = await input.getAttribute('name');
              const type = await input.getAttribute('type') || 'text';
              const tag = await input.evaluate(el => el.tagName.toLowerCase());
              console.log(`      - ${name} (${tag}${type !== 'text' ? `:${type}` : ''})`);
            }
          }
        } else {
          console.log(`   ⚠️  No form found - page might require auth or form not implemented`);
          await takeScreenshot(page, `${form.name.toLowerCase().replace(/\s+/g, '-')}-current-state`);
        }

        // Check for error messages or redirects
        const errorMessages = await page.locator('text=/error|not found|404/i').count();
        if (errorMessages > 0) {
          console.log(`   ⚠️  Error messages detected on page`);
        }

      } catch (error) {
        console.log(`   ❌ Error accessing form: ${error.message}`);
      }
    }

    console.log('\n\n📊 FORM DOCUMENTATION SUMMARY');
    console.log('================================');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log('\nNext steps:');
    console.log('1. Review screenshots to see current state of each form');
    console.log('2. Identify which forms need implementation');
    console.log('3. Run full tests with authentication when dev server is running');
  });

  test('Check data display pages', async ({ page }) => {
    const pages = [
      { name: 'Project List', url: '/', description: 'All projects dashboard' },
      { name: 'Project Home', url: '/1/home', description: 'Project overview' },
      { name: 'Budget Page', url: '/1/budget', description: 'Budget management' },
      { name: 'Commitments Page', url: '/1/commitments', description: 'Commitments list' },
      { name: 'Contracts Page', url: '/1/contracts', description: 'Prime contracts' },
      { name: 'Change Orders Page', url: '/1/change-orders', description: 'Change orders' },
      { name: 'Invoices Page', url: '/1/invoices', description: 'Invoice management' }
    ];

    console.log('\n\n🔍 Documenting data display pages...\n');

    for (const page_info of pages) {
      console.log(`\n📄 Checking: ${page_info.name}`);
      console.log(`   URL: ${page_info.url}`);
      
      try {
        await page.goto(page_info.url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        await takeScreenshot(page, page_info.name.toLowerCase().replace(/\s+/g, '-'));
        
        // Check for data tables
        const tables = await page.locator('table').count();
        if (tables > 0) {
          console.log(`   ✅ Found ${tables} data table(s)`);
        }

        // Check for empty states
        const emptyStates = await page.locator('text=/no data|no items|empty/i').count();
        if (emptyStates > 0) {
          console.log(`   ℹ️  Empty state detected`);
        }

      } catch (error) {
        console.log(`   ❌ Error accessing page: ${error.message}`);
      }
    }
  });
});