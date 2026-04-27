import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateRoadmapItemSchema } from "@/lib/schemas/roadmap-schema";

async function requireAdmin() {
  const user = await getApiRouteUser();
  if (!user) return null;
  const supa = createServiceClient();
  const { data } = await supa
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return data?.is_admin ? user : null;
}

export const PATCH = withApiGuardrails<{ roadmapItemId: string }>(
  "/api/admin/roadmap/[roadmapItemId]#PATCH",
  async ({ request, params }) => {
    const user = await requireAdmin();
    if (!user) {
      throw new GuardrailError({ code: "FORBIDDEN", where: "/api/admin/roadmap#PATCH", message: "Admin access required.", status: 403 });
    }

    const { roadmapItemId } = params;
    const body = await request.json();
    const parsed = updateRoadmapItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const supa = createServiceClient();
    const { data, error } = await supa
      .from("roadmap_items")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", roadmapItemId)
      .select("*")
      .single();

    if (error) {
      throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/roadmap#PATCH", message: error.message });
    }

    return NextResponse.json({ item: data });
  }
);

export const DELETE = withApiGuardrails<{ roadmapItemId: string }>(
  "/api/admin/roadmap/[roadmapItemId]#DELETE",
  async ({ params }) => {
    const user = await requireAdmin();
    if (!user) {
      throw new GuardrailError({ code: "FORBIDDEN", where: "/api/admin/roadmap#DELETE", message: "Admin access required.", status: 403 });
    }

    const { roadmapItemId } = params;
    const supa = createServiceClient();
    const { error } = await supa
      .from("roadmap_items")
      .delete()
      .eq("id", roadmapItemId);

    if (error) {
      throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/roadmap#DELETE", message: error.message });
    }

    return NextResponse.json({ deleted: true });
  }
);
