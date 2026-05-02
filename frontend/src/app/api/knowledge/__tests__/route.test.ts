/**
 * Tests for /api/knowledge route.
 *
 * Key correctness invariants:
 * 1. The embedding model must be "text-embedding-3-large" (3072-dim, matches halfvec(3072) column)
 * 2. Embedding failure on POST returns 201 with a "warnings" field — not a silent 201 with no signal
 * 3. Embedding failure on PATCH returns 200 with a "warnings" field — stale embedding is surfaced
 *
 * Regression guard: this file was created after a dimension mismatch bug where the model was
 * "text-embedding-3-small" (1536-dim) but the DB column expected halfvec(3072). The mismatch
 * caused every INSERT to silently save a null embedding. Never regress to 3-small.
 */

import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks (must be declared before imports that trigger them)
// ---------------------------------------------------------------------------

const mockEmbeddingsCreate = jest.fn();

jest.mock("openai", () =>
  jest.fn().mockImplementation(() => ({
    embeddings: { create: mockEmbeddingsCreate },
  }))
);

const mockInsertSingle = jest.fn();
const mockUpdateSingle = jest.fn();
const mockSelectSingle = jest.fn();
const mockMaybeSingle = jest.fn();

const makeChainable = (terminal: jest.Mock) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    single: terminal,
    maybeSingle: mockMaybeSingle,
  };
  return chain;
};

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: "admin-user-id" } },
      error: null,
    }),
  },
  from: jest.fn((table: string) => {
    if (table === "user_profiles") {
      return { ...makeChainable(mockMaybeSingle), maybeSingle: mockMaybeSingle };
    }
    if (table === "company_knowledge") {
      return makeChainable(mockInsertSingle);
    }
    return makeChainable(mockInsertSingle);
  }),
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabaseClient),
}));

// Mock guardrails to pass through the handler transparently in unit tests
jest.mock("@/lib/guardrails/api", () => ({
  withApiGuardrails: (_name: string, handler: Function) =>
    (req: NextRequest, ctx?: unknown) =>
      handler({ request: req, params: ctx ?? {}, requestId: "test-req-id" }),
}));

jest.mock("@/lib/guardrails/errors", () => ({
  GuardrailError: class GuardrailError extends Error {
    constructor({ message }: { code: string; where: string; message: string; cause?: string }) {
      super(message);
    }
  },
}));

jest.mock("@/lib/api-error", () => ({
  apiErrorResponse: jest.fn((_err: unknown) => new Response(JSON.stringify({ error: "db error" }), { status: 500 })),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------

import { POST, PATCH } from "../route";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/api/knowledge route — embedding model invariants", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: admin user allowed
    mockMaybeSingle.mockResolvedValue({ data: { is_admin: true }, error: null });

    // Default: insert/update succeed
    mockInsertSingle.mockResolvedValue({ data: { id: "new-article-id", title: "Test" }, error: null });
    mockUpdateSingle.mockResolvedValue({ data: { id: "existing-id", title: "Test" }, error: null });

    // Default: embedding succeeds with 3072-dim vector
    mockEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: new Array(3072).fill(0.1) }],
    });
  });

  describe("POST /api/knowledge", () => {
    it("calls OpenAI embeddings with text-embedding-3-large (not 3-small)", async () => {
      const req = new NextRequest("http://localhost/api/knowledge", {
        method: "POST",
        body: JSON.stringify({ title: "Test Article", content: "Some content.", category: "general" }),
      });

      await POST(req);

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: "text-embedding-3-large" })
      );
    });

    it("returns 201 on success", async () => {
      const req = new NextRequest("http://localhost/api/knowledge", {
        method: "POST",
        body: JSON.stringify({ title: "Test Article", content: "Some content.", category: "general" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
    });

    it("returns 201 with warnings field when embedding fails (not a silent success)", async () => {
      mockEmbeddingsCreate.mockRejectedValue(new Error("OpenAI unavailable"));

      const req = new NextRequest("http://localhost/api/knowledge", {
        method: "POST",
        body: JSON.stringify({ title: "Test Article", content: "Some content.", category: "general" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.warnings).toBeDefined();
      expect(body.warnings).toContain("embedding_failed");
    });

    it("does NOT include warnings when embedding succeeds", async () => {
      const req = new NextRequest("http://localhost/api/knowledge", {
        method: "POST",
        body: JSON.stringify({ title: "Test Article", content: "Some content.", category: "general" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.warnings).toBeUndefined();
    });
  });

  describe("PATCH /api/knowledge", () => {
    beforeEach(() => {
      // Set up the from() mock to handle both user_profiles and company_knowledge
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "user_profiles") {
          return { ...makeChainable(mockMaybeSingle), maybeSingle: mockMaybeSingle };
        }
        // For company_knowledge: handle both select (for existing article fetch) and update
        const chain = {
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn()
            .mockResolvedValueOnce({ data: { title: "Old Title", content: "Old content" }, error: null }) // select existing
            .mockResolvedValueOnce({ data: { id: "existing-id", title: "New Title" }, error: null }), // update result
        };
        return chain;
      });
    });

    it("returns 200 with warnings field when re-embedding fails on content update", async () => {
      mockEmbeddingsCreate.mockRejectedValue(new Error("Rate limit exceeded"));

      const req = new NextRequest("http://localhost/api/knowledge", {
        method: "PATCH",
        body: JSON.stringify({ id: "existing-id", content: "Updated content" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.warnings).toBeDefined();
      expect(body.warnings).toContain("embedding_refresh_failed");
    });

    it("returns 200 with no warnings when re-embedding succeeds", async () => {
      const req = new NextRequest("http://localhost/api/knowledge", {
        method: "PATCH",
        body: JSON.stringify({ id: "existing-id", content: "Updated content" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.warnings).toBeUndefined();
    });
  });
});
