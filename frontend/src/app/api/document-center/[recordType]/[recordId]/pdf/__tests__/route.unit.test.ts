import { NextRequest } from "next/server";

jest.mock("@/lib/guardrails/env", () => ({
  validateEnvVars: jest.fn(),
}));

jest.mock("@/lib/documents/pdf", () => ({
  renderPdfFromHtml: jest.fn(),
}));

jest.mock("@/lib/documents/record-documents", () => ({
  getDocumentBundle: jest.fn(),
  renderDocumentHtml: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({}),
  getApiRouteUser: jest.fn().mockResolvedValue({ id: "user-1", email: "test@example.com" }),
}));

import { renderPdfFromHtml } from "@/lib/documents/pdf";
import { getDocumentBundle, renderDocumentHtml } from "@/lib/documents/record-documents";
import { logger } from "@/lib/logger";

function makeRequest() {
  return new NextRequest("http://localhost/api/document-center/commitment/test-id/pdf", {
    method: "GET",
  });
}

async function callRoute() {
  const { GET } = await import("../route");
  return GET(makeRequest(), {
    params: Promise.resolve({ recordType: "commitment", recordId: "test-id" }),
  });
}

describe("document-center pdf route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDocumentBundle as jest.Mock).mockResolvedValue({
      recordType: "commitment",
      recordId: "test-id",
      filename: "commitment-test.pdf",
    });
    (renderDocumentHtml as jest.Mock).mockReturnValue("<html><head></head><body><main>Commitment</main></body></html>");
  });

  it("returns a PDF when server-side rendering succeeds", async () => {
    (renderPdfFromHtml as jest.Mock).mockResolvedValue(Buffer.from("fake-pdf"));

    const response = await callRoute();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("commitment-test.pdf");
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("returns a print-ready HTML fallback when PDF rendering fails", async () => {
    (renderPdfFromHtml as jest.Mock).mockRejectedValue(new Error("Puppeteer unavailable"));

    const response = await callRoute();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("x-alleato-pdf-fallback")).toBe("print-html");
    expect(body).toContain("window.print()");
    expect(body).toContain("Use your browser print dialog to save this document as a PDF.");
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: expect.stringContaining("PDF generation failed"),
        recordType: "commitment",
        recordId: "test-id",
      }),
    );
  });
});
