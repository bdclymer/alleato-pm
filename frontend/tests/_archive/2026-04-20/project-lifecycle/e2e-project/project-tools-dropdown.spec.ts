import { test, expect } from '@playwright/test';

test.describe('Project Tools Dropdown', () => {
  test('home shell renders or redirects to login', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    const projectSearch = page.getByRole('textbox', { name: /search projects/i });
    const projectsHeading = page.getByRole('heading', { name: /projects/i });
    const companyDirectoryLink = page.getByRole('link', { name: /company directory/i });
    const loginEmail = page.getByRole('textbox', { name: /email/i });
    const loginButton = page.getByRole('button', { name: /login/i });

    const validLandingState = projectSearch
      .or(projectsHeading)
      .or(companyDirectoryLink)
      .or(loginEmail)
      .or(loginButton)
      .first();

    await expect(validLandingState).toBeVisible({ timeout: 15000 });
  });
});
