const mockCreateServiceClient = jest.fn();
const mockGenerateDailyBrief = jest.fn();
const mockLoadLiveDailyBriefSourceCoverage = jest.fn();

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => mockCreateServiceClient(),
}));

jest.mock("../daily-brief", () => ({
  DEFAULT_EXECUTIVE_WINDOW_DAYS: 3,
  DEFAULT_EXECUTIVE_BRIEFING_SYNTHESIS_MODEL: "gpt-5.5",
  generateDailyBrief: (...args: unknown[]) =>
    mockGenerateDailyBrief(...args),
  loadLiveDailyBriefSourceCoverage: (...args: unknown[]) =>
    mockLoadLiveDailyBriefSourceCoverage(...args),
}));

import {
  getExecutiveBriefingDashboard,
  regenerateExecutiveBriefingDraft,
} from "../executive-briefing-workflow";

const storedPacket = {
  generatedAt: "2026-05-08T12:00:00.000Z",
  windowDays: 3,
  retrievalOrder: [],
  sections: {
    needsBrandon: [],
    waitingOnOthers: [],
    importantUpdates: [],
  },
  sourceCoverage: [
    {
      label: "Teams",
      detail: "Recent Teams direct and channel messages",
      count: 0,
      latest: "Unknown date",
      status: "empty",
    },
  ],
  retrievalNotes: [],
};

const freshPacket = {
  ...storedPacket,
  generatedAt: "2026-05-08T16:30:00.000Z",
  sourceCoverage: [],
};

describe("executive briefing workflow", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-08T16:00:00.000Z"));
    jest.clearAllMocks();
    mockLoadLiveDailyBriefSourceCoverage.mockResolvedValue([
      {
        label: "Teams",
        detail: "Recent Teams direct and channel messages",
        count: 4,
        latest: "May 6, 2026",
        status: "loaded",
      },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("refreshes source coverage when returning a stored daily briefing packet", async () => {
    const from = jest.fn((table: string) => {
      if (table === "daily_recaps") {
        const query = {
          select: jest.fn(() => query),
          eq: jest.fn(() => query),
          order: jest.fn(() => query),
          limit: jest.fn(() => query),
          maybeSingle: jest.fn(() =>
            Promise.resolve({
              data: {
                id: "recap-1",
                recap_date: "2026-05-08",
                workflow_status: "approved",
                approved_at: "2026-05-08T12:05:00.000Z",
                approved_by: null,
                briefing_packet: storedPacket,
                created_at: "2026-05-08T12:00:00.000Z",
                recap_text: "Stored brief",
              },
              error: null,
            }),
          ),
        };
        return query;
      }

      const query = {
        select: jest.fn(() => query),
        order: jest.fn(() =>
          Promise.resolve({
            data: [
              {
                id: "follow-up-old",
                fingerprint: "old-fingerprint",
                section: "needsBrandon",
                title: "Old Teams item",
                summary: "Old Teams summary",
                recommended_action: null,
                why_it_matters: null,
                owner: null,
                status: null,
                tone: "watch",
                state: "open",
                source_type: "Teams",
                source_detail: "Teams DM Conversation: Accounting Team",
                source_id: "teamsdm_f8040d175e4c02da_2026-03-23",
                source_url: null,
                project_label: "No project linked",
                source_date: "Mar 23, 2026",
                first_seen_recap_id: "recap-old",
                last_seen_recap_id: "recap-old",
                first_seen_at: "2026-05-08T12:00:00.000Z",
                last_seen_at: "2026-05-08T12:00:00.000Z",
                resolved_at: null,
                resolved_by: null,
                resolution_note: null,
                payload: null,
              },
              {
                id: "follow-up-current",
                fingerprint: "current-fingerprint",
                section: "waitingOnOthers",
                title: "Current email item",
                summary: "Current email summary",
                recommended_action: null,
                why_it_matters: null,
                owner: null,
                status: null,
                tone: "watch",
                state: "open",
                source_type: "Email",
                source_detail: "Email: Current",
                source_id: "email-current",
                source_url: null,
                project_label: "60 Alleato Finance",
                source_date: "May 7, 2026",
                first_seen_recap_id: "recap-current",
                last_seen_recap_id: "recap-current",
                first_seen_at: "2026-05-08T12:00:00.000Z",
                last_seen_at: "2026-05-08T12:00:00.000Z",
                resolved_at: null,
                resolved_by: null,
                resolution_note: null,
                payload: null,
              },
            ],
            error: null,
          }),
        ),
      };
      return query;
    });

    mockCreateServiceClient.mockReturnValue({ from });

    const dashboard = await getExecutiveBriefingDashboard({ windowDays: 3 });

    expect(dashboard.draft.packet.sourceCoverage).toEqual([
      {
        label: "Teams",
        detail: "Recent Teams direct and channel messages",
        count: 4,
        latest: "May 6, 2026",
        status: "loaded",
      },
    ]);
    expect(mockLoadLiveDailyBriefSourceCoverage).toHaveBeenCalledWith(3);
    expect(mockGenerateDailyBrief).not.toHaveBeenCalled();
    expect(dashboard.staleFollowUps.map((followUp) => followUp.id)).toEqual([
      "follow-up-current",
    ]);
  });

  it("stores Daily Brief version metadata when regenerating over an existing packet", async () => {
    const upsertedRows: unknown[] = [];
    mockGenerateDailyBrief.mockResolvedValue(freshPacket);

    const from = jest.fn((table: string) => {
      if (table === "daily_recaps") {
        const query = {
          select: jest.fn(() => query),
          eq: jest.fn(() => query),
          order: jest.fn(() => query),
          limit: jest.fn(() => query),
          maybeSingle: jest.fn(() =>
            Promise.resolve({
              data: {
                id: "recap-1",
                recap_date: "2026-05-08",
                workflow_status: "approved",
                approved_at: "2026-05-08T12:05:00.000Z",
                approved_by: null,
                briefing_packet: {
                  ...storedPacket,
                  canonicalName: "Daily Brief",
                  audiencePreset: "brandon",
                  briefVersion: 1,
                  refreshHistory: [],
                },
                created_at: "2026-05-08T12:00:00.000Z",
                recap_text: "Stored brief",
              },
              error: null,
            }),
          ),
          upsert: jest.fn((row: unknown) => {
            upsertedRows.push(row);
            return {
              select: jest.fn(() => ({
                single: jest.fn(() =>
                  Promise.resolve({
                    data: {
                      id: "recap-1",
                      recap_date: "2026-05-08",
                      workflow_status: "approved",
                      approved_at: "2026-05-08T16:30:00.000Z",
                      approved_by: null,
                      briefing_packet: (row as { briefing_packet: unknown })
                        .briefing_packet,
                      created_at: "2026-05-08T12:00:00.000Z",
                      recap_text: "Fresh brief",
                    },
                    error: null,
                  }),
                ),
              })),
            };
          }),
        };
        return query;
      }

      if (table === "executive_briefing_follow_ups") {
        const query = {
          select: jest.fn(() => query),
          in: jest.fn(() => Promise.resolve({ data: [], error: null })),
          upsert: jest.fn(() => ({
            select: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        };
        return query;
      }

      throw new Error(`Unexpected table ${table}`);
    });

    mockCreateServiceClient.mockReturnValue({ from });

    const result = await regenerateExecutiveBriefingDraft({ windowDays: 3 });
    const savedPacket = (upsertedRows[0] as { briefing_packet: typeof storedPacket & {
      briefVersion: number;
      refreshHistory: Array<{ version: number; generatedAt: string }>;
    } }).briefing_packet;

    expect(result.draft.packet.briefVersion).toBe(2);
    expect(savedPacket).toMatchObject({
      canonicalName: "Daily Brief",
      audiencePreset: "brandon",
      briefVersion: 2,
      refreshHistory: [
        {
          version: 1,
          generatedAt: storedPacket.generatedAt,
        },
      ],
    });
  });
});
