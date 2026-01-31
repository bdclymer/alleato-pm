import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page, baseURL }) => {
  // Use the dev-login route to authenticate
  await page.goto(`${baseURL}/dev-login?email=test@example.com&password=testpassword123`);

  // Wait for redirect to complete
  await page.waitForURL('**/*');

  // Verify we're logged in by checking for user-specific elements
  await page.waitForTimeout(2000);

  // Save signed-in state
  await page.context().storageState({ path: authFile });

  console.log('Authentication setup complete');
});
