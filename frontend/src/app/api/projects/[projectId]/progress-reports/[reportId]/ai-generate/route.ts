import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { requireDeveloperApi } from "@/lib/auth/require-developer";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { generateProgressReportSections } from "@/lib/progress-reports/ai-generate";

export const dynamic = "force-dynamic";

export const POST = withApiGuardrails(
  "projects/[projectId]/progress-reports/[reportId]/ai-generate#POST",
  async ({ params }) => {
    const developerGuard = await requireDeveloperApi();
    if (developerGuard) return developerGuard;

    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/progress-reports/[reportId]/ai-generate#POST",
        message: "Authentication required.",
      });
    }

    const { projectId, reportId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (!Number.isFinite(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const db = createServiceClient();

    const { data: report, error: reportError } = await db
      .from("project_progress_reports")
      .select("id, week_start, week_end, project_id")
      .eq("id", reportId)
      .eq("project_id", numericProjectId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    try {
      const sections = await generateProgressReportSections({
        projectId: numericProjectId,
        weekStart: report.week_start as string,
        weekEnd: report.week_end as string,
      });
      return NextResponse.json(sections);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "AI generation failed" },
        { status: 500 },
      );
    }
  },
);
