import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/projects/[projectId]/drawings/[drawingId]/download
 * Download the current revision of a drawing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; drawingId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { drawingId } = await params;
    const serviceClient = createServiceClient();

    // Get drawing with current revision
    const { data: drawing, error: drawingError } = await serviceClient
      .from("drawings")
      .select("*, current_revision:drawing_revisions!fk_drawings_current_revision(*)")
      .eq("id", drawingId)
      .single();

    if (drawingError || !drawing) {
      return NextResponse.json({ error: "Drawing not found" }, { status: 404 });
    }

    const revision = drawing.current_revision;
    if (!revision) {
      return NextResponse.json({ error: "No current revision found" }, { status: 404 });
    }

    // Get signed URL for file download
    const { data: signedUrlData, error: urlError } = await serviceClient.storage
      .from("drawings")
      .createSignedUrl(revision.file_url, 3600);

    if (urlError) {
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }

    // Log download for audit trail
    await serviceClient.from("drawing_downloads").insert({
      drawing_revision_id: revision.id,
      downloaded_by: user.id,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      user_agent: request.headers.get("user-agent") || null,
    });

    return NextResponse.json({
      downloadUrl: signedUrlData.signedUrl,
      fileName: revision.file_name,
      fileSize: revision.file_size,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Drawing download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
