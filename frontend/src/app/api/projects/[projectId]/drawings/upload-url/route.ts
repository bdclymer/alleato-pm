import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";

interface SignedUploadRequest {
  file_name: string;
  file_size: number;
  file_type?: string;
}

const DRAWING_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

/**
 * Allowed MIME types for drawing uploads.
 * Only PDF and common raster/vector image formats are accepted.
 * Non-PDF files (e.g. .docx, .xlsx) must be rejected — they cannot be rendered
 * in the PDF viewer and have caused data integrity issues.
 */
const ALLOWED_DRAWING_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff",
  "image/tif",
  "image/svg+xml",
  "image/webp",
]);

/** Builds a safe storage file name for Supabase object paths. */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, "_");
}

/**
 * POST /api/projects/[projectId]/drawings/upload-url
 * Creates a signed Supabase Storage upload URL for direct browser uploads.
 */
export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/drawings/upload-url#POST",
  async ({ request, params }) => {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/drawings/upload-url#POST",
        message: "Authentication required.",
      });
    }

    try {
      const body = (await request.json()) as SignedUploadRequest;

      if (!body.file_name || !Number.isFinite(body.file_size) || body.file_size <= 0) {
        return NextResponse.json(
          { error: "Missing required fields: file_name, file_size" },
          { status: 400 },
        );
      }

      if (body.file_size > DRAWING_MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 100MB." },
          { status: 400 },
        );
      }

      if (!body.file_type || !ALLOWED_DRAWING_MIME_TYPES.has(body.file_type)) {
        return NextResponse.json(
          {
            error: body.file_type
              ? `Unsupported file type: ${body.file_type}. Drawings must be PDF or image files (PNG, JPEG, TIFF, SVG).`
              : "Missing file_type. Drawings must be PDF or image files (PNG, JPEG, TIFF, SVG).",
          },
          { status: 400 },
        );
      }

      const timestamp = Date.now();
      const sanitizedFilename = sanitizeFilename(body.file_name);
      const storagePath = `${projectId}/drawings/tmp/${timestamp}_${sanitizedFilename}`;

      // Sensitive: this endpoint authorizes direct object writes into project storage.
      const serviceClient = createServiceClient();
      const { data, error } = await serviceClient.storage
        .from("project-files")
        .createSignedUploadUrl(storagePath);

      if (error || !data) {
        return apiErrorResponse(new Error(`Failed to create signed upload URL: ${error?.message ?? "Unknown error"}`));
      }

      return NextResponse.json({
        path: data.path,
        token: data.token,
      });
    } catch (error) {
      return apiErrorResponse(error);
    }
  },
);
