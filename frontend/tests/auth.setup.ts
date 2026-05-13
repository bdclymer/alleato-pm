import fs from "node:fs";
import path from "node:path";

import { test as setup } from "@playwright/test";

import { createSupabaseAdminClient, createSupabaseClient } from "./helpers/supabase";

const authFile = path.join(__dirname, ".auth/user.json");

// Use env vars with fallback to hardcoded test creds
const TEST_EMAIL = process.env.TEST_USER_1 ?? "test1@mail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD_1 ?? "test12026!!!";
const AUTH_SETUP_TIMEOUT_MS = 30_000;

/**
 * Extract Supabase project ref from the URL.
 * e.g. "https://lgveqfnpkxvzbnnwuled.supabase.co" → "lgveqfnpkxvzbnnwuled"
 */
function getProjectRef(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? "lgveqfnpkxvzbnnwuled";
}

/**
 * Check if the existing user.json has a valid (non-expired) access token.
 */
function hasValidExistingSession(): boolean {
  try {
    if (!fs.existsSync(authFile)) return false;
    const state = JSON.parse(fs.readFileSync(authFile, "utf-8"));
    const authCookie = (state.cookies ?? []).find((c: { name: string }) =>
      /^sb-.*-auth-token/.test(c.name),
    );
    if (!authCookie) return false;

    let sessionJson = authCookie.value as string;
    if (sessionJson.startsWith("base64-")) {
      sessionJson = Buffer.from(sessionJson.slice(7), "base64").toString();
    }
    const sessionData = JSON.parse(sessionJson);
    const jwt = sessionData?.access_token;
    if (!jwt) return false;

    const parts = jwt.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

    // Valid if token doesn't expire in next 5 minutes
    return payload?.exp && payload.exp * 1000 > Date.now() + 5 * 60 * 1000;
  } catch {
    return false;
  }
}

async function withAuthSetupTimeout<T>(
  label: string,
  operation: Promise<T>,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                [
                  `Auth setup timed out during ${label} after ${AUTH_SETUP_TIMEOUT_MS}ms.`,
                  "Cause: Supabase Auth did not answer the setup request in time.",
                  "Detection gap: the Playwright auth setup previously awaited Supabase Auth without a local timeout, which could freeze verification runs.",
                  "Prevention: auth setup now fails loudly with the blocked operation name so verification can report the real dependency issue.",
                ].join(" "),
              ),
            ),
          AUTH_SETUP_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

setup("authenticate", async ({ page, baseURL }) => {
  const url = baseURL ?? "http://localhost:3000";

  // Fast path: reuse existing valid session without any API calls
  if (hasValidExistingSession()) {
    console.log("Existing auth session is still valid — skipping re-authentication");
    return;
  }

  // Ensure test user exists in Supabase Auth
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: userList } = await withAuthSetupTimeout(
    "Supabase admin listUsers",
    supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),
  );
  const existingUser = userList?.users?.find((u) => u.email === TEST_EMAIL);

  if (!existingUser) {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      throw new Error(`Auth setup failed creating test user: ${error.message}`);
    }
  }

  // Sign in via Supabase API (no UI login — avoids rate limiting)
  const supabaseClient = createSupabaseClient();
  const { data: signInData, error: signInError } = await withAuthSetupTimeout(
    "Supabase password sign-in",
    supabaseClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  );

  if (signInError || !signInData.session) {
    // Last resort: try UI login if API fails
    console.warn(
      `API sign-in failed (${signInError?.message}), falling back to UI login`,
    );
    await uiLogin(page, url);
    await page.context().storageState({ path: authFile });
    return;
  }

  // Build cookie value in the format @supabase/ssr expects:
  // "base64-<base64 encoded session JSON>"
  const session = signInData.session;
  const sessionJson = JSON.stringify({
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
    weak_password: null,
  });
  const cookieValue = `base64-${Buffer.from(sessionJson).toString("base64")}`;
  const projectRef = getProjectRef();

  // Set the auth cookie directly in the Playwright browser context
  await page.context().addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: cookieValue,
      domain: "localhost",
      path: "/",
      // Cookie expires 1 year from now; the JWT access token expires sooner
      // but the browser will use the refresh token to get a new one.
      expires: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Save the auth state for subsequent test runs.
  // Cookies set via addCookies are captured by storageState without needing a navigation.
  await page.context().storageState({ path: authFile });
  console.log(`Auth setup complete — session saved for ${TEST_EMAIL}`);
});

async function uiLogin(page: Parameters<typeof setup>[1]["page"], url: string) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const navigated = await page
      .goto(`${url}/auth/login`, { waitUntil: "networkidle", timeout: 60000 })
      .then(() => true)
      .catch(() => false);

    if (!navigated) {
      await page.waitForTimeout(2000);
      continue;
    }

    const formMounted = await page
      .waitForSelector("form", { state: "attached", timeout: 30000 })
      .then(() => true)
      .catch(() => false);

    if (!formMounted) {
      const pathname = new URL(page.url()).pathname;
      if (!pathname.includes("/auth/login")) return; // already redirected = success
      continue;
    }

    await page.waitForTimeout(3000); // wait for React 19 hydration

    await page.locator("#email").fill(TEST_EMAIL);
    await page.locator("#password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /login/i, exact: false }).click();

    const redirected = await page
      .waitForURL((u) => !u.pathname.includes("/auth/login"), { timeout: 15000 })
      .then(() => true)
      .catch(() => false);

    if (redirected) return;
    if (attempt < maxAttempts) await page.waitForTimeout(2000);
  }

  throw new Error(
    `UI login failed after ${maxAttempts} attempts for ${TEST_EMAIL}`,
  );
}
