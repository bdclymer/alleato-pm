import { NextRequest } from "next/server";
import { PATCH } from "../route";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions-guard";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/permissions-guard", () => ({
  requirePermission: jest.fn(),
}));

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;
const requirePermissionMock = requirePermission as jest.MockedFunction<
  typeof requirePermission
>;

function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    "http://localhost/api/projects/42/budget/lines/line-1",
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("budget line PATCH route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
    requirePermissionMock.mockResolvedValue({
      denied: false,
    } as Awaited<ReturnType<typeof requirePermission>>);
  });

  it("returns 401 instead of throwing when no authenticated user exists", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await PATCH(
      makePatchRequest({ quantity: 10, unit_cost: 25, original_amount: 250 }),
      {
        params: Promise.resolve({ projectId: "42", lineId: "line-1" }),
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized - please log in",
    });
  });
});
