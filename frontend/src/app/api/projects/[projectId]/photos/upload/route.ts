import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * POST /api/projects/[projectId]/photos/upload
 * Accepts multipart/form-data with one or more image files.
 * Uploads each file to Supabase storage, creates a photo record,
 * and returns the created records.
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/photos/upload#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const pid = parseInt(projectId, 10);

    if (isNaN(pid)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/photos/upload#POST", message: "Authentication required." });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const album = (formData.get("album") as string | null) ?? "Default";
    const isPrivate = formData.get("is_private") === "true";

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 },
      );
    }

    const created = [];

    const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        continue;
      }

      if (file.size > MAX_FILE_BYTES) {
        continue;
      }

      // Generate a unique path
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `projects/${pid}/photos/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        continue;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("project-files").getPublicUrl(storagePath);

      // Derive title from filename (strip extension, replace dashes/underscores)
      const title = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // Create photo record
      const { data: photo, error: insertError } = await supabase
        .from("project_photos")
        .insert({
          project_id: pid,
          title,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          content_type: file.type,
          album,
          is_private: isPrivate,
          uploaded_by: user.id,
          created_by: user.id,
        })
        .select("*")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        continue;
      }

      created.push(photo);
    }

    return NextResponse.json(
      { uploaded: created.length, photos: created },
      { status: 201 },
    );
    },
);
