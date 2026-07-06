jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
  createRagServiceClient: jest.fn(() => ({
    from: jest.fn(() => ({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

jest.mock("@/lib/ai/services/ai-memory-service", () => ({
  embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { buildChangeEventWorkflowMetadata } from "@/lib/ai/change-event-workflow";
import { upsertChangeEventDraftArtifact } from "@/lib/ai/services/workspace-artifact-service";

const createServiceClientMock =
  createServiceClient as jest.MockedFunction<typeof createServiceClient>;

function createSelectMaybeSingleChain(result: unknown) {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  return chain;
}

function createInsertChain(result: unknown) {
  const chain = {
    insert: jest.fn(() => chain),
    select: jest.fn(() => chain),
    single: jest.fn().mockResolvedValue(result),
  };
  return chain;
}

function createUpdateChain(result: unknown) {
  const chain = {
    update: jest.fn(() => chain),
    eq: jest.fn(() => chain),
  };
  chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce(result);
  return chain;
}

function createUpdateFetchChain(result: unknown) {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    single: jest.fn().mockResolvedValue(result),
  };
  return chain;
}

describe("workspace artifact change-event drafts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a session-scoped change event draft artifact when none exists", async () => {
    const lookupChain = createSelectMaybeSingleChain({
      data: null,
      error: null,
    });
    const insertChain = createInsertChain({
      data: { id: "artifact-1" },
      error: null,
    });
    createServiceClientMock
      .mockReturnValueOnce({ from: jest.fn(() => lookupChain) } as never)
      .mockReturnValueOnce({ from: jest.fn(() => insertChain) } as never);

    const workflow = buildChangeEventWorkflowMetadata({
      prompt:
        "The owner requested another restroom after framing. Cost is about $18,000.",
      selectedProjectId: 760,
      selectedProjectName: "Exol Wilmer",
    });

    const result = await upsertChangeEventDraftArtifact({
      userId: "user-1",
      sessionId: "session-1",
      workflow,
    });

    expect(result).toEqual({
      id: "artifact-1",
      version: 1,
      action: "created",
    });
    expect(lookupChain.eq).toHaveBeenCalledWith(
      "artifact_type",
      "change_event_draft",
    );
    expect(lookupChain.eq).toHaveBeenCalledWith("session_id", "session-1");
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        artifact_type: "change_event_draft",
        project_id: 760,
        session_id: "session-1",
        tags: ["change-event", "ai-workflow"],
      }),
    );
  });

  it("updates the existing session artifact instead of creating another draft", async () => {
    const lookupChain = createSelectMaybeSingleChain({
      data: { id: "artifact-1" },
      error: null,
    });
    const fetchChain = createUpdateFetchChain({
      data: {
        version: 3,
        artifact_type: "change_event_draft",
        title: "Old title",
        content: {},
        project_id: null,
      },
      error: null,
    });
    const updateChain = createUpdateChain({ error: null });
    const firstClientFrom = jest.fn().mockReturnValueOnce(lookupChain);
    createServiceClientMock
      .mockReturnValueOnce({ from: firstClientFrom } as never)
      .mockReturnValueOnce({
        from: jest
          .fn()
          .mockReturnValueOnce(fetchChain)
          .mockReturnValueOnce(updateChain),
      } as never);

    const workflow = buildChangeEventWorkflowMetadata({
      prompt:
        "The owner requested another restroom after framing. Cost is about $18,000.",
      selectedProjectId: 760,
      selectedProjectName: "Exol Wilmer",
    });

    const result = await upsertChangeEventDraftArtifact({
      userId: "user-1",
      sessionId: "session-1",
      workflow,
    });

    expect(result).toEqual({
      id: "artifact-1",
      version: 4,
      action: "updated",
    });
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 4,
        project_id: 760,
        session_id: "session-1",
        tags: ["change-event", "ai-workflow"],
      }),
    );
  });
});
