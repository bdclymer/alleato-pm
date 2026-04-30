import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { apiErrorResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Lazy OpenAI client for embeddings
// ---------------------------------------------------------------------------

let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-large",
    input: text.substring(0, 8000),
  });
  return response.data[0].embedding;
}

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
      message: "Unable to verify company knowledge management access.",
      cause: error.message,
    });
  }

  if (data?.is_admin !== true) {
    throw new GuardrailError({
      code: "AUTH_FORBIDDEN",
      where,
      message: "Admin access is required to manage company knowledge sources.",
    });
  }
}

// ---------------------------------------------------------------------------
// GET /api/knowledge — list knowledge articles
// ---------------------------------------------------------------------------

export const GET = withApiGuardrails(
  "knowledge#GET",
  async ({ request }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "knowledge#GET", message: "Authentication required." });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search");
  const projectId = url.searchParams.get("projectId");
  const origin = url.searchParams.get("origin");
  const tag = url.searchParams.get("tag");
  const manage = url.searchParams.get("manage") === "true";
  const approvalStatus = url.searchParams.get("approvalStatus");
  const visibility = url.searchParams.get("visibility");
  const aiSearchable = url.searchParams.get("aiSearchable");

  let query = supabase
    .from("company_knowledge")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (manage) {
    await assertKnowledgeAdmin(supabase, user.id, "knowledge#GET");
  } else {
    query = query
      .eq("approval_status", "approved")
      .neq("visibility", "admin_only");
  }

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,content.ilike.%${search}%`,
    );
  }

  if (projectId) {
    query = query.eq("project_id", parseInt(projectId));
  }

  if (origin && origin !== "all") {
    query = query.eq("origin", origin);
  }

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  if (approvalStatus && approvalStatus !== "all") {
    query = query.eq("approval_status", approvalStatus);
  }

  if (visibility && visibility !== "all") {
    query = query.eq("visibility", visibility);
  }

  if (aiSearchable === "true" || aiSearchable === "false") {
    query = query.eq("ai_searchable", aiSearchable === "true");
  }

  const { data, error } = await query;

  if (error) {
    return apiErrorResponse(error);
  }

  return NextResponse.json({ data: data ?? [] });
  },
);

// ---------------------------------------------------------------------------
// POST /api/knowledge — create a knowledge article + generate embedding
// ---------------------------------------------------------------------------

export const POST = withApiGuardrails(
  "knowledge#POST",
  async ({ request }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "knowledge#POST", message: "Authentication required." });
  }
  await assertKnowledgeAdmin(supabase, user.id, "knowledge#POST");

  const body = await request.json();

  // Generate embedding from title + content
  let embedding: number[] | null = null;
  const warnings: string[] = [];
  try {
    const embeddingText = `${body.title}\n\n${body.content}`;
    embedding = await generateEmbedding(embeddingText);
  } catch (err) {
    logger.error({ msg: "Failed to generate embedding for knowledge article", error: err instanceof Error ? err.message : String(err) });
    // Continue without embedding — can be backfilled later
    warnings.push("embedding_failed");
  }

  const { data, error } = await supabase
    .from("company_knowledge")
    .insert({
      title: body.title,
      content: body.content,
      category: body.category,
      tags: body.tags ?? [],
      source: body.source ?? null,
      author_id: user.id,
      is_active: true,
      project_id: body.project_id ?? null,
      meeting_id: body.meeting_id ?? null,
      origin: body.origin ?? "manual",
      approval_status: body.approval_status ?? "approved",
      visibility: body.visibility ?? "internal",
      ai_searchable: body.ai_searchable ?? true,
      source_document_id: body.source_document_id ?? null,
      approved_at:
        (body.approval_status ?? "approved") === "approved"
          ? new Date().toISOString()
          : null,
      approved_by:
        (body.approval_status ?? "approved") === "approved" ? user.id : null,
      ...(embedding ? { embedding: JSON.stringify(embedding) } : {}),
    })
    .select()
    .single();

  if (error) {
    return apiErrorResponse(error);
  }

  return NextResponse.json(
    { data, ...(warnings.length ? { warnings } : {}) },
    { status: 201 },
  );
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/knowledge — update a knowledge article + re-embed if content changed
// ---------------------------------------------------------------------------

export const PATCH = withApiGuardrails(
  "knowledge#PATCH",
  async ({ request }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "knowledge#PATCH", message: "Authentication required." });
  }
  await assertKnowledgeAdmin(supabase, user.id, "knowledge#PATCH");

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Missing article id" },
      { status: 400 },
    );
  }

  if (updates.approval_status === "approved") {
    updates.approved_at = new Date().toISOString();
    updates.approved_by = user.id;
  }

  // Re-generate embedding if title or content changed
  const patchWarnings: string[] = [];
  if (updates.title || updates.content) {
    try {
      // Fetch current article to merge fields
      const { data: existing } = await supabase
        .from("company_knowledge")
        .select("title, content")
        .eq("id", id)
        .single();

      if (existing) {
        const title = updates.title ?? existing.title;
        const content = updates.content ?? existing.content;
        const embedding = await generateEmbedding(`${title}\n\n${content}`);
        updates.embedding = JSON.stringify(embedding);
      }
    } catch (err) {
      logger.error({ msg: "Failed to re-generate embedding", error: err instanceof Error ? err.message : String(err) });
      patchWarnings.push("embedding_refresh_failed");
    }
  }

  const { data, error } = await supabase
    .from("company_knowledge")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return apiErrorResponse(error);
  }

  return NextResponse.json({ data, ...(patchWarnings.length ? { warnings: patchWarnings } : {}) });
  },
);

// ---------------------------------------------------------------------------
// DELETE /api/knowledge — soft-delete a knowledge article
// ---------------------------------------------------------------------------

export const DELETE = withApiGuardrails(
  "knowledge#DELETE",
  async ({ request }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "knowledge#DELETE", message: "Authentication required." });
  }
  await assertKnowledgeAdmin(supabase, user.id, "knowledge#DELETE");

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing article id" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("company_knowledge")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return apiErrorResponse(error);
  }

  return NextResponse.json({ success: true });
  },
);
