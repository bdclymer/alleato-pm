import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

const WHERE_GET = "projects/[projectId]/drawings/[drawingId]/annotations#GET";
const WHERE_POST = "projects/[projectId]/drawings/[drawingId]/annotations#POST";

const ANNOTATION_TYPES = [
  "pen",
  "highlighter",
  "rectangle",
  "cloud",
  "arrow",
  "text",
] as const;
type AnnotationType = (typeof ANNOTATION_TYPES)[number];

function isAnnotationType(value: unknown): value is AnnotationType {
  return (
    typeof value === "string" &&
    (ANNOTATION_TYPES as readonly string[]).includes(value)
  );
}

/**
 * GET /api/projects/[projectId]/drawings/[drawingId]/annotations
 * List drawn markup for a drawing. RLS returns published markup plus the
 * caller's own personal (unpublished) markup.
 */
export const GET = withApiGuardrails(WHERE_GET, async ({ params }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: WHERE_GET, message: "Authentication required." });
  }

  const { drawingId } = await params;
  // User-scoped client so RLS (published OR own) is enforced.
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("drawing_annotations")
    .select("*")
    .eq("drawing_id", drawingId)
    .order("created_at", { ascending: true });

  if (error) return apiErrorResponse(error);
  return NextResponse.json({ annotations: data ?? [] });
});

/**
 * POST /api/projects/[projectId]/drawings/[drawingId]/annotations
 * Persist one drawn shape.
 * Body: { annotation_type, page?, data, is_published? }
 */
export const POST = withApiGuardrails(WHERE_POST, async ({ request, params }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: WHERE_POST, message: "Authentication required." });
  }

  const { projectId, drawingId } = await params;
  const body = await request.json();

  if (!isAnnotationType(body?.annotation_type)) {
    throw new GuardrailError({
      code: "VALIDATION",
      where: WHERE_POST,
      message: `annotation_type must be one of: ${ANNOTATION_TYPES.join(", ")}.`,
    });
  }
  if (body?.data == null || typeof body.data !== "object") {
    throw new GuardrailError({
      code: "VALIDATION",
      where: WHERE_POST,
      message: "data (the shape geometry) is required.",
    });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("drawing_annotations")
    .insert({
      drawing_id: drawingId,
      project_id: Number(projectId),
      page: Number.isFinite(body.page) ? Number(body.page) : 1,
      annotation_type: body.annotation_type,
      data: body.data,
      is_published: body.is_published === true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return apiErrorResponse(error);
  return NextResponse.json({ annotation: data }, { status: 201 });
});
