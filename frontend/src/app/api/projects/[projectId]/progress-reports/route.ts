import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { requireDeveloperApi } from "@/lib/auth/require-developer";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  createProgressReportDraft,
  listProgressReports,
} from "@/lib/progress-reports/server";
import { generateProgressReportSections } from "@/lib/progress-reports/ai-generate";

const createSchema = z.object({
  weekStart: z.string().optional(),
  weekEnd: z.string().optional(),
});

function reportProgressReportEnrichmentFailure(details: Record<string, unknown>) {
  console.warn(JSON.stringify({
    event: "progress_report_ai_enrichment_failed",
    timestamp: new Date().toISOString(),
    ...details,
  }));
}

export const GET = withApiGuardrails(
  "projects/[projectId]/progress-reports#GET",
  async ({ params }) => {
    const developerGuard = await requireDeveloperApi();
    if (developerGuard) return developerGuard;

    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/progress-reports#GET",
        message: "Authentication required.",
      });
    }

    const { projectId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (!Number.isFinite(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const reports = await listProgressReports(numericProjectId);
    return NextResponse.json({ reports });
  },
);

export const POST = withApiGuardrails(
  "projects/[projectId]/progress-reports#POST",
  async ({ request, params }) => {
    const developerGuard = await requireDeveloperApi();
    if (developerGuard) return developerGuard;

    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/progress-reports#POST",
        message: "Authentication required.",
      });
    }

    const { projectId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (!Number.isFinite(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const body = createSchema.parse(await request.json().catch(() => ({})));
    const result = await createProgressReportDraft({
      projectId: numericProjectId,
      userId: user.id,
      userEmail: user.email ?? null,
      weekStart: body.weekStart,
      weekEnd: body.weekEnd,
    });

    // Auto-enhance with AI so the PM opens a polished draft, not deterministic output.
    // Failures are non-fatal — the PM can always click "AI Generate" manually.
    try {
      const { data: report } = await createServiceClient()
        .from("project_progress_reports")
        .select("week_start, week_end")
        .eq("id", result.reportId)
        .single();

      if (report) {
        const sections = await generateProgressReportSections({
          projectId: numericProjectId,
          weekStart: report.week_start as string,
          weekEnd: report.week_end as string,
        });

        await createServiceClient()
          .from("project_progress_reports")
          .update({
            past_week_highlights: sections.past_week_highlights,
            upcoming_week_activities: sections.upcoming_week_activities,
            open_items: sections.open_items,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", result.reportId);
      }
    } catch (error) {
      reportProgressReportEnrichmentFailure({
        projectId: numericProjectId,
        reportId: result.reportId,
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return NextResponse.json(result, { status: 201 });
  },
);
