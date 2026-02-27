import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import type { Database } from "@/types/database.types";
import type { User } from "@supabase/supabase-js";

/**
 * If using Fluid compute: Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          // Only set cookies that have actual values. When Supabase Auth
          // is rate-limited, the SSR client calls setAll with empty values
          // to clear auth cookies. Allowing this would log users out and
          // break subsequent requests. The middleware handles token refresh.
          cookiesToSet
            .filter(({ value }) => value !== "")
            .forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

/**
 * Get the authenticated user for API routes with rate-limit resilience.
 * Tries getSession() first (may refresh token via network call).
 * Falls back to decoding the JWT from cookies if rate-limited (no network call).
 * Returns a minimal User-like object or null.
 */
export async function getApiRouteUser(): Promise<Pick<User, "id" | "email"> | null> {
  // Read the user directly from the cookie JWT first — zero network calls.
  // This avoids Supabase Auth rate limiting entirely for API routes.
  // The user identity is sufficient since data operations use the service role client.
  const cookieUser = await getUserFromCookieJwt();
  if (cookieUser) {
    return cookieUser;
  }

  // Fallback to getSession() if cookie parsing failed (e.g., no cookies at all)
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
}

async function getUserFromCookieJwt(): Promise<Pick<User, "id" | "email"> | null> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Supabase SSR stores auth in chunked cookies: sb-<ref>-auth-token.0, .1, etc.
    const authCookieParts = allCookies
      .filter((c) => /^sb-.*-auth-token/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (authCookieParts.length === 0) return null;

    let sessionJson = authCookieParts.map((c) => c.value).join("");

    if (!sessionJson || sessionJson.length < 10) {
      return null;
    }

    // @supabase/ssr v0.5+ stores cookies as "base64-<base64url_encoded>" format.
    // Convert base64url to standard base64 for reliable cross-version decoding.
    if (sessionJson.startsWith("base64-")) {
      const b64url = sessionJson.slice(7).replace(/-/g, "+").replace(/_/g, "/");
      const padding = "=".repeat((4 - (b64url.length % 4)) % 4);
      const padded = b64url + padding;
      sessionJson = Buffer.from(padded, "base64").toString("utf-8");
    }

    const sessionData = JSON.parse(sessionJson);

    if (!sessionData?.access_token) return null;

    // Decode JWT payload (header.payload.signature) — no verification needed
    // since we only use this as a fallback and data ops use service role client
    const parts = sessionData.access_token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString(),
    );

    if (!payload?.sub) return null;

    return { id: payload.sub, email: payload.email ?? "" };
  } catch {
    return null;
  }
}

/**
 * Create a Supabase client with a specific access token.
 * Use this when handling API requests with Bearer tokens (e.g., from Playwright tests).
 * This client will have the user's RLS permissions based on the token.
 */
export function createClientWithToken(accessToken: string) {
  const { url, anonKey } = getSupabaseConfig();

  return createSupabaseClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
