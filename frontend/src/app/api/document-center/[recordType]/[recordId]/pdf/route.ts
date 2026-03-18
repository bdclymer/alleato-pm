import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  getDocumentBundle,
  renderDocumentHtml,
  type DocumentRecordType,
} from "@/lib/documents/record-documents";
import { renderPdfFromHtml } from "@/lib/documents/pdf";

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

export async function GET(request: Request, { params }: RouteParams) {
  try {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate PDF",
      },
      { status: 500 },
    );
  }
}
