import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { getSupabaseConfig } from "./config";
import { validateCallbackUrl } from "@/lib/validation/callback-url";
import { getBestSupabaseAuthToken } from "./auth-cookie";

export async function updateSession(request: NextRequest) {
  // Fast path: check JWT from cookies directly — ZERO network calls.
  // This prevents Supabase Auth rate limiting under rapid navigation.
  // Only fall back to the Supabase SSR client when the token is expired
  // (needs refresh) or cookies are missing entirely.
  const cookieCheck = checkAuthCookie(request);

  if (cookieCheck === "valid") {
    // Token is present and not expired — pass through without any Supabase call
    return NextResponse.next({ request });
  }

  if (cookieCheck === "missing") {
    // No auth cookies at all — redirect to login immediately
    return redirectToLogin(request);
  }

  // Token exists but is expired — try to refresh via Supabase SSR client
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseConfig();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return redirectToLogin(request);
  }

  return supabaseResponse;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  const rawCallback = request.nextUrl.pathname + request.nextUrl.search;
  url.searchParams.set("callbackUrl", validateCallbackUrl(rawCallback));
  return NextResponse.redirect(url);
}

/**
 * Read the JWT from auth cookies and check validity.
 * Returns "valid" if token exists and is not expired,
 * "expired" if token exists but is expired,
 * "missing" if no auth cookies found.
 */
function checkAuthCookie(
  request: NextRequest,
): "valid" | "expired" | "missing" {
  try {
    const tokenData = getBestSupabaseAuthToken(request.cookies.getAll());
    if (!tokenData?.userId) return "missing";

    // Check if token is expired (with 30s buffer for clock skew)
    if (tokenData.expiresAtMs && tokenData.expiresAtMs < Date.now() + 30000) {
      return "expired";
    }

    return "valid";
  } catch {
    return "missing";
  }
}
