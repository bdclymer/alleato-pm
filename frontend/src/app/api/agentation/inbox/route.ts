import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function jsonError(status: number, payload: { error: string; details?: string }) {
  return NextResponse.json(payload, { status });
}

/**
 * GET /api/agentation/inbox
 *
 * Returns dev_annotations rows shaped to match the FeedbackItem type used
 * by the annotation-inbox page. This keeps the page's existing UI working
 * while the underlying data comes from the dev pipeline, not client feedback.
 */
export async function GET(request: Request) {
  try {
    const user = await getApiRouteUser();
    if (!user) {
      return jsonError(401, { error: "Authentication required" });
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
      return jsonError(500, { error: "Failed to load annotations", details: error.message });
    }

    // Shape dev_annotations rows into the FeedbackItem format the inbox page expects.
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
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return jsonError(500, { error: "Failed to load annotations", details });
  }
}

/**
 * PATCH /api/agentation/inbox
 *
 * Updates a dev_annotations row — status and/or metadata.
 * Used by the annotation-inbox page for triage actions.
 *
 * Body: { id: string, status?: string, metadata?: Record<string, unknown> }
 */
export async function PATCH(request: Request) {
  try {
    const user = await getApiRouteUser();
    if (!user) {
      return jsonError(401, { error: "Authentication required" });
    }

    const body = await request.json() as { id?: string; status?: string; metadata?: Record<string, unknown> };
    const { id, status, metadata } = body;

    if (!id) {
      return jsonError(400, { error: "id is required" });
    }

    const supabase = createServiceClient();

    // Fetch existing row to merge metadata
    const { data: existing, error: fetchError } = await supabase
      .from("dev_annotations")
      .select("id, status, metadata")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return jsonError(500, { error: "Failed to fetch annotation", details: fetchError.message });
    }
    if (!existing) {
      return jsonError(404, { error: "Annotation not found" });
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
      return jsonError(500, { error: "Failed to update annotation", details: updateError.message });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return jsonError(500, { error: "Failed to update annotation", details });
  }
}
