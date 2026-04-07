import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteContext {
  params: Promise<{ 
    projectId: string; 
    drawingId: string; 
    revisionId: string; 
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { revisionId } = await context.params;
    
    // Get revision details
    const { data: revision, error } = await supabase
      .from('drawing_revisions')
      .select('*')
      .eq('id', revisionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Revision not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    // Get signed URL for file download
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('drawings')
      .createSignedUrl(revision.file_url, 3600); // 1 hour expiry

    if (urlError) {
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }

    // Log download for audit trail
    await supabase
      .from('drawing_downloads')
      .insert({
        drawing_revision_id: revisionId,
        downloaded_by: user.id,
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
        user_agent: request.headers.get('user-agent') || null,
      });

    return NextResponse.json({
      downloadUrl: signedUrlData.signedUrl,
      fileName: revision.file_name,
      fileSize: revision.file_size,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

  } catch (error) {
    return apiErrorResponse(error);
  }
}
