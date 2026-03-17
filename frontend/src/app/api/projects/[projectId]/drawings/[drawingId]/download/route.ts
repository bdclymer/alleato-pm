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

    // Extract storage path from the full URL
    // file_url format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    let downloadUrl = revision.file_url;
    try {
      const fileUrl = new URL(revision.file_url);
      const pathParts = fileUrl.pathname.split("/object/public/project-files/");
      if (pathParts.length === 2) {
        const storagePath = pathParts[1];
        const { data: signedUrlData, error: urlError } = await serviceClient.storage
          .from("project-files")
          .createSignedUrl(storagePath, 3600);
        if (!urlError && signedUrlData?.signedUrl) {
          downloadUrl = signedUrlData.signedUrl;
        }
      }
    } catch {
      // Fall back to public URL if signed URL creation fails
    }

    // Log download for audit trail (non-critical - swallow errors)
    try {
      await serviceClient.from("drawing_downloads").insert({
        drawing_revision_id: revision.id,
        downloaded_by: user.id,
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
        user_agent: request.headers.get("user-agent") || null,
      });
    } catch { /* non-critical */ }

    return NextResponse.json({
      downloadUrl,
      fileName: revision.file_name,
      fileSize: revision.file_size,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Drawing download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
