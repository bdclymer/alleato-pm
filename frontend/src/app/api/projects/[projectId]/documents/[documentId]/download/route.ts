import { apiErrorResponse } from "@/lib/api-error";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

function redirectTo(url: string, headers?: HeadersInit): NextResponse {
  try {
    return NextResponse.redirect(new URL(url), { headers });
  } catch {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(new URL(url, appUrl), { headers });
  }
}

/**
 * GET /api/projects/[projectId]/documents/[documentId]/download
 * Opens the durable Supabase Storage copy when available, then falls back to the
 * original source URL for legacy/imported records that have not been copied yet.
 */
export const GET = withApiGuardrails<{ projectId: string; documentId: string }>(
  "projects/[projectId]/documents/[documentId]/download#GET",
  async ({ params }) => {
    const { projectId, documentId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/documents/[documentId]/download#GET",
        message: "Authentication required.",
      });
    }

    const { data: document, error } = await supabase
      .from("project_documents")
      .select("id, file_name, file_url, storage_bucket, storage_path")
      .eq("id", Number(documentId))
      .eq("project_id", Number(projectId))
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    if (document.storage_bucket && document.storage_path) {
      const serviceClient = createServiceClient();
      const { data: signedUrlData, error: signedUrlError } =
        await serviceClient.storage
          .from(document.storage_bucket)
          .createSignedUrl(document.storage_path, 3600, {
            download: document.file_name,
          });

      if (signedUrlData?.signedUrl && !signedUrlError) {
        return redirectTo(signedUrlData.signedUrl, {
          "x-document-source": "supabase-storage",
        });
      }

      console.error(
        JSON.stringify({
          event: "project_document_signed_url_failed",
          project_id: Number(projectId),
          document_id: Number(documentId),
          storage_bucket: document.storage_bucket,
          storage_path: document.storage_path,
          error: signedUrlError?.message ?? "Signed URL was not returned.",
        }),
      );

      if (!document.file_url) {
        return NextResponse.json(
          {
            error:
              "Document storage copy exists, but a signed download link could not be created.",
          },
          { status: 502 },
        );
      }

      return redirectTo(document.file_url, {
        "x-document-source": "source-url-fallback",
        "x-document-storage-error":
          signedUrlError?.message ?? "Signed URL was not returned.",
      });
    }

    if (!document.file_url) {
      return NextResponse.json(
        { error: "Document does not have a storage copy or source URL." },
        { status: 404 },
      );
    }

    return redirectTo(document.file_url, {
      "x-document-source": "source-url",
    });
  },
);
