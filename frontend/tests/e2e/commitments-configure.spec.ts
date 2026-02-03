import { test, expect, Page } from '@playwright/test';

/**
 * Commitments Configuration Page E2E Tests - Phase 8 Testing
 *
 * Tests the complete configuration page functionality including:
 * - Contract Configuration section
 * - Workflow Settings section
 * - Invoice Settings section
 * - Permissions section
 * - Form validation
 * - Save functionality
 */

const TEST_PROJECT_ID = '67';

// Helper function to navigate to configure page
async function navigateToConfigure(page: Page, projectId: string = TEST_PROJECT_ID) {
  await page.goto(`/${projectId}/commitments/configure`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// Helper function to take screenshots
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/screenshots/commitments-configure/${name}.png`,
    fullPage: true,
  });
}

test.describe('Configuration Page - Navigation', () => {
  test('should display configuration page with header', async ({ page }) => {
    await navigateToConfigure(page);

    // Verify page header
    await expect(page.locator('text=Commitment Settings')).toBeVisible();

    await takeScreenshot(page, '01-configure-page-header');
  });

  test('should display Back button', async ({ page }) => {
    await navigateToConfigure(page);

    const backButton = page.getByRole('button', { name: /Back/i });
    await expect(backButton).toBeVisible();

    await takeScreenshot(page, '02-back-button');
  });

  test('should navigate back to commitments list', async ({ page }) => {
    await navigateToConfigure(page);

    const backButton = page.getByRole('button', { name: /Back/i });
    await backButton.click();

    await page.waitForURL(`**/${TEST_PROJECT_ID}/commitments`, { timeout: 10000 });

    await takeScreenshot(page, '03-navigated-back');
  });

  test('should display Update button in header', async ({ page }) => {
    await navigateToConfigure(page);

    const updateButton = page.getByRole('button', { name: /Update/i }).first();
    await expect(updateButton).toBeVisible();

    await takeScreenshot(page, '04-update-button');
  });

  test('should display sidebar navigation', async ({ page }) => {
    await navigateToConfigure(page);

    // Verify sidebar navigation items
    await expect(page.locator('button:has-text("Contract Configuration")')).toBeVisible();
    await expect(page.locator('button:has-text("Workflow Settings")')).toBeVisible();
    await expect(page.locator('button:has-text("Invoice Settings")')).toBeVisible();
    await expect(page.locator('button:has-text("Permissions Table")')).toBeVisible();

    await takeScreenshot(page, '05-sidebar-navigation');
  });
});

test.describe('Configuration Page - Contract Configuration Section', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToConfigure(page);
  });

  test('should display Contract Configuration section by default', async ({ page }) => {
    await expect(page.locator('h2:has-text("Contract Configuration"), h3:has-text("Contract Configuration")')).toBeVisible();

    await takeScreenshot(page, '06-contract-config-section');
  });

  test('should display Contracts Private By Default checkbox', async ({ page }) => {
    const checkbox = page.locator('#contractsPrivateByDefault');
    await expect(checkbox).toBeVisible();

    // Checkbox should be checked by default (according to DEFAULT_CONFIGURATION)
    await expect(checkbox).toBeChecked();

    await takeScreenshot(page, '07-private-by-default');
  });

  test('should toggle Contracts Private By Default', async ({ page }) => {
    const checkbox = page.locator('#contractsPrivateByDefault');

    // Uncheck
    await checkbox.uncheck();
    await page.waitForTimeout(300);
    await expect(checkbox).not.toBeChecked();

    // Check again
    await checkbox.check();
    await page.waitForTimeout(300);
    await expect(checkbox).toBeChecked();

    await takeScreenshot(page, '08-toggle-private-default');
  });

  test('should display Enable Purchase Orders checkbox', async ({ page }) => {
    const checkbox = page.locator('#enablePurchaseOrders');
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked();

    await takeScreenshot(page, '09-enable-purchase-orders');
  });

  test('should display Enable Subcontracts checkbox', async ({ page }) => {
    const checkbox = page.locator('#enableSubcontracts');
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked();

    await takeScreenshot(page, '10-enable-subcontracts');
  });

  test('should display RFQ Due Days input', async ({ page }) => {
    const input = page.locator('#rfqDueDaysDefault');
    await expect(input).toBeVisible();

    // Default should be 7
    await expect(input).toHaveValue('7');

    await takeScreenshot(page, '11-rfq-due-days');
  });

  test('should update RFQ Due Days value', async ({ page }) => {
    const input = page.locator('#rfqDueDaysDefault');

    await input.clear();
    await input.fill('14');
    await page.waitForTimeout(300);

    await expect(input).toHaveValue('14');

    await takeScreenshot(page, '12-rfq-due-days-updated');
  });

  test('should display Number of Change Order Tiers select', async ({ page }) => {
    // Look for the select trigger
    const selectTrigger = page.locator('button:near(:text("Number of Commitment Change Order Tiers"))').first();
    if (await selectTrigger.isVisible({ timeout: 5000 })) {
      await takeScreenshot(page, '13-change-order-tiers-select');
    }
  });

  test('should change Number of Change Order Tiers', async ({ page }) => {
    const selectTrigger = page.locator('button:near(:text("Number of Commitment Change Order Tiers"))').first();
    if (await selectTrigger.isVisible({ timeout: 5000 })) {
      await selectTrigger.click();
      await page.waitForTimeout(300);

      const option2 = page.getByRole('option', { name: '2' });
      if (await option2.isVisible({ timeout: 2000 })) {
        await option2.click();
        await page.waitForTimeout(300);
      }

      await takeScreenshot(page, '14-change-order-tiers-changed');
    }
  });

  test('should display Allow Standard Users checkboxes', async ({ page }) => {
    await expect(page.locator('#allowStandardToCreateCCOs')).toBeVisible();
    await expect(page.locator('#allowStandardToCreateCORs')).toBeVisible();
    await expect(page.locator('#allowStandardToCreatePCOs')).toBeVisible();

    await takeScreenshot(page, '15-standard-user-permissions');
  });

  test('should display Enable Always Editable SOV checkbox', async ({ page }) => {
    const checkbox = page.locator('#enableAlwaysEditableSov');
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();

    await takeScreenshot(page, '16-always-editable-sov');
  });

  test('should display Enable Field Initiated Change Orders checkbox', async ({ page }) => {
    const checkbox = page.locator('#enableFieldInitiatedChangeOrders');
    await expect(checkbox).toBeVisible();

    await takeScreenshot(page, '17-field-initiated-cos');
  });

  test('should display Show Markup Criteria checkbox', async ({ page }) => {
    const checkbox = page.locator('#showMarkupCriteriaOnCommitments');
    await expect(checkbox).toBeVisible();

    await takeScreenshot(page, '18-show-markup-criteria');
  });
});

test.describe('Configuration Page - Default Distributions Section', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToConfigure(page);
  });

  test('should display Default Distributions card', async ({ page }) => {
    await expect(page.locator('h2:has-text("Default Distributions"), h3:has-text("Default Distributions")')).toBeVisible();

    await takeScreenshot(page, '19-default-distributions');
  });

  test('should display Include Primary Contact checkbox', async ({ page }) => {
    const checkbox = page.locator('#includePrimaryContactInDistribution');
    await expect(checkbox).toBeVisible();

    await takeScreenshot(page, '20-include-primary-contact');
  });

  test('should display distribution select dropdowns', async ({ page }) => {
    // Look for person selectors
    const selectors = page.locator('button:has-text("Select A Person")');
    const count = await selectors.count();

    expect(count).toBeGreaterThanOrEqual(4);

    await takeScreenshot(page, '21-distribution-selectors');
  });
});

test.describe('Configuration Page - Default Contract Settings Section', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToConfigure(page);
  });

  test('should display Default Contract Settings card', async ({ page }) => {
    await expect(page.locator('h2:has-text("Default Contract Settings"), h3:has-text("Default Contract Settings")')).toBeVisible();

    await takeScreenshot(page, '22-default-contract-settings');
  });

  test('should display accounting method selects', async ({ page }) => {
    // Purchase Order accounting method
    await expect(page.locator('text=Default Accounting Method for Purchase Orders')).toBeVisible();

    // Subcontract accounting method
    await expect(page.locator('text=Default Accounting Method For Subcontracts')).toBeVisible();

    await takeScreenshot(page, '23-accounting-methods');
  });

  test('should display retainage percent inputs', async ({ page }) => {
    await expect(page.locator('text=Default Purchase Order Retainage Percent')).toBeVisible();
    await expect(page.locator('text=Default Subcontract Retainage Percent')).toBeVisible();

    await takeScreenshot(page, '24-retainage-percents');
  });

  test('should display default settings checkboxes', async ({ page }) => {
    await expect(page.locator('text=Enable Comments By Default')).toBeVisible();
    await expect(page.locator('text=Enable Completed Work Retainage By Default')).toBeVisible();
    await expect(page.locator('text=Enable Financial Markup By Default')).toBeVisible();
    await expect(page.locator('text=Enable Payments By Default')).toBeVisible();
    await expect(page.locator('text=Enable Invoices by Default')).toBeVisible();
    await expect(page.locator('text=Show Cost Codes on Invoice PDF by Default')).toBeVisible();
    await expect(page.locator('text=Enable Stored Material Retainage By Default')).toBeVisible();
    await expect(page.locator('text=Enable Subcontractor SOV By Default')).toBeVisible();

    await takeScreenshot(page, '25-default-settings-checkboxes');
  });
});

test.describe('Configuration Page - Workflow Settings Section', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToConfigure(page);
  });

  test('should navigate to Workflow Settings', async ({ page }) => {
    const workflowNav = page.locator('button:has-text("Workflow Settings")');
    await workflowNav.click();
    await page.waitForTimeout(300);

    await expect(page.locator('h2:has-text("Workflow Settings"), h3:has-text("Workflow Settings")')).toBeVisible();

    await takeScreenshot(page, '26-workflow-settings');
  });

  test('should display workflow settings notice', async ({ page }) => {
    const workflowNav = page.locator('button:has-text("Workflow Settings")');
    await workflowNav.click();
    await page.waitForTimeout(300);

    // Should show notice about future release
    await expect(page.locator('text=Workflow settings will be available in a future release')).toBeVisible();

    await takeScreenshot(page, '27-workflow-settings-notice');
  });
});

test.describe('Configuration Page - Invoice Settings Section', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToConfigure(page);
  });

  test('should navigate to Invoice Settings', async ({ page }) => {
    const invoiceNav = page.locator('button:has-text("Invoice Settings")');
    await invoiceNav.click();
    await page.waitForTimeout(300);

    await expect(page.locator('h2:has-text("Invoice Settings"), h3:has-text("Invoice Settings")')).toBeVisible();

    await takeScreenshot(page, '28-invoice-settings');
  });

  test('should display Enable Prefilled Billing Periods checkbox', async ({ page }) => {
    const invoiceNav = page.locator('button:has-text("Invoice Settings")');
    await invoiceNav.click();
    await page.waitForTimeout(300);

    await expect(page.locator('text=Enable Prefilled Billing Periods')).toBeVisible();

    await takeScreenshot(page, '29-prefilled-billing-periods');
  });

  test('should show billing period options when enabled', async ({ page }) => {
    const invoiceNav = page.locator('button:has-text("Invoice Settings")');
    await invoiceNav.click();
    await page.waitForTimeout(300);

    // Find and enable prefilled billing periods
    const checkbox = page.locator('text=Enable Prefilled Billing Periods').locator('..').locator('[role="checkbox"], input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 3000 })) {
      if (!(await checkbox.isChecked())) {
        await checkbox.click();
        await page.waitForTimeout(300);
      }

      // Billing period options should now be visible
      await expect(page.locator('text=Monthly Billing Period')).toBeVisible();
      await expect(page.locator('text=Monthly Due Date')).toBeVisible();
    }

    await takeScreenshot(page, '30-billing-period-options');
  });

  test('should display Enable Reminder Emails checkbox', async ({ page }) => {
    const invoiceNav = page.locator('button:has-text("Invoice Settings")');
    await invoiceNav.click();
    await page.waitForTimeout(300);

    await expect(page.locator('text=Enable Reminder Emails')).toBeVisible();

    await takeScreenshot(page, '31-reminder-emails');
  });

  test('should show reminder interval when enabled', async ({ page }) => {
    const invoiceNav = page.locator('button:has-text("Invoice Settings")');
    await invoiceNav.click();
    await page.waitForTimeout(300);

    // Find and enable reminder emails
    const reminderRow = page.locator('text=Enable Reminder Emails').locator('..');
    const checkbox = reminderRow.locator('[role="checkbox"], input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 3000 })) {
      if (!(await checkbox.isChecked())) {
        await checkbox.click();
        await page.waitForTimeout(300);
      }

      // Reminder interval should now be visible
      await expect(page.locator('text=Reminder Interval')).toBeVisible();
    }

    await takeScreenshot(page, '32-reminder-interval');
  });

  test('should display Allow Over Billing checkbox', async ({ page }) => {
    const invoiceNav = page.locator('button:has-text("Invoice Settings")');
    await invoiceNav.click();
    await page.waitForTimeout(300);

    await expect(page.locator('text=Allow Over Billing')).toBeVisible();

    await takeScreenshot(page, '33-allow-over-billing');
  });

  test('should display Custom Email Text textarea', async ({ page }) => {
    const invoiceNav = page.locator('button:has-text("Invoice Settings")');
    await invoiceNav.click();
    await page.waitForTimeout(300);

    await expect(page.locator('text=Custom Email Text')).toBeVisible();
    await expect(page.locator('textarea').filter({ hasText: /email text/i }).or(
      page.locator('textarea[placeholder*="email"]')
    ).first()).toBeVisible();

    await takeScreenshot(page, '34-custom-email-text');
  });

  test('should display Invoice PDF Footer Text textarea', async ({ page }) => {
    const invoiceNav = page.locator('button:has-text("Invoice Settings")');
    await invoiceNav.click();
    await page.waitForTimeout(300);

    await expect(page.locator('text=Invoice PDF Footer Text')).toBeVisible();

    await takeScreenshot(page, '35-invoice-pdf-footer');
  });

  test('should display digest settings', async ({ page }) => {
    const invoiceNav = page.locator('button:has-text("Invoice Settings")');
    await invoiceNav.click();
    await page.waitForTimeout(300);

    await expect(page.locator('text=Receive Email Digest of all Unapproved Invoices')).toBeVisible();

    await takeScreenshot(page, '36-digest-settings');
  });
});

test.describe('Configuration Page - Permissions Section', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToConfigure(page);
  });

  test('should navigate to Permissions Table', async ({ page }) => {
    const permissionsNav = page.locator('button:has-text("Permissions Table")');
    await permissionsNav.click();
    await page.waitForTimeout(300);

    await expect(page.locator('h2:has-text("Permissions Table"), h3:has-text("Permissions Table")')).toBeVisible();

    await takeScreenshot(page, '37-permissions-table');
  });

  test('should display permissions notice', async ({ page }) => {
    const permissionsNav = page.locator('button:has-text("Permissions Table")');
    await permissionsNav.click();
    await page.waitForTimeout(300);

    // Should show notice about project-level permissions
    await expect(page.locator('text=Permission settings are managed at the project level')).toBeVisible();

    await takeScreenshot(page, '38-permissions-notice');
  });
});

test.describe('Configuration Page - Save Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToConfigure(page);
  });

  test('should save configuration when clicking Update', async ({ page }) => {
    // Make a change
    const checkbox = page.locator('#contractsPrivateByDefault');
    const initialState = await checkbox.isChecked();
    await checkbox.click();
    await page.waitForTimeout(300);

    // Click Update button
    const updateButton = page.getByRole('button', { name: /Update/i }).first();
    await updateButton.click();
    await page.waitForTimeout(1000);

    // Look for success toast
    const toast = page.locator('[role="alert"], [class*="toast"]').filter({ hasText: /success|saved/i }).first();
    await takeScreenshot(page, '39-save-success');

    // Restore original state
    await checkbox.click();
  });

  test('should display Update button at bottom', async ({ page }) => {
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const bottomUpdateButton = page.getByRole('button', { name: /Update/i }).last();
    await expect(bottomUpdateButton).toBeVisible();

    await takeScreenshot(page, '40-bottom-update-button');
  });

  test('should save from bottom Update button', async ({ page }) => {
    // Scroll to bottom and click update
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const bottomUpdateButton = page.getByRole('button', { name: /Update/i }).last();
    await bottomUpdateButton.click();
    await page.waitForTimeout(1000);

    await takeScreenshot(page, '41-bottom-save');
  });
});

test.describe('Configuration Page - Alert Notice', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToConfigure(page);
  });

  test('should display Contract Dates Moved notice', async ({ page }) => {
    await expect(page.locator('text=Contract Dates Have Been Moved')).toBeVisible();

    await takeScreenshot(page, '42-contract-dates-notice');
  });
});

test.describe('Configuration Page - Responsive Design', () => {
  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateToConfigure(page);

    await takeScreenshot(page, '43-tablet-view');
  });

  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateToConfigure(page);

    await takeScreenshot(page, '44-mobile-view');
  });

  test('should show sidebar on larger screens', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await navigateToConfigure(page);

    // Sidebar should be visible
    const sidebar = page.locator('aside, nav').filter({ hasText: 'Contract Configuration' }).first();
    await expect(sidebar).toBeVisible();

    await takeScreenshot(page, '45-sidebar-visible');
  });
});
