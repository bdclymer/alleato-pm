import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    projectId: string;
    changeOrderId: string;
    attachmentId: string;
  }>;
}

/**
 * GET /api/projects/[projectId]/change-orders/[changeOrderId]/attachments/[attachmentId]/download
 * Downloads an attachment file by redirecting to a signed URL
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeOrderId, attachmentId } = await params;
    const supabase = await createClient();

    // Verify change order exists and belongs to project
    const { data: changeOrder, error: coError } = await supabase
      .from("change_orders")
      .select("id, project_id")
      .eq("id", parseInt(changeOrderId, 10))
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (coError || !changeOrder) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    // Get attachment
    const { data: attachment, error } = await supabase
      .from("change_order_attachments")
      .select("id, file_path, file_name")
      .eq("change_order_id", parseInt(changeOrderId, 10))
      .eq("id", attachmentId)
      .single();

    if (error || !attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    // Generate signed URL for download (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("project-files")
      .createSignedUrl(attachment.file_path, 3600, {
        download: attachment.file_name,
      });

    if (urlError || !signedUrlData) {
      console.error("Failed to generate signed URL:", urlError);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 },
      );
    }

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrlData.signedUrl);
  } catch (error) {
    console.error("Error downloading attachment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
