import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { apiErrorResponse } from "@/lib/api-error";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

async function requireKnowledgeAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "knowledge/upload#POST",
      message: "Authentication required.",
    });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "knowledge/upload#POST",
      message: "Unable to verify company knowledge upload access.",
      cause: error.message,
    });
  }

  if (data?.is_admin !== true) {
    throw new GuardrailError({
      code: "AUTH_FORBIDDEN",
      where: "knowledge/upload#POST",
      message: "Admin access is required to upload company knowledge sources.",
    });
  }

  return { supabase, user };
}

export const POST = withApiGuardrails("knowledge/upload#POST", async ({ request }) => {
  const { supabase, user } = await requireKnowledgeAdmin();
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where: "knowledge/upload#POST",
      message: "Choose a file before uploading.",
    });
  }

  const allowedExtensions = [".pdf", ".docx", ".doc", ".txt", ".md", ".markdown"];
  const lowerName = file.name.toLowerCase();
  const extension = lowerName.includes(".")
    ? lowerName.slice(lowerName.lastIndexOf("."))
    : "";

  if (!allowedExtensions.includes(extension)) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where: "knowledge/upload#POST",
      message: `Unsupported file type: ${extension || "unknown"}. Allowed: ${allowedExtensions.join(", ")}`,
    });
  }

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where: "knowledge/upload#POST",
      message: "File too large. Maximum size is 50MB.",
    });
  }

  const title =
    (formData.get("title") as string | null)?.trim() ||
    file.name.replace(/\.[^/.]+$/, "");
  const category = (formData.get("category") as string | null) || "general";
  const visibility = (formData.get("visibility") as string | null) || "internal";
  const approvalStatus =
    (formData.get("approval_status") as string | null) || "draft";
  const aiSearchable = formData.get("ai_searchable") !== "false";
  const tags = ((formData.get("tags") as string | null) ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const metadataId = uuidv4();
  const storagePath = `company-knowledge/${metadataId}/${file.name}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    logger.error({ msg: "Company knowledge storage upload failed", data: uploadError });
    return apiErrorResponse(uploadError);
  }

  const { error: metadataError } = await supabase
    .from("document_metadata")
    .insert({
      id: metadataId,
      title,
      category: "company_knowledge",
      type: "document",
      source: "company_knowledge_upload",
      status: "uploaded",
      file_name: file.name,
      file_path: storagePath,
      storage_bucket: "documents",
      date: new Date().toISOString().split("T")[0],
      tags: tags.join(","),
      access_level: visibility,
    });

  if (metadataError) {
    await supabase.storage.from("documents").remove([storagePath]);
    logger.error({ msg: "Company knowledge metadata insert failed", data: metadataError });
    return apiErrorResponse(metadataError);
  }

  const readableContent =
    extension === ".txt" || extension === ".md" || extension === ".markdown"
      ? Buffer.from(fileBuffer).toString("utf8").slice(0, 12000)
      : `Uploaded document: ${file.name}. The source file has been stored and queued for ingestion.`;

  const { data, error: knowledgeError } = await supabase
    .from("company_knowledge")
    .insert({
      title,
      content: readableContent,
      category,
      tags,
      source: file.name,
      author_id: user.id,
      is_active: true,
      origin: "import",
      approval_status: approvalStatus,
      visibility,
      ai_searchable: aiSearchable,
      source_document_id: metadataId,
      approved_at: approvalStatus === "approved" ? new Date().toISOString() : null,
      approved_by: approvalStatus === "approved" ? user.id : null,
    })
    .select()
    .single();

  if (knowledgeError) {
    logger.error({ msg: "Company knowledge source insert failed", data: knowledgeError });
    return apiErrorResponse(knowledgeError);
  }

  return NextResponse.json({ data }, { status: 201 });
});
