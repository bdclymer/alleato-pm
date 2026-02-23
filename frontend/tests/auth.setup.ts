import { test as setup } from "@playwright/test";
import path from "path";
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
  } else {
    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });
  }

  // Always re-login to ensure a fresh session for each run.

  // Use the real login page.
  console.log(`Logging in via ${url}/auth/login as ${TEST_EMAIL}`);
  const maxLoginAttempts = 3;
  let redirected = false;

  for (let attempt = 1; attempt <= maxLoginAttempts; attempt += 1) {
    // Navigate with longer timeout to handle Next.js dev mode compilation
    await page.goto(`${url}/auth/login`, {
      waitUntil: "networkidle",
      timeout: 60000, // 60 seconds to allow for route compilation
    });

    // Wait for the page structure to load first
    await page.waitForSelector('form', { state: 'attached', timeout: 15000 });

    // Additional wait for React hydration (Next.js 15 can be slow in dev)
    await page.waitForTimeout(2000);

    // Now find the login button - it should be interactive after hydration
    const loginButton = page.getByRole("button", { name: /login/i, exact: false });
    await loginButton.waitFor({ state: "visible", timeout: 15000 });

    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await loginButton.click();

    redirected = await page
      .waitForURL((currentUrl) => !currentUrl.pathname.includes("/auth/login"), {
        timeout: 15000,
      })
      .then(() => true)
      .catch(() => false);
    if (redirected) {
      break;
    }

    const currentUrl = new URL(page.url());
    const usedNativeFormSubmit =
      currentUrl.pathname === "/auth/login" &&
      currentUrl.searchParams.has("email") &&
      currentUrl.searchParams.has("password");

    if (usedNativeFormSubmit && attempt < maxLoginAttempts) {
      // Retry when form submits before client-side handlers attach.
      await page.waitForTimeout(2000);
      continue;
    }
    break;
  }

  if (!redirected) {
    const currentUrl = page.url();
    const bodyText = (await page.locator("body").textContent()) ?? "";
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
        `url=${currentUrl}. ` +
        `Page text: ${errorText ?? successText ?? bodyText.slice(0, 200) ?? "unknown state"}`,
    );
  }

  const cookies = await page.context().cookies();
  const hasAuthCookie = cookies.some((cookie) => cookie.name.startsWith("sb-"));
  if (!hasAuthCookie) {
    throw new Error("Auth failed - no Supabase auth cookies found after login");
  }

  // Save auth state for all subsequent tests
  await page.context().storageState({ path: authFile });
  console.log("Auth setup complete - cookie saved");
});
