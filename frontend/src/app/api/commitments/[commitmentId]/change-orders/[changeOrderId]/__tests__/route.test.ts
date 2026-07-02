import { NextRequest } from "next/server";

import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { PUT } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getApiRouteUser: jest.fn(),
}));

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;
const getApiRouteUserMock = getApiRouteUser as jest.MockedFunction<typeof getApiRouteUser>;

function createFetchChain<T>(payload: T) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(async () => ({ data: payload, error: null })),
  };
}

function createUpdateChain<T>(payload: T) {
  return {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn(async () => ({ data: payload, error: null })),
  };
}

const commitmentId = "00000000-0000-0000-0000-0000000000c1";
const changeOrderId = "00000000-0000-0000-0000-0000000000c2";

function putRequest(body: Record<string, unknown>) {
  return new NextRequest(
    `http://localhost/api/commitments/${commitmentId}/change-orders/${changeOrderId}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("PUT /api/commitments/[commitmentId]/change-orders/[changeOrderId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getApiRouteUserMock.mockResolvedValue({ id: "user-1" } as never);
  });

  it("rejects a requested_date that is later than the change order's created_at", async () => {
    const fetchChain = createFetchChain({
      id: changeOrderId,
      status: "draft",
      created_at: "2026-06-01T00:00:00.000Z",
    });

    createClientMock.mockResolvedValue({
      from: jest.fn(() => fetchChain),
    } as never);

    const response = await PUT(putRequest({ requested_date: "2026-06-15" }), {
      params: Promise.resolve({ commitmentId, changeOrderId }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid requested date",
    });
  });

  it("stores approved_date as a plain date (not a full timestamp) when approving", async () => {
    const fetchChain = createFetchChain({
      id: changeOrderId,
      status: "pending",
      created_at: "2026-06-01T00:00:00.000Z",
    });
    const updateChain = createUpdateChain({
      id: changeOrderId,
      status: "approved",
    });

    // First call to `.from()` is the existence check (fetchChain); the second
    // is the update (updateChain).
    let callCount = 0;
    createClientMock.mockResolvedValue({
      from: jest.fn(() => {
        callCount += 1;
        return callCount === 1 ? fetchChain : updateChain;
      }),
    } as never);

    await PUT(putRequest({ status: "approved" }), {
      params: Promise.resolve({ commitmentId, changeOrderId }),
    });

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        approved_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
  });
});
