import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  getDocumentBundle,
  type DocumentRecordType,
} from "@/lib/documents/record-documents";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{
    recordType: string;
    recordId: string;
  }>;
}

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

    return NextResponse.json({
      defaultSubject: bundle.defaultSubject,
      filename: bundle.filename,
      recordLabel: bundle.label,
      recipients: bundle.recipients,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
