const mockRequireCurrentUserAppCapability = jest.fn();
const mockGetExecutiveBriefingDashboard = jest.fn();
const mockRegenerateExecutiveBriefingDraft = jest.fn();

jest.mock("@/lib/app-capabilities", () => ({
  requireCurrentUserAppCapability: (...args: unknown[]) =>
    mockRequireCurrentUserAppCapability(...args),
}));

jest.mock("@/lib/executive/executive-briefing-workflow", () => ({
  getExecutiveBriefingDashboard: (...args: unknown[]) =>
    mockGetExecutiveBriefingDashboard(...args),
  regenerateExecutiveBriefingDraft: (...args: unknown[]) =>
    mockRegenerateExecutiveBriefingDraft(...args),
}));

jest.mock("@/lib/executive/daily-brief", () => ({
  DEFAULT_EXECUTIVE_WINDOW_DAYS: 3,
  clampDailyBriefWindowDays: (value: number) =>
    Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 1), 14) : 3,
}));

import { NextRequest } from "next/server";
import { GET } from "../route";

const persistedPacket = {
  generatedAt: "2026-05-06T12:00:00.000Z",
  windowDays: 3,
  retrievalOrder: [],
  sections: {
    needsBrandon: [],
    waitingOnOthers: [],
    importantUpdates: [],
  },
  sourceCoverage: [],
  retrievalNotes: [],
};

const freshPacket = {
  ...persistedPacket,
  generatedAt: "2026-05-06T13:00:00.000Z",
};

describe("/api/executive/daily-brief", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireCurrentUserAppCapability.mockResolvedValue(undefined);
    mockGetExecutiveBriefingDashboard.mockResolvedValue({
      draft: { packet: persistedPacket },
    });
    mockRegenerateExecutiveBriefingDraft.mockResolvedValue({
      draft: { packet: freshPacket },
    });
  });

  it("returns the current canonical Daily Brief packet by default", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/executive/daily-brief"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(persistedPacket);
    expect(mockGetExecutiveBriefingDashboard).toHaveBeenCalledWith({
      windowDays: 3,
    });
    expect(mockRegenerateExecutiveBriefingDraft).not.toHaveBeenCalled();
  });

  it("refreshes the canonical packet only when fresh=true is requested", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/executive/daily-brief?fresh=true&days=5",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(freshPacket);
    expect(mockRegenerateExecutiveBriefingDraft).toHaveBeenCalledWith({
      windowDays: 5,
      sourceBackedOnly: false,
    });
    expect(mockGetExecutiveBriefingDashboard).not.toHaveBeenCalled();
  });

  it("supports a source-backed refresh mode for foreground manual actions", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/executive/daily-brief?fresh=true&mode=source-backed&days=3",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(freshPacket);
    expect(mockRegenerateExecutiveBriefingDraft).toHaveBeenCalledWith({
      windowDays: 3,
      sourceBackedOnly: true,
    });
  });
});
