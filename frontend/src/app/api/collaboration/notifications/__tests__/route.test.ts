import { NextRequest } from "next/server";

import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { GET, PATCH } from "../route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getApiRouteUser: jest.fn(),
}));

const createClientMock = createClient as jest.MockedFunction<
  typeof createClient
>;
const getApiRouteUserMock = getApiRouteUser as jest.MockedFunction<
  typeof getApiRouteUser
>;

type QueryResult = {
  data?: unknown;
  count?: number | null;
  error?: { message: string } | null;
};

class SupabaseMock {
  calls: Array<{
    table: string;
    operation: string;
    payload?: unknown;
    filters: Array<[string, unknown]>;
  }> = [];

  constructor(private readonly results: Record<string, QueryResult[]>) {}

  from(table: string) {
    return new QueryMock(this, table);
  }

  next(table: string, operation: string) {
    const key = `${table}.${operation}`;
    const result = this.results[key]?.shift();
    if (!result) {
      throw new Error(`No mock result queued for ${key}`);
    }
    return result;
  }
}

class QueryMock {
  private filters: Array<[string, unknown]> = [];
  private operation: "select" | "update" | null = null;
  private payload: unknown;

  constructor(
    private readonly db: SupabaseMock,
    private readonly table: string,
  ) {}

  select() {
    this.operation = "select";
    return this;
  }

  update(payload: unknown) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  maybeSingle() {
    const result = this.db.next(this.table, this.operation ?? "select");
    this.db.calls.push({
      table: this.table,
      operation: this.operation ?? "select",
      payload: this.payload,
      filters: [...this.filters],
    });
    return Promise.resolve({
      data: result.data ?? null,
      error: result.error ?? null,
    });
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    try {
      const result = this.db.next(this.table, this.operation ?? "select");
      this.db.calls.push({
        table: this.table,
        operation: this.operation ?? "select",
        payload: this.payload,
        filters: [...this.filters],
      });
      return Promise.resolve({
        data: result.data,
        count: result.count,
        error: result.error ?? null,
      }).then(onfulfilled, onrejected);
    } catch (error) {
      return Promise.reject(error).then(onfulfilled, onrejected);
    }
  }
}

describe("/api/collaboration/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getApiRouteUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
  });

  it("scopes notification list and unread count to the authenticated user", async () => {
    const supabase = new SupabaseMock({
      "collaboration_notifications.select": [
        {
          data: [
            {
              id: "notification-1",
              kind: "submittal_workflow_action",
              title: "Submittal response needed",
              body: null,
              metadata: {},
              created_at: "2026-06-26T10:00:00.000Z",
              read_at: null,
              entity_type: "submittal",
              entity_id: "sub-1",
              project_id: 25125,
            },
          ],
        },
        { data: null, count: 1 },
      ],
    });
    createClientMock.mockResolvedValue(supabase as never);

    const response = await GET(
      new NextRequest("http://localhost/api/collaboration/notifications"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ unreadCount: 1 });
    const selectCalls = supabase.calls.filter(
      (call) => call.operation === "select",
    );
    expect(selectCalls).toHaveLength(2);
    for (const call of selectCalls) {
      expect(call.filters).toContainEqual(["user_id", "user-1"]);
    }
  });

  it("scopes mark-all-read to the authenticated user", async () => {
    const supabase = new SupabaseMock({
      "collaboration_notifications.update": [{ data: null }],
    });
    createClientMock.mockResolvedValue(supabase as never);

    const response = await PATCH(
      new NextRequest("http://localhost/api/collaboration/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(supabase.calls[0]).toMatchObject({
      table: "collaboration_notifications",
      operation: "update",
    });
    expect(supabase.calls[0]?.filters).toContainEqual(["user_id", "user-1"]);
  });

  it("scopes review metadata reads and writes to the authenticated user", async () => {
    const supabase = new SupabaseMock({
      "collaboration_notifications.select": [{ data: { metadata: {} } }],
      "collaboration_notifications.update": [{ data: null }],
    });
    createClientMock.mockResolvedValue(supabase as never);

    const response = await PATCH(
      new NextRequest("http://localhost/api/collaboration/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "mark-reviewed",
          id: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(supabase.calls).toHaveLength(2);
    for (const call of supabase.calls) {
      expect(call.filters).toContainEqual(["user_id", "user-1"]);
    }
  });
});
