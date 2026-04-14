import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string }>;
}

type ContractAttachmentRecord = {
  id: string;
  attached_to_id: string | null;
  file_name: string | null;
  url: string | null;
  uploaded_at: string | null;
};

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
export const GET = withApiGuardrails(
  "projects/[projectId]/contracts/[contractId]/attachments#GET",
  async ({ request, params }) => {
  
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

    let attachments: ContractAttachmentRecord[] = [];

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

    attachments = (legacyAttachments ?? []) as ContractAttachmentRecord[];

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
        attachments = pathMatchedAttachments as ContractAttachmentRecord[];
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
    },
);

/**
 * POST /api/projects/[id]/contracts/[contractId]/attachments
 * Uploads a new attachment to a prime contract
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/contracts/[contractId]/attachments#POST",
  async ({ request, params }) => {
  
    const { projectId, contractId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/contracts/[contractId]/attachments#POST", message: "Authentication required." });
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
    },
);
