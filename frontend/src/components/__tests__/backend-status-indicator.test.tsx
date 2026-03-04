/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BackendStatusIndicator } from "../misc/backend-status-indicator";

// Mock fetch
global.fetch = jest.fn();

describe("BackendStatusIndicator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows loading state initially", () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<BackendStatusIndicator />);
    expect(screen.getByText("Connecting...")).toBeInTheDocument();
  });

  it("shows connected state when backend is healthy", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "healthy",
        backend: true,
        openai_configured: true,
        timestamp: new Date().toISOString(),
      }),
    });

    render(<BackendStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText("Backend online")).toBeInTheDocument();
    });
  });

  it("shows disconnected state when fetch fails", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error"),
    );

    render(<BackendStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText("Backend offline")).toBeInTheDocument();
    });
  });

  it("shows AI not configured when openai_configured is false", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "healthy",
        backend: true,
        openai_configured: false,
        timestamp: new Date().toISOString(),
      }),
    });

    render(<BackendStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText("AI not configured")).toBeInTheDocument();
    });
  });

  it("shows error message when backend returns error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "error",
        backend: false,
        openai_configured: false,
        timestamp: new Date().toISOString(),
        error: "Backend unavailable",
      }),
    });

    render(<BackendStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText("Backend unavailable")).toBeInTheDocument();
    });
  });

  it("polls health check periodically", async () => {
    jest.useFakeTimers();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "healthy",
        backend: true,
        openai_configured: true,
        timestamp: new Date().toISOString(),
      }),
    });

    render(<BackendStatusIndicator />);

    // Initial call
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Fast forward 30 seconds (poll interval)
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
