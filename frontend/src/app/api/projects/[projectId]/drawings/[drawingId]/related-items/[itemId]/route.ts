import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; drawingId: string; itemId: string }> }
) {
  const { projectId, drawingId, itemId } = await params;
  const projectIdNum = Number(projectId);
  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify item exists and belongs to this drawing
  const { data: item, error: findError } = await supabase
    .from("drawing_related_items")
    .select("id")
    .eq("id", itemId)
    .eq("drawing_id", drawingId)
    .single();

  if (findError || !item) {
    return NextResponse.json({ error: "Related item not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("drawing_related_items")
    .delete()
    .eq("id", itemId)
    .eq("drawing_id", drawingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
