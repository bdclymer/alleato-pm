import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string }>;
}

const isMissingJoinTableError = (error: { code?: string; message?: string } | null) =>
  !!error &&
  (error.code === "PGRST205" ||
    error.message?.includes("Could not find the table 'public.prime_contract_attachments'"));

const createAttachmentSchema = z.object({
  fileName: z.string().max(255),
  filePath: z.string(),
  fileSize: z.number().positive(),
  mimeType: z.string().max(100),
});

/**
 * GET /api/projects/[id]/contracts/[contractId]/attachments
 * Returns all attachments for a prime contract
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: contract } = await supabase
      .from("prime_contracts")
      .select("id, project_id")
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    const { data: linkRows, error: linkError } = await serviceClient
      .from("prime_contract_attachments")
      .select("attachment_id")
      .eq("contract_id", contractId);

    if (linkError && !isMissingJoinTableError(linkError)) {
      return NextResponse.json(
        { error: "Failed to fetch attachment links", details: linkError.message },
        { status: 400 },
      );
    }

    const linkedAttachmentIds = (linkRows ?? []).map((row) => row.attachment_id);

    let attachments: Array<{
      id: string;
      attached_to_id: string | null;
      file_name: string | null;
      url: string | null;
      uploaded_at: string | null;
    }> = [];

    if (linkedAttachmentIds.length > 0) {
      const { data: mappedAttachments, error: mappedAttachmentsError } = await serviceClient
        .from("attachments")
        .select("id, attached_to_id, file_name, url, uploaded_at")
        .in("id", linkedAttachmentIds)
        .order("uploaded_at", { ascending: false });

      if (mappedAttachmentsError) {
        return NextResponse.json(
          {
            error: "Failed to fetch mapped attachments",
            details: mappedAttachmentsError.message,
          },
          { status: 400 },
        );
      }

      attachments = mappedAttachments ?? [];
    } else {
      // Temporary fallback while environments are being migrated.
      const { data: legacyAttachments, error: legacyError } = await serviceClient
        .from("attachments")
        .select("id, attached_to_id, file_name, url, uploaded_at")
        .eq("attached_to_id", contractId)
        .eq("attached_to_table", "prime_contracts")
        .order("uploaded_at", { ascending: false });

      if (legacyError) {
        return NextResponse.json(
          { error: "Failed to fetch attachments", details: legacyError.message },
          { status: 400 },
        );
      }

      attachments = legacyAttachments ?? [];
    }

    // Final fallback for environments with detached legacy rows:
    // recover rows by storage path pattern when attached_to_id is null.
    if (attachments.length === 0) {
      const { data: pathMatchedAttachments, error: pathMatchedError } =
        await serviceClient
          .from("attachments")
          .select("id, attached_to_id, file_name, url, uploaded_at")
          .eq("project_id", parseInt(projectId, 10))
          .ilike("url", `%/prime-contracts/${projectId}/${contractId}/%`)
          .order("uploaded_at", { ascending: false });

      if (!pathMatchedError && pathMatchedAttachments) {
        attachments = pathMatchedAttachments;
      }
    }

    const formattedAttachments = (attachments || []).map((attachment) => ({
      id: attachment.id,
      contractId: attachment.attached_to_id,
      fileName: attachment.file_name,
      url: attachment.url,
      downloadUrl: `/api/projects/${projectId}/contracts/${contractId}/attachments/${attachment.id}/download`,
      uploadedBy: null,
      uploadedAt: attachment.uploaded_at,
      _links: {
        self: `/api/projects/${projectId}/contracts/${contractId}/attachments/${attachment.id}`,
      },
    }));

    return NextResponse.json({
      data: formattedAttachments,
      _links: {
        self: `/api/projects/${projectId}/contracts/${contractId}/attachments`,
        contract: `/api/projects/${projectId}/contracts/${contractId}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/projects/[id]/contracts/[contractId]/attachments
 * Uploads a new attachment to a prime contract
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: contract } = await supabase
      .from("prime_contracts")
      .select("id, project_id")
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const attachmentData = createAttachmentSchema.parse({
      fileName: file.name,
      filePath: "",
      fileSize: file.size,
      mimeType: file.type,
    });

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `${contract.project_id}/prime-contracts/${contractId}/${fileName}`;

    const bucket = serviceClient.storage.from("project-files");
    const fileBuffer = await file.arrayBuffer();

    const contentType = file.type?.trim() || "application/octet-stream";
    const { error: uploadError } = await bucket.upload(storagePath, fileBuffer, {
      contentType,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 400 },
      );
    }

    const {
      data: { publicUrl },
    } = bucket.getPublicUrl(storagePath);

    const { data: attachment, error: attachmentError } = await serviceClient
      .from("attachments")
      .insert({
        // Keep legacy polymorphic pointer during migration for compatibility.
        attached_to_id: contractId,
        attached_to_table: "prime_contracts",
        project_id: contract.project_id,
        file_name: attachmentData.fileName,
        url: publicUrl,
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attachmentError || !attachment) {
      console.error("Failed to insert attachment record:", attachmentError);
      await serviceClient.storage.from("project-files").remove([storagePath]);
      return NextResponse.json(
        {
          error: "Failed to create attachment record",
          details: attachmentError?.message ?? "Unknown insert error",
        },
        { status: 400 },
      );
    }

    const { error: linkInsertError } = await serviceClient
      .from("prime_contract_attachments")
      .insert({
        contract_id: contractId,
        attachment_id: attachment.id,
      });

    if (linkInsertError && !isMissingJoinTableError(linkInsertError)) {
      await serviceClient.from("attachments").delete().eq("id", attachment.id);
      await serviceClient.storage.from("project-files").remove([storagePath]);
      return NextResponse.json(
        {
          error: "Failed to create contract attachment link",
          details: linkInsertError.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        id: attachment.id,
        contractId: attachment.attached_to_id,
        fileName: attachment.file_name,
        url: attachment.url,
        uploadedBy: {
          id: user.id,
          email: user.email,
        },
        uploadedAt: attachment.uploaded_at,
        publicUrl,
        downloadUrl: `/api/projects/${projectId}/contracts/${contractId}/attachments/${attachment.id}/download`,
      },
      { status: 201 },
    );
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

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
