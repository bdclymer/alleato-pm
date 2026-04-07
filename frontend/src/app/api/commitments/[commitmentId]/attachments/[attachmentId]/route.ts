import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/commitments/[commitmentId]/attachments/[attachmentId]
 *
 * Retrieves metadata for a specific attachment belonging to a commitment.
 * Verifies the attachment belongs to the commitment (attached_to_id and
 * attached_to_table checks).
 *
 * @route GET /api/commitments/[commitmentId]/attachments/[attachmentId]
 * @param {string} commitmentId - Commitment UUID
 * @param {string} attachmentId - Attachment UUID
 *
 * @returns {object} 200 - { data: { id, file_name, url, uploaded_at, uploaded_by } }
 * @returns {object} 404 - Attachment not found
 * @returns {object} 500 - Internal server error
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ commitmentId: string; attachmentId: string }> },
) {
  try {
    const { commitmentId, attachmentId } = await params;
    const supabase = await createClient();

    // Get attachment metadata
    const { data: attachment, error } = await supabase
      .from("attachments")
      .select("id, file_name, url, uploaded_at, uploaded_by")
      .eq("id", attachmentId)
      .eq("attached_to_id", commitmentId)
      .eq("attached_to_table", "commitments")
      .single();

    if (error || !attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: attachment });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/commitments/[commitmentId]/attachments/[attachmentId]
 *
 * Deletes a specific attachment from a commitment. Performs two-step deletion:
 * 1. Removes the file from Supabase Storage (non-blocking on failure)
 * 2. Deletes the attachment record from the database
 *
 * @route DELETE /api/commitments/[commitmentId]/attachments/[attachmentId]
 * @param {string} commitmentId - Commitment UUID
 * @param {string} attachmentId - Attachment UUID
 *
 * @returns {object} 200 - { message: "Attachment deleted successfully" }
 * @returns {object} 401 - Unauthorized (no user session)
 * @returns {object} 404 - Attachment not found
 * @returns {object} 400 - Database deletion error
 * @returns {object} 500 - Internal server error
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ commitmentId: string; attachmentId: string }> },
) {
  try {
    const { commitmentId, attachmentId } = await params;
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get attachment info first to delete from storage
    const { data: attachment, error: fetchError } = await supabase
      .from("attachments")
      .select("url, file_name")
      .eq("id", attachmentId)
      .eq("attached_to_id", commitmentId)
      .eq("attached_to_table", "commitments")
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    // Extract file path from URL for storage deletion
    // URL format: https://<project>.supabase.co/storage/v1/object/public/attachments/<path>
    const urlParts = attachment.url?.split("/attachments/");
    const filePath = urlParts && urlParts.length > 1 ? urlParts[1] : null;

    // Delete from storage if path exists
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from("attachments")
        .remove([filePath]);

      if (storageError) {
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("attachments")
      .delete()
      .eq("id", attachmentId)
      .eq("attached_to_id", commitmentId)
      .eq("attached_to_table", "commitments");

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Attachment deleted successfully" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
