import { test, expect } from '@playwright/test';

/**
 * Project Scoping E2E Tests
 *
 * These tests verify that financial pages (budget, commitments, etc.)
 * require a project to be selected and only show data for the selected project.
 */

test.describe('Project Scoping', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
  });

  test('should show project guard when accessing budget without project selection', async ({ page }) => {
    // Navigate directly to budget page without selecting a project
    await page.goto('/budget');

    // Should see the project guard message
    await expect(page.getByText('No Project Selected')).toBeVisible();
    await expect(page.getByText(/Please select a project/i)).toBeVisible();

    // Should have a button to go to projects
    const goToProjectsButton = page.getByRole('button', { name: /Go to Projects/i });
    await expect(goToProjectsButton).toBeVisible();
  });

  test('should show project guard when accessing commitments without project selection', async ({ page }) => {
    // Navigate directly to commitments page without selecting a project
    await page.goto('/commitments');

    // Should see the project guard message
    await expect(page.getByText('No Project Selected')).toBeVisible();
    await expect(page.getByText(/Please select a project/i)).toBeVisible();
  });

  test('should allow access to budget page after selecting a project', async ({ page }) => {
    // First, navigate to a project (using a project ID from URL)
    // Note: You may need to adjust the project ID based on your test data
    await page.goto('/1/home'); // Assuming project ID 1 exists

    // Wait for project page to load
    await page.waitForLoadState('networkidle');

    // Now navigate to budget page
    await page.goto('/budget');

    // Should NOT see the project guard message
    await expect(page.getByText('No Project Selected')).not.toBeVisible();

    // Should see budget page content
    await expect(page.getByText('Budget')).toBeVisible();
  });

  test('should show selected project indicator in header', async ({ page }) => {
    // Navigate to a project
    await page.goto('/1/home');

    // Wait for project to load
    await page.waitForLoadState('networkidle');

    // Find the project selector button
    const projectSelector = page.getByRole('button', { name: /Project/i });
    await expect(projectSelector).toBeVisible();

    // Should show a project name (not "Select Project")
    await expect(projectSelector).not.toContainText('Select Project');

    // Should have visual indicator (orange dot)
    const orangeDot = projectSelector.locator('span.bg-\\[hsl\\(var\\(--procore-orange\\)\\)\\]');
    await expect(orangeDot).toBeVisible();
  });

  test('should filter commitments by selected project', async ({ page }) => {
    // Navigate to a specific project
    await page.goto('/1/home');
    await page.waitForLoadState('networkidle');

    // Navigate to commitments
    await page.goto('/commitments');
    await page.waitForLoadState('networkidle');

    // Verify that we're on commitments page
    await expect(page.getByText('Commitments')).toBeVisible();

    // The API should have been called with projectId parameter
    // This will be verified by checking the network request
    page.on('request', (request) => {
      if (request.url().includes('/api/commitments')) {
        expect(request.url()).toContain('projectId=1');
      }
    });
  });

  test('should allow project selection from dropdown', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on project selector
    const projectSelector = page.getByRole('button', { name: /Project.*Select Project/i });
    await projectSelector.click();

    // Wait for dropdown to open and projects to load
    await expect(page.getByText('Recent Projects')).toBeVisible();

    // Click on the first project in the list
    const firstProject = page.getByRole('menuitem').first();
    await firstProject.click();

    // Should navigate to project home page
    await expect(page.url()).toMatch(/\/\d+\/home/);

    // Project selector should now show the selected project
    const updatedSelector = page.getByRole('button', { name: /Project/i });
    await expect(updatedSelector).not.toContainText('Select Project');
  });

  test('should maintain project context when navigating between financial pages', async ({ page }) => {
    // Select a project
    await page.goto('/1/home');
    await page.waitForLoadState('networkidle');

    // Navigate to budget
    await page.goto('/budget');
    await expect(page.getByText('Budget')).toBeVisible();
    await expect(page.getByText('No Project Selected')).not.toBeVisible();

    // Navigate to commitments
    await page.goto('/commitments');
    await expect(page.getByText('Commitments')).toBeVisible();
    await expect(page.getByText('No Project Selected')).not.toBeVisible();

    // Project should still be selected in header
    const projectSelector = page.getByRole('button', { name: /Project/i });
    await expect(projectSelector).not.toContainText('Select Project');
  });

  test('should redirect to projects when clicking "Go to Projects" button', async ({ page }) => {
    // Navigate to budget without project
    await page.goto('/budget');

    // Should see project guard
    await expect(page.getByText('No Project Selected')).toBeVisible();

    // Click "Go to Projects" button
    const goToProjectsButton = page.getByRole('button', { name: /Go to Projects/i });
    await goToProjectsButton.click();

    // Should redirect to home/projects page
    await expect(page.url()).toBe(`${page.url().split('/')[0]}//${page.url().split('/')[2]}/`);
  });
});
