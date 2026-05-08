import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

function reportPdfProxySignedUrlFailure(details: Record<string, unknown>) {
  console.warn(JSON.stringify({
    event: "drawing_pdf_proxy_signed_url_failed",
    timestamp: new Date().toISOString(),
    ...details,
  }));
}

/**
 * GET /api/projects/[projectId]/drawings/[drawingId]/pdf-proxy
 *
 * Proxies the drawing PDF through Next.js so that react-pdf (PDF.js) can make
 * HTTP Range requests without hitting Supabase signed-URL CORS/range restrictions
 * that cause a 400 "Unexpected server response" error.
 */
export const GET = withApiGuardrails<{ projectId: string; drawingId: string }>(
  "projects/[projectId]/drawings/[drawingId]/pdf-proxy#GET",
  async ({ request, params }) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { drawingId } = await params;
  const serviceClient = createServiceClient();

  // Get current revision file path
  const { data: drawing, error: drawingError } = await serviceClient
    .from("drawings")
    .select("current_revision:drawing_revisions!fk_drawings_current_revision(file_url)")
    .eq("id", drawingId)
    .single();

  if (drawingError || !drawing?.current_revision) {
    return new NextResponse("Drawing not found", { status: 404 });
  }

  const fileUrl = (drawing.current_revision as { file_url: string }).file_url;
  if (!fileUrl) {
    return new NextResponse("No file available", { status: 404 });
  }

  // Extract storage path from the public URL and create a fresh signed URL
  let fetchUrl = fileUrl;
  try {
    const parsed = new URL(fileUrl);
    const pathParts = parsed.pathname.split("/object/public/project-files/");
    if (pathParts.length === 2) {
      const storagePath = pathParts[1];
      const { data: signedData } = await serviceClient.storage
        .from("project-files")
        .createSignedUrl(storagePath, 300); // 5 min — only needs to last for this request
      if (signedData?.signedUrl) {
        fetchUrl = signedData.signedUrl;
      }
    }
  } catch (error) {
    reportPdfProxySignedUrlFailure({
      drawingId,
      fileUrl,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Forward Range header so PDF.js chunked loading works
  const rangeHeader = request.headers.get("range");
  const upstreamHeaders: HeadersInit = { Accept: "application/pdf, */*" };
  if (rangeHeader) {
    upstreamHeaders["Range"] = rangeHeader;
  }

  const upstream = await fetch(fetchUrl, { headers: upstreamHeaders });

  // Don't forward non-ok Supabase responses as-is — they contain raw JSON that
  // would render visibly inside an <iframe> or <object> element.
  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse(null, { status: upstream.status });
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", upstream.headers.get("Content-Type") || "application/pdf");
  responseHeaders.set("Accept-Ranges", "bytes");
  // Allow react-pdf to cache in browser
  responseHeaders.set("Cache-Control", "private, max-age=300");

  const contentLength = upstream.headers.get("Content-Length");
  if (contentLength) responseHeaders.set("Content-Length", contentLength);

  const contentRange = upstream.headers.get("Content-Range");
  if (contentRange) responseHeaders.set("Content-Range", contentRange);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
  },
);
