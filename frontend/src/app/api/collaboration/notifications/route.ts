import { NextResponse } from "next/server";
import { z } from "zod";

import { withApiGuardrails, parseJsonBody } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().datetime().optional(),
  kind: z.string().trim().min(1).max(80).optional(),
  projectId: z.coerce.number().int().positive().optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark-read"), id: z.string().uuid() }),
  z.object({ action: z.literal("mark-all-read") }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
  z.object({ action: z.literal("delete-all") }),
]);

export const GET = withApiGuardrails(
  "collaboration/notifications#GET",
  async ({ request }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "collaboration/notifications#GET",
        message: "Authentication required.",
      });
    }

    const parsed = querySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "collaboration/notifications#GET",
        details: parsed.error.issues,
      });
    }

    const { limit, cursor, kind, projectId, unreadOnly } = parsed.data;
    const supabase = await createClient();

    let query = supabase
      .from("collaboration_notifications")
      .select(
        "id, kind, title, body, metadata, created_at, read_at, entity_type, entity_id, project_id",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (kind) {
      query = query.eq("kind", kind);
    }

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "collaboration/notifications#GET",
        message: `Failed to load notifications: ${error.message}`,
        details: error,
      });
    }

    const hasMore = (data?.length ?? 0) > limit;
    const page = hasMore ? data!.slice(0, limit) : data ?? [];

    let unreadQuery = supabase
      .from("collaboration_notifications")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .is("read_at", null);

    if (kind) {
      unreadQuery = unreadQuery.eq("kind", kind);
    }

    if (projectId) {
      unreadQuery = unreadQuery.eq("project_id", projectId);
    }

    const { count: unreadCount, error: unreadError } = await unreadQuery;

    if (unreadError) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "collaboration/notifications#GET",
        message: `Failed to count unread notifications: ${unreadError.message}`,
        details: unreadError,
      });
    }

    return NextResponse.json({
      notifications: page.map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        metadata: row.metadata,
        createdAt: row.created_at,
        readAt: row.read_at,
        entityType: row.entity_type,
        entityId: row.entity_id,
        projectId: row.project_id,
      })),
      unreadCount: unreadCount ?? 0,
      hasMore,
    });
  },
);

export const PATCH = withApiGuardrails(
  "collaboration/notifications#PATCH",
  async ({ request }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "collaboration/notifications#PATCH",
        message: "Authentication required.",
      });
    }

    const payload = await parseJsonBody(
      request,
      patchSchema,
      "collaboration/notifications#PATCH",
    );

    const supabase = await createClient();

    if (payload.action === "mark-read") {
      const { error } = await supabase
        .from("collaboration_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", payload.id)
        .is("deleted_at", null);

      if (error) {
        throw new GuardrailError({
          code: "INTERNAL_ERROR",
          where: "collaboration/notifications#PATCH",
          message: `Failed to mark notification as read: ${error.message}`,
          details: error,
        });
      }

      return NextResponse.json({ success: true });
    }

    if (payload.action === "mark-all-read") {
      const { error } = await supabase
        .from("collaboration_notifications")
        .update({ read_at: new Date().toISOString() })
        .is("deleted_at", null)
        .is("read_at", null);

      if (error) {
        throw new GuardrailError({
          code: "INTERNAL_ERROR",
          where: "collaboration/notifications#PATCH",
          message: `Failed to mark all notifications as read: ${error.message}`,
          details: error,
        });
      }

      return NextResponse.json({ success: true });
    }

    if (payload.action === "delete") {
      const { error } = await supabase
        .from("collaboration_notifications")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", payload.id)
        .is("deleted_at", null);

      if (error) {
        throw new GuardrailError({
          code: "INTERNAL_ERROR",
          where: "collaboration/notifications#PATCH",
          message: `Failed to delete notification: ${error.message}`,
          details: error,
        });
      }

      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from("collaboration_notifications")
      .update({ deleted_at: new Date().toISOString() })
      .is("deleted_at", null);

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "collaboration/notifications#PATCH",
        message: `Failed to delete all notifications: ${error.message}`,
        details: error,
      });
    }

    return NextResponse.json({ success: true });
  },
);
