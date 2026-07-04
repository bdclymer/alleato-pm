process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

import { NextRequest } from "next/server";
import { generateText, Output } from "ai";
import { POST } from "../route";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

jest.mock("ai", () => ({
  generateText: jest.fn(),
  Output: {
    object: jest.fn((config) => config),
  },
}));

jest.mock("@/lib/ai/providers", () => ({
  getLanguageModel: jest.fn((modelId: string) => ({ modelId })),
}));

jest.mock("@/lib/supabase/server", () => ({
  getApiRouteUser: jest.fn(),
}));

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

const generateTextMock = generateText as jest.MockedFunction<typeof generateText>;
const outputObjectMock = Output.object as jest.MockedFunction<typeof Output.object>;
const getApiRouteUserMock = getApiRouteUser as jest.MockedFunction<
  typeof getApiRouteUser
>;
const createServiceClientMock =
  createServiceClient as jest.MockedFunction<typeof createServiceClient>;

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

interface QueryBuilderMock {
  select: jest.Mock;
  eq: jest.Mock;
  is: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  maybeSingle: jest.Mock;
}

function createQueryBuilder(result: QueryResult): QueryBuilderMock {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
}

function request(projectId: string, body?: unknown) {
  return new NextRequest(
    `http://localhost/api/projects/${projectId}/meetings/prep-suggestions`,
    body === undefined
      ? { method: "POST" }
      : {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        },
  );
}

function params(projectId: string) {
  return { params: Promise.resolve({ projectId }) };
}

function setupMeetingPrepSupabase() {
  const builders = {
    projects: createQueryBuilder({
      data: {
        id: 42,
        name: "Goodwill Noblesville",
        summary: "Retail construction project",
        stage: "construction",
        phase: "active",
        health_status: "watch",
      },
      error: null,
    }),
    tasks: createQueryBuilder({
      data: [
        {
          id: "task-1",
          title: "Resolve storefront lead time",
          description: null,
          status: "open",
          due_date: "2026-07-09",
          priority: "high",
          assignee_name: "Architect",
        },
      ],
      error: null,
    }),
    rfis: createQueryBuilder({ data: [], error: null }),
    submittals: createQueryBuilder({ data: [], error: null }),
    change_events: createQueryBuilder({ data: [], error: null }),
    schedule_tasks: createQueryBuilder({ data: [], error: null }),
    document_metadata: createQueryBuilder({ data: [], error: null }),
    project_intelligence_timeline_events: createQueryBuilder({
      data: [],
      error: null,
    }),
  };
  const supabase = {
    from: jest.fn((table: keyof typeof builders) => {
      const builder = builders[table];
      if (!builder) throw new Error(`Unexpected table: ${table}`);
      return builder;
    }),
  };

  createServiceClientMock.mockReturnValue(
    supabase as ReturnType<typeof createServiceClient>,
  );

  return { builders, supabase };
}

describe("/api/projects/[projectId]/meetings/prep-suggestions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getApiRouteUserMock.mockResolvedValue({
      id: "planner-user",
      email: "planner@alleatogroup.com",
    });
    setupMeetingPrepSupabase();
  });

  it("returns source-backed suggestions by default without calling the model", async () => {
    const response = await POST(request("42"), params("42"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.generatedBy).toBe("source");
    expect(body.model).toBeNull();
    expect(body.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "task-task-1",
          kind: "task",
          title: "Resolve storefront lead time",
          href: "/42/tasks",
          sourceLabel: "Project task",
        }),
      ]),
    );
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("calls the model only when AI mode is explicitly requested", async () => {
    generateTextMock.mockResolvedValue({
      output: {
        suggestions: [
          {
            sourceIds: ["task-task-1"],
            kind: "task",
            title: "Confirm storefront lead time",
            description: "Resolve the lead-time path before the next lookahead.",
            priority: "high",
          },
        ],
        meetingRecaps: [],
      },
    } as Awaited<ReturnType<typeof generateText>>);

    const response = await POST(request("42", { mode: "ai" }), params("42"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.generatedBy).toBe("ai");
    expect(body.model).toBe("gpt-5.5");
    expect(body.suggestions).toEqual([
      expect.objectContaining({
        id: "ai-task-task-1",
        title: "Confirm storefront lead time",
        href: "/42/tasks",
        sourceLabel: "Project task",
      }),
    ]);
    expect(outputObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "meetingPrepSuggestions" }),
    );
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to source-backed suggestions when explicit AI generation fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    generateTextMock.mockRejectedValue(new Error("AI Gateway timeout"));

    const response = await POST(request("42", { mode: "ai" }), params("42"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.generatedBy).toBe("source");
    expect(body.model).toBe("gpt-5.5");
    expect(body.fallbackReason).toBe(
      "AI prep is unavailable. Showing source-backed project suggestions.",
    );
    expect(body.suggestions[0]).toEqual(
      expect.objectContaining({
        id: "task-task-1",
        title: "Resolve storefront lead time",
      }),
    );
    expect(generateTextMock).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});
