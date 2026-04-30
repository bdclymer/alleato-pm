export const dynamic = "force-dynamic";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
async function assertKnowledgeAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  where: string,
) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where,
      message: "Unable to verify knowledge management access.",
      cause: error.message,
    });
  }

  if (data?.is_admin !== true) {
    throw new GuardrailError({
      code: "AUTH_FORBIDDEN",
      where,
      message: "Admin access is required to manage knowledge sources.",
    });
  }
}

// ---------------------------------------------------------------------------
// GET /api/knowledge — list knowledge documents from document_metadata
// ---------------------------------------------------------------------------

export const GET = withApiGuardrails(
  "knowledge#GET",
  async ({ request }) => {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "knowledge#GET",
        message: "Authentication required.",
      });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const projectIdStr = url.searchParams.get("projectId");
    const manage = url.searchParams.get("manage") === "true";

    if (manage) {
      await assertKnowledgeAdmin(supabase, user.id, "knowledge#GET");
    }

    let query = supabase
      .from("document_metadata")
      .select("id, title, category, source, status, tags, date, file_name, file_path, project_id, created_at")
      .eq("category", "knowledge")
      .order("created_at", { ascending: false })
      .limit(200);

    // Public view: only show fully processed documents
    if (!manage) {
      query = query.in("status", ["embedded", "extracted", "complete"]);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,file_name.ilike.%${search}%,tags.ilike.%${search}%`);
    }

    if (projectIdStr) {
      const projectId = parseInt(projectIdStr, 10);
      if (Number.isNaN(projectId)) {
        throw new GuardrailError({
          code: "INVALID_PAYLOAD",
          where: "knowledge#GET",
          message: "Invalid projectId — must be a number.",
        });
      }
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;

    if (error) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "knowledge#GET",
        message: "Failed to load knowledge documents.",
        cause: error.message,
      });
    }

    return NextResponse.json({ data: data ?? [] });
  },
);

// ---------------------------------------------------------------------------
// DELETE /api/knowledge — hard-delete a knowledge document + storage cleanup
// ---------------------------------------------------------------------------

export const DELETE = withApiGuardrails(
  "knowledge#DELETE",
  async ({ request }) => {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "knowledge#DELETE",
        message: "Authentication required.",
      });
    }

    await assertKnowledgeAdmin(supabase, user.id, "knowledge#DELETE");

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "knowledge#DELETE",
        message: "Missing document id.",
      });
    }

    // Fetch storage path before deletion for cleanup
    const { data: doc, error: prefetchError } = await supabase
      .from("document_metadata")
      .select("file_path, storage_bucket")
      .eq("id", id)
      .eq("category", "knowledge")
      .maybeSingle();

    if (prefetchError) {
      logger.warn({
        msg: "Knowledge pre-delete storage-path fetch failed — cleanup will be skipped",
        data: { id, error: prefetchError.message },
      });
    }

    // Storage cleanup (log but don't fail if storage removal errors)
    if (doc?.file_path) {
      const bucket = doc.storage_bucket ?? "documents";
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([doc.file_path]);
      if (storageError) {
        logger.error({
          msg: "Knowledge storage removal failed — orphaned file",
          data: { path: doc.file_path, error: storageError.message },
        });
      }
    }

    // Delete the metadata row and check for 0-row silent no-ops
    const { data: deleted, error } = await supabase
      .from("document_metadata")
      .delete()
      .eq("id", id)
      .eq("category", "knowledge")
      .select("id");

    if (error) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "knowledge#DELETE",
        message: "Failed to delete knowledge document.",
        cause: error.message,
      });
    }

    if (!deleted || deleted.length === 0) {
      throw new GuardrailError({
        code: "NOT_FOUND",
        where: "knowledge#DELETE",
        message: "Knowledge document not found.",
        status: 404,
      });
    }

    return NextResponse.json({ success: true });
  },
);
