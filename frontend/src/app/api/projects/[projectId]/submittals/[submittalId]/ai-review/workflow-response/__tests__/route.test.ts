import { NextRequest } from "next/server";

import { recordSubmittalWorkflowResponse } from "@/lib/submittals/workflow-response-service";
import { createClient } from "@/lib/supabase/server";
import { POST } from "../route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/submittals/workflow-response-service", () => {
  const actual = jest.requireActual("@/lib/submittals/workflow-response-service");
  return {
    ...actual,
    recordSubmittalWorkflowResponse: jest.fn(),
  };
});

const createClientMock = createClient as jest.MockedFunction<
  typeof createClient
>;
const recordWorkflowResponseMock =
  recordSubmittalWorkflowResponse as jest.MockedFunction<
    typeof recordSubmittalWorkflowResponse
  >;

function mockUser(user = { id: "user-1" }) {
  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
  };
  createClientMock.mockResolvedValue(supabase as never);
  return supabase;
}

describe("/api/projects/[projectId]/submittals/[submittalId]/ai-review/workflow-response", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated AI review workflow responses", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as never);

    const response = await POST(
      new NextRequest(
        "http://localhost/api/projects/876/submittals/sub-1/ai-review/workflow-response",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            stepId: "11111111-1111-4111-8111-111111111111",
            responseStatus: "Revise and Resubmit",
          }),
        },
      ),
      {
        params: Promise.resolve({
          projectId: "876",
          submittalId: "sub-1",
        }),
      },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error_code: "UNAUTHORIZED",
    });
  });

  it("records the response through the shared workflow service", async () => {
    const supabase = mockUser();
    recordWorkflowResponseMock.mockResolvedValue({
      id: "response-1",
      response_status: "Revise and Resubmit",
    } as never);

    const response = await POST(
      new NextRequest(
        "http://localhost/api/projects/876/submittals/sub-1/ai-review/workflow-response",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            stepId: "11111111-1111-4111-8111-111111111111",
            responseStatus: "Revise and Resubmit",
            comments: "AI review found a finish conflict.",
          }),
        },
      ),
      {
        params: Promise.resolve({
          projectId: "876",
          submittalId: "sub-1",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(recordWorkflowResponseMock).toHaveBeenCalledWith({
      supabase,
      projectId: 876,
      submittalId: "sub-1",
      stepId: "11111111-1111-4111-8111-111111111111",
      userId: "user-1",
      responseStatus: "Revise and Resubmit",
      comments: "AI review found a finish conflict.",
      where:
        "projects/[projectId]/submittals/[submittalId]/ai-review/workflow-response#POST",
    });
    expect(await response.json()).toEqual({
      id: "response-1",
      response_status: "Revise and Resubmit",
    });
  });
});
