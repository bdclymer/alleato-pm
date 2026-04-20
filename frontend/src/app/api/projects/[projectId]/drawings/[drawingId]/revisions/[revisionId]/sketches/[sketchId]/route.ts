import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; drawingId: string; revisionId: string; sketchId: string }> }
) {
  const { projectId, revisionId, sketchId } = await params;
  const projectIdNum = Number(projectId);
  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find the sketch to get its file_url for cleanup
  const { data: sketch, error: findError } = await supabase
    .from("drawing_sketches")
    .select("id, file_url")
    .eq("id", sketchId)
    .eq("drawing_revision_id", revisionId)
    .single();

  if (findError || !sketch) {
    return NextResponse.json({ error: "Sketch not found" }, { status: 404 });
  }

  // Delete DB record first
  const { error: deleteError } = await supabase
    .from("drawing_sketches")
    .delete()
    .eq("id", sketchId)
    .eq("drawing_revision_id", revisionId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  // Attempt to remove from storage (best-effort, don't fail if missing)
  if (sketch.file_url) {
    const path = sketch.file_url.split("/project-files/")[1];
    if (path) {
      await supabase.storage.from("project-files").remove([path]);
    }
  }

  return new NextResponse(null, { status: 204 });
}
