import { apiFetchWithTimeout } from "./api-client";

// Node 18+ has native fetch; mock it per-test to control behavior.
const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
global.fetch = mockFetch as unknown as typeof fetch;

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetchWithTimeout", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("resolves with parsed JSON on success", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ id: "abc-123" }));

    const result = await apiFetchWithTimeout<{ id: string }>("/api/test");

    expect(result).toEqual({ id: "abc-123" });
  });

  it("throws a descriptive error when the request times out", async () => {
    // fetch never resolves; when the AbortSignal fires it rejects
    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    // 50 ms timeout — fast enough to not slow the suite, slow enough to be reliable
    await expect(
      apiFetchWithTimeout("/api/test", undefined, 50),
    ).rejects.toThrow(/Request timed out after/);
  });

  it("propagates non-abort errors unchanged", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockFetch.mockRejectedValue(networkError);

    await expect(apiFetchWithTimeout("/api/test")).rejects.toThrow(
      "Failed to fetch",
    );
  });

  it("throws ApiError on non-2xx response (not a timeout error)", async () => {
    mockFetch.mockResolvedValue(
      makeJsonResponse({ error: "Validation error", details: "title is required" }, 400),
    );

    await expect(apiFetchWithTimeout("/api/test")).rejects.toThrow(
      "title is required",
    );
  });

  it("resolves with null on 204 No Content", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await apiFetchWithTimeout("/api/test", { method: "DELETE" });

    expect(result).toBeNull();
  });

  it("uses the provided timeoutMs instead of the default", async () => {
    const requestStarted = Date.now();
    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    });

    await expect(
      apiFetchWithTimeout("/api/test", undefined, 80),
    ).rejects.toThrow(/Request timed out after/);

    // Verify the timeout was ~80 ms, not the 20 s default
    expect(Date.now() - requestStarted).toBeLessThan(500);
  });
});
