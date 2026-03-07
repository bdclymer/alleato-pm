import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string }>;
}

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

    const { data: attachments, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("attached_to_id", contractId)
      .eq("attached_to_table", "prime_contracts")
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch attachments", details: error.message },
        { status: 400 },
      );
    }

    const formattedAttachments = (attachments || []).map((attachment) => ({
      id: attachment.id,
      contractId: attachment.attached_to_id,
      fileName: attachment.file_name,
      url: attachment.url,
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
    const storagePath = `prime-contracts/${contract.project_id}/${contractId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("project-files")
      .upload(storagePath, file, {
        contentType: file.type,
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
    } = supabase.storage.from("project-files").getPublicUrl(storagePath);

    const { data: attachment, error: dbError } = await supabase
      .from("attachments")
      .insert({
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

    if (dbError) {
      console.error('Failed to insert attachment record:', dbError);
      await supabase.storage.from("project-files").remove([storagePath]);
      return NextResponse.json(
        {
          error: "Failed to create attachment record",
          details: dbError.message,
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
