import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { renderPdfFromHtml } from "@/lib/documents/pdf";
import { buildProgressReportHtml } from "@/lib/progress-reports/pdf";
import { getProgressReportDetail } from "@/lib/progress-reports/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiGuardrails(
  "projects/[projectId]/progress-reports/[reportId]/pdf#GET",
  async ({ params }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/progress-reports/[reportId]/pdf#GET",
        message: "Authentication required.",
      });
    }

    const { projectId, reportId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (!Number.isFinite(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const db = createServiceClient();
    const [detail, projectResult] = await Promise.all([
      getProgressReportDetail(numericProjectId, reportId),
      db
        .from("projects")
        .select("name, project_number, address")
        .eq("id", numericProjectId)
        .single(),
    ]);

    if (projectResult.error || !projectResult.data) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const html = buildProgressReportHtml({
      project: projectResult.data,
      report: detail.report,
      selectedPhotos: detail.selectedPhotos,
    });
    const pdfBuffer = await renderPdfFromHtml(html);
    const safeName = (projectResult.data.name ?? "project")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    const filename = `${safeName || "project"}-progress-report-${detail.report.week_end}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  },
);
