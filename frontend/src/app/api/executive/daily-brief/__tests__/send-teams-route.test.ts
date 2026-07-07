const mockRequireCurrentUserAppCapability = jest.fn();

jest.mock("@/lib/guardrails/api", () => ({
  withApiGuardrails:
    (_name: string, handler: () => Promise<Response>) => (request: Request) =>
      handler(),
}));

jest.mock("@/lib/app-capabilities", () => ({
  requireCurrentUserAppCapability: (...args: unknown[]) =>
    mockRequireCurrentUserAppCapability(...args),
}));

import { NextRequest } from "next/server";
import { POST } from "../send-teams/route";

describe("/api/executive/daily-brief/send-teams", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireCurrentUserAppCapability.mockResolvedValue(undefined);
  });

  it("fails loudly until Teams delivery is rebuilt from the canonical packet", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/executive/daily-brief/send-teams", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "legacy_teams_delivery_retired",
      sourceOfTruth: "intelligence_packets",
    });
    expect(mockRequireCurrentUserAppCapability).toHaveBeenCalledWith(
      "view_executive_briefing",
      "executive/daily-brief/send-teams#POST",
      "Daily Brief access required.",
    );
  });
});
