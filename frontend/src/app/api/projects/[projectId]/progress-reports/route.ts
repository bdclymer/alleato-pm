import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
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

export const GET = withApiGuardrails(
  "projects/[projectId]/progress-reports#GET",
  async ({ params }) => {
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
    } catch {
      // Non-fatal — report is still usable, PM can regenerate manually
    }

    return NextResponse.json(result, { status: 201 });
  },
);
