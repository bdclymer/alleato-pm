import { NextRequest } from "next/server";

import { DELETE } from "../route";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

jest.mock("@/lib/supabase/server", () => ({
  getApiRouteUser: jest.fn(),
}));

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

jest.mock("@/lib/admin-feedback/github", () => ({
  createGitHubIssue: jest.fn(),
}));

jest.mock("@/lib/admin-feedback/storage", () => ({
  ensureAdminFeedbackBucket: jest.fn(),
}));

jest.mock("@/lib/admin-feedback/teams-webhook", () => ({
  notifyTeamsWebhook: jest.fn(),
}));

jest.mock("@/lib/admin-feedback/tool-matcher", () => ({
  getToolById: jest.fn(),
  matchFeedbackToTool: jest.fn(),
}));

jest.mock("@/lib/admin-feedback/context-resolver", () => ({
  contextToAgentPayload: jest.fn(),
  resolveToolContext: jest.fn(),
}));

jest.mock("@/lib/ai/services/agent-learning-service", () => ({
  ingestAdminFeedbackLearning: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const getApiRouteUserMock = getApiRouteUser as jest.MockedFunction<
  typeof getApiRouteUser
>;
const createServiceClientMock = createServiceClient as jest.MockedFunction<
  typeof createServiceClient
>;

type QueryResult = { data: unknown; error: null | { message: string } };
type QueryCall = { op: string; args: unknown[] };

function createQuery(result: QueryResult, calls: QueryCall[]) {
  const query = {
    select: jest.fn((...args: unknown[]) => {
      calls.push({ op: "select", args });
      return query;
    }),
    eq: jest.fn((...args: unknown[]) => {
      calls.push({ op: "eq", args });
      return query;
    }),
    delete: jest.fn((...args: unknown[]) => {
      calls.push({ op: "delete", args });
      return query;
    }),
    maybeSingle: jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject: (reason?: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

function makeServiceClient(options?: {
  item?: QueryResult;
  commentsDelete?: QueryResult;
  itemDelete?: QueryResult;
}) {
  const calls: Record<string, QueryCall[]> = {
    admin_feedback_items: [],
    admin_feedback_comments: [],
    user_profiles: [],
  };
  const removeMock = jest.fn().mockResolvedValue({ error: null });
  let feedbackItemsCallCount = 0;

  const client = {
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: jest.fn(() => ({ remove: removeMock })),
    },
    from: jest.fn((table: string) => {
      if (table === "user_profiles") {
        return createQuery(
          { data: { is_admin: true }, error: null },
          calls.user_profiles,
        );
      }

      if (table === "admin_feedback_items") {
        feedbackItemsCallCount += 1;
        const result =
          feedbackItemsCallCount === 1
            ? options?.item ?? {
                data: {
                  id: "11111111-1111-4111-8111-111111111111",
                  screenshot_path: "feedback/admin/repro.png",
                },
                error: null,
              }
            : options?.itemDelete ?? { data: null, error: null };
        return createQuery(result, calls.admin_feedback_items);
      }

      if (table === "admin_feedback_comments") {
        return createQuery(
          options?.commentsDelete ?? { data: null, error: null },
          calls.admin_feedback_comments,
        );
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { client, calls, removeMock };
}

function makeDeleteRequest(id = "11111111-1111-4111-8111-111111111111") {
  return new NextRequest("http://localhost/api/admin/feedback", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

describe("/api/admin/feedback DELETE", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getApiRouteUserMock.mockResolvedValue({
      id: "admin-user-id",
      email: "admin@example.com",
    } as never);
  });

  it("deletes comments before the feedback item and removes the item screenshot", async () => {
    const { client, calls, removeMock } = makeServiceClient();
    createServiceClientMock.mockReturnValue(client as never);

    const response = await DELETE(makeDeleteRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(client.from).toHaveBeenCalledWith("admin_feedback_comments");
    expect(client.from).toHaveBeenCalledWith("admin_feedback_items");
    expect(calls.admin_feedback_comments).toContainEqual({
      op: "delete",
      args: [],
    });
    expect(calls.admin_feedback_comments).toContainEqual({
      op: "eq",
      args: ["feedback_item_id", "11111111-1111-4111-8111-111111111111"],
    });
    expect(calls.admin_feedback_items).toContainEqual({
      op: "delete",
      args: [],
    });
    expect(removeMock).toHaveBeenCalledWith(["feedback/admin/repro.png"]);
  });

  it("returns the comment delete error without deleting the feedback item", async () => {
    const { client, calls } = makeServiceClient({
      commentsDelete: {
        data: null,
        error: { message: "comment cleanup failed" },
      },
    });
    createServiceClientMock.mockReturnValue(client as never);

    const response = await DELETE(makeDeleteRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).toContain("comment cleanup failed");
    expect(
      calls.admin_feedback_items.filter((call) => call.op === "delete"),
    ).toHaveLength(0);
  });
});
