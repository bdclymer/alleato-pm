import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";


/**
 * GET /api/agentation/inbox
 *
 * Returns dev_annotations rows shaped to match the FeedbackItem type used
 * by the annotation-inbox page. This keeps the page's existing UI working
 * while the underlying data comes from the dev pipeline, not client feedback.
 */
export const GET = withApiGuardrails("/api/agentation/inbox#GET", async ({ request }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "/api/agentation/inbox#GET", message: "Authentication required.", status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number.parseInt(url.searchParams.get("limit") || "500", 10);
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 1000)) : 500;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("dev_annotations")
    .select("id, created_at, route, comment, screenshot_url, element_selector, component_hint, status, ai_reply, ai_replied_at, resolved_at, agentation_id, metadata")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/agentation/inbox#GET", message: error.message });
  }

  const items = (data ?? []).map((row) => {
    const meta = (row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata))
      ? row.metadata as Record<string, unknown>
      : {};

    const pageUrl = typeof meta.pageUrl === "string" ? meta.pageUrl : "";
    const severity = typeof meta.severity === "string"
      ? (meta.severity === "blocking" ? "high" : meta.severity === "important" ? "medium" : "low")
      : "medium";

    return {
      id: row.id,
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: row.ai_replied_at ?? row.resolved_at ?? row.created_at ?? new Date().toISOString(),
      title: row.comment.slice(0, 100),
      comment: row.comment,
      page_url: pageUrl,
      page_path: row.route,
      severity,
      status: row.status ?? "open",
      target_selector: row.element_selector ?? row.component_hint ?? "body",
      metadata: {
        ...meta,
        agentationId: row.agentation_id ?? meta.agentationId ?? null,
        componentHint: row.component_hint ?? null,
        screenshotUrl: row.screenshot_url ?? null,
        aiReply: row.ai_reply ?? null,
      },
    };
  });

  return NextResponse.json({ items, total: items.length });
});

/**
 * PATCH /api/agentation/inbox
 *
 * Updates a dev_annotations row — status and/or metadata.
 * Used by the annotation-inbox page for triage actions.
 *
 * Body: { id: string, status?: string, metadata?: Record<string, unknown> }
 */
export const PATCH = withApiGuardrails("/api/agentation/inbox#PATCH", async ({ request }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "/api/agentation/inbox#PATCH", message: "Authentication required.", status: 401 });
  }

  const body = await request.json() as { id?: string; status?: string; metadata?: Record<string, unknown> };
  const { id, status, metadata } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: existing, error: fetchError } = await supabase
    .from("dev_annotations")
    .select("id, status, metadata")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/agentation/inbox#PATCH", message: fetchError.message });
  }
  if (!existing) {
    return NextResponse.json({ error: "Annotation not found" }, { status: 404 });
  }

  const existingMeta =
    existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};

  const updates: Record<string, unknown> = {};

  if (status) {
    const validStatuses = ["open", "in_progress", "replied", "resolved"];
    updates.status = validStatuses.includes(status) ? status : "in_progress";
    if (updates.status === "resolved") {
      updates.resolved_at = new Date().toISOString();
    }
  }

  if (metadata) {
    updates.metadata = { ...existingMeta, ...metadata };
  }

  const { error: updateError } = await supabase
    .from("dev_annotations")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/agentation/inbox#PATCH", message: updateError.message });
  }

  return NextResponse.json({ success: true, id });
});
