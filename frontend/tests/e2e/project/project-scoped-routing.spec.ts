import { test, expect } from '@playwright/test';

/**
 * Test suite for project-scoped routing in Project Tools dropdown.
 *
 * Requirements:
 * 1. All Project Tools links must be scoped to the selected project
 * 2. Clicking a tool should navigate to /{projectId}/{toolPath}
 * 3. When changing projects, links should update to new projectId
 * 4. When on a tool page and changing projects, should navigate to same tool for new project
 * 5. Tools requiring a project should be disabled when no project is selected
 */

test.describe('Project-Scoped Routing', () => {
  test.beforeEach(async ({ page }) => {
    // Start at homepage
    await page.goto('/');
  });

  test('Project Tools dropdown links should be project-scoped when project is selected', async ({ page }) => {
    // Select a project first
    await page.click('button:has-text("Select Project")');
    await page.waitForSelector('text=Recent Projects');

    // Click on the first project in the dropdown
    const firstProject = page.locator('[role="menuitem"]').first();
    const projectText = await firstProject.textContent();
    await firstProject.click();

    // Wait for navigation
    await page.waitForURL(/\/\d+\/home/);

    // Extract project ID from current URL
    const url = page.url();
    const projectIdMatch = url.match(/\/(\d+)\//);
    expect(projectIdMatch).not.toBeNull();
    const projectId = projectIdMatch![1];

    // Open Project Tools dropdown
    await page.click('button:has-text("Project Tools")');
    await page.waitForSelector('text=Core Tools');

    // Verify Budget link is project-scoped
    const budgetLink = page.locator('a:has-text("Budget")');
    const budgetHref = await budgetLink.getAttribute('href');
    expect(budgetHref).toBe(`/${projectId}/budget`);

    // Verify Commitments link is project-scoped
    const commitmentsLink = page.locator('a:has-text("Commitments")');
    const commitmentsHref = await commitmentsLink.getAttribute('href');
    expect(commitmentsHref).toBe(`/${projectId}/commitments`);

    // Verify Home link is project-scoped
    const homeLink = page.locator('a:has-text("Home")').first();
    const homeHref = await homeLink.getAttribute('href');
    expect(homeHref).toBe(`/${projectId}/home`);
  });

  test('Clicking Budget should navigate to project-scoped budget page', async ({ page }) => {
    // Select a project
    await page.click('button:has-text("Select Project")');
    await page.waitForSelector('text=Recent Projects');
    await page.locator('[role="menuitem"]').first().click();
    await page.waitForURL(/\/\d+\/home/);

    // Get project ID
    const url = page.url();
    const projectId = url.match(/\/(\d+)\//)?.[1];

    // Open Project Tools and click Budget
    await page.click('button:has-text("Project Tools")');
    await page.waitForSelector('text=Financial Management');
    await page.click('a:has-text("Budget")');

    // Verify we navigated to the correct URL
    await page.waitForURL(`/${projectId}/budget`);
    expect(page.url()).toContain(`/${projectId}/budget`);
  });

  test('When changing projects, should navigate to same tool for new project', async ({ page }) => {
    // Select first project
    await page.click('button:has-text("Select Project")');
    await page.waitForSelector('text=Recent Projects');

    const firstProject = page.locator('[role="menuitem"]').first();
    await firstProject.click();
    await page.waitForURL(/\/\d+\/home/);

    const firstProjectId = page.url().match(/\/(\d+)\//)?.[1];

    // Navigate to Budget
    await page.click('button:has-text("Project Tools")');
    await page.click('a:has-text("Budget")');
    await page.waitForURL(`/${firstProjectId}/budget`);

    // Now change to a different project
    await page.click('button:has-text("Project")');
    await page.waitForSelector('text=Recent Projects');

    // Get the second project and click it
    const allProjects = page.locator('[role="menuitem"]');
    const projectCount = await allProjects.count();

    if (projectCount > 1) {
      const secondProject = allProjects.nth(1);
      await secondProject.click();

      // Should navigate to budget page for the new project
      await page.waitForURL(/\/\d+\/budget/);

      // Get new project ID
      const newProjectId = page.url().match(/\/(\d+)\//)?.[1];

      // Verify we're on budget for the new project
      expect(newProjectId).not.toBe(firstProjectId);
      expect(page.url()).toContain(`/${newProjectId}/budget`);
    }
  });

  test('All tool links in dropdown should follow project-scoped pattern', async ({ page }) => {
    // Select a project
    await page.click('button:has-text("Select Project")');
    await page.waitForSelector('text=Recent Projects');
    await page.locator('[role="menuitem"]').first().click();
    await page.waitForURL(/\/\d+\/home/);

    const projectId = page.url().match(/\/(\d+)\//)?.[1];

    // Open Project Tools dropdown
    await page.click('button:has-text("Project Tools")');
    await page.waitForSelector('text=Core Tools');

    // Check all tool links in the dropdown
    const toolLinks = page.locator('.grid a[href^="/"]');
    const linkCount = await toolLinks.count();

    for (let i = 0; i < linkCount; i++) {
      const link = toolLinks.nth(i);
      const href = await link.getAttribute('href');
      const isDisabled = await link.getAttribute('aria-disabled');

      // Skip connection-manager as it doesn't require a project
      if (href?.includes('connection-manager')) {
        expect(href).toBe('/connection-manager');
        continue;
      }

      // All other links should be project-scoped when not disabled
        if (isDisabled !== 'true') {
          expect(href, `Link ${i} with href "${href}" should be project-scoped`).toMatch(
            new RegExp(`^/${projectId}/`)
          );
        }
      }
  });

  test('Tools should be disabled when no project is selected', async ({ page }) => {
    // Make sure we're on homepage with no project selected
    await page.goto('/');

    // Open Project Tools dropdown
    await page.click('button:has-text("Project Tools")');
    await page.waitForSelector('text=Core Tools');

    // Check that project-required tools are disabled
    const budgetLink = page.locator('a:has-text("Budget")');
    const isDisabled = await budgetLink.getAttribute('aria-disabled');
    expect(isDisabled).toBe('true');

    // Verify the link has opacity-50 class (disabled styling)
    const className = await budgetLink.getAttribute('class');
    expect(className).toContain('opacity-50');
    expect(className).toContain('cursor-not-allowed');
  });

  test('Project Tools links update when project is changed', async ({ page }) => {
    // Select first project
    await page.click('button:has-text("Select Project")');
    await page.waitForSelector('text=Recent Projects');
    await page.locator('[role="menuitem"]').first().click();
    await page.waitForURL(/\/\d+\/home/);

    const firstProjectId = page.url().match(/\/(\d+)\//)?.[1];

    // Open Project Tools and check Budget link
    await page.click('button:has-text("Project Tools")');
    let budgetLink = page.locator('a:has-text("Budget")');
    let budgetHref = await budgetLink.getAttribute('href');
    expect(budgetHref).toBe(`/${firstProjectId}/budget`);

    // Close the dropdown
    await page.keyboard.press('Escape');

    // Change to second project
    await page.click('button:has-text("Project")');
    await page.waitForSelector('text=Recent Projects');

    const allProjects = page.locator('[role="menuitem"]');
    const projectCount = await allProjects.count();

    if (projectCount > 1) {
      await allProjects.nth(1).click();
      await page.waitForURL(/\/\d+\/home/);

      const secondProjectId = page.url().match(/\/(\d+)\//)?.[1];

      // Open Project Tools again and verify links updated
      await page.click('button:has-text("Project Tools")');
      budgetLink = page.locator('a:has-text("Budget")');
      budgetHref = await budgetLink.getAttribute('href');
      expect(budgetHref).toBe(`/${secondProjectId}/budget`);
      expect(secondProjectId).not.toBe(firstProjectId);
    }
  });
});
