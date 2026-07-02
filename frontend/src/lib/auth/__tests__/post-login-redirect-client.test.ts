import { resolvePostLoginRedirect } from "../post-login-redirect-client";

const noWait = async () => {};

describe("resolvePostLoginRedirect", () => {
  it("returns the redirect immediately when it isn't the home fallback", async () => {
    const fetchRedirect = jest.fn().mockResolvedValue({ redirect: "/47/drawings/viewer/abc" });

    const result = await resolvePostLoginRedirect(fetchRedirect, "/47/drawings/viewer/abc", noWait);

    expect(result).toBe("/47/drawings/viewer/abc");
    expect(fetchRedirect).toHaveBeenCalledTimes(1);
  });

  it("retries once when the server falls back to home despite a valid callback, and uses the retry result", async () => {
    const fetchRedirect = jest
      .fn()
      .mockResolvedValueOnce({ redirect: "/" })
      .mockResolvedValueOnce({ redirect: "/47/drawings/viewer/abc" });

    const result = await resolvePostLoginRedirect(fetchRedirect, "/47/drawings/viewer/abc", noWait);

    expect(result).toBe("/47/drawings/viewer/abc");
    expect(fetchRedirect).toHaveBeenCalledTimes(2);
  });

  it("does not retry when there was no callback to protect", async () => {
    const fetchRedirect = jest.fn().mockResolvedValue({ redirect: "/" });

    const result = await resolvePostLoginRedirect(fetchRedirect, null, noWait);

    expect(result).toBe("/");
    expect(fetchRedirect).toHaveBeenCalledTimes(1);
  });

  it("falls back to home if the retry also lands on home", async () => {
    const fetchRedirect = jest.fn().mockResolvedValue({ redirect: "/" });

    const result = await resolvePostLoginRedirect(fetchRedirect, "/47/drawings/viewer/abc", noWait);

    expect(result).toBe("/");
    expect(fetchRedirect).toHaveBeenCalledTimes(2);
  });

  it("falls back to home if the retry request throws", async () => {
    const fetchRedirect = jest
      .fn()
      .mockResolvedValueOnce({ redirect: "/" })
      .mockRejectedValueOnce(new Error("network error"));

    const result = await resolvePostLoginRedirect(fetchRedirect, "/47/drawings/viewer/abc", noWait);

    expect(result).toBe("/");
    expect(fetchRedirect).toHaveBeenCalledTimes(2);
  });
});
