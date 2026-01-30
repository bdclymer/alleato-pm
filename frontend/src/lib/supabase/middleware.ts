import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { getSupabaseConfig } from "./config";
import { validateCallbackUrl } from "@/lib/validation/callback-url";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  // The middleware matcher already excludes /auth paths, so any request here needs authentication
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    // Preserve the original URL as a callback parameter (validated to prevent open redirects)
    const rawCallback = request.nextUrl.pathname + request.nextUrl.search;
    url.searchParams.set("callbackUrl", validateCallbackUrl(rawCallback));
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
