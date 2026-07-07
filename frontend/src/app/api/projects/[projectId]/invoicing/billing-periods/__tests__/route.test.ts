import { NextRequest } from "next/server";

import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { PATCH } from "../[periodId]/route";
import { POST } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

jest.mock("@/lib/supabase/server", () => ({
  getApiRouteUser: jest.fn(),
  createClient: jest.fn(),
}));

const getApiRouteUserMock = getApiRouteUser as jest.MockedFunction<
  typeof getApiRouteUser
>;
const createClientMock = createClient as jest.Mock;

type MockQuery = Record<string, jest.Mock | ((resolve: (value: unknown) => unknown) => Promise<unknown>)>;

function createQuery(result: unknown, onUpdate?: jest.Mock) {
  const query: MockQuery = {};
  const self = query as MockQuery;
  for (const method of ["select", "eq", "order", "limit", "delete"]) {
    query[method] = jest.fn(() => self);
  }
  query.update = jest.fn((payload: unknown) => {
    onUpdate?.(payload);
    return self;
  });
  query.insert = jest.fn(() => self);
  query.single = jest.fn(async () => result);
  query.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return self;
}

describe("invoicing billing periods route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getApiRouteUserMock.mockResolvedValue({
      id: "user-1",
      email: "pm@example.com",
    } as never);
  });

  it("rejects create requests without due date", async () => {
    createClientMock.mockResolvedValue({});

    const request = new NextRequest(
      "http://localhost/api/projects/876/invoicing/billing-periods",
      {
        method: "POST",
        body: JSON.stringify({
          start_date: "2026-07-01",
          end_date: "2026-07-31",
        }),
      },
    );

    const response = await POST(request, { params: { projectId: "876" } });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Billing period due date is required.",
    });
  });

  it("rejects create requests when another open period exists", async () => {
    const queues = new Map<string, MockQuery[]>([
      [
        "projects",
        [createQuery({ data: { id: 876 }, error: null })],
      ],
      [
        "billing_periods",
        [
          createQuery({
            data: [{ id: "bp-1", is_closed: false, period_number: 1 }],
            error: null,
          }),
        ],
      ],
    ]);

    createClientMock.mockResolvedValue({
      from: jest.fn((table: string) => {
        const queue = queues.get(table);
        if (!queue?.length) throw new Error(`Unexpected table call: ${table}`);
        return queue.shift();
      }),
    });

    const request = new NextRequest(
      "http://localhost/api/projects/876/invoicing/billing-periods",
      {
        method: "POST",
        body: JSON.stringify({
          start_date: "2026-07-01",
          end_date: "2026-07-31",
          due_date: "2026-08-05",
        }),
      },
    );

    const response = await POST(request, { params: { projectId: "876" } });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Close open billing period BP-001 before creating another one.",
    });
  });

  it("rejects patch requests that blank the due date", async () => {
    const queues = new Map<string, MockQuery[]>([
      [
        "billing_periods",
        [
          createQuery({
            data: {
              id: "bp-1",
              period_number: 1,
              start_date: "2026-07-01",
              end_date: "2026-07-31",
              due_date: "2026-08-05",
              is_closed: false,
            },
            error: null,
          }),
          createQuery({
            data: [{ id: "bp-1", is_closed: false, period_number: 1 }],
            error: null,
          }),
        ],
      ],
    ]);

    createClientMock.mockResolvedValue({
      from: jest.fn((table: string) => {
        const queue = queues.get(table);
        if (!queue?.length) throw new Error(`Unexpected table call: ${table}`);
        return queue.shift();
      }),
    });

    const request = new NextRequest(
      "http://localhost/api/projects/876/invoicing/billing-periods/bp-1",
      {
        method: "PATCH",
        body: JSON.stringify({ due_date: "" }),
      },
    );

    const response = await PATCH(request, {
      params: { projectId: "876", periodId: "bp-1" },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Billing period due date is required.",
    });
  });

  it("rejects reopening a period while another one is already open", async () => {
    const updateSpy = jest.fn();
    const queues = new Map<string, MockQuery[]>([
      [
        "billing_periods",
        [
          createQuery({
            data: {
              id: "bp-2",
              period_number: 2,
              start_date: "2026-08-01",
              end_date: "2026-08-31",
              due_date: "2026-09-05",
              is_closed: true,
            },
            error: null,
          }),
          createQuery({
            data: [
              { id: "bp-1", is_closed: false, period_number: 1 },
              { id: "bp-2", is_closed: true, period_number: 2 },
            ],
            error: null,
          }, updateSpy),
        ],
      ],
    ]);

    createClientMock.mockResolvedValue({
      from: jest.fn((table: string) => {
        const queue = queues.get(table);
        if (!queue?.length) throw new Error(`Unexpected table call: ${table}`);
        return queue.shift();
      }),
    });

    const request = new NextRequest(
      "http://localhost/api/projects/876/invoicing/billing-periods/bp-2",
      {
        method: "PATCH",
        body: JSON.stringify({ is_closed: false }),
      },
    );

    const response = await PATCH(request, {
      params: { projectId: "876", periodId: "bp-2" },
    });

    expect(response.status).toBe(409);
    expect(updateSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error:
        "Close open billing period BP-001 before reopening or editing another open period.",
    });
  });
});
