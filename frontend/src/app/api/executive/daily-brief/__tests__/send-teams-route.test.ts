const mockCreateClient = jest.fn();
const mockSendOwnerBriefingToTeams = jest.fn();
const mockStartDailyBriefRun = jest.fn();
const mockCompleteDailyBriefRun = jest.fn();
const mockFailDailyBriefRun = jest.fn();
const mockRecordDeliveryAttempt = jest.fn();
const mockRecordDeliveryEvidence = jest.fn();
const mockRecordTeamsPayloadArtifact = jest.fn();
const mockSourceHealthForDeliveryResult = jest.fn();

jest.mock("@/lib/guardrails/api", () => ({
  withApiGuardrails:
    (_name: string, handler: (input: { request: Request }) => Promise<Response>) =>
    (request: Request) =>
      handler({ request }),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

jest.mock("@/lib/executive/owner-briefing-delivery", () => ({
  sendOwnerBriefingToTeams: (...args: unknown[]) =>
    mockSendOwnerBriefingToTeams(...args),
}));

jest.mock("@/lib/ai-ops/executive-daily-brief-ledger", () => ({
  completeDailyBriefRun: (...args: unknown[]) =>
    mockCompleteDailyBriefRun(...args),
  failDailyBriefRun: (...args: unknown[]) => mockFailDailyBriefRun(...args),
  recordDeliveryAttempt: (...args: unknown[]) =>
    mockRecordDeliveryAttempt(...args),
  recordDeliveryEvidence: (...args: unknown[]) =>
    mockRecordDeliveryEvidence(...args),
  recordTeamsPayloadArtifact: (...args: unknown[]) =>
    mockRecordTeamsPayloadArtifact(...args),
  sourceHealthForDeliveryResult: (...args: unknown[]) =>
    mockSourceHealthForDeliveryResult(...args),
  startDailyBriefRun: (...args: unknown[]) => mockStartDailyBriefRun(...args),
}));

import { NextRequest } from "next/server";
import { POST } from "../send-teams/route";

const ORIGINAL_ENV = process.env;

const runContext = {
  eventId: "event-1",
  runId: "run-1",
  startedAt: "2026-06-19T12:00:00.000Z",
};

const successfulDelivery = {
  ok: true,
  status: "sent",
  sentAt: "2026-06-19T12:00:00.000Z",
  decisionsNeeded: 1,
  actionsRequired: 2,
  projectsShown: 1,
  recipients: [{ userId: "user-1", displayName: "Brandon", sent: true }],
  sourceSummary: {
    activeProjectCount: 1,
    stalePacketCount: 0,
    topProjects: [],
  },
};

describe("/api/executive/daily-brief/send-teams", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    mockStartDailyBriefRun.mockResolvedValue(runContext);
    mockCompleteDailyBriefRun.mockResolvedValue(undefined);
    mockFailDailyBriefRun.mockResolvedValue(undefined);
    mockRecordDeliveryAttempt.mockResolvedValue({ id: "attempt-1" });
    mockRecordDeliveryEvidence.mockResolvedValue(undefined);
    mockRecordTeamsPayloadArtifact.mockResolvedValue({ id: "artifact-1" });
    mockSourceHealthForDeliveryResult.mockReturnValue([]);
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    });
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("records disabled delivery before any provider send", async () => {
    process.env.EXECUTIVE_DAILY_BRIEF_ENABLED = "false";

    const response = await POST(
      new NextRequest("http://localhost/api/executive/daily-brief/send-teams", {
        method: "POST",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: "disabled",
      runId: "run-1",
    });
    expect(mockStartDailyBriefRun).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerType: "teams_delivery_disabled",
        deliveryTarget: { channel: "teams", deliveryEnabled: false },
      }),
    );
    expect(mockRecordDeliveryAttempt).toHaveBeenCalledWith(
      runContext,
      expect.objectContaining({
        channel: "teams",
        status: "disabled",
        failureCode: "EXECUTIVE_DAILY_BRIEF_DISABLED",
      }),
    );
    expect(mockCompleteDailyBriefRun).toHaveBeenCalledWith(
      runContext,
      expect.objectContaining({
        status: "skipped",
        deliveryStatus: "disabled",
      }),
    );
    expect(mockSendOwnerBriefingToTeams).not.toHaveBeenCalled();
  });

  it("records a gateway run, payload artifact, evidence, and dry-run delivery result", async () => {
    process.env.EXECUTIVE_DAILY_BRIEF_ENABLED = "true";
    process.env.CRON_SECRET = "test-secret";
    mockSendOwnerBriefingToTeams.mockResolvedValue(successfulDelivery);

    const response = await POST(
      new NextRequest("http://localhost/api/executive/daily-brief/send-teams", {
        method: "POST",
        headers: { authorization: "Bearer test-secret" },
        body: JSON.stringify({ dryRun: true }),
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      runId: "run-1",
    });
    expect(mockStartDailyBriefRun).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerType: "manual_teams_dry_run",
        deliveryTarget: { channel: "teams", dryRun: true },
      }),
    );
    expect(mockSendOwnerBriefingToTeams).toHaveBeenCalledWith({
      dryRun: true,
    });
    expect(mockRecordTeamsPayloadArtifact).toHaveBeenCalledWith(
      runContext,
      expect.objectContaining({
        contentType: "application/vnd.microsoft.teams.card+json",
      }),
    );
    expect(mockRecordDeliveryEvidence).toHaveBeenCalledWith(
      runContext,
      successfulDelivery,
      "artifact-1",
    );
    expect(mockCompleteDailyBriefRun).toHaveBeenCalledWith(
      runContext,
      expect.objectContaining({
        status: "succeeded",
        deliveryStatus: "dry_run",
      }),
    );
  });

  it("records blocked provider results as blocked delivery outcomes", async () => {
    process.env.EXECUTIVE_DAILY_BRIEF_ENABLED = "true";
    process.env.CRON_SECRET = "test-secret";
    mockSendOwnerBriefingToTeams.mockResolvedValue({
      ok: false,
      status: "blocked",
      reason: "No active Teams recipient.",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/executive/daily-brief/send-teams", {
        method: "POST",
        headers: { authorization: "Bearer test-secret" },
      }),
    );

    expect(response.status).toBe(400);
    expect(mockRecordDeliveryEvidence).toHaveBeenCalledWith(runContext, {
      ok: false,
      status: "blocked",
      reason: "No active Teams recipient.",
    });
    expect(mockCompleteDailyBriefRun).toHaveBeenCalledWith(
      runContext,
      expect.objectContaining({
        status: "partial_success",
        deliveryStatus: "blocked",
      }),
    );
  });

  it("records partial success when one Teams recipient fails", async () => {
    process.env.EXECUTIVE_DAILY_BRIEF_ENABLED = "true";
    process.env.CRON_SECRET = "test-secret";
    mockSendOwnerBriefingToTeams.mockResolvedValue({
      ...successfulDelivery,
      recipients: [
        { userId: "user-1", displayName: "Brandon", sent: true },
        {
          userId: "user-2",
          displayName: "Megan",
          sent: false,
          reason: "missing conversation",
        },
      ],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/executive/daily-brief/send-teams", {
        method: "POST",
        headers: { authorization: "Bearer test-secret" },
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      runId: "run-1",
    });
    expect(mockCompleteDailyBriefRun).toHaveBeenCalledWith(
      runContext,
      expect.objectContaining({
        status: "partial_success",
        deliveryStatus: "sent",
        deliveryTarget: expect.objectContaining({
          recipientCount: 2,
          sentCount: 1,
          failedRecipientCount: 1,
        }),
      }),
    );
  });

  it("fails the gateway run when the provider throws", async () => {
    process.env.EXECUTIVE_DAILY_BRIEF_ENABLED = "true";
    process.env.CRON_SECRET = "test-secret";
    const error = new Error("Provider unavailable");
    mockSendOwnerBriefingToTeams.mockRejectedValue(error);

    await expect(
      POST(
        new NextRequest(
          "http://localhost/api/executive/daily-brief/send-teams",
          {
            method: "POST",
            headers: { authorization: "Bearer test-secret" },
          },
        ),
      ),
    ).rejects.toThrow("Provider unavailable");

    expect(mockFailDailyBriefRun).toHaveBeenCalledWith(
      runContext,
      error,
      "EXECUTIVE_DAILY_BRIEF_TEAMS_SEND_FAILED",
    );
  });
});
