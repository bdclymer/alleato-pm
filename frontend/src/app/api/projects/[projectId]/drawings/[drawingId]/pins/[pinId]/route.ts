import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";

type Params = { params: Promise<{ projectId: string; drawingId: string; pinId: string }> };

/**
 * DELETE /api/projects/[projectId]/drawings/[drawingId]/pins/[pinId]
 */
export const DELETE = withApiGuardrails(
  "projects/[projectId]/drawings/[drawingId]/pins/[pinId]#DELETE",
  async ({ request, params }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/drawings/[drawingId]/pins/[pinId]#DELETE", message: "Authentication required." });

  const { pinId } = await params;
  const service = createServiceClient();

  const { error } = await (service
    .from("drawing_markup_pins" as any)
    .delete()
    .eq("id", pinId)) as any;

  if (error) return apiErrorResponse(error);
  return NextResponse.json({ success: true });
  },
);
