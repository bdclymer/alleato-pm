import { type NextRequest, NextResponse } from "next/server";

import { getBestSupabaseAuthToken } from "./auth-cookie";
import { validateCallbackUrl } from "@/lib/validation/callback-url";

// Company-wide paths that require developer role
const DEVELOPER_ONLY_COMPANY_PREFIXES = [
  "/ai-assistant",
  "/executive",
  "/financial-insights",
  "/pipeline",
  "/team-chat",
  "/knowledge",
  "/stats",
  "/ai-avatar",
  "/calendar",
  "/billing-periods",
];

// Project-scoped route segments (after /[projectId]/) that require developer role.
// Core Procore tools (meetings, tasks, emails, schedule, rfis, etc.) are NOT listed here.
const DEVELOPER_ONLY_PROJECT_SEGMENTS = new Set([
  "intelligence",
  "hub",
  "outlook-emails",
  "billing-periods",
  "client-dashboard",
  "email-attachments",
  "timeline",
  "progress-reports",
  "project-status-report",
]);

function isDevOnlyPath(pathname: string): boolean {
  for (const prefix of DEVELOPER_ONLY_COMPANY_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return true;
  }
  // Match /123/segment paths
  const match = pathname.match(/^\/\d+\/([^/]+)/);
  if (match) return DEVELOPER_ONLY_PROJECT_SEGMENTS.has(match[1]);
  return false;
}

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

  if (isDevOnlyPath(pathname) && !tokenData.isDeveloper) {
    const url = request.nextUrl.clone();
    url.pathname = "/access-denied";
    url.search = "?reason=developer-only";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export function shouldBypassSessionMiddleware(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/fm-global/form") ||
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
