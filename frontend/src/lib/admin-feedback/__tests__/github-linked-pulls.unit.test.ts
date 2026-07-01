import { findLinkedPullRequests } from "../github";

const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
global.fetch = mockFetch as unknown as typeof fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ORIGINAL_ENV = process.env;

describe("findLinkedPullRequests", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env = {
      ...ORIGINAL_ENV,
      GITHUB_FEEDBACK_REPO_OWNER: "acme",
      GITHUB_FEEDBACK_REPO_NAME: "widgets",
      GITHUB_FEEDBACK_TOKEN: "test-token",
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns null when GitHub is not configured", async () => {
    process.env.GITHUB_FEEDBACK_TOKEN = "";
    const result = await findLinkedPullRequests(123);
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns an open PR without a merge lookup", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            number: 42,
            html_url: "https://github.com/acme/widgets/pull/42",
            state: "open",
            pull_request: {},
          },
        ],
      }),
    );

    const result = await findLinkedPullRequests(123);

    expect(result).toEqual([
      { number: 42, url: "https://github.com/acme/widgets/pull/42", state: "open", merged: false },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("fetches merge status for a closed PR", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              number: 42,
              html_url: "https://github.com/acme/widgets/pull/42",
              state: "closed",
              pull_request: {},
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ merged: true }));

    const result = await findLinkedPullRequests(123);

    expect(result).toEqual([
      { number: 42, url: "https://github.com/acme/widgets/pull/42", state: "closed", merged: true },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toContain("/pulls/42");
  });

  it("skips search results that are plain issues, not pull requests", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [{ number: 7, html_url: "https://github.com/acme/widgets/issues/7", state: "open" }],
      }),
    );

    const result = await findLinkedPullRequests(123);
    expect(result).toEqual([]);
  });
});
