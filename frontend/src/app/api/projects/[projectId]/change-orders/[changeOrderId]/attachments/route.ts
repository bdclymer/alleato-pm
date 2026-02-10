import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for attachment metadata
const createAttachmentSchema = z.object({
  fileName: z.string().max(255),
  filePath: z.string(),
  fileSize: z.number().positive().max(52428800), // Max 50MB
  mimeType: z.string().max(100),
});

interface RouteParams {
  params: Promise<{ projectId: string; changeOrderId: string }>;
}

/**
 * GET /api/projects/[projectId]/change-orders/[changeOrderId]/attachments
 * Returns all attachments for a change order
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeOrderId } = await params;
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

    // Get attachments
    const { data: attachments, error } = await supabase
      .from("change_order_attachments")
      .select(
        `
        *,
        uploader:uploaded_by(id, email)
      `,
      )
      .eq("change_order_id", parseInt(changeOrderId, 10))
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch attachments", details: error.message },
        { status: 400 },
      );
    }

    // Format response with camelCase
    const formattedAttachments = (attachments || []).map((attachment) => ({
      id: attachment.id,
      changeOrderId: attachment.change_order_id,
      fileName: attachment.file_name,
      filePath: attachment.file_path,
      fileSize: attachment.file_size,
      mimeType: attachment.mime_type,
      uploadedBy: attachment.uploader,
      uploadedAt: attachment.uploaded_at,
      _links: {
        self: `/api/projects/${projectId}/change-orders/${changeOrderId}/attachments/${attachment.id}`,
        download: `/api/projects/${projectId}/change-orders/${changeOrderId}/attachments/${attachment.id}/download`,
      },
    }));

    return NextResponse.json({
      data: formattedAttachments,
      count: formattedAttachments.length,
      _links: {
        self: `/api/projects/${projectId}/change-orders/${changeOrderId}/attachments`,
        changeOrder: `/api/projects/${projectId}/change-orders/${changeOrderId}`,
      },
    });
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/projects/[projectId]/change-orders/[changeOrderId]/attachments
 * Uploads a new attachment to a change order
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeOrderId } = await params;
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
      .select("id, project_id, co_number")
      .eq("id", parseInt(changeOrderId, 10))
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (coError || !changeOrder) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = (formData.get("file") || formData.get("files")) as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file metadata
    const attachmentData = createAttachmentSchema.parse({
      fileName: file.name,
      filePath: "", // Will be set after upload
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
    });

    // Upload file to Supabase Storage
    const fileExt = file.name.split(".").pop() || "bin";
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}_${randomStr}.${fileExt}`;
    const storagePath = `change-orders/${projectId}/${changeOrderId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("project-files")
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 400 },
      );
    }

    // Create attachment record
    const { data: attachment, error: dbError } = await supabase
      .from("change_order_attachments")
      .insert({
        change_order_id: parseInt(changeOrderId, 10),
        file_name: attachmentData.fileName,
        file_path: storagePath,
        file_size: attachmentData.fileSize,
        mime_type: attachmentData.mimeType,
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Clean up uploaded file
      await supabase.storage.from("project-files").remove([storagePath]);

      return NextResponse.json(
        {
          error: "Failed to create attachment record",
          details: dbError.message,
        },
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

    // Get signed URL for the file (valid for 1 hour)
    const { data: signedUrlData } = await supabase.storage
      .from("project-files")
      .createSignedUrl(storagePath, 3600);

    // Format response
    const response = {
      id: attachment.id,
      changeOrderId: attachment.change_order_id,
      fileName: attachment.file_name,
      filePath: attachment.file_path,
      fileSize: attachment.file_size,
      mimeType: attachment.mime_type,
      uploadedBy: {
        id: user.id,
        email: user.email,
      },
      uploadedAt: attachment.uploaded_at,
      downloadUrl: signedUrlData?.signedUrl || null,
      _links: {
        self: `/api/projects/${projectId}/change-orders/${changeOrderId}/attachments/${attachment.id}`,
        download: `/api/projects/${projectId}/change-orders/${changeOrderId}/attachments/${attachment.id}/download`,
        changeOrder: `/api/projects/${projectId}/change-orders/${changeOrderId}`,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    console.error("Error uploading attachment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
