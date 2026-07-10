import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

const WHERE_PATCH = "projects/[projectId]/drawings/[drawingId]/annotations/[annotationId]#PATCH";
const WHERE_DELETE = "projects/[projectId]/drawings/[drawingId]/annotations/[annotationId]#DELETE";

/**
 * PATCH /api/projects/[projectId]/drawings/[drawingId]/annotations/[annotationId]
 * Update a drawn annotation. Currently supports toggling `is_published`
 * (personal → published). RLS restricts this to the annotation's author.
 */
export const PATCH = withApiGuardrails(WHERE_PATCH, async ({ request, params }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: WHERE_PATCH, message: "Authentication required." });
  }

  const { drawingId, annotationId } = await params;
  const body = await request.json();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drawing_annotations")
    .update({
      updated_at: new Date().toISOString(),
      ...(typeof body?.is_published === "boolean" ? { is_published: body.is_published } : {}),
      ...(body?.data != null && typeof body.data === "object" ? { data: body.data } : {}),
    })
    .eq("id", annotationId)
    // Scope to the URL's drawing for defense-in-depth (RLS still enforces ownership).
    .eq("drawing_id", drawingId)
    .select()
    .single();

  if (error) return apiErrorResponse(error);
  return NextResponse.json({ annotation: data });
});

/**
 * DELETE /api/projects/[projectId]/drawings/[drawingId]/annotations/[annotationId]
 * Remove a drawn annotation. RLS restricts deletion to the annotation's author.
 */
export const DELETE = withApiGuardrails(WHERE_DELETE, async ({ params }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: WHERE_DELETE, message: "Authentication required." });
  }

  const { drawingId, annotationId } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("drawing_annotations")
    .delete()
    .eq("id", annotationId)
    // Scope to the URL's drawing for defense-in-depth (RLS still enforces ownership).
    .eq("drawing_id", drawingId);

  if (error) return apiErrorResponse(error);
  return NextResponse.json({ success: true });
});
