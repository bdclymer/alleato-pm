import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";

type Params = { params: Promise<{ projectId: string; drawingId: string; pinId: string }> };

/**
 * DELETE /api/projects/[projectId]/drawings/[drawingId]/pins/[pinId]
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pinId } = await params;
  const service = createServiceClient();

  const { error } = await (service
    .from("drawing_markup_pins" as any)
    .delete()
    .eq("id", pinId)) as any;

  if (error) return apiErrorResponse(error);
  return NextResponse.json({ success: true });
}
