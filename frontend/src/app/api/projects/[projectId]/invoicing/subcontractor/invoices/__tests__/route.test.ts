import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { POST } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const createClientMock = createClient as jest.Mock;

type MockQuery = Record<
  string,
  jest.Mock | ((resolve: (value: unknown) => unknown) => Promise<unknown>)
>;

function createQuery(result: unknown, onInsert?: jest.Mock) {
  const query: MockQuery = {};
  const self = query as MockQuery;
  for (const method of ["select", "eq", "in", "lt", "order", "update", "delete"]) {
    query[method] = jest.fn(() => self);
  }
  query.insert = jest.fn((rows: unknown) => {
    onInsert?.(rows);
    return self;
  });
  query.single = jest.fn(async () => result);
  query.maybeSingle = jest.fn(async () => result);
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return self;
}

describe("subcontractor invoices POST", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates retainage release invoices with prefilled release-only line items", async () => {
    const invoiceInsert = jest.fn();
    const lineItemInsert = jest.fn();
    const queues = new Map<string, MockQuery[]>([
      [
        "subcontracts",
        [
          createQuery({
            data: { id: "sub-1", default_retainage_percent: 10 },
            error: null,
          }),
        ],
      ],
      [
        "subcontractor_invoices",
        [
          createQuery(
            {
              data: {
                id: 99,
                subcontract_id: "sub-1",
                purchase_order_id: null,
                invoice_number: null,
              },
              error: null,
            },
            invoiceInsert,
          ),
          createQuery({ count: 1, error: null }),
          createQuery({ data: null, error: null }),
          createQuery({
            data: [
              {
                id: 1,
                created_at: "2026-04-01T00:00:00Z",
                status: "approved",
                subcontractor_invoice_line_items: [
                  {
                    sort_order: 1,
                    budget_code: "03 00 00",
                    description: "Concrete",
                    scheduled_value: 10000,
                    work_completed_previous: 0,
                    work_completed_period: 5000,
                    materials_stored: 1000,
                    total_completed_stored: 6000,
                    retainage_amount: 500,
                    materials_retainage_amount: 100,
                    previous_work_retainage: 0,
                    previous_materials_retainage: 0,
                    work_retainage_released: 0,
                    materials_retainage_released: 0,
                  },
                ],
              },
            ],
            error: null,
          }),
        ],
      ],
      [
        "subcontract_sov_items",
        [
          createQuery({
            data: [
              {
                line_number: 1,
                budget_code: "03 00 00",
                description: "Concrete",
                amount: 10000,
                billed_to_date: 6000,
              },
            ],
            error: null,
          }),
        ],
      ],
      [
        "subcontractor_invoice_line_items",
        [createQuery({ data: null, error: null }, lineItemInsert)],
      ],
    ]);

    createClientMock.mockResolvedValue({
      auth: {
        getUser: jest.fn(async () => ({
          data: { user: { id: "user-1", email: "pm@example.com" } },
          error: null,
        })),
      },
      from: jest.fn((table: string) => {
        const queue = queues.get(table);
        if (!queue?.length) throw new Error(`Unexpected table call: ${table}`);
        return queue.shift();
      }),
    });

    const request = new NextRequest("http://localhost/api/projects/67/invoicing/subcontractor/invoices", {
      method: "POST",
      body: JSON.stringify({
        subcontract_id: "sub-1",
        is_retainage_release: true,
      }),
    });

    const response = await POST(request, { params: { projectId: "67" } });
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.id).toBe(99);
    expect(invoiceInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "not_invited",
        is_retainage_release: true,
      }),
    );
    expect(lineItemInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        work_completed_period: 0,
        materials_stored: 0,
        retainage_amount: 0,
        materials_retainage_amount: 0,
        previous_work_retainage: 500,
        previous_materials_retainage: 100,
        work_retainage_released: 500,
        materials_retainage_released: 100,
        retainage_released: 600,
      }),
    ]);
  });
});
