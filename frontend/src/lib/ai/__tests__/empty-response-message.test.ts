import { buildEmptyResponseMessage } from "../empty-response-message";

describe("buildEmptyResponseMessage", () => {
  // Regression for session d87edc77: an empty model response was reported as a
  // billing failure even though no error occurred and the same gateway had just
  // answered. With no error, we must NOT claim billing/credits.
  it("does not blame billing when there is no stream error", () => {
    const msg = buildEmptyResponseMessage(null);
    expect(msg).not.toMatch(/billing|credit|quota/i);
    expect(msg).toMatch(/empty response/i);
  });

  it("surfaces the real error verbatim without inventing a billing cause", () => {
    const msg = buildEmptyResponseMessage(
      "Tool schema invalid: expected object",
    );
    expect(msg).toContain("Tool schema invalid: expected object");
    expect(msg).not.toMatch(/billing|credit|quota/i);
  });

  it.each([
    "Insufficient quota for this request",
    "You exceeded your current billing limit",
    "429 Too Many Requests: rate limit reached",
  ])("mentions billing/quota only when the error says so: %j", (error) => {
    const msg = buildEmptyResponseMessage(error);
    expect(msg).toContain(error);
    expect(msg).toMatch(/quota|rate-limit|billing/i);
  });
});
