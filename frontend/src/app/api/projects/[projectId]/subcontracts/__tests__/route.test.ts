process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

import { NextRequest } from "next/server";

import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { POST } from "../route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getApiRouteUser: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;
const getApiRouteUserMock = getApiRouteUser as jest.MockedFunction<typeof getApiRouteUser>;

describe("/api/projects/[projectId]/subcontracts POST", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getApiRouteUserMock.mockResolvedValue({
      id: "user-123",
      email: "qa@example.com",
    } as Awaited<ReturnType<typeof getApiRouteUser>>);
  });

  it("never sends unsupported columns to subcontracts.insert", async () => {
    const insertSingle = jest.fn().mockResolvedValue({
      data: {
        id: "sub-1",
        project_id: 762,
        contract_number: "SC-001",
        title: "QA Subcontract",
      },
      error: null,
    });

    const insertChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: insertSingle,
    };

    const totalsSingle = jest.fn().mockResolvedValue({
      data: {
        id: "sub-1",
        project_id: 762,
        contract_number: "SC-001",
        title: "QA Subcontract",
        total_sov_amount: 0,
        total_billed_to_date: 0,
        total_amount_remaining: 0,
        sov_line_count: 0,
      },
      error: null,
    });

    const totalsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: totalsSingle,
    };

    const fromMock = jest.fn((table: string) => {
      if (table === "subcontracts") return insertChain;
      if (table === "subcontracts_with_totals") return totalsChain;
      throw new Error(`Unexpected table: ${table}`);
    });

    createClientMock.mockResolvedValue({
      from: fromMock,
    } as never);

    const request = new NextRequest(
      "http://localhost/api/projects/762/subcontracts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "QA Subcontract",
          status: "Draft",
          contractCompanyId: "company-1",
          contractNumber: "SC-001",
          executed: false,
          accountingMethod: "amount_based",
          attachments: [],
          sov: [],
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ projectId: "762" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Subcontract created successfully");
    expect(fromMock).toHaveBeenCalledWith("subcontracts");
    expect(insertChain.insert).toHaveBeenCalledTimes(1);
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.not.objectContaining({
        accounting_method: expect.anything(),
      }),
    );
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 762,
        contract_number: "SC-001",
        contract_company_id: "company-1",
        title: "QA Subcontract",
        created_by: "user-123",
      }),
    );
  });
});
