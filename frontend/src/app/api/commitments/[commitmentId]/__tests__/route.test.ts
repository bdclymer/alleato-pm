import { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { GET } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;

function createQueryChain<T>(payload: T) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(async () => ({ data: payload, error: null })),
    maybeSingle: jest.fn(async () => ({ data: payload, error: null })),
    then: jest.fn(
      (
        resolve: (value: { data: T; error: null }) => void,
      ) => resolve({ data: payload, error: null }),
    ),
  };
  return chain;
}

describe("/api/commitments/[commitmentId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns unit/quantity purchase order detail fields for the SOV table", async () => {
    const unifiedChain = createQueryChain({ commitment_type: "purchase_order" });
    const purchaseOrderChain = createQueryChain({
      id: "po-1",
      project_id: 1010,
      contract_number: "PO-001",
      title: "QA Materials Purchase Order",
      description: null,
      status: "draft",
      executed: false,
      contract_company_id: null,
      contract_date: null,
      signed_po_received_date: null,
      issued_on_date: null,
      default_retainage_percent: 0,
      accounting_method: "unit-quantity",
      is_private: false,
      non_admin_user_ids: [],
      allow_non_admin_view_sov_items: false,
      invoice_contact_ids: [],
      created_by: null,
      created_at: "2026-04-29T00:00:00.000Z",
      updated_at: "2026-04-29T00:00:00.000Z",
      deleted_at: null,
    });
    const totalsChain = createQueryChain({
      total_sov_amount: 50000,
      total_billed_to_date: 0,
      total_amount_remaining: 50000,
      sov_line_count: 1,
    });
    const sovChain = createQueryChain([
      {
        id: "line-1",
        line_number: 1,
        budget_code: "03 00 00",
        description: "Concrete materials",
        amount: 50000,
        quantity: 1,
        uom: "LS",
        unit_cost: 50000,
        billed_to_date: 0,
        sort_order: null,
      },
    ]);
    const changeOrdersChain = createQueryChain([]);

    const fromMock = jest.fn((table: string) => {
      switch (table) {
        case "commitments_unified":
          return unifiedChain;
        case "purchase_orders":
          return purchaseOrderChain;
        case "purchase_orders_with_totals":
          return totalsChain;
        case "purchase_order_sov_items":
          return sovChain;
        case "contract_change_orders":
          return changeOrdersChain;
        default:
          throw new Error(`Unexpected table: ${table}`);
      }
    });

    createClientMock.mockResolvedValue({ from: fromMock } as never);

    const response = await GET(
      new NextRequest("http://localhost/api/commitments/po-1"),
      { params: Promise.resolve({ commitmentId: "po-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        accounting_method: "unit-quantity",
        line_items: [
          {
            quantity: 1,
            uom: "LS",
            unit_cost: 50000,
          },
        ],
      },
    });
    expect(sovChain.select).toHaveBeenCalledWith(
      expect.stringContaining("quantity, uom, unit_cost"),
    );
  });
});
