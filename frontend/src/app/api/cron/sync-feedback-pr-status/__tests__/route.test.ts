jest.mock("@/lib/guardrails/api", () => ({
  withApiGuardrails:
    (
      _name: string,
      handler: (input: { request: Request; requestId: string }) => Promise<Response>,
    ) =>
    async (request: Request) => {
      try {
        return await handler({ request, requestId: "test" });
      } catch (err) {
        const status = (err as { status?: number }).status ?? 500;
        return new Response(null, { status });
      }
    },
}));

jest.mock("@/lib/guardrails/observability", () => ({ logEvent: jest.fn() }));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const findLinkedPullRequestsMock = jest.fn();
jest.mock("@/lib/admin-feedback/github", () => ({
  findLinkedPullRequests: (...args: unknown[]) => findLinkedPullRequestsMock(...args),
}));

type FeedbackRow = {
  id: string;
  status: string;
  github_issue_number: number | null;
  metadata: Record<string, unknown> | null;
};

let feedbackRows: FeedbackRow[] = [];
const updateMock = jest.fn().mockResolvedValue({ error: null });

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table !== "admin_feedback_items") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: () => ({
          not: () => ({
            not: () => Promise.resolve({ data: feedbackRows, error: null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: (_column: string, id: string) => {
            updateMock(id, payload);
            const row = feedbackRows.find((r) => r.id === id);
            if (row) row.status = payload.status as string;
            return Promise.resolve({ error: null });
          },
        }),
      };
    },
  }),
}));

import { POST } from "../route";

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/cron/sync-feedback-pr-status", {
    method: "POST",
    headers,
  });
}

const ORIGINAL_ENV = process.env;

describe("/api/cron/sync-feedback-pr-status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: "cron-secret" };
    feedbackRows = [];
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("rejects with 401 when the cron secret is missing or wrong", async () => {
    const noAuth = await POST(req());
    expect(noAuth.status).toBe(401);
    const wrong = await POST(req({ authorization: "Bearer nope" }));
    expect(wrong.status).toBe(401);
    expect(findLinkedPullRequestsMock).not.toHaveBeenCalled();
  });

  it("sets status to pr_created when an open PR links the issue", async () => {
    feedbackRows = [
      { id: "item-1", status: "open", github_issue_number: 545, metadata: {} },
    ];
    findLinkedPullRequestsMock.mockResolvedValue([
      { number: 10, url: "https://github.com/org/repo/pull/10", state: "open", merged: false },
    ]);

    const response = await POST(req({ authorization: "Bearer cron-secret" }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      checked: 1,
      prCreated: 1,
      resolved: 0,
    });
    expect(updateMock).toHaveBeenCalledWith(
      "item-1",
      expect.objectContaining({
        status: "pr_created",
        metadata: expect.objectContaining({ linkedPrNumber: 10 }),
      }),
    );
  });

  it("sets status to resolved when the linked PR is merged", async () => {
    feedbackRows = [
      { id: "item-2", status: "pr_created", github_issue_number: 546, metadata: {} },
    ];
    findLinkedPullRequestsMock.mockResolvedValue([
      { number: 11, url: "https://github.com/org/repo/pull/11", state: "closed", merged: true },
    ]);

    const response = await POST(req({ authorization: "Bearer cron-secret" }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      checked: 1,
      prCreated: 0,
      resolved: 1,
    });
    expect(updateMock).toHaveBeenCalledWith(
      "item-2",
      expect.objectContaining({ status: "resolved" }),
    );
  });

  it("does not update when no linked PR is found", async () => {
    feedbackRows = [
      { id: "item-3", status: "open", github_issue_number: 547, metadata: {} },
    ];
    findLinkedPullRequestsMock.mockResolvedValue([]);

    const response = await POST(req({ authorization: "Bearer cron-secret" }));
    await expect(response.json()).resolves.toMatchObject({ checked: 1, prCreated: 0, resolved: 0 });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("does not downgrade an already-matching status", async () => {
    feedbackRows = [
      { id: "item-4", status: "pr_created", github_issue_number: 548, metadata: {} },
    ];
    findLinkedPullRequestsMock.mockResolvedValue([
      { number: 12, url: "https://github.com/org/repo/pull/12", state: "open", merged: false },
    ]);

    const response = await POST(req({ authorization: "Bearer cron-secret" }));
    await expect(response.json()).resolves.toMatchObject({ prCreated: 0, resolved: 0 });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
