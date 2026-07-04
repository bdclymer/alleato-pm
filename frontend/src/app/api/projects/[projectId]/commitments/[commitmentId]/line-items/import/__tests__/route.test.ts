import { NextRequest } from "next/server";

import { POST } from "../route";
import { verifyProjectAccess } from "@/lib/supabase/auth-guard";
import { requirePermission } from "@/lib/permissions-guard";
import { createServiceClient } from "@/lib/supabase/service";

jest.mock("@/lib/supabase/auth-guard", () => ({
  verifyProjectAccess: jest.fn(),
  isAuthError: jest.fn((value) => value instanceof Response),
}));

jest.mock("@/lib/permissions-guard", () => ({
  requirePermission: jest.fn(),
}));

const verifyProjectAccessMock = verifyProjectAccess as jest.MockedFunction<
  typeof verifyProjectAccess
>;
const requirePermissionMock = requirePermission as jest.MockedFunction<
  typeof requirePermission
>;

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(
    "http://localhost/api/projects/42/commitments/00000000-0000-0000-0000-000000000010/line-items/import",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

type QueryResult = { data: unknown; error: null | { message: string } };

function createBuilder(result: QueryResult) {
  const builder: Record<string, jest.Mock> & PromiseLike<QueryResult> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

describe("commitment line item budget import", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
    requirePermissionMock.mockResolvedValue({
      denied: false,
    } as Awaited<ReturnType<typeof requirePermission>>);
  });

  it("rejects imports after invoice submission has started", async () => {
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "commitments_unified") {
          return createBuilder({
            data: {
              id: "00000000-0000-0000-0000-000000000010",
              project_id: 42,
              commitment_type: "subcontract",
              status: "Approved",
            },
            error: null,
          });
        }
        if (table === "subcontractor_invoices") {
          return createBuilder({
            data: [
              {
                status: "under_review",
                submitted_at: "2026-07-02T18:00:00.000Z",
                approved_at: null,
              },
            ],
            error: null,
          });
        }
        throw new Error(`Unexpected supabase.from("${table}")`);
      }),
    };

    const accessResult: Exclude<
      Awaited<ReturnType<typeof verifyProjectAccess>>,
      Response
    > = {
      membership: {
        membershipId: "membership-1",
        personId: "person-1",
        authUserId: "user-1",
        projectId: 42,
        permissionTemplateId: null,
        userType: "admin",
      },
      serviceClient: supabase as ReturnType<typeof createServiceClient>,
      userProfile: null,
    };

    verifyProjectAccessMock.mockResolvedValue(accessResult);

    const response = await POST(makeRequest({ source: "budget" }), {
      params: Promise.resolve({
        projectId: "42",
        commitmentId: "00000000-0000-0000-0000-000000000010",
      }),
    });

    expect(response.status).toBe(412);
    await expect(response.json()).resolves.toMatchObject({
      error_code: "PRECONDITION_FAILED",
      error_message:
        "A commitment invoice has already been submitted, so the schedule of values stays locked to protect invoice history.",
    });
  });
});
