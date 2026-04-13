import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  getDocumentBundle,
  renderDocumentHtml,
  type DocumentRecordType,
} from "@/lib/documents/record-documents";
import { renderPdfFromHtml } from "@/lib/documents/pdf";
import { apiErrorResponse } from "@/lib/api-error";

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

export const GET = withApiGuardrails(
  "document-center/[recordType]/[recordId]/pdf#GET",
  async ({ request, params }) => {
  
    const { recordType, recordId } = await params;
    if (!isDocumentRecordType(recordType)) {
      return NextResponse.json({ error: "Unsupported record type" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "document-center/[recordType]/[recordId]/pdf#GET", message: "Authentication required." });
    }

    const bundle = await getDocumentBundle(supabase, recordType, recordId);
    const html = renderDocumentHtml(bundle);
    const pdfBuffer = await renderPdfFromHtml(html);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${bundle.filename}"`,
        "Cache-Control": "no-store",
      },
    });
    },
);
