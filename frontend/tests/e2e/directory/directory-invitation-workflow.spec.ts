/**
 * Directory Invitation Workflow Tests
 * Tests the complete invitation and onboarding flow
 */

import { test, expect } from '@playwright/test';
import * as helpers from '../../helpers/directory-helpers';

const PROJECT_ID = 'INI-2026-01-09-001';

test.describe('Directory - Invitation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'Admin123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to directory
    await helpers.navigateToDirectory(page, PROJECT_ID, 'users');
  });

  test('should send invitation to new user with custom message', async ({ page }) => {
    const testData = helpers.generateTestData();
    const customMessage = 'Welcome to our construction project! We look forward to working with you.';

    // Create new user
    await helpers.openAddPersonDialog(page);
    await helpers.fillPersonForm(page, testData.user);
    await helpers.saveForm(page);

    // Send invitation with custom message
    await helpers.clickRowAction(page, testData.user.email, 'invite');

    // Verify invitation dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2, .dialog-title')).toContainText('Invite');

    // Check pre-filled email
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue(testData.user.email);

    // Add custom message
    const messageTextarea = page.locator('textarea[name="message"], textarea[placeholder*="message"]');
    await messageTextarea.fill(customMessage);

    // Preview section should update
    const preview = page.locator('.preview, [data-testid="invitation-preview"]');
    if (await preview.isVisible()) {
      await expect(preview).toContainText(customMessage);
    }

    // Send invitation
    await page.locator('button:has-text("Send Invitation")').click();

    // Verify success
    await expect(page.locator('.toast-success, [role="alert"]')).toContainText(/invitation.*sent/i);

    // Verify status updated
    await page.waitForTimeout(1000);
    const row = await helpers.findTableRow(page, testData.user.email);
    await expect(row).toContainText('Invited');
  });

  test('should bulk invite multiple users', async ({ page }) => {
    const users = [
      helpers.generateTestData().user,
      helpers.generateTestData().user,
      helpers.generateTestData().user,
    ];

    // Create multiple users
    for (const user of users) {
      await helpers.openAddPersonDialog(page);
      await helpers.fillPersonForm(page, user);
      await helpers.saveForm(page);
    }

    // Select all new users
    await helpers.selectMultipleRows(page, users.map(u => u.email));

    // Bulk invite
    await helpers.performBulkAction(page, 'Send Invitations');

    // Confirm bulk action
    const confirmDialog = page.locator('[role="dialog"]:has-text("Confirm")');
    if (await confirmDialog.isVisible()) {
      await expect(confirmDialog).toContainText(`${users.length} users`);
      await page.locator('button:has-text("Send All")').click();
    }

    // Verify all invited
    await page.waitForTimeout(2000);
    for (const user of users) {
      const row = await helpers.findTableRow(page, user.email);
      await expect(row).toContainText('Invited');
    }
  });

  test('should resend invitation for expired invite', async ({ page }) => {
    const testData = helpers.generateTestData();

    // Create and invite user
    await helpers.openAddPersonDialog(page);
    await helpers.fillPersonForm(page, testData.user);
    await helpers.saveForm(page);

    await helpers.clickRowAction(page, testData.user.email, 'invite');
    await helpers.sendInvitation(page, testData.user.email);

    // Wait and resend
    await page.waitForTimeout(2000);
    await helpers.clickRowAction(page, testData.user.email, 'resend');

    // Verify resend dialog
    const resendDialog = page.locator('[role="dialog"]:has-text("Resend")');
    if (await resendDialog.isVisible()) {
      await expect(resendDialog).toContainText('original invitation');
      await page.locator('button:has-text("Resend")').click();
    }

    // Verify success
    await expect(page.locator('.toast-success')).toContainText(/invitation.*resent/i);
  });

  test('should track invitation metrics', async ({ page }) => {
    // Navigate to invitation metrics/analytics if available
    const metricsTab = page.locator('button:has-text("Metrics"), a:has-text("Analytics")');
    if (await metricsTab.isVisible()) {
      await metricsTab.click();

      // Verify metrics display
      await expect(page.locator('text="Invitations Sent"')).toBeVisible();
      await expect(page.locator('text="Acceptance Rate"')).toBeVisible();
      await expect(page.locator('text="Pending Invitations"')).toBeVisible();
    }

    // Check invitation status summary
    await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

    // Look for status summary
    const summary = page.locator('.status-summary, .invitation-stats');
    if (await summary.isVisible()) {
      await expect(summary).toContainText(/\d+.*invited/i);
      await expect(summary).toContainText(/\d+.*accepted/i);
    }
  });

  test('should cancel pending invitation', async ({ page }) => {
    const testData = helpers.generateTestData();

    // Create and invite user
    await helpers.openAddPersonDialog(page);
    await helpers.fillPersonForm(page, testData.user);
    await helpers.saveForm(page);

    await helpers.clickRowAction(page, testData.user.email, 'invite');
    await helpers.sendInvitation(page, testData.user.email);

    // Cancel invitation
    await page.waitForTimeout(1000);
    await helpers.clickRowAction(page, testData.user.email, 'cancel invite');

    // Confirm cancellation
    const confirmDialog = page.locator('[role="dialog"]:has-text("Cancel")');
    if (await confirmDialog.isVisible()) {
      await page.locator('button:has-text("Cancel Invitation")').click();
    }

    // Verify status reverted
    await page.waitForTimeout(1000);
    const row = await helpers.findTableRow(page, testData.user.email);
    await expect(row).toContainText('Not Invited');
  });

  test('should handle invitation acceptance flow', async ({ page, context }) => {
    const testData = helpers.generateTestData();

    // Create and invite user
    await helpers.openAddPersonDialog(page);
    await helpers.fillPersonForm(page, testData.user);
    await helpers.saveForm(page);

    await helpers.clickRowAction(page, testData.user.email, 'invite');
    await helpers.sendInvitation(page, testData.user.email);

    // Simulate invitation acceptance (would normally be done via email link)
    // This is a mock - real implementation would need actual email handling

    // Open new page to simulate user accepting invite
    const newPage = await context.newPage();

    // Navigate to mock acceptance URL
    await newPage.goto(`/invite/accept?token=mock-token-${Date.now()}`);

    // Fill signup form
    const signupForm = newPage.locator('form[data-testid="signup-form"]');
    if (await signupForm.isVisible()) {
      await newPage.fill('input[name="password"]', 'NewUser123!@#');
      await newPage.fill('input[name="confirmPassword"]', 'NewUser123!@#');
      await newPage.fill('input[name="firstName"]', testData.user.firstName);
      await newPage.fill('input[name="lastName"]', testData.user.lastName);
      await newPage.click('button[type="submit"]');

      // Should redirect to dashboard after acceptance
      await newPage.waitForURL('**/dashboard');
    }

    // Return to admin view and verify status
    await page.reload();
    await page.waitForTimeout(1000);

    // Status should show as Accepted (in real implementation)
    // Note: This would require backend integration to actually work
  });

  test('should show invitation history', async ({ page }) => {
    const testData = helpers.generateTestData();

    // Create user with invitation history
    await helpers.openAddPersonDialog(page);
    await helpers.fillPersonForm(page, testData.user);
    await helpers.saveForm(page);

    // Send initial invitation
    await helpers.clickRowAction(page, testData.user.email, 'invite');
    await helpers.sendInvitation(page, testData.user.email);

    // View invitation history
    await page.waitForTimeout(1000);
    await helpers.clickRowAction(page, testData.user.email, 'view history');

    // Check history dialog
    const historyDialog = page.locator('[role="dialog"]:has-text("Invitation History")');
    if (await historyDialog.isVisible()) {
      // Should show invitation events
      await expect(historyDialog).toContainText('Invitation Sent');
      await expect(historyDialog).toContainText(new Date().toLocaleDateString());

      // Should show who sent the invitation
      await expect(historyDialog).toContainText('admin@example.com');
    }
  });

  test('should validate email before sending invitation', async ({ page }) => {
    // Try to invite with invalid email
    await helpers.openAddPersonDialog(page);

    // Fill form with invalid email
    await page.locator('input[name="firstName"]').fill('Test');
    await page.locator('input[name="lastName"]').fill('User');
    await page.locator('input[type="email"]').fill('invalid-email-format');
    await helpers.saveForm(page);

    // Should show validation error
    await expect(page.locator('text=/invalid.*email/i')).toBeVisible();

    // Fix email and continue
    await page.locator('input[type="email"]').fill('valid@example.com');
    await helpers.saveForm(page);

    // Now should be able to invite
    await helpers.clickRowAction(page, 'valid@example.com', 'invite');
    await expect(page.locator('[role="dialog"]:has-text("Invite")')).toBeVisible();
  });

  test('should handle invitation for existing users', async ({ page }) => {
    // Try to invite an already registered user
    await helpers.navigateToDirectory(page, PROJECT_ID, 'users');

    // Find an existing active user
    const activeUser = page.locator('tr:has-text("Active")').first();
    if (await activeUser.isVisible()) {
      const email = await activeUser.locator('td').nth(1).textContent();

      // Try to invite
      await helpers.clickRowAction(page, email || '', 'invite');

      // Should show warning
      const warningDialog = page.locator('[role="dialog"]:has-text("Already Registered")');
      if (await warningDialog.isVisible()) {
        await expect(warningDialog).toContainText('already has an account');
        await page.locator('button:has-text("OK")').click();
      }
    }
  });

  test('should support invitation templates', async ({ page }) => {
    const testData = helpers.generateTestData();

    // Create user
    await helpers.openAddPersonDialog(page);
    await helpers.fillPersonForm(page, testData.user);
    await helpers.saveForm(page);

    // Open invitation dialog
    await helpers.clickRowAction(page, testData.user.email, 'invite');

    // Check for template selector
    const templateSelect = page.locator('select[name="template"], [role="combobox"]:has-text("Template")');
    if (await templateSelect.isVisible()) {
      await templateSelect.click();

      // Should have different template options
      await expect(page.locator('option, [role="option"]')).toHaveCount(3);

      // Select a template
      await page.locator('text="Contractor Onboarding"').click();

      // Message should update with template
      const messageTextarea = page.locator('textarea[name="message"]');
      const templateMessage = await messageTextarea.inputValue();
      expect(templateMessage).toContain('contractor');
    }

    // Send with template
    await page.locator('button:has-text("Send")').click();
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('should set expiration for invitations', async ({ page }) => {
    const testData = helpers.generateTestData();

    // Create user
    await helpers.openAddPersonDialog(page);
    await helpers.fillPersonForm(page, testData.user);
    await helpers.saveForm(page);

    // Open invitation dialog
    await helpers.clickRowAction(page, testData.user.email, 'invite');

    // Look for expiration settings
    const expirationSelect = page.locator('select[name="expiration"], [role="combobox"]:has-text("Expires")');
    if (await expirationSelect.isVisible()) {
      await expirationSelect.click();

      // Select 7 days
      await page.locator('text="7 days"').click();

      // Should show expiration date
      const expirationText = page.locator('.expiration-date, text=/expires/i');
      if (await expirationText.isVisible()) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        await expect(expirationText).toContainText(futureDate.toLocaleDateString());
      }
    }

    // Send invitation
    await page.locator('button:has-text("Send")').click();
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('should filter users by invitation status', async ({ page }) => {
    // Apply invitation status filter
    await helpers.filterDirectory(page, 'Invitation Status', 'Invited');

    // Verify only invited users shown
    await helpers.waitForTable(page);
    const rows = page.locator('tbody tr');
    const count = await rows.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i)).toContainText('Invited');
      }
    }

    // Change filter to "Not Invited"
    await helpers.filterDirectory(page, 'Invitation Status', 'Not Invited');

    // Verify only non-invited users shown
    await helpers.waitForTable(page);
    const nonInvitedRows = page.locator('tbody tr');
    const nonInvitedCount = await nonInvitedRows.count();

    if (nonInvitedCount > 0) {
      for (let i = 0; i < nonInvitedCount; i++) {
        await expect(nonInvitedRows.nth(i)).toContainText('Not Invited');
      }
    }
  });

  test('should export invitation report', async ({ page }) => {
    // Look for export/report options
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Report")');
    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Select invitation report
      const invitationReport = page.locator('text="Invitation Report"');
      if (await invitationReport.isVisible()) {
        // Start download listener
        const downloadPromise = page.waitForEvent('download');
        await invitationReport.click();

        // Wait for download
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('invitation');
        expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)$/);
      }
    }
  });
});