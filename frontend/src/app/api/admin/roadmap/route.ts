import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createRoadmapItemSchema } from "@/lib/schemas/roadmap-schema";

const PHASE_ORDER = ["in_progress", "immediate", "high_priority", "future"] as const;

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

export const GET = withApiGuardrails("/api/admin/roadmap#GET", async () => {
  const user = await requireAdmin();
  if (!user) {
    throw new GuardrailError({ code: "FORBIDDEN", where: "/api/admin/roadmap#GET", message: "Admin access required.", status: 403 });
  }

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("roadmap_items")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/roadmap#GET", message: error.message });
  }

  // Sort by phase order, then sort_order within phase
  const sorted = (data ?? []).sort((a, b) => {
    const phaseA = PHASE_ORDER.indexOf(a.phase as typeof PHASE_ORDER[number]);
    const phaseB = PHASE_ORDER.indexOf(b.phase as typeof PHASE_ORDER[number]);
    if (phaseA !== phaseB) return phaseA - phaseB;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  return NextResponse.json({ items: sorted });
});

export const POST = withApiGuardrails("/api/admin/roadmap#POST", async ({ request }) => {
  const user = await requireAdmin();
  if (!user) {
    throw new GuardrailError({ code: "FORBIDDEN", where: "/api/admin/roadmap#POST", message: "Admin access required.", status: 403 });
  }

  const body = await request.json();
  const parsed = createRoadmapItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  // Set sort_order to end of phase by default
  const supa = createServiceClient();
  const { count } = await supa
    .from("roadmap_items")
    .select("*", { count: "exact", head: true })
    .eq("phase", parsed.data.phase);

  const { data, error } = await supa
    .from("roadmap_items")
    .insert({ ...parsed.data, sort_order: parsed.data.sort_order ?? (count ?? 0) })
    .select("*")
    .single();

  if (error) {
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/roadmap#POST", message: error.message });
  }

  return NextResponse.json({ item: data }, { status: 201 });
});
