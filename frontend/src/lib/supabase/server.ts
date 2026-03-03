import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import type { Database } from "@/types/database.types";
import type { User } from "@supabase/supabase-js";
import { getBestSupabaseAuthToken } from "./auth-cookie";

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
    const tokenData = getBestSupabaseAuthToken(cookieStore.getAll());
    if (!tokenData?.userId) return null;

    return { id: tokenData.userId, email: tokenData.email };
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
