import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";

const authFile = path.join(__dirname, ".auth/user.json");

// Use env vars with fallback to hardcoded test creds
const TEST_EMAIL = process.env.TEST_USER_1 ?? "test1@mail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD_1 ?? "test12026!!!";

setup("authenticate", async ({ page, baseURL }) => {
  const url = baseURL ?? "http://localhost:3000";

  // Reuse existing auth state if cookie is still valid
  try {
    const existing = JSON.parse(fs.readFileSync(authFile, "utf-8"));
    const cookie = existing.cookies?.find((c: { name: string }) =>
      c.name.includes("auth-token")
    );
    if (cookie && cookie.expires > Date.now() / 1000) {
      console.log("Reusing valid auth state (cookie not expired)");
      return;
    }
  } catch {
    // No valid auth file, proceed with fresh login
  }

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

  // Wait for the auth cookie to appear (don't depend on redirect)
  // The login form calls signInWithPassword which sets the cookie
  // even if the post-login redirect fails
  let authCookie = null;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const cookies = await page.context().cookies();
    authCookie = cookies.find((c) => c.name.includes("auth-token"));
    if (authCookie) break;
  }

  if (!authCookie) {
    // Grab any error text from the page for diagnostics
    const errorText = await page
      .locator("text=Invalid email")
      .textContent()
      .catch(() => null);
    const successText = await page
      .locator("text=Login successful")
      .textContent()
      .catch(() => null);
    throw new Error(
      `Auth failed - no auth cookie after 10s. ` +
        `Page text: ${errorText ?? successText ?? "unknown state"}`
    );
  }

  // Save auth state for all subsequent tests
  await page.context().storageState({ path: authFile });
  console.log("Auth setup complete - cookie saved");
});
