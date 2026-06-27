import { NextResponse, type NextRequest } from "next/server";

/**
 * Minimal HTTP Basic Auth gate for the whole app. Username is ignored; the
 * password must match APP_PASSWORD. This keeps meeting content from being world-
 * readable. Replace with Supabase Auth / SSO when you want per-user accounts.
 * The /api/sync route has its own SYNC_SECRET and is excluded here.
 */
export function middleware(req: NextRequest) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return NextResponse.next(); // not configured → don't lock out

  const header = req.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    // Edge runtime: use atob (Buffer is unavailable in middleware).
    const decoded = atob(header.slice(6));
    const password = decoded.slice(decoded.indexOf(":") + 1);
    if (password === expected) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Alleato Meetings"' },
  });
}

export const config = {
  // Gate everything except the sync API (secured by SYNC_SECRET) and static assets.
  matcher: ["/((?!api/sync|_next/static|_next/image|favicon.ico).*)"],
};
