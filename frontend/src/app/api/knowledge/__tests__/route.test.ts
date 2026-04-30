import { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { GET, DELETE } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;

function makeAuthMock(user: { id: string } | null, authError: Error | null = null) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: authError }),
    },
  };
}

function makeFromMock(tableResponses: Record<string, unknown>) {
  return jest.fn((table: string) => {
    const payload = tableResponses[table];
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue(payload),
      then: jest.fn((resolve: (v: unknown) => void) => resolve(payload)),
    };
    return chain;
  });
}

describe("GET /api/knowledge", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    createClientMock.mockResolvedValue({
      ...makeAuthMock(null),
      from: makeFromMock({}),
    } as never);

    const req = new NextRequest("http://localhost/api/knowledge");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 for authenticated user (public view)", async () => {
    const resolvedValue = { data: [], error: null };
    const makeChain = (): Record<string, jest.Mock> => {
      const chain: Record<string, jest.Mock> = {};
      // Methods that continue the chain
      for (const m of ["select", "eq", "order", "limit", "or"]) {
        chain[m] = jest.fn().mockReturnValue(chain);
      }
      // `in` is last before `await` in the non-manage path — must be thenable
      chain.in = jest.fn().mockReturnValue({
        ...chain,
        then: (resolve: (v: typeof resolvedValue) => void, _reject?: (e: unknown) => void) =>
          Promise.resolve(resolvedValue).then(resolve, _reject),
      });
      return chain;
    };

    createClientMock.mockResolvedValue({
      ...makeAuthMock({ id: "user-1" }),
      from: jest.fn(() => makeChain()),
    } as never);

    const req = new NextRequest("http://localhost/api/knowledge");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("returns 400 for invalid projectId (NaN)", async () => {
    createClientMock.mockResolvedValue({
      ...makeAuthMock({ id: "user-1" }),
      from: makeFromMock({}),
    } as never);

    const req = new NextRequest("http://localhost/api/knowledge?projectId=not-a-number");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error_code).toBe("INVALID_PAYLOAD");
  });

  it("returns 403 for non-admin requesting manage=true", async () => {
    createClientMock.mockResolvedValue({
      ...makeAuthMock({ id: "user-1" }),
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { is_admin: false }, error: null }),
      })),
    } as never);

    const req = new NextRequest("http://localhost/api/knowledge?manage=true");
    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error_code).toBe("AUTH_FORBIDDEN");
  });

  it("returns 500 when user_profiles DB fails (UPSTREAM_FAILURE)", async () => {
    createClientMock.mockResolvedValue({
      ...makeAuthMock({ id: "user-1" }),
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "DB connection error" },
        }),
      })),
    } as never);

    const req = new NextRequest("http://localhost/api/knowledge?manage=true");
    const res = await GET(req);
    // UPSTREAM_FAILURE maps to 502 in the guardrails error handler
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error_code).toBe("UPSTREAM_FAILURE");
  });
});

describe("DELETE /api/knowledge", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 when id param is missing", async () => {
    createClientMock.mockResolvedValue({
      ...makeAuthMock({ id: "admin-1" }),
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
      })),
    } as never);

    const req = new NextRequest("http://localhost/api/knowledge");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error_code).toBe("INVALID_PAYLOAD");
  });

  it("returns 404 when document id does not exist (0-row no-op guard)", async () => {
    let callCount = 0;
    createClientMock.mockResolvedValue({
      ...makeAuthMock({ id: "admin-1" }),
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockImplementation(() => {
          callCount++;
          // First call: assertKnowledgeAdmin (user_profiles) — admin check passes
          // Second call: pre-fetch storage path — document not found
          if (callCount === 1) {
            return Promise.resolve({ data: { is_admin: true }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        // delete chain returns empty array (0-row delete)
        then: jest.fn((resolve: (v: unknown) => void) => {
          if (callCount >= 2) {
            resolve({ data: [], error: null });
          }
        }),
      })),
      storage: {
        from: jest.fn(() => ({
          remove: jest.fn().mockResolvedValue({ error: null }),
        })),
      },
    } as never);

    const req = new NextRequest("http://localhost/api/knowledge?id=nonexistent-doc-id");
    const res = await DELETE(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error_code).toBe("NOT_FOUND");
  });
});
