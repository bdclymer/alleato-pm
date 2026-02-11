import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";
import { createSupabaseAdminClient } from "./helpers/supabase";

const authFile = path.join(__dirname, ".auth/user.json");

// Use env vars with fallback to hardcoded test creds
const TEST_EMAIL = process.env.TEST_USER_1 ?? "test1@mail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD_1 ?? "test12026!!!";

setup("authenticate", async ({ page, baseURL }) => {
  const url = baseURL ?? "http://localhost:3000";

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: userList } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existingUser = userList?.users?.find(
    (user) => user.email === TEST_EMAIL,
  );

  if (!existingUser) {
    await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
  }

  // Always re-login to ensure a fresh session for each run.

  // Use the real login page
  console.log(`Logging in via ${url}/auth/login as ${TEST_EMAIL}`);
  await page.goto(`${url}/auth/login`);

  // Wait for React to hydrate (Login button becomes visible)
  const loginButton = page.getByRole("button", { name: /^login$/i });
  await loginButton.waitFor({ state: "visible", timeout: 15000 });

  // Fill the login form
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);

  // Submit
  await loginButton.click();

  // Wait for a logged-in UI element to confirm session
  const userMenuButton = page.getByRole("button", { name: /open user menu/i });
  const hasLoggedInUI = await userMenuButton
    .waitFor({ state: "visible", timeout: 20000 })
    .then(() => true)
    .catch(() => false);

  if (!hasLoggedInUI) {
    const errorText = await page
      .locator("text=Invalid email")
      .textContent()
      .catch(() => null);
    const successText = await page
      .locator("text=Login successful")
      .textContent()
      .catch(() => null);
    throw new Error(
      `Auth failed - login UI did not appear. ` +
        `Page text: ${errorText ?? successText ?? "unknown state"}`,
    );
  }

  // Save auth state for all subsequent tests
  await page.context().storageState({ path: authFile });
  console.log("Auth setup complete - cookie saved");
});
