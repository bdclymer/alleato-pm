import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";

import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import {
  getDocumentBundle,
  renderDocumentHtml,
  type DocumentRecordType,
} from "@/lib/documents/record-documents";
import { renderPdfFromHtml } from "@/lib/documents/pdf";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{
    recordType: string;
    recordId: string;
  }>;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDocumentRecordType(value: string): value is DocumentRecordType {
  return (
    value === "prime-contract" ||
    value === "commitment" ||
    value === "change-order" ||
    value === "prime-contract-change-order"
  );
}

function buildPrintFallbackHtml(html: string): string {
  const printEnhancer = `
<style>
  @media screen {
    body::before {
      content: "Server PDF generation is unavailable. Use your browser print dialog to save this document as a PDF.";
      display: block;
      margin: 16px;
      padding: 12px 16px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      font: 14px/1.5 Arial, Helvetica, sans-serif;
    }
  }
</style>
<script>
  window.addEventListener("load", () => {
    window.setTimeout(() => window.print(), 150);
  });
</script>`;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${printEnhancer}</head>`);
  }

  return `${printEnhancer}${html}`;
}

export const GET = withApiGuardrails(
  "document-center/[recordType]/[recordId]/pdf#GET",
  async ({ request, params }) => {
  
    const { recordType, recordId } = await params;
    if (!isDocumentRecordType(recordType)) {
      return NextResponse.json({ error: "Unsupported record type" }, { status: 400 });
    }

    const supabase = await createClient();
    const user = await getApiRouteUser();

    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "document-center/[recordType]/[recordId]/pdf#GET", message: "Authentication required." });
    }

    const bundle = await getDocumentBundle(supabase, recordType, recordId);
    const html = renderDocumentHtml(bundle);
    try {
      const pdfBuffer = await renderPdfFromHtml(html);

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${bundle.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (pdfError) {
      logger.error({
        msg: "[document-center/pdf] PDF generation failed; returning print fallback",
        recordType,
        recordId,
        error: pdfError instanceof Error ? pdfError.message : String(pdfError),
      });

      return new NextResponse(buildPrintFallbackHtml(html), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${bundle.filename.replace(/\.pdf$/i, ".html")}"`,
          "Cache-Control": "no-store",
          "X-Alleato-Pdf-Fallback": "print-html",
        },
      });
    }
    },
);
