/**
 * Regression tests for punch items POST route.
 *
 * REGRESSION: 2026-04-13 — LinkPinModal sent status:"open" when creating a punch
 * item from the drawing viewer. The route had no input validation, so the invalid
 * status was passed directly to Supabase, causing a DB constraint error that
 * propagated as an opaque "Failed to fetch" on the client.
 *
 * Detection gap: require-api-client ESLint rule was warn (not error) — the raw
 * fetch violation in use-rfis.ts was silently ignored. No test existed for
 * invalid POST payloads.
 *
 * Prevention: Zod schema in createPunchItemSchema now rejects invalid values at
 * the API boundary with a structured 400 before touching the database.
 */

// Set required env vars before any module loads (withApiGuardrails checks these at startup)
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

import { NextRequest } from "next/server";
import { POST } from "../route";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const punchItemServiceMock = {
  create: jest.fn(),
  list: jest.fn(),
};

jest.mock("@/services/PunchItemService", () => ({
  PunchItemService: jest.fn().mockImplementation(() => punchItemServiceMock),
}));

const createClientMock = createClient as jest.Mock;

describe("punch-items POST route", () => {
  let supabaseMock: { auth: { getUser: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();
    supabaseMock = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    };
    createClientMock.mockResolvedValue(supabaseMock);
  });

  // ── REGRESSION: invalid status must be rejected at the API boundary ─────────

  it("returns 400 when status is 'open' (invalid — regression for drawing modal bug)", async () => {
    const request = new NextRequest(
      "http://localhost/api/projects/67/punch-items",
      {
        method: "POST",
        body: JSON.stringify({ title: "Test item", status: "open" }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const response = await POST(request, { params: Promise.resolve({ projectId: "67" }) });
    expect(response.status).toBe(400);
    // Service must NOT be called — rejection happens before DB touch
    expect(punchItemServiceMock.create).not.toHaveBeenCalled();
  });

  it("returns 400 when status is 'complete' (invalid)", async () => {
    const request = new NextRequest(
      "http://localhost/api/projects/67/punch-items",
      {
        method: "POST",
        body: JSON.stringify({ title: "Test item", status: "complete" }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const response = await POST(request, { params: Promise.resolve({ projectId: "67" }) });
    expect(response.status).toBe(400);
    expect(punchItemServiceMock.create).not.toHaveBeenCalled();
  });

  it("returns 400 when title is missing", async () => {
    const request = new NextRequest(
      "http://localhost/api/projects/67/punch-items",
      {
        method: "POST",
        body: JSON.stringify({ status: "draft" }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const response = await POST(request, { params: Promise.resolve({ projectId: "67" }) });
    expect(response.status).toBe(400);
    expect(punchItemServiceMock.create).not.toHaveBeenCalled();
  });

  // ── Valid status values must pass through ───────────────────────────────────

  it.each(["draft", "work_required", "initiated", "closed"])(
    "accepts status '%s' (valid)",
    async (status) => {
      punchItemServiceMock.create.mockResolvedValue({
        data: { id: "abc", title: "Test", status, number: 1, project_id: 67 },
        error: null,
      });

      const request = new NextRequest(
        "http://localhost/api/projects/67/punch-items",
        {
          method: "POST",
          body: JSON.stringify({ title: "Test item", status }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await POST(request, { params: Promise.resolve({ projectId: "67" }) });
      expect(response.status).toBe(201);
      expect(punchItemServiceMock.create).toHaveBeenCalledTimes(1);
    },
  );

  it("defaults status to 'draft' when omitted", async () => {
    punchItemServiceMock.create.mockResolvedValue({
      data: { id: "abc", title: "Test", status: "draft", number: 1, project_id: 67 },
      error: null,
    });

    const request = new NextRequest(
      "http://localhost/api/projects/67/punch-items",
      {
        method: "POST",
        body: JSON.stringify({ title: "Test item" }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const response = await POST(request, { params: Promise.resolve({ projectId: "67" }) });
    expect(response.status).toBe(201);
    const call = punchItemServiceMock.create.mock.calls[0][1];
    expect(call.status).toBe("draft");
  });
});
