import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";

type Params = { params: Promise<{ projectId: string; drawingId: string }> };

/**
 * GET /api/projects/[projectId]/drawings/[drawingId]/pins
 * List all markup pins for a drawing.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/drawings/[drawingId]/pins#GET",
  async ({ request, params }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/drawings/[drawingId]/pins#GET", message: "Authentication required." });

  const { drawingId } = await params;
  const service = createServiceClient();

  const { data, error } = await (service
    .from("drawing_markup_pins" as any)
    .select("*")
    .eq("drawing_id", drawingId)
    .order("created_at", { ascending: true }) as any);

  if (error) return apiErrorResponse(error);
  return NextResponse.json({ pins: data });
  },
);

/**
 * POST /api/projects/[projectId]/drawings/[drawingId]/pins
 * Create a new markup pin.
 * Body: { x_pct, y_pct, page, pin_type, entity_id?, entity_label?, entity_number?, entity_status?, color? }
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/drawings/[drawingId]/pins#POST",
  async ({ request, params }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/drawings/[drawingId]/pins#POST", message: "Authentication required." });

  const { projectId, drawingId } = await params;
  const body = await req.json();
  const service = createServiceClient();

  const { data, error } = await (service
    .from("drawing_markup_pins" as any)
    .insert({
      drawing_id: drawingId,
      project_id: Number(projectId),
      x_pct: body.x_pct,
      y_pct: body.y_pct,
      page: body.page ?? 1,
      pin_type: body.pin_type,
      entity_id: body.entity_id ?? null,
      entity_label: body.entity_label ?? null,
      entity_number: body.entity_number ?? null,
      entity_status: body.entity_status ?? null,
      color: body.color ?? null,
      created_by: user.id,
    })
    .select()
    .single()) as any;

  if (error) return apiErrorResponse(error);
  return NextResponse.json({ pin: data }, { status: 201 });
  },
);
