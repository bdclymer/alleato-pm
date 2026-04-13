import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";

/**
 * Helper to verify admin access. Returns { supabase, user } or a Response.
 * OWASP A01:2021 - Broken Access Control: admin-only endpoint
 */
async function requireAdminAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/admin/company-knowledge#auth",
      message: "Unauthorized request.",
      status: 401,
    });
  }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) {
    throw new GuardrailError({
      code: "AUTH_FORBIDDEN",
      where: "/api/admin/company-knowledge#auth",
      message: "Admin access required.",
      status: 403,
    });
  }
  return { supabase, user };
}

const CompanyKnowledgeCreateSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  category: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).optional(),
  source: z.string().trim().min(1).nullable().optional(),
});

const CompanyKnowledgePatchSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  source: z.string().trim().min(1).nullable().optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/admin/company-knowledge
 * Fetch all knowledge articles (paginated).
 */
export const GET = withApiGuardrails("/api/admin/company-knowledge#GET", async ({ request }) => {
  const auth = await requireAdminAuth();
  const { supabase } = auth;

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search");

  let query = supabase
    .from("company_knowledge")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,content.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/admin/company-knowledge#GET",
      message: "Failed to load company knowledge.",
      details: { reason: error.message },
    });
  }

  return NextResponse.json({ data: data ?? [] });
});

/**
 * POST /api/admin/company-knowledge
 * Create a new knowledge article.
 */
export const POST = withApiGuardrails("/api/admin/company-knowledge#POST", async ({ request }) => {
  const auth = await requireAdminAuth();
  const { supabase, user } = auth;
  const body = await parseJsonBody(
    request,
    CompanyKnowledgeCreateSchema,
    "/api/admin/company-knowledge#POST",
  );

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
    })
    .select()
    .single();

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/admin/company-knowledge#POST",
      message: "Failed to create company knowledge record.",
      details: { reason: error.message },
    });
  }

  return NextResponse.json({ data });
});

/**
 * PATCH /api/admin/company-knowledge
 * Update an existing knowledge article (pass `id` in body).
 */
export const PATCH = withApiGuardrails("/api/admin/company-knowledge#PATCH", async ({ request }) => {
  const auth = await requireAdminAuth();
  const { supabase } = auth;

  const body = await parseJsonBody(
    request,
    CompanyKnowledgePatchSchema,
    "/api/admin/company-knowledge#PATCH",
  );
  const { id, ...updates } = body;

  const { data, error } = await supabase
    .from("company_knowledge")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/admin/company-knowledge#PATCH",
      message: "Failed to update company knowledge record.",
      details: { reason: error.message },
    });
  }

  return NextResponse.json({ data });
});

/**
 * DELETE /api/admin/company-knowledge
 * Soft-delete (deactivate) a knowledge article.
 */
export const DELETE = withApiGuardrails("/api/admin/company-knowledge#DELETE", async ({ request }) => {
  const auth = await requireAdminAuth();
  const { supabase } = auth;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where: "/api/admin/company-knowledge#DELETE",
      message: "Missing article id.",
      status: 400,
    });
  }

  const { error } = await supabase
    .from("company_knowledge")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/admin/company-knowledge#DELETE",
      message: "Failed to delete company knowledge record.",
      details: { reason: error.message },
    });
  }

  return NextResponse.json({ success: true });
});
