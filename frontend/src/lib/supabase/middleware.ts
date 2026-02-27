import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { getSupabaseConfig } from "./config";
import { validateCallbackUrl } from "@/lib/validation/callback-url";

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
    const allCookies = request.cookies.getAll();
    const authCookies = allCookies
      .filter((c) => /^sb-.*-auth-token/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (authCookies.length === 0) return "missing";

    let sessionJson = authCookies.map((c) => c.value).join("");

    // @supabase/ssr v0.5+ stores cookies as "base64-<base64url_encoded>" format.
    // Explicitly convert base64url to standard base64 before decoding to
    // ensure compatibility across all Node.js versions.
    if (sessionJson.startsWith("base64-")) {
      const b64url = sessionJson.slice(7).replace(/-/g, "+").replace(/_/g, "/");
      const padding = "=".repeat((4 - (b64url.length % 4)) % 4);
      const padded = b64url + padding;
      sessionJson = Buffer.from(padded, "base64").toString("utf-8");
    }

    const sessionData = JSON.parse(sessionJson);

    if (!sessionData?.access_token) return "missing";

    // Decode JWT payload (header.payload.signature) — no verification needed
    // since all data operations use the service role client, not the session.
    const parts = sessionData.access_token.split(".");
    if (parts.length !== 3) return "missing";

    // JWT payload is always base64url encoded per RFC 7519
    // Add padding if needed before decoding
    const base64Payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payloadPadding = "=".repeat((4 - (base64Payload.length % 4)) % 4);
    const paddedPayload = base64Payload + payloadPadding;
    const payload = JSON.parse(
      Buffer.from(paddedPayload, "base64").toString(),
    );

    if (!payload?.sub) return "missing";

    // Check if token is expired (with 30s buffer for clock skew)
    if (payload.exp && payload.exp * 1000 < Date.now() + 30000) {
      return "expired";
    }

    return "valid";
  } catch {
    return "missing";
  }
}
