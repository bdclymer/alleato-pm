import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ projectId: string; primeCoId: string }>;
}

/**
 * GET /api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments
 * Returns all attachments for a PCCO
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { primeCoId } = await params;
    const supabase = await createClient();

    const { data: attachments, error } = await supabase
      .from("pcco_attachments")
      .select("*")
      .eq("pcco_id", Number(primeCoId))
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch attachments", details: error.message },
        { status: 400 },
      );
    }

    const formatted = (attachments || []).map((a) => ({
      id: a.id,
      fileName: a.file_name,
      filePath: a.file_path,
      fileSize: a.file_size,
      mimeType: a.mime_type,
      uploadedAt: a.uploaded_at,
    }));

    return NextResponse.json({ data: formatted });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments
 * Upload an attachment to a PCCO
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, primeCoId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = (formData.get("file") || formData.get("files")) as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `pcco-attachments/${projectId}/${primeCoId}/${fileName}`;

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

    const { data: attachment, error: dbError } = await supabase
      .from("pcco_attachments")
      .insert({
        pcco_id: Number(primeCoId),
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      await supabase.storage.from("project-files").remove([storagePath]);
      return NextResponse.json(
        { error: "Failed to create attachment record", details: dbError.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        id: attachment.id,
        fileName: attachment.file_name,
        filePath: attachment.file_path,
        fileSize: attachment.file_size,
        mimeType: attachment.mime_type,
        uploadedAt: attachment.uploaded_at,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
