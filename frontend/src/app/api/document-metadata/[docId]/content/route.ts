import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const GET = withApiGuardrails<{ docId: string }>(
  "document-metadata/[docId]/content#GET",
  async ({ params }) => {
    const { docId } = params;

    if (!docId) {
      throw new GuardrailError({
        code: "INVALID_INPUT",
        where: "document-metadata/[docId]/content#GET",
        message: "Document metadata id is required.",
        status: 400,
      });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("document_metadata")
      .select("id, content")
      .eq("id", docId)
      .maybeSingle();

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "document-metadata/[docId]/content#GET",
        message: "Failed to load document content.",
        details: error.message,
        status: 500,
      });
    }

    if (!data) {
      throw new GuardrailError({
        code: "NOT_FOUND",
        where: "document-metadata/[docId]/content#GET",
        message: "Document metadata record was not found.",
        status: 404,
      });
    }

    return NextResponse.json({ id: data.id, content: data.content ?? null });
  },
);
