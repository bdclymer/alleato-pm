export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";

// GET /api/knowledge/signed-url?id=<documentId>
export const GET = withApiGuardrails(
  "knowledge/signed-url#GET",
  async ({ request }) => {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "knowledge/signed-url#GET",
        message: "Authentication required.",
      });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "knowledge/signed-url#GET",
        message: "Missing document id.",
      });
    }

    const { data: doc, error: fetchError } = await supabase
      .from("document_metadata")
      .select("file_path, storage_bucket")
      .eq("id", id)
      .eq("category", "knowledge")
      .maybeSingle();

    if (fetchError || !doc) {
      throw new GuardrailError({
        code: "NOT_FOUND",
        where: "knowledge/signed-url#GET",
        message: "Document not found.",
        status: 404,
      });
    }

    if (!doc.file_path) {
      throw new GuardrailError({
        code: "NOT_FOUND",
        where: "knowledge/signed-url#GET",
        message: "Document has no associated file.",
        status: 404,
      });
    }

    const bucket = doc.storage_bucket ?? "documents";
    const { data: signed, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(doc.file_path, 3600);

    if (signError || !signed?.signedUrl) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "knowledge/signed-url#GET",
        message: "Failed to generate document URL.",
        cause: signError?.message,
      });
    }

    return NextResponse.json({ url: signed.signedUrl });
  },
);
