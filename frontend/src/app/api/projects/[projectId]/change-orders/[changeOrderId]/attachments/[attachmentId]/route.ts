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
 * GET /api/projects/[projectId]/change-orders/[changeOrderId]/attachments/[attachmentId]
 * Returns a single attachment metadata or downloads it with ?download=true
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeOrderId, attachmentId } = await params;
    const supabase = await createClient();

    // Check if this is a download request
    const url = new URL(request.url);
    const isDownload = url.pathname.endsWith("/download") || url.searchParams.get("download") === "true";

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
      .select(
        `
        *,
        uploader:uploaded_by(id, email)
      `,
      )
      .eq("change_order_id", parseInt(changeOrderId, 10))
      .eq("id", attachmentId)
      .single();

    if (error || !attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    // If download requested, get signed URL and redirect
    if (isDownload) {
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from("project-files")
        .createSignedUrl(attachment.file_path, 3600, {
          download: attachment.file_name,
        });

      if (urlError || !signedUrlData) {
        return NextResponse.json(
          { error: "Failed to generate download URL" },
          { status: 500 },
        );
      }

      // Redirect to signed URL for download
      return NextResponse.redirect(signedUrlData.signedUrl);
    }

    // Return metadata only
    const response = {
      id: attachment.id,
      changeOrderId: attachment.change_order_id,
      fileName: attachment.file_name,
      filePath: attachment.file_path,
      fileSize: attachment.file_size,
      mimeType: attachment.mime_type,
      uploadedBy: attachment.uploader,
      uploadedAt: attachment.uploaded_at,
      _links: {
        self: `/api/projects/${projectId}/change-orders/${changeOrderId}/attachments/${attachmentId}`,
        download: `/api/projects/${projectId}/change-orders/${changeOrderId}/attachments/${attachmentId}/download`,
        changeOrder: `/api/projects/${projectId}/change-orders/${changeOrderId}`,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching attachment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/change-orders/[changeOrderId]/attachments/[attachmentId]
 * Deletes a single attachment
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeOrderId, attachmentId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Get attachment details before deletion
    const { data: attachment, error: fetchError } = await supabase
      .from("change_order_attachments")
      .select("id, file_path, file_name, uploaded_by")
      .eq("change_order_id", parseInt(changeOrderId, 10))
      .eq("id", attachmentId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    // Delete from storage (ignore errors if file doesn't exist)
    await supabase.storage.from("project-files").remove([attachment.file_path]);

    // Delete database record
    const { error: deleteError } = await supabase
      .from("change_order_attachments")
      .delete()
      .eq("id", attachmentId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete attachment", details: deleteError.message },
        { status: 400 },
      );
    }

    // Update change order modification timestamp
    await supabase
      .from("change_orders")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(changeOrderId, 10));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
