const mockRequireCurrentUserAppCapability = jest.fn();
const mockGetExecutiveBriefingDashboard = jest.fn();
const mockRegenerateDailyBriefDraftWithLedger = jest.fn();

jest.mock("@/lib/app-capabilities", () => ({
  requireCurrentUserAppCapability: (...args: unknown[]) =>
    mockRequireCurrentUserAppCapability(...args),
}));

jest.mock("@/lib/executive/executive-briefing-workflow", () => ({
  getExecutiveBriefingDashboard: (...args: unknown[]) =>
    mockGetExecutiveBriefingDashboard(...args),
}));

jest.mock("@/lib/ai-ops/executive-daily-brief-ledger", () => ({
  regenerateDailyBriefDraftWithLedger: (...args: unknown[]) =>
    mockRegenerateDailyBriefDraftWithLedger(...args),
}));

jest.mock("@/lib/executive/daily-brief", () => ({
  DEFAULT_EXECUTIVE_WINDOW_DAYS: 3,
  clampDailyBriefWindowDays: (value: number) =>
    Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 1), 14) : 3,
}));

import { GET } from "../route";
import { NextRequest } from "next/server";

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

describe("/api/executive/brandon-daily-update", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireCurrentUserAppCapability.mockResolvedValue(undefined);
    mockGetExecutiveBriefingDashboard.mockResolvedValue({
      draft: { packet: persistedPacket },
    });
    mockRegenerateDailyBriefDraftWithLedger.mockResolvedValue({
      draft: { packet: freshPacket },
      runId: "run-1",
    });
  });

  it("returns the persisted executive briefing draft by default", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/executive/brandon-daily-update"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(persistedPacket);
    expect(mockGetExecutiveBriefingDashboard).toHaveBeenCalledWith({
      windowDays: 3,
    });
    expect(mockRegenerateDailyBriefDraftWithLedger).not.toHaveBeenCalled();
  });

  it("regenerates only when fresh=true is requested", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/executive/brandon-daily-update?fresh=true&days=5",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(freshPacket);
    expect(mockRegenerateDailyBriefDraftWithLedger).toHaveBeenCalledWith(
      expect.objectContaining({
        windowDays: 5,
        sourceBackedOnly: false,
        surface: "/api/executive/brandon-daily-update#GET",
      }),
    );
    expect(mockGetExecutiveBriefingDashboard).not.toHaveBeenCalled();
  });
});
