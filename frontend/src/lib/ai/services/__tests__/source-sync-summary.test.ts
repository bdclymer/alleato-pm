jest.mock("server-only", () => ({}));
jest.mock("../project-intelligence-summary", () => ({
  summarizeProjectIntelligence: jest.fn(),
}));

import { summarizeProjectIntelligence } from "../project-intelligence-summary";
import {
  buildSourceSyncSummarySources,
  summarizeSourceSyncHealth,
} from "../source-sync-summary";
import type { SourceSyncStatus } from "@/app/api/admin/source-sync/_contracts";

const summarizeProjectIntelligenceMock =
  summarizeProjectIntelligence as jest.MockedFunction<
    typeof summarizeProjectIntelligence
  >;

function makeStatus(overrides: Partial<SourceSyncStatus> = {}): SourceSyncStatus {
  return {
    status: "degraded",
    healthy: false,
    generatedAt: "2026-05-11T20:00:00.000Z",
    thresholds: {},
    sources: [
      {
        source: "graph",
        resourceId: "mailbox-1",
        resourceName: "Owner mailbox",
        status: "warning",
        lastSyncAt: "2026-05-11T19:00:00.000Z",
        lastSuccessAt: "2026-05-11T18:00:00.000Z",
        lastErrorAt: null,
        lastErrorMessage: null,
        itemsSynced: 42,
        staleMinutes: 60,
        unprocessedCount: 2,
        unembeddedCount: 5,
        uncompiledCount: 7,
        metadata: {},
      },
    ],
    pipeline: {},
    alerts: [
      {
        severity: "critical",
        code: "source_sync_error",
        source: "graph",
        resourceId: "mailbox-1",
        message: "Graph embedding failed for recent messages.",
        detectedAt: "2026-05-11T19:30:00.000Z",
      },
    ],
    recentRuns: [
      {
        id: "run-1",
        source: "graph",
        stage: "embed",
        status: "failed",
        resourceId: "mailbox-1",
        resourceName: "Owner mailbox",
        startedAt: "2026-05-11T19:10:00.000Z",
        finishedAt: "2026-05-11T19:12:00.000Z",
        itemsSeen: 10,
        itemsSynced: 5,
        itemsFailed: 5,
        errorCode: "embedding_failed",
        errorMessage: "AI Gateway embedding request failed.",
        metadata: {},
      },
    ],
    stuckItems: [
      {
        source: "fireflies",
        resourceId: "meeting-1",
        resourceName: "OAC meeting",
        stage: "embedded",
        status: "stuck",
        ageMinutes: 180,
        lastAttemptAt: "2026-05-11T17:00:00.000Z",
        errorMessage: "Compiler did not pick up embedded meeting.",
        metadata: {},
      },
    ],
    counts: {
      sources: 1,
      alerts: 1,
      documents: 25,
      chunks: 100,
      unembedded: 5,
      uncompiled: 7,
      tasks: 3,
      graphSubscriptions: 2,
      stuckItems: 1,
    },
    ...overrides,
  };
}

describe("source-sync-summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    summarizeProjectIntelligenceMock.mockResolvedValue({
      schema: "project_intelligence_summary_v1",
      model: "openai/gpt-4.1-nano",
      sourceCount: 1,
      sourceIds: ["source-sync:counts"],
      headline: "Source sync is behind.",
      context: "Graph and Fireflies processing need attention.",
      risks: [],
      decisions: [],
      actionItems: [],
      dataGaps: [],
      confidence: "high",
    });
  });

  it("maps source sync health into traceable summarization sources", () => {
    const sources = buildSourceSyncSummarySources(makeStatus());

    expect(sources[0]).toMatchObject({
      id: "source-sync:counts",
      type: "source_sync",
      title: "Source sync aggregate counts",
    });
    expect(sources.map((source) => source.id)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("source-sync:alert:source_sync_error:graph:mailbox-1"),
        "source-sync:run:run-1",
        expect.stringContaining("source-sync:stuck:fireflies:meeting-1:embedded"),
      ]),
    );
    expect(sources.map((source) => source.text).join("\n")).toContain(
      "5 items are not searchable",
    );
  });

  it("calls the shared project intelligence summarizer with source_sync focus", async () => {
    await summarizeSourceSyncHealth(makeStatus());

    expect(summarizeProjectIntelligenceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        focus: "source_sync",
        sources: expect.arrayContaining([
          expect.objectContaining({ id: "source-sync:counts" }),
        ]),
      }),
    );
  });
});
