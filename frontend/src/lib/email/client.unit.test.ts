import {
  DEFAULT_APP_BASE_URL,
  resolveAppBaseUrl,
} from "./client";

describe("resolveAppBaseUrl", () => {
  it("defaults email links to the production projects host", () => {
    expect(resolveAppBaseUrl(undefined)).toBe(DEFAULT_APP_BASE_URL);
  });

  it("normalizes the retired app host to the production projects host", () => {
    expect(resolveAppBaseUrl("https://app.alleato.com")).toBe(DEFAULT_APP_BASE_URL);
    expect(resolveAppBaseUrl("https://app.alleato.com/auth/confirm")).toBe(DEFAULT_APP_BASE_URL);
  });

  it("keeps valid non-legacy origins and strips trailing paths", () => {
    expect(resolveAppBaseUrl("http://localhost:3000/auth/callback")).toBe("http://localhost:3000");
    expect(resolveAppBaseUrl("https://preview.example.com/")).toBe("https://preview.example.com");
  });

  it("fails loudly for invalid URL configuration", () => {
    expect(() => resolveAppBaseUrl("projects.alleatogroup.com")).toThrow(
      /Invalid NEXT_PUBLIC_APP_URL/,
    );
  });
});
