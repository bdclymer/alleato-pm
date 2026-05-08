import { syncDirectCosts } from "../sync-service";
import { createAcumaticaClient } from "../client";

jest.mock("../client", () => ({
  createAcumaticaClient: jest.fn(),
}));

type QueryResult = { data: unknown; error: null | { message: string } };

function createQueryBuilder(result: QueryResult, calls: unknown[]) {
  const builder: Record<string, jest.Mock> & PromiseLike<QueryResult> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    insert: jest.fn((payload: unknown) => {
      calls.push({ op: "insert", payload });
      return builder;
    }),
    update: jest.fn((payload: unknown) => {
      calls.push({ op: "update", payload });
      return builder;
    }),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };

  return builder;
}

function createSupabaseMock() {
  const calls: unknown[] = [];
  const tableCalls: Array<{ table: string; builder: ReturnType<typeof createQueryBuilder> }> = [];
  const queues: Record<string, QueryResult[]> = {
    projects: [
      { data: { acumatica_project_id: "ACU-42" }, error: null },
    ],
    direct_costs: [
      { data: [], error: null },
      { data: null, error: null },
      { data: { id: "direct-cost-1" }, error: null },
    ],
    companies: [
      { data: [], error: null },
    ],
    cost_codes: [
      { data: [{ id: "01-100" }], error: null },
      { data: { title: "General Conditions" }, error: null },
    ],
    project_budget_codes: [
      { data: [], error: null },
      { data: { id: "pbc-null-1" }, error: null },
    ],
    direct_cost_line_items: [
      { data: null, error: null },
      { data: [{ id: "line-1" }], error: null },
    ],
  };

  const supabase = {
    from: jest.fn((table: string) => {
      const queue = queues[table];
      if (!queue?.length) {
        throw new Error(`Unexpected supabase.from("${table}")`);
      }
      const builder = createQueryBuilder(queue.shift()!, calls);
      tableCalls.push({ table, builder });
      return builder;
    }),
  };

  return { supabase, calls, tableCalls };
}

describe("syncDirectCosts — Acumatica project budget code mapping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createAcumaticaClient as jest.Mock).mockReturnValue({
      login: jest.fn().mockResolvedValue(undefined),
      getProjectTransactions: jest
        .fn()
        .mockResolvedValueOnce([
          {
            ReferenceNbr: "TX-1",
            Status: "Released",
            Module: "AP",
            OriginalDocType: "Bill",
            OriginalDocNbr: "INV-1",
            Details: [
              {
                Project: "ACU-42",
                CostCode: "01-100",
                Description: "General Conditions",
                Qty: 2,
                Amount: 100,
                UOM: "EA",
                Date: "2026-04-01T00:00:00Z",
              },
            ],
          },
        ])
        .mockResolvedValueOnce([]),
    });
  });

  it("creates and uses a null-cost-type project_budget_codes row for Acumatica lines", async () => {
    const { supabase, calls, tableCalls } = createSupabaseMock();

    const result = await syncDirectCosts(
      42,
      "user-1",
      supabase as Parameters<typeof syncDirectCosts>[2],
    );

    expect(result.errors).toEqual([]);

    const projectBudgetCodesSelect = tableCalls.find(
      (call) => call.table === "project_budget_codes",
    )?.builder;
    expect(projectBudgetCodesSelect?.is).toHaveBeenCalledWith("cost_type_id", null);

    expect(calls).toContainEqual({
      op: "insert",
      payload: expect.objectContaining({
        project_id: 42,
        cost_code_id: "01-100",
        cost_type_id: null,
        description: "General Conditions",
      }),
    });

    expect(calls).toContainEqual({
      op: "insert",
      payload: [
        expect.objectContaining({
          budget_code_id: "pbc-null-1",
          quantity: 2,
          unit_cost: 50,
        }),
      ],
    });
  });
});
