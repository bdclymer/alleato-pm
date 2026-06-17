import { updateSession, shouldBypassSessionMiddleware } from "../middleware";
import type { NextRequest } from "next/server";

jest.mock("@/lib/validation/callback-url", () => ({
  validateCallbackUrl: (value: string) => value,
}));

type TestCookie = {
  name: string;
  value: string;
};

function encodeBase64Url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function makeJwt(payload: Record<string, unknown>): string {
  return [
    encodeBase64Url(JSON.stringify({ alg: "none", typ: "JWT" })),
    encodeBase64Url(JSON.stringify(payload)),
    "signature",
  ].join(".");
}

function makeAuthCookie(expiresAtSeconds: number): TestCookie {
  const token = makeJwt({
    sub: "user-1",
    email: "test@example.com",
    exp: expiresAtSeconds,
  });
  const session = JSON.stringify({ access_token: token });

  return {
    name: "sb-lgveqfnpkxvzbnnwuled-auth-token",
    value: `base64-${encodeBase64Url(session)}`,
  };
}

function makeRequest(pathname: string, cookies: TestCookie[] = []) {
  const url = new URL(`https://projects.alleatogroup.com${pathname}`);
  return {
    nextUrl: {
      pathname: url.pathname,
      search: url.search,
      clone: () => new URL(url),
    },
    cookies: {
      getAll: jest.fn(() => cookies),
      set: jest.fn(),
    },
  } as unknown as NextRequest;
}

describe("supabase middleware", () => {
  it("bypasses API routes before inspecting auth cookies", async () => {
    const request = makeRequest("/api/projects/983/budget");

    await updateSession(request);

    expect(request.cookies.getAll).not.toHaveBeenCalled();
  });

  it("allows protected pages when a valid Supabase auth cookie exists", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;

    const response = await updateSession(
      makeRequest("/983/budget", [makeAuthCookie(futureExp)]),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated page requests", async () => {
    const response = await updateSession(makeRequest("/983/budget?tab=costs"));

    expect(response.headers.get("location")).toBe(
      "https://projects.alleatogroup.com/auth/login?callbackUrl=%2F983%2Fbudget%3Ftab%3Dcosts",
    );
  });

  it("redirects nearly expired Supabase auth cookies", async () => {
    const nearlyExpiredExp = Math.floor(Date.now() / 1000) + 5;

    const response = await updateSession(
      makeRequest("/983/budget", [makeAuthCookie(nearlyExpiredExp)]),
    );

    expect(response.headers.get("location")).toBe(
      "https://projects.alleatogroup.com/auth/login?callbackUrl=%2F983%2Fbudget",
    );
  });

  it("allows the AI assistant for authenticated non-developer users", async () => {
    // Guardrail: the AI assistant is open to all authenticated users. The
    // makeAuthCookie JWT carries no developer claim, so this exercises the
    // non-developer path. If "/ai-assistant" is re-added to
    // DEVELOPER_ONLY_COMPANY_PREFIXES this redirects to /access-denied and fails.
    const futureExp = Math.floor(Date.now() / 1000) + 3600;

    const response = await updateSession(
      makeRequest("/ai-assistant", [makeAuthCookie(futureExp)]),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("still gates a developer-only company path for non-developers", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;

    const response = await updateSession(
      makeRequest("/executive", [makeAuthCookie(futureExp)]),
    );

    expect(response.headers.get("location")).toBe(
      "https://projects.alleatogroup.com/access-denied?reason=developer-only",
    );
  });

  it("keeps static assets out of session middleware", () => {
    expect(shouldBypassSessionMiddleware("/_next/static/chunk.js")).toBe(true);
    expect(shouldBypassSessionMiddleware("/images/logo.png")).toBe(true);
    expect(shouldBypassSessionMiddleware("/983/budget")).toBe(false);
  });
});
