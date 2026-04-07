import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { createAttachmentSchema } from "../../validation";
import { ZodError } from "zod";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string; changeEventId: string }>;
}

/**
 * GET /api/projects/[id]/change-events/[changeEventId]/attachments
 * Returns all attachments for a change event
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeEventId } = await params;
    const serviceClient = createServiceClient();

    // Verify change event exists
    const { data: changeEvent, error: eventError } = await serviceClient
      .from("change_events")
      .select("id")
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", changeEventId)
      .is("deleted_at", null)
      .single();

    if (eventError || !changeEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 },
      );
    }

    // Get attachments (service client bypasses RLS on change_event_attachments)
    const { data: attachments, error } = await serviceClient
      .from("change_event_attachments")
      .select("*")
      .eq("change_event_id", changeEventId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return apiErrorResponse(error);
    }

    // Format response
    const formattedAttachments = (attachments || []).map((attachment) => ({
      id: attachment.id,
      changeEventId: attachment.change_event_id,
      fileName: attachment.file_name,
      filePath: attachment.file_path,
      fileSize: attachment.file_size,
      mimeType: attachment.mime_type,
      uploadedBy: attachment.uploaded_by,
      uploadedAt: attachment.uploaded_at,
      downloadUrl: `/api/projects/${projectId}/change-events/${changeEventId}/attachments/${attachment.id}/download`,
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}/attachments/${attachment.id}`,
        download: `/api/projects/${projectId}/change-events/${changeEventId}/attachments/${attachment.id}/download`,
      },
    }));

    return NextResponse.json({
      data: formattedAttachments,
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}/attachments`,
        changeEvent: `/api/projects/${projectId}/change-events/${changeEventId}`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/projects/[id]/change-events/[changeEventId]/attachments
 * Uploads a new attachment to a change event
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeEventId } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify change event exists
    const { data: changeEvent, error: eventError } = await supabase
      .from("change_events")
      .select("id, number")
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", changeEventId)
      .is("deleted_at", null)
      .single();

    if (eventError || !changeEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 },
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    // Accept both 'file' and 'files' field names for compatibility
    const file = (formData.get("file") || formData.get("files")) as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file metadata
    const attachmentData = createAttachmentSchema.parse({
      fileName: file.name,
      filePath: "", // Will be set after upload
      fileSize: file.size,
      mimeType: file.type,
    });

    // Upload file to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `${projectId}/change-events/${changeEventId}/${fileName}`;

    const fileBuffer = await file.arrayBuffer();
    const contentType = file.type?.trim() || "application/octet-stream";
    const { error: uploadError } = await serviceClient.storage
      .from("project-files")
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 400 },
      );
    }

    // Create attachment record (service client bypasses RLS)
    const { data: attachment, error: dbError } = await serviceClient
      .from("change_event_attachments")
      .insert({
        change_event_id: changeEventId,
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
      // Clean up uploaded file
      await serviceClient.storage.from("project-files").remove([storagePath]);

      return NextResponse.json(
        {
          error: "Failed to create attachment record",
          details: dbError.message,
        },
        { status: 400 },
      );
    }

    // Update change event modification timestamp
    await serviceClient
      .from("change_events")
      .update({
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", changeEventId);

    // Create audit log entry
    await serviceClient.from("change_event_history").insert({
      change_event_id: changeEventId,
      field_name: "attachment_added",
      new_value: attachmentData.fileName,
      changed_by: user.id,
      change_type: "UPDATE",
    });

    // Get public URL for the file
    const {
      data: { publicUrl },
    } = serviceClient.storage.from("project-files").getPublicUrl(storagePath);

    // Format response
    const response = {
      id: attachment.id,
      changeEventId: attachment.change_event_id,
      fileName: attachment.file_name,
      filePath: attachment.file_path,
      fileSize: attachment.file_size,
      mimeType: attachment.mime_type,
      uploadedBy: {
        id: user.id,
        email: user.email,
      },
      uploadedAt: attachment.uploaded_at,
      publicUrl,
      downloadUrl: `/api/projects/${projectId}/change-events/${changeEventId}/attachments/${attachment.id}/download`,
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}/attachments/${attachment.id}`,
        download: `/api/projects/${projectId}/change-events/${changeEventId}/attachments/${attachment.id}/download`,
        changeEvent: `/api/projects/${projectId}/change-events/${changeEventId}`,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
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

    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/[id]/change-events/[changeEventId]/attachments
 * Deletes multiple attachments (bulk delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeEventId } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify change event exists
    const { data: changeEvent, error: eventError } = await serviceClient
      .from("change_events")
      .select("id")
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", changeEventId)
      .is("deleted_at", null)
      .single();

    if (eventError || !changeEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 },
      );
    }

    // Expect array of attachment IDs
    if (!Array.isArray(body.attachmentIds)) {
      return NextResponse.json(
        { error: "Request body must contain an array of attachment IDs" },
        { status: 400 },
      );
    }

    // Get attachment details before deletion
    const { data: attachments, error: fetchError } = await serviceClient
      .from("change_event_attachments")
      .select("id, file_path, file_name")
      .in("id", body.attachmentIds)
      .eq("change_event_id", changeEventId);

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch attachments", details: fetchError.message },
        { status: 400 },
      );
    }

    // Delete from storage
    const filePaths = (attachments || []).map((a) => a.file_path);
    if (filePaths.length > 0) {
      const { error: storageError } = await serviceClient.storage
        .from("project-files")
        .remove(filePaths);

      if (storageError) {
        console.error("Storage cleanup error:", storageError.message);
      }
    }

    // Delete database records
    const { error: deleteError } = await serviceClient
      .from("change_event_attachments")
      .delete()
      .in("id", body.attachmentIds)
      .eq("change_event_id", changeEventId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete attachments", details: deleteError.message },
        { status: 400 },
      );
    }

    // Update change event modification timestamp
    await serviceClient
      .from("change_events")
      .update({
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", changeEventId);

    // Create audit log entries
    const auditEntries = (attachments || []).map((attachment) => ({
      change_event_id: changeEventId,
      field_name: "attachment_removed",
      old_value: attachment.file_name,
      changed_by: user.id,
      change_type: "UPDATE",
    }));

    if (auditEntries.length > 0) {
      await serviceClient.from("change_event_history").insert(auditEntries);
    }

    return NextResponse.json({
      message: `${attachments?.length || 0} attachment(s) deleted successfully`,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
