const mockEq = jest.fn();
const mockUpdate = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}));

import { linkDailyRecapToCanonicalRun } from "../daily-brief-canonical-link";

const RUN_ID = "11111111-1111-4111-8111-111111111111";
const DAILY_RECAP_ID = "33333333-3333-4333-8333-333333333333";

function canonicalLinkInput() {
  return {
    dailyRecapId: DAILY_RECAP_ID,
    runId: RUN_ID,
  };
}

describe("Executive Daily Brief ledger helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it("links a generated daily_recaps packet to its canonical AI work run", async () => {
    await linkDailyRecapToCanonicalRun(canonicalLinkInput());

    expect(mockFrom).toHaveBeenCalledWith("daily_recaps");
    expect(mockUpdate).toHaveBeenCalledWith({ ai_work_run_id: RUN_ID });
    expect(mockEq).toHaveBeenCalledWith("id", DAILY_RECAP_ID);
  });

  it("fails loudly when the daily_recaps canonical run link cannot be written", async () => {
    mockEq.mockResolvedValueOnce({
      error: { message: "permission denied for daily_recaps" },
    });

    await expect(linkDailyRecapToCanonicalRun(canonicalLinkInput())).rejects.toThrow(
      /Failed to link Daily Brief packet/,
    );
  });
});
