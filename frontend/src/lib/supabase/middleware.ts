import { type NextRequest, NextResponse } from "next/server";

import { getBestSupabaseAuthToken } from "./auth-cookie";
import { validateCallbackUrl } from "@/lib/validation/callback-url";

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  if (shouldBypassSessionMiddleware(pathname)) {
    return supabaseResponse;
  }

  const tokenData = getBestSupabaseAuthToken(request.cookies.getAll());
  if (
    !tokenData?.userId ||
    (typeof tokenData.expiresAtMs === "number" &&
      tokenData.expiresAtMs <= Date.now() + 15_000)
  ) {
    return redirectToLogin(request);
  }

  return supabaseResponse;
}

export function shouldBypassSessionMiddleware(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$/i.test(pathname)
  );
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  url.search = "";
  const rawCallback = request.nextUrl.pathname + request.nextUrl.search;
  url.searchParams.set("callbackUrl", validateCallbackUrl(rawCallback));
  return NextResponse.redirect(url);
}
