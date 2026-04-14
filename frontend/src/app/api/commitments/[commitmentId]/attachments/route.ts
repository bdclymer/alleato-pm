import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ commitmentId: string }>;
}

type CommitmentRecord = {
  id: string;
  project_id: number;
  commitment_type: string | null;
};

// Update the real underlying commitment record because there is no typed `commitments` base table.
async function touchCommitmentRecord(
  supabase: ReturnType<typeof createServiceClient>,
  commitment: CommitmentRecord,
  userId: string,
): Promise<void> {
  const updatePayload = {
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };

  if (commitment.commitment_type === "subcontract") {
    await supabase.from("subcontracts").update(updatePayload).eq("id", commitment.id);
    return;
  }

  if (commitment.commitment_type === "purchase_order") {
    await supabase.from("purchase_orders").update(updatePayload).eq("id", commitment.id);
  }
}

function isCommitmentRecord(value: {
  id: string | null;
  project_id: number | null;
  commitment_type: string | null;
} | null): value is CommitmentRecord {
  return (
    value !== null &&
    typeof value.id === "string" &&
    typeof value.project_id === "number"
  );
}

// Validation schema for attachment upload
const createAttachmentSchema = z.object({
  fileName: z.string().max(255),
  filePath: z.string(),
  fileSize: z.number().positive(),
  mimeType: z.string().max(100),
});

/**
 * GET /api/commitments/[commitmentId]/attachments
 *
 * Returns all attachments for a commitment, ordered by upload date (newest first).
 * Uses the generic `attachments` table with attached_to_table="commitments".
 * Includes uploader information and generated download/self links.
 *
 * @route GET /api/commitments/[commitmentId]/attachments
 * @param {string} commitmentId - Commitment UUID
 *
 * @returns {object} 200 - {
 *     data: Array<{
 *       id, commitmentId, fileName, url, uploadedBy, uploadedAt,
 *       downloadUrl, _links: { self, download }
 *     }>,
 *     _links: { self, commitment }
 *   }
 * @returns {object} 404 - Commitment not found
 * @returns {object} 400 - Database query error
 * @returns {object} 500 - Internal server error
 */
export const GET = withApiGuardrails(
  "commitments/[commitmentId]/attachments#GET",
  async ({ request, params }) => {
  
    const { commitmentId } = await params;
    const supabase = await createClient();

    // Verify commitment exists and get project_id
    const { data: commitment, error: commitmentError } = await supabase
      .from("commitments_unified")
      .select("id, project_id, commitment_type")
      .eq("id", commitmentId)
      .is("deleted_at", null)
      .single();

    if (commitmentError || !commitment) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    if (!isCommitmentRecord(commitment)) {
      return NextResponse.json(
        { error: "Commitment metadata is incomplete" },
        { status: 500 },
      );
    }

    const attachmentTables =
      commitment.commitment_type === "subcontract"
        ? ["commitments", "subcontracts"]
        : commitment.commitment_type === "purchase_order"
          ? ["commitments", "purchase_orders"]
          : ["commitments"];

    // Get attachments using the generic attachments table
    const { data: attachments, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("attached_to_id", commitmentId)
      .in("attached_to_table", attachmentTables)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return apiErrorResponse(error);
    }

    // Format response
    const formattedAttachments = (attachments || []).map((attachment: {
      id: string;
      attached_to_id: string | null;
      file_name: string | null;
      url: string | null;
      uploaded_by: string | null;
      uploaded_at: string | null;
    }) => ({
      id: attachment.id,
      commitmentId: attachment.attached_to_id,
      fileName: attachment.file_name,
      url: attachment.url,
      uploadedBy: attachment.uploaded_by,
      uploadedAt: attachment.uploaded_at,
      downloadUrl: `/api/commitments/${commitmentId}/attachments/${attachment.id}/download`,
      _links: {
        self: `/api/commitments/${commitmentId}/attachments/${attachment.id}`,
        download: `/api/commitments/${commitmentId}/attachments/${attachment.id}/download`,
      },
    }));

    return NextResponse.json({
      data: formattedAttachments,
      _links: {
        self: `/api/commitments/${commitmentId}/attachments`,
        commitment: `/api/commitments/${commitmentId}`,
      },
    });
    },
);

/**
 * POST /api/commitments/[commitmentId]/attachments
 *
 * Uploads a new file attachment to a commitment. The file is stored in
 * Supabase Storage under `project-files/commitments/{projectId}/{commitmentId}/`.
 * A record is created in the generic `attachments` table.
 *
 * @route POST /api/commitments/[commitmentId]/attachments
 * @param {string} commitmentId - Commitment UUID
 *
 * @requestBody {FormData}
 *   - file {File} (required) - The file to upload
 *
 * @returns {object} 201 - Uploaded attachment details:
 *   { id, commitmentId, fileName, url, uploadedBy, uploadedAt,
 *     publicUrl, downloadUrl, _links }
 * @returns {object} 400 - No file provided, validation error, or upload/database error
 * @returns {object} 401 - Unauthorized (no user session)
 * @returns {object} 404 - Commitment not found
 * @returns {object} 500 - Internal server error
 *
 * @note On database insert failure, the uploaded storage file is cleaned up
 */
export const POST = withApiGuardrails(
  "commitments/[commitmentId]/attachments#POST",
  async ({ request, params }) => {
  
    const { commitmentId } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "commitments/[commitmentId]/attachments#POST", message: "Authentication required." });
    }

    // Verify commitment exists and get project_id
    const { data: commitment, error: commitmentError } = await serviceClient
      .from("commitments_unified")
      .select("id, project_id, commitment_type")
      .eq("id", commitmentId)
      .is("deleted_at", null)
      .single();

    if (commitmentError || !commitment) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    if (!isCommitmentRecord(commitment)) {
      return NextResponse.json(
        { error: "Commitment metadata is incomplete" },
        { status: 500 },
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

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
    const storagePath = `${commitment.project_id}/commitments/${commitmentId}/${fileName}`;

    const { error: uploadError } = await serviceClient.storage
      .from("project-files")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Could not upload file", details: uploadError.message },
        { status: 400 },
      );
    }

    // Get public URL for the file
    const {
      data: { publicUrl },
    } = serviceClient.storage.from("project-files").getPublicUrl(storagePath);

    // Create attachment record in generic attachments table
    const { data: attachment, error: dbError } = await serviceClient
      .from("attachments")
      .insert({
        attached_to_id: commitmentId,
        attached_to_table: "commitments",
        project_id: commitment.project_id,
        file_name: attachmentData.fileName,
        url: publicUrl,
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
          error: "Could not create attachment record",
          details: dbError.message,
        },
        { status: 400 },
      );
    }

    // Update commitment modification timestamp
    await touchCommitmentRecord(serviceClient, commitment, user.id);

    // Format response
    const response = {
      id: attachment.id,
      commitmentId: attachment.attached_to_id,
      fileName: attachment.file_name,
      url: attachment.url,
      uploadedBy: {
        id: user.id,
        email: user.email,
      },
      uploadedAt: attachment.uploaded_at,
      publicUrl,
      downloadUrl: `/api/commitments/${commitmentId}/attachments/${attachment.id}/download`,
      _links: {
        self: `/api/commitments/${commitmentId}/attachments/${attachment.id}`,
        download: `/api/commitments/${commitmentId}/attachments/${attachment.id}/download`,
        commitment: `/api/commitments/${commitmentId}`,
      },
    };

    return NextResponse.json(response, { status: 201 });
    },
);

/**
 * DELETE /api/commitments/[commitmentId]/attachments
 *
 * Bulk deletes multiple attachments from a commitment. Accepts an array of
 * attachment IDs in the request body. Deletes from both Supabase Storage and
 * the database. Updates the commitment's modification timestamp.
 *
 * @route DELETE /api/commitments/[commitmentId]/attachments
 * @param {string} commitmentId - Commitment UUID
 *
 * @requestBody {object}
 *   - attachmentIds {string[]} (required) - Array of attachment UUIDs to delete
 *
 * @returns {object} 200 - { message: "N attachment(s) deleted successfully" }
 * @returns {object} 400 - Missing/invalid attachmentIds array or database error
 * @returns {object} 401 - Unauthorized (no user session)
 * @returns {object} 404 - Commitment not found
 * @returns {object} 500 - Internal server error
 */
export const DELETE = withApiGuardrails(
  "commitments/[commitmentId]/attachments#DELETE",
  async ({ request, params }) => {
  
    const { commitmentId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "commitments/[commitmentId]/attachments#DELETE", message: "Authentication required." });
    }

    // Verify commitment exists
    const { data: commitment, error: commitmentError } = await supabase
      .from("commitments_unified")
      .select("id, project_id, commitment_type")
      .eq("id", commitmentId)
      .is("deleted_at", null)
      .single();

    if (commitmentError || !commitment) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    if (!isCommitmentRecord(commitment)) {
      return NextResponse.json(
        {
          error: "Commitment row is missing required fields (id or project_id)",
        },
        { status: 422 },
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
    const { data: attachments, error: fetchError } = await supabase
      .from("attachments")
      .select("id, url, file_name")
      .in("id", body.attachmentIds)
      .eq("attached_to_id", commitmentId)
      .eq("attached_to_table", "commitments");

    if (fetchError) {
      return NextResponse.json(
        { error: "Could not fetch attachments for deletion", details: fetchError.message },
        { status: 400 },
      );
    }

    // Delete from storage (extract path from URL)
    if (attachments && attachments.length > 0) {
      const filePaths = attachments
        .map((a) => {
          // Extract storage path from public URL
          if (!a.url) return null;
          const urlObj = new URL(a.url);
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
          return pathMatch ? pathMatch[1] : null;
        })
        .filter((path): path is string => path !== null);

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("project-files")
          .remove(filePaths);

        if (storageError) {
          }
      }
    }

    // Delete database records
    const { error: deleteError } = await supabase
      .from("attachments")
      .delete()
      .in("id", body.attachmentIds)
      .eq("attached_to_id", commitmentId)
      .eq("attached_to_table", "commitments");

    if (deleteError) {
      return NextResponse.json(
        { error: "Could not delete attachments", details: deleteError.message },
        { status: 400 },
      );
    }

    // Update commitment modification timestamp
    await touchCommitmentRecord(createServiceClient(), commitment, user.id);

    return NextResponse.json({
      message: `${attachments?.length || 0} attachment(s) deleted successfully`,
    });
    },
);
